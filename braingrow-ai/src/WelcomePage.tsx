import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './WelcomePage.css';
import { getTagsCatalog, updateTendencySelection, TagCatalog, uploadProfilePhoto, updateProfile } from './request';
import defaultUserImg from './assets/default-user.png';

const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState<TagCatalog | null>(null);
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirtyRef = useRef(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const fmt = (s: string): string => {
    const acronyms = new Set(['ai', 'nba', 'aws', 'gcp', 'nlp', 'api', 'sql']);
    const lower = s.toLowerCase();
    if (acronyms.has(lower)) return lower.toUpperCase();
    return lower.replace(/\b\w/g, (m) => m.toUpperCase());
  };

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const tags = await getTagsCatalog();
        setCatalog(tags);
      } catch (e) {
        console.error(e);
        setError('Failed to load topics');
      } finally {
        setLoading(false);
      }
    };
    fetchTags();
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleContinue = async () => {
    setSaving(true);
    setError(null);
    try {
      // If user picked a photo, upload and update profile
      if (selectedFile) {
        setUploading(true);
        const url = await uploadProfilePhoto(selectedFile);
        await updateProfile({ photoUrl: url });
        setUploading(false);
      }

      const ok = await updateTendencySelection(selected);
      if (!ok) throw new Error('Save failed');
      navigate('/');
    } catch (e) {
      console.error(e);
      setError('Could not save your preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="welcome-page">
        <div className="welcome-card">Loading...</div>
      </div>
    );
  }

  return (
    <div className="welcome-page">
      <div className="welcome-card">
        <h1 className="welcome-title">Welcome to BrainGrow AI</h1>
        <p className="welcome-subtitle">Pick a few areas so we can personalize recommendations for you.</p>

        {error && <div className="welcome-error">{error}</div>}

        <div className="avatar-section">
          <div className="avatar">
            <img src={previewUrl || defaultUserImg} alt="Profile" />
          </div>
          <div className="avatar-actions">
            <label className="btn secondary">
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setSelectedFile(file);
                  if (previewUrl) URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(file ? URL.createObjectURL(file) : null);
                }}
              />
              Choose photo
            </label>
            {selectedFile && (
              <button
                className="btn secondary"
                onClick={() => {
                  setSelectedFile(null);
                  if (previewUrl) URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                }}
              >
                Remove
              </button>
            )}
          </div>
        </div>

        {!catalog || Object.keys(catalog).length === 0 ? (
          <div className="empty-state">No topics available right now.</div>
        ) : (
          <div className="boards">
            {Object.entries(catalog).map(([board, topics]) => {
              const topicList = Object.keys(topics || {});
              const chosen = new Set((selected[board] || []).map((t) => t));
              const allSelected = topicList.length > 0 && topicList.every((t) => chosen.has(t));
              const hasAny = chosen.size > 0;
              return (
                <div className="board" key={board}>
                  <div className="board-header">
                    <div className="board-title">{fmt(board)}</div>
                    <div className="board-actions">
                      <button
                        className="chip"
                        onClick={() => {
                          dirtyRef.current = true;
                          setSelected((prev) => ({ ...prev, [board]: topicList.slice() }));
                        }}
                        disabled={allSelected || topicList.length === 0}
                        title="Select all"
                      >
                        Select All
                      </button>
                      <button
                        className="chip"
                        onClick={() => {
                          dirtyRef.current = true;
                          setSelected((prev) => {
                            const next = { ...prev } as Record<string, string[]>;
                            delete next[board];
                            return next;
                          });
                        }}
                        disabled={!hasAny}
                        title="Clear"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="topics">
                    {topicList.map((t) => (
                      <label key={t} className={`topic ${chosen.has(t) ? 'selected' : ''}`}>
                        <input
                          type="checkbox"
                          checked={chosen.has(t)}
                          onChange={(e) => {
                            dirtyRef.current = true;
                            setSelected((prev) => {
                              const current = new Set(prev[board] || []);
                              if (e.target.checked) current.add(t); else current.delete(t);
                              const arr = Array.from(current);
                              const next = { ...prev } as Record<string, string[]>;
                              if (arr.length > 0) next[board] = arr; else delete next[board];
                              return next;
                            });
                          }}
                        />
                        <span>{fmt(t)}</span>
                      </label>
                    ))}
                    {topicList.length === 0 && (
                      <span className="no-topics">No topics</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="welcome-actions">
          <button className="btn secondary" onClick={() => navigate('/')}>Skip for now</button>
          <button className="btn primary" onClick={handleContinue} disabled={saving || uploading}>
            {saving || uploading ? 'Saving...' : 'Save and continue'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;
