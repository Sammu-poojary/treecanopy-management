import React, { useState, useEffect } from 'react';
import { Shield, Clock, CheckCircle, AlertTriangle, Users, BarChart2, Check, X, FileText } from 'lucide-react';

const OfficialDashboard = ({ user, activeTab }) => {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedCutter, setSelectedCutter] = useState('John Cutter');
  const [actionSuccess, setActionSuccess] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    const storedTickets = localStorage.getItem('canopyTickets');
    if (storedTickets) {
      setTickets(JSON.parse(storedTickets));
    }
  }, []);

  const saveTickets = (updatedTickets) => {
    localStorage.setItem('canopyTickets', JSON.stringify(updatedTickets));
    setTickets(updatedTickets);
  };

  const handleApprove = (ticketId) => {
    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        return {
          ...t,
          status: 'Approved',
          assignedTo: selectedCutter,
          approvedBy: user.name,
          approvedAt: new Date().toISOString().split('T')[0]
        };
      }
      return t;
    });

    saveTickets(updated);
    setActionSuccess(`Ticket ${ticketId} approved and assigned to ${selectedCutter}.`);

    // Update active details view
    const updatedTicket = updated.find(t => t.id === ticketId);
    setSelectedTicket(updatedTicket);

    setTimeout(() => setActionSuccess(''), 4000);
  };

  const handleReject = (ticketId) => {
    if (!rejectionReason.trim()) {
      alert('Please enter a reason for rejection.');
      return;
    }

    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        return {
          ...t,
          status: 'Rejected',
          rejectionReason: rejectionReason,
          rejectedBy: user.name,
          rejectedAt: new Date().toISOString().split('T')[0]
        };
      }
      return t;
    });

    saveTickets(updated);
    setActionSuccess(`Ticket ${ticketId} has been rejected.`);

    // Update active details view
    const updatedTicket = updated.find(t => t.id === ticketId);
    setSelectedTicket(updatedTicket);
    setShowRejectForm(false);
    setRejectionReason('');

    setTimeout(() => setActionSuccess(''), 4000);
  };

  // Mock list of Cutters
  const cutters = ['John Cutter', 'Dave Cutter', 'Sarah Cutter', 'Marcus Tech'];

  // Counts
  const pendingCount = tickets.filter(t => t.status === 'Pending').length;
  const progressCount = tickets.filter(t => t.status === 'In Progress' || t.status === 'Approved').length;
  const completedCount = tickets.filter(t => t.status === 'Completed').length;

  const getStatusClass = (status) => {
    switch (status) {
      case 'Pending': return 'badge-pending';
      case 'Approved': return 'badge-approved';
      case 'In Progress': return 'badge-progress';
      case 'Completed': return 'badge-completed';
      case 'Rejected': return 'badge-rejected';
      default: return 'badge-default';
    }
  };

  return (
    <div className="dashboard-content">
      {activeTab === 'overview' && (
        <>
          {/* Summary Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon yellow-tint">
                <Clock size={24} />
              </div>
              <div className="stat-details">
                <h3>{pendingCount}</h3>
                <p>Pending Verifications</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon blue-tint">
                <Shield size={24} />
              </div>
              <div className="stat-details">
                <h3>{progressCount}</h3>
                <p>Active Work Orders</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon green-tint">
                <CheckCircle size={24} />
              </div>
              <div className="stat-details">
                <h3>{completedCount}</h3>
                <p>Completed Resolutions</p>
              </div>
            </div>
          </div>

          {/* Municipal Canopy Status Section */}
          <div className="overview-row">
            <div className="overview-card main-overview">
              <h2>Canopy Summary Metrics</h2>
              <div className="metrics-grid">
                <div className="metric-box">
                  <span className="value">6,248</span>
                  <span className="label">Total Monitored Trees</span>
                </div>
                <div className="metric-box">
                  <span className="value">98.2%</span>
                  <span className="label">Health Index Rate</span>
                </div>
                <div className="metric-box text-success">
                  <span className="value">+1.4%</span>
                  <span className="label">Canopy Growth (MoM)</span>
                </div>
                <div className="metric-box">
                  <span className="value">12.5 tons</span>
                  <span className="label">Carbon Sequestration/mo</span>
                </div>
              </div>
            </div>
          </div>

          {/* Verification Requests Preview */}
          <div className="data-table-container">
            <div className="table-header-row">
              <h2>Pending Citizen Reports</h2>
            </div>
            {tickets.filter(t => t.status === 'Pending').length === 0 ? (
              <div className="empty-state">
                <p>No pending verification requests at this time. Good job!</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Reporter</th>
                      <th>Location</th>
                      <th>Issue Type</th>
                      <th>Priority</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.filter(t => t.status === 'Pending').slice(0, 5).map(ticket => (
                      <tr key={ticket.id}>
                        <td><strong>{ticket.id}</strong></td>
                        <td>{ticket.reporterName}</td>
                        <td>{ticket.location}</td>
                        <td>{ticket.issueType}</td>
                        <td><span className={`priority-badge ${ticket.priority.toLowerCase()}`}>{ticket.priority}</span></td>
                        <td>{ticket.createdAt}</td>
                        <td><span className={`badge badge-pending`}>{ticket.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'queue' && (
        <div className="reports-split-view">
          <div className="reports-list-panel">
            <h2>All Verification Requests</h2>
            {actionSuccess && (
              <div className="success-alert" style={{ marginBottom: '1rem' }}>
                <CheckCircle size={20} />
                <span>{actionSuccess}</span>
              </div>
            )}

            {tickets.length === 0 ? (
              <div className="empty-state">
                <p>No tickets available.</p>
              </div>
            ) : (
              <div className="ticket-cards-list">
                {tickets.map(ticket => (
                  <div
                    key={ticket.id}
                    className={`ticket-mini-card ${selectedTicket?.id === ticket.id ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedTicket(ticket);
                      setShowRejectForm(false);
                    }}
                  >
                    <div className="ticket-card-header">
                      <span className="ticket-id">{ticket.id}</span>
                      <span className={`badge ${getStatusClass(ticket.status)}`}>{ticket.status}</span>
                    </div>
                    <h4>{ticket.issueType}</h4>
                    <p className="ticket-loc">{ticket.location}</p>
                    <div className="ticket-card-footer">
                      <span className="ticket-date">{ticket.createdAt}</span>
                      <span className={`priority-badge ${ticket.priority.toLowerCase()}`}>{ticket.priority}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="reports-detail-panel">
            {selectedTicket ? (
              <div className="detail-card">
                <div className="detail-header">
                  <h3>Ticket details: {selectedTicket.id}</h3>
                  <span className={`badge ${getStatusClass(selectedTicket.status)}`}>{selectedTicket.status}</span>
                </div>

                <div className="detail-body">
                  <div className="detail-row">
                    <span className="label">Reporter:</span>
                    <span className="val">{selectedTicket.reporterName} ({selectedTicket.reporterEmail})</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Issue Type:</span>
                    <span className="val">{selectedTicket.issueType}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Priority:</span>
                    <span className={`val priority-text ${selectedTicket.priority === 'High' ? 'text-high' : selectedTicket.priority === 'Medium' ? 'text-medium' : 'text-low'}`}>
                      {selectedTicket.priority}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Location:</span>
                    <span className="val">{selectedTicket.location}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Reported On:</span>
                    <span className="val">{selectedTicket.createdAt}</span>
                  </div>

                  <div className="detail-divider"></div>

                  <div className="detail-block">
                    <span className="block-label">Citizen Description:</span>
                    <p className="block-text">{selectedTicket.description}</p>
                  </div>

                  {/* Actions for Pending tickets */}
                  {selectedTicket.status === 'Pending' && !showRejectForm && (
                    <div className="official-actions-box">
                      <h4>Verify & Action Order</h4>
                      <div className="action-row-form">
                        <div className="select-wrapper">
                          <label>Assign Tree Cutter</label>
                          <select
                            value={selectedCutter}
                            onChange={(e) => setSelectedCutter(e.target.value)}
                            className="form-control-select"
                          >
                            {cutters.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <button
                          className="btn-approve"
                          onClick={() => handleApprove(selectedTicket.id)}
                        >
                          <Check size={18} /> Approve & Dispatch
                        </button>
                      </div>

                      <div className="reject-trigger">
                        <button
                          className="btn-reject-trigger"
                          onClick={() => setShowRejectForm(true)}
                        >
                          Reject Request
                        </button>
                      </div>
                    </div>
                  )}

                  {showRejectForm && (
                    <div className="rejection-box-form">
                      <h4>Specify Rejection Reason</h4>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="form-textarea"
                        placeholder="Explain why this request is being rejected (e.g. duplicate request, not municipal tree, etc.)"
                        rows="3"
                        required
                      ></textarea>
                      <div className="rejection-buttons">
                        <button
                          className="btn-reject-confirm"
                          onClick={() => handleReject(selectedTicket.id)}
                        >
                          Confirm Rejection
                        </button>
                        <button
                          className="btn-cancel"
                          onClick={() => setShowRejectForm(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedTicket.status === 'Approved' && (
                    <div className="status-follow-box approved">
                      <p>Approved and dispatched to <strong>{selectedTicket.assignedTo}</strong> by {selectedTicket.approvedBy} on {selectedTicket.approvedAt}.</p>
                    </div>
                  )}

                  {selectedTicket.status === 'In Progress' && (
                    <div className="status-follow-box progress">
                      <p>Work currently in progress by technician <strong>{selectedTicket.assignedTo}</strong>.</p>
                    </div>
                  )}

                  {selectedTicket.status === 'Completed' && (
                    <div className="status-follow-box completed">
                      <h4>Job Resolution details:</h4>
                      <p><strong>Cutter:</strong> {selectedTicket.assignedTo}</p>
                      <p><strong>Completion Notes:</strong> {selectedTicket.completionNotes || 'None'}</p>
                      <p><strong>Resolved Date:</strong> {selectedTicket.completedAt}</p>
                    </div>
                  )}

                  {selectedTicket.status === 'Rejected' && (
                    <div className="status-follow-box rejected">
                      <h4>Rejection details:</h4>
                      <p><strong>Rejected By:</strong> {selectedTicket.rejectedBy} on {selectedTicket.rejectedAt}</p>
                      <p><strong>Reason:</strong> {selectedTicket.rejectionReason}</p>
                    </div>
                  )}

                </div>
              </div>
            ) : (
              <div className="detail-placeholder">
                <Shield size={48} />
                <p>Select a citizen ticket to review context, dispatch tree cutters, or reject requests.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="analytics-dashboard">
          <h2>Canopy Guard Analytical Intelligence</h2>
          <p className="analytics-subtitle">Aggregated environmental data and service performance monitors.</p>

          <div className="charts-grid-css">
            {/* Chart 1: Sector Canopy Health */}
            <div className="chart-card-css">
              <h3>Canopy Health by Municipal Sector</h3>
              <div className="bar-chart-css">
                <div className="bar-row">
                  <span className="bar-label">Sector 1 (North)</span>
                  <div className="bar-track">
                    <div className="bar-fill green-bar" style={{ width: '78%' }}>78%</div>
                  </div>
                </div>
                <div className="bar-row">
                  <span className="bar-label">Sector 2 (East)</span>
                  <div className="bar-track">
                    <div className="bar-fill green-bar" style={{ width: '62%' }}>62%</div>
                  </div>
                </div>
                <div className="bar-row">
                  <span className="bar-label">Sector 3 (Central)</span>
                  <div className="bar-track">
                    <div className="bar-fill yellow-bar" style={{ width: '48%' }}>48%</div>
                  </div>
                </div>
                <div className="bar-row">
                  <span className="bar-label">Sector 4 (South)</span>
                  <div className="bar-track">
                    <div className="bar-fill red-bar" style={{ width: '37%' }}>37%</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Chart 2: Issue Composition */}
            <div className="chart-card-css">
              <h3>Service Ticket Distribution</h3>
              <div className="doughnut-chart-list">
                <div className="donut-item">
                  <span className="indicator-dot" style={{ backgroundColor: '#043224' }}></span>
                  <span className="donut-label">Overgrown Branches</span>
                  <span className="donut-value">45%</span>
                </div>
                <div className="donut-item">
                  <span className="indicator-dot" style={{ backgroundColor: '#059669' }}></span>
                  <span className="donut-label">Dead / Leaning Trees</span>
                  <span className="donut-value">25%</span>
                </div>
                <div className="donut-item">
                  <span className="indicator-dot" style={{ backgroundColor: '#d97706' }}></span>
                  <span className="donut-label">Diseased Canopy</span>
                  <span className="donut-value">20%</span>
                </div>
                <div className="donut-item">
                  <span className="indicator-dot" style={{ backgroundColor: '#dc2626' }}></span>
                  <span className="donut-label">Root Infrastructure Damage</span>
                  <span className="donut-value">10%</span>
                </div>
              </div>
              <div className="chart-total-count">
                <span>Total Cataloged Issues: 184</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfficialDashboard;
