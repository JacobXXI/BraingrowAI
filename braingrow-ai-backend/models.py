from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import func

db = SQLAlchemy()

# User Model
class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    # Use a generous length to accommodate modern hash formats (e.g., scrypt/pbkdf2)
    password = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=True)
    tendency = db.Column(db.Text, nullable=True)
    photoUrl = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    # Focus level between 0 and 1; default mid if not set
    focus_level = db.Column(db.Float, nullable=True)
    
    def __repr__(self):
        return f'<User {self.username}>'
# Video Model
class Video(db.Model):
    __tablename__ = 'videos'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    url = db.Column(db.String(200), nullable=False)
    tags = db.Column(db.String(100), nullable=False)
    imageUrl = db.Column(db.String(200), nullable=False)
    likes = db.Column(db.Integer, default=0, nullable=False)
    dislikes = db.Column(db.Integer, default=0, nullable=False)
    # New structured categorization
    board = db.Column(db.String(50), nullable=True)  # e.g., math, science, English
    topic = db.Column(db.String(100), nullable=True)  # e.g., algebra, AI, grammar
    
    def __repr__(self):
        return f"Video('{self.title}', '{self.description}', '{self.url}', '{self.tags}', '{self.imageUrl}')"


# Comment Model
class Comment(db.Model):
    __tablename__ = 'comments'

    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.Text, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    video_id = db.Column(db.Integer, db.ForeignKey('videos.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # relationships
    user = db.relationship('User', backref=db.backref('comments', lazy=True))
    video = db.relationship('Video', backref=db.backref('comments', lazy=True))

    def __repr__(self):
        return f"<Comment {self.id} by {self.user_id} on {self.video_id}>"

# Watch History Model
class WatchHistory(db.Model):
    __tablename__ = 'watch_histories'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    video_id = db.Column(db.Integer, db.ForeignKey('videos.id'), nullable=False)
    watched_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    progress = db.Column(db.Float, nullable=True)  # 0..1 watched ratio
    focus_sample = db.Column(db.Float, nullable=True)  # optional 0..1 focus measure per session

    user = db.relationship('User', backref=db.backref('watch_histories', lazy=True))
    video = db.relationship('Video', backref=db.backref('watch_histories', lazy=True))

# Video Database Functions
def searchVideo(searchQuery: str, maxVideo: int):
    return Video.query.filter(
        db.or_(
            Video.title.like('%' + searchQuery + '%'),
            Video.tags.like('%' + searchQuery + '%')
        )
    ).limit(maxVideo).all()

def getRecommendedVideos(limit: int = 5):
    return Video.query.order_by(func.random()).limit(limit).all()

def getRecommendedVideosForUser(user_id: int, limit: int = 10):
    """Personalized recommendation using user's tendency, focus level, and watch history.
    Heuristic scoring:
    - Prefer videos matching user's declared tendency keywords.
    - Prefer videos from boards/topics with high past progress/focus.
    - Downweight already watched videos; upweight novelty.
    - Scale topic preference by user's focus_level (higher = trust history more).
    """
    from sqlalchemy import desc

    user = User.query.get(user_id)
    if not user:
        return getRecommendedVideos(limit)

    # Parse user tendency (comma/space separated list of keywords)
    tendency_keywords = []
    if user.tendency:
        raw = user.tendency.lower()
        # split on commas and spaces, keep non-empty tokens
        parts = [p.strip() for chunk in raw.split(',') for p in chunk.split()] if raw else []
        tendency_keywords = [p for p in parts if p]

    focus_level = user.focus_level if user.focus_level is not None else 0.5

    # Build history statistics per board/topic and watched videos set
    histories = WatchHistory.query.filter_by(user_id=user.id).all()
    watched_video_ids = {h.video_id for h in histories}
    board_stats = {}
    topic_stats = {}
    for h in histories:
        v = h.video or Video.query.get(h.video_id)
        if not v:
            continue
        prog = h.progress if h.progress is not None else 0.0
        foc = h.focus_sample if h.focus_sample is not None else prog
        if v.board:
            s = board_stats.setdefault(v.board.lower(), {'count': 0, 'sum_prog': 0.0, 'sum_focus': 0.0})
            s['count'] += 1
            s['sum_prog'] += prog
            s['sum_focus'] += foc
        if v.topic:
            s = topic_stats.setdefault(v.topic.lower(), {'count': 0, 'sum_prog': 0.0, 'sum_focus': 0.0})
            s['count'] += 1
            s['sum_prog'] += prog
            s['sum_focus'] += foc

    def pref_score(stats, key: str):
        k = (key or '').lower()
        if k in stats and stats[k]['count'] > 0:
            avg_prog = stats[k]['sum_prog'] / stats[k]['count']
            avg_focus = stats[k]['sum_focus'] / stats[k]['count']
            # Take a blend of progress and focus sample
            return 0.6 * avg_prog + 0.4 * avg_focus
        return 0.0

    # Score all videos
    videos = Video.query.all()
    scored = []
    for v in videos:
        # Base match with tendency keywords
        tags_text = ','.join(filter(None, [v.tags or '', v.board or '', v.topic or '', v.title or ''])).lower()
        base_match = 0.0
        for kw in tendency_keywords:
            if kw and kw in tags_text:
                base_match += 1.0
        if tendency_keywords:
            base_match = min(base_match / len(tendency_keywords), 1.0)

        # Preferences from history
        b_pref = pref_score(board_stats, v.board)
        t_pref = pref_score(topic_stats, v.topic)
        history_pref = 0.5 * b_pref + 0.5 * t_pref
        # Scale by focus level (higher focus increases weight on learned prefs)
        history_pref *= (0.5 + 0.5 * focus_level)  # scales to [0.5, 1.0]

        # Novelty bonus if not watched
        novelty = 1.0 if v.id not in watched_video_ids else 0.0

        score = 0.5 * base_match + 0.4 * history_pref + 0.1 * novelty
        scored.append((score, v))

    # Sort by score desc and break ties randomly using id randomness
    scored.sort(key=lambda sv: sv[0], reverse=True)
    return [v for _, v in scored[:limit]]

def getVideoById(video_id):
    return Video.query.filter_by(id=video_id).first()

def getAllVideos():
    return Video.query.all()

def addVideo(title, description, url, tags, imageUrl):
    try:
        video = Video(
            title=title,
            description=description,
            url=url,
            tags=tags,
            imageUrl=imageUrl
        )
        db.session.add(video)
        db.session.commit()
        return video
    except Exception as e:
        print(f"Error adding video: {e}")
        db.session.rollback()
        return None

def addVideoDetailed(title, description, url, imageUrl, board=None, topic=None, tags=None):
    try:
        video = Video(
            title=title,
            description=description,
            url=url,
            tags=tags or '',
            imageUrl=imageUrl,
            board=board,
            topic=topic
        )
        db.session.add(video)
        db.session.commit()
        return video
    except Exception as e:
        print(f"Error adding detailed video: {e}")
        db.session.rollback()
        return None


# Comment Database Functions
def addComment(text, user_id, video_id):
    try:
        comment = Comment(text=text, user_id=user_id, video_id=video_id)
        db.session.add(comment)
        db.session.commit()
        return comment
    except Exception as e:
        print(f"Error adding comment: {e}")
        db.session.rollback()
        return None


def getCommentsByVideo(video_id):
    return Comment.query.filter_by(video_id=video_id).order_by(Comment.created_at.desc()).all()

# User Database Functions
def userLogin(email, password):
    try:
        user = User.query.filter_by(email=email).first()
        # Verify using hashed password check
        if user and check_password_hash(user.password, password):
            return user
        # Optional debug output; avoid leaking hashes in production logs
        print(f"Wrong password for: {email}")
        return None
    except Exception as e:
        print(f"Error in userLogin: {e}")
        return None

def userRegister(username, password, email=None):
    try:
        # If username already exists, generate a unique variant by appending a numeric suffix
        base_username = (username or '').strip()
        if not base_username:
            base_username = (email.split('@')[0] if email else 'user')
        max_len = 80  # matches schema length
        candidate = base_username[:max_len]
        existing_user = User.query.filter_by(username=candidate).first()
        if existing_user:
            suffix = 1
            # Reserve space for suffix like _2, _3, ...
            while True:
                suffix_str = f"_{suffix}"
                candidate = f"{base_username[:max_len - len(suffix_str)]}{suffix_str}"
                if not User.query.filter_by(username=candidate).first():
                    break
                suffix += 1

        # Check if email already exists (if provided)
        if email:
            existing_email = User.query.filter_by(email=email).first()
            if existing_email:
                return None
        
        # Create new user with hashed password
        hashed_password = generate_password_hash(password)
        user = User(
            username=candidate,
            password=hashed_password,
            email=email
        )
        
        db.session.add(user)
        db.session.commit()
        return user
    except Exception as e:
        print(f"Error in userRegister: {e}")
        db.session.rollback()
        return None

def userProfile(user_id):
    try:
        user = User.query.get(user_id)
        return user
    except Exception as e:
        print(f"Error in userProfile: {e}")
        return None

def updateUserTendency(user_id, tendency):
    try:
        user = User.query.get(user_id)
        if not user:
            return False
        user.tendency = tendency
        db.session.commit()
        return True
    except Exception as e:
        print(f"Error in updateUserTendency: {e}")
        db.session.rollback()
        return False

def updateUserProfile(user_id, username=None, photoUrl=None):
    try:
        user = User.query.get(user_id)
        if not user:
            return False, 'User not found'
        if username is not None:
            # Ensure username uniqueness if changed
            if username != user.username:
                existing = User.query.filter_by(username=username).first()
                if existing:
                    return False, 'Username already taken'
            user.username = username
        if photoUrl is not None:
            user.photoUrl = photoUrl
        db.session.commit()
        return True, None
    except Exception as e:
        print(f"Error in updateUserProfile: {e}")
        db.session.rollback()
        return False, str(e)

def updateUserFocusLevel(user_id: int, focus_level: float):
    try:
        user = User.query.get(user_id)
        if not user:
            return False
        clamped = max(0.0, min(1.0, float(focus_level)))
        user.focus_level = clamped
        db.session.commit()
        return True
    except Exception as e:
        print(f"Error in updateUserFocusLevel: {e}")
        db.session.rollback()
        return False

def recordWatchHistory(user_id: int, video_id: int, progress: float = None, focus_sample: float = None):
    try:
        prog = None if progress is None else max(0.0, min(1.0, float(progress)))
        foc = None if focus_sample is None else max(0.0, min(1.0, float(focus_sample)))
        wh = WatchHistory(user_id=user_id, video_id=video_id, progress=prog, focus_sample=foc)
        db.session.add(wh)
        db.session.commit()
        return wh
    except Exception as e:
        print(f"Error recording watch history: {e}")
        db.session.rollback()
        return None

def getUserWatchHistory(user_id: int):
    return WatchHistory.query.filter_by(user_id=user_id).order_by(WatchHistory.watched_at.desc()).all()
