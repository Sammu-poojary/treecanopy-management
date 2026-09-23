import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User, Scissors, Truck, Gavel, ShieldCheck } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
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

  const appModule = import.meta.env.VITE_APP_MODULE; // 'cutter', 'citizen', or undefined
  const searchParams = new URLSearchParams(location.search);
  const portalParam = (searchParams.get('portal') || searchParams.get('role') || '').toLowerCase();
  
  const getInitialTab = () => {
    if (portalParam === 'official') return 'Official';
    if (portalParam === 'admin') return 'Admin';
    if (portalParam === 'cutter' || portalParam === 'tree cutter') return 'Tree Cutter';
    if (portalParam === 'delivery' || portalParam === 'delivery partner') return 'Delivery Partner';
    if (portalParam === 'merchant' || portalParam === 'timber merchant' || portalParam === 'timber') return 'Timber Merchant';
    if (portalParam === 'citizen') return 'Citizen';
    return appModule === 'cutter' ? 'Tree Cutter' : 'Citizen';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(() => {
    const tab = getInitialTab();
    if (tab === 'Official') return OFFICIAL_EMAIL;
    if (tab === 'Admin') return ADMIN_EMAIL;
    if (tab === 'Delivery Partner') return 'delivery@canopy.gov.in';
    if (tab === 'Timber Merchant') return 'merchant@canopy.gov.in';
    if (tab === 'Tree Cutter') return 'cutter@canopy.gov.in';
    return '';
  });
  const [password, setPassword] = useState(() => {
    const tab = getInitialTab();
    if (tab === 'Official') return OFFICIAL_PASSWORD;
    if (tab === 'Admin') return ADMIN_PASSWORD;
    if (tab === 'Delivery Partner') return 'delivery123';
    if (tab === 'Timber Merchant') return 'merchant123';
    if (tab === 'Tree Cutter') return 'cutter123';
    return '';
  });
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCutterOnly = appModule === 'cutter';
  const isCitizenOnly = appModule === 'citizen';

  const roleRedirects = {
    Official: '/official-management',
    'Tree Cutter': '/treecutter/dashboard',
    Admin: '/admin',
    Citizen: '/home',
    'Delivery Partner': '/delivery',
    Delivery: '/delivery',
    'Timber Merchant': '/timber-auction',
    'Timber Buyer': '/timber-auction',
    Merchant: '/timber-auction'
  };

  const fillDemoCredentials = (role) => {
    setActiveTab(role);
    setLoginError('');
    if (role === 'Delivery Partner') {
      setEmail('delivery@canopy.gov.in');
      setPassword('delivery123');
    } else if (role === 'Timber Merchant' || role === 'Timber Buyer') {
      setEmail('merchant@canopy.gov.in');
      setPassword('merchant123');
    } else if (role === 'Tree Cutter') {
      setEmail('cutter@canopy.gov.in');
      setPassword('cutter123');
    } else if (role === 'Citizen') {
      setEmail('citizen@example.com');
      setPassword('citizen123');
    } else if (role === 'Official') {
      setEmail(OFFICIAL_EMAIL);
      setPassword(OFFICIAL_PASSWORD);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoginError('');
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: credentialResponse.credential,
          portal: activeTab,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.msg || 'Google Sign-In failed');
      }

      if (isCutterOnly && data.user.role !== 'Tree Cutter') {
        throw new Error('Access denied: This portal is exclusively for Tree Cutters & Arborists.');
      }
      if (isCitizenOnly && data.user.role !== 'Citizen') {
        throw new Error('Access denied: This portal is exclusively for Citizens.');
      }

      localStorage.setItem('currentUser', JSON.stringify(data.user));
      if (data.user.role === 'Timber Buyer' || data.user.role === 'Timber Merchant') {
        localStorage.setItem('timber_merchant_profile', JSON.stringify({
          bidderId: data.user.id || data.user._id,
          bidderName: data.user.name,
          companyName: data.user.businessName || data.user.company || data.user.name,
          bidderEmail: data.user.email,
          bidderPhone: data.user.phone,
          businessType: data.user.businessType || 'Sawmill / Lumber Mill',
          gstin: data.user.gstin || '',
          tradeLicense: data.user.tradeLicense || '',
          isRegistered: true
        }));
      }
      navigate(roleRedirects[data.user.role] || '/home');
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsSubmitting(true);

    try {
      const normalizedEmail = email.toLowerCase().trim();

      if (!isCutterOnly && normalizedEmail === OFFICIAL_EMAIL && password === OFFICIAL_PASSWORD) {
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
      } else if (!isCutterOnly && (normalizedEmail === 'admin' || normalizedEmail === ADMIN_EMAIL) && (password === ADMIN_PASSWORD || password === 'admin@123')) {
        const adminUser = {
          id: 'admin-static',
          name: 'Municipal Admin',
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

      // Enforce role restriction per dedicated website if specified
      if (isCutterOnly && data.user.role !== 'Tree Cutter') {
        throw new Error('Access denied: This portal is exclusively for Tree Cutters & Arborists.');
      }
      if (isCitizenOnly && data.user.role !== 'Citizen') {
        throw new Error('Access denied: This portal is exclusively for Citizens.');
      }

      localStorage.setItem('currentUser', JSON.stringify(data.user));
      localStorage.setItem('user', JSON.stringify(data.user));
      if (data.user.role === 'Delivery Partner' || data.user.role === 'Delivery') {
        localStorage.setItem('delivery_user', JSON.stringify(data.user));
      }
      if (data.user.role === 'Timber Buyer' || data.user.role === 'Timber Merchant') {
        localStorage.setItem('timber_merchant_profile', JSON.stringify({
          bidderId: data.user.id || data.user._id,
          bidderName: data.user.name,
          companyName: data.user.businessName || data.user.company || data.user.name,
          bidderEmail: data.user.email,
          bidderPhone: data.user.phone,
          businessType: data.user.businessType || 'Sawmill / Lumber Mill',
          gstin: data.user.gstin || '',
          tradeLicense: data.user.tradeLicense || '',
          isRegistered: true
        }));
      }
      navigate(roleRedirects[data.user.role] || '/home');
    } catch (error) {
      setLoginError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const portalTitle = isCutterOnly
    ? 'Tree Cutter Field Portal'
    : isCitizenOnly
    ? 'Citizen Portal'
    : `${activeTab} Portal Login`;

  const portalSubtitle = isCutterOnly
    ? 'Authorized access for arborists, field operations, and task execution.'
    : isCitizenOnly
    ? 'Report tree hazards, track community requests, and explore the urban canopy.'
    : 'Please enter your credentials to access your dedicated workspace.';

  return (
    <AuthLayout>
      <h2>{portalTitle}</h2>
      <p>{portalSubtitle}</p>

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

      {!isCutterOnly && !isCitizenOnly && (
        <div className="portal-tabs" style={{ marginBottom: '1.25rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Select Dedicated Workspace
          </label>
          <div className="tabs-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {[
              { id: 'Citizen', label: 'Citizen', icon: User },
              { id: 'Tree Cutter', label: 'Cutter', icon: Scissors },
              { id: 'Delivery Partner', label: 'Delivery', icon: Truck },
              { id: 'Timber Merchant', label: 'Timber', icon: Gavel }
            ].map((tab) => {
              const IconComp = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  className={`tab-btn ${isActive ? 'active' : ''}`}
                  style={{
                    padding: '8px 10px',
                    fontSize: '0.82rem',
                    fontWeight: isActive ? 700 : 500,
                    borderRadius: '8px',
                    border: isActive ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.12)',
                    background: isActive ? 'rgba(16, 185, 129, 0.16)' : 'rgba(255, 255, 255, 0.04)',
                    color: isActive ? '#34d399' : '#94a3b8',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isActive ? '0 0 14px rgba(16, 185, 129, 0.25)' : 'none',
                    backdropFilter: 'blur(8px)'
                  }}
                  onClick={() => fillDemoCredentials(tab.id)}
                  type="button"
                >
                  <IconComp size={14} style={{ color: isActive ? '#34d399' : '#64748b', strokeWidth: isActive ? 2.5 : 2 }} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
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

        {/* Google Login - Commented out for Tree Cutter, Admin, and Delivery */}
        {!['Tree Cutter', 'Admin', 'Delivery Partner', 'Delivery'].includes(activeTab) && (
          <>
            <div className="divider">
              <span>OR</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0' }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setLoginError('Google Sign-In was cancelled or failed.')}
                theme="filled_blue"
                shape="pill"
                text="continue_with"
              />
            </div>
          </>
        )}
        {/* 
        <div className="divider">
          <span>OR</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setLoginError('Google Sign-In was cancelled or failed.')}
            theme="filled_blue"
            shape="pill"
            text="continue_with"
          />
        </div>
        */}

        <div className="auth-footer">
          {isCutterOnly ? (
            <>New field technician or arborist? <Link to="/register">Register as Tree Cutter</Link></>
          ) : isCitizenOnly ? (
            <>New to CanopyGuard? <Link to="/register">Register as Citizen</Link></>
          ) : (
            <>Don't have an account? <Link to="/register">Register here</Link></>
          )}
        </div>
      </form>
    </AuthLayout>
  );
};

export default LoginPage;
