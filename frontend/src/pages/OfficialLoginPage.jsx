import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ShieldCheck, ArrowRight, Eye, EyeOff, Building2 } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const OFFICIAL_EMAIL = 'officials@gmail.com';
const OFFICIAL_PASSWORD = 'officials@123';

export default function OfficialLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState(OFFICIAL_EMAIL);
  const [password, setPassword] = useState(OFFICIAL_PASSWORD);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsSubmitting(true);

    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      // Fast path for standard official demo credentials
      if (normalizedEmail === OFFICIAL_EMAIL && password === OFFICIAL_PASSWORD) {
        const officialUser = {
          id: 'officials-static',
          name: 'Municipal Official',
          email: OFFICIAL_EMAIL,
          phone: '+91 98765 43210',
          role: 'Official',
        };
        localStorage.setItem('currentUser', JSON.stringify(officialUser));
        sessionStorage.setItem('officialAuthed', 'true');
        navigate('/official-management');
        return;
      }

      // Backend verification
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
          portal: 'Official',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || 'Official authentication failed');
      }

      if (data.user.role !== 'Official' && data.user.role !== 'Admin') {
        throw new Error('Access Denied: Account is not authorized as a Municipal Official.');
      }

      localStorage.setItem('currentUser', JSON.stringify(data.user));
      sessionStorage.setItem('officialAuthed', 'true');
      navigate('/official-management');
    } catch (err) {
      setLoginError(err.message || 'Login failed. Please check official credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '56px', height: '56px', borderRadius: '16px',
          background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
          color: '#ffffff', boxShadow: '0 8px 20px rgba(5, 150, 105, 0.3)', marginBottom: '14px'
        }}>
          <Building2 size={28} />
        </div>
        <h2 style={{ margin: '0 0 6px', fontSize: '1.6rem', fontWeight: 900, color: '#0f172a' }}>
          Municipal Official Portal
        </h2>
        <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5 }}>
          Authorized administrative access for zone officers, city forestry supervisors, and complaint managers.
        </p>
      </div>

      {loginError && (
        <div style={{
          backgroundColor: '#fee2e2', color: '#991b1b', padding: '12px 16px',
          borderRadius: '10px', marginBottom: '20px', border: '1px solid #f87171',
          fontSize: '0.88rem', fontWeight: 700
        }}>
          ⚠️ {loginError}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="form-group">
          <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155' }}>Official Email Address</label>
          <div className="input-wrapper" style={{ marginTop: '6px' }}>
            <Mail className="input-icon" size={20} color="#059669" />
            <input 
              type="email" 
              className="form-control" 
              placeholder="officials@gmail.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
              style={{ fontWeight: 600 }}
            />
          </div>
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155', margin: 0 }}>Portal Password</label>
            <Link to="/forgot-password" className="forgot-password" style={{ fontSize: '0.8rem', color: '#059669' }}>Forgot Password?</Link>
          </div>
          <div className="input-wrapper">
            <Lock className="input-icon" size={20} color="#059669" />
            <input 
              type={showPassword ? 'text' : 'password'} 
              className="form-control has-toggle" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
              style={{ fontWeight: 600 }}
            />
            <button 
              type="button" 
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div style={{
          background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '10px 14px',
          borderRadius: '10px', fontSize: '0.8rem', color: '#065f46', fontWeight: 600
        }}>
          ℹ️ Standard Official Login: <b>officials@gmail.com</b> / <b>officials@123</b>
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          className="cg-btn primary"
          style={{
            width: '100%', padding: '14px', borderRadius: '12px', fontSize: '1rem',
            fontWeight: 800, background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
            color: '#ffffff', border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)', marginTop: '8px'
          }}
        >
          {isSubmitting ? 'Authenticating Official Session...' : (
            <>
              Login to Official Portal <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
        <Link to="/login" style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700, textDecoration: 'none' }}>
          ← Back to General Login Portal
        </Link>
      </div>
    </AuthLayout>
  );
}
