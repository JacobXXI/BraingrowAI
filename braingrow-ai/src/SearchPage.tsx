import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { search } from './request';
import { video } from './structures/video';
import './SearchPage.css';

const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [videos, setVideos] = useState<video[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const query = searchParams.get('query') || '';

  useEffect(() => {
    const fetchResults = async () => {
      if (!query) return;
      setLoading(true);
      try {
        const results = await search(query);
        setVideos(results);
      } catch (error) {
        console.error('Search failed:', error);
        setVideos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  return (
    <div className="search-page screen">
      <h1>Search Result for "{query}"</h1>
      {loading ? (
        <div className="loading">Loading results...</div>
      ) : videos.length > 0 ? (
        <div className="video-container">
          {videos.map((video) => (
            <div 
              key={video._id} 
              className="video-item" 
              onClick={() => navigate(`/watch/${video._id}`)}
            >
              <div className="video-image-container">
                <img src={video.coverUrl} alt={video.title} className="video-cover-image" />
              </div>
              <div className="video-details">
                <h3 className="video-title">{video.title}</h3>
                <p className="video-description">{video.description || 'No description available'}</p>
                <div className="video-metadata">
                  <span className="video-author">👤 {video.author}</span>
                  <span className="video-views">👁️ {video.views} views</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-results">No results found for "{query}"</div>
      )}
    </div>
  );
};

export default SearchPage;