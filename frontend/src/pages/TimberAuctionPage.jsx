import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  MapPin
} from 'lucide-react';
import { Topbar, Sidebar } from './CanopyPages';

// Safe property extraction helpers
const getLotReservePrice = (lot) => {
  if (!lot) return 0;
  return Number(lot.reservePriceInr ?? lot.reservePrice ?? lot.startingBidInr ?? 0);
};

const getLotCurrentBid = (lot) => {
  if (!lot) return 0;
  return Number(lot.currentHighestBidInr ?? lot.currentBid ?? lot.startingBidInr ?? lot.reservePriceInr ?? lot.reservePrice ?? 0);
};

const getLotWeight = (lot) => {
  if (!lot) return 0;
  return Number(lot.totalWeightKg ?? lot.estimatedWeightKg ?? 0);
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
  if (!lot) return 'Central Municipal Timber Depot';
  return lot.storageYard || lot.yardLocation || 'Central Municipal Timber Depot';
};

const getLotCoverPhoto = (lot) => {
  if (!lot) return null;
  return lot.featuredImage || (lot.images && lot.images[0]) || (lot.photos && lot.photos[0]) || null;
};

const isLotLive = (lot) => {
  const s = String(lot?.status || '').toUpperCase();
  return s.includes('LIVE') || s === 'ACTIVE';
};

const isLotClosed = (lot) => {
  const s = String(lot?.status || '').toUpperCase();
  return s.includes('SOLD') || s.includes('CLOSED') || s.includes('ENDED') || s.includes('COLLECTED');
};

