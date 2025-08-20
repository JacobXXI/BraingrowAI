// Add this import at the top of the file
import './HomePage.css';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getRecommandVideo } from './request';
import { video } from './structures/video';

export function HomePage() {
  const [videos, setVideos] = useState<Array<video>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRecommendedVideos = async () => {
      try {
        const recommendedVideos = await getRecommandVideo(3);
        setVideos(recommendedVideos);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendedVideos();
  }, []);

    const handleVideoClick = (video: video) => {
    // Remove the state object to force API fetch
    navigate(`/watch/${video._id}`);
  };

  if (loading) return <div className="loading">Loading recommended videos...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="screen">
      <h1>Braingrow AI!</h1>
      <div className="video-grid">
        {videos.map(video => (
          <div 
            key={video._id}
            className="video-item"
            onClick={() => handleVideoClick(video)}
          >
            {/* Video content using dynamic video data */}
            <div className="video-image-container">
              <img 
                src={video.coverUrl}
                alt={video.title}
                className="video-cover-image"
                onError={(e) => { (e.target as HTMLImageElement).src = '/vite.svg'; }}
              />
            </div>
            <div className="video-details">
              <h3 className="video-title">{video.title}</h3>
              <p className="video-description">{video.description}</p>
              <div className="video-metadata">
                {video.author && <span className="video-author">👤 {video.author}</span>}
                {video.views != null && <span className="video-views">👁️ {video.views}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}