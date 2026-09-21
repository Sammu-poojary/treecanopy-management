import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, User, Phone, Eye, EyeOff, UserPlus, Building2, Briefcase, FileText, MapPin } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const RegistrationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const roleParam = (searchParams.get('role') || searchParams.get('portal') || '').toLowerCase();

  const appModule = import.meta.env.VITE_APP_MODULE;
  const getInitialTab = () => {
    if (roleParam.includes('timber') || roleParam.includes('merchant') || roleParam.includes('buyer')) return 'Timber Buyer';
    if (roleParam.includes('cutter')) return 'Tree Cutter';
    if (appModule === 'cutter') return 'Tree Cutter';
    return 'Citizen';
  };

  const isCutterOnly = appModule === 'cutter';
  const isCitizenOnly = appModule === 'citizen';

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    businessType: 'Sawmill & Timber Processing',
    gstin: '',
    tradeLicense: '',
    address: ''
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'phone') {
      const onlyNumbers = value.replace(/\D/g, '');
      setFormData((prev) => ({ ...prev, [name]: onlyNumbers }));
    } else if (name === 'name') {
      const onlyLettersAndSpaces = value.replace(/[^a-zA-Z\s]/g, '');
      setFormData((prev) => ({ ...prev, [name]: onlyLettersAndSpaces }));
    } else if (name === 'gstin') {
      setFormData((prev) => ({ ...prev, [name]: value.toUpperCase() }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Name validation: No numbers or special characters
    if (!/^[a-zA-Z\s]+$/.test(formData.name)) {
      newErrors.name = 'Authorized person name can only contain letters and spaces';
    }
    if (!formData.name.trim()) newErrors.name = 'Full name is required';

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    // Phone validation: Exactly 10 digits starting with 6, 7, 8, or 9
    if (!/^[6-9]\d{9}$/.test(formData.phone)) {
      newErrors.phone = 'Phone number must be 10 digits and start with 6, 7, 8, or 9';
    }

    // Commercial Fields if Timber Buyer
    if (activeTab === 'Timber Buyer') {
      if (!formData.businessName.trim()) {
        newErrors.businessName = 'Enterprise / Sawmill / Business name is required';
      }
    }

    // Password validation: Strict (min 8, max 10, any special char)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,10}$/;
    if (!passwordRegex.test(formData.password)) {
      newErrors.password = 'Password must be 8-10 chars, contain uppercase, lowercase, number, & special character';
    }

    // Confirm password match
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (validateForm()) {
      setIsSubmitting(true);

      try {
        const payload = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          role: activeTab,
        };

        if (activeTab === 'Timber Buyer') {
          payload.businessName = formData.businessName;
          payload.company = formData.businessName;
          payload.businessType = formData.businessType;
          payload.gstin = formData.gstin;
          payload.tradeLicense = formData.tradeLicense;
          payload.address = formData.address;
        }

        const response = await fetch(`${API_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.msg || 'Registration failed');
        }

        if (activeTab === 'Timber Buyer') {
          // Pre-save profile in localStorage for instant auction access
          localStorage.setItem('timber_merchant_profile', JSON.stringify({
            bidderId: data.user.id,
            bidderName: data.user.name,
            companyName: data.user.businessName || data.user.name,
            bidderEmail: data.user.email,
            bidderPhone: data.user.phone,
            businessType: data.user.businessType,
            gstin: data.user.gstin,
            tradeLicense: data.user.tradeLicense,
            isRegistered: true,
          }));

          navigate('/login?portal=timber', {
            state: {
              message: `🎉 Timber Merchant Account for "${data.user.businessName || data.user.name}" registered! Please log in to place live auction bids.`,
            },
          });
          return;
        }

        navigate('/login', {
          state: {
            message: data.user.role === 'Tree Cutter'
              ? `Registration successful! Your Tree Cutter account is pending Admin approval. You will receive an email notification once approved.`
              : `Welcome ${data.user.name}! Registration successful. Please log in.`,
          },
        });
      } catch (error) {
        setSubmitError(error.message);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const regTitle = isCutterOnly
    ? 'Tree Cutter Registration'
    : isCitizenOnly
    ? 'Citizen Registration'
    : activeTab === 'Timber Buyer'
    ? 'Commercial Timber Buyer Registration'
    : activeTab === 'Tree Cutter'
    ? 'Tree Cutter & Arborist Registration'
    : 'Citizen Registration';

  const regSubtitle = isCutterOnly
    ? 'Apply to join our arborists & tree maintenance team.'
    : isCitizenOnly
    ? 'Join the community to protect and preserve our urban tree canopy.'
    : activeTab === 'Timber Buyer'
    ? 'Register your sawmill, lumber yard, or carpentry business to participate in official municipal timber log auctions.'
    : activeTab === 'Tree Cutter'
    ? 'Join the certified arborists and field maintenance crew.'
    : 'Join the community to protect and preserve our urban tree canopy.';

  return (
    <AuthLayout>
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem 0' }}>{regTitle}</h2>
        <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>{regSubtitle}</p>
      </div>

      {submitError && (
        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.85rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', border: '1px solid #f87171', fontSize: '0.875rem' }}>
          {submitError}
        </div>
      )}

      {!isCutterOnly && !isCitizenOnly && (
        <div className="portal-tabs" style={{ marginBottom: '1.25rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>
            Select Account Role
          </label>
          <div className="tabs-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            {[
              { id: 'Citizen', label: '👤 Citizen' },
              { id: 'Tree Cutter', label: '🪓 Tree Cutter' },
              { id: 'Timber Buyer', label: '🪵 Timber Buyer' }
            ].map((tab) => (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                type="button"
                style={{
                  padding: '0.6rem 0.5rem',
                  fontSize: '0.8rem',
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  borderRadius: '8px',
                  border: activeTab === tab.id ? '2px solid #059669' : '1px solid #e2e8f0',
                  background: activeTab === tab.id ? '#ecfdf5' : '#f8fafc',
                  color: activeTab === tab.id ? '#065f46' : '#64748b',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'Timber Buyer' && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Building2 size={24} style={{ color: '#16a34a', flexShrink: 0 }} />
          <div style={{ fontSize: '0.8rem', color: '#166534', lineHeight: 1.4 }}>
            <strong>Commercial Auction Access:</strong> Verified accounts can place live bids on salvage timber lots, log bundles, and download official yard dispatch gate-passes.
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {activeTab === 'Timber Buyer' && (
          <>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                Enterprise / Sawmill / Business Name *
              </label>
              <div className="input-wrapper">
                <Building2 className="input-icon" size={18} />
                <input 
                  type="text" 
                  name="businessName"
                  className={`form-control ${errors.businessName ? 'error' : ''}`} 
                  placeholder="e.g. Coastal Woodcraft & Sawmill Ltd" 
                  value={formData.businessName}
                  onChange={handleChange}
                />
              </div>
              {errors.businessName && <span className="error-text" style={{color: 'red', fontSize: '0.75rem', marginTop: '3px', display: 'block'}}>{errors.businessName}</span>}
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                Business Entity Type
              </label>
              <div className="input-wrapper">
                <Briefcase className="input-icon" size={18} />
                <select
                  name="businessType"
                  className="form-control"
                  value={formData.businessType}
                  onChange={handleChange}
                  style={{ paddingLeft: '2.5rem' }}
                >
                  <option value="Sawmill & Timber Processing">Sawmill & Timber Processing</option>
                  <option value="Furniture & Carpentry Unit">Furniture & Carpentry Workshop</option>
                  <option value="Timber Wholesaler / Trader">Timber Wholesaler / Trader</option>
                  <option value="Woodcraft & Carving Workshop">Woodcraft & Handicraft Enterprise</option>
                  <option value="Construction & Structural Contractor">Construction & Structural Contractor</option>
                  <option value="Biomass & Charcoal Manufacturer">Biomass & Charcoal Manufacturer</option>
                  <option value="Other Industrial Buyer">Other Commercial Buyer</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  GSTIN (Optional)
                </label>
                <div className="input-wrapper">
                  <FileText className="input-icon" size={16} />
                  <input 
                    type="text" 
                    name="gstin"
                    className="form-control" 
                    placeholder="29AAAAA0000A1Z5" 
                    maxLength="15"
                    value={formData.gstin}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Trade / MSME Reg (Optional)
                </label>
                <div className="input-wrapper">
                  <FileText className="input-icon" size={16} />
                  <input 
                    type="text" 
                    name="tradeLicense"
                    className="form-control" 
                    placeholder="UDYAM-KR-20-001" 
                    value={formData.tradeLicense}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                Operational Address / Yard Location (Optional)
              </label>
              <div className="input-wrapper">
                <MapPin className="input-icon" size={18} />
                <input 
                  type="text" 
                  name="address"
                  className="form-control" 
                  placeholder="Industrial Area, Manipal Road, Udupi" 
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>
            </div>
          </>
        )}

        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
            {activeTab === 'Timber Buyer' ? 'Authorized Representative Name *' : 'Full Name *'}
          </label>
          <div className="input-wrapper">
            <User className="input-icon" size={18} />
            <input 
              type="text" 
              name="name"
              className={`form-control ${errors.name ? 'error' : ''}`} 
              placeholder={activeTab === 'Timber Buyer' ? 'Representative full name' : 'Enter your full name'} 
              value={formData.name}
              onChange={handleChange}
            />
          </div>
          {errors.name && <span className="error-text" style={{color: 'red', fontSize: '0.75rem', marginTop: '3px', display: 'block'}}>{errors.name}</span>}
        </div>

        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
            {activeTab === 'Timber Buyer' ? 'Business Email Address *' : 'Email Address *'}
          </label>
          <div className="input-wrapper">
            <Mail className="input-icon" size={18} />
            <input 
              type="email" 
              name="email"
              className={`form-control ${errors.email ? 'error' : ''}`} 
              placeholder={activeTab === 'Timber Buyer' ? 'merchant@sawmill.com' : 'name@example.com'} 
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          {errors.email && <span className="error-text" style={{color: 'red', fontSize: '0.75rem', marginTop: '3px', display: 'block'}}>{errors.email}</span>}
        </div>
        
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
            {activeTab === 'Timber Buyer' ? 'Official Contact Phone *' : 'Phone Number *'}
          </label>
          <div className="input-wrapper">
            <Phone className="input-icon" size={18} />
            <input 
              type="tel" 
              name="phone"
              className={`form-control ${errors.phone ? 'error' : ''}`} 
              placeholder="10-digit mobile number" 
              maxLength="10"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>
          {errors.phone && <span className="error-text" style={{color: 'red', fontSize: '0.75rem', marginTop: '3px', display: 'block'}}>{errors.phone}</span>}
        </div>

        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>Password *</label>
          <div className="input-wrapper">
            <Lock className="input-icon" size={18} />
            <input 
              type={showPassword ? 'text' : 'password'} 
              name="password"
              className={`form-control has-toggle ${errors.password ? 'error' : ''}`} 
              placeholder="••••••••" 
              maxLength="10"
              value={formData.password}
              onChange={handleChange}
            />
            <button 
              type="button" 
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && <span className="error-text" style={{color: 'red', fontSize: '0.75rem', marginTop: '3px', display: 'block'}}>{errors.password}</span>}
        </div>
        
        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>Confirm Password *</label>
          <div className="input-wrapper">
            <Lock className="input-icon" size={18} />
            <input 
              type={showConfirmPassword ? 'text' : 'password'} 
              name="confirmPassword"
              className={`form-control has-toggle ${errors.confirmPassword ? 'error' : ''}`} 
              placeholder="••••••••" 
              maxLength="10"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
            <button 
              type="button" 
              className="password-toggle"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.confirmPassword && <span className="error-text" style={{color: 'red', fontSize: '0.75rem', marginTop: '3px', display: 'block'}}>{errors.confirmPassword}</span>}
        </div>

        <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem', width: '100%', padding: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', borderRadius: '8px', background: activeTab === 'Timber Buyer' ? '#15803d' : '#059669', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer' }} disabled={isSubmitting}>
          <UserPlus size={19} />
          <span>{isSubmitting ? 'Registering...' : activeTab === 'Timber Buyer' ? 'Register Timber Merchant Account' : 'Create Account'}</span>
        </button>

        <div className="divider" style={{ margin: '1.25rem 0', textAlign: 'center' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>OR</span>
        </div>

        <div className="auth-footer" style={{ textAlign: 'center', fontSize: '0.875rem', color: '#64748b' }}>
          Already have an account? <Link to={`/login${activeTab === 'Timber Buyer' ? '?portal=timber' : ''}`} style={{ color: '#059669', fontWeight: 600 }}>Login here</Link>
        </div>
      </form>
    </AuthLayout>
  );
};

export default RegistrationPage;

