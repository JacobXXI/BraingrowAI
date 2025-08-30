import React, { useEffect, useState, useRef } from 'react';
import './ProfilePage.css';
import { 
  getProfile, 
  UserProfile, 
  updateProfile, 
  uploadProfilePhoto,
  getTagsCatalog,
  updateTendencySelection,
  TagCatalog
} from './request';

const ProfilePage: React.FC = () => {
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  // Tag catalog (board -> topic -> keywords)
  const [catalog, setCatalog] = useState<TagCatalog | null>(null);
  // User selection: board -> topics[]
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  // Keep parsed tokens from existing tendency string to preseed selection once catalog loads
  const tokensRef = useRef<Set<string>>(new Set());
  // Track whether a tendencies change was user-initiated
  const dirtyRef = useRef(false);
  const [editing, setEditing] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tempPhotoUrl, setTempPhotoUrl] = useState<string | null>(null);

  // Helpers
  const toTokens = (raw?: string): Set<string> => {
    const out = new Set<string>();
    if (!raw) return out;
    try {
      // try JSON first (legacy may be map)
      const obj = JSON.parse(raw);
      if (obj && typeof obj === 'object') {
        Object.entries(obj as Record<string, unknown>).forEach(([k, v]) => {
          if (typeof v === 'boolean' && v) out.add(k.toLowerCase());
          else out.add(k.toLowerCase());
        });
        return out;
      }
    } catch {
      // ignore; fall through to split
    }
    // split on commas and spaces
    const parts = [
      ...raw.split(',').map((s) => s.trim()),
    ].flatMap((s) => s.split(' ')).map((s) => s.trim().toLowerCase()).filter(Boolean);
    parts.forEach((p) => out.add(p));
    return out;
  };

  const fmt = (s: string): string => {
    // Simple title case with a few acronym tweaks
    const acronyms = new Set(['ai', 'nba', 'aws', 'gcp', 'nlp', 'api', 'sql']);
    const lower = s.toLowerCase();
    if (acronyms.has(lower)) return lower.toUpperCase();
    return lower.replace(/\b\w/g, (m) => m.toUpperCase());
  };

  useEffect(() => {
    const fetchAll = async () => {
      const [profile, tags] = await Promise.all([
        getProfile(),
        getTagsCatalog().catch(() => null)
      ]);
      if (tags) setCatalog(tags);
      if (profile) {
        setUserData(profile);
        if (profile.username) setNewUsername(profile.username);
        // pre-parse tokens; we will map to selection after catalog is set
        tokensRef.current = toTokens(profile.tendency);
      }
      setLoading(false);
    };
    fetchAll();
  }, []);

  useEffect(() => {
    // When we have both catalog and tokens (from profile), seed selection once
    if (!catalog || !userData) return;
    if (Object.keys(selected).length > 0) return; // don't overwrite user edits
    const tokens = tokensRef.current;
    if (!tokens || tokens.size === 0) return;
    const next: Record<string, string[]> = {};
    Object.entries(catalog).forEach(([board, topics]) => {
      const b = board.toLowerCase();
      const chosen: string[] = [];
      const topicKeys = Object.keys(topics || {});
      // If board token is present, select all topics; otherwise select only token-matching topics
      if (tokens.has(b)) {
        chosen.push(...topicKeys);
      } else {
        topicKeys.forEach((t) => {
          if (tokens.has(t.toLowerCase())) chosen.push(t);
        });
      }
      if (chosen.length > 0) next[board] = chosen;
    });
    if (Object.keys(next).length > 0) setSelected(next);
  }, [catalog, userData]);

  useEffect(() => {
    // Auto-save selection when user changes it
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    if (Object.keys(selected).length === 0) {
      // If cleared, send empty selection
      updateTendencySelection({}).catch(() => undefined);
    } else {
      updateTendencySelection(selected).catch(() => undefined);
    }
  }, [selected]);

  if (loading) {
    return <div className="profile-container">Loading...</div>;
  }

  if (!userData) {
    return <div className="profile-container">Unable to load profile</div>;
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-avatar">
          <img
            src={tempPhotoUrl || userData.photoUrl || 'https://via.placeholder.com/150'}
            alt="Profile"
            className="avatar-image"
          />
          {editing && (
            <>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploading(true);
                  try {
                    const url = await uploadProfilePhoto(file);
                    setTempPhotoUrl(url);
                  } catch (err) {
                    console.error(err);
                    alert((err as Error).message);
                  } finally {
                    setUploading(false);
                  }
                }}
                style={{ marginTop: '8px' }}
              />
              {uploading && <div>Uploading...</div>}
            </>
          )}
        </div>
        <div className="profile-info">
          {editing ? (
            <input
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="profile-name"
              style={{ fontSize: '1.75rem', padding: '6px', width: '100%' }}
            />
          ) : (
            <h1 className="profile-name">{userData.username}</h1>
          )}
          <p className="profile-email">{userData.email}</p>
          {userData.created_at && (
            <p className="profile-join-date">
              Joined {new Date(userData.created_at).toLocaleString()}
            </p>
          )}
          <div style={{ marginTop: '8px' }}>
            {!editing ? (
              <button onClick={() => setEditing(true)} title="Edit profile">
                ✎ Edit
              </button>
            ) : (
              <>
                <button
                  disabled={saving}
                  onClick={async () => {
                    setSaving(true);
                    try {
                      const updated = await updateProfile({
                        username: newUsername || undefined,
                        photoUrl: tempPhotoUrl || undefined
                      });
                      setUserData(updated);
                      setEditing(false);
                      setTempPhotoUrl(null);
                    } catch (err) {
                      console.error(err);
                      alert((err as Error).message);
                    } finally {
                      setSaving(false);
                    }
                  }}
                  style={{ marginRight: '8px' }}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setNewUsername(userData.username);
                    setTempPhotoUrl(null);
                  }}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="profile-content">
        <div className="profile-bio">
          <h2>Learning Tendency</h2>
          {!catalog ? (
            <p>Loading tags...</p>
          ) : (
            <>
              {Object.keys(catalog).length === 0 ? (
                <p>No tags available.</p>
              ) : (
                Object.entries(catalog).map(([board, topics]) => {
                  const topicList = Object.keys(topics || {});
                  const chosen = new Set((selected[board] || []).map((t) => t));
                  const allSelected = topicList.length > 0 && topicList.every((t) => chosen.has(t));
                  const hasAny = chosen.size > 0;
                  return (
                    <div key={board} style={{ marginBottom: '1rem' }}>
                      <div className="preference-item">
                        <span style={{ fontWeight: 600 }}>{fmt(board)}</span>
                        <div className="preference-controls">
                          <button
                            onClick={() => {
                              dirtyRef.current = true;
                              setSelected((prev) => ({
                                ...prev,
                                [board]: topicList.slice()
                              }));
                            }}
                            disabled={allSelected || topicList.length === 0}
                            title="Select all topics"
                          >
                            Select All
                          </button>
                          <button
                            onClick={() => {
                              dirtyRef.current = true;
                              setSelected((prev) => {
                                const next = { ...prev };
                                delete next[board];
                                return next;
                              });
                            }}
                            disabled={!hasAny}
                            title="Clear selection"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '6px 12px', padding: '6px 0' }}>
                        {topicList.map((t) => (
                          <label key={t} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                          <span style={{ color: '#666' }}>No topics</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              {Object.keys(selected).length === 0 && (
                <p style={{ color: '#666' }}>Not specified</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
