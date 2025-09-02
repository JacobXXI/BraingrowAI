from flask import Flask, session, jsonify, request
from flask_session import Session
from flask_cors import CORS
import jwt
import datetime
import traceback
from functools import wraps
from video_handler import (
    ask_AI,
    VertexAICredentialsError,
)
from sqlalchemy import inspect, text
import os
from werkzeug.utils import secure_filename
import urllib.request
import urllib.parse
import mimetypes
import random

# Import everything from the consolidated models file
from models import (
    db, Video, User, Comment,
    searchVideo, getVideoById, addVideo,
    userLogin, userRegister, userProfile, getRecommendedVideos,
    addComment, getCommentsByVideo, updateUserTendency, updateUserProfile,
    # new imports for personalization
    getRecommendedVideosForUser, updateUserFocusLevel, recordWatchHistory, getUserWatchHistory,
)
from tags import VIDEO_TAG_CATALOG

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
app.config['SECRET_KEY'] = "your-secret-key-here"

# Ensure session storage is writable in cloud environments (e.g., Cloud Run)
# Cloud runtimes often mount the app filesystem read-only; only /tmp is writable.
try:
    import os as _os
    _cloud_env = bool(_os.environ.get("K_SERVICE") or _os.environ.get("GAE_ENV"))
    _session_dir = _os.environ.get("SESSION_FILE_DIR") or ("/tmp/flask_session" if _cloud_env else _os.path.join(app.instance_path, "flask_session"))
    _os.makedirs(_session_dir, exist_ok=True)
    app.config["SESSION_FILE_DIR"] = _session_dir
except Exception:
    # Non-fatal: fallback to default; errors will surface if session tries to write
    pass

# Initialize extensions
db.init_app(app)
Session(app)

# Allow frontend origins with credentials support
CORS(app, origins=[
    "http://localhost:5174", 
    "http://localhost:5173",
    "https://jacobxxi.github.io"
], supports_credentials=True)

# Ensure CORS preflights never trigger route logic
@app.before_request
def _short_circuit_options_preflight():
    if request.method == 'OPTIONS':
        # Let Flask-CORS add the appropriate headers in after_request
        return ('', 204)

# Create database tables and ensure reaction columns exist
def ensure_reaction_columns():
    """Ensure legacy databases have likes/dislikes columns and new personalization columns.

    This function performs lightweight schema evolution for existing SQLite DBs without Alembic.
    """
    inspector = inspect(db.engine)
    columns = {col['name'] for col in inspector.get_columns('videos')}
    added = False
    if 'likes' not in columns:
        db.session.execute(text('ALTER TABLE videos ADD COLUMN likes INTEGER DEFAULT 0'))
        added = True
    if 'dislikes' not in columns:
        db.session.execute(text('ALTER TABLE videos ADD COLUMN dislikes INTEGER DEFAULT 0'))
        added = True
    # New video categorization columns
    if 'board' not in columns:
        db.session.execute(text("ALTER TABLE videos ADD COLUMN board VARCHAR(50)"))
        added = True
    if 'topic' not in columns:
        db.session.execute(text("ALTER TABLE videos ADD COLUMN topic VARCHAR(100)"))
        added = True
    # Users: focus_level
    user_columns = {col['name'] for col in inspector.get_columns('users')}
    if 'focus_level' not in user_columns:
        db.session.execute(text('ALTER TABLE users ADD COLUMN focus_level FLOAT'))
        added = True
    if added:
        db.session.commit()
    # Ensure watch_histories table exists
    if 'watch_histories' not in inspector.get_table_names():
        db.create_all()

with app.app_context():
    db.create_all()
    ensure_reaction_columns()

# Decorator to check if user is logged in
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Check for JWT token in Authorization header
        token = request.headers.get('Authorization')
        if token and token.startswith('Bearer '):
            token = token[7:]
            try:
                data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
                request.current_user_id = data['user_id']
                return f(*args, **kwargs)
            except jwt.ExpiredSignatureError:
                return jsonify({'error': 'Token has expired', 'code': 'TOKEN_EXPIRED'}), 401
            except jwt.InvalidTokenError:
                return jsonify({'error': 'Invalid token', 'code': 'INVALID_TOKEN'}), 401
        
        # Check for session-based login (fallback)
        if 'user_id' in session:
            request.current_user_id = session['user_id']
            return f(*args, **kwargs)
        
        return jsonify({'error': 'Authentication required', 'code': 'AUTH_REQUIRED'}), 401
    return decorated_function

