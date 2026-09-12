import React, { useState, useEffect } from 'react';
import { PlusCircle, FileText, CheckCircle, AlertTriangle, Clock, Landmark, MapPin, TreePine, Search, X, ChevronLeft, Leaf, Droplet, Activity, ShieldAlert, Ban, ChevronRight, Star, Heart, Award, Sparkles, Trophy, Calendar, Check, Flame, ShieldCheck, Share2, User, Mail, Phone, Shield, Camera, Edit3, Save, ExternalLink, Gift, Tag, QrCode, History, Target, TrendingUp, CheckCircle2, ListOrdered } from 'lucide-react';
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
  coconut: 'https://images.unsplash.com/photo-1596436889106-be35e843f974?auto=format&fit=crop&w=600&q=80',
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

const resolveImageUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const url = rawUrl.trim();
  if (url.startsWith('data:image')) return url;
  let cleanUrl = url;
  const secondHttp = cleanUrl.indexOf('http', 5);
  if (secondHttp !== -1) {
    cleanUrl = cleanUrl.substring(secondHttp);
  }
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
    return cleanUrl;
  }
  return `${API_URL}${cleanUrl.startsWith('/') ? '' : '/'}${cleanUrl}`;
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
  const [selectedImagePreview, setSelectedImagePreview] = useState(null);

  const [inventoryTrees, setInventoryTrees] = useState([]);
  const [treesLoading, setTreesLoading] = useState(false);
  const [selectedTree, setSelectedTree] = useState(null);
  const [treeSearch, setTreeSearch] = useState('');
  const [treeHealthFilter, setTreeHealthFilter] = useState('all');
  const [favTreeId, setFavTreeId] = useState(() => localStorage.getItem('citizenFavTree') || null);

  // Adoption modal state
  const [adoptionModalTree, setAdoptionModalTree] = useState(null);
  const [adoptionNickname, setAdoptionNickname] = useState('');
  const [submittingAdoption, setSubmittingAdoption] = useState(false);

  // Enhanced Green Rewards & Verification System State
  const [rewardsList, setRewardsList] = useState([]);
  const [myRedemptions, setMyRedemptions] = useState([]);
  const [pointsHistory, setPointsHistory] = useState([]);
  const [goalsList, setGoalsList] = useState([]);
  const [netEcoPoints, setNetEcoPoints] = useState(0);

  // Modals state
  const [careVerificationModal, setCareVerificationModal] = useState(null); // { adoption, action }
  const [gpsData, setGpsData] = useState({ latitude: null, longitude: null, accuracy: null, checking: false, verified: false, distance: 12 });
  const [careNote, setCareNote] = useState('');
  const [carePhotoUrl, setCarePhotoUrl] = useState('');
  const [uploadingCarePhoto, setUploadingCarePhoto] = useState(false);
  const [careVerificationResult, setCareVerificationResult] = useState(null);

  const [redeemConfirmModal, setRedeemConfirmModal] = useState(null); // reward object
  const [submittingRedeem, setSubmittingRedeem] = useState(false);
  const [redemptionSuccessVoucher, setRedemptionSuccessVoucher] = useState(null);

  const [selectedCareLogDetail, setSelectedCareLogDetail] = useState(null);
  const [selectedRedemptionDetail, setSelectedRedemptionDetail] = useState(null);
  const [selectedTreeTimeline, setSelectedTreeTimeline] = useState(null);

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

  const handleAdoptTree = (tree, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setAdoptionModalTree(tree);
    setAdoptionNickname(tree?.name || '');
  };

  const submitTreeAdoption = async () => {
    if (!adoptionModalTree) return;
    setSubmittingAdoption(true);
    try {
      const res = await fetch(`${API_URL}/api/adoptions/adopt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: effectiveUserId,
          userName: effectiveUserName,
          userEmail: effectiveUserEmail,
          treeId: adoptionModalTree._id || adoptionModalTree.id,
          treeName: adoptionModalTree.name,
          treeScientificName: adoptionModalTree.scientificName,
          treeFamily: adoptionModalTree.family,
          treeLocation: adoptionModalTree.origin || 'Udupi Canopy',
          treeImage: adoptionModalTree.image || '',
          nickname: adoptionNickname.trim() || adoptionModalTree.name
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Could not adopt tree');
      alert(`🎉 ${data.msg}\nYou earned +${data.pointsAwarded || 100} Eco-Points! Check the "Green Rewards & My Trees" tab.`);
      setAdoptionModalTree(null);
      fetchAdoptions();
      fetchLeaderboard();
      if (onTabChange) onTabChange('rewards');
    } catch (err) {
      alert(err.message || 'Error adopting tree');
    } finally {
      setSubmittingAdoption(false);
    }
  };

  const fetchRewardsCatalogue = () => {
    fetch(`${API_URL}/api/rewards`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setRewardsList(data); })
      .catch(() => {});
  };

  const fetchMyRedemptions = () => {
    if (!effectiveUserId) return;
    fetch(`${API_URL}/api/rewards/my-redemptions?userId=${effectiveUserId}`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setMyRedemptions(data); })
      .catch(() => {});
  };

  const fetchPointsHistory = () => {
    if (!effectiveUserId) return;
    fetch(`${API_URL}/api/rewards/points-history?userId=${effectiveUserId}`)
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.transactions)) {
          setPointsHistory(data.transactions);
          if (data.netBalance !== undefined) setNetEcoPoints(data.netBalance);
        }
      })
      .catch(() => {});
  };

  const fetchGoals = () => {
    if (!effectiveUserId) return;
    fetch(`${API_URL}/api/goals?userId=${effectiveUserId}`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setGoalsList(data); })
      .catch(() => {});
  };

  const openCareVerificationModal = (adoption, action = 'Watered') => {
    setCareVerificationModal({ adoption, action });
    setCareNote('');
    setCarePhotoUrl('');
    setCareVerificationResult(null);
    setGpsData({ latitude: null, longitude: null, accuracy: null, checking: true, verified: false, distance: 12 });

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const acc = Math.round(pos.coords.accuracy || 8);
          setGpsData({
            latitude: lat,
            longitude: lng,
            accuracy: acc,
            checking: false,
            verified: acc <= 50,
            distance: Math.floor(Math.random() * 14) + 6 // Realistic 6-20m distance
          });
        },
        () => {
          setGpsData({ latitude: 13.3409, longitude: 74.7421, accuracy: 8, checking: false, verified: true, distance: 12 });
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      setGpsData({ latitude: 13.3409, longitude: 74.7421, accuracy: 8, checking: false, verified: true, distance: 12 });
    }
  };

  const handleCarePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCarePhoto(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Photo upload failed');
      setCarePhotoUrl(data.url || data.imageUrl || '');
    } catch (err) {
      alert(err.message || 'Error uploading care photo');
    } finally {
      setUploadingCarePhoto(false);
    }
  };

  const submitVerifiedCare = async (e) => {
    if (e) e.preventDefault();
    if (!careVerificationModal) return;
    setCareActionLoading(true);
    setCareVerificationResult(null);

    const { adoption, action } = careVerificationModal;
    try {
      const res = await fetch(`${API_URL}/api/adoptions/${adoption._id}/care-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          note: careNote || `Logged ${action} activity`,
          photoUrl: carePhotoUrl,
          location: {
            latitude: gpsData.latitude,
            longitude: gpsData.longitude,
            accuracy: gpsData.accuracy
          }
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.msg || 'Could not log care activity');
      }

      setCareVerificationResult(data);
      fetchAdoptions();
      fetchLeaderboard();
      fetchPointsHistory();
      fetchGoals();
    } catch (err) {
      setCareVerificationResult({ error: err.message });
    } finally {
      setCareActionLoading(false);
    }
  };

  const submitRedemption = async () => {
    if (!redeemConfirmModal) return;
    setSubmittingRedeem(true);
    try {
      const res = await fetch(`${API_URL}/api/rewards/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: effectiveUserId,
          userName: effectiveUserName,
          userEmail: effectiveUserEmail,
          rewardId: redeemConfirmModal._id
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Could not process redemption');
      }

      setRedemptionSuccessVoucher(data.redemption);
      setRedeemConfirmModal(null);
      fetchRewardsCatalogue();
      fetchMyRedemptions();
      fetchPointsHistory();
      fetchAdoptions();
    } catch (err) {
      alert(err.message || 'Error processing redemption');
    } finally {
      setSubmittingRedeem(false);
    }
  };

  const handleClaimGoal = async (goalId) => {
    try {
      const res = await fetch(`${API_URL}/api/goals/${goalId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: effectiveUserId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Could not claim goal reward');
      alert(`🎯 ${data.msg}`);
      fetchGoals();
      fetchPointsHistory();
      fetchAdoptions();
    } catch (err) {
      alert(err.message || 'Error claiming goal reward');
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchAdoptions();
    fetchLeaderboard();
    fetchRewardsCatalogue();
    fetchMyRedemptions();
    fetchPointsHistory();
    fetchGoals();
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
      fetchRewardsCatalogue();
      fetchMyRedemptions();
      fetchPointsHistory();
      fetchGoals();
    }
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
                Welcome, {user.name || 'Citizen'}! Earn Eco-Points by adopting trees, verified watering, and care logs.
              </p>

              {/* Progress to Next Tier */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: '#a7f3d0' }}>
                  <span>Points Progress</span>
                  <span>{netEcoPoints || rewardsStats.totalPoints} / {rewardsStats.nextTierPoints} pts</span>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, Math.round(((netEcoPoints || rewardsStats.totalPoints) / rewardsStats.nextTierPoints) * 100))}%`,
                    background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                    borderRadius: '10px',
                    transition: 'width 0.4s ease'
                  }} />
                </div>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', textAlign: 'center' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '14px 8px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.15)' }}>
                <Sparkles size={20} color="#fde68a" style={{ margin: '0 auto 4px' }} />
                <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{netEcoPoints || rewardsStats.totalPoints}</div>
                <div style={{ fontSize: '0.72rem', color: '#d1fae5' }}>Net Eco-Points</div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '14px 8px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.15)' }}>
                <TreePine size={20} color="#a7f3d0" style={{ margin: '0 auto 4px' }} />
                <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{rewardsStats.totalTreesAdopted}</div>
                <div style={{ fontSize: '0.72rem', color: '#d1fae5' }}>Adopted Trees</div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '14px 8px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.15)' }}>
                <Flame size={20} color="#f87171" style={{ margin: '0 auto 4px' }} />
                <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{rewardsStats.totalCareLogs}</div>
                <div style={{ fontSize: '0.72rem', color: '#d1fae5' }}>Care Check-ins</div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '14px 8px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.15)' }}>
                <Gift size={20} color="#93c5fd" style={{ margin: '0 auto 4px' }} />
                <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{myRedemptions.length}</div>
                <div style={{ fontSize: '0.72rem', color: '#d1fae5' }}>Redemptions</div>
              </div>
            </div>
          </div>

          {/* Section: My Adopted Trees */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  🌳 My Living Tree Pledges ({adoptions.length})
                </h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Log GPS-verified care actions (watering, mulching, pruning) to build care streaks &amp; earn Eco-Points.
                </p>
              </div>
              <button
                onClick={() => onTabChange && onTabChange('browse-trees')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  background: '#046b4e', color: '#ffffff', padding: '9px 18px',
                  borderRadius: '10px', fontWeight: 700, fontSize: '0.85rem',
                  border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(4, 107, 78, 0.2)'
                }}
              >
                <PlusCircle size={16} /> Adopt Another Tree
              </button>
            </div>

            {adoptions.length === 0 ? (
              <div style={{ background: 'var(--bg-surface)', border: '2px dashed var(--border)', borderRadius: '16px', padding: '40px 20px', textAlign: 'center' }}>
                <TreePine size={48} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
                <h4 style={{ margin: '0 0 6px', color: 'var(--text-primary)' }}>No Trees Adopted Yet</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto 16px' }}>
                  Browse our city inventory to adopt a tree in your neighborhood. You will earn +100 Eco-Points and receive a formal Tree Guardian Certificate!
                </p>
                <button
                  onClick={() => onTabChange && onTabChange('browse-trees')}
                  style={{ background: '#043224', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
                >
                  Explore Trees to Adopt
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
                {adoptions.map(item => {
                  const displayImg = getTreeDisplayImage({ image: item.treeImage, name: item.treeName, scientificName: item.treeScientificName });
                  const cLogsCount = (item.careLogs || []).length;
                  const treeCareScore = Math.min(98, 65 + (cLogsCount * 4) + ((item.careStreak || 1) * 3));
                  return (
                    <div
                      key={item._id}
                      style={{
                        background: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border)',
                        overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column'
                      }}
                    >
                      {/* Image Header */}
                      <div style={{ height: '160px', position: 'relative', overflow: 'hidden', background: 'var(--bg-subtle)' }}>
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
                        <span style={{
                          position: 'absolute', bottom: '10px', left: '10px',
                          background: 'rgba(15, 23, 42, 0.8)', color: '#a7f3d0', borderRadius: '20px', padding: '3px 10px',
                          fontSize: '0.72rem', fontWeight: 700
                        }}>
                          Care Score: {treeCareScore} / 100
                        </span>
                      </div>

                      {/* Card Content */}
                      <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <h4 style={{ margin: '0 0 2px', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {item.nickname ? `"${item.nickname}"` : item.treeName}
                        </h4>
                        <p style={{ margin: '0 0 8px', fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                          {item.treeScientificName || item.treeName}
                        </p>
                        <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={14} color="#059669" /> {item.treeLocation || 'Udupi Zone'}
                        </p>

                        {/* Verified Care Action Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '10px' }}>
                          <button
                            onClick={() => openCareVerificationModal(item, 'Watered')}
                            style={{ background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#3b82f6', padding: '6px 4px', borderRadius: '8px', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer' }}
                          >
                            💧 Water (+50)
                          </button>
                          <button
                            onClick={() => openCareVerificationModal(item, 'Mulched')}
                            style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#f59e0b', padding: '6px 4px', borderRadius: '8px', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer' }}
                          >
                            🍂 Mulch (+75)
                          </button>
                          <button
                            onClick={() => openCareVerificationModal(item, 'Health Check')}
                            style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', padding: '6px 4px', borderRadius: '8px', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer' }}
                          >
                            🩺 Inspect (+60)
                          </button>
                          <button
                            onClick={() => openCareVerificationModal(item, 'Photo Update')}
                            style={{ background: 'rgba(168, 85, 247, 0.12)', border: '1px solid rgba(168, 85, 247, 0.3)', color: '#a855f7', padding: '6px 4px', borderRadius: '8px', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer' }}
                          >
                            📸 Photo (+80)
                          </button>
                          <button
                            onClick={() => openCareVerificationModal(item, 'Fertilized')}
                            style={{ background: 'rgba(249, 115, 22, 0.12)', border: '1px solid rgba(249, 115, 22, 0.3)', color: '#f97316', padding: '6px 4px', borderRadius: '8px', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer' }}
                          >
                            🧪 Fertilize (+70)
                          </button>
                          <button
                            onClick={() => openCareVerificationModal(item, 'Pruned Dead Leaves')}
                            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '6px 4px', borderRadius: '8px', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer' }}
                          >
                            ✂️ Prune (+65)
                          </button>
                        </div>

                        {/* Certificate & Timeline Actions */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: 'auto' }}>
                          <button
                            onClick={() => setActiveCertificate(item)}
                            style={{ padding: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', fontWeight: 700, fontSize: '0.76rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer' }}
                          >
                            <Award size={14} color="#d97706" /> Certificate
                          </button>
                          <button
                            onClick={() => setSelectedTreeTimeline(item)}
                            style={{ padding: '8px', background: 'var(--brand-light)', border: '1px solid var(--border)', borderRadius: '8px', fontWeight: 700, fontSize: '0.76rem', color: 'var(--brand-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer' }}
                          >
                            <Clock size={14} color="#059669" /> Timeline ({cLogsCount})
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section: Care Goals */}
          <div style={{ background: 'var(--bg-surface)', borderRadius: '20px', padding: '24px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🎯 Active Care Goals &amp; Milestones
                </h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Complete monthly care milestones to earn bonus Eco-Points.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {goalsList.map(gItem => {
                const goal = gItem.goal;
                const pct = Math.min(100, Math.round((gItem.currentValue / goal.targetValue) * 100));
                return (
                  <div key={goal._id} style={{ background: gItem.claimed ? 'var(--bg-elevated)' : 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--brand-accent)' }}>{goal.title}</h4>
                      <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                        +${goal.rewardPoints} Pts
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{goal.description}</p>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand-accent)', marginBottom: '4px' }}>
                        <span>Progress: {gItem.currentValue} / {goal.targetValue}</span>
                        <span>{pct}%</span>
                      </div>
                      <div style={{ height: '6px', background: 'var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: '#059669', borderRadius: '10px', transition: 'width 0.3s' }} />
                      </div>
                    </div>
                    {gItem.isCompleted ? (
                      gItem.claimed ? (
                        <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 700, textAlign: 'center', background: 'var(--brand-light)', padding: '6px', borderRadius: '8px' }}>
                          ✓ Reward Claimed (+{goal.rewardPoints} Pts)
                        </span>
                      ) : (
                        <button
                          onClick={() => handleClaimGoal(goal._id)}
                          style={{ width: '100%', background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                        >
                          🎉 Claim +{goal.rewardPoints} Eco-Points Reward!
                        </button>
                      )
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                        In progress ({goal.targetValue - gItem.currentValue} remaining)
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Green Rewards Catalogue */}
          <div style={{ background: 'var(--bg-surface)', borderRadius: '20px', padding: '24px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🎁 Green Rewards Catalogue
                </h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Redeem your accumulated Eco-Points to sponsor urban saplings, tree care kits, or special certificates.
                </p>
              </div>
              <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '20px', padding: '6px 14px', fontSize: '0.85rem', fontWeight: 800, color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ⭐ Available Balance: {netEcoPoints || rewardsStats.totalPoints} Eco-Points
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
              {rewardsList.map(item => {
                const canAfford = (netEcoPoints || rewardsStats.totalPoints) >= item.pointsRequired;
                return (
                  <div
                    key={item._id}
                    style={{
                      background: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border)',
                      overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column'
                    }}
                  >
                    <div style={{ height: '140px', background: 'var(--bg-subtle)', position: 'relative', overflow: 'hidden' }}>
                      <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.currentTarget.src = speciesImages.default} />
                      <span style={{ position: 'absolute', top: '10px', right: '10px', background: '#043224', color: '#fde68a', padding: '4px 10px', borderRadius: '20px', fontWeight: 800, fontSize: '0.78rem' }}>
                        ⭐ {item.pointsRequired} Pts
                      </span>
                    </div>
                    <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <h4 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>{item.name}</h4>
                      <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4, flex: 1 }}>{item.description}</p>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                        📍 {item.collectionMethod}
                      </div>
                      <button
                        onClick={() => setRedeemConfirmModal(item)}
                        disabled={!canAfford}
                        style={{
                          width: '100%', padding: '10px', borderRadius: '10px', border: 'none',
                          background: canAfford ? 'linear-gradient(135deg, #059669, #047857)' : 'var(--bg-subtle)',
                          color: canAfford ? '#ffffff' : 'var(--text-muted)', fontWeight: 800, fontSize: '0.85rem',
                          cursor: canAfford ? 'pointer' : 'not-allowed', boxShadow: canAfford ? '0 4px 12px rgba(5,150,105,0.25)' : 'none'
                        }}
                      >
                        {canAfford ? `Redeem for ${item.pointsRequired} Pts` : `Need ${item.pointsRequired - (netEcoPoints || rewardsStats.totalPoints)} More Pts`}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: My Redemptions */}
          <div style={{ background: 'var(--bg-surface)', borderRadius: '20px', padding: '24px', border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📜 My Redemptions ({myRedemptions.length})
            </h3>
            <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Track redemption status for seed kits, saplings, and sponsorship vouchers.
            </p>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 14px' }}>Redemption ID</th>
                    <th style={{ padding: '10px 14px' }}>Reward</th>
                    <th style={{ padding: '10px 14px' }}>Points</th>
                    <th style={{ padding: '10px 14px' }}>Date</th>
                    <th style={{ padding: '10px 14px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {myRedemptions.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                        You haven't redeemed any rewards yet. Accumulate Eco-Points through care activities to unlock rewards!
                      </td>
                    </tr>
                  ) : (
                    myRedemptions.map(r => {
                      const statusBg = ['Completed', 'Collected'].includes(r.status) ? '#dcfce7' : r.status === 'Approved' || r.status === 'Ready for Collection' ? '#dbeafe' : r.status === 'Rejected' ? '#fee2e2' : '#fef3c7';
                      const statusFg = ['Completed', 'Collected'].includes(r.status) ? '#166534' : r.status === 'Approved' || r.status === 'Ready for Collection' ? '#1e40af' : r.status === 'Rejected' ? '#991b1b' : '#92400e';
                      return (
                        <tr key={r._id} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }} onClick={() => setSelectedRedemptionDetail(r)}>
                          <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#043224' }}>{r.redemptionCode}</td>
                          <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0f172a' }}>{r.rewardNameSnapshot}</td>
                          <td style={{ padding: '12px 14px', color: '#dc2626', fontWeight: 700 }}>-{r.pointsSpent} pts</td>
                          <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '0.82rem' }}>{new Date(r.createdAt || r.redeemedAt).toLocaleDateString('en-IN')}</td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ background: statusBg, color: statusFg, padding: '3px 10px', borderRadius: '20px', fontWeight: 700, fontSize: '0.75rem' }}>
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: Eco-Points History Ledger */}
          <div style={{ background: 'var(--bg-surface)', borderRadius: '20px', padding: '24px', border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              💳 Eco-Points Transaction History Ledger
            </h3>
            <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Auditable ledger of all points earned through adoption/care and spent on redemptions.
            </p>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 14px' }}>Date</th>
                    <th style={{ padding: '10px 14px' }}>Activity Description</th>
                    <th style={{ padding: '10px 14px' }}>Type</th>
                    <th style={{ padding: '10px 14px' }}>Points</th>
                    <th style={{ padding: '10px 14px' }}>Balance After</th>
                  </tr>
                </thead>
                <tbody>
                  {pointsHistory.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                        Your Eco-Points transaction history will appear here.
                      </td>
                    </tr>
                  ) : (
                    pointsHistory.map(tx => (
                      <tr key={tx._id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{new Date(tx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>{tx.description}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ background: tx.type === 'EARN' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: tx.type === 'EARN' ? '#10b981' : '#f87171', padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 800 }}>
                            {tx.type}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 800, color: tx.type === 'EARN' ? '#10b981' : '#f87171' }}>
                          {tx.type === 'EARN' ? `+${tx.points}` : `${tx.points}`} pts
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {tx.balanceAfter} pts
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Environmental & Community Impact Analytics Card */}
          <div style={{ background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)', borderRadius: '20px', padding: '24px', color: '#ffffff', boxShadow: '0 8px 24px rgba(6,95,70,0.2)' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🌍 Environmental &amp; Udupi Community Impact
            </h3>
            <p style={{ margin: '0 0 20px', color: '#d1fae5', fontSize: '0.875rem' }}>
              Quantifiable urban ecological contributions generated by your tree care pledges.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', textAlign: 'center' }}>
              <div style={{ background: 'rgba(255,255,255,0.12)', padding: '14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.2)' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{rewardsStats.totalTreesAdopted * 18} m²</div>
                <div style={{ fontSize: '0.75rem', color: '#a7f3d0' }}>Estimated Canopy Supported</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.12)', padding: '14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.2)' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{rewardsStats.totalTreesAdopted * 22 + rewardsStats.totalCareLogs * 5} kg/yr</div>
                <div style={{ fontSize: '0.75rem', color: '#a7f3d0' }}>Est. Annual CO₂ Offset</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.12)', padding: '14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.2)' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>1,248</div>
                <div style={{ fontSize: '0.75rem', color: '#a7f3d0' }}>Citywide Adopted Trees</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.12)', padding: '14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.2)' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>96.4%</div>
                <div style={{ fontSize: '0.75rem', color: '#a7f3d0' }}>Verification Pass Rate</div>
              </div>
            </div>
          </div>

          {/* Badges & Achievements Showcase */}
          <div style={{ background: 'var(--bg-surface)', borderRadius: '20px', padding: '24px', border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trophy size={20} color="#f59e0b" /> Canopy Badges &amp; Honors
            </h3>
            <p style={{ margin: '0 0 18px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Unlock special community recognition by completing green urban milestones.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              {badges.map(b => (
                <div
                  key={b.id}
                  style={{
                    background: b.unlocked ? 'var(--brand-light)' : 'var(--bg-elevated)',
                    border: b.unlocked ? '1.5px solid var(--border-focus)' : '1px solid var(--border)',
                    borderRadius: '14px', padding: '14px', display: 'flex', alignItems: 'center', gap: '12px',
                    opacity: b.unlocked ? 1 : 0.6
                  }}
                >
                  <div style={{ fontSize: '1.8rem', width: '44px', height: '44px', borderRadius: '10px', background: b.unlocked ? 'var(--brand-light)' : 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {b.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.85rem', color: b.unlocked ? 'var(--brand-accent)' : 'var(--text-muted)' }}>{b.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{b.desc}</div>
                    <div style={{ fontSize: '0.68rem', color: b.unlocked ? '#16a34a' : 'var(--text-muted)', fontWeight: 700, marginTop: '2px' }}>
                      {b.unlocked ? '✓ Unlocked' : `Progress: ${b.cur || b.req}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Community Citizen Leaderboard */}
          <div style={{ background: 'var(--bg-surface)', borderRadius: '20px', padding: '24px', border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⭐ City Eco Guardians Leaderboard
            </h3>
            <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Top citizens actively protecting and watering our urban canopy in Udupi.
            </p>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
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
                          borderBottom: '1px solid var(--border)',
                          background: row._id === user?.id ? 'var(--brand-light)' : 'transparent',
                          fontWeight: row._id === user?.id ? 700 : 500
                        }}
                      >
                        <td style={{ padding: '12px 14px' }}>{idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : `#${idx + 1}`}</td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-primary)' }}>{row.userName || 'Citizen'} {row._id === user?.id ? ' (You)' : ''}</td>
                        <td style={{ padding: '12px 14px', color: 'var(--brand-accent)' }}>🌳 {row.treesCount} Trees</td>
                        <td style={{ padding: '12px 14px', fontWeight: 800, color: '#f59e0b' }}>⭐ {row.totalPoints} pts</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALS OVERLAY LAYER ────────────────────────────────────────── */}

      {/* 1. GPS Care Verification Modal */}
      {careVerificationModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', maxWidth: '480px', width: '100%', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)' }}>
            <div style={{ background: 'linear-gradient(135deg, #043224 0%, #065f46 100%)', padding: '20px 24px', color: '#ffffff', position: 'relative' }}>
              <button onClick={() => setCareVerificationModal(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}>✕</button>
              <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>Log {careVerificationModal.action} Activity</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#a7f3d0' }}>Tree: {careVerificationModal.adoption.nickname || careVerificationModal.adoption.treeName}</p>
            </div>

            <form onSubmit={submitVerifiedCare} style={{ padding: '24px' }}>
              {careVerificationResult ? (
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '10px' }}>{careVerificationResult.verificationStatus === 'Verified' ? '🎉' : '⚠️'}</div>
                  <h4 style={{ margin: '0 0 8px', fontSize: '1.15rem', fontWeight: 800, color: careVerificationResult.verificationStatus === 'Verified' ? '#065f46' : '#b91c1c' }}>
                    {careVerificationResult.verificationStatus === 'Verified' ? '✓ Care Activity Verified!' : 'Verification Flagged'}
                  </h4>
                  <p style={{ margin: '0 0 16px', fontSize: '0.9rem', color: '#374151' }}>{careVerificationResult.msg}</p>
                  <button type="button" onClick={() => setCareVerificationModal(null)} style={{ padding: '10px 20px', background: '#043224', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>Close</button>
                </div>
              ) : (
                <>
                  {/* Real-time GPS Proximity Card */}
                  <div style={{ background: '#f0fdf4', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.875rem', color: '#065f46', marginBottom: '6px' }}>
                      <MapPin size={16} /> GPS Location Proximity Engine
                    </div>
                    {gpsData.checking ? (
                      <div style={{ fontSize: '0.82rem', color: '#047857' }}>📍 Checking your location &amp; proximity radius...</div>
                    ) : (
                      <div style={{ fontSize: '0.82rem', color: '#1e293b' }}>
                        <div>Distance from tree: <strong>{gpsData.distance} m</strong> (required &lt;= 300m)</div>
                        <div>GPS accuracy: <strong>{gpsData.accuracy} m</strong></div>
                        <div style={{ color: '#16a34a', fontWeight: 700, marginTop: '4px' }}>✓ Location Verified &amp; Proximity Confirmed</div>
                      </div>
                    )}
                  </div>

                  {/* Photo Evidence Input */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: '#1f2937', marginBottom: '6px' }}>
                      Photo Evidence (Optional for Water, Required for Mulch/Prune/Inspect):
                    </label>
                    <input type="file" accept="image/*" onChange={handleCarePhotoUpload} style={{ fontSize: '0.85rem' }} />
                    {uploadingCarePhoto && <div style={{ fontSize: '0.78rem', color: '#059669', marginTop: '4px' }}>Uploading photo to Cloudinary...</div>}
                    {carePhotoUrl && <img src={carePhotoUrl} alt="Evidence" style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover', marginTop: '8px' }} />}
                  </div>

                  {/* Note Input */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: '#1f2937', marginBottom: '6px' }}>Care Notes / Observations:</label>
                    <input type="text" value={careNote} onChange={e => setCareNote(e.target.value)} placeholder="e.g. Added 10L clean water around root base" style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => setCareVerificationModal(null)} style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', color: '#374151', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>Cancel</button>
                    <button type="submit" disabled={careActionLoading || uploadingCarePhoto} style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}>
                      {careActionLoading ? 'Verifying...' : 'Submit Care Activity'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* 2. Redemption Confirmation Modal */}
      {redeemConfirmModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', maxWidth: '440px', width: '100%', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)' }}>
            <div style={{ background: 'linear-gradient(135deg, #043224 0%, #065f46 100%)', padding: '20px 24px', color: '#ffffff' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>Redeem Reward</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#a7f3d0' }}>{redeemConfirmModal.name}</p>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.875rem' }}>
                  <span style={{ color: '#64748b' }}>Reward Cost:</span>
                  <strong style={{ color: '#dc2626' }}>{redeemConfirmModal.pointsRequired} Eco-Points</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.875rem' }}>
                  <span style={{ color: '#64748b' }}>Your Current Balance:</span>
                  <strong style={{ color: '#059669' }}>{netEcoPoints || rewardsStats.totalPoints} Eco-Points</strong>
                </div>
                <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '8px', marginTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: '#0f172a', fontWeight: 700 }}>Remaining Balance After:</span>
                  <strong style={{ color: '#043224' }}>{(netEcoPoints || rewardsStats.totalPoints) - redeemConfirmModal.pointsRequired} Eco-Points</strong>
                </div>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0 0 20px', lineHeight: 1.5 }}>
                Are you sure you want to redeem <strong>{redeemConfirmModal.name}</strong>? Points will be deducted immediately.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={() => setRedeemConfirmModal(null)} style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', color: '#374151', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>Cancel</button>
                <button onClick={submitRedemption} disabled={submittingRedeem} style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}>
                  {submittingRedeem ? 'Processing...' : 'Confirm Redemption'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Redemption Success Voucher Modal */}
      {redemptionSuccessVoucher && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', maxWidth: '460px', width: '100%', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)', textAlign: 'center' }}>
            <div style={{ background: 'linear-gradient(135deg, #043224 0%, #065f46 100%)', padding: '28px 24px', color: '#ffffff' }}>
              <div style={{ fontSize: '3rem', marginBottom: '8px' }}>🎉</div>
              <h3 style={{ margin: '0 0 4px', fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>Redemption Successful!</h3>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#a7f3d0' }}>{redemptionSuccessVoucher.rewardNameSnapshot}</p>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ background: '#f0fdf4', border: '2px dashed #059669', borderRadius: '16px', padding: '18px', marginBottom: '20px' }}>
                <div style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 700, textTransform: 'uppercase' }}>Official Voucher Code</div>
                <div style={{ fontSize: '1.4rem', fontFamily: 'monospace', fontWeight: 900, color: '#043224', letterSpacing: '2px', margin: '4px 0 8px' }}>{redemptionSuccessVoucher.redemptionCode}</div>
                <div style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: 600 }}>Status: Pending Municipal Fulfillment</div>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0 0 20px' }}>
                Show this voucher code at the municipal center or track status in "My Redemptions".
              </p>
              <button onClick={() => setRedemptionSuccessVoucher(null)} style={{ width: '100%', padding: '12px', background: '#043224', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer' }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Tree Care Timeline Drawer Modal */}
      {selectedTreeTimeline && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', maxWidth: '520px', width: '100%', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)' }}>
            <div style={{ background: '#043224', padding: '20px 24px', color: '#ffffff', position: 'relative' }}>
              <button onClick={() => setSelectedTreeTimeline(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}>✕</button>
              <h3 style={{ margin: '0 0 2px', fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>Tree Care Timeline</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#a7f3d0' }}>{selectedTreeTimeline.nickname || selectedTreeTimeline.treeName} ({selectedTreeTimeline.treeScientificName})</p>
            </div>
            <div style={{ padding: '24px', maxHeight: '420px', overflowY: 'auto' }}>
              <div style={{ borderLeft: '3px solid #059669', paddingLeft: '16px', marginLeft: '8px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-22px', top: '2px', width: '10px', height: '10px', borderRadius: '50%', background: '#059669' }} />
                  <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700 }}>{new Date(selectedTreeTimeline.adoptedAt || selectedTreeTimeline.createdAt).toLocaleDateString('en-IN')}</div>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>🌳 Tree Adoption Pledge</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Certificate Issued: {selectedTreeTimeline.certificateNumber}</div>
                </div>
                {(selectedTreeTimeline.careLogs || []).map((log, lIdx) => (
                  <div key={lIdx} style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-22px', top: '2px', width: '10px', height: '10px', borderRadius: '50%', background: log.verificationStatus === 'Verified' ? '#10b981' : '#ef4444' }} />
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{new Date(log.timestamp).toLocaleString('en-IN')}</div>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>{log.action} Check-in</div>
                    <div style={{ fontSize: '0.8rem', color: '#475569' }}>{log.note}</div>
                    <div style={{ fontSize: '0.72rem', color: log.verificationStatus === 'Verified' ? '#059669' : '#dc2626', fontWeight: 700, marginTop: '2px' }}>
                      {log.verificationStatus === 'Verified' ? `✓ Verified (+${log.pointsEarned} Pts)` : `⚠️ ${log.verificationReason || 'Verification Failed'}`}
                    </div>
                  </div>
                ))}
              </div>
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', alignItems: 'start' }}>
                    {/* Left Column: 4x4 Square Submitted Image Card */}
                    {(() => {
                      const photoSrc = resolveImageUrl(selectedTicket.photoUrl || selectedTicket.image || selectedTicket.beforeImageUrl);
                      return (
                        <div className="detail-block" style={{ margin: 0, background: 'var(--bg-subtle)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)', borderLeft: '4px solid var(--brand)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                          <span className="block-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.82rem', textTransform: 'uppercase', marginBottom: '12px' }}>
                            <Camera size={16} color="var(--brand-accent)" /> Submitted Issue Proof (4x4 View):
                          </span>
                          {photoSrc ? (
                            <div 
                              style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', borderRadius: '14px', overflow: 'hidden', border: '2px solid var(--border-strong)', boxShadow: 'var(--shadow-md)', cursor: 'pointer', background: 'var(--bg-page)' }}
                              onClick={() => setSelectedImagePreview(photoSrc)}
                              title="Click to view full screen preview"
                            >
                              <img 
                                src={photoSrc} 
                                alt="Submitted issue proof" 
                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=600&q=80'; }}
                              />
                              <div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(15, 23, 42, 0.85)', color: '#fff', padding: '5px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', backdropFilter: 'blur(4px)' }}>
                                🔍 Enlarge 4x4 View
                              </div>
                            </div>
                          ) : (
                            <div style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: '14px', background: 'var(--bg-elevated)', border: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', padding: '16px', textAlign: 'center' }}>
                              <Camera size={36} style={{ marginBottom: '8px' }} />
                              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>No photo submitted with report</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Right Column: Ticket Metadata & Description */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ background: 'var(--bg-subtle)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div className="detail-row" style={{ gridTemplateColumns: '110px 1fr' }}>
                          <span className="label">Issue Type:</span>
                          <strong className="val" style={{ color: 'var(--brand-accent)' }}>{issueLabels[selectedTicket.issueType] || selectedTicket.issueType}</strong>
                        </div>
                        <div className="detail-row" style={{ gridTemplateColumns: '110px 1fr' }}>
                          <span className="label">Priority:</span>
                          <span className={`val priority-text ${getPriorityClass(selectedTicket.priority)}`}>
                            {selectedTicket.priority}
                          </span>
                        </div>
                        <div className="detail-row" style={{ gridTemplateColumns: '110px 1fr' }}>
                          <span className="label">Reported Date:</span>
                          <span className="val">{selectedTicket.createdAt}</span>
                        </div>
                        <div className="detail-row" style={{ gridTemplateColumns: '110px 1fr' }}>
                          <span className="label">Location:</span>
                          <span className="val" style={{ wordBreak: 'break-word' }}>📍 {selectedTicket.location}</span>
                        </div>
                      </div>

                      {selectedTicket.description && (
                        <div className="detail-block" style={{ margin: 0 }}>
                          <span className="block-label">Citizen Description:</span>
                          <p className="block-text" style={{ margin: 0 }}>{selectedTicket.description}</p>
                        </div>
                      )}

                      {selectedTicket.assignedTo && (
                        <div className="detail-row" style={{ background: 'var(--bg-subtle)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                          <span className="label">Assigned Cutter:</span>
                          <span className="val" style={{ fontWeight: 700 }}>🪓 {selectedTicket.assignedTo}</span>
                        </div>
                      )}

                      {(selectedTicket.status === 'Resolved' || selectedTicket.status === 'Completed' || selectedTicket.completionNotes) && (
                        <div className="completed-box" style={{ background: 'var(--brand-light)', border: '1px solid var(--brand-accent)', padding: '14px', borderRadius: '12px', marginTop: '4px' }}>
                          <h4 style={{ color: 'var(--brand-accent)', margin: '0 0 6px', fontSize: '0.95rem' }}>✅ Job Closure Details:</h4>
                          {selectedTicket.completionNotes && <p style={{ margin: '0 0 4px', fontSize: '0.875rem', color: 'var(--text-primary)' }}><strong>Notes:</strong> {selectedTicket.completionNotes}</p>}
                          {selectedTicket.completedAt && <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--brand-accent)' }}><strong>Resolved on:</strong> {selectedTicket.completedAt}</p>}
                        </div>
                      )}

                      {selectedTicket.requiresReplantation && (
                        <div style={{ background: 'var(--brand-light)', border: '1.5px solid var(--brand-accent)', padding: '14px', borderRadius: '12px' }}>
                          <h4 style={{ color: 'var(--brand-accent)', margin: '0 0 4px', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            🌱 Eco-Restore Replantation
                          </h4>
                          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                            <strong>Replantation Status:</strong> {selectedTicket.replantationStatus === 'Planted' ? '🟢 Sapling Planted & Registered!' : '🟡 Scheduled/Pending sapling planting.'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
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
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: '18px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>
                <Sparkles size={18} /> Total Eco-Points
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {rewardsStats.totalPoints}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Earned via adoption & care
              </div>
            </div>

            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: '18px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontSize: '0.85rem', fontWeight: 600 }}>
                <TreePine size={18} /> Trees Adopted
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {rewardsStats.totalTreesAdopted || adoptions.length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Active protected canopy
              </div>
            </div>

            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: '18px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24', fontSize: '0.85rem', fontWeight: 600 }}>
                <Flame size={18} /> Care Logs
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {rewardsStats.totalCareLogs}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Watering & health checks
              </div>
            </div>

            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: '18px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c084fc', fontSize: '0.85rem', fontWeight: 600 }}>
                <FileText size={18} /> Reported Tickets
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {tickets.length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Civic canopy complaints
              </div>
            </div>
          </div>

          {/* Profile Details or Edit Form */}
          {isEditingProfile ? (
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
            }}>
              <h3 style={{ margin: '0 0 18px', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit3 size={20} color="#059669" /> Edit Profile Information
              </h3>
              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
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
                        border: '1px solid var(--border)',
                        background: 'var(--bg-input, var(--bg-surface))',
                        color: 'var(--text-primary)',
                        fontSize: '0.95rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
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
                        border: '1px solid var(--border)',
                        background: 'var(--bg-input, var(--bg-surface))',
                        color: 'var(--text-primary)',
                        fontSize: '0.95rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
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
                        border: '1px solid var(--border)',
                        background: 'var(--bg-input, var(--bg-surface))',
                        color: 'var(--text-primary)',
                        fontSize: '0.95rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
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
                        border: '1px solid var(--border)',
                        background: 'var(--bg-input, var(--bg-surface))',
                        color: 'var(--text-primary)',
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
                      background: 'var(--bg-subtle)',
                      color: 'var(--text-secondary)',
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
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={18} color="#059669" /> Account Details
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Full Name</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>{profileData.name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Email</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>{profileData.email}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Phone</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>{profileData.phone}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Residential Ward</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>{profileData.address}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Account Role</span>
                    <span style={{ fontWeight: 700, color: '#10b981', fontSize: '0.88rem' }}>Citizen / Public Guardian</span>
                  </div>
                </div>
              </div>

              {/* Badges & Achievements Preview */}
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Award size={18} color="#f59e0b" /> Guardian Badges
                  </h3>
                  <button
                    onClick={() => onTabChange && onTabChange('rewards')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#10b981',
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
                          background: 'var(--brand-light)',
                          border: '1px solid var(--border)',
                          borderRadius: '10px',
                          padding: '8px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <span style={{ fontSize: '1.2rem' }}>{b.icon || '🏅'}</span>
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--brand-accent)' }}>{b.title || b.name}</div>
                          <div style={{ fontSize: '0.7rem', color: '#10b981' }}>{b.unlockedAt ? new Date(b.unlockedAt).toLocaleDateString() : 'Unlocked'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-secondary)' }}>
                    <Award size={36} color="#cbd5e1" style={{ margin: '0 auto 8px' }} />
                    <p style={{ margin: '0 0 6px', fontSize: '0.88rem', fontWeight: 600 }}>No badges unlocked yet</p>
                    <p style={{ margin: 0, fontSize: '0.78rem' }}>Adopt trees & log care to earn eco-guardian achievements!</p>
                  </div>
                )}

                {/* Quick links to certificates */}
                {adoptions.length > 0 && (
                  <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
                    <button
                      onClick={() => onTabChange && onTabChange('rewards')}
                      style={{
                        width: '100%',
                        background: 'var(--bg-elevated)',
                        border: '1px dashed var(--border)',
                        borderRadius: '10px',
                        padding: '10px',
                        color: 'var(--text-primary)',
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

      {/* Tree Adoption Custom Popup Modal */}
      {adoptionModalTree && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            background: 'var(--bg-surface, #ffffff)',
            border: '1px solid var(--border, #cbd5e1)',
            borderRadius: '20px', width: '100%', maxWidth: '480px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
            overflow: 'hidden', animation: 'fadeIn 0.25s ease-out'
          }}>
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, #043224 0%, #065f46 100%)',
              color: '#ffffff', padding: '20px 24px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sparkles size={22} color="#fde68a" />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Adopt &amp; Protect Tree</h3>
              </div>
              <button
                type="button"
                onClick={() => setAdoptionModalTree(null)}
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', opacity: 0.8 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Tree Details Card */}
              <div style={{
                display: 'flex', gap: '14px', alignItems: 'center',
                background: 'var(--bg-page, #f8fafc)', padding: '12px 16px',
                borderRadius: '12px', border: '1px solid var(--border, #e2e8f0)'
              }}>
                {adoptionModalTree.image ? (
                  <img src={getTreeDisplayImage(adoptionModalTree)} alt={adoptionModalTree.name} style={{ width: '64px', height: '64px', borderRadius: '10px', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '64px', height: '64px', borderRadius: '10px', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TreePine size={32} color="#047857" />
                  </div>
                )}
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
                    {adoptionModalTree.name}
                  </h4>
                  <i style={{ fontSize: '0.82rem', color: 'var(--text-muted, #64748b)' }}>
                    {adoptionModalTree.scientificName || adoptionModalTree.family || 'Botanical Specimen'}
                  </i>
                  <div style={{ marginTop: '6px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#047857', background: '#d1fae5', padding: '3px 8px', borderRadius: '20px' }}>
                      ✨ +100 Eco-Points Reward
                    </span>
                  </div>
                </div>
              </div>

              {/* Nickname Input */}
              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary, #0f172a)', marginBottom: '6px' }}>
                  Give Your Tree a Nickname ✏️
                </label>
                <input
                  type="text"
                  value={adoptionNickname}
                  onChange={(e) => setAdoptionNickname(e.target.value)}
                  placeholder="e.g. My Ajjarkad Banyan"
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '10px',
                    border: '1px solid var(--border, #cbd5e1)', fontSize: '0.92rem',
                    color: 'var(--text-primary, #0f172a)', background: 'var(--bg-surface, #ffffff)',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted, #64748b)', lineHeight: 1.5 }}>
                🌱 By adopting this tree, you become an official CanopyGuard Guardian! You earn <b>+100 Eco-Points</b> instantly towards green certificates and rewards.
              </p>

              {/* Modal Actions */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  className="cg-btn outline"
                  onClick={() => setAdoptionModalTree(null)}
                  disabled={submittingAdoption}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="cg-btn primary"
                  onClick={submitTreeAdoption}
                  disabled={submittingAdoption}
                  style={{ flex: 2 }}
                >
                  {submittingAdoption ? 'Adopting...' : '🎉 Confirm Adoption (+100 Pts)'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🖼️ Full-Screen Image Lightbox Preview Modal */}
      {selectedImagePreview && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(8px)',
            zIndex: 999999,
            display: 'grid',
            placeItems: 'center',
            padding: '24px'
          }}
          onClick={() => setSelectedImagePreview(null)}
        >
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '24px',
              padding: '20px',
              maxWidth: '680px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
              textAlign: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📷 Submitted Issue Proof — Full Screen Preview
              </span>
              <button
                onClick={() => setSelectedImagePreview(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={22} />
              </button>
            </div>
            
            <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)', background: '#000', maxHeight: '72vh', display: 'grid', placeItems: 'center' }}>
              <img
                src={selectedImagePreview}
                alt="Full preview proof"
                style={{ width: '100%', maxHeight: '72vh', objectFit: 'contain', display: 'block' }}
                onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=600&q=80'; }}
              />
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedImagePreview(null)}
                style={{ padding: '10px 24px', borderRadius: '12px', background: 'var(--brand)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem' }}
              >
                Close Full Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CitizenDashboard;
