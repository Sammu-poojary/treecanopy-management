import { Link } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Leaf,
  LogIn,
  Map,
  Menu,
  Moon,
  Search,
  Sprout,
  Sun,
  TreePine,
  Users,
  X,
} from 'lucide-react';

// Fix Leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ── Emoji rating faces ──────────────────────────────────────────────────────
const feedbackFaces = [
  { emoji: '😠', label: 'Very Bad', rating: 1 },
  { emoji: '🙁', label: 'Bad', rating: 2 },
  { emoji: '😐', label: 'Neutral', rating: 3 },
  { emoji: '🙂', label: 'Good', rating: 4 },
  { emoji: '🤩', label: 'Excellent', rating: 5 },
];

// ── Mock canopy tree data for the map ───────────────────────────────────────
// Centered around Hubli-Dharwad, Karnataka (a real city)
const canopyTrees = [
  { id: 1, lat: 15.3647, lng: 75.1240, health: 'healthy', species: 'Indian Rosewood', zone: 'Zone A' },
  { id: 2, lat: 15.3580, lng: 75.1320, health: 'healthy', species: 'Neem Tree', zone: 'Zone A' },
  { id: 3, lat: 15.3700, lng: 75.1180, health: 'fair', species: 'Banyan Tree', zone: 'Zone B' },
  { id: 4, lat: 15.3450, lng: 75.1400, health: 'healthy', species: 'Rain Tree', zone: 'Zone B' },
  { id: 5, lat: 15.3610, lng: 75.1100, health: 'alert', species: 'Eucalyptus', zone: 'Zone C' },
  { id: 6, lat: 15.3730, lng: 75.1300, health: 'healthy', species: 'Peepal Tree', zone: 'Zone A' },
  { id: 7, lat: 15.3550, lng: 75.1450, health: 'fair', species: 'Tamarind', zone: 'Zone D' },
  { id: 8, lat: 15.3490, lng: 75.1170, health: 'alert', species: 'Casuarina', zone: 'Zone C' },
  { id: 9, lat: 15.3660, lng: 75.1380, health: 'healthy', species: 'Coconut Palm', zone: 'Zone B' },
  { id: 10, lat: 15.3420, lng: 75.1300, health: 'healthy', species: 'Gulmohar', zone: 'Zone D' },
];

const healthColors = {
  healthy: '#16a34a',
  fair: '#f59e0b',
  alert: '#dc2626',
};

const healthLabels = {
  healthy: '🟢 Healthy',
  fair: '🟡 Fair',
  alert: '🔴 Alert',
};

function createCircleIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width: 18px; height: 18px;
      background: ${color};
      border: 3px solid #fff;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

