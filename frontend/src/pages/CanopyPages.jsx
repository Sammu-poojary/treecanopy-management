import { useState, useEffect, useRef, useMemo } from 'react';
import NotificationBell from '../components/NotificationBell';
import CitizenDashboard from '../components/CitizenDashboard';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import diseasedLeafImg from '../assets/diseased_leaf.png';
import pestsGridImg from '../assets/pests_grid.png';
import Swal from 'sweetalert2';

// Fix Leaflet marker icon issue safely
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

import {
  AlertTriangle,
  ArrowRight,
  Ban,
  BarChart3,
  Bell,
  Briefcase,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Cloud,
  Crosshair,
  Database,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Fingerprint,
  Home,
  Image,
  Layers,
  Leaf,
  Lock,
  LogIn,
  LogOut,
  Mail,
  Map,
  MapPin,
  Menu,
  MoreVertical,
  Moon,
  Navigation,
  Pencil,
  Phone,
  Plus,
  Play,
  Recycle,
  Scissors,
  Search,
  Settings,
  ShieldCheck,
  Sprout,
  Sun,
  TreePine,
  UploadCloud,
  UserRound,
  Users,
  X,
  Activity,
  Bird,
  Bug,
  Calendar,
  Droplet,
  Flower,
  Globe,
  Heart,
  Ruler,
  ShieldAlert,
  ShoppingCart,
  Trash2,
  Trees,
  TrendingUp,
  Umbrella,
  Wind,
  BookOpen,
  School,
  Building2,
} from 'lucide-react';

const nav = [
  ['Dashboard', '/dashboard', Home],
  ['My Dashboard', '/citizen-dashboard', Home],
  ['Map View', '/dashboard', Map],
  ['Track Report', '/track', Crosshair],
  ['Complaints', '/report-issue', AlertTriangle],
  ['View Tree', '/view-tree', TreePine],
  ['Tree Inventory', '/tree-inventory', TreePine],
  ['Tree Encyclopedia', '/tree-encyclopedia', BookOpen],
  ['Add Property', '/add-property', Plus],
  ['Property Inventory', '/property-inventory', Database],
  ['Work Schedules', '/scheduler', Calendar],
  ['Inspections', '/task', FileText],
  ['Attendance', '/attendance', Fingerprint],
  ['Reports', '/admin', BarChart3],
  ['Settings', '/admin', Settings],
];

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const normalizeRole = (role) => {
  if (!role) return '';
  const r = role.toLowerCase().replace(/_/g, ' ').replace(/-/g, ' ').trim();
  if (r === 'arborist / cutter' || r === 'tree cutter' || r === 'treecutter' || r === 'cutter') {
    return 'Tree Cutter';
  }
  if (r === 'official') return 'Official';
  if (r === 'admin') return 'Admin';
  if (r === 'citizen' || r === 'public user' || r === 'public_user') return 'Citizen';
  return role;
};

const monitoringZones = [
  {
    id: 'FR-09',
    name: 'Forest Range 09',
    sector: 'Northern Green Belt',
    center: [13.3409, 74.7421],
    density: 74.8,
    trend: '+2.4%',
    treeCount: '12,480',
    canopyArea: '142.5 ha',
    ndvi: '0.78 (Dense Canopy)',
    health: [
      ['Excellent', 72, 'dark'],
      ['Fair / Stable', 21, 'mint'],
      ['Critical Care', 7, 'red'],
    ],
    polygons: {
      high: [
        [13.3460, 74.7350], [13.3480, 74.7420], [13.3450, 74.7480],
        [13.3390, 74.7460], [13.3370, 74.7380], [13.3410, 74.7320]
      ],
      medium: [
        [13.3370, 74.7480], [13.3390, 74.7540], [13.3340, 74.7560],
        [13.3310, 74.7500], [13.3330, 74.7440]
      ],
      alert: [
        [13.3490, 74.7440], [13.3510, 74.7490], [13.3470, 74.7510], [13.3450, 74.7470]
      ]
    }
  },
  {
    id: 'UC-03',
    name: 'Urban Core 03',
    sector: 'East Avenue Corridor',
    center: [13.3520, 74.7850],
    density: 32.6,
    trend: '+1.1%',
    treeCount: '4,150',
    canopyArea: '48.2 ha',
    ndvi: '0.45 (Moderate Canopy)',
    health: [
      ['Excellent', 48, 'dark'],
      ['Fair / Stable', 38, 'mint'],
      ['Critical Care', 14, 'red'],
    ],
    polygons: {
      high: [
        [13.3540, 74.7810], [13.3560, 74.7870], [13.3530, 74.7900], [13.3500, 74.7830]
      ],
      medium: [
        [13.3500, 74.7830], [13.3520, 74.7910], [13.3470, 74.7930], [13.3460, 74.7840]
      ],
      alert: [
        [13.3570, 74.7880], [13.3590, 74.7930], [13.3560, 74.7950], [13.3540, 74.7900]
      ]
    }
  },
  {
    id: 'SW-12',
    name: 'Southern Wetlands 12',
    sector: 'Canal Buffer Zone',
    center: [13.3180, 74.7250],
    density: 64.2,
    trend: '+3.8%',
    treeCount: '9,820',
    canopyArea: '115.0 ha',
    ndvi: '0.71 (High Canopy)',
    health: [
      ['Excellent', 66, 'dark'],
      ['Fair / Stable', 26, 'mint'],
      ['Critical Care', 8, 'red'],
    ],
    polygons: {
      high: [
        [13.3220, 74.7200], [13.3250, 74.7280], [13.3200, 74.7310], [13.3150, 74.7230]
      ],
      medium: [
        [13.3150, 74.7230], [13.3180, 74.7320], [13.3120, 74.7340], [13.3100, 74.7250]
      ],
      alert: [
        [13.3260, 74.7290], [13.3280, 74.7340], [13.3240, 74.7360], [13.3230, 74.7310]
      ]
    }
  },
];

