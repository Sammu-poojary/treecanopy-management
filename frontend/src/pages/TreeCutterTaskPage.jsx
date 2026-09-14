import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import Swal from 'sweetalert2';
import { Topbar, Sidebar } from './CanopyPages';
import {
  FileText,
  MapPin,
  Navigation,
  CheckCircle2,
  Camera,
  UploadCloud,
  Play,
  Recycle,
  Users,
  ShoppingCart,
  Fingerprint,
  ArrowRight,
  ExternalLink,
  X,
  Clock,
  Building,
  User,
  Globe,
  Zap,
  Truck,
  Target,
  Wrench,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

// Fix Leaflet default marker icon issue safely
if (L && L.Icon && L.Icon.Default && L.Icon.Default.prototype) {
  try {
    delete L.Icon.Default.prototype._getIconUrl;
  } catch (e) {
    L.Icon.Default.prototype._getIconUrl = () => '';
  }
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const DUMPING_YARDS = [
  { name: 'Government Green Waste Yard - Zone A', lat: 13.3550, lng: 74.7600, address: 'Zone A Yard, Manipal Highway, Udupi' },
  { name: 'Municipal Compost Depot - Ward 12', lat: 13.3320, lng: 74.7450, address: 'Compost Depot, Ward 12, Udupi' },
  { name: 'City Tree Waste Transfer Station', lat: 13.3500, lng: 74.7850, address: 'Transfer Station, City Zone, Udupi' },
];

const dumpingLocations = DUMPING_YARDS.map(d => d.name);

const issueLabels = {
  damaged: 'Damaged Tree',
  overhanging: 'Overhanging Branches',
  dead: 'Dead / Dying Tree',
  pest: 'Pest / Disease',
  roots: 'Roots Damage',
  fallen: 'Fallen Branch',
};

// ── Geo-Tag Image Proof Display Component ──
function GeoTaggedImageProof({ imageUrl, gps, locationText, altText, proofLabel }) {
  if (!imageUrl) return null;

  const getFormattedImgUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
      return url;
    }
    if (url.includes('http://') || url.includes('https://')) {
      const match = url.match(/(https?:\/\/[^\s]+)/);
      if (match) return match[1];
    }
    return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const src = getFormattedImgUrl(imageUrl);
  
  let lat = gps?.lat;
  let lng = gps?.lng;
  if (!lat || lat === '0' || lat === 0 || lat === '0.000000' || lat === '0.0') {
    lat = '13.340900';
  }
  if (!lng || lng === '0' || lng === 0 || lng === '0.000000' || lng === '0.0') {
    lng = '74.742100';
  }

  const timestamp = gps?.capturedAt ? new Date(gps.capturedAt).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : new Date().toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="photo-proof-card" style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(16,185,129,0.35)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', background: '#020f0d' }}>
      {/* Top Header Watermark Badge */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        background: 'linear-gradient(180deg, rgba(2,15,13,0.88) 0%, rgba(2,15,13,0) 100%)',
        padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        pointerEvents: 'none'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 800, color: '#34d399', letterSpacing: '0.04em' }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }}></span>
          CANOPYGUARD FIELD TELEMETRY
        </div>
        <span style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.85)', fontFamily: 'monospace', fontWeight: 700, background: 'rgba(0,0,0,0.65)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.18)' }}>
          VERIFIED RECORD #GPS-AUDIT
        </span>
      </div>

      {/* Ambient Blurred Background (to fill aspect ratio gaps seamlessly) */}
      <img
        src={src}
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', filter: 'blur(20px) brightness(0.35)',
          transform: 'scale(1.2)', pointerEvents: 'none'
        }}
      />

      {/* Full Crisp Uncropped Image */}
      <img
        src={src}
        alt={altText || 'Geo-tagged field proof'}
        className="photo-proof-img"
        style={{
          position: 'relative', zIndex: 2, width: '100%', height: 'auto',
          maxHeight: '520px', minHeight: '260px', objectFit: 'contain', display: 'block', margin: '0 auto'
        }}
        onError={(e) => {
          if (imageUrl && !e.target.dataset.triedFallback) {
            e.target.dataset.triedFallback = 'true';
            e.target.src = imageUrl;
          }
        }}
      />

      {/* Bottom HUD Overlay */}
      <div className="photo-proof-overlay" style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
        background: 'linear-gradient(0deg, rgba(2,15,13,0.95) 0%, rgba(2,15,13,0.7) 70%, rgba(2,15,13,0) 100%)',
        padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px',
        borderTop: '1px solid rgba(52,211,153,0.15)'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          <span className="geo-tag-pill" style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            background: 'rgba(16,185,129,0.25)', border: '1px solid #10b981', color: '#34d399',
            padding: '3px 10px', borderRadius: '999px', fontSize: '0.76rem', fontWeight: 800
          }}>
            <MapPin size={12} color="#10b981" /> {lat}° N, {lng}° E
          </span>
          <span style={{
            fontSize: '0.74rem', background: 'rgba(15,23,42,0.85)', color: '#f1f5f9',
            padding: '3px 10px', borderRadius: '999px', backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255,255,255,0.18)', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 600
          }}>
            <Building size={12} color="#94a3b8" /> {locationText || 'Udupi Field Location'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: '2px' }}>
          <span style={{ fontSize: '0.72rem', color: '#cbd5e1', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
            <Clock size={12} color="#60a5fa" /> {timestamp}
          </span>
          <span className="proof-status-pill" style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            background: 'rgba(16,185,129,0.2)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.4)',
            padding: '2px 8px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 800
          }}>
            <CheckCircle2 size={12} color="#10b981" /> {proofLabel || 'GPS Verified Proof'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Leaflet Turn-by-Turn GPS Navigation Modal Component ──
function MapFlyTo({ position }) {
  const map = useMap();
  useEffect(() => { map.flyTo(position, 15); }, [position[0], position[1]]);
  return null;
}

function TaskBoardDirectionsModal({ navTarget, onClose, darkMode }) {
  const [userPos, setUserPos] = useState([13.3500, 74.7500]);
  const [gpsReady, setGpsReady] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [gpsSource, setGpsSource] = useState(null); // 'device' | 'ip'
  const [routePolyline, setRoutePolyline] = useState([]);
  const [navigationSteps, setNavigationSteps] = useState([]);
  const [activeStepIndex] = useState(0);
  const [totalDistance, setTotalDistance] = useState(null);
  const [totalDuration, setTotalDuration] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(true);

  const destLat = Number(navTarget?.lat) || 13.3409;
  const destLng = Number(navTarget?.lng) || 74.7421;
  const destPos = useMemo(() => [destLat, destLng], [destLat, destLng]);

  // Reliable HTML5 Geolocation with graceful fallback
  const startGPS = async () => {
    if (!('geolocation' in navigator)) {
      setGpsError('Browser does not support HTML5 Geolocation.');
      setGpsReady(false);
      return null;
    }

    setGpsError(null);

    const onSuccess = (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setUserPos([lat, lng]);
      setGpsAccuracy(Math.round(pos.coords.accuracy));
      setGpsReady(true);
      setGpsSource('device');
      setGpsError(null);
    };

    const onError = (err) => {
      let msg = 'Using current/default field location.';
      if (err.code === 1) msg = 'Location permission denied in browser. Click "Retry GPS" after enabling permission.';
      else if (err.code === 2) msg = 'GPS signal unavailable. Please ensure location services are enabled.';
      else if (err.code === 3) msg = 'GPS request timed out. Retrying device position...';
      setGpsError(msg);
    };

    const opts = { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 };
    navigator.geolocation.getCurrentPosition(onSuccess, onError, opts);
    const watchId = navigator.geolocation.watchPosition(onSuccess, (err) => {
      if (err.code === 1) setGpsError('Location permission denied.');
    }, opts);
    return watchId;
  };

  useEffect(() => {
    let watchId = null;
    startGPS().then(id => { watchId = id; });
    return () => {
      if (watchId != null && navigator.geolocation) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchOSRMRoute = async () => {
      setLoadingRoute(true);
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${userPos[1]},${userPos[0]};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
            setRoutePolyline(coords);
            setTotalDistance((route.distance / 1000).toFixed(2));
            setTotalDuration(Math.ceil(route.duration / 60));

            if (route.legs && route.legs[0] && route.legs[0].steps) {
              const stepsData = route.legs[0].steps.map((st, idx) => {
                const type = st.maneuver.type;
                const modifier = st.maneuver.modifier || '';
                const name = st.name ? `onto ${st.name}` : '';
                let text = `Head ${modifier || 'forward'} ${name}`.trim();
                if (type === 'turn') text = `Turn ${modifier} ${name}`.trim();
                else if (type === 'new name' || type === 'continue') text = `Continue ${modifier} ${name}`.trim();
                else if (type === 'arrive') text = `Arrive at destination: ${navTarget.address || navTarget.title || 'Target Location'}`;
                else if (type === 'depart') text = `Depart from starting point ${name}`.trim();
                return {
                  id: idx,
                  text: text.charAt(0).toUpperCase() + text.slice(1),
                  distanceMeters: Math.round(st.distance),
                  durationSec: Math.round(st.duration),
                  location: [st.maneuver.location[1], st.maneuver.location[0]],
                  type, modifier
                };
              });
              setNavigationSteps(stepsData);
            }
          }
        }
      } catch (err) {
        console.error('OSRM Route fetch error:', err);
      } finally {
        if (isMounted) setLoadingRoute(false);
      }
    };
    fetchOSRMRoute();
    return () => { isMounted = false; };
  }, [userPos[0], userPos[1], destLat, destLng]);

  const handleOpenGoogleMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${userPos[0]},${userPos[1]}&destination=${destPos[0]},${destPos[1]}&travelmode=driving`;
    window.open(url, '_blank');
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 99999, padding: '16px'
    }}>
      <div style={{
        background: darkMode ? '#0b2518' : '#ffffff',
        border: `1px solid ${darkMode ? 'rgba(52,211,153,0.3)' : '#cbd5e1'}`,
        borderRadius: '20px', width: '100%', maxWidth: '980px', maxHeight: '92vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', color: darkMode ? '#ffffff' : '#0f172a'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '16px 20px', borderBottom: `1px solid ${darkMode ? 'rgba(52,211,153,0.2)' : '#e2e8f0'}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: darkMode ? '#061a14' : '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', borderRadius: '12px', background: navTarget.type === 'disposal' ? '#3b82f6' : '#10b981', color: '#fff' }}>
              <Navigation size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                {navTarget.type === 'disposal' ? <Truck size={18} /> : <Navigation size={18} />}
                {navTarget.type === 'disposal' ? 'Live Route to Government Disposal Yard' : 'Live GPS Route to Assigned Task Site'}
              </h3>
              {/* FROM → TO Route Labels */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: '#10b981', fontWeight: 700 }}>
                  <MapPin size={13} /> FROM: Your Current GPS Location
                </span>
                <ArrowRight size={13} color={darkMode ? '#6b7280' : '#9ca3af'} />
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: '#3b82f6', fontWeight: 700 }}>
                  <Target size={13} /> TO: {navTarget.title} — {navTarget.address}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: darkMode ? '#fff' : '#64748b', cursor: 'pointer', padding: '6px' }}>
            <X size={24} />
          </button>
        </div>

        {/* GPS Status Banner */}
        {gpsError && (
          <div style={{
            padding: '10px 20px',
            background: gpsSource === 'ip' ? '#1e3a5f' : '#7f1d1d',
            color: gpsSource === 'ip' ? '#93c5fd' : '#fca5a5',
            fontSize: '0.83rem', fontWeight: 600, display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', gap: '12px'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} color={gpsSource === 'ip' ? '#60a5fa' : '#f87171'} />
              {gpsError}
              {gpsSource === 'ip' && <span style={{ opacity: 0.75, fontSize: '0.78rem' }}>(~2km accuracy — enable device GPS for precise routing)</span>}
            </span>
            <button
              onClick={() => startGPS()}
              style={{
                padding: '4px 12px', borderRadius: '6px',
                background: gpsSource === 'ip' ? '#2563eb' : '#dc2626',
                color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem',
                display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0
              }}
            >
              <RefreshCw size={13} /> Retry GPS
            </button>
          </div>
        )}

        {/* Info stats bar */}
        <div style={{
          padding: '12px 20px', background: darkMode ? '#09221b' : '#ecfdf5',
          display: 'flex', gap: '24px', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: `1px solid ${darkMode ? 'rgba(52,211,153,0.2)' : '#a7f3d0'}`
        }}>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', opacity: 0.7, display: 'block', fontWeight: 700 }}>Distance</span>
              <strong style={{ fontSize: '1.15rem', color: '#10b981', fontWeight: 900 }}>{totalDistance ? `${totalDistance} km` : 'Calculating...'}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', opacity: 0.7, display: 'block', fontWeight: 700 }}>Est. Travel Time</span>
              <strong style={{ fontSize: '1.15rem', color: '#3b82f6', fontWeight: 900 }}>{totalDuration ? `${totalDuration} mins` : 'Calculating...'}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', opacity: 0.7, display: 'block', fontWeight: 700 }}>Your GPS Position</span>
              {gpsReady ? (
                <strong style={{ fontSize: '0.78rem', color: gpsSource === 'ip' ? '#60a5fa' : '#059669', display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'monospace' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: gpsSource === 'ip' ? '#3b82f6' : '#10b981', display: 'inline-block', boxShadow: `0 0 6px ${gpsSource === 'ip' ? '#3b82f6' : '#10b981'}` }}></span>
                  {userPos[0].toFixed(5)}, {userPos[1].toFixed(5)}
                  {gpsAccuracy && <span style={{ fontSize: '0.7rem', opacity: 0.7, fontFamily: 'inherit' }}> (±{gpsAccuracy}m {gpsSource === 'ip' ? 'IP' : 'GPS'})</span>}
                </strong>
              ) : (
                <strong style={{ fontSize: '0.78rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }}></span>
                  Acquiring GPS...
                </strong>
              )}
            </div>
          </div>
          <button
            onClick={handleOpenGoogleMaps}
            style={{
              padding: '8px 14px', borderRadius: '10px', background: '#1e293b', color: '#ffffff',
              border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <ExternalLink size={14} /> Open in Google Maps
          </button>
        </div>

        {/* Map & Turn-by-Turn Grid */}
        <div className="modal-map-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', minHeight: '450px' }}>
          <div style={{ position: 'relative', height: '450px' }}>
            <MapContainer center={userPos} zoom={14} style={{ height: '450px', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
              {gpsReady && <MapFlyTo position={userPos} />}
              <Marker position={userPos}><Popup>FROM: {gpsSource === 'ip' ? 'Your Approximate IP Location' : 'Your Current GPS Location'}<br/>{userPos[0].toFixed(5)}, {userPos[1].toFixed(5)}</Popup></Marker>
              <Marker position={destPos}><Popup>TO: {navTarget.title} — {navTarget.address}</Popup></Marker>
              {gpsReady && gpsAccuracy && <Circle center={userPos} radius={gpsAccuracy} color={gpsSource === 'ip' ? '#3b82f6' : '#10b981'} fillOpacity={0.08} weight={1} />}
              {routePolyline.length > 0 && <Polyline positions={routePolyline} color="#3b82f6" weight={6} opacity={0.85} dashArray="10, 5" />}
            </MapContainer>
          </div>

          <div style={{ padding: '16px', overflowY: 'auto', background: darkMode ? '#061a14' : '#f8fafc', borderLeft: `1px solid ${darkMode ? 'rgba(52,211,153,0.2)' : '#e2e8f0'}` }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem', fontWeight: 800 }}>Turn-by-Turn Road Route ({navigationSteps.length} Steps)</h4>
            {loadingRoute ? (
              <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>Fetching turn-by-turn road maneuvers...</p>
            ) : navigationSteps.length === 0 ? (
              <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>Direct route generated.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {navigationSteps.map((st, idx) => (
                  <div key={idx} style={{
                    padding: '10px 12px', borderRadius: '10px',
                    background: idx === activeStepIndex ? (darkMode ? 'rgba(52,211,153,0.25)' : '#dbeafe') : (darkMode ? '#0b2518' : '#ffffff'),
                    border: `1px solid ${idx === activeStepIndex ? '#10b981' : (darkMode ? 'rgba(52,211,153,0.15)' : '#e2e8f0')}`
                  }}>
                    <strong style={{ fontSize: '0.83rem', display: 'block', color: darkMode ? '#ffffff' : '#0f172a' }}>{st.text}</strong>
                    <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{st.distanceMeters > 0 ? `${st.distanceMeters} meters` : 'At destination'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TreeCutterTaskPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [navTarget, setNavTarget] = useState(null);
  const [notice, setNotice] = useState('');
  const [cutterLiveCoords, setCutterLiveCoords] = useState(null);
  const [borrowedEquipment, setBorrowedEquipment] = useState([]);
  const [timeNow, setTimeNow] = useState(new Date());

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('currentUser')) || {};
    } catch {
      return {};
    }
  }, []);

  const cutterName = currentUser.name || currentUser.username || 'Snow';

  useEffect(() => {
    const timer = setInterval(() => setTimeNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchBorrowedEquipment = async () => {
    try {
      const res = await fetch(`${API_URL}/api/properties`);
      if (res.ok) {
        const data = await res.json();
        const props = Array.isArray(data) ? data : (data.properties || []);
        const userId = currentUser.id || currentUser._id || 'snow-id';
        const cutterNameLower = cutterName.toLowerCase();
        
        const localList = (() => {
          try { return JSON.parse(localStorage.getItem(`cutter_borrowed_tools_${userId}`) || '[]'); }
          catch { return []; }
        })();

        const returnedList = (() => {
          try { return JSON.parse(localStorage.getItem(`cutter_returned_tools_${userId}`) || '[]'); }
          catch { return []; }
        })();

        const map = new Map();

        // 1. Local borrowed items
        localList.forEach(item => {
          if (!returnedList.includes(item._id || item.id)) {
            map.set(item._id || item.id, item);
          }
        });

        // 2. Server properties matching cutter
        props.forEach(p => {
          if (returnedList.includes(p._id)) return;
          if (p.purchaseRequests && Array.isArray(p.purchaseRequests)) {
            const matched = p.purchaseRequests.some(r =>
              (r.userId && r.userId === userId) ||
              (r.username && r.username.toLowerCase().trim().includes(cutterNameLower)) ||
              (r.userName && r.userName.toLowerCase().trim().includes(cutterNameLower))
            );
            if (matched) {
              map.set(p._id, p);
            }
          }
        });

        setBorrowedEquipment(Array.from(map.values()));
      }
    } catch (err) {
      console.error('Failed to fetch properties:', err);
    }
  };

  useEffect(() => {
    fetchBorrowedEquipment();
  }, []);

  const EquipmentImage = ({ src, alt, category, name, size = '48px' }) => {
    const [hasErr, setHasErr] = useState(false);

    const resolveUrl = (imageUrl) => {
      if (imageUrl) {
        const normalized = imageUrl.replace(/\\/g, '/').trim();
        if (normalized.startsWith('http://') || normalized.startsWith('https://')) return normalized;
        if (normalized.startsWith('/uploads/')) return `${API_URL.replace(/\/$/, '')}${normalized}`;
        if (normalized.startsWith('uploads/')) return `${API_URL.replace(/\/$/, '')}/${normalized}`;
      }
      const nameLower = String(name || '').toLowerCase();
      const catLower = String(category || '').toLowerCase();
      if (nameLower.includes('saw') || catLower.includes('saw') || catLower.includes('power')) {
        return 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600&auto=format&fit=crop&q=80';
      }
      if (nameLower.includes('harness') || nameLower.includes('helmet') || catLower.includes('safety')) {
        return 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?w=600&auto=format&fit=crop&q=80';
      }
      return 'https://images.unsplash.com/photo-1508873696983-2df5057c0861?w=600&auto=format&fit=crop&q=80';
    };

    const url = resolveUrl(src);

    if (hasErr || !url) {
      return (
        <div style={{
          width: size,
          height: size,
          borderRadius: '10px',
          background: 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(5,150,105,0.3) 100%)',
          border: '1px solid rgba(16,185,129,0.4)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#34d399',
          flexShrink: 0
        }}>
          <Wrench size={18} />
        </div>
      );
    }

    return (
      <img
        src={url}
        alt={alt || name || 'Equipment'}
        onError={() => setHasErr(true)}
        style={{ width: size, height: size, objectFit: 'cover', borderRadius: '10px', border: '1px solid var(--border)', flexShrink: 0 }}
      />
    );
  };

  const getRemainingTime = (requestedAt) => {
    if (!requestedAt) return { text: 'N/A', isOverdue: false, color: '#64748b', dueStr: 'N/A' };
    const checkoutTime = new Date(requestedAt);
    const dueTime = new Date(checkoutTime.getTime() + 24 * 60 * 60 * 1000);
    const diffMs = dueTime.getTime() - timeNow.getTime();

    const dueStr = dueTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ', ' + dueTime.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

    if (diffMs <= 0) {
      return { text: 'Overdue! Return Immediately', isOverdue: true, color: '#ef4444', dueStr };
    }

    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const diffSecs = Math.floor((diffMs % (1000 * 60)) / 1000);

    let color = '#10b981';
    if (diffHrs < 4) {
      color = '#ef4444';
    } else if (diffHrs < 12) {
      color = '#f59e0b';
    }

    return {
      text: `${diffHrs}h ${diffMins}m ${diffSecs}s remaining`,
      isOverdue: false,
      color,
      dueStr
    };
  };

  const handleReturnEquipment = async (item) => {
    const result = await Swal.fire({
      title: 'Submit Back Equipment?',
      text: `Confirm returning "${item.name}" (${item.serialNumber || 'Serial N/A'}) back to municipal inventory.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Submit Back'
    });

    if (result.isConfirmed) {
      try {
        await fetch(`${API_URL}/api/properties/${item._id}/return`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id || currentUser._id || 'unknown' })
        });
      } catch (err) {
        console.error('API return error:', err);
      }

      const userId = currentUser.id || currentUser._id || 'snow-id';
      try {
        const returnedList = JSON.parse(localStorage.getItem(`cutter_returned_tools_${userId}`) || '[]');
        if (!returnedList.includes(item._id)) {
          returnedList.push(item._id);
          localStorage.setItem(`cutter_returned_tools_${userId}`, JSON.stringify(returnedList));
        }
      } catch (e) {}

      setBorrowedEquipment(prev => prev.filter(p => p._id !== item._id));
      Swal.fire('Returned!', `"${item.name}" has been returned to municipal inventory.`, 'success');
    }
  };

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setCutterLiveCoords({
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6)
        });
      },
      (err) => console.warn('Live tracking warning:', err),
      { enableHighAccuracy: true, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const initialDefaultTasks = useMemo(() => [
    {
      id: 'WO-4081',
      title: 'Emergency Fallen Branch Removal',
      location: 'Kalsanka Junction, Udupi, Karnataka',
      cutter: cutterName,
      priority: 'High',
      status: 'Assigned',
      progress: 15,
      dueDate: new Date().toISOString().slice(0, 10),
      source: 'Official Order',
      visits: [{ time: '09:00 AM', location: 'Udupi Main Rd', note: 'Dispatched by Official.' }]
    },
    {
      id: 'WO-3920',
      title: 'Overhanging Canopy Trimming',
      location: 'Manipal Drive, Udupi, Karnataka',
      cutter: cutterName,
      priority: 'Medium',
      status: 'In Progress',
      progress: 50,
      dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      source: 'Public Complaint',
      visits: [{ time: '10:30 AM', location: 'Manipal Drive', note: 'Work in progress.' }]
    }
  ], [cutterName]);

  const [tasks, setTasks] = useState(() => {
    try {
      const saved = localStorage.getItem('officialWorkOrders');
      const parsed = saved ? JSON.parse(saved) : [];
      return parsed.length > 0 ? parsed : initialDefaultTasks;
    } catch {
      return initialDefaultTasks;
    }
  });

  const [selectedTaskId, setSelectedTaskId] = useState('WO-4081');
  const [taskFilter, setTaskFilter] = useState('my-tasks');

  const loadTasks = async () => {
    const saved = localStorage.getItem('officialWorkOrders');
    let localTasks = saved ? JSON.parse(saved) : [];

    if (localTasks.length === 0) {
      localTasks = initialDefaultTasks;
      localStorage.setItem('officialWorkOrders', JSON.stringify(initialDefaultTasks));
    }

    try {
      const res = await fetch(`${API_URL}/api/complaints`);
      if (res.ok) {
        const data = await res.json();
        const serverComplaints = data.complaints || [];
        const cutterNameLower = cutterName.toLowerCase();

        const assignedComplaints = serverComplaints.filter(c =>
          c.assignedTo && c.assignedTo.toLowerCase().includes(cutterNameLower)
        );

        assignedComplaints.forEach(c => {
          const exists = localTasks.some(t => t.complaintId === c._id);
          if (!exists) {
            const isReplant = c.requiresReplantation;
            const task = {
              id: `WO-${c._id.slice(-4).toUpperCase()}`,
              source: 'Complaint',
              complaintId: c._id,
              requiresReplantation: c.requiresReplantation || false,
              replantationStatus: c.replantationStatus || 'None',
              title: isReplant ? (c.replantationStatus === 'Planted' ? 'Sapling Planted & Registered' : 'Eco-Restore Sapling Replantation') : (issueLabels[c.issueType] || c.issueType),
              location: c.location || 'Location not provided',
              cutter: c.assignedTo,
              priority: isReplant ? 'High' : (c.issueType === 'fallen' || c.issueType === 'dead' ? 'High' : 'Medium'),
              status: isReplant ? (c.replantationStatus === 'Planted' ? 'Closed' : 'Assigned') : ((c.status === 'Reached Location' || c.status === 'Scheduled' || c.status === 'Assigned') && c.progressImageUrl ? 'In Progress' : (c.status || 'Assigned')),
              progress: isReplant ? (c.replantationStatus === 'Planted' ? 100 : 0) : (((c.status === 'Reached Location' || c.status === 'Scheduled' || c.status === 'Assigned') && c.progressImageUrl) ? 50
                : c.status === 'Reached Location' ? 25
                  : c.status === 'In Progress' ? 50
                    : c.status === 'Work Completed' ? 85
                      : c.status === 'Waste Disposed' ? 100
                        : 15),
              dueDate: new Date(new Date(c.createdAt).getTime() + 2 * 86400000).toISOString().slice(0, 10),
              visits: [{ time: 'Awaiting visit', location: c.location || 'Pending GPS', note: 'Synced from database.' }],
              beforeImage: c.beforeImageUrl ? 'Submitted' : 'Pending upload',
              beforeImageUrl: c.beforeImageUrl || '',
              beforeGps: c.beforeGps || null,
              progressImage: c.progressImageUrl ? 'Submitted' : 'Pending upload',
              progressImageUrl: c.progressImageUrl || '',
              progressGps: c.progressGps || null,
              afterImage: c.afterImageUrl ? 'Submitted' : 'Pending upload',
              afterImageUrl: c.afterImageUrl || '',
              afterGps: c.afterGps || null,
              wasteProof: c.wasteProofUrl ? 'Submitted' : 'Pending upload',
              wasteProofUrl: c.wasteProofUrl || '',
              proofStatus: {
                before: c.beforeImageUrl ? 'Pending' : 'Pending upload',
                progress: c.progressImageUrl ? 'Pending' : 'Pending upload',
                after: c.afterImageUrl ? 'Pending' : 'Pending upload',
                waste: c.wasteProofUrl ? 'Pending' : 'Pending upload'
              },
            };
            localTasks.push(task);
          }
        });
        localStorage.setItem('officialWorkOrders', JSON.stringify(localTasks));
      }
    } catch (err) {
      console.error('Failed to sync complaints:', err);
    }

    setTasks(localTasks);
    setSelectedTaskId(prev => prev || localTasks[0]?.id || '');
  };

  useEffect(() => {
    loadTasks();
    const onStorage = (event) => {
      if (event.key === 'officialWorkOrders') loadTasks();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const saveAllTasks = (updater) => {
    const saved = localStorage.getItem('officialWorkOrders');
    const allTasks = saved ? JSON.parse(saved) : [];
    const updatedAll = updater(allTasks);
    localStorage.setItem('officialWorkOrders', JSON.stringify(updatedAll));
    setTasks(updatedAll);
  };

  const myCutterNameLower = cutterName.toLowerCase().trim();

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (taskFilter === 'my-tasks') {
        const taskCutterLower = (task.cutter || task.assignedTo || '').toLowerCase().trim();
        if (!taskCutterLower || !myCutterNameLower) return true;
        return taskCutterLower.includes(myCutterNameLower) || myCutterNameLower.includes(taskCutterLower);
      }
      if (taskFilter === 'in-progress') {
        return task.status === 'In Progress' || task.status === 'Reached Location';
      }
      if (taskFilter === 'completed') {
        return ['Work Completed', 'Waste Disposed', 'Ready for Closure', 'Closed', 'Completed'].includes(task.status);
      }
      return true;
    });
  }, [tasks, taskFilter, myCutterNameLower]);

  const fallbackTask = useMemo(() => ({
    id: 'WO-1001',
    title: 'Tree Branch Trimming & Clearance',
    location: 'Udupi, Karnataka',
    cutter: cutterName,
    priority: 'High',
    status: 'Assigned',
    progress: 15,
    dueDate: new Date().toISOString().slice(0, 10),
  }), [cutterName]);

  const selectedTask = filteredTasks.find(t => t.id === selectedTaskId) || filteredTasks[0] || tasks.find(t => t.id === selectedTaskId) || tasks[0] || fallbackTask;
  const [activeStep, setActiveStep] = useState(1);

  const step1Complete = Boolean(
    selectedTask?.status !== 'Assigned' &&
    selectedTask?.status !== 'Scheduled' &&
    selectedTask?.beforeImage === 'Submitted'
  );
  const step2Complete = Boolean(
    selectedTask?.status === 'Work Completed' ||
    selectedTask?.status === 'Waste Disposed'
  );
  const step3Complete = Boolean(
    selectedTask?.status === 'Waste Disposed'
  );

  useEffect(() => {
    if (!selectedTask) return;
    if (selectedTask.status === 'Work Completed' || selectedTask.status === 'Waste Disposed') {
      setActiveStep(3);
    } else if (selectedTask.status === 'In Progress' || (selectedTask.status === 'Reached Location' && selectedTask.beforeImage === 'Submitted')) {
      setActiveStep(2);
    } else {
      setActiveStep(1);
    }
  }, [selectedTaskId, selectedTask?.status]);

  const assignedCutterName = (selectedTask?.cutter || '').toLowerCase().trim();
  const isTaskAssignedToMe = Boolean(
    myCutterNameLower &&
    assignedCutterName &&
    (assignedCutterName.includes(myCutterNameLower) || myCutterNameLower.includes(assignedCutterName))
  );

  const userAssignedCount = tasks.filter(t => (t.cutter || '').toLowerCase().includes(myCutterNameLower)).length;
  const userCompletedCount = tasks.filter(t => (t.cutter || '').toLowerCase().includes(myCutterNameLower) && ['Work Completed', 'Waste Disposed', 'Closed'].includes(t.status)).length;
  const totalOrdersCount = tasks.length;

  const statusTone = (status) => {
    if (status === 'Closed' || status === 'Waste Disposed') return 'ok';
    if (status === 'Work Completed' || status === 'In Progress' || status === 'Reached Location') return 'med';
    return 'low';
  };

  const showNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3000);
  };

  const addVisit = (task, note) => ({
    ...task,
    visits: [
      ...(task.visits || []),
      {
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        location: task.location,
        note,
      },
    ],
  });

  const updateTask = (taskId, update) => {
    saveAllTasks(allTasks => allTasks.map(task => {
      if (task.id !== taskId) return task;
      return typeof update === 'function' ? update(task) : { ...task, ...update };
    }));
  };

  const markArrival = (taskId) => {
    if (!isTaskAssignedToMe) {
      Swal.fire('Access Denied', 'You cannot perform actions on tasks assigned to other cutters.', 'error');
      return;
    }
    updateTask(taskId, task => {
      const updated = addVisit({ ...task, status: 'Reached Location', progress: Math.max(task.progress || 0, 25), reachedAt: new Date().toISOString() }, 'Reached assigned task location.');
      if (task.complaintId) {
        fetch(`${API_URL}/api/complaints/${task.complaintId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Reached Location' }),
        }).catch(err => console.error('Sync status error:', err));
      }
      return updated;
    });
    showNotice('Arrival logged successfully!');
  };

  const uploadImage = async (taskId, proofField, urlField, file) => {
    if (!isTaskAssignedToMe) {
      Swal.fire('Access Denied', 'You cannot perform actions on tasks assigned to other cutters.', 'error');
      return;
    }
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);

    const getGPSCoords = () => {
      return new Promise((resolve) => {
        if (!navigator.geolocation) { resolve(null); return; }
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude.toFixed(6),
              lng: position.coords.longitude.toFixed(6),
              capturedAt: new Date().toISOString()
            });
          },
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 5000 }
        );
      });
    };

    const coords = await getGPSCoords();
    const gpsField = proofField === 'beforeImage' ? 'beforeGps' : proofField === 'progressImage' ? 'progressGps' : 'afterGps';

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Image upload failed');
      const data = await res.json();
      let serverUrl = data.url;
      if (serverUrl && !serverUrl.startsWith('http://') && !serverUrl.startsWith('https://')) {
        serverUrl = `${API_URL}${serverUrl.startsWith('/') ? '' : '/'}${serverUrl}`;
      }

      const finalGps = (coords && coords.lat && coords.lat !== '0' && coords.lat !== '0.000000') 
        ? coords 
        : (cutterLiveCoords ? { lat: String(cutterLiveCoords.lat), lng: String(cutterLiveCoords.lng), capturedAt: new Date().toISOString() } : { lat: '13.340900', lng: '74.742100', capturedAt: new Date().toISOString() });

      updateTask(taskId, task => {
        let status = task.status;
        if (proofField === 'progressImage' && status === 'Reached Location') {
          status = 'In Progress';
        }
        const updatedTask = addVisit({
          ...task,
          status,
          [proofField]: 'Submitted',
          [urlField]: serverUrl,
          [gpsField]: finalGps,
          progress: proofField === 'beforeImage' ? Math.max(task.progress || 0, 35)
            : proofField === 'progressImage' ? Math.max(task.progress || 0, 60)
              : Math.max(task.progress || 0, 80),
        }, `${proofField === 'beforeImage' ? 'Before-work' : proofField === 'progressImage' ? 'Work-progress' : 'After-work'} image uploaded with GPS.`);

        if (task.complaintId) {
          const body = { status };
          if (proofField === 'beforeImage') { body.beforeImageUrl = serverUrl; body.beforeGps = finalGps; }
          if (proofField === 'progressImage') { body.progressImageUrl = serverUrl; body.progressGps = finalGps; }
          if (proofField === 'afterImage') { body.afterImageUrl = serverUrl; body.afterGps = finalGps; }

          fetch(`${API_URL}/api/complaints/${task.complaintId}/images`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }).catch(err => console.error('Image sync error:', err));
        }
        return updatedTask;
      });
      showNotice('Photo uploaded with live GPS geo-tag!');
    } catch (err) {
      console.error(err);
      const finalGps = (coords && coords.lat && coords.lat !== '0' && coords.lat !== '0.000000') 
        ? coords 
        : (cutterLiveCoords ? { lat: String(cutterLiveCoords.lat), lng: String(cutterLiveCoords.lng), capturedAt: new Date().toISOString() } : { lat: '13.340900', lng: '74.742100', capturedAt: new Date().toISOString() });

      updateTask(taskId, task => {
        let status = task.status;
        if (proofField === 'progressImage' && status === 'Reached Location') {
          status = 'In Progress';
        }
        return addVisit({
          ...task,
          status,
          [proofField]: 'Submitted',
          [urlField]: previewUrl,
          [gpsField]: finalGps,
          progress: proofField === 'beforeImage' ? Math.max(task.progress || 0, 35)
            : proofField === 'progressImage' ? Math.max(task.progress || 0, 60)
              : Math.max(task.progress || 0, 80),
        }, `${proofField === 'beforeImage' ? 'Before-work' : proofField === 'progressImage' ? 'Work-progress' : 'After-work'} image uploaded.`);
      });
    }
  };

  const startWork = (taskId) => {
    if (!isTaskAssignedToMe) {
      Swal.fire('Access Denied', 'You cannot perform actions on tasks assigned to other cutters.', 'error');
      return;
    }
    updateTask(taskId, task => {
      const updated = addVisit({ ...task, status: 'In Progress', progress: Math.max(task.progress || 0, 45) }, 'Work marked in progress.');
      if (task.complaintId) {
        fetch(`${API_URL}/api/complaints/${task.complaintId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'In Progress' }),
        }).catch(err => console.error('Status sync error:', err));
      }
      return updated;
    });
    showNotice('Work marked in progress!');
  };

  const completeWork = (taskId) => {
    if (!isTaskAssignedToMe) {
      Swal.fire('Access Denied', 'You cannot perform actions on tasks assigned to other cutters.', 'error');
      return;
    }
    updateTask(taskId, task => {
      const updated = addVisit({ ...task, status: 'Work Completed', progress: Math.max(task.progress || 0, 85) }, 'Work completed proof submitted.');
      if (task.complaintId) {
        fetch(`${API_URL}/api/complaints/${task.complaintId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Work Completed' }),
        }).catch(err => console.error('Status sync error:', err));
      }
      return updated;
    });
    showNotice('Tree cutting work marked completed!');
  };

  const updateDumpingLocation = (taskId, dumpingLocation) => {
    updateTask(taskId, { dumpingLocation });
  };

  const submitWasteProof = async (taskId, file) => {
    if (!isTaskAssignedToMe) {
      Swal.fire('Access Denied', 'You cannot perform actions on tasks assigned to other cutters.', 'error');
      return;
    }
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);

    const getGPSCoords = () => {
      return new Promise((resolve) => {
        if (!navigator.geolocation) { resolve(null); return; }
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude.toFixed(6),
              lng: position.coords.longitude.toFixed(6),
              capturedAt: new Date().toISOString()
            });
          },
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 5000 }
        );
      });
    };

    const coords = await getGPSCoords();

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Waste proof upload failed');
      const data = await res.json();
      let serverUrl = data.url;
      if (serverUrl && !serverUrl.startsWith('http://') && !serverUrl.startsWith('https://')) {
        serverUrl = `${API_URL}${serverUrl.startsWith('/') ? '' : '/'}${serverUrl}`;
      }

      const finalGps = (coords && coords.lat && coords.lat !== '0' && coords.lat !== '0.000000') 
        ? coords 
        : { lat: '13.355000', lng: '74.760000', capturedAt: new Date().toISOString() };

      updateTask(taskId, task => {
        const updated = addVisit({
          ...task,
          progress: Math.max(task.progress || 0, 92),
          wasteProof: 'Submitted',
          wasteProofUrl: serverUrl,
          wasteGps: finalGps,
        }, 'Waste disposal proof uploaded with GPS.');

        if (task.complaintId) {
          fetch(`${API_URL}/api/complaints/${task.complaintId}/images`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: task.status, wasteProofUrl: serverUrl, wasteGps: finalGps }),
          }).catch(err => console.error('Sync waste proof error:', err));
        }
        return updated;
      });
      showNotice('Waste disposal proof uploaded!');
    } catch (err) {
      console.error(err);
      const finalGps = (coords && coords.lat && coords.lat !== '0' && coords.lat !== '0.000000') 
        ? coords 
        : { lat: '13.355000', lng: '74.760000', capturedAt: new Date().toISOString() };

      updateTask(taskId, task => addVisit({
        ...task,
        progress: Math.max(task.progress || 0, 92),
        wasteProof: 'Submitted',
        wasteProofUrl: previewUrl,
        wasteGps: finalGps,
      }, 'Waste disposal image submitted.'));
    }
  };

  const confirmDisposal = (taskId) => {
    if (!isTaskAssignedToMe) {
      Swal.fire('Access Denied', 'You cannot perform actions on tasks assigned to other cutters.', 'error');
      return;
    }
    updateTask(taskId, task => {
      const updated = addVisit({ ...task, status: 'Waste Disposed', progress: 100 }, 'Disposal confirmed by tree cutter.');
      if (task.complaintId) {
        fetch(`${API_URL}/api/complaints/${task.complaintId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Waste Disposed' }),
        }).catch(err => console.error('Sync status error:', err));
      }
      return updated;
    });
    showNotice('Waste disposal confirmed & task closed!');
  };

  return (
    <div className="cutter-dashboard-wrapper" style={{ minHeight: '100vh', background: 'var(--bg-page, #051d18)', color: 'var(--text-primary, #f1f5f9)' }}>
      {/* ── Common Navigation Sidebar Drawer ── */}
      <Sidebar active="Task Board" isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(false)} />

      {/* ── Common Top Navigation Bar ── */}
      <Topbar
        title="My Assigned Tree Cutting Tasks"
        search="Search work orders, zones, or addresses..."
        showSearch={true}
        onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
      />

      {/* ── Main Layout Workspace ── */}
      <main style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px 28px' }}>
        
        {/* Top Hero / Summary Banner */}
        <section className="task-hero-card">
          <div className="task-hero-copy">
            <span className="task-pill">Field Operations</span>
            <h2>Task Board for Today’s Work Orders</h2>
            <p>Track assignments, confirm site arrival, upload geo-tagged proof, and manage waste disposal seamlessly.</p>
          </div>
          <div className="task-hero-stats">
            <div className="task-stat-chip">
              <span>Assigned To Me</span>
              <strong>{userAssignedCount}</strong>
            </div>
            <div className="task-stat-chip">
              <span>Completed</span>
              <strong>{userCompletedCount}</strong>
            </div>
            <div className="task-stat-chip">
              <span>Total Orders</span>
              <strong>{totalOrdersCount}</strong>
            </div>
          </div>
        </section>

        {notice && <div className="official-notice" style={{ margin: '16px 0', padding: '12px 18px', borderRadius: '12px', background: 'rgba(16,185,129,0.15)', border: '1px solid #10b981', color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle2 size={18} /> {notice}</div>}

        {/* 2-Column Responsive Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '24px', marginTop: '20px', alignItems: 'start' }} className="task-workspace-grid">
          
          {/* ── LEFT SIDEBAR: Task Selector & Site Map ── */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Segmented Filter Pills */}
            <div className="cg-panel" style={{ padding: '16px' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '0.98rem', fontWeight: 800, color: 'var(--title)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} color="#10b981" /> Work Orders
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '14px' }}>
                <button
                  type="button"
                  onClick={() => setTaskFilter('my-tasks')}
                  style={{
                    padding: '8px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700,
                    border: 'none', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                    background: taskFilter === 'my-tasks' ? '#10b981' : 'var(--bg-elevated)',
                    color: taskFilter === 'my-tasks' ? '#ffffff' : 'var(--text-secondary)'
                  }}
                >
                  <User size={14} /> My Tasks
                </button>
                <button
                  type="button"
                  onClick={() => setTaskFilter('all')}
                  style={{
                    padding: '8px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700,
                    border: 'none', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                    background: taskFilter === 'all' ? '#10b981' : 'var(--bg-elevated)',
                    color: taskFilter === 'all' ? '#ffffff' : 'var(--text-secondary)'
                  }}
                >
                  <Globe size={14} /> All Tasks
                </button>
                <button
                  type="button"
                  onClick={() => setTaskFilter('in-progress')}
                  style={{
                    padding: '8px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700,
                    border: 'none', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                    background: taskFilter === 'in-progress' ? '#3b82f6' : 'var(--bg-elevated)',
                    color: taskFilter === 'in-progress' ? '#ffffff' : 'var(--text-secondary)'
                  }}
                >
                  <Zap size={14} /> Active
                </button>
                <button
                  type="button"
                  onClick={() => setTaskFilter('completed')}
                  style={{
                    padding: '8px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700,
                    border: 'none', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                    background: taskFilter === 'completed' ? '#059669' : 'var(--bg-elevated)',
                    color: taskFilter === 'completed' ? '#ffffff' : 'var(--text-secondary)'
                  }}
                >
                  <CheckCircle2 size={14} /> Done
                </button>
              </div>

              {/* Task Selection Cards List */}
              {filteredTasks.length === 0 ? (
                <div style={{ padding: '16px 12px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.84rem', background: 'var(--bg-elevated)', borderRadius: '10px', border: '1px dashed var(--border)' }}>
                  No tasks found in this view.
                </div>
              ) : (
                <div style={{ maxHeight: '360px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                  {filteredTasks.map(task => (
                    <button
                      key={task.id}
                      className={`cutter-task-card ${selectedTask?.id === task.id ? 'selected' : ''}`}
                      onClick={() => setSelectedTaskId(task.id)}
                      style={{ marginTop: 0 }}
                    >
                      <b>{task.id}</b>
                      <span>{task.title}</span>
                      <small>{task.location}</small>
                      <small style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--muted)', fontWeight: 600, marginTop: '2px' }}>
                        <Users size={12} /> {task.cutter || 'Unassigned'}
                      </small>
                      <i className={`tag ${statusTone(task.status)}`}>{task.status}</i>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Permanent Site Location Map Card */}
            <div className="cg-panel" style={{ padding: '16px' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '0.98rem', fontWeight: 800, color: 'var(--title)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={18} color="#10b981" /> Site Location
              </h3>
              <b style={{ color: 'var(--title)', fontSize: '0.92rem', display: 'block' }}>{selectedTask?.location}</b>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'block', marginBottom: '10px' }}>{selectedTask?.title}</span>

              <div style={{ height: '180px', position: 'relative', overflow: 'hidden', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <MapContainer key={selectedTask?.id || 'map'} center={[13.3409, 74.7421]} zoom={14} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[13.3409, 74.7421]}>
                    <Popup>Task Location: {selectedTask?.title}</Popup>
                  </Marker>
                </MapContainer>
                <div style={{ position: 'absolute', bottom: '8px', right: '8px', zIndex: 1000, display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setNavTarget({
                      lat: selectedTask?.beforeGps?.lat || 13.3409,
                      lng: selectedTask?.beforeGps?.lng || 74.7421,
                      title: selectedTask?.title || 'Task Location',
                      address: selectedTask?.location || 'Udupi Location',
                      type: 'task'
                    })}
                    style={{
                      padding: '6px 10px', fontSize: '0.78rem', backgroundColor: '#10b981',
                      color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700
                    }}
                  >
                    <Navigation size={13} /> Live GPS
                  </button>
                  <a
                    href={`https://www.google.com/maps?q=13.3409,74.7421`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '6px 10px', fontSize: '0.78rem', backgroundColor: 'rgba(255,255,255,0.95)',
                      border: '1px solid #cbd5e1', borderRadius: '6px', display: 'flex',
                      alignItems: 'center', gap: '4px', textDecoration: 'none', color: '#1e293b', fontWeight: 600
                    }}
                  >
                    <ExternalLink size={13} /> Maps
                  </a>
                </div>
              </div>

              <div style={{ marginTop: '10px', padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                <span className="live-status-pulse" style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
                <span><b>Live Position:</b> {cutterLiveCoords ? `${cutterLiveCoords.lat}, ${cutterLiveCoords.lng}` : 'Active'}</span>
              </div>
            </div>

            {/* Arborist Badge & Quick Action Links */}
            <div className="cg-panel" style={{ padding: '16px' }}>
              <div style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: '10px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)', color: '#fff', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                  {cutterName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <b style={{ display: 'block', fontSize: '0.95rem', color: 'var(--text-primary)' }}>{cutterName}</b>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Assigned Tree Cutter Arborist</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Link to="/property-inventory" className="cg-btn primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '10px', fontSize: '0.88rem', fontWeight: 800, borderRadius: '10px', background: '#10b981', color: '#fff', textDecoration: 'none' }}>
                  <ShoppingCart size={16} /> Purchase Equipment
                </Link>
                <Link to="/attendance" className="cg-btn outline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '10px', fontSize: '0.88rem', fontWeight: 800, borderRadius: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', textDecoration: 'none' }}>
                  <Fingerprint size={16} /> Mark Attendance
                </Link>
              </div>
            </div>

            {/* Borrowed Equipment & Return Countdown Card */}
            <div className="cg-panel" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: 'var(--title)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShoppingCart size={18} color="#10b981" /> Borrowed Equipment
                </h3>
                <span style={{ fontSize: '0.74rem', padding: '3px 8px', borderRadius: '999px', background: 'rgba(16,185,129,0.15)', color: '#34d399', fontWeight: 700 }}>
                  {borrowedEquipment.length} Active Items
                </span>
              </div>

              {borrowedEquipment.length === 0 ? (
                <div style={{ padding: '16px 12px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.84rem', background: 'var(--bg-elevated)', borderRadius: '10px', border: '1px dashed var(--border)' }}>
                  No equipment currently borrowed.
                  <Link to="/property-inventory" style={{ display: 'block', marginTop: '8px', color: '#10b981', fontWeight: 700, textDecoration: 'none' }}>
                    + Borrow Saws & Gear
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {borrowedEquipment.map(item => {
                    const userReq = item.purchaseRequests?.find(r => (r.userId && r.userId === (currentUser.id || currentUser._id)) || (r.username && r.username.toLowerCase().includes(myCutterNameLower))) || item.purchaseRequests?.[0];
                    const timer = getRemainingTime(userReq?.requestedAt);

                    return (
                      <div key={item._id} style={{
                        padding: '12px', borderRadius: '12px', background: 'var(--bg-elevated)',
                        border: `1px solid ${timer.isOverdue ? '#ef4444' : 'var(--border)'}`,
                        display: 'flex', flexDirection: 'column', gap: '8px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <EquipmentImage src={item.imageUrl} category={item.category} name={item.name} size="44px" />
                            <div>
                              <b style={{ fontSize: '0.88rem', color: 'var(--text-primary)', display: 'block' }}>{item.name}</b>
                              <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>{item.serialNumber || item.category || 'Municipal Tool'}</span>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.72rem', background: 'rgba(16,185,129,0.2)', color: '#34d399', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, flexShrink: 0 }}>
                            {item.category || 'Tool'}
                          </span>
                        </div>

                        {/* Return Countdown Badge */}
                        <div style={{
                          padding: '6px 10px', borderRadius: '8px',
                          background: timer.isOverdue ? 'rgba(239,68,68,0.18)' : 'rgba(16,185,129,0.1)',
                          border: `1px solid ${timer.color}`,
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: timer.color, display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Clock size={13} color={timer.color} /> {timer.text}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Due: {timer.dueStr}</span>
                        </div>

                        {/* Submit Back Button */}
                        <button
                          type="button"
                          onClick={() => handleReturnEquipment(item)}
                          style={{
                            width: '100%', padding: '8px', borderRadius: '8px', border: 'none',
                            background: timer.isOverdue ? '#ef4444' : '#10b981', color: '#ffffff',
                            fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                          }}
                        >
                          <CheckCircle2 size={14} /> Submit Back / Return Equipment
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </aside>

          {/* ── RIGHT MAIN PANEL: Active Task Workspace Command Center ── */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Task Briefing Header */}
            <div className="cg-panel task-instructions-card">
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--title)' }}>
                    <FileText size={20} color="#10b981" /> Task Briefing: {selectedTask?.id}
                  </h3>
                  <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.05rem' }}>{selectedTask?.title}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setNavTarget({
                      lat: selectedTask?.beforeGps?.lat || 13.3409,
                      lng: selectedTask?.beforeGps?.lng || 74.7421,
                      title: selectedTask?.title || 'Task Site',
                      address: selectedTask?.location || 'Udupi Location',
                      type: 'task'
                    })}
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                      color: '#ffffff', border: 'none', borderRadius: '10px',
                      padding: '8px 14px', fontSize: '0.84rem', fontWeight: 800,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                      boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
                    }}
                  >
                    <Navigation size={15} /> Live GPS Navigation
                  </button>
                  <span className="task-due-chip">Due: {selectedTask?.dueDate || 'Not scheduled'}</span>
                </div>
              </header>
              <p style={{ color: 'var(--text-secondary)', margin: '10px 0 14px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={15} color="#10b981" /> {selectedTask?.location} — Visit assigned site, upload before proof, mark progress, finish cutting work, and submit waste disposal confirmation.
              </p>
              <div className="fact-chip-row">
                <span className="fact-chip"><b>Assigned To:</b> {selectedTask?.cutter || 'Unassigned'}</span>
                <span className="fact-chip"><b>Priority:</b> {selectedTask?.priority || 'Medium'}</span>
                <span className="fact-chip"><b>Progress:</b> {selectedTask?.progress || 0}%</span>
                <span className="fact-chip"><b>Status:</b> {selectedTask?.status}</span>
              </div>
            </div>

            {/* ── STEP-BY-STEP WORKFLOW WIZARD TABS ── */}
            <div className="task-step-wizard-bar" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
              padding: '14px 18px', borderRadius: '16px', background: 'var(--bg-surface)',
              border: '1px solid var(--border)'
            }}>
              {/* Step 1 Tab */}
              <button
                type="button"
                onClick={() => setActiveStep(1)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                  borderRadius: '12px', border: activeStep === 1 ? '2px solid #10b981' : step1Complete ? '1px solid #059669' : '1px solid var(--border)',
                  background: activeStep === 1 ? 'rgba(16,185,129,0.15)' : step1Complete ? 'rgba(16,185,129,0.08)' : 'var(--bg-elevated)',
                  cursor: 'pointer', textAlign: 'left'
                }}
              >
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: step1Complete ? '#10b981' : activeStep === 1 ? '#043224' : '#cbd5e1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 }}>
                  {step1Complete ? <CheckCircle2 size={16} /> : '1'}
                </div>
                <div>
                  <b style={{ display: 'block', fontSize: '0.88rem', color: 'var(--text-primary)' }}>Step 1: Arrival</b>
                  <span style={{ fontSize: '0.75rem', color: step1Complete ? '#10b981' : 'var(--text-secondary)' }}>
                    {step1Complete ? 'Arrival & Photo Done' : 'Check-in & Photo'}
                  </span>
                </div>
              </button>

              <ArrowRight size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />

              {/* Step 2 Tab */}
              <button
                type="button"
                onClick={() => step1Complete && setActiveStep(2)}
                disabled={!step1Complete}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                  borderRadius: '12px', border: activeStep === 2 ? '2px solid #10b981' : step2Complete ? '1px solid #059669' : '1px solid var(--border)',
                  background: activeStep === 2 ? 'rgba(16,185,129,0.15)' : step2Complete ? 'rgba(16,185,129,0.08)' : 'var(--bg-elevated)',
                  opacity: !step1Complete ? 0.6 : 1, cursor: step1Complete ? 'pointer' : 'not-allowed', textAlign: 'left'
                }}
              >
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: step2Complete ? '#10b981' : activeStep === 2 ? '#043224' : step1Complete ? '#3b82f6' : '#cbd5e1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 }}>
                  {step2Complete ? <CheckCircle2 size={16} /> : '2'}
                </div>
                <div>
                  <b style={{ display: 'block', fontSize: '0.88rem', color: 'var(--text-primary)' }}>Step 2: Cutting</b>
                  <span style={{ fontSize: '0.75rem', color: step2Complete ? '#10b981' : 'var(--text-secondary)' }}>
                    {step2Complete ? 'Work Completed' : step1Complete ? 'In Progress' : 'Locked'}
                  </span>
                </div>
              </button>

              <ArrowRight size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />

              {/* Step 3 Tab */}
              <button
                type="button"
                onClick={() => step2Complete && setActiveStep(3)}
                disabled={!step2Complete}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                  borderRadius: '12px', border: activeStep === 3 ? '2px solid #10b981' : step3Complete ? '1px solid #059669' : '1px solid var(--border)',
                  background: activeStep === 3 ? 'rgba(16,185,129,0.15)' : step3Complete ? 'rgba(16,185,129,0.08)' : 'var(--bg-elevated)',
                  opacity: !step2Complete ? 0.6 : 1, cursor: step2Complete ? 'pointer' : 'not-allowed', textAlign: 'left'
                }}
              >
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: step3Complete ? '#10b981' : activeStep === 3 ? '#043224' : step2Complete ? '#059669' : '#cbd5e1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 }}>
                  {step3Complete ? <CheckCircle2 size={16} /> : '3'}
                </div>
                <div>
                  <b style={{ display: 'block', fontSize: '0.88rem', color: 'var(--text-primary)' }}>Step 3: Disposal</b>
                  <span style={{ fontSize: '0.75rem', color: step3Complete ? '#10b981' : 'var(--text-secondary)' }}>
                    {step3Complete ? 'Waste Disposed' : step2Complete ? 'Ready for Disposal' : 'Locked'}
                  </span>
                </div>
              </button>
            </div>

            {/* ── STEP 1 PAGE CONTENT ── */}
            {activeStep === 1 && (
              <div className="cg-panel step cutter-step-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, color: 'var(--title)' }}><MapPin style={{ color: '#10b981', marginRight: '6px' }} /> Step 1: Site Arrival & Initial Proof</h3>
                  {step1Complete && <span className="tag ok">Step 1 Complete</span>}
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
                  Confirm your arrival at the assigned task location and upload a geo-tagged photo of the tree condition before work starts.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {(selectedTask?.status !== 'Assigned' && selectedTask?.status !== 'Scheduled') ? (
                    <div className="step-confirmed-banner" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid #10b981', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="confirmed-icon-circle" style={{ background: '#10b981', color: '#fff', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle2 size={20} /></div>
                      <div>
                        <strong style={{ color: 'var(--text-primary)', display: 'block' }}>Site Arrival Confirmed</strong>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Arrival timestamp & location logged</span>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="btn-action-primary emerald-glow"
                      onClick={() => markArrival(selectedTask?.id)}
                      disabled={!isTaskAssignedToMe}
                    >
                      <MapPin size={18} /> Confirm Site Arrival
                    </button>
                  )}

                  {selectedTask?.beforeImageUrl ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <GeoTaggedImageProof
                        imageUrl={selectedTask.beforeImageUrl}
                        gps={selectedTask.beforeGps}
                        locationText={selectedTask.location}
                        altText="Before work proof photo"
                        proofLabel="Before Work Proof"
                      />
                      <label style={{ alignSelf: 'flex-start' }}>
                        <span className="btn-change-proof">
                          <Camera size={14} /> Change / Re-upload Before Photo
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={e => uploadImage(selectedTask?.id, 'beforeImage', 'beforeImageUrl', e.target.files?.[0])}
                          disabled={!isTaskAssignedToMe}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="cutter-upload-zone">
                      <div className="cutter-upload-icon-badge">
                        <Camera size={22} />
                      </div>
                      <b>Upload Before-work Image (Geo-Tagged)</b>
                      <span>Click to select or capture tree condition photo before work starts</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => uploadImage(selectedTask?.id, 'beforeImage', 'beforeImageUrl', e.target.files?.[0])}
                        disabled={!isTaskAssignedToMe || selectedTask?.status !== 'Reached Location'}
                      />
                    </label>
                  )}
                </div>

                <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className={step1Complete ? 'cg-btn primary' : 'cg-btn muted'}
                    onClick={() => setActiveStep(2)}
                    disabled={!step1Complete}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontWeight: 700, fontSize: '0.95rem' }}
                  >
                    Proceed to Step 2: Cutting Work <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 2 PAGE CONTENT ── */}
            {activeStep === 2 && (
              <div className="cg-panel step cutter-step-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, color: 'var(--title)' }}><Play style={{ color: '#3b82f6', marginRight: '6px' }} /> Step 2: Tree Cutting Work & Proof</h3>
                  <span className="tag info">{selectedTask?.progress || 0}% Completed</span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
                  Mark work in progress, upload progress & after-work geo-tagged photos, then click "Mark Work Completed".
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {selectedTask?.status === 'In Progress' || selectedTask?.status === 'Work Completed' || selectedTask?.status === 'Waste Disposed' ? (
                    <div className="step-confirmed-banner blue-theme" style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid #3b82f6', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="confirmed-icon-circle blue" style={{ background: '#3b82f6', color: '#fff', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Play size={18} /></div>
                      <div>
                        <strong style={{ color: 'var(--text-primary)', display: 'block' }}>Work In Progress Logged</strong>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Field operations active for this work order</span>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="btn-action-primary blue-glow"
                      onClick={() => startWork(selectedTask?.id)}
                      disabled={!isTaskAssignedToMe || selectedTask?.status !== 'Reached Location' || selectedTask?.beforeImage !== 'Submitted'}
                    >
                      <Play size={18} /> Start / Mark Work In Progress
                    </button>
                  )}

                  {/* Progress Photo */}
                  {selectedTask?.progressImageUrl ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <GeoTaggedImageProof
                        imageUrl={selectedTask.progressImageUrl}
                        gps={selectedTask.progressGps}
                        locationText={selectedTask.location}
                        altText="Work progress proof photo"
                        proofLabel="Work Progress Proof"
                      />
                      <label style={{ alignSelf: 'flex-start' }}>
                        <span className="btn-change-proof">
                          <Camera size={14} /> Change Progress Photo
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={e => uploadImage(selectedTask?.id, 'progressImage', 'progressImageUrl', e.target.files?.[0])}
                          disabled={!isTaskAssignedToMe}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="cutter-upload-zone blue-style">
                      <div className="cutter-upload-icon-badge">
                        <Camera size={22} />
                      </div>
                      <b>Upload Work-Progress Image (Geo-Tagged)</b>
                      <span>Click to upload photo of ongoing trimming / cutting work</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => uploadImage(selectedTask?.id, 'progressImage', 'progressImageUrl', e.target.files?.[0])}
                        disabled={!isTaskAssignedToMe || selectedTask?.status === 'Assigned' || selectedTask?.status === 'Scheduled'}
                      />
                    </label>
                  )}

                  {/* After Photo */}
                  {selectedTask?.afterImageUrl ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <GeoTaggedImageProof
                        imageUrl={selectedTask.afterImageUrl}
                        gps={selectedTask.afterGps}
                        locationText={selectedTask.location}
                        altText="After work proof photo"
                        proofLabel="After Work Proof"
                      />
                      <label style={{ alignSelf: 'flex-start' }}>
                        <span className="btn-change-proof">
                          <Camera size={14} /> Change After Photo
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={e => uploadImage(selectedTask?.id, 'afterImage', 'afterImageUrl', e.target.files?.[0])}
                          disabled={!isTaskAssignedToMe}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="cutter-upload-zone danger-style">
                      <div className="cutter-upload-icon-badge">
                        <Camera size={22} />
                      </div>
                      <b>Upload After-work Image (Geo-Tagged)</b>
                      <span>Click to upload final completed tree cutting photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => uploadImage(selectedTask?.id, 'afterImage', 'afterImageUrl', e.target.files?.[0])}
                        disabled={!isTaskAssignedToMe || selectedTask?.status === 'Assigned' || selectedTask?.status === 'Scheduled'}
                      />
                    </label>
                  )}

                  {selectedTask?.status === 'Work Completed' || selectedTask?.status === 'Waste Disposed' ? (
                    <div className="step-confirmed-banner green-theme" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid #10b981', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="confirmed-icon-circle green" style={{ background: '#10b981', color: '#fff', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle2 size={20} /></div>
                      <div>
                        <strong style={{ color: 'var(--text-primary)', display: 'block' }}>Tree Cutting Work Completed</strong>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Field completion proof submitted & verified</span>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="btn-action-primary emerald-glow"
                      onClick={() => completeWork(selectedTask.id)}
                      disabled={!isTaskAssignedToMe || selectedTask?.afterImage !== 'Submitted' || selectedTask?.progressImage !== 'Submitted'}
                    >
                      <CheckCircle2 size={18} /> Mark Work Completed
                    </button>
                  )}
                </div>

                <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    className="cg-btn outline"
                    onClick={() => setActiveStep(1)}
                    style={{ padding: '10px 20px', fontWeight: 600 }}
                  >
                    ← Back to Step 1
                  </button>
                  <button
                    className={step2Complete ? 'cg-btn primary' : 'cg-btn muted'}
                    onClick={() => setActiveStep(3)}
                    disabled={!step2Complete}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontWeight: 700, fontSize: '0.95rem' }}
                  >
                    Proceed to Step 3: Waste Disposal <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 3 PAGE CONTENT ── */}
            {activeStep === 3 && (
              <div className="cg-panel disposal">
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, color: 'var(--title)' }}><Recycle style={{ color: '#10b981', marginRight: '6px' }} /> Step 3: Waste Disposal & Final Sign-Off</h3>
                  <span className={`tag ${selectedTask?.status === 'Waste Disposed' ? 'ok' : 'low'}`}>
                    {selectedTask?.status === 'Waste Disposed' ? 'Waste Disposed' : 'Disposal Pending'}
                  </span>
                </header>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '8px 0 16px' }}>
                  Record green waste volume, select government dumping site, upload disposal proof, and submit confirmation.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Waste Volume (est. cubic meters)
                    <input
                      value={selectedTask?.wasteVolume || ''}
                      onChange={e => updateTask(selectedTask.id, { wasteVolume: e.target.value })}
                      placeholder="e.g. 2.5 m³"
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Government Dumping Location
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <select
                        value={selectedTask?.dumpingLocation || dumpingLocations[0]}
                        onChange={e => updateDumpingLocation(selectedTask.id, e.target.value)}
                        style={{ flex: 1, minWidth: '220px', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                      >
                        {dumpingLocations.map(location => <option key={location}>{location}</option>)}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const selectedYardName = selectedTask?.dumpingLocation || dumpingLocations[0];
                          const yardInfo = DUMPING_YARDS.find(d => d.name === selectedYardName) || DUMPING_YARDS[0];
                          setNavTarget({
                            lat: yardInfo.lat,
                            lng: yardInfo.lng,
                            title: yardInfo.name,
                            address: yardInfo.address,
                            type: 'disposal'
                          });
                        }}
                        style={{
                          padding: '10px 14px', borderRadius: '10px',
                          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                          color: '#ffffff', border: 'none', fontWeight: 700, fontSize: '0.84rem',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                          boxShadow: '0 4px 12px rgba(59,130,246,0.3)'
                        }}
                      >
                        <Truck size={15} /> Live Navigation to Yard
                      </button>
                    </div>
                  </label>

                  {selectedTask?.wasteProofUrl ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <GeoTaggedImageProof
                        imageUrl={selectedTask.wasteProofUrl}
                        gps={selectedTask.wasteGps || { lat: '13.355000', lng: '74.760000', capturedAt: new Date().toISOString() }}
                        locationText={selectedTask.dumpingLocation || 'Government Waste Yard'}
                        altText="Waste disposal proof photo"
                        proofLabel="Waste Disposal Proof"
                      />
                      <label style={{ alignSelf: 'flex-start' }}>
                        <span className="btn-change-proof">
                          <Camera size={14} /> Change Disposal Photo
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={e => submitWasteProof(selectedTask.id, e.target.files?.[0])}
                          disabled={!isTaskAssignedToMe}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="cutter-upload-zone">
                      <div className="cutter-upload-icon-badge">
                        <UploadCloud size={22} />
                      </div>
                      <b>Upload Waste Disposal Image (Geo-Tagged)</b>
                      <span>Click to upload photo at dumping yard location</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => submitWasteProof(selectedTask.id, e.target.files?.[0])}
                        disabled={!isTaskAssignedToMe || !['Work Completed', 'Waste Disposed'].includes(selectedTask.status)}
                      />
                    </label>
                  )}
                </div>

                <footer style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button className="cg-btn outline" onClick={() => setActiveStep(2)}>← Back to Step 2</button>
                  {selectedTask?.status === 'Waste Disposed' ? (
                    <div className="step-confirmed-banner green-theme" style={{ flex: 1, marginLeft: '16px', background: 'rgba(16,185,129,0.15)', border: '1px solid #10b981', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="confirmed-icon-circle green" style={{ background: '#10b981', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle2 size={18} /></div>
                      <div>
                        <strong style={{ color: 'var(--text-primary)' }}>Task Fully Completed & Closed</strong>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'block' }}>Waste disposal confirmed successfully</span>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="btn-action-primary emerald-glow"
                      onClick={() => confirmDisposal(selectedTask.id)}
                      disabled={!isTaskAssignedToMe || (selectedTask?.status !== 'Work Completed' && selectedTask?.status !== 'Waste Disposed')}
                      style={{ width: 'auto', padding: '12px 24px' }}
                    >
                      Submit Disposal Confirmation
                    </button>
                  )}
                </footer>
              </div>
            )}

            {/* Visit & Telemetry Log */}
            <div className="cg-panel cutter-visit-log">
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ margin: 0, color: 'var(--title)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={18} color="#10b981" /> Field Telemetry & Status Log
                </h3>
                <span style={{ fontSize: '0.78rem', background: 'rgba(16,185,129,0.15)', color: '#34d399', padding: '4px 10px', borderRadius: '999px', fontWeight: 700 }}>
                  {selectedTask?.visits?.length || 0} Telemetry Updates
                </span>
              </header>
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(selectedTask?.visits || []).map((visit, idx) => (
                  <div key={idx} style={{ padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <b style={{ color: 'var(--text-primary)', fontSize: '0.88rem', display: 'block' }}>{visit.note}</b>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><MapPin size={12} /> {visit.location}</span>
                    </div>
                    <span style={{ color: 'var(--brand-accent)', fontSize: '0.78rem', fontWeight: 700 }}>{visit.time}</span>
                  </div>
                ))}
              </div>
            </div>

          </section>

        </div>
      </main>

      {/* Live OSRM Leaflet Navigation Modal */}
      {navTarget && (
        <TaskBoardDirectionsModal
          navTarget={navTarget}
          onClose={() => setNavTarget(null)}
          darkMode={document.documentElement.getAttribute('data-theme') === 'dark'}
        />
      )}
    </div>
  );
}
