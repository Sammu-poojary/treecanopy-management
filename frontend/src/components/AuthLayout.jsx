import React from 'react';
import { Globe, Shield, Scissors, UserCog } from 'lucide-react';

const AuthLayout = ({ children }) => {
  const appModule = import.meta.env.VITE_APP_MODULE;
  const isCutterOnly = appModule === 'cutter';
  const isCitizenOnly = appModule === 'citizen';

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Left Sidebar */}
        <div className="auth-sidebar">
          <h1>CanopyGuard</h1>
          <p className="subtitle">
            {isCutterOnly 
              ? 'Arborist & Field Operations Platform'
              : isCitizenOnly
              ? 'Citizen Urban Forestry & Ecological Hub'
              : 'Advanced Urban Forestry & Tree Management Ecosystem'}
          </p>

          <div className="feature-list">
            {isCutterOnly ? (
              <>
                <div className="feature-item">
                  <div className="feature-icon">
                    <Scissors size={24} />
                  </div>
                  <div className="feature-text">
                    <h3>Work Order Management</h3>
                    <p>Access assigned tree trimming, pruning, and emergency clearance jobs.</p>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">
                    <Shield size={24} />
                  </div>
                  <div className="feature-text">
                    <h3>GPS Field Attendance</h3>
                    <p>Log geo-verified clock-in / clock-out and track active field hours.</p>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">
                    <Globe size={24} />
                  </div>
                  <div className="feature-text">
                    <h3>Photo Verification</h3>
                    <p>Upload before-and-after work proof for instant municipal sign-off.</p>
                  </div>
                </div>
              </>
            ) : isCitizenOnly ? (
              <>
                <div className="feature-item">
                  <div className="feature-icon">
                    <Globe size={24} />
                  </div>
                  <div className="feature-text">
                    <h3>Report Tree Hazards</h3>
                    <p>Instantly flag fallen branches, overhanging limbs, and diseased trees.</p>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">
                    <Shield size={24} />
                  </div>
                  <div className="feature-text">
                    <h3>Real-Time Tracking</h3>
                    <p>Track maintenance requests live as arborists resolve them.</p>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">
                    <UserCog size={24} />
                  </div>
                  <div className="feature-text">
                    <h3>Tree Encyclopedia</h3>
                    <p>Discover native tree species, canopy health indices, and care tips.</p>
                  </div>
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
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
