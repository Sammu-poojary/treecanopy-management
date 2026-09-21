import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  Gavel,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Download,
  Printer,
  FileText,
  Truck,
  Layers,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Plus,
  ArrowRight,
  Clock,
  UserCheck,
  ExternalLink,
  MapPin,
  Sparkles,
  Award
} from 'lucide-react';
import { Topbar, Sidebar } from './CanopyPages';

export default function OfficialTimberManagementPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lots, setLots] = useState([]);
  const [wasteIntakes, setWasteIntakes] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('intakes'); // 'intakes', 'live', 'certificates', 'dispatch', 'buyers'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [selectedLotBids, setSelectedLotBids] = useState(null);
  const [bidsList, setBidsList] = useState([]);
  const [loadingBids, setLoadingBids] = useState(false);
  const [certificateModalLot, setCertificateModalLot] = useState(null);
  const [dispatchModalLot, setDispatchModalLot] = useState(null);
  const [dispatchForm, setDispatchForm] = useState({
    vehicleNumber: '',
    verifiedByGuard: '',
    deliveryNotes: ''
  });
  
  // Verify & Publish Modal (Pre-filled from Tree Cutter intake)
  const [verifyingIntake, setVerifyingIntake] = useState(null);
  const [verifyForm, setVerifyForm] = useState({
    intakeId: '',
    shipmentId: '',
    title: '',
    treeSpecies: '',
    woodGrade: 'Grade A Construction Hardwood',
    originLocation: '',
    storageYard: '',
    logCount: 1,
    totalWeightKg: 0,
    avgDiameterCm: 0,
    avgLengthMeters: 0,
    totalVolumeCubicMeters: 0,
    startingBidInr: 0,
    reservePriceInr: 0,
    bidStepIncrementInr: 500,
    auctionDurationHours: 48,
    cutterName: '',
    vehicleNumber: '',
    proofImageUrl: '',
    inspectionNotes: ''
  });

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('currentUser')) || {}; } catch { return {}; }
  })();

  const fetchLots = async () => {
    setLoading(true);
    try {
      const [lotsRes, intakesRes, buyersRes] = await Promise.all([
        fetch('http://localhost:5000/api/timber-auctions'),
        fetch('http://localhost:5000/api/waste-intakes'),
        fetch('http://localhost:5000/api/timber-auctions/buyers')
      ]);
      if (lotsRes.ok) {
        const data = await lotsRes.json();
        setLots(Array.isArray(data) ? data : []);
      }
      if (intakesRes.ok) {
        const data = await intakesRes.json();
        setWasteIntakes(Array.isArray(data) ? data : []);
      }
      if (buyersRes.ok) {
        const buyersData = await buyersRes.json();
        setBuyers(Array.isArray(buyersData) ? buyersData : []);
      }
    } catch (err) {
      console.error('Error fetching timber lots & intakes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLots();
  }, []);

  // Filter timber-specific intakes from Tree Cutters
  const timberIntakes = wasteIntakes.filter(i => {
    const logs = Number(i.biomass?.logsCount || 0);
    const logWeight = Number(i.biomass?.logsWeightKg || 0);
    const branchWeight = Number(i.biomass?.branchesWeightKg || 0);
    const isTimberStream = i.allocatedStream === 'Timber Auction';
    return logs > 0 || logWeight > 0 || branchWeight >= 50 || isTimberStream;
  });

  const pendingTimberIntakes = timberIntakes.filter(i => {
    return i.status === 'Delivered' || !i.assignedTimberLotId;
  });

  const openVerifyModal = (intake) => {
    setVerifyingIntake(intake);
    const species = intake.biomass?.treeSpecies || 'Mixed Municipal Hardwood';
    const logs = Number(intake.biomass?.logsCount || 1);
    const weight = Number(intake.biomass?.logsWeightKg || (intake.biomass?.branchesWeightKg ? Math.round(intake.biomass.branchesWeightKg * 0.8) : 350));
    const diameter = Number(intake.biomass?.approxLogDiameterCm || 40);
    const length = Number(intake.biomass?.approxLogLengthMeters || 3.0);
    const startBid = Math.max(3000, Math.round(weight * 16));
    const reserve = Math.max(4500, Math.round(weight * 22));
    const volume = Number((Math.PI * Math.pow(diameter / 200, 2) * length * Math.max(1, logs)).toFixed(2)) || 1.2;

    setVerifyForm({
      intakeId: intake._id,
      shipmentId: intake.shipmentId,
      title: `${logs}x Salvage ${species} Trunk Logs (${intake.workOrderTitle || 'Municipal Canopy Clearance'})`,
      treeSpecies: species,
      woodGrade: 'Grade A Construction Hardwood',
      originLocation: intake.workOrderTitle || intake.gpsLocation?.address || 'Udupi Municipality',
      storageYard: intake.disposalYard || 'Santhekatte Municipal Timber Depot, Udupi',
      logCount: logs,
      totalWeightKg: weight,
      avgDiameterCm: diameter,
      avgLengthMeters: length,
      totalVolumeCubicMeters: volume,
      startingBidInr: startBid,
      reservePriceInr: reserve,
      bidStepIncrementInr: 500,
      auctionDurationHours: 48,
      cutterName: intake.cutterName || 'Tree Cutter',
      vehicleNumber: intake.vehicleNumber || 'KA-20',
      proofImageUrl: intake.proofImageUrl || 'https://images.unsplash.com/photo-1546484396-fb3fc6f95f98?w=800&auto=format&fit=crop&q=80',
      inspectionNotes: `Inspected & verified at municipal weighbridge. Harvested by arborist ${intake.cutterName} from task "${intake.workOrderTitle}". Certified pest-free and debarked.`
    });
  };

  const handlePublishFromIntake = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/timber-auctions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...verifyForm,
          verifiedByName: currentUser.name || 'Municipal Timber Officer'
        })
      });
      const data = await res.json();
      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Timber Lot Verified & Published! 🪵',
          text: `Intake ${verifyForm.shipmentId} submitted by ${verifyForm.cutterName} is now live as Lot ${data.lot?.lotNumber} on the Commercial Bidding Portal.`,
          confirmButtonColor: '#10b981'
        });
        setVerifyingIntake(null);
        setActiveTab('live');
        fetchLots();
      } else {
        Swal.fire({ icon: 'error', title: 'Failed to publish lot', text: data.error });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Network Error', text: err.message });
    }
  };

  const openBidsModal = async (lot) => {
    setSelectedLotBids(lot);
    setLoadingBids(true);
    try {
      const res = await fetch(`http://localhost:5000/api/timber-auctions/${lot._id}/bids`);
      if (res.ok) {
        const data = await res.json();
        setBidsList(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBids(false);
    }
  };

  // Handler: Declare Winner & Issue Certificate
  const handleDeclareWinner = async (lot) => {
    if (!lot.highestBidder?.bidderName && lot.totalBidsCount === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No Bids Placed Yet',
        text: 'You cannot declare a winner on a lot that has not received any commercial bids.',
        confirmButtonColor: '#10b981'
      });
      return;
    }

    const { value: formValues } = await Swal.fire({
      title: `Declare Winner for ${lot.lotNumber}?`,
      html: `
        <div style="text-align: left; font-size: 14px; color: #334155; line-height: 1.6;">
          <p><strong>Species:</strong> ${lot.treeSpecies || lot.species || 'Municipal Hardwood'}</p>
          <p><strong>Highest Bidder:</strong> <span style="color: #059669; font-weight: bold;">${lot.highestBidder?.companyName || lot.highestBidder?.bidderName || 'N/A'}</span></p>
          <p><strong>Winning Bid Amount:</strong> <span style="font-size: 18px; color: #059669; font-weight: 800;">₹${(lot.currentHighestBidInr || 0).toLocaleString('en-IN')}</span></p>
          <hr style="margin: 12px 0; border: none; border-top: 1px solid #e2e8f0;" />
          <label style="display: block; font-weight: 600; margin-bottom: 4px;">Approval & Compliance Notes:</label>
          <textarea id="swal-official-notes" class="swal2-textarea" style="width: 100%; margin: 0; padding: 8px; border-radius: 6px; font-size: 13px;" placeholder="e.g. Approved after meeting reserve price in accordance with Karnataka Forest Dept regulations.">Approved following competitive commercial timber salvage auction.</textarea>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Finalize & Issue Certificate 📜',
      cancelButtonText: 'Cancel',
      preConfirm: () => {
        return {
          officialNotes: document.getElementById('swal-official-notes').value
        };
      }
    });

    if (formValues) {
      try {
        const res = await fetch(`http://localhost:5000/api/timber-auctions/${lot._id}/declare-winner`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            officialName: currentUser.name || 'Municipal Forestry Officer',
            officialNotes: formValues.officialNotes
          })
        });
        const data = await res.json();
        if (res.ok) {
          Swal.fire({
            icon: 'success',
            title: 'Winner Declared & Certificate Generated!',
            text: `Timber Salvage Certificate ${data.lot.allotmentCertificate?.certificateNumber} is now officially registered.`,
            confirmButtonColor: '#10b981'
          });
          fetchLots();
          if (data.lot) setCertificateModalLot(data.lot);
        } else {
          Swal.fire({ icon: 'error', title: 'Action Failed', text: data.error });
        }
      } catch (err) {
        Swal.fire({ icon: 'error', title: 'Network Error', text: err.message });
      }
    }
  };

  // Handler: Confirm Dispatch / Delivery
  const handleConfirmDispatch = async (e) => {
    e.preventDefault();
    if (!dispatchModalLot) return;

    try {
      const res = await fetch(`http://localhost:5000/api/timber-auctions/${dispatchModalLot._id}/mark-delivered`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dispatchForm)
      });
      const data = await res.json();
      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Timber Lot Dispatched & Delivered!',
          text: `Lot ${dispatchModalLot.lotNumber} has been verified and released to transport vehicle ${dispatchForm.vehicleNumber}.`,
          confirmButtonColor: '#10b981'
        });
        setDispatchModalLot(null);
        setDispatchForm({ vehicleNumber: '', verifiedByGuard: '', deliveryNotes: '' });
        fetchLots();
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: data.error });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Network Error', text: err.message });
    }
  };

  // Filters
  const filteredLots = lots.filter(l => {
    const term = searchQuery.toLowerCase();
    const matchSearch = (l.lotNumber || '').toLowerCase().includes(term) ||
      (l.treeSpecies || l.species || '').toLowerCase().includes(term) ||
      (l.title || '').toLowerCase().includes(term) ||
      (l.highestBidder?.companyName || '').toLowerCase().includes(term);
    return matchSearch;
  });

  const liveLots = filteredLots.filter(l => !String(l.status || '').includes('Winner') && !String(l.status || '').includes('Delivered') && !String(l.status || '').includes('Sold'));
  const awardedLots = filteredLots.filter(l => String(l.status || '').includes('Winner') || l.allotmentCertificate?.certificateNumber);
  const deliveredLots = filteredLots.filter(l => String(l.status || '').includes('Delivered') || l.gatePass?.isCollected);

  // Metrics
  const totalLotsCount = lots.length;
  const activeBiddingCount = liveLots.length;
  const awardedCount = awardedLots.length;
  const totalRevenue = lots.reduce((acc, l) => {
    if (l.allotmentCertificate?.winningBidAmountInr) return acc + Number(l.allotmentCertificate.winningBidAmountInr);
    if (l.currentHighestBidInr && l.totalBidsCount > 0) return acc + Number(l.currentHighestBidInr);
    return acc;
  }, 0);

  return (
    <div className="cg-app" style={{ minHeight: '100vh', background: '#090e17', color: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      <Sidebar active="Timber Salvage Auction" isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
      
      <div className="cg-workspace" style={{ background: '#090e17', minHeight: '100vh', width: '100%' }}>
        <Topbar title="Official Timber Salvage & Auction Governance Desk" onToggleSidebar={() => setSidebarOpen(true)} />

        {/* Hero Header */}
        <div style={{
          background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.15) 0%, rgba(9, 14, 23, 0.95) 100%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '30px 24px 22px'
        }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 14px', borderRadius: '999px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>
                  <ShieldCheck size={15} /> Official Forestry & Timber Valorization Desk
                </div>
                <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.5px', color: '#ffffff' }}>
                  Timber Salvage Auction Governance & Dispatch Control
                </h1>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px', maxWidth: '720px', lineHeight: 1.5 }}>
                  Timber lots are automatically fetched from Tree Cutter waste disposal submissions. Officials verify weighbridge logs and approve live commercial auctions.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  onClick={fetchLots}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#f8fafc',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <RefreshCw size={15} /> Refresh Data
                </button>
              </div>
            </div>

            {/* Quick Metrics */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              marginTop: '24px'
            }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px 20px' }}>
                <div style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 600 }}>Inbound Cutter Intakes</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>{pendingTimberIntakes.length}</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Awaiting official verification</div>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px 20px' }}>
                <div style={{ fontSize: '12px', color: '#fbbf24', fontWeight: 600 }}>Active Live Auctions</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#fbbf24', marginTop: '4px' }}>{activeBiddingCount}</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Open for sawmill offers</div>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px 20px' }}>
                <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>Winners Declared & Passes</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>{awardedCount}</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Certificates issued / Pending pickup</div>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px 20px' }}>
                <div style={{ fontSize: '12px', color: '#34d399', fontWeight: 600 }}>Total Auction Volume</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>₹{totalRevenue.toLocaleString('en-IN')}</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Biomass valorization revenue</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 20px 60px' }}>
          
          {/* Navigation Tabs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { id: 'intakes', label: '📥 Tree Cutter Inbound Logs', count: pendingTimberIntakes.length },
                { id: 'live', label: '🔨 Live Auctions & Bidding', count: liveLots.length },
                { id: 'certificates', label: '📜 Awarded Winners & Certificates', count: awardedLots.length },
                { id: 'dispatch', label: '🚚 Depot Gate Release & Delivery', count: deliveredLots.length },
                { id: 'buyers', label: '🏢 Registered Timber Buyers', count: buyers.length }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    background: activeTab === tab.id ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                    border: activeTab === tab.id ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                    color: activeTab === tab.id ? '#34d399' : '#94a3b8',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                >
                  {tab.label}
                  {tab.count !== null && (
                    <span style={{ fontSize: '11px', background: activeTab === tab.id ? '#10b981' : 'rgba(255,255,255,0.1)', color: '#fff', padding: '2px 6px', borderRadius: '999px' }}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search lot #, species, company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  padding: '9px 12px 9px 36px',
                  color: '#f8fafc',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* TAB 1: LIVE AUCTIONS & MONITORING */}
          {activeTab === 'live' && (
            <div>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                  <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px', color: '#10b981' }} />
                  Loading timber auction data...
                </div>
              ) : liveLots.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <Gavel size={40} color="#64748b" style={{ margin: '0 auto 12px' }} />
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', color: '#f8fafc' }}>No Active Live Bids Found</h3>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>Publish a new timber lot from the top button to start commercial bidding.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '20px' }}>
                  {liveLots.map(lot => {
                    const species = lot.treeSpecies || lot.species || lot.title || 'Municipal Hardwood';
                    const weight = Number(lot.totalWeightKg || lot.estimatedWeightKg || 0);
                    const logCount = lot.logCount || 1;
                    const diameter = lot.dimensions?.avgDiameterCm || lot.averageDiameterCm || 40;
                    const reserve = Number(lot.reservePriceInr || lot.reservePrice || 0);
                    const curBid = Number(lot.currentHighestBidInr || lot.currentBid || 0);
                    const hasBids = (lot.totalBidsCount || 0) > 0 && curBid > 0;
                    const isAboveReserve = curBid >= reserve;

                    return (
                      <div
                        key={lot._id}
                        style={{
                          background: 'rgba(15, 23, 42, 0.85)',
                          border: hasBids ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '16px',
                          padding: '20px',
                          display: 'flex',
                          flexDirection: 'column',
                          position: 'relative'
                        }}
                      >
                        {/* Lot Badge */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#fbbf24', background: 'rgba(217, 119, 6, 0.15)', padding: '4px 10px', borderRadius: '6px' }}>
                            {lot.lotNumber}
                          </span>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: hasBids ? '#34d399' : '#94a3b8', background: 'rgba(255, 255, 255, 0.05)', padding: '3px 8px', borderRadius: '6px' }}>
                            {hasBids ? `🔥 ${lot.totalBidsCount} Bids Active` : '⏳ Awaiting First Bid'}
                          </span>
                        </div>

                        <h3 style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: 800, color: '#f8fafc' }}>
                          {species}
                        </h3>
                        <p style={{ margin: '0 0 14px 0', color: '#94a3b8', fontSize: '13px' }}>
                          {logCount} Logs • {weight} kg • Ø{diameter}cm • {lot.woodGrade || 'Grade A'}
                        </p>

                        <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
                          <MapPin size={13} color="#10b981" /> {lot.storageYard || 'Santhekatte Municipal Timber Depot'}
                        </div>

                        {/* Price & Bid Status Box */}
                        <div style={{ background: 'rgba(0, 0, 0, 0.35)', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div>
                              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Reserve Price</div>
                              <div style={{ fontSize: '14px', fontWeight: 700, color: '#94a3b8' }}>₹{reserve.toLocaleString('en-IN')}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '11px', color: '#34d399', textTransform: 'uppercase', fontWeight: 700 }}>Current Highest Bid</div>
                              <div style={{ fontSize: '18px', fontWeight: 900, color: curBid > 0 ? '#10b981' : '#f8fafc' }}>
                                ₹{curBid > 0 ? curBid.toLocaleString('en-IN') : 'No bids'}
                              </div>
                            </div>
                          </div>

                          {/* Leading Bidder info */}
                          {hasBids && lot.highestBidder?.companyName ? (
                            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '8px', marginTop: '8px', fontSize: '12px', color: '#cbd5e1' }}>
                              <span style={{ color: '#94a3b8' }}>Leading Merchant:</span> <strong>{lot.highestBidder.companyName}</strong> ({lot.highestBidder.bidderPhone})
                            </div>
                          ) : (
                            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '8px', marginTop: '8px', fontSize: '12px', color: '#64748b' }}>
                              No commercial bidders registered yet for this lot.
                            </div>
                          )}
                        </div>

                        {/* Official Action Controls */}
                        <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                          <button
                            onClick={() => openBidsModal(lot)}
                            style={{
                              flex: 1,
                              padding: '10px',
                              borderRadius: '10px',
                              background: 'rgba(255, 255, 255, 0.08)',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              color: '#f8fafc',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            <Eye size={14} /> Bid History
                          </button>

                          <button
                            onClick={() => handleDeclareWinner(lot)}
                            disabled={!hasBids}
                            style={{
                              flex: 1.5,
                              padding: '10px 14px',
                              borderRadius: '10px',
                              background: hasBids ? '#10b981' : 'rgba(255, 255, 255, 0.05)',
                              border: 'none',
                              color: hasBids ? '#ffffff' : '#64748b',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: hasBids ? 'pointer' : 'not-allowed',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            <Award size={14} /> Declare Winner 📜
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: AWARDED LOTS & SALVAGE CERTIFICATES */}
          {activeTab === 'certificates' && (
            <div>
              {awardedLots.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <Award size={40} color="#64748b" style={{ margin: '0 auto 12px' }} />
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', color: '#f8fafc' }}>No Awarded Certificates Yet</h3>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>Declare a winner from the Live Bids tab to generate official timber salvage certificates.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '20px' }}>
                  {awardedLots.map(lot => {
                    const cert = lot.allotmentCertificate || {};
                    const species = lot.treeSpecies || lot.species || lot.title || 'Municipal Hardwood';
                    const amount = Number(cert.winningBidAmountInr || lot.currentHighestBidInr || 0);

                    return (
                      <div
                        key={lot._id}
                        style={{
                          background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(6, 78, 59, 0.3))',
                          border: '1px solid rgba(16, 185, 129, 0.35)',
                          borderRadius: '16px',
                          padding: '22px',
                          display: 'flex',
                          flexDirection: 'column'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#34d399', background: 'rgba(16, 185, 129, 0.2)', padding: '4px 10px', borderRadius: '6px' }}>
                            {cert.certificateNumber || 'CERT-TMB-2026-PENDING'}
                          </span>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#fbbf24' }}>
                            {lot.lotNumber}
                          </span>
                        </div>

                        <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>
                          {species}
                        </h3>
                        <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px' }}>
                          Awarded to: <strong style={{ color: '#f8fafc' }}>{cert.awardedTo || lot.highestBidder?.companyName || 'Registered Merchant'}</strong>
                        </div>

                        <div style={{ background: 'rgba(0, 0, 0, 0.4)', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Winning Bid Value:</span>
                            <span style={{ fontSize: '15px', fontWeight: 800, color: '#34d399' }}>₹{amount.toLocaleString('en-IN')}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Authorized Officer:</span>
                            <span style={{ fontSize: '12px', color: '#f8fafc' }}>{cert.issuedByOfficial || 'Forestry Officer'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Gate-Pass Code:</span>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24' }}>{lot.gatePass?.passCode || 'GP-ISSUED'}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                          <button
                            onClick={() => setCertificateModalLot(lot)}
                            style={{
                              flex: 1,
                              padding: '11px',
                              borderRadius: '10px',
                              background: '#10b981',
                              border: 'none',
                              color: '#fff',
                              fontSize: '13px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            <FileText size={15} /> View Certificate 📜
                          </button>

                          <button
                            onClick={() => {
                              setDispatchModalLot(lot);
                              setDispatchForm({
                                vehicleNumber: lot.gatePass?.vehicleNumber || '',
                                verifiedByGuard: currentUser.name || 'Santhekatte Yard Security',
                                deliveryNotes: ''
                              });
                            }}
                            style={{
                              flex: 1,
                              padding: '11px',
                              borderRadius: '10px',
                              background: 'rgba(255, 255, 255, 0.08)',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              color: '#f8fafc',
                              fontSize: '13px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            <Truck size={15} /> Dispatch Gate Release
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DISPATCH & YARD DELIVERY DESK */}
          {activeTab === 'dispatch' && (
            <div>
              {deliveredLots.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <Truck size={40} color="#64748b" style={{ margin: '0 auto 12px' }} />
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', color: '#f8fafc' }}>No Dispatched Lots Recorded</h3>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>Dispatch timber lots after certificate issue to track vehicle gate releases.</p>
                </div>
              ) : (
                <div style={{ background: 'rgba(15, 23, 42, 0.85)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#94a3b8' }}>
                        <th style={{ padding: '14px 18px' }}>Lot #</th>
                        <th style={{ padding: '14px 18px' }}>Wood Species & Specs</th>
                        <th style={{ padding: '14px 18px' }}>Awarded Merchant</th>
                        <th style={{ padding: '14px 18px' }}>Vehicle # & Gate Pass</th>
                        <th style={{ padding: '14px 18px' }}>Security Verification</th>
                        <th style={{ padding: '14px 18px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deliveredLots.map((lot, idx) => (
                        <tr key={lot._id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                          <td style={{ padding: '16px 18px', fontWeight: 800, color: '#fbbf24' }}>{lot.lotNumber}</td>
                          <td style={{ padding: '16px 18px' }}>
                            <div style={{ fontWeight: 700, color: '#f8fafc' }}>{lot.treeSpecies || lot.species}</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{lot.logCount} logs • {lot.totalWeightKg} kg</div>
                          </td>
                          <td style={{ padding: '16px 18px' }}>
                            <div style={{ fontWeight: 600, color: '#f8fafc' }}>{lot.allotmentCertificate?.awardedTo || lot.highestBidder?.companyName || 'Merchant'}</div>
                            <div style={{ fontSize: '11px', color: '#34d399' }}>₹{(lot.allotmentCertificate?.winningBidAmountInr || lot.currentHighestBidInr || 0).toLocaleString('en-IN')}</div>
                          </td>
                          <td style={{ padding: '16px 18px' }}>
                            <div style={{ fontWeight: 700, color: '#38bdf8' }}>{lot.gatePass?.vehicleNumber || 'KA-20-TR-4821'}</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Pass: {lot.gatePass?.passCode}</div>
                          </td>
                          <td style={{ padding: '16px 18px' }}>
                            <div style={{ color: '#f8fafc' }}>{lot.gatePass?.verifiedByGuard || 'Depot Security'}</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{new Date(lot.gatePass?.collectedAt || lot.updatedAt).toLocaleDateString('en-IN')}</div>
                          </td>
                          <td style={{ padding: '16px 18px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700 }}>
                              <CheckCircle2 size={13} /> Dispatched
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB: TREE CUTTER INBOUND TIMBER LOGS */}
          {activeTab === 'intakes' && (
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px 0', color: '#f8fafc' }}>
                    Inbound Tree Cutter Timber & Biomass Intakes
                  </h2>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>
                    Incoming timber logs and heavy branches logged by municipal arborists during tree clearances. Officials verify weighbridge measurements and publish live auction lots.
                  </p>
                </div>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                  <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px', color: '#10b981' }} />
                  Loading inbound timber intakes...
                </div>
              ) : timberIntakes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <Layers size={40} color="#64748b" style={{ margin: '0 auto 12px' }} />
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', color: '#f8fafc' }}>No Inbound Timber Logs Yet</h3>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>When Tree Cutters log heavy logs or branches during waste disposal, they will automatically appear here for verification.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '20px' }}>
                  {timberIntakes.map(intake => {
                    const species = intake.biomass?.treeSpecies || 'Mixed Municipal Hardwood';
                    const logs = Number(intake.biomass?.logsCount || 0);
                    const logWeight = Number(intake.biomass?.logsWeightKg || 0);
                    const branchWeight = Number(intake.biomass?.branchesWeightKg || 0);
                    const leavesWeight = Number(intake.biomass?.leavesWeightKg || 0);
                    const diameter = Number(intake.biomass?.approxLogDiameterCm || 0);
                    const length = Number(intake.biomass?.approxLogLengthMeters || 0);
                    const isPublished = Boolean(intake.assignedTimberLotId) || intake.status === 'Verified';
                    const img = intake.proofImageUrl || 'https://images.unsplash.com/photo-1546484396-fb3fc6f95f98?w=800&auto=format&fit=crop&q=80';

                    return (
                      <div
                        key={intake._id}
                        style={{
                          background: 'rgba(15, 23, 42, 0.85)',
                          border: isPublished ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(56, 189, 248, 0.3)',
                          borderRadius: '16px',
                          padding: '20px',
                          display: 'flex',
                          flexDirection: 'column',
                          position: 'relative'
                        }}
                      >
                        {/* Header badges */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#38bdf8', background: 'rgba(56, 189, 248, 0.15)', padding: '4px 10px', borderRadius: '6px' }}>
                            {intake.shipmentId}
                          </span>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: isPublished ? '#34d399' : '#fbbf24', background: 'rgba(255, 255, 255, 0.05)', padding: '3px 8px', borderRadius: '6px' }}>
                            {isPublished ? '✅ Converted to Auction' : '⏳ Awaiting Official Verification'}
                          </span>
                        </div>

                        {/* Image Preview */}
                        <div style={{ position: 'relative', marginBottom: '14px' }}>
                          <img
                            src={img}
                            alt={species}
                            style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '10px' }}
                          />
                          <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', color: '#f8fafc' }}>
                            🪓 Cutter: <strong>{intake.cutterName || 'Tree Cutter'}</strong>
                          </div>
                        </div>

                        <h3 style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: 800, color: '#f8fafc' }}>
                          {species}
                        </h3>
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px' }}>
                          📍 {intake.workOrderTitle || 'Canopy Hazard Clearance'}
                        </div>

                        {/* Biomass Specs Grid */}
                        <div style={{ background: 'rgba(0, 0, 0, 0.35)', borderRadius: '12px', padding: '12px', marginBottom: '14px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
                          <div>
                            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Heavy Logs</div>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: '#38bdf8' }}>{logs} Logs</div>
                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>{logWeight} kg</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Dimensions</div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>Ø{diameter || 35}cm</div>
                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>{length || 3}m length</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Branches</div>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: '#fbbf24' }}>{branchWeight} kg</div>
                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>+{leavesWeight}kg leaf</div>
                          </div>
                        </div>

                        <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
                          <Truck size={13} color="#38bdf8" /> {intake.vehicleType || 'Mini Tipper'} ({intake.vehicleNumber || 'KA-20'}) • {intake.disposalYard || 'Depot'}
                        </div>

                        {/* Action Button */}
                        <div style={{ marginTop: 'auto' }}>
                          {!isPublished ? (
                            <button
                              onClick={() => openVerifyModal(intake)}
                              style={{
                                width: '100%',
                                padding: '10px',
                                borderRadius: '10px',
                                background: '#10b981',
                                border: 'none',
                                color: '#ffffff',
                                fontSize: '13px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                              }}
                            >
                              <ShieldCheck size={16} /> Verify Weighbridge & Launch Auction
                            </button>
                          ) : (
                            <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', color: '#34d399', fontSize: '12px', fontWeight: 700 }}>
                              ✓ Published in Live Auction Catalog
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: REGISTERED COMMERCIAL TIMBER BUYERS & SAWMILLS */}
          {activeTab === 'buyers' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>
                    Registered Commercial Timber Merchants & Sawmills
                  </h3>
                  <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                    Verified B2B commercial entities registered with the Municipal Forestry desk for timber salvage procurement.
                  </div>
                </div>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', color: '#34d399', fontWeight: 700 }}>
                  🏢 {buyers.length} Verified Commercial Entities
                </div>
              </div>

              {buyers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <Building size={48} style={{ margin: '0 auto 12px', color: '#64748b' }} />
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>No Commercial Buyers Registered Yet</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
                    Merchants can register via the dedicated Commercial Timber Salvage Portal (<a href="/timber-auction" style={{ color: '#38bdf8' }}>/timber-auction</a>).
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '20px' }}>
                  {buyers.map((buyer, idx) => {
                    const wonLots = lots.filter(l => 
                      l.allotmentCertificate?.awardedTo === buyer.companyName ||
                      l.highestBidder?.companyName === buyer.companyName ||
                      l.highestBidder?.bidderEmail === buyer.bidderEmail ||
                      l.highestBidder?.bidderPhone === buyer.bidderPhone
                    );

                    return (
                      <div
                        key={buyer.bidderId || buyer._id || idx}
                        style={{
                          background: 'rgba(15, 23, 42, 0.85)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '16px',
                          padding: '20px',
                          display: 'flex',
                          flexDirection: 'column',
                          position: 'relative'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8', fontWeight: 800, fontSize: '18px' }}>
                              🏢
                            </div>
                            <div>
                              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>
                                {buyer.companyName}
                              </h4>
                              <div style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 600 }}>
                                {buyer.businessType || 'Commercial Sawmill / Merchant'}
                              </div>
                            </div>
                          </div>
                          <span style={{ fontSize: '10px', fontWeight: 800, color: '#34d399', background: 'rgba(16, 185, 129, 0.15)', padding: '3px 8px', borderRadius: '6px' }}>
                            ✓ VERIFIED
                          </span>
                        </div>

                        {/* Specs Grid */}
                        <div style={{ background: 'rgba(0, 0, 0, 0.3)', borderRadius: '10px', padding: '12px', marginBottom: '14px', fontSize: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <div>
                            <div style={{ color: '#64748b', fontSize: '10px', textTransform: 'uppercase' }}>Representative</div>
                            <div style={{ fontWeight: 700, color: '#f8fafc' }}>{buyer.bidderName}</div>
                          </div>
                          <div>
                            <div style={{ color: '#64748b', fontSize: '10px', textTransform: 'uppercase' }}>Phone</div>
                            <div style={{ fontWeight: 700, color: '#f8fafc' }}>{buyer.bidderPhone}</div>
                          </div>
                          <div>
                            <div style={{ color: '#64748b', fontSize: '10px', textTransform: 'uppercase' }}>GSTIN</div>
                            <div style={{ fontWeight: 700, color: '#fbbf24' }}>{buyer.gstin || buyer.gstNumber || '29AAAAA0000A1Z5'}</div>
                          </div>
                          <div>
                            <div style={{ color: '#64748b', fontSize: '10px', textTransform: 'uppercase' }}>Trade License</div>
                            <div style={{ fontWeight: 700, color: '#f8fafc' }}>{buyer.tradeLicense || 'MNC-WB-4402'}</div>
                          </div>
                        </div>

                        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '14px' }}>
                          ✉️ <strong>Email:</strong> {buyer.bidderEmail || 'commercial@sawmill.com'}
                        </div>

                        {/* Won Lots Stat */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '10px', background: wonLots.length > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.03)', border: wonLots.length > 0 ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(255,255,255,0.06)', marginBottom: '14px' }}>
                          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Auctions Won:</span>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: wonLots.length > 0 ? '#34d399' : '#64748b' }}>
                            🏆 {wonLots.length} Timber Lots Awarded
                          </span>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                          <a
                            href={`tel:${buyer.bidderPhone}`}
                            style={{
                              flex: 1,
                              padding: '8px',
                              borderRadius: '8px',
                              background: 'rgba(56, 189, 248, 0.15)',
                              border: '1px solid rgba(56, 189, 248, 0.3)',
                              color: '#38bdf8',
                              fontSize: '12px',
                              fontWeight: 700,
                              textAlign: 'center',
                              textDecoration: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            📞 Call Buyer
                          </a>
                          <a
                            href={`mailto:${buyer.bidderEmail}`}
                            style={{
                              flex: 1,
                              padding: '8px',
                              borderRadius: '8px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              color: '#f8fafc',
                              fontSize: '12px',
                              fontWeight: 700,
                              textAlign: 'center',
                              textDecoration: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            ✉️ Email Notice
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL 1: BID HISTORY */}
        {selectedLotBids && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
            <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', width: '100%', maxWidth: '540px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>
                    Bid Log: {selectedLotBids.lotNumber}
                  </h3>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>{selectedLotBids.treeSpecies}</div>
                </div>
                <button onClick={() => setSelectedLotBids(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}>✕</button>
              </div>

              {loadingBids ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>Loading bid logs...</div>
              ) : bidsList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>No bids recorded for this lot yet.</div>
              ) : (
                <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                  {bidsList.map((b, i) => (
                    <div
                      key={b._id || i}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        background: i === 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                        border: i === 0 ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.06)',
                        marginBottom: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: '#f8fafc' }}>{b.companyName || b.bidderName}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>📞 {b.bidderPhone || 'N/A'} • {new Date(b.createdAt).toLocaleTimeString('en-IN')}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: '15px', color: i === 0 ? '#34d399' : '#f8fafc' }}>₹{Number(b.bidAmountInr || 0).toLocaleString('en-IN')}</div>
                        <div style={{ fontSize: '10px', color: i === 0 ? '#10b981' : '#64748b' }}>{i === 0 ? '🏆 HIGHEST' : 'OUTBID'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setSelectedLotBids(null)}
                style={{ width: '100%', padding: '12px', marginTop: '16px', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '10px', color: '#f8fafc', fontWeight: 600, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* MODAL 2: PRINTABLE OFFICIAL CERTIFICATE */}
        {certificateModalLot && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
            <div style={{ background: '#ffffff', color: '#0f172a', borderRadius: '16px', width: '100%', maxWidth: '640px', padding: '36px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', position: 'relative' }}>
              
              <button
                onClick={() => setCertificateModalLot(null)}
                style={{ position: 'absolute', right: '20px', top: '20px', background: 'none', border: 'none', fontSize: '20px', color: '#64748b', cursor: 'pointer' }}
              >
                ✕
              </button>

              {/* Certificate Border & Header */}
              <div style={{ border: '3px double #059669', padding: '24px', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', color: '#059669', fontWeight: 800, marginBottom: '4px' }}>
                  GOVERNMENT OF KARNATAKA • MUNICIPAL FORESTRY DESK
                </div>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '22px', fontWeight: 900, color: '#064e3b', letterSpacing: '-0.5px' }}>
                  TIMBER SALVAGE ALLOTMENT CERTIFICATE
                </h2>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '20px' }}>
                  Certificate No: <strong style={{ color: '#0f172a' }}>{certificateModalLot.allotmentCertificate?.certificateNumber}</strong>
                </div>

                <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#334155', textAlign: 'left', marginBottom: '18px' }}>
                  This is to certify that under the municipal urban biomass circular valorization program, the salvage timber lot detailed below has been legally awarded through competitive electronic auction to the registered commercial bidder:
                </p>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', textAlign: 'left', marginBottom: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
                    <div><strong>Lot Number:</strong> {certificateModalLot.lotNumber}</div>
                    <div><strong>Species:</strong> {certificateModalLot.treeSpecies}</div>
                    <div><strong>Awarded Entity:</strong> {certificateModalLot.allotmentCertificate?.awardedTo || certificateModalLot.highestBidder?.companyName}</div>
                    <div><strong>Contact:</strong> {certificateModalLot.allotmentCertificate?.bidderContact || certificateModalLot.highestBidder?.bidderPhone}</div>
                    <div><strong>Winning Bid:</strong> <span style="color: #059669; font-weight: bold;">₹{Number(certificateModalLot.allotmentCertificate?.winningBidAmountInr || certificateModalLot.currentHighestBidInr || 0).toLocaleString('en-IN')}</span></div>
                    <div><strong>Total Weight:</strong> {certificateModalLot.totalWeightKg} kg ({certificateModalLot.logCount} logs)</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '24px', textAlign: 'left' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Authorized Depot:</div>
                    <div style={{ fontSize: '12px', fontWeight: 600 }}>{certificateModalLot.storageYard}</div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>Date: {new Date().toLocaleDateString('en-IN')}</div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ width: '120px', borderBottom: '1px solid #0f172a', marginBottom: '4px' }}></div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#064e3b' }}>
                      {certificateModalLot.allotmentCertificate?.issuedByOfficial || 'Municipal Forest Officer'}
                    </div>
                    <div style={{ fontSize: '9px', color: '#64748b' }}>Officer Seal & Signature</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button
                  onClick={() => window.print()}
                  style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#059669', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <Printer size={16} /> Print Official Certificate
                </button>
                <button
                  onClick={() => setCertificateModalLot(null)}
                  style={{ padding: '12px 20px', borderRadius: '8px', background: '#e2e8f0', border: 'none', color: '#334155', fontWeight: 600, cursor: 'pointer' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 3: DISPATCH GATE RELEASE FORM */}
        {dispatchModalLot && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
            <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', width: '100%', maxWidth: '480px', padding: '24px' }}>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>
                Depot Gate Release: {dispatchModalLot.lotNumber}
              </h3>
              <p style={{ margin: '0 0 16px 0', color: '#94a3b8', fontSize: '13px' }}>
                Verify winner credentials and log transport vehicle for timber gate release.
              </p>

              <form onSubmit={handleConfirmDispatch}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>Transport Vehicle Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. KA-20-MB-9012"
                    value={dispatchForm.vehicleNumber}
                    onChange={e => setDispatchForm({ ...dispatchForm, vehicleNumber: e.target.value })}
                    style={{ width: '100%', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>Verifying Security Officer *</label>
                  <input
                    type="text"
                    required
                    value={dispatchForm.verifiedByGuard}
                    onChange={e => setDispatchForm({ ...dispatchForm, verifiedByGuard: e.target.value })}
                    style={{ width: '100%', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>Weighbridge & Quality Notes</label>
                  <textarea
                    rows="2"
                    placeholder="e.g. All 3 rosewood logs loaded, weigh-out confirmed."
                    value={dispatchForm.deliveryNotes}
                    onChange={e => setDispatchForm({ ...dispatchForm, deliveryNotes: e.target.value })}
                    style={{ width: '100%', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setDispatchModalLot(null)}
                    style={{ flex: 1, padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#f8fafc', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{ flex: 1.5, padding: '12px', borderRadius: '8px', background: '#10b981', border: 'none', color: '#ffffff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <CheckCircle2 size={16} /> Confirm Gate Release
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 4: VERIFY TREE CUTTER INTAKE & PUBLISH AUCTION LOT */}
        {verifyingIntake && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px', overflowY: 'auto' }}>
            <div style={{ background: '#0f172a', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '16px', width: '100%', maxWidth: '720px', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Tree Cutter Waste Intake Verification • {verifyForm.shipmentId}
                  </div>
                  <h3 style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>
                    Verify Weighbridge & Launch Timber Auction
                  </h3>
                </div>
                <button
                  onClick={() => setVerifyingIntake(null)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              {/* Source Cutter details summary card */}
              <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '12px', padding: '12px 16px', marginBottom: '18px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                    🪓 Harvested by Arborist: <strong style={{ color: '#fff' }}>{verifyForm.cutterName}</strong>
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                    📍 {verifyForm.originLocation}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 700 }}>
                    🚚 Vehicle: {verifyForm.vehicleNumber}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    Yard: {verifyForm.storageYard}
                  </div>
                </div>
              </div>

              <form onSubmit={handlePublishFromIntake}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Auction Lot Title *</label>
                  <input
                    type="text"
                    required
                    value={verifyForm.title}
                    onChange={e => setVerifyForm({ ...verifyForm, title: e.target.value })}
                    style={{ width: '100%', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '9px 12px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Tree Species (from Cutter) *</label>
                    <input
                      type="text"
                      required
                      value={verifyForm.treeSpecies}
                      onChange={e => setVerifyForm({ ...verifyForm, treeSpecies: e.target.value })}
                      style={{ width: '100%', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '9px 12px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Official Wood Grade *</label>
                    <select
                      value={verifyForm.woodGrade}
                      onChange={e => setVerifyForm({ ...verifyForm, woodGrade: e.target.value })}
                      style={{ width: '100%', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '9px 12px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                    >
                      <option value="Grade A Construction Hardwood">Grade A Construction Hardwood</option>
                      <option value="Grade B Furniture Wood">Grade B Furniture Wood</option>
                      <option value="Grade C Structural Framing">Grade C Structural Framing</option>
                      <option value="Grade D Firewood & Split Logs">Grade D Firewood & Split Logs</option>
                    </select>
                  </div>
                </div>

                {/* Dimensions and Weight */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Log Count</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={verifyForm.logCount}
                      onChange={e => setVerifyForm({ ...verifyForm, logCount: Number(e.target.value) })}
                      style={{ width: '100%', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '8px 10px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Weight (kg) *</label>
                    <input
                      type="number"
                      required
                      min="10"
                      value={verifyForm.totalWeightKg}
                      onChange={e => setVerifyForm({ ...verifyForm, totalWeightKg: Number(e.target.value) })}
                      style={{ width: '100%', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '8px 10px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Avg Ø (cm)</label>
                    <input
                      type="number"
                      value={verifyForm.avgDiameterCm}
                      onChange={e => setVerifyForm({ ...verifyForm, avgDiameterCm: Number(e.target.value) })}
                      style={{ width: '100%', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '8px 10px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Length (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={verifyForm.avgLengthMeters}
                      onChange={e => setVerifyForm({ ...verifyForm, avgLengthMeters: Number(e.target.value) })}
                      style={{ width: '100%', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '8px 10px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* Pricing & Duration */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Starting Bid (₹) *</label>
                    <input
                      type="number"
                      required
                      value={verifyForm.startingBidInr}
                      onChange={e => setVerifyForm({ ...verifyForm, startingBidInr: Number(e.target.value) })}
                      style={{ width: '100%', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '8px 10px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Reserve Price (₹) *</label>
                    <input
                      type="number"
                      required
                      value={verifyForm.reservePriceInr}
                      onChange={e => setVerifyForm({ ...verifyForm, reservePriceInr: Number(e.target.value) })}
                      style={{ width: '100%', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '8px 10px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Duration (Hours)</label>
                    <select
                      value={verifyForm.auctionDurationHours}
                      onChange={e => setVerifyForm({ ...verifyForm, auctionDurationHours: Number(e.target.value) })}
                      style={{ width: '100%', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '8px 10px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                    >
                      <option value="24">24 Hours (1 Day)</option>
                      <option value="48">48 Hours (2 Days)</option>
                      <option value="72">72 Hours (3 Days)</option>
                      <option value="168">7 Days (Full Week)</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Official Inspection & Compliance Notes</label>
                  <textarea
                    rows="2"
                    value={verifyForm.inspectionNotes}
                    onChange={e => setVerifyForm({ ...verifyForm, inspectionNotes: e.target.value })}
                    style={{ width: '100%', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setVerifyingIntake(null)}
                    style={{ flex: 1, padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#f8fafc', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{ flex: 2, padding: '12px', borderRadius: '8px', background: '#10b981', border: 'none', color: '#ffffff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)' }}
                  >
                    <CheckCircle2 size={16} /> Approve Weighbridge & Launch Live Auction
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
