import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  Gavel,
  Clock,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Download,
  Building,
  Truck,
  Layers,
  ArrowRight,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Info,
  Calendar,
  DollarSign,
  User,
  Phone,
  Sparkles,
  MapPin,
  Trash2,
  Settings,
  Sun,
  Moon,
  Award,
  FileText,
  Check,
  LogOut,
  Tag,
  Briefcase
} from 'lucide-react';

// Safe property extraction helpers
const getLotReservePrice = (lot) => {
  if (!lot) return 0;
  return Number(lot.reservePriceInr || lot.reservePrice || lot.startingBidInr || 0);
};

const getLotCurrentBid = (lot) => {
  if (!lot) return 0;
  const current = Number(lot.currentHighestBidInr || lot.currentBid || 0);
  if (current > 0) return current;
  return Number(lot.startingBidInr || lot.reservePriceInr || lot.reservePrice || 0);
};

const getLotWeight = (lot) => {
  if (!lot) return 0;
  return Number(lot.totalWeightKg || lot.estimatedWeightKg || 0);
};

const getLotSpecies = (lot) => {
  if (!lot) return 'Municipal Hardwood';
  return lot.treeSpecies || lot.species || lot.title || 'Municipal Hardwood';
};

const getLotDiameter = (lot) => {
  if (!lot) return 40;
  return lot.dimensions?.avgDiameterCm || lot.averageDiameterCm || 40;
};

const getLotLength = (lot) => {
  if (!lot) return 3.0;
  return lot.dimensions?.avgLengthMeters || lot.approxLengthM || 3.0;
};

const getLotYard = (lot) => {
  if (!lot) return 'Santhekatte Municipal Timber Depot, Udupi';
  return lot.storageYard || lot.yardLocation || 'Santhekatte Municipal Timber Depot, Udupi';
};

const getLotCoverPhoto = (lot) => {
  const fallback = 'https://images.unsplash.com/photo-1546484396-fb3fc6f95f98?w=800&auto=format&fit=crop&q=80';
  if (!lot) return fallback;
  const img = lot.featuredImage || (lot.images && lot.images[0]) || (lot.photos && lot.photos[0]) || null;
  if (!img || typeof img !== 'string') return fallback;
  if (img.includes('photo-1520854221256-17451cc331bf') || img.includes('photo-1513836279014')) {
    return fallback;
  }
  return img;
};

const isLotClosed = (lot) => {
  if (!lot) return false;
  const s = String(lot?.status || '').toUpperCase();
  return s.includes('SOLD') || 
         s.includes('CLOSED') || 
         s.includes('ENDED') || 
         s.includes('COLLECTED') || 
         s.includes('WINNER') || 
         s.includes('DELIVERED') || 
         s.includes('AWARDED') || 
         s.includes('CERTIFICATE');
};

const isLotLive = (lot) => {
  if (!lot) return false;
  if (isLotClosed(lot)) return false;
  const s = String(lot?.status || '').toUpperCase();
  return s.includes('LIVE') || s === 'ACTIVE';
};

