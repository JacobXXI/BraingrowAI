import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { video } from './structures/video';
import { getVideo, askVideoQuestion } from './request';
import './WatchPage.css';

export default function WatchPage() {
  const location = useLocation();
  const { id } = useParams();
  const [video, setVideo] = useState<video | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null); // Add error state
  const [messages, setMessages] = useState<{ sender: 'user' | 'ai'; text: string }[]>([]);
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    let html = '';
    let listItems: string[] = [];
    const flushList = () => {
      if (listItems.length > 0) {
        html += `<ol>${listItems.join('')}</ol>`;
        listItems = [];
      }
    };
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        flushList();
        return;
      }
      const bolded = trimmed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      const listMatch = /^(\d+)\.\s+(.*)/.exec(bolded);
      if (listMatch) {
        listItems.push(`<li>${listMatch[2]}</li>`);
      } else {
        flushList();
        html += `<p>${bolded}</p>`;
      }
    });
    flushList();
    return { __html: html };
  };
  const clearSelection = () => {
    if (duration > 0) {
      setStartTime(0);
      setEndTime(duration);
    }
  };

  const handleStartChange = (value: number) => {
    setStartTime(Math.min(value, endTime));
  };

  const handleEndChange = (value: number) => {
    setEndTime(Math.max(value, startTime));
  };

  const startPercent = duration ? (startTime / duration) * 100 : 0;
  const endPercent = duration ? (endTime / duration) * 100 : 0;
  const trackBackground = `linear-gradient(to right, #ccc ${startPercent}%, #2196f3 ${startPercent}%, #2196f3 ${endPercent}%, #ccc ${endPercent}%)`;
  const selectionActive = duration > 0 && (startTime > 0 || endTime < duration);

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

  const isYouTubeUrl = (url: string) => /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(url);
  const extractYouTubeId = (url: string): string | null => {
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtu.be')) {
        return u.pathname.slice(1) || null;
      }
      if (u.hostname.includes('youtube.com')) {
        if (u.pathname === '/watch') return u.searchParams.get('v');
        const parts = u.pathname.split('/').filter(Boolean);
        const idx = parts.indexOf('embed');
        if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
      }
    } catch {
      // ignore
    }
    return null;
  };
  const ytId = isYouTubeUrl(video.url) ? extractYouTubeId(video.url) : null;
  const ytEmbed = ytId ? `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1` : null;

  const handleSend = async () => {
    if (!id || !question.trim()) return;
    const userMessage = { sender: 'user' as const, text: question };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion('');
    setIsAsking(true);
    try {
      const answer = await askVideoQuestion(
        id,
        userMessage.text,
        startTime,
        endTime
      );
      setMessages((prev) => [...prev, { sender: 'ai', text: answer }]);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Failed to get response';
      setMessages((prev) => [...prev, { sender: 'ai', text: msg }]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="watch-container">
      <div className="video-player-container">
        <div className="video-player">
          {ytEmbed ? (
            <iframe
              src={ytEmbed}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <video
              controls
              src={video.url}
              poster={video.coverUrl}
              onLoadedMetadata={(e) => {
                const dur = Math.floor(e.currentTarget.duration);
                setDuration(dur);
                setEndTime(dur);
              }}
              onError={(e) => {
                const videoElement = e.target as HTMLVideoElement;
                const errorDetails = videoElement.error ? ` (Code: ${videoElement.error.code}, Message: ${videoElement.error.message})` : '';
                setVideoError(`Failed to load video player${errorDetails}`);
                console.error('Video element error details:', videoElement.error);
                console.error('Attempted video URL:', video.url);
              }}
            />
          )}
        </div>
      </div>

      <div className="video-info">
        <div className="video-header">
          <h1 className="video-title">{video.title}</h1>
        </div>

        <div className="video-description">
          <h3>Description</h3>
          <p>{video.description}</p>
        </div>

        <div className="chat-window">
          <div className="chat-header">
            <span>Ask AI</span>
          </div>
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`chat-message ${m.sender}`}
                dangerouslySetInnerHTML={renderMarkdown(m.text)}
              />
            ))}
          </div>
          <div className="time-range">
            {selectionActive && (
              <div className="time-range-actions">
                <button
                  type="button"
                  className="clear-selection"
                  onClick={clearSelection}
                  disabled={isAsking}
                >
                  Cancel selection
                </button>
              </div>
            )}
            <div className="range-inputs">
              <input
                type="range"
                min={0}
                max={duration}
                value={endTime}
                onChange={(e) => handleEndChange(Number(e.target.value))}
                disabled={isAsking}
                className="range-end"
                style={{ background: trackBackground }}
              />
              <input
                type="range"
                min={0}
                max={duration}
                value={startTime}
                onChange={(e) => handleStartChange(Number(e.target.value))}
                disabled={isAsking}
                className="range-start"
              />
            </div>
            <div className="time-values">
              {selectionActive ? (
                <>
                  <span>{startTime}s</span>
                  <span>{endTime}s</span>
                </>
              ) : (
                  <span>Full video</span>
              )}
            </div>
          </div>
          <div className="chat-input">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question..."
              disabled={isAsking}
            />
            <button onClick={handleSend} disabled={isAsking || !question.trim()}>
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
