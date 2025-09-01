import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signup } from './request';
import './SignUpPage.css';

const SignUpPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      if (!name || !email || !password || !confirmPassword) {
        setErrorMessage('Please fill in all fields');
        setShowErrorModal(true);
        return;
      }

      if (!email.includes('@')) {
        setErrorMessage('Please enter a valid email');
        setShowErrorModal(true);
        return;
      }

      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match');
        setShowErrorModal(true);
        return;
      }

      const result = await signup(email, password, name);
      if (result.success) {
        navigate('/welcome');
      } else {
        setErrorMessage('Signup failed. Please try again.');
        setShowErrorModal(true);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('An error occurred during signup');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page">
      <main className="signup-container">
        <div className="signup-card">
          <h1 className="signup-title">Sign Up for BrainGrow AI</h1>

          <form onSubmit={handleSubmit} className="signup-form">
            <div className="form-group">
              <label htmlFor="name" className="form-label">Name</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-input"
                placeholder="Your name"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email" className="form-label">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="your.email@example.com"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="Enter your password"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="form-input"
                placeholder="Confirm your password"
                disabled={loading}
              />
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="signup-button"
                disabled={loading}
              >
                {loading ? 'Signing up...' : 'Sign Up'}
              </button>
            </div>
          </form>
        </div>
      </main>

      {showErrorModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <h3 className="modal-title">Signup Failed</h3>
            <p className="modal-message">{errorMessage}</p>
            <div className="modal-actions">
              <button
                className="modal-button"
                onClick={() => setShowErrorModal(false)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignUpPage;
