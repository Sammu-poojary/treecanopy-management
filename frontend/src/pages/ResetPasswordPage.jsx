import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Password strength
  const getStrength = (pw) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };

  const strengthScore = getStrength(password);
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['', '#ef4444', '#f97316', '#eab308', '#16a34a'];

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token. Please request a new reset link.');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      return setError('Passwords do not match.');
    }
    if (password.length < 8) {
      return setError('Password must be at least 8 characters.');
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || 'Reset failed. Please try again.');
      }

      setSuccess(true);
      setTimeout(() => navigate('/login', { state: { message: 'Password reset successfully! Please login with your new password.' } }), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout>
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #fee2e2, #fca5a5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}
          >
            <AlertTriangle size={32} color="#991b1b" />
          </div>
          <h2>Invalid Reset Link</h2>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
            This reset link is invalid or has already been used. Please request a new one.
          </p>
          <Link to="/forgot-password" className="btn-primary" style={{ display: 'inline-block' }}>
            Request New Link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (success) {
    return (
      <AuthLayout>
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #bbf7d0, #4ade80)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}
          >
            <CheckCircle size={32} color="#166534" />
          </div>
          <h2>Password Reset!</h2>
          <p style={{ color: '#6b7280', lineHeight: '1.6' }}>
            Your password has been updated successfully. Redirecting you to login...
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          to="/login"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: '#16a34a',
            fontSize: '0.875rem',
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={16} />
          Back to Login
        </Link>
      </div>

      <h2>Set New Password</h2>
      <p>Choose a strong password for your TreeCanopy account.</p>

      {error && (
        <div
          style={{
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            padding: '1rem',
            borderRadius: '4px',
            marginBottom: '1.5rem',
            border: '1px solid #f87171',
          }}
        >
          {error}
          {error.includes('expired') && (
            <div style={{ marginTop: '0.5rem' }}>
              <Link to="/forgot-password" style={{ color: '#991b1b', fontWeight: 600 }}>
                → Request a new reset link
              </Link>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* New Password */}
        <div className="form-group">
          <label>New Password</label>
          <div className="input-wrapper">
            <Lock className="input-icon" size={20} />
            <input
              type={showPassword ? 'text' : 'password'}
              className="form-control has-toggle"
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Strength meter */}
          {password.length > 0 && (
            <div style={{ marginTop: '0.5rem' }}>
              <div
                style={{
                  height: '4px',
                  borderRadius: '4px',
                  background: '#e5e7eb',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${(strengthScore / 4) * 100}%`,
                    background: strengthColors[strengthScore],
                    transition: 'width 0.3s ease, background 0.3s ease',
                    borderRadius: '4px',
                  }}
                />
              </div>
              <p
                style={{
                  fontSize: '0.75rem',
                  color: strengthColors[strengthScore],
                  marginTop: '0.25rem',
                  fontWeight: 500,
                }}
              >
                {strengthLabels[strengthScore]} password
              </p>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div className="form-group">
          <label>Confirm New Password</label>
          <div className="input-wrapper">
            <Lock className="input-icon" size={20} />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              className="form-control has-toggle"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {confirmPassword.length > 0 && password !== confirmPassword && (
            <p style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem' }}>
              Passwords do not match
            </p>
          )}
          {confirmPassword.length > 0 && password === confirmPassword && (
            <p style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.25rem' }}>
              ✓ Passwords match
            </p>
          )}
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={isSubmitting}
          style={{ marginTop: '0.5rem' }}
        >
          {isSubmitting ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    </AuthLayout>
  );
};

export default ResetPasswordPage;
