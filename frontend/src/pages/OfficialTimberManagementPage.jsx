import React, { useState, useEffect, useRef } from 'react';
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
  Award,
  Trash2,
  Edit,
  Camera,
  Upload,
  Play,
  Pause,
  X,
  Building,
  Phone,
  DollarSign,
  Sun,
  Moon
} from 'lucide-react';
import { Topbar, Sidebar } from './CanopyPages';

// Base64 file converter
const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

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

export default function OfficialTimberManagementPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    bgPage: isDark ? '#090e17' : '#f8fafc',
    bgHeader: isDark 
      ? 'linear-gradient(180deg, rgba(16, 185, 129, 0.15) 0%, rgba(9, 14, 23, 0.95) 100%)' 
      : 'linear-gradient(180deg, rgba(16, 185, 129, 0.10) 0%, rgba(241, 245, 249, 0.95) 100%)',
    bgCard: isDark ? 'rgba(15, 23, 42, 0.88)' : '#ffffff',
    bgCardAlt: isDark ? 'rgba(30, 41, 59, 0.6)' : '#f1f5f9',
    bgSubtle: isDark ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc',
    bgInput: isDark ? 'rgba(2, 6, 23, 0.7)' : '#ffffff',
    border: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
    borderStrong: isDark ? 'rgba(255, 255, 255, 0.15)' : '#cbd5e1',
    textPrimary: isDark ? '#f8fafc' : '#0f172a',
    textSecondary: isDark ? '#94a3b8' : '#475569',
    textMuted: isDark ? '#64748b' : '#94a3b8',
    cardShadow: isDark ? '0 10px 25px -5px rgba(0,0,0,0.5)' : '0 2px 10px rgba(0,0,0,0.05)',
    modalBg: isDark ? '#0f172a' : '#ffffff',
    modalBorder: isDark ? 'rgba(255, 255, 255, 0.12)' : '#e2e8f0',
    tabActiveBg: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.12)',
    tabActiveText: isDark ? '#34d399' : '#047857',
    tabActiveBorder: '#10b981',
    tabInactiveBg: isDark ? 'rgba(255, 255, 255, 0.04)' : '#ffffff',
    tabInactiveText: isDark ? '#94a3b8' : '#64748b',
    tabInactiveBorder: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
  };

  const [lots, setLots] = useState([]);
  const [wasteIntakes, setWasteIntakes] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('live'); // 'live', 'intakes', 'certificates', 'dispatch', 'buyers'
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

  // Edit / Add Image Modal
  const editImgRef = useRef();
  const [editLotModal, setEditLotModal] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    treeSpecies: '',
    woodGrade: 'Grade A Construction Hardwood',
    storageYard: '',
    logCount: 1,
    totalWeightKg: 0,
    avgDiameterCm: 0,
    avgLengthMeters: 0,
    startingBidInr: 0,
    reservePriceInr: 0,
    status: 'Live Bidding',
    inspectionNotes: '',
    imageBase64: null,
    imagePreview: ''
  });

  // Direct Publish Modal (without intake)
  const directImgRef = useRef();
  const [showDirectPublishModal, setShowDirectPublishModal] = useState(false);
  const [directForm, setDirectForm] = useState({
    lotNumber: `LOT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    title: '3x Mature Hardwood Trunk Logs (650 kg)',
    treeSpecies: 'Teak (Tectona grandis)',
    woodGrade: 'Grade A Construction Hardwood',
    storageYard: 'Santhekatte Municipal Timber Depot, Udupi',
    originLocation: 'Municipal Canopy Clearance & Maintenance',
    logCount: 3,
    totalWeightKg: 650,
    avgDiameterCm: 45,
    avgLengthMeters: 3.0,
    startingBidInr: 8000,
    reservePriceInr: 12000,
    bidStepIncrementInr: 500,
    auctionDurationHours: 48,
    inspectionNotes: 'Salvaged urban timber logs segregated from municipal tree clearance. Certified pest-free and debarked.',
    imageBase64: null,
    imagePreview: 'https://images.unsplash.com/photo-1546484396-fb3fc6f95f98?w=800&auto=format&fit=crop&q=80'
  });

  // Verify & Publish Modal (Pre-filled from Tree Cutter intake)
  const verifyImgRef = useRef();
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
    inspectionNotes: '',
    imageBase64: null,
    imagePreview: 'https://images.unsplash.com/photo-1546484396-fb3fc6f95f98?w=800&auto=format&fit=crop&q=80'
  });

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('currentUser')) || {};
    } catch {
      return {};
    }
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
  const timberIntakes = wasteIntakes.filter((i) => {
    const logs = Number(i.biomass?.logsCount || 0);
    const logWeight = Number(i.biomass?.logsWeightKg || 0);
    const branchWeight = Number(i.biomass?.branchesWeightKg || 0);
    const isTimberStream = i.allocatedStream === 'Timber Auction';
    return logs > 0 || logWeight > 0 || branchWeight >= 50 || isTimberStream;
  });

  const pendingTimberIntakes = timberIntakes.filter((i) => {
    return i.status === 'Delivered' || !i.assignedTimberLotId;
  });

  // Handler: Toggle LIVE or OFF (Pause/Resume Bidding)
  const handleToggleLotStatus = async (lot, newStatus) => {
    try {
      const res = await fetch(`http://localhost:5000/api/timber-auctions/${lot._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Failed to update lot status');
      Swal.fire({
        icon: 'success',
        title: `Lot ${lot.lotNumber}: ${newStatus}`,
        text: `Auction status changed to "${newStatus}".`,
        timer: 1600,
        showConfirmButton: false
      });
      fetchLots();
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  // Handler: Open Edit Lot Modal
  const openEditModal = (lot) => {
    setEditLotModal(lot);
    setEditForm({
      title: lot.title || `${lot.logCount || 1}x ${lot.treeSpecies || 'Hardwood Logs'}`,
      treeSpecies: lot.treeSpecies || lot.species || 'Municipal Hardwood',
      woodGrade: lot.woodGrade || 'Grade A Construction Hardwood',
      storageYard: lot.storageYard || 'Santhekatte Municipal Timber Depot, Udupi',
      logCount: lot.logCount || 1,
      totalWeightKg: lot.totalWeightKg || lot.estimatedWeightKg || 300,
      avgDiameterCm: lot.dimensions?.avgDiameterCm || lot.averageDiameterCm || 35,
      avgLengthMeters: lot.dimensions?.avgLengthMeters || lot.approxLengthM || 3.0,
      startingBidInr: lot.startingBidInr || 5000,
      reservePriceInr: lot.reservePriceInr || lot.reservePrice || 7500,
      status: lot.status || 'Live Bidding',
      inspectionNotes: lot.inspectionNotes || lot.description || '',
      imageBase64: null,
      imagePreview: getLotCoverPhoto(lot)
    });
  };

  // Handler: Save Edited Lot
  const handleSaveEditLot = async (e) => {
    e.preventDefault();
    if (!editLotModal) return;

    try {
      const payload = {
        title: editForm.title,
        treeSpecies: editForm.treeSpecies,
        woodGrade: editForm.woodGrade,
        storageYard: editForm.storageYard,
        logCount: Number(editForm.logCount),
        totalWeightKg: Number(editForm.totalWeightKg),
        'dimensions.avgDiameterCm': Number(editForm.avgDiameterCm),
        'dimensions.avgLengthMeters': Number(editForm.avgLengthMeters),
        startingBidInr: Number(editForm.startingBidInr),
        reservePriceInr: Number(editForm.reservePriceInr),
        status: editForm.status,
        inspectionNotes: editForm.inspectionNotes
      };

      if (editForm.imageBase64) {
        payload.imageBase64 = editForm.imageBase64;
      }

      const res = await fetch(`http://localhost:5000/api/timber-auctions/${editLotModal._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to update timber lot');

      Swal.fire({
        icon: 'success',
        title: 'Lot Updated! 🪵',
        text: `Changes to ${editLotModal.lotNumber} have been saved successfully.`,
        timer: 1800,
        showConfirmButton: false
      });
      setEditLotModal(null);
      fetchLots();
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  // Handler: Direct Publish Timber Lot
  const handleDirectPublish = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...directForm };
      const res = await fetch('http://localhost:5000/api/timber-auctions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to publish lot');
      const data = await res.json();

      Swal.fire({
        icon: 'success',
        title: 'Timber Lot Published! 🪵',
        text: `Lot ${data.lot?.lotNumber || directForm.lotNumber} is now live for commercial auction.`,
        confirmButtonColor: '#10b981'
      });
      setShowDirectPublishModal(false);
      setActiveTab('live');
      fetchLots();
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  // Handler: Delete Lot
  const handleDeleteLot = async (lot) => {
    const result = await Swal.fire({
      title: `Delete Lot ${lot.lotNumber}?`,
      text: `Are you sure you want to permanently delete this timber lot (${lot.treeSpecies || 'Timber'})? All recorded bids will also be removed.`,
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
        if (!res.ok) throw new Error('Failed to delete lot');
        Swal.fire({
          icon: 'success',
          title: 'Lot Deleted',
          text: `Timber lot ${lot.lotNumber} has been removed.`,
          timer: 1800,
          showConfirmButton: false
        });
        fetchLots();
      } catch (err) {
        Swal.fire('Error', err.message, 'error');
      }
    }
  };

  const openVerifyModal = (intake) => {
    setVerifyingIntake(intake);
    const species = intake.biomass?.treeSpecies || 'Mixed Municipal Hardwood';
    const logs = Number(intake.biomass?.logsCount || 1);
    const weight = Number(
      intake.biomass?.logsWeightKg ||
        (intake.biomass?.branchesWeightKg ? Math.round(intake.biomass.branchesWeightKg * 0.8) : 350)
    );
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
      inspectionNotes: `Inspected & verified at municipal weighbridge. Harvested by arborist ${intake.cutterName} from task "${intake.workOrderTitle}". Certified pest-free and debarked.`,
      imageBase64: null,
      imagePreview: intake.proofImageUrl || 'https://images.unsplash.com/photo-1546484396-fb3fc6f95f98?w=800&auto=format&fit=crop&q=80'
    });
  };

  const handlePublishFromIntake = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...verifyForm,
        verifiedByName: currentUser.name || 'Municipal Timber Officer'
      };
      if (verifyForm.imageBase64) {
        payload.imageBase64 = verifyForm.imageBase64;
      }

      const res = await fetch('http://localhost:5000/api/timber-auctions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
    const hasBids = (lot.totalBidsCount || 0) > 0 && Number(lot.currentHighestBidInr || 0) > 0;
    if (!hasBids && !lot.highestBidder?.bidderName) {
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
          <p><strong>Highest Bidder:</strong> <span style="color: #059669; font-weight: bold;">${lot.highestBidder?.companyName || lot.highestBidder?.bidderName || 'Registered Merchant'}</span></p>
          <p><strong>Winning Bid Amount:</strong> <span style="font-size: 18px; color: #059669; font-weight: 800;">₹${(lot.currentHighestBidInr || 0).toLocaleString('en-IN')}</span></p>
          <hr style="margin: 12px 0; border: none; border-top: 1px solid #e2e8f0;" />
          <label style="display: block; font-weight: 600; margin-bottom: 4px;">Approval & Compliance Notes:</label>
          <textarea id="swal-official-notes" class="swal2-textarea" style="width: 100%; margin: 0; padding: 8px; border-radius: 6px; font-size: 13px;" placeholder="e.g. Approved after meeting reserve price in accordance with municipal circular biomass regulations.">Approved following competitive commercial timber salvage auction.</textarea>
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
            text: `Timber Salvage Certificate ${data.lot.allotmentCertificate?.certificateNumber || 'CERT-TMB'} is now registered.`,
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
  const filteredLots = lots.filter((l) => {
    const term = searchQuery.toLowerCase();
    const matchSearch =
      (l.lotNumber || '').toLowerCase().includes(term) ||
      (l.treeSpecies || l.species || '').toLowerCase().includes(term) ||
      (l.title || '').toLowerCase().includes(term) ||
      (l.highestBidder?.companyName || '').toLowerCase().includes(term);
    return matchSearch;
  });

  const liveLots = filteredLots.filter(
    (l) =>
      !String(l.status || '').includes('Winner') &&
      !String(l.status || '').includes('Delivered') &&
      !String(l.status || '').includes('Sold')
  );
  const awardedLots = filteredLots.filter(
    (l) => String(l.status || '').includes('Winner') || l.allotmentCertificate?.certificateNumber
  );
  const deliveredLots = filteredLots.filter(
    (l) => String(l.status || '').includes('Delivered') || l.gatePass?.isCollected
  );

  // Metrics
  const totalLotsCount = lots.length;
  const activeBiddingCount = liveLots.filter((l) => (l.status || '').toUpperCase().includes('LIVE') || l.status === 'Active').length;
  const awardedCount = awardedLots.length;
  const totalRevenue = lots.reduce((acc, l) => {
    if (l.allotmentCertificate?.winningBidAmountInr) return acc + Number(l.allotmentCertificate.winningBidAmountInr);
    if (l.currentHighestBidInr && l.totalBidsCount > 0) return acc + Number(l.currentHighestBidInr);
    return acc;
  }, 0);

  return (
    <div className="cg-app" style={{ minHeight: '100vh', background: t.bgPage, color: t.textPrimary, fontFamily: 'Inter, sans-serif' }}>
      <Sidebar active="Timber Salvage Auction" isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />

      <div className="cg-workspace" style={{ background: t.bgPage, minHeight: '100vh', width: '100%' }}>
        <Topbar title="Official Timber Salvage & Auction Governance Desk" onToggleSidebar={() => setSidebarOpen(true)} />

        {/* Hero Header */}
        <div
          style={{
            background: t.bgHeader,
            borderBottom: `1px solid ${t.border}`,
            padding: '30px 24px 22px'
          }}
        >
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 14px', borderRadius: '999px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: isDark ? '#34d399' : '#047857', fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>
                  <ShieldCheck size={15} /> Official Forestry & Timber Valorization Desk
                </div>
                <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.5px', color: t.textPrimary }}>
                  Timber Salvage Auction Governance Desk
                </h1>
                <p style={{ margin: 0, color: t.textSecondary, fontSize: '14px', maxWidth: '720px', lineHeight: 1.5 }}>
                  Full lifecycle management: toggle live bidding (LIVE/OFF), manage real timber images, review sawmill bids, declare winners, and issue allotment certificates.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  onClick={toggleTheme}
                  title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    borderRadius: '10px',
                    background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#ffffff',
                    border: `1px solid ${t.border}`,
                    color: t.textPrimary,
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: t.cardShadow
                  }}
                >
                  {isDark ? <Sun size={15} color="#fbbf24" /> : <Moon size={15} color="#6366f1" />}
                  {isDark ? 'Light Mode' : 'Dark Mode'}
                </button>

                <a
                  href="/timber-auction"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 16px',
                    borderRadius: '10px',
                    background: 'rgba(56, 189, 248, 0.12)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: '#0284c7',
                    fontSize: '13px',
                    fontWeight: 700,
                    textDecoration: 'none'
                  }}
                >
                  <ExternalLink size={15} /> View Buyer Bidding Portal
                </a>

                <button
                  onClick={() => setShowDirectPublishModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    borderRadius: '10px',
                    background: '#10b981',
                    border: 'none',
                    color: '#020617',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  <Plus size={16} /> Publish New Timber Lot
                </button>

                <button
                  onClick={fetchLots}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    borderRadius: '10px',
                    background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#ffffff',
                    border: `1px solid ${t.border}`,
                    color: t.textPrimary,
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: t.cardShadow
                  }}
                >
                  <RefreshCw size={15} /> Refresh
                </button>
              </div>
            </div>

            {/* Quick Metrics */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px',
                marginTop: '24px'
              }}
            >
              <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '16px 20px', boxShadow: t.cardShadow }}>
                <div style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 600 }}>Active Live Auctions</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>{activeBiddingCount}</div>
                <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '2px' }}>Open for commercial bidding</div>
              </div>

              <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '16px 20px', boxShadow: t.cardShadow }}>
                <div style={{ fontSize: '12px', color: '#0284c7', fontWeight: 600 }}>Inbound Cutter Intakes</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#0284c7', marginTop: '4px' }}>{pendingTimberIntakes.length}</div>
                <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '2px' }}>Awaiting weighbridge approval</div>
              </div>

              <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '16px 20px', boxShadow: t.cardShadow }}>
                <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>Winners Declared</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>{awardedCount}</div>
                <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '2px' }}>Certificates issued</div>
              </div>

              <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '16px 20px', boxShadow: t.cardShadow }}>
                <div style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>Total Auction Volume</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#059669', marginTop: '4px' }}>₹{totalRevenue.toLocaleString('en-IN')}</div>
                <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '2px' }}>Biomass valorization revenue</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 20px 60px' }}>
          {/* Navigation Tabs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px', borderBottom: `1px solid ${t.border}`, paddingBottom: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { id: 'live', label: '🔨 Live Auctions & Bidding Control', count: liveLots.length },
                { id: 'intakes', label: '📥 Tree Cutter Inbound Logs', count: pendingTimberIntakes.length },
                { id: 'certificates', label: '📜 Awarded Winners & Certificates', count: awardedLots.length },
                { id: 'buyers', label: '🏢 Registered Timber Buyers & Sawmills', count: buyers.length }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    background: activeTab === tab.id ? t.tabActiveBg : t.tabInactiveBg,
                    border: `1px solid ${activeTab === tab.id ? t.tabActiveBorder : t.tabInactiveBorder}`,
                    color: activeTab === tab.id ? t.tabActiveText : t.tabInactiveText,
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                    boxShadow: activeTab === tab.id ? '0 2px 8px rgba(16, 185, 129, 0.15)' : 'none'
                  }}
                >
                  {tab.label}
                  {tab.count !== null && (
                    <span style={{ fontSize: '11px', background: activeTab === tab.id ? '#10b981' : (isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'), color: activeTab === tab.id ? '#fff' : t.textSecondary, padding: '2px 6px', borderRadius: '999px' }}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={16} color={t.textMuted} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search lots, species, sawmills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  background: t.bgInput,
                  border: `1px solid ${t.borderStrong}`,
                  borderRadius: '10px',
                  color: t.textPrimary,
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* TAB 1: LIVE AUCTIONS & MANAGEMENT */}
          {activeTab === 'live' && (
            <div>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: t.textSecondary }}>
                  <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px', color: '#10b981' }} />
                  Loading timber lots...
                </div>
              ) : liveLots.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', background: t.bgCard, borderRadius: '16px', border: `1px dashed ${t.borderStrong}`, boxShadow: t.cardShadow }}>
                  <Gavel size={40} color={t.textMuted} style={{ margin: '0 auto 12px' }} />
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', color: t.textPrimary }}>No Active Lots Found</h3>
                  <p style={{ margin: '0 0 16px 0', color: t.textSecondary, fontSize: '13px' }}>Publish a new timber lot or verify inbound logs from tree cutters.</p>
                  <button
                    onClick={() => setShowDirectPublishModal(true)}
                    style={{ padding: '10px 20px', background: '#10b981', border: 'none', borderRadius: '10px', color: '#020617', fontWeight: 800, cursor: 'pointer' }}
                  >
                    + Publish First Timber Lot
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '22px' }}>
                  {liveLots.map((lot) => {
                    const species = lot.treeSpecies || lot.species || lot.title || 'Municipal Hardwood';
                    const weight = Number(lot.totalWeightKg || lot.estimatedWeightKg || 0);
                    const logCount = lot.logCount || 1;
                    const diameter = lot.dimensions?.avgDiameterCm || lot.averageDiameterCm || 40;
                    const length = lot.dimensions?.avgLengthMeters || lot.approxLengthM || 3.0;
                    const reserve = Number(lot.reservePriceInr || lot.reservePrice || 0);
                    const curBid = Number(lot.currentHighestBidInr || lot.currentBid || 0);
                    const hasBids = (lot.totalBidsCount || 0) > 0 && curBid > 0;
                    const isLive = String(lot.status || '').toUpperCase().includes('LIVE') || lot.status === 'Active';
                    const coverPhoto = getLotCoverPhoto(lot);

                    return (
                      <div
                        key={lot._id}
                        style={{
                          background: t.bgCard,
                          border: isLive ? (isDark ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid #10b981') : (isDark ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid #f59e0b'),
                          borderRadius: '16px',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          boxShadow: t.cardShadow
                        }}
                      >
                        {/* Photo Header */}
                        <div style={{ position: 'relative', height: '170px', background: isDark ? '#1e293b' : '#e2e8f0' }}>
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
                          <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
                            <span
                              style={{
                                padding: '4px 10px',
                                borderRadius: '999px',
                                fontSize: '11px',
                                fontWeight: 800,
                                background: isLive ? 'rgba(16, 185, 129, 0.9)' : 'rgba(245, 158, 11, 0.9)',
                                color: '#ffffff',
                                backdropFilter: 'blur(4px)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px'
                              }}
                            >
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} />
                              {isLive ? 'LIVE BIDDING ON' : 'AUCTION PAUSED / OFF'}
                            </span>
                          </div>

                          {/* Lot Number & Delete */}
                          <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '6px' }}>
                            <span
                              style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 800,
                                background: 'rgba(0,0,0,0.75)',
                                color: '#fbbf24',
                                border: '1px solid rgba(255,255,255,0.2)'
                              }}
                            >
                              {lot.lotNumber}
                            </span>
                            <button
                              onClick={() => handleDeleteLot(lot)}
                              title="Delete Lot"
                              style={{
                                background: 'rgba(239, 68, 68, 0.85)',
                                border: 'none',
                                color: '#fff',
                                borderRadius: '6px',
                                padding: '4px 6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>

                          {/* Wood title bar */}
                          <div
                            style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              background: 'linear-gradient(0deg, rgba(15, 23, 42, 0.95) 0%, transparent 100%)',
                              padding: '12px 14px 6px'
                            }}
                          >
                            <div style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>
                              {species}
                            </div>
                            <div style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 600 }}>
                              {lot.woodGrade || 'Grade A Construction Hardwood'}
                            </div>
                          </div>
                        </div>

                        {/* Card Body */}
                        <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <p style={{ margin: '0 0 12px 0', color: t.textSecondary, fontSize: '12.5px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {lot.inspectionNotes || lot.description || 'Salvaged urban timber logs inspected by Municipal Tree Processing Yard.'}
                          </p>

                          {/* Specs Grid */}
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(4, 1fr)',
                              gap: '6px',
                              background: isDark ? 'rgba(0,0,0,0.3)' : '#f8fafc',
                              border: `1px solid ${t.border}`,
                              padding: '10px',
                              borderRadius: '10px',
                              marginBottom: '14px',
                              textAlign: 'center'
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '10px', color: t.textMuted, textTransform: 'uppercase' }}>Logs</div>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: t.textPrimary }}>{logCount}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '10px', color: t.textMuted, textTransform: 'uppercase' }}>Weight</div>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: '#f59e0b' }}>{weight} kg</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '10px', color: t.textMuted, textTransform: 'uppercase' }}>Avg Ø</div>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: t.textPrimary }}>{diameter} cm</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '10px', color: t.textMuted, textTransform: 'uppercase' }}>Length</div>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: t.textPrimary }}>{length} m</div>
                            </div>
                          </div>

                          {/* Price & Leading Bid Box */}
                          <div
                            style={{
                              background: isDark ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.8))' : 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
                              border: `1px solid ${t.border}`,
                              borderRadius: '12px',
                              padding: '12px 14px',
                              marginBottom: '14px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ fontSize: '11px', color: t.textSecondary }}>Reserve Price:</span>
                              <span style={{ fontSize: '12px', fontWeight: 600, color: t.textSecondary }}>₹{reserve.toLocaleString('en-IN')}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: hasBids ? '#10b981' : '#f59e0b' }}>
                                {hasBids ? 'Leading Offer:' : 'Starting Base Price:'}
                              </span>
                              <span style={{ fontSize: '18px', fontWeight: 900, color: hasBids ? '#10b981' : '#f59e0b' }}>
                                ₹{hasBids ? curBid.toLocaleString('en-IN') : (lot.startingBidInr || reserve).toLocaleString('en-IN')}
                              </span>
                            </div>
                            {hasBids && lot.highestBidder?.companyName ? (
                              <div style={{ fontSize: '11px', color: t.textPrimary, marginTop: '6px', borderTop: `1px solid ${t.border}`, paddingTop: '6px' }}>
                                By: <strong>{lot.highestBidder.companyName}</strong> ({lot.highestBidder.bidderPhone})
                              </div>
                            ) : (
                              <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '4px' }}>
                                0 bids placed • Open for live commercial offers
                              </div>
                            )}
                          </div>

                          <div style={{ fontSize: '11px', color: t.textSecondary, display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '14px' }}>
                            <MapPin size={12} color="#f59e0b" /> Yard: <strong style={{ color: t.textPrimary }}>{lot.storageYard || 'Santhekatte Depot'}</strong>
                          </div>

                          {/* Official Action Controls */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              {/* LIVE / OFF Toggle */}
                              {isLive ? (
                                <button
                                  onClick={() => handleToggleLotStatus(lot, 'Paused / Off')}
                                  style={{
                                    flex: 1,
                                    padding: '8px',
                                    borderRadius: '8px',
                                    background: 'rgba(245, 158, 11, 0.15)',
                                    border: '1px solid rgba(245, 158, 11, 0.3)',
                                    color: '#d97706',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '5px'
                                  }}
                                >
                                  <Pause size={13} /> Turn OFF
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleToggleLotStatus(lot, 'Live Bidding')}
                                  style={{
                                    flex: 1,
                                    padding: '8px',
                                    borderRadius: '8px',
                                    background: 'rgba(16, 185, 129, 0.15)',
                                    border: '1px solid rgba(16, 185, 129, 0.3)',
                                    color: '#059669',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '5px'
                                  }}
                                >
                                  <Play size={13} /> Turn LIVE
                                </button>
                              )}

                              {/* Edit & Images */}
                              <button
                                onClick={() => openEditModal(lot)}
                                style={{
                                  flex: 1,
                                  padding: '8px',
                                  borderRadius: '8px',
                                  background: 'rgba(56, 189, 248, 0.12)',
                                  border: '1px solid rgba(56, 189, 248, 0.3)',
                                  color: '#0284c7',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '5px'
                                }}
                              >
                                <Edit size={13} /> Edit / Photos
                              </button>

                              {/* Bids Log */}
                              <button
                                onClick={() => openBidsModal(lot)}
                                style={{
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9',
                                  border: `1px solid ${t.border}`,
                                  color: t.textPrimary,
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <Eye size={13} /> {lot.totalBidsCount || 0}
                              </button>
                            </div>

                            {/* Declare Winner CTA */}
                            <button
                              onClick={() => handleDeclareWinner(lot)}
                              disabled={!hasBids}
                              style={{
                                width: '100%',
                                padding: '10px',
                                borderRadius: '8px',
                                background: hasBids ? 'linear-gradient(135deg, #10b981, #059669)' : (isDark ? 'rgba(255, 255, 255, 0.05)' : '#e2e8f0'),
                                border: 'none',
                                color: hasBids ? '#ffffff' : t.textMuted,
                                fontSize: '13px',
                                fontWeight: 800,
                                cursor: hasBids ? 'pointer' : 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                              }}
                            >
                              <Award size={15} /> Declare Winner & Issue Certificate 📜
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

          {/* TAB 2: INBOUND TREE CUTTER LOGS */}
          {activeTab === 'intakes' && (
            <div>
              {pendingTimberIntakes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', background: t.bgCard, borderRadius: '16px', border: `1px dashed ${t.borderStrong}`, boxShadow: t.cardShadow }}>
                  <Layers size={40} color={t.textMuted} style={{ margin: '0 auto 12px' }} />
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', color: t.textPrimary }}>No Inbound Timber Logs Waiting</h3>
                  <p style={{ margin: 0, color: t.textSecondary, fontSize: '13px' }}>When Tree Cutters record fallen logs or trunk clearances, they will appear here for official weighbridge verification.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '20px' }}>
                  {pendingTimberIntakes.map((intake) => {
                    const logs = Number(intake.biomass?.logsCount || 1);
                    const weight = Number(intake.biomass?.logsWeightKg || (intake.biomass?.branchesWeightKg ? Math.round(intake.biomass.branchesWeightKg * 0.8) : 350));
                    const species = intake.biomass?.treeSpecies || 'Municipal Hardwood';

                    return (
                      <div
                        key={intake._id}
                        style={{
                          background: t.bgCard,
                          border: `1px solid ${isDark ? 'rgba(56, 189, 248, 0.3)' : '#bae6fd'}`,
                          borderRadius: '16px',
                          padding: '20px',
                          display: 'flex',
                          flexDirection: 'column',
                          boxShadow: t.cardShadow
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#0284c7', background: 'rgba(56, 189, 248, 0.15)', padding: '4px 10px', borderRadius: '6px' }}>
                            {intake.shipmentId || 'INTAKE'}
                          </span>
                          <span style={{ fontSize: '11px', color: t.textSecondary }}>
                            {new Date(intake.createdAt || Date.now()).toLocaleDateString('en-IN')}
                          </span>
                        </div>

                        <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 800, color: t.textPrimary }}>
                          {species} Logs
                        </h3>
                        <p style={{ margin: '0 0 12px 0', color: t.textSecondary, fontSize: '13px' }}>
                          {logs} Trunk Logs • Est. {weight} kg • Vehicle {intake.vehicleNumber || 'KA-20'}
                        </p>

                        <div style={{ background: isDark ? 'rgba(0, 0, 0, 0.3)' : '#f8fafc', border: `1px solid ${t.border}`, borderRadius: '10px', padding: '12px', marginBottom: '16px', fontSize: '12px', color: t.textSecondary }}>
                          <div><strong>Harvest Arborist:</strong> {intake.cutterName || 'Field Cutter'}</div>
                          <div style={{ marginTop: '4px' }}><strong>Source Task:</strong> {intake.workOrderTitle || 'Canopy Trimming'}</div>
                          <div style={{ marginTop: '4px' }}><strong>Disposal Depot:</strong> {intake.disposalYard || 'Santhekatte Depot'}</div>
                        </div>

                        <button
                          onClick={() => openVerifyModal(intake)}
                          style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '10px',
                            background: '#10b981',
                            border: 'none',
                            color: '#020617',
                            fontSize: '13px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            marginTop: 'auto'
                          }}
                        >
                          <CheckCircle2 size={16} /> Verify Weighbridge & Launch Auction
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: AWARDED LOTS & CERTIFICATES */}
          {activeTab === 'certificates' && (
            <div>
              {awardedLots.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', background: t.bgCard, borderRadius: '16px', border: `1px dashed ${t.borderStrong}`, boxShadow: t.cardShadow }}>
                  <Award size={40} color={t.textMuted} style={{ margin: '0 auto 12px' }} />
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', color: t.textPrimary }}>No Awarded Certificates Yet</h3>
                  <p style={{ margin: 0, color: t.textSecondary, fontSize: '13px' }}>Declare a winner from the Live Auctions tab to generate official allotment certificates.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '20px' }}>
                  {awardedLots.map((lot) => {
                    const cert = lot.allotmentCertificate || {};
                    const species = lot.treeSpecies || lot.species || lot.title || 'Municipal Hardwood';
                    const amount = Number(cert.winningBidAmountInr || lot.currentHighestBidInr || 0);

                    return (
                      <div
                        key={lot._id}
                        style={{
                          background: isDark ? 'linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(6, 78, 59, 0.3))' : 'linear-gradient(145deg, #ffffff, rgba(16, 185, 129, 0.05))',
                          border: `1px solid ${isDark ? 'rgba(16, 185, 129, 0.35)' : '#a7f3d0'}`,
                          borderRadius: '16px',
                          padding: '20px',
                          display: 'flex',
                          flexDirection: 'column',
                          boxShadow: t.cardShadow
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: isDark ? '#34d399' : '#059669', background: 'rgba(16, 185, 129, 0.2)', padding: '4px 10px', borderRadius: '6px' }}>
                            {cert.certificateNumber || 'CERT-TMB-2026'}
                          </span>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#d97706' }}>
                            {lot.lotNumber}
                          </span>
                        </div>

                        <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 800, color: t.textPrimary }}>
                          {species}
                        </h3>
                        <div style={{ fontSize: '13px', color: t.textSecondary, marginBottom: '16px' }}>
                          Awarded to: <strong style={{ color: t.textPrimary }}>{cert.awardedTo || lot.highestBidder?.companyName || 'Registered Merchant'}</strong>
                        </div>

                        <div style={{ background: isDark ? 'rgba(0, 0, 0, 0.4)' : '#f8fafc', border: `1px solid ${t.border}`, borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontSize: '12px', color: t.textSecondary }}>Winning Bid Value:</span>
                            <span style={{ fontSize: '16px', fontWeight: 800, color: '#059669' }}>₹{amount.toLocaleString('en-IN')}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontSize: '12px', color: t.textSecondary }}>Authorized Officer:</span>
                            <span style={{ fontSize: '12px', color: t.textPrimary }}>{cert.issuedByOfficial || 'Forestry Officer'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '12px', color: t.textSecondary }}>Gate-Pass Code:</span>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#d97706' }}>{lot.gatePass?.passCode || 'GP-ISSUED'}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                          <button
                            onClick={() => setCertificateModalLot(lot)}
                            style={{
                              width: '100%',
                              padding: '11px',
                              borderRadius: '8px',
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
                            <FileText size={14} /> View Official Allotment Certificate 📜
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: REGISTERED TIMBER BUYERS & SAWMILLS */}
          {activeTab === 'buyers' && (
            <div>
              {buyers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', background: t.bgCard, borderRadius: '16px', border: `1px dashed ${t.borderStrong}`, boxShadow: t.cardShadow }}>
                  <Building size={40} color={t.textMuted} style={{ margin: '0 auto 12px' }} />
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', color: t.textPrimary }}>No Commercial Buyers Registered Yet</h3>
                  <p style={{ margin: 0, color: t.textSecondary, fontSize: '13px' }}>
                    Sawmills and timber merchants register via the public portal (
                    <a href="/timber-auction" style={{ color: '#0284c7' }}>
                      /timber-auction
                    </a>
                    ).
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
                  {buyers.map((buyer) => (
                    <div
                      key={buyer.id || buyer._id}
                      style={{
                        background: t.bgCard,
                        border: `1px solid ${t.border}`,
                        borderRadius: '16px',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: t.cardShadow
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: t.textPrimary }}>
                            {buyer.companyName || buyer.name}
                          </h4>
                          <div style={{ fontSize: '12px', color: '#0284c7', fontWeight: 600 }}>
                            {buyer.businessType || 'Commercial Sawmill / Lumber Merchant'}
                          </div>
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: 800, color: isDark ? '#34d399' : '#059669', background: 'rgba(16, 185, 129, 0.15)', padding: '3px 8px', borderRadius: '6px' }}>
                          ✓ VERIFIED
                        </span>
                      </div>

                      <div style={{ background: isDark ? 'rgba(0, 0, 0, 0.3)' : '#f8fafc', border: `1px solid ${t.border}`, borderRadius: '10px', padding: '12px', marginBottom: '14px', fontSize: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <div style={{ color: t.textMuted, fontSize: '10px', textTransform: 'uppercase' }}>Representative</div>
                          <div style={{ fontWeight: 700, color: t.textPrimary }}>{buyer.name}</div>
                        </div>
                        <div>
                          <div style={{ color: t.textMuted, fontSize: '10px', textTransform: 'uppercase' }}>Phone</div>
                          <div style={{ fontWeight: 700, color: t.textPrimary }}>{buyer.phone}</div>
                        </div>
                        <div>
                          <div style={{ color: t.textMuted, fontSize: '10px', textTransform: 'uppercase' }}>GSTIN</div>
                          <div style={{ fontWeight: 700, color: '#d97706' }}>{buyer.gstin || '29AAAAA0000A1Z5'}</div>
                        </div>
                        <div>
                          <div style={{ color: t.textMuted, fontSize: '10px', textTransform: 'uppercase' }}>Trade License</div>
                          <div style={{ fontWeight: 700, color: t.textPrimary }}>{buyer.tradeLicense || 'MNC-TMB-4402'}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                        <a
                          href={`tel:${buyer.phone}`}
                          style={{
                            flex: 1,
                            padding: '9px',
                            borderRadius: '8px',
                            background: 'rgba(56, 189, 248, 0.15)',
                            border: '1px solid rgba(56, 189, 248, 0.3)',
                            color: '#0284c7',
                            fontSize: '12px',
                            fontWeight: 700,
                            textAlign: 'center',
                            textDecoration: 'none'
                          }}
                        >
                          📞 Call Merchant
                        </a>
                        <a
                          href={`mailto:${buyer.email}`}
                          style={{
                            flex: 1,
                            padding: '9px',
                            borderRadius: '8px',
                            background: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9',
                            border: `1px solid ${t.border}`,
                            color: t.textPrimary,
                            fontSize: '12px',
                            fontWeight: 700,
                            textAlign: 'center',
                            textDecoration: 'none'
                          }}
                        >
                          ✉️ Email
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── MODAL: EDIT LOT & UPLOAD TIMBER PHOTOS ── */}
        {editLotModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
            <div style={{ background: t.modalBg, border: `1px solid ${isDark ? 'rgba(56, 189, 248, 0.3)' : '#bae6fd'}`, borderRadius: '16px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: `1px solid ${t.border}`, paddingBottom: '12px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: t.textPrimary }}>
                    Edit Timber Lot & Photographs
                  </h3>
                  <div style={{ fontSize: '12px', color: '#d97706', marginTop: '2px' }}>
                    {editLotModal.lotNumber} • {editLotModal.treeSpecies}
                  </div>
                </div>
                <button onClick={() => setEditLotModal(null)} style={{ background: 'transparent', border: 'none', color: t.textSecondary, cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveEditLot}>
                {/* Photo Upload Box */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: t.textSecondary, marginBottom: '6px' }}>
                    Featured Timber Photograph
                  </label>
                  <input
                    type="file"
                    ref={editImgRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const b64 = await toBase64(file);
                        setEditForm((prev) => ({ ...prev, imageBase64: b64, imagePreview: b64 }));
                      }
                    }}
                  />
                  <div
                    onClick={() => editImgRef.current?.click()}
                    style={{
                      border: '2px dashed rgba(56, 189, 248, 0.4)',
                      borderRadius: '12px',
                      padding: '12px',
                      background: 'rgba(56, 189, 248, 0.04)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px'
                    }}
                  >
                    <div style={{ width: '80px', height: '70px', borderRadius: '8px', overflow: 'hidden', background: t.bgInput, border: `1px solid ${t.borderStrong}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {editForm.imagePreview ? (
                        <img src={editForm.imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Camera size={24} color="#0284c7" />
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Upload size={14} /> Click to Upload / Change Real Photo
                      </div>
                      <div style={{ fontSize: '11.5px', color: t.textMuted, marginTop: '2px' }}>
                        PNG, JPG, or WEBP from weighbridge depot
                      </div>
                      {editForm.imageBase64 && (
                        <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, marginTop: '2px' }}>
                          ✓ New custom image ready to upload
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Title */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Listing Title</label>
                  <input
                    type="text"
                    required
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Tree Species</label>
                    <input
                      type="text"
                      required
                      value={editForm.treeSpecies}
                      onChange={(e) => setEditForm({ ...editForm, treeSpecies: e.target.value })}
                      style={{ width: '100%', padding: '9px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Wood Grade</label>
                    <select
                      value={editForm.woodGrade}
                      onChange={(e) => setEditForm({ ...editForm, woodGrade: e.target.value })}
                      style={{ width: '100%', padding: '9px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                    >
                      <option value="Grade A Construction Hardwood">Grade A Construction Hardwood</option>
                      <option value="Grade B Furniture Wood">Grade B Furniture Wood</option>
                      <option value="Grade C Structural Framing">Grade C Structural Framing</option>
                      <option value="Grade D Firewood & Split Logs">Grade D Firewood & Split Logs</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Log Count</label>
                    <input
                      type="number"
                      value={editForm.logCount}
                      onChange={(e) => setEditForm({ ...editForm, logCount: Number(e.target.value) })}
                      style={{ width: '100%', padding: '8px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Weight (kg)</label>
                    <input
                      type="number"
                      value={editForm.totalWeightKg}
                      onChange={(e) => setEditForm({ ...editForm, totalWeightKg: Number(e.target.value) })}
                      style={{ width: '100%', padding: '8px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Avg Ø (cm)</label>
                    <input
                      type="number"
                      value={editForm.avgDiameterCm}
                      onChange={(e) => setEditForm({ ...editForm, avgDiameterCm: Number(e.target.value) })}
                      style={{ width: '100%', padding: '8px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Length (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editForm.avgLengthMeters}
                      onChange={(e) => setEditForm({ ...editForm, avgLengthMeters: Number(e.target.value) })}
                      style={{ width: '100%', padding: '8px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Starting Bid (₹)</label>
                    <input
                      type="number"
                      value={editForm.startingBidInr}
                      onChange={(e) => setEditForm({ ...editForm, startingBidInr: Number(e.target.value) })}
                      style={{ width: '100%', padding: '9px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: '#10b981', fontWeight: 700, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Reserve Price (₹)</label>
                    <input
                      type="number"
                      value={editForm.reservePriceInr}
                      onChange={(e) => setEditForm({ ...editForm, reservePriceInr: Number(e.target.value) })}
                      style={{ width: '100%', padding: '9px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: '#d97706', fontWeight: 700, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Auction Status</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      style={{ width: '100%', padding: '9px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                    >
                      <option value="Live Bidding">Live Bidding (ON)</option>
                      <option value="Paused / Off">Paused / Off</option>
                      <option value="Winner Declared & Certificate Issued">Winner Declared</option>
                      <option value="Sold & Gate-Pass Issued">Sold & Gate-Pass Issued</option>
                      <option value="Delivered & Dispatched">Delivered & Dispatched</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Storage Yard Depot</label>
                  <input
                    type="text"
                    value={editForm.storageYard}
                    onChange={(e) => setEditForm({ ...editForm, storageYard: e.target.value })}
                    style={{ width: '100%', padding: '9px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Inspection Notes</label>
                  <textarea
                    rows={2}
                    value={editForm.inspectionNotes}
                    onChange={(e) => setEditForm({ ...editForm, inspectionNotes: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={() => setEditLotModal(null)} style={{ flex: 1, padding: '11px', background: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9', border: 'none', borderRadius: '8px', color: t.textSecondary, cursor: 'pointer', fontWeight: 600 }}>
                    Cancel
                  </button>
                  <button type="submit" style={{ flex: 2, padding: '11px', background: '#0284c7', border: 'none', borderRadius: '8px', color: '#ffffff', fontWeight: 800, cursor: 'pointer' }}>
                    Save Changes & Update Photo
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL: DIRECT PUBLISH NEW TIMBER LOT ── */}
        {showDirectPublishModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
            <div style={{ background: t.modalBg, border: `1px solid ${isDark ? 'rgba(16, 185, 129, 0.3)' : '#a7f3d0'}`, borderRadius: '16px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: `1px solid ${t.border}`, paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                    <Gavel size={18} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: t.textPrimary }}>Publish New Timber Lot</h3>
                    <p style={{ margin: 0, fontSize: '12px', color: t.textSecondary }}>List verified hardwood logs for live municipal auction</p>
                  </div>
                </div>
                <button onClick={() => setShowDirectPublishModal(false)} style={{ background: 'transparent', border: 'none', color: t.textSecondary, cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleDirectPublish}>
                {/* Photo Upload Box */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: t.textSecondary, marginBottom: '6px' }}>
                    Timber Lot Photograph (Featured Image)
                  </label>
                  <input
                    type="file"
                    ref={directImgRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const b64 = await toBase64(file);
                        setDirectForm((prev) => ({ ...prev, imageBase64: b64, imagePreview: b64 }));
                      }
                    }}
                  />
                  <div
                    onClick={() => directImgRef.current?.click()}
                    style={{
                      border: '2px dashed rgba(16, 185, 129, 0.35)',
                      borderRadius: '12px',
                      padding: '12px',
                      background: 'rgba(16, 185, 129, 0.03)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px'
                    }}
                  >
                    <div style={{ width: '80px', height: '70px', borderRadius: '8px', overflow: 'hidden', background: t.bgInput, border: `1px solid ${t.borderStrong}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {directForm.imagePreview ? (
                        <img src={directForm.imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Camera size={24} color="#10b981" />
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Upload size={14} /> Click to Upload Real Timber Image
                      </div>
                      <div style={{ fontSize: '11.5px', color: t.textMuted, marginTop: '2px' }}>
                        PNG, JPG, or WEBP from weighbridge depot
                      </div>
                      {directForm.imageBase64 && (
                        <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, marginTop: '2px' }}>
                          ✓ Custom image selected for upload
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Title */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Listing Title</label>
                  <input
                    type="text"
                    required
                    value={directForm.title}
                    onChange={(e) => setDirectForm({ ...directForm, title: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Lot Number</label>
                    <input
                      type="text"
                      required
                      value={directForm.lotNumber}
                      onChange={(e) => setDirectForm({ ...directForm, lotNumber: e.target.value })}
                      style={{ width: '100%', padding: '9px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Tree Species</label>
                    <input
                      type="text"
                      required
                      value={directForm.treeSpecies}
                      onChange={(e) => setDirectForm({ ...directForm, treeSpecies: e.target.value })}
                      style={{ width: '100%', padding: '9px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Wood Grade</label>
                    <select
                      value={directForm.woodGrade}
                      onChange={(e) => setDirectForm({ ...directForm, woodGrade: e.target.value })}
                      style={{ width: '100%', padding: '9px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                    >
                      <option value="Grade A Construction Hardwood">Grade A Construction Hardwood</option>
                      <option value="Grade B Furniture Wood">Grade B Furniture Wood</option>
                      <option value="Grade C Structural Framing">Grade C Structural Framing</option>
                      <option value="Grade D Firewood & Split Logs">Grade D Firewood & Split Logs</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Auction Duration</label>
                    <select
                      value={directForm.auctionDurationHours}
                      onChange={(e) => setDirectForm({ ...directForm, auctionDurationHours: Number(e.target.value) })}
                      style={{ width: '100%', padding: '9px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                    >
                      <option value={24}>24 Hours (1 Day)</option>
                      <option value={48}>48 Hours (2 Days)</option>
                      <option value={72}>72 Hours (3 Days)</option>
                      <option value={168}>7 Days (1 Week)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Log Count</label>
                    <input
                      type="number"
                      value={directForm.logCount}
                      onChange={(e) => setDirectForm({ ...directForm, logCount: Number(e.target.value) })}
                      style={{ width: '100%', padding: '8px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Weight (kg)</label>
                    <input
                      type="number"
                      value={directForm.totalWeightKg}
                      onChange={(e) => setDirectForm({ ...directForm, totalWeightKg: Number(e.target.value) })}
                      style={{ width: '100%', padding: '8px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Avg Ø (cm)</label>
                    <input
                      type="number"
                      value={directForm.avgDiameterCm}
                      onChange={(e) => setDirectForm({ ...directForm, avgDiameterCm: Number(e.target.value) })}
                      style={{ width: '100%', padding: '8px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Length (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={directForm.avgLengthMeters}
                      onChange={(e) => setDirectForm({ ...directForm, avgLengthMeters: Number(e.target.value) })}
                      style={{ width: '100%', padding: '8px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Starting Base Bid (₹)</label>
                    <input
                      type="number"
                      value={directForm.startingBidInr}
                      onChange={(e) => setDirectForm({ ...directForm, startingBidInr: Number(e.target.value) })}
                      style={{ width: '100%', padding: '9px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: '#10b981', fontWeight: 700, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Reserve Price (₹)</label>
                    <input
                      type="number"
                      value={directForm.reservePriceInr}
                      onChange={(e) => setDirectForm({ ...directForm, reservePriceInr: Number(e.target.value) })}
                      style={{ width: '100%', padding: '9px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: '#d97706', fontWeight: 700, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Storage Yard Depot Location</label>
                  <input
                    type="text"
                    value={directForm.storageYard}
                    onChange={(e) => setDirectForm({ ...directForm, storageYard: e.target.value })}
                    style={{ width: '100%', padding: '9px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Inspection & Quality Notes</label>
                  <textarea
                    rows={2}
                    value={directForm.inspectionNotes}
                    onChange={(e) => setDirectForm({ ...directForm, inspectionNotes: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={() => setShowDirectPublishModal(false)} style={{ flex: 1, padding: '11px', background: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9', border: 'none', borderRadius: '8px', color: t.textSecondary, cursor: 'pointer', fontWeight: 600 }}>
                    Cancel
                  </button>
                  <button type="submit" style={{ flex: 2, padding: '11px', background: '#10b981', border: 'none', borderRadius: '8px', color: '#020617', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Gavel size={16} /> Publish to Live Auction
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL: BID LOGS ── */}
        {selectedLotBids && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
            <div style={{ background: t.modalBg, border: `1px solid ${t.modalBorder}`, borderRadius: '16px', width: '100%', maxWidth: '540px', padding: '24px', boxShadow: t.cardShadow }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: t.textPrimary }}>
                    Bid Log: {selectedLotBids.lotNumber}
                  </h3>
                  <div style={{ fontSize: '12px', color: t.textSecondary }}>{selectedLotBids.treeSpecies}</div>
                </div>
                <button onClick={() => setSelectedLotBids(null)} style={{ background: 'none', border: 'none', color: t.textSecondary, fontSize: '20px', cursor: 'pointer' }}>✕</button>
              </div>

              {loadingBids ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: t.textSecondary }}>Loading bid logs...</div>
              ) : bidsList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: t.textSecondary }}>No bids recorded for this lot yet.</div>
              ) : (
                <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                  {bidsList.map((b, i) => (
                    <div
                      key={b._id || i}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        background: i === 0 ? 'rgba(16, 185, 129, 0.15)' : (isDark ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc'),
                        border: i === 0 ? '1px solid #10b981' : `1px solid ${t.border}`,
                        marginBottom: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: t.textPrimary }}>{b.companyName || b.bidderName}</div>
                        <div style={{ fontSize: '11px', color: t.textSecondary }}>📞 {b.bidderPhone || 'N/A'} • {new Date(b.createdAt).toLocaleTimeString('en-IN')}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: '15px', color: i === 0 ? '#059669' : t.textPrimary }}>₹{Number(b.bidAmountInr || 0).toLocaleString('en-IN')}</div>
                        <div style={{ fontSize: '10px', color: i === 0 ? '#10b981' : t.textMuted }}>{i === 0 ? '🏆 HIGHEST' : 'OUTBID'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setSelectedLotBids(null)}
                style={{ width: '100%', padding: '12px', marginTop: '16px', background: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9', border: 'none', borderRadius: '10px', color: t.textPrimary, fontWeight: 600, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* ── MODAL: ALLOTMENT CERTIFICATE ── */}
        {certificateModalLot && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
            <div style={{ background: '#ffffff', color: '#0f172a', borderRadius: '16px', width: '100%', maxWidth: '640px', padding: '36px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', position: 'relative' }}>
              <button
                onClick={() => setCertificateModalLot(null)}
                style={{ position: 'absolute', right: '20px', top: '20px', background: 'none', border: 'none', fontSize: '20px', color: '#64748b', cursor: 'pointer' }}
              >
                ✕
              </button>

              <div style={{ border: '3px double #059669', padding: '24px', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', color: '#059669', fontWeight: 800, marginBottom: '4px' }}>
                  GOVERNMENT OF KARNATAKA • MUNICIPAL FORESTRY DESK
                </div>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '22px', fontWeight: 900, color: '#064e3b', letterSpacing: '-0.5px' }}>
                  TIMBER SALVAGE ALLOTMENT CERTIFICATE
                </h2>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '20px' }}>
                  Certificate No: <strong style={{ color: '#0f172a' }}>{certificateModalLot.allotmentCertificate?.certificateNumber || 'CERT-TMB-2026-001'}</strong>
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
                    <div><strong>Winning Bid:</strong> <span style={{ color: '#059669', fontWeight: 'bold' }}>₹{Number(certificateModalLot.allotmentCertificate?.winningBidAmountInr || certificateModalLot.currentHighestBidInr || 0).toLocaleString('en-IN')}</span></div>
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

        {/* ── MODAL: DISPATCH GATE RELEASE (Commented out) ──
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
                    onChange={(e) => setDispatchForm({ ...dispatchForm, vehicleNumber: e.target.value })}
                    style={{ width: '100%', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>Verifying Security Officer *</label>
                  <input
                    type="text"
                    required
                    value={dispatchForm.verifiedByGuard}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, verifiedByGuard: e.target.value })}
                    style={{ width: '100%', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>Weighbridge & Quality Notes</label>
                  <textarea
                    rows="2"
                    placeholder="e.g. All logs loaded, weigh-out confirmed."
                    value={dispatchForm.deliveryNotes}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, deliveryNotes: e.target.value })}
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
        */}

        {/* ── MODAL: VERIFY CUTTER INTAKE & PUBLISH ── */}
        {verifyingIntake && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px', overflowY: 'auto' }}>
            <div style={{ background: t.modalBg, border: `1px solid ${isDark ? 'rgba(16, 185, 129, 0.3)' : '#a7f3d0'}`, borderRadius: '16px', width: '100%', maxWidth: '720px', padding: '28px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: `1px solid ${t.border}`, paddingBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#0284c7', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Tree Cutter Waste Intake Verification • {verifyForm.shipmentId}
                  </div>
                  <h3 style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 800, color: t.textPrimary }}>
                    Verify Weighbridge & Launch Timber Auction
                  </h3>
                </div>
                <button
                  onClick={() => setVerifyingIntake(null)}
                  style={{ background: 'none', border: 'none', color: t.textSecondary, fontSize: '20px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ background: isDark ? 'rgba(56, 189, 248, 0.08)' : '#f0f9ff', border: `1px solid ${isDark ? 'rgba(56, 189, 248, 0.2)' : '#bae6fd'}`, borderRadius: '12px', padding: '12px 16px', marginBottom: '18px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: t.textPrimary }}>
                    🪓 Harvested by Arborist: <strong style={{ color: '#0284c7' }}>{verifyForm.cutterName}</strong>
                  </div>
                  <div style={{ fontSize: '11px', color: t.textSecondary, marginTop: '2px' }}>
                    📍 {verifyForm.originLocation}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', color: '#0284c7', fontWeight: 700 }}>
                    🚚 Vehicle: {verifyForm.vehicleNumber}
                  </div>
                  <div style={{ fontSize: '11px', color: t.textSecondary }}>
                    Yard: {verifyForm.storageYard}
                  </div>
                </div>
              </div>

              <form onSubmit={handlePublishFromIntake}>
                {/* Photo Upload Box */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: t.textSecondary, marginBottom: '6px' }}>
                    Timber Lot Photograph (Featured Image)
                  </label>
                  <input
                    type="file"
                    ref={verifyImgRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const b64 = await toBase64(file);
                        setVerifyForm((prev) => ({ ...prev, imageBase64: b64, imagePreview: b64 }));
                      }
                    }}
                  />
                  <div
                    onClick={() => verifyImgRef.current?.click()}
                    style={{
                      border: '2px dashed rgba(16, 185, 129, 0.35)',
                      borderRadius: '12px',
                      padding: '12px',
                      background: 'rgba(16, 185, 129, 0.03)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px'
                    }}
                  >
                    <div style={{ width: '80px', height: '70px', borderRadius: '8px', overflow: 'hidden', background: t.bgInput, border: `1px solid ${t.borderStrong}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {verifyForm.imagePreview ? (
                        <img src={verifyForm.imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Camera size={24} color="#10b981" />
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Upload size={14} /> Click to Upload Real Timber Image
                      </div>
                      <div style={{ fontSize: '11.5px', color: t.textMuted, marginTop: '2px' }}>
                        Photo from intake submission or weighbridge camera
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Auction Lot Title *</label>
                  <input
                    type="text"
                    required
                    value={verifyForm.title}
                    onChange={(e) => setVerifyForm({ ...verifyForm, title: e.target.value })}
                    style={{ width: '100%', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', padding: '9px 12px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Tree Species *</label>
                    <input
                      type="text"
                      required
                      value={verifyForm.treeSpecies}
                      onChange={(e) => setVerifyForm({ ...verifyForm, treeSpecies: e.target.value })}
                      style={{ width: '100%', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', padding: '9px 12px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Official Wood Grade *</label>
                    <select
                      value={verifyForm.woodGrade}
                      onChange={(e) => setVerifyForm({ ...verifyForm, woodGrade: e.target.value })}
                      style={{ width: '100%', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', padding: '9px 12px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
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
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Log Count</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={verifyForm.logCount}
                      onChange={(e) => setVerifyForm({ ...verifyForm, logCount: Number(e.target.value) })}
                      style={{ width: '100%', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', padding: '8px 10px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Weight (kg) *</label>
                    <input
                      type="number"
                      required
                      min="10"
                      value={verifyForm.totalWeightKg}
                      onChange={(e) => setVerifyForm({ ...verifyForm, totalWeightKg: Number(e.target.value) })}
                      style={{ width: '100%', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', padding: '8px 10px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Avg Ø (cm)</label>
                    <input
                      type="number"
                      value={verifyForm.avgDiameterCm}
                      onChange={(e) => setVerifyForm({ ...verifyForm, avgDiameterCm: Number(e.target.value) })}
                      style={{ width: '100%', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', padding: '8px 10px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Length (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={verifyForm.avgLengthMeters}
                      onChange={(e) => setVerifyForm({ ...verifyForm, avgLengthMeters: Number(e.target.value) })}
                      style={{ width: '100%', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', padding: '8px 10px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* Pricing & Duration */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Starting Bid (₹) *</label>
                    <input
                      type="number"
                      required
                      value={verifyForm.startingBidInr}
                      onChange={(e) => setVerifyForm({ ...verifyForm, startingBidInr: Number(e.target.value) })}
                      style={{ width: '100%', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', padding: '8px 10px', color: '#10b981', fontWeight: 700, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Reserve Price (₹) *</label>
                    <input
                      type="number"
                      required
                      value={verifyForm.reservePriceInr}
                      onChange={(e) => setVerifyForm({ ...verifyForm, reservePriceInr: Number(e.target.value) })}
                      style={{ width: '100%', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', padding: '8px 10px', color: '#d97706', fontWeight: 700, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Duration (Hours)</label>
                    <select
                      value={verifyForm.auctionDurationHours}
                      onChange={(e) => setVerifyForm({ ...verifyForm, auctionDurationHours: Number(e.target.value) })}
                      style={{ width: '100%', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', padding: '8px 10px', color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                    >
                      <option value="24">24 Hours (1 Day)</option>
                      <option value="48">48 Hours (2 Days)</option>
                      <option value="72">72 Hours (3 Days)</option>
                      <option value="168">7 Days (Full Week)</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: t.textSecondary, marginBottom: '4px' }}>Official Inspection & Compliance Notes</label>
                  <textarea
                    rows="2"
                    value={verifyForm.inspectionNotes}
                    onChange={(e) => setVerifyForm({ ...verifyForm, inspectionNotes: e.target.value })}
                    style={{ width: '100%', background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: '8px', padding: '8px 12px', color: t.textPrimary, fontSize: '12px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setVerifyingIntake(null)}
                    style={{ flex: 1, padding: '12px', borderRadius: '8px', background: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9', border: 'none', color: t.textSecondary, fontWeight: 600, cursor: 'pointer' }}
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
