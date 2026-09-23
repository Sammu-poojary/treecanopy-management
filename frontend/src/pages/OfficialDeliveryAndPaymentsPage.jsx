import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  Truck,
  Package,
  CreditCard,
  UserCheck,
  UserPlus,
  MapPin,
  Phone,
  Mail,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Eye,
  EyeOff,
  Check,
  X,
  FileText,
  Sparkles,
  QrCode,
  LogOut,
  Calendar,
  Receipt
} from 'lucide-react';
import { Topbar, Sidebar } from './CanopyPages';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function OfficialDeliveryAndPaymentsPage() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'partners', 'payments'

  const handleLogout = () => {
    Swal.fire({
      title: 'Log out from Official Portal?',
      text: 'Are you sure you want to end your official session?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#334155',
      confirmButtonText: 'Yes, Log Out',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem('currentUser');
        sessionStorage.removeItem('officialAuthed');
        sessionStorage.removeItem('adminAuthed');
        navigate('/login');
      }
    });
  };
  
  // Data State
  const [orders, setOrders] = useState([]);
  const [partners, setPartners] = useState([]);
  const [paymentsSummary, setPaymentsSummary] = useState(null);
  const [daywiseLedger, setDaywiseLedger] = useState([]);
  const [daywiseDateFilter, setDaywiseDateFilter] = useState('ALL');
  const [daywisePartnerFilter, setDaywisePartnerFilter] = useState('ALL');
  const [settlingDayKey, setSettlingDayKey] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [fulfillmentFilter, setFulfillmentFilter] = useState('ALL');
  
  // Modals
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [assignmentNote, setAssignmentNote] = useState('');
  const [assigning, setAssigning] = useState(false);

  const [showAddPartnerModal, setShowAddPartnerModal] = useState(false);
  const [addingPartner, setAddingPartner] = useState(false);
  const [showPartnerPassword, setShowPartnerPassword] = useState(false);
  const [newPartnerForm, setNewPartnerForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: 'Delivery@123',
    vehicleType: 'Three-Wheeler EV Cargo',
    vehicleNumber: '',
    deliveryZone: 'Udupi Central & Manipal Sector'
  });
  const [viewingTimelineOrder, setViewingTimelineOrder] = useState(null);

  // Payment Status Update Modal State
  const [paymentModalOrder, setPaymentModalOrder] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    paymentStatus: 'Paid',
    paymentMethod: 'Cash on Delivery',
    cashCollectionStatus: 'Collected',
    cashCollected: '',
    notes: ''
  });
  const [updatingPayment, setUpdatingPayment] = useState(false);

  const openPaymentModal = (order) => {
    setPaymentModalOrder(order);
    setPaymentForm({
      paymentStatus: order.paymentStatus || 'Paid',
      paymentMethod: order.paymentMethod || 'Cash on Delivery',
      cashCollectionStatus: order.cashCollectionStatus || (order.paymentStatus === 'Paid' ? 'Collected' : 'Pending Collection'),
      cashCollected: order.cashCollected || order.totalAmountInr || '',
      notes: ''
    });
  };

  const handleUpdatePayment = async (e) => {
    e.preventDefault();
    if (!paymentModalOrder) return;
    setUpdatingPayment(true);
    try {
      const res = await fetch(`${API_URL}/api/eco-orders/${paymentModalOrder._id}/update-payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentStatus: paymentForm.paymentStatus,
          paymentMethod: paymentForm.paymentMethod,
          cashCollectionStatus: paymentForm.cashCollectionStatus,
          cashCollected: Number(paymentForm.cashCollected || paymentModalOrder.totalAmountInr),
          notes: paymentForm.notes || `Payment status manually updated to ${paymentForm.paymentStatus} by official.`,
          updatedBy: 'Official / Admin Desk'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update payment status');

      Swal.fire({
        icon: 'success',
        title: 'Payment Status Updated! 💳',
        text: `Order ${paymentModalOrder.orderNumber} is now recorded as ${paymentForm.paymentStatus}.`,
        confirmButtonColor: '#10b981'
      });

      setPaymentModalOrder(null);
      fetchData();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    } finally {
      setUpdatingPayment(false);
    }
  };

  // ── Clear / Settle Single Order COD Cash into Municipal Treasury ──
  const handleSettleOrderCash = async (order) => {
    const cashAmt = order.cashCollected || order.totalAmountInr || 0;
    const result = await Swal.fire({
      title: 'Clear & Deposit Cash to Treasury?',
      html: `<p>Confirm physical receipt of <strong>₹${cashAmt}</strong> collected from citizen for order <strong>${order.orderNumber}</strong> by driver <strong>${order.assignedDeliveryPartnerName || 'Delivery Partner'}</strong>.</p>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#334155',
      confirmButtonText: 'Yes, Clear & Deposit',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`${API_URL}/api/eco-orders/${order._id}/settle-cash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settledBy: 'Official Operations Desk',
          notes: 'Driver handed over cash at Ajjarkadu Biomass Office counter'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to settle cash');

      Swal.fire({
        icon: 'success',
        title: 'Cash Deposited to Treasury! 🏦',
        text: `₹${cashAmt} for order ${order.orderNumber} has been officially cleared into Municipal Treasury.`,
        confirmButtonColor: '#10b981'
      });

      fetchData();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
  };

  // ── Clear All Pending COD Cash for a Specific Driver in One Click ──
  const handleSettleDriverCash = async (partner, amount) => {
    const result = await Swal.fire({
      title: `Reconcile Cash for ${partner.name}?`,
      html: `<p>Confirm physical turn-in of <strong>₹${amount}</strong> total collected COD cash from delivery partner <strong>${partner.name}</strong>.</p><p style="font-size:12px;color:#94a3b8">This will reconcile all delivered COD orders and clear their cash liability to ₹0.</p>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#334155',
      confirmButtonText: `Yes, Accept ₹${amount} Cash`,
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`${API_URL}/api/eco-orders/settle-driver-cash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerId: partner._id,
          partnerName: partner.name,
          settledBy: 'Official Operations Desk',
          notes: 'Driver shift cash reconciled at biomass yard office'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to settle driver cash');

      Swal.fire({
        icon: 'success',
        title: 'Driver Cash Reconciled! 🏦',
        text: data.message || `₹${amount} has been cleared into the Municipal Treasury.`,
        confirmButtonColor: '#10b981'
      });

      fetchData();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
  };

  // Helper: Accurate Official Payment Badge
  const getOfficialPaymentBadge = (order) => {
    const isCod = order.paymentMethod === 'Cash on Delivery' || order.paymentMethod === 'COD';
    const isPoints = order.paymentMethod === 'Eco-Points Full Redemption';
    const isPaid = order.paymentStatus === 'Paid';
    const isCollected = order.cashCollectionStatus === 'Collected';
    const isDeposited = order.cashCollectionStatus === 'Deposited';

    if (isPoints) {
      return {
        bg: 'rgba(168, 85, 247, 0.15)',
        border: 'rgba(168, 85, 247, 0.3)',
        color: '#c084fc',
        text: '✓ Eco-Points (₹0 Due)'
      };
    }

    if (isCod) {
      if (isDeposited || (isPaid && !isCollected)) {
        return {
          bg: 'rgba(16, 185, 129, 0.15)',
          border: 'rgba(16, 185, 129, 0.3)',
          color: '#34d399',
          text: `✓ COD Settled (₹${order.cashCollected || order.totalAmountInr})`,
          isSettled: true
        };
      }
      if (isCollected) {
        return {
          bg: 'rgba(245, 158, 11, 0.18)',
          border: 'rgba(245, 158, 11, 0.4)',
          color: '#fbbf24',
          text: `🚚 Cash with Driver: ₹${order.cashCollected || order.totalAmountInr}`,
          canSettle: true
        };
      }
      return {
        bg: 'rgba(239, 68, 68, 0.15)',
        border: 'rgba(239, 68, 68, 0.3)',
        color: '#f87171',
        text: `💵 COD Pending: ₹${order.totalAmountInr}`
      };
    }

    // Razorpay Online
    if (isPaid) {
      return {
        bg: 'rgba(16, 185, 129, 0.15)',
        border: 'rgba(16, 185, 129, 0.3)',
        color: '#34d399',
        text: `✓ Paid Online (₹${order.totalAmountInr})`
      };
    }

    if (order.paymentStatus === 'Failed') {
      return {
        bg: 'rgba(239, 68, 68, 0.2)',
        border: 'rgba(239, 68, 68, 0.35)',
        color: '#f87171',
        text: `❌ Online Failed (₹${order.totalAmountInr})`
      };
    }

    return {
      bg: 'rgba(245, 158, 11, 0.15)',
      border: 'rgba(245, 158, 11, 0.35)',
      color: '#fbbf24',
      text: `⚠️ Online Pending / Unpaid (₹${order.totalAmountInr})`
    };
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, partnersRes, summaryRes, ledgerRes] = await Promise.all([
        fetch(`${API_URL}/api/eco-orders/all`),
        fetch(`${API_URL}/api/auth/delivery-partners`),
        fetch(`${API_URL}/api/eco-orders/payments-summary`),
        fetch(`${API_URL}/api/eco-orders/daywise-cash-ledger`)
      ]);

      if (ordersRes.ok) {
        const oData = await ordersRes.json();
        setOrders(Array.isArray(oData) ? oData : []);
      }
      if (partnersRes.ok) {
        const pData = await partnersRes.json();
        setPartners(pData.partners || []);
      }
      if (summaryRes.ok) {
        const sData = await summaryRes.json();
        setPaymentsSummary(sData);
      }
      if (ledgerRes.ok) {
        const lData = await ledgerRes.json();
        setDaywiseLedger(lData.records || []);
      }
    } catch (err) {
      console.error('Error fetching delivery data:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Settle Entire Day's Cash Collection for a Partner into Treasury ──
  const handleSettleDaywiseCash = async (record) => {
    const result = await Swal.fire({
      title: 'Deposit Day Cash into Treasury? 🏦',
      html: `
        <div style="text-align: left; background: rgba(15, 23, 42, 0.7); padding: 14px; border-radius: 12px; margin: 12px 0; font-size: 13px; border: 1px solid rgba(255,255,255,0.1);">
          <div style="margin-bottom: 4px;">📅 <b>Shift Date:</b> ${new Date(record.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</div>
          <div style="margin-bottom: 4px;">🚴 <b>Delivery Partner:</b> ${record.partnerName} (${record.partnerPhone || 'No phone'})</div>
          <div style="margin-bottom: 4px;">🛵 <b>Vehicle:</b> ${record.partnerVehicle || 'EV 3W'}</div>
          <div style="margin-bottom: 6px;">📦 <b>Orders Count:</b> ${record.orderCount} (${record.orderNumbers.join(', ')})</div>
          <div style="font-size: 17px; font-weight: 800; color: #10b981; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px;">
            💵 Cash to Clear: ₹${record.pendingAmount}
          </div>
        </div>
        <p style="font-size: 12px; color: #94a3b8; margin: 0;">
          Confirm physical handover of ₹${record.pendingAmount} collected cash at the municipal counter. All orders for this day will be marked as officially deposited into the Municipal Treasury.
        </p>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#334155',
      confirmButtonText: `Yes, Clear ₹${record.pendingAmount} to Treasury`,
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    setSettlingDayKey(record.groupKey);
    try {
      const res = await fetch(`${API_URL}/api/eco-orders/settle-daywise-cash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: record.date,
          partnerId: record.partnerId !== 'unassigned' ? record.partnerId : undefined,
          partnerName: record.partnerName,
          settledBy: 'Official / Admin Treasury Desk',
          notes: 'Shift physical cash remitted at Ajjarkadu Biomass Office counter'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to settle day cash');

      Swal.fire({
        icon: 'success',
        title: 'Day Cash Deposited to Treasury! 🏦',
        text: data.message || `Successfully cleared ₹${record.pendingAmount} into Municipal Treasury.`,
        confirmButtonColor: '#10b981'
      });

      fetchData();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Settlement Error', text: err.message });
    } finally {
      setSettlingDayKey(null);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Assign Order to Delivery Partner
  const handleAssignOrder = async (e) => {
    e.preventDefault();
    if (!selectedOrder || !selectedPartnerId) {
      Swal.fire({ icon: 'warning', title: 'Select Partner', text: 'Please select an on-duty delivery partner.' });
      return;
    }

    const partner = partners.find(p => p._id === selectedPartnerId);
    setAssigning(true);

    try {
      const res = await fetch(`${API_URL}/api/eco-orders/${selectedOrder._id}/assign-delivery`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerId: partner?._id,
          partnerName: partner?.name,
          partnerPhone: partner?.phone,
          partnerVehicle: partner?.vehicleNumber,
          notes: assignmentNote,
          updatedBy: 'Official Operations Desk'
        })
      });

      if (!res.ok) throw new Error('Failed to assign order');

      Swal.fire({
        icon: 'success',
        title: 'Dispatched to Delivery Partner! 🚴',
        text: `Order ${selectedOrder.orderNumber} assigned to ${partner?.name}. Notification email dispatched to citizen.`,
        confirmButtonColor: '#10b981'
      });

      setShowAssignModal(false);
      setSelectedOrder(null);
      setSelectedPartnerId('');
      setAssignmentNote('');
      fetchData();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    } finally {
      setAssigning(false);
    }
  };

  // Add New Delivery Partner
  const handleAddPartner = async (e) => {
    e.preventDefault();
    setAddingPartner(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/register-delivery-partner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPartnerForm)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Registration failed');

      Swal.fire({
        icon: 'success',
        title: 'Delivery Partner Added! 🎉',
        html: `
          <div style="text-align: left; background: #0f172a; padding: 16px; border-radius: 12px; color: #f8fafc; font-size: 13px; line-height: 1.6; border: 1px solid rgba(255,255,255,0.1);">
            <div style="font-weight: 700; color: #38bdf8; margin-bottom: 8px; font-size: 14px;">📋 Login Credentials Configured:</div>
            <div style="margin-bottom: 4px;">👤 <b>Name:</b> ${newPartnerForm.name}</div>
            <div style="margin-bottom: 4px;">✉️ <b>Login Email:</b> <span style="color: #38bdf8; font-family: monospace; font-weight: 700;">${newPartnerForm.email}</span></div>
            <div style="margin-bottom: 4px;">🔑 <b>Password:</b> <span style="color: #10b981; font-family: monospace; font-weight: 700;">${newPartnerForm.password || 'Delivery@123'}</span></div>
            <div style="margin-bottom: 4px;">🚚 <b>Zone:</b> ${newPartnerForm.deliveryZone}</div>
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 12px; color: #94a3b8;">
              💡 <b>How to Log In:</b> Partner opens <b>/login</b>, clicks the <b>Delivery</b> tab, and enters these credentials to access their route dispatch console.
            </div>
          </div>
        `,
        confirmButtonColor: '#10b981'
      });

      setShowAddPartnerModal(false);
      setNewPartnerForm({
        name: '',
        email: '',
        phone: '',
        password: 'Delivery@123',
        vehicleType: 'Three-Wheeler EV Cargo',
        vehicleNumber: '',
        deliveryZone: 'Udupi Central & Manipal Sector'
      });
      fetchData();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    } finally {
      setAddingPartner(false);
    }
  };

  // Toggle Partner Availability
  const handleToggleAvailability = async (partner) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/delivery-partners/${partner._id}/toggle-availability`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: !partner.isAvailable })
      });

      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filters
  const filteredOrders = orders.filter(ord => {
    const matchesSearch =
      ord.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.userPhone?.includes(searchQuery) ||
      ord.deliveryAddress?.street?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'UNASSIGNED' && (ord.currentDeliveryStatus === 'Unassigned' || !ord.assignedDeliveryPartnerId)) ||
      (statusFilter === 'ASSIGNED' && ord.currentDeliveryStatus === 'Assigned') ||
      (statusFilter === 'OUT_FOR_DELIVERY' && ord.currentDeliveryStatus === 'Out for Delivery') ||
      (statusFilter === 'DELIVERED' && (ord.currentDeliveryStatus === 'Delivered' || ord.orderStatus === 'Delivered / Collected'));

    const matchesFulfillment =
      fulfillmentFilter === 'ALL' || ord.fulfillmentType === fulfillmentFilter;

    return matchesSearch && matchesStatus && matchesFulfillment;
  });

  return (
    <div className="cg-app">
      <Sidebar active="Orders & Delivery" isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
      <div className="cg-workspace" style={{ background: '#0b1120', minHeight: '100vh' }}>
        <Topbar title="Official Orders, Delivery & Payments Desk" onToggleSidebar={() => setSidebarOpen(true)} />

        {/* Top Header Banner */}
        <div style={{
          background: 'linear-gradient(180deg, rgba(14, 165, 233, 0.15) 0%, rgba(11, 17, 32, 0.9) 100%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '28px 24px 20px'
        }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 12px', borderRadius: '999px', background: 'rgba(14, 165, 233, 0.15)', border: '1px solid rgba(14, 165, 233, 0.3)', color: '#38bdf8', fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>
                  <ShieldCheck size={15} /> Municipal Green Logistics & Payment Treasury
                </div>
                <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.5px', color: '#f8fafc' }}>
                  Eco-Store Order Dispatch, Delivery Fleet & Payments
                </h1>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px', maxWidth: '720px' }}>
                  Manage compost bag deliveries to citizens, assign dedicated green delivery executives, monitor live route progress with Leaflet GPS, and track online & COD payment settlements.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setShowAddPartnerModal(true)}
                  style={{
                    background: '#0284c7',
                    border: 'none',
                    color: '#ffffff',
                    padding: '10px 18px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <UserPlus size={16} /> Register Delivery Agent
                </button>
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
                  <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh
                </button>
                <button
                  onClick={handleLogout}
                  title="Log Out of Official Portal"
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    color: '#f87171',
                    padding: '10px 16px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <LogOut size={15} /> Log Out
                </button>
              </div>
            </div>

            {/* Metrics Overview Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginTop: '24px'
            }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '16px 20px' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Settled Treasury Revenue</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
                  ₹{(paymentsSummary?.totalRevenueInr || 0).toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '11px', color: '#7dd3fc', marginTop: '4px' }}>
                  ₹{(paymentsSummary?.totalOnlineRazorpayInr || 0).toLocaleString('en-IN')} Online • ₹{(paymentsSummary?.totalCodDepositedInr || 0).toLocaleString('en-IN')} Settled COD
                </div>
              </div>

              <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '14px', padding: '16px 20px' }}>
                <div style={{ fontSize: '12px', color: '#fbbf24', textTransform: 'uppercase', fontWeight: 700 }}>🚚 Driver Cash in Hand</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
                  ₹{(paymentsSummary?.totalDriverCashInHandInr || 0).toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '11px', color: '#fde68a', marginTop: '4px' }}>
                  Collected from citizens • Awaiting turn-in
                </div>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '16px 20px' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Total Orders</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
                  {orders.length} <span style={{ fontSize: '13px', color: '#64748b' }}>orders</span>
                </div>
                <div style={{ fontSize: '11px', color: '#34d399', marginTop: '4px' }}>
                  {orders.filter(o => o.fulfillmentType === 'Home Delivery').length} Home Deliveries
                </div>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '16px 20px' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Active Delivery Fleet</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#a78bfa', marginTop: '4px' }}>
                  {partners.filter(p => p.isAvailable).length} <span style={{ fontSize: '13px', color: '#64748b' }}>on duty</span>
                </div>
                <div style={{ fontSize: '11px', color: '#c4b5fd', marginTop: '4px' }}>{partners.length} total registered partners</div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '24px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '2px' }}>
              <button
                onClick={() => setActiveTab('orders')}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px 10px 0 0',
                  border: 'none',
                  background: activeTab === 'orders' ? 'rgba(14, 165, 233, 0.15)' : 'transparent',
                  color: activeTab === 'orders' ? '#38bdf8' : '#94a3b8',
                  borderBottom: activeTab === 'orders' ? '2px solid #38bdf8' : '2px solid transparent',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Package size={16} /> Orders & Dispatch Board ({orders.length})
              </button>

              <button
                onClick={() => setActiveTab('partners')}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px 10px 0 0',
                  border: 'none',
                  background: activeTab === 'partners' ? 'rgba(14, 165, 233, 0.15)' : 'transparent',
                  color: activeTab === 'partners' ? '#38bdf8' : '#94a3b8',
                  borderBottom: activeTab === 'partners' ? '2px solid #38bdf8' : '2px solid transparent',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Truck size={16} /> Delivery Staff & Fleet ({partners.length})
              </button>

              <button
                onClick={() => setActiveTab('payments')}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px 10px 0 0',
                  border: 'none',
                  background: activeTab === 'payments' ? 'rgba(14, 165, 233, 0.15)' : 'transparent',
                  color: activeTab === 'payments' ? '#38bdf8' : '#94a3b8',
                  borderBottom: activeTab === 'payments' ? '2px solid #38bdf8' : '2px solid transparent',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <CreditCard size={16} /> Payments & Revenue Ledger
              </button>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '28px 24px 64px' }}>
          {/* TAB 1: ORDERS & DISPATCH BOARD */}
          {activeTab === 'orders' && (
            <div>
              {/* Filter and Search Bar */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '14px',
                background: 'rgba(15, 23, 42, 0.6)',
                padding: '14px 18px',
                borderRadius: '14px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['ALL', 'UNASSIGNED', 'ASSIGNED', 'OUT_FOR_DELIVERY', 'DELIVERED'].map(st => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: statusFilter === st ? '1px solid #0284c7' : '1px solid rgba(255, 255, 255, 0.1)',
                        background: statusFilter === st ? 'rgba(2, 132, 199, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                        color: statusFilter === st ? '#38bdf8' : '#94a3b8'
                      }}
                    >
                      {st === 'ALL' ? 'All Orders' : st === 'UNASSIGNED' ? '⚠️ Needs Assignment' : st === 'ASSIGNED' ? '🚴 Assigned' : st === 'OUT_FOR_DELIVERY' ? '🚚 Out for Delivery' : '✅ Delivered'}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <select
                    value={fulfillmentFilter}
                    onChange={(e) => setFulfillmentFilter(e.target.value)}
                    style={{
                      background: '#1e293b',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#f8fafc',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '13px'
                    }}
                  >
                    <option value="ALL">All Types</option>
                    <option value="Home Delivery">Home Delivery</option>
                    <option value="Yard Self-Pickup">Yard Self-Pickup</option>
                  </select>

                  <div style={{ position: 'relative' }}>
                    <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      placeholder="Search order #, citizen..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        background: '#1e293b',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#f8fafc',
                        padding: '8px 12px 8px 32px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        width: '220px'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Orders Grid */}
              {filteredOrders.length === 0 ? (
                <div style={{ background: 'rgba(15, 23, 42, 0.4)', borderRadius: '16px', padding: '48px', textAlign: 'center', border: '1px dashed rgba(255, 255, 255, 0.1)' }}>
                  <Package size={40} color="#64748b" style={{ margin: '0 auto 12px' }} />
                  <h3 style={{ color: '#f8fafc', margin: '0 0 6px 0' }}>No Orders Found</h3>
                  <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>There are no orders matching your selected filters.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {filteredOrders.map(order => {
                    const isUnassigned = order.fulfillmentType === 'Home Delivery' && (!order.assignedDeliveryPartnerId || order.currentDeliveryStatus === 'Unassigned');
                    const isDelivered = order.currentDeliveryStatus === 'Delivered' || order.orderStatus === 'Delivered / Collected';

                    return (
                      <div
                        key={order._id}
                        style={{
                          background: 'rgba(15, 23, 42, 0.8)',
                          border: isUnassigned ? '1px solid rgba(239, 68, 68, 0.4)' : isDelivered ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '14px',
                          padding: '20px',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                          gap: '20px',
                          alignItems: 'center'
                        }}
                      >
                        {/* Order & Citizen Details */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <span style={{ fontSize: '15px', fontWeight: 800, color: '#f8fafc' }}>
                              {order.orderNumber}
                            </span>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '999px',
                              background: order.fulfillmentType === 'Home Delivery' ? 'rgba(14, 165, 233, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                              color: order.fulfillmentType === 'Home Delivery' ? '#38bdf8' : '#fbbf24'
                            }}>
                              {order.fulfillmentType}
                            </span>
                          </div>

                          <div style={{ fontSize: '13px', color: '#f8fafc', fontWeight: 600 }}>
                            {order.userName}
                          </div>
                          <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                            <Phone size={12} /> {order.userPhone || 'No phone'} • <Mail size={12} /> {order.userEmail}
                          </div>

                          {order.fulfillmentType === 'Home Delivery' && (
                            <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '6px', background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: '6px' }}>
                              <MapPin size={12} style={{ display: 'inline', marginRight: '4px', color: '#38bdf8' }} />
                              {order.deliveryAddress?.street || 'Address'}, {order.deliveryAddress?.city || 'Udupi'}
                            </div>
                          )}
                        </div>

                        {/* Items & Payment Info */}
                        <div>
                          <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>
                            Items ({(order.items || []).reduce((acc, i) => acc + (i.quantity || 1), 0)} bags)
                          </div>
                          <div style={{ fontSize: '13px', color: '#f8fafc', lineHeight: 1.4 }}>
                            {(order.items || []).map(i => `${i.productName} (${i.unitSize}) x${i.quantity}`).join(', ')}
                          </div>

                          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '15px', fontWeight: 800, color: '#10b981' }}>
                              ₹{order.totalAmountInr}
                            </span>
                            {(() => {
                              const badge = getOfficialPaymentBadge(order);
                              return (
                                <span style={{
                                  fontSize: '11px',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  background: badge.bg,
                                  color: badge.color,
                                  border: `1px solid ${badge.border}`,
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  {badge.text}
                                </span>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Delivery Partner Status & OTP */}
                        <div>
                          <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>
                            Dispatch Status
                          </div>

                          {order.assignedDeliveryPartnerName ? (
                            <div style={{ background: 'rgba(2, 132, 199, 0.12)', border: '1px solid rgba(2, 132, 199, 0.25)', padding: '8px 12px', borderRadius: '8px' }}>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: '#38bdf8' }}>
                                🚴 {order.assignedDeliveryPartnerName}
                              </div>
                              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                                Phone: {order.assignedDeliveryPartnerPhone} • {order.assignedDeliveryPartnerVehicle}
                              </div>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: isDelivered ? '#10b981' : '#fbbf24', marginTop: '4px' }}>
                                {order.currentDeliveryStatus || order.orderStatus}
                              </div>
                            </div>
                          ) : (
                            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px dashed rgba(239, 68, 68, 0.3)', padding: '8px 12px', borderRadius: '8px' }}>
                              <div style={{ fontSize: '12px', color: '#f87171', fontWeight: 700 }}>
                                ⚠️ No Delivery Partner Assigned
                              </div>
                              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                                Awaiting municipal dispatch
                              </div>
                            </div>
                          )}

                          {order.deliveryOtp && (
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                              Security OTP: <b style={{ color: '#10b981' }}>{order.deliveryOtp}</b>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
                          {order.fulfillmentType === 'Home Delivery' && !isDelivered && (
                            <button
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowAssignModal(true);
                              }}
                              style={{
                                background: isUnassigned ? '#0284c7' : 'rgba(255, 255, 255, 0.08)',
                                border: isUnassigned ? 'none' : '1px solid rgba(255, 255, 255, 0.15)',
                                color: '#f8fafc',
                                padding: '8px 14px',
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
                              <Truck size={14} /> {order.assignedDeliveryPartnerId ? 'Reassign Partner' : 'Assign Partner'}
                            </button>
                          )}

                          {/* Clear Cash Action Button for Collected COD Orders */}
                          {order.cashCollectionStatus === 'Collected' && (
                            <button
                              onClick={() => handleSettleOrderCash(order)}
                              style={{
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                border: 'none',
                                color: '#ffffff',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
                              }}
                            >
                              <ShieldCheck size={14} /> Clear Cash (Deposit ₹{order.cashCollected || order.totalAmountInr})
                            </button>
                          )}

                          {/* Update Payment Button */}
                          <button
                            onClick={() => openPaymentModal(order)}
                            style={{
                              background: order.paymentStatus === 'Paid' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.15)',
                              border: order.paymentStatus === 'Paid' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                              color: order.paymentStatus === 'Paid' ? '#34d399' : '#fbbf24',
                              padding: '7px 12px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            <CreditCard size={13} /> {order.paymentStatus === 'Paid' ? 'Edit Payment' : 'Mark as Paid / COD'}
                          </button>

                          <button
                            onClick={() => setViewingTimelineOrder(order)}
                            style={{
                              background: 'transparent',
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              color: '#94a3b8',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            <Clock size={13} /> View Timeline ({order.statusTimeline?.length || 1})
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DELIVERY STAFF & FLEET MANAGEMENT */}
          {activeTab === 'partners' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                  Municipal Green Delivery Executives ({partners.length})
                </h3>
                <button
                  onClick={() => setShowAddPartnerModal(true)}
                  style={{
                    background: '#0284c7',
                    border: 'none',
                    color: '#fff',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <UserPlus size={15} /> Add Delivery Partner
                </button>
              </div>

              {partners.length === 0 ? (
                <div style={{ background: 'rgba(15, 23, 42, 0.4)', borderRadius: '16px', padding: '48px', textAlign: 'center', border: '1px dashed rgba(255, 255, 255, 0.1)' }}>
                  <Truck size={40} color="#64748b" style={{ margin: '0 auto 12px' }} />
                  <h3 style={{ color: '#f8fafc', margin: '0 0 6px 0' }}>No Delivery Partners Registered</h3>
                  <p style={{ color: '#94a3b8', fontSize: '14px', margin: '0 0 16px 0' }}>Register delivery personnel to begin assigning eco-store compost orders.</p>
                  <button
                    onClick={() => setShowAddPartnerModal(true)}
                    style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Register First Partner
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                  {partners.map(p => {
                    const activeCount = orders.filter(o => o.assignedDeliveryPartnerId === p._id && o.currentDeliveryStatus !== 'Delivered' && o.orderStatus !== 'Delivered / Collected').length;
                    const completedCount = orders.filter(o => o.assignedDeliveryPartnerId === p._id && (o.currentDeliveryStatus === 'Delivered' || o.orderStatus === 'Delivered / Collected')).length;

                    return (
                      <div
                        key={p._id}
                        style={{
                          background: 'rgba(15, 23, 42, 0.8)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '14px',
                          padding: '20px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <div>
                            <h4 style={{ margin: '0 0 2px 0', fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>
                              {p.name}
                            </h4>
                            <div style={{ fontSize: '12px', color: '#94a3b8' }}>{p.email}</div>
                          </div>

                          <button
                            onClick={() => handleToggleAvailability(p)}
                            style={{
                              background: p.isAvailable ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              border: p.isAvailable ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                              color: p.isAvailable ? '#34d399' : '#f87171',
                              padding: '4px 10px',
                              borderRadius: '999px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            {p.isAvailable ? '🟢 On Duty' : '🔴 Off Duty'}
                          </button>
                        </div>

                        <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 12px', borderRadius: '10px', marginBottom: '14px' }}>
                          <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Phone size={12} color="#38bdf8" /> <b>{p.phone}</b>
                          </div>
                          <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                            <Truck size={12} color="#fbbf24" /> {p.vehicleType} • <b style={{ color: '#f8fafc' }}>{p.vehicleNumber}</b>
                          </div>
                          <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                            <MapPin size={12} color="#a78bfa" /> {p.deliveryZone}
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', textAlign: 'center' }}>
                          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '8px', borderRadius: '8px' }}>
                            <div style={{ fontSize: '18px', fontWeight: 800, color: '#fbbf24' }}>{activeCount}</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Active Tasks</div>
                          </div>
                          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '8px', borderRadius: '8px' }}>
                            <div style={{ fontSize: '18px', fontWeight: 800, color: '#10b981' }}>{completedCount}</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Delivered</div>
                          </div>
                        </div>

                        {/* Driver Cash in Hand & Reconcile Button */}
                        {(() => {
                          const driverCash = (paymentsSummary?.driverCashMap?.[p.name]) || orders.filter(o =>
                            (o.assignedDeliveryPartnerId === p._id || o.assignedDeliveryPartnerName === p.name) &&
                            o.cashCollectionStatus === 'Collected'
                          ).reduce((sum, o) => sum + (Number(o.cashCollected) || Number(o.totalAmountInr) || 0), 0);

                          return (
                            <div style={{
                              background: driverCash > 0 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.08)',
                              border: driverCash > 0 ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(16, 185, 129, 0.2)',
                              padding: '10px 12px',
                              borderRadius: '10px',
                              marginTop: '12px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <div>
                                <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                                  Collected COD Cash
                                </div>
                                <div style={{ fontSize: '15px', fontWeight: 800, color: driverCash > 0 ? '#f59e0b' : '#34d399', marginTop: '2px' }}>
                                  ₹{driverCash} {driverCash > 0 ? '(In-Hand)' : '(All Cleared)'}
                                </div>
                              </div>
                              {driverCash > 0 && (
                                <button
                                  onClick={() => handleSettleDriverCash(p, driverCash)}
                                  style={{
                                    background: '#10b981',
                                    border: 'none',
                                    color: '#fff',
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  <ShieldCheck size={12} /> Clear Cash
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PAYMENTS & REVENUE LEDGER */}
          {activeTab === 'payments' && (
            <div>
              <div style={{
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px'
              }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>
                  Municipal Bio-Waste Circular Revenue Breakdown
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '16px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>Online Razorpay Settlement</div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
                      ₹{(paymentsSummary?.totalOnlineRazorpayInr || 0).toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '11px', color: '#34d399', marginTop: '2px' }}>Settled to Municipal Bank</div>
                  </div>

                  <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '16px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '12px', color: '#fbbf24', fontWeight: 700 }}>🚚 Driver Cash in Hand</div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
                      ₹{(paymentsSummary?.totalDriverCashInHandInr || 0).toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '11px', color: '#fde68a', marginTop: '2px' }}>Collected • Pending office turn-in</div>
                  </div>

                  <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '16px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>COD Settled to Treasury</div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
                      ₹{(paymentsSummary?.totalCodDepositedInr || 0).toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '11px', color: '#7dd3fc', marginTop: '2px' }}>Cleared & Deposited to Account</div>
                  </div>

                  <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '16px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>Pending Customer COD</div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#f43f5e', marginTop: '4px' }}>
                      ₹{(paymentsSummary?.totalCodPendingInr || 0).toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '11px', color: '#fda4af', marginTop: '2px' }}>Awaiting customer delivery</div>
                  </div>

                  <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '16px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>Eco-Points Redeemed</div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#a78bfa', marginTop: '4px' }}>
                      {(paymentsSummary?.totalEcoPointsRedeemed || 0).toLocaleString('en-IN')} pts
                    </div>
                    <div style={{ fontSize: '11px', color: '#c4b5fd', marginTop: '2px' }}>Citizen loyalty discount</div>
                  </div>
                </div>
              </div>

              {/* SECTION: DAY-WISE DELIVERY CASH COLLECTION & REMITTANCE LEDGER */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                overflow: 'hidden',
                marginBottom: '24px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
              }}>
                <div style={{
                  padding: '20px 24px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '14px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Receipt size={22} color="#fbbf24" />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#f8fafc' }}>
                        🗓️ Day-Wise Delivery Cash Collection & Remittance Ledger
                      </h4>
                      <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                        Audit daily cash collections by delivery executives and officially mark cash submitted into the Municipal Treasury.
                      </p>
                    </div>
                  </div>

                  {/* Filter Controls */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '6px', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '10px' }}>
                      {['ALL', 'TODAY', 'YESTERDAY'].map(f => (
                        <button
                          key={f}
                          onClick={() => setDaywiseDateFilter(f)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            background: daywiseDateFilter === f ? '#0284c7' : 'transparent',
                            color: daywiseDateFilter === f ? '#fff' : '#94a3b8'
                          }}
                        >
                          {f === 'ALL' ? 'All Dates' : f === 'TODAY' ? 'Today' : 'Yesterday'}
                        </button>
                      ))}
                    </div>

                    <select
                      value={daywisePartnerFilter}
                      onChange={(e) => setDaywisePartnerFilter(e.target.value)}
                      style={{
                        background: '#1e293b',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#f8fafc',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 600
                      }}
                    >
                      <option value="ALL">All Delivery Executives</option>
                      {partners.map(p => (
                        <option key={p._id} value={p.name}>{p.name} ({p.phone})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Day-Wise Ledger Highlights */}
                {(() => {
                  const filteredLedger = daywiseLedger.filter(record => {
                    if (daywiseDateFilter === 'TODAY') {
                      const todayStr = new Date().toISOString().slice(0, 10);
                      if (record.date !== todayStr) return false;
                    } else if (daywiseDateFilter === 'YESTERDAY') {
                      const yest = new Date();
                      yest.setDate(yest.getDate() - 1);
                      const yestStr = yest.toISOString().slice(0, 10);
                      if (record.date !== yestStr) return false;
                    }
                    if (daywisePartnerFilter !== 'ALL') {
                      if (record.partnerId !== daywisePartnerFilter && record.partnerName !== daywisePartnerFilter) return false;
                    }
                    return true;
                  });

                  const totalFilteredCollected = filteredLedger.reduce((sum, r) => sum + r.totalCashCollected, 0);
                  const totalFilteredPending = filteredLedger.reduce((sum, r) => sum + r.pendingAmount, 0);
                  const totalFilteredDeposited = filteredLedger.reduce((sum, r) => sum + r.depositedAmount, 0);

                  return (
                    <div>
                      {/* Metric Strip */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '12px',
                        padding: '16px 24px',
                        background: 'rgba(0,0,0,0.25)',
                        borderBottom: '1px solid rgba(255,255,255,0.06)'
                      }}>
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 14px', borderRadius: '10px' }}>
                          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Total Collected COD Cash</div>
                          <div style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>₹{totalFilteredCollected.toLocaleString('en-IN')}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{filteredLedger.length} shift records</div>
                        </div>

                        <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '12px 14px', borderRadius: '10px' }}>
                          <div style={{ fontSize: '11px', color: '#fbbf24', textTransform: 'uppercase', fontWeight: 700 }}>⚠️ In-Hand Cash Pending Turn-in</div>
                          <div style={{ fontSize: '20px', fontWeight: 800, color: '#f59e0b', marginTop: '2px' }}>₹{totalFilteredPending.toLocaleString('en-IN')}</div>
                          <div style={{ fontSize: '11px', color: '#fde68a' }}>Held by drivers • Ready to settle</div>
                        </div>

                        <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '12px 14px', borderRadius: '10px' }}>
                          <div style={{ fontSize: '11px', color: '#34d399', textTransform: 'uppercase', fontWeight: 700 }}>✓ Deposited to Treasury</div>
                          <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>₹{totalFilteredDeposited.toLocaleString('en-IN')}</div>
                          <div style={{ fontSize: '11px', color: '#a7f3d0' }}>Officially cleared into Municipal Account</div>
                        </div>
                      </div>

                      {/* Day-Wise Table */}
                      <div style={{ overflowX: 'auto' }}>
                        {filteredLedger.length === 0 ? (
                          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
                            <Package size={36} color="#64748b" style={{ margin: '0 auto 8px', opacity: 0.6 }} />
                            <div>No COD cash collections recorded for the selected filter.</div>
                          </div>
                        ) : (
                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                            <thead>
                              <tr style={{ background: 'rgba(255, 255, 255, 0.02)', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                <th style={{ padding: '12px 20px' }}>Shift Date</th>
                                <th style={{ padding: '12px 20px' }}>Delivery Executive</th>
                                <th style={{ padding: '12px 20px' }}>Delivered COD Orders</th>
                                <th style={{ padding: '12px 20px' }}>Collected Cash</th>
                                <th style={{ padding: '12px 20px' }}>Remittance Status</th>
                                <th style={{ padding: '12px 20px', textAlign: 'right' }}>Official Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredLedger.map((record) => {
                                const isPending = record.pendingAmount > 0;
                                const isSettlingThis = settlingDayKey === record.groupKey;

                                return (
                                  <tr key={record.groupKey} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: '#f8fafc' }}>
                                    <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Calendar size={15} color="#38bdf8" />
                                        <span style={{ fontWeight: 800 }}>
                                          {new Date(record.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                      </div>
                                    </td>

                                    <td style={{ padding: '14px 20px' }}>
                                      <div style={{ fontWeight: 700, color: '#f8fafc' }}>{record.partnerName}</div>
                                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                        📞 {record.partnerPhone || 'No phone'} • 🛵 {record.partnerVehicle}
                                      </div>
                                    </td>

                                    <td style={{ padding: '14px 20px' }}>
                                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: 'rgba(2, 132, 199, 0.2)', color: '#38bdf8' }}>
                                          {record.orderCount} {record.orderCount === 1 ? 'Order' : 'Orders'}
                                        </span>
                                        {record.orderNumbers.map((ordNum, i) => (
                                          <span key={i} style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.06)', color: '#cbd5e1' }}>
                                            {ordNum}
                                          </span>
                                        ))}
                                      </div>
                                    </td>

                                    <td style={{ padding: '14px 20px' }}>
                                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#10b981' }}>
                                        ₹{record.totalCashCollected}
                                      </div>
                                      {record.pendingAmount > 0 && record.depositedAmount > 0 && (
                                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                                          ₹{record.depositedAmount} cleared • ₹{record.pendingAmount} due
                                        </div>
                                      )}
                                    </td>

                                    <td style={{ padding: '14px 20px' }}>
                                      {isPending ? (
                                        <span style={{
                                          padding: '4px 10px',
                                          borderRadius: '8px',
                                          fontSize: '11px',
                                          fontWeight: 700,
                                          background: 'rgba(245, 158, 11, 0.18)',
                                          color: '#fbbf24',
                                          border: '1px solid rgba(245, 158, 11, 0.4)',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px'
                                        }}>
                                          ⚠️ Pending Submission: ₹{record.pendingAmount}
                                        </span>
                                      ) : (
                                        <div>
                                          <span style={{
                                            padding: '4px 10px',
                                            borderRadius: '8px',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            background: 'rgba(16, 185, 129, 0.15)',
                                            color: '#34d399',
                                            border: '1px solid rgba(16, 185, 129, 0.35)',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                          }}>
                                            <CheckCircle2 size={12} /> ✓ Submitted to Treasury (₹{record.depositedAmount})
                                          </span>
                                          {record.settledBy && (
                                            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                                              Cleared by {record.settledBy}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </td>

                                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                                      {isPending ? (
                                        <button
                                          onClick={() => handleSettleDaywiseCash(record)}
                                          disabled={isSettlingThis}
                                          style={{
                                            background: '#10b981',
                                            border: 'none',
                                            color: '#ffffff',
                                            padding: '8px 14px',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                                          }}
                                        >
                                          <ShieldCheck size={14} /> {isSettlingThis ? 'Clearing...' : '✓ Mark Day Cash as Submitted'}
                                        </button>
                                      ) : (
                                        <span style={{ fontSize: '12px', color: '#34d399', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                          <Check size={14} /> Deposited
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Payment Records Table */}
              <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>Recent Eco-Store Transactions</h4>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>{orders.length} total orders recorded</span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255, 255, 255, 0.02)', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <th style={{ padding: '12px 20px' }}>Order #</th>
                        <th style={{ padding: '12px 20px' }}>Citizen</th>
                        <th style={{ padding: '12px 20px' }}>Payment Mode</th>
                        <th style={{ padding: '12px 20px' }}>Amount</th>
                        <th style={{ padding: '12px 20px' }}>Payment Status</th>
                        <th style={{ padding: '12px 20px' }}>Order Status</th>
                        <th style={{ padding: '12px 20px' }}>Date</th>
                        <th style={{ padding: '12px 20px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(o => (
                        <tr key={o._id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: '#f8fafc' }}>
                          <td style={{ padding: '14px 20px', fontWeight: 700 }}>{o.orderNumber}</td>
                          <td style={{ padding: '14px 20px' }}>
                            <div>{o.userName}</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{o.userPhone}</div>
                          </td>
                          <td style={{ padding: '14px 20px' }}>{o.paymentMethod}</td>
                          <td style={{ padding: '14px 20px', fontWeight: 800, color: '#10b981' }}>₹{o.totalAmountInr}</td>
                          <td style={{ padding: '14px 20px' }}>
                            {(() => {
                              const badge = getOfficialPaymentBadge(o);
                              return (
                                <span style={{
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  background: badge.bg,
                                  color: badge.color,
                                  border: `1px solid ${badge.border}`
                                }}>
                                  {badge.text}
                                </span>
                              );
                            })()}
                          </td>
                          <td style={{ padding: '14px 20px' }}>
                            <span style={{ fontSize: '12px', color: '#cbd5e1' }}>{o.orderStatus}</span>
                          </td>
                          <td style={{ padding: '14px 20px', color: '#94a3b8', fontSize: '12px' }}>
                            {new Date(o.createdAt).toLocaleDateString('en-IN')}
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              {o.cashCollectionStatus === 'Collected' && (
                                <button
                                  onClick={() => handleSettleOrderCash(o)}
                                  title="Clear & deposit collected cash into treasury"
                                  style={{
                                    background: '#10b981',
                                    border: 'none',
                                    color: '#fff',
                                    padding: '6px 10px',
                                    borderRadius: '8px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  <ShieldCheck size={12} /> Clear Cash
                                </button>
                              )}
                              <button
                                onClick={() => openPaymentModal(o)}
                                style={{
                                  background: o.paymentStatus === 'Paid' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.2)',
                                  border: o.paymentStatus === 'Paid' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.4)',
                                  color: o.paymentStatus === 'Paid' ? '#34d399' : '#fbbf24',
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <CreditCard size={12} /> {o.paymentStatus === 'Paid' ? 'Edit' : 'Update'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL: Assign Order to Delivery Partner */}
        {showAssignModal && selectedOrder && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
            <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', width: '100%', maxWidth: '480px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#fff' }}>Assign Delivery Partner</h3>
                <button onClick={() => setShowAssignModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '12px', borderRadius: '10px', marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#38bdf8' }}>Order: {selectedOrder.orderNumber}</div>
                <div style={{ fontSize: '13px', color: '#f8fafc', marginTop: '2px' }}>Citizen: {selectedOrder.userName} ({selectedOrder.userPhone})</div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Destination: {selectedOrder.deliveryAddress?.street}, {selectedOrder.deliveryAddress?.city}</div>
              </div>

              <form onSubmit={handleAssignOrder}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                    Select Available On-Duty Delivery Executive
                  </label>
                  <select
                    required
                    value={selectedPartnerId}
                    onChange={(e) => setSelectedPartnerId(e.target.value)}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '10px 12px', borderRadius: '8px', fontSize: '13px' }}
                  >
                    <option value="">-- Choose Partner --</option>
                    {partners.map(p => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p.phone}) - {p.vehicleNumber} {p.isAvailable ? '🟢 (Available)' : '🔴 (Busy/Off)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Dispatch / Handling Note</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Handle with care, 2 bags of fortified neem compost"
                    value={assignmentNote}
                    onChange={(e) => setAssignmentNote(e.target.value)}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '9px 12px', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowAssignModal(false)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#94a3b8', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" disabled={assigning} style={{ background: '#0284c7', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                    {assigning ? 'Assigning...' : 'Assign & Notify Citizen 🚀'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Update Payment Status & Cash Collection */}
        {paymentModalOrder && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
            <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', width: '100%', maxWidth: '480px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CreditCard size={18} color="#10b981" /> Update Order Payment Status
                </h3>
                <button onClick={() => setPaymentModalOrder(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '12px 14px', borderRadius: '10px', marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#38bdf8' }}>Order: {paymentModalOrder.orderNumber}</div>
                <div style={{ fontSize: '13px', color: '#f8fafc', marginTop: '2px' }}>Citizen: {paymentModalOrder.userName} ({paymentModalOrder.userPhone})</div>
                <div style={{ fontSize: '13px', color: '#10b981', fontWeight: 700, marginTop: '2px' }}>
                  Total Bill: ₹{paymentModalOrder.totalAmountInr} • Mode: {paymentModalOrder.paymentMethod}
                </div>
              </div>

              <form onSubmit={handleUpdatePayment}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                    Payment Status
                  </label>
                  <select
                    value={paymentForm.paymentStatus}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentStatus: e.target.value })}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '10px 12px', borderRadius: '8px', fontSize: '13px' }}
                  >
                    <option value="Paid">Paid (Confirmed / Collected)</option>
                    <option value="Pending">Pending (Awaiting Handover Payment)</option>
                    <option value="Failed">Failed</option>
                    <option value="Refunded">Refunded</option>
                  </select>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                    Cash Collection Status (for COD / Yard Cash)
                  </label>
                  <select
                    value={paymentForm.cashCollectionStatus}
                    onChange={(e) => setPaymentForm({ ...paymentForm, cashCollectionStatus: e.target.value })}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '10px 12px', borderRadius: '8px', fontSize: '13px' }}
                  >
                    <option value="Collected">Collected (Received by Rider / Yard)</option>
                    <option value="Deposited">Deposited into Municipal Account</option>
                    <option value="Pending Collection">Pending Collection</option>
                    <option value="Not Applicable">Not Applicable (Online / Points)</option>
                  </select>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                    Cash Amount Collected (₹)
                  </label>
                  <input
                    type="number"
                    value={paymentForm.cashCollected}
                    onChange={(e) => setPaymentForm({ ...paymentForm, cashCollected: e.target.value })}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                    Audit / Reconciliation Note
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cash received at municipal yard counter, receipt #1042"
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '9px 12px', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setPaymentModalOrder(null)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#94a3b8', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" disabled={updatingPayment} style={{ background: '#10b981', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                    {updatingPayment ? 'Updating...' : 'Save & Update Payment 💳'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Add New Delivery Partner */}
        {showAddPartnerModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
            <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', width: '100%', maxWidth: '500px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#fff' }}>Register Delivery Partner</h3>
                <button onClick={() => setShowAddPartnerModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
              </div>

              <form onSubmit={handleAddPartner}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Shetty"
                    value={newPartnerForm.name}
                    onChange={(e) => setNewPartnerForm({ ...newPartnerForm, name: e.target.value })}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '9px 12px', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Email Address (Login Username)</label>
                    <input
                      type="email"
                      required
                      placeholder="ramesh@canopy.gov.in"
                      value={newPartnerForm.email}
                      onChange={(e) => setNewPartnerForm({ ...newPartnerForm, email: e.target.value })}
                      style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '9px 12px', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Phone Number</label>
                    <input
                      type="tel"
                      required
                      placeholder="9845012345"
                      value={newPartnerForm.phone}
                      onChange={(e) => setNewPartnerForm({ ...newPartnerForm, phone: e.target.value })}
                      style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '9px 12px', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* Login Password Input Field */}
                <div style={{ marginBottom: '12px', background: 'rgba(2, 132, 199, 0.08)', border: '1px solid rgba(2, 132, 199, 0.25)', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#38bdf8' }}>
                      🔑 Login Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPartnerPassword(!showPartnerPassword)}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      {showPartnerPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                      {showPartnerPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <input
                    type={showPartnerPassword ? 'text' : 'password'}
                    required
                    value={newPartnerForm.password}
                    onChange={(e) => setNewPartnerForm({ ...newPartnerForm, password: e.target.value })}
                    placeholder="Set password (default: Delivery@123)"
                    style={{ width: '100%', background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '9px 12px', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', lineHeight: 1.4 }}>
                    ℹ️ The agent logs in at <code>/login</code> under the <strong>Delivery</strong> tab using this email &amp; password.
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Vehicle Type</label>
                    <select
                      value={newPartnerForm.vehicleType}
                      onChange={(e) => setNewPartnerForm({ ...newPartnerForm, vehicleType: e.target.value })}
                      style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '9px 12px', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                    >
                      <option value="Three-Wheeler EV Cargo">Three-Wheeler EV Cargo</option>
                      <option value="EV Two-Wheeler with Carrier">EV Two-Wheeler with Carrier</option>
                      <option value="Municipal Mini Tipper">Municipal Mini Tipper</option>
                      <option value="E-Rickshaw Loader">E-Rickshaw Loader</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Vehicle Number</label>
                    <input
                      type="text"
                      required
                      placeholder="KA-20-EV-4091"
                      value={newPartnerForm.vehicleNumber}
                      onChange={(e) => setNewPartnerForm({ ...newPartnerForm, vehicleNumber: e.target.value })}
                      style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '9px 12px', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Delivery Sector / Zone</label>
                  <input
                    type="text"
                    required
                    value={newPartnerForm.deliveryZone}
                    onChange={(e) => setNewPartnerForm({ ...newPartnerForm, deliveryZone: e.target.value })}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '9px 12px', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowAddPartnerModal(false)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#94a3b8', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" disabled={addingPartner} style={{ background: '#0284c7', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                    {addingPartner ? 'Registering...' : 'Add Delivery Partner'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Order Timeline & Handover Proof */}
        {viewingTimelineOrder && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
            <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', width: '100%', maxWidth: '540px', maxHeight: '85vh', overflowY: 'auto', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#fff' }}>Order Timeline & Status History</h3>
                <button onClick={() => setViewingTimelineOrder(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '12px', borderRadius: '10px', marginBottom: '16px' }}>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#38bdf8' }}>{viewingTimelineOrder.orderNumber}</div>
                <div style={{ fontSize: '13px', color: '#f8fafc', marginTop: '2px' }}>Citizen: {viewingTimelineOrder.userName} ({viewingTimelineOrder.userEmail})</div>
                <div style={{ fontSize: '13px', color: '#10b981', fontWeight: 700, marginTop: '2px' }}>Total Amount: ₹{viewingTimelineOrder.totalAmountInr} ({viewingTimelineOrder.paymentMethod})</div>
              </div>

              <div style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px' }}>Status Log & Automated Email Triggers</div>

              <div style={{ borderLeft: '2px solid rgba(255,255,255,0.15)', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {(viewingTimelineOrder.statusTimeline || []).map((ev, idx) => (
                  <div key={idx}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>{ev.status}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{ev.note}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      {new Date(ev.timestamp).toLocaleString('en-IN')} • Updated by: {ev.updatedBy || 'System'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
