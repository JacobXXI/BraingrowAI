from flask import Flask
from models import db, Video

# Create a minimal Flask app to access the database
app = Flask(__name__)
# Replace the database URI with an absolute path
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///c:/Users/jacob/SoftwareDevelopment/Website/braingrow-ai-backend/instance/site.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

def clear_all_videos():
    # Create application context
    with app.app_context():
        try:
            # Get current video count
            video_count = Video.query.count()
            if video_count == 0:
                print("No videos found in database.")
                return

            # Ask for confirmation
            confirm = input(f"Are you sure you want to delete all {video_count} videos? (y/N): ")
            if confirm.lower() != 'y':
                print("Operation cancelled.")
                return

            # Delete all videos
            Video.query.delete()
            db.session.commit()
            print(f"Successfully deleted {video_count} videos.")

        except Exception as e:
            db.session.rollback()
            print(f"Error deleting videos: {str(e)}")

if __name__ == '__main__':
    clear_all_videos()