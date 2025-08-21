import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { video } from './structures/video';
import './WatchPage.css';

export default function WatchPage() {
  const location = useLocation();
  const { id } = useParams();
  const [video, setVideo] = useState<video | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null); // Add error state

  useEffect(() => {
    // Reset state when component mounts or id changes
    setVideo(null);
    setIsLoading(true);
    setVideoError(null);

    if (id) {
      // This path will now always execute
      setIsLoading(true);
      getVideo(id)
        .then((videoData: video) => {
          if (!videoData.url) {
            throw new Error('Video URL is missing');
          }
          setVideo(videoData);
          console.log('Fetched video object:', videoData);
        })
        .catch((error: unknown) => {
          console.error('Error fetching video:', error);
          setVideoError(error instanceof Error ? error.message : 'Failed to load video data');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
      setVideoError('No video ID provided');
    }
  }, [id, location.state]);

  if (isLoading) return <div>Loading video...</div>;
  if (videoError) return <div className="error-message">Error: {videoError}</div>;
  if (!video) return <div>Video not found</div>;
  if (!video.url) return <div>Invalid video source - no URL provided</div>;

  return (
    <div className="watch-container">
      <div className="video-player-container">
        <div className="video-player">
          <video
            controls
            src={video.url}
            poster={video.coverUrl}
            onError={(e) => {
              const videoElement = e.target as HTMLVideoElement;
              const errorDetails = videoElement.error ? ` (Code: ${videoElement.error.code}, Message: ${videoElement.error.message})` : '';
              setVideoError(`Failed to load video player${errorDetails}`);
              console.error('Video element error details:', videoElement.error);
              console.error('Attempted video URL:', video.url);
            }}
          />
        </div>
      </div>

      <div className="video-info">
        <h1 className="video-title">{video.title}</h1>

        <div className="video-description">
          <h3>Description</h3>
          <p>{video.description}</p>
        </div>

        <div className="video-comments">
          <h3>Comments</h3>
          <div className="comment-input">
            <textarea placeholder="Add a comment..." />
            <button className="comment-submit">Post</button>
          </div>
          <div className="comments-list">
            <p>No comments yet. Be the first to comment!</p>
          </div>
        </div>
      </div>
    </div>
  );
}