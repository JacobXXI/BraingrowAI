import React, { useEffect, useState, useRef } from 'react';
import './ProfilePage.css';
import { getProfile, UserProfile, updateTendency } from './request';

const ProfilePage: React.FC = () => {
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tendencies, setTendencies] = useState<Record<string, boolean>>({});
  const [selectedTopic, setSelectedTopic] = useState('');
  const initialLoad = useRef(true);

  const allTopics = ['Science', 'Math', 'History', 'Language', 'Technology'];

  useEffect(() => {
    const fetchProfile = async () => {
      const data = await getProfile();
      setUserData(data);
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
        // setTendencies(parsed);
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    if (initialLoad.current) {
      initialLoad.current = false;
    } else {
      updateTendency(tendencies);
    }
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
            src={userData.photoUrl || 'https://via.placeholder.com/150'}
            alt="Profile"
            className="avatar-image"
          />
        </div>
        <div className="profile-info">
          <h1 className="profile-name">{userData.username}</h1>
          <p className="profile-email">{userData.email}</p>
          {userData.created_at && (
            <p className="profile-join-date">
              Joined {new Date(userData.created_at).toLocaleString()}
            </p>
          )}
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
                  setTendencies((prev) => ({ ...prev, [selectedTopic]: true }));
                  console.log('Updated:', selectedTopic);
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
                        setTendencies((prev) => ({
                          ...prev,
                          [topic]: !prev[topic]
                        }));
                        console.log('Updated:', selectedTopic);
                      }
                      }
                    />
                    <span className="slider round"></span>
                  </label>
                  <button
                    className="remove-btn"
                    onClick={() => {
                      setTendencies((prev) => {
                        const updated = { ...prev };
                        delete updated[topic];
                        return updated;
                      });
                      console.log('Updated:', selectedTopic);
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
