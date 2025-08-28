import React, { useEffect, useState, useRef } from 'react';
import './ProfilePage.css';
import { getProfile, UserProfile, updateTendency, updateProfile, uploadProfilePhoto } from './request';

const ProfilePage: React.FC = () => {
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tendencies, setTendencies] = useState<Record<string, boolean>>({});
  const [selectedTopic, setSelectedTopic] = useState('');
  // Track whether a tendencies change was user-initiated
  const dirtyRef = useRef(false);
  const [editing, setEditing] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tempPhotoUrl, setTempPhotoUrl] = useState<string | null>(null);

  const allTopics = ['Science', 'Math', 'History', 'Language', 'Technology'];

  useEffect(() => {
    const fetchProfile = async () => {
      const data = await getProfile();
      setUserData(data);
      if (data?.username) setNewUsername(data.username);
      if (data?.tendency) {
        const parsed: Record<string, boolean> = {};
        try {
          const obj = JSON.parse(data.tendency);
          if (obj && typeof obj === 'object') {
            Object.entries(obj).forEach(([key, value]) => {
              parsed[key] = Boolean(value);
            });
          }
        } catch {
          data.tendency.split(',').forEach((topic) => {
            const t = topic.trim();
            if (t) parsed[t] = true;
          });
        }
        setTendencies(parsed);
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    // Only push updates when the user changed tendencies
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    updateTendency(tendencies);
  }, [tendencies]);

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
          <div className="tendency-add">
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
            >
              <option value="">Select a topic</option>
              {allTopics
                .filter((t) => !(t in tendencies))
                .map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
            </select>
            <button
              onClick={() => {
                if (selectedTopic && !(selectedTopic in tendencies)) {
                  dirtyRef.current = true;
                  setTendencies((prev) => ({ ...prev, [selectedTopic]: true }));
                  setSelectedTopic('');
                }
              }}
            >
              Add
            </button>
          </div>
          {Object.keys(tendencies).length ? (
            Object.entries(tendencies).map(([topic, enabled]) => (
              <div className="preference-item" key={topic}>
                <span>{topic}</span>
                <div className="preference-controls">
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => {
                        dirtyRef.current = true;
                        setTendencies((prev) => ({
                          ...prev,
                          [topic]: !prev[topic]
                        }));
                      }
                      }
                    />
                    <span className="slider round"></span>
                  </label>
                  <button
                    className="remove-btn"
                    onClick={() => {
                      dirtyRef.current = true;
                      setTendencies((prev) => {
                        const updated = { ...prev };
                        delete updated[topic];
                        return updated;
                      });
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p>Not specified</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
