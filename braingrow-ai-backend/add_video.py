from models import db, Video
from app import app
import time
import argparse

def add_video(title: str, description: str, url: str, tags: str, image_url: str):
    """Add a new video to the database"""
    new_video = Video(
        title=title,
        description=description,
        url=url,
        tags=tags,
        imageUrl=image_url
    )

    try:
        db.session.add(new_video)
        db.session.commit()
        print(f"Added: {title}")
        return new_video
    except Exception as e:
        db.session.rollback()
        print(f"Error adding {title}: {str(e)}")
        return None

def parse_video_file(filename):
    topics = {}
    current_topic = None
    current_video = None

    with open(filename, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line.startswith('===') and line.endswith('==='):
                # New topic section
                if current_topic and current_video:
                    topics[current_topic].append(current_video)
                current_topic = line.strip('= ')
                topics[current_topic] = []
                current_video = None
            elif line.startswith('Video '):
                # New video entry
                if current_video:
                    topics[current_topic].append(current_video)
                current_video = {}
            elif ': ' in line and current_video is not None:
                # Video attribute
                key, value = line.split(': ', 1)
                key_lower = key.lower().replace(' ', '_')
                current_video[key_lower] = value
        # Add the last video
        if current_topic and current_video:
            topics[current_topic].append(current_video)
    return topics

def import_topic_videos(filename):
    # Parse video details from file
    topics = parse_video_file(filename)

    # Add videos for each topic
    with app.app_context():
        for topic, videos in topics.items():
            print(f"\nAdding videos for: {topic}")
            for video_data in videos:
                add_video(
                    title=video_data["title"],
                    description=video_data["description"],
                    url=video_data["url"],
                    tags=f"{topic.lower()}, {video_data['tags']}",
                    image_url=video_data["image_url"]
                )
                time.sleep(1)  # Prevent overwhelming the database

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Import videos from a text file into the database')
    parser.add_argument('filename', help='Path to the text file containing video details')
    args = parser.parse_args()
    import_topic_videos(args.filename)