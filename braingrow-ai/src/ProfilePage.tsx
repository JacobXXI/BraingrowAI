import React, { useEffect, useState } from 'react';
import './ProfilePage.css';
import { getProfile, UserProfile } from './request';

const ProfilePage: React.FC = () => {
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const data = await getProfile();
      setUserData(data);
      setLoading(false);
    };
    fetchProfile();
  }, []);

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
          <p className="profile-tendency">Current tendency: {userData.tendency?.name || 'Not specified'}</p>
          {userData.session_info?.login_time && (
            <p className="profile-join-date">
              Logged in {new Date(userData.session_info.login_time).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      <div className="profile-content">
        <div className="profile-bio">
          <h2>Learning Tendency</h2>
          <p>{userData.tendency?.name || 'Not specified'}</p>
        </div>

        <div className="profile-preferences">
          <h2>Session Info</h2>
          <div className="preference-item">
            <span>Persistent Session</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={!!userData.session_info?.session_permanent}
                readOnly
              />
              <span className="slider round"></span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
