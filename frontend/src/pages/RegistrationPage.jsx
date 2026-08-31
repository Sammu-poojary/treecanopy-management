import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Phone, Eye, EyeOff, UserPlus } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const RegistrationPage = () => {
  const navigate = useNavigate();
  const appModule = import.meta.env.VITE_APP_MODULE;
  const initialTab = appModule === 'cutter' ? 'Tree Cutter' : 'Citizen';
  const isCutterOnly = appModule === 'cutter';
  const isCitizenOnly = appModule === 'citizen';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'phone') {
      // Block non-digit characters for phone number
      const onlyNumbers = value.replace(/\D/g, '');
      setFormData((prev) => ({ ...prev, [name]: onlyNumbers }));
    } else if (name === 'name') {
      // Block numbers and special characters for name (allow only letters and spaces)
      const onlyLettersAndSpaces = value.replace(/[^a-zA-Z\s]/g, '');
      setFormData((prev) => ({ ...prev, [name]: onlyLettersAndSpaces }));
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
      newErrors.name = 'Name can only contain letters and spaces';
    }
    if (!formData.name.trim()) newErrors.name = 'Name is required';

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

    // Password validation: Strict (min 8, max 10, any special char)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,10}$/;
    if (!passwordRegex.test(formData.password)) {
      newErrors.password = 'Password must be 8-10 chars, contain an uppercase, lowercase, number, and special character';
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
        const response = await fetch(`${API_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            password: formData.password,
            role: activeTab,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.msg || 'Registration failed');
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
    : 'Create an Account';

  const regSubtitle = isCutterOnly
    ? 'Apply to join our arborists & tree maintenance team.'
    : isCitizenOnly
    ? 'Join the community to protect and preserve our urban tree canopy.'
    : 'Register to access the CanopyGuard ecosystem.';

  return (
    <AuthLayout>
      <h2>{regTitle}</h2>
      <p>{regSubtitle}</p>

      {submitError && (
        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem', border: '1px solid #f87171' }}>
          {submitError}
        </div>
      )}

      {!isCutterOnly && !isCitizenOnly && (
        <div className="portal-tabs">
          <label>Select Role</label>
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
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label>Full Name</label>
          <div className="input-wrapper">
            <User className="input-icon" size={20} />
            <input 
              type="text" 
              name="name"
              className={`form-control ${errors.name ? 'error' : ''}`} 
              placeholder="Enter your full name" 
              value={formData.name}
              onChange={handleChange}
            />
          </div>
          {errors.name && <span className="error-text" style={{color: 'red', fontSize: '0.8rem', marginTop: '4px', display: 'block'}}>{errors.name}</span>}
        </div>

        <div className="form-group">
          <label>Email Address</label>
          <div className="input-wrapper">
            <Mail className="input-icon" size={20} />
            <input 
              type="email" 
              name="email"
              className={`form-control ${errors.email ? 'error' : ''}`} 
              placeholder="name@example.com" 
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          {errors.email && <span className="error-text" style={{color: 'red', fontSize: '0.8rem', marginTop: '4px', display: 'block'}}>{errors.email}</span>}
        </div>
        
        <div className="form-group">
          <label>Phone Number</label>
          <div className="input-wrapper">
            <Phone className="input-icon" size={20} />
            <input 
              type="tel" 
              name="phone"
              className={`form-control ${errors.phone ? 'error' : ''}`} 
              placeholder="Enter your number" 
              maxLength="10"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>
          {errors.phone && <span className="error-text" style={{color: 'red', fontSize: '0.8rem', marginTop: '4px', display: 'block'}}>{errors.phone}</span>}
        </div>

        <div className="form-group">
          <label>Password</label>
          <div className="input-wrapper">
            <Lock className="input-icon" size={20} />
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
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {errors.password && <span className="error-text" style={{color: 'red', fontSize: '0.8rem', marginTop: '4px', display: 'block'}}>{errors.password}</span>}
        </div>
        
        <div className="form-group">
          <label>Confirm Password</label>
          <div className="input-wrapper">
            <Lock className="input-icon" size={20} />
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
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {errors.confirmPassword && <span className="error-text" style={{color: 'red', fontSize: '0.8rem', marginTop: '4px', display: 'block'}}>{errors.confirmPassword}</span>}
        </div>

        <button type="submit" className="btn-primary" style={{ marginTop: '1.25rem' }} disabled={isSubmitting}>
          <UserPlus size={19} />
          <span>{isSubmitting ? 'Creating Account...' : 'Create Account'}</span>
        </button>

        <div className="divider">
          <span>OR</span>
        </div>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Login here</Link>
        </div>
      </form>
    </AuthLayout>
  );
};

export default RegistrationPage;
