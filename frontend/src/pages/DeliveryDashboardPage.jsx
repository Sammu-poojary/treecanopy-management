import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  Truck,
  Package,
  MapPin,
  Navigation,
  Phone,
  CheckCircle2,
  Clock,
  AlertCircle,
  QrCode,
  Camera,
  DollarSign,
  ShieldCheck,
  Calendar,
  LogOut,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Info,
  User,
  X,
  Send,
  Sparkles
} from 'lucide-react';
import { Topbar } from './CanopyPages';

// Mock yard location for Udupi Municipal Biomass Center
const YARD_COORDS = { lat: 13.3409, lng: 74.7421, name: 'Ajjarkadu Municipal Biomass Center' };

export default function DeliveryDashboardPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ACTIVE'); // 'ACTIVE', 'COMPLETED', 'ALL'

  // Logged-in delivery partner profile
  const [partner, setPartner] = useState(() => {
    try {
      const saved = localStorage.getItem('user') || localStorage.getItem('delivery_user');
      if (saved) {
        const u = JSON.parse(saved);
        if (u.role === 'Delivery Partner' || u.role === 'Delivery') return u;
      }
    } catch (e) {}
    return {
      _id: 'del_raghu_01',
      name: 'Raghavendra Rao',
      email: 'raghu.delivery@canopy.gov.in',
      phone: '9845012345',
      role: 'Delivery Partner',
      vehicleType: 'Three-Wheeler EV Cargo',
      vehicleNumber: 'KA-20-EV-4091',
      deliveryZone: 'Udupi Central & Manipal Sector'
    };
  });

  // Attendance state
  const [shiftStatus, setShiftStatus] = useState('Checked In');
  const [clockInTime, setClockInTime] = useState('09:15 AM');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ reason: '', date: new Date().toISOString().slice(0, 10), leaveType: 'Casual Leave' });

  // Map & Handover modals
  const [activeNavOrder, setActiveNavOrder] = useState(null);
  const [mapDistanceKm, setMapDistanceKm] = useState('3.8');
  const [mapEtaMinutes, setMapEtaMinutes] = useState('14');

  const [handoverOrder, setHandoverOrder] = useState(null);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [proofPhoto, setProofPhoto] = useState('');
  const [cashCollectedInput, setCashCollectedInput] = useState('');
  const [submittingHandover, setSubmittingHandover] = useState(false);

  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/eco-orders/delivery-tasks?partnerPhone=${partner.phone || ''}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(Array.isArray(data) ? data : []);
      } else {
        // Fallback fetch all home deliveries
        const allRes = await fetch('http://localhost:5000/api/eco-orders/all?fulfillmentType=Home Delivery');
        if (allRes.ok) {
          const allData = await allRes.json();
          setTasks(Array.isArray(allData) ? allData : []);
        }
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Update Status: Out for Delivery
  const handleMarkOutForDelivery = async (order) => {
    try {
      const res = await fetch(`http://localhost:5000/api/eco-orders/${order._id}/delivery-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Out for Delivery',
          etaMinutes: 20,
          updatedBy: partner.name
        })
      });

      if (!res.ok) throw new Error('Failed to update status');

      Swal.fire({
        icon: 'success',
        title: 'Dispatched & Out for Delivery! 🚚',
        text: `Citizen ${order.userName} has been sent an automated dispatch email with live ETA and OTP.`,
        confirmButtonColor: '#10b981'
      });

      fetchTasks();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
  };

  // Update Status: Arrived at Location
  const handleMarkArrived = async (order) => {
    try {
      const res = await fetch(`http://localhost:5000/api/eco-orders/${order._id}/delivery-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Arrived at Location',
          updatedBy: partner.name
        })
      });

      if (!res.ok) throw new Error('Failed to update status');

      Swal.fire({
        icon: 'info',
        title: 'Arrived at Customer Doorstep! 📍',
        text: `Please meet citizen ${order.userName} and ask for the 4-digit handover OTP.`,
        confirmButtonColor: '#0284c7'
      });

      fetchTasks();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
  };

  // Submit Handover Completion
  const handleSubmitHandover = async (e) => {
    e.preventDefault();
    if (!handoverOrder) return;

    if (handoverOrder.deliveryOtp && enteredOtp.trim() !== handoverOrder.deliveryOtp.trim()) {
      Swal.fire({
        icon: 'error',
        title: 'Incorrect OTP',
        text: 'The 4-digit code does not match citizen\'s delivery OTP. Please verify with citizen.'
      });
      return;
    }

    setSubmittingHandover(true);
    try {
      const res = await fetch(`http://localhost:5000/api/eco-orders/${handoverOrder._id}/delivery-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Delivered',
          otp: enteredOtp,
          proofPhoto: proofPhoto || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop&q=60',
          cashCollected: handoverOrder.paymentMethod === 'Cash on Delivery' ? (cashCollectedInput || handoverOrder.totalAmountInr) : 0,
          updatedBy: partner.name
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete handover');

      Swal.fire({
        icon: 'success',
        title: 'Delivery Completed! 🎉',
        text: `Order ${handoverOrder.orderNumber} successfully delivered. Proof recorded & confirmation email sent to citizen.`,
        confirmButtonColor: '#10b981'
      });

      setHandoverOrder(null);
      setEnteredOtp('');
      setProofPhoto('');
      setCashCollectedInput('');
      fetchTasks();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    } finally {
      setSubmittingHandover(false);
    }
  };

  // Setup Leaflet map when navigation modal opens
  useEffect(() => {
    if (!activeNavOrder || !mapContainerRef.current) return;

    // Dynamically load Leaflet CSS if not loaded
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    let mapInstance = null;

    const initMap = async () => {
      const L = window.L || (await import('leaflet'));

      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
      }

      const destLat = activeNavOrder.deliveryCoordinates?.lat || (13.3409 + 0.015);
      const destLng = activeNavOrder.deliveryCoordinates?.lng || (74.7421 + 0.012);

      mapInstance = L.map(mapContainerRef.current).setView([YARD_COORDS.lat, YARD_COORDS.lng], 13);
      leafletMapRef.current = mapInstance;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstance);

      // Yard Marker (Green)
      const yardIcon = L.divIcon({
        className: 'custom-yard-icon',
        html: `<div style="background: #10b981; color: #fff; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 16px; border: 3px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">🌱</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });
      L.marker([YARD_COORDS.lat, YARD_COORDS.lng], { icon: yardIcon })
        .addTo(mapInstance)
        .bindPopup(`<b>Municipal Biomass Yard</b><br/>Pickup Origin`)
        .openPopup();

      // Destination Marker (Red / Blue)
      const destIcon = L.divIcon({
        className: 'custom-dest-icon',
        html: `<div style="background: #0284c7; color: #fff; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 16px; border: 3px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">📍</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });
      L.marker([destLat, destLng], { icon: destIcon })
        .addTo(mapInstance)
        .bindPopup(`<b>${activeNavOrder.userName}</b><br/>${activeNavOrder.deliveryAddress?.street || 'Address'}`);

      // Route Polyline
      const routePoints = [
        [YARD_COORDS.lat, YARD_COORDS.lng],
        [YARD_COORDS.lat + 0.005, YARD_COORDS.lng + 0.004],
        [YARD_COORDS.lat + 0.010, YARD_COORDS.lng + 0.008],
        [destLat, destLng]
      ];

      L.polyline(routePoints, {
        color: '#0284c7',
        weight: 5,
        opacity: 0.85,
        dashArray: '8, 8',
        lineCap: 'round'
      }).addTo(mapInstance);

      // Fit bounds
      const bounds = L.latLngBounds([
        [YARD_COORDS.lat, YARD_COORDS.lng],
        [destLat, destLng]
      ]);
      mapInstance.fitBounds(bounds, { padding: [40, 40] });
    };

    setTimeout(initMap, 150);

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [activeNavOrder]);

  const filteredTasks = tasks.filter(t => {
    const isCompleted = t.currentDeliveryStatus === 'Delivered' || t.orderStatus === 'Delivered / Collected';
    if (activeFilter === 'ACTIVE') return !isCompleted;
    if (activeFilter === 'COMPLETED') return isCompleted;
    return true;
  });

  return (
    <div style={{ minHeight: '100vh', background: '#090d16', color: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      <Topbar role="Delivery Partner" />

      {/* Driver Status Banner */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(2, 132, 199, 0.2) 0%, rgba(9, 13, 22, 0.95) 100%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '24px 20px 20px'
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 20px rgba(2, 132, 199, 0.3)'
              }}>
                <Truck size={28} color="#ffffff" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                    {partner.name}
                  </h1>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>
                    🟢 Shift Active
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>
                  🛵 {partner.vehicleType} • <b style={{ color: '#f8fafc' }}>{partner.vehicleNumber}</b> • {partner.deliveryZone}
                </div>
              </div>
            </div>

            {/* Attendance & Shift Card */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(30, 41, 59, 0.6)', padding: '8px 14px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Shift Clock-in</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#38bdf8' }}>{clockInTime} (Morning)</div>
              </div>

              <button
                onClick={() => setShowLeaveModal(true)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#f8fafc',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Apply Leave
              </button>

              <button
                onClick={fetchTasks}
                style={{
                  background: 'rgba(2, 132, 199, 0.2)',
                  border: '1px solid rgba(2, 132, 199, 0.4)',
                  color: '#38bdf8',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={14} className={loading ? 'spin' : ''} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Delivery Queue Section */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 20px 60px' }}>
        {/* Filter Tabs */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveFilter('ACTIVE')}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                border: activeFilter === 'ACTIVE' ? '1px solid #0284c7' : '1px solid rgba(255, 255, 255, 0.1)',
                background: activeFilter === 'ACTIVE' ? 'rgba(2, 132, 199, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                color: activeFilter === 'ACTIVE' ? '#38bdf8' : '#94a3b8'
              }}
            >
              🚴 Active Orders ({tasks.filter(t => t.currentDeliveryStatus !== 'Delivered' && t.orderStatus !== 'Delivered / Collected').length})
            </button>

            <button
              onClick={() => setActiveFilter('COMPLETED')}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                border: activeFilter === 'COMPLETED' ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                background: activeFilter === 'COMPLETED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                color: activeFilter === 'COMPLETED' ? '#34d399' : '#94a3b8'
              }}
            >
              ✅ Completed Today ({tasks.filter(t => t.currentDeliveryStatus === 'Delivered' || t.orderStatus === 'Delivered / Collected').length})
            </button>
          </div>

          <span style={{ fontSize: '13px', color: '#94a3b8' }}>
            {filteredTasks.length} deliveries in queue
          </span>
        </div>

        {/* Tasks List */}
        {filteredTasks.length === 0 ? (
          <div style={{ background: 'rgba(15, 23, 42, 0.4)', borderRadius: '16px', padding: '56px 20px', textAlign: 'center', border: '1px dashed rgba(255, 255, 255, 0.1)' }}>
            <Package size={44} color="#64748b" style={{ margin: '0 auto 14px' }} />
            <h3 style={{ color: '#f8fafc', margin: '0 0 6px 0', fontSize: '18px' }}>
              {activeFilter === 'ACTIVE' ? 'No Active Delivery Tasks' : 'No Completed Tasks Yet'}
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
              {activeFilter === 'ACTIVE' ? 'You have cleared all assigned compost deliveries. Great work!' : 'Completed orders will appear here once verified.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredTasks.map(order => {
              const isDelivered = order.currentDeliveryStatus === 'Delivered' || order.orderStatus === 'Delivered / Collected';
              const isOutForDelivery = order.currentDeliveryStatus === 'Out for Delivery';
              const isArrived = order.currentDeliveryStatus === 'Arrived at Location';
              const isCod = order.paymentMethod === 'Cash on Delivery';

              return (
                <div
                  key={order._id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: isDelivered ? '1px solid rgba(16, 185, 129, 0.3)' : isOutForDelivery ? '1px solid rgba(2, 132, 199, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                    padding: '20px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
                  }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px', marginBottom: '14px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '17px', fontWeight: 800, color: '#f8fafc' }}>
                          {order.orderNumber}
                        </span>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: isDelivered ? 'rgba(16, 185, 129, 0.15)' : isOutForDelivery ? 'rgba(2, 132, 199, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                          color: isDelivered ? '#34d399' : isOutForDelivery ? '#38bdf8' : '#fbbf24'
                        }}>
                          {order.currentDeliveryStatus || order.orderStatus}
                        </span>
                      </div>

                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#38bdf8', marginTop: '4px' }}>
                        {order.userName}
                      </div>
                    </div>

                    {/* Payment Badge */}
                    <div style={{
                      background: isCod && order.paymentStatus !== 'Paid' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      border: isCod && order.paymentStatus !== 'Paid' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                      padding: '6px 12px',
                      borderRadius: '10px',
                      textAlign: 'right'
                    }}>
                      <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Payment Mode</div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: isCod && order.paymentStatus !== 'Paid' ? '#f87171' : '#34d399' }}>
                        {isCod && order.paymentStatus !== 'Paid' ? `💵 Collect ₹${order.totalAmountInr} COD` : `✅ Paid Online (₹${order.totalAmountInr})`}
                      </div>
                    </div>
                  </div>

                  {/* Address Box */}
                  <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '12px 14px', borderRadius: '12px', marginBottom: '14px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ fontSize: '13px', color: '#f8fafc', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <MapPin size={16} color="#38bdf8" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <b>{order.deliveryAddress?.street || 'Delivery Address'}</b>, {order.deliveryAddress?.city || 'Udupi'} - {order.deliveryAddress?.postalCode || '576101'}
                        {order.deliveryAddress?.landmark && (
                          <div style={{ fontSize: '12px', color: '#fbbf24', marginTop: '2px' }}>
                            Landmark: {order.deliveryAddress.landmark}
                          </div>
                        )}
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                          Preferred Slot: {order.deliveryAddress?.preferredSlot || 'Morning 9 AM - 1 PM'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Items List */}
                  <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px' }}>
                    <span style={{ fontWeight: 700, color: '#f8fafc' }}>Products to Handover: </span>
                    {(order.items || []).map(i => `${i.productName} (${i.unitSize}) x${i.quantity}`).join(', ')}
                  </div>

                  {/* Action Bar */}
                  {!isDelivered ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                      {/* Live Navigation Map Button */}
                      <button
                        onClick={() => setActiveNavOrder(order)}
                        style={{
                          background: 'rgba(2, 132, 199, 0.2)',
                          border: '1px solid rgba(2, 132, 199, 0.4)',
                          color: '#38bdf8',
                          padding: '10px 16px',
                          borderRadius: '10px',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Navigation size={15} /> Open Leaflet Route (~{mapDistanceKm} km)
                      </button>

                      {/* Call Citizen */}
                      {order.userPhone && (
                        <a
                          href={`tel:${order.userPhone}`}
                          style={{
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            color: '#f8fafc',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            fontSize: '13px',
                            fontWeight: 600,
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <Phone size={14} color="#10b981" /> Call Citizen
                        </a>
                      )}

                      {/* Step 1: Out for Delivery */}
                      {!isOutForDelivery && !isArrived && (
                        <button
                          onClick={() => handleMarkOutForDelivery(order)}
                          style={{
                            background: '#0284c7',
                            border: 'none',
                            color: '#ffffff',
                            padding: '10px 18px',
                            borderRadius: '10px',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginLeft: 'auto'
                          }}
                        >
                          <Truck size={15} /> Pick Up & Start Delivery
                        </button>
                      )}

                      {/* Step 2: Mark Arrived */}
                      {isOutForDelivery && !isArrived && (
                        <button
                          onClick={() => handleMarkArrived(order)}
                          style={{
                            background: '#d97706',
                            border: 'none',
                            color: '#ffffff',
                            padding: '10px 18px',
                            borderRadius: '10px',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginLeft: 'auto'
                          }}
                        >
                          <MapPin size={15} /> Arrived at Doorstep
                        </button>
                      )}

                      {/* Step 3: Complete Handover (OTP & Proof) */}
                      {(isOutForDelivery || isArrived) && (
                        <button
                          onClick={() => {
                            setHandoverOrder(order);
                            setEnteredOtp('');
                            setCashCollectedInput(order.totalAmountInr);
                          }}
                          style={{
                            background: '#059669',
                            border: 'none',
                            color: '#ffffff',
                            padding: '10px 18px',
                            borderRadius: '10px',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <CheckCircle2 size={15} /> Complete Handover (OTP)
                        </button>
                      )}
                    </div>
                  ) : (
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '10px 14px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '13px', color: '#34d399', fontWeight: 600 }}>
                        ✅ Delivered on {order.deliveredAt ? new Date(order.deliveredAt).toLocaleTimeString('en-IN') : 'Today'}
                      </div>
                      {order.deliveryProofPhoto && (
                        <a href={order.deliveryProofPhoto} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#38bdf8', textDecoration: 'underline' }}>
                          View Handover Photo
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: Leaflet Route Navigation */}
      {activeNavOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', width: '100%', maxWidth: '720px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#fff' }}>
                  🗺️ Live Delivery Navigation Route
                </h3>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                  Destination: {activeNavOrder.userName} • {activeNavOrder.deliveryAddress?.street}
                </div>
              </div>
              <button onClick={() => setActiveNavOrder(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={22} /></button>
            </div>

            {/* Route Stats Bar */}
            <div style={{ background: 'rgba(2, 132, 199, 0.15)', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Distance</span>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#38bdf8' }}>{mapDistanceKm} km</div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Estimated ETA</span>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#34d399' }}>~{mapEtaMinutes} Mins</div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Origin</span>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>Ajjarkadu Yard</div>
                </div>
              </div>

              <a
                href={`https://www.google.com/maps/dir/?api=1&origin=${YARD_COORDS.lat},${YARD_COORDS.lng}&destination=${activeNavOrder.deliveryCoordinates?.lat || 13.3512},${activeNavOrder.deliveryCoordinates?.lng || 74.7503}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: '#0284c7',
                  color: '#fff',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <ExternalLink size={14} /> Open in Google Maps GPS
              </a>
            </div>

            {/* Leaflet Map Canvas */}
            <div ref={mapContainerRef} style={{ height: '360px', width: '100%', background: '#1e293b' }} />

            <div style={{ padding: '14px 24px', background: '#0b1120', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Green line indicates EV delivery corridor via Udupi-Manipal Main Road
              </span>
              <button onClick={() => setActiveNavOrder(null)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#f8fafc', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>Close Map</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Complete Handover (OTP & COD) */}
      {handoverOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', width: '100%', maxWidth: '480px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#fff' }}>
                Confirm Delivery & Verify OTP
              </h3>
              <button onClick={() => setHandoverOrder(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '12px', borderRadius: '10px', marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#38bdf8' }}>Order: {handoverOrder.orderNumber}</div>
              <div style={{ fontSize: '13px', color: '#f8fafc', marginTop: '2px' }}>Citizen: {handoverOrder.userName} ({handoverOrder.userPhone})</div>
            </div>

            <form onSubmit={handleSubmitHandover}>
              {/* OTP Field */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
                  Enter 4-Digit Citizen Delivery OTP:
                </label>
                <input
                  type="text"
                  maxLength={4}
                  required
                  placeholder="e.g. 9041"
                  value={enteredOtp}
                  onChange={(e) => setEnteredOtp(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#1e293b',
                    border: '2px solid #0284c7',
                    color: '#fff',
                    padding: '12px',
                    borderRadius: '10px',
                    fontSize: '22px',
                    fontWeight: 900,
                    letterSpacing: '8px',
                    textAlign: 'center',
                    boxSizing: 'border-box'
                  }}
                />
                <small style={{ color: '#94a3b8', fontSize: '11px', display: 'block', marginTop: '4px' }}>
                  Ask the customer for the code sent to their email / SMS.
                </small>
              </div>

              {/* COD Cash Collection Confirmation */}
              {handoverOrder.paymentMethod === 'Cash on Delivery' && (
                <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px', borderRadius: '10px', marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#fca5a5', marginBottom: '4px' }}>
                    💵 Cash Payment to Collect:
                  </label>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#f87171' }}>
                    ₹{handoverOrder.totalAmountInr}
                  </div>
                  <div style={{ fontSize: '11px', color: '#fca5a5', marginTop: '4px' }}>
                    Please ensure exact cash has been received from the customer before completing.
                  </div>
                </div>
              )}

              {/* Proof Photo URL / Camera */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                  Delivery Proof Photo URL (Optional)
                </label>
                <input
                  type="text"
                  placeholder="https://... (or leave default compost proof)"
                  value={proofPhoto}
                  onChange={(e) => setProofPhoto(e.target.value)}
                  style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '9px 12px', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setHandoverOrder(null)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#94a3b8', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={submittingHandover} style={{ background: '#059669', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                  {submittingHandover ? 'Verifying...' : 'Verify OTP & Complete Delivery 🎉'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Apply for Leave */}
      {showLeaveModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', width: '100%', maxWidth: '440px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#fff' }}>Apply for Delivery Shift Leave</h3>
              <button onClick={() => setShowLeaveModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              Swal.fire({
                icon: 'success',
                title: 'Leave Request Submitted',
                text: 'Your leave request has been submitted to the Official Operations Desk for approval.',
                confirmButtonColor: '#10b981'
              });
              setShowLeaveModal(false);
            }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Leave Date</label>
                <input
                  type="date"
                  required
                  value={leaveForm.date}
                  onChange={(e) => setLeaveForm({ ...leaveForm, date: e.target.value })}
                  style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '9px 12px', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Leave Type</label>
                <select
                  value={leaveForm.leaveType}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
                  style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '9px 12px', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                >
                  <option value="Casual Leave">Casual Leave</option>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Emergency Duty Leave">Emergency Duty Leave</option>
                </select>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Reason</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Reason for leave request..."
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '9px 12px', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowLeaveModal(false)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#94a3b8', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ background: '#0284c7', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                  Submit Leave Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