export default function TimberAuctionPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLot, setSelectedLot] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [placingBid, setPlacingBid] = useState(false);
  const [bidHistory, setBidHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Merchant Profile state
  const [merchant, setMerchant] = useState(() => {
    try {
      const saved = localStorage.getItem('timber_merchant_profile');
      if (saved) {
        const p = JSON.parse(saved);
        if (p.bidderName && p.companyName && p.bidderPhone) return p;
      }
      const currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
      if (currentUser.name && (currentUser.phone || currentUser.email)) {
        return {
          bidderName: currentUser.name || currentUser.username || '',
          bidderPhone: currentUser.phone || '',
          companyName: currentUser.company || '',
          bidderEmail: currentUser.email || '',
          isRegistered: Boolean(currentUser.name && currentUser.company && currentUser.phone)
        };
      }
    } catch (e) {}
    return {
      bidderName: '',
      bidderPhone: '',
      companyName: '',
      bidderEmail: '',
      isRegistered: false
    };
  });

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regForm, setRegForm] = useState(() => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
      return {
        bidderName: currentUser.name || '',
        bidderPhone: currentUser.phone || '',
        companyName: currentUser.company || '',
        bidderEmail: currentUser.email || '',
        gstNumber: ''
      };
    } catch {
      return {
        bidderName: '',
        bidderPhone: '',
        companyName: '',
        bidderEmail: '',
        gstNumber: ''
      };
    }
  });

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
    const interval = setInterval(fetchLots, 15000); // 15s refresh
    return () => clearInterval(interval);
  }, []);

  const handleRegisterMerchant = (e) => {
    e.preventDefault();
    if (!regForm.bidderName || !regForm.bidderPhone || !regForm.companyName) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Fields',
        text: 'Please enter bidder name, phone number, and company/sawmill name.'
      });
      return;
    }
    const profile = { ...regForm, isRegistered: true };
    setMerchant(profile);
    localStorage.setItem('timber_merchant_profile', JSON.stringify(profile));
    setShowRegisterModal(false);
    Swal.fire({
      icon: 'success',
      title: 'Merchant Profile Saved',
      text: `Registered as ${profile.companyName}. You can now place legal commercial bids.`,
      timer: 2000,
      showConfirmButton: false
    });
  };

  const openBidModal = async (lot) => {
    if (!merchant.isRegistered || !merchant.bidderName || !merchant.bidderPhone) {
      setShowRegisterModal(true);
      Swal.fire({
        icon: 'info',
        title: 'Bidder Registration Required',
        text: 'Please enter your commercial sawmill / merchant business details to place bids.',
        confirmButtonColor: '#10b981'
      });
      return;
    }

    setSelectedLot(lot);
    const curHighest = getLotCurrentBid(lot);
    const inc = Number(lot.bidStepIncrementInr || lot.bidIncrement || 500);
    const minBid = curHighest + inc;
    setBidAmount(minBid.toString());
    
    // Fetch bid history
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
    const minRequired = curHighest + inc;
    
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
          bidderName: merchant.bidderName,
          bidderPhone: merchant.bidderPhone,
          companyName: merchant.companyName,
          bidderEmail: merchant.bidderEmail,
          bidAmount: amount
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to place bid');
      }

      Swal.fire({
        icon: 'success',
        title: 'Bid Placed Successfully! 🔨',
        text: `Your bid of ₹${amount.toLocaleString('en-IN')} for ${selectedLot.lotNumber} is now the leading bid!`,
        confirmButtonColor: '#10b981'
      });

      setSelectedLot(data.lot);
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
  const totalVolume = lots.reduce((acc, l) => acc + getLotCurrentBid(l), 0);

  return (
    <div className="cg-app" style={{ minHeight: '100vh', background: '#0a0f18', color: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      <Sidebar active="Timber Salvage Auction" isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
      <div className="cg-workspace" style={{ background: '#0a0f18', minHeight: '100vh', width: '100%' }}>
        <Topbar title="Commercial Timber Salvage Auction Desk" onToggleSidebar={() => setSidebarOpen(true)} />

      {/* Hero Header */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.12) 0%, rgba(10, 15, 24, 0.8) 100%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '36px 24px 28px'
      }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '999px', background: 'rgba(217, 119, 6, 0.15)', border: '1px solid rgba(217, 119, 6, 0.3)', color: '#fbbf24', fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>
                <Gavel size={15} /> Commercial Salvage Timber Portal
              </div>
              <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.5px', background: 'linear-gradient(135deg, #ffffff 40%, #fbbf24 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Urban Salvage Timber & Hardwood Auctions
              </h1>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '15px', maxWidth: '680px', lineHeight: 1.5 }}>
                Official municipal salvage timber auctions for licensed wood merchants, sawmills, and artisan craftsmen. 100% circular biomass valorization preventing urban tree waste from reaching landfills.
              </p>
            </div>

            {/* Merchant Identity Card */}
            <div style={{
              background: 'rgba(30, 41, 59, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '14px',
              padding: '16px 20px',
              minWidth: '280px',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8', fontWeight: 700 }}>
                  Active Bidder Profile
                </span>
                <button
                  onClick={() => setShowRegisterModal(true)}
                  style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  {merchant.isRegistered ? 'Edit / Switch' : 'Register Now'}
                </button>
              </div>
              {merchant.isRegistered ? (
                <>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginBottom: '2px' }}>
                    {merchant.companyName}
                  </div>
                  <div style={{ fontSize: '13px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={13} color="#10b981" /> {merchant.bidderName} • {merchant.bidderPhone}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#fbbf24', marginBottom: '4px' }}>
                    Unregistered Merchant
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Register your sawmill / wood trade credentials to place legal bids.
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Stats Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginTop: '28px'
          }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '16px 20px' }}>
              <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '4px' }}>Active Auction Lots</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#10b981' }}>{activeLots} <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>of {totalLots} total</span></div>
            </div>
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '16px 20px' }}>
              <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '4px' }}>Salvaged Biomass (Timber)</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#fbbf24' }}>{(totalWeight || 0).toLocaleString('en-IN')} <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>kg</span></div>
            </div>
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '16px 20px' }}>
              <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '4px' }}>Total Auction Volume</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#38bdf8' }}>₹{(totalVolume || 0).toLocaleString('en-IN')}</div>
            </div>
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '16px 20px' }}>
              <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '4px' }}>Release Gate Passes</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#a78bfa' }}>100% Digital <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>QR verified</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Catalog Section */}
      <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '32px 24px 64px' }}>
        {/* Filter and Search Bar */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '28px',
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '14px',
          padding: '12px 18px'
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
                  border: filterStatus === tab.id ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                  background: filterStatus === tab.id ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  color: filterStatus === tab.id ? '#10b981' : '#94a3b8'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, maxWidth: '400px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search species, lot #, or yard depot..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  padding: '8px 12px 8px 36px',
                  color: '#f8fafc',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              onClick={fetchLots}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#94a3b8',
                padding: '8px 12px',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px'
              }}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {/* Lots Grid */}
        {loading && lots.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: '#94a3b8' }}>
            <RefreshCw size={36} className="spin" style={{ marginBottom: '16px', color: '#10b981' }} />
            <div style={{ fontSize: '16px', fontWeight: 600 }}>Loading Timber Auction Lots...</div>
          </div>
        ) : filteredLots.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '16px', border: '1px dashed rgba(255, 255, 255, 0.15)' }}>
            <Layers size={48} color="#64748b" style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0' }}>No Timber Lots Found</h3>
            <p style={{ color: '#94a3b8', margin: 0, fontSize: '14px' }}>
              No timber lots currently match the selected filter or search query.
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '24px'
          }}>
            {filteredLots.map(lot => {
              const isLive = isLotLive(lot);
              const isClosed = isLotClosed(lot);
              const isWonByMe = (lot.highestBidder?.bidderPhone === merchant.bidderPhone) || (lot.highestBidder?.phone === merchant.bidderPhone);
              const coverPhoto = getLotCoverPhoto(lot);
              const reservePrice = getLotReservePrice(lot);
              const currentBid = getLotCurrentBid(lot);
              const species = getLotSpecies(lot);
              const weightKg = getLotWeight(lot);
              const diameterCm = getLotDiameter(lot);
              const lengthM = getLotLength(lot);
              const yardName = getLotYard(lot);

              return (
                <div
                  key={lot._id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: isLive ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: isLive ? '0 8px 24px rgba(16, 185, 129, 0.08)' : 'none',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                >
                  {/* Card Header & Photo */}
                  <div style={{ position: 'relative', height: '180px', background: '#1e293b', overflow: 'hidden' }}>
                    {coverPhoto ? (
                      <img
                        src={coverPhoto.startsWith('http') || coverPhoto.startsWith('data:') ? coverPhoto : `http://localhost:5000${coverPhoto}`}
                        alt={species}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: '#64748b' }}>
                        <Layers size={44} />
                        <span style={{ fontSize: '13px', marginTop: '8px' }}>Salvaged Timber Lot</span>
                      </div>
                    )}

                    {/* Status Badge */}
                    <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
                      <span style={{
                        padding: '5px 12px',
                        borderRadius: '999px',
                        fontSize: '12px',
                        fontWeight: 700,
                        letterSpacing: '0.4px',
                        background: isLive ? 'rgba(239, 68, 68, 0.9)' : isClosed ? 'rgba(100, 116, 139, 0.9)' : 'rgba(234, 179, 8, 0.9)',
                        color: '#ffffff',
                        backdropFilter: 'blur(4px)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}>
                        {isLive && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff', display: 'inline-block' }} />}
                        {lot.status || 'Live Bidding'}
                      </span>
                    </div>

                    {/* Lot Number Badge */}
                    <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
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
                    </div>

                    {/* Species banner */}
                    <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', background: 'linear-gradient(0deg, rgba(15, 23, 42, 0.95) 0%, transparent 100%)', padding: '16px 16px 8px' }}>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>
                        {species}
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div style={{ padding: '18px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: '#94a3b8', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {lot.inspectionNotes || lot.description || 'Graded urban salvage hardwood logs. Inspected and verified by Municipal Tree Processing Yard.'}
                    </p>

                    {/* Specs Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '10px',
                      background: 'rgba(0, 0, 0, 0.25)',
                      padding: '12px',
                      borderRadius: '10px',
                      marginBottom: '16px',
                      border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Log Count</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>{lot.logCount || 1} logs</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Est. Weight</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#fbbf24' }}>{weightKg} kg</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Avg Diameter</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>{diameterCm} cm</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Approx Length</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>{lengthM} m</div>
                      </div>
                    </div>

                    {/* Pricing Box */}
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.8))',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      padding: '14px 16px',
                      marginBottom: '18px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Reserve Price:</span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>₹{reservePrice.toLocaleString('en-IN')}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: isLive ? '#10b981' : '#f8fafc' }}>
                          {isLive ? 'Leading Bid:' : 'Winning Bid:'}
                        </span>
                        <span style={{ fontSize: '22px', fontWeight: 900, color: isLive ? '#10b981' : '#38bdf8' }}>
                          ₹{currentBid.toLocaleString('en-IN')}
                        </span>
                      </div>
                      {lot.highestBidder && (lot.highestBidder.bidderName || lot.highestBidder.companyName || lot.highestBidder.name) && (
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', textAlign: 'right' }}>
                          By: <strong style={{ color: '#cbd5e1' }}>{lot.highestBidder.companyName || lot.highestBidder.bidderName || lot.highestBidder.name}</strong>
                          {isWonByMe && <span style={{ color: '#10b981', marginLeft: '6px', fontWeight: 700 }}>(You)</span>}
                        </div>
                      )}
                    </div>

                    {/* Yard & Location */}
                    <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
                      <MapPin size={13} color="#f59e0b" /> Yard: <strong style={{ color: '#e2e8f0' }}>{yardName}</strong>
                    </div>

                    {/* Actions */}
                    <div style={{ marginTop: 'auto' }}>
                      {isLive ? (
                        <button
                          onClick={() => openBidModal(lot)}
                          style={{
                            width: '100%',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
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
                            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                          }}
                        >
                          <Gavel size={16} /> Place Live Bid
                        </button>
                      ) : isClosed ? (
                        <div>
                          {isWonByMe ? (
                            <button
                              onClick={() => {
                                Swal.fire({
                                  title: `Gate Pass: ${lot.lotNumber}`,
                                  html: `
                                    <div style="text-align: left; font-size: 14px; line-height: 1.6;">
                                      <div style="text-align: center; margin-bottom: 16px;">
                                        <div style="display: inline-block; padding: 12px; background: white; border-radius: 8px;">
                                          <img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=GATEPASS-${lot.lotNumber}-${merchant.bidderPhone}" alt="QR" />
                                        </div>
                                      </div>
                                      <p><strong>Lot Number:</strong> ${lot.lotNumber} (${species})</p>
                                      <p><strong>Released To:</strong> ${merchant.companyName}</p>
                                      <p><strong>Winning Amount:</strong> ₹${currentBid.toLocaleString('en-IN')}</p>
                                      <p><strong>Pickup Yard:</strong> ${yardName}</p>
                                      <p><strong>Release Status:</strong> <span style="color: #10b981; font-weight: bold;">AUTHORIZED FOR DISPATCH</span></p>
                                      <p style="color: #64748b; font-size: 12px;">Present this digital QR release pass at the weighbridge security gate to load the timber logs onto your transport vehicle.</p>
                                    </div>
                                  `,
                                  icon: 'success',
                                  confirmButtonText: 'Download Gate Pass PDF'
                                });
                              }}
                              style={{
                                width: '100%',
                                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
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
                                gap: '8px'
                              }}
                            >
                              <QrCode size={16} /> View Release Gate Pass
                            </button>
                          ) : (
                            <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '10px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                              Auction Ended & Settled
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '10px', fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>
                          Status: {lot.status || 'Upcoming'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bid Modal */}
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
            background: '#0f172a',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '520px',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 700, textTransform: 'uppercase' }}>Live Bidding Desk</div>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 800 }}>{selectedLot.lotNumber} • {getLotSpecies(selectedLot)}</h3>
              </div>
              <button
                onClick={() => setSelectedLot(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
              {/* Current Standing */}
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#94a3b8' }}>Current Leading Bid:</span>
                  <span style={{ fontSize: '20px', fontWeight: 900, color: '#10b981' }}>
                    ₹{getLotCurrentBid(selectedLot).toLocaleString('en-IN')}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
                  <span>Min Increment: +₹{selectedLot.bidStepIncrementInr || selectedLot.bidIncrement || 500}</span>
                  <span>Est Weight: {getLotWeight(selectedLot)} kg</span>
                </div>
              </div>

              {/* Bid Input */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '8px' }}>
                  Your Legal Bid Amount (₹ INR)
                </label>
                <input
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#020617',
                    border: '2px solid #10b981',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    fontSize: '22px',
                    fontWeight: 900,
                    color: '#ffffff',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Quick Increment Chips */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
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
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      color: '#38bdf8',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    +₹{inc}
                  </button>
                ))}
              </div>

              {/* Bidder Identity Confirmation */}
              <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '10px', padding: '12px 14px', marginBottom: '24px' }}>
                <div style={{ fontSize: '12px', color: '#fbbf24', fontWeight: 600, marginBottom: '2px' }}>
                  Bidding as: {merchant.companyName}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  Contact: {merchant.bidderName} ({merchant.bidderPhone}) • Bids are legally binding.
                </div>
              </div>

              {/* Submit Button */}
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
                {placingBid ? 'Submitting Bid to Ledger...' : `Confirm & Place Bid of ₹${Number(bidAmount || 0).toLocaleString('en-IN')}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Merchant Registration Modal */}
      {showRegisterModal && (
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
            background: '#0f172a',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '480px',
            padding: '28px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
          }}>
            <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 6px 0', color: '#f8fafc' }}>
              Register Merchant Profile
            </h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 20px 0', lineHeight: 1.5 }}>
              Enter your commercial saw mill or timber trade credentials to place legitimate bids.
            </p>

            <form onSubmit={handleRegisterMerchant}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>Company / Sawmill Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Udupi Wood Craft & Sawmill Ltd"
                  value={regForm.companyName}
                  onChange={(e) => setRegForm({ ...regForm, companyName: e.target.value })}
                  style={{ width: '100%', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>Authorized Bidder Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Shetty"
                  value={regForm.bidderName}
                  onChange={(e) => setRegForm({ ...regForm, bidderName: e.target.value })}
                  style={{ width: '100%', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>Contact Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9845123456"
                    value={regForm.bidderPhone}
                    onChange={(e) => setRegForm({ ...regForm, bidderPhone: e.target.value })}
                    style={{ width: '100%', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>GST / Trade License</label>
                  <input
                    type="text"
                    placeholder="e.g. 29ABCDE1234F1Z5"
                    value={regForm.gstNumber}
                    onChange={(e) => setRegForm({ ...regForm, gstNumber: e.target.value })}
                    style={{ width: '100%', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '10px', color: '#f8fafc', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '12px', background: '#10b981', border: 'none', borderRadius: '10px', color: '#ffffff', fontWeight: 700, cursor: 'pointer' }}
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
