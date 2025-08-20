import React from 'react';
import './ProfilePage.css';

const ProfilePage: React.FC = () => {
  // In a real application, you would fetch user data from an API
  const userData = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    joinDate: 'January 2023',
    avatarUrl: 'https://via.placeholder.com/150',
    bio: 'Learning enthusiast and AI researcher interested in neural networks and machine learning applications.',
    preferences: {
      notifications: true,
      darkMode: false,
      emailSubscriptions: true
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-avatar">
          <img src={userData.avatarUrl} alt="Profile" className="avatar-image" />
        </div>
        <div className="profile-info">
          <h1 className="profile-name">{userData.name}</h1>
          <p className="profile-email">{userData.email}</p>
          <p className="profile-join-date">Joined {userData.joinDate}</p>
        </div>
      </div>

      <div className="profile-content">
        <div className="profile-bio">
          <h2>About</h2>
          <p>{userData.bio}</p>
        </div>

        <div className="profile-preferences">
          <h2>Preferences</h2>
          <div className="preference-item">
            <span>Notifications</span>
            <label className="switch">
              <input type="checkbox" checked={userData.preferences.notifications} />
              <span className="slider round"></span>
            </label>
          </div>
          <div className="preference-item">
            <span>Dark Mode</span>
            <label className="switch">
              <input type="checkbox" checked={userData.preferences.darkMode} />
              <span className="slider round"></span>
            </label>
          </div>
          <div className="preference-item">
            <span>Email Subscriptions</span>
            <label className="switch">
              <input type="checkbox" checked={userData.preferences.emailSubscriptions} />
              <span className="slider round"></span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;