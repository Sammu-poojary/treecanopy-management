import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [devLink, setDevLink] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || 'Something went wrong. Please try again.');
      }

      setSubmitted(true);
      if (data.devResetLink) {
        setDevLink(data.devResetLink);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      {!submitted ? (
        <>
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

          <h2>Forgot Password?</h2>
          <p>
            No worries! Enter your registered email and we'll send you a link to
            reset your password.
          </p>

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
            </div>
          )}

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
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
              style={{ marginTop: '0.5rem' }}
            >
              {isSubmitting ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <div className="auth-footer" style={{ marginTop: '1.5rem' }}>
            Remember your password? <Link to="/login">Login here</Link>
          </div>
        </>
      ) : (
        <>
          {/* Success State */}
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
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
            <h2 style={{ marginBottom: '0.75rem' }}>Check Your Email</h2>
            <p style={{ color: '#6b7280', lineHeight: '1.6' }}>
              If <strong style={{ color: '#111827' }}>{email}</strong> is
              registered with TreeCanopy, you'll receive a password reset link
              shortly.
            </p>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.75rem' }}>
              The link expires in <strong>1 hour</strong>. Check your spam folder
              if you don't see the email.
            </p>

            {/* Dev Mode: show the reset link directly */}
            {devLink && (
              <div
                style={{
                  marginTop: '1.5rem',
                  background: '#fefce8',
                  border: '1px solid #fde68a',
                  borderRadius: '8px',
                  padding: '1rem',
                  textAlign: 'left',
                }}
              >
                <p
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#92400e',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.5rem',
                  }}
                >
                  🛠 Dev Mode — No email configured
                </p>
                <p style={{ fontSize: '0.8rem', color: '#78350f', marginBottom: '0.5rem' }}>
                  Copy and open this link to reset the password:
                </p>
                <a
                  href={devLink}
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    color: '#16a34a',
                    wordBreak: 'break-all',
                    fontFamily: 'monospace',
                  }}
                >
                  {devLink}
                </a>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                className="btn-primary"
                onClick={() => { setSubmitted(false); setEmail(''); setDevLink(''); }}
              >
                Try a Different Email
              </button>
              <Link
                to="/login"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '0.75rem',
                  border: '1px solid #d1fae5',
                  borderRadius: '8px',
                  color: '#16a34a',
                  fontWeight: 500,
                  textDecoration: 'none',
                  background: '#f0fdf4',
                }}
              >
                Back to Login
              </Link>
            </div>
          </div>
        </>
      )}
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
