import { Link } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import CanopyLensModal from '../components/CanopyLensModal';
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
  Globe,
  Share2,
  LinkIcon,
  Mail,
  Sparkles,
  Camera
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
// Centered around Udupi, Karnataka
const canopyTrees = [
  { id: 1, lat: 13.3412, lng: 74.7415, health: 'healthy', species: 'Heritage Banyan Tree', zone: 'Ajjarkadu Zone A' },
  { id: 2, lat: 13.3538, lng: 74.7865, health: 'healthy', species: 'Sanctuary Neem Tree', zone: 'Manipal Zone B' },
  { id: 3, lat: 13.3375, lng: 74.7450, health: 'fair', species: 'Ashoka Border', zone: 'Udupi Town Zone A' },
  { id: 4, lat: 13.3425, lng: 74.7430, health: 'healthy', species: 'Orchard Mango', zone: 'Bhujanga Park Zone A' },
  { id: 5, lat: 13.3518, lng: 74.7612, health: 'alert', species: 'Scholastic Gulmohar', zone: 'MGM Zone B' },
  { id: 6, lat: 13.3450, lng: 74.7380, health: 'healthy', species: 'Sacred Peepal', zone: 'Krishna Temple Zone C' },
  { id: 7, lat: 13.3560, lng: 74.7020, health: 'fair', species: 'Coastal Casuarina', zone: 'Malpe Coast Zone D' },
  { id: 8, lat: 13.3400, lng: 74.7480, health: 'alert', species: 'Tamarind Grove', zone: 'Kadiyali Zone C' },
  { id: 9, lat: 13.3580, lng: 74.7890, health: 'healthy', species: 'Royal Teak', zone: 'End Point Zone B' },
  { id: 10, lat: 13.3390, lng: 74.7400, health: 'healthy', species: 'Golden Rain Tree', zone: 'City Bus Stand Zone D' },
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

const speciesImages = {
  mango: 'https://images.unsplash.com/photo-1598512752271-33f913a5af13?auto=format&fit=crop&w=600&q=80',
  oak: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=600&q=80',
  neem: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=600&q=80',
  banyan: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=600&q=80',
  peepal: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=600&q=80',
  rosewood: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80',
  eucalyptus: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=600&q=80',
  tamarind: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=600&q=80',
  jackfruit: 'https://images.unsplash.com/photo-1590005354167-6da97870c913?auto=format&fit=crop&w=600&q=80',
  ashoka: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=600&q=80',
  gulmohar: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=600&q=80',
  honge: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80',
  coconut: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
  default: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80'
};

const getTreeDisplayImage = (tree) => {
  if (!tree) return speciesImages.default;
  if (tree.image && typeof tree.image === 'string' && tree.image.trim() !== '') {
    let img = tree.image.trim();
    if (img.startsWith('/uploads/')) {
      img = `${API_URL}${img}`;
    }
    return img;
  }
  const nameStr = `${tree.name || ''} ${tree.scientificName || ''} ${tree.family || ''}`.toLowerCase();
  if (nameStr.includes('mango') || nameStr.includes('mangifera')) return speciesImages.mango;
  if (nameStr.includes('oak')) return speciesImages.oak;
  if (nameStr.includes('neem') || nameStr.includes('azadirachta')) return speciesImages.neem;
  if (nameStr.includes('banyan') || nameStr.includes('benghalensis')) return speciesImages.banyan;
  if (nameStr.includes('peepal') || nameStr.includes('religiosa')) return speciesImages.peepal;
  if (nameStr.includes('rosewood') || nameStr.includes('dalbergia')) return speciesImages.rosewood;
  if (nameStr.includes('eucalyptus')) return speciesImages.eucalyptus;
  if (nameStr.includes('tamarind')) return speciesImages.tamarind;
  if (nameStr.includes('jackfruit') || nameStr.includes('artocarpus')) return speciesImages.jackfruit;
  if (nameStr.includes('ashoka') || nameStr.includes('polyalthia')) return speciesImages.ashoka;
  if (nameStr.includes('gulmohar') || nameStr.includes('delonix')) return speciesImages.gulmohar;
  if (nameStr.includes('honge') || nameStr.includes('pongamia')) return speciesImages.honge;
  if (nameStr.includes('coconut') || nameStr.includes('cocos')) return speciesImages.coconut;
  return speciesImages.default;
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
        center={[13.3409, 74.7421]}
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
          const lat = Number(tree.lat) || 13.3409;
          const lng = Number(tree.lng) || 74.7421;
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
        <Circle center={[13.3412, 74.7415]} radius={300} pathOptions={{ color: '#16a34a', fillOpacity: 0.08 }} />
        <Circle center={[13.3538, 74.7865]} radius={250} pathOptions={{ color: '#f59e0b', fillOpacity: 0.08 }} />
        <Circle center={[13.3375, 74.7450]} radius={200} pathOptions={{ color: '#dc2626', fillOpacity: 0.1 }} />
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
      <form onSubmit={handleSubmit} style={{
        background: 'rgba(18, 48, 36, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(82, 183, 136, 0.3)',
        borderRadius: '28px',
        boxShadow: '0 24px 50px rgba(0, 0, 0, 0.4)',
        padding: '38px',
        color: '#ffffff'
      }}>
        <h2 style={{ color: '#ffffff', margin: '0 0 6px', fontSize: 32, fontWeight: 900 }}>Give Feedback</h2>
        <p style={{ color: '#b7e4c7', margin: '0 0 24px', fontSize: '0.95rem' }}>Help us improve the CanopyGuard experience.</p>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: 10, padding: '12px 16px',
            fontSize: 14,
          }}>
            {error}
          </div>
        )}

        {/* Rating faces */}
        <div>
          <label style={{ display: 'block', textAlign: 'center', marginBottom: 12, color: '#74c69d', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Rate your experience
          </label>
          <div className="faces" style={{ display: 'flex', justifyContent: 'center', gap: 14 }}>
            {feedbackFaces.map(({ emoji, label, rating }) => (
              <button
                key={rating}
                type="button"
                title={label}
                onClick={() => setSelectedRating(rating)}
                style={{
                  border: selectedRating === rating ? '2px solid #52b788' : '1px solid rgba(82, 183, 136, 0.25)',
                  borderRadius: '16px',
                  background: selectedRating === rating ? 'rgba(82, 183, 136, 0.25)' : 'rgba(8, 25, 18, 0.6)',
                  cursor: 'pointer',
                  padding: '10px 14px',
                  fontSize: '26px',
                  transition: 'all 0.2s ease',
                  transform: selectedRating === rating ? 'scale(1.15)' : 'scale(1)',
                  boxShadow: selectedRating === rating ? '0 4px 16px rgba(82, 183, 136, 0.35)' : 'none',
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
            <p style={{ textAlign: 'center', fontSize: 13, color: '#52b788', marginTop: 10, fontWeight: 700 }}>
              {feedbackFaces.find(f => f.rating === selectedRating)?.label}
            </p>
          )}
        </div>

        <div className="two">
          <label style={{ color: '#74c69d', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Name <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#94a3b8' }}>(optional)</span>
            <input
              type="text"
              placeholder="Your Name"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{
                background: 'rgba(8, 25, 18, 0.7)',
                border: '1px solid rgba(82, 183, 136, 0.3)',
                color: '#ffffff',
                borderRadius: '14px',
                padding: '14px 16px',
                fontSize: '0.95rem'
              }}
            />
          </label>
          <label style={{ color: '#74c69d', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Category
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              style={{
                background: 'rgba(8, 25, 18, 0.7)',
                border: '1px solid rgba(82, 183, 136, 0.3)',
                color: '#ffffff',
                borderRadius: '14px',
                padding: '14px 16px',
                fontSize: '0.95rem'
              }}
            >
              <option value="Citizen" style={{ background: '#0b2518', color: '#fff' }}>Citizen</option>
              <option value="Tree Cutter" style={{ background: '#0b2518', color: '#fff' }}>Tree Cutter</option>
              <option value="Official" style={{ background: '#0b2518', color: '#fff' }}>Official</option>
              <option value="Other" style={{ background: '#0b2518', color: '#fff' }}>Other</option>
            </select>
          </label>
        </div>

        <label style={{ color: '#74c69d', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Email <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#94a3b8' }}>(optional)</span>
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{
              background: 'rgba(8, 25, 18, 0.7)',
              border: '1px solid rgba(82, 183, 136, 0.3)',
              color: '#ffffff',
              borderRadius: '14px',
              padding: '14px 16px',
              fontSize: '0.95rem'
            }}
          />
        </label>

        <label style={{ color: '#74c69d', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Message <span style={{ color: '#ef4444' }}>*</span>
          <textarea
            placeholder="Tell us what's on your mind..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            required
            style={{
              background: 'rgba(8, 25, 18, 0.7)',
              border: '1px solid rgba(82, 183, 136, 0.3)',
              color: '#ffffff',
              borderRadius: '14px',
              padding: '14px 16px',
              fontSize: '0.95rem'
            }}
          />
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            background: 'linear-gradient(135deg, #2d6a4f 0%, #40916c 100%)',
            color: '#ffffff',
            border: '1px solid rgba(116, 198, 157, 0.4)',
            boxShadow: '0 8px 24px rgba(45, 106, 79, 0.35)',
            borderRadius: '14px',
            padding: '16px',
            fontSize: '1rem',
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.25s ease',
            marginTop: '8px'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 12px 30px rgba(45, 106, 79, 0.5)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(45, 106, 79, 0.35)';
          }}
        >
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
    <section style={{ padding: '80px 5%', background: 'transparent', position: 'relative', overflow: 'hidden' }}>
      <h2 style={{ textAlign: 'center', marginBottom: 8, fontSize: 32, fontWeight: 900, color: '#ffffff', textShadow: '0 4px 16px rgba(0,0,0,0.5)' }}>What Our Community Says 🌱</h2>
      <p style={{ textAlign: 'center', color: '#b7e4c7', marginBottom: 36, fontSize: '1rem' }}>Real voices from our urban forestry community</p>
      <div className="cg-marquee-container">
        <div className="cg-marquee-content">
          {[...feedbacks.slice(0, 6), ...feedbacks.slice(0, 6)].map((fb, idx) => {
            const face = feedbackFaces.find(f => f.rating === fb.rating) || feedbackFaces[2];
            return (
              <div key={`${fb._id}-${idx}`} style={{
                width: 290,
                flexShrink: 0,
                background: 'rgba(18, 48, 36, 0.85)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                padding: '22px 24px',
                borderRadius: 22,
                boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
                border: '1px solid rgba(82, 183, 136, 0.25)',
                transition: 'all 0.25s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = 'rgba(82, 183, 136, 0.5)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(82, 183, 136, 0.25)';
              }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <span style={{ fontSize: 28 }} title={face.label}>{face.emoji}</span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#061a14',
                    background: '#52b788',
                    padding: '3px 10px',
                    borderRadius: 99,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    {fb.category}
                  </span>
                </div>
                <p style={{ color: '#e2e8f0', lineHeight: 1.6, marginBottom: 14, fontSize: '0.92rem', fontWeight: 500 }}>"{fb.message}"</p>
                <div style={{ fontSize: 12, color: '#74c69d', fontWeight: 700 }}>
                  — {fb.name || 'Anonymous'}
                </div>
              </div>
            );
          })}
        </div>
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
    <section style={{ padding: '80px 5%', background: 'transparent', position: 'relative' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 36, flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: '0 0 6px', fontSize: 32, fontWeight: 900, color: '#ffffff' }}>
              🌳 Our Tree Inventory
            </h2>
            <p style={{ margin: 0, color: '#b7e4c7', fontSize: '0.96rem' }}>
              Browse trees managed in our city zones — added and maintained by our forestry team.
            </p>
          </div>
          <Link
            to="/view-tree"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: '#52b788',
              color: '#061a14', padding: '10px 24px', borderRadius: '99px',
              fontWeight: 800, fontSize: '0.875rem', textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(82, 183, 136, 0.35)', transition: 'all 0.2s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.background = '#74c69d';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.background = '#52b788';
            }}
          >
            <TreePine size={16} /> Explore Full Database
          </Link>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 20
        }}>
          {trees.map((tree) => {
            const hs = tree.healthScore ?? 90;
            const hColor = getHealthColor(hs);
            return (
              <div
                key={tree._id || tree.id}
                onClick={() => navigate('/view-tree')}
                style={{
                  background: 'rgba(18, 48, 36, 0.85)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  borderRadius: 22, overflow: 'hidden',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
                  border: '1px solid rgba(82, 183, 136, 0.25)',
                  cursor: 'pointer', transition: 'all 0.25s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-6px)';
                  e.currentTarget.style.borderColor = 'rgba(82, 183, 136, 0.5)';
                  e.currentTarget.style.boxShadow = '0 18px 40px rgba(0,0,0,0.45)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(82, 183, 136, 0.25)';
                  e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.35)';
                }}
              >
                {/* Image */}
                <div style={{ height: 160, position: 'relative', overflow: 'hidden' }}>
                  <img
                    src={getTreeDisplayImage(tree)}
                    alt={tree.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      const fallback = speciesImages.default;
                      if (e.currentTarget.src !== fallback) {
                        e.currentTarget.src = fallback;
                      }
                    }}
                  />
                  <span style={{
                    position: 'absolute', top: 10, right: 10,
                    background: hColor, color: '#fff', borderRadius: 99,
                    padding: '3px 12px', fontSize: '0.7rem', fontWeight: 700,
                    boxShadow: '0 3px 10px rgba(0,0,0,0.3)'
                  }}>
                    {hs >= 80 ? 'Healthy' : hs >= 50 ? 'Fair' : 'Alert'} · {hs}%
                  </span>
                </div>
                {/* Body */}
                <div style={{ padding: '18px 20px' }}>
                  <h3 style={{ margin: '0 0 2px', fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>{tree.name}</h3>
                  <p style={{ margin: '0 0 10px', fontStyle: 'italic', color: '#74c69d', fontSize: '0.82rem' }}>{tree.scientificName}</p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    {tree.family && (
                      <span style={{ background: 'rgba(82, 183, 136, 0.15)', color: '#b7e4c7', border: '1px solid rgba(82, 183, 136, 0.3)', padding: '2px 10px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 700 }}>{tree.family}</span>
                    )}
                  </div>
                  {tree.description && (
                    <p style={{
                      margin: '0 0 8px', fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.5,
                      overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
                    }}>
                      {tree.description}
                    </p>
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
  const [scanModalOpen, setScanModalOpen] = useState(false);
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

  // Prevent background scrolling while mobile hamburger menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [menuOpen]);

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
    <div className="cg-public" style={{ position: 'relative' }}>
      <header className="cg-public-nav">
        <Link to="/home" className="cg-brand"><TreePine size={26} color="#52b788" />CanopyGuard</Link>

        {/* Desktop inline nav links */}
        <nav className="desktop-nav-links">
          <Link className="active" to="/home">Home</Link>
          <Link to="/citizen-dashboard">Dashboard</Link>
          <Link to="/dashboard">Map</Link>
          <Link to="/report-issue">Complaints</Link>
          <Link to="/tree-encyclopedia">Tree Encyclopedia</Link>
          <Link to="/view-tree">Tree Database</Link>
          <Link to="/track">Track Report</Link>
        </nav>

        <div className="cg-nav-right-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Quick theme toggle on desktop */}
          <button
            onClick={() => setDarkMode(prev => !prev)}
            className="desktop-theme-toggle"
            title="Toggle theme"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: darkMode ? '#1e293b' : '#f1f5f9',
              border: darkMode ? '1px solid #334155' : '1px solid #cbd5e1',
              borderRadius: '8px', width: '38px', height: '38px',
              cursor: 'pointer', color: darkMode ? '#fbbf24' : '#475569',
              transition: 'all 0.2s'
            }}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {!isLoggedIn ? (
            <Link className="cg-login desktop-login-btn" to="/login">
              <LogIn size={15} /> Login
            </Link>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link
                to="/citizen-dashboard"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  background: '#046b4e',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  textDecoration: 'none'
                }}
              >
                👤 {currentUser?.name || currentUser?.username || 'My Dashboard'}
              </Link>
              <button
                onClick={handleLogout}
                className="desktop-logout-btn"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', borderRadius: '8px', background: '#fef2f2',
                  color: '#ef4444', border: '1px solid #fee2e2', fontWeight: 600,
                  fontSize: '0.85rem', cursor: 'pointer'
                }}
              >
                Logout
              </button>
            </div>
          )}

          {/* ── Hamburger Trigger Button ───────────────────── */}
          <button
            id="home-menu-btn"
            className="mobile-hamburger-btn"
            onClick={() => setMenuOpen(prev => !prev)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: menuOpen ? '#f0fdf4' : 'transparent',
              border: menuOpen ? '1.5px solid #10b981' : '1.5px solid #d1d5db',
              borderRadius: '8px', width: '38px', height: '38px',
              cursor: 'pointer',
              color: menuOpen ? '#065f46' : (darkMode ? '#f8fafc' : '#374151'),
              transition: 'all 0.18s'
            }}
            title="Toggle Menu"
            aria-label="Toggle navigation menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Backdrop overlay for mobile drawer */}
        {menuOpen && (
          <div
            className="cg-public-nav-overlay"
            onClick={() => setMenuOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.55)',
              backdropFilter: 'blur(2px)',
              zIndex: 9998,
              overscrollBehavior: 'contain',
              animation: 'fadeIn 0.2s ease'
            }}
          />
        )}

        {/* Mobile Slide-out Drawer Panel */}
        <div
          ref={menuRef}
          className={`cg-public-nav-drawer ${menuOpen ? 'open' : ''}`}
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: '290px',
            maxWidth: '85vw',
            height: '100%',
            height: '100vh',
            background: darkMode ? '#0f172a' : '#ffffff',
            color: darkMode ? '#f8fafc' : '#1e293b',
            boxShadow: menuOpen ? '-4px 0 30px rgba(0,0,0,0.3)' : 'none',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            transform: menuOpen ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            boxSizing: 'border-box',
            padding: '20px 16px',
          }}
        >
          {/* Drawer Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: `1px solid ${darkMode ? '#1e293b' : '#e2e8f0'}`, marginBottom: '16px' }}>
            <span style={{ fontWeight: 800, fontSize: '1.25rem', color: '#10b981' }}>CanopyGuard</span>
            <button
              onClick={() => setMenuOpen(false)}
              style={{
                background: darkMode ? '#1e293b' : '#f1f5f9',
                border: 'none',
                borderRadius: '8px',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: darkMode ? '#cbd5e1' : '#475569',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Nav Links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 auto' }}>
            <p style={{ margin: '4px 8px 6px', fontSize: '0.72rem', fontWeight: 800, color: darkMode ? '#94a3b8' : '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Navigation</p>

            <Link
              to="/home"
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '10px',
                color: darkMode ? '#f8fafc' : '#1e293b', fontWeight: 600, fontSize: '0.95rem',
                background: darkMode ? '#1e293b' : '#f8fafc'
              }}
            >
              🌱 Home
            </Link>

            <Link
              to="/dashboard"
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '10px',
                color: darkMode ? '#cbd5e1' : '#334155', fontWeight: 600, fontSize: '0.95rem'
              }}
            >
              🗺️ Canopy Map
            </Link>

            <Link
              to="/citizen-dashboard"
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '10px',
                color: '#10b981', fontWeight: 700, fontSize: '0.95rem'
              }}
            >
              📊 Citizen Dashboard
            </Link>

            <Link
              to="/report-issue"
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '10px',
                color: '#ef4444', fontWeight: 700, fontSize: '0.95rem'
              }}
            >
              ⚠️ Report Tree Issue
            </Link>

            <Link
              to="/track"
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '10px',
                color: '#10b981', fontWeight: 700, fontSize: '0.95rem'
              }}
            >
              📋 Track Report
            </Link>

            <Link
              to="/view-tree"
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '10px',
                color: darkMode ? '#cbd5e1' : '#334155', fontWeight: 600, fontSize: '0.95rem'
              }}
            >
              🌲 Tree Database
            </Link>

            <Link
              to="/tree-encyclopedia"
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '10px',
                color: darkMode ? '#cbd5e1' : '#334155', fontWeight: 600, fontSize: '0.95rem'
              }}
            >
              📖 Tree Encyclopedia
            </Link>

            {/* Appearance Section */}
            <div style={{ height: '1px', background: darkMode ? '#1e293b' : '#f1f5f9', margin: '12px 0 6px' }} />
            <p style={{ margin: '4px 8px 6px', fontSize: '0.72rem', fontWeight: 800, color: darkMode ? '#94a3b8' : '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Appearance</p>

            <button
              onClick={() => setDarkMode(prev => !prev)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: '10px',
                cursor: 'pointer', background: darkMode ? '#1e293b' : '#f8fafc', border: 'none',
                color: darkMode ? '#f8fafc' : '#334155', fontWeight: 600, fontSize: '0.9rem'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {darkMode ? <Sun size={18} color="#fbbf24" /> : <Moon size={18} color="#6366f1" />}
                {darkMode ? 'Light Mode' : 'Dark Mode'}
              </span>
              <span style={{
                fontSize: '0.7rem', fontWeight: 700,
                padding: '2px 8px', borderRadius: '12px',
                background: darkMode ? 'rgba(251, 191, 36, 0.2)' : 'rgba(99, 102, 241, 0.1)',
                color: darkMode ? '#fbbf24' : '#4f46e5'
              }}>
                {darkMode ? 'DARK' : 'LIGHT'}
              </span>
            </button>

            {/* Account / Auth Links */}
            {isLoggedIn && (
              <>
                <div style={{ height: '1px', background: darkMode ? '#1e293b' : '#f1f5f9', margin: '12px 0 6px' }} />
                <p style={{ margin: '4px 8px 6px', fontSize: '0.72rem', fontWeight: 800, color: darkMode ? '#94a3b8' : '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>My Account</p>

                {currentUser?.role === 'Official' && (
                  <Link to="/official-management" onClick={() => setMenuOpen(false)}
                    style={{
                      display: 'block', padding: '10px 14px', borderRadius: '10px',
                      color: darkMode ? '#cbd5e1' : '#334155', fontWeight: 600, fontSize: '0.9rem'
                    }}
                  >
                    🛡️ Official Management
                  </Link>
                )}

                {currentUser?.role === 'Admin' && (
                  <Link to="/admin" onClick={() => setMenuOpen(false)}
                    style={{
                      display: 'block', padding: '10px 14px', borderRadius: '10px',
                      color: darkMode ? '#cbd5e1' : '#334155', fontWeight: 600, fontSize: '0.9rem'
                    }}
                  >
                    ⚙️ Admin Console
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Drawer Footer: Login / Logout */}
          <div style={{ paddingTop: '16px', borderTop: `1px solid ${darkMode ? '#1e293b' : '#e2e8f0'}`, marginTop: 'auto' }}>
            {!isLoggedIn ? (
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  width: '100%', padding: '12px', borderRadius: '10px',
                  background: '#043224', color: '#ffffff', fontWeight: 700,
                  fontSize: '0.95rem', textDecoration: 'none', boxSizing: 'border-box'
                }}
              >
                <LogIn size={18} /> Login to Portal
              </Link>
            ) : (
              <button
                onClick={() => { setMenuOpen(false); handleLogout(); }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  width: '100%', padding: '12px', borderRadius: '10px',
                  background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2',
                  fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', boxSizing: 'border-box'
                }}
              >
                Log Out
              </button>
            )}
          </div>
        </div>
      </header>



      <main>
        {/* Hero */}
        <section className="cg-hero">
          <div className="cg-hero-copy">
            <span className="cg-pill">Official City Forestry Portal</span>
            <h1>Green Cities,<br /><strong>Managed Better.</strong></h1>
            <p>Preserving our urban canopy through precision data, proactive maintenance, and community-driven reporting.</p>
            <div
              className="cg-hero-actions"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap',
                marginTop: '32px'
              }}
            >
              <button
                onClick={() => setScanModalOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 22px',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  borderRadius: '99px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  border: 'none',
                  boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.25s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 10px 25px rgba(16, 185, 129, 0.5)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.35)';
                }}
              >
                <Sparkles size={17} /> CanopyLens AI (Scan Tree)
              </button>
              <Link
                to="/report-issue"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 22px',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  borderRadius: '99px',
                  background: 'linear-gradient(135deg, #2d6a4f 0%, #40916c 100%)',
                  color: '#ffffff',
                  border: '1px solid rgba(116, 198, 157, 0.4)',
                  boxShadow: '0 6px 20px rgba(45, 106, 79, 0.35)',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.25s ease',
                  textDecoration: 'none'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 10px 25px rgba(45, 106, 79, 0.5)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(45, 106, 79, 0.35)';
                }}
              >
                <AlertTriangle size={17} /> Report a Tree Issue
              </Link>
              <Link
                to="/view-tree"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 22px',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  borderRadius: '99px',
                  background: 'rgba(255, 255, 255, 0.12)',
                  color: '#ffffff',
                  border: '1.5px solid rgba(255, 255, 255, 0.4)',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.25s ease',
                  textDecoration: 'none'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.color = '#061a14';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <TreePine size={17} /> Explore Tree Database
              </Link>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="cg-stats">
          <article>
            <div className="cg-stat-icon-wrap">
              <TreePine size={18} />
            </div>
            <span>Total Managed Trees</span>
            <strong>{treeStats.totalTreesCount.toLocaleString('en-IN')}</strong>
            <small>{treeStats.quarterGrowth}</small>
          </article>
          <article>
            <div className="cg-stat-icon-wrap">
              <Users size={18} />
            </div>
            <span>Active Maintenance Logs</span>
            <strong>{treeStats.activeLogsCount}</strong>
            <small>Currently in progress city-wide</small>
          </article>
          <article className="accent">
            <div className="cg-stat-icon-wrap">
              <Leaf size={18} />
            </div>
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
              padding: '14px 20px',
              background: 'rgba(18, 48, 36, 0.75)',
              borderRadius: 14,
              border: '1px solid rgba(82, 183, 136, 0.25)',
              backdropFilter: 'blur(12px)',
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
            <Link
              to="/report-issue"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 28px',
                fontSize: '0.95rem',
                fontWeight: 700,
                borderRadius: '99px',
                background: 'linear-gradient(135deg, #2d6a4f 0%, #40916c 100%)',
                color: '#ffffff',
                border: '1px solid rgba(116, 198, 157, 0.4)',
                boxShadow: '0 6px 20px rgba(45, 106, 79, 0.35)',
                transition: 'all 0.25s ease',
                textDecoration: 'none'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(45, 106, 79, 0.5)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(45, 106, 79, 0.35)';
              }}
            >
              Submit New Report
            </Link>
            <Link
              to="/track"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 28px',
                fontSize: '0.95rem',
                fontWeight: 700,
                borderRadius: '99px',
                border: '1.5px solid rgba(255,255,255,0.5)',
                background: 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                color: '#ffffff',
                textDecoration: 'none',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.color = '#061a14';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
                e.currentTarget.style.color = '#ffffff';
              }}
            >
              Check Status
            </Link>
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
        <div className="footer-brand">
          <h3><TreePine size={28} color="#10b981" /> CanopyGuard</h3>
          <p>Leading the way in urban forestry technology. Helping cities grow greener, smarter, and safer through data-driven management.</p>
        </div>
        <div className="footer-nav">
          <b>Platform</b>
          <Link to="/login">Staff Dashboard</Link>
          <Link to="/map">City Map</Link>
          <Link to="#">API Access</Link>
        </div>
        <div className="footer-nav">
          <b>Community</b>
          <Link to="/citizen-dashboard">Public Reports</Link>
          <Link to="#">Volunteer Programs</Link>
          <Link to="/encyclopedia">Education</Link>
        </div>
        <div className="footer-nav">
          <b>Legal</b>
          <Link to="#">Privacy Policy</Link>
          <Link to="#">Terms of Service</Link>
          <Link to="#">Cookie Settings</Link>
        </div>
        
        <div className="cg-footer-bottom" style={{ gridColumn: '1 / -1' }}>
          <p>&copy; {new Date().getFullYear()} CanopyGuard. All rights reserved.</p>
          <div className="socials">
            <a href="#"><Share2 size={18} /></a>
            <a href="#"><Globe size={18} /></a>
            <a href="#"><LinkIcon size={18} /></a>
            <a href="#"><Mail size={18} /></a>
          </div>
        </div>
      </footer>

      {/* CanopyLens AI Tree Scanner Modal */}
      <CanopyLensModal
        isOpen={scanModalOpen}
        onClose={() => setScanModalOpen(false)}
      />
    </div>
  );
};

export default HomePage;
