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
  Sparkles,
  CreditCard,
  Check,
  Receipt
} from 'lucide-react';
import { Topbar } from './CanopyPages';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const loadRazorpaySdk = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

// Mock yard location for Udupi Municipal Biomass Center
const YARD_COORDS = { lat: 13.3409, lng: 74.7421, name: 'Ajjarkadu Municipal Biomass Center' };

export default function DeliveryDashboardPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ACTIVE'); // 'ACTIVE', 'COMPLETED', 'ALL'

  // Logged-in delivery partner profile (dynamically read from localStorage)
  const [partner, setPartner] = useState(() => {
    try {
      const saved = localStorage.getItem('currentUser') || localStorage.getItem('user') || localStorage.getItem('delivery_user');
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

  useEffect(() => {
    try {
      const saved = localStorage.getItem('currentUser') || localStorage.getItem('user') || localStorage.getItem('delivery_user');
      if (saved) {
        const u = JSON.parse(saved);
        if (u.role === 'Delivery Partner' || u.role === 'Delivery') {
          setPartner(u);
        }
      }
    } catch (e) {}
  }, []);

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
  const [cashCollectedInput, setCashCollectedInput] = useState('');
  const [submittingHandover, setSubmittingHandover] = useState(false);

  // Doorstep Payment Selection & Razorpay/QR state
  const [handoverPaymentMode, setHandoverPaymentMode] = useState('COD'); // 'COD' or 'RAZORPAY'
  const [doorstepPaymentStatus, setDoorstepPaymentStatus] = useState('UNPAID'); // 'UNPAID', 'SUCCESS'
  const [doorstepTxnId, setDoorstepTxnId] = useState('');
  const [doorstepUpiIntent, setDoorstepUpiIntent] = useState('');
  const [doorstepQrUrl, setDoorstepQrUrl] = useState('');
  const [doorstepInitLoading, setDoorstepInitLoading] = useState(false);
  const [doorstepRazorpayData, setDoorstepRazorpayData] = useState(null);
  const [showProofScanner, setShowProofScanner] = useState(false);
  const [proofTxnInput, setProofTxnInput] = useState('');
  const [scannedProofImg, setScannedProofImg] = useState(null);

  // Day-wise Remittance Modal for Delivery Executive
  const [showRemittanceModal, setShowRemittanceModal] = useState(false);
  const [driverLedger, setDriverLedger] = useState([]);
  const [loadingLedger, setLoadingLedger] = useState(false);

  const handleLogout = () => {
    Swal.fire({
      title: 'Log out from Delivery Portal?',
      text: `Are you sure you want to log out, ${partner.name}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#334155',
      confirmButtonText: 'Yes, Log Out',
      cancelButtonText: 'Stay Logged In'
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('user');
        localStorage.removeItem('delivery_user');
        sessionStorage.removeItem('deliveryAuthed');
        navigate('/login');
      }
    });
  };

  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const partnerId = partner._id || partner.id || '';
      const partnerPhone = partner.phone || '';
      const res = await fetch(`${API_URL}/api/eco-orders/delivery-tasks?partnerId=${partnerId}&partnerPhone=${partnerPhone}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(Array.isArray(data) ? data : []);
      } else {
        // Fallback fetch all home deliveries
        const allRes = await fetch(`${API_URL}/api/eco-orders/all?fulfillmentType=Home Delivery`);
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
  }, [partner._id, partner.phone]);

  // Update Status: Out for Delivery
  const handleMarkOutForDelivery = async (order) => {
    try {
      const res = await fetch(`${API_URL}/api/eco-orders/${order._id}/delivery-status`, {
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
      const res = await fetch(`${API_URL}/api/eco-orders/${order._id}/delivery-status`, {
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

  // ── Open Handover Modal & Setup Doorstep Payment Mode ──
  const openHandoverModal = async (order) => {
    setHandoverOrder(order);
    setEnteredOtp('');
    setCashCollectedInput(order.totalAmountInr);
    setShowProofScanner(false);
    setProofTxnInput('');
    setScannedProofImg(null);

    const isPrePaid = order.paymentStatus === 'Paid' && (order.paymentMethod === 'Razorpay Online' || order.paymentMethod === 'Eco-Points Full Redemption');

    if (isPrePaid) {
      setHandoverPaymentMode('RAZORPAY');
      setDoorstepPaymentStatus('SUCCESS');
      setDoorstepTxnId(order.razorpayPaymentId || 'PREPAID_ONLINE');
    } else {
      setHandoverPaymentMode('COD');
      setDoorstepPaymentStatus('UNPAID');
      setDoorstepTxnId('');
      // Pre-initialize Doorstep Razorpay / UPI QR in background
      initDoorstepRazorpay(order);
    }
  };

  // ── Initialize Doorstep Razorpay & Dynamic UPI QR ──
  const initDoorstepRazorpay = async (order) => {
    const amt = Number(order.totalAmountInr) || 0;
    const upiIntent = `upi://pay?pa=municipalcanopy@icici&pn=CanopyGuard+Municipal+Services&am=${amt}&cu=INR&tn=${encodeURIComponent(order.orderNumber)}`;
    setDoorstepUpiIntent(upiIntent);
    setDoorstepQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(upiIntent)}`);

    setDoorstepInitLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/eco-orders/${order._id}/doorstep-razorpay-init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setDoorstepRazorpayData(data);
        if (data.upiIntentUri) setDoorstepUpiIntent(data.upiIntentUri);
        if (data.qrImageUrl) setDoorstepQrUrl(data.qrImageUrl);
      }
    } catch (err) {
      console.warn('Doorstep razorpay init notice:', err.message);
    } finally {
      setDoorstepInitLoading(false);
    }
  };

  // ── Launch Razorpay Official Checkout Gateway Modal ──
  const handleLaunchRazorpayGateway = async () => {
    if (!handoverOrder) return;
    const amtInr = Number(handoverOrder.totalAmountInr) || 0;
    if (amtInr <= 0) {
      setDoorstepPaymentStatus('SUCCESS');
      return;
    }

    const sdkLoaded = await loadRazorpaySdk();
    if (!sdkLoaded) {
      Swal.fire({
        icon: 'error',
        title: 'Gateway Unavailable',
        text: 'Could not load Razorpay SDK. Please use the UPI QR code or collect cash.'
      });
      return;
    }

    const keyId = doorstepRazorpayData?.keyId || 'rzp_test_1DP5mmOlF5G5ag';
    const razorpayOrderId = doorstepRazorpayData?.razorpayOrderId;

    const options = {
      key: keyId,
      amount: Math.round(amtInr * 100),
      currency: 'INR',
      name: 'CanopyGuard Municipal Eco-Store',
      description: `Doorstep Payment for Order ${handoverOrder.orderNumber}`,
      image: 'https://cdn-icons-png.flaticon.com/512/628/628283.png',
      order_id: razorpayOrderId && !razorpayOrderId.startsWith('order_doorstep_') ? razorpayOrderId : undefined,
      prefill: {
        name: handoverOrder.userName || 'Citizen',
        email: handoverOrder.userEmail || 'citizen@canopy.gov.in',
        contact: handoverOrder.userPhone || ''
      },
      theme: { color: '#0284c7' },
      handler: async function (response) {
        try {
          const verifyRes = await fetch(`${API_URL}/api/eco-orders/${handoverOrder._id}/doorstep-razorpay-complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id || razorpayOrderId,
              razorpay_signature: response.razorpay_signature,
              paymentMethodChoice: 'Razorpay Online'
            })
          });

          const vData = await verifyRes.json();
          if (verifyRes.ok) {
            setDoorstepPaymentStatus('SUCCESS');
            setDoorstepTxnId(response.razorpay_payment_id);
            Swal.fire({
              icon: 'success',
              title: 'Doorstep Payment Received! 💳',
              text: `₹${amtInr} successfully paid via Razorpay (Txn: ${response.razorpay_payment_id}). Ready for OTP verification.`,
              confirmButtonColor: '#10b981'
            });
          } else {
            throw new Error(vData.error || 'Verification failed');
          }
        } catch (e) {
          Swal.fire({ icon: 'error', title: 'Payment Verification Error', text: e.message });
        }
      },
      modal: {
        ondismiss: function () {
          console.log('Doorstep Razorpay modal closed by user');
        }
      }
    };

    try {
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        Swal.fire({
          icon: 'error',
          title: 'Payment Failed',
          text: resp?.error?.description || 'Payment was declined or cancelled.'
        });
      });
      rzp.open();
    } catch (e) {
      console.warn('Razorpay open notice:', e);
      handleSimulateRazorpaySuccess();
    }
  };

  // ── Simulate / Sandbox Instant Verification ──
  const handleSimulateRazorpaySuccess = async () => {
    if (!handoverOrder) return;
    const fakeTxn = `pay_doorstep_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    try {
      const res = await fetch(`${API_URL}/api/eco-orders/${handoverOrder._id}/doorstep-razorpay-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_payment_id: fakeTxn,
          isDemo: true,
          paymentMethodChoice: 'Razorpay Online'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setDoorstepPaymentStatus('SUCCESS');
        setDoorstepTxnId(fakeTxn);
        Swal.fire({
          icon: 'success',
          title: 'UPI Payment Confirmed! ⚡',
          text: `Verified ₹${handoverOrder.totalAmountInr} digital payment (Ref: ${fakeTxn}).`,
          confirmButtonColor: '#10b981'
        });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
  };

  // ── Verify Doorstep Manual UTR / Screenshot Proof ──
  const handleVerifyManualProof = async () => {
    if (!proofTxnInput && !scannedProofImg) {
      Swal.fire({ icon: 'warning', title: 'Payment Proof Required', text: 'Please enter customer UPI UTR/Txn number or capture proof photo.' });
      return;
    }

    const ref = proofTxnInput.trim() || `UPI_PROOF_${Date.now()}`;
    try {
      const res = await fetch(`${API_URL}/api/eco-orders/${handoverOrder._id}/doorstep-razorpay-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionRef: ref,
          isDemo: true,
          paymentMethodChoice: 'Razorpay Online / UPI QR'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setDoorstepPaymentStatus('SUCCESS');
        setDoorstepTxnId(ref);
        setShowProofScanner(false);
        Swal.fire({
          icon: 'success',
          title: 'Payment Proof Verified! 📸',
          text: `Transaction reference ${ref} recorded successfully.`,
          confirmButtonColor: '#10b981'
        });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
  };

  // ── Fetch Day-Wise Cash Remittance History for Driver ──
  const fetchDriverRemittanceLedger = async () => {
    setLoadingLedger(true);
    setShowRemittanceModal(true);
    try {
      const partnerId = partner._id || partner.id || '';
      const partnerName = partner.name || '';
      const res = await fetch(`${API_URL}/api/eco-orders/daywise-cash-ledger?partnerId=${partnerId}&partnerName=${encodeURIComponent(partnerName)}`);
      if (res.ok) {
        const data = await res.json();
        setDriverLedger(data.records || []);
      }
    } catch (err) {
      console.error('Error fetching driver remittance ledger:', err);
    } finally {
      setLoadingLedger(false);
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

    // If Razorpay mode chosen but not yet paid
    if (handoverPaymentMode === 'RAZORPAY' && doorstepPaymentStatus !== 'SUCCESS' && Number(handoverOrder.totalAmountInr) > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Payment Incomplete',
        text: 'Citizen has not yet completed Razorpay/UPI payment. Please collect payment or switch to Cash on Delivery (COD).'
      });
      return;
    }

    setSubmittingHandover(true);
    try {
      const res = await fetch(`${API_URL}/api/eco-orders/${handoverOrder._id}/delivery-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Delivered',
          otp: enteredOtp,
          paymentMethodChoice: handoverPaymentMode === 'RAZORPAY' ? 'Razorpay Online' : 'Cash on Delivery',
          cashCollected: handoverPaymentMode === 'COD' ? (cashCollectedInput !== '' ? Number(cashCollectedInput) : handoverOrder.totalAmountInr) : 0,
          razorpayPaymentId: doorstepTxnId || undefined,
          updatedBy: partner.name
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete handover');

      Swal.fire({
        icon: 'success',
        title: 'Delivery Completed! 🎉',
        text: `Order ${handoverOrder.orderNumber} successfully delivered.${handoverPaymentMode === 'COD' ? ` ₹${cashCollectedInput || handoverOrder.totalAmountInr} COD cash in your custody.` : ' Paid digitally via Razorpay.'} Handover confirmed & confirmation email sent to citizen.`,
        confirmButtonColor: '#10b981'
      });

      setHandoverOrder(null);
      setEnteredOtp('');
      setCashCollectedInput('');
      setDoorstepPaymentStatus('UNPAID');
      setDoorstepTxnId('');
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

  // Calculate total COD cash currently held in hand by this delivery partner
  const cashInHand = tasks.filter(t =>
    (t.paymentMethod === 'Cash on Delivery' || t.paymentMethod === 'COD') &&
    t.cashCollectionStatus === 'Collected'
  ).reduce((sum, t) => sum + (Number(t.cashCollected) || Number(t.totalAmountInr) || 0), 0);

  const getPaymentBadge = (order) => {
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
        label: '🪙 Paid via Eco-Points',
        sub: 'Points Redeemed • ₹0 Due'
      };
    }

    if (isCod) {
      if (isDeposited || (isPaid && !isCollected)) {
        return {
          bg: 'rgba(16, 185, 129, 0.15)',
          border: 'rgba(16, 185, 129, 0.3)',
          color: '#34d399',
          label: `✅ COD Settled to Treasury (₹${order.cashCollected || order.totalAmountInr})`,
          sub: 'Cash turned in & verified by office'
        };
      }
      if (isCollected) {
        return {
          bg: 'rgba(245, 158, 11, 0.18)',
          border: 'rgba(245, 158, 11, 0.4)',
          color: '#fbbf24',
          label: `📦 Cash with You: ₹${order.cashCollected || order.totalAmountInr}`,
          sub: 'Deposit to biomass yard office'
        };
      }
      return {
        bg: 'rgba(239, 68, 68, 0.15)',
        border: 'rgba(239, 68, 68, 0.35)',
        color: '#f87171',
        label: `💵 Collect ₹${order.totalAmountInr} COD Cash`,
        sub: '⚠️ Collect exact cash before OTP handover'
      };
    }

    // Razorpay Online
    if (isPaid) {
      return {
        bg: 'rgba(16, 185, 129, 0.15)',
        border: 'rgba(16, 185, 129, 0.3)',
        color: '#34d399',
        label: `✅ Paid Online (₹${order.totalAmountInr})`,
        sub: 'Pre-paid digitally via Razorpay'
      };
    }

    if (order.paymentStatus === 'Failed') {
      return {
        bg: 'rgba(239, 68, 68, 0.2)',
        border: 'rgba(239, 68, 68, 0.4)',
        color: '#f87171',
        label: `❌ Online Payment Failed (₹${order.totalAmountInr})`,
        sub: 'Citizen payment attempt failed'
      };
    }

    // Pending / Unpaid Online
    return {
      bg: 'rgba(245, 158, 11, 0.15)',
      border: 'rgba(245, 158, 11, 0.35)',
      color: '#fbbf24',
      label: `⚠️ Unpaid Online: Pending (₹${order.totalAmountInr})`,
      sub: 'Online checkout pending / not completed'
    };
  };

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

              {/* Cash in Hand Indicator for COD Handover */}
              <div style={{
                textAlign: 'right',
                background: cashInHand > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                border: cashInHand > 0 ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid rgba(16, 185, 129, 0.25)',
                padding: '6px 14px',
                borderRadius: '10px'
              }}>
                <div style={{ fontSize: '10px', color: cashInHand > 0 ? '#fbbf24' : '#34d399', textTransform: 'uppercase', fontWeight: 700 }}>
                  💵 Cash in Hand
                </div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: cashInHand > 0 ? '#f59e0b' : '#10b981' }}>
                  ₹{cashInHand}
                </div>
                <button
                  onClick={fetchDriverRemittanceLedger}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#38bdf8',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0,
                    marginTop: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Receipt size={11} /> Remittance Log
                </button>
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
                title="Refresh Delivery Tasks"
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

              <button
                onClick={handleLogout}
                title="Log Out of Delivery Portal"
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#f87171',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'background 0.2s ease'
                }}
              >
                <LogOut size={14} /> Log Out
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
                    {(() => {
                      const badge = getPaymentBadge(order);
                      return (
                        <div style={{
                          background: badge.bg,
                          border: `1px solid ${badge.border}`,
                          padding: '6px 14px',
                          borderRadius: '10px',
                          textAlign: 'right'
                        }}>
                          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Payment Status</div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: badge.color, marginTop: '1px' }}>
                            {badge.label}
                          </div>
                          <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '1px' }}>
                            {badge.sub}
                          </div>
                        </div>
                      );
                    })()}
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
                          onClick={() => openHandoverModal(order)}
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
                      <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>
                        OTP Verified Handover
                      </span>
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

      {/* MODAL: Complete Handover (Payment Selector: COD vs Razorpay QR + OTP) */}
      {handoverOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px', overflowY: 'auto' }}>
          <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '18px', width: '100%', maxWidth: '520px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={18} color="#fff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#fff' }}>
                    Doorstep Delivery & Handover
                  </h3>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Order: {handoverOrder.orderNumber}</div>
                </div>
              </div>
              <button onClick={() => setHandoverOrder(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {/* Customer Details Pill */}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', padding: '10px 14px', borderRadius: '10px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>{handoverOrder.userName}</div>
                <div style={{ fontSize: '12px', color: '#38bdf8' }}>📞 {handoverOrder.userPhone || 'No phone'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Total Amount</div>
                <div style={{ fontSize: '17px', fontWeight: 900, color: '#10b981' }}>₹{handoverOrder.totalAmountInr}</div>
              </div>
            </div>

            {/* PAYMENT METHOD SELECTOR TABS */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>
                Select Doorstep Payment Mode:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setHandoverPaymentMode('COD')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: handoverPaymentMode === 'COD' ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.1)',
                    background: handoverPaymentMode === 'COD' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.03)',
                    color: handoverPaymentMode === 'COD' ? '#fbbf24' : '#94a3b8',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <DollarSign size={16} /> Cash on Delivery (COD)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setHandoverPaymentMode('RAZORPAY');
                    if (doorstepPaymentStatus !== 'SUCCESS') {
                      initDoorstepRazorpay(handoverOrder);
                    }
                  }}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: handoverPaymentMode === 'RAZORPAY' ? '2px solid #0284c7' : '1px solid rgba(255,255,255,0.1)',
                    background: handoverPaymentMode === 'RAZORPAY' ? 'rgba(2, 132, 199, 0.2)' : 'rgba(255,255,255,0.03)',
                    color: handoverPaymentMode === 'RAZORPAY' ? '#38bdf8' : '#94a3b8',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <CreditCard size={16} /> Razorpay / UPI QR
                </button>
              </div>
            </div>

            {/* TAB CONTENT: CASH ON DELIVERY */}
            {handoverPaymentMode === 'COD' && (
              <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '14px', borderRadius: '12px', marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24' }}>
                    💵 Physical Cash Collection
                  </span>
                  <span style={{ fontSize: '11px', color: '#fde68a' }}>Order Total: ₹{handoverOrder.totalAmountInr}</span>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: '#94a3b8' }}>₹</span>
                    <input
                      type="number"
                      value={cashCollectedInput}
                      onChange={(e) => setCashCollectedInput(e.target.value)}
                      placeholder={String(handoverOrder.totalAmountInr)}
                      style={{
                        width: '100%',
                        background: '#1e293b',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#f8fafc',
                        padding: '10px 12px 10px 28px',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: 700,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setCashCollectedInput(handoverOrder.totalAmountInr)}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#f8fafc',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Exact Amount
                  </button>
                </div>

                <div style={{ fontSize: '11px', color: '#fde68a', marginTop: '8px', lineHeight: 1.4 }}>
                  ⚠️ You must collect <b>₹{cashCollectedInput || handoverOrder.totalAmountInr}</b> in physical cash. This amount will be added to your shift custody and must be remitted at the Municipal Office.
                </div>
              </div>
            )}

            {/* TAB CONTENT: RAZORPAY / DYNAMIC UPI QR */}
            {handoverPaymentMode === 'RAZORPAY' && (
              <div style={{ background: 'rgba(2, 132, 199, 0.08)', border: '1px solid rgba(2, 132, 199, 0.25)', padding: '16px', borderRadius: '12px', marginBottom: '18px' }}>
                {doorstepPaymentStatus === 'SUCCESS' ? (
                  <div style={{ textAlign: 'center', padding: '12px 6px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', border: '2px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                      <CheckCircle2 size={28} color="#34d399" />
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#34d399' }}>
                      Digital Payment Verified! 🎉
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                      Payment of <b>₹{handoverOrder.totalAmountInr}</b> confirmed via Razorpay Online
                    </div>
                    {doorstepTxnId && (
                      <div style={{ fontSize: '11px', color: '#38bdf8', marginTop: '4px', fontFamily: 'monospace' }}>
                        Txn ID: {doorstepTxnId}
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: '#10b981', marginTop: '6px', fontWeight: 600 }}>
                      ✓ Cash Collection Liability: ₹0 (Online Bank Settled)
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>
                        Scan & Pay ₹{handoverOrder.totalAmountInr} via UPI
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                        Customer can scan using GPay, PhonePe, Paytm, or BHIM
                      </div>
                    </div>

                    {/* QR Code Container */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                      <div style={{ background: '#ffffff', padding: '10px', borderRadius: '14px', boxShadow: '0 8px 20px rgba(0,0,0,0.3)', textAlign: 'center' }}>
                        <img
                          src={doorstepQrUrl}
                          alt="Dynamic UPI QR"
                          style={{ width: '160px', height: '160px', display: 'block' }}
                        />
                        <div style={{ fontSize: '10px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                          CANOPYGUARD • ₹{handoverOrder.totalAmountInr}
                        </div>
                      </div>
                    </div>

                    {/* Gateways and Action Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={handleLaunchRazorpayGateway}
                        style={{
                          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                          border: 'none',
                          color: '#fff',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)'
                        }}
                      >
                        <CreditCard size={15} /> ⚡ Open Razorpay Payment Gateway
                      </button>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setShowProofScanner(!showProofScanner)}
                          style={{
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            color: '#f8fafc',
                            padding: '8px 12px',
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
                          <Camera size={14} color="#38bdf8" /> {showProofScanner ? 'Close Scanner' : 'Scan Proof / UTR'}
                        </button>

                        <button
                          type="button"
                          onClick={handleSimulateRazorpaySuccess}
                          title="Instant test verification for demo mode"
                          style={{
                            background: 'rgba(16, 185, 129, 0.12)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            color: '#34d399',
                            padding: '8px 12px',
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
                          <Sparkles size={14} /> Simulate UPI Success
                        </button>
                      </div>

                      {/* Payment Proof / Camera Scanner Panel */}
                      {showProofScanner && (
                        <div style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '12px', marginTop: '6px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
                            Verify Customer UPI Transaction Screen / UTR
                          </div>

                          <div style={{ marginBottom: '8px' }}>
                            <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '3px' }}>
                              Snap / Upload Customer UPI Success Screen:
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  const file = e.target.files[0];
                                  const reader = new FileReader();
                                  reader.onload = (ev) => setScannedProofImg(ev.target.result);
                                  reader.readAsDataURL(file);
                                }
                              }}
                              style={{ fontSize: '11px', color: '#94a3b8' }}
                            />
                            {scannedProofImg && (
                              <div style={{ marginTop: '6px', fontSize: '11px', color: '#34d399' }}>
                                ✓ Photo captured ready for verification
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '6px' }}>
                            <input
                              type="text"
                              placeholder="Enter UPI Ref / UTR (e.g. 426912389102)"
                              value={proofTxnInput}
                              onChange={(e) => setProofTxnInput(e.target.value)}
                              style={{
                                flex: 1,
                                background: '#1e293b',
                                border: '1px solid rgba(255,255,255,0.2)',
                                color: '#fff',
                                padding: '8px 10px',
                                borderRadius: '6px',
                                fontSize: '12px'
                              }}
                            />
                            <button
                              type="button"
                              onClick={handleVerifyManualProof}
                              style={{
                                background: '#10b981',
                                border: 'none',
                                color: '#fff',
                                padding: '8px 14px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              Verify Proof
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* OTP VERIFICATION FORM */}
            <form onSubmit={handleSubmitHandover}>
              <div style={{ marginBottom: '18px' }}>
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
                    fontSize: '24px',
                    fontWeight: 900,
                    letterSpacing: '8px',
                    textAlign: 'center',
                    boxSizing: 'border-box'
                  }}
                />
                <small style={{ color: '#94a3b8', fontSize: '11px', display: 'block', marginTop: '4px' }}>
                  Ask citizen for the delivery code sent to their email / SMS.
                </small>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setHandoverOrder(null)}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#94a3b8',
                    padding: '10px 16px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingHandover}
                  style={{
                    background: '#059669',
                    border: 'none',
                    color: '#fff',
                    padding: '10px 22px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 14px rgba(5, 150, 105, 0.4)'
                  }}
                >
                  {submittingHandover ? 'Verifying...' : 'Verify OTP & Complete Delivery 🎉'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Driver Day-Wise Cash Remittance History */}
      {showRemittanceModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '18px', width: '100%', maxWidth: '640px', padding: '24px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.2)', border: '1px solid rgba(245, 158, 11, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Receipt size={20} color="#fbbf24" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#fff' }}>
                    My Day-Wise COD Remittance Log
                  </h3>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Delivery Executive: {partner.name}
                  </div>
                </div>
              </div>
              <button onClick={() => setShowRemittanceModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {/* Current Custody Banner */}
            <div style={{
              background: cashInHand > 0 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.1)',
              border: cashInHand > 0 ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid rgba(16, 185, 129, 0.25)',
              padding: '14px 16px',
              borderRadius: '12px',
              marginBottom: '18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Total In-Hand Cash Liability</div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: cashInHand > 0 ? '#f59e0b' : '#34d399', marginTop: '2px' }}>
                  ₹{cashInHand}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '12px', color: '#cbd5e1', maxWidth: '240px' }}>
                {cashInHand > 0
                  ? '⚠️ Hand over this cash to Ajjarkadu Biomass Office counter to clear your liability.'
                  : '✅ All collected COD cash has been submitted and verified into the Municipal Treasury.'}
              </div>
            </div>

            {loadingLedger ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                <RefreshCw size={24} className="spin" style={{ margin: '0 auto 8px' }} />
                <div>Loading day-wise remittance history...</div>
              </div>
            ) : driverLedger.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                <Package size={36} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                <div style={{ color: '#94a3b8', fontWeight: 600 }}>No COD deliveries recorded yet</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {driverLedger.map((record, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      padding: '14px 16px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={14} color="#38bdf8" />
                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#f8fafc' }}>
                          {new Date(record.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: record.pendingAmount === 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.18)',
                        color: record.pendingAmount === 0 ? '#34d399' : '#fbbf24',
                        border: record.pendingAmount === 0 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.35)'
                      }}>
                        {record.pendingAmount === 0 ? '✓ Submitted to Treasury' : `⚠️ ₹${record.pendingAmount} Pending Submission`}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                      <div style={{ color: '#94a3b8' }}>
                        {record.orderCount} COD {record.orderCount === 1 ? 'Order' : 'Orders'} ({record.orderNumbers.join(', ')})
                      </div>
                      <div style={{ fontWeight: 800, color: '#f8fafc' }}>
                        Total Collected: <span style={{ color: '#10b981' }}>₹{record.totalCashCollected}</span>
                      </div>
                    </div>

                    {record.settledBy && (
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                        Verified & Cleared by: <b style={{ color: '#94a3b8' }}>{record.settledBy}</b>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setShowRemittanceModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#f8fafc',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Close Remittance Log
              </button>
            </div>
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
