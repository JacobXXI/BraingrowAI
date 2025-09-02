import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { video } from './structures/video';
import { getVideo, askVideoQuestion } from './request';
import * as katex from 'katex';
import 'katex/dist/katex.min.css';
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
  const renderMarkdown = (text: string) => {
    const escapeHtml = (s: string) =>
      s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const lines = text.split('\n');
    let html = '';
    let listItems: string[] = [];
    let listType: 'ol' | 'ul' | null = null;

    const flushList = () => {
      if (listItems.length > 0 && listType) {
        const tag = listType;
        html += `<${tag}>${listItems.join('')}</${tag}>`;
        listItems = [];
        listType = null;
      }
    };

    const inlineFormat = (s: string) => {
      // 1) Extract inline math $...$ (no newlines) and replace with placeholders
      const mathMap: string[] = [];
      let withPlaceholders = s.replace(/\$([^$\n]+)\$/g, (_m, expr: string) => {
        const html = katex.renderToString(expr, { throwOnError: false, output: 'html' });
        const key = `@@MATH${mathMap.length}@@`;
        mathMap.push(html);
        return key;
      });

      // 2) Escape the rest
      let t = escapeHtml(withPlaceholders);

      // 3) Apply minimal inline markdown on non-math parts
      // Bold: **text**
      t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      // Inline code: `code`
      t = t.replace(/`([^`]+)`/g, '<code>$1</code>');

      // 4) Restore math placeholders with KaTeX HTML (already safe)
      mathMap.forEach((html, i) => {
        const key = `@@MATH${i}@@`;
        t = t.replace(key, html);
      });

      return t;
    };

    for (const line of lines) {
      const raw = line.replace(/\r$/, '');
      const trimmed = raw.trim();
      if (!trimmed) {
        flushList();
        continue;
      }

      // Ordered list: "1. text"
      let m = /^(\d+)\.\s+(.*)$/.exec(trimmed);
      if (m) {
        const item = `<li>${inlineFormat(m[2])}</li>`;
        if (listType !== 'ol') {
          flushList();
          listType = 'ol';
        }
        listItems.push(item);
        continue;
      }

      // Unordered list: "- text" or "* text"
      m = /^[-*]\s+(.*)$/.exec(trimmed);
      if (m) {
        const item = `<li>${inlineFormat(m[1])}</li>`;
        if (listType !== 'ul') {
          flushList();
          listType = 'ul';
        }
        listItems.push(item);
        continue;
      }

      // Regular paragraph
      flushList();
      html += `<p>${inlineFormat(trimmed)}</p>`;
    }

    flushList();
    return { __html: html };
  };
  

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
        userMessage.text
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
            {isAsking && (
              <div className="chat-message ai loading">
                <div className="loading-spinner" />
              </div>
            )}
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
