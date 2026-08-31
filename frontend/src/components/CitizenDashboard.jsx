import React, { useState, useEffect } from 'react';
import { PlusCircle, FileText, CheckCircle, AlertTriangle, Clock, Landmark, MapPin, TreePine, Search, X, ChevronLeft, Leaf, Droplet, Activity, ShieldAlert, Ban, ChevronRight, Star, Heart } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const issueLabels = {
  damaged: 'Damaged Tree / Blocked Signage',
  overhanging: 'Overgrown Branches',
  dead: 'Dead / Leaning Tree',
  pest: 'Diseased Leaves / Pest',
  roots: 'Root Damage',
  fallen: 'Fallen / Obstruction',
};

const speciesImages = {
  mango: 'https://images.unsplash.com/photo-1598512752271-33f913a5af13?auto=format&fit=crop&w=600&q=80',
  oak: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=600&q=80',
  neem: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=600&q=80',
  banyan: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=600&q=80',
  peepal: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=600&q=80',
  rosewood: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80',
  eucalyptus: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=600&q=80',
  tamarind: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=600&q=80',
  default: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80'
};

const getTreeDisplayImage = (tree) => {
  if (!tree) return speciesImages.default;
  // Always display the exact image uploaded by Admin
  if (tree.image && typeof tree.image === 'string' && tree.image.trim() !== '') {
    return tree.image;
  }
  // Species image fallback only when no image was uploaded
  const nameStr = `${tree.name || ''} ${tree.scientificName || ''}`.toLowerCase();
  if (nameStr.includes('mango')) return speciesImages.mango;
  if (nameStr.includes('oak')) return speciesImages.oak;
  if (nameStr.includes('neem')) return speciesImages.neem;
  if (nameStr.includes('banyan')) return speciesImages.banyan;
  if (nameStr.includes('peepal')) return speciesImages.peepal;
  if (nameStr.includes('rosewood')) return speciesImages.rosewood;
  if (nameStr.includes('eucalyptus')) return speciesImages.eucalyptus;
  if (nameStr.includes('tamarind')) return speciesImages.tamarind;
  return speciesImages.default;
};