export default function TimberAuctionPage() {
  const navigate = useNavigate();

  // Navigation tabs: 'live' (Live Auction Page) | 'winnings' (Auction Winning Page) | 'profile' (Company Profile Page)
  const [activeTab, setActiveTab] = useState('live');

  // Theme state & sync
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('theme', next ? 'dark' : 'light');
    window.dispatchEvent(new Event('themeChange'));
  };
  useEffect(() => {
    const sync = () => setIsDark(localStorage.getItem('theme') === 'dark');
    window.addEventListener('themeChange', sync);
    return () => window.removeEventListener('themeChange', sync);
  }, []);

  const t = {
    bgPage: isDark ? '#0a0f18' : '#f8fafc',
    bgHeader: isDark ? '#0f172a' : '#ffffff',
    bgCard: isDark ? 'rgba(15, 23, 42, 0.9)' : '#ffffff',
    bgCardAlt: isDark ? 'rgba(30, 41, 59, 0.7)' : '#f1f5f9',
    bgSubtle: isDark ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc',
    bgInput: isDark ? 'rgba(2, 6, 23, 0.7)' : '#ffffff',
    border: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
    borderStrong: isDark ? 'rgba(255, 255, 255, 0.15)' : '#cbd5e1',
    textPrimary: isDark ? '#f8fafc' : '#0f172a',
    textSecondary: isDark ? '#94a3b8' : '#475569',
    textMuted: isDark ? '#64748b' : '#94a3b8',
    cardShadow: isDark ? '0 10px 25px -5px rgba(0,0,0,0.5)' : '0 2px 10px rgba(0,0,0,0.05)',
    modalBg: isDark ? '#0f172a' : '#ffffff',
    modalBorder: isDark ? 'rgba(255, 255, 255, 0.12)' : '#e2e8f0'
  };

  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLot, setSelectedLot] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [placingBid, setPlacingBid] = useState(false);
  const [bidHistory, setBidHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Modals for Winnings page
  const [viewingCertificate, setViewingCertificate] = useState(null);

  // Check logged-in user role
  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('currentUser')) || {};
    } catch {
      return {};
    }
  })();
  const isOfficial = ['Officer', 'Admin', 'Official', 'Supervisor', 'Inspector', 'Authority'].includes(currentUser.role);

  // Helper to load current user as merchant
  const getLoggedInMerchant = () => {
    try {
      const user = JSON.parse(localStorage.getItem('currentUser')) || {};
      const saved = JSON.parse(localStorage.getItem('timber_merchant_profile') || 'null');

      if (user && (user.name || user.email)) {
        const isSameUser = saved && (saved.bidderEmail === user.email || saved.bidderId === (user.id || user._id));
        const merged = {
          bidderId: user.id || user._id || '',
          bidderName: user.name || (isSameUser ? saved?.bidderName : '') || 'Timber Merchant',
          bidderEmail: user.email || '',
          bidderPhone: user.phone || (isSameUser ? saved?.bidderPhone : '') || '',
          companyName: user.businessName || user.company || (isSameUser ? saved?.companyName : '') || user.name || 'Timber Trade Enterprise',
          businessType: user.businessType || (isSameUser ? saved?.businessType : '') || 'Sawmill & Timber Processing',
          gstNumber: user.gstin || (isSameUser ? (saved?.gstNumber || saved?.gstin) : '') || '',
          tradeLicense: user.tradeLicense || (isSameUser ? saved?.tradeLicense : '') || '',
          address: user.address || (isSameUser ? saved?.address : '') || 'Santhekatte Industrial Area, Udupi, Karnataka',
          processingCapacityTons: saved?.processingCapacityTons || '45',
          isRegistered: Boolean(user.name && (user.email || user.phone))
        };
        localStorage.setItem('timber_merchant_profile', JSON.stringify(merged));
        return merged;
      }

      if (saved && saved.bidderName) return saved;
    } catch (e) {
      console.error(e);
    }
    return {
      bidderName: 'Sawmill Representative',
      bidderPhone: '9845123456',
      companyName: 'Udupi Commercial Sawmill & Timber Ltd',
      bidderEmail: 'merchant@timbertrade.org',
      businessType: 'Sawmill & Timber Processing',
      gstNumber: '29ABCDE1234F1Z5',
      tradeLicense: 'UDP/WOOD/2026/089',
      address: 'Santhekatte Industrial Area, Udupi, Karnataka',
      processingCapacityTons: '50',
      isRegistered: true
    };
  };

  const [merchant, setMerchant] = useState(getLoggedInMerchant);

  // Profile Form state
  const [profileForm, setProfileForm] = useState(() => {
    const m = getLoggedInMerchant();
    return {
      bidderName: m.bidderName || '',
      bidderPhone: m.bidderPhone || '',
      companyName: m.companyName || '',
      bidderEmail: m.bidderEmail || '',
      businessType: m.businessType || 'Sawmill & Timber Processing',
      gstNumber: m.gstNumber || '',
      tradeLicense: m.tradeLicense || '',
      address: m.address || '',
      processingCapacityTons: m.processingCapacityTons || '45'
    };
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Sync merchant state on mount and when storage changes
  useEffect(() => {
    const syncProfile = () => {
      const updated = getLoggedInMerchant();
      setMerchant(updated);
      setProfileForm({
        bidderName: updated.bidderName || '',
        bidderPhone: updated.bidderPhone || '',
        companyName: updated.companyName || '',
        bidderEmail: updated.bidderEmail || '',
        businessType: updated.businessType || 'Sawmill & Timber Processing',
        gstNumber: updated.gstNumber || '',
        tradeLicense: updated.tradeLicense || '',
        address: updated.address || '',
        processingCapacityTons: updated.processingCapacityTons || '45'
      });
    };
    syncProfile();
    window.addEventListener('storage', syncProfile);
    return () => window.removeEventListener('storage', syncProfile);
  }, []);

  const fetchLots = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/timber-auctions');
      if (res.ok) {
        const data = await res.json();
        setLots(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch timber lots:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLots();
    const interval = setInterval(fetchLots, 12000); // 12s live refresh
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    Swal.fire({
      title: 'Log out of Timber Portal?',
      text: 'You will need to sign in again to place commercial bids.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Log Out'
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('timber_merchant_profile');
        navigate('/login?portal=timber');
      }
    });
  };

  const handleSaveFullProfile = async (e) => {
    e.preventDefault();
    if (!profileForm.bidderName || !profileForm.bidderPhone || !profileForm.companyName) {
      Swal.fire({
        icon: 'warning',
        title: 'Required Fields Missing',
        text: 'Please enter authorized representative name, phone number, and company/sawmill name.'
      });
      return;
    }
    setSavingProfile(true);
    try {
      const profile = { ...profileForm, isRegistered: true };
      setMerchant(profile);
      localStorage.setItem('timber_merchant_profile', JSON.stringify(profile));

      const cur = JSON.parse(localStorage.getItem('currentUser')) || {};
      const updatedUser = {
        ...cur,
        name: profile.bidderName,
        phone: profile.bidderPhone,
        company: profile.companyName,
        businessName: profile.companyName,
        businessType: profile.businessType,
        gstin: profile.gstNumber,
        address: profile.address
      };
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      window.dispatchEvent(new Event('storage'));

      // Also persist to backend buyer registration endpoint
      try {
        await fetch('http://localhost:5000/api/timber-auctions/register-buyer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bidderName: profile.bidderName,
            companyName: profile.companyName,
            bidderEmail: profile.bidderEmail,
            bidderPhone: profile.bidderPhone,
            businessType: profile.businessType,
            gstin: profile.gstNumber,
            tradeLicense: profile.tradeLicense,
            address: profile.address
          })
        });
      } catch (backendErr) {
        console.warn('Backend sync note:', backendErr.message);
      }

      Swal.fire({
        icon: 'success',
        title: 'Company Profile Updated ✅',
        text: 'Your sawmill & merchant credentials have been saved successfully.',
        confirmButtonColor: '#10b981'
      });
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const openBidModal = async (lot) => {
    if (!merchant.bidderName || !merchant.companyName) {
      setActiveTab('profile');
      Swal.fire({
        icon: 'info',
        title: 'Complete Profile First',
        text: 'Please set your company & bidder credentials before placing bids.',
        confirmButtonColor: '#10b981'
      });
      return;
    }

    setSelectedLot(lot);
    const curHighest = getLotCurrentBid(lot);
    const inc = Number(lot.bidStepIncrementInr || lot.bidIncrement || 500);
    const minBid = curHighest + inc;
    setBidAmount(minBid.toString());
    
    setLoadingHistory(true);
    try {
      const res = await fetch(`http://localhost:5000/api/timber-auctions/${lot._id}/bids`);
      if (res.ok) {
        const hist = await res.json();
        setBidHistory(Array.isArray(hist) ? hist : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const submitBid = async () => {
    if (!selectedLot) return;
    const amount = Number(bidAmount);
    const curHighest = getLotCurrentBid(selectedLot);
    const inc = Number(selectedLot.bidStepIncrementInr || selectedLot.bidIncrement || 500);
    const minRequired = (Number(selectedLot.totalBidsCount || 0) === 0)
      ? Number(selectedLot.startingBidInr || curHighest)
      : (curHighest + inc);
    
    if (isNaN(amount) || amount < minRequired) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Bid Amount',
        text: `Minimum bid amount must be at least ₹${minRequired.toLocaleString('en-IN')}`
      });
      return;
    }

    setPlacingBid(true);
    try {
      const res = await fetch(`http://localhost:5000/api/timber-auctions/${selectedLot._id}/bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bidderId: merchant.bidderId || `bidder_${Date.now()}`,
          bidderName: merchant.bidderName,
          bidderPhone: merchant.bidderPhone,
          companyName: merchant.companyName,
          bidderEmail: merchant.bidderEmail,
          bidderGstin: merchant.gstNumber,
          bidAmountInr: amount,
          bidAmount: amount
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to place bid');
      }

      Swal.fire({
        icon: 'success',
        title: 'Bid Placed Successfully! 🔨',
        text: `Your bid of ₹${amount.toLocaleString('en-IN')} for Lot ${selectedLot.lotNumber} is now the leading bid!`,
        confirmButtonColor: '#10b981'
      });

      setSelectedLot(null);
      fetchLots();
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Bid Failed',
        text: err.message
      });
    } finally {
      setPlacingBid(false);
    }
  };

  const handleDeleteLot = async (lot) => {
    const result = await Swal.fire({
      title: `Delete ${lot.lotNumber}?`,
      text: 'This timber lot and all bid histories will be permanently removed.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Delete Lot'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`http://localhost:5000/api/timber-auctions/${lot._id}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          Swal.fire('Deleted!', 'Timber lot has been removed.', 'success');
          fetchLots();
        } else {
          const d = await res.json();
          Swal.fire('Error', d.message || d.error || 'Could not delete lot', 'error');
        }
      } catch (err) {
        Swal.fire('Error', err.message, 'error');
      }
    }
  };

  // Filter lots for Live Auction Page
  const filteredLots = lots.filter(lot => {
    const live = isLotLive(lot);
    const closed = isLotClosed(lot);

    if (filterStatus === 'ACTIVE' && !live) return false;
    if (filterStatus === 'CLOSED' && !closed) return false;
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const species = getLotSpecies(lot).toLowerCase();
      const lotNum = String(lot.lotNumber || '').toLowerCase();
      const desc = String(lot.inspectionNotes || lot.description || '').toLowerCase();
      const yard = getLotYard(lot).toLowerCase();
      return (
        lotNum.includes(q) ||
        species.includes(q) ||
        desc.includes(q) ||
        yard.includes(q)
      );
    }
    return true;
  });

  // Calculate stats
  const totalLots = lots.length;
  const activeLots = lots.filter(l => isLotLive(l)).length;
  const totalWeight = lots.reduce((acc, l) => acc + getLotWeight(l), 0);

  // Won lots for Auction Winnings Page
  const wonLots = lots.filter(l => {
    const isClosed = isLotClosed(l);
    if (!isClosed) return false;

    const curEmail = (merchant.bidderEmail || '').toLowerCase().trim();
    const curPhone = String(merchant.bidderPhone || '').replace(/\D/g, '');
    const curName = (merchant.bidderName || '').toLowerCase().trim();
    const curComp = (merchant.companyName || '').toLowerCase().trim();
    const curId = merchant.bidderId ? String(merchant.bidderId).trim() : '';

    const winEmail = String(l.winningBidderEmail || l.winningBidder?.email || l.highestBidder?.bidderEmail || l.highestBidder?.email || '').toLowerCase().trim();
    const winPhone = String(l.winningBidderPhone || l.winningBidder?.phone || l.highestBidder?.bidderPhone || l.highestBidder?.phone || l.allotmentCertificate?.bidderContact || '').replace(/\D/g, '');
    const winName = String(l.winningBidderName || l.winningBidder?.name || l.highestBidder?.bidderName || l.allotmentCertificate?.awardedTo || '').toLowerCase().trim();
    const winComp = String(l.highestBidder?.companyName || l.winningBidder?.companyName || l.allotmentCertificate?.awardedTo || '').toLowerCase().trim();
    const winId = String(l.highestBidder?.bidderId || l.winningBidder?.bidderId || '').trim();

    // Check if user's highest bid on this lot won it
    const myBidsOnLot = (l.bids || []).filter(b => 
      (curPhone && String(b.bidderPhone || '').replace(/\D/g, '').includes(curPhone)) ||
      (curEmail && b.bidderEmail?.toLowerCase().trim() === curEmail) ||
      (curName && b.bidderName?.toLowerCase().trim() === curName) ||
      (curComp && b.companyName?.toLowerCase().trim() === curComp) ||
      (curId && b.bidderId === curId)
    );
    const myMaxBid = myBidsOnLot.length > 0 ? Math.max(...myBidsOnLot.map(b => Number(b.bidAmountInr || b.bidAmount || 0))) : 0;
    const curLotBid = getLotCurrentBid(l);
    const wonByMyBid = myMaxBid > 0 && myMaxBid >= curLotBid;

    const isDirectMatch = (curPhone && winPhone && (curPhone === winPhone || winPhone.includes(curPhone) || curPhone.includes(winPhone))) ||
      (curEmail && winEmail && curEmail === winEmail) ||
      (curId && winId && curId === winId) ||
      (curName && winName && (winName.includes(curName) || curName.includes(winName))) ||
      (curComp && winComp && (winComp.includes(curComp) || curComp.includes(winComp))) ||
      (curComp && winName && (winName.includes(curComp) || curComp.includes(winName))) ||
      (curName && winComp && (winComp.includes(curName) || curName.includes(winComp)));

    return isDirectMatch || wonByMyBid || isOfficial;
  });

  // Count of lots where current merchant is actively participating
  const myBidsCount = lots.filter(l =>
    (l.bids || []).some(b =>
      (merchant.bidderEmail && b.bidderEmail?.toLowerCase() === merchant.bidderEmail.toLowerCase()) ||
      (merchant.bidderPhone && b.bidderPhone === merchant.bidderPhone) ||
      (merchant.bidderName && b.bidderName?.toLowerCase() === merchant.bidderName.toLowerCase())
    ) || (merchant.bidderEmail && l.currentHighestBidderEmail?.toLowerCase() === merchant.bidderEmail.toLowerCase())
  ).length;

  return (
    <div style={{ minHeight: '100vh', background: t.bgPage, color: t.textPrimary, fontFamily: "'Inter', sans-serif" }}>
      
      {/* ── TOP NAVIGATION BAR (NO SIDEBAR AS REQUESTED) ── */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: t.bgHeader,
        borderBottom: `1px solid ${t.border}`,
        boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
        backdropFilter: 'blur(12px)'
      }}>
        <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '0 24px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
          
          {/* Logo & Portal Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}>
              <Gavel size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.3px', color: t.textPrimary }}>
                  Urban Timber Exchange
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  PORTAL
                </span>
              </div>
              <div style={{ fontSize: '12px', color: t.textMuted }}>
                Municipal Salvage Timber & Hardwood Desk
              </div>
            </div>
          </div>

          {/* Center Navigation: Exactly 3 Required Pages */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', background: isDark ? 'rgba(255, 255, 255, 0.04)' : '#f1f5f9', padding: '4px', borderRadius: '12px', border: `1px solid ${t.border}` }}>
            <button
              onClick={() => setActiveTab('live')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '9px',
                fontSize: '13.5px',
                fontWeight: activeTab === 'live' ? 700 : 600,
                cursor: 'pointer',
                border: 'none',
                background: activeTab === 'live' ? '#10b981' : 'transparent',
                color: activeTab === 'live' ? '#ffffff' : t.textSecondary,
                transition: 'all 0.15s ease',
                boxShadow: activeTab === 'live' ? '0 2px 8px rgba(16, 185, 129, 0.35)' : 'none'
              }}
            >
              <Gavel size={16} /> Live Auction
            </button>

            <button
              onClick={() => setActiveTab('winnings')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '9px',
                fontSize: '13.5px',
                fontWeight: activeTab === 'winnings' ? 700 : 600,
                cursor: 'pointer',
                border: 'none',
                background: activeTab === 'winnings' ? '#10b981' : 'transparent',
                color: activeTab === 'winnings' ? '#ffffff' : t.textSecondary,
                transition: 'all 0.15s ease',
                boxShadow: activeTab === 'winnings' ? '0 2px 8px rgba(16, 185, 129, 0.35)' : 'none'
              }}
            >
              <Award size={16} /> Auction Winnings
              {wonLots.length > 0 && (
                <span style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: '999px',
                  background: activeTab === 'winnings' ? '#ffffff' : '#10b981',
                  color: activeTab === 'winnings' ? '#047857' : '#ffffff'
                }}>
                  {wonLots.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '9px',
                fontSize: '13.5px',
                fontWeight: activeTab === 'profile' ? 700 : 600,
                cursor: 'pointer',
                border: 'none',
                background: activeTab === 'profile' ? '#10b981' : 'transparent',
                color: activeTab === 'profile' ? '#ffffff' : t.textSecondary,
                transition: 'all 0.15s ease',
                boxShadow: activeTab === 'profile' ? '0 2px 8px rgba(16, 185, 129, 0.35)' : 'none'
              }}
            >
              <Building size={16} /> Company Profile
            </button>
          </nav>

          {/* Right Action Tools */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Theme Switcher */}
            <button
              onClick={toggleTheme}
              title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9',
                border: `1px solid ${t.border}`,
                color: isDark ? '#fbbf24' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {/* Merchant Identity Card / Quick Tab Link */}
            <div
              onClick={() => setActiveTab('profile')}
              title="Click to view & edit company profile"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '6px 12px 6px 8px',
                background: isDark ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc',
                border: `1px solid ${t.border}`,
                borderRadius: '12px',
                cursor: 'pointer'
              }}
            >
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px' }}>
                {(merchant.companyName || 'T').charAt(0).toUpperCase()}
              </div>
              <div style={{ textAlign: 'left', maxWidth: '170px' }}>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: t.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {merchant.companyName || 'Timber Enterprise'}
                </div>
                <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                  Verified Merchant
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              title="Log out of Timber Portal"
              style={{
                padding: '8px 12px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#ef4444',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <LogOut size={15} /> Exit
            </button>
          </div>
        </div>
      </header>

      {/* ── PAGE CONTENT AREA ── */}
      <main style={{ maxWidth: '1360px', margin: '0 auto', padding: '28px 24px 80px' }}>

        {/* ═════════════════════════════════════════════════════════════════════
            PAGE 1: LIVE AUCTION PAGE
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'live' && (
          <div>
            {/* Header Banner */}
            <div style={{
              background: isDark
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.95) 100%)'
                : 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, #ffffff 100%)',
              border: `1px solid ${t.border}`,
              borderRadius: '20px',
              padding: '28px 32px',
              marginBottom: '28px',
              boxShadow: t.cardShadow
            }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '999px', background: 'rgba(217, 119, 6, 0.15)', border: '1px solid rgba(217, 119, 6, 0.3)', color: '#d97706', fontSize: '12.5px', fontWeight: 700, marginBottom: '10px' }}>
                    <Gavel size={14} /> Official Municipal Salvage Timber Desk
                  </div>
                  <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.5px', color: t.textPrimary }}>
                    Live Salvage Timber & Hardwood Lots
                  </h1>
                  <p style={{ margin: 0, color: t.textSecondary, fontSize: '14.5px', maxWidth: '750px', lineHeight: 1.5 }}>
                    Real-time municipal salvage hardwood auctions for licensed sawmills, lumber yards, and artisan craftsmen. 100% circular valorization preventing valuable urban timber from landfilling.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={fetchLots}
                    style={{
                      background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#ffffff',
                      border: `1px solid ${t.border}`,
                      color: t.textPrimary,
                      padding: '10px 16px',
                      borderRadius: '12px',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
                    }}
                  >
                    <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh Ledger
                  </button>
                </div>
              </div>

              {/* Stats Bar */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginTop: '24px'
              }}>
                <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '16px 20px', boxShadow: t.cardShadow }}>
                  <div style={{ fontSize: '12px', color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Live Auction Lots</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981' }}>{activeLots} <span style={{ fontSize: '13px', color: t.textMuted, fontWeight: 500 }}>of {totalLots} total</span></div>
                </div>
                <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '16px 20px', boxShadow: t.cardShadow }}>
                  <div style={{ fontSize: '12px', color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>My Active Bids</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#0284c7' }}>{myBidsCount} <span style={{ fontSize: '13px', color: t.textMuted, fontWeight: 500 }}>participating</span></div>
                </div>
                <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '16px 20px', boxShadow: t.cardShadow }}>
                  <div style={{ fontSize: '12px', color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>My Won Allotments</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#8b5cf6' }}>{wonLots.length} <span style={{ fontSize: '13px', color: t.textMuted, fontWeight: 500 }}>lots awarded</span></div>
                </div>
                <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '16px 20px', boxShadow: t.cardShadow }}>
                  <div style={{ fontSize: '12px', color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Salvaged Biomass Volume</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#d97706' }}>{(totalWeight || 0).toLocaleString('en-IN')} <span style={{ fontSize: '13px', color: t.textMuted, fontWeight: 500 }}>kg in depot</span></div>
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '24px',
              background: t.bgCard,
              border: `1px solid ${t.border}`,
              borderRadius: '16px',
              padding: '12px 18px',
              boxShadow: t.cardShadow
            }}>
              {/* Status Filter Buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { id: 'ALL', label: 'All Lots' },
                  { id: 'ACTIVE', label: '🔴 Live Bidding' },
                  { id: 'CLOSED', label: '✓ Closed / Settled' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterStatus(tab.id)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: filterStatus === tab.id ? '1px solid #10b981' : `1px solid ${t.border}`,
                      background: filterStatus === tab.id ? 'rgba(16, 185, 129, 0.15)' : (isDark ? 'rgba(255, 255, 255, 0.03)' : '#f1f5f9'),
                      color: filterStatus === tab.id ? '#10b981' : t.textSecondary
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search Input */}
              <div style={{ position: 'relative', minWidth: '320px', flex: 1, maxWidth: '480px' }}>
                <Search size={16} color={t.textMuted} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search species (e.g. Teak, Rosewood), lot #, or yard depot..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    background: t.bgInput,
                    border: `1px solid ${t.borderStrong}`,
                    borderRadius: '10px',
                    padding: '9px 12px 9px 36px',
                    color: t.textPrimary,
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Lots Grid */}
            {loading && lots.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 20px', color: t.textSecondary }}>
                <RefreshCw size={36} className="spin" style={{ marginBottom: '16px', color: '#10b981' }} />
                <div style={{ fontSize: '16px', fontWeight: 600 }}>Loading Timber Auction Lots...</div>
              </div>
            ) : filteredLots.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 20px', background: t.bgCard, borderRadius: '16px', border: `1px dashed ${t.borderStrong}`, boxShadow: t.cardShadow }}>
                <Layers size={48} color={t.textMuted} style={{ marginBottom: '16px' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0', color: t.textPrimary }}>No Timber Lots Found</h3>
                <p style={{ color: t.textSecondary, margin: 0, fontSize: '14px' }}>
                  No timber lots currently match the selected filter or search query.
                </p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(370px, 1fr))',
                gap: '24px'
              }}>
                {filteredLots.map(lot => {
                  const isLive = isLotLive(lot);
                  const isClosed = isLotClosed(lot);
                  const coverPhoto = getLotCoverPhoto(lot);
                  const reservePrice = getLotReservePrice(lot);
                  const currentBid = getLotCurrentBid(lot);
                  const species = getLotSpecies(lot);
                  const weightKg = getLotWeight(lot);
                  const diameterCm = getLotDiameter(lot);
                  const lengthM = getLotLength(lot);
                  const yardName = getLotYard(lot);
                  const hasBids = Number(lot.totalBidsCount || 0) > 0;
                  const stepInc = Number(lot.bidStepIncrementInr || lot.bidIncrement || 500);
                  const minRequiredNext = hasBids ? (currentBid + stepInc) : (Number(lot.startingBidInr) || currentBid || 1000);

                  // Calculate user's specific bid on this lot
                  const isWonByMe = (lot.highestBidder?.bidderPhone === merchant.bidderPhone) ||
                    (lot.highestBidder?.phone === merchant.bidderPhone) ||
                    (merchant.bidderEmail && lot.highestBidder?.bidderEmail?.toLowerCase() === merchant.bidderEmail.toLowerCase()) ||
                    (merchant.bidderName && lot.highestBidder?.bidderName?.toLowerCase() === merchant.bidderName.toLowerCase()) ||
                    (merchant.companyName && lot.highestBidder?.companyName?.toLowerCase() === merchant.companyName.toLowerCase());

                  const myBidsOnLot = (lot.bids || []).filter(b => 
                    (merchant.bidderPhone && b.bidderPhone === merchant.bidderPhone) ||
                    (merchant.bidderEmail && b.bidderEmail?.toLowerCase() === merchant.bidderEmail?.toLowerCase()) ||
                    (merchant.bidderName && b.bidderName?.toLowerCase() === merchant.bidderName?.toLowerCase()) ||
                    (merchant.companyName && b.companyName?.toLowerCase() === merchant.companyName?.toLowerCase()) ||
                    (merchant.bidderId && b.bidderId === merchant.bidderId)
                  );

                  const myHighestBidOnLot = myBidsOnLot.length > 0
                    ? Math.max(...myBidsOnLot.map(b => Number(b.bidAmountInr || b.bidAmount || 0)))
                    : (isWonByMe ? currentBid : 0);

                  const isMyBidLeading = isWonByMe || (myHighestBidOnLot > 0 && myHighestBidOnLot >= currentBid);
                  const isOutbid = myHighestBidOnLot > 0 && myHighestBidOnLot < currentBid;

                  return (
                    <div
                      key={lot._id}
                      style={{
                        background: t.bgCard,
                        border: isLive 
                          ? (isMyBidLeading ? '2px solid #10b981' : isOutbid ? '2px solid #f59e0b' : (isDark ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid #10b981'))
                          : `1px solid ${t.border}`,
                        borderRadius: '18px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: isMyBidLeading ? '0 8px 24px rgba(16, 185, 129, 0.2)' : t.cardShadow,
                        transition: 'transform 0.2s, box-shadow 0.2s'
                      }}
                    >
                      {/* Card Header & Photo */}
                      <div style={{ position: 'relative', height: '190px', background: isDark ? '#1e293b' : '#e2e8f0', overflow: 'hidden' }}>
                        <img
                          src={coverPhoto.startsWith('http') || coverPhoto.startsWith('data:') ? coverPhoto : `http://localhost:5000${coverPhoto}`}
                          alt={species}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://images.unsplash.com/photo-1546484396-fb3fc6f95f98?w=800&auto=format&fit=crop&q=80';
                          }}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />

                        {/* Status Badge */}
                        <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '6px' }}>
                          <span style={{
                            padding: '5px 12px',
                            borderRadius: '999px',
                            fontSize: '12px',
                            fontWeight: 700,
                            letterSpacing: '0.4px',
                            background: isLive ? 'rgba(239, 68, 68, 0.95)' : isClosed ? 'rgba(100, 116, 139, 0.95)' : 'rgba(234, 179, 8, 0.95)',
                            color: '#ffffff',
                            backdropFilter: 'blur(4px)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            {isLive && <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#fff', display: 'inline-block' }} />}
                            {isLive ? 'LIVE BIDDING' : (lot.status || 'Settled')}
                          </span>

                          {myHighestBidOnLot > 0 && isLive && (
                            <span style={{
                              padding: '5px 10px',
                              borderRadius: '999px',
                              fontSize: '11px',
                              fontWeight: 800,
                              background: isMyBidLeading ? '#10b981' : '#f59e0b',
                              color: '#ffffff',
                              backdropFilter: 'blur(4px)'
                            }}>
                              {isMyBidLeading ? '👑 You Lead' : '⚠️ Outbid'}
                            </span>
                          )}
                        </div>

                        {/* Lot Number Badge */}
                        <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            padding: '5px 10px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 700,
                            background: 'rgba(0, 0, 0, 0.75)',
                            color: '#f8fafc',
                            border: '1px solid rgba(255, 255, 255, 0.2)'
                          }}>
                            {lot.lotNumber}
                          </span>
                          {isOfficial && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLot(lot);
                              }}
                              title="Delete Lot (Official Action)"
                              style={{
                                background: 'rgba(239, 68, 68, 0.85)',
                                border: 'none',
                                color: '#fff',
                                borderRadius: '8px',
                                padding: '5px 7px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>

                        {/* Species banner */}
                        <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', background: 'linear-gradient(0deg, rgba(15, 23, 42, 0.95) 0%, transparent 100%)', padding: '16px 16px 8px' }}>
                          <div style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>
                            {species}
                          </div>
                          {lot.woodGrade && (
                            <div style={{ fontSize: '11.5px', color: '#fbbf24', fontWeight: 600 }}>
                              {lot.woodGrade}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Body */}
                      <div style={{ padding: '18px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: t.textSecondary, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {lot.inspectionNotes || lot.description || 'Graded urban salvage hardwood logs. Inspected and verified by Municipal Tree Processing Yard.'}
                        </p>

                        {/* Specs Grid */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '10px',
                          background: isDark ? 'rgba(0, 0, 0, 0.25)' : '#f8fafc',
                          padding: '12px',
                          borderRadius: '12px',
                          marginBottom: '16px',
                          border: `1px solid ${t.border}`
                        }}>
                          <div>
                            <div style={{ fontSize: '11px', color: t.textMuted, textTransform: 'uppercase' }}>Log Count</div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: t.textPrimary }}>{lot.logCount || 1} logs</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '11px', color: t.textMuted, textTransform: 'uppercase' }}>Total Weight</div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#d97706' }}>{weightKg} kg</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '11px', color: t.textMuted, textTransform: 'uppercase' }}>Avg Diameter</div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: t.textPrimary }}>{diameterCm} cm</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '11px', color: t.textMuted, textTransform: 'uppercase' }}>Approx Length</div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: t.textPrimary }}>{lengthM} m</div>
                          </div>
                        </div>

                        {/* Pricing Box with Prominent "Your Bid" display */}
                        <div style={{
                          background: isDark ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.8))' : 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
                          border: `1px solid ${t.border}`,
                          borderRadius: '14px',
                          padding: '14px 16px',
                          marginBottom: '16px'
                        }}>
                          {/* Reserve Base */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '12px', color: t.textSecondary }}>Reserve Base:</span>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: t.textSecondary }}>₹{reservePrice.toLocaleString('en-IN')}</span>
                          </div>

                          {/* Leading Bid */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: isLive ? (hasBids ? '#10b981' : '#d97706') : t.textPrimary }}>
                              {hasBids ? (isLive ? 'Leading Bid:' : 'Winning Hammer:') : 'Starting Base:'}
                            </span>
                            <span style={{ fontSize: '22px', fontWeight: 900, color: hasBids ? (isLive ? '#10b981' : '#0284c7') : '#d97706' }}>
                              ₹{currentBid.toLocaleString('en-IN')}
                            </span>
                          </div>

                          {hasBids && lot.highestBidder && (lot.highestBidder.companyName || lot.highestBidder.bidderName) ? (
                            <div style={{ fontSize: '12px', color: t.textSecondary, marginBottom: '10px', textAlign: 'right' }}>
                              Leading: <strong style={{ color: t.textPrimary }}>{lot.highestBidder.companyName || lot.highestBidder.bidderName}</strong>
                              {isWonByMe && <span style={{ color: '#10b981', marginLeft: '6px', fontWeight: 800 }}>(You)</span>}
                            </div>
                          ) : (
                            <div style={{ fontSize: '11.5px', color: t.textMuted, marginBottom: '10px', textAlign: 'right' }}>
                              0 bids placed yet • Be the opening bidder!
                            </div>
                          )}

                          {/* ── USER'S OWN BID AMOUNT (PROMINENT HIGHLIGHT) ── */}
                          <div style={{
                            paddingTop: '8px',
                            borderTop: `1px dashed ${t.border}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <span style={{ fontSize: '12.5px', fontWeight: 700, color: t.textPrimary, display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <User size={13} color={myHighestBidOnLot > 0 ? (isMyBidLeading ? '#10b981' : '#f59e0b') : t.textMuted} />
                              Your Bid:
                            </span>

                            {myHighestBidOnLot > 0 ? (
                              <div style={{ textAlign: 'right' }}>
                                <span style={{
                                  fontSize: '16px',
                                  fontWeight: 900,
                                  color: isMyBidLeading ? '#10b981' : '#f59e0b',
                                  marginRight: '6px'
                                }}>
                                  ₹{myHighestBidOnLot.toLocaleString('en-IN')}
                                </span>
                                <span style={{
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  background: isMyBidLeading ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                  color: isMyBidLeading ? '#10b981' : '#f59e0b',
                                  border: isMyBidLeading ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)'
                                }}>
                                  {isMyBidLeading ? '✓ Leading' : '⚠️ Outbid'}
                                </span>
                              </div>
                            ) : (
                              <span style={{ fontSize: '12px', color: t.textMuted, fontStyle: 'italic' }}>
                                No bid placed yet
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Yard & Location */}
                        <div style={{ fontSize: '12px', color: t.textSecondary, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '18px' }}>
                          <MapPin size={13} color="#f59e0b" /> Yard: <strong style={{ color: t.textPrimary }}>{yardName}</strong>
                        </div>

                        {/* Card Actions */}
                        <div style={{ marginTop: 'auto' }}>
                          {isLive ? (
                            <button
                              onClick={() => openBidModal(lot)}
                              style={{
                                width: '100%',
                                background: isOutbid 
                                  ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '12px',
                                padding: '12px 16px',
                                fontSize: '14px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: isOutbid ? '0 4px 14px rgba(245, 158, 11, 0.35)' : '0 4px 14px rgba(16, 185, 129, 0.35)'
                              }}
                            >
                              {isOutbid ? (
                                <>
                                  <TrendingUp size={16} /> Raise Bid • Your Last: ₹{myHighestBidOnLot.toLocaleString('en-IN')} (Outbid!)
                                </>
                              ) : myHighestBidOnLot > 0 ? (
                                <>
                                  <Gavel size={16} /> Place Live Bid • Your Bid: ₹{myHighestBidOnLot.toLocaleString('en-IN')} (Leading)
                                </>
                              ) : (
                                <>
                                  <Gavel size={16} /> Place Live Bid (Min: ₹{minRequiredNext.toLocaleString('en-IN')})
                                </>
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={() => setViewingCertificate(lot)}
                              style={{
                                width: '100%',
                                background: isWonByMe ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : (isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'),
                                color: isWonByMe ? '#ffffff' : t.textSecondary,
                                border: `1px solid ${t.border}`,
                                borderRadius: '12px',
                                padding: '12px 16px',
                                fontSize: '13.5px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                              }}
                            >
                              <Award size={16} /> {isWonByMe ? 'View Awarded Lot & Certificate' : 'View Closed Lot Details'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            PAGE 2: AUCTION WINNING PAGE
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'winnings' && (
          <div>
            <div style={{
              background: isDark
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.95) 100%)'
                : 'linear-gradient(135deg, rgba(16, 185, 129, 0.10) 0%, #ffffff 100%)',
              border: `1px solid ${t.border}`,
              borderRadius: '20px',
              padding: '28px 32px',
              marginBottom: '28px',
              boxShadow: t.cardShadow
            }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '999px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', fontSize: '12.5px', fontWeight: 700, marginBottom: '10px' }}>
                    <Award size={14} /> Official Allotment Ledger
                  </div>
                  <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.5px', color: t.textPrimary }}>
                    Auction Winnings & Awarded Lots
                  </h1>
                  <p style={{ margin: 0, color: t.textSecondary, fontSize: '14.5px', maxWidth: '750px', lineHeight: 1.5 }}>
                    Review all municipal salvage timber lots won by your company, final hammer settlement prices, certified log volumes, and official sustainability certificates.
                  </p>
                </div>

                <div style={{
                  background: t.bgCard,
                  border: `1px solid ${t.border}`,
                  borderRadius: '14px',
                  padding: '16px 24px',
                  textAlign: 'center',
                  boxShadow: t.cardShadow
                }}>
                  <div style={{ fontSize: '12px', color: t.textMuted, fontWeight: 700, textTransform: 'uppercase' }}>Won Lots Total</div>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: '#10b981' }}>{wonLots.length}</div>
                </div>
              </div>
            </div>

            {/* Won Lots List */}
            {wonLots.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 20px', background: t.bgCard, borderRadius: '20px', border: `1px dashed ${t.borderStrong}`, boxShadow: t.cardShadow }}>
                <Award size={56} color="#10b981" style={{ marginBottom: '16px' }} />
                <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 8px 0', color: t.textPrimary }}>No Won Lots Yet</h3>
                <p style={{ color: t.textSecondary, margin: '0 0 20px 0', fontSize: '14px', maxWidth: '500px', marginInline: 'auto' }}>
                  Participate in the live auctions to place competitive bids and win high-grade municipal salvage timber lots!
                </p>
                <button
                  onClick={() => setActiveTab('live')}
                  style={{
                    background: '#10b981',
                    color: '#fff',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Browse Live Timber Auctions →
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '24px' }}>
                {wonLots.map(lot => {
                  const coverPhoto = getLotCoverPhoto(lot);
                  const species = getLotSpecies(lot);
                  const currentBid = getLotCurrentBid(lot);
                  const yardName = getLotYard(lot);

                  return (
                    <div
                      key={lot._id}
                      style={{
                        background: t.bgCard,
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                        borderRadius: '18px',
                        overflow: 'hidden',
                        boxShadow: t.cardShadow,
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      {/* Header with photo */}
                      <div style={{ position: 'relative', height: '160px', background: '#1e293b' }}>
                        <img
                          src={coverPhoto.startsWith('http') || coverPhoto.startsWith('data:') ? coverPhoto : `http://localhost:5000${coverPhoto}`}
                          alt={species}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
                          <span style={{ padding: '6px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 800, background: '#10b981', color: '#ffffff' }}>
                            ✓ WON & ALLOTTED
                          </span>
                        </div>
                        <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                          <span style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 800, background: 'rgba(0,0,0,0.8)', color: '#ffffff' }}>
                            {lot.lotNumber}
                          </span>
                        </div>
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(0deg, rgba(15, 23, 42, 0.9) 0%, transparent 100%)', padding: '14px 16px 8px' }}>
                          <div style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>{species}</div>
                        </div>
                      </div>

                      {/* Content */}
                      <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{
                          background: isDark ? 'rgba(0,0,0,0.25)' : '#f8fafc',
                          padding: '14px',
                          borderRadius: '12px',
                          border: `1px solid ${t.border}`,
                          marginBottom: '16px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '13px', color: t.textSecondary }}>Awarded Amount:</span>
                            <span style={{ fontSize: '20px', fontWeight: 900, color: '#10b981' }}>₹{currentBid.toLocaleString('en-IN')}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: t.textSecondary }}>
                            <span>Total Volume: <strong>{getLotWeight(lot)} kg</strong></span>
                            <span>Logs: <strong>{lot.logCount || 1} logs</strong></span>
                          </div>
                          <div style={{ marginTop: '8px', fontSize: '12px', color: t.textMuted }}>
                            <MapPin size={12} style={{ display: 'inline', marginRight: '4px' }} />
                            Depot: <strong>{yardName}</strong>
                          </div>
                        </div>

                        {/* Action: Certificate */}
                        <div style={{ marginTop: 'auto' }}>
                          <button
                            onClick={() => setViewingCertificate(lot)}
                            style={{
                              width: '100%',
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '12px',
                              padding: '12px',
                              fontSize: '13.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                            }}
                          >
                            <FileText size={16} /> View Valorization Certificate
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            PAGE 3: COMPANY PROFILE PAGE
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'profile' && (
          <div style={{ maxWidth: '860px', margin: '0 auto' }}>
            <div style={{
              background: isDark
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(15, 23, 42, 0.95) 100%)'
                : 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, #ffffff 100%)',
              border: `1px solid ${t.border}`,
              borderRadius: '20px',
              padding: '28px 32px',
              marginBottom: '24px',
              boxShadow: t.cardShadow
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building size={24} />
                </div>
                <div>
                  <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: t.textPrimary }}>
                    Commercial Wood Merchant & Sawmill Profile
                  </h1>
                  <p style={{ margin: 0, color: t.textSecondary, fontSize: '13.5px' }}>
                    Manage your verified enterprise credentials, business registration, and yard dispatch details.
                  </p>
                </div>
              </div>
            </div>

            {/* Profile Form Card */}
            <div style={{
              background: t.bgCard,
              border: `1px solid ${t.border}`,
              borderRadius: '20px',
              padding: '32px',
              boxShadow: t.cardShadow
            }}>
              <form onSubmit={handleSaveFullProfile}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: t.textSecondary, marginBottom: '6px' }}>
                      Company / Sawmill Legal Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Udupi Wood Craft & Timber Works Ltd"
                      value={profileForm.companyName}
                      onChange={(e) => setProfileForm({ ...profileForm, companyName: e.target.value })}
                      style={{
                        width: '100%',
                        background: t.bgInput,
                        border: `1px solid ${t.borderStrong}`,
                        borderRadius: '12px',
                        padding: '12px 14px',
                        color: t.textPrimary,
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: t.textSecondary, marginBottom: '6px' }}>
                      Authorized Representative / Bidder Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rajesh Shetty"
                      value={profileForm.bidderName}
                      onChange={(e) => setProfileForm({ ...profileForm, bidderName: e.target.value })}
                      style={{
                        width: '100%',
                        background: t.bgInput,
                        border: `1px solid ${t.borderStrong}`,
                        borderRadius: '12px',
                        padding: '12px 14px',
                        color: t.textPrimary,
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: t.textSecondary, marginBottom: '6px' }}>
                      Commercial Business Email *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. accounts@sawmillenterprise.com"
                      value={profileForm.bidderEmail}
                      onChange={(e) => setProfileForm({ ...profileForm, bidderEmail: e.target.value })}
                      style={{
                        width: '100%',
                        background: t.bgInput,
                        border: `1px solid ${t.borderStrong}`,
                        borderRadius: '12px',
                        padding: '12px 14px',
                        color: t.textPrimary,
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: t.textSecondary, marginBottom: '6px' }}>
                      Contact Mobile Number (For Gate-Pass OTP) *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9845123456"
                      value={profileForm.bidderPhone}
                      onChange={(e) => setProfileForm({ ...profileForm, bidderPhone: e.target.value })}
                      style={{
                        width: '100%',
                        background: t.bgInput,
                        border: `1px solid ${t.borderStrong}`,
                        borderRadius: '12px',
                        padding: '12px 14px',
                        color: t.textPrimary,
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: t.textSecondary, marginBottom: '6px' }}>
                      Primary Industry Category
                    </label>
                    <select
                      value={profileForm.businessType}
                      onChange={(e) => setProfileForm({ ...profileForm, businessType: e.target.value })}
                      style={{
                        width: '100%',
                        background: t.bgInput,
                        border: `1px solid ${t.borderStrong}`,
                        borderRadius: '12px',
                        padding: '12px 14px',
                        color: t.textPrimary,
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="Sawmill & Timber Processing">Sawmill & Timber Processing</option>
                      <option value="Furniture & Carpentry Manufacturer">Furniture & Carpentry Manufacturer</option>
                      <option value="Timber Wholesaler / Trader">Timber Wholesaler / Trader</option>
                      <option value="Artisan Woodworker & Craftsman">Artisan Woodworker & Craftsman</option>
                      <option value="Biomass & Woodchip Processor">Biomass & Woodchip Processor</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: t.textSecondary, marginBottom: '6px' }}>
                      Processing Capacity (Tons / Month)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 50"
                      value={profileForm.processingCapacityTons}
                      onChange={(e) => setProfileForm({ ...profileForm, processingCapacityTons: e.target.value })}
                      style={{
                        width: '100%',
                        background: t.bgInput,
                        border: `1px solid ${t.borderStrong}`,
                        borderRadius: '12px',
                        padding: '12px 14px',
                        color: t.textPrimary,
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: t.textSecondary, marginBottom: '6px' }}>
                      GSTIN Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 29ABCDE1234F1Z5"
                      value={profileForm.gstNumber}
                      onChange={(e) => setProfileForm({ ...profileForm, gstNumber: e.target.value })}
                      style={{
                        width: '100%',
                        background: t.bgInput,
                        border: `1px solid ${t.borderStrong}`,
                        borderRadius: '12px',
                        padding: '12px 14px',
                        color: t.textPrimary,
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: t.textSecondary, marginBottom: '6px' }}>
                      Municipal Wood Trade License #
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. UDP/WOOD/2026/089"
                      value={profileForm.tradeLicense}
                      onChange={(e) => setProfileForm({ ...profileForm, tradeLicense: e.target.value })}
                      style={{
                        width: '100%',
                        background: t.bgInput,
                        border: `1px solid ${t.borderStrong}`,
                        borderRadius: '12px',
                        padding: '12px 14px',
                        color: t.textPrimary,
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '28px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: t.textSecondary, marginBottom: '6px' }}>
                    Factory / Yard Storage Physical Address
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter full address for dispatch logistics..."
                    value={profileForm.address}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                    style={{
                      width: '100%',
                      background: t.bgInput,
                      border: `1px solid ${t.borderStrong}`,
                      borderRadius: '12px',
                      padding: '12px 14px',
                      color: t.textPrimary,
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px' }}>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '14px 28px',
                      fontSize: '15px',
                      fontWeight: 700,
                      cursor: savingProfile ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                    }}
                  >
                    <Check size={18} /> {savingProfile ? 'Saving...' : 'Save Company Profile'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* ── LIVE BIDDING MODAL ── */}
      {selectedLot && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: t.modalBg,
            border: `1px solid ${t.modalBorder}`,
            borderRadius: '24px',
            width: '100%',
            maxWidth: '520px',
            overflow: 'hidden',
            boxShadow: t.cardShadow
          }}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${t.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 700, textTransform: 'uppercase' }}>Live Bidding Desk</div>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 800, color: t.textPrimary }}>
                  {selectedLot.lotNumber} • {getLotSpecies(selectedLot)}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLot(null)}
                style={{ background: 'none', border: 'none', color: t.textSecondary, fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '24px' }}>
              {(() => {
                const selectedLotMyBids = (selectedLot.bids || []).filter(b => 
                  (merchant.bidderPhone && b.bidderPhone === merchant.bidderPhone) ||
                  (merchant.bidderEmail && b.bidderEmail?.toLowerCase() === merchant.bidderEmail?.toLowerCase()) ||
                  (merchant.bidderName && b.bidderName?.toLowerCase() === merchant.bidderName?.toLowerCase()) ||
                  (merchant.companyName && b.companyName?.toLowerCase() === merchant.companyName?.toLowerCase()) ||
                  (merchant.bidderId && b.bidderId === merchant.bidderId)
                );
                const selectedLotCurBid = getLotCurrentBid(selectedLot);
                const selectedLotMyBid = selectedLotMyBids.length > 0 
                  ? Math.max(...selectedLotMyBids.map(b => Number(b.bidAmountInr || b.bidAmount || 0)))
                  : ((selectedLot.highestBidder?.bidderPhone === merchant.bidderPhone || selectedLot.highestBidder?.phone === merchant.bidderPhone) ? selectedLotCurBid : 0);
                const selectedLotIsLeading = selectedLotMyBid > 0 && selectedLotMyBid >= selectedLotCurBid;

                return (
                  <div style={{ background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc', border: `1px solid ${t.border}`, borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', color: t.textSecondary }}>Current Leading Bid:</span>
                      <span style={{ fontSize: '22px', fontWeight: 900, color: '#10b981' }}>
                        ₹{selectedLotCurBid.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', paddingTop: '8px', borderTop: `1px dashed ${t.border}` }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: t.textPrimary }}>Your Current Bid:</span>
                      {selectedLotMyBid > 0 ? (
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '16px', fontWeight: 900, color: selectedLotIsLeading ? '#10b981' : '#f59e0b', marginRight: '6px' }}>
                            ₹{selectedLotMyBid.toLocaleString('en-IN')}
                          </span>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: selectedLotIsLeading ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: selectedLotIsLeading ? '#10b981' : '#f59e0b'
                          }}>
                            {selectedLotIsLeading ? '👑 Leading' : '⚠️ Outbid'}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: t.textMuted, fontStyle: 'italic' }}>
                          None placed yet
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: t.textMuted, paddingTop: '4px' }}>
                      <span>Min Increment: +₹{selectedLot.bidStepIncrementInr || 500}</span>
                      <span>Est Weight: {getLotWeight(selectedLot)} kg</span>
                    </div>
                  </div>
                );
              })()}

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: t.textPrimary, marginBottom: '8px' }}>
                  Enter Your Binding Bid Amount (₹ INR)
                </label>
                <input
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  style={{
                    width: '100%',
                    background: t.bgInput,
                    border: '2px solid #10b981',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    fontSize: '22px',
                    fontWeight: 900,
                    color: t.textPrimary,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Quick Increment Chips */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                {[500, 1000, 2500, 5000].map(inc => (
                  <button
                    key={inc}
                    onClick={() => {
                      const cur = Number(bidAmount) || getLotCurrentBid(selectedLot);
                      setBidAmount((cur + inc).toString());
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 4px',
                      background: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9',
                      border: `1px solid ${t.borderStrong}`,
                      borderRadius: '8px',
                      color: '#0284c7',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    +₹{inc}
                  </button>
                ))}
              </div>

              <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '12px', padding: '12px 14px', marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', color: '#d97706', fontWeight: 600, marginBottom: '2px' }}>
                  Bidding as: {merchant.companyName}
                </div>
                <div style={{ fontSize: '11px', color: t.textSecondary }}>
                  Representative: {merchant.bidderName} ({merchant.bidderPhone})
                </div>
              </div>

              <button
                onClick={submitBid}
                disabled={placingBid}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px',
                  fontSize: '15px',
                  fontWeight: 800,
                  cursor: placingBid ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)'
                }}
              >
                {placingBid ? 'Registering Bid on Ledger...' : `Confirm & Place Bid of ₹${Number(bidAmount || 0).toLocaleString('en-IN')}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BIOMASS VALORIZATION CERTIFICATE MODAL ── */}
      {viewingCertificate && (() => {
        const winnerName = viewingCertificate.allotmentCertificate?.awardedTo ||
          viewingCertificate.highestBidder?.companyName ||
          viewingCertificate.highestBidder?.bidderName ||
          merchant.companyName;
        const certNum = viewingCertificate.allotmentCertificate?.certificateNumber ||
          `CERT-TMB-2026-${viewingCertificate.lotNumber.replace('TMB-LOT-', '')}`;
        const hammerPrice = Number(viewingCertificate.allotmentCertificate?.winningBidAmountInr || getLotCurrentBid(viewingCertificate));
        const issueDate = viewingCertificate.allotmentCertificate?.issuedAt
          ? new Date(viewingCertificate.allotmentCertificate.issuedAt).toLocaleDateString('en-IN')
          : new Date().toLocaleDateString('en-IN');
        const issuer = viewingCertificate.allotmentCertificate?.issuedByOfficial || 'Udupi Municipal Tree Canopy & Circular Biomass Desk';

        return (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}>
            <div style={{
              background: t.modalBg,
              border: `2px solid #10b981`,
              borderRadius: '24px',
              width: '100%',
              maxWidth: '620px',
              padding: '36px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              position: 'relative'
            }}>
              <button
                onClick={() => setViewingCertificate(null)}
                style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: t.textSecondary, fontSize: '22px', cursor: 'pointer' }}
              >
                ✕
              </button>

              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                  <ShieldCheck size={36} />
                </div>
                <h2 style={{ fontSize: '22px', fontWeight: 900, margin: '0 0 4px 0', color: t.textPrimary, letterSpacing: '-0.3px' }}>
                  Certificate of Sustainable Biomass Salvage
                </h2>
                <div style={{ fontSize: '13px', color: '#10b981', fontWeight: 700 }}>
                  Serial: {certNum}
                </div>
              </div>

              <div style={{
                background: isDark ? 'rgba(0,0,0,0.3)' : '#f8fafc',
                border: `1px solid ${t.border}`,
                borderRadius: '14px',
                padding: '18px',
                marginBottom: '18px',
                fontSize: '13.5px',
                lineHeight: 1.7
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: t.textSecondary }}>Awarded Allottee:</span>
                  <strong style={{ color: t.textPrimary }}>{winnerName}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: t.textSecondary }}>Lot Reference:</span>
                  <strong style={{ color: t.textPrimary }}>#{viewingCertificate.lotNumber} ({getLotSpecies(viewingCertificate)})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: t.textSecondary }}>Hardwood Grade:</span>
                  <strong style={{ color: '#d97706' }}>{viewingCertificate.woodGrade || 'Grade A Construction Hardwood'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: t.textSecondary }}>Volume & Quantity:</span>
                  <strong style={{ color: t.textPrimary }}>{viewingCertificate.logCount || 1} Logs • {getLotWeight(viewingCertificate)} kg</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: t.textSecondary }}>Final Hammer Settlement:</span>
                  <strong style={{ color: '#10b981', fontSize: '16px' }}>₹{hammerPrice.toLocaleString('en-IN')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: t.textSecondary }}>Depot Location:</span>
                  <strong style={{ color: t.textPrimary }}>{getLotYard(viewingCertificate)}</strong>
                </div>
              </div>

              <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '12px 16px', borderRadius: '10px', color: '#047857', fontWeight: 600, fontSize: '12.5px', marginBottom: '20px' }}>
                🌱 Certified Municipal Provenance: 100% of this salvage timber was recovered from urban pruning operations, diverting biomass from landfills and sequestering carbon.
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '11.5px', color: t.textMuted }}>
                  Issued: {issueDate}<br />
                  Authority: {issuer}
                </div>
                <button
                  onClick={() => window.print()}
                  style={{
                    background: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px 20px',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  <Download size={15} /> Download PDF
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