export function Sidebar({ active = 'Dashboard', admin = false, isOpen = false, onToggle }) {
  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('currentUser')) || {};
    } catch {
      return {};
    }
  })();
  const currentUserRole = normalizeRole(currentUser.role);

  // Lock background body scroll when mobile/overlay sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const isOfficialOrAdmin =
    ['Official', 'Admin'].includes(currentUserRole) ||
    sessionStorage.getItem('officialAuthed') === 'true' ||
    sessionStorage.getItem('adminAuthed') === 'true' ||
    currentUserRole === '';

  const items = admin
    ? nav.filter(([label]) => ['Dashboard', 'Map View', 'Work Schedules', 'Complaints', 'Tree Inventory', 'Add Property', 'Settings', 'Reports', 'Tree Encyclopedia'].includes(label))
    : nav.filter(([label]) => {
      if (currentUserRole === 'Citizen') {
        return ['My Dashboard', 'Map View', 'Track Report', 'Complaints', 'View Tree', 'Tree Encyclopedia'].includes(label);
      }
      if (label === 'Dashboard' && currentUserRole === 'Citizen') return false;
      if (label === 'My Dashboard') return false;
      if (label === 'Track Report' && isOfficialOrAdmin) return false;
      if (label === 'Work Schedules' && !isOfficialOrAdmin) return false;
      if (label === 'Tree Inventory') return false;
      if (label === 'Add Property') return false;
      if (label === 'Property Inventory' && currentUserRole !== 'Tree Cutter') return false;
      if (label === 'Inspections' && currentUserRole !== 'Tree Cutter') return false;
      if (label === 'Attendance' && !isOfficialOrAdmin && currentUserRole !== 'Tree Cutter') return false;
      if (label === 'Reports' && !isOfficialOrAdmin) return false;
      if (label === 'Settings' && !isOfficialOrAdmin) return false;
      return true;
    });

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('officialAuthed');
    sessionStorage.removeItem('adminAuthed');
    window.location.href = '/login';
  };

  return (
    <>
      {isOpen && <div className="cg-side-overlay" onClick={onToggle}></div>}
      <aside
        className={`cg-side ${isOpen ? 'open' : ''}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          maxHeight: '100vh',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          boxSizing: 'border-box'
        }}
      >
        <div className="cg-side-brand">
          <h2>Tree<br />Management</h2>
          <span>{admin ? 'Official Portal' : 'Official Portal'}</span>
        </div>
        {admin && <span className="cg-side-kicker">Main Menu</span>}
        <nav style={{ flex: '1 1 auto', overflowY: 'auto', overscrollBehavior: 'contain', display: 'flex', flexDirection: 'column', gap: '10px', minHeight: 0, paddingRight: '4px' }}>
          {items.map(([label, href, Icon]) => (
            <Link key={label} to={href} className={active === label ? 'active' : ''}>
              <Icon size={25} /> {label}
            </Link>
          ))}
        </nav>

        <div style={{ padding: '0 16px 16px' }}>
          <Link className="cg-new-record" to="/report-issue" style={{ width: '100%', boxSizing: 'border-box', marginBottom: '10px' }}><Plus size={22} /> New Record</Link>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              width: '100%',
              padding: '12px',
              color: '#ef4444',
              background: '#fef2f2',
              border: '1px solid #fee2e2',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.95rem',
              boxSizing: 'border-box'
            }}
          >
            <LogOut size={20} /> Log Out
          </button>
        </div>

        {admin && (
          <div className="cg-admin-user">
            <div className="avatar dark">AR</div>
            <div><b>Admin Root</b><span>System Controller</span></div>
          </div>
        )}
      </aside>
    </>
  );
}

export function Topbar({ title = 'CanopyGuard', search = 'Search assets, zones, or reports...', attendance = false, onToggleSidebar, onProfileClick }) {
  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('currentUser')) || {}; }
    catch { return {}; }
  })();
  const userName = currentUser.name || currentUser.username || 'User';
  const userPhoto = currentUser.profileImage || currentUser.avatar || '';
  const initial = userName.charAt(0).toUpperCase() || 'U';

  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('theme', next ? 'dark' : 'light');
    window.dispatchEvent(new Event('themeChange'));
  };

  useEffect(() => {
    const syncTheme = () => {
      setDarkMode(localStorage.getItem('theme') === 'dark');
    };
    window.addEventListener('themeChange', syncTheme);
    return () => window.removeEventListener('themeChange', syncTheme);
  }, []);

  return (
    <header className="cg-topbar">
      <button className="cg-menu-btn" onClick={onToggleSidebar} style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: '16px', display: 'flex', alignItems: 'center' }}>
        <Menu size={28} />
      </button>
      {attendance ? (
        <nav className="cg-tab-nav">
          <Link to="/dashboard">Dashboard</Link>
          <Link className="active" to="/attendance">Attendance</Link>
          <Link to="/task">Task Board</Link>
        </nav>
      ) : (
        <h1>{title}</h1>
      )}
      <label className="cg-search">
        <Search size={24} />
        <input placeholder={search} />
      </label>

      {/* Dark Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        title={darkMode ? "Switch to Light Theme" : "Switch to Dark Theme"}
        style={{
          background: darkMode ? '#1e293b' : '#f1f5f9',
          border: darkMode ? '1px solid #334155' : '1px solid #cbd5e1',
          borderRadius: '10px',
          width: '38px',
          height: '38px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: darkMode ? '#fbbf24' : '#6366f1',
          transition: 'all 0.2s',
          marginLeft: '4px'
        }}
      >
        {darkMode ? <Sun size={20} color="#fbbf24" /> : <Moon size={20} color="#6366f1" />}
      </button>

      <NotificationBell />

      {/* Topbar Profile Badge Trigger */}
      {onProfileClick ? (
        <button
          onClick={onProfileClick}
          className="cg-topbar-profile-trigger"
          style={{ textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', textAlign: 'left', padding: 0 }}
          title="View & edit Tree Cutter Profile"
        >
          {userPhoto ? (
            <img src={userPhoto} alt={userName} className="topbar-avatar-img" />
          ) : (
            <div className="topbar-avatar-circle">{initial}</div>
          )}
          <b className="topbar-cutter-name">{userName}</b>
        </button>
      ) : (
        <Link to="/task" className="cg-topbar-profile-trigger" style={{ textDecoration: 'none' }} title="Go to Task Board & Profile">
          {userPhoto ? (
            <img src={userPhoto} alt={userName} className="topbar-avatar-img" />
          ) : (
            <div className="topbar-avatar-circle">{initial}</div>
          )}
          <b className="topbar-cutter-name">{userName}</b>
        </Link>
      )}
    </header>
  );
}

function DashboardMap({ activeZone, activeCases, lastUpdated }) {
  const fixedCenter = [13.3409, 74.7421]; // Stable location so user never loses their place
  const [mapRef, setMapRef] = useState(null);
  const [mapLayer, setMapLayer] = useState('street'); // Street view by default with clear road & landmark names

  const handleRecenter = () => {
    if (mapRef) {
      mapRef.flyTo(fixedCenter, 14, { duration: 1.0 });
    }
  };

  const tileUrl = mapLayer === 'satellite'
    ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const tileAttr = mapLayer === 'satellite'
    ? '&copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics'
    : '&copy; OpenStreetMap contributors';

  const polys = activeZone.polygons || {};

  return (
    <div className="cg-satellite" style={{ position: 'relative', overflow: 'hidden', height: '520px', borderRadius: '14px', border: '2px solid #043224', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}>
      {/* ── REAL LEAFLET MAP CONTAINER ── */}
      <MapContainer
        center={fixedCenter}
        zoom={14}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', zIndex: 1 }}
        ref={setMapRef}
        zoomControl={false}
      >
        <TileLayer attribution={tileAttr} url={tileUrl} />

        {/* High Density Foliage Polygon (Green) */}
        {polys.high && (
          <Polygon
            positions={polys.high}
            pathOptions={{ fillColor: '#10b981', color: '#047857', weight: 2.5, fillOpacity: 0.45 }}
          >
            <Popup>
              <div style={{ minWidth: '170px' }}>
                <strong style={{ color: '#047857', display: 'block', marginBottom: '4px' }}>🌿 {activeZone.id} High Canopy Belt</strong>
                <span style={{ fontSize: '0.82rem', color: '#374151', display: 'block' }}>Dense Foliage Index: {activeZone.ndvi}</span>
                <small style={{ color: '#059669', fontWeight: 700 }}>Cover: {activeZone.canopyArea}</small>
              </div>
            </Popup>
          </Polygon>
        )}

        {/* Medium Density Foliage Polygon (Blue) */}
        {polys.medium && (
          <Polygon
            positions={polys.medium}
            pathOptions={{ fillColor: '#3b82f6', color: '#1d4ed8', weight: 2.5, fillOpacity: 0.4 }}
          >
            <Popup>
              <div style={{ minWidth: '170px' }}>
                <strong style={{ color: '#1d4ed8', display: 'block', marginBottom: '4px' }}>🌱 {activeZone.id} Medium Canopy Sector</strong>
                <span style={{ fontSize: '0.82rem', color: '#374151', display: 'block' }}>Regular Pruning & Growth Tracked</span>
                <small style={{ color: '#2563eb', fontWeight: 600 }}>Active Trees: {activeZone.treeCount}</small>
              </div>
            </Popup>
          </Polygon>
        )}

        {/* Alert / High Risk Foliage Polygon (Red) */}
        {polys.alert && (
          <Polygon
            positions={polys.alert}
            pathOptions={{ fillColor: '#ef4444', color: '#b91c1c', weight: 2.5, fillOpacity: 0.5 }}
          >
            <Popup>
              <div style={{ minWidth: '170px' }}>
                <strong style={{ color: '#b91c1c', display: 'block', marginBottom: '4px' }}>⚠️ Risk / Overhanging Alert Sector</strong>
                <span style={{ fontSize: '0.82rem', color: '#374151', display: 'block' }}>Active Risk Reports: {activeCases}</span>
                <small style={{ color: '#dc2626', fontWeight: 700 }}>Field Cutter Dispatch Active</small>
              </div>
            </Popup>
          </Polygon>
        )}

        {/* Zone Monitoring Center Station Marker */}
        <Marker position={activeZone.center || fixedCenter}>
          <Popup>
            <div style={{ minWidth: '190px' }}>
              <b style={{ color: '#043224', display: 'block', marginBottom: '4px' }}>📍 Zone {activeZone.id} Satellite Hub</b>
              <p style={{ margin: '2px 0 6px', fontSize: '0.82rem', color: '#4b5563' }}>{activeZone.name} / {activeZone.sector}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.78rem', color: '#047857', fontWeight: 700 }}>Trees Monitored: {activeZone.treeCount}</span>
                <span style={{ fontSize: '0.78rem', color: '#1e40af', fontWeight: 700 }}>NDVI Index: {activeZone.ndvi}</span>
                <span style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '2px' }}>Last Telemetry: {lastUpdated}</span>
              </div>
            </div>
          </Popup>
        </Marker>
      </MapContainer>

      {/* ── FLOATING CANOPY COVERAGE INFO CARD OVERLAY ── */}
      <div className="cg-zone-card" style={{ zIndex: 1000, background: 'rgba(255, 255, 255, 0.94)', backdropFilter: 'blur(10px)', boxShadow: '0 8px 24px rgba(0,0,0,0.14)', borderRadius: '14px', border: '1px solid rgba(203, 213, 225, 0.9)', padding: '16px 20px' }}>
        <b style={{ fontSize: '0.95rem', color: '#0f172a' }}>Live Zone {activeZone.id} Canopy Coverage</b>
        <small style={{ color: '#64748b', fontSize: '0.8rem', display: 'block', margin: '2px 0 10px' }}>{activeZone.name} &nbsp;•&nbsp; {activeZone.sector}</small>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700, color: '#065f46' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} /> High Density
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700, color: '#1e40af' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} /> Medium
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700, color: '#991b1b' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} /> Alert Zone
          </span>
        </div>

        <div style={{ fontSize: '0.78rem', color: '#475569', borderTop: '1px solid #e2e8f0', paddingTop: '8px', display: 'flex', gap: '12px' }}>
          <span>🌳 <b>{activeZone.treeCount}</b> Trees</span>
          <span>•</span>
          <span>🗺️ <b>{activeZone.canopyArea}</b></span>
          <span>•</span>
          <span style={{ color: '#059669', fontWeight: 700 }}>{activeCases} Active Cases</span>
        </div>
      </div>

      {/* ── MAP CONTROL BUTTONS OVERLAY ── */}
      <div style={{ position: 'absolute', bottom: '16px', right: '16px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          className="map-tool layers"
          type="button"
          onClick={() => setMapLayer(prev => prev === 'satellite' ? 'street' : 'satellite')}
          title="Toggle Satellite / Street map view"
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
            transition: 'all 0.2s'
          }}
        >
          <Layers size={20} />
        </button>
        <button
          className="map-tool target"
          type="button"
          onClick={handleRecenter}
          title="Recenter map to active zone"
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
            transition: 'all 0.2s'
          }}
        >
          <Crosshair size={20} />
        </button>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const [complaints, setComplaints] = useState([]);
  const [allComplaintsList, setAllComplaintsList] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState(monitoringZones[0].id);
  const [currentTime, setCurrentTime] = useState(new Date());

  const issueLabels = {
    damaged: 'Damaged Tree', overhanging: 'Overhanging Branches', dead: 'Dead / Dying Tree',
    pest: 'Pest / Disease', roots: 'Roots Damage', fallen: 'Fallen Branch',
    replant: 'Eco-Restore Replantation',
  };

  useEffect(() => {
    fetch(`${API_URL}/api/complaints`)
      .then(r => r.json())
      .then(data => {
        const list = data.complaints || (Array.isArray(data) ? data : []);
        setAllComplaintsList(list);
        setComplaints(list);
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return 'Recently';
    const diffMs = new Date() - new Date(dateStr);
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  const formatLocation = (loc) => {
    if (!loc) return '—';
    return loc
      .split(',')
      .map(part => part.trim())
      .map(part => part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : '')
      .filter(Boolean)
      .join(', ');
  };

  const renderStatusBadge = (status) => {
    const s = status || 'Pending';
    if (s === 'Pending') {
      return (
        <span style={{ padding: '3px 10px', borderRadius: '20px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', fontSize: '0.74rem', fontWeight: 800 }}>
          PENDING
        </span>
      );
    }
    if (s === 'In Progress' || s === 'Reached Location') {
      return (
        <span style={{ padding: '3px 10px', borderRadius: '20px', background: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd', fontSize: '0.74rem', fontWeight: 800 }}>
          IN PROGRESS
        </span>
      );
    }
    if (s === 'Scheduled') {
      return (
        <span style={{ padding: '3px 10px', borderRadius: '20px', background: '#f3e8ff', color: '#6b21a8', border: '1px solid #d8b4fe', fontSize: '0.74rem', fontWeight: 800 }}>
          SCHEDULED
        </span>
      );
    }
    if (s === 'Work Completed' || s === 'Waste Disposed' || s === 'Resolved') {
      return (
        <span style={{ padding: '3px 10px', borderRadius: '20px', background: '#dcfce7', color: '#166534', border: '1px solid #86efac', fontSize: '0.74rem', fontWeight: 800 }}>
          COMPLETED
        </span>
      );
    }
    return (
      <span style={{ padding: '3px 10px', borderRadius: '20px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', fontSize: '0.74rem', fontWeight: 700 }}>
        {s.toUpperCase()}
      </span>
    );
  };

  const activeZone = monitoringZones.find(zone => zone.id === selectedZoneId) || monitoringZones[0];
  const activeComplaints = complaints.filter(complaint => {
    const text = `${complaint.location || ''} ${complaint.zone || ''} ${complaint.description || ''}`.toLowerCase();
    return text.includes(activeZone.id.toLowerCase()) || text.includes(activeZone.name.toLowerCase());
  });
  const activeCases = activeComplaints.length || complaints.filter(complaint => complaint.status !== 'Resolved').length;
  const density = Math.max(18, Math.min(92, activeZone.density - Math.min(activeCases, 8) * 0.7));
  const criticalHealth = Math.min(24, activeZone.health[2][1] + activeCases * 2);
  const fairHealth = Math.max(12, activeZone.health[1][1] - activeCases);
  const excellentHealth = Math.max(0, 100 - fairHealth - criticalHealth);
  const liveHealth = [
    ['Excellent', excellentHealth, 'dark'],
    ['Fair / Stable', fairHealth, 'mint'],
    ['Critical Care', criticalHealth, 'red'],
  ];
  const liveStamp = currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const liveDate = currentTime.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  // Filter complaints for display
  const pendingComplaints = allComplaintsList.filter(c => c.status !== 'Resolved' && c.status !== 'Work Completed');
  const displayComplaints = (pendingComplaints.length > 0 ? pendingComplaints : allComplaintsList).slice(0, 5);

  const completedComplaints = allComplaintsList.filter(c =>
    ['Work Completed', 'Waste Disposed', 'Resolved'].includes(c.status)
  );

  const completedTaskItems = completedComplaints.length > 0
    ? completedComplaints.slice(0, 4).map(c => {
      const cutterName = c.assignedTo || c.assignedCutter || c.updatedBy || 'Tree Cutter Team';
      const loc = formatLocation(c.location) || 'Tree Site';
      const issueTitle = issueLabels[c.issueType] || c.issueType || 'Tree Pruning';
      return {
        id: c._id,
        title: `${issueTitle}`,
        location: loc,
        subtitle: `Completed by ${cutterName}`,
        time: formatTimeAgo(c.updatedAt || c.createdAt),
      };
    })
    : [
      {
        id: 'def-1',
        title: `Tree Pruning & Clearance`,
        location: `Santhekatte, Udupi`,
        subtitle: `Completed by Tree Cutter Boxy`,
        time: '2h ago',
      },
      {
        id: 'def-2',
        title: `Hazardous Branch Removal`,
        location: `Udupi Bus Stand`,
        subtitle: `Completed by Tree Cutter Sameeksha`,
        time: '5h ago',
      },
      {
        id: 'def-3',
        title: `Emergency Removal & Waste Clearance`,
        location: `Zone ${activeZone.id}`,
        subtitle: `Verified by Forest Field Official`,
        time: 'Yesterday',
      },
    ];

  return (
    <div className="cg-app cg-dashboard-screen">
      <Sidebar active="Dashboard" isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
      <div className="cg-workspace">
        <Topbar onToggleSidebar={() => setSidebarOpen(true)} />
        <main className="cg-page">
          <section className="cg-page-title">
            <div>
              <h1>{activeZone.id} Live Zone Dashboard</h1>
              <p>{activeZone.name} / {activeZone.sector}</p>
            </div>
            <button className="cg-date"><CalendarDays size={18} /> {liveDate} - Live</button>
          </section>
          <section className="cg-zone-switcher" aria-label="Live zone selector">
            {monitoringZones.map(zone => (
              <button
                key={zone.id}
                className={zone.id === activeZone.id ? 'active' : ''}
                onClick={() => setSelectedZoneId(zone.id)}
              >
                <span>{zone.id}</span>
                <b>{zone.name}</b>
              </button>
            ))}
          </section>
          <section className="cg-dash-grid">
            <DashboardMap activeZone={activeZone} activeCases={activeCases} lastUpdated={liveStamp} />
            <aside className="cg-stack">
              <div className="cg-density" style={{ background: 'linear-gradient(135deg, #043224 0%, #065f46 100%)', color: '#ffffff', padding: '24px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(4, 50, 36, 0.25)', position: 'relative', overflow: 'hidden' }}>
                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.85, fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  REAL-TIME CANOPY DENSITY
                </span>
                <strong style={{ fontSize: '2.8rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, display: 'block' }}>
                  {density.toFixed(1)}%
                </strong>

                <div style={{ marginTop: '12px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(4px)', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>NDVI Index:</span>
                  <b style={{ color: '#6ee7b7' }}>{activeZone.ndvi}</b>
                </div>

                <p style={{ margin: '12px 0 0', fontSize: '0.82rem', opacity: 0.9, lineHeight: 1.4 }}>
                  <b>{activeZone.trend}</b> growth from last quarter &nbsp;•&nbsp; <b>{activeZone.treeCount}</b> monitored trees in {activeZone.sector}
                </p>

                <TreePine size={64} style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.15, color: '#ffffff' }} />
              </div>
              <div className="cg-health">
                <h3>Tree Health Overview</h3>
                {liveHealth.map(([label, value, tone]) => (
                  <div className="health-row" key={label}>
                    <span>{label}<b>{value}%</b></span>
                    <i className={tone} style={{ width: `${value}%` }}></i>
                  </div>
                ))}
              </div>
            </aside>
          </section>
          <section className="cg-bottom-grid">
            <div className="cg-panel">
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Pending & Active Complaints</h2>
                <Link to="/admin" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#059669', textDecoration: 'none' }}>View All {'->'}</Link>
              </header>
              <table className="cg-table" style={{ marginTop: '14px' }}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Issue</th>
                    <th>Location</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {displayComplaints.length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center', color: '#aaa', padding: '24px' }}>No active complaints logged</td></tr>
                  ) : displayComplaints.map((c) => (
                    <tr key={c._id}>
                      <td>
                        <span style={{ fontWeight: 800, fontSize: '0.8rem', color: '#334155', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>
                          #{c._id ? c._id.slice(-5).toUpperCase() : 'COMP'}
                        </span>
                      </td>
                      <td>
                        <b style={{ color: '#0f172a', display: 'block', fontSize: '0.9rem' }}>{issueLabels[c.issueType] || c.issueType}</b>
                        {c.description && (
                          <small style={{ display: 'block', color: '#64748b', marginTop: '2px', fontSize: '0.78rem' }}>
                            {c.description.slice(0, 45)}{c.description.length > 45 ? '…' : ''}
                          </small>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.86rem', color: '#334155', fontWeight: 600 }}>
                          {formatLocation(c.location)}
                        </span>
                      </td>
                      <td>
                        {renderStatusBadge(c.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="cg-panel tasks">
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Recent Task Completions</h2>
                <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                  Live Field Telemetry
                </span>
              </header>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {completedTaskItems.map((task) => (
                  <div
                    key={task.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#dcfce7', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                      <CheckCircle2 size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <b style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 700 }}>{task.title}</b>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{task.time}</span>
                      </div>
                      <span style={{ fontSize: '0.78rem', color: '#475569', display: 'block', marginTop: '2px' }}>
                        📍 {task.location}
                      </span>
                      <small style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600, display: 'block', marginTop: '3px' }}>
                        {task.subtitle}
                      </small>
                    </div>
                  </div>
                ))}
              </div>

              <Link className="floating-plus" to="/task" title="Go to Task Board"><Plus /></Link>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

const initialDefaultTasks = [
  {
    id: 'WO-4081',
    title: 'Emergency Fallen Branch Removal',
    location: 'Kalsanka Junction, Udupi, Karnataka',
    cutter: 'Sameeksha',
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
    cutter: 'Sameeksha',
    priority: 'Medium',
    status: 'In Progress',
    progress: 50,
    dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    source: 'Public Complaint',
    visits: [{ time: '10:30 AM', location: 'Manipal Drive', note: 'Work in progress.' }]
  }
];

export function TaskPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const fileInputRef = useRef(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [profileImage, setProfileImage] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem('currentUser')) || {};
      return u.profileImage || u.avatar || '';
    } catch {
      return '';
    }
  });

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
  const [notice, setNotice] = useState('');
  const [properties, setProperties] = useState([]);
  const [propertyLoading, setPropertyLoading] = useState(true);
  const [propertyActionMessage, setPropertyActionMessage] = useState('');
  const [propertyActionError, setPropertyActionError] = useState('');
  const [cutterLiveCoords, setCutterLiveCoords] = useState(null);
  const [expandedSection, setExpandedSection] = useState('work-orders');

  const handleProfilePhotoUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid File',
        text: 'Please select an image file.',
        confirmButtonColor: '#10b981'
      });
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      let photoUrl = '';
      try {
        const res = await fetch(`${API_URL}/api/upload`, {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          photoUrl = `${API_URL}${data.url}`;
        }
      } catch (err) {
        console.warn('Upload endpoint fallback:', err);
      }

      if (!photoUrl) {
        photoUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(file);
        });
      }

      setProfileImage(photoUrl);

      const u = JSON.parse(localStorage.getItem('currentUser')) || {};
      const updatedUser = { ...u, profileImage: photoUrl };
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));

      Swal.fire({
        icon: 'success',
        title: 'Photo Uploaded!',
        text: 'Tree cutter profile photo updated successfully.',
        confirmButtonColor: '#10b981',
        timer: 1800
      });
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Upload Error',
        text: 'Failed to upload photo.',
        confirmButtonColor: '#10b981'
      });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemoveProfilePhoto = () => {
    setProfileImage('');
    try {
      const u = JSON.parse(localStorage.getItem('currentUser')) || {};
      delete u.profileImage;
      delete u.avatar;
      localStorage.setItem('currentUser', JSON.stringify(u));
    } catch (e) {
      console.error(e);
    }
    Swal.fire({
      icon: 'info',
      title: 'Photo Removed',
      text: 'Default avatar initial will now be displayed.',
      confirmButtonColor: '#10b981',
      timer: 1500
    });
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
      (err) => console.warn('Cutter live tracking disabled/blocked:', err),
      { enableHighAccuracy: true, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('currentUser')) || {};
    } catch {
      return {};
    }
  })();
  const isCutter = true;

  const dumpingLocations = [
    'Government Green Waste Yard - Zone A',
    'Municipal Compost Depot - Ward 12',
    'City Tree Waste Transfer Station',
  ];

  const issueLabels = {
    damaged: 'Damaged Tree',
    overhanging: 'Overhanging Branches',
    dead: 'Dead / Dying Tree',
    pest: 'Pest / Disease',
    roots: 'Roots Damage',
    fallen: 'Fallen Branch',
  };

  const getAssignedTasks = (allTasks) => {
    return allTasks;
  };

  const loadTasks = async () => {
    const saved = localStorage.getItem('officialWorkOrders');
    let localTasks = saved ? JSON.parse(saved) : [];

    const defaultTasks = [
      {
        id: 'WO-4081',
        title: 'Emergency Fallen Branch Removal',
        location: 'Kalsanka Junction, Udupi, Karnataka',
        cutter: currentUser.name || 'Sameeksha',
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
        cutter: currentUser.name || 'Sameeksha',
        priority: 'Medium',
        status: 'In Progress',
        progress: 50,
        dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        source: 'Public Complaint',
        visits: [{ time: '10:30 AM', location: 'Manipal Drive', note: 'Work in progress.' }]
      }
    ];

    if (localTasks.length === 0) {
      localTasks = defaultTasks;
      localStorage.setItem('officialWorkOrders', JSON.stringify(defaultTasks));
    }

    // Sync with the backend database for any real assigned complaints
    try {
      const res = await fetch(`${API_URL}/api/complaints`);
      if (res.ok) {
        const data = await res.json();
        const serverComplaints = data.complaints || [];

        // Filter complaints assigned to this cutter (matching their name)
        const cutterName = (currentUser.name || '').toLowerCase();
        const assignedComplaints = serverComplaints.filter(c =>
          c.assignedTo && c.assignedTo.toLowerCase().includes(cutterName)
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
          } else {
            // Update local task if server details are newer
            localTasks = localTasks.map(t => {
              if (t.complaintId === c._id) {
                const isReplant = c.requiresReplantation || t.requiresReplantation;
                let status = isReplant ? (c.replantationStatus === 'Planted' ? 'Closed' : t.status) : (c.status || t.status);
                const hasProgressImage = c.progressImageUrl || t.progressImageUrl;
                if (!isReplant && (status === 'Reached Location' || status === 'Scheduled' || status === 'Assigned') && hasProgressImage) {
                  status = 'In Progress';
                }
                const progress = isReplant ? (c.replantationStatus === 'Planted' ? 100 : t.progress)
                  : status === 'In Progress' ? Math.max(t.progress || 0, 50)
                    : status === 'Work Completed' ? Math.max(t.progress || 0, 85)
                      : status === 'Waste Disposed' ? Math.max(t.progress || 0, 100)
                        : status === 'Reached Location' ? Math.max(t.progress || 0, 25)
                          : t.progress;

                return {
                  ...t,
                  requiresReplantation: c.requiresReplantation || t.requiresReplantation,
                  replantationStatus: c.replantationStatus || t.replantationStatus,
                  title: isReplant ? (c.replantationStatus === 'Planted' ? 'Sapling Planted & Registered' : 'Eco-Restore Sapling Replantation') : t.title,
                  status,
                  progress,
                  beforeImageUrl: c.beforeImageUrl || t.beforeImageUrl,
                  beforeGps: c.beforeGps || t.beforeGps,
                  progressImageUrl: c.progressImageUrl || t.progressImageUrl,
                  progressGps: c.progressGps || t.progressGps,
                  afterImageUrl: c.afterImageUrl || t.afterImageUrl,
                  afterGps: c.afterGps || t.afterGps,
                  wasteProofUrl: c.wasteProofUrl || t.wasteProofUrl,
                  beforeImage: c.beforeImageUrl ? 'Submitted' : t.beforeImage,
                  progressImage: c.progressImageUrl ? 'Submitted' : t.progressImage,
                  afterImage: c.afterImageUrl ? 'Submitted' : t.afterImage,
                  wasteProof: c.wasteProofUrl ? 'Submitted' : t.wasteProof,
                };
              }
              return t;
            });
          }
        });

        localStorage.setItem('officialWorkOrders', JSON.stringify(localTasks));
      }
    } catch (err) {
      console.error('Failed to sync complaints from server:', err);
    }

    const assigned = getAssignedTasks(localTasks);
    setTasks(assigned);
    setSelectedTaskId(prev => prev || assigned[0]?.id || '');
  };

  useEffect(() => {
    loadTasks();
    if (isCutter) {
      fetchProperties();
    }
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
    const assigned = getAssignedTasks(updatedAll);
    setTasks(assigned);
    setSelectedTaskId(prev => prev || assigned[0]?.id || '');
  };

  const [taskFilter, setTaskFilter] = useState('all');

  const myCutterNameLower = (currentUser.name || currentUser.username || '').toLowerCase().trim();

  const filteredTasks = tasks.filter(task => {
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

  const fallbackTask = {
    id: 'WO-1001',
    title: 'Tree Branch Trimming & Clearance',
    location: 'Udupi, Karnataka',
    cutter: currentUser.name || 'Sameeksha',
    priority: 'High',
    status: 'Assigned',
    progress: 15,
    dueDate: new Date().toISOString().slice(0, 10),
  };
  const selectedTask = filteredTasks.find(task => task.id === selectedTaskId) || filteredTasks[0] || tasks.find(task => task.id === selectedTaskId) || tasks[0] || fallbackTask;
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

  const currentCutterName = (currentUser.name || currentUser.username || currentUser.email || '').toLowerCase().trim();
  const assignedCutterName = (selectedTask?.cutter || '').toLowerCase().trim();
  const isTaskAssignedToMe = Boolean(
    currentCutterName &&
    assignedCutterName &&
    (assignedCutterName.includes(currentCutterName) || currentCutterName.includes(assignedCutterName))
  );
  const openCount = tasks.filter(task => task.status !== 'Closed').length;
  const completedCount = tasks.filter(task => ['Work Completed', 'Waste Disposed', 'Ready for Closure', 'Closed'].includes(task.status)).length;

  const statusTone = (status) => {
    if (status === 'Closed' || status === 'Waste Disposed') return 'ok';
    if (status === 'Work Completed' || status === 'In Progress' || status === 'Reached Location') return 'med';
    return 'low';
  };

  const showNotice = (message) => {
    setNotice(message);
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

  const uploadImage = async (taskId, proofField, urlField, file) => {
    if (!isTaskAssignedToMe) {
      Swal.fire('Access Denied', 'You cannot perform actions on tasks assigned to other cutters.', 'error');
      return;
    }
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);

    // Helper to get GPS coordinates
    const getGPSCoords = () => {
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          resolve(null);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude.toFixed(6),
              lng: position.coords.longitude.toFixed(6),
              capturedAt: new Date().toISOString()
            });
          },
          () => {
            resolve(null); // fallback if location is disabled or timed out
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      });
    };

    const coords = await getGPSCoords();
    const gpsField = proofField === 'beforeImage' ? 'beforeGps'
      : proofField === 'progressImage' ? 'progressGps'
        : 'afterGps';

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Image upload failed');
      const data = await res.json();
      const serverUrl = `${API_URL}${data.url}`;

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
          [gpsField]: coords || { lat: '0', lng: '0', capturedAt: new Date().toISOString() },
          progress: proofField === 'beforeImage' ? Math.max(task.progress || 0, 35)
            : proofField === 'progressImage' ? Math.max(task.progress || 0, 60)
              : Math.max(task.progress || 0, 80),
          proofStatus: {
            ...(task.proofStatus || {}),
            [proofField === 'beforeImage' ? 'before' : proofField === 'progressImage' ? 'progress' : 'after']: 'Pending'
          },
        }, `${proofField === 'beforeImage' ? 'Before-work' : proofField === 'progressImage' ? 'Work-progress' : 'After-work'} image uploaded.`);

        if (task.complaintId) {
          const body = { status };
          if (proofField === 'beforeImage') {
            body.beforeImageUrl = serverUrl;
            body.beforeGps = coords;
          }
          if (proofField === 'progressImage') {
            body.progressImageUrl = serverUrl;
            body.progressGps = coords;
          }
          if (proofField === 'afterImage') {
            body.afterImageUrl = serverUrl;
            body.afterGps = coords;
          }

          fetch(`${API_URL}/api/complaints/${task.complaintId}/images`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }).catch(err => console.error('Failed to sync images to backend:', err));
        }
        return updatedTask;
      });
      showNotice(`${proofField === 'beforeImage' ? 'Before-work' : proofField === 'progressImage' ? 'Work-progress' : 'After-work'} image uploaded with GPS geo-tag.`);
    } catch (err) {
      console.error(err);
      showNotice('Upload failed. Using local preview fallback.');
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
          [gpsField]: coords || { lat: '0', lng: '0', capturedAt: new Date().toISOString() },
          progress: proofField === 'beforeImage' ? Math.max(task.progress || 0, 35)
            : proofField === 'progressImage' ? Math.max(task.progress || 0, 60)
              : Math.max(task.progress || 0, 80),
          proofStatus: {
            ...(task.proofStatus || {}),
            [proofField === 'beforeImage' ? 'before' : proofField === 'progressImage' ? 'progress' : 'after']: 'Pending'
          },
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
      const updated = addVisit({ ...task, status: 'In Progress', progress: Math.max(task.progress || 0, 45) }, 'Work marked in progress by cutter.');
      if (task.complaintId) {
        fetch(`${API_URL}/api/complaints/${task.complaintId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'In Progress' }),
        }).catch(err => console.error('Failed to sync status to backend:', err));
      }
      return updated;
    });
    showNotice('Work started. Officials can now see this task in progress.');
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
        }).catch(err => console.error('Failed to sync status to backend:', err));
      }
      return updated;
    });
    showNotice('Reached location status sent to officials.');
  };

  const submitAfterImage = (taskId) => {
    if (!isTaskAssignedToMe) {
      Swal.fire('Access Denied', 'You cannot perform actions on tasks assigned to other cutters.', 'error');
      return;
    }
    updateTask(taskId, task => {
      const updated = addVisit({ ...task, progress: Math.max(task.progress || 0, 82), afterImage: 'Submitted' }, 'After-work image submitted for official verification.');
      if (task.complaintId) {
        fetch(`${API_URL}/api/complaints/${task.complaintId}/images`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: task.status, afterImageUrl: task.afterImageUrl }),
        }).catch(err => console.error('Failed to sync after image status:', err));
      }
      return updated;
    });
    showNotice('After-work image sent to official proof review.');
  };

  const submitWasteProof = async (taskId, file) => {
    if (!isTaskAssignedToMe) {
      Swal.fire('Access Denied', 'You cannot perform actions on tasks assigned to other cutters.', 'error');
      return;
    }
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Waste proof upload failed');
      const data = await res.json();
      const serverUrl = `${API_URL}${data.url}`;

      updateTask(taskId, task => {
        const updated = addVisit({
          ...task,
          progress: Math.max(task.progress || 0, 92),
          wasteProof: 'Submitted',
          wasteProofUrl: serverUrl,
          proofStatus: { ...(task.proofStatus || {}), waste: 'Pending' },
        }, 'Waste disposal image submitted.');

        if (task.complaintId) {
          fetch(`${API_URL}/api/complaints/${task.complaintId}/images`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: task.status, wasteProofUrl: serverUrl }),
          }).catch(err => console.error('Failed to sync waste proof image:', err));
        }
        return updated;
      });
      showNotice('Waste disposal proof sent to official proof review.');
    } catch (err) {
      console.error(err);
      showNotice('Upload failed. Using local preview fallback.');
      updateTask(taskId, task => addVisit({
        ...task,
        progress: Math.max(task.progress || 0, 92),
        wasteProof: 'Submitted',
        wasteProofUrl: previewUrl,
        proofStatus: { ...(task.proofStatus || {}), waste: 'Pending' },
      }, 'Waste disposal image submitted.'));
    }
  };

  const completeWork = (taskId) => {
    if (!isTaskAssignedToMe) {
      Swal.fire('Access Denied', 'You cannot perform actions on tasks assigned to other cutters.', 'error');
      return;
    }
    updateTask(taskId, task => {
      const updated = addVisit({ ...task, status: 'Work Completed', progress: Math.max(task.progress || 0, 85), completedAt: new Date().toISOString() }, 'Cutting work completed. Waste disposal pending.');
      if (task.complaintId) {
        fetch(`${API_URL}/api/complaints/${task.complaintId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Work Completed' }),
        }).catch(err => console.error('Failed to sync status to backend:', err));
      }
      return updated;
    });
    showNotice('Work marked completed. Transport waste to the designated government dumping location.');
    setActiveStep(3);
    Swal.fire({
      icon: 'success',
      title: 'Work Completed!',
      text: 'Work marked completed. Transport waste to the designated government dumping location.',
      confirmButtonColor: '#10b981',
      confirmButtonText: 'Proceed to Step 3: Waste Disposal',
    }).then(() => {
      setActiveStep(3);
    });
  };

  const updateDumpingLocation = (taskId, dumpingLocation) => {
    updateTask(taskId, { dumpingLocation });
  };

  const fetchProperties = async () => {
    setPropertyLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/properties`);
      if (res.ok) {
        const data = await res.json();
        setProperties(data);
      }
    } catch (err) {
      console.error('Failed to fetch properties', err);
    } finally {
      setPropertyLoading(false);
    }
  };

  const handlePurchaseProperty = async (propertyId, propertyName) => {
    if (!window.confirm(`Purchase "${propertyName}" from equipment inventory?`)) return;
    setPropertyActionMessage('');
    setPropertyActionError('');

    try {
      const res = await fetch(`${API_URL}/api/properties/${propertyId}/purchase`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id || currentUser._id || 'unknown',
          userName: currentUser.name || currentUser.username || 'Tree Cutter'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.msg || 'Purchase request failed');
      }
      setPropertyActionMessage(`Purchased "${propertyName}" successfully.`);
      fetchProperties();
    } catch (err) {
      setPropertyActionError(err.message || 'Purchase failed.');
    }
  };

  const captureDisposalGps = (taskId) => {
    if (!navigator.geolocation) {
      showNotice('GPS is not available on this device.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        updateTask(taskId, task => addVisit({
          ...task,
          disposalGps: {
            lat: coords.latitude.toFixed(6),
            lng: coords.longitude.toFixed(6),
            capturedAt: new Date().toISOString(),
          },
        }, 'Disposal GPS location captured.'));
        showNotice('Disposal GPS location captured.');
      },
      () => showNotice('Could not capture GPS. Please allow location permission.'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const confirmDisposal = (taskId) => {
    if (!isTaskAssignedToMe) {
      Swal.fire('Access Denied', 'You cannot perform actions on tasks assigned to other cutters.', 'error');
      return;
    }
    const task = tasks.find(item => item.id === taskId);
    if (!task?.wasteProofUrl) {
      showNotice('Upload waste disposal image before confirmation.');
      Swal.fire({
        icon: 'warning',
        title: 'Waste Proof Required',
        text: 'Please upload a waste disposal image before submitting confirmation.',
        confirmButtonColor: '#10b981',
      });
      return;
    }

    updateTask(taskId, item => {
      const updated = addVisit({
        ...item,
        status: 'Waste Disposed',
        progress: 100,
        disposalConfirmedAt: new Date().toISOString(),
      }, 'Waste disposal confirmed at government dumping location.');

      if (item.complaintId) {
        fetch(`${API_URL}/api/complaints/${item.complaintId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Waste Disposed' }),
        }).catch(err => console.error('Failed to sync status to backend:', err));
      }
      return updated;
    });
    showNotice('Task Completed');
    Swal.fire({
      icon: 'success',
      title: 'Waste Disposal Confirmed!',
      text: 'Waste disposal confirmation submitted successfully. Task is now fully completed!',
      confirmButtonColor: '#10b981',
      confirmButtonText: 'Great!',
    });
  };

  const cutterName = currentUser.name || currentUser.username || 'Sameeksha';
  const cutterEmail = currentUser.email || 'sameeksha@treecanopy.gov.in';
  const cutterPhone = currentUser.phone || '+91 98765 43210';
  const cutterRole = currentUser.role || 'Tree Cutter';
  const cutterId = currentUser.id || currentUser._id ? `TC-${String(currentUser.id || currentUser._id).slice(-4).toUpperCase()}` : 'TC-8842';
  const initial = cutterName.charAt(0).toUpperCase() || 'S';

  const myNameLower = (currentUser.name || currentUser.username || '').toLowerCase().trim();

  const userAssignedCount = tasks.filter(task => {
    const taskCutterLower = (task.cutter || task.assignedTo || '').toLowerCase().trim();
    if (!taskCutterLower || !myNameLower) return true;
    return taskCutterLower.includes(myNameLower) || myNameLower.includes(taskCutterLower);
  }).length;

  const userCompletedCount = tasks.filter(task => {
    const isDone = ['Work Completed', 'Waste Disposed', 'Ready for Closure', 'Closed', 'Completed'].includes(task.status);
    if (!isDone) return false;
    const taskCutterLower = (task.cutter || task.assignedTo || '').toLowerCase().trim();
    if (!taskCutterLower || !myNameLower) return true;
    return taskCutterLower.includes(myNameLower) || myNameLower.includes(taskCutterLower);
  }).length;

  const totalOrdersCount = tasks.length;

  return (
    <div className="cg-app">
      <Sidebar active="Inspections" isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
      <div className="cg-workspace">
        <Topbar
          title="Inspections"
          onToggleSidebar={() => setSidebarOpen(true)}
          onProfileClick={() => setShowProfileModal(true)}
        />

        {showProfileModal && (
          <div className="profile-modal-overlay" onClick={() => setShowProfileModal(false)}>
            <div className="profile-modal-card" onClick={(e) => e.stopPropagation()}>
              <button className="profile-modal-close" onClick={() => setShowProfileModal(false)}>
                <X size={20} />
              </button>

              <div className="profile-modal-header">
                <h3>Tree Cutter Profile</h3>
                <p className="profile-modal-sub">View personal details & update profile photo</p>
              </div>

              <div className="profile-modal-body">
                {/* Photo Upload / Edit Section */}
                <div className="profile-photo-edit-container">
                  <div className="profile-photo-avatar-box" onClick={() => fileInputRef.current?.click()} title="Click to change profile photo">
                    {profileImage ? (
                      <img src={profileImage} alt={cutterName} className="profile-photo-img" />
                    ) : (
                      <div className="profile-photo-initial">{initial}</div>
                    )}
                    <div className="profile-photo-camera-overlay" title="Click to upload / change photo">
                      <Camera size={18} />
                    </div>
                    <span className="profile-online-dot"></span>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleProfilePhotoUpload}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />

                  <div className="profile-photo-actions">
                    <button
                      className="btn-upload-photo"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingPhoto}
                    >
                      <UploadCloud size={16} /> {isUploadingPhoto ? 'Uploading...' : profileImage ? 'Change Photo' : 'Add Profile Photo'}
                    </button>
                    {profileImage && (
                      <button className="btn-remove-photo" onClick={handleRemoveProfilePhoto}>
                        Remove Photo
                      </button>
                    )}
                  </div>
                </div>

                <div className="profile-info-divider"></div>

                {/* Detailed Info Grid */}
                <div className="profile-details-grid">
                  <div className="profile-detail-item">
                    <span className="detail-label">Full Name</span>
                    <span className="detail-val highlight">{cutterName}</span>
                  </div>
                  <div className="profile-detail-item">
                    <span className="detail-label">Verification & Status</span>
                    <div className="detail-badges">
                      <span className="cutter-verified-badge"><ShieldCheck size={14} /> Verified Arborist</span>
                      <span className="cutter-status-pill"><span className="pulse-dot"></span> On Active Field Duty</span>
                    </div>
                  </div>
                  <div className="profile-detail-item">
                    <span className="detail-label">Designation & Role</span>
                    <span className="detail-val"><Briefcase size={14} /> {cutterRole} & Field Specialist</span>
                  </div>
                  <div className="profile-detail-item">
                    <span className="detail-label">Employee / Cutter ID</span>
                    <span className="detail-val ID-tag"><strong>{cutterId}</strong></span>
                  </div>
                  <div className="profile-detail-item">
                    <span className="detail-label">Assigned Operating Zone</span>
                    <span className="detail-val"><MapPin size={14} /> Udupi Municipal Zone</span>
                  </div>
                  <div className="profile-detail-item">
                    <span className="detail-label">Email Address</span>
                    <span className="detail-val"><Mail size={14} /> {cutterEmail}</span>
                  </div>
                  <div className="profile-detail-item">
                    <span className="detail-label">Contact Phone</span>
                    <span className="detail-val"><Phone size={14} /> {cutterPhone}</span>
                  </div>
                </div>

                {/* Quick Stats Summary */}
                <div className="profile-modal-stats">
                  <div className="p-stat">
                    <span>Assigned To Me</span>
                    <strong>{userAssignedCount}</strong>
                  </div>
                  <div className="p-stat">
                    <span>Completed By Me</span>
                    <strong>{userCompletedCount}</strong>
                  </div>
                  <div className="p-stat">
                    <span>Total Orders</span>
                    <strong>{totalOrdersCount}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <main className="cg-page">

          <section className="cg-admin-head">
            <div>
              <span>Operations Control</span>
              <h1>My Assigned Tree Cutting Tasks</h1>
              <p>Tasks assigned by officials appear here immediately after dispatch.</p>
            </div>
          </section>

          <section className="task-hero-card">
            <div className="task-hero-copy">
              <span className="task-pill">Field operations</span>
              <h2>Task board for today’s tree cutting work</h2>
              <p>Track assignments, confirm arrival, upload proof, and close out disposal work from one streamlined view.</p>
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

          {notice && <div className="official-notice"><CheckCircle2 size={18} /> {notice}</div>}

          <section className="cg-task-grid cutter-work-grid task-workspace">
            <aside className="cg-task-left cutter-task-list task-sidebar">
              {/* Work Orders Card */}
              <div className="cg-panel top-line" style={{ padding: '16px' }}>
                <div 
                  onClick={() => setExpandedSection(expandedSection === 'work-orders' ? null : 'work-orders')}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
                >
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', color: '#1b4332' }}>
                    <FileText size={18} /> Work Orders
                  </h3>
                  {expandedSection === 'work-orders' ? <ChevronDown size={18} color="#059669" /> : <ChevronRight size={18} color="#9ca3af" />}
                </div>

                {expandedSection === 'work-orders' && (
                  <div style={{ marginTop: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                      <select
                        value={taskFilter}
                        onChange={(e) => setTaskFilter(e.target.value)}
                        className="task-filter-dropdown"
                        title="Filter work orders list"
                        style={{ width: '100%' }}
                      >
                        <option value="my-tasks">👤 Show Only My Tasks</option>
                        <option value="all">🌐 Show All Tasks</option>
                        <option value="in-progress">⚡ In Progress</option>
                        <option value="completed">✓ Completed</option>
                      </select>
                    </div>

                    {filteredTasks.length === 0 ? (
                      <div style={{ padding: '16px 12px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                        No tasks match the selected filter.
                      </div>
                    ) : (
                      <div className="scrollable-task-list" style={{ maxHeight: '280px', overflowY: 'auto', paddingRight: '6px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                            <small style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#1b4332', fontWeight: 600, marginTop: '2px' }}>
                              <Users size={12} /> {task.cutter || 'Unassigned'}
                            </small>
                            <i className={`tag ${statusTone(task.status)}`}>{task.status}</i>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Site Location Card */}
              <div className="cg-panel top-line" style={{ padding: '16px' }}>
                <div 
                  onClick={() => setExpandedSection(expandedSection === 'site-location' ? null : 'site-location')}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
                >
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', color: '#1b4332' }}>
                    <MapPin size={18} /> Site Location
                  </h3>
                  {expandedSection === 'site-location' ? <ChevronDown size={18} color="#059669" /> : <ChevronRight size={18} color="#9ca3af" />}
                </div>

                {expandedSection === 'site-location' && (
                  <div className="scrollable-task-list" style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '6px', marginTop: '14px' }}>
                    <h2>{selectedTask?.location}</h2>
                    <p>{selectedTask?.title}</p>
                    <div className="mini-map" style={{ height: '200px', position: 'relative', overflow: 'hidden', borderRadius: '12px', border: '1px solid #cbd5e1', marginTop: '12px' }}>
                      <MapContainer
                        key={selectedTask?.id || 'default'}
                        center={[13.3409, 74.7421]}
                        zoom={14}
                        scrollWheelZoom={false}
                        style={{ height: '100%', width: '100%' }}
                        zoomControl={true}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker position={[13.3409, 74.7421]}>
                          <Popup>
                            <div style={{ minWidth: '160px' }}>
                              <strong style={{ display: 'block', marginBottom: '4px', color: '#1b4332' }}>
                                📍 {selectedTask?.title || 'Task Location'}
                              </strong>
                              <span style={{ display: 'block', color: '#4b5563', fontSize: '13px', marginBottom: '4px' }}>
                                {selectedTask?.location || 'Udupi, Karnataka'}
                              </span>
                              <span style={{ color: '#6b7280', fontSize: '12px' }}>
                                Assigned to: {selectedTask?.cutter || 'Unassigned'}
                              </span>
                            </div>
                          </Popup>
                        </Marker>
                      </MapContainer>
                      <a
                        href={`https://www.google.com/maps?q=13.3409,74.7421`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          position: 'absolute',
                          bottom: '10px',
                          right: '10px',
                          padding: '6px 12px',
                          fontSize: '0.8rem',
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          textDecoration: 'none',
                          color: '#1e293b',
                          fontWeight: 600,
                          zIndex: 1000,
                          boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                        }}
                      >
                        <Navigation size={14} /> Open in Google Maps
                      </a>
                    </div>

                    <style dangerouslySetInnerHTML={{
                      __html: `
                      @keyframes pulse {
                        0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
                        70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
                        100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
                      }
                    `}} />

                    <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', background: '#ecfdf5', border: '1px solid #a7f3d0', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '10px', color: '#065f46' }}>
                      <span className="live-status-pulse" style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', animation: 'pulse 1.5s infinite' }}></span>
                      <span><b>My Live Location:</b> {cutterLiveCoords ? `${cutterLiveCoords.lat}, ${cutterLiveCoords.lng}` : 'Determining live coordinates...'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Assigned Person Card */}
              <div className="cg-panel" style={{ padding: '16px' }}>
                <div 
                  onClick={() => setExpandedSection(expandedSection === 'assigned-person' ? null : 'assigned-person')}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
                >
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', color: '#1b4332' }}>
                    <Users size={18} /> Assigned Person
                  </h3>
                  {expandedSection === 'assigned-person' ? <ChevronDown size={18} color="#059669" /> : <ChevronRight size={18} color="#9ca3af" />}
                </div>

                {expandedSection === 'assigned-person' && (
                  <div style={{ marginTop: '14px' }}>
                    <div className="team-line" style={{ padding: '12px', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                      <div className="avatar" style={{ background: '#1b4332', color: '#fff', width: '42px', height: '42px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.95rem', flexShrink: 0 }}>
                        {(selectedTask?.cutter || 'TC').split(' ').map(part => part[0]).join('').slice(0, 2)}
                      </div>
                      <p style={{ margin: 0 }}>
                        <b style={{ display: 'block', fontSize: '1rem', color: '#1b4332' }}>{selectedTask?.cutter || 'Unassigned'}</b>
                        <span style={{ fontSize: '0.82rem', color: '#4b5563' }}>Assigned by Official Management</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
              {isCutter && (
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <Link
                    to="/property-inventory"
                    className="cg-btn primary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      width: '100%',
                      padding: '12px 18px',
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      borderRadius: '12px',
                      background: '#1b4332',
                      color: '#ffffff',
                      textDecoration: 'none',
                      boxShadow: '0 4px 14px rgba(27,67,50,0.25)',
                      cursor: 'pointer',
                      boxSizing: 'border-box'
                    }}
                  >
                    <ShoppingCart size={18} /> Purchase Equipment
                  </Link>
                  <Link
                    to="/attendance"
                    className="cg-btn outline"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      width: '100%',
                      padding: '12px 18px',
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      borderRadius: '12px',
                      background: '#ecfdf5',
                      border: '1.5px solid #059669',
                      color: '#065f46',
                      textDecoration: 'none',
                      cursor: 'pointer',
                      boxSizing: 'border-box'
                    }}
                  >
                    <Fingerprint size={18} /> Mark Attendance
                  </Link>
                </div>
              )}
            </aside>
            <section className="cg-task-main task-main-column">
              <div className="cg-panel instructions task-instructions-card">
                <header>
                  <div>
                    <h3><FileText /> Task briefing</h3>
                    <p>{selectedTask?.title}</p>
                  </div>
                  <span className="task-due-chip">Due: {selectedTask?.dueDate || 'Not scheduled'}</span>
                </header>
                <p>Visit the assigned location, upload before-work proof, mark work in progress, complete the work, and confirm waste disposal with GPS evidence.</p>
                <div className="fact-chip-row">{[
                  `Assigned To|${selectedTask?.cutter || 'Unassigned'}`,
                  `Priority|${selectedTask?.priority || 'Medium'}`,
                  `Source|${selectedTask?.source || 'Official'}`,
                  `Progress|${selectedTask?.progress || 0}%`,
                  `Status|${selectedTask?.status}`,
                ].map((item) => {
                  const [a, b] = item.split('|');
                  return <span key={a} className="fact-chip"><b>{a}</b>{b}</span>;
                })}</div>
                {!isTaskAssignedToMe && (
                  <div style={{ marginTop: '16px', padding: '12px 16px', borderRadius: '10px', background: '#fffbeb', border: '1.5px solid #fef3c7', color: '#b45309', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                    ⚠️ This task is assigned to {selectedTask?.cutter || 'another cutter'}. You can only view details.
                  </div>
                )}
              </div>
              {selectedTask && (selectedTask.replantationStatus === 'Pending' || selectedTask.replantationStatus === 'Scheduled' || selectedTask.replantationStatus === 'Planted') ? (
                <div className="cg-panel step active cutter-step-card" style={{ marginBottom: '20px', borderLeft: '4px solid #10b981', background: '#f0fdf4' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#166534' }}>
                      <span style={{ fontSize: '1.5rem' }}>🌱</span> Eco-Restore Sapling Replantation
                    </h3>
                    <span className={`tag ${selectedTask.replantationStatus === 'Planted' ? 'ok' : 'low'}`} style={{ fontWeight: 800 }}>
                      {selectedTask.replantationStatus === 'Planted' ? '✓ Sapling Planted & Registered' : 'Plantation Pending'}
                    </span>
                  </div>
                  <p style={{ color: '#166534', fontSize: '0.92rem', marginBottom: '20px', lineHeight: '1.5' }}>
                    A dead tree was removed at this site. As part of our municipal forest mandate, please plant a new sapling at these coordinates, take a photo, and register the new tree in our system.
                  </p>

                  {selectedTask.replantationStatus === 'Planted' ? (
                    <div className="step-confirmed-banner green-theme" style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: '12px', padding: '16px', display: 'flex', gap: '14px' }}>
                      <div className="confirmed-icon-circle green" style={{ width: '48px', height: '48px', background: '#166534', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle2 size={24} /></div>
                      <div>
                        <strong style={{ color: '#166534', display: 'block', fontSize: '1.05rem' }}>Sapling Planted & Logged!</strong>
                        <span style={{ color: '#15803d', fontSize: '0.88rem' }}>The new tree has been successfully registered in the Tree Inventory.</span>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.target;
                      const saplingName = form.saplingName.value;
                      const scientificName = form.scientificName.value;
                      const family = form.family.value;
                      const origin = form.origin.value;
                      const category = form.category.value;
                      const height = form.height.value;
                      const lifespan = form.lifespan.value;
                      const canopySpread = form.canopySpread.value;
                      const waterRequirement = form.waterRequirement.value;
                      const canopyCoverage = form.canopyCoverage.value;
                      const growthRate = form.growthRate.value;
                      const leafType = form.leafType.value;
                      const floweringSeason = form.floweringSeason.value;
                      const fruitingSeason = form.fruitingSeason.value;
                      const climate = form.climate.value;
                      const soilType = form.soilType.value;
                      const sunlight = form.sunlight.value;
                      const benefits = form.benefits.value;
                      const diseases = form.diseases.value;
                      const pests = form.pests.value;
                      const description = form.description.value;
                      const notes = form.notes.value;
                      const file = form.saplingImage.files[0];

                      if (!saplingName || !scientificName) {
                        Swal.fire({ icon: 'error', title: 'Missing Info', text: 'Please provide sapling name and scientific name.' });
                        return;
                      }

                      Swal.fire({
                        title: 'Registering Sapling...',
                        text: 'Adding sapling to inventory and updating status',
                        allowOutsideClick: false,
                        didOpen: () => { Swal.showLoading(); }
                      });

                      let imageUrl = '';
                      if (file) {
                        try {
                          const formData = new FormData();
                          formData.append('image', file);
                          const uploadRes = await fetch(`${API_URL}/api/upload`, {
                            method: 'POST',
                            body: formData
                          });
                          if (uploadRes.ok) {
                            const uploadData = await uploadRes.json();
                            imageUrl = `${API_URL}${uploadData.url}`;
                          }
                        } catch (err) {
                          console.error('Image upload failed', err);
                        }
                      }

                      try {
                        const replantRes = await fetch(`${API_URL}/api/complaints/${selectedTask.complaintId}/replant`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            name: saplingName,
                            scientificName,
                            family,
                            origin,
                            category,
                            lifespan,
                            height,
                            canopySpread,
                            waterRequirement,
                            canopyCoverage,
                            growthRate,
                            leafType,
                            floweringSeason,
                            fruitingSeason,
                            climate,
                            soilType,
                            sunlight,
                            benefits,
                            diseases,
                            pests,
                            description: description || `Young ${saplingName} planted to replace removed dead tree.`,
                            notes,
                            image: imageUrl,
                            lat: selectedTask.beforeGps?.lat || 13.3409,
                            lng: selectedTask.beforeGps?.lng || 74.7421
                          })
                        });

                        if (replantRes.ok) {
                          Swal.fire({
                            icon: 'success',
                            title: 'Sapling Planted!',
                            text: 'The young tree has been added to the inventory database.',
                            confirmButtonColor: '#10b981'
                          });
                          
                          saveAllTasks(all => all.map(t => t.id === selectedTask.id ? { ...t, replantationStatus: 'Planted', status: 'Closed', progress: 100 } : t));
                        } else {
                          throw new Error('Failed to register replantation');
                        }
                      } catch (err) {
                        Swal.fire('Error', err.message, 'error');
                      }
                    }}>
                      <fieldset disabled={!isTaskAssignedToMe} style={{ border: 'none', padding: 0, margin: 0, width: '100%' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div className="form-group">
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#166534' }}>Sapling Common Name *</label>
                          <input type="text" name="saplingName" required placeholder="e.g. Indian Beech Sapling" className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                        </div>
                        <div className="form-group">
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#166534' }}>Scientific Name *</label>
                          <input type="text" name="scientificName" required placeholder="e.g. Pongamia pinnata" className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div className="form-group">
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#166534' }}>Family</label>
                          <input type="text" name="family" placeholder="e.g. Fabaceae" className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                        </div>
                        <div className="form-group">
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#166534' }}>Origin / Location</label>
                          <input type="text" name="origin" placeholder="e.g. Native" className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                        </div>
                        <div className="form-group">
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#166534' }}>Category</label>
                          <input type="text" name="category" placeholder="e.g. Evergreen Tree" className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div className="form-group">
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#166534' }}>Height</label>
                          <input type="text" name="height" placeholder="e.g. 0.5 - 1.5 m" className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                        </div>
                        <div className="form-group">
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#166534' }}>Lifespan / Age Range</label>
                          <input type="text" name="lifespan" placeholder="e.g. 100 years" className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                        </div>
                        <div className="form-group">
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#166534' }}>Canopy Spread</label>
                          <input type="text" name="canopySpread" placeholder="e.g. 2 m" className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div className="form-group">
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#166534' }}>Water Requirement</label>
                          <select name="waterRequirement" className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', background: '#fff' }}>
                            <option value="Low">Low</option>
                            <option value="Medium" selected>Medium</option>
                            <option value="High">High</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#166534' }}>Canopy Coverage (%)</label>
                          <input type="number" name="canopyCoverage" min="0" max="100" defaultValue="10" className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                        </div>
                        <div className="form-group">
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#166534' }}>Growth Rate</label>
                          <input type="text" name="growthRate" placeholder="e.g. Moderate" className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div className="form-group">
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#166534' }}>Leaf Type</label>
                          <input type="text" name="leafType" placeholder="e.g. Broadleaf" className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                        </div>
                        <div className="form-group">
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#166534' }}>Flowering Season</label>
                          <input type="text" name="floweringSeason" placeholder="e.g. Spring" className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                        </div>
                        <div className="form-group">
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#166534' }}>Fruiting Season</label>
                          <input type="text" name="fruitingSeason" placeholder="e.g. Summer" className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div className="form-group">
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#166534' }}>Climate Type</label>
                          <input type="text" name="climate" placeholder="e.g. Tropical" className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                        </div>
                        <div className="form-group">
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#166534' }}>Soil Type</label>
                          <input type="text" name="soilType" placeholder="e.g. Sandy Loam" className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                        </div>
                        <div className="form-group">
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#166534' }}>Sunlight Exposure</label>
                          <input type="text" name="sunlight" placeholder="e.g. Full Sun" className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div className="form-group">
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#166534' }}>Ecological Benefits (comma-separated)</label>
                          <input type="text" name="benefits" placeholder="e.g. Shade, Soil enrichment" className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                        </div>
                        <div className="form-group">
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#166534' }}>Pests Susceptibility</label>
                          <input type="text" name="pests" placeholder="e.g. Aphids" className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                        </div>
                        <div className="form-group">
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#166534' }}>Diseases Susceptibility</label>
                          <input type="text" name="diseases" placeholder="e.g. Root rot" className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                        </div>
                      </div>

                      <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#166534' }}>Sapling Description</label>
                        <textarea name="description" placeholder="Enter short details about the sapling..." className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', height: '60px', boxSizing: 'border-box', resize: 'vertical' }}></textarea>
                      </div>

                      <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#166534' }}>Cutter Field Notes</label>
                        <textarea name="notes" placeholder="Enter notes from the field planting..." className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', height: '60px', boxSizing: 'border-box', resize: 'vertical' }}></textarea>
                      </div>

                      <div className="form-group" style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#166534' }}>Upload Sapling Photo (Optional)</label>
                        <input type="file" name="saplingImage" accept="image/*" className="form-input" style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', boxSizing: 'border-box' }} />
                      </div>

                      <button type="submit" className="btn-action-primary emerald-glow" style={{ width: '100%', padding: '12px', fontWeight: 700, borderRadius: '8px', cursor: 'pointer', background: '#10b981', color: '#fff', border: 'none', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        Complete Replantation & Register Tree
                      </button>
                      </fieldset>
                    </form>
                  )}
                </div>
              ) : (
                <>
                  {/* ── STEP-BY-STEP WORKFLOW WIZARD HEADER ── */}
              <div className="task-step-wizard-bar" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '16px 20px',
                borderRadius: '16px',
                border: '1px solid #cbd5e1',
                boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                marginBottom: '20px'
              }}>
                {/* Step 1 Tab */}
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: activeStep === 1 ? '2px solid #10b981' : step1Complete ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                    background: activeStep === 1 ? '#ecfdf5' : step1Complete ? '#f0fdf4' : '#f8fafc',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: step1Complete ? '#10b981' : activeStep === 1 ? '#043224' : '#cbd5e1',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    flexShrink: 0
                  }}>
                    {step1Complete ? <CheckCircle2 size={18} /> : '1'}
                  </div>
                  <div>
                    <b style={{ display: 'block', fontSize: '0.95rem', color: activeStep === 1 ? '#043224' : '#334155' }}>
                      Step 1: Arrival
                    </b>
                    <span style={{ fontSize: '0.78rem', color: step1Complete ? '#059669' : '#64748b' }}>
                      {step1Complete ? '✓ Arrival & Photo Done' : 'Check-in & Photo'}
                    </span>
                  </div>
                </button>

                <ArrowRight size={18} style={{ color: '#94a3b8', flexShrink: 0 }} />

                {/* Step 2 Tab */}
                <button
                  type="button"
                  onClick={() => step1Complete && setActiveStep(2)}
                  disabled={!step1Complete}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: activeStep === 2 ? '2px solid #10b981' : step2Complete ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                    background: activeStep === 2 ? '#ecfdf5' : step2Complete ? '#f0fdf4' : step1Complete ? '#ffffff' : '#f1f5f9',
                    opacity: !step1Complete ? 0.6 : 1,
                    cursor: step1Complete ? 'pointer' : 'not-allowed',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: step2Complete ? '#10b981' : activeStep === 2 ? '#043224' : step1Complete ? '#3b82f6' : '#cbd5e1',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    flexShrink: 0
                  }}>
                    {step2Complete ? <CheckCircle2 size={18} /> : '2'}
                  </div>
                  <div>
                    <b style={{ display: 'block', fontSize: '0.95rem', color: activeStep === 2 ? '#043224' : '#334155' }}>
                      Step 2: Cutting Work
                    </b>
                    <span style={{ fontSize: '0.78rem', color: step2Complete ? '#059669' : step1Complete ? '#3b82f6' : '#94a3b8' }}>
                      {step2Complete ? '✓ Work Completed' : step1Complete ? 'In Progress' : 'Locked'}
                    </span>
                  </div>
                </button>

                <ArrowRight size={18} style={{ color: '#94a3b8', flexShrink: 0 }} />

                {/* Step 3 Tab */}
                <button
                  type="button"
                  onClick={() => step2Complete && setActiveStep(3)}
                  disabled={!step2Complete}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: activeStep === 3 ? '2px solid #10b981' : step3Complete ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                    background: activeStep === 3 ? '#ecfdf5' : step3Complete ? '#f0fdf4' : step2Complete ? '#ffffff' : '#f1f5f9',
                    opacity: !step2Complete ? 0.6 : 1,
                    cursor: step2Complete ? 'pointer' : 'not-allowed',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: step3Complete ? '#10b981' : activeStep === 3 ? '#043224' : step2Complete ? '#059669' : '#cbd5e1',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    flexShrink: 0
                  }}>
                    {step3Complete ? <CheckCircle2 size={18} /> : '3'}
                  </div>
                  <div>
                    <b style={{ display: 'block', fontSize: '0.95rem', color: activeStep === 3 ? '#043224' : '#334155' }}>
                      Step 3: Waste Disposal
                    </b>
                    <span style={{ fontSize: '0.78rem', color: step3Complete ? '#059669' : step2Complete ? '#059669' : '#94a3b8' }}>
                      {step3Complete ? '✓ Waste Disposed' : step2Complete ? 'Ready for Disposal' : 'Locked'}
                    </span>
                  </div>
                </button>
              </div>

              {/* ── STEP 1 PAGE CONTENT ── */}
              {activeStep === 1 && (
                <div className="cg-panel step cutter-step-card" style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0 }}><MapPin style={{ color: '#10b981', marginRight: '6px' }} /> Step 1: Site Arrival & Initial Proof</h3>
                    {step1Complete && <span className="tag ok">✓ Step 1 Complete</span>}
                  </div>
                  <p style={{ color: '#4b5563', fontSize: '0.9rem', marginBottom: '16px' }}>
                    Confirm your arrival at the assigned task location and upload a geo-tagged photo of the tree condition before work starts.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {(selectedTask?.status !== 'Assigned' && selectedTask?.status !== 'Scheduled') ? (
                      <div className="step-confirmed-banner">
                        <div className="confirmed-icon-circle"><CheckCircle2 size={24} /></div>
                        <div>
                          <strong>Site Arrival Confirmed</strong>
                          <span>Arrival timestamp & location logged successfully</span>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="btn-action-primary emerald-glow"
                        onClick={() => markArrival(selectedTask?.id)}
                        disabled={!isTaskAssignedToMe}
                      >
                        <MapPin size={20} /> Confirm Site Arrival
                      </button>
                    )}

                    {selectedTask?.beforeImageUrl ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div className="photo-proof-card">
                          <img src={selectedTask.beforeImageUrl} alt="Before work proof" className="photo-proof-img" />
                          <div className="photo-proof-overlay">
                            <span className="geo-tag-pill">
                              📍 {selectedTask.beforeGps?.lat ? `${selectedTask.beforeGps.lat}, ${selectedTask.beforeGps.lng}` : 'Geo-Tagged'}
                            </span>
                            <span className="proof-status-pill">
                              <CheckCircle2 size={13} /> Initial Proof Uploaded
                            </span>
                          </div>
                        </div>
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

                  <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
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
                <div className="cg-panel step active cutter-step-card" style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0 }}><Play style={{ color: '#3b82f6', marginRight: '6px' }} /> Step 2: Tree Cutting Work & Proof</h3>
                    <span className="tag info">{selectedTask?.progress || 0}% Completed</span>
                  </div>
                  <p style={{ color: '#4b5563', fontSize: '0.9rem', marginBottom: '16px' }}>
                    Mark work in progress, upload progress & after-work geo-tagged photos, then click "Mark Work Completed".
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {selectedTask?.status === 'In Progress' || selectedTask?.status === 'Work Completed' || selectedTask?.status === 'Waste Disposed' ? (
                      <div className="step-confirmed-banner blue-theme">
                        <div className="confirmed-icon-circle blue"><Play size={22} /></div>
                        <div>
                          <strong>Work In Progress Logged</strong>
                          <span>Field operations active for this work order</span>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="btn-action-primary blue-glow"
                        onClick={() => startWork(selectedTask?.id)}
                        disabled={!isTaskAssignedToMe || selectedTask?.status !== 'Reached Location' || selectedTask?.beforeImage !== 'Submitted'}
                      >
                        <Play size={20} /> Start / Mark Work In Progress
                      </button>
                    )}

                    {/* Progress Photo */}
                    {selectedTask?.progressImageUrl ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div className="photo-proof-card">
                          <img src={selectedTask.progressImageUrl} alt="Work progress proof" className="photo-proof-img" />
                          <div className="photo-proof-overlay">
                            <span className="geo-tag-pill">
                              📍 {selectedTask.progressGps?.lat ? `${selectedTask.progressGps.lat}, ${selectedTask.progressGps.lng}` : 'Geo-Tagged'}
                            </span>
                            <span className="proof-status-pill">
                              <CheckCircle2 size={13} /> Work Progress Uploaded
                            </span>
                          </div>
                        </div>
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
                        <div className="photo-proof-card">
                          <img src={selectedTask.afterImageUrl} alt="After work proof" className="photo-proof-img" />
                          <div className="photo-proof-overlay">
                            <span className="geo-tag-pill">
                              📍 {selectedTask.afterGps?.lat ? `${selectedTask.afterGps.lat}, ${selectedTask.afterGps.lng}` : 'Geo-Tagged'}
                            </span>
                            <span className="proof-status-pill">
                              <CheckCircle2 size={13} /> After-Work Proof Uploaded
                            </span>
                          </div>
                        </div>
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
                      <div className="step-confirmed-banner green-theme">
                        <div className="confirmed-icon-circle green"><CheckCircle2 size={24} /></div>
                        <div>
                          <strong>Tree Cutting Work Completed</strong>
                          <span>Field completion proof submitted & verified</span>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="btn-action-primary emerald-glow"
                        onClick={() => completeWork(selectedTask.id)}
                        disabled={!isTaskAssignedToMe || selectedTask?.afterImage !== 'Submitted' || selectedTask?.progressImage !== 'Submitted'}
                      >
                        <CheckCircle2 size={20} /> Mark Work Completed
                      </button>
                    )}
                  </div>

                  <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                <div className="cg-panel disposal" style={{ marginBottom: '20px' }}>
                  <header>
                    <h3><Recycle style={{ color: '#10b981' }} /> Step 3: Waste Disposal & Final Sign-Off</h3>
                    <span className={`tag ${selectedTask?.status === 'Waste Disposed' ? 'ok' : 'low'}`}>
                      {selectedTask?.status === 'Waste Disposed' ? 'Waste Disposed' : 'Disposal Pending'}
                    </span>
                  </header>
                  <p style={{ color: '#4b5563', fontSize: '0.9rem', margin: '8px 0 16px' }}>
                    Record green waste volume, select government dumping site, upload disposal proof, and submit confirmation.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <label>Waste Volume (est. cubic meters)
                      <input
                        value={selectedTask?.wasteVolume || ''}
                        onChange={e => updateTask(selectedTask.id, { wasteVolume: e.target.value })}
                        placeholder="e.g. 2.5 m³"
                      />
                    </label>
                    <label>Government Dumping Location
                      <select
                        value={selectedTask?.dumpingLocation || dumpingLocations[0]}
                        onChange={e => updateDumpingLocation(selectedTask.id, e.target.value)}
                      >
                        {dumpingLocations.map(location => <option key={location}>{location}</option>)}
                      </select>
                    </label>
                    <label>Disposal Method
                      <select
                        value={selectedTask?.disposalMethod || 'Mulching / composting'}
                        onChange={e => updateTask(selectedTask.id, { disposalMethod: e.target.value })}
                      >
                        <option>Mulching / composting</option>
                        <option>Municipal green waste transfer</option>
                        <option>Bio-waste processing center</option>
                      </select>
                    </label>

                    {selectedTask?.wasteProofUrl ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div className="photo-proof-card">
                          <img src={selectedTask.wasteProofUrl} alt="Waste disposal proof" className="photo-proof-img" />
                          <div className="photo-proof-overlay">
                            <span className="geo-tag-pill">
                              📍 Dumping Location GPS Captured
                            </span>
                            <span className="proof-status-pill">
                              <CheckCircle2 size={13} /> Waste Disposal Proof Verified
                            </span>
                          </div>
                        </div>
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
                      <div className="step-confirmed-banner green-theme" style={{ flex: 1, marginLeft: '16px' }}>
                        <div className="confirmed-icon-circle green"><CheckCircle2 size={24} /></div>
                        <div>
                          <strong>Task Fully Completed & Closed</strong>
                          <span>Waste disposal confirmed successfully</span>
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
                </>
              )}
              <div className="cg-panel cutter-visit-log">
                <header><h3><MapPin /> Visit & Status Log</h3><span>{selectedTask?.visits?.length || 0} updates</span></header>
                {(selectedTask?.visits || []).map((visit, index) => (
                  <p key={`${selectedTask.id}-${index}`}><b>{visit.time}</b><span>{visit.location}</span><small>{visit.note}</small></p>
                ))}
              </div>
            </section>
          </section>
        </main>
      </div>
    </div>
  );
}

