import React, { useState, useEffect } from 'react';
import { PlusCircle, FileText, CheckCircle, AlertTriangle, Clock, Landmark, MapPin, TreePine, Search, X, ChevronLeft, Leaf, Droplet, Activity, ShieldAlert, Ban, ChevronRight, Star, Heart, Award, Sparkles, Trophy, Calendar, Check, Flame, ShieldCheck, Share2, User, Mail, Phone, Shield, Camera, Edit3, Save, ExternalLink } from 'lucide-react';
import TreeGuardianCertificateModal from './TreeGuardianCertificateModal';
import CanopyLensModal from './CanopyLensModal';

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
  jackfruit: 'https://images.unsplash.com/photo-1590005354167-6da97870c913?auto=format&fit=crop&w=600&q=80',
  ashoka: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=600&q=80',
  gulmohar: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=600&q=80',
  honge: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80',
  coconut: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
  default: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80'
};

const getTreeDisplayImage = (tree) => {
  if (!tree) return speciesImages.default;
  // Always display the actual uploaded image
  if (tree.image && typeof tree.image === 'string' && tree.image.trim() !== '') {
    let img = tree.image.trim();
    if (img.startsWith('/uploads/')) {
      img = `${API_URL}${img}`;
    }
    return img;
  }
  // Species image fallback only when no image was uploaded
  const nameStr = `${tree.name || ''} ${tree.scientificName || ''} ${tree.family || ''}`.toLowerCase();
  if (nameStr.includes('mango') || nameStr.includes('mangifera')) return speciesImages.mango;
  if (nameStr.includes('oak')) return speciesImages.oak;
  if (nameStr.includes('neem') || nameStr.includes('azadirachta')) return speciesImages.neem;
  if (nameStr.includes('banyan') || nameStr.includes('benghalensis')) return speciesImages.banyan;
  if (nameStr.includes('peepal') || nameStr.includes('religiosa')) return speciesImages.peepal;
  if (nameStr.includes('rosewood') || nameStr.includes('dalbergia')) return speciesImages.rosewood;
  if (nameStr.includes('eucalyptus')) return speciesImages.eucalyptus;
  if (nameStr.includes('tamarind')) return speciesImages.tamarind;
  if (nameStr.includes('jackfruit') || nameStr.includes('artocarpus')) return speciesImages.jackfruit;
  if (nameStr.includes('ashoka') || nameStr.includes('polyalthia')) return speciesImages.ashoka;
  if (nameStr.includes('gulmohar') || nameStr.includes('delonix')) return speciesImages.gulmohar;
  if (nameStr.includes('honge') || nameStr.includes('pongamia')) return speciesImages.honge;
  if (nameStr.includes('coconut') || nameStr.includes('cocos')) return speciesImages.coconut;
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

  // Green Rewards & Tree Adoption State
  const [adoptions, setAdoptions] = useState([]);
  const [rewardsStats, setRewardsStats] = useState({
    totalPoints: 0,
    totalTreesAdopted: 0,
    totalCareLogs: 0,
    levelName: 'Seedling Guardian',
    levelTier: 1,
    nextTierPoints: 250,
  });
  const [badges, setBadges] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [adoptionsLoading, setAdoptionsLoading] = useState(false);
  const [adoptingTreeId, setAdoptingTreeId] = useState(null);
  const [customNickname, setCustomNickname] = useState('');
  const [activeCertificate, setActiveCertificate] = useState(null);
  const [careActionLoading, setCareActionLoading] = useState(false);
  const [careAlert, setCareAlert] = useState('');
  const [scanModalOpen, setScanModalOpen] = useState(false);

  // Profile Management State
  const [profileData, setProfileData] = useState(() => {
    const cu = (() => {
      try { return JSON.parse(localStorage.getItem('currentUser')) || {}; }
      catch { return {}; }
    })();
    return {
      name: user?.name || user?.username || cu.name || cu.username || 'Eco Guardian',
      email: user?.email || cu.email || 'citizen@treecanopy.gov.in',
      phone: user?.phone || cu.phone || '+91 98765 43210',
      address: user?.address || cu.address || 'Udupi Urban Ward 4, Karnataka',
      profileImage: user?.profileImage || user?.avatar || cu.profileImage || cu.avatar || '',
      citizenId: user?.id || user?._id || cu.id || cu._id || 'CZ-7821',
      joinedDate: user?.createdAt || cu.createdAt || '2024-01-15'
    };
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  const [avatarUploading, setAvatarUploading] = useState(false);

  const effectiveUserId = user?.id || user?._id || profileData.citizenId || 'citizen_guest';
  const effectiveUserName = profileData.name || user?.name || user?.username || 'Eco Guardian';
  const effectiveUserEmail = profileData.email || user?.email || 'citizen@treecanopy.gov.in';

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setProfileMsg({ type: '', text: '' });
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('image', file);
      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: uploadFormData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Image upload failed');
      const imgUrl = data.imageUrl ? `${API_URL}${data.imageUrl}` : (data.url || '');
      
      const updated = { ...profileData, profileImage: imgUrl };
      setProfileData(updated);

      // Save to localStorage
      try {
        const stored = JSON.parse(localStorage.getItem('currentUser')) || {};
        const merged = { ...stored, profileImage: imgUrl, avatar: imgUrl };
        localStorage.setItem('currentUser', JSON.stringify(merged));
        window.dispatchEvent(new Event('storage'));
      } catch (err) {}

      // If backend user update endpoint exists, sync it
      if (user?.id || user?._id) {
        fetch(`${API_URL}/api/users/${user.id || user._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileImage: imgUrl })
        }).catch(() => {});
      }

      setProfileMsg({ type: 'success', text: 'Profile picture updated successfully!' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message || 'Error uploading photo' });
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg({ type: '', text: '' });
    try {
      // Update localStorage
      try {
        const stored = JSON.parse(localStorage.getItem('currentUser')) || {};
        const merged = { ...stored, ...profileData, name: profileData.name, email: profileData.email, phone: profileData.phone, address: profileData.address };
        localStorage.setItem('currentUser', JSON.stringify(merged));
        window.dispatchEvent(new Event('storage'));
      } catch (err) {}

      // Update backend if possible
      if (user?.id || user?._id) {
        await fetch(`${API_URL}/api/users/${user.id || user._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: profileData.name,
            phone: profileData.phone,
            address: profileData.address
          })
        }).catch(() => {});
      }

      setIsEditingProfile(false);
      setProfileMsg({ type: 'success', text: 'Profile information saved successfully!' });
      setTimeout(() => setProfileMsg({ type: '', text: '' }), 4000);
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message || 'Error updating profile' });
    } finally {
      setProfileSaving(false);
    }
  };

  const fetchAdoptions = () => {
    if (!effectiveUserId) return;
    setAdoptionsLoading(true);
    fetch(`${API_URL}/api/adoptions/my-adoptions?userId=${encodeURIComponent(effectiveUserId)}`)
      .then(res => res.json())
      .then(data => {
        setAdoptions(data.adoptions || []);
        if (data.stats) setRewardsStats(data.stats);
        if (data.badges) setBadges(data.badges);
        setAdoptionsLoading(false);
      })
      .catch(() => setAdoptionsLoading(false));
  };

  const fetchLeaderboard = () => {
    fetch(`${API_URL}/api/adoptions/leaderboard`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setLeaderboard(data);
      })
      .catch(() => {});
  };

  const handleAdoptTree = async (tree) => {
    const nicknamePrompt = window.prompt(`Give a nickname to this ${tree.name}:`, tree.name) || tree.name;
    try {
      const res = await fetch(`${API_URL}/api/adoptions/adopt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: effectiveUserId,
          userName: effectiveUserName,
          userEmail: effectiveUserEmail,
          treeId: tree._id || tree.id,
          treeName: tree.name,
          treeScientificName: tree.scientificName,
          treeFamily: tree.family,
          treeLocation: tree.origin || 'Udupi Canopy',
          treeImage: tree.image || '',
          nickname: nicknamePrompt
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Could not adopt tree');
      alert(`🎉 ${data.msg}\nYou earned +${data.pointsAwarded} Eco-Points! Check the "Green Rewards & My Trees" tab.`);
      fetchAdoptions();
      fetchLeaderboard();
      if (onTabChange) onTabChange('rewards');
    } catch (err) {
      alert(err.message || 'Error adopting tree');
    }
  };

  const handleLogCare = async (adoptionId, action = 'Watered') => {
    setCareActionLoading(true);
    setCareAlert('');
    try {
      const res = await fetch(`${API_URL}/api/adoptions/${adoptionId}/care-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note: `Citizen logged ${action}` })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Failed to log care');
      setCareAlert(data.msg);
      fetchAdoptions();
      fetchLeaderboard();
      setTimeout(() => setCareAlert(''), 5000);
    } catch (err) {
      alert(err.message || 'Error logging care');
    } finally {
      setCareActionLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchAdoptions();
    fetchLeaderboard();
    const interval = setInterval(() => {
      fetchTickets();
      fetchAdoptions();
    }, 20000);
    return () => clearInterval(interval);
  }, [user?.id, user?._id]);


  useEffect(() => {
    if ((activeTab === 'browse-trees' || activeTab === 'rewards') && inventoryTrees.length === 0) {
      fetchInventoryTrees();
    }
    if (activeTab === 'rewards') {
      fetchAdoptions();
      fetchLeaderboard();
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
                  <span className="value">+₹24,500/yr</span>
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

          {/* CanopyLens AI Scanner Banner */}
          <div style={{ marginTop: '24px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', borderRadius: '16px', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', boxShadow: '0 8px 24px rgba(16, 185, 129, 0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={26} color="#fff" />
              </div>
              <div>
                <h3 style={{ margin: '0 0 3px', fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>CanopyLens AI 🌳 (Tree Scanner)</h3>
                <p style={{ margin: 0, fontSize: '0.84rem', color: '#ecfdf5' }}>Point camera at any tree to identify species, match GIS inventory &amp; check adoption status!</p>
              </div>
            </div>
            <button
              onClick={() => setScanModalOpen(true)}
              style={{ background: '#ffffff', color: '#047857', border: 'none', borderRadius: '10px', padding: '10px 20px', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', whiteSpace: 'nowrap' }}
            >
              <Camera size={16} /> Scan a Tree Now
            </button>
          </div>

          {/* Browse Tree Inventory quick-access */}
          <div style={{ marginTop: '16px', background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', borderRadius: '16px', padding: '20px 24px', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
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

      {/* ── Green Rewards & Tree Adoption Tab ────────────────────────── */}
      {activeTab === 'rewards' && (
        <div className="green-rewards-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Notification Alert Banner if any */}
          {careAlert && (
            <div style={{
              background: '#ecfdf5',
              border: '1.5px solid #10b981',
              borderRadius: '12px',
              padding: '12px 18px',
              color: '#065f46',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Sparkles size={20} color="#059669" />
              <span>{careAlert}</span>
            </div>
          )}

          {/* Top Eco Level & Stats Hero */}
          <div style={{
            background: 'linear-gradient(135deg, #043224 0%, #065f46 50%, #047857 100%)',
            borderRadius: '20px',
            padding: '28px',
            color: '#ffffff',
            boxShadow: '0 10px 25px -5px rgba(4, 120, 87, 0.3)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '24px',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, color: '#fde68a', marginBottom: '8px' }}>
                <Award size={14} /> Tier {rewardsStats.levelTier} Guardian
              </div>
              <h2 style={{ margin: '0 0 6px', fontSize: '1.75rem', fontWeight: 800 }}>
                {rewardsStats.levelName}
              </h2>
              <p style={{ margin: '0 0 16px', color: '#d1fae5', fontSize: '0.9rem' }}>
                Welcome, {user.name || 'Citizen'}! Earn Eco-Points by adopting trees, watering, and logging health checks.
              </p>

              {/* Progress to Next Tier */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: '#a7f3d0' }}>
                  <span>Points Progress</span>
                  <span>{rewardsStats.totalPoints} / {rewardsStats.nextTierPoints} pts</span>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, Math.round((rewardsStats.totalPoints / rewardsStats.nextTierPoints) * 100))}%`,
                    background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                    borderRadius: '10px',
                    transition: 'width 0.4s ease'
                  }} />
                </div>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '16px 10px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.15)' }}>
                <Sparkles size={22} color="#fde68a" style={{ margin: '0 auto 6px' }} />
                <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{rewardsStats.totalPoints}</div>
                <div style={{ fontSize: '0.75rem', color: '#d1fae5' }}>Eco-Points</div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '16px 10px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.15)' }}>
                <TreePine size={22} color="#a7f3d0" style={{ margin: '0 auto 6px' }} />
                <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{rewardsStats.totalTreesAdopted}</div>
                <div style={{ fontSize: '0.75rem', color: '#d1fae5' }}>Adopted Trees</div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '16px 10px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.15)' }}>
                <Flame size={22} color="#f87171" style={{ margin: '0 auto 6px' }} />
                <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{rewardsStats.totalCareLogs}</div>
                <div style={{ fontSize: '0.75rem', color: '#d1fae5' }}>Care Check-ins</div>
              </div>
            </div>
          </div>

          {/* Section: My Adopted Trees */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
                  🌳 My Living Tree Pledges ({adoptions.length})
                </h3>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
                  Provide daily watering and maintenance to keep your care streak and unlock certificates.
                </p>
              </div>
              <button
                onClick={() => onTabChange && onTabChange('browse-trees')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#046b4e',
                  color: '#ffffff',
                  padding: '9px 18px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(4, 107, 78, 0.2)'
                }}
              >
                <PlusCircle size={16} /> Adopt Another Tree
              </button>
            </div>

            {adoptions.length === 0 ? (
              <div style={{
                background: '#ffffff',
                border: '2px dashed #cbd5e1',
                borderRadius: '16px',
                padding: '40px 20px',
                textAlign: 'center'
              }}>
                <TreePine size={48} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
                <h4 style={{ margin: '0 0 6px', color: '#1e293b' }}>No Trees Adopted Yet</h4>
                <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto 16px' }}>
                  Browse our city inventory to adopt a tree in your neighborhood. You will earn +100 Eco-Points and receive a formal Tree Guardian Certificate!
                </p>
                <button
                  onClick={() => onTabChange && onTabChange('browse-trees')}
                  style={{
                    background: '#043224',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}
                >
                  Explore Trees to Adopt
                </button>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '18px'
              }}>
                {adoptions.map(item => {
                  const displayImg = getTreeDisplayImage({ image: item.treeImage, name: item.treeName, scientificName: item.treeScientificName });
                  return (
                    <div
                      key={item._id}
                      style={{
                        background: '#ffffff',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        overflow: 'hidden',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      {/* Image Header */}
                      <div style={{ height: '150px', position: 'relative', overflow: 'hidden', background: '#f0fdf4' }}>
                        <img
                          src={displayImg}
                          alt={item.treeName}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => { e.currentTarget.src = speciesImages.default; }}
                        />
                        <span style={{
                          position: 'absolute', top: '10px', left: '10px',
                          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                          color: '#fde68a', borderRadius: '20px', padding: '3px 10px',
                          fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px'
                        }}>
                          <Flame size={12} color="#f87171" /> {item.careStreak || 1} Day Streak
                        </span>
                        <span style={{
                          position: 'absolute', top: '10px', right: '10px',
                          background: '#047857', color: '#ffffff', borderRadius: '20px', padding: '3px 10px',
                          fontSize: '0.72rem', fontWeight: 700
                        }}>
                          ⭐ {item.totalEcoPoints || 100} pts
                        </span>
                      </div>

                      {/* Card Content */}
                      <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <h4 style={{ margin: '0 0 2px', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                          {item.nickname ? `"${item.nickname}"` : item.treeName}
                        </h4>
                        <p style={{ margin: '0 0 8px', fontStyle: 'italic', color: '#64748b', fontSize: '0.8rem' }}>
                          {item.treeScientificName || item.treeName}
                        </p>
                        <p style={{ margin: '0 0 14px', fontSize: '0.8rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={14} color="#059669" /> {item.treeLocation || 'Udupi Zone'}
                        </p>

                        {/* Care Action Bar */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px',
                          marginBottom: '10px'
                        }}>
                          <button
                            onClick={() => handleLogCare(item._id, 'Watered')}
                            disabled={careActionLoading}
                            style={{
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              color: '#1d4ed8',
                              padding: '8px 10px',
                              borderRadius: '8px',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '5px',
                              cursor: 'pointer'
                            }}
                          >
                            <Droplet size={14} color="#2563eb" /> Water (+50)
                          </button>

                          <button
                            onClick={() => handleLogCare(item._id, 'Mulched')}
                            disabled={careActionLoading}
                            style={{
                              background: '#fef3c7',
                              border: '1px solid #fde68a',
                              color: '#92400e',
                              padding: '8px 10px',
                              borderRadius: '8px',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '5px',
                              cursor: 'pointer'
                            }}
                          >
                            <Sparkles size={14} color="#d97706" /> Mulch (+75)
                          </button>
                        </div>

                        {/* Certificate Button */}
                        <button
                          onClick={() => setActiveCertificate(item)}
                          style={{
                            width: '100%',
                            marginTop: 'auto',
                            padding: '9px',
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            color: '#334155',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          <Award size={15} color="#d97706" /> View Guardian Certificate
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Badges & Achievements Showcase */}
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trophy size={20} color="#f59e0b" /> Canopy Badges & Honors
            </h3>
            <p style={{ margin: '0 0 18px', color: '#64748b', fontSize: '0.875rem' }}>
              Unlock special community recognition by completing green urban milestones.
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px'
            }}>
              {badges.map(b => (
                <div
                  key={b.id}
                  style={{
                    background: b.unlocked ? '#f0fdf4' : '#f8fafc',
                    border: b.unlocked ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    opacity: b.unlocked ? 1 : 0.6
                  }}
                >
                  <div style={{
                    fontSize: '1.8rem',
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    background: b.unlocked ? '#dcfce7' : '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {b.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.85rem', color: b.unlocked ? '#065f46' : '#64748b' }}>
                      {b.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      {b.desc}
                    </div>
                    {b.unlocked && (
                      <span style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: 700, display: 'block', marginTop: '2px' }}>
                        ✓ Unlocked
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Community Citizen Leaderboard */}
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⭐ City Eco Guardians Leaderboard
            </h3>
            <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '0.875rem' }}>
              Top citizens actively protecting and watering our urban canopy in Udupi.
            </p>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 14px' }}>Rank</th>
                    <th style={{ padding: '10px 14px' }}>Citizen Guardian</th>
                    <th style={{ padding: '10px 14px' }}>Trees Adopted</th>
                    <th style={{ padding: '10px 14px' }}>Total Eco-Points</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>
                        Leaderboard data updating... Adopt your first tree to claim #1 rank!
                      </td>
                    </tr>
                  ) : (
                    leaderboard.map((row, idx) => (
                      <tr
                        key={row._id || idx}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: row._id === user?.id ? '#f0fdf4' : 'transparent',
                          fontWeight: row._id === user?.id ? 700 : 500
                        }}
                      >
                        <td style={{ padding: '12px 14px' }}>
                          {idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : `#${idx + 1}`}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#0f172a' }}>
                          {row.userName || 'Citizen'} {row._id === user?.id ? ' (You)' : ''}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#059669' }}>
                          🌳 {row.treesCount} Trees
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 800, color: '#b45309' }}>
                          ⭐ {row.totalPoints} pts
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Certificate Modal */}
      {activeCertificate && (
        <TreeGuardianCertificateModal
          adoption={activeCertificate}
          onClose={() => setActiveCertificate(null)}
        />
      )}

      {activeTab === 'report' && (
        <div className="form-card-container">
          <div className="form-card">
            <h2>Report Tree / Canopy Issue</h2>
            <p className="form-subtitle">Help us protect and manage our urban forestry. Submit issue details below.</p>

            {success && (
              <div className="success-alert" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle size={20} />
                  <span>Ticket submitted successfully! Track it in the "My Reports" tab.</span>
                </div>
                <button 
                  onClick={() => setActiveTab('my-reports')}
                  className="btn-primary" 
                  style={{ alignSelf: 'flex-start', padding: '6px 12px', fontSize: '0.9rem' }}
                >
                  View My Reports
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ margin: 0 }}>Tree Location / Address *</label>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => {
                      if (!navigator.geolocation) {
                        alert('Geolocation is not supported by your browser.');
                        return;
                      }
                      setFormData(prev => ({ ...prev, location: 'Fetching live GPS location...' }));
                      navigator.geolocation.getCurrentPosition(
                        async (pos) => {
                          const { latitude, longitude } = pos.coords;
                          try {
                            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                            const data = await res.json();
                            if (data && data.display_name) {
                              setFormData(prev => ({ ...prev, location: data.display_name }));
                            } else {
                              setFormData(prev => ({ ...prev, location: `GPS Coordinates: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}` }));
                            }
                          } catch (err) {
                            setFormData(prev => ({ ...prev, location: `GPS Coordinates: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}` }));
                          }
                        },
                        (err) => {
                          alert('Unable to retrieve your location. Please check your browser location permissions.');
                          setFormData(prev => ({ ...prev, location: '' }));
                        },
                        { enableHighAccuracy: true, timeout: 10000 }
                      );
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      fontSize: '0.8rem',
                      background: '#e0f2fe',
                      color: '#0369a1',
                      border: '1px solid #bae6fd',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#bae6fd'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#e0f2fe'; }}
                  >
                    <MapPin size={13} /> Use Live Location
                  </button>
                </div>
                <div className="input-wrapper">
                  <MapPin className="input-icon" size={20} />
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="e.g. 104 Pine Street, near Central Library or click Use Live Location"
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
              {/* Back + Fav + Adopt row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
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
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button
                    onClick={() => handleAdoptTree(selectedTree)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem',
                      border: 'none',
                      background: 'linear-gradient(135deg, #043224, #065f46)',
                      color: '#ffffff',
                      boxShadow: '0 2px 8px rgba(4, 50, 36, 0.25)'
                    }}
                  >
                    <Sparkles size={16} color="#fde68a" /> Adopt Tree (+100 Pts)
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

      {/* ── Citizen Profile Tab ───────────────────────────────────── */}
      {activeTab === 'profile' && (
        <div className="citizen-profile-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Notification / Alert messages */}
          {profileMsg.text && (
            <div style={{
              background: profileMsg.type === 'success' ? '#ecfdf5' : '#fef2f2',
              border: `1.5px solid ${profileMsg.type === 'success' ? '#10b981' : '#ef4444'}`,
              borderRadius: '12px',
              padding: '12px 18px',
              color: profileMsg.type === 'success' ? '#065f46' : '#991b1b',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              {profileMsg.type === 'success' ? <CheckCircle size={20} color="#059669" /> : <AlertTriangle size={20} color="#dc2626" />}
              <span>{profileMsg.text}</span>
            </div>
          )}

          {/* Profile Hero Card */}
          <div style={{
            background: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #059669 100%)',
            borderRadius: '20px',
            padding: '28px',
            color: '#ffffff',
            boxShadow: '0 10px 25px -5px rgba(4, 120, 87, 0.3)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
              {/* Profile Photo with Upload Trigger */}
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  border: '3px solid #ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}>
                  {profileData.profileImage ? (
                    <img
                      src={profileData.profileImage}
                      alt={profileData.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#fde68a' }}>
                      {(profileData.name || 'U').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                <label
                  htmlFor="citizen-avatar-upload"
                  style={{
                    position: 'absolute',
                    bottom: '0',
                    right: '0',
                    background: '#f59e0b',
                    color: '#fff',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                    border: '2px solid #fff'
                  }}
                  title="Upload profile photo"
                >
                  <Camera size={16} />
                  <input
                    id="citizen-avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    style={{ display: 'none' }}
                    disabled={avatarUploading}
                  />
                </label>
              </div>

              {/* User Identity Info */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                  <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>
                    {profileData.name}
                  </h2>
                  <span style={{
                    background: 'rgba(255,255,255,0.2)',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#fef08a',
                    border: '1px solid rgba(255,255,255,0.3)'
                  }}>
                    🛡️ Citizen & Eco Guardian
                  </span>
                </div>
                <p style={{ margin: '0 0 8px', color: '#d1fae5', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={15} /> {profileData.email}
                </p>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '0.8rem', color: '#a7f3d0' }}>
                  <span><b>Citizen ID:</b> {profileData.citizenId}</span>
                  <span>•</span>
                  <span><b>Tier:</b> {rewardsStats.levelName}</span>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons in Hero */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setIsEditingProfile(!isEditingProfile)}
                style={{
                  background: isEditingProfile ? 'rgba(255,255,255,0.2)' : '#ffffff',
                  color: isEditingProfile ? '#ffffff' : '#065f46',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 18px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              >
                <Edit3 size={16} /> {isEditingProfile ? 'Cancel Edit' : 'Edit Profile'}
              </button>
            </div>
          </div>

          {/* Citizen Key Stats Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px'
          }}>
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '18px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', fontSize: '0.85rem', fontWeight: 600 }}>
                <Sparkles size={18} /> Total Eco-Points
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' }}>
                {rewardsStats.totalPoints}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Earned via adoption & care
              </div>
            </div>

            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '18px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0284c7', fontSize: '0.85rem', fontWeight: 600 }}>
                <TreePine size={18} /> Trees Adopted
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' }}>
                {rewardsStats.totalTreesAdopted || adoptions.length}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Active protected canopy
              </div>
            </div>

            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '18px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#d97706', fontSize: '0.85rem', fontWeight: 600 }}>
                <Flame size={18} /> Care Logs
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' }}>
                {rewardsStats.totalCareLogs}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Watering & health checks
              </div>
            </div>

            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '18px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#7c3aed', fontSize: '0.85rem', fontWeight: 600 }}>
                <FileText size={18} /> Reported Tickets
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' }}>
                {tickets.length}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Civic canopy complaints
              </div>
            </div>
          </div>

          {/* Profile Details or Edit Form */}
          {isEditingProfile ? (
            <div style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
            }}>
              <h3 style={{ margin: '0 0 18px', fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit3 size={20} color="#059669" /> Edit Profile Information
              </h3>
              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.95rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.95rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.95rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Residential Ward / Area
                    </label>
                    <input
                      type="text"
                      value={profileData.address}
                      onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                      placeholder="Ward name, City"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.95rem'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    style={{
                      background: '#f1f5f9',
                      color: '#475569',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 20px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={profileSaving}
                    style={{
                      background: '#059669',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 24px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Save size={16} /> {profileSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px'
            }}>
              {/* Personal Details Card */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={18} color="#059669" /> Account Details
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                    <span style={{ color: '#64748b', fontSize: '0.88rem' }}>Full Name</span>
                    <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.88rem' }}>{profileData.name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                    <span style={{ color: '#64748b', fontSize: '0.88rem' }}>Email</span>
                    <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.88rem' }}>{profileData.email}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                    <span style={{ color: '#64748b', fontSize: '0.88rem' }}>Phone</span>
                    <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.88rem' }}>{profileData.phone}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                    <span style={{ color: '#64748b', fontSize: '0.88rem' }}>Residential Ward</span>
                    <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.88rem' }}>{profileData.address}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px' }}>
                    <span style={{ color: '#64748b', fontSize: '0.88rem' }}>Account Role</span>
                    <span style={{ fontWeight: 700, color: '#059669', fontSize: '0.88rem' }}>Citizen / Public Guardian</span>
                  </div>
                </div>
              </div>

              {/* Badges & Achievements Preview */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Award size={18} color="#f59e0b" /> Guardian Badges
                  </h3>
                  <button
                    onClick={() => onTabChange && onTabChange('rewards')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#059669',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    View All →
                  </button>
                </div>

                {badges.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {badges.map((b, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          borderRadius: '10px',
                          padding: '8px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <span style={{ fontSize: '1.2rem' }}>{b.icon || '🏅'}</span>
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#065f46' }}>{b.title || b.name}</div>
                          <div style={{ fontSize: '0.7rem', color: '#16a34a' }}>{b.unlockedAt ? new Date(b.unlockedAt).toLocaleDateString() : 'Unlocked'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: '#64748b' }}>
                    <Award size={36} color="#cbd5e1" style={{ margin: '0 auto 8px' }} />
                    <p style={{ margin: '0 0 6px', fontSize: '0.88rem', fontWeight: 600 }}>No badges unlocked yet</p>
                    <p style={{ margin: 0, fontSize: '0.78rem' }}>Adopt trees & log care to earn eco-guardian achievements!</p>
                  </div>
                )}

                {/* Quick links to certificates */}
                {adoptions.length > 0 && (
                  <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
                    <button
                      onClick={() => onTabChange && onTabChange('rewards')}
                      style={{
                        width: '100%',
                        background: '#f8fafc',
                        border: '1px dashed #cbd5e1',
                        borderRadius: '10px',
                        padding: '10px',
                        color: '#334155',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <Trophy size={16} color="#d97706" /> View My Tree Certificates ({adoptions.length})
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CanopyLens AI Tree Scanner Modal */}
      <CanopyLensModal
        isOpen={scanModalOpen}
        onClose={() => setScanModalOpen(false)}
      />
    </div>
  );
};

export default CitizenDashboard;
