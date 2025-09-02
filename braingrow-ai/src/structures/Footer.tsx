import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';
import logo from '../assets/logo.png';

const Footer: React.FC = () => {
  const hotTopics = [
    { name: 'Literature', href: '/search?query=Literature' },
    { name: 'Basketball', href: '/search?query=Basketball' },
    { name: 'Fitness', href: '/search?query=Fitness' },
    { name: 'Music', href: '/search?query=Music' },
    { name: 'Entrepreneurship', href: '/search?query=Entrepreneurship' },
    { name: 'Cybersecurity', href: '/search?query=Cybersecurity' },
    { name: 'Health', href: '/search?query=Health' }
  ];

  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Logo */}
        <div className="logo-section">
          <div className="logo-container">
            <img src={logo} alt="Logo" className="footer-logo" />
          </div>
        </div>

        {/* Tags Links */}
        <div className="hot-topics-section">
          <h3 className="section-title">Hot Topics</h3>
          {hotTopics.map((topic, index) => (
            <Link key={index} to={topic.href} className="footer-link">{topic.name}</Link>
          ))}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
