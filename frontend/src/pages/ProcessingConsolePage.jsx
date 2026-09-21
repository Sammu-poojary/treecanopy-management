import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  Recycle,
  Layers,
  ShoppingBag,
  Gavel,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  QrCode,
  Truck,
  Leaf,
  Thermometer,
  Droplets,
  Package,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Check,
  X,
  Home,
  FileText,
  MapPin,
  ExternalLink,
  Lock
} from 'lucide-react';
import { Topbar, Sidebar } from './CanopyPages';

export default function ProcessingConsolePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Default to 'intake' so official immediately sees cutter submissions
  const [activeTab, setActiveTab] = useState('intake');
  const [intakes, setIntakes] = useState([]);
  const [batches, setBatches] = useState([]);
  const [products, setProducts] = useState([]);
  const [timberLots, setTimberLots] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters for Submissions
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Preview Proof Image Modal
  const [selectedProof, setSelectedProof] = useState(null);

  // Track per-intake routing state: { [intakeId]: { compostBatchId, timberLotId } }
  const [intakeRouting, setIntakeRouting] = useState({});

  // Package compost batch modal state
  const [packageCompostModal, setPackageCompostModal] = useState(null); // batch object

  // New Batch Modal State
  const [showNewBatchModal, setShowNewBatchModal] = useState(false);
  const [newBatchForm, setNewBatchForm] = useState({
    batchCode: `CMP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    location: 'Ajjarkadu Municipal Compost Center, Udupi',
    initialWeightKg: 650,
    foliageWeightKg: 450,
    woodchipsWeightKg: 200
  });

  // Advance Batch Modal
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [advanceForm, setAdvanceForm] = useState({
    nextStage: '',
    temperatureC: 58,
    moisturePercent: 55,
    notes: ''
  });

  // Package Batch Modal
  const [packageBatchModal, setPackageBatchModal] = useState(null);
  const [packageForm, setPackageForm] = useState({
    yieldKg: '',
    targetProductId: '',
    newStockQty: ''
  });

  // New Timber Lot Modal
  const [showNewLotModal, setShowNewLotModal] = useState(false);
  const [lotForm, setLotForm] = useState({
    lotNumber: `LOT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    species: 'Neem / Rosewood',
    logCount: 3,
    estimatedWeightKg: 650,
    averageDiameterCm: 45,
    approxLengthM: 3.0,
    reservePrice: 12000,
    bidIncrement: 500,
    yardLocation: 'Santhekatte Municipal Timber Depot, Udupi',
    description: 'Salvaged urban timber logs segregated from municipal tree clearances.'
  });

  // New Product Modal State
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    category: 'Organic Compost',
    description: '100% Recycled municipal tree biomass compost, aerated and microbially enriched.',
    unitSize: '5 kg Bag',
    weightKg: 5,
    priceInr: 99,
    priceEcoPoints: 40,
    stockQuantity: 50,
    imageUrl: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&auto=format&fit=crop&q=80',
    npkRatio: '2.5 : 1.4 : 1.9',
    usageInstructions: 'Mix 1 part compost with 3 parts soil or apply 2 inches around garden root zones.',
    benefits: '100% Organic & Recycled\nEnhances Soil Moisture Retention\nRich in Microbes & Humic Acid'
  });

  // Fetch all console data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [intakeRes, batchRes, prodRes, timberRes] = await Promise.all([
        fetch('http://localhost:5000/api/waste-intakes').catch(() => null),
        fetch('http://localhost:5000/api/compost-batches').catch(() => null),
        fetch('http://localhost:5000/api/eco-products').catch(() => null),
        fetch('http://localhost:5000/api/timber-auctions').catch(() => null)
      ]);

      let loadedIntakes = [];
      if (intakeRes && intakeRes.ok) {
        loadedIntakes = await intakeRes.json();
      }

      // Check local storage tasks for any submissions not yet in DB
      try {
        const localTasks = JSON.parse(localStorage.getItem('tasks') || '[]');
        const cutterTasks = JSON.parse(localStorage.getItem('cutter_tasks') || '[]');
        const allLocal = [...localTasks, ...cutterTasks];

        const localIntakes = allLocal
          .filter(t => t.wasteProofUrl || t.status === 'Waste Disposed' || t.status === 'Work Completed' || t.biomassSpecies)
          .map((t, idx) => ({
            _id: t._id || t.id || `local-${idx}`,
            shipmentId: `WST-2026-${String(idx + 101).padStart(4, '0')}`,
            workOrderTitle: t.title || 'Tree Maintenance & Clearance',
            cutterName: t.cutter || 'Field Cutter',
            disposalYard: t.dumpingLocation || 'Ajjarkadu Municipal Compost Center, Udupi',
            vehicleNumber: t.vehicleNumber || 'KA-20-TR-4821',
            vehicleType: t.vehicleType || 'Mini Tipper Truck',
            biomass: {
              leavesWeightKg: Number(t.biomassLeavesKg || 120),
              branchesWeightKg: Number(t.biomassBranchesKg || 180),
              logsCount: Number(t.biomassLogCount || 2),
              logsWeightKg: Number(t.biomassLogsKg || 400),
              treeSpecies: t.biomassSpecies || t.treeSpecies || 'Neem / Rosewood',
              approxLogDiameterCm: Number(t.biomassDiameterCm || 35),
              approxLogLengthMeters: 2.5,
              isDiseased: Boolean(t.isDiseasedBiomass)
            },
            proofImageUrl: t.wasteProofUrl || t.afterImageUrl || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop&q=80',
            gpsLocation: t.wasteGps || { lat: '13.3409', lng: '74.7421', address: t.dumpingLocation || 'Udupi' },
            status: t.intakeVerified ? 'Verified' : 'Delivered',
            allocatedStream: Number(t.biomassLogsKg || 0) > 200 ? 'Timber Auction' : 'Composting',
            deliveredAt: t.reachedAt || new Date().toISOString()
          }));

        // Merge without duplicating IDs or titles
        const existingIds = new Set(loadedIntakes.map(i => String(i.complaintId || i._id || '')));
        const newOnes = localIntakes.filter(li => !existingIds.has(String(li._id)));
        loadedIntakes = [...loadedIntakes, ...newOnes];
      } catch (e) {
        console.warn('Local tasks intake sync notice:', e);
      }

      setIntakes(loadedIntakes);
      if (batchRes && batchRes.ok) setBatches(await batchRes.json());
      if (prodRes && prodRes.ok) setProducts(await prodRes.json());
      if (timberRes && timberRes.ok) setTimberLots(await timberRes.json());
    } catch (e) {
      console.error('Failed to load processing console data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handler: Verify Intake
  const handleVerifyIntake = async (intake) => {
    const { value: notes } = await Swal.fire({
      title: `Verify Shipment ${intake.shipmentId || ''}?`,
      html: `
        <div style="text-align: left; font-size: 13px; color: #475569;">
          <p><strong>Cutter:</strong> ${intake.cutterName || 'Field Cutter'}</p>
          <p><strong>Vehicle:</strong> ${intake.vehicleNumber || 'KA-20-TR-4821'} (${intake.vehicleType || 'Tipper'})</p>
          <p><strong>Leaves:</strong> ${intake.biomass?.leavesWeightKg || intake.foliageWeightKg || 0} kg | <strong>Branches:</strong> ${intake.biomass?.branchesWeightKg || intake.branchWeightKg || 0} kg</p>
          <p><strong>Timber:</strong> ${intake.biomass?.logsCount || 0} logs (${intake.biomass?.treeSpecies || 'Mixed'}) ~ ${intake.biomass?.logsWeightKg || 0} kg</p>
        </div>
      `,
      input: 'text',
      inputLabel: 'Official Verification Notes (Optional)',
      inputPlaceholder: 'e.g. Weighbridge load verified and logged at Bay #2',
      showCancelButton: true,
      confirmButtonText: '✓ Verify & Accept Load',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b'
    });

    if (notes !== undefined) {
      try {
        if (intake._id && !String(intake._id).startsWith('local-')) {
          await fetch(`http://localhost:5000/api/waste-intakes/${intake._id}/verify`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 'Verified',
              verifiedByName: 'Official Verifier',
              verificationNotes: notes || 'Weighbridge inspection passed'
            })
          });
        }

        // Update local state
        setIntakes(prev => prev.map(i => i._id === intake._id ? { ...i, status: 'Verified', verificationNotes: notes } : i));

        Swal.fire({
          icon: 'success',
          title: 'Shipment Verified! ✓',
          text: `Intake ${intake.shipmentId || ''} marked as verified and accepted into the processing yard.`,
          timer: 2000,
          showConfirmButton: false
        });
      } catch (err) {
        Swal.fire('Error', err.message, 'error');
      }
    }
  };

  // Handler: Quick Route to Timber Lot
  const handleRouteToTimber = (intake) => {
    const isVerified = (intake.status || '').toLowerCase() === 'verified';
    if (!isVerified) {
      Swal.fire({
        icon: 'warning',
        title: 'Weighbridge Verification Required ⚠️',
        text: 'You must first "Verify & Accept Load" to confirm weighbridge inspection and custody before publishing hardwood logs to municipal auction.',
        confirmButtonText: 'Verify Load Now',
        confirmButtonColor: '#10b981',
        showCancelButton: true,
        cancelButtonText: 'Cancel'
      }).then((result) => {
        if (result.isConfirmed) {
          handleVerifyIntake(intake);
        }
      });
      return;
    }

    if (intake.biomass?.isDiseased) {
      Swal.fire({
        icon: 'error',
        title: 'Bio-Quarantine Restriction ☣️',
        text: 'This load is flagged as diseased/pest-infested wood and cannot be auctioned. It is routed for bio-containment & controlled incineration.',
        confirmButtonColor: '#ef4444'
      });
      return;
    }

    setLotForm({
      lotNumber: `LOT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      species: intake.biomass?.treeSpecies || 'Neem / Rosewood',
      logCount: Number(intake.biomass?.logsCount || 2),
      estimatedWeightKg: Number(intake.biomass?.logsWeightKg || 450),
      averageDiameterCm: Number(intake.biomass?.approxLogDiameterCm || 40),
      approxLengthM: 3.0,
      reservePrice: Math.round(Number(intake.biomass?.logsWeightKg || 450) * 25),
      bidIncrement: 500,
      yardLocation: intake.disposalYard || 'Santhekatte Municipal Timber Depot, Udupi',
      description: `Salvaged ${intake.biomass?.treeSpecies || 'hardwood'} logs received from Cutter ${intake.cutterName || ''} (${intake.workOrderTitle || ''}).`
    });
    setShowNewLotModal(true);
  };

  // Handler: Quick Route to Compost
  const handleRouteToCompost = (intake) => {
    const isVerified = (intake.status || '').toLowerCase() === 'verified';
    if (!isVerified) {
      Swal.fire({
        icon: 'warning',
        title: 'Weighbridge Verification Required ⚠️',
        text: 'You must first "Verify & Accept Load" to confirm biomass weight before allocating foliage into active compost beds.',
        confirmButtonText: 'Verify Load Now',
        confirmButtonColor: '#10b981',
        showCancelButton: true,
        cancelButtonText: 'Cancel'
      }).then((result) => {
        if (result.isConfirmed) {
          handleVerifyIntake(intake);
        }
      });
      return;
    }

    if (intake.biomass?.isDiseased) {
      Swal.fire({
        icon: 'error',
        title: 'Bio-Quarantine Restriction ☣️',
        text: 'Diseased biomass cannot be used for citizen organic compost. Routed for controlled municipal incineration.',
        confirmButtonColor: '#ef4444'
      });
      return;
    }

    const leaves = Number(intake.biomass?.leavesWeightKg || 150);
    const branches = Number(intake.biomass?.branchesWeightKg || 200);
    const batchCode = `CMP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    setNewBatchForm({
      batchCode,
      location: intake.disposalYard || 'Ajjarkadu Municipal Compost Center, Udupi',
      initialWeightKg: leaves + branches,
      foliageWeightKg: leaves,
      woodchipsWeightKg: branches,
      _sourceIntakeId: intake._id  // track which intake this is from
    });
    setShowNewBatchModal(true);
  };

  // Handler: Create Timber Lot
  const handleCreateTimberLot = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/timber-auctions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lotForm)
      });
      if (!res.ok) throw new Error('Failed to publish timber lot');

      Swal.fire({
        icon: 'success',
        title: 'Timber Lot Published! 🪵',
        text: `${lotForm.lotNumber} (${lotForm.species}) is now live for municipal auction.`,
        confirmButtonColor: '#10b981'
      });
      setShowNewLotModal(false);
      fetchData();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
  };

  // Handler: Create New Batch
  const handleCreateBatch = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...newBatchForm };
      const sourceIntakeId = payload._sourceIntakeId;
      delete payload._sourceIntakeId;

      const res = await fetch('http://localhost:5000/api/compost-batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to create new compost batch');
      const created = await res.json().catch(() => null);

      // Link this batch back to the intake so we can show the inline status panel
      if (sourceIntakeId) {
        setIntakeRouting(prev => ({
          ...prev,
          [sourceIntakeId]: {
            ...(prev[sourceIntakeId] || {}),
            compostBatchId: created?._id || created?.id || payload.batchCode,
            compostBatchCode: payload.batchCode,
            compostLocation: payload.location,
            compostWeightKg: payload.initialWeightKg,
            compostRoutedAt: new Date().toISOString()
          }
        }));
      }

      Swal.fire({
        icon: 'success',
        title: 'Compost Batch Started! 🍂',
        text: `Batch ${payload.batchCode} is now active at ${payload.location}. You can track its progress in the Compost Beds tab.`,
        confirmButtonColor: '#10b981'
      });
      setShowNewBatchModal(false);
      fetchData();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
  };

  // Handler: Advance Batch Stage
  const handleAdvanceStage = async () => {
    if (!selectedBatch) return;
    try {
      const res = await fetch(`http://localhost:5000/api/compost-batches/${selectedBatch._id}/advance-stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(advanceForm)
      });
      if (!res.ok) throw new Error('Failed to update maturation stage');

      Swal.fire({
        icon: 'success',
        title: 'Batch Stage Updated',
        text: `${selectedBatch.batchCode} advanced to ${advanceForm.nextStage}`,
        timer: 2000,
        showConfirmButton: false
      });
      setSelectedBatch(null);
      fetchData();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
  };

  // Handler: Package mature batch into Green Store
  const handlePackageYield = async () => {
    if (!packageBatchModal) return;
    try {
      const res = await fetch(`http://localhost:5000/api/compost-batches/${packageBatchModal._id}/package-yield`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          yieldKg: Number(packageForm.yieldKg),
          targetProductId: packageForm.targetProductId,
          addedStock: Number(packageForm.newStockQty)
        })
      });
      if (!res.ok) throw new Error('Failed to package batch');

      Swal.fire({
        icon: 'success',
        title: 'Compost Packaged & Transferred! 🌿',
        text: `Yield of ${packageForm.yieldKg} kg successfully stocked into Citizen Green Store catalog.`,
        confirmButtonColor: '#10b981'
      });
      setPackageBatchModal(null);
      fetchData();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
  };

  // Handler: Add New Product
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: newProductForm.name,
        category: newProductForm.category,
        description: newProductForm.description,
        unitSize: newProductForm.unitSize,
        weightKg: Number(newProductForm.weightKg || 5),
        priceInr: Number(newProductForm.priceInr || 99),
        priceEcoPoints: Number(newProductForm.priceEcoPoints || 40),
        stockQuantity: Number(newProductForm.stockQuantity || 50),
        npkRatio: newProductForm.npkRatio,
        usageInstructions: newProductForm.usageInstructions,
        benefits: typeof newProductForm.benefits === 'string'
          ? newProductForm.benefits.split('\n').filter(Boolean)
          : newProductForm.benefits
      };

      if (newProductForm.imageUrl) {
        payload.image = newProductForm.imageUrl;
      }

      const res = await fetch('http://localhost:5000/api/eco-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to create new product');

      Swal.fire({
        icon: 'success',
        title: 'Product Added! 🌿',
        text: `${newProductForm.name} is now live in the Citizen Green Store.`,
        confirmButtonColor: '#10b981'
      });
      setShowNewProductModal(false);
      setNewProductForm({
        name: '',
        category: 'Organic Compost',
        description: '100% Recycled municipal tree biomass compost, aerated and microbially enriched.',
        unitSize: '5 kg Bag',
        weightKg: 5,
        priceInr: 99,
        priceEcoPoints: 40,
        stockQuantity: 50,
        imageUrl: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&auto=format&fit=crop&q=80',
        npkRatio: '2.5 : 1.4 : 1.9',
        usageInstructions: 'Mix 1 part compost with 3 parts soil or apply 2 inches around garden root zones.',
        benefits: '100% Organic & Recycled\nEnhances Soil Moisture Retention\nRich in Microbes & Humic Acid'
      });
      fetchData();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
  };

  // Handler: Quick Stock Update
  const handleAdjustStock = async (productId, currentStock, delta) => {
    const newStock = Math.max(0, currentStock + delta);
    try {
      await fetch(`http://localhost:5000/api/eco-products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockQuantity: newStock })
      });
      fetchData();
    } catch (e) {
      console.error('Failed to update stock:', e);
    }
  };

  // Handler: Delete Product
  const handleDeleteProduct = async (productId, name) => {
    const result = await Swal.fire({
      title: `Remove "${name}"?`,
      text: 'This will remove the product from the Citizen Green Store.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete product'
    });
    if (result.isConfirmed) {
      try {
        await fetch(`http://localhost:5000/api/eco-products/${productId}`, { method: 'DELETE' });
        Swal.fire('Deleted!', 'Product removed from store catalog.', 'success');
        fetchData();
      } catch (err) {
        Swal.fire('Error', err.message, 'error');
      }
    }
  };

  // Compute Aggregate Stats
  const totalLeavesKg = intakes.reduce((acc, i) => acc + Number(i.biomass?.leavesWeightKg || i.foliageWeightKg || 0), 0);
  const totalBranchesKg = intakes.reduce((acc, i) => acc + Number(i.biomass?.branchesWeightKg || i.branchWeightKg || 0), 0);
  const totalTimberLogsCount = intakes.reduce((acc, i) => acc + Number(i.biomass?.logsCount || i.timberLogs?.logCount || 0), 0);
  const totalTimberKg = intakes.reduce((acc, i) => acc + Number(i.biomass?.logsWeightKg || i.timberLogs?.weightKg || 0), 0);
  const totalBiomassIntake = totalLeavesKg + totalBranchesKg + totalTimberKg;
  const pendingIntakesCount = intakes.filter(i => (i.status || 'Delivered').toLowerCase() !== 'verified').length;

  // Filter Submissions
  const filteredIntakes = intakes.filter(i => {
    const matchSearch =
      (i.cutterName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (i.workOrderTitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (i.vehicleNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (i.disposalYard || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (i.biomass?.treeSpecies || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchSearch) return false;

    if (statusFilter === 'PENDING') return (i.status || 'Delivered').toLowerCase() !== 'verified';
    if (statusFilter === 'VERIFIED') return (i.status || '').toLowerCase() === 'verified';
    if (statusFilter === 'DISEASED') return Boolean(i.biomass?.isDiseased);

    return true;
  });

  return (
    <div className="cg-app">
      <Sidebar active="Biomass & Processing" isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
      <div className="cg-workspace" style={{ background: '#0b1120', minHeight: '100vh' }}>
        <Topbar title="Official Waste & Timber Verification Desk" onToggleSidebar={() => setSidebarOpen(true)} />

        {/* Header Banner */}
        <div style={{
          background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.15) 0%, rgba(11, 17, 32, 0.95) 100%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '24px 24px 18px'
        }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '999px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>
                  <ShieldCheck size={14} /> Official Municipal Yard & Verification Console
                </div>
                <h1 style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.5px', color: '#f8fafc' }}>
                  Tree Waste & Timber Verification
                </h1>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '13.5px', maxWidth: '720px' }}>
                  Verify green leaves, twigs, and heavy timber logs submitted by field tree cutters. Confirm weighbridge intake, inspect GPS-tagged photos, and route logs to timber auction or compost processing.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={fetchData}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#f8fafc',
                    padding: '9px 16px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh Data
                </button>
              </div>
            </div>

            {/* Simple, Clear Summary Metric Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '14px',
              marginTop: '20px'
            }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '14px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11.5px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Total Deliveries</span>
                  <Truck size={16} color="#38bdf8" />
                </div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#f8fafc', marginTop: '4px' }}>
                  {intakes.length} <span style={{ fontSize: '12px', color: '#64748b' }}>shipments</span>
                </div>
                <div style={{ fontSize: '11px', color: pendingIntakesCount > 0 ? '#fbbf24' : '#34d399', marginTop: '2px', fontWeight: 600 }}>
                  {pendingIntakesCount > 0 ? `⏳ ${pendingIntakesCount} pending review` : '✓ All verified'}
                </div>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '14px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11.5px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>🍃 Leaves & Foliage</span>
                  <Leaf size={16} color="#10b981" />
                </div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
                  {totalLeavesKg.toLocaleString('en-IN')} <span style={{ fontSize: '12px', color: '#64748b' }}>kg</span>
                </div>
                <div style={{ fontSize: '11px', color: '#34d399', marginTop: '2px' }}>→ Routed for Organic Compost</div>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '14px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11.5px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>🌿 Branches & Twigs</span>
                  <Layers size={16} color="#60a5fa" />
                </div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#60a5fa', marginTop: '4px' }}>
                  {totalBranchesKg.toLocaleString('en-IN')} <span style={{ fontSize: '12px', color: '#64748b' }}>kg</span>
                </div>
                <div style={{ fontSize: '11px', color: '#93c5fd', marginTop: '2px' }}>→ Routed for Wood Mulch</div>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '14px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11.5px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>🪵 Heavy Timber Logs</span>
                  <Gavel size={16} color="#f59e0b" />
                </div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
                  {totalTimberLogsCount} <span style={{ fontSize: '12px', color: '#64748b' }}>logs</span> ({totalTimberKg.toLocaleString('en-IN')} kg)
                </div>
                <div style={{ fontSize: '11px', color: '#fbbf24', marginTop: '2px' }}>→ For Municipal Auction</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 24px 64px' }}>
          {/* Simple Tab Bar */}
          <div style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            paddingBottom: '12px',
            marginBottom: '24px',
            overflowX: 'auto'
          }}>
            {[
              { id: 'intake', label: '🚚 Tree Cutter Submissions & Verification', count: intakes.length, badgeColor: '#38bdf8' },
              { id: 'timber', label: '🪵 Timber Lots for Auction', count: timberLots.length, badgeColor: '#f59e0b' },
              { id: 'compost', label: '🍂 Compost & Chipping Batches', count: batches.length, badgeColor: '#10b981' },
              { id: 'store', label: '🌿 Citizen Green Store', count: products.length, badgeColor: '#34d399' }
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: isActive ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                    background: isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    color: isActive ? '#34d399' : '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {tab.label}
                  {tab.count !== undefined && (
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: 800,
                      background: isActive ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
                      color: isActive ? '#ffffff' : '#cbd5e1'
                    }}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* TAB 1: TREE CUTTER SUBMISSIONS (PRIMARY VERIFICATION TAB) */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'intake' && (
            <div>
              {/* Filter and Search Bar */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '20px',
                background: 'rgba(15, 23, 42, 0.6)',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1', minWidth: '240px' }}>
                  <Search size={16} color="#94a3b8" />
                  <input
                    type="text"
                    placeholder="Search by Cutter name, Tree species, Vehicle, or Yard..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      color: '#f8fafc',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'ALL', label: 'All Submissions' },
                    { id: 'PENDING', label: '⏳ Pending Verification' },
                    { id: 'VERIFIED', label: '✓ Verified' },
                    { id: 'DISEASED', label: '☣️ Quarantine' }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setStatusFilter(f.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: statusFilter === f.id ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                        background: statusFilter === f.id ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                        color: statusFilter === f.id ? '#38bdf8' : '#94a3b8'
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredIntakes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '16px', border: '1px dashed rgba(255, 255, 255, 0.1)' }}>
                  <Truck size={42} color="#64748b" style={{ marginBottom: '12px' }} />
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#f8fafc' }}>No Submissions Match Your Criteria</h4>
                  <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
                    When tree cutters complete tasks and submit biomass & timber, their submissions will appear here.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {filteredIntakes.map(item => {
                    const leavesKg = Number(item.biomass?.leavesWeightKg || item.foliageWeightKg || 0);
                    const branchesKg = Number(item.biomass?.branchesWeightKg || item.branchWeightKg || 0);
                    const logCount = Number(item.biomass?.logsCount || item.timberLogs?.logCount || 0);
                    const logsKg = Number(item.biomass?.logsWeightKg || item.timberLogs?.weightKg || 0);
                    const species = item.biomass?.treeSpecies || item.timberLogs?.species || 'Mixed Municipal Species';
                    const avgDiameter = item.biomass?.approxLogDiameterCm || item.timberLogs?.averageDiameterCm || 35;
                    const isDiseased = Boolean(item.biomass?.isDiseased);
                    const isVerified = (item.status || '').toLowerCase() === 'verified';
                    const photoUrl = item.proofImageUrl || item.proofImageBase64 || '';
                    const totalKg = leavesKg + branchesKg + logsKg;

                    // Routing info for this intake
                    const routing = intakeRouting[item._id] || {};
                    const isRoutedToCompost = Boolean(routing.compostBatchCode);
                    const isRoutedToTimber = Boolean(routing.timberLotNumber);

                    // Find linked compost batch (if routed)
                    const linkedBatch = isRoutedToCompost
                      ? batches.find(b => b._id === routing.compostBatchId || b.batchCode === routing.compostBatchCode) || null
                      : null;
                    const batchIsReady = linkedBatch && (
                      linkedBatch.currentStage === 'READY_FOR_PACKAGING' ||
                      (linkedBatch.maturationProgress || 0) >= 100
                    );
                    const batchProgress = linkedBatch ? (linkedBatch.maturationProgress || 50) : 0;
                    const batchStage = linkedBatch ? (linkedBatch.currentStage || 'ACTIVE').replace(/_/g, ' ') : '';


                    return (
                      <div
                        key={item._id || item.shipmentId}
                        style={{
                          background: 'rgba(15, 23, 42, 0.85)',
                          borderRadius: '14px',
                          border: isDiseased ? '1px solid rgba(239, 68, 68, 0.4)' : isVerified ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                          padding: '18px 20px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '14px'
                        }}
                      >
                        {/* Card Header: Who, When, Where, and Status */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '10px',
                              background: 'rgba(56, 189, 248, 0.15)',
                              border: '1px solid rgba(56, 189, 248, 0.3)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#38bdf8',
                              fontWeight: 800,
                              fontSize: '18px'
                            }}>
                              🪵
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '15px', fontWeight: 800, color: '#f8fafc' }}>
                                  {item.workOrderTitle || 'Tree Clearance & Pruning Task'}
                                </span>
                                <span style={{ fontSize: '11px', color: '#64748b', background: 'rgba(255, 255, 255, 0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                                  {item.shipmentId || 'WST-2026'}
                                </span>
                              </div>
                              <div style={{ fontSize: '12.5px', color: '#94a3b8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span>Submitted by <strong style={{ color: '#38bdf8' }}>{item.cutterName || 'Field Cutter'}</strong></span>
                                <span>•</span>
                                <span>🚗 <strong style={{ color: '#f8fafc' }}>{item.vehicleNumber || 'KA-20-TR-4821'}</strong> ({item.vehicleType || 'Tipper Truck'})</span>
                                <span>•</span>
                                <span>🕒 {item.deliveredAt ? new Date(item.deliveredAt).toLocaleString('en-IN') : 'Just now'}</span>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isDiseased && (
                              <span style={{
                                padding: '4px 10px',
                                borderRadius: '999px',
                                fontSize: '11px',
                                fontWeight: 700,
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#f87171',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                ☣️ Bio-Quarantine Wood
                              </span>
                            )}
                            <span style={{
                              padding: '4px 12px',
                              borderRadius: '999px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              background: isVerified ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                              border: isVerified ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                              color: isVerified ? '#34d399' : '#fbbf24',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              {isVerified ? '✓ Verified by Official' : '⏳ Pending Weighbridge Verification'}
                            </span>
                          </div>
                        </div>

                        {/* Breakdown Grid: What was submitted */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                          gap: '12px',
                          background: 'rgba(2, 6, 23, 0.5)',
                          padding: '14px',
                          borderRadius: '10px',
                          border: '1px solid rgba(255, 255, 255, 0.05)'
                        }}>
                          {/* Green Leaves */}
                          <div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              🍃 Green Leaves & Foliage
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                              {leavesKg} kg
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>Destination: Organic Compost</div>
                          </div>

                          {/* Branches & Twigs */}
                          <div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              🌿 Branches & Twigs
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: 800, color: '#60a5fa', marginTop: '2px' }}>
                              {branchesKg} kg
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>Destination: Wood Chipping / Mulch</div>
                          </div>

                          {/* Heavy Timber Logs */}
                          <div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              🪵 Heavy Timber Logs
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: 800, color: '#f59e0b', marginTop: '2px' }}>
                              {logCount > 0 ? `${logCount} logs (${logsKg} kg)` : 'None'}
                            </div>
                            <div style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 600 }}>
                              Species: <strong style={{ color: '#f8fafc' }}>{species}</strong> {avgDiameter ? `• Ø${avgDiameter}cm` : ''}
                            </div>
                          </div>

                          {/* Destination Yard & Geotag */}
                          <div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              📍 Receiving Yard
                            </div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>
                              {item.disposalYard || 'Central Municipal Yard'}
                            </div>
                            <div style={{ fontSize: '11px', color: '#38bdf8' }}>
                              GPS: {item.gpsLocation?.lat ? `${item.gpsLocation.lat}, ${item.gpsLocation.lng}` : 'Logged'}
                            </div>
                          </div>
                        </div>

                        {/* Card Footer: Proof Photo Preview & Action Buttons */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', paddingTop: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {photoUrl ? (
                              <button
                                onClick={() => setSelectedProof(item)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  background: 'rgba(255, 255, 255, 0.06)',
                                  border: '1px solid rgba(255, 255, 255, 0.15)',
                                  color: '#f8fafc',
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                <Eye size={14} color="#38bdf8" /> View Geotagged Disposal Proof
                              </button>
                            ) : (
                              <span style={{ fontSize: '12px', color: '#64748b' }}>No photo proof attached</span>
                            )}

                            {item.verificationNotes && (
                              <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                                Note: "{item.verificationNotes}"
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                            {!isVerified ? (
                              /* ── BEFORE VERIFICATION ── */
                              <button
                                onClick={() => handleVerifyIntake(item)}
                                style={{
                                  background: '#10b981', color: '#ffffff', border: 'none',
                                  borderRadius: '8px', padding: '8px 16px', fontSize: '13px',
                                  fontWeight: 700, cursor: 'pointer', display: 'flex',
                                  alignItems: 'center', gap: '6px',
                                  boxShadow: '0 2px 10px rgba(16, 185, 129, 0.35)'
                                }}
                              >
                                <Check size={15} /> Verify & Accept Load
                              </button>
                            ) : isDiseased ? (
                              /* ── DISEASED: quarantine only ── */
                              <span style={{
                                padding: '6px 12px', borderRadius: '8px', fontSize: '12px',
                                fontWeight: 700, background: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171',
                                display: 'flex', alignItems: 'center', gap: '6px'
                              }}>
                                ☣️ Routed for Bio-Incineration & Quarantine
                              </span>
                            ) : (
                              /* ── AFTER VERIFICATION: routing actions ── */
                              <>
                                {/* Timber button — show only if not yet routed or always available */}
                                {logCount > 0 && (
                                  <button
                                    onClick={() => handleRouteToTimber(item)}
                                    style={{
                                      background: 'rgba(245, 158, 11, 0.2)',
                                      border: '1px solid rgba(245, 158, 11, 0.5)',
                                      color: '#f59e0b', borderRadius: '8px',
                                      padding: '7px 14px', fontSize: '12.5px', fontWeight: 700,
                                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                                    }}
                                  >
                                    <Gavel size={14} /> Move to Timber Auction
                                  </button>
                                )}

                                {/* Compost button — blocked once routed */}
                                {(leavesKg > 0 || branchesKg > 0) && (
                                  !isRoutedToCompost ? (
                                    <button
                                      onClick={() => handleRouteToCompost(item)}
                                      style={{
                                        background: 'rgba(16, 185, 129, 0.2)',
                                        border: '1px solid rgba(16, 185, 129, 0.5)',
                                        color: '#34d399', borderRadius: '8px',
                                        padding: '7px 14px', fontSize: '12.5px', fontWeight: 700,
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                                      }}
                                    >
                                      <Leaf size={14} /> Move to Compost Bed
                                    </button>
                                  ) : (
                                    <span style={{
                                      padding: '6px 12px', borderRadius: '8px', fontSize: '12px',
                                      fontWeight: 700, background: 'rgba(16, 185, 129, 0.1)',
                                      border: '1px dashed rgba(16, 185, 129, 0.35)', color: '#34d399',
                                      display: 'flex', alignItems: 'center', gap: '6px'
                                    }}>
                                      <Leaf size={13} /> Routed to Compost Bed
                                    </span>
                                  )
                                )}
                              </>
                            )}
                          </div>

                          {/* ── INLINE COMPOST BATCH STATUS PANEL (shows after routing) ── */}
                          {isRoutedToCompost && (
                            <div style={{
                              marginTop: '4px',
                              background: batchIsReady
                                ? 'rgba(16, 185, 129, 0.12)'
                                : 'rgba(2, 6, 23, 0.6)',
                              border: batchIsReady
                                ? '1px solid rgba(16, 185, 129, 0.4)'
                                : '1px dashed rgba(255, 255, 255, 0.1)',
                              borderRadius: '10px',
                              padding: '12px 16px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '14px' }}>🍂</span>
                                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                                    Compost Batch: <span style={{ color: '#34d399' }}>{routing.compostBatchCode}</span>
                                  </span>
                                  <span style={{
                                    padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                                    background: batchIsReady ? '#10b981' : 'rgba(245, 158, 11, 0.2)',
                                    color: batchIsReady ? '#fff' : '#fbbf24'
                                  }}>
                                    {batchIsReady ? '✓ READY TO PACKAGE' : (linkedBatch ? batchStage : 'INITIALIZING')}
                                  </span>
                                </div>

                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  {/* Refresh to check latest batch status */}
                                  <button
                                    onClick={fetchData}
                                    style={{
                                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                                      color: '#94a3b8', borderRadius: '6px', padding: '4px 10px',
                                      fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                                      display: 'flex', alignItems: 'center', gap: '4px'
                                    }}
                                  >
                                    <RefreshCw size={11} /> Refresh Status
                                  </button>

                                  {/* Package for Store — only visible when batch is READY */}
                                  {batchIsReady && (
                                    <button
                                      onClick={() => {
                                        setPackageBatchModal(linkedBatch);
                                        setPackageForm({
                                          yieldKg: Math.round((linkedBatch.initialWeightKg || routing.compostWeightKg || 300) * 0.45),
                                          targetProductId: products[0]?._id || '',
                                          newStockQty: 25
                                        });
                                      }}
                                      style={{
                                        background: '#10b981', border: 'none', color: '#ffffff',
                                        borderRadius: '8px', padding: '6px 14px',
                                        fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                                        animation: 'pulse 2s infinite'
                                      }}
                                    >
                                      <Package size={13} /> Package for Citizen Store →
                                    </button>
                                  )}

                                  {/* If batch exists but not ready, show navigate to compost tab */}
                                  {!batchIsReady && (
                                    <button
                                      onClick={() => setActiveTab('compost')}
                                      style={{
                                        background: 'rgba(16, 185, 129, 0.15)',
                                        border: '1px solid rgba(16, 185, 129, 0.3)',
                                        color: '#34d399', borderRadius: '6px',
                                        padding: '4px 12px', fontSize: '11px',
                                        fontWeight: 600, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '4px'
                                      }}
                                    >
                                      <Leaf size={11} /> View in Compost Beds →
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Batch progress metrics */}
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                                <div>
                                  <div style={{ fontSize: '10.5px', color: '#94a3b8', marginBottom: '2px' }}>Batch Location</div>
                                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}>{routing.compostLocation || 'Municipal Compost Yard'}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '10.5px', color: '#94a3b8', marginBottom: '2px' }}>Total Biomass</div>
                                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>{routing.compostWeightKg || (leavesKg + branchesKg)} kg</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '10.5px', color: '#94a3b8', marginBottom: '2px' }}>Est. Compost Yield</div>
                                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24' }}>~{Math.round((routing.compostWeightKg || (leavesKg + branchesKg)) * 0.45)} kg</div>
                                </div>
                                {linkedBatch && (
                                  <>
                                    <div>
                                      <div style={{ fontSize: '10.5px', color: '#94a3b8', marginBottom: '2px' }}>Temperature</div>
                                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#f87171' }}>{linkedBatch.temperatureC || 58}°C</div>
                                    </div>
                                    <div>
                                      <div style={{ fontSize: '10.5px', color: '#94a3b8', marginBottom: '2px' }}>Moisture</div>
                                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8' }}>{linkedBatch.moisturePercent || 55}%</div>
                                    </div>
                                  </>
                                )}
                                <div>
                                  <div style={{ fontSize: '10.5px', color: '#94a3b8', marginBottom: '2px' }}>Routed</div>
                                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>
                                    {routing.compostRoutedAt ? new Date(routing.compostRoutedAt).toLocaleTimeString('en-IN') : 'Just now'}
                                  </div>
                                </div>
                              </div>

                              {!batchIsReady && !linkedBatch && (
                                <div style={{ marginTop: '8px', fontSize: '11.5px', color: '#94a3b8', fontStyle: 'italic' }}>
                                  ⏳ Batch has been created and sent to the composting yard. Switch to <strong style={{ color: '#34d399' }}>Compost Beds</strong> tab to monitor temperature, moisture, and maturation progress.
                                </div>
                              )}

                              {batchIsReady && (
                                <div style={{ marginTop: '8px', fontSize: '12px', color: '#34d399', fontWeight: 600 }}>
                                  🎉 This compost batch has completed maturation and is ready to be packaged into retail bags for the Citizen Green Store!
                                </div>
                              )}
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

          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* TAB 2: TIMBER AUCTION LOTS */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'timber' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px 0', color: '#f8fafc' }}>Municipal Timber Salvage Lots</h2>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>
                    Hardwood timber logs segregated from tree clearances published for commercial auction.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setShowNewLotModal(true)}
                    style={{
                      background: '#f59e0b',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '9px 16px',
                      fontSize: '13px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)'
                    }}
                  >
                    <Plus size={16} /> + Publish New Timber Lot
                  </button>
                  <Link
                    to="/official/timber-management"
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: '#f8fafc',
                      borderRadius: '10px',
                      padding: '9px 16px',
                      fontSize: '13px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      textDecoration: 'none'
                    }}
                  >
                    <ExternalLink size={14} /> Full Timber Desk
                  </Link>
                </div>
              </div>

              {timberLots.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '16px' }}>
                  <Gavel size={40} color="#64748b" style={{ marginBottom: '12px' }} />
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#f8fafc' }}>No Timber Lots Published Yet</h4>
                  <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>Click "Move to Timber Auction" on any cutter submission above to publish a lot.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                  {timberLots.map(lot => {
                    const status = (lot.status || 'Active').toUpperCase();
                    const isLive = status.includes('LIVE') || status === 'ACTIVE';
                    const highestBid = lot.currentHighestBidInr ?? lot.currentBid ?? lot.startingBidInr ?? lot.reservePriceInr ?? lot.reservePrice ?? 0;

                    return (
                      <div
                        key={lot._id || lot.lotNumber}
                        style={{
                          background: 'rgba(15, 23, 42, 0.85)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '14px',
                          padding: '18px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#38bdf8' }}>{lot.lotNumber || 'LOT-2026'}</span>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: isLive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                            color: isLive ? '#34d399' : '#94a3b8'
                          }}>
                            {isLive ? '🟢 LIVE AUCTION' : status}
                          </span>
                        </div>

                        <div>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>
                            {lot.species || 'Teak / Rosewood Logs'}
                          </h4>
                          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                            {lot.yardLocation || 'Central Municipal Timber Depot'}
                          </div>
                        </div>

                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: '8px',
                          background: 'rgba(2, 6, 23, 0.5)',
                          padding: '10px',
                          borderRadius: '8px'
                        }}>
                          <div>
                            <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>Log Count</div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>{lot.logCount || 2} logs</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>Est. Weight</div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#f59e0b' }}>{lot.estimatedWeightKg || 400} kg</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>Avg Diameter</div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>Ø {lot.averageDiameterCm || 35} cm</div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                          <div>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Current / Reserve Price</div>
                            <div style={{ fontSize: '16px', fontWeight: 800, color: '#34d399' }}>₹{Number(highestBid).toLocaleString('en-IN')}</div>
                          </div>
                          <Link
                            to="/timber-auction"
                            style={{
                              background: 'rgba(245, 158, 11, 0.15)',
                              color: '#f59e0b',
                              border: '1px solid rgba(245, 158, 11, 0.3)',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 700,
                              textDecoration: 'none'
                            }}
                          >
                            View Auction →
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* TAB 3: COMPOST & CHIPPING BATCHES */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'compost' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px 0', color: '#f8fafc' }}>Compost & Mulch Processing Beds</h2>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>
                    Track transformation of green leaves & chipped branches into organic garden compost and bio-mulch.
                  </p>
                </div>

                <button
                  onClick={() => setShowNewBatchModal(true)}
                  style={{
                    background: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '9px 16px',
                    fontSize: '13px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
                  }}
                >
                  <Plus size={16} /> + Start New Compost Bed
                </button>
              </div>

              {batches.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '16px' }}>
                  <Leaf size={40} color="#64748b" style={{ marginBottom: '12px' }} />
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#f8fafc' }}>No Active Compost Batches</h4>
                  <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>Click "+ Start New Compost Bed" to allocate foliage loads into compost maturation.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                  {batches.map(batch => {
                    const isReady = batch.currentStage === 'READY_FOR_PACKAGING';

                    return (
                      <div
                        key={batch._id || batch.batchCode}
                        style={{
                          background: 'rgba(15, 23, 42, 0.85)',
                          border: isReady ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '14px',
                          padding: '18px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#10b981' }}>{batch.batchCode}</span>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: isReady ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.15)',
                            color: isReady ? '#34d399' : '#fbbf24'
                          }}>
                            {isReady ? '✓ READY TO PACKAGE' : (batch.currentStage || 'Active').replace(/_/g, ' ')}
                          </span>
                        </div>

                        <div>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>{batch.location || 'Windrow Bed #1'}</h4>
                          <div style={{ fontSize: '12px', color: '#94a3b8' }}>Started on {batch.startedAt ? new Date(batch.startedAt).toLocaleDateString() : 'Recent'}</div>
                        </div>

                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: '8px',
                          background: 'rgba(2, 6, 23, 0.5)',
                          padding: '10px',
                          borderRadius: '8px'
                        }}>
                          <div>
                            <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>Weight</div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#10b981' }}>{batch.initialWeightKg || 500} kg</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>Avg Temp</div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#f87171' }}>{batch.temperatureC || 58}°C</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>Moisture</div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#38bdf8' }}>{batch.moisturePercent || 55}%</div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                          <button
                            onClick={() => {
                              setSelectedBatch(batch);
                              setAdvanceForm({ nextStage: 'ACTIVE_AERATION', temperatureC: 56, moisturePercent: 50, notes: '' });
                            }}
                            style={{
                              flex: 1,
                              background: 'rgba(255, 255, 255, 0.08)',
                              border: 'none',
                              color: '#f8fafc',
                              padding: '8px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Update Progress
                          </button>

                          {isReady && (
                            <button
                              onClick={() => {
                                setPackageBatchModal(batch);
                                setPackageForm({
                                  yieldKg: Math.round((batch.initialWeightKg || 500) * 0.45),
                                  targetProductId: products[0]?._id || '',
                                  newStockQty: 25
                                });
                              }}
                              style={{
                                flex: 1,
                                background: '#10b981',
                                border: 'none',
                                color: '#ffffff',
                                padding: '8px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              Package for Store
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* TAB 4: CITIZEN GREEN STORE STOCK */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'store' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px 0', color: '#f8fafc' }}>Citizen Green Store Catalog & Inventory</h2>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>
                    Packaged organic compost bags, bio-mulch, and saplings available for citizens.
                  </p>
                </div>

                <button
                  onClick={() => setShowNewProductModal(true)}
                  style={{
                    background: '#10b981',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '9px 16px',
                    fontSize: '13px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
                  }}
                >
                  <Plus size={16} /> + Add Product to Store
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {products.map(prod => {
                  const img = prod.image || prod.imageUrl || 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&auto=format&fit=crop&q=80';
                  const pack = prod.unitSize || prod.packSize || '5 kg Bag';
                  const price = Number(prod.priceInr || 0);
                  const pts = Number(prod.priceEcoPoints || 0);
                  const qty = Number(prod.stockQuantity || 0);

                  return (
                    <div
                      key={prod._id}
                      style={{
                        background: 'rgba(15, 23, 42, 0.85)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '14px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative'
                      }}
                    >
                      <div style={{ position: 'relative' }}>
                        <img
                          src={img}
                          alt={prod.name}
                          style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px', marginBottom: '10px' }}
                        />
                        <button
                          onClick={() => handleDeleteProduct(prod._id, prod.name)}
                          title="Delete Product"
                          style={{
                            position: 'absolute',
                            top: '6px',
                            right: '6px',
                            background: 'rgba(239, 68, 68, 0.85)',
                            border: 'none',
                            color: '#fff',
                            borderRadius: '6px',
                            padding: '4px 7px',
                            fontSize: '11px',
                            cursor: 'pointer'
                          }}
                        >
                          ✕
                        </button>
                      </div>

                      <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>{prod.name}</h4>
                      <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 600, marginBottom: '6px' }}>{prod.category} • {pack}</div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: '#f8fafc' }}>₹{price.toLocaleString('en-IN')}</div>
                          <div style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 600 }}>or {pts} Eco-Points</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>Stock</div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: qty > 0 ? '#34d399' : '#ef4444' }}>
                            {qty} units
                          </div>
                        </div>
                      </div>

                      {/* Stock Adjustment Controls */}
                      <div style={{ display: 'flex', gap: '6px', marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed rgba(255, 255, 255, 0.06)' }}>
                        <button
                          onClick={() => handleAdjustStock(prod._id, qty, -5)}
                          style={{ flex: 1, padding: '5px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#f87171', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                        >
                          -5
                        </button>
                        <button
                          onClick={() => handleAdjustStock(prod._id, qty, 10)}
                          style={{ flex: 1, padding: '5px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', color: '#34d399', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                        >
                          +10
                        </button>
                        <button
                          onClick={() => handleAdjustStock(prod._id, qty, 50)}
                          style={{ flex: 1, padding: '5px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '6px', color: '#60a5fa', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                        >
                          +50
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* MODALS */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}

        {/* Geotagged Proof Image Preview Modal */}
        {selectedProof && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
            <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', width: '100%', maxWidth: '580px', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>
                  📸 Geotagged Waste Disposal Proof
                </h3>
                <button onClick={() => setSelectedProof(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>
              <div style={{ padding: '16px 20px' }}>
                <img
                  src={selectedProof.proofImageUrl || selectedProof.proofImageBase64}
                  alt="Disposal Proof"
                  style={{ width: '100%', maxHeight: '340px', objectFit: 'cover', borderRadius: '10px', marginBottom: '14px', border: '1px solid rgba(255,255,255,0.1)' }}
                />
                <div style={{ background: 'rgba(2, 6, 23, 0.6)', padding: '12px', borderRadius: '8px', fontSize: '12.5px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div><strong>Cutter:</strong> {selectedProof.cutterName || 'Field Cutter'}</div>
                  <div><strong>Vehicle:</strong> {selectedProof.vehicleNumber || 'KA-20-TR-4821'} ({selectedProof.vehicleType || 'Tipper Truck'})</div>
                  <div><strong>Receiving Yard:</strong> {selectedProof.disposalYard || 'Udupi Processing Center'}</div>
                  <div><strong>GPS Coordinates:</strong> {selectedProof.gpsLocation?.lat ? `${selectedProof.gpsLocation.lat}, ${selectedProof.gpsLocation.lng}` : '13.3409, 74.7421'}</div>
                </div>
              </div>
              <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>
                <button
                  onClick={() => setSelectedProof(null)}
                  style={{ background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Start New Compost Batch Modal */}
        {showNewBatchModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
            <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', width: '100%', maxWidth: '480px', padding: '24px' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 800, color: '#fff' }}>Start New Compost Bed</h3>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 16px 0' }}>Allocate green leaves and woodchips into an active compost bed.</p>

              <form onSubmit={handleCreateBatch}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Batch Code</label>
                  <input
                    type="text"
                    required
                    value={newBatchForm.batchCode}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, batchCode: e.target.value })}
                    style={{ width: '100%', padding: '9px', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Processing Yard Bed Location</label>
                  <input
                    type="text"
                    required
                    value={newBatchForm.location}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, location: e.target.value })}
                    style={{ width: '100%', padding: '9px', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Leaves Weight (kg)</label>
                    <input
                      type="number"
                      value={newBatchForm.foliageWeightKg}
                      onChange={(e) => {
                        const fol = Number(e.target.value);
                        setNewBatchForm({ ...newBatchForm, foliageWeightKg: fol, initialWeightKg: fol + (newBatchForm.woodchipsWeightKg || 0) });
                      }}
                      style={{ width: '100%', padding: '9px', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Branches / Woodchips (kg)</label>
                    <input
                      type="number"
                      value={newBatchForm.woodchipsWeightKg}
                      onChange={(e) => {
                        const wc = Number(e.target.value);
                        setNewBatchForm({ ...newBatchForm, woodchipsWeightKg: wc, initialWeightKg: (newBatchForm.foliageWeightKg || 0) + wc });
                      }}
                      style={{ width: '100%', padding: '9px', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={() => setShowNewBatchModal(false)} style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px', color: '#94a3b8', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ flex: 2, padding: '10px', background: '#10b981', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Start Compost Bed</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Publish Timber Lot Modal */}
        {showNewLotModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
            <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', width: '100%', maxWidth: '520px', padding: '24px' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 800, color: '#fff' }}>Publish Salvage Timber Lot</h3>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 16px 0' }}>Make urban salvaged hardwood logs available for licensed commercial auction.</p>

              <form onSubmit={handleCreateTimberLot}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Lot Number</label>
                    <input
                      type="text"
                      required
                      value={lotForm.lotNumber}
                      onChange={(e) => setLotForm({ ...lotForm, lotNumber: e.target.value })}
                      style={{ width: '100%', padding: '9px', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Tree Species</label>
                    <input
                      type="text"
                      required
                      value={lotForm.species}
                      onChange={(e) => setLotForm({ ...lotForm, species: e.target.value })}
                      style={{ width: '100%', padding: '9px', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Log Count</label>
                    <input
                      type="number"
                      value={lotForm.logCount}
                      onChange={(e) => setLotForm({ ...lotForm, logCount: Number(e.target.value) })}
                      style={{ width: '100%', padding: '9px', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Weight (kg)</label>
                    <input
                      type="number"
                      value={lotForm.estimatedWeightKg}
                      onChange={(e) => setLotForm({ ...lotForm, estimatedWeightKg: Number(e.target.value) })}
                      style={{ width: '100%', padding: '9px', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Reserve Price (₹)</label>
                    <input
                      type="number"
                      value={lotForm.reservePrice}
                      onChange={(e) => setLotForm({ ...lotForm, reservePrice: Number(e.target.value) })}
                      style={{ width: '100%', padding: '9px', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Yard Storage Depot</label>
                  <input
                    type="text"
                    value={lotForm.yardLocation}
                    onChange={(e) => setLotForm({ ...lotForm, yardLocation: e.target.value })}
                    style={{ width: '100%', padding: '9px', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={() => setShowNewLotModal(false)} style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px', color: '#94a3b8', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ flex: 2, padding: '10px', background: '#f59e0b', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Publish to Auction</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add New Product to Green Store Modal */}
        {showNewProductModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
            <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#fff' }}>Add New Product to Green Store</h3>
                <button onClick={() => setShowNewProductModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 16px 0' }}>
                Create a new organic product listing for citizens to purchase using INR or Eco-Points.
              </p>

              <form onSubmit={handleCreateProduct}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Product Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CanopyGuard Organic Compost (25kg Bulk)"
                    value={newProductForm.name}
                    onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Category</label>
                    <select
                      value={newProductForm.category}
                      onChange={(e) => setNewProductForm({ ...newProductForm, category: e.target.value })}
                      style={{ width: '100%', padding: '9px', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '13px' }}
                    >
                      <option value="Organic Compost">Organic Compost</option>
                      <option value="Bio-Mulch & Woodchips">Bio-Mulch & Woodchips</option>
                      <option value="Bio-Char">Bio-Char</option>
                      <option value="Native Saplings">Native Saplings</option>
                      <option value="Tree Care Kit">Tree Care Kit</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Pack Size / Unit</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 5 kg Bag"
                      value={newProductForm.unitSize}
                      onChange={(e) => setNewProductForm({ ...newProductForm, unitSize: e.target.value })}
                      style={{ width: '100%', padding: '9px', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Price (₹)</label>
                    <input
                      type="number"
                      required
                      value={newProductForm.priceInr}
                      onChange={(e) => setNewProductForm({ ...newProductForm, priceInr: Number(e.target.value) })}
                      style={{ width: '100%', padding: '9px', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Eco-Points</label>
                    <input
                      type="number"
                      required
                      value={newProductForm.priceEcoPoints}
                      onChange={(e) => setNewProductForm({ ...newProductForm, priceEcoPoints: Number(e.target.value) })}
                      style={{ width: '100%', padding: '9px', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Stock Qty</label>
                    <input
                      type="number"
                      required
                      value={newProductForm.stockQuantity}
                      onChange={(e) => setNewProductForm({ ...newProductForm, stockQuantity: Number(e.target.value) })}
                      style={{ width: '100%', padding: '9px', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={() => setShowNewProductModal(false)} style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px', color: '#94a3b8', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ flex: 2, padding: '10px', background: '#10b981', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Add Product</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