const CitizenDashboard = ({ user, activeTab, onTabChange }) => {
  const [tickets, setTickets] = useState([]);
  const [formData, setFormData] = useState({
    location: '',
    issueType: 'overhanging',
    priority: 'Medium',
    description: ''
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Tree browse state
  const [inventoryTrees, setInventoryTrees] = useState([]);
  const [treesLoading, setTreesLoading] = useState(false);
  const [selectedTree, setSelectedTree] = useState(null);
  const [treeSearch, setTreeSearch] = useState('');
  const [treeHealthFilter, setTreeHealthFilter] = useState('all');
  const [favTreeId, setFavTreeId] = useState(() => localStorage.getItem('citizenFavTree') || null);

  const fetchInventoryTrees = () => {
    setTreesLoading(true);
    fetch(`${API_URL}/api/trees`)
      .then(res => res.json())
      .then(data => { setInventoryTrees(Array.isArray(data) ? data : []); setTreesLoading(false); })
      .catch(() => setTreesLoading(false));
  };

  const fetchTickets = () => {
    if (!user?.id) return;
    fetch(`${API_URL}/api/complaints?submittedByUserId=${user.id}`)
      .then(res => res.json())
      .then(data => {
        const complaints = (data.complaints || []).map(c => ({
          id: `T-${c._id.slice(-4).toUpperCase()}`,
          _id: c._id,
          reporterName: c.submittedBy,
          location: c.location,
          issueType: c.issueType,
          priority: c.issueType === 'fallen' || c.issueType === 'dead' ? 'High' : 'Medium',
          description: c.description,
          status: c.status,
          assignedTo: c.assignedTo,
          createdAt: new Date(c.createdAt).toISOString().split('T')[0],
          photoUrl: c.photoUrl,
          beforeImageUrl: c.beforeImageUrl,
          progressImageUrl: c.progressImageUrl,
          afterImageUrl: c.afterImageUrl,
          wasteProofUrl: c.wasteProofUrl,
          completionNotes: c.rejectionReason || '',
          completedAt: c.closedAt ? new Date(c.closedAt).toISOString().split('T')[0] : null,
          requiresReplantation: c.requiresReplantation || false,
          replantationStatus: c.replantationStatus || 'None'
        }));
        setTickets(complaints);
        
        // Update selected ticket in place if details are currently open
        if (selectedTicket) {
          const fresh = complaints.find(t => t._id === selectedTicket._id);
          if (fresh) setSelectedTicket(fresh);
        }
      })
      .catch(err => console.error('Failed to fetch citizen tickets:', err));
  };

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(fetchTickets, 15000);
    return () => clearInterval(interval);
  }, [user?.id]);

  useEffect(() => {
    if (activeTab === 'browse-trees' && inventoryTrees.length === 0) {
      fetchInventoryTrees();
    }
    // Also preload trees on overview if user has a favourite saved
    if (activeTab === 'overview' && favTreeId && inventoryTrees.length === 0) {
      fetchInventoryTrees();
    }
  }, [activeTab]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.location.trim() || !formData.description.trim()) {
      alert('Please fill out all required fields');
      return;
    }
    setSubmitting(true);

    try {
      let uploadedPhotoUrl = '';
      if (photoFile) {
        const uploadForm = new FormData();
        uploadForm.append('image', photoFile);
        const uploadRes = await fetch(`${API_URL}/api/upload`, {
          method: 'POST',
          body: uploadForm
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          uploadedPhotoUrl = `${API_URL}${uploadData.url}`;
        } else {
          console.warn('Image upload failed, submitting report without image.');
        }
      }

      const res = await fetch(`${API_URL}/api/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issueType: formData.issueType,
          description: formData.description,
          location: formData.location,
          photoUrl: uploadedPhotoUrl,
          submittedBy: user.name || 'Citizen',
          submittedByUserId: user.id || null
        })
      });

      if (!res.ok) {
        throw new Error('Failed to submit report');
      }

      setSuccess(true);
      setFormData({
        location: '',
        issueType: 'overhanging',
        priority: 'Medium',
        description: ''
      });
      setPhotoFile(null);
      fetchTickets();
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      alert(err.message || 'Error submitting report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // The API already filters tickets by citizen ID
  const citizenTickets = tickets;

  // Compute stat counts
  const totalReported = citizenTickets.length;
  const activeCount = citizenTickets.filter(t => ['Pending', 'In Review', 'Scheduled', 'In Progress', 'Reached Location', 'Work Completed', 'Waste Disposed'].includes(t.status)).length;
  const resolvedCount = citizenTickets.filter(t => t.status === 'Resolved' || t.status === 'Completed').length;
  const replantedCount = citizenTickets.filter(t => t.requiresReplantation && t.replantationStatus === 'Planted').length;

  const getStatusClass = (status) => {
    switch (status) {
      case 'Pending': return 'badge-pending';
      case 'In Review': return 'badge-approved';
      case 'Scheduled': return 'badge-progress';
      case 'In Progress': return 'badge-progress';
      case 'Reached Location': return 'badge-progress';
      case 'Work Completed': return 'badge-progress';
      case 'Waste Disposed': return 'badge-progress';
      case 'Resolved': return 'badge-completed';
      case 'Completed': return 'badge-completed';
      case 'Rejected': return 'badge-rejected';
      default: return 'badge-default';
    }
  };

  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'High': return 'text-high';
      case 'Medium': return 'text-medium';
      case 'Low': return 'text-low';
      default: return '';
    }
  };

  return (
    <div className="dashboard-content">
      {activeTab === 'overview' && (
        <>
          {/* Summary Cards */}
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div className="stat-card">
              <div className="stat-icon red-tint">
                <FileText size={24} />
              </div>
              <div className="stat-details">
                <h3>{totalReported}</h3>
                <p>My Total Reports</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon yellow-tint">
                <Clock size={24} />
              </div>
              <div className="stat-details">
                <h3>{activeCount}</h3>
                <p>Active Requests</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon green-tint">
                <CheckCircle size={24} />
              </div>
              <div className="stat-details">
                <h3>{resolvedCount}</h3>
                <p>Resolved Issues</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon green-tint" style={{ background: '#ecfdf5', color: '#059669' }}>
                <Leaf size={24} />
              </div>
              <div className="stat-details">
                <h3>{replantedCount}</h3>
                <p>Eco Saplings Replanted</p>
              </div>
            </div>
          </div>

          {/* Neighborhood Sector Info */}
          <div className="info-section">
            <div className="info-card">
              <h2>My Sector Canopy Health</h2>
              <div className="canopy-target-wrapper">
                <div className="progress-bar-container">
                  <div className="progress-bar" style={{ width: '48%' }}>48%</div>
                </div>
                <div className="target-text">
                  <span>Current Canopy: 48%</span>
                  <span>Municipal Target: 55%</span>
                </div>
              </div>
              <div className="metrics-grid-mini">
                <div className="mini-metric">
                  <span className="label">Monitored Trees</span>
                  <span className="value">1,482</span>
                </div>
                <div className="mini-metric">
                  <span className="label">Eco Benefit</span>
                  <span className="value">+$24,500/yr</span>
                </div>
                <div className="mini-metric">
                  <span className="label">Air Quality Index</span>
                  <span className="value text-success">Good (42)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Reports List */}
          <div className="data-table-container">
            <div className="table-header-row">
              <h2>Recent Reports</h2>
            </div>
            {citizenTickets.length === 0 ? (
              <div className="empty-state">
                <p>You haven't reported any issues yet. Click "Report Issue" in the sidebar to get started!</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Ticket ID</th>
                      <th>Location</th>
                      <th>Issue Type</th>
                      <th>Priority</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {citizenTickets.slice(0, 5).map(ticket => (
                      <tr key={ticket.id}>
                        <td><strong>{ticket.id}</strong></td>
                        <td>{ticket.location}</td>
                        <td>{issueLabels[ticket.issueType] || ticket.issueType}</td>
                        <td><span className={`priority-text ${getPriorityClass(ticket.priority)}`}>{ticket.priority}</span></td>
                        <td>{ticket.createdAt}</td>
                        <td><span className={`badge ${getStatusClass(ticket.status)}`}>{ticket.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Browse Tree Inventory quick-access */}
          <div style={{ marginTop: '24px', background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', borderRadius: '16px', padding: '20px 24px', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#065f46', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TreePine size={24} color="#fff" />
              </div>
              <div>
                <h3 style={{ margin: '0 0 3px', fontSize: '1rem', fontWeight: 700, color: '#065f46' }}>Explore Tree Inventory</h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#047857' }}>Browse all trees managed in your city zones — select your favourite!</p>
              </div>
            </div>
            <button
              onClick={() => onTabChange && onTabChange('browse-trees')}
              style={{ background: '#065f46', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 20px', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(4,50,36,0.2)', whiteSpace: 'nowrap' }}
            >
              <TreePine size={16} /> Browse Trees
            </button>
          </div>

          {/* Favourite tree mini-card */}
          {favTreeId && inventoryTrees.length > 0 && (() => {
            const fav = inventoryTrees.find(t => (t._id || t.id) === favTreeId);
            if (!fav) return null;
            const hs = fav.healthScore ?? 90;
            const hColor = hs >= 80 ? '#10b981' : hs >= 50 ? '#f59e0b' : '#ef4444';
            return (
              <div style={{ marginTop: '16px', background: '#fffbeb', border: '2px solid #f59e0b', borderRadius: '16px', padding: '16px 20px', display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '10px', overflow: 'hidden', background: '#f0fdf4', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {fav.image ? <img src={fav.image} alt={fav.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <TreePine size={28} color="#a7f3d0" />}
                </div>
                <div style={{ flex: 1, minWidth: '140px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b45309' }}>⭐ MY FAVOURITE TREE</span>
                    <span style={{ background: hColor, color: '#fff', borderRadius: '20px', padding: '1px 8px', fontSize: '0.7rem', fontWeight: 700 }}>{hs}% {hs >= 80 ? 'Healthy' : hs >= 50 ? 'Fair' : 'Alert'}</span>
                  </div>
                  <p style={{ margin: 0, fontWeight: 700, color: '#1f2937', fontSize: '0.95rem' }}>{fav.name}</p>
                  <p style={{ margin: 0, fontStyle: 'italic', color: '#6b7280', fontSize: '0.78rem' }}>{fav.scientificName}</p>
                </div>
                <button
                  onClick={() => onTabChange && onTabChange('browse-trees')}
                  style={{ background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  View Details
                </button>
              </div>
            );
          })()}
        </>
      )}

      {activeTab === 'report' && (
        <div className="form-card-container">
          <div className="form-card">
            <h2>Report Tree / Canopy Issue</h2>
            <p className="form-subtitle">Help us protect and manage our urban forestry. Submit issue details below.</p>

            {success && (
              <div className="success-alert">
                <CheckCircle size={20} />
                <span>Ticket submitted successfully! Track it in the "My Reports" tab.</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Tree Location / Address *</label>
                <div className="input-wrapper">
                  <MapPin className="input-icon" size={20} />
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="e.g. 104 Pine Street, near Central Library"
                    required
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Issue Type</label>
                  <select 
                    name="issueType" 
                    value={formData.issueType} 
                    onChange={handleChange}
                    className="form-control-select"
                    disabled={submitting}
                  >
                    <option value="overhanging">Overgrown Branches</option>
                    <option value="dead">Dead / Leaning Tree</option>
                    <option value="pest">Diseased Leaves / Pest</option>
                    <option value="damaged">Blocked Street Signage / Damage</option>
                    <option value="roots">Root Damage</option>
                    <option value="fallen">Fallen / Obstruction</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Priority / Urgency</label>
                  <select 
                    name="priority" 
                    value={formData.priority} 
                    onChange={handleChange}
                    className="form-control-select"
                    disabled={submitting}
                  >
                    <option value="Low">Low - Monitored issue</option>
                    <option value="Medium">Medium - Standard verification</option>
                    <option value="High">High - Immediate hazard</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Detailed Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="form-textarea"
                  placeholder="Describe the issue. Mention size, species (if known), or hazards (e.g. power lines, road blockage)."
                  rows="4"
                  required
                  disabled={submitting}
                ></textarea>
              </div>

              <div className="form-group">
                <label>Photo Upload (Optional)</label>
                <div 
                  className="mock-upload-box" 
                  onClick={() => !submitting && document.getElementById('citizen-photo-upload').click()}
                  style={{ cursor: submitting ? 'not-allowed' : 'pointer', border: '2px dashed #046b4e', padding: '1.5rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
                >
                  <PlusCircle size={24} color="#046b4e" />
                  {photoFile ? (
                    <span style={{ color: '#046b4e', fontWeight: 600 }}>Selected: {photoFile.name}</span>
                  ) : (
                    <>
                      <span>Click to select photo of the tree</span>
                      <span className="file-hint">JPEG, PNG up to 5MB</span>
                    </>
                  )}
                  <input 
                    type="file" 
                    id="citizen-photo-upload" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                    style={{ display: 'none' }} 
                    disabled={submitting}
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Submitting Canopy Report...' : 'Submit Canopy Report'}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'my-reports' && (
        <div className="reports-split-view">
          <div className="reports-list-panel">
            <h2>My Reported Tickets</h2>
            {citizenTickets.length === 0 ? (
              <div className="empty-state">
                <p>No reports found.</p>
              </div>
            ) : (
              <div className="ticket-cards-list">
                {citizenTickets.map(ticket => (
                  <div 
                    key={ticket.id} 
                    className={`ticket-mini-card ${selectedTicket?.id === ticket.id ? 'selected' : ''}`}
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <div className="ticket-card-header">
                      <span className="ticket-id">{ticket.id}</span>
                      <span className={`badge ${getStatusClass(ticket.status)}`}>{ticket.status}</span>
                    </div>
                    <h4>{issueLabels[ticket.issueType] || ticket.issueType}</h4>
                    <p className="ticket-loc"><MapPin size={12} /> {ticket.location}</p>
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
                  <h3>Ticket Details: {selectedTicket.id}</h3>
                  <span className={`badge ${getStatusClass(selectedTicket.status)}`}>{selectedTicket.status}</span>
                </div>

                <div className="detail-body">
                  <div className="detail-row">
                    <span className="label">Type:</span>
                    <span className="val">{issueLabels[selectedTicket.issueType] || selectedTicket.issueType}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Priority:</span>
                    <span className={`val priority-text ${getPriorityClass(selectedTicket.priority)}`}>
                      {selectedTicket.priority}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Location:</span>
                    <span className="val">{selectedTicket.location}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Reported on:</span>
                    <span className="val">{selectedTicket.createdAt}</span>
                  </div>
                  
                  {selectedTicket.photoUrl && (
                    <div className="detail-block" style={{ marginTop: '12px' }}>
                      <span className="block-label" style={{ display: 'block', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Submitted Photo:</span>
                      <img 
                        src={selectedTicket.photoUrl} 
                        alt="Submitted issue proof" 
                        style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                  )}

                  <div className="detail-divider"></div>
                  
                  <div className="detail-block">
                    <span className="block-label">Description:</span>
                    <p className="block-text">{selectedTicket.description}</p>
                  </div>

                  {selectedTicket.assignedTo && (
                    <div className="detail-row">
                      <span className="label">Assigned Cutter:</span>
                      <span className="val">{selectedTicket.assignedTo}</span>
                    </div>
                  )}

                  {(selectedTicket.status === 'Resolved' || selectedTicket.status === 'Completed' || selectedTicket.completionNotes) && (
                    <div className="completed-box" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px', borderRadius: '8px', marginTop: '16px' }}>
                      <h4 style={{ color: '#166534', margin: '0 0 4px', fontSize: '0.95rem' }}>Job Resolution Details:</h4>
                      {selectedTicket.completionNotes && <p style={{ margin: '0 0 4px', fontSize: '0.875rem' }}><strong>Notes / Closure:</strong> {selectedTicket.completionNotes}</p>}
                      {selectedTicket.completedAt && <p style={{ margin: 0, fontSize: '0.8rem', color: '#166534' }}><strong>Resolved at:</strong> {selectedTicket.completedAt}</p>}
                    </div>
                  )}

                  {selectedTicket.requiresReplantation && (
                    <div style={{ background: '#ecfdf5', border: '1.5px solid #a7f3d0', padding: '12px', borderRadius: '8px', marginTop: '12px' }}>
                      <h4 style={{ color: '#047857', margin: '0 0 4px', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        🌱 Eco-Restore Replantation
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: '#065f46' }}>
                        <strong>Replantation Status:</strong> {selectedTicket.replantationStatus === 'Planted' ? '🟢 Sapling Planted & Registered!' : '🟡 Scheduled/Pending sapling planting.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="detail-placeholder">
                <FileText size={48} />
                <p>Select a ticket from the list to view its complete progress and action logs.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Browse Trees Tab ─────────────────────────────────────────────── */}
      {activeTab === 'browse-trees' && (() => {
        const getHealthColor = (s) => s >= 80 ? '#10b981' : s >= 50 ? '#f59e0b' : '#ef4444';
        const getHealthLabel = (s) => s >= 80 ? 'Healthy' : s >= 50 ? 'Fair' : 'Alert';

        const filtered = inventoryTrees.filter(tree => {
          const q = treeSearch.toLowerCase();
          const matchQ = !q ||
            (tree.name||'').toLowerCase().includes(q) ||
            (tree.scientificName||'').toLowerCase().includes(q) ||
            (tree.family||'').toLowerCase().includes(q) ||
            (tree.origin||'').toLowerCase().includes(q);
          const hs = tree.healthScore ?? 90;
          const matchH = treeHealthFilter === 'all' ||
            (treeHealthFilter === 'healthy' && hs >= 80) ||
            (treeHealthFilter === 'fair' && hs >= 50 && hs < 80) ||
            (treeHealthFilter === 'alert' && hs < 50);
          return matchQ && matchH;
        });

        // ── Detail view ──
        if (selectedTree) {
          const hs = selectedTree.healthScore ?? 90;
          const cc = selectedTree.canopyCoverage ?? 80;
          const benefits = Array.isArray(selectedTree.benefits) ? selectedTree.benefits : [];
          const pests    = Array.isArray(selectedTree.pests)    ? selectedTree.pests    : [];
          const diseases = Array.isArray(selectedTree.diseases) ? selectedTree.diseases : [];
          const isFav = favTreeId === (selectedTree._id || selectedTree.id);

          return (
            <div>
              {/* Back + Fav row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <button
                  onClick={() => setSelectedTree(null)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    background: 'none', border: '1px solid #d1d5db', borderRadius: '8px',
                    padding: '8px 16px', cursor: 'pointer', color: '#374151',
                    fontWeight: 600, fontSize: '0.875rem'
                  }}
                >
                  <ChevronLeft size={16} /> Back to Trees
                </button>
                <button
                  onClick={() => {
                    const newId = isFav ? null : (selectedTree._id || selectedTree.id);
                    setFavTreeId(newId);
                    if (newId) localStorage.setItem('citizenFavTree', newId);
                    else localStorage.removeItem('citizenFavTree');
                  }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
                    border: isFav ? '2px solid #f59e0b' : '1.5px solid #d1d5db',
                    background: isFav ? '#fffbeb' : '#fff',
                    color: isFav ? '#b45309' : '#6b7280'
                  }}
                >
                  <Star size={15} fill={isFav ? '#f59e0b' : 'none'} color={isFav ? '#f59e0b' : '#6b7280'} />
                  {isFav ? 'My Favourite Tree' : 'Mark as Favourite'}
                </button>
              </div>

              {/* Hero banner */}
              <div style={{
                background: 'linear-gradient(135deg, #043224 0%, #065f46 60%, #047857 100%)',
                borderRadius: '16px', padding: '24px', color: '#fff',
                display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap',
                marginBottom: '20px'
              }}>
                <div style={{
                  width: '140px', height: '140px', borderRadius: '12px', overflow: 'hidden',
                  background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0, border: '2px solid rgba(255,255,255,0.2)'
                }}>
                  <img
                    src={getTreeDisplayImage(selectedTree)}
                    alt={selectedTree.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.currentTarget.src = speciesImages.default; }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    <h2 style={{ margin: 0, fontWeight: 800, fontSize: '1.5rem' }}>{selectedTree.name}</h2>
                    <span style={{ background: getHealthColor(hs), color: '#fff', borderRadius: '20px', padding: '3px 12px', fontSize: '0.8rem', fontWeight: 700 }}>
                      {getHealthLabel(hs)} · {hs}%
                    </span>
                    {isFav && <span style={{ background: '#f59e0b', color: '#fff', borderRadius: '20px', padding: '3px 10px', fontSize: '0.75rem', fontWeight: 700 }}>⭐ My Tree</span>}
                  </div>
                  <p style={{ margin: '0 0 12px', fontStyle: 'italic', color: 'rgba(255,255,255,0.75)', fontSize: '0.9rem' }}>{selectedTree.scientificName}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {[{ l: 'Family', v: selectedTree.family }, { l: 'Origin', v: selectedTree.origin }, { l: 'Height', v: selectedTree.height }, { l: 'Age', v: selectedTree.ageRange }, { l: 'Canopy Spread', v: selectedTree.canopySpread }, { l: 'Water', v: selectedTree.waterRequirement }]
                      .filter(t => t.v).map(tag => (
                        <span key={tag.l} style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '8px', padding: '4px 10px', fontSize: '0.78rem', border: '1px solid rgba(255,255,255,0.2)' }}>
                          <span style={{ opacity: 0.7, marginRight: '4px' }}>{tag.l}:</span><strong>{tag.v}</strong>
                        </span>
                      ))}
                  </div>
                </div>
              </div>

              {/* Cards grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>

                {/* Description */}
                {selectedTree.description && (
                  <div style={{ background: '#fff', borderRadius: '12px', padding: '18px', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', gridColumn: 'span 2' }}>
                    <h4 style={{ margin: '0 0 10px', color: '#065f46', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem' }}>
                      <Leaf size={16} /> About This Tree
                    </h4>
                    <p style={{ margin: 0, color: '#374151', lineHeight: 1.7, fontSize: '0.875rem' }}>{selectedTree.description}</p>
                  </div>
                )}

                {/* Health Metrics */}
                <div style={{ background: '#fff', borderRadius: '12px', padding: '18px', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <h4 style={{ margin: '0 0 14px', color: '#065f46', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem' }}>
                    <Activity size={16} /> Health Metrics
                  </h4>
                  {[{ label: 'Health Score', value: hs, color: getHealthColor(hs) }, { label: 'Canopy Coverage', value: cc, color: '#3b82f6' }].map(m => (
                    <div key={m.label} style={{ marginBottom: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>
                        <span>{m.label}</span><span style={{ color: m.color }}>{m.value}%</span>
                      </div>
                      <div style={{ height: '7px', borderRadius: '8px', background: '#f3f4f6', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${m.value}%`, background: m.color, borderRadius: '8px' }} />
                      </div>
                    </div>
                  ))}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#f0fdf4', borderRadius: '8px', marginTop: '4px' }}>
                    <Droplet size={14} color="#065f46" />
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: 600 }}>WATER REQUIREMENT</div>
                      <div style={{ fontWeight: 700, color: '#065f46', fontSize: '0.875rem' }}>{selectedTree.waterRequirement || 'Medium'}</div>
                    </div>
                  </div>
                  {selectedTree.addedAt && (
                    <p style={{ margin: '10px 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>📅 Added: {selectedTree.addedAt}</p>
                  )}
                </div>

                {/* Benefits */}
                {benefits.length > 0 && (
                  <div style={{ background: '#fff', borderRadius: '12px', padding: '18px', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <h4 style={{ margin: '0 0 12px', color: '#065f46', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem' }}>
                      <Leaf size={16} /> Environmental Benefits
                    </h4>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {benefits.map((b, i) => (
                        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '6px 10px', background: '#f0fdf4', borderRadius: '8px' }}>
                          <CheckCircle size={14} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span style={{ fontSize: '0.82rem', color: '#374151', lineHeight: 1.5 }}>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Diseases */}
                {diseases.length > 0 && (
                  <div style={{ background: '#fff', borderRadius: '12px', padding: '18px', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <h4 style={{ margin: '0 0 12px', color: '#b45309', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem' }}>
                      <ShieldAlert size={16} /> Common Diseases
                    </h4>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      {diseases.map((d, i) => (
                        <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 10px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a' }}>
                          <AlertTriangle size={13} color="#b45309" style={{ flexShrink: 0 }} />
                          <span style={{ fontSize: '0.82rem', color: '#374151' }}>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Pests */}
                {pests.length > 0 && (
                  <div style={{ background: '#fff', borderRadius: '12px', padding: '18px', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <h4 style={{ margin: '0 0 12px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem' }}>
                      <Ban size={16} /> Common Pests
                    </h4>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      {pests.map((p, i) => (
                        <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 10px', background: '#fff1f2', borderRadius: '8px', border: '1px solid #fecdd3' }}>
                          <AlertTriangle size={13} color="#dc2626" style={{ flexShrink: 0 }} />
                          <span style={{ fontSize: '0.82rem', color: '#374151' }}>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              </div>
            </div>
          );
        }

        // ── List / grid view ──
        return (
          <div>
            {/* Search + filter */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px', alignItems: 'center' }}>
              <div style={{
                flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '8px',
                background: '#fff', borderRadius: '10px', padding: '9px 14px',
                border: '1.5px solid #d1d5db', boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
              }}>
                <Search size={16} color="#9ca3af" style={{ flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Search trees by name, family, origin…"
                  value={treeSearch}
                  onChange={e => setTreeSearch(e.target.value)}
                  style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.875rem', color: '#374151', background: 'transparent' }}
                />
                {treeSearch && (
                  <button onClick={() => setTreeSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}>
                    <X size={14} />
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[{ k: 'all', l: 'All', c: '#6b7280' }, { k: 'healthy', l: '🟢 Healthy', c: '#10b981' }, { k: 'fair', l: '🟡 Fair', c: '#f59e0b' }, { k: 'alert', l: '🔴 Alert', c: '#ef4444' }].map(f => (
                  <button
                    key={f.k}
                    onClick={() => setTreeHealthFilter(f.k)}
                    style={{
                      padding: '8px 14px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600,
                      border: treeHealthFilter === f.k ? `2px solid ${f.c}` : '1.5px solid #d1d5db',
                      background: treeHealthFilter === f.k ? `${f.c}15` : '#fff',
                      color: treeHealthFilter === f.k ? f.c : '#6b7280',
                      cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap'
                    }}
                  >{f.l}</button>
                ))}
              </div>
            </div>

            {/* Tree count */}
            <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: '#6b7280', fontWeight: 600 }}>
              {treesLoading ? 'Loading trees…' : `${filtered.length} tree${filtered.length !== 1 ? 's' : ''} found`}
            </p>

            {treesLoading ? (
              <div style={{ textAlign: 'center', padding: '48px', color: '#9ca3af' }}>
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🌱</div>
                <p>Loading tree inventory…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', color: '#9ca3af' }}>
                <TreePine size={40} style={{ opacity: 0.25, marginBottom: '10px' }} />
                <p>{inventoryTrees.length === 0 ? 'No trees in the inventory yet.' : 'No trees match your search.'}</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                {filtered.map(tree => {
                  const hs = tree.healthScore ?? 90;
                  const hColor = getHealthColor(hs);
                  const hLabel = getHealthLabel(hs);
                  const isThisFav = favTreeId === (tree._id || tree.id);
                  return (
                    <div
                      key={tree._id || tree.id}
                      onClick={() => setSelectedTree(tree)}
                      style={{
                        background: '#fff', borderRadius: '14px', overflow: 'hidden',
                        border: isThisFav ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                        boxShadow: isThisFav ? '0 4px 16px rgba(245,158,11,0.18)' : '0 2px 8px rgba(0,0,0,0.05)',
                        cursor: 'pointer', transition: 'all 0.22s', display: 'flex', flexDirection: 'column'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-3px)';
                        e.currentTarget.style.boxShadow = '0 10px 24px rgba(4,50,36,0.14)';
                        if (!isThisFav) e.currentTarget.style.borderColor = '#10b981';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = isThisFav ? '0 4px 16px rgba(245,158,11,0.18)' : '0 2px 8px rgba(0,0,0,0.05)';
                        e.currentTarget.style.borderColor = isThisFav ? '#f59e0b' : '#e5e7eb';
                      }}
                    >
                      {/* Image area */}
                      <div style={{ height: '150px', background: '#f0fdf4', position: 'relative', overflow: 'hidden' }}>
                        <img
                          src={getTreeDisplayImage(tree)}
                          alt={tree.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => { e.currentTarget.src = speciesImages.default; }}
                        />
                        <span style={{ position: 'absolute', top: '8px', right: '8px', background: hColor, color: '#fff', borderRadius: '20px', padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700 }}>
                          {hLabel}
                        </span>
                        {isThisFav && (
                          <span style={{ position: 'absolute', top: '8px', left: '8px', background: '#f59e0b', color: '#fff', borderRadius: '20px', padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700 }}>⭐ My Tree</span>
                        )}
                      </div>
                      {/* Body */}
                      <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <h4 style={{ margin: '0 0 2px', fontSize: '1rem', fontWeight: 700, color: '#111827' }}>{tree.name}</h4>
                        <p style={{ margin: '0 0 10px', fontStyle: 'italic', color: '#6b7280', fontSize: '0.78rem' }}>{tree.scientificName}</p>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                          {tree.family && <span style={{ background: '#f0fdf4', color: '#065f46', padding: '2px 8px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 600, border: '1px solid #d1fae5' }}>{tree.family}</span>}
                          {tree.origin && <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 600, border: '1px solid #bfdbfe' }}>{tree.origin}</span>}
                        </div>
                        {tree.description && (
                          <p style={{ margin: '0 0 10px', fontSize: '0.78rem', color: '#4b5563', lineHeight: 1.5, flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {tree.description}
                          </p>
                        )}
                        <div style={{ display: 'flex', gap: '10px', paddingTop: '10px', borderTop: '1px solid #f3f4f6' }}>
                          <div style={{ flex: 1, textAlign: 'center' }}>
                            <div style={{ fontSize: '0.65rem', color: '#9ca3af', fontWeight: 600, marginBottom: '2px' }}>HEALTH</div>
                            <div style={{ fontWeight: 800, color: hColor, fontSize: '0.95rem' }}>{hs}%</div>
                          </div>
                          <div style={{ width: '1px', background: '#f3f4f6' }} />
                          <div style={{ flex: 1, textAlign: 'center' }}>
                            <div style={{ fontSize: '0.65rem', color: '#9ca3af', fontWeight: 600, marginBottom: '2px' }}>CANOPY</div>
                            <div style={{ fontWeight: 800, color: '#3b82f6', fontSize: '0.95rem' }}>{tree.canopyCoverage ?? 80}%</div>
                          </div>
                          {tree.height && <>
                            <div style={{ width: '1px', background: '#f3f4f6' }} />
                            <div style={{ flex: 1, textAlign: 'center' }}>
                              <div style={{ fontSize: '0.65rem', color: '#9ca3af', fontWeight: 600, marginBottom: '2px' }}>HEIGHT</div>
                              <div style={{ fontWeight: 700, color: '#374151', fontSize: '0.8rem' }}>{tree.height}</div>
                            </div>
                          </>}
                        </div>
                        {Array.isArray(tree.benefits) && tree.benefits.length > 0 && (
                          <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {tree.benefits.slice(0, 1).map((b, i) => (
                              <span key={i} style={{ fontSize: '0.68rem', color: '#065f46', background: '#ecfdf5', padding: '1px 7px', borderRadius: '20px', fontWeight: 600 }}>✓ {b.length > 28 ? b.slice(0, 28) + '…' : b}</span>
                            ))}
                            {tree.benefits.length > 1 && <span style={{ fontSize: '0.68rem', color: '#6b7280', background: '#f9fafb', padding: '1px 7px', borderRadius: '20px' }}>+{tree.benefits.length - 1} more</span>}
                          </div>
                        )}
                        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                          <span style={{ fontSize: '0.78rem', color: '#065f46', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>View Details <ChevronRight size={13} /></span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};

export default CitizenDashboard;
