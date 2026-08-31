import React from 'react';

// Mock data for stats cards
const stats = [
  { title: 'Total Trees Planted', value: '1,245', icon: '🌳', tint: 'green-tint' },
  { title: 'Active Projects', value: '8', icon: '📁', tint: 'blue-tint' },
  { title: 'Pending Approvals', value: '12', icon: '⏳', tint: 'yellow-tint' },
  { title: 'Alerts', value: '3', icon: '🚨', tint: 'red-tint' },
];

const HomeDashboard = () => {
  return (
    <div className="dashboard-content">
      {/* Stats Cards */}
      <section className="stats-grid">
        {stats.map((item, idx) => (
          <div key={idx} className="stat-card">
            <div className={`stat-icon ${item.tint}`}> {item.icon} </div>
            <div className="stat-details">
              <h3>{item.value}</h3>
              <p>{item.title}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Info Section – placeholder for charts / tables */}
      <section className="info-section">
        <div className="info-card">
          <h2>Recent Activity</h2>
          <p>Placeholder for activity feed or chart.</p>
        </div>
        <div className="info-card">
          <h2>Reports</h2>
          <p>Placeholder for recent reports or data tables.</p>
        </div>
      </section>
    </div>
  );
};

export default HomeDashboard;
