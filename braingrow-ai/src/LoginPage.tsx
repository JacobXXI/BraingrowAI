import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from './request';
import './LoginPage.css';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      // Basic validation
      if (!email || !password) {
        setErrorMessage('Please fill in all fields');
        setShowErrorModal(true);
        return;
      }

      if (!email.includes('@')) {
        setErrorMessage('Please enter a valid email');
        setShowErrorModal(true);
        return;
      }

      // Call login function
      const result = await login(email, password);
      if (result.success) {
        navigate('/'); // Redirect to home after successful login
      } else {
        setErrorMessage('Login failed. Please check your credentials.');
        setShowErrorModal(true);
      }
    } catch (err) {
      setErrorMessage('An error occurred during login');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <main className="login-container">
        <div className="login-card">
          <h1 className="login-title">Login to BrainGrow AI</h1>
          
          <form onSubmit={handleSubmit} className="login-form">
            {/* Remove the error-message div */}
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

            <div className="form-actions">
              <button
                type="submit"
                className="login-button"
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Add error modal dialog */}
      {showErrorModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <h3 className="modal-title">Login Failed</h3>
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

export default LoginPage;