import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const OFFICIAL_EMAIL = 'officials@gmail.com';
const OFFICIAL_PASSWORD = 'officials@123';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123';

const LoginPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const successMessage = location.state?.message;

  const [activeTab, setActiveTab] = useState('Citizen');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsSubmitting(true);

    try {
      const normalizedEmail = email.toLowerCase().trim();

      if (normalizedEmail === OFFICIAL_EMAIL && password === OFFICIAL_PASSWORD) {
        const officialUser = {
          id: 'officials-static',
          name: 'Officials',
          email: OFFICIAL_EMAIL,
          phone: '',
          role: 'Official',
        };

        localStorage.setItem('currentUser', JSON.stringify(officialUser));
        navigate('/official-management');
        return;
      } else if (normalizedEmail === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        const adminUser = {
          id: 'admin-static',
          name: 'Admin',
          email: ADMIN_EMAIL,
          phone: '',
          role: 'Admin',
        };
        localStorage.setItem('currentUser', JSON.stringify(adminUser));
        sessionStorage.setItem('adminAuthed', 'true');
        navigate('/admin');
        return;
      }

      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          portal: activeTab,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || 'Login failed');
      }

      localStorage.setItem('currentUser', JSON.stringify(data.user));

      const roleRedirects = {
        Official: '/official-management',
        'Tree Cutter': '/task',
        Admin: '/admin',
        Citizen: '/home',
      };
      navigate(roleRedirects[data.user.role] || '/home');
    } catch (error) {
      setLoginError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <h2>Login to Portal</h2>
      <p>Please enter your credentials to access your dashboard.</p>

      {successMessage && (
        <div style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem', border: '1px solid #34d399' }}>
          {successMessage}
        </div>
      )}

      {loginError && (
        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem', border: '1px solid #f87171' }}>
          {loginError}
        </div>
      )}

      <div className="portal-tabs">
        <label>Select Portal</label>
        <div className="tabs-grid">
          {['Citizen', 'Tree Cutter'].map((tab) => (
            <button
              key={tab}
              className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
              type="button"
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Email Address</label>
          <div className="input-wrapper">
            <Mail className="input-icon" size={20} />
            <input 
              type="email" 
              className="form-control" 
              placeholder="name@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
        </div>

        <div className="form-group">
          <div className="form-actions" style={{ marginBottom: '0.5rem', marginTop: 0 }}>
            <label style={{ marginBottom: 0 }}>Password</label>
            <a href="/forgot-password" className="forgot-password">Forgot Password?</a>
          </div>
          <div className="input-wrapper">
            <Lock className="input-icon" size={20} />
            <input 
              type={showPassword ? 'text' : 'password'} 
              className="form-control has-toggle" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
            <button 
              type="button" 
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <div className="form-actions">
          <label className="checkbox-wrapper">
            <input type="checkbox" />
            <span>Remember this device</span>
          </label>
        </div>

        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Signing In...' : 'Secure Login'}
        </button>

        <div className="divider">
          <span>OR</span>
        </div>

        <div className="auth-footer">
          Not an official member? <Link to="/register">Register here</Link>
        </div>
      </form>
    </AuthLayout>
  );
};

export default LoginPage;
