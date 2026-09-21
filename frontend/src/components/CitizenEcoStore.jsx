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
  Calendar,
  Check,
  RefreshCw,
  ShoppingBag as CartIcon
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
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [orderError, setOrderError] = useState('');

  // Orders Tab State
  const [activeSubTab, setActiveSubTab] = useState('browse'); // 'browse' | 'my-orders'
  const [myOrders, setMyOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);

  useEffect(() => {
    localStorage.setItem('ecoStoreCart', JSON.stringify(cart));
  }, [cart]);

  // Fetch products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/eco-products`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setProducts(data);
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

  // Pricing calculations
  const cartSubtotal = cart.reduce((sum, item) => sum + (item.priceInInr * item.quantity), 0);
  const deliveryFee = deliveryMethod === 'delivery' && cartSubtotal > 0 ? 99 : 0;
  // 1 Eco Point = ₹2 discount, up to 50% of subtotal or max points available
  const maxRedeemablePoints = Math.min(userEcoPoints, Math.floor(cartSubtotal / 2));
  const pointsDiscountInr = Math.min(pointsToRedeem * 2, cartSubtotal);
  const finalTotalInr = Math.max(0, cartSubtotal + deliveryFee - pointsDiscountInr);

  // Category Filtering
  const categories = [
    { id: 'all', label: 'All Products', icon: '🌿' },
    { id: 'compost', label: 'Organic Compost', icon: '🌱' },
    { id: 'mulch', label: 'Wood Mulch & Bark', icon: '🪵' },
    { id: 'biochar', label: 'Biochar & Conditioners', icon: '⚗️' },
    { id: 'sapling', label: 'Native Saplings', icon: '🌳' },
    { id: 'firewood', label: 'Eco-Firewood & Chips', icon: '🔥' }
  ];

  const filteredProducts = products.filter(p => {
    const matchCategory = activeCategory === 'all' || p.category === activeCategory;
    const matchSearch = !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCategory && matchSearch;
  }).sort((a, b) => {
    if (sortBy === 'price-low') return a.priceInInr - b.priceInInr;
    if (sortBy === 'price-high') return b.priceInInr - a.priceInInr;
    if (sortBy === 'points') return (a.priceInPoints || 0) - (b.priceInPoints || 0);
    return (b.rating || 5) - (a.rating || 5);
  });

  // Handle Checkout Submission
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
      const payload = {
        userId: user?._id || user?.id || 'GUEST_USER',
        userName: user?.name || user?.username || 'Eco Citizen',
        userEmail: user?.email || 'citizen@canopyguard.org',
        items: cart.map(item => ({
          productId: item._id,
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          unitPriceInr: item.priceInInr,
          unitPricePoints: item.priceInPoints,
          totalPriceInr: item.priceInInr * item.quantity,
          image: item.image
        })),
        deliveryMethod,
        deliveryAddress: deliveryMethod === 'delivery' ? deliveryAddress : undefined,
        pickupYard: deliveryMethod === 'pickup' ? pickupYard : undefined,
        paymentMethod: pointsDiscountInr >= cartSubtotal ? 'points' : pointsToRedeem > 0 ? 'mixed' : paymentMethod,
        pointsRedeemed: pointsToRedeem,
        pointsDiscountInr,
        deliveryFee,
        totalAmountInr: finalTotalInr
      };

      const res = await fetch(`${API_URL}/api/eco-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to place green order');
      }

      setCompletedOrder(data.order);
      setCart([]);
      setPointsToRedeem(0);
      setCheckoutStep('success');
      if (onPointsUpdated && data.remainingPoints !== undefined) {
        onPointsUpdated(data.remainingPoints);
      }
    } catch (err) {
      console.error('Order creation failed:', err);
      setOrderError(err.message || 'Failed to complete order. Please try again.');
    } finally {
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '22px' }}>
              {filteredProducts.map(product => {
                const inCart = cart.find(item => item._id === product._id);
                return (
                  <div
                    key={product._id}
                    style={{
                      background: 'var(--bg-surface, #ffffff)',
                      border: '1px solid var(--border, #e2e8f0)',
                      borderRadius: '20px',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
                      transition: 'transform 0.2s, box-shadow 0.2s'
                    }}
                  >
                    {/* Product Image & Badge */}
                    <div style={{ position: 'relative', height: '190px', background: '#f8fafc', overflow: 'hidden' }}>
                      <img
                        src={product.image || 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=600&q=80'}
                        alt={product.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=600&q=80';
                        }}
                      />
                      <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)', color: '#ffffff', padding: '4px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase' }}>
                        {product.category}
                      </div>
                      {product.weightKg && (
                        <div style={{ position: 'absolute', top: '12px', right: '12px', background: '#059669', color: '#ffffff', padding: '4px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 800 }}>
                          {product.weightKg} kg Bag
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)', lineHeight: 1.3 }}>
                          {product.name}
                        </h3>
                      </div>

                      <p style={{ margin: '0 0 14px', fontSize: '0.82rem', color: 'var(--text-secondary, #64748b)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {product.description}
                      </p>

                      {/* Origin & Specs Tags */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                        {product.nutrientGrade && (
                          <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700 }}>
                            ⭐ Grade: {product.nutrientGrade}
                          </span>
                        )}
                        {product.originYard && (
                          <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 600 }}>
                            📍 {product.originYard}
                          </span>
                        )}
                      </div>

                      {/* Price & Action */}
                      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--border, #f1f5f9)' }}>
                        <div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--brand, #059669)' }}>
                            ₹{product.priceInInr}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Coins size={12} /> or {product.priceInPoints} pts
                          </div>
                        </div>

                        {inCart ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ecfdf5', borderRadius: '12px', padding: '4px 8px', border: '1px solid #a7f3d0' }}>
                            <button
                              onClick={() => updateCartQty(product._id, -1)}
                              style={{ width: '26px', height: '26px', borderRadius: '8px', border: 'none', background: '#ffffff', color: '#047857', cursor: 'pointer', display: 'grid', placeItems: 'center', fontWeight: 800 }}
                            >
                              <Minus size={14} />
                            </button>
                            <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#064e3b', minWidth: '18px', textAlign: 'center' }}>
                              {inCart.quantity}
                            </span>
                            <button
                              onClick={() => updateCartQty(product._id, 1)}
                              style={{ width: '26px', height: '26px', borderRadius: '8px', border: 'none', background: '#059669', color: '#ffffff', cursor: 'pointer', display: 'grid', placeItems: 'center', fontWeight: 800 }}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(product, 1)}
                            disabled={product.stock <= 0}
                            style={{
                              background: product.stock <= 0 ? '#94a3b8' : 'var(--brand, #059669)',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '12px',
                              padding: '8px 16px',
                              fontWeight: 800,
                              fontSize: '0.84rem',
                              cursor: product.stock <= 0 ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
                            }}
                          >
                            <Plus size={16} /> {product.stock <= 0 ? 'Out of Stock' : 'Add'}
                          </button>
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

      {/* ── SUB-VIEW: MY GREEN ORDERS ── */}
      {activeSubTab === 'my-orders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
                My Circular Economy Orders
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: 'var(--text-secondary, #64748b)' }}>
                Track active compost bags, gate-pickup passes, and past purchases.
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
                const isPickup = order.deliveryMethod === 'pickup';
                const statusColor =
                  order.orderStatus === 'completed' ? '#059669' :
                  order.orderStatus === 'ready_for_pickup' || order.orderStatus === 'out_for_delivery' ? '#2563eb' :
                  order.orderStatus === 'processing' ? '#d97706' : '#64748b';

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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary, #0f172a)' }}>
                              Order #{order.orderNumber || order._id.slice(-6).toUpperCase()}
                            </span>
                            <span style={{ background: `${statusColor}18`, color: statusColor, padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase' }}>
                              {order.orderStatus?.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #64748b)' }}>
                            Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-primary, #0f172a)' }}>
                          ₹{order.totalAmountInr?.toLocaleString()}
                        </div>
                        {order.pointsRedeemed > 0 && (
                          <div style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: 700 }}>
                            🪙 {order.pointsRedeemed} pts redeemed
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Order Items & Fulfillment Mode */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                      {/* Items */}
                      <div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary, #64748b)', textTransform: 'uppercase', marginBottom: '8px' }}>
                          Items Purchased ({order.items?.length || 0})
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {order.items?.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: 'var(--text-primary, #1e293b)' }}>
                              <span>{item.name} × <strong>{item.quantity}</strong></span>
                              <span style={{ fontWeight: 700 }}>₹{item.totalPriceInr}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Pickup / Delivery Info */}
                      <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                          {isPickup ? <Building2 size={15} color="#059669" /> : <MapPin size={15} color="#2563eb" />}
                          {isPickup ? 'Municipal Yard Self-Pickup' : 'Home Delivery Address'}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: 1.4 }}>
                          {isPickup ? (order.pickupYard || 'Central Biomass Recovery Yard, Gate 2') : `${order.deliveryAddress?.street}, ${order.deliveryAddress?.city} - ${order.deliveryAddress?.pincode}`}
                        </p>
                      </div>
                    </div>

                    {/* Pickup Pass / QR Code Action */}
                    {isPickup && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '14px', padding: '12px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <QrCode size={22} color="#047857" />
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#064e3b' }}>
                              Digital Gate-Pickup Pass Available
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#047857' }}>
                              Show this QR code at the weighbridge/security gate for instant item hand-off.
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedOrderDetails(order)}
                          style={{ background: '#059669', color: '#ffffff', border: 'none', borderRadius: '10px', padding: '8px 16px', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <QrCode size={14} /> View Digital QR Pass
                        </button>
                      </div>
                    )}
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
                        <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700, marginTop: '2px' }}>FREE (₹0 fee + QR pass)</div>
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
                        💡 You will receive an instant digital QR Gate Pass for pickup between 08:00 AM – 06:00 PM.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Street Address / Flat No.</label>
                        <input
                          type="text"
                          required
                          value={deliveryAddress.street}
                          onChange={(e) => setDeliveryAddress({ ...deliveryAddress, street: e.target.value })}
                          placeholder="e.g. #42, 3rd Cross, Green Glen Layout"
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Pincode</label>
                          <input
                            type="text"
                            required
                            value={deliveryAddress.pincode}
                            onChange={(e) => setDeliveryAddress({ ...deliveryAddress, pincode: e.target.value })}
                            placeholder="560103"
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Phone Number</label>
                          <input
                            type="tel"
                            required
                            value={deliveryAddress.phone}
                            onChange={(e) => setDeliveryAddress({ ...deliveryAddress, phone: e.target.value })}
                            placeholder="9876543210"
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Eco-Points Redemption Option */}
                  {userEcoPoints > 0 && (
                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '14px', padding: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Coins size={16} /> Redeem Eco-Points (1 pt = ₹2 off)
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 700 }}>
                          Avail: {userEcoPoints} pts
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="range"
                          min="0"
                          max={maxRedeemablePoints}
                          step="10"
                          value={pointsToRedeem}
                          onChange={(e) => setPointsToRedeem(Number(e.target.value))}
                          style={{ flex: 1, accentColor: '#d97706' }}
                        />
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#92400e', minWidth: '60px', textAlign: 'right' }}>
                          {pointsToRedeem} pts (-₹{pointsToRedeem * 2})
                        </span>
                      </div>
                    </div>
                  )}

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
                          <RefreshCw size={16} className="cg-spin" /> Placing Order...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={18} /> Confirm &amp; Pay ₹{finalTotalInr.toLocaleString()}
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
                    Order #{completedOrder.orderNumber || completedOrder._id.slice(-6).toUpperCase()} has been received and routed to the municipal biomass facility.
                  </p>

                  {completedOrder.deliveryMethod === 'pickup' && (
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px', width: '100%', marginTop: '8px' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#064e3b', marginBottom: '8px' }}>
                        🏢 Digital Gate-Pass Code
                      </div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#059669', letterSpacing: '0.1em', background: '#ecfdf5', padding: '8px 16px', borderRadius: '8px', border: '1px dashed #a7f3d0' }}>
                        {completedOrder.pickupPassCode || 'GATE-PASS-ECO'}
                      </div>
                      <p style={{ margin: '8px 0 0', fontSize: '0.74rem', color: '#64748b' }}>
                        Show this code or the QR code on your order ticket at <strong>{completedOrder.pickupYard}</strong>.
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
                    View My Orders &amp; QR Pass
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── QR CODE GATE PASS LIGHTBOX MODAL ── */}
      {selectedOrderDetails && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.82)',
            backdropFilter: 'blur(8px)',
            zIndex: 999999,
            display: 'grid',
            placeItems: 'center',
            padding: '20px'
          }}
          onClick={() => setSelectedOrderDetails(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '28px',
              maxWidth: '420px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              border: '1px solid #e2e8f0'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#047857', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={18} /> Municipal Gate-Pickup Pass
              </span>
              <button onClick={() => setSelectedOrderDetails(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            {/* QR Mock Rendering */}
            <div style={{ background: '#ecfdf5', border: '2px dashed #059669', borderRadius: '16px', padding: '24px', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
              <QrCode size={160} color="#064e3b" />
              <div style={{ marginTop: '12px', fontWeight: 900, fontSize: '1.2rem', color: '#064e3b', letterSpacing: '0.08em' }}>
                {selectedOrderDetails.pickupPassCode || selectedOrderDetails.orderNumber || 'GATE-PASS-ECO'}
              </div>
            </div>

            <div style={{ textAlign: 'left', background: '#f8fafc', padding: '14px', borderRadius: '12px', fontSize: '0.82rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div><strong>Order Ref:</strong> #{selectedOrderDetails.orderNumber}</div>
              <div><strong>Pickup Location:</strong> {selectedOrderDetails.pickupYard}</div>
              <div><strong>Customer:</strong> {selectedOrderDetails.userName}</div>
              <div><strong>Status:</strong> <span style={{ color: '#059669', fontWeight: 700 }}>{selectedOrderDetails.orderStatus}</span></div>
            </div>

            <button
              onClick={() => setSelectedOrderDetails(null)}
              style={{ marginTop: '18px', width: '100%', background: '#0f172a', color: '#ffffff', border: 'none', padding: '11px', borderRadius: '12px', fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer' }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
