import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';
import logo from '../assets/logo.png';
import xLogo from '../assets/x-logo.svg';
import instagramLogo from '../assets/instagram-logo.svg';
import youtubeLogo from '../assets/youtube-logo.svg';
import linkedinLogo from '../assets/linkedin-logo.svg';

const Footer: React.FC = () => {
  const hotTopics = [
    { name: 'AI Ethics', href: '/search?query=AI%20Ethics' },
    { name: 'Machine Learning', href: '/search?query=Machine%20Learning' },
    { name: 'Quantum Computing', href: '/search?query=Quantum%20Computing' },
    { name: 'Sustainable Tech', href: '/search?query=Sustainable%20Tech' },
    { name: 'Metaverse', href: '/search?query=Metaverse' },
    { name: 'Cybersecurity', href: '/search?query=Cybersecurity' },
    { name: 'Renewable Energy', href: '/search?query=Renewable%20Energy' }
  ];

  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Logo and Social Icons */}
        <div className="logo-section">
          <div className="logo-container">
            <img src={logo} alt="Logo" className="footer-logo" />
          </div>
          <div className="social-icons">
            <a href="#" aria-label="X"><img src={xLogo} alt="X" className="social-icon" /></a>
            <a href="#" aria-label="Instagram"><img src={instagramLogo} alt="Instagram" className="social-icon" /></a>
            <a href="#" aria-label="YouTube"><img src={youtubeLogo} alt="YouTube" className="social-icon youtube-icon" /></a>
            <a href="#" aria-label="LinkedIn"><img src={linkedinLogo} alt="LinkedIn" className="social-icon" /></a>
          </div>
        </div>

        {/* Hot Topics Links */}
        <div className="hot-topics-section">
          <h3 className="section-title">Hot topics</h3>
          {hotTopics.map((topic, index) => (
            <Link key={index} to={topic.href} className="footer-link">{topic.name}</Link>
          ))}
        </div>
      </div>
    </footer>
  );
};

export default Footer;