function LocationMarker({ setLocation }) {
  const [position, setPosition] = useState(null);
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
      // Fetch reverse geocode address
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.display_name) {
            setLocation(data.display_name);
          }
        })
        .catch(err => console.error('Reverse geocode error:', err));
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}
export function ReportIssuePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submittedId, setSubmittedId] = useState(null);

  const issueTypes = [
    { id: 'damaged', label: 'Damaged', Icon: Image },
    { id: 'overhanging', label: 'Overhanging', Icon: TreePine },
    { id: 'dead', label: 'Dead / Dying', Icon: Leaf },
    { id: 'pest', label: 'Pest / Disease', Icon: AlertTriangle },
    { id: 'roots', label: 'Roots Damage', Icon: Sprout },
    { id: 'fallen', label: 'Fallen Branch', Icon: Ban },
  ];

  const progressPct = step === 1 ? '33%' : step === 2 ? '66%' : '100%';

  const handleContinue = async () => {
    if (step === 1 && !selectedIssue) return;
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    // Step 3: submit to backend
    setSubmitting(true);
    setSubmitError('');
    try {
      let uploadedPhotoUrl = '';
      if (photoFile) {
        const uploadForm = new FormData();
        uploadForm.append('image', photoFile);
        const uploadRes = await fetch(`${API_URL}/api/upload`, {
          method: 'POST',
          body: uploadForm
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          uploadedPhotoUrl = `${API_URL}${uploadData.url}`;
        } else {
          console.warn('Image upload failed, submitting report without image.');
        }
      }

      const currentUser = (() => { try { return JSON.parse(localStorage.getItem('currentUser')) || {}; } catch { return {}; } })();
      const res = await fetch(`${API_URL}/api/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issueType: selectedIssue,
          description,
          location,
          photoUrl: uploadedPhotoUrl,
          submittedBy: currentUser.name || 'Citizen',
          submittedByUserId: currentUser.id || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.msg || 'Submission failed');
      }
      setSubmittedId(data.complaint._id);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err.message || 'Could not submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhoto(URL.createObjectURL(file));
    }
  };

  if (submitted) {
    return (
      <div className="cg-report">
        <header><Link to="/home"><TreePine /> CanopyGuard</Link><Link to="/home"><X /></Link></header>
        <main>
          <div className="report-success">
            <div className="report-success-icon"><CheckCircle2 size={64} /></div>
            <h1>Issue Reported!</h1>
            <p>Your report has been submitted and will be reviewed by our team shortly.</p>
            <div className="report-success-details">
              <span><b>Issue Type:</b> {issueTypes.find(i => i.id === selectedIssue)?.label}</span>
              <span><b>Location:</b> {location || 'Not specified'}</span>
              {submittedId && <span><b>Tracking ID:</b> <code style={{ background: '#e8f5e9', padding: '2px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>{submittedId}</code></span>}
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '8px' }}>
              {submittedId && (
                <Link className="cg-btn primary" to={`/track/${submittedId}`}>Track Your Report →</Link>
              )}
              <Link className="cg-btn outline" to="/dashboard">Back to Dashboard</Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="cg-report">
      <header>
        <Link to="/home"><TreePine /> CanopyGuard</Link>
        <Link to="/home"><X /></Link>
      </header>
      <main>
        <section className="report-title">
          <h1>Report an Issue</h1>
          <b>Step {step} of 3</b>
          <i style={{ background: `linear-gradient(90deg, var(--forest) ${progressPct}, #e4e9e6 ${progressPct})` }}></i>
        </section>

        {step === 1 && (
          <form className="cg-report-card" onSubmit={e => e.preventDefault()}>
            <h2>Issue Details</h2>
            <label>What is the issue?</label>
            <div className="issue-options issue-options-grid">
              {issueTypes.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  className={selectedIssue === id ? 'selected' : ''}
                  onClick={() => setSelectedIssue(id)}
                >
                  <Icon size={28} />
                  {label}
                </button>
              ))}
            </div>
            {!selectedIssue && (
              <p className="report-hint">Please select an issue type to continue.</p>
            )}
            <label>
              Description
              <textarea
                placeholder="Tell us more about the tree's condition..."
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </label>
          </form>
        )}

        {step === 2 && (
          <form className="cg-report-card" onSubmit={e => e.preventDefault()}>
            <h2>Location &amp; Photo</h2>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Location / Address</span>
                <button
                  type="button"
                  onClick={async () => {
                    if (!navigator.geolocation) {
                      alert('Geolocation is not supported by your browser');
                      return;
                    }
                    setLocation('Detecting live location...');
                    navigator.geolocation.getCurrentPosition(
                      async (position) => {
                        const lat = position.coords.latitude;
                        const lng = position.coords.longitude;
                        setLocation(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
                        try {
                          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                          const data = await res.json();
                          if (data && data.display_name) {
                            setLocation(data.display_name);
                          }
                        } catch (err) {
                          console.error('Reverse geocoding error:', err);
                        }
                      },
                      (err) => {
                        alert('Unable to retrieve location. Please check your permissions.');
                        setLocation('');
                      },
                      { enableHighAccuracy: true, timeout: 8000 }
                    );
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    fontSize: '0.78rem',
                    background: '#e0f2fe',
                    color: '#0369a1',
                    border: '1px solid #bae6fd',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  <MapPin size={12} /> Use Live Location
                </button>
              </div>
              <input
                className="report-input"
                placeholder="e.g. 482 Oak Street, near Central Park"
                value={location}
                onChange={e => setLocation(e.target.value)}
                style={{ marginBottom: '10px' }}
              />
            </label>
            <p className="report-hint" style={{ marginBottom: '10px' }}>Or select the location on the map below:</p>
            <div className="map-wrapper" style={{ height: '250px', width: '100%', marginBottom: '20px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #d1d5db' }}>
              <MapContainer center={[15.3173, 75.7139]} zoom={7} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationMarker setLocation={setLocation} />
              </MapContainer>
            </div>
            <label>Upload Photo (optional)</label>
            <div className="report-upload" onClick={() => document.getElementById('report-photo-input').click()}>
              {photo
                ? <img src={photo} alt="Preview" className="report-photo-preview" />
                : <><UploadCloud size={40} /><b>Click to upload a photo</b><span>JPEG or PNG, Max 10MB</span></>}
            </div>
            <input
              id="report-photo-input"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoChange}
            />
            <div className="report-summary">
              <b>Issue Type:</b>
              <span>{issueTypes.find(i => i.id === selectedIssue)?.label}</span>
            </div>
          </form>
        )}

        {step === 3 && (
          <form className="cg-report-card" onSubmit={e => e.preventDefault()}>
            <h2>Review &amp; Submit</h2>
            <div className="report-review">
              <div className="report-review-row"><b>Issue Type</b><span>{issueTypes.find(i => i.id === selectedIssue)?.label}</span></div>
              <div className="report-review-row"><b>Description</b><span>{description || <i>None provided</i>}</span></div>
              <div className="report-review-row"><b>Location</b><span>{location || <i>Not specified</i>}</span></div>
              <div className="report-review-row">
                <b>Photo</b>
                <span>{photo ? <img src={photo} alt="Uploaded" className="report-thumb" /> : <i>No photo uploaded</i>}</span>
              </div>
            </div>
            <p className="report-hint">Please review the details above before submitting. Once submitted, our team will be notified immediately.</p>
          </form>
        )}

        {submitError && (
          <p className="report-error">{submitError}</p>
        )}
        <div className="report-actions">
          {step > 1 && (
            <button className="cg-btn outline" onClick={() => setStep(step - 1)} disabled={submitting}>Back</button>
          )}
          <button
            className="cg-btn primary wide"
            onClick={handleContinue}
            disabled={(step === 1 && !selectedIssue) || submitting}
            style={{ opacity: (step === 1 && !selectedIssue) || submitting ? 0.5 : 1 }}
          >
            {submitting ? 'Submitting…' : step === 3 ? 'Submit Report' : 'Continue'}
          </button>
        </div>
      </main>
    </div>
  );
}

export function SchedulerPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [complaints, setComplaints] = useState([]);
  const [cutters, setCutters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [deletedIds, setDeletedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('deleted_complaint_ids') || '[]');
    } catch {
      return [];
    }
  });

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedulingLoading, setSchedulingLoading] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    assignedTo: '',
    title: '',
    issueType: 'routine',
    location: '',
    description: '',
    priority: 'Medium',
    equipment: 'Bucket Truck & Chainsaw',
    scheduledDate: new Date().toISOString().slice(0, 10),
  });

  // Default realistic sample tasks if database is initial empty
  const defaultSampleTasks = [
    {
      _id: 'samp_1',
      issueType: 'routine',
      location: 'Central Park Banyan Tree Sector 4, Ajjarkadu, Udupi',
      description: 'Monthly canopy health inspection and structural branch pruning.',
      assignedTo: 'Boxy',
      status: 'Scheduled',
      priority: 'Routine',
      equipment: '🪜 Bucket Truck',
      scheduledDate: new Date(new Date().getFullYear(), new Date().getMonth(), 5).toISOString(),
      createdAt: new Date().toISOString()
    },
    {
      _id: 'samp_2',
      issueType: 'overhanging',
      location: 'Manipal Lake Promenade Road, Zone 2',
      description: 'Clear overhanging branches obstructing streetlights and power cables.',
      assignedTo: 'Ramesh Kumar',
      status: 'In Progress',
      priority: 'High',
      equipment: '🪓 Chainsaw & Chipper',
      scheduledDate: new Date(new Date().getFullYear(), new Date().getMonth(), 8).toISOString(),
      createdAt: new Date().toISOString()
    },
    {
      _id: 'samp_3',
      issueType: 'pest',
      location: 'MG Road Heritage Neem Corridor, Udupi',
      description: 'Fungal leaf spot treatment and eco-safe bio-pesticide spray.',
      assignedTo: 'Suresh Poojary',
      status: 'Scheduled',
      priority: 'Medium',
      equipment: '🦺 Safety Spray Rig',
      scheduledDate: new Date(new Date().getFullYear(), new Date().getMonth(), 12).toISOString(),
      createdAt: new Date().toISOString()
    },
    {
      _id: 'samp_4',
      issueType: 'roots',
      location: 'City Bus Stand Circle, Kalsanka, Udupi',
      description: 'Root barrier installation to prevent pavement damage.',
      assignedTo: 'Vijay Shetty',
      status: 'Scheduled',
      priority: 'High',
      equipment: '🚜 Root Trencher',
      scheduledDate: new Date(new Date().getFullYear(), new Date().getMonth(), 18).toISOString(),
      createdAt: new Date().toISOString()
    }
  ];

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/complaints`).then(r => r.json()),
      fetch(`${API_URL}/api/auth/cutters`).then(r => r.json())
    ])
      .then(([complaintsData, cuttersData]) => {
        const fetchedComplaints = complaintsData.complaints || [];
        const combined = fetchedComplaints.length > 0 ? fetchedComplaints : defaultSampleTasks;
        const active = combined.filter(c => !deletedIds.includes(c._id) && !deletedIds.includes(c.id));
        setComplaints(active);

        const fetchedCutters = cuttersData.cutters || [];
        const defaultCuttersList = [
          { _id: 'c1', name: 'Boxy', phone: '+91 98450 12345' },
          { _id: 'c2', name: 'Ramesh Kumar', phone: '+91 97412 88910' },
          { _id: 'c3', name: 'Suresh Poojary', phone: '+91 94481 22334' },
          { _id: 'c4', name: 'Vijay Shetty', phone: '+91 96110 55443' }
        ];
        setCutters(fetchedCutters.length > 0 ? fetchedCutters : defaultCuttersList);
      })
      .catch(err => {
        console.error('Failed to load scheduler data', err);
        setComplaints(defaultSampleTasks.filter(c => !deletedIds.includes(c._id)));
      })
      .finally(() => setLoading(false));
  }, []);

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const monthName = currentMonthDate.toLocaleString('default', { month: 'long' });

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const calendarCells = [];
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    calendarCells.push({ day: prevMonthDays - i, isCurrentMonth: false, isPrevMonth: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push({ day: d, isCurrentMonth: true });
  }
  const totalSlots = Math.ceil(calendarCells.length / 7) * 7;
  let nextDay = 1;
  while (calendarCells.length < totalSlots) {
    calendarCells.push({ day: nextDay++, isCurrentMonth: false, isNextMonth: true });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isPastDate = (cellDay, isCurrentMonth, isPrevMonth) => {
    if (isPrevMonth) return true;
    if (!isCurrentMonth) return false;
    const cellDate = new Date(year, month, cellDay, 0, 0, 0, 0);
    return cellDate < today;
  };

  const isCurrentOrFutureMonth = () => {
    const realCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const viewMonth = new Date(year, month, 1);
    return viewMonth > realCurrentMonth;
  };

  const prevMonth = () => {
    if (isCurrentOrFutureMonth()) {
      setCurrentMonthDate(new Date(year, month - 1, 1));
    }
  };

  const nextMonth = () => setCurrentMonthDate(new Date(year, month + 1, 1));

  // Timezone-safe date parser
  const getTaskDate = (c) => {
    const raw = c.scheduledDate || c.createdAt;
    if (!raw) return new Date();
    if (typeof raw === 'string' && raw.includes('-')) {
      const parts = raw.split('T')[0].split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          return new Date(y, m, d);
        }
      }
    }
    return new Date(raw);
  };

  const getEventsForDay = (cellDay, isCurrentMonth) => {
    if (!isCurrentMonth) return [];
    return complaints.filter(c => {
      if (deletedIds.includes(c._id) || deletedIds.includes(c.id)) return false;
      const cDate = getTaskDate(c);
      const isSameDate = cDate.getDate() === cellDay && cDate.getMonth() === month && cDate.getFullYear() === year;
      if (statusFilter === 'All') return isSameDate;
      return isSameDate && c.status === statusFilter;
    });
  };

  const selectedDayComplaints = complaints.filter(c => {
    if (deletedIds.includes(c._id) || deletedIds.includes(c.id)) return false;
    const cDate = getTaskDate(c);
    const isSameDate = cDate.getDate() === selectedDay && cDate.getMonth() === month && cDate.getFullYear() === year;
    if (statusFilter === 'All') return isSameDate;
    return isSameDate && c.status === statusFilter;
  });

  const allFilteredComplaints = complaints.filter(c => {
    if (deletedIds.includes(c._id) || deletedIds.includes(c.id)) return false;
    if (statusFilter === 'All') return true;
    return c.status === statusFilter;
  });

  const exportScheduleCSV = () => {
    const headers = ['Issue Type', 'Location', 'Status', 'Assigned Cutter', 'Date Scheduled'];
    const rows = allFilteredComplaints.map(c => [
      issueLabels[c.issueType] || c.issueType,
      c.location || 'Municipal Sector',
      c.status || 'Pending',
      c.assignedTo || 'Unassigned',
      getTaskDate(c).toLocaleDateString('en-IN')
    ]);
    const csvContent = [headers, ...rows].map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Tree_Work_Schedule_${monthName}_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openScheduleModal = (targetDay) => {
    const dayToUse = targetDay || selectedDay;
    const defaultCutter = cutters.length > 0 ? (typeof cutters[0] === 'string' ? cutters[0] : cutters[0].name || cutters[0].email) : 'Boxy';

    const y = currentMonthDate.getFullYear();
    const m = String(currentMonthDate.getMonth() + 1).padStart(2, '0');
    const d = String(dayToUse).padStart(2, '0');
    const defaultDateStr = `${y}-${m}-${d}`;

    setScheduleForm({
      assignedTo: defaultCutter,
      title: '',
      issueType: 'overhanging',
      location: '',
      description: '',
      priority: 'Medium',
      equipment: '🪜 Bucket Truck & Chainsaw',
      scheduledDate: defaultDateStr,
    });
    setShowScheduleModal(true);
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    if (!scheduleForm.assignedTo) {
      Swal.fire({ icon: 'warning', title: 'Select Tree Cutter', text: 'Please select a Tree Cutter to assign this work schedule.' });
      return;
    }
    setSchedulingLoading(true);

    try {
      const parts = scheduleForm.scheduledDate.split('-').map(Number);
      const scheduledDateObj = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);

      const res = await fetch(`${API_URL}/api/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issueType: scheduleForm.issueType,
          description: scheduleForm.description || scheduleForm.title || 'Routine Tree Care Task',
          location: scheduleForm.location,
          assignedTo: scheduleForm.assignedTo,
          status: 'Scheduled',
          priority: scheduleForm.priority,
          scheduledDate: scheduledDateObj.toISOString(),
        }),
      });

      const data = await res.json();
      let createdComplaint = data.complaint;
      if (!createdComplaint) {
        createdComplaint = {
          _id: 'sched_' + Date.now(),
          issueType: scheduleForm.issueType,
          description: scheduleForm.description || 'Routine Tree Care Task',
          location: scheduleForm.location,
          assignedTo: scheduleForm.assignedTo,
          status: 'Scheduled',
          priority: scheduleForm.priority,
          equipment: scheduleForm.equipment,
          scheduledDate: scheduledDateObj.toISOString(),
          createdAt: new Date().toISOString()
        };
      } else {
        createdComplaint.scheduledDate = scheduledDateObj.toISOString();
        if (scheduleForm.assignedTo) createdComplaint.assignedTo = scheduleForm.assignedTo;
      }

      setComplaints(prev => [createdComplaint, ...prev]);
      setSelectedDay(parts[2]);
      setStatusFilter('All');
      setShowScheduleModal(false);

      Swal.fire({
        icon: 'success',
        title: 'Work Schedule Assigned!',
        text: `Work order assigned to ${scheduleForm.assignedTo} for ${monthName} ${parts[2]}`,
        timer: 2500,
        showConfirmButton: false
      });
    } catch (err) {
      console.error('Schedule creation error:', err);
      const parts = scheduleForm.scheduledDate.split('-').map(Number);
      const fallback = {
        _id: 'sched_' + Date.now(),
        issueType: scheduleForm.issueType,
        description: scheduleForm.description || 'Routine Tree Care Task',
        location: scheduleForm.location,
        assignedTo: scheduleForm.assignedTo,
        status: 'Scheduled',
        priority: scheduleForm.priority,
        equipment: scheduleForm.equipment,
        scheduledDate: new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0).toISOString(),
        createdAt: new Date().toISOString()
      };
      setComplaints(prev => [fallback, ...prev]);
      setSelectedDay(parts[2]);
      setStatusFilter('All');
      setShowScheduleModal(false);
      Swal.fire({
        icon: 'success',
        title: 'Work Schedule Assigned!',
        text: `Work order assigned to ${scheduleForm.assignedTo} for ${monthName} ${parts[2]}`,
        timer: 2500,
        showConfirmButton: false
      });
    } finally {
      setSchedulingLoading(false);
    }
  };

  const handleAssignCutterToComplaint = async (complaintId, cutterName) => {
    if (!cutterName) return;

    setComplaints(prev => prev.map(c => c._id === complaintId ? { ...c, assignedTo: cutterName, status: 'Scheduled' } : c));

    try {
      const res = await fetch(`${API_URL}/api/complaints/${complaintId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Scheduled', assignedTo: cutterName, officialName: 'Official' }),
      });
      const data = await res.json();
      if (data.complaint) {
        setComplaints(prev => prev.map(c => c._id === complaintId ? data.complaint : c));
      }
      Swal.fire({
        icon: 'success',
        title: 'Cutter Assigned!',
        text: `Task assigned to ${cutterName}`,
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err) {
      console.error('Assign error:', err);
    }
  };

  const handleDeleteComplaint = async (complaintId, complaintObj) => {
    const targetId = complaintId || complaintObj?._id || complaintObj?.id;
    if (!targetId) return;

    const result = await Swal.fire({
      title: 'Delete Work Schedule?',
      text: 'Are you sure you want to delete this work schedule? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it'
    });

    if (!result.isConfirmed) return;

    const newDeletedIds = Array.from(new Set([...deletedIds, targetId, complaintObj?._id, complaintObj?.id].filter(Boolean)));
    setDeletedIds(newDeletedIds);
    localStorage.setItem('deleted_complaint_ids', JSON.stringify(newDeletedIds));

    setComplaints(prev => prev.filter(c => (c._id || c.id) !== targetId));

    try {
      const targetUrl = `${API_URL || 'http://localhost:5000'}/api/complaints/${targetId}`;
      await fetch(targetUrl, {
        method: 'DELETE',
        headers: { 'Accept': 'application/json' }
      });
    } catch (err) {
      console.error('Delete sync error:', err);
    }

    Swal.fire({
      icon: 'success',
      title: 'Deleted!',
      text: 'Work schedule deleted successfully.',
      timer: 2000,
      showConfirmButton: false
    });
  };

  return (
    <div className="cg-app">
      <Sidebar active="Work Schedules" isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
      <div className="cg-workspace">
        <Topbar title="Work Schedules & Maintenance Calendar" search="Search tasks, tree cutters, or site locations..." onToggleSidebar={() => setSidebarOpen(true)} />
        <main className="cg-page">

          <section className="cg-filters" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={openScheduleModal}
                className="cg-btn primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'linear-gradient(135deg, #16a34a, #15803d)', border: 'none', padding: '10px 18px', fontWeight: 600 }}
              >
                <Plus size={18} /> Schedule for Tree Cutter
              </button>
              <button
                onClick={exportScheduleCSV}
                className="cg-btn outline"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '10px 16px', fontWeight: 600 }}
                title="Export Monthly Maintenance Roster to CSV"
              >
                <Download size={16} /> Export Schedule
              </button>
            </div>
          </section>

          {/* Schedule Task Modal */}
          {showScheduleModal && (
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
              <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', width: '100%', maxWidth: '540px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #f3f4f6', paddingBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CalendarDays size={20} color="#16a34a" /> Prepare Work Schedule for Tree Cutter
                  </h3>
                  <button onClick={() => setShowScheduleModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '4px' }}>
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleCreateSchedule}>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Select Tree Cutter</label>
                    <select
                      value={scheduleForm.assignedTo}
                      onChange={(e) => setScheduleForm(prev => ({ ...prev, assignedTo: e.target.value }))}
                      required
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem' }}
                    >
                      {cutters.length === 0 ? (
                        <option value="">No registered Tree Cutters found</option>
                      ) : (
                        cutters.map(c => {
                          const cutterName = typeof c === 'string' ? c : c.name || c.email;
                          return <option key={c._id || cutterName} value={cutterName}>{cutterName}</option>;
                        })
                      )}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Work Type</label>
                      <select
                        value={scheduleForm.issueType}
                        onChange={(e) => setScheduleForm(prev => ({ ...prev, issueType: e.target.value }))}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem' }}
                      >
                        <option value="routine">Monthly Routine</option>
                        <option value="overhanging">Overhanging Branch</option>
                        <option value="damaged">Damaged Tree</option>
                        <option value="fallen">Fallen Limb</option>
                        <option value="pest">Pest Inspection</option>
                        <option value="dead">Dead Tree Removal</option>
                        <option value="roots">Root Clearance</option>
                        <option value="replant">🌱 Sapling Replantation</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Scheduled Date</label>
                      <input
                        type="date"
                        min={new Date().toISOString().slice(0, 10)}
                        value={scheduleForm.scheduledDate}
                        onChange={(e) => setScheduleForm(prev => ({ ...prev, scheduledDate: e.target.value }))}
                        required
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem' }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Site Location / Address</label>
                    <input
                      type="text"
                      placeholder="e.g. Central Park East, Ajjarkadu, Udupi"
                      value={scheduleForm.location}
                      onChange={(e) => setScheduleForm(prev => ({ ...prev, location: e.target.value }))}
                      required
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem' }}
                    />
                  </div>

                  <div style={{ marginBottom: '18px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Work Instructions & Safety Notes</label>
                    <textarea
                      placeholder="Enter specific instructions for the tree cutter..."
                      rows={3}
                      value={scheduleForm.description}
                      onChange={(e) => setScheduleForm(prev => ({ ...prev, description: e.target.value }))}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem', resize: 'vertical' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => setShowScheduleModal(false)} className="cg-btn outline">Cancel</button>
                    <button type="submit" className="btn-primary" style={{ marginTop: 0, width: 'auto', padding: '10px 20px' }} disabled={schedulingLoading}>
                      {schedulingLoading ? 'Scheduling...' : 'Assign Schedule'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <section className="cg-schedule-grid">
            <div className="cg-calendar">
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{monthName} {year}</h2>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={prevMonth}
                      disabled={!isCurrentOrFutureMonth()}
                      style={{
                        padding: '6px',
                        borderRadius: '6px',
                        border: '1px solid #d1d5db',
                        background: isCurrentOrFutureMonth() ? '#fff' : '#f3f4f6',
                        cursor: isCurrentOrFutureMonth() ? 'pointer' : 'not-allowed',
                        opacity: isCurrentOrFutureMonth() ? 1 : 0.4
                      }}
                      title={isCurrentOrFutureMonth() ? "Previous Month" : "Past months locked"}
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button onClick={nextMonth} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }} title="Next Month">
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
                <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: '600' }}>
                  {loading ? 'Syncing...' : `${allFilteredComplaints.length} Work Order${allFilteredComplaints.length !== 1 ? 's' : ''}`}
                </span>
              </header>

              <div className="weekdays">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <b key={d}>{d}</b>)}</div>
              <div className="days">
                {calendarCells.map((cell, i) => {
                  const isPast = isPastDate(cell.day, cell.isCurrentMonth, cell.isPrevMonth);
                  const dayEvents = getEventsForDay(cell.day, cell.isCurrentMonth);
                  const isSelected = cell.isCurrentMonth && cell.day === selectedDay;

                  return (
                    <div
                      key={`${cell.day}-${i}`}
                      className={`${isSelected ? 'selected' : ''} ${!cell.isCurrentMonth || isPast ? 'muted' : ''}`}
                      onClick={() => {
                        if (!isPast && cell.isCurrentMonth) {
                          setSelectedDay(cell.day);
                        }
                      }}
                      style={{
                        cursor: isPast ? 'not-allowed' : cell.isCurrentMonth ? 'pointer' : 'default',
                        opacity: isPast ? 0.4 : cell.isCurrentMonth ? 1 : 0.6,
                        background: isPast ? '#f9fafb' : undefined,
                        minHeight: '82px'
                      }}
                      title={isPast ? "Past dates locked" : `Select ${monthName} ${cell.day}`}
                    >
                      <b>{cell.day}</b>
                      {dayEvents.slice(0, 2).map((ev, idx) => (
                        <span key={ev._id || idx} className={`event ${ev.issueType === 'routine' ? 'green' : ev.status === 'Resolved' ? 'green' : ev.status === 'Scheduled' ? 'blue' : ev.status === 'Pending' ? 'red' : 'violet'}`}>
                          {issueLabels[ev.issueType] || ev.issueType}
                        </span>
                      ))}
                      {dayEvents.length > 2 && (
                        <span className="event gray">+{dayEvents.length - 2} more</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <aside className="cg-activity">
              <h2>{monthName} {selectedDay} Activities <span>{selectedDayComplaints.length} Tasks</span></h2>

              {selectedDayComplaints.length === 0 ? (
                <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '24px', textAlign: 'center', border: '1px border-dashed #d1d5db', color: '#6b7280' }}>
                  <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>No scheduled maintenance for {monthName} {selectedDay}.</p>
                  <small>Select another date on the calendar or click "+ Schedule for Tree Cutter".</small>
                </div>
              ) : (
                selectedDayComplaints.map(c => (
                  <article key={c._id || c.id} style={{ borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
                    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <b style={{ color: c.issueType === 'routine' ? '#16a34a' : c.status === 'Pending' ? '#dc2626' : '#2563eb' }}>
                        {issueLabels[c.issueType] || c.issueType}
                      </b>
                      <time>{getTaskDate(c).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</time>
                    </header>
                    <h3>{c.location || 'Municipal Canopy Sector'}</h3>
                    <p>{c.description || 'Routine tree care, pruning, and safety inspection.'}</p>
                    <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                      <span><UserRound size={16} /> Cutter: <strong style={{ color: c.assignedTo && c.assignedTo !== 'Unassigned' ? '#15803d' : '#dc2626' }}>{c.assignedTo || 'Unassigned'}</strong></span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {(!c.assignedTo || c.assignedTo === 'Unassigned') && (
                          <select
                            onChange={(e) => handleAssignCutterToComplaint(c._id, e.target.value)}
                            defaultValue=""
                            style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', border: '1px solid #16a34a', background: '#f0fdf4', color: '#166534', fontWeight: 600, cursor: 'pointer' }}
                          >
                            <option value="" disabled>+ Assign Cutter...</option>
                            {cutters.map(ct => {
                              const cName = typeof ct === 'string' ? ct : ct.name || ct.email;
                              return <option key={ct._id || cName} value={cName}>{cName}</option>;
                            })}
                          </select>
                        )}
                        <button
                          onClick={() => handleDeleteComplaint(c._id || c.id, c)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                          title="Delete Work Schedule"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </footer>
                  </article>
                ))
              )}

              {/* District Target Card */}
              <div className="target-card" style={{ marginTop: '20px' }}>
                <span>Monthly Coverage Target</span>
                <strong>{allFilteredComplaints.length > 0 ? '92% Scheduled' : '100% Monitored'}</strong>
                <i></i>
                <p>Municipal canopy tasks sync live with real-time field reports & tree cutters.</p>
              </div>
            </aside>
          </section>
        </main>
      </div>
    </div>
  );
}

const issueLabels = {
  damaged: 'Damaged',
  overhanging: 'Overhanging',
  dead: 'Dead / Dying',
  pest: 'Pest / Disease',
  roots: 'Roots Damage',
  fallen: 'Fallen Branch',
  replant: 'Eco-Restore Replantation',
};

const cutterOptions = ['Sarah Moreno', 'Mike Arbo', 'David Chen', 'Elena Rodriguez'];

const initialOfficialTasks = [
  {
    id: 'MT-2401',
    source: 'Maintenance',
    complaintId: null,
    title: 'Routine canopy lift - Civic Garden Road',
    location: 'Civic Garden Road, Zone A',
    cutter: 'Sarah Moreno',
    priority: 'Medium',
    status: 'In Progress',
    progress: 58,
    dueDate: '2026-06-24',
    visits: [
      { time: '09:05 AM', location: 'Civic Garden Road', note: 'Arrived and checked pedestrian clearance.' },
      { time: '10:35 AM', location: 'Civic Garden Road', note: 'Pruning in progress.' },
    ],
    beforeImage: 'Submitted',
    afterImage: 'Pending upload',
    wasteProof: 'Pending upload',
    proofStatus: { before: 'Verified', after: 'Pending', waste: 'Pending' },
  },
  {
    id: 'WO-2408',
    source: 'Complaint',
    complaintId: 'local-demo-4812',
    title: 'Fallen branch near school gate',
    location: 'Pine Street School, Zone C',
    cutter: 'Mike Arbo',
    priority: 'High',
    status: 'Work Completed',
    progress: 100,
    dueDate: '2026-06-22',
    visits: [
      { time: '08:42 AM', location: 'Pine Street School', note: 'Reached site and secured walkway.' },
      { time: '11:15 AM', location: 'Municipal compost yard', note: 'Waste disposal completed.' },
    ],
    beforeImage: 'Submitted',
    afterImage: 'Submitted',
    wasteProof: 'Submitted',
    proofStatus: { before: 'Verified', after: 'Pending', waste: 'Pending' },
  },
];

export function OfficialManagementPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState('complaints');

  // Official gate (allow Admin)
  const [officialAuthed, setOfficialAuthed] = useState(() => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
      if (currentUser.role === 'Official' || currentUser.role === 'Admin') return true;
    } catch { /* ignore */ }
    return (
      sessionStorage.getItem('officialAuthed') === 'true' ||
      sessionStorage.getItem('adminAuthed') === 'true'
    );
  });
  const [officialUser, setOfficialUser] = useState('');
  const [officialPass, setOfficialPass] = useState('');
  const [officialError, setOfficialError] = useState('');
  const [officialShake, setOfficialShake] = useState(false);
  const [showOfficialPass, setShowOfficialPass] = useState(false);

  const handleOfficialLogin = (e) => {
    e.preventDefault();
    if (officialUser === 'officials' && officialPass === 'officials@123') {
      sessionStorage.setItem('officialAuthed', 'true');
      setOfficialAuthed(true);
      setOfficialError('');
    } else {
      setOfficialError('Invalid username or password.');
      setOfficialShake(true);
      setTimeout(() => setOfficialShake(false), 600);
    }
  };
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaintId, setSelectedComplaintId] = useState('');
  const [cutters, setCutters] = useState([]);
  const [selectedCutter, setSelectedCutter] = useState('');
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('officialWorkOrders');
    return saved ? JSON.parse(saved) : initialOfficialTasks;
  });
  const [maintenanceForm, setMaintenanceForm] = useState({
    title: '',
    location: '',
    cutter: '',
    priority: 'Medium',
    dueDate: '',
  });
  const [notice, setNotice] = useState('');

  const selectedComplaint = complaints.find(c => c._id === selectedComplaintId) || complaints[0];

  useEffect(() => {
    localStorage.setItem('officialWorkOrders', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    fetch(`${API_URL}/api/auth/cutters`)
      .then(res => res.json())
      .then(data => {
        if (data.cutters && data.cutters.length > 0) {
          const names = data.cutters.map(c => c.name);
          setCutters(names);
          setSelectedCutter(names[0]);
          setMaintenanceForm(prev => ({ ...prev, cutter: names[0] }));
        }
      })
      .catch(err => console.error('Failed to load dynamic cutters:', err));
  }, []);

  useEffect(() => {
    const loadComplaints = () => {
      fetch(`${API_URL}/api/complaints`)
        .then(r => r.json())
        .then(data => {
          setComplaints(data.complaints || []);
          setSelectedComplaintId(prev => prev || data.complaints?.[0]?._id || '');
        })
        .catch(() => setComplaints([]))
        .finally(() => setLoading(false));
    };

    loadComplaints();
    const intervalId = setInterval(loadComplaints, 15000);
    return () => clearInterval(intervalId);
  }, []);

  const showNotice = (message) => {
    setNotice(message);
    setTimeout(() => setNotice(''), 3500);
  };

  const updateComplaintStatus = async (id, status, assignedTo = null) => {
    try {
      const body = { status };
      if (assignedTo) body.assignedTo = assignedTo;
      const res = await fetch(`${API_URL}/api/complaints/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Status update failed');
      setComplaints(prev => prev.map(c => c._id === id ? { ...c, status, assignedTo: assignedTo || c.assignedTo } : c));
    } catch (err) {
      setComplaints(prev => prev.map(c => c._id === id ? { ...c, status } : c));
    }
  };

  const verifyComplaint = (complaint) => {
    updateComplaintStatus(complaint._id, 'In Review');
    showNotice('Complaint verified and moved into official review.');
  };

  const assignComplaint = (complaint) => {
    if (!complaint) return;

    const exists = tasks.some(task => task.complaintId === complaint._id);
    if (exists) {
      showNotice('A work order already exists for this complaint.');
      return;
    }

    const task = {
      id: `WO-${complaint._id.slice(-4).toUpperCase()}`,
      source: 'Complaint',
      complaintId: complaint._id,
      title: issueLabels[complaint.issueType] || complaint.issueType,
      location: complaint.location || 'Location not provided',
      cutter: selectedCutter,
      priority: complaint.issueType === 'fallen' || complaint.issueType === 'dead' ? 'High' : 'Medium',
      status: 'Assigned',
      progress: 15,
      dueDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
      visits: [{ time: 'Awaiting visit', location: complaint.location || 'Pending GPS', note: 'Task assigned to cutter.' }],
      beforeImage: complaint.photoUrl ? 'Submitted' : 'Pending upload',
      afterImage: 'Pending upload',
      wasteProof: 'Pending upload',
      proofStatus: { before: complaint.photoUrl ? 'Pending' : 'Not Required', after: 'Pending', waste: 'Pending' },
    };

    setTasks(prev => [task, ...prev]);
    updateComplaintStatus(complaint._id, 'Scheduled', selectedCutter);
    showNotice(`Task is assigned to ${selectedCutter}`);
    Swal.fire({
      icon: 'success',
      title: 'Task Assigned!',
      text: `Task is assigned to ${selectedCutter}`,
      confirmButtonColor: '#1b4332',
      timer: 3000,
      timerProgressBar: true,
    });
  };

  const createMaintenanceTask = (event) => {
    event.preventDefault();
    if (!maintenanceForm.title.trim() || !maintenanceForm.location.trim()) {
      showNotice('Add a task title and location before creating maintenance work.');
      return;
    }

    const task = {
      id: `MT-${Date.now().toString().slice(-5)}`,
      source: 'Maintenance',
      complaintId: null,
      title: maintenanceForm.title,
      location: maintenanceForm.location,
      cutter: maintenanceForm.cutter,
      priority: maintenanceForm.priority,
      status: 'Assigned',
      progress: 10,
      dueDate: maintenanceForm.dueDate || 'Not scheduled',
      visits: [{ time: 'Scheduled', location: maintenanceForm.location, note: 'Maintenance task created by official.' }],
      beforeImage: 'Pending upload',
      afterImage: 'Pending upload',
      wasteProof: 'Pending upload',
      proofStatus: { before: 'Pending', after: 'Pending', waste: 'Pending' },
    };

    setTasks(prev => [task, ...prev]);
    setMaintenanceForm({ title: '', location: '', cutter: cutters[1] || cutters[0], priority: 'Medium', dueDate: '' });
    setActiveView('tasks');
    showNotice(`Maintenance task ${task.id} created.`);
  };

  const advanceTask = (taskId) => {
    const flow = {
      Assigned: ['In Progress', 45],
      'In Progress': ['Work Completed', 100],
      'Work Completed': ['Ready for Closure', 100],
      'Ready for Closure': ['Closed', 100],
    };

    setTasks(prev => prev.map(task => {
      if (task.id !== taskId || !flow[task.status]) return task;
      const [status, progress] = flow[task.status];
      return {
        ...task,
        status,
        progress,
        visits: [
          ...task.visits,
          {
            time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            location: task.location,
            note: status === 'In Progress' ? 'Cutter checked in at site.' : `Status updated to ${status}.`,
          },
        ],
        afterImage: status === 'Work Completed' ? 'Submitted' : task.afterImage,
        wasteProof: status === 'Work Completed' ? 'Submitted' : task.wasteProof,
      };
    }));
  };

  const verifyProof = (taskId, key) => {
    setTasks(prev => prev.map(task => (
      task.id === taskId
        ? { ...task, proofStatus: { ...task.proofStatus, [key]: 'Verified' } }
        : task
    )));
  };

  const closeTask = (task) => {
    const requiredProofs = ['before', 'after', 'waste'];
    const ready = requiredProofs.every(key => ['Verified', 'Not Required'].includes(task.proofStatus[key]));
    if (!ready) {
      showNotice('Verify before/after images and waste disposal proof before closure.');
      return;
    }

    setTasks(prev => prev.map(item => item.id === task.id ? { ...item, status: 'Closed', progress: 100 } : item));
    if (task.complaintId) updateComplaintStatus(task.complaintId, 'Resolved');
    showNotice(`${task.id} closed successfully.`);
  };

  const counts = {
    pending: complaints.filter(c => c.status === 'Pending').length,
    active: tasks.filter(t => !['Closed'].includes(t.status)).length,
    proof: tasks.filter(t => ['Work Completed', 'Waste Disposed', 'Ready for Closure'].includes(t.status)).length,
    closed: tasks.filter(t => t.status === 'Closed').length,
  };

  const taskTag = (status) => {
    if (status === 'Closed' || status === 'Waste Disposed') return 'ok';
    if (status === 'Work Completed' || status === 'Ready for Closure') return 'med';
    if (status === 'Assigned') return 'low';
    return 'high';
  };

  const complaintTag = (status) => {
    if (status === 'Resolved') return 'ok';
    if (status === 'Scheduled') return 'low';
    if (status === 'In Review') return 'med';
    return 'high';
  };

  if (!officialAuthed) {
    return (
      <div style={{
        display: 'flex',
        minHeight: '100vh',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        background: '#f8fafc',
      }}>
        <style>{`
          @keyframes officialShake {
            0%,100%{transform:translateX(0)}
            20%{transform:translateX(-10px)}
            40%{transform:translateX(10px)}
            60%{transform:translateX(-8px)}
            80%{transform:translateX(8px)}
          }
          .official-gate-card.shake { animation: officialShake 0.5s ease; }
          .official-gate-input:focus { outline: none; border-color: #1b4332 !important; box-shadow: 0 0 0 3px rgba(27,67,50,0.15); }
        `}</style>

        {/* Left Column (Banner/Info) */}
        <div style={{
          flex: '1',
          backgroundImage: "linear-gradient(rgba(27, 67, 50, 0.45), rgba(27, 67, 50, 0.85)), url('/forest_canopy_login.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '5rem 4rem',
          color: '#fff',
        }}>
          <h1 style={{ fontSize: '3rem', fontWeight: '800', margin: '0 0 1.25rem', lineHeight: '1.15', letterSpacing: '-0.02em' }}>
            Welcome to the<br />Canopy
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'rgba(255, 255, 255, 0.9)', maxWidth: '480px', margin: 0, lineHeight: '1.65' }}>
            The intelligence hub for municipal forestry. Access your dashboard to monitor, maintain, and expand the city's living infrastructure.
          </p>
        </div>

        {/* Right Column (Form) */}
        <div style={{
          width: '560px',
          background: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '3rem 5rem',
          boxSizing: 'border-box',
        }}>
          <div style={{ width: '100%', maxWidth: '380px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '2.0rem', color: '#111827', margin: '0 0 0.5rem', fontWeight: '800', letterSpacing: '-0.02em' }}>
              Sign in to your account
            </h2>
            <p style={{ fontSize: '0.95rem', color: '#4b5563', margin: '0 0 2.25rem' }}>
              Enter your credentials to manage municipal assets.
            </p>

            {/* Form Card */}
            <div
              className={`official-gate-card${officialShake ? ' shake' : ''}`}
              style={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '16px',
                padding: '2.25rem 1.75rem',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -4px rgba(0,0,0,0.05)',
              }}
            >
              <form onSubmit={handleOfficialLogin}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', color: '#374151', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                    Username
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '1.1rem', fontWeight: '500' }}>
                      @
                    </span>
                    <input
                      id="official-username"
                      className="official-gate-input"
                      type="text"
                      value={officialUser}
                      onChange={e => { setOfficialUser(e.target.value); setOfficialError(''); }}
                      placeholder="Enter username"
                      autoFocus
                      required
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: '#fff',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px', padding: '0.75rem 1rem 0.75rem 2.2rem',
                        color: '#1f2937', fontSize: '0.95rem',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ color: '#374151', fontSize: '0.85rem', fontWeight: '600' }}>
                      Password
                    </label>
                    <a href="/forgot-password" style={{ color: '#166534', fontSize: '0.8rem', fontWeight: '600', textDecoration: 'none' }}>
                      Forgot Password?
                    </a>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', display: 'flex', alignItems: 'center' }}>
                      <Lock size={16} />
                    </span>
                    <input
                      id="official-password"
                      className="official-gate-input"
                      type={showOfficialPass ? 'text' : 'password'}
                      value={officialPass}
                      onChange={e => { setOfficialPass(e.target.value); setOfficialError(''); }}
                      placeholder="Enter password"
                      required
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: '#fff',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px', padding: '0.75rem 2.8rem 0.75rem 2.2rem',
                        color: '#1f2937', fontSize: '0.95rem',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowOfficialPass(p => !p)}
                      style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center', padding: 0 }}
                    >
                      {showOfficialPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {officialError && (
                  <div style={{
                    background: '#fef2f2', border: '1px solid #fee2e2',
                    borderRadius: '8px', padding: '0.65rem 1rem', marginBottom: '1.25rem',
                    color: '#991b1b', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                  }}>
                    ⚠️ {officialError}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  <input type="checkbox" id="keep-logged-in-official" style={{ cursor: 'pointer' }} />
                  <label htmlFor="keep-logged-in-official" style={{ color: '#4b5563', fontSize: '0.85rem', cursor: 'pointer' }}>
                    Keep me logged in
                  </label>
                </div>

                <button
                  type="submit"
                  style={{
                    width: '100%', padding: '0.8rem',
                    background: '#1b4332',
                    border: 'none', borderRadius: '8px',
                    color: '#fff', fontSize: '0.95rem', fontWeight: '600',
                    cursor: 'pointer', transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  }}
                >
                  <LogIn size={16} /> Login to Dashboard
                </button>
              </form>
            </div>

            <p style={{ textAlign: 'center', marginTop: '2.5rem', color: '#9ca3af', fontSize: '0.75rem' }}>
              🌳 CanopyGuard Official Portal
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cg-app">
      <Sidebar active="Complaints" isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
      <div className="cg-workspace">
        <Topbar title="Official Management" search="Search complaints, work orders, cutters..." onToggleSidebar={() => setSidebarOpen(true)} />
        <main className="cg-page official-management">
          <section className="cg-admin-head official-head">
            <div>
              <span>Operations Control</span>
              <h1>Official Management Module</h1>
              <p>Verify public complaints, assign cutters, monitor site visits, review proof, and close completed complaints.</p>
            </div>
            <div className="official-head-actions">
              <Link className="cg-btn outline" to="/home"><Home size={18} /> Return Home</Link>
              <button className="official-live"><span className="pulse-indicator"></span> Live status sync</button>
            </div>
          </section>

          {notice && <div className="official-notice"><CheckCircle2 size={18} /> {notice}</div>}

          <section className="official-stat-grid">
            <article><AlertTriangle /><span>Pending complaints</span><b>{counts.pending}</b></article>
            <article><Users /><span>Active cutter tasks</span><b>{counts.active}</b></article>
            <article><Camera /><span>Proof reviews</span><b>{counts.proof}</b></article>
            <article><ShieldCheck /><span>Closed work</span><b>{counts.closed}</b></article>
          </section>

          <nav className="official-tabs">
            {[
              ['complaints', 'Complaints'],
              ['tasks', 'Progress'],
              ['maintenance', 'Create Task'],
              ['proofs', 'Proof Review'],
            ].map(([id, label]) => (
              <button key={id} className={activeView === id ? 'active' : ''} onClick={() => setActiveView(id)}>{label}</button>
            ))}
          </nav>

          {activeView === 'complaints' && (
            <section className="official-grid">
              <div className="cg-panel official-list">
                <header><h2>Public Complaints</h2><span>{loading ? 'Loading...' : `${complaints.length} records`}</span></header>
                {complaints.length === 0 ? (
                  <p className="official-empty">No complaints found. Start the backend server to view live submissions.</p>
                ) : complaints.map(complaint => (
                  <div
                    key={complaint._id}
                    className={`official-complaint-card ${selectedComplaint?._id === complaint._id ? 'selected' : ''}`}
                    onClick={() => setSelectedComplaintId(complaint._id)}
                    style={{ 
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      alignItems: 'stretch',
                      padding: '16px 20px',
                      width: 'auto',
                      margin: '0 24px 12px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <b style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 600 }}>
                        {issueLabels[complaint.issueType] || complaint.issueType}
                      </b>
                      <i className={`tag ${complaintTag(complaint.status)}`} style={{ fontStyle: 'normal', whiteSpace: 'nowrap', gridRow: 'auto', gridColumn: 'auto', alignSelf: 'flex-start' }}>
                        {complaint.status}
                      </i>
                    </div>
                    
                    <span style={{ fontSize: '0.85rem', color: '#475569', lineHeight: '1.4' }}>
                      📍 {complaint.location || 'No location provided'}
                    </span>
                    
                    <small style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '2px' }}>
                      📅 {new Date(complaint.createdAt).toLocaleString('en-IN')}
                    </small>

                    {complaint.requiresReplantation && (
                      <span style={{ fontSize: '0.76rem', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '3px 10px', borderRadius: '12px', display: 'inline-block', width: 'fit-content', fontWeight: 700 }}>
                        🌱 Replantation: {complaint.replantationStatus}
                      </span>
                    )}

                    {complaint.assignedTo && (
                      <small style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#1b4332', fontWeight: 600, marginTop: '2px' }}>
                        <Users size={12} /> Assigned to: {complaint.assignedTo}
                      </small>
                    )}

                    {/* Inline assignment panel when this complaint is selected */}
                    {selectedComplaint?._id === complaint._id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          marginTop: '12px',
                          padding: '14px',
                          background: '#f0fdf4',
                          borderRadius: '10px',
                          border: '1px solid #bbf7d0',
                          width: '100%',
                          boxSizing: 'border-box',
                        }}
                      >
                        <p style={{ margin: '0 0 6px', fontSize: '0.82rem', color: '#4b5563' }}>
                          <b style={{ color: '#1f2937' }}>Submitted by:</b> {complaint.submittedBy || 'Anonymous'}
                        </p>
                        <p style={{ margin: '0 0 6px', fontSize: '0.82rem', color: '#4b5563' }}>
                          <b style={{ color: '#1f2937' }}>Description:</b> {complaint.description || 'No description'}
                        </p>
                        {complaint.photoUrl && (
                          <p style={{ margin: '0 0 8px', fontSize: '0.82rem', color: '#166534', fontWeight: 600 }}>
                            📷 Photo submitted for inspection
                          </p>
                        )}

                        <label style={{ display: 'block', marginBottom: '10px', fontSize: '0.85rem', fontWeight: 600, color: '#1b4332' }}>
                          Assign Tree Cutter
                          <select
                            value={selectedCutter}
                            onChange={e => setSelectedCutter(e.target.value)}
                            style={{
                              display: 'block',
                              width: '100%',
                              marginTop: '6px',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid #a7f3d0',
                              background: '#fff',
                              fontSize: '0.9rem',
                              color: '#1f2937',
                              cursor: 'pointer',
                            }}
                          >
                            {cutters.map(cutter => <option key={cutter}>{cutter}</option>)}
                          </select>
                        </label>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="cg-btn outline"
                            style={{ flex: 1, padding: '8px 10px', fontSize: '0.82rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            onClick={(e) => { e.stopPropagation(); verifyComplaint(complaint); }}
                          >
                            <ShieldCheck size={16} /> Verify
                          </button>
                          <button
                            className="cg-btn primary"
                            style={{ flex: 1, padding: '8px 10px', fontSize: '0.82rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            onClick={(e) => { e.stopPropagation(); assignComplaint(complaint); }}
                          >
                            <Users size={16} /> Assign Task
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="cg-panel official-detail">
                {selectedComplaint ? (
                  <>
                    <header><h2>Verification Desk</h2><span className={`tag ${complaintTag(selectedComplaint.status)}`}>{selectedComplaint.status}</span></header>
                    <div className="official-detail-body">
                      <p><b>Issue</b><span>{issueLabels[selectedComplaint.issueType] || selectedComplaint.issueType}</span></p>
                      <p><b>Submitted by</b><span>{selectedComplaint.submittedBy || 'Anonymous'}</span></p>
                      <p><b>Location</b><span>{selectedComplaint.location || 'Not specified'}</span></p>
                      <p><b>Description</b><span>{selectedComplaint.description || 'No description provided.'}</span></p>
                      {selectedComplaint.assignedTo && (
                        <p><b>Assigned To</b><span style={{ color: '#1b4332', fontWeight: 600 }}>{selectedComplaint.assignedTo}</span></p>
                      )}
                      <div className="official-photo-review">
                        <div><Camera /><b>Public Image</b><span>{selectedComplaint.photoUrl ? 'Available for inspection' : 'No image submitted'}</span></div>
                        <div><MapPin /><b>Location Visit</b><span>GPS visit required before closure</span></div>
                      </div>
                      <label className="official-field">
                        Assign tree cutter
                        <select value={selectedCutter} onChange={e => setSelectedCutter(e.target.value)}>
                          {cutters.map(cutter => <option key={cutter}>{cutter}</option>)}
                        </select>
                      </label>
                      <div className="official-actions">
                        <button className="cg-btn outline" onClick={() => verifyComplaint(selectedComplaint)}><ShieldCheck size={18} /> Verify</button>
                        <button className="cg-btn primary" onClick={() => assignComplaint(selectedComplaint)}><Users size={18} /> Assign Task</button>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="official-empty">Select a complaint to verify and assign.</p>
                )}
              </div>
            </section>
          )}

          {activeView === 'tasks' && (
            <section className="cg-panel official-work-table">
              <header><h2>Cutter Progress Tracking</h2><span>Real-time task status updates</span></header>
              <table className="cg-table wide">
                <thead><tr><th>Task</th><th>Cutter</th><th>Location</th><th>Progress</th><th>Status</th><th>Next Action</th></tr></thead>
                <tbody>
                  {tasks.map(task => (
                    <tr key={task.id}>
                      <td><b>{task.id}</b><small>{task.title}</small></td>
                      <td>{task.cutter}</td>
                      <td>{task.location}</td>
                      <td><div className="official-progress"><i style={{ width: `${task.progress}%` }}></i><span>{task.progress}%</span></div></td>
                      <td><span className={`tag ${taskTag(task.status)}`}>{task.status}</span></td>
                      <td><button className="cg-btn outline compact" onClick={() => advanceTask(task.id)} disabled={task.status === 'Closed'}>Update</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="official-visit-grid">
                {tasks.slice(0, 3).map(task => (
                  <article key={task.id}>
                    <h3>{task.id} Visits</h3>
                    {task.visits.map((visit, index) => (
                      <p key={`${task.id}-${index}`}><MapPin size={16} /><b>{visit.time}</b><span>{visit.location}</span><small>{visit.note}</small></p>
                    ))}
                  </article>
                ))}
              </div>
            </section>
          )}

          {activeView === 'maintenance' && (
            <section className="cg-panel official-form-panel">
              <header><h2>Create Maintenance Task</h2><span>For proactive pruning, inspection, removal, and cleanup work</span></header>
              <form onSubmit={createMaintenanceTask} className="official-task-form">
                <label>Task title<input value={maintenanceForm.title} onChange={e => setMaintenanceForm({ ...maintenanceForm, title: e.target.value })} placeholder="e.g. Preventive pruning at Ward 12" /></label>
                <label>Location<input value={maintenanceForm.location} onChange={e => setMaintenanceForm({ ...maintenanceForm, location: e.target.value })} placeholder="Site address or zone" /></label>
                <label>Cutter<select value={maintenanceForm.cutter} onChange={e => setMaintenanceForm({ ...maintenanceForm, cutter: e.target.value })}>{cutters.map(cutter => <option key={cutter}>{cutter}</option>)}</select></label>
                <label>Priority<select value={maintenanceForm.priority} onChange={e => setMaintenanceForm({ ...maintenanceForm, priority: e.target.value })}><option>Low</option><option>Medium</option><option>High</option></select></label>
                <label>Due date<input type="date" value={maintenanceForm.dueDate} onChange={e => setMaintenanceForm({ ...maintenanceForm, dueDate: e.target.value })} /></label>
                <button className="cg-btn primary"><Plus size={18} /> Create Task</button>
              </form>
            </section>
          )}

          {activeView === 'proofs' && (
            <section className="official-proof-grid">
              {tasks.map(task => (
                <article className="cg-panel official-proof-card" key={task.id}>
                  <header><div><h2>{task.id}</h2><p>{task.title}</p></div><span className={`tag ${taskTag(task.status)}`}>{task.status}</span></header>
                  <div className="official-proof-items">
                    {[
                      ['before', 'Before image', task.beforeImage],
                      ['after', 'After work image', task.afterImage],
                      ['waste', 'Waste disposal proof', task.wasteProof],
                    ].map(([key, label, value]) => (
                      <div key={key}>
                        <Camera size={20} />
                        <b>{label}</b>
                        <span>{value}</span>
                        <small>{task.proofStatus[key]}</small>
                        <button className="cg-btn outline compact" onClick={() => verifyProof(task.id, key)} disabled={task.proofStatus[key] === 'Verified' || task.proofStatus[key] === 'Not Required'}>Verify</button>
                      </div>
                    ))}
                  </div>
                  <button className="cg-btn primary" onClick={() => closeTask(task)}><CheckCircle2 size={18} /> Close Completed Complaint</button>
                </article>
              ))}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export function AdminConsolePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [complaints, setComplaints] = useState([]);
  const [complaintsLoading, setComplaintsLoading] = useState(true);

  // Admin gate
  const [adminAuthed, setAdminAuthed] = useState(() => sessionStorage.getItem('adminAuthed') === 'true');
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminShake, setAdminShake] = useState(false);
  const [showAdminPass, setShowAdminPass] = useState(false);

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminUser === 'admin' && adminPass === 'admin@123') {
      sessionStorage.setItem('adminAuthed', 'true');
      setAdminAuthed(true);
      setAdminError('');
    } else {
      setAdminError('Invalid username or password.');
      setAdminShake(true);
      setTimeout(() => setAdminShake(false), 600);
    }
  };

  const [userList, setUserList] = useState([]);

  const [showOfficialModal, setShowOfficialModal] = useState(false);
  const [showPublicDetailModal, setShowPublicDetailModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedPublicUser, setSelectedPublicUser] = useState(null);
  const [publicUserReports, setPublicUserReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [officialName, setOfficialName] = useState('');
  const [officialEmail, setOfficialEmail] = useState('');
  const [officialPhone, setOfficialPhone] = useState('');
  const [officialPassword, setOfficialPassword] = useState('');
  const [officialSector, setOfficialSector] = useState('Central District');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');

  const handleCreateOfficial = async (e) => {
    e.preventDefault();
    setRegisterLoading(true);
    setRegisterError('');
    setRegisterSuccess('');

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-requested-by': 'admin'
        },
        body: JSON.stringify({
          name: officialName,
          email: officialEmail,
          phone: officialPhone,
          password: officialPassword,
          role: 'Official'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || 'Registration failed');
      }

      setRegisterSuccess('Official account created successfully on database!');

      const initials = officialName.split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2);
      const newOfficialRow = [
        initials || 'OF',
        officialName,
        `#OFF-${Math.floor(1000 + Math.random() * 9000)}-N`,
        'Official',
        officialSector,
        'Just now',
        'Verified'
      ];
      setUserList(prev => [newOfficialRow, ...prev]);

      setOfficialName('');
      setOfficialEmail('');
      setOfficialPhone('');
      setOfficialPassword('');
      setOfficialSector('Central District');

      setTimeout(() => {
        setShowOfficialModal(false);
        setRegisterSuccess('');
      }, 1500);

    } catch (err) {
      setRegisterError(err.message);
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleEditRole = async (userName, currentRole, dbId, rowData) => {
    if (ecosystemTab === 'Public') {
      setSelectedPublicUser({
        name: userName,
        role: currentRole,
        id: rowData[2],
        sector: rowData[4],
        sync: rowData[5],
        status: rowData[6],
        dbId: dbId
      });
      setShowPublicDetailModal(true);
      setLoadingReports(true);
      setPublicUserReports([]);

      if (dbId) {
        try {
          const response = await fetch(`${API_URL}/api/complaints?submittedByUserId=${dbId}`);
          const data = await response.json();
          if (response.ok) {
            setPublicUserReports(data.complaints || []);
          }
        } catch (err) {
          console.error('Failed to fetch user complaints', err);
        } finally {
          setLoadingReports(false);
        }
      } else {
        setPublicUserReports([
          {
            _id: 'mock-report-1',
            issueType: 'damaged',
            location: 'Near Public Zone main park',
            createdAt: new Date().toISOString(),
            status: 'Pending',
            description: 'Preventive pruning request for unstable branch.'
          }
        ]);
        setLoadingReports(false);
      }
      return;
    }

    const roles = ['Citizen', 'Official', 'Tree Cutter', 'Admin'];
    let normalizedCurrentRole = currentRole;
    if (currentRole === 'Arborist / Cutter') normalizedCurrentRole = 'Tree Cutter';

    const inputRole = prompt(
      `Enter new role for ${userName} (options: Citizen, Official, Tree Cutter, Admin):`,
      normalizedCurrentRole
    );

    if (!inputRole) return;

    if (!roles.includes(inputRole)) {
      alert(`Invalid role. Please select from: ${roles.join(', ')}`);
      return;
    }

    if (dbId) {
      try {
        const response = await fetch(`${API_URL}/api/auth/users/${dbId}/role`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: inputRole }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.msg || 'Failed to update role');

        alert(`Successfully updated role to ${inputRole}!`);
        setLiveUsers(prev => prev.map(u => u[7] === dbId ? [
          u[0],
          u[1],
          `#${inputRole === 'Official' ? 'OFF' : inputRole === 'Tree Cutter' ? 'CUT' : 'CIT'}-${dbId.slice(-4).toUpperCase()}`,
          inputRole === 'Tree Cutter' ? 'Arborist / Cutter' : inputRole,
          inputRole === 'Tree Cutter' ? 'Urban Core (East)' : inputRole === 'Citizen' ? 'Public Zone' : u[4],
          u[5],
          u[6],
          dbId
        ] : u));
      } catch (err) {
        alert(err.message);
      }
    } else {
      alert(`Successfully updated mock user ${userName} role to ${inputRole}!`);
      setUserList(prev => prev.map(u => u[1] === userName ? [
        u[0],
        u[1],
        u[2],
        inputRole === 'Tree Cutter' ? 'Arborist / Cutter' : inputRole,
        u[4],
        u[5],
        u[6]
      ] : u));
    }
  };

  const handleDeleteUser = async (userName, dbId) => {
    const confirmed = window.confirm(`Are you sure you want to delete/ban user ${userName}?`);
    if (!confirmed) return;

    if (dbId) {
      try {
        const response = await fetch(`${API_URL}/api/auth/users/${dbId}`, {
          method: 'DELETE',
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.msg || 'Failed to delete user');

        alert(`Successfully deleted user ${userName}!`);
        setLiveUsers(prev => prev.filter(u => u[7] !== dbId));
      } catch (err) {
        alert(err.message);
      }
    } else {
      alert(`Successfully deleted mock user ${userName}!`);
      setUserList(prev => prev.filter(u => u[1] !== userName));
    }
  };

  const [ecosystemTab, setEcosystemTab] = useState('Public');
  const [liveUsers, setLiveUsers] = useState([]);

  const fetchUsers = () => {
    fetch(`${API_URL}/api/auth/users`)
      .then(r => r.json())
      .then(data => {
        if (data.users) {
          const mapped = data.users.map(u => {
            const initials = u.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            let assignedSector = 'Global HQ';
            if (u.role === 'Tree Cutter') assignedSector = 'Urban Core (East)';
            else if (u.role === 'Citizen') assignedSector = 'Public Zone';

            const displayRole = u.role === 'Tree Cutter' ? 'Arborist / Cutter' : u.role;

            return [
              initials || 'US',
              u.name,
              `#${u.role === 'Official' ? 'OFF' : u.role === 'Tree Cutter' ? 'CUT' : 'CIT'}-${u._id.slice(-4).toUpperCase()}`,
              displayRole,
              assignedSector,
              new Date(u.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
              u.status || 'Verified',
              u._id
            ];
          });
          setLiveUsers(mapped);
        }
      })
      .catch(err => console.error('Failed to fetch users', err));
  };

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(fetchUsers, 10000);
    return () => clearInterval(interval);
  }, [showOfficialModal]);

  const handleAcceptUser = async (dbId, userName) => {
    if (!window.confirm(`Are you sure you want to verify and accept tree cutter ${userName}?`)) return;
    if (dbId) {
      try {
        const response = await fetch(`${API_URL}/api/auth/users/${dbId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Verified' }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.msg || 'Failed to verify user');
        alert(`Successfully verified tree cutter ${userName}!`);
        fetchUsers();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleRejectUser = async (dbId, userName) => {
    if (!window.confirm(`Are you sure you want to reject tree cutter ${userName}? This will restrict their access.`)) return;
    if (dbId) {
      try {
        const response = await fetch(`${API_URL}/api/auth/users/${dbId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Rejected' }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.msg || 'Failed to reject user');
        alert(`Successfully rejected tree cutter ${userName}!`);
        fetchUsers();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const combinedUsers = [...userList, ...liveUsers];
  const uniqueUsers = combinedUsers.filter((value, index, self) =>
    self.findIndex(v => v[1] === value[1]) === index
  );

  const filteredUsers = uniqueUsers.filter(u => {
    const role = u[3].toLowerCase();

    // Only display registered users (Citizen/Public) and tree cutters
    const isValidRole = role.includes('citizen') || role.includes('public') || role.includes('cutter') || role.includes('arborist');
    if (!isValidRole) return false;

    if (ecosystemTab === 'Cutters') {
      return role.includes('cutter') || role.includes('arborist');
    }
    if (ecosystemTab === 'Public') {
      return role.includes('citizen') || role.includes('public') || (!role.includes('official') && !role.includes('cutter') && !role.includes('inspector') && !role.includes('arborist'));
    }
    return true;
  });

  const issueLabels = {
    damaged: 'Damaged', overhanging: 'Overhanging', dead: 'Dead / Dying',
    pest: 'Pest / Disease', roots: 'Roots Damage', fallen: 'Fallen Branch',
  };

  useEffect(() => {
    fetch('http://localhost:5000/api/complaints')
      .then(r => r.json())
      .then(data => setComplaints(data.complaints || []))
      .catch(() => setComplaints([]))
      .finally(() => setComplaintsLoading(false));
  }, []);

  const updateStatus = async (id, status) => {
    try {
      const res = await fetch(`http://localhost:5000/api/complaints/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok) {
        setComplaints(prev => prev.map(c => c._id === id ? { ...c, status } : c));
      }
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const statusTag = (s) => {
    if (s === 'Resolved') return 'ok';
    if (s === 'Pending') return 'high';
    if (s === 'Scheduled') return 'low';
    return 'med';
  };

  const handleExportPDF = async () => {
    try {
      const element = document.getElementById('audit-report-printable');
      if (!element) {
        window.print();
        return;
      }

      const { default: jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');

      const footer = element.querySelector('.audit-modal-footer');
      const closeBtn = element.querySelector('.modal-close-x');
      if (footer) footer.style.display = 'none';
      if (closeBtn) closeBtn.style.display = 'none';

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      if (footer) footer.style.display = '';
      if (closeBtn) closeBtn.style.display = '';

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`TreeCanopy_Audit_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.warn('PDF export fallback:', err);
      window.print();
    }
  };

  if (!adminAuthed) {
    return (
      <div style={{
        display: 'flex',
        minHeight: '100vh',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        background: '#f8fafc',
      }}>
        <style>{`
          @keyframes adminShake {
            0%,100%{transform:translateX(0)}
            20%{transform:translateX(-10px)}
            40%{transform:translateX(10px)}
            60%{transform:translateX(-8px)}
            80%{transform:translateX(8px)}
          }
          .admin-gate-card.shake { animation: adminShake 0.5s ease; }
          .admin-gate-input:focus { outline: none; border-color: #1b4332 !important; box-shadow: 0 0 0 3px rgba(27,67,50,0.15); }
        `}</style>

        {/* Left Column (Banner/Info) */}
        <div style={{
          flex: '1',
          backgroundImage: "linear-gradient(rgba(27, 67, 50, 0.45), rgba(27, 67, 50, 0.85)), url('/forest_canopy_login.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '5rem 4rem',
          color: '#fff',
        }}>
          <h1 style={{ fontSize: '3rem', fontWeight: '800', margin: '0 0 1.25rem', lineHeight: '1.15', letterSpacing: '-0.02em' }}>
            Welcome to the<br />Canopy
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'rgba(255, 255, 255, 0.9)', maxWidth: '480px', margin: 0, lineHeight: '1.65' }}>
            The intelligence hub for municipal forestry. Access your dashboard to monitor, maintain, and expand the city's living infrastructure.
          </p>
        </div>

        {/* Right Column (Form) */}
        <div style={{
          width: '560px',
          background: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '3rem 5rem',
          boxSizing: 'border-box',
        }}>
          <div style={{ width: '100%', maxWidth: '380px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '2.0rem', color: '#111827', margin: '0 0 0.5rem', fontWeight: '800', letterSpacing: '-0.02em' }}>
              Sign in to your account
            </h2>
            <p style={{ fontSize: '0.95rem', color: '#4b5563', margin: '0 0 2.25rem' }}>
              Enter your credentials to manage municipal assets.
            </p>

            {/* Form Card */}
            <div
              className={`admin-gate-card${adminShake ? ' shake' : ''}`}
              style={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '16px',
                padding: '2.25rem 1.75rem',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -4px rgba(0,0,0,0.05)',
              }}
            >
              <form onSubmit={handleAdminLogin}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', color: '#374151', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                    Username
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '1.1rem', fontWeight: '500' }}>
                      @
                    </span>
                    <input
                      id="admin-username"
                      className="admin-gate-input"
                      type="text"
                      value={adminUser}
                      onChange={e => { setAdminUser(e.target.value); setAdminError(''); }}
                      placeholder="Enter username"
                      autoFocus
                      required
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: '#fff',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px', padding: '0.75rem 1rem 0.75rem 2.2rem',
                        color: '#1f2937', fontSize: '0.95rem',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ color: '#374151', fontSize: '0.85rem', fontWeight: '600' }}>
                      Password
                    </label>
                    <a href="/forgot-password" style={{ color: '#166534', fontSize: '0.8rem', fontWeight: '600', textDecoration: 'none' }}>
                      Forgot Password?
                    </a>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', display: 'flex', alignItems: 'center' }}>
                      <Lock size={16} />
                    </span>
                    <input
                      id="admin-password"
                      className="admin-gate-input"
                      type={showAdminPass ? 'text' : 'password'}
                      value={adminPass}
                      onChange={e => { setAdminPass(e.target.value); setAdminError(''); }}
                      placeholder="Enter password"
                      required
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: '#fff',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px', padding: '0.75rem 2.8rem 0.75rem 2.2rem',
                        color: '#1f2937', fontSize: '0.95rem',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPass(p => !p)}
                      style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center', padding: 0 }}
                    >
                      {showAdminPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {adminError && (
                  <div style={{
                    background: '#fef2f2', border: '1px solid #fee2e2',
                    borderRadius: '8px', padding: '0.65rem 1rem', marginBottom: '1.25rem',
                    color: '#991b1b', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                  }}>
                    ⚠️ {adminError}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  <input type="checkbox" id="keep-logged-in-admin" style={{ cursor: 'pointer' }} />
                  <label htmlFor="keep-logged-in-admin" style={{ color: '#4b5563', fontSize: '0.85rem', cursor: 'pointer' }}>
                    Keep me logged in
                  </label>
                </div>

                <button
                  type="submit"
                  style={{
                    width: '100%', padding: '0.8rem',
                    background: '#1b4332',
                    border: 'none', borderRadius: '8px',
                    color: '#fff', fontSize: '0.95rem', fontWeight: '600',
                    cursor: 'pointer', transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  }}
                >
                  <LogIn size={16} /> Login to Dashboard
                </button>
              </form>
            </div>

            <p style={{ textAlign: 'center', marginTop: '2.5rem', color: '#9ca3af', fontSize: '0.75rem' }}>
              🌳 CanopyGuard System Administration
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cg-app">
      <Sidebar active="Settings" admin isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
      <div className="cg-workspace">
        <Topbar title="Admin Console" search="Search system logs..." onToggleSidebar={() => setSidebarOpen(true)} />
        <main className="cg-page">
          <section className="cg-admin-head">
            <div>
              <span>Management Dashboard</span>
              <h1>System Oversight & Governance</h1>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <Link className="cg-btn outline" to="/home">
                <Home size={18} /> Return Home
              </Link>
              <Link className="cg-btn outline" to="/add-property" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={18} /> Add Property
              </Link>
              <button className="dark" onClick={() => setShowOfficialModal(true)}>
                <Plus /> New Official
              </button>
            </div>
          </section>

          {/* Live Complaints Inbox */}
          <section className="cg-panel complaints-inbox">
            <header>
              <div>
                <h2><AlertTriangle size={20} /> Citizen Complaints Inbox</h2>
                <p>All reported issues — visible to Admin &amp; Officials.</p>
              </div>
              <span className="complaints-count">{complaints.length} Total</span>
            </header>
            {complaintsLoading ? (
              <p className="complaints-loading">Loading complaints…</p>
            ) : complaints.length === 0 ? (
              <p className="complaints-empty">No complaints submitted yet.</p>
            ) : (
              <table className="cg-table wide">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Issue Type</th>
                    <th>Description</th>
                    <th>Location</th>
                    <th>Submitted By</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Update</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map((c, i) => (
                    <tr key={c._id}>
                      <td><small>{i + 1}</small></td>
                      <td><b>{issueLabels[c.issueType] || c.issueType}</b></td>
                      <td>{c.description || <i style={{ color: '#aaa' }}>—</i>}</td>
                      <td>{c.location || <i style={{ color: '#aaa' }}>—</i>}</td>
                      <td>{c.submittedBy}</td>
                      <td><small>{new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</small></td>
                      <td><span className={`tag ${statusTag(c.status)}`}>{c.status}</span></td>
                      <td>
                        <select
                          className="complaint-status-select"
                          value={c.status}
                          onChange={e => updateStatus(c._id, e.target.value)}
                        >
                          {['Pending', 'In Review', 'Scheduled', 'Resolved'].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="cg-admin-grid">
            <div className="cg-panel performance">
              <header><div><h2>Global Performance Report</h2><p>Real-time system health and processing latency across sectors.</p></div><span>Updated 2m ago</span></header>
              <div className="perf-cards">{[['Response Time', '124ms', '65%'], ['Active Complaints', complaints.filter(c => c.status === 'Pending').length || 0, '34%'], ['Cutter Efficiency', '94.2%', '94%']].map(([a, b, w]) => <article key={a}><span>{a}</span><b>{b}</b><i style={{ width: w }}></i></article>)}</div>
              <button className="audit" onClick={() => setShowAuditModal(true)}><BarChart3 /> Generate Full Audit Intelligence Report</button>
            </div>
          </section>
          <section className="cg-panel ecosystem">
            <header>
              <div>
                <h2>User Ecosystem</h2>
                <p>Managing Public Contributors, Officials, and Cutters.</p>
              </div>
              <div className="ecosystem-tabs">
                {['Public', 'Cutters'].map(tab => (
                  <button
                    key={tab}
                    className={ecosystemTab === tab ? 'active' : ''}
                    onClick={() => setEcosystemTab(tab)}
                  >
                    {tab === 'Public' ? 'Registered Users' : 'Tree Cutters'}
                  </button>
                ))}
              </div>
            </header>
            <table className="cg-table wide">
              <thead>
                <tr>
                  <th>Name / ID</th>
                  <th>Role</th>
                  <th>Assigned Sector</th>
                  <th>Last Sync</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(([initials, name, id, role, sector, sync, status, dbId]) => (
                  <tr key={id}>
                    <td>
                      <span className="avatar small">{initials}</span>
                      <b>{name}</b>
                      <small>{id}</small>
                    </td>
                    <td>{role}</td>
                    <td>{sector}</td>
                    <td>{sync}</td>
                    <td>
                      <span className={`tag ${status === 'Verified' ? 'ok' : status === 'Rejected' ? 'low' : 'med'}`}>
                        {status}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => handleEditRole(name, role, dbId, [initials, name, id, role, sector, sync, status])}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', padding: '4px', marginRight: '6px' }}
                        title="View Details & Reports"
                      >
                        <Pencil size={18} />
                      </button>

                      <button
                        onClick={() => handleDeleteUser(name, dbId)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px', marginRight: '8px' }}
                        title="Delete User Account"
                      >
                        <Trash2 size={18} />
                      </button>

                      {dbId && (role === 'Arborist / Cutter' || role === 'Tree Cutter') && (
                        <>
                          <button
                            onClick={() => handleAcceptUser(dbId, name)}
                            style={{
                              padding: '4px 8px',
                              fontSize: '0.75rem',
                              backgroundColor: status === 'Verified' ? '#e2e8f0' : '#dcfce7',
                              color: status === 'Verified' ? '#94a3b8' : '#15803d',
                              border: '1px solid ' + (status === 'Verified' ? '#cbd5e1' : '#bbf7d0'),
                              borderRadius: '4px',
                              cursor: status === 'Verified' ? 'not-allowed' : 'pointer',
                              marginRight: '6px',
                              fontWeight: 600
                            }}
                            title="Accept / Verify Tree Cutter"
                            disabled={status === 'Verified'}
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleRejectUser(dbId, name)}
                            style={{
                              padding: '4px 8px',
                              fontSize: '0.75rem',
                              backgroundColor: status === 'Rejected' ? '#e2e8f0' : '#fee2e2',
                              color: status === 'Rejected' ? '#94a3b8' : '#b91c1c',
                              border: '1px solid ' + (status === 'Rejected' ? '#cbd5e1' : '#fecaca'),
                              borderRadius: '4px',
                              cursor: status === 'Rejected' ? 'not-allowed' : 'pointer',
                              marginRight: '6px',
                              fontWeight: 600
                            }}
                            title="Reject Tree Cutter"
                            disabled={status === 'Rejected'}
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </main>
      </div>

      {showOfficialModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem',
          animation: 'fadeIn 0.2s ease-out',
        }}>
          <style>{`
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            .modal-content { animation: scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); }
          `}</style>
          <div
            className="modal-content"
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
              overflow: 'hidden',
            }}
          >
            <div style={{
              background: 'linear-gradient(135deg, #022017 0%, #064e3b 100%)',
              padding: '24px',
              color: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Add New Official</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>Create authorized official access credentials</p>
              </div>
              <button
                onClick={() => setShowOfficialModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '1.25rem',
                  opacity: 0.8,
                  padding: 0
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOfficial} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {registerError && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  color: '#b91c1c',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  textAlign: 'left'
                }}>
                  ⚠️ {registerError}
                </div>
              )}

              {registerSuccess && (
                <div style={{
                  background: '#f0fdf4',
                  border: '1px solid #86efac',
                  color: '#166534',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  textAlign: 'left'
                }}>
                  ✅ {registerSuccess}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', textAlign: 'left' }}>FULL NAME</label>
                <input
                  type="text"
                  value={officialName}
                  onChange={e => setOfficialName(e.target.value)}
                  placeholder="e.g. Elias Kahan"
                  required
                  style={{
                    height: '42px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', textAlign: 'left' }}>EMAIL ADDRESS</label>
                <input
                  type="email"
                  value={officialEmail}
                  onChange={e => setOfficialEmail(e.target.value)}
                  placeholder="e.g. elias@official.gov"
                  required
                  style={{
                    height: '42px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', textAlign: 'left' }}>PHONE NUMBER</label>
                <input
                  type="tel"
                  value={officialPhone}
                  onChange={e => setOfficialPhone(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  required
                  style={{
                    height: '42px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', textAlign: 'left' }}>PASSWORD</label>
                <input
                  type="password"
                  value={officialPassword}
                  onChange={e => setOfficialPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    height: '42px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', textAlign: 'left' }}>ASSIGNED SECTOR</label>
                <select
                  value={officialSector}
                  onChange={e => setOfficialSector(e.target.value)}
                  style={{
                    height: '42px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    background: '#ffffff',
                    outline: 'none',
                  }}
                >
                  <option value="Global HQ">Global HQ</option>
                  <option value="Northern Precinct">Northern Precinct</option>
                  <option value="Southern Wetlands">Southern Wetlands</option>
                  <option value="Central District">Central District</option>
                  <option value="Urban Core (East)">Urban Core (East)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowOfficialModal(false)}
                  style={{
                    flex: 1,
                    height: '42px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#334155',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registerLoading}
                  style={{
                    flex: 1,
                    height: '42px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#10b981',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
                  }}
                >
                  {registerLoading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPublicDetailModal && selectedPublicUser && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem',
          animation: 'fadeIn 0.2s ease-out',
        }}>
          <div
            className="modal-content"
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '650px',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '85vh'
            }}
          >
            <div style={{
              background: 'linear-gradient(135deg, #022017 0%, #064e3b 100%)',
              padding: '24px',
              color: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Public Contributor Dashboard</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>Details and reports submitted by {selectedPublicUser.name}</p>
              </div>
              <button
                onClick={() => setShowPublicDetailModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '1.25rem',
                  opacity: 0.8,
                  padding: 0
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '18px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px 20px',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>NAME</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>{selectedPublicUser.name}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>USER ID</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>{selectedPublicUser.id}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>ROLE</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>{selectedPublicUser.role}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>REGISTRATION DATE</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>{selectedPublicUser.sync}</span>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', textAlign: 'left' }}>
                  Submitted Reports ({publicUserReports.length})
                </h4>

                {loadingReports ? (
                  <p style={{ fontSize: '0.9rem', color: '#64748b', textAlign: 'center', padding: '20px' }}>Loading reported issues...</p>
                ) : publicUserReports.length === 0 ? (
                  <div style={{
                    padding: '30px',
                    background: '#f8fafc',
                    border: '1px dashed #e2e8f0',
                    borderRadius: '12px',
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: '0.9rem',
                  }}>
                    🌳 No reported complaints found for this contributor.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {publicUserReports.map(report => (
                      <div
                        key={report._id}
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '16px',
                          background: '#ffffff',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          textAlign: 'left'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <b style={{ fontSize: '0.95rem', color: '#0f172a' }}>{issueLabels[report.issueType] || report.issueType}</b>
                          <span className={`tag ${statusTag(report.status)}`}>{report.status}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>
                          <strong>Location:</strong> {report.location || 'Not specified'}
                        </p>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>
                          <strong>Description:</strong> {report.description || 'No description provided.'}
                        </p>
                        <small style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                          Reported on: {new Date(report.createdAt).toLocaleString('en-IN')}
                        </small>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{
              background: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              padding: '16px 24px',
              display: 'flex',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => setShowPublicDetailModal(false)}
                style={{
                  height: '38px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#334155',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '0 16px',
                }}
              >
                Close Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {showAuditModal && (() => {
        const getSectorComplaintsCount = (sectorName) => {
          return complaints.filter(c => {
            const loc = (c.location || '').toLowerCase();
            const desc = (c.description || '').toLowerCase();
            if (sectorName === 'Northern Precinct') return loc.includes('north') || desc.includes('north');
            if (sectorName === 'Urban Core (East)') return loc.includes('east') || loc.includes('urban') || desc.includes('east') || desc.includes('urban');
            if (sectorName === 'Southern Wetlands') return loc.includes('south') || loc.includes('wetland') || desc.includes('south') || desc.includes('wetland');
            if (sectorName === 'Central District') {
              return !loc.includes('north') && !loc.includes('south') && !loc.includes('east') && !loc.includes('urban');
            }
            return false;
          }).length;
        };

        const completedCount = complaints.filter(c => ['Resolved', 'Work Completed', 'Waste Disposed'].includes(c.status)).length;
        const activeCount = complaints.filter(c => ['Scheduled', 'In Progress'].includes(c.status)).length;
        const pendingReviewCount = complaints.filter(c => ['Pending', 'In Review'].includes(c.status)).length;

        return (
          <div className="audit-modal-overlay" style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
            animation: 'fadeIn 0.2s ease-out',
          }}>
            <div
              className="audit-modal-content"
              id="audit-report-printable"
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '720px',
                boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.3)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '90vh'
              }}
            >
              <div className="audit-modal-header" style={{
                background: 'linear-gradient(135deg, #022017 0%, #064e3b 100%)',
                padding: '28px 32px',
                color: '#ffffff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <span style={{ color: '#4ade80', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px' }}>System Diagnostics</span>
                  <h3 style={{ margin: '4px 0 0', fontSize: '1.4rem', fontWeight: 800 }}>Audit Intelligence Report</h3>
                </div>
                <button
                  className="modal-close-x"
                  onClick={() => setShowAuditModal(false)}
                  style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', fontSize: '1.5rem', opacity: 0.8 }}
                >
                  ✕
                </button>
              </div>

              <div className="audit-modal-body" style={{ padding: '32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                  <div>
                    <small style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>REPORT GENERATED</small>
                    <p style={{ margin: '2px 0 0', fontSize: '0.9rem', color: '#0f172a', fontWeight: 700 }}>{new Date().toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <small style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>DIAGNOSTIC ID</small>
                    <p style={{ margin: '2px 0 0', fontSize: '0.9rem', color: '#10b981', fontWeight: 700 }}>#AUD-{Math.floor(100000 + Math.random() * 900000)}</p>
                  </div>
                  <div>
                    <small style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>SYSTEM STATUS</small>
                    <p style={{ margin: '2px 0 0', fontSize: '0.9rem', color: '#10b981', fontWeight: 700 }}>● Fully Operational</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>TOTAL SUBMISSIONS</span>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 0' }}>{complaints.length}</h2>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>COMPLETED CASES</span>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981', margin: '4px 0 0' }}>{completedCount}</h2>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>PENDING / IN REVIEW</span>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f59e0b', margin: '4px 0 0' }}>{pendingReviewCount}</h2>
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.5px' }}>Complaint Processing Latency</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[
                      ['Completed (Resolved, Waste Disposed, Work Completed)', completedCount, '#10b981'],
                      ['Active (Scheduled, In Progress)', activeCount, '#3b82f6'],
                      ['Pending / Under Review', pendingReviewCount, '#f59e0b'],
                    ].map(([label, count, color]) => {
                      const pct = complaints.length ? Math.round((count / complaints.length) * 100) : 0;
                      return (
                        <div key={label}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 600, color: '#334155' }}>{label}</span>
                            <span style={{ fontWeight: 700, color: '#0f172a' }}>{count} ({pct}%)</span>
                          </div>
                          <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: color, width: `${pct}%`, borderRadius: '4px', transition: 'width 0.5s ease-out' }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.5px' }}>Sector Canopy Density & Health</h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '8px 0', color: '#64748b', textAlign: 'left', fontWeight: 600 }}>SECTOR NAME</th>
                        <th style={{ padding: '8px 0', color: '#64748b', textAlign: 'center', fontWeight: 600 }}>CANOPY DENSITY</th>
                        <th style={{ padding: '8px 0', color: '#64748b', textAlign: 'center', fontWeight: 600 }}>HEALTH RATING</th>
                        <th style={{ padding: '8px 0', color: '#64748b', textAlign: 'right', fontWeight: 600 }}>ACTIVE CASES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['Northern Precinct', 'High (68%)', 'Outstanding (92%)'],
                        ['Urban Core (East)', 'Moderate (42%)', 'Good (78%)'],
                        ['Southern Wetlands', 'High (71%)', 'Healthy (88%)'],
                        ['Central District', 'Low (28%)', 'Needs Action (55%)'],
                      ].map(([sector, density, rating]) => {
                        const cases = getSectorComplaintsCount(sector);
                        return (
                          <tr key={sector} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px 0', color: '#0f172a', fontWeight: 600 }}>{sector}</td>
                            <td style={{ padding: '10px 0', color: '#475569', textAlign: 'center' }}>{density}</td>
                            <td style={{ padding: '10px 0', color: '#10b981', textAlign: 'center', fontWeight: 600 }}>{rating}</td>
                            <td style={{ padding: '10px 0', color: cases > 0 ? '#ef4444' : '#64748b', textAlign: 'right', fontWeight: 700 }}>
                              {cases} {cases === 1 ? 'case' : 'cases'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

              </div>

              <div className="audit-modal-footer" style={{
                background: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                padding: '20px 32px',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={() => setShowAuditModal(false)}
                  style={{
                    height: '38px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#334155',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '0 16px',
                  }}
                >
                  Close
                </button>
                <button
                  onClick={handleExportPDF}
                  style={{
                    height: '38px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#0d9488',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '0 16px',
                    boxShadow: '0 4px 12px rgba(13, 148, 136, 0.2)',
                  }}
                >
                  Export PDF
                </button>
                <button
                  onClick={() => window.print()}
                  style={{
                    height: '38px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#043224',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '0 16px',
                    boxShadow: '0 4px 12px rgba(4, 50, 36, 0.2)',
                  }}
                >
                  Print Diagnostic Report
                </button>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
}

export function TreeInventoryPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const formRef = useRef(null);
  const initialFormState = {
    name: '', scientificName: '', family: '', origin: '', category: '', lifespan: '',
    height: '', ageRange: '', canopySpread: '', description: '', climate: '', soilType: '',
    sunlight: '', growthRate: '', leafType: '', floweringSeason: '', fruitingSeason: '',
    carbonSequestration: '', notes: '', healthScore: 90, canopyCoverage: 80,
    waterRequirement: 'Medium', benefits: '', diseases: '', pests: '', image: '',
    lat: 15.3600, lng: 75.1300
  };
  const [form, setForm] = useState(initialFormState);
  const [trees, setTrees] = useState([]);
  const [selectedTree, setSelectedTree] = useState(null);
  const [status, setStatus] = useState('');
  const [showForm, setShowForm] = useState(false);

  const fetchTrees = async () => {
    try {
      const res = await fetch(`${API_URL}/api/trees`);
      if (res.ok) {
        const data = await res.json();
        setTrees(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching trees:', err);
    }
  };

  useEffect(() => {
    fetchTrees();
    const interval = setInterval(fetchTrees, 4000);
    return () => clearInterval(interval);
  }, []);

  const filteredTrees = trees.filter((tree) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (tree.name || '').toLowerCase().includes(q) ||
      (tree.scientificName || '').toLowerCase().includes(q) ||
      (tree.family || '').toLowerCase().includes(q) ||
      (tree.origin || '').toLowerCase().includes(q) ||
      (tree.category || '').toLowerCase().includes(q)
    );
  });

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setStatus('Uploading tree image...');

    try {
      const uploadForm = new FormData();
      uploadForm.append('image', file);

      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: uploadForm
      });

      if (res.ok) {
        const data = await res.json();
        const uploadedUrl = `${API_URL}${data.url}`;
        setForm((prev) => ({ ...prev, image: uploadedUrl }));
        setStatus('Image uploaded successfully.');
      } else {
        const data = await res.json();
        setStatus(data.msg || 'Failed to upload image.');
      }
    } catch (err) {
      console.error('Error uploading tree image:', err);
      setStatus('Connection error. Failed to upload image.');
    }
  };

  const parseCommaInput = (input) => {
    if (Array.isArray(input)) return input;
    if (!input) return [];
    return input.split(',').map((s) => s.trim()).filter(Boolean);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.scientificName) {
      setStatus('Tree name and scientific name are required.');
      return;
    }

    const submission = {
      ...form,
      benefits: parseCommaInput(form.benefits),
      pests: parseCommaInput(form.pests),
      diseases: parseCommaInput(form.diseases),
    };

    try {
      if (editingId) {
        const res = await fetch(`${API_URL}/api/trees/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submission)
        });
        if (res.ok) {
          setStatus('Tree updated successfully in database!');
          setEditingId(null);
          fetchTrees();
        } else {
          const errData = await res.json();
          setStatus(errData.msg || 'Failed to update tree in database.');
        }
      } else {
        const payload = {
          ...submission,
          addedAt: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        };
        const res = await fetch(`${API_URL}/api/trees`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          setStatus('Tree added successfully and saved to database!');
          fetchTrees();
        } else {
          const errData = await res.json();
          setStatus(errData.msg || 'Failed to save tree to database.');
        }
      }
      setForm(initialFormState);
      setShowForm(false);
    } catch (err) {
      setStatus('Server connection error. Please try again.');
    }
  };

  const handleStartEdit = (tree) => {
    setForm({
      ...tree,
      benefits: Array.isArray(tree.benefits) ? tree.benefits.join(', ') : tree.benefits || '',
      pests: Array.isArray(tree.pests) ? tree.pests.join(', ') : tree.pests || '',
      diseases: Array.isArray(tree.diseases) ? tree.diseases.join(', ') : tree.diseases || '',
    });
    setEditingId(tree._id || tree.id);
    setShowForm(true);
    setSelectedTree(null);

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (formRef.current) {
        formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      const pageEl = document.querySelector('.cg-workspace') || document.querySelector('.cg-page');
      if (pageEl && pageEl.scrollTo) {
        pageEl.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 50);
  };

  const handleDeleteTree = async (tree, e) => {
    if (e) e.stopPropagation();
    const treeId = tree._id || tree.id;
    if (!treeId) return;

    if (!window.confirm(`Are you sure you want to delete "${tree.name}" from the database?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/trees/${treeId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setStatus(`Tree "${tree.name}" deleted successfully from database.`);
        if (selectedTree && (selectedTree._id === treeId || selectedTree.id === treeId)) {
          setSelectedTree(null);
        }
        fetchTrees();
      } else {
        const data = await res.json();
        alert(data.msg || 'Failed to delete tree from database.');
      }
    } catch (err) {
      console.error('Error deleting tree:', err);
      alert('Server connection error. Failed to delete tree.');
    }
  };

  const getTreeDetails = (tree) => {
    const isMango = tree?.name?.toLowerCase().includes('mango');

    return {
      name: tree?.name || 'Mango Tree',
      scientificName: tree?.scientificName || 'Mangifera indica',
      family: tree?.family || 'Anacardiaceae',
      category: tree?.category || (isMango ? 'Evergreen Fruit Tree' : 'Fruit Tree'),
      origin: tree?.origin || (isMango ? 'India and Southeast Asia' : 'India'),
      lifespan: tree?.lifespan || '100 – 300 years',
      addedDate: tree?.addedAt ? tree.addedAt.split(',')[0] : '29 Jun 2026',
      treeId: tree?.id || 'TR-2026-00048',

      age: tree?.ageRange || '2 Years',
      location: tree?.origin || 'Kaup, Udupi',
      height: tree?.height || '10 – 30 m',
      canopySpread: tree?.canopySpread || '8 – 15 m',

      description: tree?.description || 'Mango is a tropical evergreen tree known for its delicious fruits and wide canopy. It provides excellent shade, improves air quality, and supports ecosystem biodiversity.',

      climate: tree?.climate || 'Tropical & Subtropical',
      soilType: tree?.soilType || 'Well-drained loamy soil (pH 5.5 – 7.5)',
      sunlight: tree?.sunlight || 'Full Sun (6 – 8 hrs daily)',
      waterRequirement: tree?.waterRequirement || 'Moderate',
      growthRate: tree?.growthRate || 'Moderate',
      leafType: tree?.leafType || 'Simple, evergreen, dark green leaves',
      floweringSeason: tree?.floweringSeason || 'Dec – Mar (varies by region)',
      fruitingSeason: tree?.fruitingSeason || 'Mar – Jul (varies by region)',
      carbonSequestration: tree?.carbonSequestration || 'High (absorbs significant CO2 over its lifetime)',

      healthScore: tree?.healthScore !== undefined ? tree.healthScore : 95,
      canopyCoverage: tree?.canopyCoverage !== undefined ? tree.canopyCoverage : 80,
      waterRequirementOverview: tree?.waterRequirementOverview || 'Medium',

      benefits: tree?.benefits && tree.benefits.length > 0 ? tree.benefits : [
        'Provides shade and reduces heat',
        'Improves air quality',
        'Helps prevent soil erosion',
        'Supports birds, bees and pollinators'
      ],

      diseases: tree?.diseases && tree.diseases.length > 0 ? tree.diseases : [
        'Anthracnose',
        'Powdery Mildew',
        'Bacterial Black Spot'
      ],

      pests: tree?.pests && tree.pests.length > 0 ? tree.pests : [
        'Mango Hopper',
        'Fruit Fly',
        'Mealybugs',
        'Stem Borer'
      ],

      notes: tree?.notes || 'Tree is in good condition. Regular monitoring is recommended. Ensure proper watering during dry season.',
      image: tree?.image || ''
    };
  };

  if (selectedTree) {
    const details = getTreeDetails(selectedTree);

    const getBenefitIcon = (benefit) => {
      const text = benefit.toLowerCase();
      if (text.includes('shade') || text.includes('heat') || text.includes('cool')) return <Umbrella size={18} color="#15803d" />;
      if (text.includes('air') || text.includes('oxygen') || text.includes('pollution') || text.includes('quality')) return <Wind size={18} color="#15803d" />;
      if (text.includes('soil') || text.includes('erosion') || text.includes('root') || text.includes('prevent')) return <Sprout size={18} color="#15803d" />;
      if (text.includes('bird') || text.includes('bee') || text.includes('pollinator') || text.includes('wildlife') || text.includes('animal') || text.includes('insect') || text.includes('support')) return <Bird size={18} color="#15803d" />;
      return <Leaf size={18} color="#15803d" />;
    };

    return (
      <div className="cg-app cg-dashboard-screen">
        <div className="cg-workspace no-sidebar" style={{ width: '100%' }}>
          <header className="cg-topbar detail-topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '80px', padding: '0 clamp(16px, 2vw, 32px)', background: '#ffffff', borderBottom: '1px solid #dfe7e3', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={() => setSelectedTree(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#1f2937', fontSize: '1.25rem', fontWeight: 'bold', gap: '8px' }}>
                <ChevronLeft size={24} />
                <span>Tree Inventory</span>
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button onClick={() => {
                setForm({
                  name: '', scientificName: '', family: '', origin: '', height: '', ageRange: '',
                  canopySpread: '', description: '', healthScore: 90, canopyCoverage: 80,
                  waterRequirement: 'Medium', benefits: '', diseases: '', pests: '', image: '',
                  lat: 15.3600, lng: 75.1300
                });
                setEditingId(null);
                setShowForm(true);
                setSelectedTree(null);
              }} className="add-tree-btn" style={{ background: '#046b4e', borderRadius: '8px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.875rem', color: '#ffffff', border: 'none', cursor: 'pointer' }}>
                <Plus size={16} /> Add Tree
              </button>
              <div style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <Bell size={24} color="#475569" />
                <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: '#ffffff', fontSize: '0.65rem', fontWeight: 'bold', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3</span>
              </div>
              <CircleUserRound size={28} color="#475569" style={{ cursor: 'pointer' }} />
            </div>
          </header>

          <main className="cg-page" style={{ padding: '24px clamp(16px, 2vw, 32px)' }}>
            <div className="tree-detail-grid">

              {/* Left Column */}
              <div className="tree-detail-left">
                {/* Image Card */}
                <div className="tree-detail-image-card">
                  {details.image ? (
                    <img src={details.image} alt={details.name} />
                  ) : (
                    <div className="tree-placeholder">No Image</div>
                  )}
                  <button className="view-image-overlay-btn" onClick={() => {
                    if (details.image) {
                      const w = window.open();
                      w.document.write(`<img src="${details.image}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`);
                    } else {
                      alert('No image uploaded for this tree.');
                    }
                  }}>
                    <Eye size={16} style={{ marginRight: '6px' }} /> View Image
                  </button>
                </div>

                {/* About This Tree Card */}
                <div className="tree-section-card info-card">
                  <h3 className="section-title">
                    <span className="icon-wrapper info-circle"><Sprout size={18} /></span>
                    About This Tree
                  </h3>
                  <p className="about-text">{details.description}</p>

                  <div className="characteristics-list">
                    <div className="characteristic-item">
                      <div className="char-left">
                        <Globe className="char-icon" size={16} />
                        <span className="char-label">Climate</span>
                      </div>
                      <span className="char-separator">:</span>
                      <span className="char-val">{details.climate}</span>
                    </div>
                    <div className="characteristic-item">
                      <div className="char-left">
                        <Layers className="char-icon" size={16} />
                        <span className="char-label">Soil Type</span>
                      </div>
                      <span className="char-separator">:</span>
                      <span className="char-val">{details.soilType}</span>
                    </div>
                    <div className="characteristic-item">
                      <div className="char-left">
                        <Sun className="char-icon" size={16} />
                        <span className="char-label">Sunlight</span>
                      </div>
                      <span className="char-separator">:</span>
                      <span className="char-val">{details.sunlight}</span>
                    </div>
                    <div className="characteristic-item">
                      <div className="char-left">
                        <Droplet className="char-icon" size={16} />
                        <span className="char-label">Water Requirement</span>
                      </div>
                      <span className="char-separator">:</span>
                      <span className="char-val">{details.waterRequirement}</span>
                    </div>
                    <div className="characteristic-item">
                      <div className="char-left">
                        <TrendingUp className="char-icon" size={16} />
                        <span className="char-label">Growth Rate</span>
                      </div>
                      <span className="char-separator">:</span>
                      <span className="char-val">{details.growthRate}</span>
                    </div>
                    <div className="characteristic-item">
                      <div className="char-left">
                        <Leaf className="char-icon" size={16} />
                        <span className="char-label">Leaf Type</span>
                      </div>
                      <span className="char-separator">:</span>
                      <span className="char-val">{details.leafType}</span>
                    </div>
                    <div className="characteristic-item">
                      <div className="char-left">
                        <Flower className="char-icon" size={16} />
                        <span className="char-label">Flowering Season</span>
                      </div>
                      <span className="char-separator">:</span>
                      <span className="char-val">{details.floweringSeason}</span>
                    </div>
                    <div className="characteristic-item">
                      <div className="char-left">
                        <Flower className="char-icon" size={16} />
                        <span className="char-label">Fruiting Season</span>
                      </div>
                      <span className="char-separator">:</span>
                      <span className="char-val">{details.fruitingSeason}</span>
                    </div>
                    <div className="characteristic-item">
                      <div className="char-left">
                        <Leaf className="char-icon" size={16} />
                        <span className="char-label">Carbon Sequestration</span>
                      </div>
                      <span className="char-separator">:</span>
                      <span className="char-val">{details.carbonSequestration}</span>
                    </div>
                  </div>
                </div>

                {/* Common Diseases Card */}
                <div className="tree-section-card disease-card">
                  <div className="card-flex-container">
                    <div className="card-list-side">
                      <h3 className="section-title disease">
                        <span className="icon-wrapper disease"><ShieldAlert size={18} /></span>
                        Common Diseases
                      </h3>
                      <ul className="bullet-list disease">
                        {details.diseases.map((d, index) => (
                          <li key={index}>{d}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="card-img-side">
                      <img src={diseasedLeafImg} alt="Spotted leaf showing disease symptoms" />
                    </div>
                  </div>
                </div>

                {/* Additional Notes (bottom-left) */}
                <div className="tree-section-card notes-card">
                  <h3 className="section-title notes">
                    <span className="icon-wrapper notes"><FileText size={18} /></span>
                    Additional Notes
                  </h3>
                  <p className="notes-text">{details.notes}</p>
                </div>
              </div>

              {/* Right Column */}
              <div className="tree-detail-right">
                {/* Title and badges card */}
                <div className="tree-title-card">
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div className="green-tree-icon-circle">
                      <TreePine size={24} color="#15803d" />
                    </div>
                    <div>
                      <h1 className="detail-tree-name">{details.name}</h1>
                      <p className="detail-sci-name">{details.scientificName}</p>
                    </div>
                    <span className="badge-pill healthy-badge">
                      <Heart size={14} style={{ fill: '#ffffff', marginRight: '4px' }} /> Healthy
                    </span>
                  </div>
                </div>

                {/* Quick Info Grid */}
                <div className="quick-info-grid">
                  <div className="quick-card">
                    <Sprout size={20} color="#15803d" />
                    <div>
                      <span className="quick-card-label">Age</span>
                      <strong className="quick-card-val">{details.age}</strong>
                    </div>
                  </div>
                  <div className="quick-card">
                    <MapPin size={20} color="#15803d" />
                    <div>
                      <span className="quick-card-label">Location</span>
                      <strong className="quick-card-val">{details.location}</strong>
                    </div>
                  </div>
                  <div className="quick-card">
                    <Ruler size={20} color="#15803d" />
                    <div>
                      <span className="quick-card-label">Height</span>
                      <strong className="quick-card-val">{details.height}</strong>
                    </div>
                  </div>
                  <div className="quick-card">
                    <Trees size={20} color="#15803d" />
                    <div>
                      <span className="quick-card-label">Canopy Spread</span>
                      <strong className="quick-card-val">{details.canopySpread}</strong>
                    </div>
                  </div>
                </div>

                {/* Detailed properties table */}
                <div className="tree-section-card table-card">
                  <div className="properties-list">
                    <div className="property-row">
                      <span className="prop-name">Scientific Name</span>
                      <span className="prop-val-wrap">: &nbsp; <span className="prop-val font-italic">{details.scientificName}</span></span>
                    </div>
                    <div className="property-row">
                      <span className="prop-name">Family</span>
                      <span className="prop-val-wrap">: &nbsp; <span className="prop-val">{details.family}</span></span>
                    </div>
                    <div className="property-row">
                      <span className="prop-name">Category</span>
                      <span className="prop-val-wrap">: &nbsp; <span className="prop-val">{details.category}</span></span>
                    </div>
                    <div className="property-row">
                      <span className="prop-name">Origin</span>
                      <span className="prop-val-wrap">: &nbsp; <span className="prop-val">{details.origin}</span></span>
                    </div>
                    <div className="property-row">
                      <span className="prop-name">Lifespan</span>
                      <span className="prop-val-wrap">: &nbsp; <span className="prop-val">{details.lifespan}</span></span>
                    </div>
                    <div className="property-row">
                      <span className="prop-name">Added Date</span>
                      <span className="prop-val-wrap">: &nbsp; <span className="prop-val"><CalendarDays size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> {details.addedDate}</span></span>
                    </div>
                    <div className="property-row">
                      <span className="prop-name">Tree ID</span>
                      <span className="prop-val-wrap">: &nbsp; <span className="prop-val font-mono"><Activity size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> {details.treeId}</span></span>
                    </div>
                  </div>
                </div>

                {/* Tree Health Overview */}
                <div className="tree-section-card health-overview-card">
                  <h3 className="section-title">
                    <span className="icon-wrapper health"><Activity size={18} /></span>
                    Tree Health Overview
                  </h3>

                  <div className="health-metrics-bars">
                    <div className="health-bar-item">
                      <div className="health-bar-labels">
                        <span className="health-bar-name">Health Score</span>
                        <span className="health-bar-pct">{details.healthScore}%</span>
                      </div>
                      <div className="progress-container">
                        <div className="progress-bar-fill green" style={{ width: `${details.healthScore}%` }}></div>
                      </div>
                    </div>

                    <div className="health-bar-item">
                      <div className="health-bar-labels">
                        <span className="health-bar-name">Canopy Coverage</span>
                        <span className="health-bar-pct">{details.canopyCoverage}%</span>
                      </div>
                      <div className="progress-container">
                        <div className="progress-bar-fill green" style={{ width: `${details.canopyCoverage}%` }}></div>
                      </div>
                    </div>

                    <div className="health-bar-item">
                      <div className="health-bar-labels">
                        <span className="health-bar-name">Water Requirement</span>
                        <span className="health-bar-pct">{details.waterRequirementOverview}</span>
                      </div>
                      <div className="progress-container">
                        <div className="progress-bar-fill blue" style={{ width: '50%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Environmental Benefits */}
                <div className="tree-section-card benefits-card">
                  <h3 className="section-title benefits">
                    <span className="icon-wrapper benefits"><Leaf size={18} /></span>
                    Environmental Benefits
                  </h3>
                  <div className="benefits-grid">
                    {details.benefits.map((benefit, index) => (
                      <div className="benefit-item" key={index}>
                        <span className="benefit-icon-wrap">
                          {getBenefitIcon(benefit)}
                        </span>
                        <span className="benefit-text">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Common Pests */}
                <div className="tree-section-card pests-card">
                  <div className="card-flex-container">
                    <div className="card-list-side">
                      <h3 className="section-title pests">
                        <span className="icon-wrapper pests"><Bug size={18} /></span>
                        Common Pests
                      </h3>
                      <ul className="bullet-list pests">
                        {details.pests.map((p, index) => (
                          <li key={index}>{p}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="card-img-side pests">
                      <img src={pestsGridImg} alt="Common garden pests grid" />
                    </div>
                  </div>
                </div>

                {/* Actions row at the bottom right */}
                <div className="detail-actions-row">
                  <button className="btn-detail-action edit" onClick={() => handleStartEdit(selectedTree)}>
                    <Pencil size={14} style={{ marginRight: '4px' }} /> Edit
                  </button>
                  <button className="btn-detail-action delete" onClick={(e) => handleDeleteTree(selectedTree, e)}>
                    <Trash2 size={14} style={{ marginRight: '4px' }} /> Delete
                  </button>
                  <button className="btn-detail-action details" onClick={() => {
                    alert(`Details diagnostics for ${selectedTree.name}: ID ${details.treeId}, Status Healthy.`);
                  }}>
                    <Eye size={14} style={{ marginRight: '4px' }} /> View Details
                  </button>
                </div>

              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="cg-app cg-dashboard-screen">
      <Sidebar active="Tree Inventory" admin isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
      <div className="cg-workspace">
        <Topbar title="Tree Inventory" onToggleSidebar={() => setSidebarOpen(true)} />
        <main className="cg-page">
          <section className="cg-tree-hero" ref={formRef}>
            <div>
              <h1>Tree Inventory Management</h1>
              <p>Maintain detailed records of all trees in your zones.</p>
            </div>
            <button onClick={() => {
              setForm({
                name: '', scientificName: '', family: '', origin: '', height: '', ageRange: '',
                canopySpread: '', description: '', healthScore: 90, canopyCoverage: 80,
                waterRequirement: 'Medium', benefits: '', diseases: '', pests: '', image: '',
                lat: 15.3600, lng: 75.1300
              });
              setEditingId(null);
              setShowForm(true);
              setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                if (formRef.current) formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                const pageEl = document.querySelector('.cg-workspace') || document.querySelector('.cg-page');
                if (pageEl && pageEl.scrollTo) pageEl.scrollTo({ top: 0, behavior: 'smooth' });
              }, 50);
            }} className="add-tree-btn">+ Add Tree</button>
          </section>
          {showForm && (
            <section className="cg-panel cg-tree-glass">
              <h2 style={{ color: '#043224', marginBottom: '1.5rem' }}>{editingId ? 'Edit Tree Details' : 'Add New Tree'}</h2>
              <form onSubmit={handleSubmit} className="tree-form">
                <div className="form-row">
                  <label>Tree Name*<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mango Tree" /></label>
                  <label>Scientific Name*<input value={form.scientificName} onChange={(e) => setForm({ ...form, scientificName: e.target.value })} placeholder="e.g. Mangifera indica" /></label>
                </div>
                <div className="form-row">
                  <label>Family<input value={form.family} onChange={(e) => setForm({ ...form, family: e.target.value })} placeholder="e.g. Anacardiaceae" /></label>
                  <label>Origin / Location<input value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} placeholder="e.g. Christian High School Campus, Udupi" /></label>
                  <label>Category<input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Evergreen Fruit Tree" /></label>
                </div>
                <div className="form-row">
                  <label>Height<input value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} placeholder="e.g. 10 – 30 m" /></label>
                  <label>Age Range / Lifespan<input value={form.lifespan} onChange={(e) => setForm({ ...form, lifespan: e.target.value })} placeholder="e.g. 100 – 300 years" /></label>
                  <label>Canopy Spread<input value={form.canopySpread} onChange={(e) => setForm({ ...form, canopySpread: e.target.value })} placeholder="e.g. 8 – 15 m" /></label>
                </div>
                <div className="form-row">
                  <label>Health Score (%)<input type="number" min="0" max="100" value={form.healthScore} onChange={(e) => setForm({ ...form, healthScore: parseInt(e.target.value) || 0 })} /></label>
                  <label>Canopy Coverage (%)<input type="number" min="0" max="100" value={form.canopyCoverage} onChange={(e) => setForm({ ...form, canopyCoverage: parseInt(e.target.value) || 0 })} /></label>
                  <label>Water Requirement<input value={form.waterRequirement} onChange={(e) => setForm({ ...form, waterRequirement: e.target.value })} placeholder="e.g. Medium" /></label>
                </div>
                <label>Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Enter detailed tree description..." rows={3} /></label>
                <label>Tree Image<input type="file" accept="image/*" onChange={handleFileChange} /></label>

                {/* ── Encyclopedia & Geolocation Details ── */}
                <h3 style={{ color: '#043224', marginTop: '1.5rem', marginBottom: '1rem', borderTop: '1px solid #cbd5e1', paddingTop: '1rem', fontSize: '1.1rem', fontWeight: '700' }}>
                  Encyclopedia & Geolocation Details
                </h3>
                <div className="form-row">
                  <label>Latitude (Udupi Grid)<input type="number" step="0.0001" value={form.lat} onChange={(e) => setForm({ ...form, lat: parseFloat(e.target.value) || 0 })} placeholder="e.g. 13.3409" /></label>
                  <label>Longitude (Udupi Grid)<input type="number" step="0.0001" value={form.lng} onChange={(e) => setForm({ ...form, lng: parseFloat(e.target.value) || 0 })} placeholder="e.g. 74.7421" /></label>
                  <label style={{ position: 'relative' }}>
                    Quick Presets
                    <button 
                      type="button" 
                      onClick={() => setForm({ ...form, lat: 13.3409, lng: 74.7421 })}
                      style={{
                        display: 'block', width: '100%', height: '38px', marginTop: '4px',
                        background: '#059669', color: '#ffffff', border: 'none', borderRadius: '6px',
                        fontWeight: '600', cursor: 'pointer', fontSize: '0.8rem'
                      }}
                    >
                      📍 Set Udupi Center
                    </button>
                  </label>
                </div>
                <div className="form-row">
                  <label>Environmental Benefits (comma-separated)<input value={form.benefits} onChange={(e) => setForm({ ...form, benefits: e.target.value })} placeholder="e.g. Substantial canopy cooling, Nesting habitat" /></label>
                  <label>Susceptible Diseases (comma-separated)<input value={form.diseases} onChange={(e) => setForm({ ...form, diseases: e.target.value })} placeholder="e.g. Leaf spot, Root rot" /></label>
                  <label>Common Pests (comma-separated)<input value={form.pests} onChange={(e) => setForm({ ...form, pests: e.target.value })} placeholder="e.g. Scale insects, Banyan thrips" /></label>
                </div>
                <label>Arborist / Maintenance Notes<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Enter detailed arborist comments or location context..." rows={2} /></label>

                <div style={{ display: 'flex', gap: '12px', marginTop: '1.5rem' }}>
                  <button type="submit" className="form-submit-btn">{editingId ? 'Save Changes' : 'Save Tree'}</button>
                  <button type="button" onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setForm(initialFormState);
                  }} className="form-cancel-btn" style={{ padding: '1rem 1.5rem', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: '700', cursor: 'pointer' }}>Cancel</button>
                </div>
              </form>
              {status && <p className="cg-note">{status}</p>}
            </section>
          )}
          {/* KPI Overview Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Species</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{trees.length}</div>
              <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>Active in Database</span>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Optimal Health</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#047857', marginTop: '4px' }}>{trees.filter(t => (t.healthScore ?? 90) >= 80).length}</div>
              <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>Health Score ≥ 80%</span>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Requires Attention</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#b45309', marginTop: '4px' }}>{trees.filter(t => (t.healthScore ?? 90) < 80).length}</div>
              <span style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 600 }}>Fair or Alert Condition</span>
            </div>
          </div>

          <section className="cg-panel cg-tree-glass">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.3rem', fontWeight: 700 }}>
                Tree Inventory Catalog ({filteredTrees.length})
              </h2>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', minWidth: '260px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
                  <input
                    type="text"
                    placeholder="Search by name, family, location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      padding: '8px 12px 8px 36px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.875rem',
                      width: '100%',
                      outline: 'none',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                    }}
                  />
                </div>
                <button
                  onClick={fetchTrees}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    padding: '8px 14px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                  }}
                  title="Click to manually refresh tree list from database"
                >
                  🔄 Refresh List
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {filteredTrees.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', textBreak: 'normal', textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
                  No matching trees found in database. Try searching or click "+ Add Tree" to add a new tree.
                </div>
              ) : filteredTrees.map((tree) => {
                const hs = tree.healthScore ?? 90;
                return (
                  <article
                    key={tree._id || tree.id}
                    onClick={() => setSelectedTree(tree)}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.borderColor = '#10b981';
                      e.currentTarget.style.boxShadow = '0 16px 32px -6px rgba(16,185,129,0.18)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.03)';
                    }}
                  >
                    {/* Card Media Header */}
                    <div style={{ height: '160px', position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' }}>
                      {tree.image ? (
                        <img src={tree.image} alt={tree.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#059669', gap: '6px' }}>
                          <TreePine size={40} color="#059669" />
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#047857', letterSpacing: '0.02em' }}>No Image Uploaded</span>
                        </div>
                      )}
                      <span style={{
                        position: 'absolute', top: '10px', right: '10px',
                        background: hs >= 80 ? '#10b981' : hs >= 50 ? '#f59e0b' : '#ef4444',
                        color: '#ffffff', borderRadius: '20px', padding: '3px 10px',
                        fontSize: '0.72rem', fontWeight: 700, boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                      }}>
                        {hs >= 80 ? 'Healthy' : hs >= 50 ? 'Fair' : 'Alert'} · {hs}%
                      </span>
                    </div>

                    {/* Card Body */}
                    <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: 700 }}>{tree.name}</h3>
                      <p style={{ margin: 0, fontStyle: 'italic', color: '#059669', fontSize: '0.85rem', fontWeight: 500 }}>{tree.scientificName}</p>

                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                        {tree.family && (
                          <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 9px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600, border: '1px solid #e2e8f0' }}>
                            {tree.family}
                          </span>
                        )}
                        {tree.origin && (
                          <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '3px 9px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600, border: '1px solid #bfdbfe' }}>
                            {tree.origin}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div style={{ padding: '0.85rem 1.25rem', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                        Canopy: <strong style={{ color: '#0f172a' }}>{tree.canopyCoverage ?? 80}%</strong>
                      </span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          title="Edit Tree Details"
                          onClick={(e) => { e.stopPropagation(); handleStartEdit(tree); }}
                          style={{
                            background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px',
                            padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                            gap: '5px', fontSize: '0.8rem', fontWeight: 600, color: '#0f172a',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)', transition: 'all 0.2s'
                          }}
                        >
                          <Pencil size={13} color="#059669" /> Edit
                        </button>
                        <button
                          title="Delete Tree from Database"
                          onClick={(e) => handleDeleteTree(tree, e)}
                          style={{
                            background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px',
                            padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                            gap: '5px', fontSize: '0.8rem', fontWeight: 600, color: '#e11d48',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)', transition: 'all 0.2s'
                          }}
                        >
                          <Trash2 size={13} color="#e11d48" /> Delete
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export function ViewTreePage() {
  const [trees, setTrees] = useState([]);
  const [selectedTree, setSelectedTree] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterHealth, setFilterHealth] = useState('all');
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('currentUser')) || {};
    } catch {
      return {};
    }
  })();
  const currentUserRole = normalizeRole(currentUser.role);
  const isCitizen = !currentUserRole || currentUserRole === 'Citizen';

  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/api/trees`)
      .then(res => res.json())
      .then(data => { setTrees(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(err => { console.error('Error fetching trees in ViewTreePage:', err); setLoading(false); });
  }, []);

  const filteredTrees = trees.filter(tree => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      (tree.name || '').toLowerCase().includes(q) ||
      (tree.scientificName || '').toLowerCase().includes(q) ||
      (tree.family || '').toLowerCase().includes(q) ||
      (tree.origin || '').toLowerCase().includes(q);
    const hs = tree.healthScore ?? 90;
    const matchesHealth =
      filterHealth === 'all' ||
      (filterHealth === 'healthy' && hs >= 80) ||
      (filterHealth === 'fair' && hs >= 50 && hs < 80) ||
      (filterHealth === 'alert' && hs < 50);
    return matchesSearch && matchesHealth;
  });

  const getHealthColor = (score) => {
    if (score >= 80) return '#10b981';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };
  const getHealthLabel = (score) => {
    if (score >= 80) return 'Healthy';
    if (score >= 50) return 'Fair';
    return 'Alert';
  };

  // ── Common Tree Detail Content ────────────────────────────────────────────────
  const renderDetailContent = () => {
    const hs = selectedTree.healthScore ?? 90;
    const cc = selectedTree.canopyCoverage ?? 80;
    const benefits = Array.isArray(selectedTree.benefits) ? selectedTree.benefits : [];
    const pests = Array.isArray(selectedTree.pests) ? selectedTree.pests : [];
    const diseases = Array.isArray(selectedTree.diseases) ? selectedTree.diseases : [];

    return (
      <main className="cg-page" style={{ padding: '24px clamp(16px, 2vw, 32px)', maxWidth: '1100px', margin: '0 auto' }}>
        {/* Back button */}
        <button
          onClick={() => setSelectedTree(null)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'none', border: '1px solid #d1d5db', borderRadius: '8px',
            padding: '8px 16px', cursor: 'pointer', color: '#374151',
            fontWeight: 600, fontSize: '0.875rem', marginBottom: '24px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#f3f4f6'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
        >
          <ChevronLeft size={18} /> Back to Tree Database
        </button>

        {/* Hero card */}
        <div style={{
          background: 'linear-gradient(135deg, #043224 0%, #065f46 60%, #047857 100%)',
          borderRadius: '20px', padding: '32px', color: '#ffffff',
          display: 'flex', gap: '28px', alignItems: 'flex-start', flexWrap: 'wrap',
          marginBottom: '24px', boxShadow: '0 10px 40px rgba(4,50,36,0.25)'
        }}>
          {/* Tree image */}
          <div style={{
            width: '200px', minWidth: '160px', height: '200px', borderRadius: '14px',
            overflow: 'hidden', background: 'rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, border: '2px solid rgba(255,255,255,0.2)'
          }}>
            {selectedTree.image
              ? <img src={selectedTree.image} alt={selectedTree.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>
                <TreePine size={48} style={{ marginBottom: '8px', opacity: 0.5 }} /><br />No Image
              </div>
            }
          </div>

          {/* Tree headline info */}
          <div style={{ flex: 1, minWidth: '220px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <h1 style={{ margin: 0, fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800 }}>{selectedTree.name}</h1>
              <span style={{
                background: getHealthColor(hs), color: '#fff', borderRadius: '20px',
                padding: '4px 14px', fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap',
                alignSelf: 'center', boxShadow: `0 0 0 3px ${getHealthColor(hs)}33`
              }}>
                {getHealthLabel(hs)} · {hs}%
              </span>
            </div>
            <p style={{ margin: '0 0 16px', fontStyle: 'italic', color: 'rgba(255,255,255,0.75)', fontSize: '1rem' }}>
              {selectedTree.scientificName}
            </p>
            {/* Quick tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {[
                { label: 'Family', value: selectedTree.family },
                { label: 'Origin', value: selectedTree.origin },
                { label: 'Height', value: selectedTree.height },
                { label: 'Age Range', value: selectedTree.ageRange },
                { label: 'Canopy Spread', value: selectedTree.canopySpread },
                { label: 'Water', value: selectedTree.waterRequirement },
              ].filter(t => t.value).map(tag => (
                <span key={tag.label} style={{
                  background: 'rgba(255,255,255,0.12)', borderRadius: '8px',
                  padding: '5px 12px', fontSize: '0.8rem', backdropFilter: 'blur(4px)',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}>
                  <span style={{ opacity: 0.75, marginRight: '4px' }}>{tag.label}:</span>
                  <strong>{tag.value}</strong>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Content grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {/* About */}
          {selectedTree.description && (
            <div style={{
              background: '#fff', borderRadius: '16px', padding: '24px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #e5e7eb',
              gridColumn: 'span 2'
            }}>
              <h3 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#065f46', fontSize: '1rem', fontWeight: 700 }}>
                <Sprout size={18} /> About This Tree
              </h3>
              <p style={{ margin: 0, color: '#374151', lineHeight: 1.7 }}>{selectedTree.description}</p>
            </div>
          )}

          {/* Health Metrics */}
          <div style={{
            background: '#fff', borderRadius: '16px', padding: '24px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #e5e7eb'
          }}>
            <h3 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#065f46', fontSize: '1rem', fontWeight: 700 }}>
              <Activity size={18} /> Health Metrics
            </h3>
            {[
              { label: 'Health Score', value: hs, color: getHealthColor(hs) },
              { label: 'Canopy Coverage', value: cc, color: '#3b82f6' },
            ].map(m => (
              <div key={m.label} style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                  <span>{m.label}</span>
                  <span style={{ color: m.color }}>{m.value}%</span>
                </div>
                <div style={{ height: '8px', borderRadius: '8px', background: '#f3f4f6', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${m.value}%`, background: m.color, borderRadius: '8px', transition: 'width 0.8s ease' }} />
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px', padding: '10px 14px', background: '#f0fdf4', borderRadius: '10px' }}>
              <Droplet size={16} color="#065f46" />
              <div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>WATER REQUIREMENT</div>
                <div style={{ fontWeight: 700, color: '#065f46' }}>{selectedTree.waterRequirement || 'Medium'}</div>
              </div>
            </div>
            {selectedTree.addedAt && (
              <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CalendarDays size={14} /> Added on {selectedTree.addedAt}
              </div>
            )}
          </div>

          {/* Environmental Benefits */}
          {benefits.length > 0 && (
            <div style={{
              background: '#fff', borderRadius: '16px', padding: '24px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #e5e7eb'
            }}>
              <h3 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#065f46', fontSize: '1rem', fontWeight: 700 }}>
                <Leaf size={18} /> Environmental Benefits
              </h3>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {benefits.map((b, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px 12px', background: '#f0fdf4', borderRadius: '10px' }}>
                    <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0, marginTop: '1px' }} />
                    <span style={{ fontSize: '0.875rem', color: '#374151', lineHeight: 1.5 }}>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Common Diseases */}
          {diseases.length > 0 && (
            <div style={{
              background: '#fff', borderRadius: '16px', padding: '24px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #e5e7eb'
            }}>
              <h3 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309', fontSize: '1rem', fontWeight: 700 }}>
                <ShieldAlert size={18} /> Common Diseases
              </h3>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {diseases.map((d, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 12px', background: '#fffbeb', borderRadius: '10px', border: '1px solid #fde68a' }}>
                    <AlertTriangle size={14} color="#b45309" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '0.875rem', color: '#374151' }}>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Common Pests */}
          {pests.length > 0 && (
            <div style={{
              background: '#fff', borderRadius: '16px', padding: '24px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #e5e7eb'
            }}>
              <h3 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', fontSize: '1rem', fontWeight: 700 }}>
                <Bug size={18} /> Common Pests
              </h3>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pests.map((p, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 12px', background: '#fff1f2', borderRadius: '10px', border: '1px solid #fecdd3' }}>
                    <Ban size={14} color="#dc2626" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '0.875rem', color: '#374151' }}>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
    );
  };

  const renderListContent = () => {
    return (
      <main className="cg-page" style={{ padding: '24px clamp(16px, 2vw, 32px)' }}>
        {/* Hero */}
        <section style={{
          background: 'linear-gradient(135deg, #043224 0%, #065f46 60%, #047857 100%)',
          borderRadius: '20px', padding: '36px 32px', color: '#fff',
          marginBottom: '28px', boxShadow: '0 10px 40px rgba(4,50,36,0.2)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px'
        }}>
          <div>
            <h1 style={{ margin: '0 0 8px', fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 800 }}>
              🌳 Tree Database
            </h1>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '1rem' }}>
              Explore detailed information about {trees.length} tree{trees.length !== 1 ? 's' : ''} in our managed zones.
            </p>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.12)', borderRadius: '12px',
            padding: '12px 20px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>{trees.length}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Species Catalogued</div>
          </div>
        </section>

        {/* Search and Filter bar */}
        <div style={{
          display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px', alignItems: 'center'
        }}>
          <div style={{
            flex: 1, minWidth: '220px', display: 'flex', alignItems: 'center', gap: '10px',
            background: '#fff', borderRadius: '10px', padding: '10px 16px',
            border: '1.5px solid #d1d5db', boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
          }}>
            <Search size={18} color="#9ca3af" />
            <input
              type="text"
              placeholder="Search by common name, scientific name, family or origin..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.9rem', color: '#1f2937' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4b5563' }}>Health:</span>
            <select
              value={filterHealth}
              onChange={e => setFilterHealth(e.target.value)}
              style={{
                padding: '10px 16px', borderRadius: '10px', border: '1.5px solid #d1d5db',
                background: '#fff', outline: 'none', fontSize: '0.9rem', fontWeight: 600, color: '#374151'
              }}
            >
              <option value="all">All Conditions</option>
              <option value="healthy">Healthy (&gt;=80%)</option>
              <option value="fair">Fair (50%-79%)</option>
              <option value="alert">Alert (&lt;50%)</option>
            </select>
          </div>
        </div>

        {/* List of trees */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#6b7280' }}>
            <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid #cbd5e1', borderTopColor: '#065f46', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
            <p style={{ marginTop: '12px', fontWeight: 600 }}>Loading tree data...</p>
          </div>
        ) : filteredTrees.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
            <TreePine size={48} style={{ margin: '0 auto 12px', color: '#9ca3af', opacity: 0.7 }} />
            <h3 style={{ margin: '0 0 6px', color: '#374151' }}>No trees found</h3>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>Try adjusting your search query or filters.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {filteredTrees.map(tree => {
              const hs = tree.healthScore ?? 90;
              const hColor = getHealthColor(hs);
              const hLabel = getHealthLabel(hs);
              return (
                <article
                  key={tree._id || tree.id}
                  onClick={() => setSelectedTree(tree)}
                  style={{
                    background: '#fff', borderRadius: '16px', overflow: 'hidden',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
                    border: '1px solid #e5e7eb', cursor: 'pointer', transition: 'all 0.25s',
                    display: 'flex', flexDirection: 'column'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 12px 20px -5px rgba(0,0,0,0.08)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)';
                  }}
                >
                  {/* Card Header (image) */}
                  <div style={{ height: '180px', background: '#f3f4f6', position: 'relative' }}>
                    {tree.image ? (
                      <img src={tree.image} alt={tree.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                        <TreePine size={40} style={{ opacity: 0.5 }} />
                      </div>
                    )}
                    <span style={{
                      position: 'absolute', top: '12px', right: '12px',
                      background: hColor, color: '#fff', borderRadius: '20px',
                      padding: '3px 12px', fontSize: '0.78rem', fontWeight: 700,
                      boxShadow: `0 2px 8px ${hColor}55`
                    }}>
                      {hLabel}
                    </span>
                  </div>

                  {/* Card body */}
                  <div style={{ padding: '18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ margin: '0 0 2px', fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>
                      {tree.name}
                    </h3>
                    <p style={{ margin: '0 0 12px', fontStyle: 'italic', color: '#6b7280', fontSize: '0.82rem' }}>
                      {tree.scientificName}
                    </p>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                      {tree.family && (
                        <span style={{ background: '#f0fdf4', color: '#065f46', padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid #d1fae5' }}>
                          {tree.family}
                        </span>
                      )}
                      {tree.origin && (
                        <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid #bfdbfe' }}>
                          {tree.origin}
                        </span>
                      )}
                    </div>

                    {tree.description && (
                      <p style={{
                        margin: '0 0 14px', fontSize: '0.82rem', color: '#4b5563', lineHeight: 1.6, flex: 1,
                        overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
                      }}>
                        {tree.description}
                      </p>
                    )}

                    {/* Stats row */}
                    <div style={{ display: 'flex', gap: '12px', paddingTop: '12px', borderTop: '1px solid #f3f4f6' }}>
                      <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 600, marginBottom: '2px' }}>HEALTH</div>
                        <div style={{ fontWeight: 800, color: hColor, fontSize: '1rem' }}>{hs}%</div>
                      </div>
                      <div style={{ width: '1px', background: '#f3f4f6' }} />
                      <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 600, marginBottom: '2px' }}>CANOPY</div>
                        <div style={{ fontWeight: 800, color: '#3b82f6', fontSize: '1rem' }}>{tree.canopyCoverage ?? 80}%</div>
                      </div>
                      {tree.height && (
                        <>
                          <div style={{ width: '1px', background: '#f3f4f6' }} />
                          <div style={{ flex: 1, textAlign: 'center' }}>
                            <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 600, marginBottom: '2px' }}>HEIGHT</div>
                            <div style={{ fontWeight: 700, color: '#374151', fontSize: '0.85rem' }}>{tree.height}</div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Benefits preview */}
                    {Array.isArray(tree.benefits) && tree.benefits.length > 0 && (
                      <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {tree.benefits.slice(0, 2).map((b, i) => (
                          <span key={i} style={{ fontSize: '0.72rem', color: '#065f46', background: '#ecfdf5', padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>
                            ✓ {b.length > 30 ? b.slice(0, 30) + '…' : b}
                          </span>
                        ))}
                        {tree.benefits.length > 2 && (
                          <span style={{ fontSize: '0.72rem', color: '#6b7280', background: '#f9fafb', padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>
                            +{tree.benefits.length - 2} more
                          </span>
                        )}
                      </div>
                    )}
                    <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: '0.8rem', color: '#065f46', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        View Details <ChevronRight size={14} />
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    );
  };

  if (selectedTree) {
    if (isCitizen) {
      return (
        <div className="cg-public">
          <header className="cg-public-nav" style={{ gridTemplateColumns: '1fr auto auto' }}>
            <Link to="/home" className="cg-brand">CanopyGuard</Link>
            <nav style={{ marginRight: '24px' }}>
              <Link to="/home">Home</Link>
              <Link to="/dashboard">Map</Link>
              <Link to="/report-issue">Complaints</Link>
              <Link className="active" to="/view-tree">Tree Database</Link>
            </nav>
          </header>
          {renderDetailContent()}
        </div>
      );
    } else {
      return (
        <div className="cg-app" style={{ background: '#f8fafc', minHeight: '100vh', color: '#1f2937' }}>
          <Sidebar active="View Tree" isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
          <div className="cg-workspace">
            <Topbar title="Tree Details" onToggleSidebar={() => setSidebarOpen(true)} />
            {renderDetailContent()}
          </div>
        </div>
      );
    }
  }

  // ── List View ───────────────────────────────────────────────────────────────
  if (isCitizen) {
    return (
      <div className="cg-public">
        <header className="cg-public-nav" style={{ gridTemplateColumns: '1fr auto auto' }}>
          <Link to="/home" className="cg-brand">CanopyGuard</Link>
          <nav style={{ marginRight: '24px' }}>
            <Link to="/home">Home</Link>
            <Link to="/dashboard">Map</Link>
            <Link to="/report-issue">Complaints</Link>
            <Link className="active" to="/view-tree">Tree Database</Link>
          </nav>
        </header>
        {renderListContent()}
      </div>
    );
  } else {
    return (
      <div className="cg-app" style={{ background: '#f8fafc', minHeight: '100vh', color: '#1f2937' }}>
        <Sidebar active="View Tree" isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
        <div className="cg-workspace">
          <Topbar title="Tree Database" onToggleSidebar={() => setSidebarOpen(true)} />
          {renderListContent()}
        </div>
      </div>
    );
  }
}

export function AttendancePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [marking, setMarking] = useState(false);
  const [markResult, setMarkResult] = useState(null); // { success, msg }
  const [myRecords, setMyRecords] = useState([]);
  const [allRecords, setAllRecords] = useState([]);
  const [todaySummary, setTodaySummary] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('currentUser')) || {}; }
    catch { return {}; }
  })();

  const rawRole = normalizeRole(currentUser.role);
  const isAdmin = rawRole === 'Admin';
  const isOfficial = rawRole === 'Official';

  // Effective identity for attendance (Tree Cutter mode when accessing attendance)
  const effectiveRole = (isOfficial || isAdmin) ? currentUser.role : 'Tree Cutter';
  const effectiveName = currentUser.name || 'sameeksha';
  const effectiveUserId = currentUser.id || currentUser.email || 'TC-' + (effectiveName.toLowerCase().replace(/\s+/g, ''));

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Shift availability helper
  const getShiftStatus = (shiftName) => {
    const h = currentTime.getHours();
    const m = currentTime.getMinutes();
    const currentMinutes = h * 60 + m;

    if (shiftName === 'Morning') {
      if (currentMinutes < 9 * 60) return { closed: true, reason: 'Opens at 9:00 AM' };
      if (currentMinutes >= 12 * 60) return { closed: true, reason: 'Closed at 12:00 PM' };
      return { closed: false, active: true, reason: 'Open (9 AM–12 PM)' };
    }
    if (shiftName === 'Afternoon') {
      if (currentMinutes < 12 * 60) return { closed: true, reason: 'Opens at 12:00 PM' };
      if (currentMinutes >= 15 * 60) return { closed: true, reason: 'Closed at 3:00 PM' };
      return { closed: false, active: true, reason: 'Open (12 PM–3 PM)' };
    }
    if (shiftName === 'Evening') {
      if (currentMinutes < 15 * 60) return { closed: true, reason: 'Opens at 3:00 PM' };
      if (currentMinutes >= 17 * 60) return { closed: true, reason: 'Closed after 5:00 PM' };
      return { closed: false, active: true, reason: 'Open (3 PM–5 PM)' };
    }
    return { closed: true, reason: 'Closed' };
  };

  const getActiveShift = () => {
    const h = currentTime.getHours();
    if (h >= 9 && h < 12) return 'Morning';
    if (h >= 12 && h < 15) return 'Afternoon';
    if (h >= 15 && h < 17) return 'Evening';
    return null;
  };

  const activeShift = getActiveShift();

  // Fetch attendance records
  const fetchRecords = async () => {
    setLoadingHistory(true);
    try {
      if (isAdmin || isOfficial) {
        // Officials & Admin see all records
        const [allRes, summaryRes] = await Promise.all([
          fetch(`${API_URL}/api/attendance`),
          fetch(`${API_URL}/api/attendance/today-summary`),
        ]);
        const allData = await allRes.json();
        const summaryData = await summaryRes.json();
        setAllRecords(allData.records || []);
        setTodaySummary(summaryData);
      }

      // Tree Cutters only fetch and see their own personal attendance
      const res = await fetch(`${API_URL}/api/attendance/me?userId=${effectiveUserId}&userName=${encodeURIComponent(effectiveName)}`);
      const data = await res.json();
      setMyRecords(data.records || []);
    } catch { /* ignore */ }
    setLoadingHistory(false);
  };

  // Group user's attendance records by date
  const recordsByDate = useMemo(() => {
    const map = {};
    (myRecords || []).forEach(r => {
      if (!r.date) return;
      if (!map[r.date]) {
        map[r.date] = { date: r.date, shifts: new Set(), records: [] };
      }
      map[r.date].shifts.add(r.shift);
      map[r.date].records.push(r);
    });
    return map;
  }, [myRecords]);

  // Unique calendar days present
  const uniqueDaysCount = Object.keys(recordsByDate).length;

  let fullDaysCount = 0;
  let partialDaysCount = 0;

  Object.values(recordsByDate).forEach(d => {
    if (d.shifts.has('Morning') && d.shifts.has('Afternoon') && d.shifts.has('Evening')) {
      fullDaysCount++;
    } else {
      partialDaysCount++;
    }
  });

  // Today's shift status
  const todayDateStr = new Date().toISOString().slice(0, 10);
  const todayGroup = recordsByDate[todayDateStr] || { shifts: new Set() };
  const todayShiftsPresent = Array.from(todayGroup.shifts);
  const todayShiftsCount = todayShiftsPresent.length;

  const handleMarkAttendance = async () => {
    const shift = selectedShift || activeShift;
    if (!shift) {
      setMarkResult({ success: false, msg: 'No shift session active right now. Morning (9–12 AM), Afternoon (12–3 PM), Evening (3–5 PM).' });
      return;
    }
    const status = getShiftStatus(shift);
    if (status.closed) {
      setMarkResult({ success: false, msg: `Cannot mark attendance: ${shift} shift is ${status.reason.toLowerCase()}.` });
      return;
    }
    setMarking(true);
    setMarkResult(null);
    try {
      const res = await fetch(`${API_URL}/api/attendance/mark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: effectiveUserId,
          userName: effectiveName,
          role: effectiveRole,
          shift,
        }),
      });
      const data = await res.json();
      if (res.ok || res.status === 409) {
        setMarkResult({ success: res.ok, msg: data.msg });
        if (res.ok) fetchRecords();
      } else {
        setMarkResult({ success: false, msg: data.msg || 'Failed to mark attendance.' });
      }
    } catch {
      setMarkResult({ success: false, msg: 'Server error. Please try again.' });
    }
    setMarking(false);
  };

  const shiftInfo = [
    { name: 'Morning', hours: '9:00 AM – 12:00 PM', icon: <Sun size={18} /> },
    { name: 'Afternoon', hours: '12:00 PM – 3:00 PM', icon: <Sun size={18} /> },
    { name: 'Evening', hours: '3:00 PM – 5:00 PM', icon: <Moon size={18} /> },
  ];

  const targetShift = selectedShift || activeShift;
  const targetStatus = targetShift ? getShiftStatus(targetShift) : { closed: true, reason: 'No shift session active' };
  const isTargetClosed = targetStatus.closed;

  const formatDateTime = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="cg-app">
      <Sidebar active="Attendance" isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
      <div className="cg-workspace">
        <Topbar attendance onToggleSidebar={() => setSidebarOpen(true)} />
        <main className="cg-page">
          <section className="cg-att-head">
            <div><h1>Shift Logs & Attendance</h1><p>Mark your daily presence and view work history.</p></div>
            <div className="time-card">
              <Clock3 />
              <span>Current Time (IST)</span>
              <b>{currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</b>
              {activeShift ? (
                <small style={{ color: '#16a34a', fontWeight: 600 }}>Active: {activeShift} Shift</small>
              ) : (
                <small style={{ color: '#dc2626', fontWeight: 600 }}>Shifts Closed For Today</small>
              )}
            </div>
          </section>

          {/* Today Summary (Admin / Official view only) */}
          {todaySummary && (isAdmin || isOfficial) && (
            <section style={{ display: 'flex', gap: '16px', margin: '0 0 20px', flexWrap: 'wrap' }}>
              {[
                ['Today – Officials Present', todaySummary.officialCount, 'ok'],
                ['Today – Cutters Present', todaySummary.cutterCount, 'med'],
                ['Total Present Today', todaySummary.total, 'low'],
              ].map(([label, val, tone]) => (
                <div key={label} className="cg-panel" style={{ flex: '1 1 180px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{label}</span>
                  <b style={{ fontSize: '2rem', color: '#111827' }}>{val}</b>
                  <span className={`tag ${tone}`}>{todaySummary.date}</span>
                </div>
              ))}
            </section>
          )}

          <section className="cg-att-grid">
            <div>
              {/* Mark Attendance Card */}
              <div className="cg-panel attendance-card top-line">
                <header style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px' }}>
                  <div className="attendance-user-avatar-box">
                    {(currentUser.profileImage || currentUser.avatar) ? (
                      <img src={currentUser.profileImage || currentUser.avatar} alt={effectiveName} className="attendance-user-avatar-img" />
                    ) : (
                      <div className="attendance-user-avatar-initial">{(effectiveName || 'B').charAt(0).toUpperCase()}</div>
                    )}
                  </div>
                  <div>
                    <span className="attendance-role-pill">{effectiveRole}</span>
                    <h2 style={{ margin: '4px 0 0', fontSize: '1.35rem', fontWeight: 800, color: '#0f5132' }}>Welcome, {effectiveName}</h2>
                  </div>
                </header>
                <hr />
                <h2>Mark Attendance</h2>
                <label>Select Shift</label>
                <div className="shifts" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginTop: '8px' }}>
                  {shiftInfo.map(s => {
                    const status = getShiftStatus(s.name);
                    const isSelected = (selectedShift === s.name) || (!selectedShift && activeShift === s.name);
                    const isDisabled = status.closed;

                    return (
                      <button
                        key={s.name}
                        type="button"
                        disabled={isDisabled}
                        className={`shift-btn-item ${isSelected && !isDisabled ? 'selected' : ''}`}
                        onClick={() => !isDisabled && setSelectedShift(s.name)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '14px 10px',
                          borderRadius: '12px',
                          border: isSelected && !isDisabled ? '2px solid #10b981' : isDisabled ? '1.5px solid #e2e8f0' : '1.5px solid #cbd5e1',
                          background: isSelected && !isDisabled ? '#ecfdf5' : isDisabled ? '#f8fafc' : '#ffffff',
                          opacity: isDisabled ? 0.65 : 1,
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s ease',
                          gap: '4px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isDisabled ? '#94a3b8' : isSelected ? '#047857' : '#1e293b', fontWeight: 700 }}>
                          {s.icon} {s.name}
                        </div>
                        <small style={{ fontSize: '0.72rem', color: '#64748b' }}>{s.hours}</small>
                        <span
                          style={{
                            display: 'inline-block',
                            marginTop: '4px',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            background: isDisabled ? '#fee2e2' : '#dcfce7',
                            color: isDisabled ? '#991b1b' : '#166534',
                            border: isDisabled ? '1px solid #fca5a5' : '1px solid #86efac'
                          }}
                        >
                          {isDisabled ? `🔒 ${status.reason}` : `✓ Open`}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {markResult && (
                  <div className={`official-notice`} style={{ background: markResult.success ? '#dcfce7' : '#fee2e2', color: markResult.success ? '#166534' : '#991b1b', marginTop: '14px' }}>
                    {markResult.success ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                    {markResult.msg}
                  </div>
                )}

                <button
                  className="cg-btn primary"
                  onClick={handleMarkAttendance}
                  disabled={marking || isTargetClosed}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    fontSize: '1rem',
                    fontWeight: 800,
                    borderRadius: '12px',
                    marginTop: '16px',
                    background: isTargetClosed ? '#94a3b8' : 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                    cursor: isTargetClosed ? 'not-allowed' : 'pointer',
                    boxShadow: isTargetClosed ? 'none' : '0 4px 14px rgba(16, 185, 129, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Fingerprint size={20} />
                  {marking ? 'Marking…' : isTargetClosed ? `Shift Closed (${targetStatus.reason})` : `Mark Attendance (${targetShift} Shift)`}
                </button>
              </div>

              {/* My Stats */}
              {myRecords.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginTop: '16px' }}>
                  <div style={{ padding: '14px', borderRadius: '12px', background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                    <span style={{ fontSize: '0.78rem', color: '#047857', fontWeight: 700, display: 'block' }}>DAYS PRESENT</span>
                    <b style={{ fontSize: '1.5rem', color: '#065f46', fontWeight: 800 }}>{uniqueDaysCount} {uniqueDaysCount === 1 ? 'Day' : 'Days'}</b>
                    <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#047857', fontWeight: 600 }}>
                      {fullDaysCount > 0 && `${fullDaysCount} Full Day (3/3)`}
                      {fullDaysCount > 0 && partialDaysCount > 0 && ' • '}
                      {partialDaysCount > 0 && `${partialDaysCount} Partial`}
                    </p>
                  </div>

                  <div style={{ padding: '14px', borderRadius: '12px', background: todayShiftsCount === 3 ? '#f0fdf4' : todayShiftsCount > 0 ? '#eff6ff' : '#f8fafc', border: todayShiftsCount === 3 ? '1px solid #bbf7d0' : todayShiftsCount > 0 ? '1px solid #bfdbfe' : '1px solid #cbd5e1' }}>
                    <span style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 700, display: 'block' }}>TODAY'S SHIFTS</span>
                    <b style={{ fontSize: '1.4rem', color: todayShiftsCount === 3 ? '#166534' : todayShiftsCount > 0 ? '#1e40af' : '#64748b', fontWeight: 800 }}>
                      {todayShiftsCount}/3 Marked
                    </b>
                    <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>
                      {todayShiftsCount === 3 ? (
                        <span style={{ color: '#166534' }}>✓ 1 Full Day Present</span>
                      ) : todayShiftsCount > 0 ? (
                        <span>Present: {todayShiftsPresent.join(', ')}</span>
                      ) : (
                        <span>No shifts marked today</span>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* History Table */}
            <div className="cg-panel history">
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <h2 style={{ margin: 0 }}>{isAdmin || isOfficial ? 'All Staff Attendance' : 'My Daily Attendance Breakdown'}</h2>
                <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>{loadingHistory ? 'Loading…' : ''}</span>
              </header>

              <table className="cg-table" style={{ marginTop: '12px' }}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Date</th>
                    <th>Shifts Status</th>
                    <th>Daily Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(isAdmin || isOfficial) ? (
                    allRecords.map((r) => (
                      <tr key={r._id}>
                        <td><b>{r.userName}</b></td>
                        <td><span className={`tag ${r.role === 'Official' ? 'med' : 'low'}`}>{r.role}</span></td>
                        <td>{r.date}</td>
                        <td><span className="tag ok">{r.shift}</span></td>
                        <td><small>{formatDateTime(r.markedAt || r.createdAt)}</small></td>
                      </tr>
                    ))
                  ) : (
                    Object.values(recordsByDate).map((group) => {
                      const shiftsPresent = Array.from(group.shifts);
                      const allShifts = ['Morning', 'Afternoon', 'Evening'];
                      const absentShifts = allShifts.filter(s => !shiftsPresent.includes(s));
                      const isFullDay = shiftsPresent.length === 3;

                      return (
                        <tr key={group.date}>
                          <td><b>{effectiveName}</b></td>
                          <td><span className="tag low">{effectiveRole}</span></td>
                          <td><b>{group.date}</b></td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {allShifts.map(s => {
                                const isPresent = shiftsPresent.includes(s);
                                return (
                                  <span
                                    key={s}
                                    style={{
                                      padding: '2px 8px',
                                      borderRadius: '6px',
                                      fontSize: '0.74rem',
                                      fontWeight: 700,
                                      background: isPresent ? '#dcfce7' : '#fee2e2',
                                      color: isPresent ? '#166534' : '#991b1b',
                                      border: isPresent ? '1px solid #86efac' : '1px solid #fca5a5'
                                    }}
                                  >
                                    {isPresent ? `✓ ${s}` : `✗ ${s}`}
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                          <td>
                            {isFullDay ? (
                              <span className="tag ok" style={{ fontWeight: 800 }}>✓ 1 Full Day Present (3/3)</span>
                            ) : (
                              <span className="tag med" style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                                Partial: Present for <b>{shiftsPresent.join(', ')}</b> {absentShifts.length > 0 && `(Absent: ${absentShifts.join(', ')})`}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                  {!loadingHistory && ((isAdmin || isOfficial) ? allRecords : Object.keys(recordsByDate)).length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: '#aaa', padding: '20px' }}>No attendance records found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export function PropertyInventoryPage() {
  return <PurchaseEquipmentPage />;
}

export function AddPropertyPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState('Available');
  const [imageFile, setImageFile] = useState(null);
  const [selectedUploadUrl, setSelectedUploadUrl] = useState('');
  const [uploadFiles, setUploadFiles] = useState([]);
  const [imagePreview, setImagePreview] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('currentUser')) || {}; }
    catch { return {}; }
  })();
  const currentUserRole = normalizeRole(currentUser.role);

  const isAdmin = currentUserRole === 'Admin' || sessionStorage.getItem('adminAuthed') === 'true';
  const isCutter = currentUserRole === 'Tree Cutter';
  const isAuthorized = true;

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/properties`);
      if (res.ok) {
        const data = await res.json();
        setProperties(data);
      }
    } catch (err) {
      console.error('Failed to fetch properties', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUploadFiles = async () => {
    try {
      const res = await fetch(`${API_URL}/api/upload/files`);
      if (res.ok) {
        const data = await res.json();
        setUploadFiles(data);
      }
    } catch (err) {
      console.error('Failed to fetch upload files', err);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchProperties();
      fetchUploadFiles();
    }
  }, []);

  const handleAddProperty = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setActionError('Please enter a property name.');
      return;
    }
    setIsSubmitting(true);
    setActionSuccess('');
    setActionError('');

    try {
      let imageUrl = selectedUploadUrl;
      if (imageFile) {
        const uploadForm = new FormData();
        uploadForm.append('image', imageFile);

        const uploadRes = await fetch(`${API_URL}/api/upload`, {
          method: 'POST',
          body: uploadForm,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadData.msg || 'Image upload failed');
        }
        imageUrl = uploadData.url;
      }

      const res = await fetch(`${API_URL}/api/properties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          quantity: Number(quantity) || 1,
          status,
          addedAt: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          imageUrl
        })
      });

      const data = await res.json();
      if (res.ok) {
        setActionSuccess(`Product "${name}" added successfully! It is now live in the Property Inventory for Tree Cutters.`);
        setName('');
        setDescription('');
        setQuantity(1);
        setStatus('Available');
        setImageFile(null);
        setImagePreview('');
        fetchProperties();
      } else {
        setActionError(data.msg || 'Failed to add property');
      }
    } catch (err) {
      setActionError(err.message || 'Server error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageSelect = (e) => {
    const selected = e.target.files?.[0] || null;
    setImageFile(selected);
    setSelectedUploadUrl('');
    setImagePreview(selected ? URL.createObjectURL(selected) : '');
  };

  const handleSelectExistingImage = (e) => {
    const url = e.target.value;
    setSelectedUploadUrl(url);
    setImageFile(null);
    setImagePreview(url ? resolveImageUrl(url) : '');
  };

  const handlePurchaseProperty = async (property) => {
    if (!window.confirm(`Purchase "${property.name}" from inventory?`)) return;
    setIsSubmitting(true);
    setActionSuccess('');
    setActionError('');

    try {
      const res = await fetch(`${API_URL}/api/properties/${property._id}/purchase`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id || currentUser._id || 'unknown',
          userName: currentUser.name || currentUser.username || 'Tree Cutter'
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.msg || 'Purchase request failed');
      }
      setActionSuccess(`Purchased "${property.name}" successfully.`);
      fetchProperties();
    } catch (err) {
      setActionError(err.message || 'Purchase failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProperty = async (id, propName) => {
    if (!window.confirm(`Are you sure you want to delete "${propName}"?`)) return;
    try {
      const res = await fetch(`${API_URL}/api/properties/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setActionSuccess(`Deleted "${propName}" successfully!`);
        fetchProperties();
        setTimeout(() => setActionSuccess(''), 3000);
      } else {
        alert('Failed to delete property');
      }
    } catch (err) {
      console.error('Error deleting property', err);
    }
  };



  const statusTag = (s) => {
    if (s === 'Available') return 'ok';
    if (s === 'Assigned') return 'med';
    return 'low';
  };

  const apiBase = API_URL.replace(/\/$/, '');
  const resolveImageUrl = (imageUrl) => {
    if (!imageUrl) return '';

    const normalized = imageUrl.replace(/\\/g, '/').trim();
    if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
      return normalized;
    }

    if (normalized.startsWith('/uploads/')) {
      return `${apiBase}${normalized}`;
    }

    if (normalized.startsWith('uploads/')) {
      return `${apiBase}/${normalized}`;
    }

    const uploadsIndex = normalized.indexOf('/uploads/');
    if (uploadsIndex !== -1) {
      return `${apiBase}${normalized.slice(uploadsIndex)}`;
    }

    const filename = normalized.split('/').pop();
    return `${apiBase}/uploads/${filename}`;
  };

  return (
    <div className="cg-app">
      <Sidebar active="Add Property" admin={true} isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
      <div className="cg-workspace">
        <Topbar title="Add Property" search="Search inventory..." onToggleSidebar={() => setSidebarOpen(true)} />
        <main className="cg-page">
          <section className="cg-admin-head">
            <div>
              <span>Municipal Property & Equipment</span>
              <h1>Add & Manage Property</h1>
            </div>
            {isAdmin && (
              <span className="tag ok" style={{ fontSize: '0.9rem', padding: '6px 12px' }}>Admin Mode</span>
            )}
            {isCutter && (
              <span className="tag med" style={{ fontSize: '0.9rem', padding: '6px 12px' }}>Tree Cutter Mode</span>
            )}
          </section>

          {actionSuccess && (
            <div className="official-notice" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #86efac', marginBottom: '20px' }}>
              <CheckCircle2 size={18} /> {actionSuccess}
            </div>
          )}

          {actionError && (
            <div className="official-notice" style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', marginBottom: '20px' }}>
              <AlertTriangle size={18} /> {actionError}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'start' }}>
            <section className="cg-panel top-line" style={{ padding: '24px' }}>
              <h2 style={{ marginBottom: '6px' }}>Add Equipment / Tool</h2>
              <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '20px' }}>Register new equipment or property item.</p>
              <form onSubmit={handleAddProperty} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>PROPERTY NAME</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Grass Cutter, Chainsaw"
                    required
                    style={{
                      height: '42px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      outline: 'none',
                      background: '#fff',
                      color: '#1f2937'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>DESCRIPTION</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. 50cc petrol engine, safety guard, heavy duty"
                    rows="3"
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      outline: 'none',
                      background: '#fff',
                      color: '#1f2937'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>UPLOAD IMAGE</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        outline: 'none',
                        background: '#fff',
                        color: '#1f2937'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>OR SELECT UPLOADED IMAGE</label>
                    <select
                      value={selectedUploadUrl}
                      onChange={handleSelectExistingImage}
                      style={{
                        height: '42px',
                        padding: '0 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        outline: 'none',
                        background: '#fff',
                        color: '#1f2937'
                      }}
                    >
                      <option value="">Choose existing upload</option>
                      {uploadFiles.map((file) => (
                        <option key={file.filename} value={file.url}>{file.filename}</option>
                      ))}
                    </select>
                  </div>

                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: '10px', marginTop: '12px', border: '1px solid #e2e8f0' }}
                    />
                  )}
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>QUANTITY</label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value) || 1)}
                      required
                      style={{
                        height: '42px',
                        padding: '0 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        outline: 'none',
                        background: '#fff',
                        color: '#1f2937'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>STATUS</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      style={{
                        height: '42px',
                        padding: '0 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        outline: 'none',
                        background: '#fff',
                        color: '#1f2937'
                      }}
                    >
                      <option value="Available">Available</option>
                      <option value="Assigned">Assigned</option>
                      <option value="Maintenance">Maintenance</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="cg-btn primary"
                  disabled={isSubmitting}
                  style={{ marginTop: '10px', height: '42px' }}
                >
                  {isSubmitting ? 'Adding...' : 'Add Property'}
                </button>
              </form>
            </section>

            <section className="cg-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2>Registered Properties ({properties.length})</h2>
                <button className="cg-btn outline" onClick={fetchProperties} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>Refresh</button>
              </div>

              {loading ? (
                <p style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Loading properties...</p>
              ) : properties.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  <Database size={40} style={{ opacity: 0.3, marginBottom: '10px' }} />
                  <p>No properties registered yet.</p>
                </div>
              ) : (
                <div className="table-responsive" style={{ overflowX: 'auto' }}>
                  <table className="cg-table wide">
                    <thead>
                      <tr>
                        <th>Image</th>
                        <th>Equipment Name</th>
                        <th>Description</th>
                        <th>Qty</th>
                        <th>Status</th>
                        <th>Added Date</th>
                        <th>Requests</th>
                        {isAdmin && <th>Actions</th>}
                        {isCutter && <th>Buy</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {properties.map((prop) => (
                        <tr key={prop._id}>
                          <td>
                            {prop.imageUrl ? (
                              <img
                                src={resolveImageUrl(prop.imageUrl)}
                                alt={prop.name}
                                style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                              />
                            ) : (
                              <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>No image</span>
                            )}
                          </td>
                          <td><b>{prop.name}</b></td>
                          <td>{prop.description || <i style={{ color: '#9ca3af' }}>No description</i>}</td>
                          <td>{prop.quantity}</td>
                          <td><span className={`tag ${statusTag(prop.status)}`}>{prop.status}</span></td>
                          <td><small>{prop.addedAt || new Date(prop.createdAt).toLocaleDateString('en-IN')}</small></td>
                          <td>{prop.purchaseCount || 0}</td>
                          {isAdmin && (
                            <td>
                              <button
                                onClick={() => handleDeleteProperty(prop._id, prop.name)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: '#dc2626',
                                  padding: '4px'
                                }}
                                title="Delete Property"
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          )}
                          {isCutter && (
                            <td>
                              {prop.status === 'Available' && prop.quantity > 0 ? (
                                <button
                                  className="cg-btn outline"
                                  onClick={() => handlePurchaseProperty(prop)}
                                  disabled={isSubmitting}
                                  style={{ padding: '8px 12px', fontSize: '0.85rem', borderRadius: '8px' }}
                                >
                                  Buy
                                </button>
                              ) : (
                                <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>{prop.quantity <= 0 ? 'Out of stock' : 'Unavailable'}</span>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export function PurchaseEquipmentPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available'); // 'available' or 'borrowed'
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeNow, setTimeNow] = useState(new Date());

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('currentUser')) || {}; }
    catch { return {}; }
  })();
  const currentUserRole = normalizeRole(currentUser.role);
  const isCutter = currentUserRole === 'Tree Cutter';

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/properties`);
      if (res.ok) {
        const data = await res.json();
        setProperties(data);
      }
    } catch (err) {
      console.error('Failed to fetch properties', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
    const timer = setInterval(() => {
      setTimeNow(new Date());
    }, 15000); // Update every 15 seconds for more responsive timers
    return () => clearInterval(timer);
  }, []);

  const addToCart = (property) => {
    if (cart.some(item => item._id === property._id)) {
      setActionError(`"${property.name}" is already in your cart.`);
      setTimeout(() => setActionError(''), 3000);
      return;
    }
    setCart([...cart, property]);
    setActionSuccess(`Added "${property.name}" to cart.`);
    setTimeout(() => setActionSuccess(''), 3000);
  };

  const removeFromCart = (propertyId) => {
    const item = cart.find(i => i._id === propertyId);
    setCart(cart.filter(item => item._id !== propertyId));
    if (item) {
      setActionSuccess(`Removed "${item.name}" from cart.`);
      setTimeout(() => setActionSuccess(''), 3000);
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!window.confirm(`Are you sure you want to borrow ${cart.length} item(s)?\nImportant: All tools must be returned within 24 hours.`)) return;

    setIsSubmitting(true);
    setActionSuccess('');
    setActionError('');
    let succeeded = [];
    let failed = [];

    for (const item of cart) {
      try {
        const res = await fetch(`${API_URL}/api/properties/${item._id}/purchase`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.id || currentUser._id || 'unknown',
            userName: currentUser.name || currentUser.username || 'Tree Cutter'
          })
        });
        const data = await res.json();
        if (res.ok) {
          succeeded.push(item.name);
        } else {
          failed.push(`${item.name} (${data.msg || 'Error'})`);
        }
      } catch (err) {
        failed.push(`${item.name} (Network Error)`);
      }
    }

    setIsSubmitting(false);
    setCart([]);
    setCartOpen(false);

    if (failed.length === 0) {
      setActionSuccess(`Successfully checked out ${succeeded.length} tool(s). Borrow timers have started.`);
    } else if (succeeded.length > 0) {
      setActionSuccess(`Borrowed: ${succeeded.join(', ')}. Failed: ${failed.join(', ')}.`);
    } else {
      setActionError(`Checkout failed: ${failed.join(', ')}.`);
    }
    fetchProperties();
  };

  const handleReturnProperty = async (property) => {
    if (!window.confirm(`Return "${property.name}" back to inventory?`)) return;
    setIsSubmitting(true);
    setActionSuccess('');
    setActionError('');

    try {
      const res = await fetch(`${API_URL}/api/properties/${property._id}/return`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id || currentUser._id || 'unknown'
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.msg || 'Return request failed');
      }
      setActionSuccess(`Returned "${property.name}" successfully.`);
      fetchProperties();
    } catch (err) {
      setActionError(err.message || 'Return failed.');
    } finally {
      setIsSubmitting(false);
    }
  };



  const apiBase = API_URL.replace(/\/$/, '');
  const resolveImageUrl = (imageUrl) => {
    if (!imageUrl) return '';
    const normalized = imageUrl.replace(/\\/g, '/').trim();
    if (normalized.startsWith('http://') || normalized.startsWith('https://')) return normalized;
    if (normalized.startsWith('/uploads/')) return `${apiBase}${normalized}`;
    if (normalized.startsWith('uploads/')) return `${apiBase}/${normalized}`;
    const uploadsIndex = normalized.indexOf('/uploads/');
    if (uploadsIndex !== -1) return `${apiBase}${normalized.slice(uploadsIndex)}`;
    const filename = normalized.split('/').pop();
    return `${apiBase}/uploads/${filename}`;
  };

  // Filters
  const availableItems = properties.filter(prop =>
    prop.status !== 'Deleted'
  );
  const borrowedItems = properties.filter(prop =>
    prop.purchaseRequests && prop.purchaseRequests.some(r => r.userId === (currentUser.id || currentUser._id))
  );

  // Time calculations
  const getRemainingTimeDetails = (requestedAt) => {
    if (!requestedAt) return { text: 'N/A', isOverdue: false, color: '#64748b' };
    const checkoutTime = new Date(requestedAt);
    const dueTime = new Date(checkoutTime.getTime() + 24 * 60 * 60 * 1000);
    const diffMs = dueTime.getTime() - timeNow.getTime();

    const formattedDue = dueTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ', ' + dueTime.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

    if (diffMs <= 0) {
      return { text: 'Overdue!', isOverdue: true, color: '#dc2626', dueStr: formattedDue };
    }

    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    let color = '#059669'; // green
    if (diffHrs < 4) {
      color = '#dc2626'; // red
    } else if (diffHrs < 12) {
      color = '#d97706'; // amber
    }

    return {
      text: `${diffHrs}h ${diffMins}m remaining`,
      isOverdue: false,
      color,
      dueStr: formattedDue
    };
  };

  const hasOverdueItems = borrowedItems.some(item => {
    const userReq = item.purchaseRequests.find(r => r.userId === (currentUser.id || currentUser._id));
    if (!userReq || !userReq.requestedAt) return false;
    const dueTime = new Date(new Date(userReq.requestedAt).getTime() + 24 * 60 * 60 * 1000);
    return dueTime.getTime() - timeNow.getTime() <= 0;
  });

  return (
    <div className="cg-app">
      <Sidebar active="Property Inventory" admin={false} isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
      <div className="cg-workspace">
        <Topbar title="Property Inventory" search="Search inventory..." onToggleSidebar={() => setSidebarOpen(true)} />
        <main className="cg-page">
          <section className="cg-admin-head">
            <div>
              <span>Municipal Property & Tools</span>
              <h1>Property Inventory</h1>
            </div>
            <span className="tag med" style={{ fontSize: '0.9rem', padding: '6px 12px' }}>Tree Cutter Mode</span>
          </section>

          {actionSuccess && (
            <div className="official-notice" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #86efac', marginBottom: '20px' }}>
              <CheckCircle2 size={18} style={{ marginRight: '8px' }} /> {actionSuccess}
            </div>
          )}
          {actionError && (
            <div className="official-notice" style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', marginBottom: '20px' }}>
              <AlertTriangle size={18} style={{ marginRight: '8px' }} /> {actionError}
            </div>
          )}

          {hasOverdueItems && (
            <div className="official-notice" style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={20} style={{ color: '#dc2626', flexShrink: 0 }} />
              <div>
                <b style={{ fontSize: '0.95rem', color: '#7f1d1d' }}>Warning: You have overdue equipment!</b>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#991b1b' }}>
                  Please return the overdue tools to the inventory immediately. All tools must be returned within 24 hours of checkout.
                </p>
              </div>
            </div>
          )}

          {/* Tab Selection & Cart Info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #e2e8f0', marginBottom: '24px', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setActiveTab('available')}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  background: 'none',
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: activeTab === 'available' ? '#059669' : '#64748b',
                  borderBottom: activeTab === 'available' ? '3px solid #059669' : '3px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
              >
                Available Equipment ({availableItems.length})
              </button>
              <button
                onClick={() => setActiveTab('borrowed')}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  background: 'none',
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: activeTab === 'borrowed' ? '#059669' : '#64748b',
                  borderBottom: activeTab === 'borrowed' ? '3px solid #059669' : '3px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                My Borrowed Equipment ({borrowedItems.length})
              </button>
            </div>

            {activeTab === 'available' && (
              <button
                onClick={() => setCartOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 18px',
                  borderRadius: '24px',
                  border: 'none',
                  background: '#059669',
                  color: '#fff',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(5, 150, 105, 0.2)',
                  transition: 'all 0.2s'
                }}
              >
                <Database size={18} />
                <span>My Cart ({cart.length})</span>
              </button>
            )}
          </div>

          <div className="cg-panel" style={{ padding: '24px' }}>
            {loading ? (
              <p style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Loading equipment inventory...</p>
            ) : activeTab === 'available' ? (
              availableItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  <Database size={40} style={{ opacity: 0.3, marginBottom: '10px' }} />
                  <p>No equipment currently available for borrow.</p>
                </div>
              ) : (
                <div className="table-responsive" style={{ overflowX: 'auto' }}>
                  <table className="cg-table wide">
                    <thead>
                      <tr>
                        <th>Image</th>
                        <th>Equipment Name</th>
                        <th>Description</th>
                        <th>Available Qty</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {availableItems.map((prop) => {
                        const inCart = cart.some(item => item._id === prop._id);
                        return (
                          <tr key={prop._id}>
                            <td>
                              {prop.imageUrl ? (
                                <img
                                  src={resolveImageUrl(prop.imageUrl)}
                                  alt={prop.name}
                                  style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                                />
                              ) : (
                                <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>No image</span>
                              )}
                            </td>
                            <td><b>{prop.name}</b></td>
                            <td>{prop.description || <i style={{ color: '#9ca3af' }}>No description</i>}</td>
                            <td>{prop.quantity - (inCart ? 1 : 0)}</td>
                            <td><span className="tag ok">Available</span></td>
                            <td>
                              {inCart ? (
                                <button
                                  className="cg-btn outline"
                                  onClick={() => removeFromCart(prop._id)}
                                  style={{ padding: '8px 16px', fontSize: '0.85rem', borderRadius: '8px', border: '1px solid #ef4444', color: '#ef4444' }}
                                >
                                  Remove
                                </button>
                              ) : (
                                <button
                                  className="cg-btn primary"
                                  onClick={() => addToCart(prop)}
                                  style={{ padding: '8px 16px', fontSize: '0.85rem', borderRadius: '8px', background: '#059669' }}
                                >
                                  Add to Cart
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              borrowedItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  <Database size={40} style={{ opacity: 0.3, marginBottom: '10px' }} />
                  <p>You have not borrowed or purchased any equipment yet.</p>
                </div>
              ) : (
                <div className="table-responsive" style={{ overflowX: 'auto' }}>
                  <table className="cg-table wide">
                    <thead>
                      <tr>
                        <th>Image</th>
                        <th>Equipment Name</th>
                        <th>Description</th>
                        <th>Date Borrowed</th>
                        <th>Return Due Date</th>
                        <th>Time Remaining</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {borrowedItems.map((prop) => {
                        const userReq = prop.purchaseRequests.find(r => r.userId === (currentUser.id || currentUser._id));
                        const dateStr = userReq && userReq.requestedAt
                          ? new Date(userReq.requestedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : 'N/A';

                        const timeDetails = getRemainingTimeDetails(userReq?.requestedAt);

                        return (
                          <tr
                            key={prop._id}
                            style={{
                              backgroundColor: timeDetails.isOverdue ? '#fff5f5' : 'transparent',
                              transition: 'background-color 0.2s'
                            }}
                          >
                            <td>
                              {prop.imageUrl ? (
                                <img
                                  src={resolveImageUrl(prop.imageUrl)}
                                  alt={prop.name}
                                  style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                                />
                              ) : (
                                <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>No image</span>
                              )}
                            </td>
                            <td><b>{prop.name}</b></td>
                            <td>{prop.description || <i style={{ color: '#9ca3af' }}>No description</i>}</td>
                            <td><small>{dateStr}</small></td>
                            <td><small style={{ fontWeight: '500', color: timeDetails.isOverdue ? '#dc2626' : '#1e293b' }}>{timeDetails.dueStr || 'N/A'}</small></td>
                            <td>
                              <span
                                className="tag"
                                style={{
                                  color: '#fff',
                                  backgroundColor: timeDetails.color,
                                  fontSize: '0.85rem',
                                  fontWeight: '600',
                                  padding: '4px 8px',
                                  borderRadius: '6px'
                                }}
                              >
                                {timeDetails.text}
                              </span>
                            </td>
                            <td>
                              <button
                                className="cg-btn outline"
                                onClick={() => handleReturnProperty(prop)}
                                disabled={isSubmitting}
                                style={{ padding: '8px 16px', fontSize: '0.85rem', borderRadius: '8px', border: '1px solid #dc2626', color: '#dc2626', fontWeight: '500' }}
                              >
                                Return
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>

          {/* Cart Drawer Overlay */}
          {cartOpen && (
            <div style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              zIndex: 9999,
              display: 'flex',
              justifyContent: 'flex-end',
              fontFamily: 'sans-serif'
            }}>
              <div style={{
                width: '100%',
                maxWidth: '450px',
                backgroundColor: '#ffffff',
                height: '100%',
                boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.15)',
                display: 'flex',
                flexDirection: 'column',
              }}>
                <header style={{
                  padding: '20px 24px',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#f8fafc'
                }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#1e293b' }}>Shopping Cart ({cart.length})</h3>
                  <button
                    onClick={() => setCartOpen(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '4px'
                    }}
                  >
                    <X size={24} />
                  </button>
                </header>

                <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
                  <div style={{
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fef3c7',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '20px',
                    display: 'flex',
                    gap: '12px'
                  }}>
                    <AlertTriangle size={20} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <b style={{ color: '#92400e', fontSize: '0.9rem', display: 'block', marginBottom: '4px' }}>24-Hour Return Policy</b>
                      <span style={{ color: '#b45309', fontSize: '0.85rem' }}>All checked-out equipment must be returned to inventory within 24 hours.</span>
                    </div>
                  </div>

                  {cart.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#64748b', padding: '40px 0' }}>
                      <p>Your cart is empty.</p>
                      <button
                        onClick={() => setCartOpen(false)}
                        className="cg-btn outline"
                        style={{ marginTop: '12px', padding: '8px 16px' }}
                      >
                        Browse Tools
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {cart.map((item) => (
                        <div
                          key={item._id}
                          style={{
                            display: 'flex',
                            gap: '16px',
                            padding: '16px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            alignItems: 'center',
                            backgroundColor: '#f8fafc'
                          }}
                        >
                          {item.imageUrl ? (
                            <img
                              src={resolveImageUrl(item.imageUrl)}
                              alt={item.name}
                              style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                            />
                          ) : (
                            <div style={{ width: '60px', height: '60px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.75rem' }}>No image</div>
                          )}
                          <div style={{ flex: 1 }}>
                            <h4 style={{ margin: '0 0 4px', fontSize: '0.95rem', fontWeight: '600', color: '#1e293b' }}>{item.name}</h4>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>{item.description ? item.description.slice(0, 50) + '...' : 'No description'}</p>
                          </div>
                          <button
                            onClick={() => removeFromCart(item._id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: '8px'
                            }}
                            title="Remove from Cart"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {cart.length > 0 && (
                  <footer style={{
                    padding: '24px',
                    borderTop: '1px solid #e2e8f0',
                    backgroundColor: '#f8fafc'
                  }}>
                    <button
                      className="cg-btn primary"
                      onClick={handleCheckout}
                      disabled={isSubmitting}
                      style={{
                        width: '100%',
                        height: '48px',
                        fontSize: '1rem',
                        fontWeight: '600',
                        borderRadius: '12px',
                        backgroundColor: '#059669',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      {isSubmitting ? 'Borrowing...' : `Checkout Cart (${cart.length} item${cart.length > 1 ? 's' : ''})`}
                    </button>
                  </footer>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export function CitizenDashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('currentUser')) || {};
    } catch {
      return {};
    }
  })();

  return (
    <div className="cg-app cg-dashboard-screen">
      <Sidebar active="My Dashboard" isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
      <div className="cg-workspace">
        <Topbar title="Citizen Dashboard" onToggleSidebar={() => setSidebarOpen(true)} />
        <main className="cg-page" style={{ padding: '24px clamp(16px, 2vw, 32px)' }}>
          {/* Sub Navigation */}
          <div
            className="citizen-sub-nav"
            style={{
              display: 'flex',
              gap: '12px',
              borderBottom: '1px solid #cbd5e1',
              marginBottom: '24px',
              paddingBottom: '8px'
            }}
          >
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'report', label: 'Report New Issue' },
              { id: 'my-reports', label: 'My Reported Tickets' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`cg-btn ${activeTab === tab.id ? 'primary' : 'ghost'}`}
                style={{
                  fontSize: '0.9rem',
                  padding: '8px 16px',
                  fontWeight: 600,
                  borderRadius: '6px'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <CitizenDashboard user={currentUser} activeTab={activeTab} onTabChange={setActiveTab} />
        </main>
      </div>
    </div>
  );
}
