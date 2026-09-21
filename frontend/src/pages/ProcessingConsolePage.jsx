import React, { useState, useEffect } from 'react';
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
  FileText
} from 'lucide-react';
import { Topbar, Sidebar } from './CanopyPages';

export default function ProcessingConsolePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('compost');
  const [intakes, setIntakes] = useState([]);
  const [batches, setBatches] = useState([]);
  const [products, setProducts] = useState([]);
  const [timberLots, setTimberLots] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Batch Modal State
  const [showNewBatchModal, setShowNewBatchModal] = useState(false);
  const [newBatchForm, setNewBatchForm] = useState({
    batchCode: `CMP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    location: 'Yard Windrow Bed #1',
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
    species: 'Teak (Tectona grandis)',
    logCount: 4,
    estimatedWeightKg: 850,
    averageDiameterCm: 45,
    approxLengthM: 3.5,
    reservePrice: 15000,
    bidIncrement: 500,
    yardLocation: 'Central Municipal Processing Yard - Bay 3',
    description: 'High-density heartwood salvage logs from road widening/storm mitigation.'
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

  // Fetch all console data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [intakeRes, batchRes, prodRes, timberRes] = await Promise.all([
        fetch('http://localhost:5000/api/waste-intakes'),
        fetch('http://localhost:5000/api/compost-batches'),
        fetch('http://localhost:5000/api/eco-products'),
        fetch('http://localhost:5000/api/timber-auctions')
      ]);

      if (intakeRes.ok) setIntakes(await intakeRes.json());
      if (batchRes.ok) setBatches(await batchRes.json());
      if (prodRes.ok) setProducts(await prodRes.json());
      if (timberRes.ok) setTimberLots(await timberRes.json());
    } catch (e) {
      console.error('Failed to load processing console data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handler: Create New Batch
  const handleCreateBatch = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/compost-batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBatchForm)
      });
      if (!res.ok) throw new Error('Failed to create new windrow batch');

      Swal.fire({
        icon: 'success',
        title: 'Windrow Batch Created! 🍂',
        text: `Batch ${newBatchForm.batchCode} initiated in ${newBatchForm.location}.`,
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
        title: 'Batch Lifecycle Updated',
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
        text: `Batch yield of ${packageForm.yieldKg} kg successfully stocked into Citizen Green Store catalog.`,
        confirmButtonColor: '#10b981'
      });
      setPackageBatchModal(null);
      fetchData();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
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
        title: 'Timber Lot Published! 🔨',
        text: `${lotForm.lotNumber} is now live for commercial bidding in the Timber Salvage Portal.`,
        confirmButtonColor: '#10b981'
      });
      setShowNewLotModal(false);
      fetchData();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
  };

  // Calculate Metrics
  const totalBiomassIntake = intakes.reduce((acc, i) => acc + (Number(i.totalEstimatedWeightKg || 0)), 0);
  const activeCompostBatches = batches.filter(b => b.status === 'ACTIVE').length;
  const matureBatches = batches.filter(b => b.currentStage === 'READY_FOR_PACKAGING').length;
  const activeAuctions = timberLots.filter(l => {
    const s = String(l.status || '').toUpperCase();
    return s.includes('LIVE') || s === 'ACTIVE';
  }).length;
  const totalTimberVolume = timberLots.reduce((acc, l) => {
    const val = Number(l.currentHighestBidInr ?? l.currentBid ?? l.startingBidInr ?? l.reservePriceInr ?? l.reservePrice ?? 0);
    return acc + val;
  }, 0);

  return (
    <div className="cg-app">
      <Sidebar active="Biomass & Processing" isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
      <div className="cg-workspace" style={{ background: '#0b1120', minHeight: '100vh' }}>
        <Topbar title="Official Biomass Processing & Yard Console" onToggleSidebar={() => setSidebarOpen(true)} />

        {/* Header Banner */}
        <div style={{
          background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.15) 0%, rgba(11, 17, 32, 0.9) 100%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '28px 24px 20px'
        }}>
          <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 12px', borderRadius: '999px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>
                  <ShieldCheck size={15} /> Official Forestry & Circular Waste Desk
                </div>
                <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.5px', color: '#f8fafc' }}>
                  Biomass Valorization & Composting Operations
                </h1>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px', maxWidth: '680px' }}>
                  Official desk for tree waste transformation: Inspect cutter weighbridge loads, manage 5-stage windrow compost maturation, package store items, and publish salvage timber lots.
                </p>
              </div>

              <button
                onClick={fetchData}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#f8fafc',
                  padding: '10px 16px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={15} className={loading ? 'spin' : ''} /> Sync Yard Data
              </button>
            </div>

            {/* Quick Metrics */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              marginTop: '24px'
            }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '16px 20px' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Total Biomass Intake</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
                  {(totalBiomassIntake || 0).toLocaleString('en-IN')} <span style={{ fontSize: '13px', color: '#64748b' }}>kg</span>
                </div>
                <div style={{ fontSize: '11px', color: '#34d399', marginTop: '4px' }}>100% Landfill Diversion</div>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '16px 20px' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Active Compost Batches</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
                  {activeCompostBatches} <span style={{ fontSize: '13px', color: '#64748b' }}>batches</span>
                </div>
                <div style={{ fontSize: '11px', color: '#fbbf24', marginTop: '4px' }}>{matureBatches} ready for packaging</div>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '16px 20px' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Green Store Catalog</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
                  {products.length} <span style={{ fontSize: '13px', color: '#64748b' }}>products</span>
                </div>
                <div style={{ fontSize: '11px', color: '#7dd3fc', marginTop: '4px' }}>Citizen compost & saplings</div>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '16px 20px' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Timber Salvage Auction</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#a78bfa', marginTop: '4px' }}>
                  ₹{(totalTimberVolume || 0).toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '11px', color: '#c4b5fd', marginTop: '4px' }}>{activeAuctions} live lots listed</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '28px 24px 64px' }}>
          {/* Tab Navigation */}
          <div style={{
            display: 'flex',
            gap: '10px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            paddingBottom: '16px',
            marginBottom: '28px',
            overflowX: 'auto'
          }}>
            {[
              { id: 'compost', label: '🍂 Composting & Maturation Lifecycle', count: batches.length },
              { id: 'intake', label: '⚖️ Cutter Weighbridge Intakes', count: intakes.length },
              { id: 'store', label: '🌿 Citizen Store Stock Management', count: products.length },
              { id: 'timber', label: '🔨 Timber Auction Lot Publisher', count: timberLots.length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: activeTab === tab.id ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                  background: activeTab === tab.id ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  color: activeTab === tab.id ? '#10b981' : '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab.label}
                <span style={{
                  padding: '2px 7px',
                  borderRadius: '999px',
                  fontSize: '11px',
                  background: activeTab === tab.id ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
                  color: activeTab === tab.id ? '#020617' : '#94a3b8',
                  fontWeight: 700
                }}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* TAB 1: COMPOSTING LIFECYCLE */}
          {activeTab === 'compost' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px 0', color: '#f8fafc' }}>Windrow Composting Batches</h2>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>
                    Track microbiological maturation from shredding through thermophilic phase to curing and retail packaging.
                  </p>
                </div>

                <button
                  onClick={() => setShowNewBatchModal(true)}
                  style={{
                    background: '#10b981',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px 16px',
                    fontSize: '13px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={16} /> New Windrow Batch
                </button>
              </div>

              {batches.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '16px', border: '1px dashed rgba(255, 255, 255, 0.15)' }}>
                  <Leaf size={40} color="#10b981" style={{ marginBottom: '12px' }} />
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '16px' }}>No Active Compost Batches</h4>
                  <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>Start a new composting windrow batch to begin processing segregated cutter leaves.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '20px' }}>
                  {batches.map(batch => {
                    const stageMap = {
                      SHREDDING: { name: '1. Shredding & Mixing', pct: 20, color: '#38bdf8' },
                      THERMOPHILIC: { name: '2. Thermophilic (55-65°C)', pct: 45, color: '#ef4444' },
                      MESOPHILIC: { name: '3. Mesophilic Maturation', pct: 70, color: '#f59e0b' },
                      CURING: { name: '4. Curing & Sifting', pct: 90, color: '#10b981' },
                      READY_FOR_PACKAGING: { name: '5. Ready for Packaging', pct: 100, color: '#8b5cf6' }
                    };
                    const currStage = stageMap[batch.currentStage] || { name: batch.currentStage, pct: 50, color: '#10b981' };
                    const isReadyForPackage = batch.currentStage === 'READY_FOR_PACKAGING' || batch.currentStage === 'CURING';

                    return (
                      <div
                        key={batch._id}
                        style={{
                          background: 'rgba(15, 23, 42, 0.85)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '16px',
                          padding: '20px',
                          display: 'flex',
                          flexDirection: 'column'
                        }}
                      >
                        {/* Batch Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: 800, color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', padding: '3px 8px', borderRadius: '6px' }}>
                              {batch.batchCode}
                            </span>
                            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '6px 0 2px 0', color: '#f8fafc' }}>{batch.location || 'Windrow Yard'}</h3>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>Started {new Date(batch.createdAt).toLocaleDateString()}</div>
                          </div>

                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '999px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: `${currStage.color}20`,
                            color: currStage.color,
                            border: `1px solid ${currStage.color}40`
                          }}>
                            {currStage.name}
                          </span>
                        </div>

                        {/* Maturation Progress Bar */}
                        <div style={{ marginBottom: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                            <span>Maturation Progress</span>
                            <span style={{ fontWeight: 700, color: currStage.color }}>{currStage.pct}%</span>
                          </div>
                          <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                            <div style={{ width: `${currStage.pct}%`, height: '100%', background: currStage.color, borderRadius: '999px', transition: 'width 0.4s' }} />
                          </div>
                        </div>

                        {/* Readings Grid */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: '8px',
                          background: 'rgba(0, 0, 0, 0.25)',
                          padding: '12px',
                          borderRadius: '10px',
                          marginBottom: '18px'
                        }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>Weight</div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>{batch.initialWeightKg || 0} kg</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>Avg Temp</div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#ef4444' }}>{batch.averageTempC || 58}°C</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>Moisture</div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#38bdf8' }}>{batch.averageMoisturePercent || 55}%</div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ marginTop: 'auto', display: 'flex', gap: '10px' }}>
                          <button
                            onClick={() => {
                              setSelectedBatch(batch);
                              const nextStages = {
                                SHREDDING: 'THERMOPHILIC',
                                THERMOPHILIC: 'MESOPHILIC',
                                MESOPHILIC: 'CURING',
                                CURING: 'READY_FOR_PACKAGING',
                                READY_FOR_PACKAGING: 'READY_FOR_PACKAGING'
                              };
                              setAdvanceForm({
                                nextStage: nextStages[batch.currentStage] || 'THERMOPHILIC',
                                temperatureC: 55,
                                moisturePercent: 50,
                                notes: 'Official routine turning and moisture adjustment.'
                              });
                            }}
                            style={{
                              flex: 1,
                              background: 'rgba(255, 255, 255, 0.08)',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              color: '#f8fafc',
                              padding: '10px',
                              borderRadius: '10px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            <Clock size={14} /> Update Maturation
                          </button>

                          {isReadyForPackage && (
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
                                padding: '10px',
                                borderRadius: '10px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                              }}
                            >
                              <Package size={14} /> Package for Store
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

          {/* TAB 2: WEIGHBRIDGE INTAKES */}
          {activeTab === 'intake' && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px 0', color: '#f8fafc' }}>Weighbridge Intake Ledger</h2>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>
                  Incoming segregated biomass deliveries logged by field tree cutters in real-time.
                </p>
              </div>

              {intakes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '16px' }}>
                  <Truck size={40} color="#64748b" style={{ marginBottom: '12px' }} />
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '16px' }}>No Deliveries Logged Yet</h4>
                  <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>Tree cutter task completions will stream multi-stream weight logs here.</p>
                </div>
              ) : (
                <div style={{ background: 'rgba(15, 23, 42, 0.85)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#94a3b8' }}>
                          <th style={{ padding: '14px 18px' }}>Date / Yard</th>
                          <th style={{ padding: '14px 18px' }}>Cutter & Vehicle</th>
                          <th style={{ padding: '14px 18px' }}>Foliage (kg)</th>
                          <th style={{ padding: '14px 18px' }}>Branches (kg)</th>
                          <th style={{ padding: '14px 18px' }}>Heavy Timber Logs</th>
                          <th style={{ padding: '14px 18px' }}>Total Biomass</th>
                          <th style={{ padding: '14px 18px' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {intakes.map(item => (
                          <tr key={item._id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <td style={{ padding: '14px 18px' }}>
                              <div style={{ fontWeight: 600, color: '#f8fafc' }}>{item.yardLocation || 'Central Yard'}</div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>{new Date(item.createdAt).toLocaleDateString()}</div>
                            </td>
                            <td style={{ padding: '14px 18px' }}>
                              <div style={{ fontWeight: 600, color: '#38bdf8' }}>{item.treeCutterName || 'Field Cutter'}</div>
                              <div style={{ fontSize: '11px', color: '#94a3b8' }}>{item.vehicleNumber || 'KA-20-TR-4581'}</div>
                            </td>
                            <td style={{ padding: '14px 18px', color: '#34d399', fontWeight: 600 }}>{item.foliageWeightKg || 0} kg</td>
                            <td style={{ padding: '14px 18px', color: '#fbbf24', fontWeight: 600 }}>{item.branchWeightKg || 0} kg</td>
                            <td style={{ padding: '14px 18px' }}>
                              {item.timberLogs?.logCount > 0 ? (
                                <div>
                                  <span style={{ fontWeight: 700, color: '#f8fafc' }}>{item.timberLogs.logCount} logs ({item.timberLogs.species || 'Mixed'})</span>
                                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>~{item.timberLogs.weightKg} kg • Ø{item.timberLogs.averageDiameterCm}cm</div>
                                </div>
                              ) : (
                                <span style={{ color: '#64748b' }}>None</span>
                              )}
                            </td>
                            <td style={{ padding: '14px 18px', fontWeight: 800, color: '#10b981' }}>
                              {item.totalEstimatedWeightKg || 0} kg
                            </td>
                            <td style={{ padding: '14px 18px' }}>
                              <span style={{
                                padding: '4px 10px',
                                borderRadius: '999px',
                                fontSize: '11px',
                                fontWeight: 700,
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#10b981'
                              }}>
                                {item.status || 'VERIFIED'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CITIZEN GREEN STORE STOCK */}
          {activeTab === 'store' && (
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px 0', color: '#f8fafc' }}>Citizen Green Store Catalog & Inventory</h2>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>
                    Manage retail packaged compost products, bio-mulch bags, saplings, and dual ₹ / Eco-Point pricing.
                  </p>
                </div>

                <button
                  onClick={() => setShowNewProductModal(true)}
                  style={{
                    background: '#10b981',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px 18px',
                    fontSize: '13px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
                  }}
                >
                  <Plus size={16} /> + Add New Product to Store
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {products.map(prod => {
                  const img = prod.image || prod.imageUrl || 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&auto=format&fit=crop&q=80';
                  const pack = prod.unitSize || prod.packSize || 'Standard Bag';
                  const price = Number(prod.priceInr || 0);
                  const pts = Number(prod.priceEcoPoints || 0);
                  const qty = Number(prod.stockQuantity || 0);

                  return (
                    <div
                      key={prod._id}
                      style={{
                        background: 'rgba(15, 23, 42, 0.85)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '16px',
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
                          style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '10px', marginBottom: '12px' }}
                        />
                        <button
                          onClick={() => handleDeleteProduct(prod._id, prod.name)}
                          title="Delete Product"
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            background: 'rgba(239, 68, 68, 0.85)',
                            border: 'none',
                            color: '#fff',
                            borderRadius: '6px',
                            padding: '5px 8px',
                            fontSize: '11px',
                            cursor: 'pointer'
                          }}
                        >
                          ✕
                        </button>
                      </div>

                      <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>{prod.name}</h4>
                      <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 600, marginBottom: '6px' }}>{prod.category} • {pack}</div>
                      {prod.npkRatio && (
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px' }}>NPK: <span style={{ color: '#fbbf24' }}>{prod.npkRatio}</span></div>
                      )}
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <div>
                          <div style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>₹{price.toLocaleString('en-IN')}</div>
                          <div style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 600 }}>or {pts} Eco-Points</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>Stock Available</div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: qty > 0 ? '#34d399' : '#ef4444' }}>
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

          {/* TAB 4: TIMBER AUCTION PUBLISHER */}
          {activeTab === 'timber' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px 0', color: '#f8fafc' }}>Timber Salvage Auction Lots</h2>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>
                    Create and manage commercial salvage hardwood lots for licensed wood merchants and sawmills.
                  </p>
                </div>

                <Link
                  to="/official/timber-management"
                  style={{
                    background: '#10b981',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px 16px',
                    fontSize: '13px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    textDecoration: 'none'
                  }}
                >
                  <Gavel size={16} /> Open Timber Intake & Governance Desk 🪵
                </Link>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                {timberLots.map(lot => {
                  const species = lot.treeSpecies || lot.species || lot.title || 'Municipal Hardwood';
                  const logCount = lot.logCount || 1;
                  const weight = Number(lot.totalWeightKg ?? lot.estimatedWeightKg ?? 0);
                  const diameter = lot.dimensions?.avgDiameterCm || lot.averageDiameterCm || 40;
                  const reserve = Number(lot.reservePriceInr ?? lot.reservePrice ?? lot.startingBidInr ?? 0);
                  const currentBid = Number(lot.currentHighestBidInr ?? lot.currentBid ?? reserve);

                  return (
                    <div
                      key={lot._id}
                      style={{
                        background: 'rgba(15, 23, 42, 0.85)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '16px',
                        padding: '18px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#fbbf24', background: 'rgba(217, 119, 6, 0.15)', padding: '3px 8px', borderRadius: '6px' }}>
                          {lot.lotNumber}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: (String(lot.status).toUpperCase().includes('LIVE') || lot.status === 'ACTIVE') ? '#10b981' : '#94a3b8' }}>
                          {lot.status || 'Active'}
                        </span>
                      </div>

                      <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>{species}</h4>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px' }}>
                        {logCount} logs • {weight} kg • Ø{diameter}cm
                      </div>

                      <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '10px 14px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>Reserve Price</div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>₹{reserve.toLocaleString('en-IN')}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>Current Highest</div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: '#10b981' }}>
                            ₹{currentBid.toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Create New Windrow Batch Modal */}
        {showNewBatchModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
            <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', width: '100%', maxWidth: '480px', padding: '24px' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 800, color: '#fff' }}>Initiate Composting Windrow Batch</h3>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 20px 0' }}>Create a tracked composting pile with segregated leaves and chipped twigs.</p>

              <form onSubmit={handleCreateBatch}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>Batch Code</label>
                  <input
                    type="text"
                    required
                    value={newBatchForm.batchCode}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, batchCode: e.target.value })}
                    style={{ width: '100%', padding: '10px', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>Yard Location / Windrow Bed</label>
                  <input
                    type="text"
                    required
                    value={newBatchForm.location}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, location: e.target.value })}
                    style={{ width: '100%', padding: '10px', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>Leaves (kg)</label>
                    <input
                      type="number"
                      value={newBatchForm.foliageWeightKg}
                      onChange={(e) => setNewBatchForm({ ...newBatchForm, foliageWeightKg: Number(e.target.value), initialWeightKg: Number(e.target.value) + Number(newBatchForm.woodchipsWeightKg || 0) })}
                      style={{ width: '100%', padding: '10px', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>Chips/Branches (kg)</label>
                    <input
                      type="number"
                      value={newBatchForm.woodchipsWeightKg}
                      onChange={(e) => setNewBatchForm({ ...newBatchForm, woodchipsWeightKg: Number(e.target.value), initialWeightKg: Number(newBatchForm.foliageWeightKg || 0) + Number(e.target.value) })}
                      style={{ width: '100%', padding: '10px', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={() => setShowNewBatchModal(false)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '10px', color: '#94a3b8', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ flex: 2, padding: '12px', background: '#10b981', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Start Windrow Batch</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Advance Lifecycle Modal */}
        {selectedBatch && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
            <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', width: '100%', maxWidth: '480px', padding: '24px' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 800, color: '#fff' }}>Update Maturation Lifecycle</h3>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 20px 0' }}>Advance {selectedBatch.batchCode} and record windrow temperature and moisture levels.</p>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>Target Maturation Stage</label>
                <select
                  value={advanceForm.nextStage}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, nextStage: e.target.value })}
                  style={{ width: '100%', padding: '10px', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: '#fff', fontSize: '13px' }}
                >
                  <option value="SHREDDING">Stage 1: Shredding & Mixing</option>
                  <option value="THERMOPHILIC">Stage 2: Thermophilic (55-65°C)</option>
                  <option value="MESOPHILIC">Stage 3: Mesophilic Maturation</option>
                  <option value="CURING">Stage 4: Curing & Sifting</option>
                  <option value="READY_FOR_PACKAGING">Stage 5: Ready for Store Packaging</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>Temp (°C)</label>
                  <input
                    type="number"
                    value={advanceForm.temperatureC}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, temperatureC: Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>Moisture (%)</label>
                  <input
                    type="number"
                    value={advanceForm.moisturePercent}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, moisturePercent: Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button onClick={() => setSelectedBatch(null)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '10px', color: '#94a3b8', cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleAdvanceStage} style={{ flex: 2, padding: '12px', background: '#10b981', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Save & Advance</button>
              </div>
            </div>
          </div>
        )}

        {/* Package Batch Yield Modal */}
        {packageBatchModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
            <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', width: '100%', maxWidth: '480px', padding: '24px' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 800, color: '#fff' }}>Package Compost for Green Store</h3>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 20px 0' }}>Transfer mature sifted organic compost from {packageBatchModal.batchCode} directly to citizen store stock.</p>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>Total Sifted Yield (kg)</label>
                <input
                  type="number"
                  value={packageForm.yieldKg}
                  onChange={(e) => setPackageForm({ ...packageForm, yieldKg: e.target.value })}
                  style={{ width: '100%', padding: '10px', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>Target Retail Product</label>
                <select
                  value={packageForm.targetProductId}
                  onChange={(e) => setPackageForm({ ...packageForm, targetProductId: e.target.value })}
                  style={{ width: '100%', padding: '10px', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: '#fff', fontSize: '13px' }}
                >
                  {products.map(p => (
                    <option key={p._id} value={p._id}>{p.name} ({p.packSize}) - Current stock: {p.stockQuantity}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>Number of Bags to Stock</label>
                <input
                  type="number"
                  value={packageForm.newStockQty}
                  onChange={(e) => setPackageForm({ ...packageForm, newStockQty: e.target.value })}
                  style={{ width: '100%', padding: '10px', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setPackageBatchModal(null)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '10px', color: '#94a3b8', cursor: 'pointer' }}>Cancel</button>
                <button onClick={handlePackageYield} style={{ flex: 2, padding: '12px', background: '#10b981', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Stock into Store</button>
              </div>
            </div>
          </div>
        )}

        {/* Publish Timber Lot Modal */}
        {showNewLotModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
            <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', width: '100%', maxWidth: '520px', padding: '24px' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 800, color: '#fff' }}>Publish Salvage Timber Lot</h3>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 20px 0' }}>Make urban salvaged hardwood logs available for licensed commercial bidding.</p>

              <form onSubmit={handleCreateTimberLot}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
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
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Reserve (₹)</label>
                    <input
                      type="number"
                      value={lotForm.reservePrice}
                      onChange={(e) => setLotForm({ ...lotForm, reservePrice: Number(e.target.value) })}
                      style={{ width: '100%', padding: '9px', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Yard Storage Location</label>
                  <input
                    type="text"
                    value={lotForm.yardLocation}
                    onChange={(e) => setLotForm({ ...lotForm, yardLocation: e.target.value })}
                    style={{ width: '100%', padding: '9px', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={() => setShowNewLotModal(false)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '10px', color: '#94a3b8', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ flex: 2, padding: '12px', background: '#10b981', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Publish to Auction</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add New Product to Green Store Modal */}
        {showNewProductModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
            <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#fff' }}>Add New Product to Green Store</h3>
                <button onClick={() => setShowNewProductModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 16px 0' }}>
                Create a new organic product listing for citizens to purchase using INR or Eco-Points.
              </p>

              <form onSubmit={handleCreateProduct}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Product Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CanopyGuard Organic Compost (25kg Bulk)"
                    value={newProductForm.name}
                    onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Category</label>
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
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Pack Size / Unit</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 25 kg Bag or 1 Potted Plant"
                      value={newProductForm.unitSize}
                      onChange={(e) => setNewProductForm({ ...newProductForm, unitSize: e.target.value })}
                      style={{ width: '100%', padding: '9px', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Price (₹)</label>
                    <input
                      type="number"
                      required
                      value={newProductForm.priceInr}
                      onChange={(e) => setNewProductForm({ ...newProductForm, priceInr: Number(e.target.value) })}
                      style={{ width: '100%', padding: '9px', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Eco-Points Price</label>
                    <input
                      type="number"
                      required
                      value={newProductForm.priceEcoPoints}
                      onChange={(e) => setNewProductForm({ ...newProductForm, priceEcoPoints: Number(e.target.value) })}
                      style={{ width: '100%', padding: '9px', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Stock Quantity</label>
                    <input
                      type="number"
                      required
                      value={newProductForm.stockQuantity}
                      onChange={(e) => setNewProductForm({ ...newProductForm, stockQuantity: Number(e.target.value) })}
                      style={{ width: '100%', padding: '9px', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Product Image URL</label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={newProductForm.imageUrl}
                    onChange={(e) => setNewProductForm({ ...newProductForm, imageUrl: e.target.value })}
                    style={{ width: '100%', padding: '9px', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                  {newProductForm.imageUrl && (
                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img src={newProductForm.imageUrl} alt="Preview" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)' }} />
                      <span style={{ fontSize: '11px', color: '#34d399' }}>Image Preview Loaded</span>
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>NPK / Bio Specifications</label>
                  <input
                    type="text"
                    placeholder="e.g. 2.5 : 1.4 : 1.9 (N-P-K) • 68% Organic Matter"
                    value={newProductForm.npkRatio}
                    onChange={(e) => setNewProductForm({ ...newProductForm, npkRatio: e.target.value })}
                    style={{ width: '100%', padding: '9px', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Description</label>
                  <textarea
                    rows={2}
                    value={newProductForm.description}
                    onChange={(e) => setNewProductForm({ ...newProductForm, description: e.target.value })}
                    style={{ width: '100%', padding: '9px', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={() => setShowNewProductModal(false)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '10px', color: '#94a3b8', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ flex: 2, padding: '12px', background: '#10b981', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Add Product to Catalog</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