@app.route('/api/hello')
def hello():
    return {'message': 'Hello from Flask!'}

@app.route('/')
def home():
    return "Hello, BrainGrow AI!"

# Expose the tag catalog for frontends to build tendency selection
@app.route('/api/tags', methods=['GET'])
def get_tags_catalog():
    try:
        return jsonify(VIDEO_TAG_CATALOG)
    except Exception as e:
        print(f"Error in get_tags_catalog: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Updated search endpoint to match frontend expectations
@app.route('/api/search')
def search():
    try:
        searchQuery = request.args.get('query')
        limit = request.args.get('maxVideo', 5, type=int)
        print(f"Received search query: {searchQuery}")
        
        if not searchQuery:
            return jsonify({'error': 'Query parameter is required'}), 400
        
        videos = searchVideo(searchQuery, limit)
        print(f"Found {len(videos) if videos else 0} videos")
        
        if not videos:
            return jsonify([])
            
        result = []
        for v in videos:
            video_data = {
                'id': v.id,
                'title': v.title,
                'description': v.description,
                'creator': getattr(v, 'author', 'Unknown'),  # Frontend expects 'creator'
                'publishedAt': getattr(v, 'date', datetime.datetime.now()).isoformat(),
                'category': getattr(v, 'category', 'General'),
                'viewCount': getattr(v, 'views', 0),
                'videoUrl': v.url,  # Frontend expects 'videoUrl'
                'imageUrl': v.imageUrl
            }
            result.append(video_data)
        return jsonify(result)
            
    except Exception as e:
        print(f"Error in search route: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/recommendations')
def get_recommendations():
    # Default to 10 recommendations if not specified
    limit = request.args.get('maxVideo', 10, type=int)
    user_id = None
    token = request.headers.get('Authorization')
    if token and token.startswith('Bearer '):
        token = token[7:]
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            user_id = data.get('user_id')
        except Exception:
            user_id = None
    if not user_id and 'user_id' in session and session.get('logged_in'):
        user_id = session['user_id']

    if user_id:
        # Consider both user's watch history (topic affinity) and declared tendency (keywords)
        # 1) Watch history based topic preferences
        watch_history = getUserWatchHistory(user_id)
        topic_time = {}
        watched_video_ids = set()
        for wh in watch_history:
            v = getVideoById(wh.video_id)
            if not v:
                continue
            watched_video_ids.add(v.id)
            if getattr(v, 'topic', None):
                topic = v.topic
                topic_time[topic] = topic_time.get(topic, 0) + (wh.progress or 0)

        top_topic = max(topic_time, key=topic_time.get) if topic_time else None

        # 2) Parse user tendency keywords (can be multiple)
        tendency_keywords = []
        try:
            u = userProfile(user_id)
            raw = (u.tendency or '').lower() if u and getattr(u, 'tendency', None) else ''
            if raw:
                tendency_keywords = [p.strip() for chunk in raw.split(',') for p in chunk.split() if p.strip()]
        except Exception:
            tendency_keywords = []

        # 3) Collect candidate videos from topic and tendency
        candidates = {}
        kw_to_vids = {}
        def add_candidates(objs, base_score=0):
            for vid in objs or []:
                if vid.id in watched_video_ids:
                    continue
                score = candidates.get(vid.id, (None, 0))[1]
                candidates[vid.id] = (vid, max(score, base_score))

        # From top topic, if any
        if top_topic:
            topic_videos = Video.query.filter(
                Video.topic == top_topic,
                ~Video.id.in_(watched_video_ids)
            ).limit(limit * 3).all()
            add_candidates(topic_videos, base_score=5)

        # From tendency keywords
        if tendency_keywords:
            from sqlalchemy import or_
            for kw in tendency_keywords:
                like = f"%{kw}%"
                kw_videos = Video.query.filter(
                    or_(
                        Video.tags.like(like),
                        Video.title.like(like),
                        Video.description.like(like),
                        Video.board == kw,
                        Video.topic == kw,
                    ),
                    ~Video.id.in_(watched_video_ids)
                ).limit(10).all()
                add_candidates(kw_videos, base_score=3)
                kw_to_vids[kw] = kw_videos

        # Score candidates by combined signals
        scored = []
        for vid, base_score in candidates.values():
            s = base_score
            if top_topic and getattr(vid, 'topic', None) == top_topic:
                s += 2
            if tendency_keywords:
                tags_lower = (vid.tags or '').lower()
                bt = (getattr(vid, 'board', '') or '').lower()
                tp = (getattr(vid, 'topic', '') or '').lower()
                matches = sum(1 for kw in tendency_keywords if kw in tags_lower or kw == bt or kw == tp)
                s += min(matches, 3)  # cap influence
            scored.append((s, vid))

        # Sort by score desc
        scored.sort(key=lambda x: x[0], reverse=True)
        score_map = {vid.id: s for s, vid in scored}

        # Blend: include a few random recommendations (~10-20%) for serendipity
        try:
            random_ratio = float(os.getenv('RECO_RANDOM_RATIO', '0.15'))
        except Exception:
            random_ratio = 0.15
        random_ratio = max(0.0, min(0.5, random_ratio))

        random_target = int(round(limit * random_ratio))
        # Ensure at least 1 random if limit allows, but keep one slot for personalized
        if limit >= 5:
            random_target = max(1, min(random_target, max(0, limit - 1)))
        else:
            random_target = min(random_target, limit)

        base_target = max(0, limit - random_target)

        # Coverage: try to include at least one video per tendency (in order), up to base_target
        selected_ids = set()
        coverage = []
        if tendency_keywords and base_target > 0:
            for kw in tendency_keywords:
                if len(coverage) >= base_target:
                    break
                vids = kw_to_vids.get(kw) or []
                # pick the highest scored video for this keyword that isn't selected
                vids_sorted = sorted(
                    [v for v in vids if v.id not in selected_ids],
                    key=lambda v: score_map.get(v.id, 0),
                    reverse=True
                )
                if vids_sorted:
                    v = vids_sorted[0]
                    coverage.append(v)
                    selected_ids.add(v.id)

        # Fill remaining personalized slots with top scored videos
        remaining_personal_needed = max(0, base_target - len(coverage))
        top_personalized = coverage[:]
        if remaining_personal_needed > 0:
            for _, v in scored:
                if len(top_personalized) >= base_target:
                    break
                if v.id in selected_ids:
                    continue
                top_personalized.append(v)
                selected_ids.add(v.id)

        # Pick random candidates excluding watched and already selected
        selected_ids.update(watched_video_ids)
        random_needed = max(0, limit - len(top_personalized)) if random_target == 0 else min(random_target, max(0, limit - len(top_personalized)))

        random_picks = []
        if random_needed > 0:
            pool = getRecommendedVideos(random_needed * 3)
            for v in pool:
                if v.id in selected_ids:
                    continue
                random_picks.append(v)
                selected_ids.add(v.id)
                if len(random_picks) >= random_needed:
                    break

        videos = top_personalized + random_picks

        # If still short, fill with remaining personalized results, then general randoms
        if len(videos) < limit:
            remaining_needed = limit - len(videos)
            remaining_personalized = [vid for _, vid in scored[base_target:base_target + remaining_needed] if vid.id not in {v.id for v in videos} and vid.id not in watched_video_ids]
            videos += remaining_personalized
        if len(videos) < limit:
            extra = getRecommendedVideos(limit - len(videos))
            videos += [v for v in extra if v.id not in {x.id for x in videos} and v.id not in watched_video_ids]
    else:
        videos = getRecommendedVideos(limit)

    # Mix final order to interleave personalized and random picks
    try:
        random.shuffle(videos)
    except Exception:
        pass
    return jsonify([{
        'id': v.id,
        'title': v.title,
        'description': v.description,
        'url': v.url,
        'tags': v.tags,
        'board': getattr(v, 'board', None),
        'topic': getattr(v, 'topic', None),
        'imageUrl': v.imageUrl
    } for v in videos])
        
@app.route('/api/video/<video_id>')
def get_video(video_id):
    try:
        video = getVideoById(video_id)
        if video:
            return jsonify({
                'id': video.id,
                'title': video.title,
                'description': video.description,
                'creator': getattr(video, 'author', 'Unknown'),
                'publishedAt': getattr(video, 'date', datetime.datetime.now()).isoformat(),
                'category': getattr(video, 'category', 'General'),
                'viewCount': getattr(video, 'views', 0),
                # Return the canonical YouTube URL instead of a direct stream URL
                'url': video.url,
                'coverUrl': video.imageUrl,
                # Include tags and structured classification if present
                'tags': getattr(video, 'tags', ''),
                'board': getattr(video, 'board', None),
                'topic': getattr(video, 'topic', None),
            })
        return jsonify({'error': 'Video not found'}), 404
    except Exception as e:
        print(f"Error in get_video: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Updated login endpoint to handle email/password from frontend
@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'JSON data required'}), 400
        
        # Frontend sends 'email' and 'password'
        email = data.get('email')
        password = data.get('password')
        remember_me = data.get('remember_me', False)
        
        if not email or not password:
            return jsonify({'error': 'Email and password required'}), 400
        
        print(f"Login attempt for email: {email}")
        
        # Assuming userLogin can handle email instead of username
        # You might need to update your userLogin function to accept email
        user = userLogin(email, password)
        if user:
            # Store user session
            session['user_id'] = user.id
            session['username'] = getattr(user, 'username', user.email)
            session['logged_in'] = True
            session['login_time'] = datetime.datetime.now().isoformat()
            
            # Set session expiry based on remember_me
            if remember_me:
                session.permanent = True
                app.permanent_session_lifetime = datetime.timedelta(days=30)
                token_expiry = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=30)
            else:
                session.permanent = False
                token_expiry = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=24)
            
            # Create JWT token
            token = jwt.encode({
                'user_id': user.id,
                'username': getattr(user, 'username', user.email),
                'exp': token_expiry
            }, app.config['SECRET_KEY'], algorithm="HS256")
            
            print(f"User {email} logged in successfully at {session['login_time']}")
            
            return jsonify({
                'message': 'Login successful',
                'token': token,
                'user_id': user.id,
                'username': getattr(user, 'username', user.email),
                'logged_in': True,
                'login_time': session['login_time']
            })
        else:
            print(f"Failed login attempt for email: {email}")
            return jsonify({'error': 'Invalid credentials'}), 401
            
    except Exception as e:
        print(f"Error in login: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/logout', methods=['POST'])
@login_required
def logout():
    try:
        username = session.get('username', 'Unknown')
        
        # Clear session data
        session.clear()
        
        print(f"User {username} logged out successfully")
        
        return jsonify({
            'message': 'Logout successful',
            'logged_in': False
        })
    except Exception as e:
        print(f"Error in logout: {str(e)}")
        return jsonify({'error': str(e)}), 500

# New signup endpoint to match frontend
@app.route('/api/signup', methods=['POST'])
def signup():
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'JSON data required'}), 400
            
        email = data.get('email')
        password = data.get('password')
        name = data.get('name')
        
        if not email or not password:
            return jsonify({'error': 'Email and password required'}), 400
            
        # Create user with email as username if name not provided
        username = name if name else email.split('@')[0]
        
        user = userRegister(username, password, email)
        if user:
            # Auto-login after successful signup
            session['user_id'] = user.id
            session['username'] = user.username
            session['logged_in'] = True
            session['login_time'] = datetime.datetime.now().isoformat()
            
            # Create JWT token
            token_expiry = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7)
            token = jwt.encode({
                'user_id': user.id,
                'username': user.username,
                'exp': token_expiry
            }, app.config['SECRET_KEY'], algorithm="HS256")
            
            print(f"New user registered and logged in: {email}")
            return jsonify({
                'message': 'User created successfully',
                'token': token,
                'user_id': user.id,
                'username': user.username
            }), 201
        return jsonify({'error': 'User creation failed - email may already exist'}), 400
    except Exception as e:
        print(f"Error in signup: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/videos/<int:video_id>/comments', methods=['GET'])
def get_comments(video_id):
    """Get comments for a specific video."""
    try:
        video = getVideoById(video_id)
        if not video:
            return jsonify({'error': 'Video not found'}), 404

        comments = getCommentsByVideo(video_id)
        return jsonify([
            {
                'id': c.id,
                'text': c.text,
                'user_id': c.user_id,
                'video_id': c.video_id,
                'created_at': c.created_at.isoformat()
            }
            for c in comments
        ])
    except Exception as e:
        print(f"Error in get_comments: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/videos/<int:video_id>/comments', methods=['POST'])
@login_required
def add_comment(video_id):
    """Add a comment to a video. Requires authenticated user."""
    try:
        data = request.json
        if not data or not data.get('text'):
            return jsonify({'error': 'Comment text required'}), 400

        video = getVideoById(video_id)
        if not video:
            return jsonify({'error': 'Video not found'}), 404

        comment = addComment(data['text'], request.current_user_id, video_id)
        if not comment:
            return jsonify({'error': 'Failed to add comment'}), 500

        return jsonify({
            'message': 'Comment added successfully',
            'comment': {
                'id': comment.id,
                'text': comment.text,
                'user_id': comment.user_id,
                'video_id': comment.video_id,
                'created_at': comment.created_at.isoformat()
            }
        })
    except Exception as e:
        print(f"Error in add_comment: {str(e)}")
        return jsonify({'error': str(e)}), 500
    
@app.route('/api/videos/<video_id>/ask', methods=['POST'])
def ask_video_question(video_id):
    try:
        data = request.json
        if not data or not data.get('question'):
            return jsonify({'error': 'Question text required'}), 400

        video = getVideoById(video_id)
        if not video:
            return jsonify({'error': 'Video not found'}), 404

        question = data['question']

        # Resume conversation per user and video
        conversations = session.get('ai_conversations', {})
        # Identify user from session or bearer token; fallback to 'anon'
        user_part = session.get('user_id')
        if not user_part:
            auth = request.headers.get('Authorization')
            if auth and auth.startswith('Bearer '):
                token = auth[7:]
                try:
                    data_token = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
                    user_part = data_token.get('user_id')
                except Exception:
                    user_part = None
        key = f"{user_part if user_part is not None else 'anon'}-{video_id}"
        history = conversations.get(key, [])

        answer = ask_AI(video.url, question, history=history)

        # Update history: keep last ~20 turns to bound session size
        history.append({'role': 'user', 'text': question})
        history.append({'role': 'model', 'text': answer})
        if len(history) > 40:
            history = history[-40:]

        conversations[key] = history
        session['ai_conversations'] = conversations
        session.modified = True

        return jsonify({
            'question': question,
            'answer': answer
        })
    except VertexAICredentialsError as e:
        print(f"Vertex AI credentials error: {str(e)}")
        # Print full traceback for cloud logs to aid diagnostics
        traceback.print_exc()
        return jsonify({'error': str(e), 'code': 'NO_CREDENTIALS'}), 500
    except Exception as e:
        print(f"Error in asking video question: {str(e)}")
        traceback.print_exc()
        # Provide clearer client messages for common content issues
        msg = str(e)
        try:
            from video_handler import TranscriptUnavailableError
            if isinstance(e, TranscriptUnavailableError):
                return jsonify({'error': 'YouTube transcript is unavailable for this video. Try a different video or upload a direct video file.'}), 400
        except Exception:
            pass
        return jsonify({'error': msg}), 500

@app.route('/api/check-auth')
def check_auth():
    """Check if user is currently authenticated"""
    try:
        # Check JWT token first
        token = request.headers.get('Authorization')
        if token and token.startswith('Bearer '):
            token = token[7:]
            try:
                data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
                user = userProfile(data['user_id'])
                if user:
                    return jsonify({
                        'authenticated': True,
                        'user_id': user.id,
                        'username': getattr(user, 'username', user.email),
                        'login_method': 'token'
                    })
            except jwt.ExpiredSignatureError:
                return jsonify({'authenticated': False, 'error': 'Token expired'})
            except jwt.InvalidTokenError:
                return jsonify({'authenticated': False, 'error': 'Invalid token'})
        
        # Check session-based auth
        if 'user_id' in session and session.get('logged_in'):
            user = userProfile(session['user_id'])
            if user:
                return jsonify({
                    'authenticated': True,
                    'user_id': user.id,
                    'username': getattr(user, 'username', user.email),
                    'login_time': session.get('login_time'),
                    'login_method': 'session'
                })
        
        return jsonify({'authenticated': False})
        
    except Exception as e:
        print(f"Error in check_auth: {str(e)}")
        return jsonify({'authenticated': False, 'error': str(e)})

@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.json
        username = data.get('username')
        password = data.get('password')
        email = data.get('email')
        
        if not username or not password:
            return jsonify({'error': 'Username and password required'}), 400
            
        user = userRegister(username, password, email)
        if user:
            print(f"New user registered: {username}")
            return jsonify({
                'message': 'User created successfully',
                'user_id': user.id,
                'username': user.username
            }), 201
        return jsonify({'error': 'User creation failed - username may already exist'}), 400
    except Exception as e:
        print(f"Error in register: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/profile')
@login_required
def profile():
    try:
        user = userProfile(request.current_user_id)
        if user:
            return jsonify({
                'user_id': user.id,
                'username': getattr(user, 'username', user.email),
                'email': getattr(user, 'email', ''),
                'tendency': getattr(user, 'tendency', ''),
                'photoUrl': getattr(user, 'photoUrl', ''),
                'created_at': getattr(user, 'created_at', None).isoformat() if getattr(user, 'created_at', None) else None
            })
        return jsonify({'error': 'User not found'}), 404
    except Exception as e:
        print(f"Error in profile: {str(e)}")
        return jsonify({'error': str(e)}), 500
    
@app.route('/api/profile/tendency', methods=['PUT'])
@login_required
def update_tendency():
    try:
        data = request.json or {}
        if not data:
            return jsonify({'error': 'JSON body required'}), 400

        # Accept multiple forms:
        # 1) { tendency: "comma,separated,keywords" }
        # 2) { tags: ["keyword", ...] }
        # 3) { selected: { board: [topics...] } }
        raw_tendency = data.get('tendency')
        tags_list = data.get('tags')
        selected = data.get('selected') or data.get('selection')

        def normalize_tokens(tokens):
            seen = set()
            norm = []
            for t in tokens:
                if not t:
                    continue
                k = str(t).strip().lower()
                if not k or k in seen:
                    continue
                seen.add(k)
                norm.append(k)
            return norm

        tokens = []
        if isinstance(raw_tendency, str) and raw_tendency.strip():
            tokens = [p.strip() for chunk in raw_tendency.split(',') for p in chunk.split()]  # commas/spaces
        elif isinstance(tags_list, list):
            tokens = [str(x) for x in tags_list]
        elif isinstance(selected, dict):
            # selected = { board: [topics] }
            for board, topics in selected.items():
                if not board:
                    continue
                # Only record the board token if ALL topics under that board are selected.
                # Otherwise, record only the chosen topics (and their keywords).
                topics = topics or []
                b = str(board).strip()
                # Determine if all topics for this board are selected
                try:
                    b_lower = b.lower()
                    all_topics = list((VIDEO_TAG_CATALOG.get(b_lower) or {}).keys())
                except Exception:
                    all_topics = []

                selected_topic_keys = [str(t).strip() for t in topics if t]
                if all_topics and set(map(str.lower, selected_topic_keys)) >= set(map(str.lower, all_topics)):
                    tokens.append(b)

                for topic in selected_topic_keys:
                    tokens.append(topic)
                    # include known keywords for this board/topic if present
                    t_lower = topic.lower()
                    if b_lower in VIDEO_TAG_CATALOG:
                        # add all keywords under topic if exists
                        if isinstance(VIDEO_TAG_CATALOG[b_lower], dict) and t_lower in VIDEO_TAG_CATALOG[b_lower]:
                            tokens.extend(VIDEO_TAG_CATALOG[b_lower][t_lower])
        else:
            return jsonify({'error': 'Provide one of: tendency(string), tags(array), selected(object)'}), 400

        tokens = normalize_tokens(tokens)
        serialized = ','.join(tokens)

        success = updateUserTendency(request.current_user_id, serialized)
        if success:
            return jsonify({'message': 'Tendency updated', 'tendency': serialized, 'keywords': tokens})
        return jsonify({'error': 'Failed to update tendency'}), 500
    except Exception as e:
        print(f"Error in update_tendency: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/profile', methods=['PUT'])
@login_required
def update_profile():
    try:
        data = request.json or {}
        username = data.get('username')
        photoUrl = data.get('photoUrl')
        # If client passed a remote URL, download and store it locally
        if photoUrl and isinstance(photoUrl, str) and photoUrl.startswith(('http://', 'https://')):
            try:
                # Fetch remote image
                with urllib.request.urlopen(photoUrl) as resp:
                    content = resp.read()
                    ctype = resp.headers.get_content_type() if hasattr(resp.headers, 'get_content_type') else resp.headers.get('Content-Type', '')
                # Guess extension from content-type or URL
                ext = mimetypes.guess_extension(ctype) if ctype else None
                if not ext:
                    parsed_ext = os.path.splitext(urllib.parse.urlparse(photoUrl).path)[1]
                    ext = parsed_ext if parsed_ext else '.jpg'
                # Ensure uploads directory exists
                upload_dir = os.path.join(os.path.dirname(__file__), 'static', 'uploads')
                os.makedirs(upload_dir, exist_ok=True)
                unique_name = f"user{request.current_user_id}_{int(datetime.datetime.now(datetime.timezone.utc).timestamp())}{ext}"
                filepath = os.path.join(upload_dir, secure_filename(unique_name))
                with open(filepath, 'wb') as f:
                    f.write(content)
                # Replace external URL with local static path
                photoUrl = f"/static/uploads/{unique_name}"
            except Exception as e:
                print(f"Failed to download photoUrl: {photoUrl} err={e}")
                return jsonify({'error': 'Failed to download photo'}), 400
        success, err = updateUserProfile(request.current_user_id, username=username, photoUrl=photoUrl)
        if not success:
            return jsonify({'error': err or 'Failed to update profile'}), 400
        user = userProfile(request.current_user_id)
        return jsonify({
            'user_id': user.id,
            'username': getattr(user, 'username', user.email),
            'email': getattr(user, 'email', ''),
            'tendency': getattr(user, 'tendency', ''),
            'photoUrl': getattr(user, 'photoUrl', ''),
            'created_at': getattr(user, 'created_at', None).isoformat() if getattr(user, 'created_at', None) else None
        })
    except Exception as e:
        print(f"Error in update_profile: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/profile/photo', methods=['POST'])
@login_required
def upload_profile_photo():
    try:
        if 'photo' not in request.files:
            return jsonify({'error': 'No photo file provided'}), 400
        file = request.files['photo']
        if file.filename == '':
            return jsonify({'error': 'Empty filename'}), 400
        filename = secure_filename(file.filename)
        # Ensure uploads directory exists under static
        upload_dir = os.path.join(os.path.dirname(__file__), 'static', 'uploads')
        os.makedirs(upload_dir, exist_ok=True)
        # Make filename unique per user
        name, ext = os.path.splitext(filename)
        unique_name = f"user{request.current_user_id}_{int(datetime.datetime.now(datetime.timezone.utc).timestamp())}{ext or '.png'}"
        filepath = os.path.join(upload_dir, unique_name)
        file.save(filepath)
        # Build a URL to the static file (served by Flask static folder)
        public_url = f"/static/uploads/{unique_name}"
        # Persist on user
        success, err = updateUserProfile(request.current_user_id, photoUrl=public_url)
        if not success:
            return jsonify({'error': err or 'Failed to save photo'}), 400
        return jsonify({'photoUrl': public_url})
    except Exception as e:
        print(f"Error in upload_profile_photo: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/protected-search')
@login_required
def protected_search():
    """Example of a protected route that requires login"""
    try:
        searchQuery = request.args.get('query')
        if not searchQuery:
            return jsonify({'error': 'Query parameter is required'}), 400
        
        # You can access the current user ID via request.current_user_id
        user = userProfile(request.current_user_id)
        videos = searchVideo(searchQuery)
        
        return jsonify({
            'user': getattr(user, 'username', user.email),
            'query': searchQuery,
            'results': [{
                'id': v.id,
                'title': v.title,
                'description': v.description,
                'creator': getattr(v, 'author', 'Unknown'),
                'publishedAt': getattr(v, 'date', datetime.datetime.now()).isoformat(),
                'category': getattr(v, 'category', 'General'),
                'viewCount': getattr(v, 'views', 0),
                'videoUrl': v.url,
                'imageUrl': v.imageUrl
            } for v in videos] if videos else []
        })
    except Exception as e:
        print(f"Error in protected_search: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/profile/focus-level', methods=['PUT'])
@login_required
def update_focus_level():
    try:
        data = request.json or {}
        level = data.get('focusLevel')
        if level is None:
            return jsonify({'error': 'focusLevel required'}), 400
        ok = updateUserFocusLevel(request.current_user_id, level)
        if not ok:
            return jsonify({'error': 'Failed to update focus level'}), 400
        user = userProfile(request.current_user_id)
        return jsonify({'message': 'Focus level updated', 'focusLevel': getattr(user, 'focus_level', None)})
    except Exception as e:
        print(f"Error in update_focus_level: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/watch-history', methods=['POST'])
@login_required
def add_watch_history():
    """Record a watch event: expects video_id, optional progress [0..1], optional focus_sample [0..1]."""
    try:
        data = request.json or {}
        vid = data.get('video_id') or data.get('videoId')
        if not vid:
            return jsonify({'error': 'video_id required'}), 400
        progress = data.get('progress')
        focus_sample = data.get('focus_sample') or data.get('focusSample')
        wh = recordWatchHistory(request.current_user_id, int(vid), progress, focus_sample)
        if not wh:
            return jsonify({'error': 'Failed to record watch history'}), 500
        return jsonify({'message': 'Watch history recorded', 'id': wh.id})
    except Exception as e:
        print(f"Error in add_watch_history: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/watch-history', methods=['GET'])
@login_required
def list_watch_history():
    try:
        items = getUserWatchHistory(request.current_user_id)
        return jsonify([
            {
                'id': i.id,
                'video_id': i.video_id,
                'watched_at': i.watched_at.isoformat(),
                'progress': i.progress,
                'focus_sample': i.focus_sample
            } for i in items
        ])
    except Exception as e:
        print(f"Error in list_watch_history: {str(e)}")
        return jsonify({'error': str(e)}), 500
@app.route('/api/add-sample-data')
def add_sample_data():
    try:
        # Check if data already exists
        existing = Video.query.first()
        if existing:
            return jsonify({'message': 'Sample data already exists', 'count': Video.query.count()})
        
        # Add sample videos using the addVideo function (now with board/topic)
        sample_videos = [
            {"title": "Algebra for Beginners", "description": "Intro to algebraic expressions", "url": "https://youtube.com/watch?v=alg1", "imageUrl": "https://example.com/algebra.jpg", "board": "math", "topic": "algebra", "tags": "math,algebra,beginner"},
            {"title": "What is AI?", "description": "Basics of Artificial Intelligence", "url": "https://youtube.com/watch?v=ai1", "imageUrl": "https://example.com/ai.jpg", "board": "science", "topic": "ai", "tags": "science,ai,ml"},
            {"title": "Grammar Essentials", "description": "English grammar fundamentals", "url": "https://youtube.com/watch?v=eng1", "imageUrl": "https://example.com/grammar.jpg", "board": "english", "topic": "grammar", "tags": "english,grammar"},
        ]

        for v in sample_videos:
            addVideo(title=v["title"], description=v["description"], url=v["url"], tags=v.get("tags", ""), imageUrl=v["imageUrl"])  # keep existing helper
            # Also try to update board/topic if created
            created = Video.query.filter_by(url=v["url"]).first()
            if created:
                created.board = v.get("board")
                created.topic = v.get("topic")
        db.session.commit()
        
        return jsonify({'message': 'Sample data added successfully', 'count': len(sample_videos)})
    except Exception as e:
        print(f"Error adding sample data: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Debug route to check current session
@app.route('/api/debug-session')
def debug_session():
    return jsonify({
        'session_data': dict(session),
        'session_permanent': session.permanent
    })

if __name__ == '__main__':
    app.run(port=8080, debug=True)
