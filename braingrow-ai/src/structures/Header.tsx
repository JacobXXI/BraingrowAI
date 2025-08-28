import React, { useState, useEffect } from 'react';
import { FaSearch } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom'; // Add useLocation
import { logout, isAuthenticated } from '../request';
import logo from '../assets/logo.png';
import './Header.css';

const Header: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();
  const location = useLocation(); // Add location hook

  // Check authentication status on mount and when location changes
  useEffect(() => {
    setIsLoggedIn(isAuthenticated());
  }, [location.pathname]); // Add location dependency

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (query) {
      navigate(`/search?query=${encodeURIComponent(query)}`);
    }
  };
  
  const handleLogout = () => {
    logout();
    setIsLoggedIn(false);
    navigate('/');
  };

  return (
    <header className="header">
      <div className="header-logo" onClick={() => navigate('/')}>
        <img src={logo} alt="Logo" className="logo-image" />
      </div>

      <div className="search-container">
        <form onSubmit={handleSearch} className="search-bar-container">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-button">
            <FaSearch size={16} className="search-icon" />
            <span className="search-button-text">Search</span>
          </button>
        </form>
      </div>

      <div className="auth-buttons">
        {isLoggedIn ? (
          <>            
            <button className="profile-button" onClick={() => navigate('/profile')}>
              Profile
            </button>
            <button className="logout-button" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <>            
            <button className="login-button" onClick={() => navigate('/login')}>
              Login
            </button>
            <button className="signup-button" onClick={() => navigate('/signup')}>
              Sign Up
            </button>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;