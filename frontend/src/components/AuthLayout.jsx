import React from 'react';
import { Globe, Shield, Scissors, UserCog } from 'lucide-react';

const AuthLayout = ({ children }) => {
  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Left Sidebar */}
        <div className="auth-sidebar">
          <h1>CanopyGuard</h1>
          <p className="subtitle">Advanced Urban Forestry & Tree Management Ecosystem</p>

          <div className="feature-list">
            <div className="feature-item">
              <div className="feature-icon">
                <Globe size={24} />
              </div>
              <div className="feature-text">
                <h3>Public / Citizen Access</h3>
                <p>For reporting and tracking urban forestry issues in your neighborhood.</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon">
                <Shield size={24} />
              </div>
              <div className="feature-text">
                <h3>Official Portal</h3>
                <p>For municipal management, verification, and planning oversight.</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon">
                <Scissors size={24} />
              </div>
              <div className="feature-text">
                <h3>Field Technician / Cutter Login</h3>
                <p>For task execution, proof of work, and real-time field updates.</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon">
                <UserCog size={24} />
              </div>
              <div className="feature-text">
                <h3>System Administration</h3>
                <p>For high-level oversight, governance, and system configuration.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="auth-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