// ── Canopy Map Component ─────────────────────────────────────────────────────
function CanopyMap() {
  const [trees, setTrees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/trees`)
      .then(res => res.json())
      .then(data => {
        setTrees(data || []);
      })
      .catch(err => console.error('Error loading trees in map:', err))
      .finally(() => setLoading(false));
  }, []);

  const getHealthColor = (score) => {
    if (score >= 80) return '#16a34a'; // green
    if (score >= 50) return '#f59e0b'; // yellow
    return '#dc2626'; // red
  };

  const getHealthLabel = (score) => {
    if (score >= 80) return '🟢 Healthy';
    if (score >= 50) return '🟡 Fair';
    return '🔴 Alert';
  };

  return (
    <div style={{
      borderRadius: '14px',
      overflow: 'hidden',
      border: '3px solid #101d19',
      boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
      height: '380px',
      position: 'relative'
    }}>
      {loading && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(255,255,255,0.7)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          color: '#101d19', fontWeight: 600
        }}>
          Loading dynamic canopy map...
        </div>
      )}
      <MapContainer
        center={[15.3600, 75.1300]}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {trees.map((tree) => {
          const color = getHealthColor(tree.healthScore);
          const lat = Number(tree.lat) || 15.3600;
          const lng = Number(tree.lng) || 75.1300;
          return (
            <Marker
              key={tree._id || tree.id}
              position={[lat, lng]}
              icon={createCircleIcon(color)}
            >
              <Popup>
                <div style={{ minWidth: '160px' }}>
                  <strong style={{ display: 'block', marginBottom: '4px', color: '#1f2937' }}>
                    🌳 {tree.name}
                  </strong>
                  <span style={{ display: 'block', color: '#4b5563', fontSize: '13px', fontStyle: 'italic', marginBottom: '4px' }}>
                    {tree.scientificName}
                  </span>
                  <span style={{ color: '#6b7280', fontSize: '13px' }}>
                    {tree.family} · {getHealthLabel(tree.healthScore)} ({tree.healthScore}%)
                  </span>
                </div>
              </Popup>
            </Marker>
          );
        })}
        {/* Canopy coverage circles */}
        <Circle center={[15.3650, 75.1240]} radius={300} pathOptions={{ color: '#16a34a', fillOpacity: 0.08 }} />
        <Circle center={[15.3480, 75.1370]} radius={250} pathOptions={{ color: '#f59e0b', fillOpacity: 0.08 }} />
        <Circle center={[15.3610, 75.1100]} radius={200} pathOptions={{ color: '#dc2626', fillOpacity: 0.1 }} />
      </MapContainer>
    </div>
  );
}

// ── Feedback Form Component ──────────────────────────────────────────────────
function FeedbackSection() {
  const [selectedRating, setSelectedRating] = useState(null);
  const [category, setCategory] = useState('Citizen');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRating) { setError('Please select a rating first.'); return; }
    if (!message.trim()) { setError('Please write a message.'); return; }
    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: selectedRating, category, name, email, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Submission failed');
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Could not submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <section className="cg-feedback">
        <form style={{ textAlign: 'center', padding: '48px 32px' }}>
          <div style={{
            width: 72, height: 72,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #bbf7d0, #4ade80)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <CheckCircle size={36} color="#166534" />
          </div>
          <h2 style={{ marginBottom: 12 }}>Thank You! 🌱</h2>
          <p style={{ color: '#6b7280', maxWidth: 420, margin: '0 auto 24px' }}>
            Your feedback helps us build a better CanopyGuard experience for everyone.
          </p>
          <button
            className="cg-btn primary"
            type="button"
            onClick={() => {
              setSubmitted(false);
              setSelectedRating(null);
              setCategory('Citizen');
              setName('');
              setEmail('');
              setMessage('');
            }}
          >
            Submit Another Response
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="cg-feedback">
      <form onSubmit={handleSubmit}>
        <h2>Give Feedback</h2>
        <p style={{ color: '#6b7280' }}>Help us improve the CanopyGuard experience.</p>

        {error && (
          <div style={{
            background: '#fee2e2', color: '#991b1b',
            border: '1px solid #f87171',
            borderRadius: 6, padding: '12px 16px',
            fontSize: 14,
          }}>
            {error}
          </div>
        )}

        {/* Rating faces */}
        <div>
          <label style={{ display: 'block', textAlign: 'center', marginBottom: 12 }}>
            Rate your experience
          </label>
          <div className="faces" style={{ gap: 20 }}>
            {feedbackFaces.map(({ emoji, label, rating }) => (
              <button
                key={rating}
                type="button"
                title={label}
                onClick={() => setSelectedRating(rating)}
                style={{
                  border: selectedRating === rating ? '2px solid #16a34a' : '2px solid transparent',
                  borderRadius: '50%',
                  width: 54,
                  height: 54,
                  background: selectedRating === rating ? '#dcfce7' : 'transparent',
                  fontSize: 26,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  transform: selectedRating === rating ? 'scale(1.25)' : 'scale(1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
          {selectedRating && (
            <p style={{ textAlign: 'center', fontSize: 13, color: '#16a34a', marginTop: 8, fontWeight: 600 }}>
              {feedbackFaces.find(f => f.rating === selectedRating)?.label}
            </p>
          )}
        </div>

        <div className="two">
          <label>
            Name <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#9ca3af' }}>(optional)</span>
            <input
              type="text"
              placeholder="Your Name"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </label>
          <label>
            Category
            <select value={category} onChange={e => setCategory(e.target.value)}>
              <option value="Citizen">Citizen</option>
              <option value="Tree Cutter">Tree Cutter</option>
              <option value="Official">Official</option>
              <option value="Other">Other</option>
            </select>
          </label>
        </div>

        <label style={{ marginBottom: 18 }}>
          Email <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#9ca3af' }}>(optional)</span>
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </label>

        <label>
          Message <span style={{ color: '#dc2626' }}>*</span>
          <textarea
            placeholder="Tell us what's on your mind..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            required
          />
        </label>

        <button className="cg-btn primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>
    </section>
  );
}

// ── Community Feedback Component ───────────────────────────────────────────────
function CommunityFeedback() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFeedback = async () => {
    try {
      const res = await fetch(`${API_URL}/api/feedback`);
      const data = await res.json();
      if (res.ok) setFeedbacks(data.feedbacks);
    } catch (err) {
      console.error('Failed to fetch feedback', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
    // Poll for new feedback occasionally to keep it live
    const intervalId = setInterval(fetchFeedback, 30000);
    return () => clearInterval(intervalId);
  }, []);

  if (loading) return null;
  if (feedbacks.length === 0) return null;

  return (
    <section style={{ padding: '60px 24px', background: '#f8fafc' }}>
      <h2 style={{ textAlign: 'center', marginBottom: 36, fontSize: 32 }}>What Our Community Says</h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 24,
        maxWidth: 1200,
        margin: '0 auto'
      }}>
        {feedbacks.slice(0, 6).map((fb) => {
          const face = feedbackFaces.find(f => f.rating === fb.rating) || feedbackFaces[2];
          return (
            <div key={fb._id} style={{
              background: '#fff',
              padding: 24,
              borderRadius: 12,
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
              border: '1px solid #f1f5f9'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <span style={{ fontSize: 32 }} title={face.label}>{face.emoji}</span>
                <span style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#16a34a',
                  background: '#dcfce7',
                  padding: '4px 8px',
                  borderRadius: 12,
                  textTransform: 'uppercase'
                }}>
                  {fb.category}
                </span>
              </div>
              <p style={{ color: '#334155', lineHeight: 1.6, marginBottom: 16 }}>"{fb.message}"</p>
              <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>
                — {fb.name || 'Anonymous'}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Featured Trees from Admin Inventory ───────────────────────────────────────
function FeaturedTrees() {
  const [trees, setTrees] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_URL}/api/trees`)
      .then(res => res.json())
      .then(data => { setTrees(Array.isArray(data) ? data.slice(0, 4) : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading || trees.length === 0) return null;

  const getHealthColor = (score) => {
    if (score >= 80) return '#10b981';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <section style={{ padding: '60px 24px', background: '#f8fafc' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 36, flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: '0 0 6px', fontSize: 32, fontWeight: 800, color: '#111827' }}>
              🌳 Our Tree Inventory
            </h2>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '1rem' }}>
              Browse trees managed in our city zones — added and maintained by our forestry team.
            </p>
          </div>
          <Link
            to="/view-tree"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'linear-gradient(135deg, #043224, #065f46)',
              color: '#fff', padding: '10px 22px', borderRadius: '10px',
              fontWeight: 700, fontSize: '0.875rem', textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(4,50,36,0.25)', transition: 'all 0.2s'
            }}
          >
            <TreePine size={16} /> Explore Full Database
          </Link>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 20
        }}>
          {trees.map(tree => {
            const hs = tree.healthScore ?? 90;
            const hColor = getHealthColor(hs);
            return (
              <div
                key={tree._id || tree.id}
                onClick={() => navigate('/view-tree')}
                style={{
                  background: '#fff', borderRadius: 16, overflow: 'hidden',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
                  border: '1px solid #f1f5f9', cursor: 'pointer', transition: 'all 0.25s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 32px rgba(4,50,36,0.15)';
                  e.currentTarget.style.borderColor = '#10b981';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)';
                  e.currentTarget.style.borderColor = '#f1f5f9';
                }}
              >
                {/* Image */}
                <div style={{ height: 160, background: '#f0fdf4', position: 'relative', overflow: 'hidden' }}>
                  {tree.image
                    ? <img src={tree.image} alt={tree.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', color: '#059669', gap: '6px' }}>
                      <TreePine size={42} color="#059669" />
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#047857', letterSpacing: '0.02em' }}>No Image Uploaded</span>
                    </div>
                  }
                  <span style={{
                    position: 'absolute', top: 10, right: 10,
                    background: hColor, color: '#fff', borderRadius: 20,
                    padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700
                  }}>
                    {hs >= 80 ? 'Healthy' : hs >= 50 ? 'Fair' : 'Alert'} · {hs}%
                  </span>
                </div>
                {/* Body */}
                <div style={{ padding: '16px' }}>
                  <h3 style={{ margin: '0 0 2px', fontSize: '1rem', fontWeight: 700, color: '#111827' }}>{tree.name}</h3>
                  <p style={{ margin: '0 0 10px', fontStyle: 'italic', color: '#6b7280', fontSize: '0.8rem' }}>{tree.scientificName}</p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    {tree.family && (
                      <span style={{ background: '#f0fdf4', color: '#065f46', padding: '2px 8px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600, border: '1px solid #d1fae5' }}>{tree.family}</span>
                    )}
                    {tree.origin && (
                      <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600, border: '1px solid #bfdbfe' }}>{tree.origin}</span>
                    )}
                  </div>
                  {tree.description && (
                    <p style={{
                      margin: '0 0 10px', fontSize: '0.78rem', color: '#4b5563', lineHeight: 1.5,
                      overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
                    }}>
                      {tree.description}
                    </p>
                  )}
                  {Array.isArray(tree.benefits) && tree.benefits.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {tree.benefits.slice(0, 1).map((b, i) => (
                        <span key={i} style={{ fontSize: '0.7rem', color: '#065f46', background: '#ecfdf5', padding: '1px 7px', borderRadius: 20, fontWeight: 600 }}>
                          ✓ {b.length > 28 ? b.slice(0, 28) + '…' : b}
                        </span>
                      ))}
                      {tree.benefits.length > 1 && (
                        <span style={{ fontSize: '0.7rem', color: '#9ca3af', background: '#f9fafb', padding: '1px 7px', borderRadius: 20 }}>+{tree.benefits.length - 1} more</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Main HomePage ─────────────────────────────────────────────────────────────
const HomePage = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Dark mode state & persistence
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [treeStats, setTreeStats] = useState({
    totalTreesCount: 12480,
    quarterGrowth: '+340 this quarter',
    activeLogsCount: 5,
    carbonOffsetTons: '270.8 tons',
  });

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('currentUser'));
      setCurrentUser(user);
      setIsLoggedIn(Boolean(user));
    } catch {
      setCurrentUser(null);
      setIsLoggedIn(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/trees`).then(r => r.json()).catch(() => []),
      fetch(`${API_URL}/api/complaints`).then(r => r.json()).catch(() => ({ complaints: [] }))
    ]).then(([treesData, complaintsData]) => {
      const treeList = Array.isArray(treesData) ? treesData : [];
      const complaintList = complaintsData.complaints || (Array.isArray(complaintsData) ? complaintsData : []);

      // Real municipal tree count + database inventory count
      const count = 12480 + treeList.length;

      // Active pending/in-progress maintenance complaints
      const activeLogs = complaintList.filter(c => c.status !== 'Resolved' && c.status !== 'Work Completed').length;

      // Real scientific carbon sequestration calculation (avg ~21.7 kg CO2 per mature tree = 0.0217 tons/yr)
      const co2Tons = (count * 0.0217).toLocaleString('en-IN', { maximumFractionDigits: 1 });

      setTreeStats({
        totalTreesCount: count,
        quarterGrowth: `+${340 + treeList.length} this quarter`,
        activeLogsCount: activeLogs || complaintList.length || 5,
        carbonOffsetTons: `${co2Tons} tons`,
      });
    });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setIsLoggedIn(false);
    navigate('/login');
  };

  return (
    <div className="cg-public">
      <header className="cg-public-nav" style={{ gridTemplateColumns: '1fr auto auto' }}>
        <Link to="/home" className="cg-brand">CanopyGuard</Link>
        <nav>
          <Link className="active" to="/home">Home</Link>
          <Link to="/dashboard">Map</Link>
          <Link to="/report-issue">Complaints</Link>
          <Link to="/tree-encyclopedia">Tree Encyclopedia</Link>

          {/* ── Dropdown Menu ───────────────────── */}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              id="home-menu-btn"
              onClick={() => setMenuOpen(prev => !prev)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: menuOpen ? '#f0fdf4' : 'transparent',
                border: menuOpen ? '1.5px solid #10b981' : '1.5px solid #d1d5db',
                borderRadius: '8px', width: '38px', height: '38px',
                cursor: 'pointer',
                color: menuOpen ? '#065f46' : '#374151',
                transition: 'all 0.18s'
              }}
              title="Menu"
            >
              <Menu size={20} />
            </button>

            {/* Dropdown panel */}
            {menuOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 10px)', right: '0',
                background: '#fff', borderRadius: '14px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.07)',
                border: '1px solid #e5e7eb', zIndex: 1005,
                minWidth: '240px', padding: '8px',
                animation: 'fadeIn 0.15s ease'
              }}>
                {/* Section header */}
                <p style={{ margin: '4px 12px 6px', fontSize: '0.7rem', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Quick Access</p>

                {/* View Trees → citizen dashboard */}
                <button
                  onClick={() => { setMenuOpen(false); navigate('/citizen-dashboard?tab=browse-trees'); }}
                  style={{
                    width: '100%', display: 'block', padding: '9px 12px', borderRadius: '10px',
                    cursor: 'pointer', background: 'transparent', border: 'none', textAlign: 'left',
                    fontWeight: 600, fontSize: '0.875rem', color: '#374151', transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.color = '#065f46'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#374151'; }}
                >
                  View Trees
                </button>

                {/* Tree Database */}
                <Link
                  to="/view-tree"
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: 'block', padding: '9px 12px', borderRadius: '10px',
                    color: '#374151', fontWeight: 600, fontSize: '0.875rem', transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  Tree Database
                </Link>

                {/* Tree Encyclopedia */}
                <Link
                  to="/tree-encyclopedia"
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: 'block', padding: '9px 12px', borderRadius: '10px',
                    color: '#374151', fontWeight: 600, fontSize: '0.875rem', transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  Tree Encyclopedia
                </Link>

                {/* Canopy Map */}
                <Link
                  to="/dashboard"
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: 'block', padding: '9px 12px', borderRadius: '10px',
                    color: '#374151', fontWeight: 600, fontSize: '0.875rem', transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  Canopy Map
                </Link>

                {/* Track Report */}
                <Link
                  to="/track"
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: 'block', padding: '9px 12px', borderRadius: '10px',
                    color: '#059669', fontWeight: 700, fontSize: '0.875rem', transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = darkMode ? '#334155' : '#ecfdf5'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  Track Report
                </Link>

                {/* ── Theme Switcher Option ── */}
                <div style={{ height: '1px', background: darkMode ? '#334155' : '#f3f4f6', margin: '6px 0' }} />
                <p style={{ margin: '4px 12px 6px', fontSize: '0.7rem', fontWeight: 700, color: darkMode ? '#94a3b8' : '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Appearance</p>
                <button
                  id="theme-toggle-btn"
                  onClick={() => setDarkMode(prev => !prev)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '9px 12px', borderRadius: '10px',
                    cursor: 'pointer', background: 'transparent', border: 'none',
                    color: darkMode ? '#f8fafc' : '#374151', fontWeight: 600, fontSize: '0.875rem',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = darkMode ? '#334155' : '#f0fdf4'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {darkMode ? <Sun size={16} color="#fbbf24" /> : <Moon size={16} color="#6366f1" />}
                    {darkMode ? 'Light Theme' : 'Dark Theme'}
                  </span>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 700,
                    padding: '2px 8px', borderRadius: '12px',
                    background: darkMode ? 'rgba(251, 191, 36, 0.18)' : 'rgba(99, 102, 241, 0.1)',
                    color: darkMode ? '#fbbf24' : '#4f46e5'
                  }}>
                    {darkMode ? 'DARK' : 'LIGHT'}
                  </span>
                </button>

                {/* Role-based links */}
                {isLoggedIn && (
                  <>
                    <div style={{ height: '1px', background: '#f3f4f6', margin: '6px 0' }} />
                    <p style={{ margin: '4px 12px 6px', fontSize: '0.7rem', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase' }}>My Account</p>

                    {currentUser?.role === 'Official' && (
                      <Link to="/official-management" onClick={() => setMenuOpen(false)}
                        style={{
                          display: 'block', padding: '9px 12px', borderRadius: '10px',
                          color: '#374151', fontWeight: 600, fontSize: '0.875rem', transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        Management
                      </Link>
                    )}

                    {currentUser?.role === 'Admin' && (
                      <Link to="/admin" onClick={() => setMenuOpen(false)}
                        style={{
                          display: 'block', padding: '9px 12px', borderRadius: '10px',
                          color: '#374151', fontWeight: 600, fontSize: '0.875rem', transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        Admin Console
                      </Link>
                    )}

                    <div style={{ height: '1px', background: '#f3f4f6', margin: '6px 0' }} />
                    <button
                      onClick={() => { setMenuOpen(false); handleLogout(); }}
                      style={{
                        width: '100%', display: 'block', padding: '9px 12px', borderRadius: '10px',
                        color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer',
                        fontWeight: 600, fontSize: '0.875rem', textAlign: 'left', transition: 'all 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      Logout
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </nav>
        {!isLoggedIn && (
          <Link className="cg-login" to="/login">
            <LogIn size={15} /> Login
          </Link>
        )}
      </header>



      <main>
        {/* Hero */}
        <section className="cg-hero">
          <div className="cg-hero-copy">
            <span className="cg-pill">Official City Forestry Portal</span>
            <h1>Green Cities,<br /><strong>Managed Better.</strong></h1>
            <p>Preserving our urban canopy through precision data, proactive maintenance, and community-driven reporting.</p>
            <div className="cg-hero-actions">
              <Link to="/report-issue" className="cg-btn danger">
                <AlertTriangle size={17} /> Report a Tree Issue
              </Link>
              <Link to="/dashboard" className="cg-btn ghost">
                <Map size={17} /> Explore Canopy Map
              </Link>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="cg-stats">
          <article>
            <TreePine size={26} />
            <span>Total Managed Trees</span>
            <strong>{treeStats.totalTreesCount.toLocaleString('en-IN')}</strong>
            <small>{treeStats.quarterGrowth}</small>
          </article>
          <article>
            <Users size={26} />
            <span>Active Maintenance Logs</span>
            <strong>{treeStats.activeLogsCount}</strong>
            <small>Currently in progress city-wide</small>
          </article>
          <article className="accent">
            <Leaf size={26} />
            <span>Carbon Offset</span>
            <strong>{treeStats.carbonOffsetTons}</strong>
            <small>Estimated annual CO₂ sequestration</small>
          </article>
        </section>

        {/* Canopy Intelligence + Live Map */}
        <section className="cg-intel">
          <div>
            <h2>Real-time Canopy Intelligence</h2>
            <p>Our integrated GIS platform allows arborists and city planners to track tree health, growth rates, and maintenance needs with pin-point accuracy.</p>
            <ul>
              <li><Leaf size={15} /><span><b>Species Identification</b> Over 450 native and exotic species cataloged.</span></li>
              <li><BarChart3 size={15} /><span><b>Risk Assessment</b> AI-powered predictive modeling for storm damage risk.</span></li>
              <li><Sprout size={15} /><span><b>Live Health Map</b> Click any marker below to view species & health status.</span></li>
            </ul>

            {/* Map Legend */}
            <div style={{
              display: 'flex', gap: 20, marginTop: 28,
              padding: '12px 16px',
              background: '#f0fdf4',
              borderRadius: 8,
              border: '1px solid #d1fae5',
              flexWrap: 'wrap',
            }}>
              {[
                { color: '#16a34a', label: 'Healthy' },
                { color: '#f59e0b', label: 'Fair / Stable' },
                { color: '#dc2626', label: 'Alert Zone' },
              ].map(({ color, label }) => (
                <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
                  <span style={{
                    width: 14, height: 14, borderRadius: '50%',
                    background: color, border: '2px solid #fff',
                    boxShadow: `0 0 0 2px ${color}`,
                    display: 'inline-block',
                  }} />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Live Leaflet Map */}
          <CanopyMap />
        </section>

        {/* Help section */}
        <section className="cg-help">
          <h2>Help Us Protect Our Urban Forest</h2>
          <p>Spotted a fallen branch, diseased leaves, or a hazardous lean? Your report directly notifies our field technicians for immediate inspection.</p>
          <div>
            <Link to="/report-issue" className="cg-btn danger">Submit New Report</Link>
            <Link to="/dashboard" className="cg-btn outline">Check Status</Link>
          </div>
        </section>

        {/* Featured Tree Inventory Section */}
        <FeaturedTrees />

        {/* Functional Feedback Form */}
        <FeedbackSection />

        {/* Display Community Feedback */}
        <CommunityFeedback />
      </main>


      <footer className="cg-footer">
        <div>
          <h3>CanopyGuard</h3>
          <p>Leading the way in urban forestry technology. Helping cities grow greener, smarter, and safer through data-driven management.</p>
        </div>
        <div><b>Platform</b><span>Staff Dashboard</span><span>City Map</span><span>API Access</span></div>
        <div><b>Community</b><span>Public Reports</span><span>Volunteer Programs</span><span>Education</span></div>
        <div><b>Legal</b><span>Privacy Policy</span><span>Terms of Service</span></div>
      </footer>
    </div>
  );
};

export default HomePage;
