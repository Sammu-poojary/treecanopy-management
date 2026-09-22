import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Leaf,
  Sparkles,
  Search,
  Filter,
  Package,
  Truck,
  Building2,
  CheckCircle2,
  Clock,
  QrCode,
  ArrowRight,
  Plus,
  Minus,
  Trash2,
  X,
  CreditCard,
  Coins,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Info,
  MapPin,
  Check,
  RefreshCw,
  ShoppingBag as CartIcon,
  Star,
  Eye,
  Award,
  BookOpen,
  Crosshair,
  Banknote,
  Navigation,
  Lock
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function CitizenEcoStore({ user, userEcoPoints = 0, onPointsUpdated }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popular');

  // Cart State
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ecoStoreCart')) || [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Checkout State
  const [checkoutStep, setCheckoutStep] = useState('cart'); // 'cart', 'checkout', 'success'
  const [deliveryMethod, setDeliveryMethod] = useState('pickup'); // 'pickup' | 'delivery'
  const [pickupYard, setPickupYard] = useState('North Municipal Biomass Yard, Zone 4');
  const [deliveryAddress, setDeliveryAddress] = useState({
    street: '',
    city: 'Bengaluru',
    pincode: '',
    phone: user?.phone || ''
  });
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [locationSuccess, setLocationSuccess] = useState('');
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('razorpay'); // 'razorpay' | 'cod' | 'points'
  const [placingOrder, setPlacingOrder] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [orderError, setOrderError] = useState('');

  // Orders Tab State
  const [activeSubTab, setActiveSubTab] = useState('browse'); // 'browse' | 'my-orders'
  const [myOrders, setMyOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Product Details Modal State
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  const [modalQty, setModalQty] = useState(1);
  const [cardQuantities, setCardQuantities] = useState({});

  useEffect(() => {
    localStorage.setItem('ecoStoreCart', JSON.stringify(cart));
  }, [cart]);

  // Fetch products with clean field normalization (no dummy metrics)
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/eco-products`);
      const data = await res.json();
      if (Array.isArray(data)) {
        const normalized = data.map(p => ({
          ...p,
          priceInInr: Number(p.priceInr ?? p.priceInInr ?? 0),
          priceInPoints: Number(p.priceEcoPoints ?? p.priceInPoints ?? 0),
          stock: Number(p.stockQuantity ?? p.stock ?? 0),
          unitSize: p.unitSize || (p.weightKg ? `${p.weightKg} kg Bag` : ''),
          weightKg: p.weightKg || null,
          description: p.description || '',
          usageInstructions: p.usageInstructions || '',
          benefits: Array.isArray(p.benefits) ? p.benefits.filter(Boolean) : (typeof p.benefits === 'string' && p.benefits.trim() ? [p.benefits.trim()] : [])
        }));
        setProducts(normalized);
      }
    } catch (err) {
      console.error('Failed to fetch eco products:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user orders
  const fetchMyOrders = async () => {
    const uid = user?._id || user?.id;
    const uemail = user?.email;
    if (!uid && !uemail) return;

    try {
      setOrdersLoading(true);
      const res = await fetch(`${API_URL}/api/eco-orders/my-orders?userId=${encodeURIComponent(uid || '')}&userEmail=${encodeURIComponent(uemail || '')}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setMyOrders(data);
      }
    } catch (err) {
      console.error('Failed to fetch user eco orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'my-orders') {
      fetchMyOrders();
    }
  }, [activeSubTab]);

  // Cart helper functions
  const addToCart = (product, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item._id === product._id);
      if (existing) {
        return prev.map(item =>
          item._id === product._id
            ? { ...item, quantity: Math.min(item.quantity + quantity, product.stock || 99) }
            : item
        );
      }
      return [...prev, { ...product, quantity }];
    });
    setIsCartOpen(true);
  };

  const updateCartQty = (productId, delta) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item._id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: Math.min(newQty, item.stock || 99) } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item._id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const getCardQty = (productId) => {
    return cardQuantities[productId] || 1;
  };

  const setCardQty = (productId, qty) => {
    setCardQuantities(prev => ({
      ...prev,
      [productId]: Math.max(1, Math.min(qty, 50))
    }));
  };

  // Pricing calculations
  const availableEcoPoints = Number(userEcoPoints) || 0;
  const cartSubtotal = cart.reduce((sum, item) => sum + ((item.priceInInr || item.priceInr || 99) * item.quantity), 0);
  const deliveryFee = deliveryMethod === 'delivery' && cartSubtotal > 0 ? 99 : 0;
  // 1 Eco Point = ₹2 discount, up to 50% of subtotal or max points available
  const maxRedeemablePoints = Math.min(availableEcoPoints, Math.floor(cartSubtotal / 2));
  const pointsDiscountInr = Math.min(pointsToRedeem * 2, cartSubtotal);
  const finalTotalInr = Math.max(0, cartSubtotal + deliveryFee - pointsDiscountInr);

  // Category Filtering
  const categories = [
    { id: 'all', label: 'All Products', icon: '🌿' },
    { id: 'compost', label: 'Organic Compost', icon: '🌱' },
    { id: 'mulch', label: 'Wood Mulch & Bark', icon: '🪵' },
    { id: 'biochar', label: 'Biochar & Conditioners', icon: '⚗️' },
    { id: 'sapling', label: 'Native Saplings', icon: '🌳' },
    { id: 'kits', label: 'Gardening Kits', icon: '🪴' }
  ];

  const filteredProducts = products.filter(p => {
    const pCat = (p.category || '').toLowerCase();
    const matchCategory = activeCategory === 'all' ||
      (activeCategory === 'compost' && pCat.includes('compost')) ||
      (activeCategory === 'mulch' && (pCat.includes('mulch') || pCat.includes('woodchip'))) ||
      (activeCategory === 'biochar' && (pCat.includes('bio') || pCat.includes('conditioner') || pCat.includes('char'))) ||
      (activeCategory === 'sapling' && pCat.includes('sapling')) ||
      (activeCategory === 'kits' && (pCat.includes('kit') || pCat.includes('garden'))) ||
      pCat.includes(activeCategory.toLowerCase());

    const matchSearch = !searchQuery ||
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCategory && matchSearch;
  }).sort((a, b) => {
    if (sortBy === 'price-low') return (a.priceInInr || 0) - (b.priceInInr || 0);
    if (sortBy === 'price-high') return (b.priceInInr || 0) - (a.priceInInr || 0);
    if (sortBy === 'points') return (a.priceInPoints || 0) - (b.priceInPoints || 0);
    return (b.rating || 5) - (a.rating || 5);
  });

  // Geolocation helper to auto-detect and reverse-geocode current location
  const handleFetchLocation = () => {
    if (!navigator.geolocation) {
      setOrderError('Geolocation is not supported by your browser.');
      return;
    }
    setFetchingLocation(true);
    setOrderError('');
    setLocationSuccess('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`);
          const data = await res.json();
          
          const addr = data.address || {};
          const road = addr.road || addr.pedestrian || addr.street || addr.neighbourhood || addr.suburb || '';
          const area = addr.suburb || addr.neighbourhood || addr.residential || '';
          const city = addr.city || addr.town || addr.village || addr.county || 'Bengaluru';
          const pincode = addr.postcode || '';
          
          const streetCombined = [road, area].filter(Boolean).join(', ') || data.display_name?.split(',').slice(0, 2).join(', ') || `GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

          setDeliveryAddress(prev => ({
            ...prev,
            street: streetCombined,
            city: city,
            pincode: pincode || prev.pincode,
            lat: latitude,
            lng: longitude
          }));
          setLocationSuccess(`📍 Detected: ${city}${pincode ? ` (${pincode})` : ''}`);
        } catch (err) {
          console.error('Reverse geocoding error:', err);
          setDeliveryAddress(prev => ({
            ...prev,
            street: `GPS Coordinates: ${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`,
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }));
          setLocationSuccess('📍 Device GPS coordinates captured!');
        } finally {
          setFetchingLocation(false);
        }
      },
      (err) => {
        console.warn('Geolocation permission error:', err);
        setFetchingLocation(false);
        setOrderError('Location access was denied or timed out. Please type your address manually.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Razorpay SDK Script Loader
  const loadRazorpayScript = () => {
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

  // Handle Checkout Submission (Razorpay Online, Cash on Delivery, or 100% Eco-Points)
  const handlePlaceOrder = async (e) => {
    if (e) e.preventDefault();
    if (cart.length === 0) return;

    if (deliveryMethod === 'delivery' && (!deliveryAddress.street || !deliveryAddress.pincode || !deliveryAddress.phone)) {
      setOrderError('Please provide complete delivery address, pincode, and contact phone.');
      return;
    }

    setPlacingOrder(true);
    setOrderError('');

    try {
      const isFullPoints = pointsDiscountInr >= cartSubtotal || (paymentMethod === 'points' && finalTotalInr === 0);
      const selectedPayMethod = isFullPoints ? 'Eco-Points Full Redemption' : paymentMethod === 'cod' ? 'Cash on Delivery' : 'Razorpay Online';

      const payload = {
        userId: user?._id || user?.id || 'GUEST_USER',
        userName: user?.name || user?.username || 'Eco Citizen',
        userEmail: user?.email || 'citizen@canopyguard.org',
        userPhone: deliveryAddress.phone || user?.phone || '9876543210',
        items: cart.map(item => ({
          productId: item._id,
          quantity: item.quantity
        })),
        fulfillmentType: deliveryMethod === 'pickup' ? 'Yard Pickup' : 'Home Delivery',
        deliveryAddress: deliveryMethod === 'delivery' ? deliveryAddress : undefined,
        pickupYard: deliveryMethod === 'pickup' ? { yardName: pickupYard } : undefined,
        paymentMethod: selectedPayMethod,
        ecoPointsToUse: pointsToRedeem
      };

      const res = await fetch(`${API_URL}/api/eco-orders/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to process checkout');
      }

      // 1. If COD or Free / 100% Eco-Points: Order is confirmed immediately
      if (data.isFreeOrPointsOnly || data.isCod || selectedPayMethod === 'Cash on Delivery' || selectedPayMethod === 'Eco-Points Full Redemption') {
        setCompletedOrder(data.order);
        setCart([]);
        setPointsToRedeem(0);
        setCheckoutStep('success');
        if (onPointsUpdated && data.order?.totalEcoPointsUsed) {
          onPointsUpdated(Math.max(0, userEcoPoints - data.order.totalEcoPointsUsed));
        }
        setPlacingOrder(false);
        return;
      }

      // 2. Open Official Razorpay Payment Gateway Modal (if real keys exist) or Sandbox Test Verification
      if (data.isDemo || !data.razorpayOrderId || data.razorpayOrderId.startsWith('order_demo_')) {
        // Test Sandbox Mode when Razorpay keys are not configured in backend/.env
        const verifyRes = await fetch(`${API_URL}/api/eco-orders/verify-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: data.orderId || data.order?._id,
            razorpay_order_id: data.razorpayOrderId || `order_test_${Date.now()}`,
            razorpay_payment_id: `pay_test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            razorpay_signature: 'sandbox_test_signature',
            isDemo: true
          })
        });

        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) {
          throw new Error(verifyData.error || 'Payment verification failed');
        }

        setCompletedOrder(verifyData.order || data.order);
        setCart([]);
        setPointsToRedeem(0);
        setCheckoutStep('success');

        if (onPointsUpdated && data.order?.totalEcoPointsUsed) {
          onPointsUpdated(Math.max(0, userEcoPoints - data.order.totalEcoPointsUsed));
        }
        setPlacingOrder(false);
        return;
      }

      // Live / Test Razorpay SDK Checkout
      const isSdkLoaded = await loadRazorpayScript();
      if (!isSdkLoaded || !window.Razorpay) {
        throw new Error('Razorpay Payment Gateway SDK failed to load. Please check your internet connection.');
      }

      const keyId = data.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID;
      const orderAmountPaise = data.amountPaise || Math.round((data.amountInr || finalTotalInr) * 100);

      const options = {
        key: keyId,
        amount: orderAmountPaise,
        currency: data.currency || 'INR',
        name: 'CanopyGuard Eco-Store',
        description: `Order #${data.orderNumber} Payment`,
        image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=80&q=80',
        order_id: data.razorpayOrderId,
        prefill: {
          name: user?.name || user?.username || 'Eco Citizen',
          email: user?.email || 'citizen@canopyguard.org',
          contact: deliveryAddress.phone || user?.phone || '9876543210'
        },
        notes: {
          orderNumber: data.orderNumber,
          fulfillmentType: deliveryMethod === 'pickup' ? 'Yard Pickup' : 'Home Delivery',
          userId: user?._id || user?.id || 'citizen'
        },
        theme: {
          color: '#059669'
        },
        modal: {
          ondismiss: () => {
            setPlacingOrder(false);
          }
        },
        handler: async (response) => {
          try {
            setPlacingOrder(true);
            setOrderError('');
            const verifyRes = await fetch(`${API_URL}/api/eco-orders/verify-payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: data.orderId || data.order?._id,
                razorpay_order_id: response.razorpay_order_id || data.razorpayOrderId,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                isDemo: false
              })
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(verifyData.error || 'Payment verification failed on server');
            }

            setCompletedOrder(verifyData.order || data.order);
            setCart([]);
            setPointsToRedeem(0);
            setCheckoutStep('success');

            if (onPointsUpdated && data.order?.totalEcoPointsUsed) {
              onPointsUpdated(Math.max(0, userEcoPoints - data.order.totalEcoPointsUsed));
            }
          } catch (verifyErr) {
            console.error('Razorpay verification error:', verifyErr);
            setOrderError('Payment verification error: ' + (verifyErr.message || 'Please contact support.'));
          } finally {
            setPlacingOrder(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        console.warn('Razorpay payment failed or dismissed:', response?.error);
        setOrderError(response?.error?.description || 'Payment was unsuccessful or cancelled.');
        setPlacingOrder(false);
      });
      rzp.open();
    } catch (err) {
      console.error('Order creation failed:', err);
      setOrderError(err.message || 'Failed to complete order. Please try again.');
      setPlacingOrder(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', maxWidth: '1440px', margin: '0 auto' }}>
      
      {/* ── Top Hero & Circular Economy Value Proposition ── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #059669 100%)',
          borderRadius: '24px',
          padding: '32px 36px',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 40px -15px rgba(5, 150, 105, 0.4)'
        }}
      >
        <div style={{ position: 'absolute', right: '-40px', bottom: '-40px', opacity: 0.12, transform: 'rotate(-15deg)', pointerEvents: 'none' }}>
          <Leaf size={280} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', position: 'relative', zIndex: 2 }}>
          <div style={{ maxWidth: '640px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.18)', backdropFilter: 'blur(8px)', padding: '6px 14px', borderRadius: '30px', fontSize: '0.8rem', fontWeight: 800, marginBottom: '14px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              <Sparkles size={14} color="#a7f3d0" /> 100% City-Recycled Circular Biomass
            </div>
            <h1 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.35rem)', fontWeight: 900, margin: '0 0 10px', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
              Citizen Green Marketplace
            </h1>
            <p style={{ margin: 0, fontSize: '0.98rem', color: '#d1fae5', lineHeight: 1.6 }}>
              Every bag of compost, mulch, and soil conditioner is crafted from pruned branches and shredded biomass collected by city arborists. Enrich your garden while eliminating landfill waste.
            </p>
          </div>

          {/* Eco-Points & Cart Status Card */}
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.14)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.25)', borderRadius: '18px', padding: '16px 20px', minWidth: '170px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a7f3d0', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' }}>
                <Coins size={16} /> My Eco-Points
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, marginTop: '4px', color: '#ffffff' }}>
                {userEcoPoints.toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#a7f3d0' }}>pts</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#d1fae5', marginTop: '2px' }}>
                Worth up to ₹{(userEcoPoints * 2).toLocaleString()} discount!
              </div>
            </div>

            <button
              onClick={() => setIsCartOpen(true)}
              style={{
                background: '#ffffff',
                color: '#064e3b',
                border: 'none',
                borderRadius: '18px',
                padding: '16px 24px',
                cursor: 'pointer',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
            >
              <div style={{ position: 'relative' }}>
                <ShoppingBag size={24} color="#047857" />
                {cart.length > 0 && (
                  <span style={{ position: 'absolute', top: '-6px', right: '-8px', background: '#ef4444', color: '#fff', width: '20px', height: '20px', borderRadius: '50%', fontSize: '0.75rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {cart.reduce((s, i) => s + i.quantity, 0)}
                  </span>
                )}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Your Cart</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 900 }}>₹{cartSubtotal.toLocaleString()}</div>
              </div>
            </button>
          </div>
        </div>

        {/* Sub Navigation: Browse Products vs My Green Orders */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '28px', borderTop: '1px solid rgba(255, 255, 255, 0.2)', paddingTop: '18px' }}>
          <button
            onClick={() => setActiveSubTab('browse')}
            style={{
              background: activeSubTab === 'browse' ? '#ffffff' : 'rgba(255, 255, 255, 0.12)',
              color: activeSubTab === 'browse' ? '#064e3b' : '#ffffff',
              border: 'none',
              padding: '10px 22px',
              borderRadius: '12px',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <Package size={16} /> Browse Catalog
          </button>

          <button
            onClick={() => setActiveSubTab('my-orders')}
            style={{
              background: activeSubTab === 'my-orders' ? '#ffffff' : 'rgba(255, 255, 255, 0.12)',
              color: activeSubTab === 'my-orders' ? '#064e3b' : '#ffffff',
              border: 'none',
              padding: '10px 22px',
              borderRadius: '12px',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <Truck size={16} /> My Eco Orders {myOrders.length > 0 && `(${myOrders.length})`}
          </button>
        </div>
      </div>

      {/* ── SUB-VIEW: BROWSE CATALOG ── */}
      {activeSubTab === 'browse' && (
        <>
          {/* Controls Bar: Search, Category Filters, Sorting */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
              
              {/* Category Pills */}
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', maxWidth: '100%' }}>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    style={{
                      background: activeCategory === cat.id ? 'var(--brand, #059669)' : 'var(--bg-surface, #ffffff)',
                      color: activeCategory === cat.id ? '#ffffff' : 'var(--text-primary, #1e293b)',
                      border: `1px solid ${activeCategory === cat.id ? 'var(--brand, #059669)' : 'var(--border, #e2e8f0)'}`,
                      padding: '8px 16px',
                      borderRadius: '12px',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s'
                    }}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>

              {/* Search & Sort Controls */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '220px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search compost, mulch..."
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 36px',
                      borderRadius: '12px',
                      border: '1px solid var(--border, #cbd5e1)',
                      background: 'var(--bg-surface, #ffffff)',
                      color: 'var(--text-primary, #0f172a)',
                      fontSize: '0.84rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '12px',
                    border: '1px solid var(--border, #cbd5e1)',
                    background: 'var(--bg-surface, #ffffff)',
                    color: 'var(--text-primary, #0f172a)',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="popular">⭐ Top Rated</option>
                  <option value="price-low">💰 Price: Low to High</option>
                  <option value="price-high">💎 Price: High to Low</option>
                  <option value="points">🪙 Eco-Points</option>
                </select>
              </div>
            </div>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div style={{ display: 'grid', placeItems: 'center', padding: '80px 20px', color: '#64748b' }}>
              <RefreshCw size={36} className="cg-spin" color="#059669" />
              <p style={{ marginTop: '16px', fontWeight: 600 }}>Loading organic circular products...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div style={{ background: 'var(--bg-surface, #ffffff)', border: '1px dashed var(--border, #cbd5e1)', borderRadius: '20px', padding: '60px 20px', textAlign: 'center' }}>
              <Package size={48} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ margin: '0 0 6px', color: 'var(--text-primary, #0f172a)', fontWeight: 800 }}>No Products Found</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary, #64748b)', fontSize: '0.88rem' }}>
                Try adjusting your search query or category filter.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
              {filteredProducts.map(product => {
                const inCart = cart.find(item => item._id === product._id);
                const cardQty = getCardQty(product._id);
                const isOutOfStock = product.stock <= 0;
                const isLowStock = product.stock > 0 && product.stock <= 5;

                return (
                  <div
                    key={product._id}
                    style={{
                      background: 'var(--bg-surface, #ffffff)',
                      border: '1px solid var(--border, #e2e8f0)',
                      borderRadius: '22px',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: '0 4px 18px rgba(0, 0, 0, 0.05)',
                      transition: 'transform 0.2s, box-shadow 0.2s'
                    }}
                  >
                    {/* Product Image & Badges */}
                    <div
                      style={{ position: 'relative', height: '200px', background: '#f8fafc', overflow: 'hidden', cursor: 'pointer' }}
                      onClick={() => {
                        setSelectedProductDetails(product);
                        setModalQty(1);
                      }}
                    >
                      <img
                        src={product.image || 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=600&q=80'}
                        alt={product.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=600&q=80';
                        }}
                      />
                      
                      {/* Top Badges */}
                      <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(15, 23, 42, 0.82)', backdropFilter: 'blur(6px)', color: '#ffffff', padding: '4px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {product.category}
                      </div>
                      
                      {product.unitSize && (
                        <div style={{ position: 'absolute', top: '12px', right: '12px', background: '#059669', color: '#ffffff', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                          {product.unitSize}
                        </div>
                      )}

                      {/* Stock Pill at Bottom Left */}
                      <div style={{ position: 'absolute', bottom: '10px', left: '12px', display: 'flex', gap: '6px' }}>
                        {isOutOfStock ? (
                          <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.68rem', fontWeight: 800, padding: '3px 8px', borderRadius: '8px' }}>
                            Out of Stock
                          </span>
                        ) : isLowStock ? (
                          <span style={{ background: '#f59e0b', color: '#fff', fontSize: '0.68rem', fontWeight: 800, padding: '3px 8px', borderRadius: '8px' }}>
                            Only {product.stock} left!
                          </span>
                        ) : (
                          <span style={{ background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', color: '#a7f3d0', fontSize: '0.68rem', fontWeight: 700, padding: '3px 8px', borderRadius: '8px' }}>
                            ● In Stock ({product.stock})
                          </span>
                        )}
                      </div>

                      {/* Quick View Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProductDetails(product);
                          setModalQty(1);
                        }}
                        style={{
                          position: 'absolute',
                          bottom: '10px',
                          right: '12px',
                          background: 'rgba(255, 255, 255, 0.92)',
                          backdropFilter: 'blur(6px)',
                          color: '#064e3b',
                          border: 'none',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                        }}
                      >
                        <Eye size={12} /> View Details
                      </button>
                    </div>

                    {/* Product Info */}
                    <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <div style={{ marginBottom: '6px' }}>
                        <h3
                          onClick={() => {
                            setSelectedProductDetails(product);
                            setModalQty(1);
                          }}
                          style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)', lineHeight: 1.3, cursor: 'pointer' }}
                        >
                          {product.name}
                        </h3>
                      </div>

                      {/* Product Description */}
                      <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: 'var(--text-secondary, #64748b)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {product.description || 'No description provided.'}
                      </p>

                      {/* Optional weight tag if provided */}
                      {product.weightKg && (
                        <div style={{ marginBottom: '12px' }}>
                          <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600 }}>
                            ⚖️ Weight: {product.weightKg} kg
                          </span>
                        </div>
                      )}

                      {/* Price & Action Row */}
                      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '14px', borderTop: '1px solid var(--border, #f1f5f9)', gap: '10px' }}>
                        <div>
                          <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--brand, #059669)', lineHeight: 1.1 }}>
                            ₹{product.priceInInr}
                          </div>
                          {product.priceInPoints > 0 && (
                            <div style={{ fontSize: '0.74rem', color: '#d97706', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                              <Coins size={12} /> or {product.priceInPoints} pts
                            </div>
                          )}
                        </div>

                        {/* Interactive Quantity & Add Controls */}
                        {inCart ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ecfdf5', borderRadius: '12px', padding: '4px 8px', border: '1px solid #a7f3d0' }}>
                            <button
                              onClick={() => updateCartQty(product._id, -1)}
                              title="Decrease quantity in cart"
                              style={{ width: '26px', height: '26px', borderRadius: '8px', border: 'none', background: '#ffffff', color: '#047857', cursor: 'pointer', display: 'grid', placeItems: 'center', fontWeight: 800 }}
                            >
                              <Minus size={13} />
                            </button>
                            <span style={{ fontWeight: 900, fontSize: '0.9rem', color: '#064e3b', minWidth: '20px', textAlign: 'center' }}>
                              {inCart.quantity}
                            </span>
                            <button
                              onClick={() => updateCartQty(product._id, 1)}
                              disabled={inCart.quantity >= product.stock}
                              title="Increase quantity in cart"
                              style={{ width: '26px', height: '26px', borderRadius: '8px', border: 'none', background: inCart.quantity >= product.stock ? '#cbd5e1' : '#059669', color: '#ffffff', cursor: inCart.quantity >= product.stock ? 'not-allowed' : 'pointer', display: 'grid', placeItems: 'center', fontWeight: 800 }}
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {/* Card Qty Stepper */}
                            <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: '10px', padding: '2px', border: '1px solid #cbd5e1' }}>
                              <button
                                type="button"
                                onClick={() => setCardQty(product._id, cardQty - 1)}
                                style={{ width: '24px', height: '24px', borderRadius: '6px', border: 'none', background: 'transparent', color: '#475569', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                              >
                                <Minus size={12} />
                              </button>
                              <span style={{ fontSize: '0.82rem', fontWeight: 800, minWidth: '18px', textAlign: 'center', color: '#0f172a' }}>
                                {cardQty}
                              </span>
                              <button
                                type="button"
                                onClick={() => setCardQty(product._id, cardQty + 1)}
                                style={{ width: '24px', height: '24px', borderRadius: '6px', border: 'none', background: 'transparent', color: '#475569', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                              >
                                <Plus size={12} />
                              </button>
                            </div>

                            {/* Add Button */}
                            <button
                              type="button"
                              onClick={() => addToCart(product, cardQty)}
                              disabled={isOutOfStock}
                              style={{
                                background: isOutOfStock ? '#94a3b8' : 'var(--brand, #059669)',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '10px',
                                padding: '8px 14px',
                                fontWeight: 800,
                                fontSize: '0.84rem',
                                cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              <Plus size={15} /> {isOutOfStock ? 'Out' : 'Add'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── PRODUCT DETAILS MODAL (Real Admin-Entered Data Only) ── */}
      {selectedProductDetails && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(8px)',
            zIndex: 99999,
            display: 'grid',
            placeItems: 'center',
            padding: '20px',
            overflowY: 'auto'
          }}
          onClick={() => setSelectedProductDetails(null)}
        >
          <div
            style={{
              background: 'var(--bg-surface, #ffffff)',
              borderRadius: '24px',
              maxWidth: '680px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              border: '1px solid var(--border, #e2e8f0)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface, #ffffff)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: '#ecfdf5', color: '#059669', padding: '6px', borderRadius: '10px' }}>
                  <Leaf size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {selectedProductDetails.category}
                  </div>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary, #0f172a)' }}>
                    {selectedProductDetails.name}
                  </h2>
                </div>
              </div>

              <button
                onClick={() => setSelectedProductDetails(null)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '10px', padding: '6px', cursor: 'pointer', color: '#64748b', display: 'grid', placeItems: 'center' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* Product Top Grid: Image + Core Details */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                
                {/* Left: Image Preview */}
                <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', height: '220px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <img
                    src={selectedProductDetails.image || 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=600&q=80'}
                    alt={selectedProductDetails.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>

                {/* Right: Pricing, Weight & Stock */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
                  <div>
                    {/* Price Card */}
                    <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '14px', padding: '14px' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#064e3b', textTransform: 'uppercase' }}>
                        Product Rate
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '4px' }}>
                        <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#059669' }}>
                          ₹{selectedProductDetails.priceInInr}
                        </span>
                        {selectedProductDetails.priceInPoints > 0 && (
                          <span style={{ fontSize: '0.9rem', color: '#d97706', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Coins size={14} /> or {selectedProductDetails.priceInPoints} pts
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#047857', marginTop: '2px' }}>
                        ✓ Citizen Eco-Points can be redeemed at checkout.
                      </div>
                    </div>

                    {/* Unit Size, Weight & Stock */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
                      {selectedProductDetails.unitSize && (
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px 12px' }}>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>PACK / UNIT SIZE</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                            {selectedProductDetails.unitSize}
                          </div>
                        </div>
                      )}
                      {selectedProductDetails.weightKg && (
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px 12px' }}>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>NET WEIGHT</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                            {selectedProductDetails.weightKg} kg
                          </div>
                        </div>
                      )}
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px 12px' }}>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>STOCK AVAILABLE</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 900, color: selectedProductDetails.stock > 0 ? '#059669' : '#ef4444', marginTop: '2px' }}>
                          {selectedProductDetails.stock > 0 ? `${selectedProductDetails.stock} in stock` : 'Out of Stock'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description (Directly entered by admin) */}
              <div>
                <h4 style={{ margin: '0 0 6px', fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
                  Description
                </h4>
                <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary, #475569)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                  {selectedProductDetails.description || 'No description entered.'}
                </p>
              </div>

              {/* Usage Instructions (Only if entered by admin) */}
              {selectedProductDetails.usageInstructions && (
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '14px', padding: '14px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e40af', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <BookOpen size={14} /> Usage Instructions / Guide
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#1e3a8a', lineHeight: 1.5 }}>
                    {selectedProductDetails.usageInstructions}
                  </p>
                </div>
              )}

              {/* Benefits (Only if entered by admin) */}
              {selectedProductDetails.benefits && selectedProductDetails.benefits.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 10px', fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
                    Highlights &amp; Benefits
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
                    {selectedProductDetails.benefits.map((b, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#334155' }}>
                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#ecfdf5', color: '#059669', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                          <Check size={12} strokeWidth={3} />
                        </div>
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer: Qty Selector + Add / Buy Now Actions */}
            <div style={{ padding: '18px 24px', borderTop: '1px solid var(--border, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', background: 'var(--bg-surface, #ffffff)' }}>
              
              {/* Quantity Stepper */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#475569' }}>Quantity:</span>
                <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: '12px', padding: '4px', border: '1px solid #cbd5e1' }}>
                  <button
                    onClick={() => setModalQty(Math.max(1, modalQty - 1))}
                    style={{ width: '30px', height: '30px', borderRadius: '8px', border: 'none', background: '#ffffff', color: '#334155', cursor: 'pointer', display: 'grid', placeItems: 'center', fontWeight: 800 }}
                  >
                    <Minus size={14} />
                  </button>
                  <span style={{ fontSize: '0.95rem', fontWeight: 900, minWidth: '32px', textAlign: 'center', color: '#0f172a' }}>
                    {modalQty}
                  </span>
                  <button
                    onClick={() => setModalQty(Math.min(selectedProductDetails.stock || 50, modalQty + 1))}
                    disabled={modalQty >= (selectedProductDetails.stock || 50)}
                    style={{ width: '30px', height: '30px', borderRadius: '8px', border: 'none', background: '#ffffff', color: '#334155', cursor: 'pointer', display: 'grid', placeItems: 'center', fontWeight: 800 }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#059669' }}>
                  = ₹{(selectedProductDetails.priceInInr * modalQty).toLocaleString()}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => {
                    addToCart(selectedProductDetails, modalQty);
                    setSelectedProductDetails(null);
                  }}
                  disabled={selectedProductDetails.stock <= 0}
                  style={{
                    background: '#ecfdf5',
                    color: '#047857',
                    border: '1px solid #a7f3d0',
                    borderRadius: '12px',
                    padding: '12px 20px',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    cursor: selectedProductDetails.stock <= 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <ShoppingBag size={16} /> Add to Cart
                </button>

                <button
                  onClick={() => {
                    addToCart(selectedProductDetails, modalQty);
                    setSelectedProductDetails(null);
                    setCheckoutStep('checkout');
                    setIsCartOpen(true);
                  }}
                  disabled={selectedProductDetails.stock <= 0}
                  style={{
                    background: 'var(--brand, #059669)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px 24px',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    cursor: selectedProductDetails.stock <= 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 16px rgba(5, 150, 105, 0.3)'
                  }}
                >
                  Buy Now &amp; Checkout <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SUB-VIEW: MY GREEN ORDERS ── */}
      {activeSubTab === 'my-orders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
                My Circular Economy Orders
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.86rem', color: '#64748b' }}>
              Track active compost bags, deliveries, and past purchases.
            </p>
            </div>
            <button
              onClick={fetchMyOrders}
              style={{ background: 'var(--bg-surface, #ffffff)', border: '1px solid var(--border, #cbd5e1)', padding: '8px 14px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}
            >
              <RefreshCw size={14} className={ordersLoading ? 'cg-spin' : ''} /> Refresh
            </button>
          </div>

          {ordersLoading ? (
            <div style={{ display: 'grid', placeItems: 'center', padding: '60px 20px', color: '#64748b' }}>
              <RefreshCw size={32} className="cg-spin" color="#059669" />
              <p style={{ marginTop: '12px', fontWeight: 600 }}>Loading your orders...</p>
            </div>
          ) : myOrders.length === 0 ? (
            <div style={{ background: 'var(--bg-surface, #ffffff)', border: '1px dashed var(--border, #cbd5e1)', borderRadius: '20px', padding: '60px 20px', textAlign: 'center' }}>
              <Truck size={48} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ margin: '0 0 6px', color: 'var(--text-primary, #0f172a)', fontWeight: 800 }}>No Orders Yet</h3>
              <p style={{ margin: '0 0 16px', color: 'var(--text-secondary, #64748b)', fontSize: '0.88rem' }}>
                You haven't ordered any circular compost or plant products yet.
              </p>
              <button
                onClick={() => setActiveSubTab('browse')}
                style={{ background: 'var(--brand, #059669)', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer' }}
              >
                Browse Green Store
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {myOrders.map(order => {
                const isPickup = order.fulfillmentType === 'Yard Pickup' || order.fulfillmentType === 'Yard Self-Pickup' || order.deliveryMethod === 'pickup';
                const isDelivered = order.orderStatus === 'Delivered / Collected' || order.currentDeliveryStatus === 'Delivered' || order.orderStatus === 'completed';
                const isCod = order.paymentMethod === 'Cash on Delivery' || order.paymentMethod === 'COD';
                const isPaid = order.paymentStatus === 'Paid';

                const statusColor =
                  isDelivered ? '#059669' :
                  order.orderStatus?.includes('Out for Delivery') ? '#2563eb' :
                  order.orderStatus?.includes('Assigned') ? '#0284c7' :
                  order.orderStatus?.includes('Order Placed') ? '#d97706' : '#64748b';

                return (
                  <div
                    key={order._id}
                    style={{
                      background: 'var(--bg-surface, #ffffff)',
                      border: '1px solid var(--border, #e2e8f0)',
                      borderRadius: '20px',
                      padding: '22px 24px',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px'
                    }}
                  >
                    {/* Order Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border, #f1f5f9)', paddingBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: isPickup ? '#ecfdf5' : '#eff6ff', display: 'grid', placeItems: 'center' }}>
                          {isPickup ? <Building2 size={20} color="#059669" /> : <Truck size={20} color="#2563eb" />}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary, #0f172a)' }}>
                              Order #{order.orderNumber || order._id.slice(-6).toUpperCase()}
                            </span>
                            <span style={{ background: `${statusColor}18`, color: statusColor, padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase' }}>
                              {order.currentDeliveryStatus || order.orderStatus?.replace(/_/g, ' ')}
                            </span>
                            {/* Payment Status Pill */}
                            <span style={{
                              background: isPaid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                              color: isPaid ? '#047857' : '#b45309',
                              border: `1px solid ${isPaid ? '#a7f3d0' : '#fde68a'}`,
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              {isPaid ? (
                                <>✓ {isCod ? 'COD Paid' : order.paymentMethod === 'Eco-Points Full Redemption' ? 'Points Paid' : 'Paid (Razorpay)'}</>
                              ) : (
                                <>💵 COD Pending (₹{order.totalAmountInr} on delivery)</>
                              )}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #64748b)', marginTop: '2px' }}>
                            Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-primary, #0f172a)' }}>
                          ₹{order.totalAmountInr?.toLocaleString()}
                        </div>
                        {(order.totalEcoPointsUsed > 0 || order.pointsRedeemed > 0) && (
                          <div style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: 700 }}>
                            🪙 {order.totalEcoPointsUsed || order.pointsRedeemed} pts redeemed
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Order Items & Fulfillment Mode */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                      {/* Items */}
                      <div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary, #64748b)', textTransform: 'uppercase', marginBottom: '8px' }}>
                          Items Purchased ({(order.items || []).reduce((acc, i) => acc + (i.quantity || 1), 0)})
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {order.items?.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: 'var(--text-primary, #1e293b)' }}>
                              <span>{item.productName || item.name} {item.unitSize ? `(${item.unitSize})` : ''} × <strong>{item.quantity}</strong></span>
                              <span style={{ fontWeight: 700 }}>₹{item.totalItemInr || item.totalPriceInr || (item.unitPriceInr * item.quantity)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Pickup / Delivery Info */}
                      <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {isPickup ? <Building2 size={15} color="#059669" /> : <MapPin size={15} color="#2563eb" />}
                          {isPickup ? 'Municipal Yard Self-Pickup' : 'Home Delivery Address'}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: 1.4 }}>
                          {isPickup ? (order.pickupYard?.yardName || order.pickupYard || 'Ajjarkadu Municipal Biomass Processing Center') : `${order.deliveryAddress?.street || 'Doorstep Delivery'}, ${order.deliveryAddress?.city || 'Udupi'} - ${order.deliveryAddress?.pincode || order.deliveryAddress?.postalCode || '576101'}`}
                        </p>
                        {!isPickup && order.deliveryOtp && !isDelivered && (
                          <div style={{ marginTop: '6px', padding: '6px 10px', background: '#ecfdf5', border: '1px dashed #059669', borderRadius: '8px', fontSize: '0.78rem', color: '#064e3b', fontWeight: 700 }}>
                            🔑 Handover OTP: <strong style={{ letterSpacing: '0.08em', fontSize: '0.9rem', color: '#059669' }}>{order.deliveryOtp}</strong> (Share with delivery partner upon delivery)
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
      )}

      {/* ── CART DRAWER MODAL ── */}
      {isCartOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            zIndex: 99999,
            display: 'flex',
            justifyContent: 'flex-end'
          }}
          onClick={() => {
            if (checkoutStep !== 'success') setIsCartOpen(false);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              height: '100%',
              background: 'var(--bg-surface, #ffffff)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.25)',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShoppingBag size={22} color="#059669" />
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
                  {checkoutStep === 'cart' ? 'Your Green Cart' : checkoutStep === 'checkout' ? 'Fulfillment & Payment' : 'Order Placed!'}
                </h2>
              </div>
              <button
                onClick={() => {
                  setIsCartOpen(false);
                  if (checkoutStep === 'success') {
                    setCheckoutStep('cart');
                    setActiveSubTab('my-orders');
                  }
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Body */}
            <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* ── STEP 1: CART ITEMS ── */}
              {checkoutStep === 'cart' && (
                <>
                  {cart.length === 0 ? (
                    <div style={{ display: 'grid', placeItems: 'center', padding: '60px 0', textAlign: 'center' }}>
                      <ShoppingBag size={56} color="#cbd5e1" />
                      <h3 style={{ margin: '14px 0 4px', fontWeight: 800, color: '#334155' }}>Your Cart is Empty</h3>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Explore our organic compost and circular biomass products.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {cart.map(item => (
                        <div
                          key={item._id}
                          style={{
                            display: 'flex',
                            gap: '14px',
                            padding: '12px',
                            borderRadius: '14px',
                            border: '1px solid var(--border, #f1f5f9)',
                            background: '#f8fafc'
                          }}
                        >
                          <img
                            src={item.image}
                            alt={item.name}
                            style={{ width: '64px', height: '64px', borderRadius: '10px', objectFit: 'cover' }}
                            onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=600&q=80'; }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <h4 style={{ margin: '0 0 2px', fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>{item.name}</h4>
                              <button onClick={() => removeFromCart(item._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px' }}>
                                <Trash2 size={15} />
                              </button>
                            </div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#059669' }}>
                              ₹{item.priceInInr} <span style={{ fontSize: '0.72rem', color: '#64748b' }}>× {item.quantity}</span>
                            </div>

                            {/* Qty changer */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                              <button
                                onClick={() => updateCartQty(item._id, -1)}
                                style={{ width: '22px', height: '22px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                              >
                                <Minus size={12} />
                              </button>
                              <span style={{ fontSize: '0.82rem', fontWeight: 800, minWidth: '16px', textAlign: 'center' }}>{item.quantity}</span>
                              <button
                                onClick={() => updateCartQty(item._id, 1)}
                                style={{ width: '22px', height: '22px', borderRadius: '6px', border: 'none', background: '#059669', color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {cart.length > 0 && (
                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid var(--border, #e2e8f0)', paddingTop: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800 }}>
                        <span>Subtotal:</span>
                        <span style={{ color: '#059669' }}>₹{cartSubtotal.toLocaleString()}</span>
                      </div>
                      <button
                        onClick={() => setCheckoutStep('checkout')}
                        style={{
                          background: 'var(--brand, #059669)',
                          color: '#ffffff',
                          border: 'none',
                          padding: '14px',
                          borderRadius: '14px',
                          fontWeight: 800,
                          fontSize: '0.95rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: '0 4px 16px rgba(5, 150, 105, 0.3)'
                        }}
                      >
                        Proceed to Fulfillment <ArrowRight size={16} />
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* ── STEP 2: CHECKOUT & PAYMENT ── */}
              {checkoutStep === 'checkout' && (
                <form onSubmit={handlePlaceOrder} style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
                  
                  {/* Delivery Mode Toggle */}
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '8px' }}>
                      Select Fulfillment Method
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setDeliveryMethod('pickup')}
                        style={{
                          padding: '12px',
                          borderRadius: '12px',
                          border: `2px solid ${deliveryMethod === 'pickup' ? '#059669' : '#e2e8f0'}`,
                          background: deliveryMethod === 'pickup' ? '#ecfdf5' : '#ffffff',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.88rem', color: deliveryMethod === 'pickup' ? '#064e3b' : '#334155' }}>
                          <Building2 size={16} /> Yard Self-Pickup
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700, marginTop: '2px' }}>FREE (₹0 collection fee)</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeliveryMethod('delivery')}
                        style={{
                          padding: '12px',
                          borderRadius: '12px',
                          border: `2px solid ${deliveryMethod === 'delivery' ? '#2563eb' : '#e2e8f0'}`,
                          background: deliveryMethod === 'delivery' ? '#eff6ff' : '#ffffff',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.88rem', color: deliveryMethod === 'delivery' ? '#1e3a8a' : '#334155' }}>
                          <Truck size={16} /> Home Delivery
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, marginTop: '2px' }}>Standard ₹99 fee</div>
                      </button>
                    </div>
                  </div>

                  {/* Delivery / Yard Specific Details */}
                  {deliveryMethod === 'pickup' ? (
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px' }}>
                      <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '6px' }}>
                        Select Collection Yard Gate:
                      </label>
                      <select
                        value={pickupYard}
                        onChange={(e) => setPickupYard(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.84rem', outline: 'none' }}
                      >
                        <option value="North Municipal Biomass Yard, Zone 4">North Municipal Biomass Yard, Zone 4</option>
                        <option value="Central Urban Forestry Depot, Gate 2">Central Urban Forestry Depot, Gate 2</option>
                        <option value="South Eco-Park Compost Facility">South Eco-Park Compost Facility</option>
                        <option value="Eastern Lake-Buffer Bio-Hub">Eastern Lake-Buffer Bio-Hub</option>
                      </select>
                      <p style={{ margin: '8px 0 0', fontSize: '0.74rem', color: '#64748b' }}>
                        💡 Collection hours: 08:00 AM – 06:00 PM on all municipal working days.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155' }}>
                          Delivery Destination
                        </label>
                        <button
                          type="button"
                          onClick={handleFetchLocation}
                          disabled={fetchingLocation}
                          style={{
                            background: fetchingLocation ? '#cbd5e1' : '#ecfdf5',
                            border: '1px solid #a7f3d0',
                            color: '#047857',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            cursor: fetchingLocation ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.2s'
                          }}
                        >
                          {fetchingLocation ? (
                            <>
                              <RefreshCw size={12} className="cg-spin" /> Detecting GPS...
                            </>
                          ) : (
                            <>
                              <Crosshair size={12} /> Auto-Detect Location
                            </>
                          )}
                        </button>
                      </div>

                      {locationSuccess && (
                        <div style={{ fontSize: '0.74rem', color: '#047857', background: '#dcfce7', padding: '4px 10px', borderRadius: '6px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Check size={13} strokeWidth={3} /> {locationSuccess}
                        </div>
                      )}

                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Street Address / Flat No. <span style={{ color: '#ef4444' }}>*</span></label>
                        <input
                          type="text"
                          required
                          value={deliveryAddress.street}
                          onChange={(e) => setDeliveryAddress({ ...deliveryAddress, street: e.target.value })}
                          placeholder="e.g. #42, 3rd Cross, Green Glen Layout"
                          style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Pincode <span style={{ color: '#ef4444' }}>*</span></label>
                          <input
                            type="text"
                            required
                            value={deliveryAddress.pincode}
                            onChange={(e) => setDeliveryAddress({ ...deliveryAddress, pincode: e.target.value })}
                            placeholder="560103"
                            style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Phone Number <span style={{ color: '#ef4444' }}>*</span></label>
                          <input
                            type="tel"
                            required
                            value={deliveryAddress.phone}
                            onChange={(e) => setDeliveryAddress({ ...deliveryAddress, phone: e.target.value })}
                            placeholder="9876543210"
                            style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Eco-Points Redemption Option (Always Visible) */}
                  <div style={{ background: availableEcoPoints > 0 ? '#fffbeb' : '#f8fafc', border: `1px solid ${availableEcoPoints > 0 ? '#fde68a' : '#e2e8f0'}`, borderRadius: '14px', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: availableEcoPoints > 0 ? '#92400e' : '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Coins size={16} color={availableEcoPoints > 0 ? '#d97706' : '#64748b'} /> Redeem Eco-Points (1 pt = ₹2 discount)
                      </span>
                      <span style={{ fontSize: '0.75rem', color: availableEcoPoints > 0 ? '#b45309' : '#64748b', fontWeight: 800, background: availableEcoPoints > 0 ? '#fef3c7' : '#e2e8f0', padding: '2px 8px', borderRadius: '6px' }}>
                        Balance: {availableEcoPoints} pts
                      </span>
                    </div>

                    {availableEcoPoints > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="range"
                            min="0"
                            max={maxRedeemablePoints}
                            step="5"
                            value={pointsToRedeem}
                            onChange={(e) => setPointsToRedeem(Number(e.target.value))}
                            style={{ flex: 1, accentColor: '#d97706', cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#92400e', minWidth: '95px', textAlign: 'right' }}>
                            {pointsToRedeem} pts (-₹{pointsToRedeem * 2})
                          </span>
                        </div>
                        {maxRedeemablePoints > 0 && (
                          <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                            {[
                              { label: 'None', val: 0 },
                              { label: '25%', val: Math.floor(maxRedeemablePoints * 0.25) },
                              { label: '50%', val: Math.floor(maxRedeemablePoints * 0.5) },
                              { label: 'Max Points', val: maxRedeemablePoints }
                            ].map((preset, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setPointsToRedeem(preset.val)}
                                style={{
                                  background: pointsToRedeem === preset.val ? '#d97706' : '#ffffff',
                                  color: pointsToRedeem === preset.val ? '#ffffff' : '#92400e',
                                  border: '1px solid #fde68a',
                                  borderRadius: '6px',
                                  padding: '3px 8px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>
                        You currently have 0 reward points. Adopt trees or log tree-care activities in your citizen portal to earn points and get discounts on store purchases!
                      </div>
                    )}
                  </div>

                  {/* Payment Method Selector (Razorpay vs Cash on Delivery) */}
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '8px' }}>
                      Select Payment Method
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {/* Razorpay Online */}
                      <div
                        onClick={() => setPaymentMethod('razorpay')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 14px',
                          borderRadius: '12px',
                          border: `2px solid ${paymentMethod === 'razorpay' ? '#059669' : '#e2e8f0'}`,
                          background: paymentMethod === 'razorpay' ? '#ecfdf5' : '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ecfdf5', color: '#059669', display: 'grid', placeItems: 'center' }}>
                            <CreditCard size={18} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a' }}>
                              Razorpay Online (UPI / Cards / NetBanking)
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                              Instant verified payment gateway
                            </div>
                          </div>
                        </div>
                        <span style={{ fontSize: '0.7rem', background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '6px', fontWeight: 800 }}>
                          SECURE UPI
                        </span>
                      </div>

                      {/* Cash on Delivery */}
                      <div
                        onClick={() => setPaymentMethod('cod')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 14px',
                          borderRadius: '12px',
                          border: `2px solid ${paymentMethod === 'cod' ? '#059669' : '#e2e8f0'}`,
                          background: paymentMethod === 'cod' ? '#ecfdf5' : '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'grid', placeItems: 'center' }}>
                            <Banknote size={18} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a' }}>
                              {deliveryMethod === 'pickup' ? 'Pay Cash at Municipal Yard Gate' : 'Cash on Delivery (COD)'}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                              {deliveryMethod === 'pickup' ? 'Pay upon item hand-off at yard' : 'Pay in cash to delivery executive'}
                            </div>
                          </div>
                        </div>
                        <span style={{ fontSize: '0.7rem', background: '#eff6ff', color: '#1d4ed8', padding: '3px 8px', borderRadius: '6px', fontWeight: 800 }}>
                          CASH
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bill Summary */}
                  <div style={{ background: '#f1f5f9', borderRadius: '14px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.84rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                      <span>Subtotal</span>
                      <span>₹{cartSubtotal.toLocaleString()}</span>
                    </div>
                    {deliveryFee > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                        <span>Home Delivery Fee</span>
                        <span>₹{deliveryFee}</span>
                      </div>
                    )}
                    {pointsDiscountInr > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#d97706', fontWeight: 700 }}>
                        <span>Eco-Points Discount</span>
                        <span>-₹{pointsDiscountInr}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '1.05rem', color: '#0f172a', borderTop: '1px solid #cbd5e1', paddingTop: '6px', marginTop: '4px' }}>
                      <span>Total to Pay:</span>
                      <span style={{ color: '#059669' }}>₹{finalTotalInr.toLocaleString()}</span>
                    </div>
                  </div>

                  {orderError && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '10px 14px', borderRadius: '10px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertCircle size={16} /> {orderError}
                    </div>
                  )}

                  {/* Submit Button */}
                  <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                    <button
                      type="button"
                      onClick={() => setCheckoutStep('cart')}
                      style={{ padding: '12px 18px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={placingOrder}
                      style={{
                        flex: 1,
                        background: 'var(--brand, #059669)',
                        color: '#ffffff',
                        border: 'none',
                        padding: '14px',
                        borderRadius: '12px',
                        fontWeight: 800,
                        fontSize: '0.95rem',
                        cursor: placingOrder ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 16px rgba(5, 150, 105, 0.3)'
                      }}
                    >
                      {placingOrder ? (
                        <>
                          <RefreshCw size={16} className="cg-spin" /> Processing Order...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={18} /> {paymentMethod === 'cod' ? `Place COD Order (₹${finalTotalInr})` : `Pay ₹${finalTotalInr.toLocaleString()} via Razorpay`}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* ── STEP 3: ORDER SUCCESS SCREEN ── */}
              {checkoutStep === 'success' && completedOrder && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px', padding: '20px 0' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#ecfdf5', color: '#059669', display: 'grid', placeItems: 'center' }}>
                    <CheckCircle2 size={38} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' }}>
                    Order Confirmed!
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                    Order #{completedOrder.orderNumber || completedOrder._id?.slice(-6).toUpperCase()} has been placed successfully.
                  </p>

                  {/* Payment Mode Notice */}
                  <div style={{ background: completedOrder.paymentMethod === 'Cash on Delivery' ? '#eff6ff' : '#ecfdf5', border: `1px solid ${completedOrder.paymentMethod === 'Cash on Delivery' ? '#bfdbfe' : '#a7f3d0'}`, borderRadius: '12px', padding: '10px 16px', width: '100%', fontSize: '0.82rem', fontWeight: 700, color: completedOrder.paymentMethod === 'Cash on Delivery' ? '#1e40af' : '#064e3b' }}>
                    {completedOrder.paymentMethod === 'Cash on Delivery' ? (
                      <span>💵 Cash on Delivery: Pay <strong>₹{completedOrder.totalAmountInr}</strong> in cash upon delivery.</span>
                    ) : completedOrder.paymentMethod === 'Eco-Points Full Redemption' ? (
                      <span>🪙 Paid via Eco-Points Redemption</span>
                    ) : (
                      <span>✓ Payment Verified via Razorpay Online</span>
                    )}
                  </div>

                  {completedOrder.fulfillmentType === 'Yard Pickup' && completedOrder.pickupYard && (
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px', width: '100%', marginTop: '4px' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#064e3b', marginBottom: '4px' }}>
                        🏢 Pickup Yard Location
                      </div>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569' }}>
                        {completedOrder.pickupYard?.yardName || completedOrder.pickupYard || 'Municipal Biomass Processing Center'}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setIsCartOpen(false);
                      setCheckoutStep('cart');
                      setActiveSubTab('my-orders');
                    }}
                    style={{
                      marginTop: '12px',
                      width: '100%',
                      background: 'var(--brand, #059669)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '12px',
                      borderRadius: '12px',
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      cursor: 'pointer'
                    }}
                  >
                    View My Orders
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
