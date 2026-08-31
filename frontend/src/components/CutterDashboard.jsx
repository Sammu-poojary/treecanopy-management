import React, { useState, useEffect } from 'react';
import { Scissors, Clock, CheckCircle, AlertTriangle, FileText, Play, Check, MapPin, ShieldCheck, Briefcase, Mail, Phone } from 'lucide-react';
import Swal from 'sweetalert2';

const CutterDashboard = ({ user, activeTab }) => {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const activeUser = user || (() => {
    try { return JSON.parse(localStorage.getItem('currentUser')) || {}; } catch { return {}; }
  })();
  const cutterName = activeUser.name || activeUser.username || 'Sameeksha';
  const cutterEmail = activeUser.email || 'sameeksha@treecanopy.gov.in';
  const cutterPhone = activeUser.phone || '+91 98765 43210';
  const cutterRole = activeUser.role || 'Tree Cutter';
  const cutterId = activeUser.id || activeUser._id ? `TC-${String(activeUser.id || activeUser._id).slice(-4).toUpperCase()}` : 'TC-8842';
  const initial = cutterName.charAt(0).toUpperCase() || 'S';

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

  // Check if a ticket is assigned to this cutter. 
  // We match if the assignedName contains the user's name (e.g. "John" matches "John Cutter")
  const isAssignedToMe = (ticket) => {
    if (!ticket.assignedTo) return false;
    const cutterNameLower = ticket.assignedTo.toLowerCase();
    const userNameLower = user.name.toLowerCase();
    return cutterNameLower.includes(userNameLower) || userNameLower.includes(cutterNameLower);
  };

  const myTickets = tickets.filter(isAssignedToMe);

  const handleStartWork = (ticketId) => {
    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        return { ...t, status: 'In Progress' };
      }
      return t;
    });

    saveTickets(updated);
    setActionSuccess(`Work started on ticket ${ticketId}.`);
    
    // Update active details
    const updatedTicket = updated.find(t => t.id === ticketId);
    setSelectedTicket(updatedTicket);

    setTimeout(() => setActionSuccess(''), 4000);
  };

  const handleCompleteWork = (ticketId) => {
    if (!completionNotes.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Completion Notes Required',
        text: 'Please enter completion notes.',
        confirmButtonColor: '#10b981'
      });
      return;
    }

    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        return {
          ...t,
          status: 'Completed',
          completionNotes: completionNotes,
          completedAt: new Date().toISOString().split('T')[0]
        };
      }
      return t;
    });

    saveTickets(updated);
    setActionSuccess(`Ticket ${ticketId} marked as completed!`);
    Swal.fire({
      icon: 'success',
      title: 'Work Completed!',
      text: `Ticket ${ticketId} marked as completed!`,
      confirmButtonColor: '#10b981'
    });
    
    // Update active details
    const updatedTicket = updated.find(t => t.id === ticketId);
    setSelectedTicket(updatedTicket);
    setCompletionNotes('');

    setTimeout(() => setActionSuccess(''), 4000);
  };

  // Counts
  const assignedCount = myTickets.filter(t => ['Approved', 'In Progress'].includes(t.status)).length;
  const completedCount = myTickets.filter(t => t.status === 'Completed').length;

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
                <h3>{assignedCount}</h3>
                <p>Assigned Work Orders</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon green-tint">
                <CheckCircle size={24} />
              </div>
              <div className="stat-details">
                <h3>{completedCount}</h3>
                <p>Completed Jobs</p>
              </div>
            </div>
          </div>

          {/* Quick instructions / safety panel */}
          <div className="safety-section">
            <div className="info-card warning-border">
              <div className="card-header-icon text-warning">
                <AlertTriangle size={24} style={{ marginRight: '8px' }} />
                <h2>Field Technician Safety Advisory</h2>
              </div>
              <p>Please always wear municipal approved safety gear (hardhats, eye protection, climbing harness) when working with tree branches. Report any proximity to high-voltage lines to supervisor immediately.</p>
            </div>
          </div>

          {/* Recent Work Orders */}
          <div className="data-table-container">
            <div className="table-header-row">
              <h2>My Current Work Orders</h2>
            </div>
            {myTickets.length === 0 ? (
              <div className="empty-state">
                <p>You have no active work orders assigned. If this is a mistake, contact an Official.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Work ID</th>
                      <th>Location</th>
                      <th>Action Type</th>
                      <th>Priority</th>
                      <th>Date Assigned</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myTickets.slice(0, 5).map(ticket => (
                      <tr key={ticket.id}>
                        <td><strong>{ticket.id}</strong></td>
                        <td>{ticket.location}</td>
                        <td>{ticket.issueType}</td>
                        <td><span className={`priority-badge ${ticket.priority.toLowerCase()}`}>{ticket.priority}</span></td>
                        <td>{ticket.approvedAt || ticket.createdAt}</td>
                        <td><span className={`badge ${getStatusClass(ticket.status)}`}>{ticket.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'work-orders' && (
        <div className="reports-split-view">
          <div className="reports-list-panel">
            <h2>My Assigned Jobs</h2>
            {actionSuccess && (
              <div className="success-alert" style={{ marginBottom: '1rem' }}>
                <CheckCircle size={20} />
                <span>{actionSuccess}</span>
              </div>
            )}

            {myTickets.length === 0 ? (
              <div className="empty-state">
                <p>No work orders assigned to you.</p>
              </div>
            ) : (
              <div className="ticket-cards-list">
                {myTickets.map(ticket => (
                  <div 
                    key={ticket.id} 
                    className={`ticket-mini-card ${selectedTicket?.id === ticket.id ? 'selected' : ''}`}
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <div className="ticket-card-header">
                      <span className="ticket-id">{ticket.id}</span>
                      <span className={`badge ${getStatusClass(ticket.status)}`}>{ticket.status}</span>
                    </div>
                    <h4>{ticket.issueType}</h4>
                    <p className="ticket-loc"><MapPin size={12} /> {ticket.location}</p>
                    <div className="ticket-card-footer">
                      <span className="ticket-date">Assigned: {ticket.approvedAt || ticket.createdAt}</span>
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
                  <h3>Work Order Details: {selectedTicket.id}</h3>
                  <span className={`badge ${getStatusClass(selectedTicket.status)}`}>{selectedTicket.status}</span>
                </div>

                <div className="detail-body">
                  <div className="detail-row">
                    <span className="label">Location:</span>
                    <span className="val">{selectedTicket.location}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Action Required:</span>
                    <span className="val">{selectedTicket.issueType}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Urgency:</span>
                    <span className={`val priority-text ${selectedTicket.priority === 'High' ? 'text-high' : selectedTicket.priority === 'Medium' ? 'text-medium' : 'text-low'}`}>
                      {selectedTicket.priority}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Reporter description:</span>
                    <span className="val">{selectedTicket.description}</span>
                  </div>

                  <div className="detail-divider"></div>

                  {/* Actions based on state */}
                  {selectedTicket.status === 'Approved' && (
                    <div className="cutter-actions-box">
                      <h4>Dispatch Operations</h4>
                      <p>You have been assigned this job. Please acknowledge and start field deployment.</p>
                      <button 
                        className="btn-start-work"
                        onClick={() => handleStartWork(selectedTicket.id)}
                      >
                        <Play size={18} /> Start Work Order
                      </button>
                    </div>
                  )}

                  {selectedTicket.status === 'In Progress' && (
                    <div className="cutter-actions-box">
                      <h4>Job Resolution & Proof of Work</h4>
                      <div className="form-group">
                        <label>Field Resolution Notes *</label>
                        <textarea
                          value={completionNotes}
                          onChange={(e) => setCompletionNotes(e.target.value)}
                          className="form-textarea"
                          placeholder="Describe the work done (e.g. branch trimmed safely, tree supported, site cleaned, etc.)"
                          rows="3"
                          required
                        ></textarea>
                      </div>

                      <div className="form-group">
                        <label>Upload Resolution Photo (Optional)</label>
                        <div className="mock-upload-box small-upload">
                          <span>Click to upload after-photo</span>
                        </div>
                      </div>

                      <button 
                        className="btn-complete-work"
                        onClick={() => handleCompleteWork(selectedTicket.id)}
                      >
                        <Check size={18} /> Submit Completion Proof
                      </button>
                    </div>
                  )}

                  {selectedTicket.status === 'Completed' && (
                    <div className="completed-box">
                      <h4>Resolution Details:</h4>
                      <p><strong>Notes:</strong> {selectedTicket.completionNotes}</p>
                      <p><strong>Completed At:</strong> {selectedTicket.completedAt}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="detail-placeholder">
                <Scissors size={48} />
                <p>Select an assigned work order to read address details and submit field completion proof.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CutterDashboard;
