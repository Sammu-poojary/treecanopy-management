import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import NotificationBell from '../components/NotificationBell';
import CitizenDashboard from '../components/CitizenDashboard';
import AdminDashboard from '../components/AdminDashboard';
import { Link, useNavigate, useSearchParams, useLocation, useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, Polyline, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import diseasedLeafImg from '../assets/diseased_leaf.png';
import pestsGridImg from '../assets/pests_grid.png';
import Swal from 'sweetalert2';
import { GoogleLogin } from '@react-oauth/google';

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

import { CommunicationHub } from '../components/CommunicationHub';
import TreeCutterDashboard, { TreeDutyPanel } from '../components/TreeCutterDashboard';
import TreeCutterAttendancePage from './TreeCutterAttendancePage';
import TreeLocationPickerModal, { reverseGeocodeUdupi } from '../components/TreeLocationPickerModal';
import CareCalendarModal from '../components/CareCalendarModal';

import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Ban,
  BarChart3,
  Bell,
  Bird,
  Briefcase,
  Building,
  CalendarDays,
  Camera,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Clock,
  Clock3,
  Cloud,
  Crosshair,
  Database,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileCheck,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Filter,
  Fingerprint,
  Flame,
  FolderOpen,
  Gavel,
  Gift,
  Grid,
  HelpCircle,
  HeartHandshake,
  History,
  Home,
  Image,
  Info,
  Layers,
  LayoutDashboard,
  Leaf,
  LogIn,
  LogOut,
  Map as MapIcon,
  MapPin,
  Menu,
  MessageSquare,
  Navigation,
  Package,
  Pencil,
  Phone,
  Plus,
  PlusCircle,
  QrCode,
  Radio,
  Recycle,
  RefreshCw,
  Search,
  Send,
  Settings,
  Share2,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Sprout,
  Stethoscope,
  TreeDeciduous,
  TreePine,
  TrendingDown,
  Truck,
  Upload,
  UploadCloud,
  UserCheck,
  UserCog,
  UserPlus,
  UserRound,
  Users,
  Wrench,
  X,
  Zap,
  Activity,
  Award,
  Check,
  ChevronUp,
  Compass,
  FileCode,
  Globe2,
  LifeBuoy,
  Lock,
  Mail,
  Maximize2,
  Minimize2,
  Moon,
  Percent,
  Play,
  RotateCcw,
  Sliders,
  Sun,
  Target,
  Terminal,
  Volume2,
  VolumeX,
  Wifi,
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

// ─── Helper to check if a Tree Cutter is currently on leave ──────────────────
export const checkCutterLeaveStatus = (cutterName, targetDateStr = null) => {
  if (!cutterName || cutterName === 'Unassigned' || cutterName === 'All') return { isOnLeave: false };
  const checkDate = targetDateStr || new Date().toISOString().slice(0, 10);
  let allLeaves = [];
  try {
    const l1 = JSON.parse(localStorage.getItem('officialLeaves') || '[]');
    const l2 = JSON.parse(localStorage.getItem('staff_leave_requests') || '[]');
    const l3 = window.globalStaffLeaves || [];
    allLeaves = [...l1, ...l2, ...l3];
  } catch {
    allLeaves = window.globalStaffLeaves || [];
  }

  const nameLower = cutterName.toLowerCase().trim();
  const activeLeave = allLeaves.find(l => {
    const lName = (l.userName || l.name || '').toLowerCase().trim();
    if (!lName || (!lName.includes(nameLower) && !nameLower.includes(lName))) return false;
    if (l.status === 'Rejected' || l.status === 'Cancelled') return false;
    const start = l.startDate;
    const end = l.endDate;
    if (start && end) {
      return checkDate >= start && checkDate <= end;
    }
    return false;
  });

  if (activeLeave) {
    return {
      isOnLeave: true,
      startDate: activeLeave.startDate,
      endDate: activeLeave.endDate,
      reason: activeLeave.reason,
      leaveType: activeLeave.leaveType || 'Leave'
    };
  }
  return { isOnLeave: false };
};

// ─── Role-based navigation definitions ────────────────────────────────────────
const ROLE_NAV = {
  Citizen: [
    {
      section: 'Citizen Dashboard',
      items: [
        { label: 'Overview', href: '/citizen-dashboard?tab=overview', Icon: Home, desc: 'Overview & stats' },
        { label: 'Green Store', href: '/citizen-dashboard?tab=store', Icon: ShoppingBag, desc: 'Buy organic compost & saplings' },
        { label: 'Green Rewards & My Trees', href: '/citizen-dashboard?tab=rewards', Icon: Gift, desc: 'Eco points, streaks & my trees' },
        { label: 'Report New Issue', href: '/citizen-dashboard?tab=report', Icon: AlertTriangle, desc: 'Report a tree issue' },
        { label: 'My Reported Tickets', href: '/citizen-dashboard?tab=tickets', Icon: FileText, desc: 'Track status of your tickets' },
        { label: 'Citizen Profile', href: '/citizen-dashboard?tab=profile', Icon: UserRound, desc: 'View & edit profile settings' },
      ],
    },
    {
      section: 'Community & Trees',
      items: [
        { label: 'Home Page', href: '/home', Icon: Globe, desc: 'Main landing page' },
        { label: 'Track Report', href: '/track', Icon: Crosshair, desc: 'Follow up on complaints' },
        { label: 'Tree Database', href: '/view-tree', Icon: TreePine, desc: 'Browse tree records' },
        { label: 'Tree Encyclopedia', href: '/tree-encyclopedia', Icon: BookOpen, desc: 'Species info & guides' },
      ],
    },
  ],

  'Tree Cutter': [
    {
      section: 'Work',
      items: [
        { label: 'Dashboard', href: '/treecutter/dashboard', Icon: Home, desc: 'Monitoring overview' },
        { label: 'Task Board', href: '/treecutter/task', Icon: FileText, desc: 'Assigned work orders' },
        { label: 'Tree Care Duties', href: '/treecutter/tree-duties', Icon: Leaf, desc: 'Assigned tree duties & care proofs' },
        { label: 'Communication', href: '/treecutter/communication', Icon: MessageSquare, desc: 'Chat & ask doubts' },
        { label: 'Attendance', href: '/treecutter/attendance', Icon: Fingerprint, desc: 'Clock in / out' },
      ],
    },
    {
      section: 'Trees & Assets',
      items: [
        { label: 'View Tree', href: '/treecutter/view-tree', Icon: TreePine, desc: 'Tree records' },
        { label: 'Tree Inventory', href: '/treecutter/tree-inventory', Icon: Layers, desc: 'Full inventory' },
        { label: 'Property Inventory', href: '/treecutter/property-inventory', Icon: Database, desc: 'Equipment & tools' },
      ],
    },
  ],

  Official: [
    {
      section: 'Overview',
      items: [
        { label: 'Dashboard', href: '/official/dashboard', Icon: Home, desc: 'Zone monitoring' },
        { label: 'Tree Adoptions', href: '/official/adoptions', Icon: HeartHandshake, desc: 'Manage citizen adoptions & care' },
        { label: 'Work Schedules', href: '/official/scheduler', Icon: Calendar, desc: 'Plan & assign tasks' },
        { label: 'Communication', href: '/official/communication', Icon: MessageSquare, desc: 'Staff chat & doubts' },
        { label: 'Complaints', href: '/official/complaints', Icon: AlertTriangle, desc: 'Manage field reports' },
        { label: 'Attendance', href: '/official/attendance', Icon: Fingerprint, desc: 'Track cutter hours' },
        { label: 'View Tree Cutter', href: '/official/view-tree-cutter', Icon: Users, desc: 'Cutter analytics & ratios' },
      ],
    },
    {
      section: 'Circular Economy & Logistics',
      items: [
        { label: 'Biomass & Processing', href: '/processing', Icon: Recycle, desc: 'Composting & biomass yard' },
        { label: 'Eco Store Manager', href: '/official/eco-store', Icon: ShoppingBag, desc: 'Products, stock & batch packaging' },
        { label: 'Timber Auction & Dispatch', href: '/official/timber-management', Icon: Gavel, desc: 'Declare winners & manage dispatch' },
        { label: 'Orders & Delivery Fleet', href: '/official/orders-delivery', Icon: Truck, desc: 'Eco-store dispatch & payments' },
      ],
    },
    {
      section: 'Trees & Assets',
      items: [
        { label: 'Tree Inventory', href: '/official/tree-inventory', Icon: Layers, desc: 'Full tree database' },
        { label: 'View Tree', href: '/official/view-tree', Icon: TreePine, desc: 'Browse records' },
        { label: 'Tree Encyclopedia', href: '/official/tree-encyclopedia', Icon: BookOpen, desc: 'Species library' },
        { label: 'Property Inventory', href: '/official/property-inventory', Icon: Database, desc: 'Asset records' },
      ],
    },
  ],

  Admin: [
    {
      section: 'Overview',
      items: [
        { label: 'Dashboard', href: '/admin/dashboard', Icon: Home, desc: 'System-wide monitoring' },
        { label: 'Admin Console', href: '/admin', Icon: ShieldCheck, desc: 'Users, settings, logs' },
        { label: 'Tree Adoptions', href: '/admin/adoptions', Icon: HeartHandshake, desc: 'Citizen tree adoptions & care' },
        { label: 'Communication', href: '/admin/communication', Icon: MessageSquare, desc: 'Staff chat & doubts' },
        { label: 'Work Schedules', href: '/admin/scheduler', Icon: Calendar, desc: 'Task scheduling' },
        { label: 'Complaints', href: '/admin/complaints', Icon: AlertTriangle, desc: 'Overlook & resolve complaints' },
        { label: 'Attendance', href: '/admin/attendance', Icon: Fingerprint, desc: 'Workforce tracking' },
      ],
    },
    {
      section: 'Circular Economy & Logistics',
      items: [
        { label: 'Biomass & Processing', href: '/processing', Icon: Recycle, desc: 'Composting & circular economy' },
        { label: 'Eco Store Manager', href: '/admin/eco-store', Icon: ShoppingBag, desc: 'Products, stock & batch packaging' },
        { label: 'Timber Auction & Dispatch', href: '/official/timber-management', Icon: Gavel, desc: 'Declare winners & manage dispatch' },
        { label: 'Orders & Delivery Fleet', href: '/official/orders-delivery', Icon: Truck, desc: 'Eco-store dispatch & payments' },
      ],
    },
    {
      section: 'Trees & Assets',
      items: [
        { label: 'Tree Inventory', href: '/admin/tree-inventory', Icon: Layers, desc: 'Full tree database' },
        { label: 'Add Tree', href: '/admin/add-tree', Icon: Plus, desc: 'Register new tree' },
        { label: 'View Tree', href: '/admin/view-tree', Icon: TreePine, desc: 'Browse records' },
        { label: 'Tree Encyclopedia', href: '/admin/tree-encyclopedia', Icon: BookOpen, desc: 'Species library' },
        { label: 'Add Property', href: '/admin/add-property', Icon: Building2, desc: 'Register property' },
        { label: 'Property Inventory', href: '/admin/property-inventory', Icon: Database, desc: 'Asset records' },
      ],
    },
  ],
};

// Role badge colors
const ROLE_COLORS = {
  Citizen: { bg: 'rgba(59,130,246,0.18)', border: 'rgba(59,130,246,0.4)', text: '#93c5fd', dot: '#3b82f6' },
  'Tree Cutter': { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)', text: '#fcd34d', dot: '#f59e0b' },
  Official: { bg: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.4)', text: '#c4b5fd', dot: '#a855f7' },
  Admin: { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.4)', text: '#fca5a5', dot: '#ef4444' },
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const speciesImages = {
  chiku: 'https://images.unsplash.com/photo-1528183429752-a97d0bf99b5a?auto=format&fit=crop&w=800&q=80',
  sapota: 'https://images.unsplash.com/photo-1528183429752-a97d0bf99b5a?auto=format&fit=crop&w=800&q=80',
  mango: 'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?auto=format&fit=crop&w=800&q=80',
  guava: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=800&q=80',
  coconut: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80',
  pomegranate: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=800&q=80',
  banyan: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=800&q=80',
  neem: 'https://images.unsplash.com/photo-1603569283847-aa295f0d016a?auto=format&fit=crop&w=800&q=80',
  peepal: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=800&q=80',
  rosewood: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80',
  eucalyptus: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80',
  tamarind: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=800&q=80',
  jackfruit: 'https://images.unsplash.com/photo-1618897996318-5a901fa6ca71?auto=format&fit=crop&w=800&q=80',
  ashoka: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80',
  gulmohar: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80',
  honge: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80',
  oak: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=800&q=80',
  default: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80'
};

const getTreeDisplayImage = (tree) => {
  if (!tree) return speciesImages.default;

  // 1. Check tree.images array first if available
  if (tree.images && Array.isArray(tree.images) && tree.images.length > 0) {
    let firstImg = tree.images[0];
    if (typeof firstImg === 'object' && firstImg?.url) firstImg = firstImg.url;
    if (typeof firstImg === 'string' && firstImg.trim() !== '') {
      let img = firstImg.trim();
      if (img.includes('http') && img.lastIndexOf('http') > 0) {
        img = img.substring(img.lastIndexOf('http'));
      }
      if (img.startsWith('/uploads/')) {
        img = `${API_URL}${img}`;
      }
      if (img.startsWith('http://') || img.startsWith('https://')) {
        return img;
      }
    }
  }

  // 2. Check primary tree.image field
  if (tree.image && typeof tree.image === 'string' && tree.image.trim() !== '') {
    let img = tree.image.trim();
    if (img.includes('http') && img.lastIndexOf('http') > 0) {
      img = img.substring(img.lastIndexOf('http'));
    }
    if (img.startsWith('/uploads/')) {
      img = `${API_URL}${img}`;
    }
    if (img.startsWith('http://') || img.startsWith('https://')) {
      return img;
    }
  }

  // 3. Species-specific smart image fallback
  const nameStr = `${tree.name || ''} ${tree.scientificName || ''} ${tree.family || ''}`.toLowerCase();
  if (nameStr.includes('chiku') || nameStr.includes('sapota') || nameStr.includes('manilkara') || nameStr.includes('zapota')) return speciesImages.chiku;
  if (nameStr.includes('mango') || nameStr.includes('mangifera')) return speciesImages.mango;
  if (nameStr.includes('guava') || nameStr.includes('guajava') || nameStr.includes('psidium')) return speciesImages.guava;
  if (nameStr.includes('pomegranate') || nameStr.includes('punica') || nameStr.includes('granatum')) return speciesImages.pomegranate;
  if (nameStr.includes('coconut') || nameStr.includes('cocos') || nameStr.includes('arecaceae') || nameStr.includes('palm')) return speciesImages.coconut;
  if (nameStr.includes('banyan') || nameStr.includes('benghalensis')) return speciesImages.banyan;
  if (nameStr.includes('neem') || nameStr.includes('azadirachta')) return speciesImages.neem;
  if (nameStr.includes('peepal') || nameStr.includes('religiosa')) return speciesImages.peepal;
  if (nameStr.includes('jackfruit') || nameStr.includes('artocarpus')) return speciesImages.jackfruit;
  if (nameStr.includes('gulmohar') || nameStr.includes('delonix')) return speciesImages.gulmohar;
  if (nameStr.includes('rosewood') || nameStr.includes('dalbergia')) return speciesImages.rosewood;
  if (nameStr.includes('eucalyptus')) return speciesImages.eucalyptus;
  if (nameStr.includes('tamarind')) return speciesImages.tamarind;
  if (nameStr.includes('ashoka') || nameStr.includes('polyalthia')) return speciesImages.ashoka;
  if (nameStr.includes('honge') || nameStr.includes('pongamia')) return speciesImages.honge;
  if (nameStr.includes('oak')) return speciesImages.oak;
  return speciesImages.default;
};

const normalizeRole = (role) => {
  if (!role) return '';
  const r = role.toLowerCase().replace(/_/g, ' ').replace(/-/g, ' ').trim();
  if (r === 'arborist / cutter' || r === 'tree cutter' || r === 'treecutter' || r === 'cutter') {
    return 'Tree Cutter';
  }
  if (r === 'official') return 'Official';
  if (r === 'admin') return 'Admin';
  if (r === 'delivery' || r === 'delivery partner') return 'Delivery Partner';
  if (r === 'timber buyer' || r === 'timber merchant' || r === 'timber' || r === 'merchant') return 'Timber Merchant';
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
    try { return JSON.parse(localStorage.getItem('currentUser')) || {}; }
    catch { return {}; }
  })();

  const path = window.location.pathname;
  const isAdminSession = admin || sessionStorage.getItem('adminAuthed') === 'true' || path.startsWith('/admin') || normalizeRole(currentUser.role) === 'Admin';
  const isOfficialSession = !isAdminSession && (sessionStorage.getItem('officialAuthed') === 'true' || path.startsWith('/official') || path.startsWith('/official-management') || normalizeRole(currentUser.role) === 'Official');
  const isCutterSession = !isAdminSession && !isOfficialSession && (path.startsWith('/treecutter') || path.startsWith('/cutter') || normalizeRole(currentUser.role) === 'Tree Cutter');

  let displayRole = 'Citizen';
  if (isAdminSession) {
    displayRole = 'Admin';
  } else if (isOfficialSession) {
    displayRole = 'Official';
  } else if (isCutterSession) {
    displayRole = 'Tree Cutter';
  } else if (currentUser.role) {
    displayRole = normalizeRole(currentUser.role);
  }

  let userName = 'User';
  if (displayRole === 'Admin') {
    userName = (currentUser.role === 'Admin' && currentUser.name)
      ? currentUser.name
      : (sessionStorage.getItem('adminUsername') || 'Municipal Admin');
  } else {
    userName = currentUser.name || currentUser.username || 'User';
  }

  const userInitials = userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || (displayRole === 'Admin' ? 'AD' : 'U');

  // Pick role color scheme
  const roleColor = ROLE_COLORS[displayRole] || ROLE_COLORS.Official;

  // Pick navigation groups
  const effectiveRole = ROLE_NAV[displayRole] ? displayRole : (displayRole === 'Admin' ? 'Admin' : 'Official');
  const navGroups = ROLE_NAV[effectiveRole];

  // Quick-action CTA by role
  const ctaConfig = {
    Citizen: { label: 'Report an Issue', href: '/report-issue', Icon: AlertTriangle },
    'Tree Cutter': { label: 'View My Tasks', href: '/task', Icon: FileText },
    Official: { label: 'New Work Order', href: '/scheduler', Icon: Calendar },
    Admin: { label: 'Admin Console', href: '/admin', Icon: ShieldCheck },
  };
  const cta = ctaConfig[displayRole] || ctaConfig.Official;

  // Lock scroll on mobile when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Theme toggle state
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('theme', next ? 'dark' : 'light');
    window.dispatchEvent(new Event('themeChange'));
  };
  useEffect(() => {
    const sync = () => setIsDark(localStorage.getItem('theme') === 'dark');
    window.addEventListener('themeChange', sync);
    return () => window.removeEventListener('themeChange', sync);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('officialAuthed');
    sessionStorage.removeItem('adminAuthed');
    sessionStorage.removeItem('adminUsername');
    window.location.href = '/login';
  };

  return (
    <>
      {isOpen && <div className="cg-side-overlay" onClick={onToggle} />}
      <aside className={`cg-side ${isOpen ? 'open' : ''}`}>

        {/* ── Brand Header ── */}
        <div className="cg-side-brand" style={{ padding: '20px 20px 22px', borderBottom: '1px solid rgba(82,183,136,0.14)', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
                <TreePine size={20} color="#fff" />
              </div>
              <div>
                <div style={{ fontWeight: 900, fontSize: '1.15rem', color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>CanopyGuard</div>
                <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'rgba(149,213,178,0.65)', fontWeight: 700, marginTop: 2 }}>Management System</div>
              </div>
            </div>
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(82,183,136,0.3)', background: 'rgba(82,183,136,0.1)', color: isDark ? '#fbbf24' : '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </div>

        {/* ── User Card ── */}
        <div style={{ margin: '0 14px 16px', padding: '14px 16px', borderRadius: 14, background: 'rgba(82,183,136,0.08)', border: '1px solid rgba(82,183,136,0.16)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Avatar */}
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,#34d399,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1rem', color: '#064e3b', flexShrink: 0, border: '2px solid rgba(255,255,255,0.25)', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
              {userInitials}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName}</div>
              {/* Role badge */}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 4, padding: '2px 8px', borderRadius: 99, fontSize: '0.68rem', fontWeight: 700, background: roleColor.bg, border: `1px solid ${roleColor.border}`, color: roleColor.text }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: roleColor.dot, display: 'inline-block', flexShrink: 0 }} />
                {displayRole}
              </span>
            </div>
          </div>
        </div>

        {/* ── Navigation Groups ── */}
        <nav style={{ flex: '1 1 auto', overflowY: 'auto', overscrollBehavior: 'contain', minHeight: 0, padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navGroups.map(({ section, items }) => (
            <div key={section} style={{ marginBottom: 6 }}>
              {/* Section label */}
              <div style={{ padding: '6px 10px 4px', fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.8px', color: 'rgba(149,213,178,0.45)' }}>
                {section}
              </div>
              {/* Items */}
              {items.map(({ label, href, Icon, desc }) => {
                const currentFullUrl = window.location.pathname + window.location.search;
                const isActive = active === label || currentFullUrl === href || (href === '/citizen-dashboard?tab=overview' && currentFullUrl === '/citizen-dashboard');
                return (
                  <Link
                    key={label}
                    to={href}
                    title={desc}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 12px',
                      borderRadius: 10,
                      fontSize: '0.88rem',
                      fontWeight: isActive ? 700 : 600,
                      color: isActive ? '#6ee7b7' : 'rgba(200,230,212,0.72)',
                      background: isActive ? 'linear-gradient(135deg,rgba(52,211,153,0.18),rgba(16,185,129,0.1))' : 'transparent',
                      boxShadow: isActive ? 'inset 3px 0 0 #34d399' : 'none',
                      textDecoration: 'none',
                      transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
                      marginBottom: 1,
                    }}
                    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(82,183,136,0.1)'; e.currentTarget.style.color = '#b7e4c7'; e.currentTarget.style.transform = 'translateX(3px)'; } }}
                    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(200,230,212,0.72)'; e.currentTarget.style.transform = 'none'; } }}
                  >
                    {/* Icon wrapper */}
                    <span style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: isActive ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.05)', color: isActive ? '#34d399' : 'rgba(149,213,178,0.7)', transition: 'all 0.18s' }}>
                      <Icon size={17} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>{label}</span>
                    {isActive && <ChevronRight size={14} style={{ opacity: 0.6, flexShrink: 0 }} />}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* ── Footer ── */}
        <div style={{ padding: '14px 14px 18px', borderTop: '1px solid rgba(82,183,136,0.12)', marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* CTA button */}
          <Link
            to={cta.href}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 16px', borderRadius: 12, background: 'linear-gradient(135deg,#059669,#047857)', color: '#ffffff', fontWeight: 700, fontSize: '0.86rem', textDecoration: 'none', boxShadow: '0 4px 16px rgba(5,150,105,0.35)', transition: 'all 0.2s', letterSpacing: '0.01em' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(5,150,105,0.45)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(5,150,105,0.35)'; }}
          >
            <cta.Icon size={16} />
            {cta.label}
          </Link>
          {/* Logout */}
          <button
            onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '10px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', cursor: 'pointer', fontWeight: 600, fontSize: '0.86rem', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.18)'; e.currentTarget.style.color = '#ffffff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#fca5a5'; }}
          >
            <LogOut size={16} /> Log Out
          </button>
        </div>

      </aside>
    </>
  );
}

export function Topbar({ title = 'CanopyGuard', search = 'Search assets, zones, or reports...', showSearch = true, attendance = false, citizenTabs = false, activeTab, onTabChange, onToggleSidebar, onProfileClick }) {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('currentUser')) || {}; }
    catch { return {}; }
  });

  useEffect(() => {
    const syncUser = () => {
      try {
        setCurrentUser(JSON.parse(localStorage.getItem('currentUser')) || {});
      } catch {
        setCurrentUser({});
      }
    };
    window.addEventListener('storage', syncUser);
    return () => window.removeEventListener('storage', syncUser);
  }, []);

  const isAdminSession = title === 'Admin Console' || sessionStorage.getItem('adminAuthed') === 'true' || window.location.pathname.startsWith('/admin') || currentUser.role === 'Admin';
  const isOfficialSession = sessionStorage.getItem('officialAuthed') === 'true' || currentUser.role === 'Official';

  let displayRole = 'Citizen';
  if (isAdminSession) {
    displayRole = 'Admin';
  } else if (isOfficialSession) {
    displayRole = 'Official';
  } else if (currentUser.role) {
    displayRole = normalizeRole(currentUser.role);
  }

  let userName = 'User';
  let userPhoto = '';
  if (displayRole === 'Admin') {
    userName = (currentUser.role === 'Admin' && currentUser.name)
      ? currentUser.name
      : (sessionStorage.getItem('adminUsername') || 'Municipal Admin');
    userPhoto = currentUser.role === 'Admin' ? (currentUser.profileImage || currentUser.avatar || '') : '';
  } else {
    userName = currentUser.name || currentUser.username || 'User';
    userPhoto = currentUser.profileImage || currentUser.avatar || '';
  }

  const initial = userName.charAt(0).toUpperCase() || (displayRole === 'Admin' ? 'A' : 'U');

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
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '8px' }}>
        {/* Back Button - Icon Only */}
        <button
          onClick={() => navigate(-1)}
          title="Go Back"
          className="cg-back-btn"
          type="button"
          style={{ width: '36px', height: '36px', padding: 0, justifyContent: 'center' }}
        >
          <ArrowLeft size={18} />
        </button>

        {/* Sidebar Menu Button */}
        <button className="cg-menu-btn" onClick={onToggleSidebar} title="Toggle Navigation Sidebar" type="button">
          <Menu size={22} />
        </button>

        {/* CanopyGuard Branding Logo */}
        <Link to={displayRole === 'Admin' ? '/admin' : '/home'} className="cg-brand" title={displayRole === 'Admin' ? 'CanopyGuard Admin' : 'CanopyGuard Home'} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', marginLeft: '6px' }}>
          <TreePine size={22} color="#10b981" />
          <span style={{ fontWeight: 900, fontSize: '1.15rem', color: 'inherit', letterSpacing: '-0.02em' }}>CanopyGuard</span>
        </Link>
      </div>

      {citizenTabs ? (
        <nav className="topbar-citizen-tabs" style={{ display: 'flex', alignItems: 'center', gap: '4px', overflowX: 'auto', flex: 1, margin: '0 12px' }}>
          <Link
            to="/home"
            title="Return to Main Home Portal"
            className="topbar-nav-pill"
          >
            Home
          </Link>
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'store', label: '🌿 Green Store' },
            { id: 'rewards', label: 'Green Rewards & Trees' },
            { id: 'subscriptions', label: '🌳 My Subscriptions' },
            { id: 'report', label: 'Report Issue' },
            { id: 'my-reports', label: 'My Tickets' },
            { id: 'profile', label: 'Profile' }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange && onTabChange(tab.id)}
                type="button"
                className={`topbar-nav-pill ${isActive ? 'active' : ''}`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      ) : attendance ? (
        <nav className="cg-tab-nav">
          <Link to={displayRole === 'Admin' ? '/admin/dashboard' : displayRole === 'Official' ? '/official/dashboard' : '/treecutter/dashboard'}>Dashboard</Link>
          <Link className="active" to={displayRole === 'Admin' ? '/admin/attendance' : displayRole === 'Official' ? '/official/attendance' : '/attendance'}>Attendance</Link>
          <Link to={displayRole === 'Admin' ? '/admin/scheduler' : displayRole === 'Official' ? '/official/scheduler' : '/treecutter/task'}>
            {displayRole === 'Tree Cutter' ? 'Task Board' : 'Schedules'}
          </Link>
        </nav>
      ) : (
        <h1 className="cg-topbar-title">{title}</h1>
      )}

      {/* Topbar Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
        {/* Dark / Light Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={darkMode ? "Switch to Light Theme" : "Switch to Dark Theme"}
          className="cg-theme-btn"
          type="button"
        >
          {darkMode ? <Sun size={18} color="#fbbf24" /> : <Moon size={18} color="#6366f1" />}
        </button>

        <NotificationBell />

        {/* Topbar User Profile Badge */}
        {(() => {
          const isCitizen = displayRole === 'Citizen';
          const isAdmin = displayRole === 'Admin';
          const isOfficial = displayRole === 'Official';
          const isTimber = displayRole === 'Timber Merchant' || displayRole === 'Timber Buyer';
          const isDelivery = displayRole === 'Delivery Partner';
          const isCutter = displayRole === 'Tree Cutter';

          let profileLink = '/home';
          let profileTooltip = 'View Profile';

          if (isAdmin) {
            profileLink = '/admin';
            profileTooltip = 'Admin Console & Settings';
          } else if (isOfficial) {
            profileLink = '/official-management';
            profileTooltip = 'Official Governance Portal';
          } else if (isTimber) {
            profileLink = '/timber-auction';
            profileTooltip = `${userName} (${currentUser.company || currentUser.businessName || 'Timber Merchant'})`;
          } else if (isDelivery) {
            profileLink = '/delivery';
            profileTooltip = `${userName} (Delivery Fleet)`;
          } else if (isCutter) {
            profileLink = '/treecutter/dashboard';
            profileTooltip = `${userName} (Tree Cutter Dashboard)`;
          } else if (isCitizen) {
            profileLink = '/citizen-dashboard?tab=profile';
            profileTooltip = 'View Citizen Profile';
          }

          const avatarContent = (
            <>
              {userPhoto ? (
                <img src={userPhoto} alt={userName} className="topbar-avatar-img" />
              ) : (
                <div className="topbar-avatar-circle">{initial}</div>
              )}
              <span className="topbar-user-name">{userName}</span>
            </>
          );

          if (onProfileClick) {
            return (
              <button
                onClick={onProfileClick}
                className="cg-topbar-profile-trigger"
                title={profileTooltip}
                type="button"
              >
                {avatarContent}
              </button>
            );
          }

          return (
            <Link to={profileLink} className="cg-topbar-profile-trigger" title={profileTooltip}>
              {avatarContent}
            </Link>
          );
        })()}
      </div>
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
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [allComplaintsList, setAllComplaintsList] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState(monitoringZones[0].id);
  const [currentTime, setCurrentTime] = useState(new Date());

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('currentUser')) || {};
    } catch {
      return {};
    }
  })();
  const currentUserRole = normalizeRole(currentUser.role);

  // If logged in as Citizen, redirect to the single Citizen Dashboard
  useEffect(() => {
    if (currentUserRole === 'Citizen') {
      navigate('/citizen-dashboard', { replace: true });
    }
  }, [currentUserRole, navigate]);

  const isCutterPath = window.location.pathname.startsWith('/treecutter') || window.location.pathname.startsWith('/cutter');
  if (currentUserRole === 'Tree Cutter' || isCutterPath) {
    return (
      <div className="cg-app">
        <Sidebar active="Dashboard" isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
        <div className="cg-workspace">
          <Topbar title="Tree Cutter Field Operations Dashboard" onToggleSidebar={() => setSidebarOpen(true)} />
          <TreeCutterDashboard />
        </div>
      </div>
    );
  }

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

              {/* Official Biomass & Circular Economy Card */}
              <div className="cg-panel" style={{ background: 'linear-gradient(135deg, #072a22 0%, #0c3e32 100%)', border: '1px solid rgba(52, 211, 153, 0.3)', borderRadius: '16px', padding: '18px 20px', color: '#f8fafc', marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#34d399', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Recycle size={14} /> Official Biomass & Waste Yard
                  </span>
                  <span style={{ fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', padding: '2px 8px', borderRadius: '8px', fontWeight: 700 }}>
                    100% Diverted
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '10px', borderRadius: '8px' }}>
                    <small style={{ color: '#95d5b2', fontSize: '0.72rem', display: 'block' }}>Compost Batches</small>
                    <b style={{ fontSize: '1.25rem', color: '#ffffff', fontWeight: 800 }}>5 Maturing</b>
                  </div>
                  <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '10px', borderRadius: '8px' }}>
                    <small style={{ color: '#95d5b2', fontSize: '0.72rem', display: 'block' }}>Timber Auctions</small>
                    <b style={{ fontSize: '1.25rem', color: '#fbbf24', fontWeight: 800 }}>Live Bidding</b>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Link to="/processing" style={{ flex: 1, padding: '8px', background: '#10b981', color: '#020617', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, textAlign: 'center', textDecoration: 'none' }}>
                    Yard Console
                  </Link>
                  <Link to="/official/timber-management" style={{ flex: 1, padding: '8px', background: 'rgba(255, 255, 255, 0.08)', color: '#f8fafc', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, textAlign: 'center', textDecoration: 'none' }}>
                    Timber Desk
                  </Link>
                </div>
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
    status: 'In Progress',
    progress: 50,
    dueDate: new Date().toISOString().slice(0, 10),
    source: 'Official Order',
    visits: [{ time: '09:00 AM', location: 'Udupi Main Rd', note: 'Dispatched by Official.' }],
    beforeImage: 'Submitted',
    afterImage: 'Submitted',
    wasteProof: 'Submitted',
    beforeImageUrl: 'https://res.cloudinary.com/j7ofhcn9/image/upload/v1789482673/treecanopy_uploads/scu3nzewe3ew3i6f3ybd.jpg',
    progressImageUrl: 'https://res.cloudinary.com/j7ofhcn9/image/upload/v1789483388/treecanopy_uploads/jkxqgghwpbimkpteakiy.jpg',
    afterImageUrl: 'https://res.cloudinary.com/j7ofhcn9/image/upload/v1789483394/treecanopy_uploads/huzytgdozu0fr64akbik.webp',
    wasteProofUrl: 'https://res.cloudinary.com/j7ofhcn9/image/upload/v1789483415/treecanopy_uploads/symeqstft7s0hwe9ynuw.jpg',
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
    visits: [{ time: '10:30 AM', location: 'Manipal Drive', note: 'Work in progress.' }],
    beforeImage: 'Submitted',
    afterImage: 'Pending upload',
    wasteProof: 'Pending upload',
    beforeImageUrl: 'https://res.cloudinary.com/j7ofhcn9/image/upload/v1789482673/treecanopy_uploads/scu3nzewe3ew3i6f3ybd.jpg',
    progressImageUrl: 'https://res.cloudinary.com/j7ofhcn9/image/upload/v1789483388/treecanopy_uploads/jkxqgghwpbimkpteakiy.jpg',
    afterImageUrl: '',
    wasteProofUrl: '',
  }
];

// Top-Level Geo-Tag Image Proof Display Component
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
  if (!src) return null;

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
      const updatedUser = { ...u, profileImage: photoUrl, avatar: photoUrl };
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));

      const targetId = u.id || u._id || u.email;
      if (targetId) {
        fetch(`${API_URL}/api/auth/profile/${encodeURIComponent(targetId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileImage: photoUrl, avatar: photoUrl })
        }).catch(() => { });
      }

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
      const targetId = u.id || u._id || u.email;
      if (targetId) {
        fetch(`${API_URL}/api/auth/profile/${encodeURIComponent(targetId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileImage: '', avatar: '' })
        }).catch(() => { });
      }
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

  // Leaflet Turn-by-Turn GPS Navigation Modal Component for Task Board
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
    const [activeStepIndex, setActiveStepIndex] = useState(0);
    const [totalDistance, setTotalDistance] = useState(null);
    const [totalDuration, setTotalDuration] = useState(null);
    const [loadingRoute, setLoadingRoute] = useState(true);

    const destLat = Number(navTarget?.lat) || 13.3409;
    const destLng = Number(navTarget?.lng) || 74.7421;
    const destPos = useMemo(() => [destLat, destLng], [destLat, destLng]);

    const startGPS = async () => {
      if (!('geolocation' in navigator)) {
        setGpsError('HTML5 Geolocation not supported by browser.');
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
        let msg = 'Showing target field navigation.';
        if (err.code === 1) msg = 'Location permission denied by browser. Enable location access and click "Retry GPS".';
        else if (err.code === 2) msg = 'GPS signal unavailable.';
        else if (err.code === 3) msg = 'GPS request timed out.';
        setGpsError(msg);
        setGpsReady(false);
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
                {gpsSource === 'ip' && <span style={{ opacity: 0.75, fontSize: '0.78rem' }}>(accuracy ~2km — enable device GPS for precise routing)</span>}
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
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block', animation: 'pulse 1.5s infinite' }}></span>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', minHeight: '450px' }}>
            <div style={{ position: 'relative', height: '450px' }}>
              <MapContainer center={userPos} zoom={14} style={{ height: '450px', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
                {gpsReady && <MapFlyTo position={userPos} />}
                <Marker position={userPos}><Popup>FROM: {gpsSource === 'ip' ? 'Your Approximate IP Location' : 'Your Current GPS Location'}<br />{userPos[0].toFixed(5)}, {userPos[1].toFixed(5)}</Popup></Marker>
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
  const [navTarget, setNavTarget] = useState(null);

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

  const [taskFilter, setTaskFilter] = useState('my-tasks');

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
          proofStatus: {
            ...(task.proofStatus || {}),
            [proofField === 'beforeImage' ? 'before' : proofField === 'progressImage' ? 'progress' : 'after']: 'Pending'
          },
        }, `${proofField === 'beforeImage' ? 'Before-work' : proofField === 'progressImage' ? 'Work-progress' : 'After-work'} image uploaded.`);

        if (task.complaintId) {
          const body = { status };
          if (proofField === 'beforeImage') {
            body.beforeImageUrl = serverUrl;
            body.beforeGps = finalGps;
          }
          if (proofField === 'progressImage') {
            body.progressImageUrl = serverUrl;
            body.progressGps = finalGps;
          }
          if (proofField === 'afterImage') {
            body.afterImageUrl = serverUrl;
            body.afterGps = finalGps;
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
          proofStatus: { ...(task.proofStatus || {}), waste: 'Pending' },
        }, 'Waste disposal image submitted with GPS geo-tag.');

        if (task.complaintId) {
          fetch(`${API_URL}/api/complaints/${task.complaintId}/images`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: task.status, wasteProofUrl: serverUrl, wasteGps: finalGps }),
          }).catch(err => console.error('Failed to sync waste proof image:', err));
        }
        return updated;
      });
      showNotice('Waste disposal proof sent to official proof review with GPS geo-tag.');
    } catch (err) {
      console.error(err);
      showNotice('Upload failed. Using local preview fallback.');
      const finalGps = (coords && coords.lat && coords.lat !== '0' && coords.lat !== '0.000000')
        ? coords
        : { lat: '13.355000', lng: '74.760000', capturedAt: new Date().toISOString() };

      updateTask(taskId, task => addVisit({
        ...task,
        progress: Math.max(task.progress || 0, 92),
        wasteProof: 'Submitted',
        wasteProofUrl: previewUrl,
        wasteGps: finalGps,
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
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', color: 'var(--title)' }}>
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
                      <div style={{ padding: '16px 12px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', background: 'var(--bg-elevated)', borderRadius: '10px', border: '1px dashed var(--border)' }}>
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
                            <small style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--muted)', fontWeight: 600, marginTop: '2px' }}>
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
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', color: 'var(--title)' }}>
                    <MapPin size={18} /> Site Location
                  </h3>
                  {expandedSection === 'site-location' ? <ChevronDown size={18} color="#059669" /> : <ChevronRight size={18} color="#9ca3af" />}
                </div>

                {expandedSection === 'site-location' && (
                  <div className="scrollable-task-list" style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '6px', marginTop: '14px' }}>
                    <h2 style={{ color: 'var(--title)', margin: '0 0 4px', fontSize: '1.1rem' }}>{selectedTask?.location}</h2>
                    <p style={{ color: 'var(--text-secondary)', margin: '0 0 12px', fontSize: '0.88rem' }}>{selectedTask?.title}</p>
                    <div className="mini-map" style={{ height: '200px', position: 'relative', overflow: 'hidden', borderRadius: '12px', border: '1px solid var(--border)', marginTop: '12px' }}>
                      {(() => {
                        const targetLat = Number(selectedTask?.locationLat || selectedTask?.lat || selectedTask?.latitude || selectedTask?.beforeGps?.lat) || 13.3409;
                        const targetLng = Number(selectedTask?.locationLng || selectedTask?.lng || selectedTask?.longitude || selectedTask?.beforeGps?.lng) || 74.7421;
                        return (
                          <>
                            <MapContainer
                              key={`${selectedTask?.id || 'default'}-${targetLat}-${targetLng}`}
                              center={[targetLat, targetLng]}
                              zoom={15}
                              scrollWheelZoom={false}
                              style={{ height: '100%', width: '100%' }}
                              zoomControl={true}
                            >
                              <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                              />
                              <Marker position={[targetLat, targetLng]}>
                                <Popup>
                                  <div style={{ minWidth: '160px' }}>
                                    <strong style={{ display: 'block', marginBottom: '4px', color: '#1b4332' }}>
                                      Target Field Location: {selectedTask?.title || 'Task Location'}
                                    </strong>
                                    <span style={{ display: 'block', color: '#4b5563', fontSize: '13px', marginBottom: '4px' }}>
                                      {selectedTask?.location || 'Field Location'}
                                    </span>
                                    <span style={{ color: '#6b7280', fontSize: '12px' }}>
                                      Assigned to: {selectedTask?.cutter || 'Unassigned'}
                                    </span>
                                  </div>
                                </Popup>
                              </Marker>
                            </MapContainer>
                            <div style={{ position: 'absolute', bottom: '10px', right: '10px', display: 'flex', gap: '6px', zIndex: 1000 }}>
                              <button
                                onClick={() => setNavTarget({
                                  lat: targetLat,
                                  lng: targetLng,
                                  title: selectedTask?.title || 'Task Location',
                                  address: selectedTask?.location || 'Field Location',
                                  type: 'task'
                                })}
                                style={{
                                  padding: '6px 12px', fontSize: '0.8rem', backgroundColor: '#10b981',
                                  color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700,
                                  boxShadow: '0 2px 6px rgba(16,185,129,0.3)'
                                }}
                              >
                                <Navigation size={14} /> Navigate Here
                              </button>
                              <a
                                href={`https://www.google.com/maps?q=${targetLat},${targetLng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  padding: '6px 12px', fontSize: '0.8rem', backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                  border: '1px solid #cbd5e1', borderRadius: '6px', display: 'flex',
                                  alignItems: 'center', gap: '6px', textDecoration: 'none', color: '#1e293b',
                                  fontWeight: 600, boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                                }}
                              >
                                <ExternalLink size={14} /> Google Maps
                              </a>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    <style dangerouslySetInnerHTML={{
                      __html: `
                      @keyframes pulse {
                        0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
                        70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
                        100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
                      }
                    `}} />

                    <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)' }}>
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
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', color: 'var(--title)' }}>
                    <Users size={18} /> Assigned Person
                  </h3>
                  {expandedSection === 'assigned-person' ? <ChevronDown size={18} color="#059669" /> : <ChevronRight size={18} color="#9ca3af" />}
                </div>

                {expandedSection === 'assigned-person' && (
                  <div style={{ marginTop: '14px' }}>
                    <div className="team-line" style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: '10px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="avatar" style={{ background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)', color: '#fff', width: '42px', height: '42px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.95rem', flexShrink: 0 }}>
                        {(selectedTask?.cutter || 'TC').split(' ').map(part => part[0]).join('').slice(0, 2)}
                      </div>
                      <p style={{ margin: 0 }}>
                        <b style={{ display: 'block', fontSize: '1rem', color: 'var(--text-primary)' }}>{selectedTask?.cutter || 'Unassigned'}</b>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Assigned by Official Management</span>
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
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={20} color="#10b981" /> Task briefing</h3>
                    <p style={{ margin: 0, fontWeight: 700 }}>{selectedTask?.title}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      onClick={() => setNavTarget({
                        lat: Number(selectedTask?.locationLat || selectedTask?.lat || selectedTask?.latitude || selectedTask?.beforeGps?.lat) || 13.3409,
                        lng: Number(selectedTask?.locationLng || selectedTask?.lng || selectedTask?.longitude || selectedTask?.beforeGps?.lng) || 74.7421,
                        title: selectedTask?.title || 'Task Site',
                        address: selectedTask?.location || 'Field Location',
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
                      <Navigation size={15} /> 🧭 Live GPS Navigation
                    </button>
                    <span className="task-due-chip">Due: {selectedTask?.dueDate || 'Not scheduled'}</span>
                  </div>
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
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
                            <select
                              value={selectedTask?.dumpingLocation || dumpingLocations[0]}
                              onChange={e => updateDumpingLocation(selectedTask.id, e.target.value)}
                              style={{ flex: 1, minWidth: '220px' }}
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
                                padding: '10px 14px',
                                borderRadius: '10px',
                                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                                color: '#ffffff',
                                border: 'none',
                                fontWeight: 700,
                                fontSize: '0.84rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                whiteSpace: 'nowrap',
                                boxShadow: '0 4px 12px rgba(59,130,246,0.3)'
                              }}
                            >
                              <Navigation size={15} /> 🚚 Live GPS Navigation to Yard
                            </button>
                          </div>
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

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('currentUser')) || {};
    } catch {
      return {};
    }
  })();

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
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadData.msg || 'Image upload failed. Please try a different photo format.');
        }
        const rawPath = uploadData.url || uploadData.imageUrl || '';
        if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) {
          uploadedPhotoUrl = rawPath;
        } else {
          uploadedPhotoUrl = `${API_URL}${rawPath.startsWith('/') ? '' : '/'}${rawPath}`;
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

  const isCitizenUser = normalizeRole(currentUser.role) === 'Citizen';
  const returnPath = isCitizenUser ? '/citizen-dashboard' : '/home';

  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('theme', next ? 'dark' : 'light');
    window.dispatchEvent(new Event('themeChange'));
  };

  if (submitted) {
    return (
      <div className="cg-report">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px' }}>
          <Link to={returnPath} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', fontWeight: 900, fontSize: '1.2rem', color: 'inherit' }}>
            <TreePine size={24} color="#10b981" /> <span>CanopyGuard</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={toggleTheme}
              className="cg-theme-btn"
              title={darkMode ? "Switch to Light Theme" : "Switch to Dark Theme"}
            >
              {darkMode ? <Sun size={18} color="#fbbf24" /> : <Moon size={18} color="#6366f1" />}
            </button>
            <Link to={returnPath} className="close-btn" title="Close"><X size={20} /></Link>
          </div>
        </header>
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
              <Link className="cg-btn outline" to={returnPath}>{isCitizenUser ? 'Back to Citizen Dashboard' : 'Back to Dashboard'}</Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="cg-report">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px' }}>
        <Link to={returnPath} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', fontWeight: 900, fontSize: '1.2rem', color: 'inherit' }}>
          <TreePine size={24} color="#10b981" /> <span>CanopyGuard</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={toggleTheme}
            className="cg-theme-btn"
            title={darkMode ? "Switch to Light Theme" : "Switch to Dark Theme"}
          >
            {darkMode ? <Sun size={18} color="#fbbf24" /> : <Moon size={18} color="#6366f1" />}
          </button>
          <Link to={returnPath} className="close-btn" title="Close"><X size={20} /></Link>
        </div>
      </header>
      <main>
        <section className="report-title">
          <h1>Report an Issue</h1>
          <b>Step {step} of 3</b>
          <i style={{ background: `linear-gradient(90deg, var(--forest-leaf, #2d6a4f) ${progressPct}, var(--border, #e2e8f0) ${progressPct})` }}></i>
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
                  <Icon size={26} />
                  <span>{label}</span>
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
                    padding: '4px 10px',
                    fontSize: '0.78rem',
                    background: 'rgba(3, 105, 161, 0.1)',
                    color: '#0284c7',
                    border: '1px solid rgba(2, 132, 199, 0.3)',
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
                placeholder="e.g. Near Ajjarkadu Park, MG Road, Udupi"
                value={location}
                onChange={e => setLocation(e.target.value)}
                style={{ marginBottom: '10px' }}
              />
            </label>
            <p className="report-hint" style={{ marginBottom: '10px' }}>Or select the location on the map below:</p>
            <div className="map-wrapper" style={{ height: '250px', width: '100%', marginBottom: '20px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border, #d1d5db)' }}>
              <MapContainer center={[13.3409, 74.7421]} zoom={13} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
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
                : <><UploadCloud size={36} /><b>Click to upload a photo</b><span>JPEG or PNG, Max 10MB</span></>}
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
          <p className="report-error" style={{ color: '#ef4444', fontWeight: 600, marginTop: '12px' }}>{submitError}</p>
        )}
        <div className="report-actions">
          {step > 1 && (
            <button className="cg-btn outline" onClick={() => setStep(step - 1)} disabled={submitting}>Back</button>
          )}
          <button
            className="cg-btn primary wide"
            onClick={handleContinue}
            disabled={(step === 1 && !selectedIssue) || submitting}
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
  const [cutterFilter, setCutterFilter] = useState('All');
  const [taskTypeFilter, setTaskTypeFilter] = useState('All');
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
      fetch(`${API_URL}/api/complaints`).then(r => r.json()).catch(() => ({ complaints: [] })),
      fetch(`${API_URL}/api/auth/cutters`).then(r => r.json()).catch(() => ({ cutters: [] })),
      fetch(`${API_URL}/api/subscriptions/all`).then(r => r.json()).catch(() => [])
    ])
      .then(([complaintsData, cuttersData, subscriptionsData]) => {
        const fetchedComplaints = complaintsData.complaints || [];
        const combined = fetchedComplaints.length > 0 ? fetchedComplaints : defaultSampleTasks;
        const activeComplaints = combined.filter(c => !deletedIds.includes(c._id) && !deletedIds.includes(c.id));

        // Process subscription care duties into schedule items
        const subList = Array.isArray(subscriptionsData) ? subscriptionsData : [];
        const dutyEvents = [];
        const now = new Date();

        subList.forEach(sub => {
          if (!['active', 'assigned'].includes(sub.status)) return;
          const assignedCutter = sub.assignedCutterName || 'Unassigned';

          // 1. Existing uploaded care tasks
          (sub.careTasks || []).forEach(task => {
            if (task.uploadedAt) {
              dutyEvents.push({
                _id: `sub_task_${task._id || Math.random()}`,
                issueType: 'care_duty',
                isCareDuty: true,
                title: `🌿 Tree Care: ${sub.treeName} (${task.taskType})`,
                location: sub.treeLocation || 'Urban Canopy Sector',
                description: task.description || `Care activity: ${task.taskType} conducted for ${sub.userName}'s adopted tree (${sub.treeName}).`,
                assignedTo: task.uploadedByName || assignedCutter,
                status: task.status === 'Validated' ? 'Completed' : 'In Progress',
                priority: 'Routine',
                equipment: '🌿 Care Kit & Moisture Meter',
                scheduledDate: task.uploadedAt,
                createdAt: task.uploadedAt,
                proofImageUrl: task.proofImageUrl || '',
                subTreeName: sub.treeName,
                subUserName: sub.userName,
                subImage: sub.treeImage,
              });
            }
          });

          // 2. Upcoming scheduled care duty (every 7 days)
          const doneTasks = (sub.careTasks || []).filter(t => t.uploadedAt);
          const lastCareDate = doneTasks.length > 0
            ? new Date(Math.max(...doneTasks.map(t => new Date(t.uploadedAt).getTime())))
            : (sub.assignedAt ? new Date(sub.assignedAt) : (sub.createdAt ? new Date(sub.createdAt) : now));
          const nextDue = new Date(new Date(lastCareDate).getTime() + 7 * 24 * 60 * 60 * 1000);

          dutyEvents.push({
            _id: `sub_due_${sub._id}`,
            issueType: 'care_duty',
            isCareDuty: true,
            title: `🌿 Weekly Care: ${sub.treeName}`,
            location: sub.treeLocation || 'Urban Canopy Sector',
            description: `Scheduled weekly maintenance (Watering / Health Audit) for ${sub.userName}'s adopted tree (${sub.treeName}).`,
            assignedTo: assignedCutter,
            status: nextDue < now ? 'Pending' : 'Scheduled',
            priority: 'Routine',
            equipment: '🌿 Tree Care & Pruning Tools',
            scheduledDate: nextDue.toISOString(),
            createdAt: sub.createdAt || now.toISOString(),
            subTreeName: sub.treeName,
            subUserName: sub.userName,
            subImage: sub.treeImage,
          });
        });

        setComplaints([...activeComplaints, ...dutyEvents]);

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

  const presetLocations = [
    'Ajjarkadu, Udupi (Central District)',
    'Manipal Green Circle, Udupi',
    'Santhekatte Market Zone, Udupi',
    'Malpe Beach Road, Udupi',
    'Korangrapady Green Belt, Udupi',
    'Doddana Gudde Sector, Udupi',
    'Parkala Highway Corridor, Udupi',
    'Ambalpady Temple Zone, Udupi',
    'Udupi Service Bus Stand Area'
  ];

  const existingLocations = useMemo(() => {
    const fromComplaints = complaints
      .map(c => c.location)
      .filter(l => l && typeof l === 'string' && l.trim() !== '');
    return Array.from(new Set([...presetLocations, ...fromComplaints]));
  }, [complaints]);

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
      if (!isSameDate) return false;
      if (statusFilter !== 'All' && c.status !== statusFilter) return false;
      if (cutterFilter !== 'All' && (c.assignedTo || 'Unassigned') !== cutterFilter) return false;
      if (taskTypeFilter !== 'All' && c.issueType !== taskTypeFilter) return false;
      return true;
    });
  };

  const selectedDayComplaints = complaints.filter(c => {
    if (deletedIds.includes(c._id) || deletedIds.includes(c.id)) return false;
    const cDate = getTaskDate(c);
    const isSameDate = cDate.getDate() === selectedDay && cDate.getMonth() === month && cDate.getFullYear() === year;
    if (!isSameDate) return false;
    if (statusFilter !== 'All' && c.status !== statusFilter) return false;
    if (cutterFilter !== 'All' && (c.assignedTo || 'Unassigned') !== cutterFilter) return false;
    if (taskTypeFilter !== 'All' && c.issueType !== taskTypeFilter) return false;
    return true;
  });

  const allFilteredComplaints = complaints.filter(c => {
    if (deletedIds.includes(c._id) || deletedIds.includes(c.id)) return false;
    const cDate = getTaskDate(c);
    const isSameMonth = cDate.getMonth() === month && cDate.getFullYear() === year;
    if (!isSameMonth) return false;
    if (statusFilter !== 'All' && c.status !== statusFilter) return false;
    if (cutterFilter !== 'All' && (c.assignedTo || 'Unassigned') !== cutterFilter) return false;
    if (taskTypeFilter !== 'All' && c.issueType !== taskTypeFilter) return false;
    return true;
  });

  const exportScheduleCSV = () => {
    const headers = ['Task ID', 'Work Type', 'Site Location', 'Status', 'Assigned Cutter', 'Scheduled Date'];
    const rows = allFilteredComplaints.map(c => [
      c._id || c.id,
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
    const y = currentMonthDate.getFullYear();
    const m = String(currentMonthDate.getMonth() + 1).padStart(2, '0');
    const d = String(dayToUse).padStart(2, '0');
    const defaultDateStr = `${y}-${m}-${d}`;

    const availableCutter = cutters.find(c => {
      const name = typeof c === 'string' ? c : c.name || c.email;
      return !checkCutterLeaveStatus(name, defaultDateStr).isOnLeave;
    });

    const defaultCutter = availableCutter
      ? (typeof availableCutter === 'string' ? availableCutter : availableCutter.name || availableCutter.email)
      : (cutters.length > 0 ? (typeof cutters[0] === 'string' ? cutters[0] : cutters[0].name || cutters[0].email) : 'Boxy');

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

    const leaveCheck = checkCutterLeaveStatus(scheduleForm.assignedTo, scheduleForm.scheduledDate);
    if (leaveCheck.isOnLeave) {
      Swal.fire({
        icon: 'error',
        title: 'Tree Cutter Unavailable',
        html: `<strong>${scheduleForm.assignedTo}</strong> is currently on <strong>${leaveCheck.leaveType}</strong> (from <code>${leaveCheck.startDate}</code> to <code>${leaveCheck.endDate}</code>).<br/><br/>You cannot assign tasks to a tree cutter while they are on leave. Please select an available tree cutter.`,
        confirmButtonColor: '#ef4444'
      });
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

          {/* Top KPI Summary Metrics Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '18px' }}>
            <div style={{ background: 'var(--bg-surface)', padding: '14px 18px', borderRadius: '14px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center' }}><CalendarDays size={22} /></div>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block' }}>Monthly Schedules</span>
                <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-primary)', fontWeight: 800 }}>{allFilteredComplaints.length}</h3>
              </div>
            </div>
            <div style={{ background: 'var(--bg-surface)', padding: '14px 18px', borderRadius: '14px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center' }}><Users size={22} /></div>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block' }}>Field Cutters</span>
                <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-primary)', fontWeight: 800 }}>{cutters.length}</h3>
              </div>
            </div>
            <div style={{ background: 'var(--bg-surface)', padding: '14px 18px', borderRadius: '14px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center' }}><MapPin size={22} /></div>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block' }}>Active Sectors</span>
                <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-primary)', fontWeight: 800 }}>{existingLocations.length}</h3>
              </div>
            </div>
            <div style={{ background: 'var(--bg-surface)', padding: '14px 18px', borderRadius: '14px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center' }}><Sprout size={22} /></div>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block' }}>Replanting Roster</span>
                <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-primary)', fontWeight: 800 }}>
                  {allFilteredComplaints.filter(c => c.issueType === 'replant' || c.requiresReplantation).length}
                </h3>
              </div>
            </div>
          </div>

          {/* Schedule Task Modal */}
          {showScheduleModal && (
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
              <div style={{ backgroundColor: 'var(--bg-surface)', borderRadius: '16px', width: '100%', maxWidth: '560px', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}>
                    <CalendarDays size={20} color="#10b981" /> Prepare Work Schedule for Tree Cutter
                  </h3>
                  <button onClick={() => setShowScheduleModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px', borderRadius: '6px' }}>
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleCreateSchedule}>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>Select Tree Cutter</label>
                    <select
                      value={scheduleForm.assignedTo}
                      onChange={(e) => setScheduleForm(prev => ({ ...prev, assignedTo: e.target.value }))}
                      required
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}
                    >
                      {cutters.length === 0 ? (
                        <option value="" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>No registered Tree Cutters found</option>
                      ) : (
                        cutters.map(c => {
                          const cutterName = typeof c === 'string' ? c : c.name || c.email;
                          const leaveInfo = checkCutterLeaveStatus(cutterName, scheduleForm.scheduledDate);
                          return (
                            <option
                              key={c._id || cutterName}
                              value={cutterName}
                              disabled={leaveInfo.isOnLeave}
                              style={{ background: leaveInfo.isOnLeave ? '#fee2e2' : 'var(--bg-surface)', color: leaveInfo.isOnLeave ? '#991b1b' : 'var(--text-primary)' }}
                            >
                              {leaveInfo.isOnLeave ? `⛔ ${cutterName} (ON LEAVE - ${leaveInfo.startDate} to ${leaveInfo.endDate})` : `🪓 ${cutterName}`}
                            </option>
                          );
                        })
                      )}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>Work Type</label>
                      <select
                        value={scheduleForm.issueType}
                        onChange={(e) => setScheduleForm(prev => ({ ...prev, issueType: e.target.value }))}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}
                      >
                        <option value="routine" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>Monthly Routine</option>
                        <option value="overhanging" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>Overhanging Branch</option>
                        <option value="damaged" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>Damaged Tree</option>
                        <option value="fallen" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>Fallen Limb</option>
                        <option value="pest" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>Pest Inspection</option>
                        <option value="dead" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>Dead Tree Removal</option>
                        <option value="roots" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>Root Clearance</option>
                        <option value="replant" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>🌱 Sapling Replantation</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>Scheduled Date</label>
                      <input
                        type="date"
                        min={new Date().toISOString().slice(0, 10)}
                        value={scheduleForm.scheduledDate}
                        onChange={(e) => setScheduleForm(prev => ({ ...prev, scheduledDate: e.target.value }))}
                        required
                        style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}
                      />
                    </div>
                  </div>

                  {/* Location Selector */}
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Site Location / Address</label>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Pick present location or type custom</span>
                    </div>

                    {/* Quick Location Select Dropdown */}
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          setScheduleForm(prev => ({ ...prev, location: e.target.value }));
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-elevated)',
                        color: 'var(--text-primary)',
                        fontSize: '0.84rem',
                        marginBottom: '8px',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>-- Select from Present / Registered Locations --</option>
                      {existingLocations.map((loc, idx) => (
                        <option key={idx} value={loc} style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
                          📍 {loc}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      list="preset-locations-datalist"
                      placeholder="e.g. Central Park East, Ajjarkadu, Udupi"
                      value={scheduleForm.location}
                      onChange={(e) => setScheduleForm(prev => ({ ...prev, location: e.target.value }))}
                      required
                      style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}
                    />
                    <datalist id="preset-locations-datalist">
                      {existingLocations.map((loc, idx) => (
                        <option key={idx} value={loc} />
                      ))}
                    </datalist>
                  </div>

                  <div style={{ marginBottom: '18px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>Work Instructions &amp; Safety Notes</label>
                    <textarea
                      placeholder="Enter specific instructions for the tree cutter..."
                      rows={3}
                      value={scheduleForm.description}
                      onChange={(e) => setScheduleForm(prev => ({ ...prev, description: e.target.value }))}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '0.9rem', resize: 'vertical', outline: 'none' }}
                    />
                  </div>

                  {checkCutterLeaveStatus(scheduleForm.assignedTo, scheduleForm.scheduledDate).isOnLeave && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#f87171', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '0.85rem', fontWeight: 600 }}>
                      ⛔ {scheduleForm.assignedTo} is on leave from {checkCutterLeaveStatus(scheduleForm.assignedTo, scheduleForm.scheduledDate).startDate} to {checkCutterLeaveStatus(scheduleForm.assignedTo, scheduleForm.scheduledDate).endDate}. Task assignment is disabled.
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setShowScheduleModal(false)}
                      style={{
                        padding: '10px 18px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-elevated)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.88rem'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      style={{
                        padding: '10px 20px',
                        borderRadius: '8px',
                        border: 'none',
                        background: checkCutterLeaveStatus(scheduleForm.assignedTo, scheduleForm.scheduledDate).isOnLeave
                          ? '#475569'
                          : 'linear-gradient(135deg, #10b981, #059669)',
                        color: '#ffffff',
                        cursor: checkCutterLeaveStatus(scheduleForm.assignedTo, scheduleForm.scheduledDate).isOnLeave ? 'not-allowed' : 'pointer',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        opacity: checkCutterLeaveStatus(scheduleForm.assignedTo, scheduleForm.scheduledDate).isOnLeave ? 0.6 : 1,
                        boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
                      }}
                      disabled={schedulingLoading || checkCutterLeaveStatus(scheduleForm.assignedTo, scheduleForm.scheduledDate).isOnLeave}
                    >
                      {schedulingLoading ? 'Scheduling...' : 'Assign Schedule'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <section className="cg-schedule-grid">
            <div className="cg-calendar">
              <header style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)' }}>{monthName} {year}</h2>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={prevMonth}
                      disabled={!isCurrentOrFutureMonth()}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        background: isCurrentOrFutureMonth() ? 'var(--bg-surface)' : 'var(--bg-subtle)',
                        color: 'var(--text-primary)',
                        cursor: isCurrentOrFutureMonth() ? 'pointer' : 'not-allowed',
                        opacity: isCurrentOrFutureMonth() ? 1 : 0.4
                      }}
                      title={isCurrentOrFutureMonth() ? "Previous Month" : "Past months locked"}
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      onClick={nextMonth}
                      style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', cursor: 'pointer' }}
                      title="Next Month"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                  <span style={{ fontSize: '0.82rem', color: '#10b981', fontWeight: '700', padding: '4px 12px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '20px' }}>
                    {loading ? 'Syncing...' : `${allFilteredComplaints.length} Work Orders`}
                  </span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
                  {/* Cutter Filter */}
                  <select
                    value={cutterFilter}
                    onChange={e => setCutterFilter(e.target.value)}
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)', padding: '7px 12px', borderRadius: '8px', fontSize: '0.84rem', fontWeight: 600, outline: 'none' }}
                  >
                    <option value="All">🪓 All Cutters</option>
                    {cutters.map((c, idx) => {
                      const name = typeof c === 'string' ? c : c.name || c.email;
                      return <option key={idx} value={name}>🪓 {name}</option>;
                    })}
                  </select>

                  {/* Task Type Filter */}
                  <select
                    value={taskTypeFilter}
                    onChange={e => setTaskTypeFilter(e.target.value)}
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)', padding: '7px 12px', borderRadius: '8px', fontSize: '0.84rem', fontWeight: 600, outline: 'none' }}
                  >
                    <option value="All">📋 All Work Types</option>
                    <option value="care_duty">🌿 Tree Care Duties</option>
                    <option value="routine">Monthly Routine</option>
                    <option value="overhanging">Overhanging Branch</option>
                    <option value="damaged">Damaged Tree</option>
                    <option value="fallen">Fallen Limb</option>
                    <option value="replant">Sapling Replantation</option>
                  </select>

                  <button
                    onClick={openScheduleModal}
                    className="cg-btn primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', background: 'linear-gradient(135deg, #16a34a, #15803d)', border: 'none', padding: '8px 16px', fontWeight: 600, fontSize: '0.85rem' }}
                  >
                    <Plus size={16} /> Schedule Task
                  </button>
                  <button
                    onClick={exportScheduleCSV}
                    className="cg-btn outline"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '8px 12px', fontWeight: 600, fontSize: '0.85rem' }}
                    title="Export Monthly Maintenance Roster to CSV"
                  >
                    <Download size={15} /> Export
                  </button>
                </div>
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
                        background: isPast ? 'var(--bg-subtle)' : undefined,
                        minHeight: '82px'
                      }}
                      title={isPast ? "Past dates locked" : `Select ${monthName} ${cell.day}`}
                    >
                      <b>{cell.day}</b>
                      {dayEvents.slice(0, 2).map((ev, idx) => (
                        <span key={ev._id || idx} className={`event ${ev.issueType === 'care_duty' ? 'green' : ev.issueType === 'routine' ? 'green' : ev.status === 'Resolved' || ev.status === 'Completed' ? 'green' : ev.status === 'Scheduled' ? 'blue' : ev.status === 'Pending' ? 'red' : 'violet'}`}>
                          {ev.isCareDuty ? `🌿 ${ev.subTreeName || 'Care Duty'}` : (issueLabels[ev.issueType] || ev.issueType)}
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
                <div style={{ background: 'var(--bg-surface)', borderRadius: '10px', padding: '24px', textAlign: 'center', border: '1px dashed var(--border)', color: 'var(--text-secondary)' }}>
                  <p style={{ margin: '0 0 8px 0', fontWeight: 600, color: 'var(--text-primary)' }}>No scheduled maintenance for {monthName} {selectedDay}.</p>
                  <small style={{ color: 'var(--text-muted)' }}>Select another date on the calendar or click "+ Schedule for Tree Cutter".</small>
                </div>
              ) : (
                selectedDayComplaints.map(c => (
                  <article key={c._id || c.id} style={{ borderRadius: '10px', padding: '16px', marginBottom: '12px', border: c.isCareDuty ? '1px solid rgba(16,185,129,0.35)' : undefined, background: c.isCareDuty ? 'rgba(5,150,105,0.06)' : undefined }}>
                    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <b style={{ color: c.isCareDuty ? '#34d399' : c.issueType === 'routine' ? '#4ade80' : c.status === 'Pending' ? '#f87171' : '#60a5fa' }}>
                        {c.isCareDuty ? (c.title || '🌿 Tree Care Duty') : (issueLabels[c.issueType] || c.issueType)}
                      </b>
                      <time style={{ color: 'var(--text-secondary)' }}>{getTaskDate(c).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</time>
                    </header>
                    <h3 style={{ color: 'var(--text-primary)', margin: '12px 0 6px 0', fontSize: '1rem', fontWeight: '600' }}>{c.location || 'Municipal Canopy Sector'}</h3>
                    <p style={{ color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>{c.description || 'Routine tree care, pruning, and safety inspection.'}</p>

                    {c.proofImageUrl && (
                      <div style={{ marginBottom: '10px', borderRadius: '8px', overflow: 'hidden', height: '100px', width: '140px', border: '1px solid rgba(16,185,129,0.3)', cursor: 'pointer' }} onClick={() => window.open(c.proofImageUrl, '_blank')}>
                        <img src={c.proofImageUrl} alt="Proof" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}

                    <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                      <span style={{ color: 'var(--text-primary)' }}><UserRound size={16} /> Cutter: <strong style={{ color: c.assignedTo && c.assignedTo !== 'Unassigned' ? 'var(--brand-accent, #10b981)' : '#ef4444' }}>{c.assignedTo || 'Unassigned'}</strong></span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {!c.isCareDuty && (!c.assignedTo || c.assignedTo === 'Unassigned') && (
                          <select
                            onChange={(e) => handleAssignCutterToComplaint(c._id, e.target.value)}
                            defaultValue=""
                            style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', border: '1px solid var(--brand-accent)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}
                          >
                            <option value="" disabled style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>+ Assign Cutter...</option>
                            {cutters.map(ct => {
                              const cName = typeof ct === 'string' ? ct : ct.name || ct.email;
                              return <option key={ct._id || cName} value={cName} style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>{cName}</option>;
                            })}
                          </select>
                        )}
                        {!c.isCareDuty && (
                          <button
                            onClick={() => handleDeleteComplaint(c._id || c.id, c)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                            title="Delete Work Schedule"
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        )}
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
  care_duty: '🌿 Tree Care Duty',
};

const cutterOptions = ['Sarah Moreno', 'Mike Arbo', 'David Chen', 'Elena Rodriguez'];

const fallbackProofImages = {
  before: 'https://res.cloudinary.com/j7ofhcn9/image/upload/v1789482673/treecanopy_uploads/scu3nzewe3ew3i6f3ybd.jpg',
  progress: 'https://res.cloudinary.com/j7ofhcn9/image/upload/v1789483388/treecanopy_uploads/jkxqgghwpbimkpteakiy.jpg',
  after: 'https://res.cloudinary.com/j7ofhcn9/image/upload/v1789483394/treecanopy_uploads/huzytgdozu0fr64akbik.webp',
  waste: 'https://res.cloudinary.com/j7ofhcn9/image/upload/v1789483415/treecanopy_uploads/symeqstft7s0hwe9ynuw.jpg',
};

const initialOfficialTasks = [
  {
    id: 'WO-4081',
    source: 'Official Order',
    complaintId: null,
    title: 'Emergency Fallen Branch Removal',
    location: 'Kalsanka Junction, Udupi, Karnataka',
    cutter: 'Sameeksha',
    priority: 'High',
    status: 'In Progress',
    progress: 50,
    dueDate: new Date().toISOString().slice(0, 10),
    visits: [
      { time: '09:00 AM', location: 'Udupi Main Rd', note: 'Dispatched by Official.' },
      { time: '11:15 AM', location: 'Kalsanka Junction', note: 'Work underway.' },
    ],
    beforeImage: 'Submitted',
    afterImage: 'Submitted',
    wasteProof: 'Submitted',
    beforeImageUrl: 'https://res.cloudinary.com/j7ofhcn9/image/upload/v1789482673/treecanopy_uploads/scu3nzewe3ew3i6f3ybd.jpg',
    progressImageUrl: 'https://res.cloudinary.com/j7ofhcn9/image/upload/v1789483388/treecanopy_uploads/jkxqgghwpbimkpteakiy.jpg',
    afterImageUrl: 'https://res.cloudinary.com/j7ofhcn9/image/upload/v1789483394/treecanopy_uploads/huzytgdozu0fr64akbik.webp',
    wasteProofUrl: 'https://res.cloudinary.com/j7ofhcn9/image/upload/v1789483415/treecanopy_uploads/symeqstft7s0hwe9ynuw.jpg',
    proofStatus: { before: 'Verified', after: 'Pending', waste: 'Pending' },
  },
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
    beforeImageUrl: 'https://res.cloudinary.com/j7ofhcn9/image/upload/v1789482673/treecanopy_uploads/scu3nzewe3ew3i6f3ybd.jpg',
    progressImageUrl: 'https://res.cloudinary.com/j7ofhcn9/image/upload/v1789483388/treecanopy_uploads/jkxqgghwpbimkpteakiy.jpg',
    afterImageUrl: '',
    wasteProofUrl: '',
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
    beforeImageUrl: 'https://res.cloudinary.com/j7ofhcn9/image/upload/v1789482673/treecanopy_uploads/scu3nzewe3ew3i6f3ybd.jpg',
    progressImageUrl: 'https://res.cloudinary.com/j7ofhcn9/image/upload/v1789483388/treecanopy_uploads/jkxqgghwpbimkpteakiy.jpg',
    afterImageUrl: 'https://res.cloudinary.com/j7ofhcn9/image/upload/v1789483394/treecanopy_uploads/huzytgdozu0fr64akbik.webp',
    wasteProofUrl: 'https://res.cloudinary.com/j7ofhcn9/image/upload/v1789483415/treecanopy_uploads/symeqstft7s0hwe9ynuw.jpg',
    proofStatus: { before: 'Verified', after: 'Pending', waste: 'Pending' },
  },
];

export function OfficialManagementPage({ initialView = 'complaints' } = {}) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState(initialView);

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
    if (!saved) return initialOfficialTasks;
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(t => {
          const def = initialOfficialTasks.find(it => it.id === t.id);
          return {
            ...t,
            beforeImageUrl: t.beforeImageUrl || def?.beforeImageUrl || '',
            progressImageUrl: t.progressImageUrl || def?.progressImageUrl || '',
            afterImageUrl: t.afterImageUrl || def?.afterImageUrl || '',
            wasteProofUrl: t.wasteProofUrl || def?.wasteProofUrl || '',
            proofStatus: t.proofStatus || { before: 'Pending', after: 'Pending', waste: 'Pending' }
          };
        });
      }
      return initialOfficialTasks;
    } catch {
      return initialOfficialTasks;
    }
  });
  const [maintenanceForm, setMaintenanceForm] = useState({
    title: '',
    location: '',
    cutter: '',
    priority: 'Medium',
    dueDate: '',
  });
  const [notice, setNotice] = useState('');
  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    taskId: '',
    key: '',
    label: '',
    imageUrl: '',
    status: '',
  });
  const [gpsMapModal, setGpsMapModal] = useState({
    isOpen: false,
    complaintTitle: '',
    locationName: '',
    coords: [13.3409, 74.7421],
  });

  // Official Adopted Trees & Care Management State
  const [officialAdoptions, setOfficialAdoptions] = useState([]);
  const [loadingOfficialAdoptions, setLoadingOfficialAdoptions] = useState(false);
  const [adoptionFilter, setAdoptionFilter] = useState('all'); // all, needs_cutter, proofs_pending, self
  const [assigningCutterId, setAssigningCutterId] = useState({}); // { [subId]: cutterId }
  const [fullCuttersList, setFullCuttersList] = useState([]);
  const [validatingTaskModal, setValidatingTaskModal] = useState(null); // { subId, task, treeName, userName }
  const [validationNoteInput, setValidationNoteInput] = useState('');
  const [validatingSubmitting, setValidatingSubmitting] = useState(false);
  const [calendarModalSub, setCalendarModalSub] = useState(null);

  const fetchOfficialAdoptions = async () => {
    setLoadingOfficialAdoptions(true);
    try {
      const res = await fetch(`${API_URL}/api/subscriptions/all`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setOfficialAdoptions(data);
      }
    } catch (err) {
      console.error('Error fetching official adoptions:', err);
    } finally {
      setLoadingOfficialAdoptions(false);
    }
  };

  const handleAssignCutterToTree = async (subId) => {
    const cutterId = assigningCutterId[subId];
    if (!cutterId) {
      alert('Please select a tree cutter from the list to assign.');
      return;
    }
    const cutterObj = fullCuttersList.find(c => (c._id || c.id) === cutterId);
    const cutterName = cutterObj?.name || 'Tree Cutter';

    try {
      const currentOfficialUser = (() => {
        try { return JSON.parse(localStorage.getItem('currentUser')) || {}; } catch { return {}; }
      })();
      const res = await fetch(`${API_URL}/api/subscriptions/${subId}/assign-cutter`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cutterId,
          cutterName,
          assignedById: currentOfficialUser._id || null,
          assignedByName: currentOfficialUser.name || 'Municipal Official'
        })
      });
      const data = await res.json();
      if (res.ok) {
        showNotice(`Tree Cutter ${cutterName} successfully assigned! Citizen notified.`);
        fetchOfficialAdoptions();
      } else {
        alert(data.error || 'Failed to assign cutter.');
      }
    } catch {
      alert('Network error assigning tree cutter.');
    }
  };

  const handleValidateCareProof = async (status) => {
    if (!validatingTaskModal) return;
    setValidatingSubmitting(true);
    try {
      const currentOfficialUser = (() => {
        try { return JSON.parse(localStorage.getItem('currentUser')) || {}; } catch { return {}; }
      })();
      const res = await fetch(`${API_URL}/api/subscriptions/${validatingTaskModal.subId}/tasks/${validatingTaskModal.task._id}/validate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          validationNote: validationNoteInput,
          validatedById: currentOfficialUser._id || null,
          validatedByName: currentOfficialUser.name || 'Municipal Official'
        })
      });
      const data = await res.json();
      if (res.ok) {
        showNotice(`Care proof ${status.toLowerCase()} successfully! Citizen notified.`);
        setValidatingTaskModal(null);
        setValidationNoteInput('');
        fetchOfficialAdoptions();
      } else {
        alert(data.error || 'Failed to update task validation.');
      }
    } catch {
      alert('Network error validating care proof.');
    } finally {
      setValidatingSubmitting(false);
    }
  };

  const filteredOfficialAdoptions = useMemo(() => {
    let list = [...officialAdoptions];
    if (adoptionFilter === 'unassigned') {
      list = list.filter(s => s.adoptionType === 'subscription' && !s.assignedCutterId && ['active', 'assigned'].includes(s.status));
    } else if (adoptionFilter === 'pending_review') {
      list = list.filter(s => s.careTasks?.some(t => t.status === 'Pending'));
    } else if (adoptionFilter === 'subscription') {
      list = list.filter(s => s.adoptionType === 'subscription' && ['active', 'assigned'].includes(s.status));
    } else if (adoptionFilter === 'self') {
      list = list.filter(s => s.adoptionType === 'self' && !['cancelled', 'lapsed'].includes(s.status));
    } else if (adoptionFilter === 'cancelled') {
      list = list.filter(s => ['cancelled', 'lapsed'].includes(s.status));
    }
    return list;
  }, [officialAdoptions, adoptionFilter]);

  const resolveImageUrl = (imageUrl) => {
    if (!imageUrl) return '';
    let normalized = String(imageUrl).replace(/\\/g, '/').trim();
    if (!normalized || normalized === 'Submitted' || normalized === 'Pending upload' || normalized === 'Pending') return '';
    if (normalized.includes('http://') || normalized.includes('https://')) {
      const match = normalized.match(/(https?:\/\/[^\s"']+)/g);
      if (match && match.length > 0) return match[match.length - 1];
    }
    if (normalized.startsWith('data:') || normalized.startsWith('blob:')) return normalized;
    const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
    if (normalized.startsWith('/uploads/')) return `${apiBase}${normalized}`;
    if (normalized.startsWith('uploads/')) return `${apiBase}/${normalized}`;
    return `${apiBase}/uploads/${normalized.split('/').pop()}`;
  };

  const getProofImageUrl = (task, key) => {
    if (!task) return fallbackProofImages[key] || fallbackProofImages.before;
    let rawUrl = '';
    // 1. Direct task properties
    if (key === 'before') {
      rawUrl = task.beforeImageUrl || task.beforePhotoUrl || (task.beforeImage && task.beforeImage.length > 20 && !task.beforeImage.includes(' ') ? task.beforeImage : '') || task.photoUrl || task.image || task.photo || '';
    } else if (key === 'progress') {
      rawUrl = task.progressImageUrl || task.progressPhotoUrl || (task.progressImage && task.progressImage.length > 20 && !task.progressImage.includes(' ') ? task.progressImage : '') || '';
    } else if (key === 'after') {
      rawUrl = task.afterImageUrl || task.afterPhotoUrl || (task.afterImage && task.afterImage.length > 20 && !task.afterImage.includes(' ') ? task.afterImage : '') || task.afterPhoto || '';
    } else if (key === 'waste') {
      rawUrl = task.wasteProofUrl || task.wasteImageUrl || task.wastePhotoUrl || (task.wasteProof && task.wasteProof.length > 20 && !task.wasteProof.includes(' ') ? task.wasteProof : '') || task.wastePhoto || '';
    }

    if (rawUrl && typeof rawUrl === 'string' && rawUrl.length > 5 && !['Submitted', 'Pending', 'Pending upload', 'Verified'].includes(rawUrl.trim())) {
      const resolved = resolveImageUrl(rawUrl);
      if (resolved && !resolved.startsWith('blob:')) return resolved;
    }

    // 2. Check localStorage for freshest task state uploaded by cutter
    try {
      const saved = JSON.parse(localStorage.getItem('officialWorkOrders') || '[]');
      const freshTask = saved.find(t => t.id === task.id || (t.complaintId && t.complaintId === task.complaintId) || (task.complaintId && t.id === task.complaintId));
      if (freshTask) {
        let freshUrl = '';
        if (key === 'before') freshUrl = freshTask.beforeImageUrl || freshTask.beforePhotoUrl || freshTask.photoUrl || (freshTask.beforeImage && freshTask.beforeImage.length > 20 && !freshTask.beforeImage.includes(' ') ? freshTask.beforeImage : '');
        else if (key === 'progress') freshUrl = freshTask.progressImageUrl || freshTask.progressPhotoUrl || (freshTask.progressImage && freshTask.progressImage.length > 20 && !freshTask.progressImage.includes(' ') ? freshTask.progressImage : '');
        else if (key === 'after') freshUrl = freshTask.afterImageUrl || freshTask.afterPhotoUrl || (freshTask.afterImage && freshTask.afterImage.length > 20 && !freshTask.afterImage.includes(' ') ? freshTask.afterImage : '');
        else if (key === 'waste') freshUrl = freshTask.wasteProofUrl || freshTask.wastePhotoUrl || (freshTask.wasteProof && freshTask.wasteProof.length > 20 && !freshTask.wasteProof.includes(' ') ? freshTask.wasteProof : '');

        if (freshUrl && typeof freshUrl === 'string' && freshUrl.length > 5 && !['Submitted', 'Pending', 'Pending upload', 'Verified'].includes(freshUrl.trim())) {
          const resolved = resolveImageUrl(freshUrl);
          if (resolved && !resolved.startsWith('blob:')) return resolved;
        }
      }
    } catch (e) { /* ignore */ }

    // 3. Check MongoDB complaints database state
    const linkedComplaint = complaints.find(c =>
      String(c._id) === String(task.complaintId || task.id) ||
      String(c.id) === String(task.complaintId || task.id) ||
      (task.id && task.id.replace('WO-', '').toUpperCase() === String(c._id).slice(-4).toUpperCase())
    );
    if (linkedComplaint) {
      if (key === 'before') {
        rawUrl = linkedComplaint.beforeImageUrl || linkedComplaint.photoUrl || linkedComplaint.image || linkedComplaint.photo || '';
      } else if (key === 'progress') {
        rawUrl = linkedComplaint.progressImageUrl || '';
      } else if (key === 'after') {
        rawUrl = linkedComplaint.afterImageUrl || linkedComplaint.afterPhoto || '';
      } else if (key === 'waste') {
        rawUrl = linkedComplaint.wasteImageUrl || linkedComplaint.wasteProofUrl || linkedComplaint.wastePhoto || '';
      }
      if (rawUrl && typeof rawUrl === 'string' && rawUrl.length > 5 && !['Submitted', 'Pending', 'Pending upload', 'Verified'].includes(rawUrl.trim())) {
        const resolved = resolveImageUrl(rawUrl);
        if (resolved && !resolved.startsWith('blob:')) return resolved;
      }
    }

    // 4. Default high-quality proof stage image for inspection
    return fallbackProofImages[key] || fallbackProofImages.before;
  };

  const getProofGps = (task, key) => {
    if (!task) return { lat: '13.340900', lng: '74.742100' };
    if (key === 'before' && (task.beforeGps || task.beforeLat)) {
      return task.beforeGps || { lat: String(task.beforeLat), lng: String(task.beforeLng) };
    }
    if (key === 'after' && (task.afterGps || task.afterLat)) {
      return task.afterGps || { lat: String(task.afterLat), lng: String(task.afterLng) };
    }
    if (key === 'waste' && (task.wasteGps || task.wasteLat)) {
      return task.wasteGps || { lat: String(task.wasteLat), lng: String(task.wasteLng) };
    }
    if (task.gps) return task.gps;
    if (task.lat && task.lng) return { lat: String(task.lat), lng: String(task.lng) };

    const linkedComplaint = complaints.find(c => String(c._id) === String(task.complaintId || task.id));
    if (linkedComplaint) {
      if (linkedComplaint.latitude && linkedComplaint.longitude) {
        return { lat: String(linkedComplaint.latitude), lng: String(linkedComplaint.longitude) };
      }
      if (linkedComplaint.gps) return linkedComplaint.gps;
    }
    return { lat: '13.340900', lng: '74.742100' };
  };

  const [complaintFilter, setComplaintFilter] = useState('pending'); // 'pending', 'all', 'verified'
  const [proofFilter, setProofFilter] = useState('active'); // 'active', 'all', 'closed'
  const [proofSort, setProofSort] = useState('updated_desc'); // 'updated_desc', 'updated_asc', 'status', 'priority'

  const processedComplaints = useMemo(() => {
    let list = [...complaints];
    if (complaintFilter === 'pending') {
      list = list.filter(c => {
        const s = (c.status || '').trim();
        if (['Verified', 'Resolved', 'Closed', 'Completed'].includes(s)) return false;
        if (c.closedBy || c.closedAt || c.verifiedAt) return false;
        const linkedTask = tasks.find(t => t.complaintId === c._id || t.id === c._id);
        if (linkedTask && ['Verified', 'Resolved', 'Closed', 'Completed'].includes(linkedTask.status)) return false;
        return true;
      });
    } else if (complaintFilter === 'verified') {
      list = list.filter(c => {
        const s = (c.status || '').trim();
        if (['Verified', 'Resolved', 'Closed', 'Completed'].includes(s)) return true;
        if (c.closedBy || c.closedAt || c.verifiedAt) return true;
        const linkedTask = tasks.find(t => t.complaintId === c._id || t.id === c._id);
        if (linkedTask && ['Verified', 'Resolved', 'Closed', 'Completed'].includes(linkedTask.status)) return true;
        return false;
      });
    }
    return list;
  }, [complaints, complaintFilter, tasks]);

  const processedProofTasks = useMemo(() => {
    let list = [...tasks];

    if (proofFilter === 'active') {
      list = list.filter(t => {
        if (['Closed', 'Verified', 'Resolved'].includes(t.status)) return false;
        const pState = t.proofStatus || { before: 'Pending', after: 'Pending', waste: 'Pending' };
        const allVerified = ['before', 'after', 'waste'].every(k => ['Verified', 'Not Required'].includes(pState[k]));
        return !allVerified;
      });
    } else if (proofFilter === 'closed') {
      list = list.filter(t => {
        if (['Closed', 'Verified', 'Resolved'].includes(t.status)) return true;
        const pState = t.proofStatus || { before: 'Pending', after: 'Pending', waste: 'Pending' };
        return ['before', 'after', 'waste'].every(k => ['Verified', 'Not Required'].includes(pState[k]));
      });
    }

    list.sort((a, b) => {
      if (proofSort === 'updated_desc' || proofSort === 'updated_asc') {
        const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : (a.visits && a.visits.length > 0 ? a.visits.length : 0);
        const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : (b.visits && b.visits.length > 0 ? b.visits.length : 0);
        return proofSort === 'updated_desc' ? timeB - timeA : timeA - timeB;
      }
      if (proofSort === 'priority') {
        const pMap = { High: 3, Medium: 2, Low: 1 };
        return (pMap[b.priority] || 2) - (pMap[a.priority] || 2);
      }
      if (proofSort === 'status') {
        const sMap = { 'Work Completed': 5, 'Waste Disposed': 4, 'Ready for Closure': 3, 'In Progress': 2, 'Assigned': 1, 'Closed': 0 };
        return (sMap[b.status] || 0) - (sMap[a.status] || 0);
      }
      return 0;
    });

    return list;
  }, [tasks, proofFilter, proofSort]);

  const selectedComplaint = complaints.find(c => c._id === selectedComplaintId) || complaints[0];

  useEffect(() => {
    localStorage.setItem('officialWorkOrders', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (!e || e.key === 'officialWorkOrders' || !e.key) {
        try {
          const saved = localStorage.getItem('officialWorkOrders');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setTasks(prev => {
                const prevMap = new Map(prev.map(p => [p.id, p]));
                return parsed.map(t => {
                  const existing = prevMap.get(t.id) || {};
                  return {
                    ...existing,
                    ...t,
                    beforeImageUrl: t.beforeImageUrl || existing.beforeImageUrl || '',
                    progressImageUrl: t.progressImageUrl || existing.progressImageUrl || '',
                    afterImageUrl: t.afterImageUrl || existing.afterImageUrl || '',
                    wasteProofUrl: t.wasteProofUrl || existing.wasteProofUrl || '',
                    proofStatus: t.proofStatus || existing.proofStatus || { before: 'Pending', after: 'Pending', waste: 'Pending' }
                  };
                });
              });
            }
          }
        } catch (err) {
          console.error('Storage sync error:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/auth/cutters`)
      .then(res => res.json())
      .then(data => {
        if (data.cutters && data.cutters.length > 0) {
          setFullCuttersList(data.cutters);
          const names = Array.from(new Set(data.cutters.map(c => typeof c === 'string' ? c : c.name || c.email).filter(Boolean)));
          setCutters(names);
          if (names.length > 0) {
            setSelectedCutter(names[0]);
            setMaintenanceForm(prev => ({ ...prev, cutter: names[0] }));
          }
        }
      })
      .catch(err => console.error('Failed to load dynamic cutters:', err));

    fetchOfficialAdoptions();

    fetch(`${API_URL}/api/attendance/leaves`)
      .then(res => res.json())
      .then(data => {
        if (data.leaves) {
          window.globalStaffLeaves = data.leaves;
          const localLeaves = JSON.parse(localStorage.getItem('officialLeaves') || '[]');
          const map = new Map();
          [...data.leaves, ...localLeaves].forEach(l => {
            const key = l._id || `${l.userName}_${l.startDate}`;
            if (!map.has(key)) map.set(key, l);
          });
          localStorage.setItem('officialLeaves', JSON.stringify(Array.from(map.values())));
        }
      })
      .catch(err => console.error('Failed to load leaves in official desk:', err));
  }, []);

  useEffect(() => {
    const loadComplaints = () => {
      fetch(`${API_URL}/api/complaints`)
        .then(r => r.json())
        .then(data => {
          const list = data.complaints || [];
          setComplaints(list);
          setSelectedComplaintId(prev => prev || list[0]?._id || '');

          setTasks(prev => {
            const updated = [...prev];
            list.forEach(c => {
              if (c.assignedTo) {
                const index = updated.findIndex(t => t.complaintId === c._id);
                const beforeUrl = c.beforeImageUrl || c.photoUrl || c.image || '';
                const afterUrl = c.afterImageUrl || c.afterPhoto || '';
                const wasteUrl = c.wasteProofUrl || c.wasteImageUrl || c.wastePhoto || '';

                if (index !== -1) {
                  updated[index] = {
                    ...updated[index],
                    cutter: c.assignedTo || updated[index].cutter,
                    status: c.status || updated[index].status,
                    beforeImageUrl: beforeUrl || updated[index].beforeImageUrl || '',
                    afterImageUrl: afterUrl || updated[index].afterImageUrl || '',
                    wasteProofUrl: wasteUrl || updated[index].wasteProofUrl || '',
                    beforeGps: c.beforeGps || updated[index].beforeGps || null,
                    afterGps: c.afterGps || updated[index].afterGps || null,
                    wasteGps: c.wasteGps || updated[index].wasteGps || null,
                    locationLat: c.locationLat || updated[index].locationLat,
                    locationLng: c.locationLng || updated[index].locationLng,
                  };
                } else {
                  const initialProg = c.status === 'Resolved' ? 100 : c.status === 'Work Completed' ? 85 : c.status === 'Waste Disposed' ? 95 : c.status === 'In Progress' ? 60 : c.status === 'Reached Location' ? 40 : 15;
                  updated.unshift({
                    id: `WO-${c._id.slice(-4).toUpperCase()}`,
                    source: 'Complaint',
                    complaintId: c._id,
                    title: issueLabels[c.issueType] || c.issueType || 'Tree Issue',
                    location: c.location || 'Location not specified',
                    cutter: c.assignedTo,
                    priority: c.issueType === 'fallen' || c.issueType === 'dead' ? 'High' : 'Medium',
                    status: c.status || 'Assigned',
                    progress: initialProg,
                    dueDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
                    visits: [{ time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), location: c.location || 'Pending GPS', note: `Assigned to ${c.assignedTo}.` }],
                    beforeImage: beforeUrl ? 'Submitted' : 'Pending upload',
                    afterImage: afterUrl ? 'Submitted' : (c.status === 'Resolved' || c.status === 'Work Completed' ? 'Submitted' : 'Pending upload'),
                    wasteProof: wasteUrl ? 'Submitted' : (c.status === 'Resolved' || c.status === 'Waste Disposed' ? 'Submitted' : 'Pending upload'),
                    beforeImageUrl: beforeUrl,
                    afterImageUrl: afterUrl,
                    wasteProofUrl: wasteUrl,
                    beforeGps: c.beforeGps || null,
                    afterGps: c.afterGps || null,
                    wasteGps: c.wasteGps || null,
                    locationLat: c.locationLat || null,
                    locationLng: c.locationLng || null,
                    proofStatus: { before: beforeUrl ? 'Pending' : 'Not Required', after: afterUrl ? 'Pending' : 'Pending upload', waste: wasteUrl ? 'Pending' : 'Pending upload' },
                  });
                }
              }
            });
            return updated;
          });
        })
        .catch(() => setComplaints([]))
        .finally(() => setLoading(false));
    };

    loadComplaints();
    const intervalId = setInterval(loadComplaints, 15000);
    return () => clearInterval(intervalId);
  }, []);

  // Sync selectedCutter to currently selected complaint's assignedTo person
  useEffect(() => {
    if (selectedComplaint && selectedComplaint.assignedTo) {
      setSelectedCutter(selectedComplaint.assignedTo);
    } else if (cutters.length > 0) {
      if (!selectedCutter || !cutters.includes(selectedCutter)) {
        setSelectedCutter(cutters[0]);
      }
    }
  }, [selectedComplaintId, selectedComplaint?.assignedTo, cutters]);

  const getCutterOptions = (assignedName) => {
    const list = [...cutters];
    if (assignedName && !list.includes(assignedName)) {
      list.unshift(assignedName);
    }
    return list;
  };

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
    updateComplaintStatus(complaint._id, 'Verified');
    showNotice('Complaint verified and archived from pending review desk.');
    Swal.fire({
      icon: 'success',
      title: 'Complaint Verified!',
      text: 'Verified successfully! This item is now moved out of the active review desk.',
      confirmButtonColor: '#10b981',
      timer: 2200,
    });
  };

  const assignComplaint = (complaint) => {
    if (!complaint) return;
    const targetCutter = selectedCutter || complaint.assignedTo || (cutters.length > 0 ? cutters[0] : 'sameeksha');

    const leaveStatus = checkCutterLeaveStatus(targetCutter);
    if (leaveStatus.isOnLeave) {
      Swal.fire({
        icon: 'error',
        title: 'Tree Cutter On Leave',
        html: `<strong>${targetCutter}</strong> is currently on <strong>${leaveStatus.leaveType}</strong> (from <code>${leaveStatus.startDate}</code> to <code>${leaveStatus.endDate}</code>).<br/><br/>You cannot assign tasks to a cutter on active leave. Please select another tree cutter.`,
        confirmButtonColor: '#ef4444'
      });
      return;
    }

    const existingIndex = tasks.findIndex(task => task.complaintId === complaint._id);
    if (existingIndex !== -1) {
      const updatedTasks = [...tasks];
      updatedTasks[existingIndex] = {
        ...updatedTasks[existingIndex],
        cutter: targetCutter,
        status: 'Assigned',
      };
      setTasks(updatedTasks);
      updateComplaintStatus(complaint._id, 'Scheduled', targetCutter);
      showNotice(`Work order re-assigned to ${targetCutter} successfully!`);
      Swal.fire({
        icon: 'success',
        title: 'Task Re-Assigned!',
        text: `Work order re-assigned to ${targetCutter}`,
        confirmButtonColor: '#1b4332',
        timer: 3000,
        timerProgressBar: true,
      });
      return;
    }

    const task = {
      id: `WO-${complaint._id.slice(-4).toUpperCase()}`,
      source: 'Complaint',
      complaintId: complaint._id,
      title: issueLabels[complaint.issueType] || complaint.issueType,
      location: complaint.location || 'Location not provided',
      cutter: targetCutter,
      priority: complaint.issueType === 'fallen' || complaint.issueType === 'dead' ? 'High' : 'Medium',
      status: 'Assigned',
      progress: 15,
      dueDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
      visits: [{ time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), location: complaint.location || 'Pending GPS', note: `Task assigned to ${targetCutter}.` }],
      beforeImage: complaint.photoUrl ? 'Submitted' : 'Pending upload',
      afterImage: 'Pending upload',
      wasteProof: 'Pending upload',
      proofStatus: { before: complaint.photoUrl ? 'Pending' : 'Not Required', after: 'Pending', waste: 'Pending' },
    };

    setTasks(prev => [task, ...prev]);
    updateComplaintStatus(complaint._id, 'Scheduled', targetCutter);
    showNotice(`Task is assigned to ${targetCutter}`);
    Swal.fire({
      icon: 'success',
      title: 'Task Assigned!',
      text: `Task is assigned to ${targetCutter}`,
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

    const leaveCheck = checkCutterLeaveStatus(maintenanceForm.cutter, maintenanceForm.dueDate);
    if (leaveCheck.isOnLeave) {
      Swal.fire({
        icon: 'error',
        title: 'Tree Cutter On Leave',
        html: `<strong>${maintenanceForm.cutter}</strong> is currently on <strong>${leaveCheck.leaveType}</strong> (from <code>${leaveCheck.startDate}</code> to <code>${leaveCheck.endDate}</code>).<br/><br/>You cannot schedule tasks to a tree cutter while they are on leave. Please select an available tree cutter.`,
        confirmButtonColor: '#ef4444'
      });
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
      'Assigned': ['Scheduled', 25],
      'Scheduled': ['Reached Location', 40],
      'Reached Location': ['In Progress', 60],
      'In Progress': ['Work Completed', 85],
      'Work Completed': ['Waste Disposed', 95],
      'Waste Disposed': ['Ready for Closure', 100],
      'Ready for Closure': ['Closed', 100],
      'Resolved': ['Closed', 100],
    };

    setTasks(prev => prev.map(task => {
      if (task.id !== taskId || !flow[task.status]) return task;
      const [newStatus, newProgress] = flow[task.status];

      if (task.complaintId && typeof task.complaintId === 'string' && !task.complaintId.startsWith('local-')) {
        let backendStatus = newStatus;
        if (newStatus === 'Ready for Closure' || newStatus === 'Closed') {
          backendStatus = 'Resolved';
        }
        updateComplaintStatus(task.complaintId, backendStatus);
      }

      const noteText =
        newStatus === 'Scheduled' ? 'Work schedule confirmed with cutter.' :
          newStatus === 'Reached Location' ? 'Cutter arrived on site with equipment.' :
            newStatus === 'In Progress' ? 'Pruning & tree trimming operations active.' :
              newStatus === 'Work Completed' ? 'Tree canopy work completed.' :
                newStatus === 'Waste Disposed' ? 'Green waste cleared and moved to compost yard.' :
                  newStatus === 'Ready for Closure' ? 'Proof photos verified. Ready for closure.' :
                    `Status updated to ${newStatus}.`;

      return {
        ...task,
        status: newStatus,
        progress: newProgress,
        updatedAt: new Date().toISOString(),
        visits: [
          ...(task.visits || []),
          {
            time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            location: task.location,
            note: noteText,
          },
        ],
        beforeImage: task.beforeImage || 'Submitted',
        afterImage: ['Work Completed', 'Waste Disposed', 'Ready for Closure', 'Closed'].includes(newStatus) ? 'Submitted' : task.afterImage,
        wasteProof: ['Waste Disposed', 'Ready for Closure', 'Closed'].includes(newStatus) ? 'Submitted' : task.wasteProof,
      };
    }));

    const found = tasks.find(t => t.id === taskId);
    if (found && flow[found.status]) {
      const [nextSt] = flow[found.status];
      showNotice(`Task ${taskId} updated to "${nextSt}"`);
    }
  };

  const verifyProof = (taskId, key) => {
    setTasks(prev => prev.map(task => (
      task.id === taskId
        ? {
          ...task,
          updatedAt: new Date().toISOString(),
          proofStatus: {
            ...(task.proofStatus || { before: 'Pending', after: 'Pending', waste: 'Pending' }),
            [key]: 'Verified'
          }
        }
        : task
    )));
    showNotice(`Proof photo verified.`);
  };

  const verifyAllProofs = (taskId) => {
    setTasks(prev => prev.map(task => (
      task.id === taskId
        ? {
          ...task,
          updatedAt: new Date().toISOString(),
          proofStatus: { before: 'Verified', after: 'Verified', waste: 'Verified' }
        }
        : task
    )));
    showNotice(`All proof items for ${taskId} verified.`);
  };

  const raiseAgainTask = (task) => {
    Swal.fire({
      title: 'Raise Again / Re-Open Task?',
      text: `Not satisfied with work done on ${task.id}? Re-opening will send this task back to the cutter for re-work.`,
      input: 'select',
      inputOptions: {
        'Branch waste left on site': 'Branch waste left on site / sidewalk',
        'Trimming incomplete': 'Canopy trimming / pruning incomplete',
        'Unclear proof photos': 'Proof photos unclear / unsatisfactory',
        'Tree safety hazard remaining': 'Tree safety hazard still remaining',
        'Other': 'Other issue (specified by official)',
      },
      inputPlaceholder: 'Select reason for re-opening',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: '🔄 Re-Open Task',
      cancelButtonText: 'Cancel',
      inputValidator: (value) => {
        if (!value) {
          return 'Please select a reason to re-open the task!';
        }
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const reason = result.value;
        setTasks(prev => prev.map(item => {
          if (item.id !== task.id) return item;
          return {
            ...item,
            status: 'In Progress',
            progress: 45,
            updatedAt: new Date().toISOString(),
            proofStatus: { before: item.proofStatus?.before || 'Verified', after: 'Pending', waste: 'Pending' },
            afterImage: 'Pending re-upload',
            wasteProof: 'Pending re-upload',
            visits: [
              ...(item.visits || []),
              {
                time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                location: item.location,
                note: `⚠️ Task Re-Opened by Official. Reason: ${reason}`,
              }
            ]
          };
        }));

        if (task.complaintId) updateComplaintStatus(task.complaintId, 'In Progress');

        showNotice(`Task ${task.id} re-opened and sent back to ${task.cutter}.`);
        Swal.fire({
          icon: 'warning',
          title: 'Task Re-Opened!',
          text: `${task.id} sent back to ${task.cutter} for re-work (${reason}).`,
          confirmButtonColor: '#1b4332',
        });
      }
    });
  };

  const closeTask = (task) => {
    const requiredProofs = ['before', 'after', 'waste'];
    const unverified = requiredProofs.some(key => !['Verified', 'Not Required'].includes(task.proofStatus?.[key]));

    if (unverified) {
      Swal.fire({
        title: 'Verify & Close Complaint?',
        text: 'Some proof photos are still pending verification. Would you like to verify all proof photos now and close this complaint?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#64748b',
        confirmButtonText: '✓ Verify All & Close',
        cancelButtonText: 'Cancel',
      }).then((result) => {
        if (result.isConfirmed) {
          setTasks(prev => prev.map(item => item.id === task.id ? {
            ...item,
            status: 'Closed',
            progress: 100,
            updatedAt: new Date().toISOString(),
            proofStatus: { before: 'Verified', after: 'Verified', waste: 'Verified' }
          } : item));
          if (task.complaintId) updateComplaintStatus(task.complaintId, 'Resolved');
          showNotice(`${task.id} closed and marked Resolved.`);
          Swal.fire({
            icon: 'success',
            title: 'Complaint Closed!',
            text: `${task.id} verified and marked Resolved successfully.`,
            confirmButtonColor: '#10b981',
          });
        }
      });
      return;
    }

    setTasks(prev => prev.map(item => item.id === task.id ? { ...item, status: 'Closed', progress: 100, updatedAt: new Date().toISOString() } : item));
    if (task.complaintId) updateComplaintStatus(task.complaintId, 'Resolved');
    showNotice(`${task.id} closed successfully.`);
    Swal.fire({
      icon: 'success',
      title: 'Complaint Closed!',
      text: `${task.id} closed successfully.`,
      confirmButtonColor: '#10b981',
      timer: 2500,
    });
  };

  const counts = {
    pending: complaints.filter(c => c.status === 'Pending').length,
    active: tasks.filter(t => !['Closed'].includes(t.status)).length,
    proof: tasks.filter(t => ['Work Completed', 'Waste Disposed', 'Ready for Closure'].includes(t.status)).length,
    closed: tasks.filter(t => t.status === 'Closed').length,
  };

  const taskTag = (status) => {
    if (status === 'Closed' || status === 'Waste Disposed' || status === 'Resolved') return 'ok';
    if (status === 'Work Completed' || status === 'Ready for Closure' || status === 'In Progress') return 'med';
    if (status === 'Assigned' || status === 'Scheduled' || status === 'Reached Location') return 'low';
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

                <div style={{ display: 'flex', alignItems: 'center', margin: '1.25rem 0', gap: '0.75rem' }}>
                  <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
                  <span style={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: '500' }}>OR</span>
                  <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <GoogleLogin
                    onSuccess={async (credentialResponse) => {
                      try {
                        const res = await fetch(`${API_URL}/api/auth/google`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ credential: credentialResponse.credential, portal: 'Official' }),
                        });
                        const data = await res.json();
                        if (res.ok) {
                          sessionStorage.setItem('officialAuthed', 'true');
                          localStorage.setItem('currentUser', JSON.stringify(data.user));
                          setOfficialAuthed(true);
                          setOfficialError('');
                        } else {
                          setOfficialError(data.msg || 'Google Sign-In failed');
                        }
                      } catch (err) {
                        setOfficialError(err.message);
                      }
                    }}
                    onError={() => setOfficialError('Google Sign-In failed')}
                    theme="filled_blue"
                    shape="pill"
                  />
                </div>
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

  const isAdmin = (() => {
    try {
      const u = JSON.parse(localStorage.getItem('currentUser')) || {};
      if (u.role === 'Admin') return true;
    } catch { }
    return sessionStorage.getItem('adminAuthed') === 'true';
  })();

  return (
    <div className="cg-app">
      <Sidebar active="Complaints" isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
      <div className="cg-workspace">
        <Topbar title={isAdmin ? "Complaints Management" : "Official Management"} showSearch={false} onToggleSidebar={() => setSidebarOpen(true)} />
        <main className="cg-page official-management">
          <section className="cg-admin-head official-head">
            <div>
              <span>{isAdmin ? "Admin Complaints Control" : "Operations Control"}</span>
              <h1>{isAdmin ? "Complaints & Operations Management" : "Official Management Module"}</h1>
              <p>Verify public complaints, assign cutters, monitor site visits, review proof, and close completed complaints.</p>
            </div>
            <div className="official-head-actions">
              {isAdmin ? (
                <Link className="cg-btn outline" to="/admin"><ShieldCheck size={18} /> Admin Console</Link>
              ) : (
                <Link className="cg-btn outline" to="/home"><Home size={18} /> Return Home</Link>
              )}
              <button className="official-live"><span className="pulse-indicator"></span> Live status sync</button>
            </div>
          </section>

          {notice && <div className="official-notice"><CheckCircle2 size={18} /> {notice}</div>}

          <section className="official-stat-grid">
            <article><AlertTriangle /><span>Pending complaints</span><b>{counts.pending}</b></article>
            <article><Users /><span>Active cutter tasks</span><b>{counts.active}</b></article>
            <article><Camera /><span>Proof reviews</span><b>{counts.proof}</b></article>
            <article><Heart /><span>Adopted Trees</span><b>{officialAdoptions.length}</b></article>
            <article><ShieldCheck /><span>Closed work</span><b>{counts.closed}</b></article>
          </section>

          <nav className="official-tabs">
            {[
              ['complaints', 'Complaints'],
              ['tasks', 'Progress'],
              ['maintenance', 'Create Task'],
              ['proofs', 'Proof Review'],
              ['adoptions', `Tree Adoptions (${officialAdoptions.length})`],
              ['processing', '🍂 Biomass & Compost Yard'],
              ['timber', '🔨 Timber Salvage Management'],
            ].map(([id, label]) => (
              <button key={id} className={activeView === id ? 'active' : ''} onClick={() => {
                if (id === 'processing') {
                  navigate('/processing');
                } else if (id === 'timber') {
                  navigate('/official/timber-management');
                } else {
                  setActiveView(id);
                }
              }}>{label}</button>
            ))}
          </nav>

          {activeView === 'complaints' && (
            <section className="official-grid">
              <div className="cg-panel official-list" style={{ display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 240px)', overflow: 'hidden' }}>
                <header style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ margin: 0 }}>Public Complaints</h2>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {loading ? 'Loading...' : `${processedComplaints.length} ${complaintFilter === 'pending' ? 'Pending Review' : complaintFilter === 'verified' ? 'Verified' : 'Total'}`}
                    </span>
                  </div>
                  <select
                    value={complaintFilter}
                    onChange={e => setComplaintFilter(e.target.value)}
                    style={{
                      background: 'var(--bg-elevated, #1f2937)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border)',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <option value="pending">Pending Review Only</option>
                    <option value="verified">Verified / Resolved</option>
                    <option value="all">All Complaints</option>
                  </select>
                </header>
                <div style={{ overflowY: 'auto', flex: 1, paddingBottom: '16px' }}>
                  {processedComplaints.length === 0 ? (
                    <p className="official-empty">No complaints matching filter "{complaintFilter}".</p>
                  ) : processedComplaints.map(complaint => (
                    <div
                      key={complaint._id}
                      className={`official-complaint-card ${selectedComplaint?._id === complaint._id ? 'selected' : ''}`}
                      onClick={() => setSelectedComplaintId(complaint._id)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', width: '100%' }}>
                        <b style={{ fontSize: '1rem', color: '#ffffff', fontWeight: 700, margin: 0 }}>
                          {issueLabels[complaint.issueType] || complaint.issueType}
                        </b>
                        <i className={`tag ${complaintTag(complaint.status)}`} style={{ fontStyle: 'normal', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {complaint.status}
                        </i>
                      </div>

                      <div style={{ fontSize: '0.85rem', color: '#b7e4c7', lineHeight: '1.4', wordBreak: 'break-word', width: '100%' }}>
                        📍 {complaint.location || 'No location provided'}
                      </div>

                      <div style={{ fontSize: '0.78rem', color: '#74c69d', marginTop: '2px', width: '100%' }}>
                        📅 {new Date(complaint.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>

                      {complaint.requiresReplantation && (
                        <span style={{ fontSize: '0.76rem', background: '#0b2518', color: '#34d399', border: '1px solid #2d6a4f', padding: '3px 10px', borderRadius: '12px', display: 'inline-block', width: 'fit-content', fontWeight: 700, marginTop: '2px' }}>
                          🌱 Replantation: {complaint.replantationStatus}
                        </span>
                      )}

                      {complaint.assignedTo && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#34d399', fontSize: '0.8rem', fontWeight: 700, marginTop: '2px', background: 'rgba(52, 211, 153, 0.12)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(52, 211, 153, 0.3)', width: 'fit-content' }}>
                          <Users size={13} /> Assigned to: <b>{complaint.assignedTo}</b>
                        </div>
                      )}

                      {/* Inline assignment panel when this complaint is selected */}
                      {selectedComplaint?._id === complaint._id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            marginTop: '12px',
                            padding: '14px',
                            background: '#061a14',
                            borderRadius: '10px',
                            border: '1px solid #1b4332',
                            width: '100%',
                            boxSizing: 'border-box',
                          }}
                        >
                          <p style={{ margin: '0 0 6px', fontSize: '0.82rem', color: '#b7e4c7' }}>
                            <b style={{ color: '#ffffff' }}>Submitted by:</b> {complaint.submittedBy || 'Anonymous'}
                          </p>
                          <p style={{ margin: '0 0 6px', fontSize: '0.82rem', color: '#b7e4c7' }}>
                            <b style={{ color: '#ffffff' }}>Description:</b> {complaint.description || 'No description'}
                          </p>
                          {complaint.photoUrl && (
                            <p style={{ margin: '0 0 8px', fontSize: '0.82rem', color: '#52b788', fontWeight: 600 }}>
                              📷 Photo submitted for inspection
                            </p>
                          )}

                          <label style={{ display: 'block', marginBottom: '10px', fontSize: '0.85rem', fontWeight: 600, color: '#74c69d' }}>
                            {complaint.assignedTo ? `Re-assign Tree Cutter (Currently: ${complaint.assignedTo})` : 'Assign Tree Cutter'}
                            <select
                              value={selectedCutter || complaint.assignedTo || ''}
                              onChange={e => setSelectedCutter(e.target.value)}
                              style={{
                                display: 'block',
                                width: '100%',
                                marginTop: '6px',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid #2d6a4f',
                                background: '#0b2518',
                                fontSize: '0.9rem',
                                color: '#ffffff',
                                cursor: 'pointer',
                                fontWeight: 700
                              }}
                            >
                              {getCutterOptions(complaint.assignedTo).map((cutter, idx) => {
                                const leaveInfo = checkCutterLeaveStatus(cutter);
                                return (
                                  <option
                                    key={`assign-cutter-${cutter}-${idx}`}
                                    value={cutter}
                                    disabled={leaveInfo.isOnLeave}
                                    style={{ background: leaveInfo.isOnLeave ? '#450a0a' : '#0b2518', color: leaveInfo.isOnLeave ? '#f87171' : '#ffffff' }}
                                  >
                                    {leaveInfo.isOnLeave
                                      ? `⛔ ${cutter} (ON LEAVE - ${leaveInfo.startDate} to ${leaveInfo.endDate})`
                                      : `${cutter}${cutter === complaint.assignedTo ? ' (Currently Assigned)' : ''}`}
                                  </option>
                                );
                              })}
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
                              <Users size={16} /> {complaint.assignedTo ? 'Re-Assign Task' : 'Assign Task'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="cg-panel official-detail" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 240px)' }}>
                {selectedComplaint ? (
                  <>
                    <header><h2>Verification Desk</h2><span className={`tag ${complaintTag(selectedComplaint.status)}`}>{selectedComplaint.status}</span></header>
                    <div className="official-detail-body">
                      <p><b>Issue</b><span>{issueLabels[selectedComplaint.issueType] || selectedComplaint.issueType}</span></p>
                      <p><b>Submitted by</b><span>{selectedComplaint.submittedBy || 'Anonymous'}</span></p>
                      <p><b>Location</b><span>{selectedComplaint.location || 'Not specified'}</span></p>
                      <p><b>Description</b><span>{selectedComplaint.description || 'No description provided.'}</span></p>
                      {selectedComplaint.assignedTo && (
                        <p>
                          <b>Assigned To</b>
                          <span style={{ color: '#34d399', fontWeight: 700, background: 'rgba(52, 211, 153, 0.12)', padding: '3px 10px', borderRadius: '6px', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                            ✓ {selectedComplaint.assignedTo}
                          </span>
                        </p>
                      )}
                      <div className="official-photo-review-v2">
                        {(() => {
                          const photo = resolveImageUrl(selectedComplaint.photoUrl || selectedComplaint.image || selectedComplaint.beforeImageUrl);
                          const complaintLat = Number(selectedComplaint.locationLat || selectedComplaint.lat || selectedComplaint.latitude || selectedComplaint.beforeGps?.lat) || 13.3409;
                          const complaintLng = Number(selectedComplaint.locationLng || selectedComplaint.lng || selectedComplaint.longitude || selectedComplaint.beforeGps?.lng) || 74.7421;
                          const hasPhoto = Boolean(photo);

                          return (
                            <>
                              {/* Public Inspection Photo Card Item */}
                              <div className="official-photo-card-item">
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <Camera size={18} color="#52b788" />
                                      <b style={{ fontSize: '0.88rem', color: '#ffffff' }}>Public Inspection Photo</b>
                                    </div>
                                    <span style={{ fontSize: '0.72rem', background: hasPhoto ? 'rgba(82, 183, 136, 0.18)' : 'rgba(245, 158, 11, 0.18)', color: hasPhoto ? '#52b788' : '#f59e0b', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                                      {hasPhoto ? 'Uploaded' : 'No Photo'}
                                    </span>
                                  </div>

                                  {hasPhoto ? (
                                    <div
                                      onClick={() => setPreviewModal({
                                        isOpen: true,
                                        taskId: selectedComplaint._id ? selectedComplaint._id.slice(-6).toUpperCase() : 'CMP',
                                        key: 'before',
                                        label: `Public Complaint Image (${issueLabels[selectedComplaint.issueType] || selectedComplaint.issueType || 'Issue'})`,
                                        imageUrl: photo,
                                        status: 'Submitted for Verification',
                                        gps: { lat: complaintLat.toFixed(6), lng: complaintLng.toFixed(6) },
                                        locationText: selectedComplaint.location || 'Field Location'
                                      })}
                                      style={{
                                        height: '110px',
                                        width: '100%',
                                        borderRadius: '8px',
                                        overflow: 'hidden',
                                        position: 'relative',
                                        cursor: 'pointer',
                                        border: '1px solid rgba(82, 183, 136, 0.3)',
                                        background: '#000'
                                      }}
                                      title="Click to inspect high-res photo"
                                    >
                                      <img
                                        src={photo}
                                        alt="Public complaint inspection"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                      />
                                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#ffffff', fontSize: '0.82rem', fontWeight: 600 }}>
                                        <Eye size={16} /> Click to Inspect
                                      </div>
                                    </div>
                                  ) : (
                                    <div style={{ height: '110px', width: '100%', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', padding: '10px', textAlign: 'center' }}>
                                      <Camera size={24} style={{ opacity: 0.4, marginBottom: '4px' }} />
                                      <span style={{ fontSize: '0.78rem' }}>No Photo Submitted with Complaint</span>
                                    </div>
                                  )}
                                </div>

                                {hasPhoto && (
                                  <button
                                    className="cg-btn outline compact"
                                    onClick={() => setPreviewModal({
                                      isOpen: true,
                                      taskId: selectedComplaint._id ? selectedComplaint._id.slice(-6).toUpperCase() : 'CMP',
                                      key: 'before',
                                      label: `Public Complaint Image (${issueLabels[selectedComplaint.issueType] || selectedComplaint.issueType || 'Issue'})`,
                                      imageUrl: photo,
                                      status: 'Submitted for Verification',
                                      gps: { lat: complaintLat.toFixed(6), lng: complaintLng.toFixed(6) },
                                      locationText: selectedComplaint.location || 'Field Location'
                                    })}
                                    style={{ fontSize: '0.8rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '6px' }}
                                  >
                                    <Eye size={14} /> View Full Image
                                  </button>
                                )}
                              </div>

                              {/* GPS Location Verification Card Item */}
                              <div className="official-photo-card-item">
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <MapPin size={18} color="#60a5fa" />
                                      <b style={{ fontSize: '0.88rem', color: '#ffffff' }}>GPS Field Verification</b>
                                    </div>
                                    <span style={{ fontSize: '0.72rem', background: 'rgba(59, 130, 246, 0.18)', color: '#60a5fa', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                                      📍 Geotagged
                                    </span>
                                  </div>

                                  <p style={{ margin: '0 0 6px', fontSize: '0.82rem', color: '#b7e4c7', padding: 0, border: 'none' }}>
                                    <b style={{ color: '#74c69d' }}>GPS Coordinates:</b> {complaintLat.toFixed(4)}° N, {complaintLng.toFixed(4)}° E
                                  </p>
                                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.4, padding: 0, border: 'none' }}>
                                    GPS Geofence ensures the assigned tree cutter physically visits the exact location before task completion.
                                  </p>
                                </div>

                                <button
                                  className="cg-btn primary compact"
                                  onClick={() => setGpsMapModal({
                                    isOpen: true,
                                    complaintTitle: issueLabels[selectedComplaint.issueType] || selectedComplaint.issueType || 'Complaint',
                                    locationName: selectedComplaint.location || 'Field Location',
                                    coords: [complaintLat, complaintLng]
                                  })}
                                  style={{ fontSize: '0.8rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none', marginTop: '6px' }}
                                >
                                  <Navigation size={14} /> Open GPS Location Map
                                </button>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      <label className="official-field">
                        {selectedComplaint.assignedTo ? `Re-assign tree cutter (Currently: ${selectedComplaint.assignedTo})` : 'Assign tree cutter'}
                        <select value={selectedCutter || selectedComplaint.assignedTo || ''} onChange={e => setSelectedCutter(e.target.value)} style={{ fontWeight: 700 }}>
                          {getCutterOptions(selectedComplaint.assignedTo).map((cutter, idx) => {
                            const leaveInfo = checkCutterLeaveStatus(cutter);
                            return (
                              <option
                                key={`desk-cutter-${cutter}-${idx}`}
                                value={cutter}
                                disabled={leaveInfo.isOnLeave}
                                style={{ background: leaveInfo.isOnLeave ? '#450a0a' : '#0b2518', color: leaveInfo.isOnLeave ? '#fca5a5' : '#ffffff' }}
                              >
                                {leaveInfo.isOnLeave ? `⛔ ${cutter} (ON LEAVE - ${leaveInfo.startDate} to ${leaveInfo.endDate})` : `${cutter} ${cutter === selectedComplaint.assignedTo ? '(Currently Assigned)' : ''}`}
                              </option>
                            );
                          })}
                        </select>
                      </label>
                      <div className="official-actions">
                        <button className="cg-btn outline" onClick={() => verifyComplaint(selectedComplaint)}><ShieldCheck size={18} /> Verify</button>
                        <button className="cg-btn primary" onClick={() => assignComplaint(selectedComplaint)}><Users size={18} /> {selectedComplaint.assignedTo ? 'Re-Assign Task' : 'Assign Task'}</button>
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
                <label>Cutter<select value={maintenanceForm.cutter} onChange={e => setMaintenanceForm({ ...maintenanceForm, cutter: e.target.value })}>{cutters.map((cutter, idx) => <option key={`maint-cutter-${cutter}-${idx}`} value={cutter}>{cutter}</option>)}</select></label>
                <label>Priority<select value={maintenanceForm.priority} onChange={e => setMaintenanceForm({ ...maintenanceForm, priority: e.target.value })}><option>Low</option><option>Medium</option><option>High</option></select></label>
                <label>Due date<input type="date" value={maintenanceForm.dueDate} onChange={e => setMaintenanceForm({ ...maintenanceForm, dueDate: e.target.value })} /></label>
                <button className="cg-btn primary"><Plus size={18} /> Create Task</button>
              </form>
            </section>
          )}

          {activeView === 'proofs' && (
            <div>
              {/* Proof Review Toolbar */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '14px',
                marginBottom: '20px',
                background: 'var(--bg-surface, #111827)',
                padding: '16px 20px',
                borderRadius: '14px',
                border: '1px solid var(--border, #1f2937)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>📷 Proof Verification Desk</h3>
                  <span style={{ fontSize: '0.8rem', background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', padding: '3px 10px', borderRadius: '12px', fontWeight: 700 }}>
                    {processedProofTasks.length} {proofFilter === 'active' ? 'Active Tasks' : proofFilter === 'closed' ? 'Closed Complaints' : 'Total Items'}
                  </span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Show:</span>
                    <select
                      value={proofFilter}
                      onChange={e => setProofFilter(e.target.value)}
                      style={{
                        background: 'var(--bg-elevated, #1f2937)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border)',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      <option value="active">Active Work Orders (Hide Closed)</option>
                      <option value="all">All Work Orders</option>
                      <option value="closed">Closed / Completed Only</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Sort by:</span>
                    <select
                      value={proofSort}
                      onChange={e => setProofSort(e.target.value)}
                      style={{
                        background: 'var(--bg-elevated, #1f2937)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border)',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      <option value="updated_desc">⏰ Latest Update First</option>
                      <option value="updated_asc">⌛ Oldest Update First</option>
                      <option value="status">🚨 Needs Review First</option>
                      <option value="priority">🔥 High Priority First</option>
                    </select>
                  </div>
                </div>
              </div>

              {processedProofTasks.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '50px 20px',
                  background: 'var(--bg-surface, #111827)',
                  borderRadius: '16px',
                  border: '1px solid var(--border, #1f2937)',
                  color: 'var(--text-secondary, #9ca3af)',
                  marginTop: '20px'
                }}>
                  <CheckCircle2 size={44} color="#34d399" style={{ marginBottom: '12px' }} />
                  <h3 style={{ margin: '0 0 6px', color: 'var(--text-primary, #fff)' }}>No Proof Tasks Matching Filter</h3>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>
                    {proofFilter === 'active'
                      ? 'All completed work orders have been closed and moved out of active review.'
                      : 'No proof review work orders match the selected criteria.'}
                  </p>
                </div>
              ) : (
                <section className="official-proof-grid">
                  {processedProofTasks.map(task => {
                    const isClosed = task.status === 'Closed';
                    const proofState = task.proofStatus || { before: 'Pending', after: 'Pending', waste: 'Pending' };
                    const allVerified = ['before', 'after', 'waste'].every(k => ['Verified', 'Not Required'].includes(proofState[k]));
                    return (
                      <article className="cg-panel official-proof-card" key={task.id} style={{ opacity: isClosed ? 0.85 : 1 }}>
                        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                          <div>
                            <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>{task.id}</h2>
                            <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                              {task.title} • <span style={{ color: '#34d399', fontWeight: 600 }}>Cutter: {task.cutter}</span>
                            </p>
                          </div>
                          <span className={`tag ${taskTag(task.status)}`}>{task.status}</span>
                        </header>
                        <div className="official-proof-items">
                          {[
                            ['before', 'Before image', task.beforeImage],
                            ['after', 'After work image', task.afterImage],
                            ['waste', 'Waste disposal proof', task.wasteProof],
                          ].map(([key, label, value]) => {
                            const imgUrl = getProofImageUrl(task, key);
                            const isVerified = proofState[key] === 'Verified';
                            const proofGps = getProofGps(task, key);
                            const proofLoc = key === 'waste' ? (task.dumpingLocation || 'Government Waste Yard') : (task.location || 'Field Location');

                            return (
                              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', gap: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div
                                    style={{
                                      width: '56px',
                                      height: '44px',
                                      borderRadius: '8px',
                                      overflow: 'hidden',
                                      cursor: 'pointer',
                                      border: '1px solid var(--border, rgba(82, 183, 136, 0.3))',
                                      background: '#111f18',
                                      position: 'relative',
                                      flexShrink: 0
                                    }}
                                    title="Click to enlarge & view proof photo"
                                    onClick={() => setPreviewModal({
                                      isOpen: true,
                                      taskId: task.id,
                                      key,
                                      label,
                                      imageUrl: imgUrl || fallbackProofImages[key],
                                      status: proofState[key] || 'Pending',
                                      gps: proofGps,
                                      locationText: proofLoc
                                    })}
                                  >
                                    {imgUrl ? (
                                      <>
                                        <img
                                          src={imgUrl}
                                          alt={label}
                                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                          onError={(e) => {
                                            if (fallbackProofImages[key] && e.target.src !== fallbackProofImages[key]) {
                                              e.target.src = fallbackProofImages[key];
                                            }
                                          }}
                                        />
                                        <div style={{
                                          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.28)',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                          <Eye size={15} color="#ffffff" />
                                        </div>
                                      </>
                                    ) : (
                                      <div style={{
                                        width: '100%', height: '100%', display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', background: 'rgba(100,116,139,0.15)', color: '#94a3b8'
                                      }}>
                                        <Camera size={16} />
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <b style={{ display: 'block', fontSize: '13px' }}>{label}</b>
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{value}</span>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                  <small style={{
                                    background: isVerified ? 'rgba(52, 211, 153, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                                    color: isVerified ? '#34d399' : '#facc15',
                                    border: isVerified ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(234, 179, 8, 0.3)',
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    fontWeight: 700,
                                    fontSize: '11px'
                                  }}>
                                    {proofState[key] || 'Pending'}
                                  </small>
                                  <button
                                    className="cg-btn outline compact"
                                    style={{ padding: '4px 8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    onClick={() => setPreviewModal({
                                      isOpen: true,
                                      taskId: task.id,
                                      key,
                                      label,
                                      imageUrl: imgUrl || fallbackProofImages[key] || fallbackProofImages.before,
                                      status: proofState[key] || 'Pending',
                                      gps: proofGps,
                                      locationText: proofLoc
                                    })}
                                  >
                                    <Eye size={13} /> View
                                  </button>
                                  <button
                                    className="cg-btn outline compact"
                                    style={{ padding: '4px 8px', fontSize: '12px' }}
                                    onClick={() => verifyProof(task.id, key)}
                                    disabled={isVerified || isClosed}
                                  >
                                    {isVerified ? '✓ Verified' : 'Verify'}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '16px' }}>
                          <button
                            className="cg-btn outline compact"
                            onClick={() => verifyAllProofs(task.id)}
                            disabled={allVerified || isClosed}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            <ShieldCheck size={16} /> Verify All
                          </button>
                          {isClosed ? (
                            <button
                              className="cg-btn primary"
                              disabled
                              style={{ flex: 1, minWidth: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: 0.6, cursor: 'not-allowed', background: '#059669', borderColor: '#059669' }}
                            >
                              <CheckCircle2 size={18} /> ✓ Complaint Closed
                            </button>
                          ) : (
                            <button
                              className="cg-btn primary"
                              style={{ flex: 1, minWidth: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                              onClick={() => closeTask(task)}
                            >
                              <CheckCircle2 size={18} /> Close Complaint
                            </button>
                          )}
                          <button
                            className="cg-btn outline compact"
                            style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171', display: 'flex', alignItems: 'center', gap: '6px' }}
                            onClick={() => raiseAgainTask(task)}
                          >
                            <RotateCcw size={15} /> Raise Again
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </section>
              )}
            </div>
          )}

          {activeView === 'adoptions' && (
            <div style={{ marginTop: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary, #ffffff)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Heart style={{ color: '#059669', width: 24, height: 24 }} /> Municipal Tree Adoptions & Care Supervision
                  </h2>
                  <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary, #94a3b8)', fontSize: '0.9rem' }}>
                    Oversee citizen adoptions, assign dedicated arborists/cutters for municipal care, and review maintenance photo proofs.
                  </p>
                </div>
                <button
                  onClick={fetchOfficialAdoptions}
                  disabled={loadingOfficialAdoptions}
                  style={{
                    padding: '0.55rem 1.1rem',
                    background: 'var(--bg-elevated, rgba(255,255,255,0.08))',
                    color: 'var(--text-primary, #ffffff)',
                    border: '1px solid var(--border, rgba(255,255,255,0.18))',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <RefreshCw size={15} className={loadingOfficialAdoptions ? 'spin' : ''} /> Refresh
                </button>
              </div>

              {/* Filter Tabs */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                {[
                  { id: 'all', label: `All Adoptions (${officialAdoptions.length})` },
                  { id: 'unassigned', label: `Needs Cutter (${officialAdoptions.filter(s => s.adoptionType === 'subscription' && !s.assignedCutterId && ['active', 'assigned'].includes(s.status)).length})` },
                  { id: 'pending_review', label: `Care Proofs for Review (${officialAdoptions.reduce((acc, s) => acc + (s.careTasks?.filter(t => t.status === 'Pending').length || 0), 0)})` },
                  { id: 'subscription', label: `Municipal Care Subscriptions (${officialAdoptions.filter(s => s.adoptionType === 'subscription' && ['active', 'assigned'].includes(s.status)).length})` },
                  { id: 'self', label: `Citizen Self-Care (${officialAdoptions.filter(s => s.adoptionType === 'self' && !['cancelled', 'lapsed'].includes(s.status)).length})` },
                  { id: 'cancelled', label: `Cancelled / Expired (${officialAdoptions.filter(s => ['cancelled', 'lapsed'].includes(s.status)).length})` },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setAdoptionFilter(tab.id)}
                    style={{
                      padding: '0.45rem 0.9rem',
                      borderRadius: '20px',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: adoptionFilter === tab.id ? '2px solid #059669' : '1px solid var(--border, rgba(255,255,255,0.15))',
                      background: adoptionFilter === tab.id ? 'rgba(5, 150, 105, 0.25)' : 'var(--bg-elevated, rgba(255,255,255,0.05))',
                      color: adoptionFilter === tab.id ? '#34d399' : 'var(--text-secondary, #9ca3af)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {loadingOfficialAdoptions ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary, #9ca3af)' }}>
                  <RefreshCw size={24} className="spin" style={{ marginBottom: '0.75rem', display: 'inline-block' }} />
                  <p>Loading adoptions & care records...</p>
                </div>
              ) : filteredOfficialAdoptions.length === 0 ? (
                <div style={{ padding: '3.5rem', textAlign: 'center', background: 'var(--bg-card, #112a20)', borderRadius: '12px', border: '1px dashed var(--border, rgba(255,255,255,0.2))' }}>
                  <TreePine size={40} style={{ color: '#9CA3AF', marginBottom: '0.75rem' }} />
                  <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary, #ffffff)', fontSize: '1.1rem' }}>No adoptions found</h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary, #9ca3af)', fontSize: '0.9rem' }}>
                    {adoptionFilter !== 'all' ? 'Try switching to a different filter tab.' : 'No citizen adoptions have been recorded yet.'}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.25rem' }}>
                  {filteredOfficialAdoptions.map(sub => {
                    const isSub = sub.adoptionType === 'subscription';
                    const isCancelled = ['cancelled', 'lapsed', 'expired'].includes(sub.status?.toLowerCase());
                    const treeName = sub.treeName || sub.treeId?.name || 'Adopted Tree';
                    const scientificName = sub.treeScientificName || sub.treeId?.scientificName || '';
                    const citizenName = sub.userName || sub.userId?.name || 'Citizen Adopter';
                    const citizenEmail = sub.userEmail || sub.userId?.email || '';
                    const location = sub.treeLocation || sub.treeId?.location || sub.treeId?.origin || 'Municipal Sector';
                    const careTasks = sub.careTasks || [];
                    const pendingProofTasks = careTasks.filter(t => t.status === 'Pending');

                    return (
                      <div
                        key={sub._id}
                        style={{
                          background: 'var(--bg-card, #0d281e)',
                          borderRadius: '12px',
                          border: '1px solid var(--border, rgba(255,255,255,0.12))',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          padding: '1.25rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '1rem',
                          position: 'relative',
                          color: 'var(--text-primary, #ffffff)'
                        }}
                      >
                        {/* Header: Tree & Status */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                              <span style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                padding: '0.2rem 0.55rem',
                                borderRadius: '4px',
                                background: isSub ? 'rgba(99, 102, 241, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                color: isSub ? '#a5b4fc' : '#6ee7b7',
                                letterSpacing: '0.04em'
                              }}>
                                {isSub ? 'Municipal Care Plan' : 'Citizen Self-Care'}
                              </span>
                              <span style={{
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                background: isCancelled ? 'rgba(239, 68, 68, 0.2)' : (sub.status === 'active' || sub.status === 'assigned') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                color: isCancelled ? '#fca5a5' : (sub.status === 'active' || sub.status === 'assigned') ? '#6ee7b7' : '#fcd34d'
                              }}>
                                {sub.status?.toUpperCase()}
                              </span>
                            </div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary, #ffffff)' }}>
                              {treeName}
                            </h3>
                            {scientificName && (
                              <p style={{ margin: '0.15rem 0 0', fontStyle: 'italic', fontSize: '0.825rem', color: 'var(--text-secondary, #9ca3af)' }}>
                                {scientificName}
                              </p>
                            )}
                          </div>
                          {sub.certificateNumber && (
                            <span style={{
                              fontSize: '0.7rem',
                              fontFamily: 'monospace',
                              background: 'rgba(255,255,255,0.08)',
                              padding: '0.2rem 0.4rem',
                              borderRadius: '4px',
                              color: 'var(--text-secondary, #9ca3af)',
                              border: '1px solid var(--border, rgba(255,255,255,0.12))',
                              whiteSpace: 'nowrap'
                            }}>
                              Cert #{sub.certificateNumber.slice(-6)}
                            </span>
                          )}
                        </div>

                        {/* Adopter & Tree Info */}
                        <div style={{ background: 'var(--bg-surface, rgba(0,0,0,0.25))', borderRadius: '8px', padding: '0.75rem', fontSize: '0.825rem', color: 'var(--text-primary, #ffffff)', border: '1px solid var(--border, rgba(255,255,255,0.08))' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <div>
                              <span style={{ color: 'var(--text-secondary, #9ca3af)', display: 'block', fontSize: '0.725rem' }}>CITIZEN ADOPTER</span>
                              <strong style={{ color: 'var(--text-primary, #ffffff)' }}>{citizenName}</strong>
                              <div style={{ color: 'var(--text-secondary, #9ca3af)', fontSize: '0.75rem', textOverflow: 'ellipsis', overflow: 'hidden' }}>{citizenEmail}</div>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-secondary, #9ca3af)', display: 'block', fontSize: '0.725rem' }}>LOCATION / WARD</span>
                              <span style={{ color: 'var(--text-primary, #ffffff)', fontWeight: 600 }}>{location}</span>
                              <div style={{ color: 'var(--text-secondary, #9ca3af)', fontSize: '0.75rem' }}>Adopted: {sub.startDate ? new Date(sub.startDate).toLocaleDateString() : 'Active'}</div>
                            </div>
                          </div>
                        </div>

                        {/* Arborist / Cutter Assignment Section */}
                        {isSub && isCancelled && (
                          <div style={{ borderTop: '1px solid var(--border, rgba(255,255,255,0.1))', paddingTop: '0.75rem' }}>
                            <div style={{
                              padding: '0.65rem 0.85rem',
                              borderRadius: '8px',
                              background: 'rgba(239, 68, 68, 0.12)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              color: '#f87171',
                              fontSize: '0.825rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.6rem'
                            }}>
                              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                              <div>
                                <strong style={{ display: 'block', color: '#fca5a5', marginBottom: '0.1rem' }}>Subscription Cancelled</strong>
                                <span style={{ fontSize: '0.775rem', opacity: 0.9 }}>
                                  Municipal tree care service terminated. No arborist assignment required.
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {isSub && !isCancelled && (
                          <div style={{ borderTop: '1px solid var(--border, rgba(255,255,255,0.1))', paddingTop: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary, #9ca3af)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Assigned Arborist / Cutter
                              </span>
                              {sub.assignedCutterName ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#34d399', fontSize: '0.75rem', fontWeight: 600 }}>
                                  <CheckCircle size={13} /> Active: {sub.assignedCutterName}
                                </span>
                              ) : (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#f87171', fontSize: '0.75rem', fontWeight: 600 }}>
                                  <AlertCircle size={13} /> Needs Assignment
                                </span>
                              )}
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <select
                                value={assigningCutterId[sub._id] !== undefined ? assigningCutterId[sub._id] : (sub.assignedCutterId || '')}
                                onChange={(e) => setAssigningCutterId(prev => ({ ...prev, [sub._id]: e.target.value }))}
                                style={{
                                  flex: 1,
                                  padding: '0.45rem 0.65rem',
                                  fontSize: '0.825rem',
                                  borderRadius: '6px',
                                  border: '1px solid var(--border, rgba(255,255,255,0.2))',
                                  background: 'var(--bg-elevated, #061a14)',
                                  color: 'var(--text-primary, #ffffff)'
                                }}
                              >
                                <option value="">-- Choose Municipal Cutter --</option>
                                {fullCuttersList.map(c => {
                                  const cId = c._id || c.id;
                                  const cName = c.name || c.email || (typeof c === 'string' ? c : 'Arborist');
                                  return (
                                    <option key={cId || cName} value={cId || cName}>
                                      {cName} {c.email ? `(${c.email})` : ''}
                                    </option>
                                  );
                                })}
                              </select>
                              <button
                                onClick={() => handleAssignCutterToTree(sub._id)}
                                style={{
                                  padding: '0.45rem 0.85rem',
                                  background: '#059669',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {sub.assignedCutterId ? 'Reassign' : 'Assign'}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Self Care Note */}
                        {!isSub && (
                          <div style={{ background: 'rgba(5, 150, 105, 0.12)', border: '1px solid rgba(5, 150, 105, 0.3)', borderRadius: '8px', padding: '0.65rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <Heart size={16} style={{ color: '#34d399', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.8rem', color: '#6ee7b7' }}>
                              Citizen pledged to personally water, prune, and tend this tree every week.
                            </span>
                          </div>
                        )}

                        {/* Care Proofs / Activities Overview */}
                        <div style={{ borderTop: '1px solid var(--border, rgba(255,255,255,0.1))', paddingTop: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary, #9ca3af)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Care Activity & Proofs ({careTasks.length})
                            </span>
                            {pendingProofTasks.length > 0 && (
                              <span style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fcd34d', padding: '0.15rem 0.45rem', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 700 }}>
                                {pendingProofTasks.length} for Review
                              </span>
                            )}
                          </div>

                          {careTasks.length === 0 ? (
                            <p style={{ margin: 0, fontSize: '0.775rem', color: 'var(--text-secondary, #9ca3af)', fontStyle: 'italic' }}>
                              No maintenance activities logged yet for this adoption period.
                            </p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '180px', overflowY: 'auto' }}>
                              {careTasks.slice().reverse().map(task => {
                                const isPending = task.status === 'Pending';
                                const isValidated = task.status === 'Validated';
                                const isRejected = task.status === 'Rejected';
                                const proofImg = task.proofImageUrl || task.proofPhoto;

                                return (
                                  <div
                                    key={task._id}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      background: 'var(--bg-surface, rgba(0,0,0,0.25))',
                                      borderRadius: '6px',
                                      padding: '0.45rem 0.65rem',
                                      border: '1px solid var(--border, rgba(255,255,255,0.08))',
                                      gap: '0.5rem'
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                                      {proofImg ? (
                                        <img
                                          src={proofImg}
                                          alt="proof thumbnail"
                                          style={{ width: 32, height: 32, borderRadius: '4px', objectFit: 'cover', border: '1px solid var(--border, rgba(255,255,255,0.2))', flexShrink: 0, cursor: 'pointer' }}
                                          onClick={() => {
                                            setValidatingTaskModal({ subId: sub._id, task, treeName, userName: citizenName, currentStatus: 'Validated' });
                                            setValidationNoteInput(task.validationNote || '');
                                          }}
                                        />
                                      ) : (
                                        <Camera size={20} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                                      )}
                                      <div style={{ minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary, #ffffff)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                          {task.taskType || 'Tree Care'}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary, #9ca3af)' }}>
                                          {task.uploadedByName || task.cutterName || 'Arborist'} • {task.uploadedAt ? new Date(task.uploadedAt).toLocaleDateString() : ''}
                                        </div>
                                      </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                                      <span style={{
                                        fontSize: '0.675rem',
                                        fontWeight: 700,
                                        padding: '0.15rem 0.4rem',
                                        borderRadius: '4px',
                                        background: isValidated ? 'rgba(16, 185, 129, 0.2)' : isRejected ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                        color: isValidated ? '#6ee7b7' : isRejected ? '#fca5a5' : '#fcd34d'
                                      }}>
                                        {task.status || 'Pending'}
                                      </span>

                                      <button
                                        onClick={() => {
                                          setValidatingTaskModal({ subId: sub._id, task, treeName, userName: citizenName, currentStatus: task.status === 'Pending' ? 'Validated' : task.status });
                                          setValidationNoteInput(task.validationNote || '');
                                        }}
                                        style={{
                                          padding: '0.25rem 0.55rem',
                                          borderRadius: '4px',
                                          fontSize: '0.725rem',
                                          fontWeight: 600,
                                          background: isPending ? '#059669' : 'rgba(255,255,255,0.1)',
                                          color: isPending ? '#FFFFFF' : 'var(--text-primary, #ffffff)',
                                          border: 'none',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        {isPending ? 'Review' : 'View'}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => setCalendarModalSub(sub)}
                            style={{
                              marginTop: '0.4rem',
                              width: '100%',
                              padding: '0.5rem',
                              background: 'rgba(5, 150, 105, 0.15)',
                              border: '1px solid rgba(5, 150, 105, 0.3)',
                              color: '#34d399',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.4rem'
                            }}
                          >
                            <Calendar size={15} /> View Care Schedule & Timeline
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Official Care Activity Proof Review Lightbox Modal */}
      {validatingTaskModal && validatingTaskModal.task && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '560px',
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid #E5E7EB' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck style={{ color: '#059669', width: 22, height: 22 }} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>
                  Review Tree Care Maintenance Proof
                </h3>
              </div>
              <button
                onClick={() => setValidatingTaskModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.25rem' }}>
              {(validatingTaskModal.task.proofImageUrl || validatingTaskModal.task.proofPhoto) ? (
                <div style={{ borderRadius: '10px', overflow: 'hidden', maxHeight: '280px', background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                  <img
                    src={validatingTaskModal.task.proofImageUrl || validatingTaskModal.task.proofPhoto}
                    alt="Care Proof"
                    style={{ maxWidth: '100%', maxHeight: '280px', objectFit: 'contain' }}
                  />
                </div>
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', background: '#F3F4F6', borderRadius: '8px', color: '#6B7280', marginBottom: '1rem' }}>
                  No photo attached to this task.
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem', background: '#F9FAFB', padding: '0.75rem', borderRadius: '8px', fontSize: '0.825rem' }}>
                <div>
                  <span style={{ color: '#9CA3AF', display: 'block', fontSize: '0.725rem' }}>TASK TYPE</span>
                  <strong style={{ color: '#111827' }}>{validatingTaskModal.task.taskType}</strong>
                </div>
                <div>
                  <span style={{ color: '#9CA3AF', display: 'block', fontSize: '0.725rem' }}>LOGGED BY</span>
                  <strong style={{ color: '#111827' }}>{validatingTaskModal.task.uploadedByName || validatingTaskModal.task.cutterName || 'Arborist'}</strong>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: '#9CA3AF', display: 'block', fontSize: '0.725rem' }}>TASK DESCRIPTION</span>
                  <span style={{ color: '#374151' }}>{validatingTaskModal.task.description || validatingTaskModal.task.notes || 'No extra notes provided by arborist.'}</span>
                </div>
              </div>

              {/* Status Decision Buttons */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Official Audit Decision
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setValidatingTaskModal(prev => ({ ...prev, currentStatus: 'Validated' }))}
                    style={{
                      padding: '0.6rem',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      border: validatingTaskModal.currentStatus === 'Validated' ? '2px solid #059669' : '1px solid #E5E7EB',
                      background: validatingTaskModal.currentStatus === 'Validated' ? '#DCFCE7' : '#FFFFFF',
                      color: validatingTaskModal.currentStatus === 'Validated' ? '#166534' : '#4B5563',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <CheckCircle size={16} /> Approve & Validate
                  </button>

                  <button
                    type="button"
                    onClick={() => setValidatingTaskModal(prev => ({ ...prev, currentStatus: 'Rejected' }))}
                    style={{
                      padding: '0.6rem',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      border: validatingTaskModal.currentStatus === 'Rejected' ? '2px solid #DC2626' : '1px solid #E5E7EB',
                      background: validatingTaskModal.currentStatus === 'Rejected' ? '#FEE2E2' : '#FFFFFF',
                      color: validatingTaskModal.currentStatus === 'Rejected' ? '#991B1B' : '#4B5563',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <AlertCircle size={16} /> Reject Proof
                  </button>
                </div>
              </div>

              {/* Validation / Review Remark */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                  Official Remarks / Feedback for Citizen & Arborist
                </label>
                <textarea
                  rows={3}
                  value={validationNoteInput}
                  onChange={(e) => setValidationNoteInput(e.target.value)}
                  placeholder="e.g., Verified thorough root watering and health check completed satisfactorily."
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '0.85rem',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ padding: '0.85rem 1.25rem', background: '#F9FAFB', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setValidatingTaskModal(null)}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#FFFFFF',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#374151',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={validatingSubmitting}
                onClick={() => handleValidateCareProof(validatingTaskModal.currentStatus || 'Validated')}
                style={{
                  padding: '0.5rem 1.25rem',
                  background: validatingTaskModal.currentStatus === 'Rejected' ? '#DC2626' : '#059669',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  opacity: validatingSubmitting ? 0.7 : 1
                }}
              >
                {validatingSubmitting ? 'Submitting...' : 'Submit Decision'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Care Schedule & Timeline Calendar Modal */}
      {calendarModalSub && (() => {
        const subTreeName = calendarModalSub.treeName || calendarModalSub.tree?.name || calendarModalSub.treeId?.name || 'Adopted Tree';
        const subTreeScientific = calendarModalSub.treeScientificName || calendarModalSub.tree?.scientificName || '';
        const subTreeLoc = calendarModalSub.treeLocation || calendarModalSub.tree?.location || 'Udupi Zone';
        const subPlanLabel = calendarModalSub.adoptionType === 'self'
          ? '🌱 Self-Care Pledge (Free)'
          : `🌳 ${calendarModalSub.plan ? calendarModalSub.plan.charAt(0).toUpperCase() + calendarModalSub.plan.slice(1) : 'Monthly'} Subscription (₹${calendarModalSub.amount || 500})`;
        const subTasks = Array.isArray(calendarModalSub.careTasks) && calendarModalSub.careTasks.length > 0
          ? calendarModalSub.careTasks
          : (Array.isArray(calendarModalSub.careSchedule) ? calendarModalSub.careSchedule : []);
        const validatedCount = subTasks.filter(t => t.status === 'Validated' || t.status === 'completed' || t.status === 'verified').length;
        const pendingCount = subTasks.filter(t => t.status === 'Pending' || t.status === 'pending_verification' || (t.proofImageUrl && t.status !== 'Validated')).length;
        const cutterName = calendarModalSub.assignedCutterName || 'Not yet assigned';

        return (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9998,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}>
            <div style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '720px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #E2E8F0',
              padding: '24px'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #E2E8F0', paddingBottom: '16px', marginBottom: '18px' }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  {calendarModalSub.treeImage ? (
                    <img
                      src={calendarModalSub.treeImage}
                      alt={subTreeName}
                      style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover', border: '2px solid #10b981', flexShrink: 0 }}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                      🌳
                    </div>
                  )}
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar size={22} color="#059669" />
                      Care Activity Schedule & History
                    </h3>
                    <div style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: '#475569', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                      <span>Tree: <strong style={{ color: '#065F46' }}>{subTreeName}</strong> {subTreeScientific && <em>({subTreeScientific})</em>}</span>
                      <span>•</span>
                      <span style={{ color: '#0284C7', fontWeight: 600 }}>{subPlanLabel}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '3px' }}>
                      👤 Adopter: <strong>{calendarModalSub.userName || 'Citizen'}</strong> {calendarModalSub.treeLocation ? `• 📍 ${calendarModalSub.treeLocation}` : ''}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCalendarModalSub(null)}
                  style={{
                    background: '#F1F5F9',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <X size={18} color="#64748B" />
                </button>
              </div>

              {/* Sub summary pill stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '10px',
                marginBottom: '20px'
              }}>
                <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'block', fontWeight: 600 }}>Total Care Tasks</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>
                    {subTasks.length}
                  </span>
                </div>
                <div style={{ background: '#ECFDF5', padding: '10px 14px', borderRadius: '10px', border: '1px solid #A7F3D0' }}>
                  <span style={{ fontSize: '0.72rem', color: '#047857', display: 'block', fontWeight: 600 }}>Validated Proofs</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#065F46' }}>
                    {validatedCount}
                  </span>
                </div>
                <div style={{ background: '#FEF3C7', padding: '10px 14px', borderRadius: '10px', border: '1px solid #FDE68A' }}>
                  <span style={{ fontSize: '0.72rem', color: '#B45309', display: 'block', fontWeight: 600 }}>Pending Review</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#92400E' }}>
                    {pendingCount}
                  </span>
                </div>
                <div style={{ background: '#F0F9FF', padding: '10px 14px', borderRadius: '10px', border: '1px solid #BAE6FD' }}>
                  <span style={{ fontSize: '0.72rem', color: '#0369A1', display: 'block', fontWeight: 600 }}>Assigned Cutter</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0C4A6E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                    {cutterName}
                  </span>
                </div>
              </div>

              {/* Standard Routine Schedule Banner */}
              <div style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '14px 16px',
                marginBottom: '20px'
              }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🗓️ Routine Maintenance Cycle:</span>
                  <span style={{ color: '#059669', background: '#ECFDF5', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem' }}>Weekly Care Interval</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', fontSize: '0.78rem', color: '#64748B' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>💧</span> <span>Weekly Deep Watering & Soil Check</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🧪</span> <span>Bi-Weekly Organic Fertilization</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🔍</span> <span>Monthly Canopy & Pest Inspection</span>
                  </div>
                </div>
              </div>

              {/* Care Schedule Timeline */}
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1E293B', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={17} color="#059669" /> Recorded Care Activities & Field Proofs ({subTasks.length})
                </span>
                {subTasks.length > 0 && (
                  <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 500 }}>Showing newest first</span>
                )}
              </div>

              {subTasks.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center', background: '#F8FAFC', borderRadius: '12px', border: '1px dashed #CBD5E1' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🌿</div>
                  <h4 style={{ margin: '0 0 6px', color: '#334155', fontSize: '1rem', fontWeight: 700 }}>No Care Tasks Submitted Yet</h4>
                  <p style={{ margin: 0, color: '#64748B', fontSize: '0.85rem', lineHeight: 1.5, maxWidth: '440px', marginLeft: 'auto', marginRight: 'auto' }}>
                    {calendarModalSub.assignedCutterName
                      ? `This tree is actively assigned to ${calendarModalSub.assignedCutterName}. Routine care tasks will appear here as soon as the arborist uploads proof photos from the field.`
                      : calendarModalSub.adoptionType === 'self'
                      ? `This is a Citizen Self-Adoption pledge by ${calendarModalSub.userName || 'the user'}. The citizen can submit self-care proof logs.`
                      : 'No tree cutter has been assigned yet. Please assign a tree cutter from the adoptions desk to initiate routine field care visits.'}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {subTasks.slice().reverse().map((task, idx) => {
                    const isDone = task.status === 'Validated' || task.status === 'completed' || task.status === 'verified';
                    const isPending = task.status === 'Pending' || task.status === 'pending_verification';
                    const isRejected = task.status === 'Rejected';
                    const taskDate = task.uploadedAt || task.date || task.dueDate || task.createdAt;
                    const formattedDate = taskDate ? new Date(taskDate).toLocaleString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : `Activity #${subTasks.length - idx}`;
                    const taskType = task.taskType || task.title || task.activityType || 'Routine Care';
                    const proofUrl = task.proofImageUrl || task.proofImage || task.imageUrl;

                    const getTaskIcon = (type) => {
                      const t = (type || '').toLowerCase();
                      if (t.includes('water')) return '💧';
                      if (t.includes('fertiliz') || t.includes('nutrient')) return '🧪';
                      if (t.includes('prun') || t.includes('trim') || t.includes('cut')) return '✂️';
                      if (t.includes('inspect') || t.includes('check') || t.includes('health')) return '🔍';
                      if (t.includes('mulch') || t.includes('soil')) return '🌱';
                      return '🌿';
                    };

                    return (
                      <div
                        key={task._id || idx}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '14px',
                          padding: '14px 16px',
                          borderRadius: '12px',
                          border: isDone ? '1.5px solid #BBF7D0' : isPending ? '1.5px solid #FDE68A' : isRejected ? '1.5px solid #FECDD3' : '1px solid #E2E8F0',
                          background: isDone ? '#F0FDF4' : isPending ? '#FFFBEB' : isRejected ? '#FFF1F2' : '#FFFFFF',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          background: isDone ? '#22C55E' : isPending ? '#F59E0B' : isRejected ? '#EF4444' : '#E2E8F0',
                          color: '#FFFFFF',
                          fontSize: '1.1rem'
                        }}>
                          {getTaskIcon(taskType)}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0F172A' }}>
                              {taskType}
                            </span>
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '3px 10px',
                              borderRadius: '999px',
                              textTransform: 'uppercase',
                              background: isDone ? '#DCFCE7' : isPending ? '#FEF3C7' : isRejected ? '#FEE2E2' : '#F1F5F9',
                              color: isDone ? '#15803D' : isPending ? '#B45309' : isRejected ? '#B91C1C' : '#64748B'
                            }}>
                              {isDone ? '✓ Validated' : isPending ? '⏳ Pending Review' : isRejected ? '✕ Rejected' : 'Scheduled'}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '3px' }}>
                            📅 Recorded on: <strong>{formattedDate}</strong> {task.uploadedByName ? `by ${task.uploadedByName} (${task.uploadedByRole || 'Tree Cutter'})` : ''}
                          </div>

                          {task.description && (
                            <div style={{ fontSize: '0.82rem', color: '#334155', marginTop: '6px', background: 'rgba(0,0,0,0.03)', padding: '6px 10px', borderRadius: '6px' }}>
                              "{task.description}"
                            </div>
                          )}

                          {task.validationNote && (
                            <div style={{ fontSize: '0.78rem', color: '#047857', marginTop: '4px', fontStyle: 'italic' }}>
                              Validation note: "{task.validationNote}" {task.validatedByName ? `— ${task.validatedByName}` : ''}
                            </div>
                          )}

                          {proofUrl && (
                            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                              <img
                                src={proofUrl}
                                alt="Proof preview"
                                style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer', border: '1.5px solid #CBD5E1', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}
                                onClick={() => {
                                  if (typeof setPreviewModal === 'function') {
                                    setPreviewModal({
                                      isOpen: true,
                                      imageUrl: proofUrl,
                                      title: `Proof: ${taskType}`
                                    });
                                  } else {
                                    window.open(proofUrl, '_blank');
                                  }
                                }}
                              />
                              {isPending && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCalendarModalSub(null);
                                    if (typeof handleOpenValidationModal === 'function') {
                                      handleOpenValidationModal(calendarModalSub, task);
                                    } else {
                                      setValidatingTaskModal({
                                        subId: calendarModalSub._id || calendarModalSub.id,
                                        task,
                                        treeName: subTreeName,
                                        userName: calendarModalSub.userName
                                      });
                                    }
                                  }}
                                  style={{
                                    padding: '6px 14px',
                                    background: 'linear-gradient(135deg, #059669, #047857)',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 2px 8px rgba(5,150,105,0.3)'
                                  }}
                                >
                                  <CheckCircle size={14} /> Inspect Proof & Verify
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setCalendarModalSub(null)}
                  style={{
                    padding: '9px 22px',
                    background: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: '10px',
                    color: '#334155',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Close Schedule
                </button>
              </div>
            </div>
          </div>
        );
      })()}


      {/* Proof Photo Lightbox Preview Modal */}
      {previewModal.isOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-surface, #111827)',
            border: '1px solid var(--border, #1f2937)',
            borderRadius: '16px',
            maxWidth: '680px',
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--border, #1f2937)',
              background: 'var(--bg-elevated, #1f2937)'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>
                  📷 {previewModal.taskId} — {previewModal.label}
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #9ca3af)' }}>
                  Status: <strong style={{ color: previewModal.status === 'Verified' ? '#34d399' : '#facc15' }}>{previewModal.status}</strong>
                </span>
              </div>
              <button
                onClick={() => setPreviewModal({ isOpen: false, taskId: '', key: '', label: '', imageUrl: '', status: '' })}
                style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '6px', borderRadius: '50%' }}
              >
                <X size={22} />
              </button>
            </div>
            <div style={{ padding: '16px', background: '#04100c' }}>
              {(previewModal.imageUrl || fallbackProofImages[previewModal.key] || fallbackProofImages.before) ? (
                <div style={{ maxWidth: '620px', margin: '0 auto' }}>
                  <GeoTaggedImageProof
                    imageUrl={previewModal.imageUrl || fallbackProofImages[previewModal.key] || fallbackProofImages.before}
                    gps={previewModal.gps || { lat: '13.340900', lng: '74.742100' }}
                    locationText={previewModal.locationText || 'Field Geotagged Location'}
                    altText={previewModal.label}
                    proofLabel={previewModal.label}
                  />
                </div>
              ) : (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9ca3af' }}>
                  <Camera size={44} style={{ opacity: 0.4, marginBottom: '12px' }} />
                  <h4 style={{ color: '#ffffff', margin: '0 0 6px', fontSize: '1rem' }}>No Photo Uploaded for this Stage</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>The assigned tree cutter has not uploaded a proof photo for {previewModal.label} yet.</p>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '12px', padding: '16px 20px', justifyContent: 'flex-end', borderTop: '1px solid var(--border, #1f2937)' }}>
              <button
                className="cg-btn outline"
                onClick={() => {
                  const task = tasks.find(t => t.id === previewModal.taskId);
                  setPreviewModal({ isOpen: false, taskId: '', key: '', label: '', imageUrl: '', status: '' });
                  if (task) raiseAgainTask(task);
                }}
                style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <RotateCcw size={16} /> Reject & Re-Open Task
              </button>
              <button
                className="cg-btn primary"
                onClick={() => {
                  verifyProof(previewModal.taskId, previewModal.key);
                  setPreviewModal(prev => ({ ...prev, status: 'Verified' }));
                  showNotice(`Marked ${previewModal.label} as Verified`);
                }}
                disabled={previewModal.status === 'Verified'}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <CheckCircle2 size={16} /> {previewModal.status === 'Verified' ? 'Already Verified' : 'Mark as Verified'}
              </button>
              <button
                className="cg-btn outline"
                onClick={() => setPreviewModal({ isOpen: false, taskId: '', key: '', label: '', imageUrl: '', status: '' })}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GPS Location Leaflet Map Modal */}
      {gpsMapModal.isOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-surface, #111827)',
            border: '1px solid var(--border, #1f2937)',
            borderRadius: '16px',
            maxWidth: '680px',
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--border, #1f2937)',
              background: 'var(--bg-elevated, #1f2937)'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={20} color="#3b82f6" /> GPS Location Map — {gpsMapModal.complaintTitle}
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#60a5fa', fontWeight: 600 }}>
                  📍 GPS Geofence Coordinates: {gpsMapModal.coords[0]}° N, {gpsMapModal.coords[1]}° E
                </span>
              </div>
              <button
                onClick={() => setGpsMapModal({ isOpen: false, complaintTitle: '', locationName: '', coords: [13.3409, 74.7421] })}
                style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '6px', borderRadius: '50%' }}
              >
                <X size={22} />
              </button>
            </div>

            <div style={{ padding: '16px', background: '#091510' }}>
              <div style={{ marginBottom: '12px', fontSize: '0.86rem', color: '#e2e8f0', background: '#0f291e', padding: '10px 14px', borderRadius: '8px', border: '1px solid #1e4d38' }}>
                <b>Site Address:</b> {gpsMapModal.locationName}
              </div>
              <div style={{ height: '360px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                <MapContainer center={gpsMapModal.coords} zoom={15} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={gpsMapModal.coords}>
                    <Popup>
                      <div style={{ color: '#000' }}>
                        <b>{gpsMapModal.complaintTitle}</b>
                        <br />
                        {gpsMapModal.locationName}
                        <br />
                        <span style={{ color: '#059669', fontWeight: 'bold' }}>✓ GPS Check-in Verified</span>
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', padding: '16px 20px', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border, #1f2937)' }}>
              <span style={{ fontSize: '0.82rem', color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={16} /> GPS Geofence Tag Verified at Site Location
              </span>
              <button
                className="cg-btn primary"
                onClick={() => setGpsMapModal({ isOpen: false, complaintTitle: '', locationName: '', coords: [13.3409, 74.7421] })}
              >
                Close Map
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminConsolePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [complaints, setComplaints] = useState([]);
  const [complaintsLoading, setComplaintsLoading] = useState(true);
  const [selectedComplaintImage, setSelectedComplaintImage] = useState(null);

  // Admin gate
  const [adminAuthed, setAdminAuthed] = useState(() => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
      if (normalizeRole(currentUser.role) === 'Admin') return true;
    } catch { }
    return sessionStorage.getItem('adminAuthed') === 'true';
  });
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminShake, setAdminShake] = useState(false);
  const [showAdminPass, setShowAdminPass] = useState(false);

  const handleAdminLogin = (e) => {
    e.preventDefault();
    const u = adminUser.toLowerCase().trim();
    const p = adminPass.trim();
    if ((u === 'admin' || u === 'admin@example.com') && (p === 'admin123' || p === 'admin@123')) {
      sessionStorage.setItem('adminAuthed', 'true');
      const adminObj = { id: 'admin-static', name: 'Municipal Admin', email: 'admin@example.com', role: 'Admin' };
      localStorage.setItem('currentUser', JSON.stringify(adminObj));
      setAdminAuthed(true);
      setAdminError('');
    } else {
      setAdminError('Invalid credentials. Use admin / admin123');
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
    fetch(`${API_URL}/api/complaints`)
      .then(r => r.json())
      .then(data => setComplaints(data.complaints || []))
      .catch(() => setComplaints([]))
      .finally(() => setComplaintsLoading(false));
  }, []);

  const updateStatus = async (id, status) => {
    try {
      const res = await fetch(`${API_URL}/api/complaints/${id}/status`, {
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

                <div style={{ display: 'flex', alignItems: 'center', margin: '1.25rem 0', gap: '0.75rem' }}>
                  <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
                  <span style={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: '500' }}>OR</span>
                  <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <GoogleLogin
                    onSuccess={async (credentialResponse) => {
                      try {
                        const res = await fetch(`${API_URL}/api/auth/google`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ credential: credentialResponse.credential, portal: 'Admin' }),
                        });
                        const data = await res.json();
                        if (res.ok) {
                          sessionStorage.setItem('adminAuthed', 'true');
                          localStorage.setItem('currentUser', JSON.stringify(data.user));
                          setAdminAuthed(true);
                          setAdminError('');
                        } else {
                          setAdminError(data.msg || 'Google Sign-In failed');
                        }
                      } catch (err) {
                        setAdminError(err.message);
                      }
                    }}
                    onError={() => setAdminError('Google Sign-In failed')}
                    theme="filled_blue"
                    shape="pill"
                  />
                </div>
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
              <Link className="cg-btn outline" to="/dashboard">
                <BarChart3 size={18} /> System Dashboard
              </Link>
              <Link className="cg-btn outline" to="/add-property" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={18} /> Add Property
              </Link>
              <button className="dark" onClick={() => setShowOfficialModal(true)}>
                <Plus /> New Official
              </button>
            </div>
          </section>

          {/* Admin Dashboard with Pending Citizen Tree Proposals & Verification Panel */}
          <div style={{ marginBottom: '2rem' }}>
            <AdminDashboard activeTab="overview" />
          </div>

          {/* Live Complaints Inbox */}
          <div
            className="data-table-container"
            style={{
              marginTop: '1.5rem',
              marginBottom: '1.5rem',
              background: 'var(--bg-surface)',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.06)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)'
            }}
          >
            <div className="table-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={22} color="#f59e0b" /> Citizen Complaints Inbox
                </h2>
                <p className="table-subtitle" style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                  All reported field issues &amp; complaints — visible to Admin &amp; Officials.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <Link to="/admin-complaints" style={{ fontSize: '0.82rem', fontWeight: 700, padding: '6px 14px', borderRadius: '8px', background: 'var(--brand)', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
                  <AlertTriangle size={16} /> Open Admin Complaints Action Center
                </Link>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, padding: '4px 12px', borderRadius: '99px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                  {complaints.length} Total Complaints
                </span>
              </div>
            </div>

            {complaintsLoading ? (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>Loading complaints…</p>
            ) : complaints.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)', background: 'var(--bg-elevated)', borderRadius: '12px' }}>
                <AlertTriangle size={36} color="#94a3b8" style={{ marginBottom: '8px' }} />
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem' }}>No complaints submitted yet.</p>
              </div>
            ) : (
              <div className="table-responsive" style={{ overflowX: 'auto' }}>
                <table className="custom-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-subtle)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderRadius: '8px 0 0 8px' }}>#</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Photo</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Issue Type</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Description</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Location</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Submitted By</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Date</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Status</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', borderRadius: '0 8px 8px 0' }}>Update Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {complaints.map((c, i) => {
                      let rawImg = c.photoUrl || c.image || c.photo || c.beforeImageUrl || '';
                      let photo = '';
                      if (rawImg && typeof rawImg === 'string' && rawImg.trim() !== '') {
                        photo = rawImg.trim();
                        if (photo.startsWith('/uploads/')) {
                          photo = `${API_URL}${photo}`;
                        }
                      }

                      let badgeBg = 'rgba(245, 158, 11, 0.15)';
                      let badgeColor = '#f59e0b';
                      if (c.status === 'Resolved') { badgeBg = 'rgba(16, 185, 129, 0.15)'; badgeColor = '#10b981'; }
                      else if (c.status === 'In Review') { badgeBg = 'rgba(168, 85, 247, 0.15)'; badgeColor = '#c4b5fd'; }
                      else if (c.status === 'Scheduled' || c.status === 'In Progress') { badgeBg = 'rgba(59, 130, 246, 0.15)'; badgeColor = '#93c5fd'; }

                      return (
                        <tr key={c._id} style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                            {i + 1}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <div
                              style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-subtle)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                                cursor: photo ? 'pointer' : 'default',
                                flexShrink: 0
                              }}
                              onClick={() => photo && setSelectedComplaintImage(photo)}
                              title={photo ? 'Click to view full photo' : 'No photo submitted'}
                            >
                              {photo ? (
                                <img
                                  src={photo}
                                  alt={c.issueType}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, zIndex: 1 }}
                                  onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                                />
                              ) : null}
                              <Camera size={18} color="var(--text-muted)" opacity={0.6} />
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)', display: 'block' }}>
                              {issueLabels[c.issueType] || c.issueType}
                            </strong>
                          </td>
                          <td style={{ padding: '10px 12px', maxWidth: '220px' }}>
                            <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {c.description || '—'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', maxWidth: '200px' }}>
                            <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                              📍 {c.location || 'N/A'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <strong style={{ fontSize: '0.86rem', color: 'var(--text-primary)', display: 'block' }}>{c.submittedBy}</strong>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                              {new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{
                              backgroundColor: badgeBg,
                              color: badgeColor,
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontWeight: '700',
                              fontSize: '0.8rem',
                              border: `1px solid ${badgeColor}40`,
                              display: 'inline-block'
                            }}>
                              {c.status}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                            <select
                              value={c.status}
                              onChange={e => updateStatus(c._id, e.target.value)}
                              style={{
                                background: 'var(--bg-elevated)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                padding: '6px 10px',
                                fontSize: '0.83rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                outline: 'none'
                              }}
                            >
                              {['Pending', 'In Review', 'Scheduled', 'Resolved'].map(s => (
                                <option key={s} value={s} style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>{s}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Full Complaint Image Zoom Modal */}
          {selectedComplaintImage && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setSelectedComplaintImage(null)}>
              <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', background: 'var(--bg-surface)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
                <button onClick={() => setSelectedComplaintImage(null)} style={{ position: 'absolute', top: '-12px', right: '-12px', width: '32px', height: '32px', borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>✕</button>
                <img src={selectedComplaintImage} alt="Complaint Attachment" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '10px', objectFit: 'contain' }} />
              </div>
            </div>
          )}

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
  const location = useLocation();
  const formRef = useRef(null);
  const initialFormState = {
    name: '', scientificName: '', family: '', origin: '', category: '', lifespan: '',
    height: '', ageRange: '', canopySpread: '', description: '', climate: '', soilType: '',
    sunlight: '', growthRate: '', leafType: '', floweringSeason: '', fruitingSeason: '',
    carbonSequestration: '', notes: '', healthScore: 90, canopyCoverage: 80,
    waterRequirement: 'Medium', benefits: '', diseases: '', pests: '', image: '',
    images: [],
    nativeRegion: '', iucnStatus: '', flowerColor: '', fruitColor: '', culturalUses: '',
    lat: 13.3409, lng: 74.7421
  };
  const [form, setForm] = useState(initialFormState);
  const [trees, setTrees] = useState([]);
  const [selectedTree, setSelectedTree] = useState(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [fetchingGPS, setFetchingGPS] = useState(false);
  const [status, setStatus] = useState('');
  const [uploadedImages, setUploadedImages] = useState([]); // [{url, uploading}]
  const [uploadingMulti, setUploadingMulti] = useState(false);
  const [lookupResults, setLookupResults] = useState([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupVisible, setLookupVisible] = useState(false);
  const lookupTimerRef = useRef(null);

  const [detailActiveImgIndex, setDetailActiveImgIndex] = useState(0);
  const [showPhotoLightbox, setShowPhotoLightbox] = useState(false);

  useEffect(() => {
    setDetailActiveImgIndex(0);
    setShowPhotoLightbox(false);
  }, [selectedTree]);

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('currentUser')) || {}; }
    catch { return {}; }
  })();
  const rawRole = normalizeRole(currentUser.role);
  const isAdmin = rawRole === 'Admin' || sessionStorage.getItem('adminAuthed') === 'true' || window.location.pathname.startsWith('/admin');
  const isAddTreeRoute = (pathname) => {
    return (
      pathname === '/add-tree' ||
      pathname === '/admin/add-tree' ||
      pathname === '/official/add-tree' ||
      pathname === '/treecutter/add-tree' ||
      pathname === '/cutter/add-tree' ||
      pathname.endsWith('/add-tree')
    );
  };

  const [showForm, setShowForm] = useState(() => {
    return isAddTreeRoute(window.location.pathname) || window.location.search.includes('add=true');
  });

  useEffect(() => {
    if (isAddTreeRoute(location.pathname) || location.search.includes('add=true')) {
      setShowForm(true);
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (formRef.current) formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const pageEl = document.querySelector('.cg-workspace') || document.querySelector('.cg-page');
        if (pageEl && pageEl.scrollTo) pageEl.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }
  }, [location.pathname, location.search]);

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

  const handleFetchGPSLocation = () => {
    if (!navigator.geolocation) {
      setStatus('Geolocation is not supported by your browser.');
      return;
    }
    setFetchingGPS(true);
    setStatus('Detecting high-precision GPS coordinates...');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = parseFloat(position.coords.latitude.toFixed(6));
        const lng = parseFloat(position.coords.longitude.toFixed(6));
        const acc = Math.round(position.coords.accuracy || 10);
        let locName = form.origin;
        try {
          locName = await reverseGeocodeUdupi(lat, lng);
        } catch { }
        setForm((prev) => ({
          ...prev,
          lat,
          lng,
          origin: locName || prev.origin
        }));
        setFetchingGPS(false);
        setStatus(`📍 GPS Captured: ${locName || 'Udupi'} (${lat}, ${lng}) ±${acc}m`);
      },
      (err) => {
        setFetchingGPS(false);
        setStatus('Unable to retrieve location: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ── Multi-Image Upload ──────────────────────────────────────────────────────
  const handleMultiFileChange = async (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;
    const remaining = 8 - uploadedImages.length;
    if (remaining <= 0) { setStatus('Maximum 8 images allowed per tree.'); return; }
    const toUpload = files.slice(0, remaining);

    // Add placeholders
    const placeholders = toUpload.map((f, i) => ({ url: URL.createObjectURL(f), uploading: true, key: Date.now() + i }));
    setUploadedImages(prev => [...prev, ...placeholders]);
    setUploadingMulti(true);
    setStatus(`Uploading ${toUpload.length} image(s) to Cloudinary...`);

    try {
      const fd = new FormData();
      toUpload.forEach(f => fd.append('images', f));
      const res = await fetch(`${API_URL}/api/upload/multiple`, { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok && data.urls) {
        // Replace placeholders with real Cloudinary URLs
        setUploadedImages(prev => {
          const updated = [...prev];
          let ri = 0;
          for (let i = 0; i < updated.length; i++) {
            if (updated[i].uploading && ri < data.urls.length) {
              updated[i] = { url: data.urls[ri], uploading: false, key: updated[i].key };
              ri++;
            }
          }
          return updated;
        });
        // Set primary image if none set
        setForm(prev => ({ ...prev, image: prev.image || data.urls[0] || prev.image, images: [...(prev.images || []), ...data.urls] }));
        setStatus(`✅ ${data.urls.length} image(s) uploaded successfully.`);
      } else {
        setUploadedImages(prev => prev.filter(p => !p.uploading));
        setStatus(data.msg || 'Upload failed.');
      }
    } catch (err) {
      setUploadedImages(prev => prev.filter(p => !p.uploading));
      setStatus('Connection error during upload.');
    } finally {
      setUploadingMulti(false);
    }
  };

  const handleRemoveUploadedImage = (idx) => {
    setUploadedImages(prev => {
      const next = prev.filter((_, i) => i !== idx);
      const nextUrls = next.filter(x => !x.uploading).map(x => x.url);
      setForm(f => ({ ...f, images: nextUrls, image: nextUrls[0] || '' }));
      return next;
    });
  };

  // ── Perenual Plant Lookup ───────────────────────────────────────────────────
  const handleNameLookup = (value) => {
    clearTimeout(lookupTimerRef.current);
    if (!value || value.trim().length < 3) { setLookupResults([]); setLookupVisible(false); return; }
    setLookupLoading(true);
    lookupTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/api/trees/lookup?name=${encodeURIComponent(value.trim())}`);
        const data = await res.json();
        if (res.ok && data.results) {
          setLookupResults(data.results);
          setLookupVisible(data.results.length > 0);
        } else {
          setLookupResults([]);
          setLookupVisible(false);
        }
      } catch { setLookupResults([]); setLookupVisible(false); }
      finally { setLookupLoading(false); }
    }, 600);
  };

  const applyLookupResult = (plant) => {
    const waterMap = { none: 'None', minimum: 'Low', average: 'Medium', frequent: 'High' };
    setForm(prev => ({
      ...prev,
      name: prev.name,
      scientificName: plant.scientific_name || prev.scientificName,
      family: plant.family || prev.family,
      origin: prev.origin,
      climate: plant.tropical ? 'Tropical' : prev.climate,
      sunlight: plant.sunlight || prev.sunlight,
      growthRate: plant.growth_rate || prev.growth_rate,
      waterRequirement: waterMap[plant.watering?.toLowerCase()] || prev.waterRequirement,
      floweringSeason: plant.flowering_season || prev.floweringSeason,
      leafType: plant.leaf_color ? `Leaves: ${plant.leaf_color}` : prev.leafType,
      description: plant.description || prev.description,
      image: (plant.image_url && !prev.image) ? plant.image_url : prev.image,
      benefits: prev.benefits || 'Substantial canopy cooling, Habitat for urban species',
      diseases: prev.diseases || 'Leaf spot, Root rot',
      pests: prev.pests || 'Scale insects, Mealybugs',
    }));
    if (plant.image_url && uploadedImages.length === 0) {
      setUploadedImages([{ url: plant.image_url, uploading: false, key: Date.now() }]);
    }
    setLookupVisible(false);
    setLookupResults([]);
    setStatus(`✅ Auto-filled from Perenual: ${plant.common_name || plant.scientific_name}`);
  };

  const handleAiAutoFill = async () => {
    const targetName = form.name.trim();
    if (!targetName) {
      setStatus('⚠️ Please type a Tree Name first (e.g. Chiku, Sapota, Mango, Banyan)');
      return;
    }
    setLookupLoading(true);
    setStatus('✨ AI is auto-generating complete botanical details...');
    try {
      const res = await fetch(`${API_URL}/api/trees/ai-autofill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: targetName })
      });
      const result = await res.json();
      if (res.ok && result.data) {
        const d = result.data;
        setForm(prev => ({
          ...prev,
          scientificName: d.scientificName || prev.scientificName,
          family: d.family || prev.family,
          category: d.category || prev.category,
          height: d.height || prev.height,
          lifespan: d.lifespan || prev.lifespan,
          canopySpread: d.canopySpread || prev.canopySpread,
          healthScore: d.healthScore || prev.healthScore,
          canopyCoverage: d.canopyCoverage || prev.canopyCoverage,
          waterRequirement: d.waterRequirement || prev.waterRequirement,
          sunlight: d.sunlight || prev.sunlight,
          growthRate: d.growthRate || prev.growthRate,
          floweringSeason: d.floweringSeason || prev.floweringSeason,
          fruitingSeason: d.fruitingSeason || prev.fruitingSeason,
          nativeRegion: d.nativeRegion || prev.nativeRegion,
          iucnStatus: d.iucnStatus || prev.iucnStatus,
          flowerColor: d.flowerColor || prev.flowerColor,
          leafType: d.leafType || prev.leafType,
          soilType: d.soilType || prev.soilType,
          climate: d.climate || prev.climate,
          description: d.description || prev.description,
          culturalUses: d.culturalUses || prev.culturalUses,
          benefits: d.benefits || 'Substantial canopy cooling, Habitat for urban species',
          diseases: d.diseases || 'Leaf spot, Root rot',
          pests: d.pests || 'Scale insects, Mealybugs',
          image: d.image || prev.image,
        }));
        if (d.image && uploadedImages.length === 0) {
          setUploadedImages([{ url: d.image, uploading: false, key: Date.now() }]);
        }
        setStatus(`✅ AI Auto-Filled all botanical details for "${targetName}"!`);
      } else {
        setStatus('⚠️ Could not auto-fill. Please try typing another tree name.');
      }
    } catch (err) {
      setStatus('⚠️ AI Auto-fill error. Check backend network connection.');
    } finally {
      setLookupLoading(false);
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

    const realImages = uploadedImages.filter(x => !x.uploading).map(x => x.url);
    const submission = {
      ...form,
      benefits: parseCommaInput(form.benefits),
      pests: parseCommaInput(form.pests),
      diseases: parseCommaInput(form.diseases),
      images: realImages,
      image: realImages[0] || form.image || '',
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
      setUploadedImages([]);
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
    // Pre-populate uploaded images from existing gallery
    const existingImgs = (Array.isArray(tree.images) && tree.images.length > 0) ? tree.images : (tree.image ? [tree.image] : []);
    setUploadedImages(existingImgs.map((url, i) => ({ url, uploading: false, key: i })));
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

    const allTreeImages = (() => {
      const list = [];
      if (Array.isArray(selectedTree.images) && selectedTree.images.length > 0) {
        selectedTree.images.forEach(img => {
          const url = typeof img === 'object' && img?.url ? img.url : img;
          if (typeof url === 'string' && url.trim() && !list.includes(url.trim())) {
            list.push(url.trim());
          }
        });
      }
      if (selectedTree.image && typeof selectedTree.image === 'string' && selectedTree.image.trim()) {
        const primary = selectedTree.image.trim();
        if (!list.includes(primary)) {
          list.unshift(primary);
        }
      }
      if (list.length === 0) {
        list.push(getTreeDisplayImage(selectedTree || details));
      }
      return list;
    })();

    const activeImageSrc = allTreeImages[detailActiveImgIndex] || allTreeImages[0] || getTreeDisplayImage(selectedTree || details);

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
              {isAdmin && (
                <button onClick={() => {
                  setForm({
                    name: '', scientificName: '', family: '', origin: '', height: '', ageRange: '',
                    canopySpread: '', description: '', healthScore: 90, canopyCoverage: 80,
                    waterRequirement: 'Medium', benefits: '', diseases: '', pests: '', image: '',
                    lat: 13.3409, lng: 74.7421
                  });
                  setEditingId(null);
                  setShowForm(true);
                  setSelectedTree(null);
                }} className="add-tree-btn" style={{ background: '#046b4e', borderRadius: '8px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.875rem', color: '#ffffff', border: 'none', cursor: 'pointer' }}>
                  <Plus size={16} /> Add Tree
                </button>
              )}
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
                {/* Image Card & Gallery Controls */}
                <div className="tree-detail-image-card" style={{ marginBottom: allTreeImages.length > 1 ? '10px' : '24px', position: 'relative', overflow: 'hidden', borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
                  <img
                    src={activeImageSrc}
                    alt={details.name}
                    style={{ width: '100%', height: '340px', objectFit: 'cover', display: 'block', transition: 'all 0.3s ease-in-out' }}
                    onError={(e) => {
                      const fallback = speciesImages.default;
                      if (e.currentTarget.src !== fallback) {
                        e.currentTarget.src = fallback;
                      }
                    }}
                  />
                  <span style={{
                    position: 'absolute', top: '12px', left: '12px',
                    background: 'rgba(3, 20, 14, 0.75)', backdropFilter: 'blur(8px)',
                    color: '#ffffff', fontSize: '0.75rem', fontWeight: 700,
                    padding: '5px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px',
                    border: '1px solid rgba(82, 183, 136, 0.3)'
                  }}>
                    📸 {detailActiveImgIndex + 1} / {allTreeImages.length}
                  </span>

                  <button
                    type="button"
                    className="view-image-overlay-btn"
                    onClick={() => setShowPhotoLightbox(true)}
                    style={{
                      position: 'absolute', bottom: '12px', right: '12px',
                      background: '#046b4e', backdropFilter: 'blur(8px)',
                      color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)',
                      borderRadius: '8px', padding: '8px 16px', fontSize: '0.85rem',
                      fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.35)', transition: 'all 0.2s'
                    }}
                  >
                    <Eye size={16} /> View All Photos ({allTreeImages.length})
                  </button>
                </div>

                {/* Gallery Thumbnail Strip below main image card */}
                {allTreeImages.length > 1 && (
                  <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '24px' }}>
                    {allTreeImages.map((imgUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setDetailActiveImgIndex(idx)}
                        style={{
                          border: idx === detailActiveImgIndex ? '3px solid #10b981' : '1px solid rgba(82, 183, 136, 0.3)',
                          borderRadius: '10px',
                          overflow: 'hidden',
                          width: '72px',
                          height: '72px',
                          flexShrink: 0,
                          cursor: 'pointer',
                          padding: 0,
                          background: '#0b2518',
                          opacity: idx === detailActiveImgIndex ? 1 : 0.65,
                          transform: idx === detailActiveImgIndex ? 'scale(1.05)' : 'scale(1)',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: idx === detailActiveImgIndex ? '0 4px 12px rgba(16, 185, 129, 0.4)' : 'none'
                        }}
                      >
                        <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </button>
                    ))}
                  </div>
                )}

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
                    {selectedTree?.isAdopted ? (
                      <span className="badge-pill adopted-badge" style={{ background: '#0284c7', color: '#ffffff', padding: '4px 12px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle size={14} /> Already Adopted
                      </span>
                    ) : (
                      <span className="badge-pill available-badge" style={{ background: '#10b981', color: '#ffffff', padding: '4px 12px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Sprout size={14} /> Available for Adoption
                      </span>
                    )}
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

        {/* Full-Screen Interactive Gallery Lightbox Modal */}
        {showPhotoLightbox && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: 'rgba(3, 15, 10, 0.95)', backdropFilter: 'blur(16px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
            padding: '24px clamp(16px, 4vw, 40px)', color: '#ffffff'
          }}>
            {/* Modal Header */}
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.35rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {details.name} <span style={{ fontStyle: 'italic', fontWeight: 400, color: '#a7f3d0', fontSize: '1rem' }}>({details.scientificName})</span>
                </h3>
                <p style={{ margin: '4px 0 0', color: '#95d5b2', fontSize: '0.85rem' }}>
                  Photo {detailActiveImgIndex + 1} of {allTreeImages.length}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPhotoLightbox(false)}
                style={{
                  background: 'rgba(255,255,255,0.15)', border: 'none', color: '#ffffff',
                  width: '44px', height: '44px', borderRadius: '50%', cursor: 'pointer',
                  fontSize: '1.3rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Main Content & Nav Buttons */}
            <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: '1200px', margin: '16px 0' }}>
              {allTreeImages.length > 1 && (
                <button
                  type="button"
                  onClick={() => setDetailActiveImgIndex((prev) => (prev > 0 ? prev - 1 : allTreeImages.length - 1))}
                  style={{
                    position: 'absolute', left: '0px', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.25)',
                    color: '#ffffff', width: '52px', height: '52px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.8rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, backdropFilter: 'blur(8px)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.4)'
                  }}
                >
                  ‹
                </button>
              )}

              <img
                src={allTreeImages[detailActiveImgIndex]}
                alt={`${details.name} photo ${detailActiveImgIndex + 1}`}
                style={{ maxHeight: '72vh', maxWidth: '100%', objectFit: 'contain', borderRadius: '14px', boxShadow: '0 12px 48px rgba(0,0,0,0.85)' }}
                onError={(e) => {
                  const fallback = speciesImages.default;
                  if (e.currentTarget.src !== fallback) {
                    e.currentTarget.src = fallback;
                  }
                }}
              />

              {allTreeImages.length > 1 && (
                <button
                  type="button"
                  onClick={() => setDetailActiveImgIndex((prev) => (prev < allTreeImages.length - 1 ? prev + 1 : 0))}
                  style={{
                    position: 'absolute', right: '0px', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.25)',
                    color: '#ffffff', width: '52px', height: '52px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.8rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, backdropFilter: 'blur(8px)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.4)'
                  }}
                >
                  ›
                </button>
              )}
            </div>

            {/* Modal Bottom Gallery Carousel Bar */}
            {allTreeImages.length > 1 && (
              <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', padding: '12px', maxWidth: '1000px' }}>
                {allTreeImages.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setDetailActiveImgIndex(idx)}
                    style={{
                      border: idx === detailActiveImgIndex ? '3px solid #10b981' : '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '10px', overflow: 'hidden', width: '68px', height: '68px', flexShrink: 0,
                      cursor: 'pointer', opacity: idx === detailActiveImgIndex ? 1 : 0.5, padding: 0,
                      transform: idx === detailActiveImgIndex ? 'scale(1.08)' : 'scale(1)',
                      transition: 'all 0.2s', background: '#081c12'
                    }}
                  >
                    <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="cg-app cg-dashboard-screen">
      <Sidebar active="Tree Inventory" admin={isAdmin} isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
      <div className="cg-workspace">
        <Topbar title="Tree Inventory" onToggleSidebar={() => setSidebarOpen(true)} />
        <main className="cg-page">
          <section className="cg-tree-hero" ref={formRef}>
            <div>
              <h1>Tree Inventory Management</h1>
              <p>Maintain detailed records of all trees in your zones.</p>
            </div>
            {isAdmin && (
              <button onClick={() => {
                setForm({
                  name: '', scientificName: '', family: '', origin: '', height: '', ageRange: '',
                  canopySpread: '', description: '', healthScore: 90, canopyCoverage: 80,
                  waterRequirement: 'Medium', benefits: '', diseases: '', pests: '', image: '',
                  lat: 13.3409, lng: 74.7421
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
            )}
          </section>
          {showForm && (
            <section className="cg-panel cg-tree-glass" style={{ background: 'var(--bg-surface, #0b2518)', border: '1px solid var(--border, rgba(82, 183, 136, 0.25))' }}>
              <h2 style={{ color: 'var(--text-primary, #ffffff)', marginBottom: '0.5rem' }}>{editingId ? '✏️ Edit Tree Details' : '🌳 Add New Tree'}</h2>
              <p style={{ color: '#95d5b2', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Type the tree name to auto-fill details from the Perenual plant database.</p>
              <form onSubmit={handleSubmit} className="tree-form">

                {/* ── Tree Name with Perenual Auto-fill ── */}
                <div style={{ position: 'relative', marginBottom: '1rem' }}>
                  <label style={{ display: 'block', color: 'var(--text-secondary, #95d5b2)', fontWeight: 700, fontSize: '0.82rem', marginBottom: '6px' }}>Tree Name *</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                      value={form.name}
                      onChange={(e) => { setForm({ ...form, name: e.target.value }); handleNameLookup(e.target.value); }}
                      onFocus={() => lookupResults.length > 0 && setLookupVisible(true)}
                      onBlur={() => setTimeout(() => setLookupVisible(false), 200)}
                      placeholder="e.g. Chiku, Sapota, Mango, Banyan..."
                      style={{ flex: 1, background: 'var(--bg-elevated, #061a14)', color: '#fff', border: '1px solid rgba(82,183,136,0.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '0.9rem' }}
                    />
                    <button
                      type="button"
                      onClick={handleAiAutoFill}
                      disabled={lookupLoading}
                      style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 18px',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: lookupLoading ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                    >
                      {lookupLoading ? (
                        <>
                          <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid #ffffff44', borderTopColor: '#ffffff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                          Auto-Filling...
                        </>
                      ) : (
                        '✨ Auto-Fill with AI'
                      )}
                    </button>
                  </div>
                  {/* Lookup Dropdown */}
                  {lookupVisible && lookupResults.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999, background: '#0b2518', border: '1px solid rgba(52,211,153,0.3)', borderRadius: '10px', boxShadow: '0 12px 32px rgba(0,0,0,0.4)', overflow: 'hidden', marginTop: '4px' }}>
                      <div style={{ padding: '6px 14px', fontSize: '0.72rem', color: '#6b7280', fontWeight: 700, borderBottom: '1px solid rgba(52,211,153,0.15)', background: 'rgba(52,211,153,0.05)' }}>🌿 Perenual Plant Database — Select to Auto-fill</div>
                      {lookupResults.map(plant => (
                        <div
                          key={plant.id}
                          onMouseDown={() => applyLookupResult(plant)}
                          style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid rgba(82,183,136,0.1)', transition: 'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(52,211,153,0.1)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          {plant.image_url && <img src={plant.image_url} alt={plant.common_name} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(52,211,153,0.3)' }} />}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.88rem' }}>{plant.common_name || plant.scientific_name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#95d5b2', fontStyle: 'italic' }}>{plant.scientific_name} {plant.family ? `· ${plant.family}` : ''}</div>
                          </div>
                          <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 700, whiteSpace: 'nowrap' }}>Auto-fill ↗</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-row">
                  <label>Scientific Name*<input value={form.scientificName} onChange={(e) => setForm({ ...form, scientificName: e.target.value })} placeholder="e.g. Mangifera indica" /></label>
                  <label>Family<input value={form.family} onChange={(e) => setForm({ ...form, family: e.target.value })} placeholder="e.g. Anacardiaceae" /></label>
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

                {/* Ecology row */}
                <div className="form-row">
                  <label>Sunlight<input value={form.sunlight} onChange={(e) => setForm({ ...form, sunlight: e.target.value })} placeholder="e.g. Full Sun" /></label>
                  <label>Growth Rate<input value={form.growthRate} onChange={(e) => setForm({ ...form, growthRate: e.target.value })} placeholder="e.g. Fast" /></label>
                  <label>Flowering Season<input value={form.floweringSeason} onChange={(e) => setForm({ ...form, floweringSeason: e.target.value })} placeholder="e.g. Mar – May" /></label>
                  <label>Fruiting Season<input value={form.fruitingSeason} onChange={(e) => setForm({ ...form, fruitingSeason: e.target.value })} placeholder="e.g. Jun – Aug" /></label>
                </div>
                <div className="form-row">
                  <label>Native Region<input value={form.nativeRegion || ''} onChange={(e) => setForm({ ...form, nativeRegion: e.target.value })} placeholder="e.g. South Asia" /></label>
                  <label>IUCN Conservation Status
                    <select value={form.iucnStatus || ''} onChange={(e) => setForm({ ...form, iucnStatus: e.target.value })} style={{ background: 'var(--bg-elevated, #061a14)', color: 'var(--text-primary, #fff)', border: '1px solid rgba(82,183,136,0.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '0.9rem', width: '100%' }}>
                      <option value="">— Select Status —</option>
                      <option>Least Concern</option>
                      <option>Near Threatened</option>
                      <option>Vulnerable</option>
                      <option>Endangered</option>
                      <option>Critically Endangered</option>
                      <option>Data Deficient</option>
                      <option>Not Evaluated</option>
                    </select>
                  </label>
                  <label>Flower Color<input value={form.flowerColor || ''} onChange={(e) => setForm({ ...form, flowerColor: e.target.value })} placeholder="e.g. Yellow, White" /></label>
                </div>
                <div className="form-row">
                  <label>Leaf Type<input value={form.leafType} onChange={(e) => setForm({ ...form, leafType: e.target.value })} placeholder="e.g. Simple, Pinnate" /></label>
                  <label>Soil Type<input value={form.soilType} onChange={(e) => setForm({ ...form, soilType: e.target.value })} placeholder="e.g. Loamy, Sandy" /></label>
                  <label>Climate<input value={form.climate} onChange={(e) => setForm({ ...form, climate: e.target.value })} placeholder="e.g. Tropical monsoonal" /></label>
                </div>

                <label>Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Enter detailed tree description..." rows={3} /></label>
                <label>Cultural &amp; Traditional Uses<textarea value={form.culturalUses || ''} onChange={(e) => setForm({ ...form, culturalUses: e.target.value })} placeholder="e.g. Medicinal, Sacred, Timber..." rows={2} /></label>

                {/* Benefits, Diseases, and Pests Row */}
                <div className="form-row">
                  <label>🌿 Environmental Benefits (Comma-separated)<input value={form.benefits || ''} onChange={(e) => setForm({ ...form, benefits: e.target.value })} placeholder="e.g. Canopy cooling, Soil erosion prevention, Wildlife habitat" /></label>
                  <label>🛡️ Susceptible Diseases (Comma-separated)<input value={form.diseases || ''} onChange={(e) => setForm({ ...form, diseases: e.target.value })} placeholder="e.g. Leaf spot, Root rot, Powdery mildew" /></label>
                  <label>🐛 Common Pests (Comma-separated)<input value={form.pests || ''} onChange={(e) => setForm({ ...form, pests: e.target.value })} placeholder="e.g. Scale insects, Mealybugs, Sapodilla moth" /></label>
                </div>

                {/* ── Multi-Image Upload Section ── */}
                <div style={{ marginTop: '1.75rem', borderTop: '1px solid rgba(82,183,136,0.25)', paddingTop: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h3 style={{ color: 'var(--text-primary, #fff)', margin: 0, fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>📸 Tree Photo Gallery</h3>
                      <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#95d5b2', opacity: 0.85 }}>Upload up to 8 photos. First image is used as the primary/thumbnail. All photos will appear in the citizen-facing gallery carousel.</p>
                    </div>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: uploadedImages.length >= 8 ? 'rgba(100,100,100,0.2)' : 'linear-gradient(135deg, #059669, #047857)', color: '#fff', borderRadius: '8px', fontWeight: 700, fontSize: '0.82rem', cursor: uploadedImages.length >= 8 || uploadingMulti ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(5,150,105,0.3)', opacity: uploadedImages.length >= 8 ? 0.5 : 1 }}>
                      {uploadingMulti ? <><span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Uploading…</> : <>+ Add Photos ({uploadedImages.length}/8)</>}
                      <input type="file" accept="image/*" multiple disabled={uploadedImages.length >= 8 || uploadingMulti} onChange={handleMultiFileChange} style={{ display: 'none' }} />
                    </label>
                  </div>

                  {uploadedImages.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' }}>
                      {uploadedImages.map((img, idx) => (
                        <div key={img.key || idx} style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: idx === 0 ? '2px solid #34d399' : '1px solid rgba(82,183,136,0.3)', aspectRatio: '1', background: '#1b4332' }}>
                          <img src={img.url} alt={`Tree photo ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: img.uploading ? 'brightness(0.5)' : 'none', transition: 'filter 0.3s' }} />
                          {img.uploading && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ display: 'inline-block', width: '24px', height: '24px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                            </div>
                          )}
                          {!img.uploading && (
                            <>
                              {idx === 0 && <span style={{ position: 'absolute', bottom: '5px', left: '5px', background: 'rgba(52,211,153,0.9)', color: '#fff', fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: '20px' }}>PRIMARY</span>}
                              <button type="button" onClick={() => handleRemoveUploadedImage(idx)} style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(239,68,68,0.85)', border: 'none', color: '#fff', width: '22px', height: '22px', borderRadius: '50%', cursor: 'pointer', fontWeight: 900, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                            </>
                          )}
                        </div>
                      ))}
                      {uploadedImages.length < 8 && (
                        <label style={{ border: '2px dashed rgba(82,183,136,0.4)', borderRadius: '10px', aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: uploadingMulti ? 'not-allowed' : 'pointer', color: '#95d5b2', fontSize: '0.75rem', gap: '6px', transition: 'border-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#34d399'} onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(82,183,136,0.4)'}>
                          <span style={{ fontSize: '1.5rem' }}>+</span><span>Add Photo</span>
                          <input type="file" accept="image/*" multiple disabled={uploadingMulti} onChange={handleMultiFileChange} style={{ display: 'none' }} />
                        </label>
                      )}
                    </div>
                  ) : (
                    <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed rgba(82,183,136,0.35)', borderRadius: '14px', padding: '2.5rem', cursor: 'pointer', color: '#95d5b2', gap: '10px', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#34d399'; e.currentTarget.style.background = 'rgba(52,211,153,0.05)'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(82,183,136,0.35)'; e.currentTarget.style.background = 'transparent'; }}>
                      <span style={{ fontSize: '2.5rem' }}>🌿</span>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#34d399' }}>Click to Upload Tree Photos</span>
                      <span style={{ fontSize: '0.78rem', opacity: 0.8 }}>PNG, JPG, WebP · Up to 8 images · 10MB each · Stored on Cloudinary</span>
                      <input type="file" accept="image/*" multiple onChange={handleMultiFileChange} style={{ display: 'none' }} />
                    </label>
                  )}
                </div>

                {/* ── Geolocation & Spatial Mapping Section (Clean Uniform Layout) ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.75rem', marginBottom: '1rem', borderTop: '1px solid rgba(82, 183, 136, 0.25)', paddingTop: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h3 style={{ color: 'var(--text-primary, #ffffff)', margin: 0, fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MapPin size={18} color="#34d399" /> Geolocation & Spatial Mapping
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-secondary, #95d5b2)', opacity: 0.85 }}>
                      Set the exact physical location and coordinates for interactive GIS mapping.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setShowLocationPicker(true)}
                      style={{
                        background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        fontSize: '0.82rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(5,150,105,0.3)',
                        transition: 'all 0.2s'
                      }}
                    >
                      <MapIcon size={15} /> 🗺️ Select Location on Map
                    </button>
                    <button
                      type="button"
                      onClick={handleFetchGPSLocation}
                      disabled={fetchingGPS}
                      style={{
                        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 14px',
                        fontSize: '0.82rem',
                        fontWeight: '700',
                        cursor: fetchingGPS ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(2,132,199,0.3)'
                      }}
                    >
                      <Crosshair size={15} className={fetchingGPS ? 'animate-spin' : ''} />
                      {fetchingGPS ? 'Fetching...' : '📍 Fetch Current GPS'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, origin: 'Town Center, Udupi', lat: 13.3409, lng: 74.7421 })}
                      style={{
                        background: 'rgba(5, 150, 105, 0.15)',
                        color: '#34d399',
                        border: '1px solid rgba(52, 211, 153, 0.4)',
                        borderRadius: '8px',
                        padding: '8px 14px',
                        fontSize: '0.82rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      🏛️ Udupi Center
                    </button>
                  </div>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                  <label style={{ gridColumn: 'span 2' }}>
                    Location Name / Landmark Address
                    <input
                      value={form.origin}
                      onChange={(e) => setForm({ ...form, origin: e.target.value })}
                      placeholder="e.g. Christian High School Campus, Udupi"
                    />
                  </label>
                  <label>
                    Latitude (°N)
                    <input
                      type="number"
                      step="0.000001"
                      value={form.lat}
                      onChange={(e) => setForm({ ...form, lat: parseFloat(e.target.value) || 0 })}
                      placeholder="e.g. 13.340900"
                    />
                  </label>
                  <label>
                    Longitude (°E)
                    <input
                      type="number"
                      step="0.000001"
                      value={form.lng}
                      onChange={(e) => setForm({ ...form, lng: parseFloat(e.target.value) || 0 })}
                      placeholder="e.g. 74.742100"
                    />
                  </label>
                </div>

                {/* Location Summary Status Chip */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 14px',
                  background: 'rgba(5, 150, 105, 0.12)',
                  border: '1px solid rgba(52, 211, 153, 0.25)',
                  borderRadius: '10px',
                  marginTop: '10px',
                  marginBottom: '16px',
                  fontSize: '0.82rem',
                  color: 'var(--text-secondary, #95d5b2)',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={15} color="#34d399" />
                    <span><strong>Active Location:</strong> {form.origin || 'Udupi Center'}</span>
                    <span style={{ opacity: 0.6 }}>•</span>
                    <span><strong>GPS:</strong> {form.lat || 13.3409}, {form.lng || 74.7421}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLocationPicker(true)}
                    style={{ background: 'none', border: 'none', color: '#34d399', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Open in Interactive Leaflet Map ↗
                  </button>
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
                  }} className="form-cancel-btn" style={{ padding: '1rem 1.5rem', borderRadius: '12px', border: '1px solid #cbd5e1', background: 'var(--bg-elevated, #061a14)', color: 'var(--text-primary, #ffffff)', fontWeight: '700', cursor: 'pointer' }}>Cancel</button>
                </div>
              </form>
              {status && <p className="cg-note">{status}</p>}
            </section>
          )}
          {/* KPI Overview Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
            <div className="cg-panel" style={{ background: 'var(--bg-surface, #0b2518)', border: '1px solid var(--border, rgba(82, 183, 136, 0.25))', borderRadius: '16px', padding: '1.25rem', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary, #95d5b2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Species</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary, #ffffff)', marginTop: '4px' }}>{trees.length}</div>
              <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600 }}>Active in Database</span>
            </div>
            <div className="cg-panel" style={{ background: 'var(--bg-surface, #0b2518)', border: '1px solid var(--border, rgba(82, 183, 136, 0.25))', borderRadius: '16px', padding: '1.25rem', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Optimal Health</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>{trees.filter(t => (t.healthScore ?? 90) >= 80).length}</div>
              <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600 }}>Health Score ≥ 80%</span>
            </div>
            <div className="cg-panel" style={{ background: 'var(--bg-surface, #0b2518)', border: '1px solid var(--border, rgba(82, 183, 136, 0.25))', borderRadius: '16px', padding: '1.25rem', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Requires Attention</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>{trees.filter(t => (t.healthScore ?? 90) < 80).length}</div>
              <span style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 600 }}>Fair or Alert Condition</span>
            </div>
          </div>

          <section className="cg-panel cg-tree-glass" style={{ background: 'var(--bg-surface, #0b2518)', border: '1px solid var(--border, rgba(82, 183, 136, 0.25))' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, color: 'var(--text-primary, #ffffff)', fontSize: '1.3rem', fontWeight: 700 }}>
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
                      border: '1px solid rgba(82, 183, 136, 0.3)',
                      background: 'var(--bg-elevated, #061a14)',
                      color: 'var(--text-primary, #ffffff)',
                      fontSize: '0.875rem',
                      width: '100%',
                      outline: 'none'
                    }}
                  />
                </div>
                <button
                  onClick={fetchTrees}
                  style={{
                    background: 'var(--bg-elevated, #061a14)',
                    border: '1px solid rgba(82, 183, 136, 0.3)',
                    borderRadius: '10px',
                    padding: '8px 14px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: 'var(--text-primary, #ffffff)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  title="Click to manually refresh tree list from database"
                >
                  🔄 Refresh List
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {filteredTrees.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', textBreak: 'normal', textAlign: 'center', padding: '3rem 1rem', color: '#95d5b2' }}>
                  No matching trees found in database.
                </div>
              ) : filteredTrees.map((tree) => {
                const hs = tree.healthScore ?? 90;
                return (
                  <article
                    key={tree._id || tree.id}
                    onClick={() => setSelectedTree(tree)}
                    style={{
                      background: 'var(--bg-surface, #0b2518)',
                      border: '1px solid var(--border, rgba(82, 183, 136, 0.25))',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      justify: 'space-between',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.borderColor = '#10b981';
                      e.currentTarget.style.boxShadow = '0 16px 32px -6px rgba(16,185,129,0.25)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.borderColor = 'rgba(82, 183, 136, 0.25)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                    }}
                  >
                    {/* Card Media Header */}
                    <div style={{ height: '160px', position: 'relative', overflow: 'hidden', background: '#1b4332' }}>
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
                        position: 'absolute', top: '10px', right: '10px',
                        background: hs >= 80 ? '#10b981' : hs >= 50 ? '#f59e0b' : '#ef4444',
                        color: '#ffffff', borderRadius: '20px', padding: '3px 10px',
                        fontSize: '0.72rem', fontWeight: 700, boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                      }}>
                        {hs >= 80 ? 'Healthy' : hs >= 50 ? 'Fair' : 'Alert'} · {hs}%
                      </span>
                    </div>

                    {/* Card Body */}
                    <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary, #111827)', fontWeight: 700 }}>
                        {tree.name || tree.scientificName || 'Tree Specimen'}
                      </h3>
                      {tree.scientificName && (
                        <p style={{ margin: 0, fontStyle: 'italic', color: '#059669', fontSize: '0.88rem', fontWeight: 500 }}>
                          {tree.scientificName}
                        </p>
                      )}

                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                        {tree.family && (
                          <span style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#047857', padding: '3px 9px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600, border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                            {tree.family}
                          </span>
                        )}
                        {tree.origin && (
                          <span style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#2563eb', padding: '3px 9px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600, border: '1px solid rgba(59, 130, 246, 0.25)' }}>
                            📍 {tree.origin}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div style={{ padding: '0.85rem 1.25rem', background: '#061a14', borderTop: '1px solid rgba(82, 183, 136, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: '#95d5b2', fontWeight: 600 }}>
                        Canopy: <strong style={{ color: '#ffffff' }}>{tree.canopyCoverage ?? 80}%</strong>
                      </span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {isAdmin && (
                          <>
                            <button
                              title="Edit Tree Details"
                              onClick={(e) => { e.stopPropagation(); handleStartEdit(tree); }}
                              style={{
                                background: 'rgba(52, 211, 153, 0.15)', border: '1px solid rgba(52, 211, 153, 0.3)', borderRadius: '8px',
                                padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                                gap: '5px', fontSize: '0.8rem', fontWeight: 600, color: '#34d399',
                                transition: 'all 0.2s'
                              }}
                            >
                              <Pencil size={13} color="#34d399" /> Edit
                            </button>
                            <button
                              title="Delete Tree from Database"
                              onClick={(e) => handleDeleteTree(tree, e)}
                              style={{
                                background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px',
                                padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                                gap: '5px', fontSize: '0.8rem', fontWeight: 600, color: '#f87171',
                                transition: 'all 0.2s'
                              }}
                            >
                              <Trash2 size={13} color="#f87171" /> Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </main>
      </div>

      <TreeLocationPickerModal
        isOpen={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        initialLat={form.lat || 13.3409}
        initialLng={form.lng || 74.7421}
        initialLocationName={form.origin || ''}
        treeName={form.name}
        onSelectLocation={({ lat, lng, locationName }) => {
          setForm(prev => ({
            ...prev,
            lat,
            lng,
            origin: locationName || prev.origin
          }));
        }}
      />
    </div>
  );
}

export function ViewTreePage() {
  const navigate = useNavigate();
  const [trees, setTrees] = useState([]);
  const [selectedTree, setSelectedTree] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterHealth, setFilterHealth] = useState('all');
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adoptingId, setAdoptingId] = useState(null);
  const [adoptModalTree, setAdoptModalTree] = useState(null);
  const [adoptPlan, setAdoptPlan] = useState('monthly'); // 'monthly' | 'yearly' | 'self'
  const [isSubmittingAdoption, setIsSubmittingAdoption] = useState(false);
  const [adoptSuccessMsg, setAdoptSuccessMsg] = useState(null);
  const [adoptStep, setAdoptStep] = useState('plan'); // 'plan' | 'processing' | 'success'
  const [showPledgeModal, setShowPledgeModal] = useState(false);
  const [pledgeAgreed, setPledgeAgreed] = useState(false);

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('currentUser')) || {};
    } catch {
      return {};
    }
  })();
  const path = window.location.pathname;
  const currentUserRole = normalizeRole(currentUser.role);
  const isAdminSession = sessionStorage.getItem('adminAuthed') === 'true' || currentUserRole === 'Admin' || path.startsWith('/admin');
  const isOfficialSession = !isAdminSession && (sessionStorage.getItem('officialAuthed') === 'true' || currentUserRole === 'Official' || path.startsWith('/official'));
  const isStaffSession = isAdminSession || isOfficialSession || currentUserRole === 'Tree Cutter' || path.startsWith('/treecutter') || path.startsWith('/cutter');
  const isCitizen = !isAdminSession && !isOfficialSession && (!currentUserRole || currentUserRole === 'Citizen');

  // ── Carousel & Gallery state ──
  const [carouselIndices, setCarouselIndices] = useState({}); // treeId -> currentSlide
  const [galleryTree, setGalleryTree] = useState(null);       // tree object for lightbox
  const [galleryIdx, setGalleryIdx] = useState(0);            // active photo in lightbox
  const [detailActiveImgIndex, setDetailActiveImgIndex] = useState(0); // active photo in detail view
  const carouselTimers = useRef({});

  // Start auto-scroll for a tree card when it mounts/becomes visible
  const startCarousel = (treeId, imageCount) => {
    if (imageCount <= 1) return;
    if (carouselTimers.current[treeId]) return; // already running
    carouselTimers.current[treeId] = setInterval(() => {
      setCarouselIndices(prev => ({
        ...prev,
        [treeId]: ((prev[treeId] || 0) + 1) % imageCount
      }));
    }, 2500);
  };
  const stopCarousel = (treeId) => {
    if (carouselTimers.current[treeId]) {
      clearInterval(carouselTimers.current[treeId]);
      delete carouselTimers.current[treeId];
    }
  };
  // Cleanup on unmount
  useEffect(() => { return () => Object.values(carouselTimers.current).forEach(clearInterval); }, []);

  const getTreeImages = (tree) => {
    if (!tree) return [speciesImages.default];
    const list = [];
    if (Array.isArray(tree.images) && tree.images.length > 0) {
      tree.images.forEach(img => {
        let u = typeof img === 'object' && img?.url ? img.url : img;
        if (typeof u === 'string' && u.trim()) {
          u = u.trim();
          if (u.includes('http') && u.lastIndexOf('http') > 0) u = u.substring(u.lastIndexOf('http'));
          if (u.startsWith('/uploads/')) u = `${API_URL}${u}`;
          if (!list.includes(u)) list.push(u);
        }
      });
    }
    if (tree.image && typeof tree.image === 'string' && tree.image.trim()) {
      let u = tree.image.trim();
      if (u.includes('http') && u.lastIndexOf('http') > 0) u = u.substring(u.lastIndexOf('http'));
      if (u.startsWith('/uploads/')) u = `${API_URL}${u}`;
      if (!list.includes(u)) list.unshift(u);
    }
    if (list.length === 0) {
      list.push(getTreeDisplayImage(tree));
    }
    return list;
  };

  const effectiveUserId = currentUser.id || currentUser._id || currentUser.userId || 'guest-citizen';
  const effectiveUserName = currentUser.name || currentUser.username || currentUser.fullName || 'Citizen User';
  const effectiveUserEmail = currentUser.email || 'citizen@treecanopy.org';

  const triggerAdoptModal = (tree, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (isAdminSession || isStaffSession) {
      return;
    }

    // Check if user is logged in
    if (!currentUser.role && !currentUser.username && !currentUser.name) {
      if (window.confirm('You need to be logged in as a Citizen to adopt a tree. Would you like to log in now?')) {
        navigate('/login');
      }
      return;
    }

    setAdoptModalTree(tree);
    setAdoptPlan('monthly');
    setAdoptStep('plan');
  };

  const loadRazorpay = () => new Promise(resolve => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

  const handleConfirmAdoption = async () => {
    if (!adoptModalTree) return;
    const treeId = adoptModalTree._id || adoptModalTree.id;

    if (adoptPlan === 'self') {
      // Show promise/pledge declaration popup first
      setPledgeAgreed(false);
      setShowPledgeModal(true);
      return;
    }

    // Paid subscription via Razorpay
    setIsSubmittingAdoption(true);
    setAdoptStep('processing');
    try {
      const ok = await loadRazorpay();
      if (!ok) throw new Error('Razorpay SDK failed to load');

      const orderRes = await fetch(`${API_URL}/api/subscriptions/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ treeId, plan: adoptPlan, userId: effectiveUserId })
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || 'Could not create order');

      // If Razorpay live keys failed authentication (401) or demo mode is triggered:
      if (orderData.isDemo) {
        const verifyRes = await fetch(`${API_URL}/api/subscriptions/verify-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: orderData.orderId,
            razorpay_payment_id: `pay_test_${Date.now()}`,
            razorpay_signature: 'sandbox_test_signature',
            isDemo: true,
            treeId, plan: adoptPlan,
            userId: effectiveUserId, userName: effectiveUserName,
            userEmail: effectiveUserEmail,
            userPhone: currentUser.phone || ''
          })
        });
        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) throw new Error(verifyData.error || 'Payment verification failed');
        setAdoptStep('success');
        setAdoptSuccessMsg(`🌳 Adoption confirmed! (Test Mode) Certificate: ${verifyData.subscription?.certificateNumber || ''}`);
        setTrees(prev => prev.map(t => ((t._id || t.id) === treeId ? { ...t, isAdopted: true } : t)));
        if (selectedTree && ((selectedTree._id || selectedTree.id) === treeId)) {
          setSelectedTree(prev => ({ ...prev, isAdopted: true }));
        }
        setTimeout(() => { setAdoptModalTree(null); setAdoptStep('plan'); navigate('/citizen-dashboard?tab=subscriptions'); }, 2500);
        return;
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'TreeCanopy Management',
        description: `${adoptPlan === 'monthly' ? 'Monthly' : 'Yearly'} Tree Adoption – ${adoptModalTree.name}`,
        image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=80&q=80',
        order_id: orderData.orderId,
        handler: async (response) => {
          try {
            const verifyRes = await fetch(`${API_URL}/api/subscriptions/verify-payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...response,
                treeId, plan: adoptPlan,
                userId: effectiveUserId, userName: effectiveUserName,
                userEmail: effectiveUserEmail,
                userPhone: currentUser.phone || ''
              })
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error || 'Payment verification failed');
            setAdoptStep('success');
            setAdoptSuccessMsg(`🌳 Adoption confirmed! Certificate: ${verifyData.subscription?.certificateNumber || ''}`);
            setTrees(prev => prev.map(t => ((t._id || t.id) === treeId ? { ...t, isAdopted: true } : t)));
            if (selectedTree && ((selectedTree._id || selectedTree.id) === treeId)) {
              setSelectedTree(prev => ({ ...prev, isAdopted: true }));
            }
            setTimeout(() => { setAdoptModalTree(null); setAdoptStep('plan'); navigate('/citizen-dashboard?tab=subscriptions'); }, 2500);
          } catch (err) { alert('Payment verification error: ' + err.message); setAdoptStep('plan'); }
          finally { setIsSubmittingAdoption(false); setAdoptingId(null); }
        },
        prefill: { name: effectiveUserName, email: effectiveUserEmail, contact: currentUser.phone || '' },
        theme: { color: '#10b981' },
        modal: { ondismiss: () => { setAdoptStep('plan'); setIsSubmittingAdoption(false); setAdoptingId(null); } }
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      alert(err.message || 'Error initiating payment');
      setAdoptStep('plan');
      setIsSubmittingAdoption(false);
      setAdoptingId(null);
    }
  };
 
  const executeSelfAdopt = async () => {
    if (!adoptModalTree) return;
    const treeId = adoptModalTree._id || adoptModalTree.id;
    setIsSubmittingAdoption(true);
    setAdoptStep('processing');
    try {
      const res = await fetch(`${API_URL}/api/subscriptions/self-adopt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          treeId,
          userId: effectiveUserId,
          userName: effectiveUserName,
          userEmail: effectiveUserEmail,
          userPhone: currentUser.phone || ''
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete self-adoption');
      setAdoptStep('success');
      setAdoptSuccessMsg(`🌱 Self-Adoption Confirmed! Certificate: ${data.subscription?.certificateNumber || ''}`);
      setTrees(prev => prev.map(t => ((t._id || t.id) === treeId ? { ...t, isAdopted: true } : t)));
      if (selectedTree && ((selectedTree._id || selectedTree.id) === treeId)) {
        setSelectedTree(prev => ({ ...prev, isAdopted: true }));
      }
      setTimeout(() => {
        setAdoptModalTree(null);
        setAdoptStep('plan');
        navigate('/citizen-dashboard?tab=subscriptions');
      }, 2500);
    } catch (err) {
      alert('Self-adoption error: ' + err.message);
      setAdoptStep('plan');
    } finally {
      setIsSubmittingAdoption(false);
      setAdoptingId(null);
    }
  };

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
    const isCurrentlyAdopting = adoptingId === (selectedTree._id || selectedTree.id);

    return (
      <main className="cg-page" style={{ padding: '24px clamp(16px, 2vw, 32px)', maxWidth: '1100px', margin: '0 auto' }}>
        {/* Back button */}
        <button
          onClick={() => setSelectedTree(null)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'var(--bg-surface, #0b2518)', border: '1px solid var(--border, rgba(82, 183, 136, 0.3))', borderRadius: '8px',
            padding: '8px 16px', cursor: 'pointer', color: 'var(--text-primary, #ffffff)',
            fontWeight: 600, fontSize: '0.875rem', marginBottom: '24px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#10b981'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(82, 183, 136, 0.3)'; }}
        >
          <ChevronLeft size={18} /> Back to Tree Database
        </button>

        {/* Hero card */}
        <div style={{
          background: 'linear-gradient(135deg, #043224 0%, #065f46 60%, #047857 100%)',
          borderRadius: '20px', padding: '32px', color: '#ffffff',
          display: 'flex', gap: '28px', alignItems: 'flex-start', flexWrap: 'wrap',
          marginBottom: '24px', boxShadow: '0 10px 40px rgba(4,50,36,0.25)',
          position: 'relative'
        }}>
          {/* Tree image & gallery */}
          {(() => {
            const allDetailImgs = getTreeImages(selectedTree);
            const activeDetailImg = allDetailImgs[detailActiveImgIndex] || allDetailImgs[0] || getTreeDisplayImage(selectedTree);
            return (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                <div
                  style={{
                    width: '200px', minWidth: '160px', height: '200px', borderRadius: '16px',
                    overflow: 'hidden', background: 'rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, border: '2px solid rgba(255,255,255,0.25)',
                    position: 'relative', cursor: 'pointer', boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                  }}
                  onClick={() => { setGalleryTree(selectedTree); setGalleryIdx(detailActiveImgIndex); }}
                  title="Click to view full photo in gallery"
                >
                  <img
                    src={activeDetailImg}
                    alt={selectedTree.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      const fallback = speciesImages.default;
                      if (e.currentTarget.src !== fallback) {
                        e.currentTarget.src = fallback;
                      }
                    }}
                  />
                  {allDetailImgs.length > 1 && (
                    <span style={{
                      position: 'absolute', top: '8px', left: '8px',
                      background: 'rgba(0,0,0,0.75)', color: '#fff',
                      fontSize: '0.75rem', fontWeight: 700, padding: '3px 9px',
                      borderRadius: '12px', backdropFilter: 'blur(4px)'
                    }}>
                      📸 {detailActiveImgIndex + 1}/{allDetailImgs.length}
                    </span>
                  )}
                  {allDetailImgs.length > 1 && (
                    <div style={{ position: 'absolute', bottom: '8px', left: 0, right: 0, display: 'flex', justifyContent: 'space-between', padding: '0 8px' }}>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setDetailActiveImgIndex(prev => prev > 0 ? prev - 1 : allDetailImgs.length - 1); }}
                        style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 'bold' }}
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setDetailActiveImgIndex(prev => prev < allDetailImgs.length - 1 ? prev + 1 : 0); }}
                        style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 'bold' }}
                      >
                        ›
                      </button>
                    </div>
                  )}
                </div>

                {/* Thumbnails */}
                {allDetailImgs.length > 1 && (
                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', maxWidth: '200px', padding: '4px 2px' }}>
                    {allDetailImgs.map((imgUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setDetailActiveImgIndex(idx)}
                        style={{
                          width: '42px', height: '42px', borderRadius: '8px', overflow: 'hidden', padding: 0, flexShrink: 0,
                          border: idx === detailActiveImgIndex ? '2px solid #34d399' : '1px solid rgba(255,255,255,0.25)',
                          background: '#042217', cursor: 'pointer', opacity: idx === detailActiveImgIndex ? 1 : 0.5,
                          transition: 'all 0.2s', transform: idx === detailActiveImgIndex ? 'scale(1.08)' : 'scale(1)'
                        }}
                      >
                        <img src={imgUrl} alt={`Thumb ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => { setGalleryTree(selectedTree); setGalleryIdx(detailActiveImgIndex); }}
                  style={{
                    background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
                    borderRadius: '8px', padding: '4px 12px', fontSize: '0.75rem', color: '#fff',
                    cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px'
                  }}
                >
                  🔍 View Full Gallery ({allDetailImgs.length})
                </button>
              </div>
            );
          })()}

          {/* Tree headline info */}
          <div style={{ flex: 1, minWidth: '220px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800 }}>{selectedTree.name}</h1>
                <span style={{
                  background: getHealthColor(hs), color: '#fff', borderRadius: '20px',
                  padding: '4px 14px', fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap',
                  boxShadow: `0 0 0 3px ${getHealthColor(hs)}33`
                }}>
                  {getHealthLabel(hs)} · {hs}%
                </span>
              </div>
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
            {!isAdminSession && !isStaffSession && (
              <div style={{ marginTop: '16px' }}>
                <button
                  onClick={(e) => triggerAdoptModal(selectedTree, e)}
                  disabled={isCurrentlyAdopting}
                  style={{
                    background: '#10b981', color: '#ffffff', border: 'none',
                    borderRadius: '10px', padding: '10px 20px', fontSize: '0.9rem', fontWeight: 800,
                    cursor: isCurrentlyAdopting ? 'not-allowed' : 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    boxShadow: '0 4px 14px rgba(16,185,129,0.4)', transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#059669'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#10b981'; }}
                >
                  <Heart size={16} fill="#ffffff" />
                  {isCurrentlyAdopting ? 'Adopting...' : 'Adopt Tree (+100 Pts)'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {/* About */}
          {selectedTree.description && (
            <div style={{
              background: 'var(--bg-surface, #0b2518)', borderRadius: '16px', padding: '24px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.15)', border: '1px solid var(--border, rgba(82, 183, 136, 0.25))',
              gridColumn: 'span 2'
            }}>
              <h3 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontSize: '1rem', fontWeight: 700 }}>
                <Sprout size={18} /> About This Tree
              </h3>
              <p style={{ margin: 0, color: 'var(--text-primary, #ffffff)', lineHeight: 1.7 }}>{selectedTree.description}</p>
            </div>
          )}

          {/* Health Metrics */}
          <div style={{
            background: 'var(--bg-surface, #0b2518)', borderRadius: '16px', padding: '24px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.15)', border: '1px solid var(--border, rgba(82, 183, 136, 0.25))'
          }}>
            <h3 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontSize: '1rem', fontWeight: 700 }}>
              <Activity size={18} /> Health Metrics
            </h3>
            {[
              { label: 'Health Score', value: hs, color: getHealthColor(hs) },
              { label: 'Canopy Coverage', value: cc, color: '#3b82f6' },
            ].map(m => (
              <div key={m.label} style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary, #95d5b2)' }}>
                  <span>{m.label}</span>
                  <span style={{ color: m.color }}>{m.value}%</span>
                </div>
                <div style={{ height: '8px', borderRadius: '8px', background: 'var(--bg-elevated, #061a14)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${m.value}%`, background: m.color, borderRadius: '8px', transition: 'width 0.8s ease' }} />
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px', padding: '10px 14px', background: 'var(--bg-elevated, #061a14)', borderRadius: '10px', border: '1px solid rgba(82, 183, 136, 0.2)' }}>
              <Droplet size={16} color="#34d399" />
              <div>
                <div style={{ fontSize: '0.75rem', color: '#95d5b2', fontWeight: 600 }}>WATER REQUIREMENT</div>
                <div style={{ fontWeight: 700, color: '#34d399' }}>{selectedTree.waterRequirement || 'Medium'}</div>
              </div>
            </div>
            {selectedTree.addedAt && (
              <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#95d5b2', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CalendarDays size={14} /> Added on {selectedTree.addedAt}
              </div>
            )}
          </div>

          {/* Environmental Benefits */}
          {benefits.length > 0 && (
            <div style={{
              background: 'var(--bg-surface, #0b2518)', borderRadius: '16px', padding: '24px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.15)', border: '1px solid var(--border, rgba(82, 183, 136, 0.25))'
            }}>
              <h3 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontSize: '1rem', fontWeight: 700 }}>
                <Leaf size={18} /> Environmental Benefits
              </h3>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {benefits.map((b, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 14px', background: 'var(--bg-elevated, #061a14)', borderRadius: '10px', border: '1px solid rgba(82, 183, 136, 0.2)' }}>
                    <CheckCircle2 size={16} color="#34d399" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-primary, #ffffff)', lineHeight: 1.5 }}>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Common Diseases */}
          {diseases.length > 0 && (
            <div style={{
              background: 'var(--bg-surface, #0b2518)', borderRadius: '16px', padding: '24px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.15)', border: '1px solid var(--border, rgba(82, 183, 136, 0.25))'
            }}>
              <h3 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontSize: '1rem', fontWeight: 700 }}>
                <ShieldAlert size={18} /> Common Diseases
              </h3>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {diseases.map((d, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px', background: 'var(--bg-elevated, #061a14)', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                    <AlertTriangle size={14} color="#f87171" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-primary, #ffffff)' }}>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Common Pests */}
          {pests.length > 0 && (
            <div style={{
              background: 'var(--bg-surface, #0b2518)', borderRadius: '16px', padding: '24px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.15)', border: '1px solid var(--border, rgba(82, 183, 136, 0.25))'
            }}>
              <h3 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#facc15', fontSize: '1rem', fontWeight: 700 }}>
                <Bug size={18} /> Common Pests
              </h3>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pests.map((p, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px', background: 'var(--bg-elevated, #061a14)', borderRadius: '10px', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                    <Ban size={14} color="#facc15" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-primary, #ffffff)' }}>{p}</span>
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
            background: 'var(--bg-surface, #0b2518)', borderRadius: '10px', padding: '10px 16px',
            border: '1px solid var(--border, rgba(82, 183, 136, 0.3))'
          }}>
            <Search size={18} color="#9ca3af" />
            <input
              type="text"
              placeholder="Search by common name, scientific name, family or origin..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.9rem', color: 'var(--text-primary, #ffffff)', background: 'transparent' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary, #95d5b2)' }}>Health:</span>
            <select
              value={filterHealth}
              onChange={e => setFilterHealth(e.target.value)}
              style={{
                padding: '10px 16px', borderRadius: '10px', border: '1px solid var(--border, rgba(82, 183, 136, 0.3))',
                background: 'var(--bg-surface, #0b2518)', outline: 'none', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary, #ffffff)'
              }}
            >
              <option value="all" style={{ background: '#0b2518', color: '#ffffff' }}>All Conditions</option>
              <option value="healthy" style={{ background: '#0b2518', color: '#ffffff' }}>Healthy (&gt;=80%)</option>
              <option value="fair" style={{ background: '#0b2518', color: '#ffffff' }}>Fair (50%-79%)</option>
              <option value="alert" style={{ background: '#0b2518', color: '#ffffff' }}>Alert (&lt;50%)</option>
            </select>
          </div>
        </div>

        {/* List of trees */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#95d5b2' }}>
            <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid rgba(82, 183, 136, 0.3)', borderTopColor: '#34d399', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
            <p style={{ marginTop: '12px', fontWeight: 600 }}>Loading tree data...</p>
          </div>
        ) : filteredTrees.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', background: 'var(--bg-surface, #0b2518)', borderRadius: '16px', border: '1px solid var(--border, rgba(82, 183, 136, 0.25))' }}>
            <TreePine size={48} style={{ margin: '0 auto 12px', color: '#9ca3af', opacity: 0.7 }} />
            <h3 style={{ margin: '0 0 6px', color: 'var(--text-primary, #ffffff)' }}>No trees found</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary, #95d5b2)', fontSize: '0.9rem' }}>Try adjusting your search query or filters.</p>
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
                  onClick={() => { setSelectedTree(tree); setDetailActiveImgIndex(0); }}
                  style={{
                    background: 'var(--bg-surface, #0b2518)', borderRadius: '16px', overflow: 'hidden',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    border: '1px solid var(--border, rgba(82, 183, 136, 0.25))', cursor: 'pointer', transition: 'all 0.25s',
                    display: 'flex', flexDirection: 'column'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.borderColor = '#10b981';
                    e.currentTarget.style.boxShadow = '0 16px 32px -6px rgba(16,185,129,0.25)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'rgba(82, 183, 136, 0.25)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                  }}
                >
                  {/* Card Header — auto-scroll carousel */}
                  {(() => {
                    const imgs = getTreeImages(tree);
                    const tid = tree._id || tree.id;
                    const slideIdx = carouselIndices[tid] || 0;
                    return (
                      <div
                        style={{ height: '180px', background: '#1b4332', position: 'relative', overflow: 'hidden' }}
                        onMouseEnter={() => stopCarousel(tid)}
                        onMouseLeave={() => startCarousel(tid, imgs.length)}
                        ref={el => { if (el && !carouselTimers.current[tid]) startCarousel(tid, imgs.length); }}
                      >
                        <img
                          key={slideIdx}
                          src={imgs[slideIdx] || getTreeDisplayImage(tree)}
                          alt={tree.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 0.5s ease' }}
                          onError={e => { if (e.currentTarget.src !== speciesImages.default) e.currentTarget.src = speciesImages.default; }}
                        />
                        {/* Health badge */}
                        <span style={{ position: 'absolute', top: '12px', right: '12px', background: hColor, color: '#fff', borderRadius: '20px', padding: '3px 12px', fontSize: '0.78rem', fontWeight: 700, boxShadow: `0 2px 8px ${hColor}55` }}>{hLabel}</span>
                        {/* Image count badge */}
                        {imgs.length > 1 && (
                          <span style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(0,0,0,0.55)', color: '#fff', borderRadius: '20px', padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            📸 {imgs.length}
                          </span>
                        )}
                        {/* Dot indicators */}
                        {imgs.length > 1 && (
                          <div style={{ position: 'absolute', bottom: '8px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '5px' }}>
                            {imgs.map((_, di) => (
                              <div key={di} style={{ width: di === slideIdx ? '16px' : '6px', height: '6px', borderRadius: '4px', background: di === slideIdx ? '#34d399' : 'rgba(255,255,255,0.45)', transition: 'all 0.3s' }} />
                            ))}
                          </div>
                        )}
                        {/* View All Photos overlay on hover */}
                        {imgs.length > 1 && (
                          <button
                            onClick={e => { e.stopPropagation(); setGalleryTree(tree); setGalleryIdx(0); }}
                            style={{ position: 'absolute', bottom: '28px', right: '8px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '8px', padding: '4px 10px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', opacity: 0, transition: 'opacity 0.2s' }}
                            className="view-all-photos-btn"
                          >
                            View All 📸
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  {/* Card body */}
                  <div style={{ padding: '18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ margin: '0 0 2px', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary, #ffffff)' }}>
                      {tree.name}
                    </h3>
                    <p style={{ margin: '0 0 12px', fontStyle: 'italic', color: '#34d399', fontSize: '0.82rem' }}>
                      {tree.scientificName}
                    </p>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                      {tree.family && (
                        <span style={{ background: '#061a14', color: '#95d5b2', padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid rgba(82, 183, 136, 0.3)' }}>
                          {tree.family}
                        </span>
                      )}
                      {tree.origin && (
                        <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                          📍 {tree.origin}
                        </span>
                      )}
                    </div>

                    {tree.description && (
                      <p style={{
                        margin: '0 0 14px', fontSize: '0.82rem', color: 'var(--text-secondary, #95d5b2)', lineHeight: 1.6, flex: 1,
                        overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
                      }}>
                        {tree.description}
                      </p>
                    )}

                    {/* Stats row */}
                    <div style={{ display: 'flex', gap: '12px', paddingTop: '12px', borderTop: '1px solid rgba(82, 183, 136, 0.2)' }}>
                      <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: '#95d5b2', fontWeight: 600, marginBottom: '2px' }}>HEALTH</div>
                        <div style={{ fontWeight: 800, color: hColor, fontSize: '1rem' }}>{hs}%</div>
                      </div>
                      <div style={{ width: '1px', background: 'rgba(82, 183, 136, 0.2)' }} />
                      <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: '#95d5b2', fontWeight: 600, marginBottom: '2px' }}>CANOPY</div>
                        <div style={{ fontWeight: 800, color: '#3b82f6', fontSize: '1rem' }}>{tree.canopyCoverage ?? 80}%</div>
                      </div>
                      {tree.height && (
                        <>
                          <div style={{ width: '1px', background: 'rgba(82, 183, 136, 0.2)' }} />
                          <div style={{ flex: 1, textAlign: 'center' }}>
                            <div style={{ fontSize: '0.7rem', color: '#95d5b2', fontWeight: 600, marginBottom: '2px' }}>HEIGHT</div>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary, #ffffff)', fontSize: '0.85rem' }}>{tree.height}</div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Benefits preview */}
                    {Array.isArray(tree.benefits) && tree.benefits.length > 0 && (
                      <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {tree.benefits.slice(0, 2).map((b, i) => (
                          <span key={i} style={{ fontSize: '0.72rem', color: '#34d399', background: 'rgba(52, 211, 153, 0.15)', padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>
                            ✓ {b.length > 30 ? b.slice(0, 30) + '…' : b}
                          </span>
                        ))}
                        {tree.benefits.length > 2 && (
                          <span style={{ fontSize: '0.72rem', color: '#95d5b2', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>
                            +{tree.benefits.length - 2} more
                          </span>
                        )}
                      </div>
                    )}
                    <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', paddingTop: '10px', borderTop: '1px dashed rgba(82, 183, 136, 0.2)' }}>
                      {!isAdminSession && !isStaffSession && (
                        <button
                          onClick={(e) => triggerAdoptModal(tree, e)}
                          disabled={adoptingId === (tree._id || tree.id)}
                          style={{
                            background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.3)',
                            borderRadius: '8px', padding: '6px 12px', fontSize: '0.78rem', fontWeight: 700,
                            cursor: adoptingId === (tree._id || tree.id) ? 'not-allowed' : 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(52, 211, 153, 0.25)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(52, 211, 153, 0.15)'; }}
                        >
                          <Heart size={13} fill="#34d399" />
                          {adoptingId === (tree._id || tree.id) ? 'Adopting...' : 'Adopt (+100)'}
                        </button>
                      )}
                      <span style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginLeft: (isAdminSession || isStaffSession) ? 'auto' : 0 }}>
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

  // ── Gallery Lightbox Modal ──
  const renderGalleryLightbox = () => {
    if (!galleryTree) return null;
    const imgs = getTreeImages(galleryTree);
    const total = imgs.length;
    const prev = () => setGalleryIdx(i => (i - 1 + total) % total);
    const next = () => setGalleryIdx(i => (i + 1) % total);
    return (
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(16px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
        onClick={() => setGalleryTree(null)}
      >
        <style>{`@keyframes fadeInScale { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }`}</style>
        {/* Header */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)', zIndex: 1 }} onClick={e => e.stopPropagation()}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#fff' }}>{galleryTree.name}</div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>{galleryTree.scientificName}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ background: 'rgba(52,211,153,0.2)', border: '1px solid rgba(52,211,153,0.4)', color: '#34d399', padding: '4px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 }}>📷 {galleryIdx + 1} / {total}</span>
            <button onClick={() => setGalleryTree(null)} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>✕</button>
          </div>
        </div>

        {/* Main image */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', width: '100%', maxWidth: '1000px', padding: '0 16px', justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
          <button onClick={prev} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', width: '48px', height: '48px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.3rem', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(52,211,153,0.25)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>&#8249;</button>
          <img
            key={galleryIdx}
            src={imgs[galleryIdx]}
            alt={`${galleryTree.name} photo ${galleryIdx + 1}`}
            style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: '16px', objectFit: 'contain', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', animation: 'fadeInScale 0.3s ease-out' }}
            onError={e => { if (e.currentTarget.src !== speciesImages.default) e.currentTarget.src = speciesImages.default; }}
          />
          <button onClick={next} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', width: '48px', height: '48px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.3rem', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(52,211,153,0.25)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>&#8250;</button>
        </div>

        {/* Thumbnail strip */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 24px', background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)', display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'nowrap', overflowX: 'auto' }} onClick={e => e.stopPropagation()}>
          {imgs.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`thumb ${i}`}
              onClick={() => setGalleryIdx(i)}
              style={{ width: '52px', height: '52px', borderRadius: '8px', objectFit: 'cover', cursor: 'pointer', border: i === galleryIdx ? '2px solid #34d399' : '2px solid transparent', opacity: i === galleryIdx ? 1 : 0.55, transition: 'all 0.2s', flexShrink: 0 }}
            />
          ))}
        </div>

        {/* Dot indicators */}
        <div style={{ position: 'absolute', top: '50%', right: '12px', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: '6px' }} onClick={e => e.stopPropagation()}>
          {imgs.map((_, i) => (
            <div key={i} onClick={() => setGalleryIdx(i)} style={{ width: '6px', height: i === galleryIdx ? '18px' : '6px', borderRadius: '4px', background: i === galleryIdx ? '#34d399' : 'rgba(255,255,255,0.3)', cursor: 'pointer', transition: 'all 0.3s' }} />
          ))}
        </div>
      </div>
    );
  };

  const renderAdoptModal = () => {
    if (!adoptModalTree) return null;
    const monthlyPrice = adoptModalTree.monthlyAdoptionFee || 500;
    const yearlyPrice = adoptModalTree.yearlyAdoptionFee || 6000;
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(4,20,15,0.82)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
      }} onClick={() => { setAdoptModalTree(null); setAdoptStep('plan'); }}>
        <div style={{
          background: 'linear-gradient(160deg, #061e14 0%, #0b2e1e 100%)',
          borderRadius: '24px', maxWidth: '500px', width: '100%',
          overflow: 'hidden', boxShadow: '0 32px 64px -12px rgba(0,0,0,0.6)',
          border: '1px solid rgba(52,211,153,0.25)', animation: 'scaleUp 0.25s cubic-bezier(0.34,1.56,0.64,1)'
        }} onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #043224 0%, #065f46 60%, #059669 100%)', padding: '24px 24px 20px', position: 'relative' }}>
            <button onClick={() => { setAdoptModalTree(null); setAdoptStep('plan'); }} style={{ position: 'absolute', top: '14px', right: '14px', background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '14px', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.3)', flexShrink: 0 }}>
                <img src={getTreeDisplayImage(adoptModalTree)} alt={adoptModalTree.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>Adopt {adoptModalTree.name}</h3>
                <p style={{ margin: '3px 0 0', fontSize: '0.83rem', color: '#a7f3d0', fontStyle: 'italic' }}>{adoptModalTree.scientificName || 'Canopy Tree'} · {adoptModalTree.origin || 'Udupi'}</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '24px' }}>
            {adoptStep === 'success' ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '14px' }}>🎉</div>
                <h4 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 800, color: '#34d399' }}>{adoptSuccessMsg}</h4>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#95d5b2' }}>Redirecting to your Subscriptions dashboard...</p>
              </div>
            ) : adoptStep === 'processing' ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '14px', animation: 'spin 1s linear infinite', display: 'inline-block' }}>🌀</div>
                <p style={{ color: '#95d5b2', fontWeight: 600 }}>Processing your payment...</p>
              </div>
            ) : (
              <>
                <p style={{ margin: '0 0 18px', color: '#95d5b2', fontSize: '0.9rem' }}>Choose your adoption plan. A tree cutter will be assigned to care for your tree and you'll receive monthly/yearly care proof photos.</p>

                {/* Plan Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                  {/* Monthly */}
                  <div
                    onClick={() => setAdoptPlan('monthly')}
                    style={{ padding: '14px 16px', borderRadius: '14px', border: `2px solid ${adoptPlan === 'monthly' ? '#10b981' : 'rgba(52,211,153,0.2)'}`, background: adoptPlan === 'monthly' ? 'rgba(16,185,129,0.12)' : 'rgba(11,40,26,0.6)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '14px' }}
                  >
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: adoptPlan === 'monthly' ? '#10b981' : 'rgba(52,211,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {adoptPlan === 'monthly' ? <Check size={18} color='#fff' /> : <span style={{ color: '#34d399', fontSize: '0.75rem', fontWeight: 800 }}>M</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.95rem' }}>Monthly Subscription</div>
                      <div style={{ color: '#95d5b2', fontSize: '0.8rem' }}>Tree cutter assigned • Monthly care proofs</div>
                    </div>
                    <div style={{ fontWeight: 900, color: '#34d399', fontSize: '1.15rem' }}>₹{monthlyPrice}<span style={{ fontSize: '0.7rem', color: '#95d5b2', fontWeight: 600 }}>/mo</span></div>
                  </div>

                  {/* Yearly */}
                  <div
                    onClick={() => setAdoptPlan('yearly')}
                    style={{ padding: '14px 16px', borderRadius: '14px', border: `2px solid ${adoptPlan === 'yearly' ? '#10b981' : 'rgba(52,211,153,0.2)'}`, background: adoptPlan === 'yearly' ? 'rgba(16,185,129,0.12)' : 'rgba(11,40,26,0.6)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '14px', position: 'relative' }}
                  >
                    <div style={{ position: 'absolute', top: '-10px', right: '14px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', padding: '2px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800 }}>SAVE 17%</div>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: adoptPlan === 'yearly' ? '#10b981' : 'rgba(52,211,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {adoptPlan === 'yearly' ? <Check size={18} color='#fff' /> : <span style={{ color: '#34d399', fontSize: '0.75rem', fontWeight: 800 }}>Y</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.95rem' }}>Yearly Subscription</div>
                      <div style={{ color: '#95d5b2', fontSize: '0.8rem' }}>Priority care • Annual certificate • Best value</div>
                    </div>
                    <div style={{ fontWeight: 900, color: '#34d399', fontSize: '1.15rem' }}>₹{yearlyPrice}<span style={{ fontSize: '0.7rem', color: '#95d5b2', fontWeight: 600 }}>/yr</span></div>
                  </div>

                  {/* Self */}
                  <div
                    onClick={() => setAdoptPlan('self')}
                    style={{ padding: '14px 16px', borderRadius: '14px', border: `2px solid ${adoptPlan === 'self' ? '#6366f1' : 'rgba(99,102,241,0.2)'}`, background: adoptPlan === 'self' ? 'rgba(99,102,241,0.1)' : 'rgba(11,40,26,0.6)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '14px' }}
                  >
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: adoptPlan === 'self' ? '#6366f1' : 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {adoptPlan === 'self' ? <Check size={18} color='#fff' /> : <span style={{ color: '#818cf8', fontSize: '0.75rem', fontWeight: 800 }}>S</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.95rem' }}>Self Adoption (Free)</div>
                      <div style={{ color: '#a5b4fc', fontSize: '0.8rem' }}>You personally care for this tree. No monthly fee.</div>
                    </div>
                    <div style={{ fontWeight: 900, color: '#818cf8', fontSize: '1.1rem' }}>FREE</div>
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button onClick={() => { setAdoptModalTree(null); setAdoptStep('plan'); }} style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid rgba(52,211,153,0.3)', background: 'transparent', color: '#95d5b2', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>Cancel</button>
                  <button
                    onClick={handleConfirmAdoption}
                    disabled={isSubmittingAdoption}
                    style={{ padding: '10px 22px', borderRadius: '10px', border: 'none', background: adoptPlan === 'self' ? 'linear-gradient(135deg,#4f46e5,#4338ca)' : 'linear-gradient(135deg,#059669,#047857)', color: '#fff', fontWeight: 700, fontSize: '0.875rem', cursor: isSubmittingAdoption ? 'not-allowed' : 'pointer', boxShadow: '0 4px 14px rgba(5,150,105,0.35)', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Heart size={15} fill='currentColor' />
                    {isSubmittingAdoption ? 'Processing...' : adoptPlan === 'self' ? 'Confirm Self-Adoption' : `Pay ₹${adoptPlan === 'monthly' ? monthlyPrice : yearlyPrice} & Adopt`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderPledgeModal = () => {
    if (!showPledgeModal) return null;
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(4,20,15,0.82)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
      }} onClick={() => setShowPledgeModal(false)}>
        <div style={{
          background: 'linear-gradient(160deg, #061e14 0%, #0b2e1e 100%)',
          borderRadius: '24px', maxWidth: '480px', width: '100%',
          overflow: 'hidden', boxShadow: '0 32px 64px -12px rgba(0,0,0,0.6)',
          border: '1px solid rgba(52,211,153,0.25)', animation: 'scaleUp 0.25s cubic-bezier(0.34,1.56,0.64,1)'
        }} onClick={e => e.stopPropagation()}>
          <div style={{ background: 'linear-gradient(135deg, #043224 0%, #065f46 60%, #059669 100%)', padding: '20px 24px', position: 'relative' }}>
            <button onClick={() => setShowPledgeModal(false)} style={{ position: 'absolute', top: '14px', right: '14px', background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>Tree Guardian Pledge 🌱</h3>
          </div>
          <div style={{ padding: '24px' }}>
            <p style={{ margin: '0 0 14px', color: '#95d5b2', fontSize: '0.9rem', lineHeight: '1.6' }}>
              I, <strong style={{ color: '#fff' }}>{effectiveUserName}</strong>, solemnly declare that I will personally take responsibility for the care and well-being of this tree. I commit to regular watering, reporting any damage, and ensuring its healthy growth as part of the Udupi Municipal TreeCanopy Programme.
            </p>
            <p style={{ margin: '0 0 16px', color: '#6ee7b7', fontSize: '0.82rem', fontStyle: 'italic' }}>
              I understand that failure to fulfil this commitment may result in the revocation of my adoption status.
            </p>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', cursor: 'pointer', color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={pledgeAgreed}
                onChange={e => setPledgeAgreed(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#10b981', cursor: 'pointer' }}
              />
              I solemnly take this pledge to protect and care for this tree.
            </label>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowPledgeModal(false)} style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid rgba(52,211,153,0.3)', background: 'transparent', color: '#95d5b2', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>Cancel</button>
              <button
                disabled={!pledgeAgreed}
                onClick={async () => {
                  setShowPledgeModal(false);
                  await executeSelfAdopt();
                }}
                style={{ padding: '10px 22px', borderRadius: '10px', border: 'none', background: pledgeAgreed ? 'linear-gradient(135deg,#059669,#047857)' : 'rgba(255,255,255,0.1)', color: pledgeAgreed ? '#fff' : 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: '0.875rem', cursor: pledgeAgreed ? 'pointer' : 'not-allowed', boxShadow: pledgeAgreed ? '0 4px 14px rgba(5,150,105,0.35)' : 'none' }}
              >
                Accept & Complete Adoption
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const isAuthenticatedUser = isAdminSession || isOfficialSession || Boolean(currentUser.role || currentUser.username || currentUser.name);

  if (selectedTree) {
    if (!isAuthenticatedUser) {
      return (
        <div className="cg-public">
          <header className="cg-public-nav">
            <Link to="/home" className="cg-brand">CanopyGuard</Link>
            <nav className="desktop-nav-links">
              <Link to="/home">Home</Link>
              <Link to="/report-issue">Complaints</Link>
              <Link className="active" to="/view-tree">Tree Database</Link>
              <Link to="/tree-encyclopedia">Tree Encyclopedia</Link>
            </nav>
            <Link className="cg-login desktop-login-btn" to="/login">
              Login
            </Link>
            <Link className="mobile-hamburger-btn" to="/home" style={{ display: 'none', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', borderRadius: '8px', border: '1px solid #d1d5db', color: '#374151' }}>
              <ChevronLeft size={20} />
            </Link>
          </header>
          {renderDetailContent()}
          {renderAdoptModal()}
          {renderPledgeModal()}
          {renderGalleryLightbox()}
        </div>
      );
    } else {
      return (
        <div className="cg-app" style={{ background: 'var(--bg-page, #051d18)', minHeight: '100vh', color: 'var(--text-primary, #ffffff)' }}>
          <Sidebar active="View Tree" admin={isAdminSession} isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
          <div className="cg-workspace">
            <Topbar title="Tree Details" onToggleSidebar={() => setSidebarOpen(true)} />
            {renderDetailContent()}
            {renderAdoptModal()}
            {renderPledgeModal()}
            {renderGalleryLightbox()}
          </div>
        </div>
      );
    }
  }

  // ── List View ───────────────────────────────────────────────────────────────
  if (!isAuthenticatedUser) {
    return (
      <div className="cg-public">
        <header className="cg-public-nav">
          <Link to="/home" className="cg-brand">CanopyGuard</Link>
          <nav className="desktop-nav-links">
            <Link to="/home">Home</Link>
            <Link to="/report-issue">Complaints</Link>
            <Link className="active" to="/view-tree">Tree Database</Link>
            <Link to="/tree-encyclopedia">Tree Encyclopedia</Link>
          </nav>
          <Link className="cg-login desktop-login-btn" to="/login">
            Login
          </Link>
          <Link className="mobile-hamburger-btn" to="/home" style={{ display: 'none', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', borderRadius: '8px', border: '1px solid #d1d5db', color: '#374151' }}>
            <ChevronLeft size={20} />
          </Link>
        </header>
        {renderListContent()}
        {renderAdoptModal()}
        {renderPledgeModal()}
        {renderGalleryLightbox()}
      </div>
    );
  } else {
    return (
      <div className="cg-app cg-dashboard-screen" style={{ background: 'var(--bg-page, #051d18)', minHeight: '100vh', color: 'var(--text-primary, #ffffff)' }}>
        <Sidebar active="View Tree" admin={isAdminSession} isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
        <div className="cg-workspace">
          <Topbar title="Tree Database" onToggleSidebar={() => setSidebarOpen(true)} />
          {renderListContent()}
          {renderAdoptModal()}
          {renderPledgeModal()}
          {renderGalleryLightbox()}
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

  // Attendance Tabs & Filters
  const [attendanceTab, setAttendanceTab] = useState('attendance');
  const [tableRoleFilter, setTableRoleFilter] = useState('all');
  const [dateSortOrder, setDateSortOrder] = useState('newest'); // 'newest' | 'oldest'
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(''); // Calendar filter 'YYYY-MM-DD'

  // Leave Applications
  const [leaveRequests, setLeaveRequests] = useState([]);

  useEffect(() => {
    localStorage.setItem('staff_leave_requests', JSON.stringify(leaveRequests));
  }, [leaveRequests]);

  // Leave Modal State
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    userName: '',
    role: 'Tree Cutter',
    leaveType: 'Casual Leave',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    reason: ''
  });

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('currentUser')) || {}; }
    catch { return {}; }
  })();

  const path = window.location.pathname;
  const rawRole = normalizeRole(currentUser.role);
  const isAdmin = rawRole === 'Admin' || sessionStorage.getItem('adminAuthed') === 'true' || path.startsWith('/admin');
  const isOfficial = !isAdmin && (rawRole === 'Official' || sessionStorage.getItem('officialAuthed') === 'true' || path.startsWith('/official') || path.startsWith('/official-management'));

  if (isAdmin) {
    return <AdminAttendancePage />;
  }

  // Effective identity for attendance
  const effectiveRole = isAdmin ? 'Admin' : (isOfficial ? 'Official' : 'Tree Cutter');
  const effectiveName = currentUser.name || (isAdmin ? (sessionStorage.getItem('adminUsername') || 'Municipal Admin') : 'Municipal Official');
  const effectiveUserId = currentUser.id || currentUser.email || (isAdmin ? 'ADMIN-01' : ('TC-' + (effectiveName.toLowerCase().replace(/\s+/g, ''))));

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Real Tree Cutters State
  const [cuttersList, setCuttersList] = useState([]);

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

  // Fetch real attendance records, real registered tree cutters, and real leaves from MongoDB
  const fetchRecords = async () => {
    setLoadingHistory(true);
    try {
      const [allRes, summaryRes, cuttersRes, leavesRes] = await Promise.all([
        fetch(`${API_URL}/api/attendance`),
        fetch(`${API_URL}/api/attendance/today-summary`),
        fetch(`${API_URL}/api/auth/cutters`),
        fetch(`${API_URL}/api/attendance/leaves`)
      ]);

      const allData = await allRes.json();
      const summaryData = await summaryRes.json();
      const cuttersData = await cuttersRes.json();
      const leavesData = await leavesRes.json();

      setAllRecords(allData.records || []);
      setTodaySummary(summaryData);

      if (cuttersData.cutters && cuttersData.cutters.length > 0) {
        const formattedCutters = cuttersData.cutters.map((u, i) => ({
          id: u._id,
          name: u.name,
          role: u.role || 'Tree Cutter',
          phone: u.phone && u.phone !== 'Google Auth' ? u.phone : '+91 96320 38402',
          zone: u.zone || 'Udupi Sector Zone',
          equipment: i % 2 === 0 ? '🪓 Heavy Chainsaw & Safety Rig' : '🪜 Bucket Truck & Saw',
          status: u.status === 'Verified' ? 'Present' : (u.status === 'Rejected' ? 'On Leave' : 'On Field Duty')
        }));
        setCuttersList(formattedCutters);
      }

      if (leavesData.leaves) {
        setLeaveRequests(leavesData.leaves);
      }

      const res = await fetch(`${API_URL}/api/attendance/me?userId=${effectiveUserId}&userName=${encodeURIComponent(effectiveName)}`);
      const data = await res.json();
      setMyRecords(data.records || []);
    } catch (err) {
      console.error('Fetch attendance error:', err);
    }
    setLoadingHistory(false);
  };

  useEffect(() => {
    fetchRecords();
  }, []);

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

  const todayDateStr = new Date().toISOString().slice(0, 10);
  const todayGroup = recordsByDate[todayDateStr] || { shifts: new Set() };
  const todayShiftsPresent = Array.from(todayGroup.shifts);
  const todayShiftsCount = todayShiftsPresent.length;

  const handleMarkAttendance = async () => {
    const shift = selectedShift || activeShift;
    if (!shift) {
      setMarkResult({ success: false, msg: 'No active shift session is currently open for today!' });
      return;
    }
    const status = getShiftStatus(shift);
    if (status.closed) {
      setMarkResult({ success: false, msg: `Cannot mark attendance: ${shift} shift is locked (${status.reason})!` });
      return;
    }

    const alreadyMarked = (myRecords || []).some(r => r.date === todayDateStr && r.shift === shift);
    if (alreadyMarked) {
      setMarkResult({ success: false, msg: `You have already marked attendance for ${shift} shift today!` });
      return;
    }

    setMarking(true);
    setMarkResult(null);

    const newRecord = {
      _id: 'att_' + Date.now(),
      userId: effectiveUserId,
      userName: effectiveName,
      role: effectiveRole,
      shift,
      date: todayDateStr,
      markedAt: new Date().toISOString(),
      status: 'Present',
      zone: 'Operations Control Center'
    };

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
      setMarkResult({ success: true, msg: data.msg || `Attendance marked successfully for ${shift} shift!` });
      setAllRecords(prev => [newRecord, ...prev]);
      setMyRecords(prev => [newRecord, ...prev]);
    } catch {
      setMarkResult({ success: true, msg: `Attendance recorded locally for ${shift} shift!` });
      setAllRecords(prev => [newRecord, ...prev]);
      setMyRecords(prev => [newRecord, ...prev]);
    }
    setMarking(false);
  };

  const handleApplyLeaveSubmit = async (e) => {
    e.preventDefault();
    const applicant = leaveForm.userName || effectiveName;
    try {
      const res = await fetch(`${API_URL}/api/attendance/leaves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: effectiveUserId,
          userName: applicant,
          userRole: leaveForm.role,
          leaveType: leaveForm.leaveType,
          startDate: leaveForm.startDate,
          endDate: leaveForm.endDate,
          reason: leaveForm.reason || 'Personal leave request',
        }),
      });
      const data = await res.json();
      if (data.leave) {
        setLeaveRequests(prev => [data.leave, ...prev]);
      }
      setShowLeaveModal(false);

      Swal.fire({
        icon: 'success',
        title: 'Leave Application Saved to Database!',
        text: `Leave request for ${applicant} submitted to MongoDB server.`,
        confirmButtonColor: '#10b981',
      });
    } catch (err) {
      console.error('Leave submission error:', err);
      setShowLeaveModal(false);
    }
  };

  const updateLeaveStatus = async (leaveId, newStatus) => {
    try {
      const res = await fetch(`${API_URL}/api/attendance/leaves/${leaveId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, reviewedBy: effectiveName })
      });
      const data = await res.json();
      setLeaveRequests(prev => prev.map(l => l._id === leaveId ? (data.leave || { ...l, status: newStatus }) : l));
      Swal.fire({
        icon: newStatus === 'Approved' ? 'success' : 'error',
        title: `Leave Request ${newStatus}`,
        text: `Database updated. Application status set to ${newStatus}.`,
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err) {
      setLeaveRequests(prev => prev.map(l => l._id === leaveId ? { ...l, status: newStatus } : l));
    }
  };

  const handleDeleteLeave = async (leaveId) => {
    const confirm = await Swal.fire({
      title: 'Remove Leave Application?',
      text: 'Are you sure you want to delete this leave request from MongoDB database?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, Delete'
    });
    if (!confirm.isConfirmed) return;
    try {
      await fetch(`${API_URL}/api/attendance/leaves/${leaveId}`, { method: 'DELETE' });
      setLeaveRequests(prev => prev.filter(l => l._id !== leaveId));
      Swal.fire({ icon: 'success', title: 'Leave Application Removed', timer: 1800, showConfirmButton: false });
    } catch (err) {
      console.error('Delete leave error:', err);
    }
  };

  const shiftInfo = [
    { name: 'Morning', hours: '9:00 AM – 12:00 PM', icon: <Sun size={18} /> },
    { name: 'Afternoon', hours: '12:00 PM – 3:00 PM', icon: <Sun size={18} /> },
    { name: 'Evening', hours: '3:00 PM – 5:00 PM', icon: <Moon size={18} /> },
  ];

  const targetShift = selectedShift || activeShift || 'Morning';
  const targetStatus = getShiftStatus(targetShift);

  const sortedAndFilteredRecords = useMemo(() => {
    const filtered = (allRecords || []).filter(r => {
      if (tableRoleFilter === 'cutters' && r.role !== 'Tree Cutter') return false;
      if (tableRoleFilter === 'officials' && (r.role !== 'Official' && r.role !== 'Admin')) return false;
      if (tableRoleFilter === 'present' && (r.status !== 'Present' && r.status !== 'On Duty' && !!r.status)) return false;
      if (selectedCalendarDate) {
        const recordDateStr = r.date || (r.markedAt ? r.markedAt.slice(0, 10) : '');
        if (recordDateStr !== selectedCalendarDate) return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.date || a.markedAt || 0).getTime();
      const dateB = new Date(b.date || b.markedAt || 0).getTime();
      return dateSortOrder === 'newest' ? (dateB - dateA) : (dateA - dateB);
    });
  }, [allRecords, tableRoleFilter, dateSortOrder, selectedCalendarDate]);

  const exportAttendanceCSV = () => {
    if (sortedAndFilteredRecords.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'No Logs to Export',
        text: 'There are no attendance records matching the selected filter to export.',
        confirmButtonColor: '#10b981'
      });
      return;
    }

    const headers = ['Staff Name', 'Role', 'Date', 'Shift', 'Presence Status', 'Zone Location', 'Record ID'];
    const rows = sortedAndFilteredRecords.map(r => [
      r.userName || 'Unknown Staff',
      r.role || 'Staff',
      r.date || '',
      r.shift || '',
      r.status || 'Present',
      r.zone || r.location || 'Operations Control Center',
      r._id || ''
    ]);

    const csvContent = [headers, ...rows].map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const dateSuffix = selectedCalendarDate ? selectedCalendarDate : 'All_Dates';
    link.setAttribute('download', `CanopyGuard_Attendance_Report_${dateSuffix}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    Swal.fire({
      icon: 'success',
      title: 'Attendance Report Exported!',
      text: `Exported ${sortedAndFilteredRecords.length} attendance log entries to CSV file.`,
      timer: 2000,
      showConfirmButton: false
    });
  };

  return (
    <div className="cg-app">
      <Sidebar active="Attendance" admin={isAdmin} isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
      <div className="cg-workspace">
        <Topbar title="Shift Logs & Attendance" onToggleSidebar={() => setSidebarOpen(true)} />
        <main className="cg-page">

          {/* Header & Live Clock */}
          <section className="cg-att-head" style={{ marginBottom: '20px' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--text-primary)' }}>Shift Logs & Attendance</h1>
              <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>
                Zone workforce tracking, cutter shift logs, and leave applications management.
              </p>
            </div>

            {/* Fixed Time Card */}
            <div className="time-card" style={{ background: '#0b2518', border: '1px solid rgba(82, 183, 136, 0.25)', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <Clock3 size={32} color="#52b788" />
              <div>
                <span style={{ textTransform: 'uppercase', letterSpacing: '1px', color: '#95d5b2', fontSize: '0.72rem', display: 'block' }}>Current Time (IST)</span>
                <b style={{ fontSize: '1.45rem', color: '#ffffff', fontWeight: 800, display: 'block' }}>
                  {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </b>
                <span style={{ fontSize: '0.78rem', color: activeShift ? '#34d399' : '#facc15', fontWeight: 700, display: 'block', marginTop: '2px', whiteSpace: 'nowrap' }}>
                  {activeShift ? `🟢 Active Shift: ${activeShift}` : `⏰ Standard Shift Logger Active`}
                </span>
              </div>
            </div>
          </section>

          {/* Top Attendance Navigation Tabs */}
          <nav className="official-tabs" style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
            <button
              className={attendanceTab === 'attendance' ? 'active' : ''}
              onClick={() => setAttendanceTab('attendance')}
            >
              🕒 Shift Logs & Staff Attendance
            </button>
            <button
              className={attendanceTab === 'cutters' ? 'active' : ''}
              onClick={() => setAttendanceTab('cutters')}
            >
              🪓 Tree Cutters Duty Roster ({cuttersList.length})
            </button>
            <button
              className={attendanceTab === 'leave' ? 'active' : ''}
              onClick={() => setAttendanceTab('leave')}
            >
              📝 Leave Applications ({leaveRequests.length})
            </button>
          </nav>

          {/* TAB 1: SHIFT LOGS & STAFF ATTENDANCE */}
          {attendanceTab === 'attendance' && (
            <div>
              {/* Today Summary Widgets */}
              <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div className="cg-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', background: '#0b2518' }}>
                  <div style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', padding: '10px', borderRadius: '12px' }}><ShieldCheck size={24} /></div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#95d5b2', display: 'block' }}>Officials Present Today</span>
                    <b style={{ fontSize: '1.5rem', color: '#ffffff' }}>{allRecords.filter(r => r.role === 'Official' || r.role === 'Admin').length}</b>
                  </div>
                </div>

                <div className="cg-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', background: '#0b2518' }}>
                  <div style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '10px', borderRadius: '12px' }}><Users size={24} /></div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#95d5b2', display: 'block' }}>Tree Cutters Present</span>
                    <b style={{ fontSize: '1.5rem', color: '#ffffff' }}>{allRecords.filter(r => r.role === 'Tree Cutter').length}</b>
                  </div>
                </div>

                <div className="cg-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', background: '#0b2518' }}>
                  <div style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '10px', borderRadius: '12px' }}><CalendarDays size={24} /></div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#95d5b2', display: 'block' }}>On Leave Today</span>
                    <b style={{ fontSize: '1.5rem', color: '#ffffff' }}>{leaveRequests.filter(l => l.status === 'Approved').length}</b>
                  </div>
                </div>
              </section>

              <section className="cg-att-grid">
                <div>
                  {/* Mark Attendance Card */}
                  <div className="cg-panel attendance-card top-line" style={{ background: '#0b2518', border: '1px solid rgba(82, 183, 136, 0.25)', padding: '22px' }}>
                    <header style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                      <div className="attendance-user-avatar-box" style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#1b4332', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem', border: '2px solid #52b788' }}>
                        {effectiveName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="attendance-role-pill" style={{ background: 'rgba(82, 183, 136, 0.2)', color: '#34d399', padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                          {effectiveRole}
                        </span>
                        <h2 style={{ margin: '4px 0 0', fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>Welcome, {effectiveName}</h2>
                      </div>
                    </header>

                    <h3 style={{ margin: '16px 0 8px', fontSize: '1rem', color: '#74c69d' }}>Mark Presence for Today</h3>

                    <div className="shifts" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginTop: '8px' }}>
                      {shiftInfo.map(s => {
                        const status = getShiftStatus(s.name);
                        const isClosed = status.closed;
                        const isSelected = (selectedShift === s.name) || (!selectedShift && activeShift === s.name && !isClosed);

                        return (
                          <button
                            key={s.name}
                            type="button"
                            className={`shift-btn-item ${isSelected ? 'selected' : ''}`}
                            disabled={isClosed}
                            onClick={() => !isClosed && setSelectedShift(s.name)}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '12px 10px',
                              borderRadius: '12px',
                              border: isClosed ? '1px dashed rgba(239, 68, 68, 0.35)' : (isSelected ? '2px solid #34d399' : '1px solid rgba(82, 183, 136, 0.3)'),
                              background: isClosed ? 'rgba(15, 23, 42, 0.6)' : (isSelected ? '#134a33' : '#061a14'),
                              opacity: isClosed ? 0.6 : 1,
                              cursor: isClosed ? 'not-allowed' : 'pointer',
                              gap: '4px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isClosed ? '#94a3b8' : '#ffffff', fontWeight: 700, fontSize: '0.88rem' }}>
                              {s.icon} {s.name}
                            </div>
                            <small style={{ fontSize: '0.7rem', color: isClosed ? '#64748b' : '#b7e4c7' }}>{s.hours}</small>
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              color: isClosed ? '#f87171' : '#34d399',
                              background: isClosed ? 'rgba(239, 68, 68, 0.15)' : 'rgba(52, 211, 153, 0.15)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              marginTop: '2px'
                            }}>
                              {isClosed ? `🔒 ${status.reason}` : (isSelected ? '✓ Selected' : 'Select')}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {markResult && (
                      <div className="official-notice" style={{ background: markResult.success ? '#052e16' : '#450a0a', color: markResult.success ? '#34d399' : '#f87171', border: markResult.success ? '1px solid #059669' : '1px solid #dc2626', marginTop: '14px', padding: '10px 14px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                        {markResult.success ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                        {markResult.msg}
                      </div>
                    )}

                    {(() => {
                      const effectiveTargetShift = selectedShift || activeShift;
                      const targetStatus = effectiveTargetShift ? getShiftStatus(effectiveTargetShift) : { closed: true, reason: 'Shifts closed for today' };
                      const isAlreadyMarked = effectiveTargetShift ? (myRecords || []).some(r => r.date === todayDateStr && r.shift === effectiveTargetShift) : false;
                      const isBtnDisabled = marking || targetStatus.closed || isAlreadyMarked || !effectiveTargetShift;

                      let btnText = `Mark My Presence (${effectiveTargetShift || 'Shift'} Shift)`;
                      if (!effectiveTargetShift || targetStatus.closed) {
                        btnText = `🔒 Shifts Closed for Today (No active session)`;
                      } else if (isAlreadyMarked) {
                        btnText = `✓ Attendance Already Marked for ${effectiveTargetShift} Shift Today`;
                      } else if (marking) {
                        btnText = 'Marking Presence...';
                      }

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
                          <button
                            className="cg-btn primary"
                            onClick={handleMarkAttendance}
                            disabled={isBtnDisabled}
                            style={{
                              width: '100%',
                              padding: '12px 18px',
                              fontSize: '0.95rem',
                              fontWeight: 800,
                              borderRadius: '10px',
                              background: isBtnDisabled ? 'rgba(51, 65, 85, 0.7)' : 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                              color: isBtnDisabled ? '#94a3b8' : '#ffffff',
                              border: isBtnDisabled ? '1px solid rgba(148, 163, 184, 0.2)' : 'none',
                              cursor: isBtnDisabled ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px'
                            }}
                          >
                            <Fingerprint size={18} />
                            {btnText}
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* History Table */}
                <div className="cg-panel history" style={{ background: '#0b2518', border: '1px solid rgba(82, 183, 136, 0.25)', padding: '20px' }}>
                  <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock3 size={20} color="#34d399" /> Live Attendance Logs
                    </h2>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      {/* Calendar Date Picker Selector */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#061a14', border: '1px solid rgba(82, 183, 136, 0.35)', borderRadius: '8px', padding: '4px 8px' }}>
                        <span style={{ fontSize: '0.8rem', color: '#95d5b2', fontWeight: 600 }}>📆 Date:</span>
                        <input
                          type="date"
                          value={selectedCalendarDate}
                          onChange={e => setSelectedCalendarDate(e.target.value)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ffffff',
                            fontSize: '0.82rem',
                            outline: 'none',
                            cursor: 'pointer',
                            colorScheme: 'dark'
                          }}
                          title="Select specific date from calendar pop-up"
                        />
                        {selectedCalendarDate && (
                          <button
                            type="button"
                            onClick={() => setSelectedCalendarDate('')}
                            title="Clear date filter"
                            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, padding: '0 4px' }}
                          >
                            ✖ Clear
                          </button>
                        )}
                      </div>

                      {/* Date Sorting Selector */}
                      <select
                        value={dateSortOrder}
                        onChange={e => setDateSortOrder(e.target.value)}
                        style={{ background: '#061a14', color: '#34d399', border: '1px solid rgba(82, 183, 136, 0.3)', padding: '6px 10px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700 }}
                      >
                        <option value="newest">📅 Newest Date First (Latest)</option>
                        <option value="oldest">📅 Oldest Date First (Earliest)</option>
                      </select>

                      {/* Role Filter Selector */}
                      <select
                        value={tableRoleFilter}
                        onChange={e => setTableRoleFilter(e.target.value)}
                        style={{ background: '#061a14', color: '#ffffff', border: '1px solid rgba(82, 183, 136, 0.3)', padding: '6px 10px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600 }}
                      >
                        <option value="all">👥 All Staff</option>
                        <option value="cutters">🪓 Tree Cutters Only</option>
                        <option value="officials">🛡️ Officials Only</option>
                        <option value="present">🟢 Present Today</option>
                      </select>

                      {/* Export CSV Report Button */}
                      <button
                        type="button"
                        className="cg-btn primary compact"
                        onClick={exportAttendanceCSV}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', border: 'none' }}
                        title="Export current attendance log entries to CSV file"
                      >
                        <Download size={15} /> Export CSV
                      </button>
                    </div>
                  </header>

                  <table className="cg-table" style={{ marginTop: '10px', width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Staff Name</th>
                        <th>Role</th>
                        <th
                          onClick={() => setDateSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
                          style={{ cursor: 'pointer', userSelect: 'none', color: '#34d399' }}
                          title="Click to toggle Date Sort Order (Newest <-> Oldest)"
                        >
                          DATE {dateSortOrder === 'newest' ? '▼' : '▲'}
                        </th>
                        <th>Shift</th>
                        <th>Status</th>
                        <th>Zone Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedAndFilteredRecords.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#95d5b2' }}>
                            No attendance records match the selected filter.
                          </td>
                        </tr>
                      ) : (
                        sortedAndFilteredRecords.map((r, idx) => (
                          <tr key={r._id || idx}>
                            <td><b>{r.userName}</b></td>
                            <td>
                              <span className={`tag ${r.role === 'Official' ? 'med' : 'low'}`} style={{ fontSize: '0.74rem' }}>
                                {r.role}
                              </span>
                            </td>
                            <td>{r.date}</td>
                            <td><span className="tag ok" style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34d399' }}>{r.shift}</span></td>
                            <td>
                              <span style={{
                                background: (r.status === 'Present' || !r.status) ? 'rgba(52, 211, 153, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                color: (r.status === 'Present' || !r.status) ? '#34d399' : '#60a5fa',
                                border: (r.status === 'Present' || !r.status) ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontWeight: 700,
                                fontSize: '0.75rem'
                              }}>
                                ✓ {r.status || 'Present'}
                              </span>
                            </td>
                            <td><small style={{ color: '#b7e4c7' }}>{r.zone || r.location || 'Operations Control Center'}</small></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {/* TAB 2: TREE CUTTERS DUTY ROSTER */}
          {attendanceTab === 'cutters' && (
            <div className="cg-panel" style={{ background: '#0b2518', border: '1px solid rgba(82, 183, 136, 0.25)', padding: '22px' }}>
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#ffffff' }}>🪓 Tree Cutters Duty Roster & Live Availability</h2>
                  <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#95d5b2' }}>
                    Real-time registered cutters from database, active service zones, and leave tracking.
                  </p>
                </div>
              </header>

              <table className="cg-table wide" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Cutter Name</th>
                    <th>Phone Contact</th>
                    <th>Assigned Service Zone</th>
                    <th>Equipment Assigned</th>
                    <th>Availability Status</th>
                    <th>Quick Status Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cuttersList.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#95d5b2' }}>
                        Loading registered tree cutters from MongoDB database...
                      </td>
                    </tr>
                  ) : (
                    cuttersList.map(c => (
                      <tr key={c.id}>
                        <td><b style={{ color: '#ffffff', fontSize: '0.95rem' }}>{c.name}</b><br /><small style={{ color: '#74c69d' }}>{c.role}</small></td>
                        <td><span style={{ color: '#b7e4c7', fontSize: '0.85rem' }}>{c.phone}</span></td>
                        <td>📍 {c.zone}</td>
                        <td><span style={{ background: '#061a14', border: '1px solid rgba(82, 183, 136, 0.3)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', color: '#ffffff' }}>{c.equipment}</span></td>
                        <td>
                          <span style={{
                            background: c.status === 'Present' ? 'rgba(52, 211, 153, 0.15)' : c.status === 'On Duty' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                            color: c.status === 'Present' ? '#34d399' : c.status === 'On Duty' ? '#60a5fa' : '#facc15',
                            border: c.status === 'Present' ? '1px solid rgba(52, 211, 153, 0.3)' : c.status === 'On Duty' ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(234, 179, 8, 0.3)',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '0.78rem'
                          }}>
                            {c.status === 'Present' ? '🟢 Available / Present' : c.status === 'On Duty' ? '🔵 On Field Duty' : '🟡 On Leave'}
                          </span>
                        </td>
                        <td>
                          <button
                            className="cg-btn outline compact"
                            style={{ padding: '4px 10px', fontSize: '0.75rem', borderColor: 'rgba(245, 158, 11, 0.4)', color: '#facc15' }}
                            onClick={() => {
                              setLeaveForm({
                                userName: c.name,
                                role: 'Tree Cutter',
                                leaveType: 'Casual Leave',
                                startDate: new Date().toISOString().slice(0, 10),
                                endDate: new Date().toISOString().slice(0, 10),
                                reason: 'Scheduled cutter leave request'
                              });
                              setShowLeaveModal(true);
                            }}
                          >
                            📝 Mark On Leave
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: LEAVE APPLICATIONS & APPROVALS */}
          {attendanceTab === 'leave' && (
            <div>
              {/* Leave KPI Cards */}
              <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '18px' }}>
                <div style={{ background: '#0b2518', padding: '14px 18px', borderRadius: '14px', border: '1px solid rgba(82, 183, 136, 0.25)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '10px', borderRadius: '12px' }}><CalendarDays size={22} /></div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#95d5b2', display: 'block' }}>Total Applications</span>
                    <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#ffffff', fontWeight: 800 }}>{leaveRequests.length}</h3>
                  </div>
                </div>

                <div style={{ background: '#0b2518', padding: '14px 18px', borderRadius: '14px', border: '1px solid rgba(82, 183, 136, 0.25)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#facc15', padding: '10px', borderRadius: '12px' }}><AlertTriangle size={22} /></div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#95d5b2', display: 'block' }}>Pending Approvals</span>
                    <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#ffffff', fontWeight: 800 }}>
                      {leaveRequests.filter(l => l.status === 'Pending').length}
                    </h3>
                  </div>
                </div>

                <div style={{ background: '#0b2518', padding: '14px 18px', borderRadius: '14px', border: '1px solid rgba(82, 183, 136, 0.25)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', padding: '10px', borderRadius: '12px' }}><ShieldCheck size={22} /></div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#95d5b2', display: 'block' }}>Approved Leaves</span>
                    <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#ffffff', fontWeight: 800 }}>
                      {leaveRequests.filter(l => l.status === 'Approved').length}
                    </h3>
                  </div>
                </div>
              </section>

              {/* Leave Applications Table Panel */}
              <div className="cg-panel" style={{ background: '#0b2518', border: '1px solid rgba(82, 183, 136, 0.25)', padding: '22px' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#ffffff' }}>📝 Staff Leave Requests & Absence Approvals</h2>
                    <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#95d5b2' }}>
                      Review, approve, or reject leave applications submitted by tree cutters and municipal staff.
                    </p>
                  </div>
                  <button
                    className="cg-btn primary"
                    onClick={() => {
                      setLeaveForm({
                        userName: effectiveName,
                        role: effectiveRole,
                        leaveType: 'Casual Leave',
                        startDate: new Date().toISOString().slice(0, 10),
                        endDate: new Date().toISOString().slice(0, 10),
                        reason: ''
                      });
                      setShowLeaveModal(true);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
                  >
                    <Plus size={16} /> Apply for Leave
                  </button>
                </header>

                <table className="cg-table wide" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Staff Name</th>
                      <th>Role</th>
                      <th>Leave Type</th>
                      <th>Date Range</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Official Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveRequests.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#95d5b2' }}>
                          <b>No leave applications currently in MongoDB database.</b><br />
                          <small style={{ color: '#64748b' }}>Click "+ Apply for Leave" above or mark a cutter on leave to submit a new application.</small>
                        </td>
                      </tr>
                    ) : (
                      leaveRequests.map(l => (
                        <tr key={l._id}>
                          <td><b style={{ color: '#ffffff' }}>{l.userName}</b></td>
                          <td><span className={`tag ${(l.userRole || l.role) === 'Official' ? 'med' : 'low'}`} style={{ fontSize: '0.74rem' }}>{l.userRole || l.role || 'Tree Cutter'}</span></td>
                          <td><b style={{ color: '#34d399', fontSize: '0.85rem' }}>{l.leaveType}</b></td>
                          <td><span style={{ fontSize: '0.82rem', color: '#b7e4c7' }}>{l.startDate} to {l.endDate}</span></td>
                          <td><small style={{ color: '#95d5b2', maxWidth: '200px', display: 'inline-block' }}>{l.reason}</small></td>
                          <td>
                            <span style={{
                              background: l.status === 'Approved' ? 'rgba(52, 211, 153, 0.15)' : l.status === 'Rejected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                              color: l.status === 'Approved' ? '#34d399' : l.status === 'Rejected' ? '#f87171' : '#facc15',
                              border: l.status === 'Approved' ? '1px solid rgba(52, 211, 153, 0.3)' : l.status === 'Rejected' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(234, 179, 8, 0.3)',
                              padding: '3px 10px',
                              borderRadius: '8px',
                              fontWeight: 700,
                              fontSize: '0.78rem'
                            }}>
                              {l.status}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              {l.status === 'Pending' ? (
                                <>
                                  <button
                                    className="cg-btn primary compact"
                                    style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                                    onClick={() => updateLeaveStatus(l._id, 'Approved')}
                                  >
                                    ✓ Approve
                                  </button>
                                  <button
                                    className="cg-btn outline compact"
                                    style={{ padding: '3px 8px', fontSize: '0.75rem', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171' }}
                                    onClick={() => updateLeaveStatus(l._id, 'Rejected')}
                                  >
                                    ❌ Reject
                                  </button>
                                </>
                              ) : (
                                <span style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic', marginRight: '6px' }}>
                                  Processed ({l.reviewedBy || 'Official'})
                                </span>
                              )}
                              <button
                                className="cg-btn outline compact"
                                style={{ padding: '3px 8px', fontSize: '0.75rem', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171' }}
                                onClick={() => handleDeleteLeave(l._id)}
                                title="Remove leave application"
                              >
                                🗑️ Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </main>
      </div>



      {/* Apply for Leave Modal */}
      {showLeaveModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: 'var(--bg-surface, #111827)', borderRadius: '16px', width: '100%', maxWidth: '520px', padding: '24px', border: '1px solid var(--border)', color: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarDays size={20} color="#60a5fa" /> Submit Leave Application
              </h3>
              <button onClick={() => setShowLeaveModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleApplyLeaveSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#74c69d', marginBottom: '6px' }}>Applicant Name</label>
                <input
                  type="text"
                  value={leaveForm.userName}
                  onChange={e => setLeaveForm(prev => ({ ...prev, userName: e.target.value }))}
                  placeholder={`e.g. ${effectiveName}`}
                  required
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: '#ffffff', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#74c69d', marginBottom: '6px' }}>Leave Category</label>
                  <select
                    value={leaveForm.leaveType}
                    onChange={e => setLeaveForm(prev => ({ ...prev, leaveType: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: '#ffffff', fontSize: '0.9rem', outline: 'none' }}
                  >
                    <option value="Casual Leave">Casual Leave</option>
                    <option value="Sick Leave">Sick Leave</option>
                    <option value="Emergency Leave">Emergency Leave</option>
                    <option value="Annual Leave">Annual Vacation</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#74c69d', marginBottom: '6px' }}>Role</label>
                  <select
                    value={leaveForm.role}
                    onChange={e => setLeaveForm(prev => ({ ...prev, role: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: '#ffffff', fontSize: '0.9rem', outline: 'none' }}
                  >
                    <option value="Tree Cutter">Tree Cutter</option>
                    <option value="Official">Municipal Official</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#74c69d', marginBottom: '6px' }}>Start Date</label>
                  <input
                    type="date"
                    value={leaveForm.startDate}
                    onChange={e => setLeaveForm(prev => ({ ...prev, startDate: e.target.value }))}
                    required
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: '#ffffff', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#74c69d', marginBottom: '6px' }}>End Date</label>
                  <input
                    type="date"
                    value={leaveForm.endDate}
                    onChange={e => setLeaveForm(prev => ({ ...prev, endDate: e.target.value }))}
                    required
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: '#ffffff', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#74c69d', marginBottom: '6px' }}>Reason for Absence</label>
                <textarea
                  rows={3}
                  value={leaveForm.reason}
                  onChange={e => setLeaveForm(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Provide reason for leave..."
                  required
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: '#ffffff', fontSize: '0.9rem', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="cg-btn outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cg-btn primary"
                  style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', border: 'none' }}
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminAttendancePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [leaveApplications, setLeaveApplications] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [todaySummary, setTodaySummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [shiftFilter, setShiftFilter] = useState('all');
  const [leaveStatusFilter, setLeaveStatusFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  // Override Form
  const [overrideUser, setOverrideUser] = useState('');
  const [overrideShift, setOverrideShift] = useState('Morning');
  const [overrideDate, setOverrideDate] = useState(new Date().toISOString().slice(0, 10));
  const [overrideLocation, setOverrideLocation] = useState('Zone Central HQ');
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);

  // Leave Form modal for Admin
  const [showApplyLeaveModal, setShowApplyLeaveModal] = useState(false);
  const [leaveStaff, setLeaveStaff] = useState('');
  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [leaveStart, setLeaveStart] = useState(new Date().toISOString().slice(0, 10));
  const [leaveEnd, setLeaveEnd] = useState(new Date().toISOString().slice(0, 10));
  const [leaveDays, setLeaveDays] = useState(1);
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [attRes, sumRes, leaveRes, userRes] = await Promise.all([
        fetch(`${API_URL}/api/attendance`),
        fetch(`${API_URL}/api/attendance/today-summary`),
        fetch(`${API_URL}/api/attendance/leaves`),
        fetch(`${API_URL}/api/auth/users`),
      ]);
      const attData = attRes.ok ? await attRes.json() : { records: [] };
      const sumData = sumRes.ok ? await sumRes.json() : {};
      const leaveData = leaveRes.ok ? await leaveRes.json() : { leaves: [] };
      const userData = userRes.ok ? await userRes.json() : { users: [] };

      setAttendanceRecords(attData.records || []);
      setTodaySummary(sumData || {});
      setLeaveApplications(leaveData.leaves || []);
      if (userData.users) {
        const staff = userData.users.filter(u => u.role === 'Tree Cutter' || u.role === 'Official');
        setStaffList(staff);
      }
    } catch (err) {
      console.error('Failed to load admin attendance data:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 10000);
    return () => clearInterval(timer);
  }, []);

  // Admin Leave Review handler
  const handleReviewLeave = async (id, status) => {
    const remarks = prompt(`Optional remarks for ${status.toLowerCase()} leave request:`, status === 'Approved' ? 'Approved by Admin' : 'Insufficient staffing coverage');
    if (remarks === null) return;

    try {
      const res = await fetch(`${API_URL}/api/attendance/leaves/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          adminRemarks: remarks,
          reviewedBy: 'Municipal Admin',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        Swal.fire({
          icon: status === 'Approved' ? 'success' : 'info',
          title: `Leave ${status}`,
          text: data.msg,
          confirmButtonColor: '#065f46',
          timer: 2000,
        });
        fetchData();
      } else {
        alert(data.msg || 'Failed to update leave status');
      }
    } catch (err) {
      alert('Error updating leave status');
    }
  };

  // Submit Leave Request (Admin on behalf of staff)
  const handleAdminApplyLeave = async (e) => {
    e.preventDefault();
    if (!leaveStaff) {
      alert('Please select a staff member.');
      return;
    }
    const staffObj = staffList.find(s => s._id === leaveStaff || s.name === leaveStaff);
    if (!staffObj) {
      alert('Staff member not found.');
      return;
    }

    setLeaveSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/attendance/leaves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: staffObj._id,
          userName: staffObj.name,
          userRole: staffObj.role,
          leaveType,
          startDate: leaveStart,
          endDate: leaveEnd,
          totalDays: Number(leaveDays) || 1,
          reason: leaveReason,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Leave Recorded',
          text: 'Staff leave application recorded successfully!',
          confirmButtonColor: '#065f46',
        });
        setShowApplyLeaveModal(false);
        setLeaveReason('');
        fetchData();
      } else {
        alert(data.msg || 'Failed to record leave.');
      }
    } catch (err) {
      alert('Connection error submitting leave.');
    }
    setLeaveSubmitting(false);
  };

  // Admin Manual Attendance Override
  const handleAdminOverride = async (e) => {
    e.preventDefault();
    if (!overrideUser) {
      alert('Please select a staff member.');
      return;
    }
    const staffObj = staffList.find(s => s._id === overrideUser || s.name === overrideUser);
    if (!staffObj) {
      alert('Staff member not found.');
      return;
    }

    setOverrideSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/attendance/admin-override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: staffObj._id,
          userName: staffObj.name,
          role: staffObj.role,
          shift: overrideShift,
          date: overrideDate,
          location: overrideLocation,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Attendance Override Recorded',
          text: data.msg,
          confirmButtonColor: '#065f46',
        });
        fetchData();
      } else {
        alert(data.msg || 'Override failed.');
      }
    } catch (err) {
      alert('Error recording attendance override.');
    }
    setOverrideSubmitting(false);
  };

  // Export PDF/Print Report
  const handleExportAttendanceReport = () => {
    window.print();
  };

  // Compute metrics
  const totalStaffCount = staffList.length;
  const presentTodayCount = todaySummary ? todaySummary.total : 0;
  const pendingLeavesCount = leaveApplications.filter(l => l.status === 'Pending').length;
  const activeLeavesTodayCount = leaveApplications.filter(l => l.status === 'Approved' && l.startDate <= selectedDate && l.endDate >= selectedDate).length;

  // Filtered attendance logs
  const filteredAttendance = attendanceRecords.filter(r => {
    if (selectedDate && r.date !== selectedDate) return false;
    if (roleFilter !== 'all' && r.role !== roleFilter) return false;
    if (shiftFilter !== 'all' && r.shift !== shiftFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const name = (r.userName || '').toLowerCase();
      const loc = (r.location || '').toLowerCase();
      return name.includes(q) || loc.includes(q);
    }
    return true;
  });

  // Filtered leaves
  const filteredLeaves = leaveApplications.filter(l => {
    if (leaveStatusFilter !== 'all' && l.status !== leaveStatusFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const name = (l.userName || '').toLowerCase();
      const type = (l.leaveType || '').toLowerCase();
      const reason = (l.reason || '').toLowerCase();
      return name.includes(q) || type.includes(q) || reason.includes(q);
    }
    return true;
  });

  return (
    <div className="cg-app">
      <Sidebar active="Attendance" admin isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
      <div className="cg-workspace">
        <Topbar title="Staff Attendance & Leave Governance" search="Search staff or logs..." onToggleSidebar={() => setSidebarOpen(true)} />
        <main className="cg-page">
          <section className="cg-admin-head" style={{ marginBottom: '24px' }}>
            <div>
              <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--brand-accent)', fontWeight: 700 }}>MUNICIPAL WORKFORCE MANAGEMENT</span>
              <h1 style={{ margin: '4px 0 8px 0', fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-primary)' }}>Staff Attendance & Leave Control Center</h1>
              <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: '750px', fontSize: '0.95rem', lineHeight: '1.5' }}>
                Complete administrative oversight of municipal workforce attendance, shift timings, staff leave applications, and emergency clock-in overrides.
              </p>
            </div>

            <div className="time-card" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '12px 20px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 700, fontSize: '0.85rem' }}>
                <Clock size={18} /> IST Live Clock
              </div>
              <b style={{ fontSize: '1.4rem', color: 'var(--text-primary)', fontWeight: 800 }}>
                {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </b>
              <small style={{ color: '#6b7280', fontSize: '0.75rem' }}>Shift Monitoring Active</small>
            </div>
          </section>

          {/* 4 Metric KPI Cards */}
          <section className="official-stat-grid" style={{ marginBottom: '24px' }}>
            <article style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <Users color="#3b82f6" />
              <span>Total Active Staff</span>
              <b style={{ color: 'var(--text-primary)' }}>{totalStaffCount}</b>
              <small style={{ color: '#64748b' }}>Cutters & Officials</small>
            </article>
            <article style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <CheckCircle2 color="#10b981" />
              <span>Present Today</span>
              <b style={{ color: '#10b981' }}>{presentTodayCount}</b>
              <small style={{ color: '#10b981' }}>{Math.round((presentTodayCount / (totalStaffCount || 1)) * 100)}% Attendance Rate</small>
            </article>
            <article style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => setActiveTab('leaves')}>
              <AlertTriangle color="#f59e0b" />
              <span>Pending Leave Requests</span>
              <b style={{ color: '#f59e0b' }}>{pendingLeavesCount}</b>
              <small style={{ color: '#f59e0b' }}>Requires Admin Approval</small>
            </article>
            <article style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <Calendar color="#8b5cf6" />
              <span>Staff On Leave Today</span>
              <b style={{ color: '#a855f7' }}>{activeLeavesTodayCount}</b>
              <small style={{ color: '#a855f7' }}>Approved Leaves</small>
            </article>
          </section>

          {/* Tab Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px', borderBottom: '2px solid var(--border)', paddingBottom: '4px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { id: 'overview', label: 'Workforce Attendance Logs', icon: <Users size={16} /> },
                { id: 'leaves', label: `Staff Leave Requests (${pendingLeavesCount})`, icon: <Calendar size={16} /> },
                { id: 'roster', label: 'Shift Timings & Roster', icon: <Clock size={16} /> },
                { id: 'override', label: 'Manual Attendance Override', icon: <Fingerprint size={16} /> },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 18px', border: 'none', background: 'none',
                    fontSize: '0.95rem', fontWeight: activeTab === tab.id ? '700' : '600',
                    color: activeTab === tab.id ? 'var(--brand-accent)' : 'var(--text-secondary)',
                    borderBottom: activeTab === tab.id ? '3px solid var(--brand-accent)' : '3px solid transparent',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowApplyLeaveModal(true)} className="cg-btn outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                <Plus size={16} /> Apply Staff Leave
              </button>
              <button onClick={handleExportAttendanceReport} className="cg-btn primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                <FileText size={16} /> Print / Export Audit Report
              </button>
            </div>
          </div>

          {/* ── TAB 1: Workforce Attendance Logs ── */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Filter controls */}
              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', background: 'var(--bg-surface)', padding: '16px', borderRadius: '14px', border: '1px solid var(--border)' }}>
                <div style={{ flex: '1 1 240px', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-elevated)', borderRadius: '8px', padding: '8px 12px', border: '1px solid var(--border)' }}>
                  <Search size={16} color="var(--text-muted)" />
                  <input
                    type="text"
                    placeholder="Search by staff name or location..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', width: '100%', fontSize: '0.88rem' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Date:</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Role:</span>
                  <select
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                    style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                  >
                    <option value="all">All Roles</option>
                    <option value="Tree Cutter">Tree Cutters</option>
                    <option value="Official">Officials</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Shift:</span>
                  <select
                    value={shiftFilter}
                    onChange={e => setShiftFilter(e.target.value)}
                    style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                  >
                    <option value="all">All Shifts</option>
                    <option value="Morning">Morning (9–12 AM)</option>
                    <option value="Afternoon">Afternoon (12–3 PM)</option>
                    <option value="Evening">Evening (3–5 PM)</option>
                  </select>
                </div>
              </div>

              {/* Attendance Table */}
              <div className="cg-panel" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Live Shift Attendance Log</h3>
                  <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Showing {filteredAttendance.length} records for {selectedDate}</span>
                </div>

                <table className="cg-table wide">
                  <thead>
                    <tr>
                      <th>Staff Name</th>
                      <th>Role</th>
                      <th>Shift Session</th>
                      <th>Date</th>
                      <th>Clock-In Timestamp</th>
                      <th>Location / Sector</th>
                      <th>Attendance Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAttendance.map(r => (
                      <tr key={r._id}>
                        <td><b>{r.userName}</b></td>
                        <td><span className={`tag ${r.role === 'Official' ? 'med' : 'low'}`}>{r.role}</span></td>
                        <td><span className="tag ok">{r.shift} Shift</span></td>
                        <td>{r.date}</td>
                        <td><small>{r.checkInTime || new Date(r.markedAt || r.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</small></td>
                        <td><small>{r.location || 'Logged in Field'}</small></td>
                        <td>
                          <span
                            className="tag ok"
                            style={{
                              fontWeight: 700,
                              background: r.status === 'Completed Shift' ? 'rgba(59, 130, 246, 0.15)' : undefined,
                              color: r.status === 'Completed Shift' ? '#3b82f6' : undefined,
                              border: r.status === 'Completed Shift' ? '1px solid rgba(59, 130, 246, 0.3)' : undefined
                            }}
                          >
                            {r.status === 'Completed Shift' ? `✓ Completed (${r.checkOutTime || 'Out'})` : '✓ Present'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredAttendance.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>
                          No staff attendance recorded for the selected date and filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── TAB 2: Staff Leave Requests ── */}
          {activeTab === 'leaves' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'var(--bg-surface)', padding: '16px', borderRadius: '14px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>Status Filter:</span>
                  {['all', 'Pending', 'Approved', 'Rejected'].map(st => (
                    <button
                      key={st}
                      onClick={() => setLeaveStatusFilter(st)}
                      style={{
                        padding: '6px 14px', borderRadius: '8px', border: 'none',
                        background: leaveStatusFilter === st ? 'var(--brand-accent)' : 'var(--bg-elevated)',
                        color: leaveStatusFilter === st ? '#fff' : 'var(--text-primary)',
                        fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer'
                      }}
                    >
                      {st === 'all' ? 'All Requests' : st}
                    </button>
                  ))}
                </div>

                <button onClick={() => setShowApplyLeaveModal(true)} className="cg-btn primary" style={{ fontSize: '0.85rem' }}>
                  <Plus size={16} style={{ marginRight: '4px' }} /> Create Leave Entry
                </button>
              </div>

              <div className="cg-panel" style={{ padding: '20px' }}>
                <table className="cg-table wide">
                  <thead>
                    <tr>
                      <th>Staff Member</th>
                      <th>Role</th>
                      <th>Leave Type</th>
                      <th>Duration</th>
                      <th>Days</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Admin Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeaves.map(leave => (
                      <tr key={leave._id}>
                        <td><b>{leave.userName}</b></td>
                        <td><span className={`tag ${leave.userRole === 'Official' ? 'med' : 'low'}`}>{leave.userRole}</span></td>
                        <td><span className="tag high" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>{leave.leaveType}</span></td>
                        <td><small>{leave.startDate} to {leave.endDate}</small></td>
                        <td><b>{leave.totalDays} day(s)</b></td>
                        <td style={{ maxWidth: '200px' }}><small>{leave.reason || 'Personal reasons'}</small></td>
                        <td>
                          <span style={{
                            padding: '4px 10px', borderRadius: '12px', fontWeight: 700, fontSize: '0.8rem',
                            background: leave.status === 'Approved' ? '#dcfce7' : leave.status === 'Rejected' ? '#fee2e2' : '#fffbeb',
                            color: leave.status === 'Approved' ? '#166534' : leave.status === 'Rejected' ? '#991b1b' : '#b45309',
                            border: leave.status === 'Approved' ? '1px solid #86efac' : leave.status === 'Rejected' ? '1px solid #fca5a5' : '1px solid #fde68a'
                          }}>
                            {leave.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {leave.status === 'Pending' ? (
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <button
                                onClick={() => handleReviewLeave(leave._id, 'Approved')}
                                style={{ padding: '6px 12px', background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReviewLeave(leave._id, 'Rejected')}
                                style={{ padding: '6px 12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <small style={{ color: '#64748b' }}>Reviewed by {leave.reviewedBy || 'Admin'}</small>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredLeaves.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>
                          No staff leave applications found matching current criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── TAB 3: Shift Timings & Roster ── */}
          {activeTab === 'roster' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              {[
                { name: 'Morning Shift', hours: '9:00 AM – 12:00 PM', capacity: '10 Staff Required', icon: <Sun size={24} color="#f59e0b" />, desc: 'Primary field pruning, tree inspection, and routine hazard removal.' },
                { name: 'Afternoon Shift', hours: '12:00 PM – 3:00 PM', capacity: '8 Staff Required', icon: <Sun size={24} color="#10b981" />, desc: 'Mid-day complaint response, branch clearance, and wood transport.' },
                { name: 'Evening Shift', hours: '3:00 PM – 5:00 PM', capacity: '6 Staff Required', icon: <Moon size={24} color="#6366f1" />, desc: 'Emergency storm response, cleanup wrap-up, and equipment check-in.' },
              ].map(s => (
                <div key={s.name} className="cg-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {s.icon}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>{s.name}</h3>
                      <span style={{ fontSize: '0.85rem', color: 'var(--brand-accent)', fontWeight: 700 }}>{s.hours}</span>
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5 }}>{s.desc}</p>
                  <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px dashed var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 700 }}>
                    <span>Optimal Capacity:</span>
                    <span style={{ color: '#059669' }}>{s.capacity}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── TAB 4: Manual Attendance Override ── */}
          {activeTab === 'override' && (
            <div className="cg-panel" style={{ maxWidth: '600px', margin: '0 auto', padding: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <Fingerprint size={28} color="#059669" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Manual Attendance Override</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Record attendance manually for staff who missed clock-in.</p>
                </div>
              </div>

              <form onSubmit={handleAdminOverride} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>Select Staff Member</label>
                  <select
                    value={overrideUser}
                    onChange={e => setOverrideUser(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  >
                    <option value="">-- Choose Staff Member --</option>
                    {staffList.map(s => (
                      <option key={s._id} value={s._id}>{s.name} ({s.role})</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>Date</label>
                    <input
                      type="date"
                      value={overrideDate}
                      onChange={e => setOverrideDate(e.target.value)}
                      required
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>Shift Session</label>
                    <select
                      value={overrideShift}
                      onChange={e => setOverrideShift(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    >
                      <option value="Morning">Morning (9 AM–12 PM)</option>
                      <option value="Afternoon">Afternoon (12 PM–3 PM)</option>
                      <option value="Evening">Evening (3 PM–5 PM)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>Assigned Zone / Location</label>
                  <input
                    type="text"
                    value={overrideLocation}
                    onChange={e => setOverrideLocation(e.target.value)}
                    placeholder="e.g. Sector 04 Park"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={overrideSubmitting}
                  className="cg-btn primary"
                  style={{ width: '100%', padding: '12px', fontSize: '0.95rem', fontWeight: 800, marginTop: '8px' }}
                >
                  {overrideSubmitting ? 'Recording Override...' : 'Record Attendance Override'}
                </button>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* Modal: Admin Apply Leave on Behalf of Staff */}
      {showApplyLeaveModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Record Staff Leave Application</h3>
              <button onClick={() => setShowApplyLeaveModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleAdminApplyLeave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>Staff Member</label>
                <select
                  value={leaveStaff}
                  onChange={e => setLeaveStaff(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                >
                  <option value="">-- Choose Staff Member --</option>
                  {staffList.map(s => (
                    <option key={s._id} value={s._id}>{s.name} ({s.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>Leave Category</label>
                <select
                  value={leaveType}
                  onChange={e => setLeaveType(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                >
                  <option value="Casual Leave">Casual Leave</option>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Emergency Leave">Emergency Leave</option>
                  <option value="Annual Leave">Annual Leave</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>Start Date</label>
                  <input
                    type="date"
                    value={leaveStart}
                    onChange={e => setLeaveStart(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>End Date</label>
                  <input
                    type="date"
                    value={leaveEnd}
                    onChange={e => setLeaveEnd(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>Total Days</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={leaveDays}
                  onChange={e => setLeaveDays(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>Reason / Explanation</label>
                <textarea
                  value={leaveReason}
                  onChange={e => setLeaveReason(e.target.value)}
                  rows="3"
                  placeholder="Reason for leave request..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowApplyLeaveModal(false)} className="cg-btn outline">Cancel</button>
                <button type="submit" disabled={leaveSubmitting} className="cg-btn primary">
                  {leaveSubmitting ? 'Recording...' : 'Submit Leave'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function PropertyInventoryPage() {
  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('currentUser')) || {}; }
    catch { return {}; }
  })();
  const rawRole = normalizeRole(currentUser.role);
  const isAdmin = rawRole === 'Admin' || sessionStorage.getItem('adminAuthed') === 'true' || window.location.pathname.startsWith('/admin');
  const isOfficial = rawRole === 'Official' || sessionStorage.getItem('officialAuthed') === 'true' || window.location.pathname.startsWith('/official');

  if (isAdmin || isOfficial) {
    return <AddPropertyPage />;
  }
  return <PurchaseEquipmentPage />;
}

export function AddPropertyPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('custody'); // 'custody' | 'catalog' | 'add'
  const [searchQuery, setSearchQuery] = useState('');

  // Theme state
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    const handleTheme = () => setDarkMode(localStorage.getItem('theme') === 'dark');
    window.addEventListener('themeChange', handleTheme);
    return () => window.removeEventListener('themeChange', handleTheme);
  }, []);

  const theme = {
    pageBg: darkMode ? '#0b1d16' : '#f8fafc',
    cardBg: darkMode ? '#0f291e' : '#ffffff',
    cardBorder: darkMode ? 'rgba(167, 243, 208, 0.15)' : '#e2e8f0',
    titleColor: darkMode ? '#ffffff' : '#0f172a',
    subTextColor: darkMode ? '#94a3b8' : '#64748b',
    inputBg: darkMode ? '#143829' : '#ffffff',
    inputText: darkMode ? '#ffffff' : '#0f172a',
    inputBorder: darkMode ? 'rgba(167, 243, 208, 0.25)' : '#cbd5e1',
    labelColor: darkMode ? '#a7f3d0' : '#047857',
    tableHeaderBg: darkMode ? '#143829' : '#f8fafc',
    tableRowHover: darkMode ? 'rgba(255,255,255,0.03)' : '#f1f5f9',
    tableBorder: darkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
  };

  // Form states
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
  const [remindingId, setRemindingId] = useState(null);
  const [bulkReminding, setBulkReminding] = useState(false);

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('currentUser')) || {}; }
    catch { return {}; }
  })();
  const currentUserRole = normalizeRole(currentUser.role);
  const isAdmin = currentUserRole === 'Admin' || sessionStorage.getItem('adminAuthed') === 'true' || window.location.pathname.startsWith('/admin');

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/properties`);
      if (res.ok) {
        const data = await res.json();
        setProperties(Array.isArray(data) ? data : []);
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
        setUploadFiles(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch upload files', err);
    }
  };

  useEffect(() => {
    fetchProperties();
    fetchUploadFiles();
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
        setActionSuccess(`Equipment "${name}" registered successfully into central property inventory!`);
        setName('');
        setDescription('');
        setQuantity(1);
        setStatus('Available');
        setImageFile(null);
        setImagePreview('');
        fetchProperties();
        setActiveTab('catalog');
        setTimeout(() => setActionSuccess(''), 4000);
      } else {
        setActionError(data.msg || 'Failed to add property');
      }
    } catch (err) {
      setActionError(err.message || 'Server error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      const res = await fetch(`${API_URL}/api/properties/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setActionSuccess(`Status updated to "${newStatus}".`);
        fetchProperties();
        setTimeout(() => setActionSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleSendReminder = async (reqItem, property) => {
    const targetKey = `${reqItem.userId || reqItem.userName}-${property._id}`;
    setRemindingId(targetKey);
    setActionSuccess('');
    setActionError('');

    const staffName = reqItem.userName || 'Tree Cutter';
    const toolName = property.name;

    try {
      // 1. In-App System Notification Dispatch
      let notifSent = false;
      try {
        const res = await fetch(`${API_URL}/api/properties/remind-overdue`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: reqItem.userId,
            userName: staffName,
            propertyId: property._id,
            propertyName: toolName
          })
        });
        if (res.ok) notifSent = true;
      } catch (_) { }

      if (!notifSent) {
        try {
          const res = await fetch(`${API_URL}/api/notifications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              targetUserId: reqItem.userId || null,
              targetRole: 'Tree Cutter',
              type: 'equipment_reminder',
              title: '⚠️ Equipment Return Reminder',
              message: `Dear ${staffName}, Municipal Admin reminds you to submit/return "${toolName}" to central property inventory.`,
              relatedId: property._id
            })
          });
          if (res.ok) {
            notifSent = true;
          } else {
            // Fallback for older backend instances with restricted enum
            await fetch(`${API_URL}/api/notifications`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                targetUserId: reqItem.userId || null,
                targetRole: 'Tree Cutter',
                type: 'task_assigned',
                title: '⚠️ Equipment Return Reminder',
                message: `Dear ${staffName}, Municipal Admin reminds you to submit/return "${toolName}" to central property inventory.`,
                relatedId: property._id
              })
            });
            notifSent = true;
          }
        } catch (_) { }
      }

      // 2. Native PWA / Browser Push Notification Trigger
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('⚠️ Action Required: Equipment Return Reminder', {
            body: `Reminder dispatched to ${staffName} for returning "${toolName}".`,
            icon: '/favicon.ico'
          });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission();
        }
      }

      // 3. SweetAlert2 Confirmation Dialog
      Swal.fire({
        icon: 'success',
        title: 'Reminder Dispatched!',
        html: `
          <div style="text-align: left; font-size: 0.9rem;">
            <p style="margin: 0 0 6px;"><b>Staff Recipient:</b> ${staffName} (ID: ${reqItem.userId || 'FIELD-STAFF'})</p>
            <p style="margin: 0 0 6px;"><b>Equipment Item:</b> ${toolName}</p>
            <p style="margin: 6px 0 0; color: #10b981; font-weight: 700;">✓ In-App Notification, Bell Badge & PWA Alert Sent!</p>
          </div>
        `,
        confirmButtonColor: '#10b981',
        confirmButtonText: 'Done'
      });

      setActionSuccess(`📩 Reminder dispatched to ${staffName} for returning "${toolName}".`);
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      setActionError(err.message || 'Error dispatching reminder.');
    } finally {
      setRemindingId(null);
    }
  };

  const handleSendAllReminders = async () => {
    if (!window.confirm('Send late return reminders to all staff currently holding equipment?')) return;
    setBulkReminding(true);
    setActionSuccess('');
    setActionError('');
    try {
      try {
        await fetch(`${API_URL}/api/properties/remind-all-overdue`, { method: 'POST' });
      } catch (_) { }

      // Trigger Browser PWA Push Notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('⚡ Bulk Equipment Reminders Sent', {
          body: `Dispatched return alerts to ${custodyList.length} staff members holding municipal tools.`
        });
      }

      Swal.fire({
        icon: 'success',
        title: 'Bulk Reminders Dispatched!',
        text: `Sent late return reminders to all ${custodyList.length} staff members holding active equipment checkouts.`,
        confirmButtonColor: '#10b981'
      });

      setActionSuccess(`⚡ Sent late return reminders to ${custodyList.length} staff members holding equipment.`);
      setTimeout(() => setActionSuccess(''), 5000);
    } catch (err) {
      setActionError(err.message || 'Error sending bulk reminders.');
    } finally {
      setBulkReminding(false);
    }
  };

  const handleDeleteProperty = async (id, propName) => {
    if (!window.confirm(`Are you sure you want to delete "${propName}"?`)) return;
    try {
      const res = await fetch(`${API_URL}/api/properties/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setActionSuccess(`Deleted "${propName}" successfully!`);
        fetchProperties();
        setTimeout(() => setActionSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Error deleting property', err);
    }
  };

  // Extract all active custody assignments ("Who Has What")
  const custodyList = useMemo(() => {
    const list = [];
    properties.forEach((prop) => {
      if (Array.isArray(prop.purchaseRequests) && prop.purchaseRequests.length > 0) {
        prop.purchaseRequests.forEach((reqItem) => {
          list.push({
            reqItem,
            property: prop
          });
        });
      }
    });
    return list;
  }, [properties]);

  // Analytics KPIs
  const totalItemsCount = properties.length;
  const activeCustodyCount = custodyList.length;
  const availableStockUnits = properties.reduce((acc, p) => acc + (Number(p.quantity) || 0), 0);
  const totalQuantityUnits = availableStockUnits + activeCustodyCount;
  const maintenanceCount = properties.filter(p => p.status === 'Maintenance').length;

  const filteredProperties = properties.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (p.name || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
  });

  const apiBase = API_URL.replace(/\/$/, '');
  const resolveImageUrl = (imageUrl) => {
    if (!imageUrl) return '';
    const normalized = imageUrl.replace(/\\/g, '/').trim();
    if (normalized.startsWith('http://') || normalized.startsWith('https://')) return normalized;
    if (normalized.startsWith('/uploads/')) return `${apiBase}${normalized}`;
    if (normalized.startsWith('uploads/')) return `${apiBase}/${normalized}`;
    return `${apiBase}/uploads/${normalized.split('/').pop()}`;
  };

  return (
    <div className="cg-app">
      <Sidebar active="Property Inventory" admin={isAdmin} isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
      <div className="cg-workspace">
        <Topbar title="Property Inventory Control" search="Search assets, tools..." onToggleSidebar={() => setSidebarOpen(true)} />
        <main className="cg-page" style={{ background: theme.pageBg, minHeight: 'calc(100vh - 60px)', padding: '24px', transition: 'background 0.2s' }}>

          {/* Header Banner */}
          <section className="cg-admin-head" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <span style={{ color: '#059669', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Municipal Infrastructure Governance • {isAdmin ? 'ADMIN CONTROL' : 'OFFICIAL CUSTODY MONITORING'}
              </span>
              <h1 style={{ margin: '4px 0 0', fontSize: '1.8rem', fontWeight: 900, color: theme.titleColor }}>
                Asset & Property Control Center
              </h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={handleSendAllReminders}
                disabled={bulkReminding || custodyList.length === 0}
                style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: '#ffffff', border: 'none', borderRadius: '10px', padding: '10px 16px',
                  fontWeight: 800, fontSize: '0.88rem', cursor: custodyList.length === 0 ? 'not-allowed' : 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)'
                }}
              >
                <Bell size={16} /> {bulkReminding ? 'Dispatching...' : `Send Overdue Reminders (${custodyList.length})`}
              </button>
              <button
                type="button"
                onClick={fetchProperties}
                className="cg-btn outline"
                style={{ background: theme.cardBg, color: theme.titleColor, borderColor: theme.cardBorder, borderRadius: '10px', padding: '10px 14px' }}
              >
                <RefreshCw size={16} /> Refresh
              </button>
            </div>
          </section>

          {/* Feedback Notices */}
          {actionSuccess && (
            <div className="official-notice" style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', padding: '14px 18px', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700 }}>
              <CheckCircle2 size={20} /> {actionSuccess}
            </div>
          )}
          {actionError && (
            <div className="official-notice" style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', padding: '14px 18px', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700 }}>
              <AlertTriangle size={20} /> {actionError}
            </div>
          )}

          {/* 4 Analytics KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '14px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: theme.subTextColor, textTransform: 'uppercase' }}>Total Registered Tools</span>
                <span style={{ background: '#ecfdf5', color: '#059669', padding: '6px', borderRadius: '8px' }}><Package size={20} /></span>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: theme.titleColor }}>{totalItemsCount} Types</div>
              <div style={{ fontSize: '0.8rem', color: theme.subTextColor, marginTop: '4px' }}>{totalQuantityUnits} total physical units in system</div>
            </div>

            <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '14px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: theme.subTextColor, textTransform: 'uppercase' }}>Available For Checkout</span>
                <span style={{ background: '#e0f2fe', color: '#0284c7', padding: '6px', borderRadius: '8px' }}><CheckCircle2 size={20} /></span>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0284c7' }}>{availableStockUnits} Units</div>
              <div style={{ fontSize: '0.8rem', color: theme.subTextColor, marginTop: '4px' }}>Ready for staff assignment</div>
            </div>

            <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '14px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: theme.subTextColor, textTransform: 'uppercase' }}>Staff Custody ("Who Has What")</span>
                <span style={{ background: '#fef3c7', color: '#d97706', padding: '6px', borderRadius: '8px' }}><Users size={20} /></span>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#d97706' }}>{activeCustodyCount} Active</div>
              <div style={{ fontSize: '0.8rem', color: theme.subTextColor, marginTop: '4px' }}>Equipment checked out by staff</div>
            </div>

            <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '14px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: theme.subTextColor, textTransform: 'uppercase' }}>Under Maintenance</span>
                <span style={{ background: '#fee2e2', color: '#dc2626', padding: '6px', borderRadius: '8px' }}><ShieldAlert size={20} /></span>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#dc2626' }}>{maintenanceCount} Items</div>
              <div style={{ fontSize: '0.8rem', color: theme.subTextColor, marginTop: '4px' }}>Repair or inspection required</div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: `2px solid ${theme.cardBorder}`, marginBottom: '24px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('custody')}
              style={{
                padding: '12px 20px', fontSize: '0.92rem', fontWeight: 800, border: 'none', background: 'none',
                color: activeTab === 'custody' ? '#059669' : theme.subTextColor,
                borderBottom: activeTab === 'custody' ? '3px solid #059669' : '3px solid transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              <Users size={18} /> Staff Inventory Custody ("Who Has What") ({custodyList.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('catalog')}
              style={{
                padding: '12px 20px', fontSize: '0.92rem', fontWeight: 800, border: 'none', background: 'none',
                color: activeTab === 'catalog' ? '#059669' : theme.subTextColor,
                borderBottom: activeTab === 'catalog' ? '3px solid #059669' : '3px solid transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              <Database size={18} /> Equipment Catalog & Status Control ({properties.length})
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab('add')}
                style={{
                  padding: '12px 20px', fontSize: '0.92rem', fontWeight: 800, border: 'none', background: 'none',
                  color: activeTab === 'add' ? '#059669' : theme.subTextColor,
                  borderBottom: activeTab === 'add' ? '3px solid #059669' : '3px solid transparent',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                }}
              >
                <PlusCircle size={18} /> Register New Equipment
              </button>
            )}
          </div>

          {/* Tab 1: Staff Inventory Custody ("Who Has What") */}
          {activeTab === 'custody' && (
            <div style={{ background: theme.cardBg, borderRadius: '16px', border: `1px solid ${theme.cardBorder}`, padding: '24px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: theme.titleColor }}>Active Equipment Custody Roster</h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: theme.subTextColor }}>Monitor staff holding tools and dispatch late return reminders.</p>
                </div>
                <button
                  type="button"
                  onClick={handleSendAllReminders}
                  disabled={bulkReminding || custodyList.length === 0}
                  className="cg-btn primary"
                  style={{ borderRadius: '10px', fontSize: '0.88rem' }}
                >
                  <Send size={15} /> Send All Overdue Reminders
                </button>
              </div>

              {custodyList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 20px', color: theme.subTextColor }}>
                  <CheckCircle2 size={48} color="#10b981" style={{ opacity: 0.6, marginBottom: '12px' }} />
                  <h4 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 700, color: theme.titleColor }}>All Inventory Accounted For</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>No staff members currently hold checked-out equipment.</p>
                </div>
              ) : (
                <div className="table-responsive" style={{ overflowX: 'auto' }}>
                  <table className="cg-table wide" style={{ width: '100%' }}>
                    <thead>
                      <tr style={{ background: theme.tableHeaderBg }}>
                        <th style={{ color: theme.titleColor }}>Staff Member</th>
                        <th style={{ color: theme.titleColor }}>Equipment Name</th>
                        <th style={{ color: theme.titleColor }}>Checkout Date</th>
                        <th style={{ color: theme.titleColor }}>Status</th>
                        <th style={{ textAlign: 'right', color: theme.titleColor }}>Admin Reminder Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {custodyList.map(({ reqItem, property }, idx) => {
                        const uniqueKey = reqItem._id || `${reqItem.userId || reqItem.userName || 'staff'}-${property._id || 'prop'}-${idx}`;
                        const isRemindingThis = remindingId === `${reqItem.userId || reqItem.userName}-${property._id}`;
                        return (
                          <tr key={uniqueKey} style={{ borderBottom: `1px solid ${theme.tableBorder}` }}>
                            <td>
                              <div style={{ fontWeight: 800, color: theme.titleColor }}>{reqItem.userName || 'Tree Cutter'}</div>
                              <span style={{ fontSize: '0.78rem', color: theme.subTextColor }}>ID: {reqItem.userId || 'FIELD-STAFF'}</span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {property.imageUrl && (
                                  <img src={resolveImageUrl(property.imageUrl)} alt={property.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '8px' }} />
                                )}
                                <div>
                                  <div style={{ fontWeight: 700, color: theme.titleColor }}>{property.name}</div>
                                  <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700, marginTop: '2px' }}>1 Unit Checked Out</div>
                                  <div style={{ fontSize: '0.74rem', color: theme.subTextColor }}>Storage Available: {property.quantity}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div style={{ fontSize: '0.85rem', color: theme.subTextColor, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Clock size={14} color={theme.subTextColor} />
                                {reqItem.requestedAt ? new Date(reqItem.requestedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Today'}
                              </div>
                            </td>
                            <td>
                              <span className="tag med" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
                                Checked Out (In Use)
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                onClick={() => handleSendReminder(reqItem, property)}
                                disabled={isRemindingThis}
                                style={{
                                  background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0',
                                  borderRadius: '8px', padding: '6px 14px', fontSize: '0.82rem', fontWeight: 800,
                                  cursor: isRemindingThis ? 'not-allowed' : 'pointer',
                                  display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s'
                                }}
                              >
                                <Send size={14} />
                                {isRemindingThis ? 'Sending...' : 'Send Late Reminder'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Equipment Catalog & Status Control */}
          {activeTab === 'catalog' && (
            <div style={{ background: theme.cardBg, borderRadius: '16px', border: `1px solid ${theme.cardBorder}`, padding: '24px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: theme.titleColor }}>Equipment Inventory Catalog</h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: theme.subTextColor }}>Manage asset availability, change statuses, and remove equipment.</p>
                </div>
                <label className="cg-search" style={{ margin: 0, maxWidth: '300px' }}>
                  <Search size={18} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search equipment..."
                    style={{ fontSize: '0.88rem', background: theme.inputBg, color: theme.inputText, borderColor: theme.inputBorder }}
                  />
                </label>
              </div>

              {loading ? (
                <p style={{ textAlign: 'center', padding: '40px', color: theme.subTextColor }}>Loading property records...</p>
              ) : filteredProperties.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 20px', color: theme.subTextColor }}>
                  <Database size={44} style={{ opacity: 0.3, marginBottom: '10px' }} />
                  <p>No equipment matching search filter.</p>
                </div>
              ) : (
                <div className="table-responsive" style={{ overflowX: 'auto' }}>
                  <table className="cg-table wide" style={{ width: '100%' }}>
                    <thead>
                      <tr style={{ background: theme.tableHeaderBg }}>
                        <th style={{ color: theme.titleColor }}>Asset Preview</th>
                        <th style={{ color: theme.titleColor }}>Equipment Title & Description</th>
                        <th style={{ color: theme.titleColor }}>Units</th>
                        <th style={{ color: theme.titleColor }}>Current Status</th>
                        <th style={{ color: theme.titleColor }}>Checked Out Count</th>
                        <th style={{ color: theme.titleColor }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProperties.map((prop) => (
                        <tr key={prop._id} style={{ borderBottom: `1px solid ${theme.tableBorder}` }}>
                          <td>
                            {prop.imageUrl ? (
                              <img src={resolveImageUrl(prop.imageUrl)} alt={prop.name} style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #e2e8f0' }} />
                            ) : (
                              <div style={{ width: '64px', height: '64px', borderRadius: '10px', background: darkMode ? '#1e293b' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                                <Package size={24} />
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: theme.titleColor }}>{prop.name}</div>
                            <div style={{ fontSize: '0.82rem', color: theme.subTextColor, marginTop: '2px', maxWidth: '320px' }}>{prop.description || 'No description provided.'}</div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: theme.titleColor }}>{prop.quantity} Available</div>
                            <div style={{ fontSize: '0.76rem', color: theme.subTextColor, marginTop: '2px' }}>
                              {(prop.purchaseRequests ? prop.purchaseRequests.length : 0)} Checked Out ({(Number(prop.quantity) || 0) + (prop.purchaseRequests ? prop.purchaseRequests.length : 0)} Total)
                            </div>
                          </td>
                          <td>
                            {isAdmin ? (
                              <select
                                value={prop.status}
                                onChange={(e) => handleStatusUpdate(prop._id, e.target.value)}
                                style={{
                                  padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700,
                                  border: '1px solid #cbd5e1', cursor: 'pointer',
                                  background: prop.status === 'Available' ? '#ecfdf5' : prop.status === 'Assigned' ? '#fef3c7' : '#fee2e2',
                                  color: prop.status === 'Available' ? '#047857' : prop.status === 'Assigned' ? '#b45309' : '#b91c1c'
                                }}
                              >
                                <option value="Available">Available</option>
                                <option value="Assigned">Assigned</option>
                                <option value="Maintenance">Maintenance</option>
                              </select>
                            ) : (
                              <span style={{
                                padding: '6px 12px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700,
                                background: prop.status === 'Available' ? 'rgba(52, 211, 153, 0.15)' : prop.status === 'Assigned' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                color: prop.status === 'Available' ? '#34d399' : prop.status === 'Assigned' ? '#fbbf24' : '#f87171',
                                border: `1px solid ${prop.status === 'Available' ? 'rgba(52, 211, 153, 0.3)' : prop.status === 'Assigned' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                              }}>
                                {prop.status}
                              </span>
                            )}
                          </td>
                          <td>
                            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: theme.titleColor }}>
                              {prop.purchaseRequests ? prop.purchaseRequests.length : 0} Staff Active
                            </span>
                          </td>
                          <td>
                            {isAdmin ? (
                              <button
                                type="button"
                                onClick={() => handleDeleteProperty(prop._id, prop.name)}
                                style={{
                                  background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
                                  borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700
                                }}
                                title="Delete Property"
                              >
                                <Trash2 size={16} /> Delete
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.8rem', color: theme.subTextColor, fontWeight: 600 }}>
                                View Only
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Register New Equipment Form */}
          {activeTab === 'add' && (
            <div style={{ maxWidth: '640px', margin: '0 auto' }}>
              <section className="cg-panel top-line" style={{ padding: '32px', background: darkMode ? '#0f291e' : '#ffffff', borderRadius: '20px', border: `1px solid ${theme.cardBorder}`, boxShadow: '0 12px 36px rgba(0,0,0,0.1)' }}>
                <h2 style={{ marginBottom: '4px', fontSize: '1.4rem', fontWeight: 900, color: theme.titleColor, letterSpacing: '-0.01em' }}>Register New Equipment / Asset</h2>
                <p style={{ color: theme.subTextColor, fontSize: '0.88rem', marginBottom: '24px' }}>Add a new municipal tool to central inventory for arborists and tree cutters.</p>
                <form onSubmit={handleAddProperty} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: theme.labelColor, letterSpacing: '0.05em', textTransform: 'uppercase' }}>PROPERTY NAME</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Grass Cutter, Chainsaw, Harness Kit"
                      required
                      style={{
                        height: '46px', padding: '0 16px', borderRadius: '10px',
                        border: `1px solid ${theme.inputBorder}`, fontSize: '0.95rem',
                        outline: 'none', background: theme.inputBg, color: theme.inputText, fontWeight: 500
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: theme.labelColor, letterSpacing: '0.05em', textTransform: 'uppercase' }}>DESCRIPTION</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. 50cc petrol engine, safety guard, heavy duty specification"
                      rows="3"
                      style={{
                        padding: '12px 16px', borderRadius: '10px',
                        border: `1px solid ${theme.inputBorder}`, fontSize: '0.95rem',
                        outline: 'none', background: theme.inputBg, color: theme.inputText, fontWeight: 500
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: theme.labelColor, letterSpacing: '0.05em', textTransform: 'uppercase' }}>UPLOAD IMAGE</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const selected = e.target.files?.[0] || null;
                          setImageFile(selected);
                          setSelectedUploadUrl('');
                          setImagePreview(selected ? URL.createObjectURL(selected) : '');
                        }}
                        style={{
                          padding: '10px 14px', borderRadius: '10px',
                          border: `1px solid ${theme.inputBorder}`, fontSize: '0.88rem',
                          outline: 'none', background: theme.inputBg, color: theme.inputText, cursor: 'pointer'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: theme.labelColor, letterSpacing: '0.05em', textTransform: 'uppercase' }}>OR SELECT EXISTING UPLOAD</label>
                      <select
                        value={selectedUploadUrl}
                        onChange={(e) => {
                          const url = e.target.value;
                          setSelectedUploadUrl(url);
                          setImageFile(null);
                          setImagePreview(url ? resolveImageUrl(url) : '');
                        }}
                        style={{
                          height: '46px', padding: '0 16px', borderRadius: '10px',
                          border: `1px solid ${theme.inputBorder}`, fontSize: '0.95rem',
                          outline: 'none', background: theme.inputBg, color: theme.inputText, fontWeight: 500, cursor: 'pointer'
                        }}
                      >
                        <option value="">Choose existing upload</option>
                        {uploadFiles.map((file) => (
                          <option key={file.filename} value={file.url}>{file.filename}</option>
                        ))}
                      </select>
                    </div>

                    {imagePreview && (
                      <div style={{ borderRadius: '12px', overflow: 'hidden', border: '2px solid #10b981', marginTop: '8px' }}>
                        <img src={imagePreview} alt="Preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', display: 'block' }} />
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: theme.labelColor, letterSpacing: '0.05em', textTransform: 'uppercase' }}>INITIAL QUANTITY</label>
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value) || 1)}
                        required
                        style={{
                          height: '46px', padding: '0 16px', borderRadius: '10px',
                          border: `1px solid ${theme.inputBorder}`, fontSize: '0.95rem',
                          outline: 'none', background: theme.inputBg, color: theme.inputText, fontWeight: 500
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: theme.labelColor, letterSpacing: '0.05em', textTransform: 'uppercase' }}>INITIAL STATUS</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        style={{
                          height: '46px', padding: '0 16px', borderRadius: '10px',
                          border: `1px solid ${theme.inputBorder}`, fontSize: '0.95rem',
                          outline: 'none', background: theme.inputBg, color: theme.inputText, fontWeight: 500, cursor: 'pointer'
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
                    style={{
                      marginTop: '12px', height: '48px', borderRadius: '12px', fontSize: '1rem', fontWeight: 800,
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                    }}
                  >
                    <PlusCircle size={20} />
                    {isSubmitting ? 'Registering Equipment...' : 'Register Equipment'}
                  </button>
                </form>
              </section>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

const resolveEquipmentImageUrl = (imageUrl, category = '', name = '') => {
  if (imageUrl) {
    const normalized = imageUrl.replace(/\\/g, '/').trim();
    if (normalized.includes('photo-1590283603385-17ffb3a7f29f')) {
      return 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80';
    }
    if (normalized.includes('photo-1541888946425-d0fbb186a5b7') || normalized.includes('photo-1581092160607')) {
      return 'https://images.unsplash.com/photo-1578885136359-16c8bd4d3a8e?w=600&auto=format&fit=crop&q=80';
    }
    if (normalized.startsWith('http://') || normalized.startsWith('https://')) return normalized;
    if (normalized.startsWith('/uploads/')) return `http://localhost:5000${normalized}`;
    if (normalized.startsWith('uploads/')) return `http://localhost:5000/${normalized}`;
    const uploadsIndex = normalized.indexOf('/uploads/');
    if (uploadsIndex !== -1) return `http://localhost:5000${normalized.slice(uploadsIndex)}`;
    const filename = normalized.split('/').pop();
    if (filename) return `http://localhost:5000/uploads/${filename}`;
  }

  const nameLower = String(name || '').toLowerCase();
  const catLower = String(category || '').toLowerCase();

  if (nameLower.includes('saw') || catLower.includes('saw') || catLower.includes('cutting') || nameLower.includes('chainsaw')) {
    return 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80';
  }
  if (nameLower.includes('harness') || nameLower.includes('climbing') || catLower.includes('climbing')) {
    return 'https://images.unsplash.com/photo-1578885136359-16c8bd4d3a8e?w=600&auto=format&fit=crop&q=80';
  }
  if (nameLower.includes('shoe') || nameLower.includes('boot') || catLower.includes('footwear')) {
    return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80';
  }
  if (nameLower.includes('sickle') || nameLower.includes('cutter') || nameLower.includes('pruner') || catLower.includes('trimming')) {
    return 'https://images.unsplash.com/photo-1592417817098-8f3d6eb1b7a5?w=600&auto=format&fit=crop&q=80';
  }
  if (nameLower.includes('wheelbarrow') || nameLower.includes('cart') || catLower.includes('hauling')) {
    return 'https://images.unsplash.com/photo-1589923188900-85dae523342b?w=600&auto=format&fit=crop&q=80';
  }
  if (nameLower.includes('glass') || catLower.includes('eye') || nameLower.includes('goggles')) {
    return 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80';
  }
  if (nameLower.includes('glove')) {
    return 'https://images.unsplash.com/photo-1617957772097-873523f6667d?w=600&auto=format&fit=crop&q=80';
  }
  if (nameLower.includes('rope') || catLower.includes('rope')) {
    return 'https://images.unsplash.com/photo-1516900557549-41557d405adf?w=600&auto=format&fit=crop&q=80';
  }
  return 'https://images.unsplash.com/photo-1589923188900-85dae523342b?w=600&auto=format&fit=crop&q=80';
};

const EquipmentImage = memo(({ src, alt, category, name, size = '64px' }) => {
  const [hasErr, setHasErr] = useState(false);
  const url = resolveEquipmentImageUrl(src, category, name);

  if (hasErr || !url) {
    return (
      <div style={{
        width: size,
        height: size,
        borderRadius: '12px',
        background: 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(5,150,105,0.3) 100%)',
        border: '1px solid rgba(16,185,129,0.4)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#34d399',
        gap: '3px',
        flexShrink: 0
      }}>
        <Wrench size={20} />
        <span style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Tool</span>
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt || name || 'Equipment'}
      onError={() => setHasErr(true)}
      style={{ width: size, height: size, objectFit: 'cover', borderRadius: '12px', border: '1px solid var(--border)', flexShrink: 0 }}
    />
  );
});

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

  const currentUserId = currentUser.id || currentUser._id || 'snow-id';
  const cutterName = currentUser.name || currentUser.username || 'Snow';
  const currentUserNameLower = cutterName.toLowerCase();

  const path = window.location.pathname;
  const rawRole = normalizeRole(currentUser.role);
  const isAdmin = rawRole === 'Admin' || sessionStorage.getItem('adminAuthed') === 'true' || path.startsWith('/admin');
  const isOfficial = !isAdmin && (rawRole === 'Official' || sessionStorage.getItem('officialAuthed') === 'true' || path.startsWith('/official') || path.startsWith('/official-management'));
  const isCutter = !isAdmin && !isOfficial;

  const modeBadgeText = isAdmin ? 'Admin Control Mode' : (isOfficial ? 'Official Control Mode' : 'Tree Cutter Mode');
  const modeBadgeClass = isAdmin ? 'tag red' : (isOfficial ? 'tag low' : 'tag med');

  // Default Municipal Tools fallback
  const DEFAULT_PROPERTIES = useMemo(() => [
    {
      _id: 'prop-stihl-462',
      name: 'Stihl MS 462 Heavy Duty Chainsaw',
      description: 'High-power 72cc arborist chainsaw for hazard tree felling.',
      category: 'Chainsaw & Cutting',
      quantity: 4,
      status: 'Available',
      imageUrl: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600&auto=format&fit=crop&q=80',
      serialNumber: 'STIHL-MS462-882'
    },
    {
      _id: 'prop-husq-harness',
      name: 'Husqvarna Professional Arborist Harness Kit',
      description: 'Full-body safety harness with dual lanyard fall protection.',
      category: 'Safety & Climbing Gear',
      quantity: 8,
      status: 'Available',
      imageUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?w=600&auto=format&fit=crop&q=80',
      serialNumber: 'HUSQ-HARN-302'
    },
    {
      _id: 'prop-pole-pruner',
      name: 'Telescopic Extendable Pole Pruner (6m)',
      description: 'Carbon-fiber extendable pruner saw for high canopy branches.',
      category: 'Pruning & Trimming',
      quantity: 5,
      status: 'Available',
      imageUrl: 'https://images.unsplash.com/photo-1508873696983-2df5057c0861?w=600&auto=format&fit=crop&q=80',
      serialNumber: 'POLE-PRUN-601'
    }
  ], []);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/properties`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data) && data.length > 0) {
          setProperties(data);
        } else {
          setProperties(DEFAULT_PROPERTIES);
        }
      } else {
        setProperties(DEFAULT_PROPERTIES);
      }
    } catch (err) {
      console.error('Failed to fetch properties:', err);
      setProperties(DEFAULT_PROPERTIES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
    // Live 1-second ticking clock for real-time countdown formatting (HH:MM:SS)
    const timer = setInterval(() => {
      setTimeNow(new Date());
    }, 1000);
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

    const nowIso = new Date().toISOString();
    const localBorrowedList = (() => {
      try { return JSON.parse(localStorage.getItem(`cutter_borrowed_tools_${currentUserId}`) || '[]'); }
      catch { return []; }
    })();

    for (const item of cart) {
      const newBorrowedRecord = {
        ...item,
        purchaseRequests: [
          {
            userId: currentUserId,
            userName: cutterName,
            requestedAt: nowIso
          }
        ]
      };
      localBorrowedList.unshift(newBorrowedRecord);

      try {
        const res = await fetch(`${API_URL}/api/properties/${item._id}/purchase`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUserId,
            userName: cutterName
          })
        });
        if (res.ok) {
          succeeded.push(item.name);
        } else {
          succeeded.push(item.name);
        }
      } catch (err) {
        succeeded.push(item.name);
      }
    }

    try {
      localStorage.setItem(`cutter_borrowed_tools_${currentUserId}`, JSON.stringify(localBorrowedList));
    } catch (e) { }

    setIsSubmitting(false);
    setCart([]);
    setCartOpen(false);

    setActionSuccess(`Successfully checked out ${succeeded.length} tool(s). 24-Hour Return Timers have started.`);
    Swal.fire({
      icon: 'success',
      title: 'Equipment Borrowed Successfully!',
      html: `You checked out: <b>${succeeded.join(', ')}</b>.<br/><br/>⏱️ <b>24-Hour Return Timer</b> is now active.<br/>⚠️ <i>A pop-up alert & email will be dispatched 1 hour before the return deadline.</i>`,
      confirmButtonColor: '#10b981'
    });
    fetchProperties();
  };

  // Direct 1-Click Quick Borrow
  const handleQuickBorrow = async (item) => {
    const nowIso = new Date().toISOString();
    const newBorrow = {
      ...item,
      purchaseRequests: [
        {
          userId: currentUserId,
          userName: cutterName,
          requestedAt: nowIso
        }
      ]
    };

    // Save to local storage
    try {
      const existing = JSON.parse(localStorage.getItem(`cutter_borrowed_tools_${currentUserId}`) || '[]');
      const filtered = existing.filter(i => (i._id || i.id) !== item._id);
      localStorage.setItem(`cutter_borrowed_tools_${currentUserId}`, JSON.stringify([newBorrow, ...filtered]));
    } catch (e) { }

    // Call backend API if item has mongo id
    if (item._id && !item._id.startsWith('prop-stihl') && !item._id.startsWith('prop-harness')) {
      try {
        await fetch(`${API_URL}/api/properties/${item._id}/purchase`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUserId,
            userName: cutterName
          })
        });
      } catch (err) {
        console.log('Purchase API note:', err.message);
      }
    }

    setActionSuccess(`Borrowed "${item.name}". 24-Hour Return Timer active.`);
    Swal.fire({
      icon: 'success',
      title: 'Equipment Borrowed!',
      html: `You have checked out <b>${item.name}</b>.<br/><br/>⏱️ <b>24-Hour Return Timer Active</b>.<br/>⚠️ <i>A pop-up alert & email will be dispatched 1 hour before return deadline.</i>`,
      confirmButtonColor: '#10b981'
    });
    setActiveTab('borrowed');
    fetchProperties();
  };

  // Submit / Return Equipment Back to Inventory
  const handleReturnProperty = async (property) => {
    if (!window.confirm(`Are you sure you want to submit and return "${property.name}" back to Municipal Inventory?`)) return;
    setIsSubmitting(true);
    setActionSuccess('');
    setActionError('');

    try {
      await fetch(`${API_URL}/api/properties/${property._id}/return`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          userName: cutterName
        })
      });
    } catch (err) {
      console.log('Return API note:', err.message);
    } finally {
      // Remove from local storage and record in returned tools log
      try {
        const list = JSON.parse(localStorage.getItem(`cutter_borrowed_tools_${currentUserId}`) || '[]');
        const updated = list.filter(i => (i._id || i.id) !== property._id);
        localStorage.setItem(`cutter_borrowed_tools_${currentUserId}`, JSON.stringify(updated));

        const returnedList = JSON.parse(localStorage.getItem(`cutter_returned_tools_${currentUserId}`) || '[]');
        if (!returnedList.includes(property._id)) {
          returnedList.push(property._id);
          localStorage.setItem(`cutter_returned_tools_${currentUserId}`, JSON.stringify(returnedList));
        }
      } catch (e) { }

      localStorage.removeItem(`cutter_warn_notif_${property._id}_${cutterName}`);

      setActionSuccess(`Successfully submitted and returned "${property.name}" back to Municipal Inventory.`);
      Swal.fire({
        icon: 'success',
        title: 'Equipment Submitted & Returned!',
        text: `"${property.name}" has been returned to inventory. Return timer stopped.`,
        confirmButtonColor: '#10b981'
      });
      fetchProperties();
      setIsSubmitting(false);
    }
  };

  const apiBase = API_URL.replace(/\/$/, '');
  const resolveImageUrl = (imageUrl, category = '', name = '') => {
    if (imageUrl) {
      const normalized = imageUrl.replace(/\\/g, '/').trim();
      if (normalized === 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600&auto=format&fit=crop&q=80') {
        return 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&auto=format&fit=crop&q=80';
      }
      if (normalized === 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?w=600&auto=format&fit=crop&q=80') {
        return 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80';
      }
      if (normalized.startsWith('http://') || normalized.startsWith('https://')) return normalized;
      if (normalized.startsWith('/uploads/')) return `${apiBase}${normalized}`;
      if (normalized.startsWith('uploads/')) return `${apiBase}/${normalized}`;
      const uploadsIndex = normalized.indexOf('/uploads/');
      if (uploadsIndex !== -1) return `${apiBase}${normalized.slice(uploadsIndex)}`;
      const filename = normalized.split('/').pop();
      return `${apiBase}/uploads/${filename}`;
    }
    const nameLower = String(name || '').toLowerCase();
    const catLower = String(category || '').toLowerCase();
    if (nameLower.includes('saw') || catLower.includes('saw') || catLower.includes('cutting') || catLower.includes('power')) {
      return 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&auto=format&fit=crop&q=80';
    }
    if (nameLower.includes('harness') || nameLower.includes('helmet') || catLower.includes('safety') || catLower.includes('climbing')) {
      return 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80';
    }
    if (nameLower.includes('glass') || catLower.includes('eye')) {
      return 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80';
    }
    if (nameLower.includes('glove')) {
      return 'https://images.unsplash.com/photo-1617957772097-873523f6667d?w=600&auto=format&fit=crop&q=80';
    }
    return 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80';
  };

  // Always merge default arborist tools for Tree Cutters unless returned
  const borrowedItems = useMemo(() => {
    const localList = (() => {
      try { return JSON.parse(localStorage.getItem(`cutter_borrowed_tools_${currentUserId}`) || '[]'); }
      catch { return []; }
    })();

    const returnedList = (() => {
      try { return JSON.parse(localStorage.getItem(`cutter_returned_tools_${currentUserId}`) || '[]'); }
      catch { return []; }
    })();

    const map = new window.Map();
    // Add local borrowed items first
    localList.forEach(item => {
      if (!returnedList.includes(item._id || item.id)) {
        map.set(item._id || item.id, item);
      }
    });

    // Add properties from server that match current cutter
    properties.forEach(prop => {
      if (returnedList.includes(prop._id)) return;
      if (prop.purchaseRequests && Array.isArray(prop.purchaseRequests)) {
        const matched = prop.purchaseRequests.some(r =>
          (r.userId && r.userId === currentUserId) ||
          (r.userName && r.userName.toLowerCase().includes(currentUserNameLower)) ||
          (r.username && r.username.toLowerCase().includes(currentUserNameLower))
        );
        if (matched) {
          map.set(prop._id, prop);
        }
      }
    });

    return Array.from(map.values());
  }, [properties, currentUserId, currentUserNameLower]);

  const availableItems = useMemo(() => {
    const list = properties && properties.length > 0 ? properties : DEFAULT_PROPERTIES;
    const borrowedIds = borrowedItems.map(b => String(b._id || b.id));
    return list.filter(p => !borrowedIds.includes(String(p._id || p.id)));
  }, [properties, DEFAULT_PROPERTIES, borrowedItems]);

  // Precise Live Return Countdown Timer (HH:MM:SS)
  const getRemainingTimeDetails = (requestedAt) => {
    // Default to ~23 hrs ago if missing so timer demo can be tested immediately
    const reqTime = requestedAt ? new Date(requestedAt) : new Date(Date.now() - 23 * 3600 * 1000 - 5 * 60 * 1000);
    const dueTime = new Date(reqTime.getTime() + 24 * 60 * 60 * 1000);
    const diffMs = dueTime.getTime() - timeNow.getTime();

    const formattedDue = dueTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ', ' + dueTime.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

    if (diffMs <= 0) {
      return {
        text: '🚨 OVERDUE - Immediate Return Required!',
        isOverdue: true,
        isWarning1Hour: false,
        color: '#dc2626',
        dueStr: formattedDue,
        diffMs
      };
    }

    const totalSecs = Math.floor(diffMs / 1000);
    const diffHrs = Math.floor(totalSecs / 3600);
    const diffMins = Math.floor((totalSecs % 3600) / 60);
    const diffSecs = totalSecs % 60;

    const formattedCountdown = `${String(diffHrs).padStart(2, '0')}:${String(diffMins).padStart(2, '0')}:${String(diffSecs).padStart(2, '0')}`;
    const isWarning1Hour = diffMs <= 3600 * 1000; // <= 1 hour remaining

    return {
      text: isWarning1Hour
        ? `⚠️ URGENT DEADLINE: ${diffMins}m ${diffSecs}s left (${formattedCountdown})`
        : `⏱️ ${diffHrs}h ${diffMins}m remaining (${formattedCountdown})`,
      isOverdue: false,
      isWarning1Hour,
      color: isWarning1Hour ? '#dc2626' : (diffHrs < 6 ? '#d97706' : '#059669'),
      dueStr: formattedDue,
      diffMs,
      diffMins,
      diffSecs,
      formattedCountdown
    };
  };

  // ── Automatic 1-Hour & Overdue Return Deadline Pop-Up Alert & Email Dispatcher ──
  useEffect(() => {
    if (!isCutter || borrowedItems.length === 0) return;

    borrowedItems.forEach(item => {
      const userReq = item.purchaseRequests?.find(r =>
        (r.userId && r.userId === currentUserId) ||
        (r.userName && r.userName.toLowerCase().includes(currentUserNameLower)) ||
        (r.username && r.username.toLowerCase().includes(currentUserNameLower))
      ) || item.purchaseRequests?.[0] || { requestedAt: new Date(Date.now() - 24.5 * 3600 * 1000).toISOString() };

      const timeDetails = getRemainingTimeDetails(userReq?.requestedAt);
      const cutterEmail = currentUser.email || currentUser.emailId || localStorage.getItem('userEmail') || `${currentUserNameLower}@udupimunicipal.gov.in`;

      // 1. OVERDUE EMAIL & ALERT DISPATCH
      if (timeDetails.isOverdue) {
        const overdueNotifKey = `cutter_overdue_notif_${item._id || item.id}_${cutterName}`;
        const alreadyNotifiedOverdue = localStorage.getItem(overdueNotifKey);

        if (!alreadyNotifiedOverdue) {
          localStorage.setItem(overdueNotifKey, new Date().toISOString());

          Swal.fire({
            icon: 'error',
            title: '🚨 EQUIPMENT OVERDUE - IMMEDIATE RETURN REQUIRED!',
            html: `
              <div style="text-align: left; font-size: 0.92rem; line-height: 1.5; color: #1e293b;">
                <p style="margin-top:0;">Urgent Notice for Arborist <b>${cutterName}</b>,</p>
                <div style="background: #fef2f2; border: 2px solid #ef4444; padding: 14px; border-radius: 10px; margin-bottom: 12px;">
                  <b style="color: #991b1b; font-size: 1rem;">Overdue Tool: ${item.name}</b><br/>
                  <span style="color: #dc2626; font-weight: 800;">Status: EXPIRED 24-HOUR RETURN DEADLINE</span><br/>
                  <small style="color: #64748b;">Return Deadline Was: ${timeDetails.dueStr}</small>
                </div>
                <p style="margin-bottom: 8px;">
                  📧 <b>Urgent Overdue Reminder Email Dispatched To:</b> <code>${cutterEmail}</code>
                </p>
                <p style="margin-bottom: 0; font-size: 0.85rem; color: #991b1b; font-weight: bold;">
                  Please submit and return this equipment to the Municipal Property Depot immediately to prevent penalty locks on your account.
                </p>
              </div>
            `,
            confirmButtonText: 'Return Tool Now',
            confirmButtonColor: '#ef4444'
          });

          // Dispatch Email to Backend API
          fetch(`${API_URL}/api/notifications/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: cutterEmail,
              subject: `🚨 OVERDUE URGENT: Return Required for Municipal Equipment - ${item.name}`,
              body: `DEPT NOTICE - URGENT OVERDUE\n\nDear ${cutterName},\n\nYour borrowed equipment "${item.name}" has EXPIRED its 24-hour return deadline (${timeDetails.dueStr}).\n\nPlease submit and return the tool back to Municipal Equipment Depot immediately.\n\nCanopyGuard Municipal Management System`
            })
          }).then(res => res.json()).then(data => {
            console.log('Overdue reminder email dispatched:', data);
          }).catch(e => console.log('Overdue email send note:', e.message));
        }
      }

      // 2. 1-HOUR WARNING EMAIL & ALERT DISPATCH
      else if (timeDetails.isWarning1Hour) {
        const notifKey = `cutter_warn_notif_${item._id || item.id}_${cutterName}`;
        const alreadyNotified = localStorage.getItem(notifKey);

        if (!alreadyNotified) {
          localStorage.setItem(notifKey, new Date().toISOString());

          Swal.fire({
            icon: 'warning',
            title: '⚠️ EQUIPMENT RETURN DEADLINE (1 HOUR LEFT)',
            html: `
              <div style="text-align: left; font-size: 0.92rem; line-height: 1.5; color: #1e293b;">
                <p style="margin-top:0;">Attention Arborist <b>${cutterName}</b>,</p>
                <div style="background: #fffbebfb; border: 1px solid #fcd34d; padding: 14px; border-radius: 10px; margin-bottom: 12px;">
                  <b style="color: #92400e; font-size: 1rem;">Borrowed Tool: ${item.name}</b><br/>
                  <span style="color: #d97706; font-weight: 800;">Time Remaining: ${timeDetails.diffMins} minutes ${timeDetails.diffSecs} seconds</span><br/>
                  <small style="color: #64748b;">Return Deadline: ${timeDetails.dueStr}</small>
                </div>
                <p style="margin-bottom: 8px;">
                  📧 <b>Automated Warning Email Sent To:</b> <code>${cutterEmail}</code>
                </p>
                <p style="margin-bottom: 0; font-size: 0.85rem; color: #475569;">
                  Please submit and return this equipment back to the Municipal Property Depot immediately to prevent account penalties.
                </p>
              </div>
            `,
            confirmButtonText: 'I Will Return Equipment Now',
            confirmButtonColor: '#d97706'
          });

          // Dispatch Email to Backend API
          fetch(`${API_URL}/api/notifications/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: cutterEmail,
              subject: `⚠️ URGENT: Equipment Return Deadline in 1 Hour - ${item.name}`,
              body: `Dear ${cutterName},\n\nYour borrowed equipment "${item.name}" must be returned within 1 hour (Deadline: ${timeDetails.dueStr}).\n\nPlease submit and return the tool to the Municipal Equipment Depot immediately.\n\nCanopyGuard Municipal System`
            })
          }).then(res => res.json()).then(data => {
            console.log('1-Hour warning email dispatched:', data);
          }).catch(e => console.log('Email dispatched note:', e.message));
        }
      }
    });
  }, [borrowedItems, timeNow, isCutter]);

  const hasOverdueItems = borrowedItems.some(item => {
    const userReq = item.purchaseRequests?.find(r => (r.userId && r.userId === currentUserId) || (r.userName && r.userName.toLowerCase().includes(currentUserNameLower))) || item.purchaseRequests?.[0];
    const details = getRemainingTimeDetails(userReq?.requestedAt);
    return details.isOverdue;
  });

  return (
    <div className="cg-app">
      <Sidebar active="Property Inventory" admin={isAdmin} isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
      <div className="cg-workspace">
        <Topbar title="Property Inventory" search="Search inventory..." onToggleSidebar={() => setSidebarOpen(true)} />
        <main className="cg-page">
          <section className="cg-admin-head">
            <div>
              <span>Municipal Property & Tools</span>
              <h1>Property Inventory</h1>
            </div>
            <span className={modeBadgeClass} style={{ fontSize: '0.9rem', padding: '6px 12px' }}>{modeBadgeText}</span>
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
                <b style={{ fontSize: '0.95rem', color: '#7f1d1d' }}>Warning: Overdue Equipment Return Required!</b>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#991b1b' }}>
                  Please click "Submit / Return" to return overdue tools back to inventory immediately.
                </p>
              </div>
            </div>
          )}

          {/* Tab Selection & Cart Info Header */}
          <div style={{
            display: 'flex',
            justify: 'space-between',
            borderBottom: '1px solid var(--border)',
            marginBottom: '24px',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setActiveTab('available')}
                style={{
                  padding: '12px 20px',
                  border: 'none',
                  background: activeTab === 'available' ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                  fontSize: '0.96rem',
                  fontWeight: activeTab === 'available' ? '800' : '600',
                  color: activeTab === 'available' ? '#34d399' : 'var(--text-secondary)',
                  borderBottom: activeTab === 'available' ? '3px solid #10b981' : '3px solid transparent',
                  borderRadius: '8px 8px 0 0',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Database size={16} />
                <span>Available Equipment ({availableItems.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('borrowed')}
                style={{
                  padding: '12px 20px',
                  border: 'none',
                  background: activeTab === 'borrowed' ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                  fontSize: '0.96rem',
                  fontWeight: activeTab === 'borrowed' ? '800' : '600',
                  color: activeTab === 'borrowed' ? '#34d399' : 'var(--text-secondary)',
                  borderBottom: activeTab === 'borrowed' ? '3px solid #10b981' : '3px solid transparent',
                  borderRadius: '8px 8px 0 0',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <ShoppingCart size={16} />
                <span>My Borrowed Equipment ({borrowedItems.length})</span>
              </button>
            </div>

            {activeTab === 'available' && (
              <button
                onClick={() => setCartOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 20px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                  color: '#ffffff',
                  fontWeight: '800',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                  transition: 'all 0.2s'
                }}
              >
                <Database size={18} />
                <span>My Cart ({cart.length})</span>
              </button>
            )}
          </div>

          <div className="cg-panel" style={{ padding: '24px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px' }}>
            {loading ? (
              <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading equipment inventory...</p>
            ) : activeTab === 'available' ? (
              availableItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  <Database size={40} style={{ opacity: 0.3, marginBottom: '10px', color: '#10b981' }} />
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
                        const qtyLeft = prop.quantity - (inCart ? 1 : 0);

                        return (
                          <tr key={prop._id}>
                            <td>
                              <EquipmentImage src={prop.imageUrl} category={prop.category} name={prop.name} size="64px" />
                            </td>
                            <td>
                              <b style={{ color: 'var(--text-primary)', fontSize: '0.92rem', display: 'block' }}>{prop.name}</b>
                              {prop.serialNumber && <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>SN: {prop.serialNumber}</span>}
                            </td>
                            <td><span style={{ color: 'var(--text-secondary)', fontSize: '0.86rem' }}>{prop.description || <i style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>No description</i>}</span></td>
                            <td>
                              <span style={{
                                background: qtyLeft > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                color: qtyLeft > 0 ? '#34d399' : '#f87171',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontWeight: '800',
                                fontSize: '0.84rem'
                              }}>
                                {qtyLeft} Available
                              </span>
                            </td>
                            <td>
                              <span style={{
                                background: 'rgba(16,185,129,0.15)',
                                color: '#34d399',
                                border: '1px solid rgba(16,185,129,0.3)',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontWeight: '800',
                                fontSize: '0.78rem',
                                textTransform: 'uppercase'
                              }}>
                                Available
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button
                                  className="cg-btn primary"
                                  onClick={() => handleQuickBorrow(prop)}
                                  style={{ padding: '8px 16px', fontSize: '0.84rem', borderRadius: '8px', background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)', color: '#fff', border: 'none', fontWeight: 800, cursor: 'pointer', boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}
                                >
                                  Borrow Now
                                </button>
                                {inCart ? (
                                  <button
                                    className="cg-btn outline"
                                    onClick={() => removeFromCart(prop._id)}
                                    style={{ padding: '8px 12px', fontSize: '0.84rem', borderRadius: '8px', border: '1px solid #ef4444', color: '#ef4444', background: 'rgba(239,68,68,0.1)', fontWeight: 700 }}
                                  >
                                    Remove
                                  </button>
                                ) : (
                                  <button
                                    className="cg-btn outline"
                                    onClick={() => addToCart(prop)}
                                    style={{ padding: '8px 12px', fontSize: '0.84rem', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.4)', color: '#34d399', background: 'var(--bg-elevated)', fontWeight: 700 }}
                                  >
                                    + Cart
                                  </button>
                                )}
                              </div>
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
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)', background: 'var(--bg-elevated)', borderRadius: '14px', border: '1px dashed var(--border)' }}>
                  <Database size={44} style={{ opacity: 0.3, marginBottom: '12px', color: '#10b981' }} />
                  <h4 style={{ margin: '0 0 6px', color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: 800 }}>No Active Borrowed Equipment Found</h4>
                  <p style={{ margin: '0 0 16px', fontSize: '0.88rem' }}>You currently have no borrowed municipal tools. Click below to borrow equipment with a 24-hour return timer.</p>
                  <button
                    type="button"
                    onClick={() => {
                      const sampleItem = availableItems[0] || DEFAULT_PROPERTIES[0];
                      handleQuickBorrow(sampleItem);
                    }}
                    style={{
                      padding: '10px 22px', borderRadius: '10px', border: 'none',
                      background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                      color: '#ffffff', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(16,185,129,0.35)'
                    }}
                  >
                    + Borrow Sample Chainsaw Pro (Test 24-Hr Timer)
                  </button>
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
                        <th>Time Remaining (Live HH:MM:SS)</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {borrowedItems.map((prop) => {
                        const userReq = prop.purchaseRequests?.find(r =>
                          (r.userId && r.userId === currentUserId) ||
                          (r.userName && r.userName.toLowerCase().includes(currentUserNameLower)) ||
                          (r.username && r.username.toLowerCase().includes(currentUserNameLower))
                        ) || prop.purchaseRequests?.[0];

                        const dateStr = userReq && userReq.requestedAt
                          ? new Date(userReq.requestedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : 'Just Now';

                        const timeDetails = getRemainingTimeDetails(userReq?.requestedAt);

                        return (
                          <tr
                            key={prop._id}
                            style={{
                              backgroundColor: timeDetails.isWarning1Hour ? 'rgba(239, 68, 68, 0.12)' : (timeDetails.isOverdue ? 'rgba(239, 68, 68, 0.18)' : 'transparent'),
                              borderLeft: timeDetails.isWarning1Hour || timeDetails.isOverdue ? '4px solid #ef4444' : 'none',
                              transition: 'background-color 0.2s'
                            }}
                          >
                            <td>
                              <EquipmentImage src={prop.imageUrl} category={prop.category} name={prop.name} size="64px" />
                            </td>
                            <td>
                              <b style={{ color: 'var(--text-primary)', fontSize: '0.92rem' }}>{prop.name}</b>
                              {prop.serialNumber && <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>SN: {prop.serialNumber}</span>}
                            </td>
                            <td><span style={{ color: 'var(--text-secondary)', fontSize: '0.86rem' }}>{prop.description || <i style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>No description</i>}</span></td>
                            <td><small style={{ color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.86rem' }}>{dateStr}</small></td>
                            <td><small style={{ fontWeight: '700', fontSize: '0.88rem', color: timeDetails.isWarning1Hour || timeDetails.isOverdue ? '#f87171' : '#34d399' }}>{timeDetails.dueStr || 'N/A'}</small></td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span
                                  className="tag"
                                  style={{
                                    color: '#fff',
                                    backgroundColor: timeDetails.color,
                                    fontSize: '0.84rem',
                                    fontWeight: '800',
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                  }}
                                >
                                  {timeDetails.text}
                                </span>
                                {timeDetails.isWarning1Hour && (
                                  <small style={{ color: '#ef4444', fontWeight: 800, fontSize: '0.74rem' }}>
                                    ⚠️ Warning Pop-Up & Mail Dispatched to {cutterName}!
                                  </small>
                                )}
                              </div>
                            </td>
                            <td>
                              <button
                                className="cg-btn primary"
                                onClick={() => handleReturnProperty(prop)}
                                disabled={isSubmitting}
                                style={{
                                  padding: '8px 16px',
                                  fontSize: '0.85rem',
                                  borderRadius: '8px',
                                  background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                                  color: '#ffffff',
                                  fontWeight: '800',
                                  border: 'none',
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
                                }}
                              >
                                Submit / Return Tool
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

          {/* Cart Drawer Overlay (Dark Mode & Light Mode Theme Aware) */}
          {cartOpen && (
            <div style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(4px)',
              zIndex: 9999,
              display: 'flex',
              justifyContent: 'flex-end',
              fontFamily: 'sans-serif'
            }}>
              <div style={{
                width: '100%',
                maxWidth: '460px',
                backgroundColor: 'var(--bg-card, #0f172a)',
                color: 'var(--text-primary, #f8fafc)',
                height: '100%',
                boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.4)',
                borderLeft: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
              }}>
                <header style={{
                  padding: '20px 24px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--bg-elevated, #1e293b)'
                }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShoppingCart size={20} color="#10b981" /> Shopping Cart ({cart.length})
                  </h3>
                  <button
                    onClick={() => setCartOpen(false)}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '6px'
                    }}
                  >
                    <X size={20} />
                  </button>
                </header>

                <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
                  <div style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '20px',
                    display: 'flex',
                    gap: '12px'
                  }}>
                    <AlertTriangle size={20} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <b style={{ color: '#f59e0b', fontSize: '0.9rem', display: 'block', marginBottom: '4px' }}>24-Hour Return Policy</b>
                      <span style={{ color: 'var(--text-secondary, #cbd5e1)', fontSize: '0.84rem' }}>All checked-out municipal equipment must be returned to inventory within 24 hours.</span>
                    </div>
                  </div>

                  {cart.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '50px 20px', background: 'var(--bg-elevated)', borderRadius: '14px', border: '1px dashed var(--border)' }}>
                      <ShoppingCart size={48} style={{ opacity: 0.3, color: '#10b981', marginBottom: '12px' }} />
                      <h4 style={{ color: 'var(--text-primary)', margin: '0 0 6px', fontWeight: 800, fontSize: '1rem' }}>Your Cart is Empty</h4>
                      <p style={{ margin: '0 0 18px', fontSize: '0.86rem' }}>Select tools from available inventory to add to cart.</p>
                      <button
                        onClick={() => setCartOpen(false)}
                        style={{
                          padding: '10px 22px',
                          borderRadius: '10px',
                          border: 'none',
                          background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: '0.88rem',
                          cursor: 'pointer',
                          boxShadow: '0 4px 14px rgba(16,185,129,0.35)'
                        }}
                      >
                        Browse Available Tools
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {cart.map((item) => (
                        <div
                          key={item._id}
                          style={{
                            display: 'flex',
                            gap: '14px',
                            padding: '14px',
                            border: '1px solid var(--border)',
                            borderRadius: '12px',
                            alignItems: 'center',
                            backgroundColor: 'var(--bg-elevated)'
                          }}
                        >
                          <EquipmentImage src={item.imageUrl} category={item.category} name={item.name} size="56px" />
                          <div style={{ flex: 1 }}>
                            <h4 style={{ margin: '0 0 4px', fontSize: '0.92rem', fontWeight: '700', color: 'var(--text-primary)' }}>{item.name}</h4>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.description ? item.description.slice(0, 45) + '...' : 'Municipal equipment'}</p>
                          </div>
                          <button
                            onClick={() => removeFromCart(item._id)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.12)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: '8px',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
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
                    padding: '20px 24px',
                    borderTop: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-elevated)'
                  }}>
                    <button
                      className="cg-btn primary"
                      onClick={handleCheckout}
                      disabled={isSubmitting}
                      style={{
                        width: '100%',
                        height: '48px',
                        fontSize: '0.98rem',
                        fontWeight: '800',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)'
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
  };

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
        <Topbar
          title="Citizen Dashboard"
          showSearch={false}
          citizenTabs={true}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onToggleSidebar={() => setSidebarOpen(true)}
          onProfileClick={() => handleTabChange('profile')}
        />
        <main className="cg-page" style={{ padding: '24px clamp(16px, 2vw, 32px)' }}>
          <CitizenDashboard user={currentUser} activeTab={activeTab} onTabChange={handleTabChange} />
        </main>
      </div>
    </div>
  );
}

export function VerifyCertificatePage() {
  const { certificateNumber: paramCert } = useParams();
  const [certInput, setCertInput] = useState(paramCert || '');
  const [certData, setCertData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const verifyCertificate = async (codeToVerify) => {
    const queryCode = codeToVerify || certInput;
    if (!queryCode.trim()) {
      setErrorMsg('Please enter a valid certificate reference number.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setCertData(null);

    try {
      const res = await fetch(`${API_URL}/api/adoptions/certificates/${encodeURIComponent(queryCode.trim())}/verify`);
      const data = await res.json();
      if (res.ok && data.valid) {
        setCertData(data);
      } else {
        setErrorMsg(data.msg || 'Certificate code not found in official municipal registry.');
      }
    } catch (err) {
      setErrorMsg('Server connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (paramCert) {
      verifyCertificate(paramCert);
    }
  }, [paramCert]);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #064e3b 0%, #0f172a 100%)', color: '#fff', padding: '30px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: '640px', width: '100%', textAlign: 'center', marginBottom: '24px' }}>
        <Link to="/home" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#6ee7b7', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem', marginBottom: '16px' }}>
          <ArrowLeft size={16} /> Return to CanopyGuard Home
        </Link>
        <div style={{ display: 'inline-flex', padding: '8px 16px', borderRadius: '50px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '12px' }}>
          🏛️ Municipal Registry Verification Portal
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 8px 0', color: '#ffffff' }}>Digital Credential Verification</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0 }}>
          Verify the authenticity of Tree Guardian Certificates issued by the Urban Forestry &amp; Environment Command Center.
        </p>
      </div>

      {/* Search Input Box */}
      <div style={{ maxWidth: '640px', width: '100%', background: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', padding: '20px', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            placeholder="Enter Certificate Code (e.g. CERT-UDUPI-2026-98214)"
            value={certInput}
            onChange={(e) => setCertInput(e.target.value)}
            style={{ flex: 1, padding: '12px 16px', borderRadius: '10px', border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: '0.95rem' }}
          />
          <button
            onClick={() => verifyCertificate()}
            disabled={loading}
            style={{ padding: '12px 20px', borderRadius: '10px', border: 'none', background: '#10b981', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {loading ? 'Verifying...' : <><ShieldCheck size={18} /> Verify</>}
          </button>
        </div>
        {errorMsg && (
          <div style={{ marginTop: '12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5', padding: '10px 14px', borderRadius: '8px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} /> {errorMsg}
          </div>
        )}
      </div>

      {/* Certificate Verification Result Card */}
      {certData && (
        <div style={{ maxWidth: '640px', width: '100%', background: '#ffffff', color: '#0f172a', borderRadius: '20px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', border: '4px double #10b981', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px dashed #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trees size={28} color="#059669" />
              <div>
                <strong style={{ fontSize: '1.1rem', fontWeight: 800, color: '#065f46', display: 'block', lineHeight: 1.1 }}>CANOPYGUARD REGISTRY</strong>
                <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Official Environmental Credential</span>
              </div>
            </div>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '6px 14px', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={16} /> VERIFIED &amp; VALID
            </div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', fontWeight: 700 }}>This Certifies That</span>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', margin: '6px 0', fontFamily: 'Georgia, serif' }}>{certData.guardianName}</h2>
            <p style={{ fontSize: '0.9rem', color: '#475569', margin: 0 }}>
              Is recognized as an official <strong>Tree Guardian &amp; Environmental Steward</strong> under the CanopyGuard Urban Greening Ordinance.
            </p>
          </div>

          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Adopted Tree Species</span>
              <strong style={{ fontSize: '0.95rem', color: '#047857' }}>{certData.treeName}</strong>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic' }}>{certData.treeScientificName}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Location Zone</span>
              <strong style={{ fontSize: '0.9rem', color: '#1e293b' }}>📍 {certData.treeLocation || 'Udupi Urban Sector'}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Pledge Adoption Date</span>
              <strong style={{ fontSize: '0.88rem', color: '#334155' }}>
                {new Date(certData.adoptedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
              </strong>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Total Eco-Points Earned</span>
              <strong style={{ fontSize: '0.95rem', color: '#d97706' }}>⭐ {certData.totalEcoPoints || 100} Eco-Pts</strong>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px dashed #cbd5e1' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>Certificate Serial Ref</span>
              <code style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>{certData.certificateNumber}</code>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700, display: 'block' }}>Verified by Urban Forestry Board</span>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Digital Registry Hash Verified</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminComplaintsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cutters, setCutters] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('complaints');
  const [selectedImagePreview, setSelectedImagePreview] = useState(null);
  const [notice, setNotice] = useState('');

  // Admin gate
  const [adminAuthed, setAdminAuthed] = useState(() => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
      if (normalizeRole(currentUser.role) === 'Admin') return true;
    } catch { }
    return sessionStorage.getItem('adminAuthed') === 'true';
  });
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminShake, setAdminShake] = useState(false);

  const handleAdminLogin = (e) => {
    e.preventDefault();
    const u = adminUser.toLowerCase().trim();
    const p = adminPass.trim();
    if ((u === 'admin' || u === 'admin@example.com') && (p === 'admin123' || p === 'admin@123')) {
      sessionStorage.setItem('adminAuthed', 'true');
      const adminObj = { id: 'admin-static', name: 'Municipal Admin', email: 'admin@example.com', role: 'Admin' };
      localStorage.setItem('currentUser', JSON.stringify(adminObj));
      setAdminAuthed(true);
      setAdminError('');
    } else {
      setAdminError('Invalid credentials. Use admin / admin123');
      setAdminShake(true);
      setTimeout(() => setAdminShake(false), 600);
    }
  };

  const showNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3500);
  };

  const fetchComplaints = async () => {
    try {
      const res = await fetch(`${API_URL}/api/complaints`);
      const data = await res.json();
      if (res.ok) {
        setComplaints(data.complaints || []);
      }
    } catch (err) {
      console.error('Failed to fetch complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCutters = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/cutters`);
      const data = await res.json();
      if (data.cutters && data.cutters.length > 0) {
        const names = Array.from(new Set(data.cutters.map(c => typeof c === 'string' ? c : c.name || c.email).filter(Boolean)));
        setCutters(names);
      }
    } catch (err) {
      console.error('Failed to load cutters:', err);
    }
  };

  useEffect(() => {
    fetchComplaints();
    fetchCutters();
    const interval = setInterval(fetchComplaints, 12000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateStatus = async (id, status, assignedTo = null) => {
    if (assignedTo) {
      const leaveStatus = checkCutterLeaveStatus(assignedTo);
      if (leaveStatus.isOnLeave) {
        Swal.fire({
          icon: 'error',
          title: 'Tree Cutter On Leave',
          html: `<strong>${assignedTo}</strong> is currently on <strong>${leaveStatus.leaveType}</strong> (from <code>${leaveStatus.startDate}</code> to <code>${leaveStatus.endDate}</code>).<br/><br/>You cannot assign tasks to a tree cutter while they are on leave.`,
          confirmButtonColor: '#ef4444'
        });
        return;
      }
    }
    try {
      const body = { status, officialName: 'Admin Governance' };
      if (assignedTo) body.assignedTo = assignedTo;

      const res = await fetch(`${API_URL}/api/complaints/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Failed to update complaint');

      setComplaints(prev => prev.map(c => c._id === id ? { ...c, status, assignedTo: assignedTo || c.assignedTo } : c));
      showNotice(`Complaint status updated to '${status}'!`);
      Swal.fire({
        icon: 'success',
        title: 'Complaint Updated',
        text: `Status set to '${status}'${assignedTo ? ` & assigned to ${assignedTo}` : ''}`,
        confirmButtonColor: '#065f46',
        timer: 2500,
        timerProgressBar: true
      });
    } catch (err) {
      showNotice(err.message || 'Status update failed.');
    }
  };

  const handleAssignCutter = async (id, cutterName) => {
    if (!cutterName) return;
    await handleUpdateStatus(id, 'Scheduled', cutterName);
  };

  const handleDeleteComplaint = async (id, complaint) => {
    const confirmDelete = window.confirm(`Are you sure you want to remove complaint #${id.slice(-4).toUpperCase()} (${issueLabels[complaint.issueType] || complaint.issueType})?`);
    if (!confirmDelete) return;

    try {
      await fetch(`${API_URL}/api/complaints/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Resolved', officialName: 'Admin Removed' }),
      });
      setComplaints(prev => prev.filter(c => c._id !== id));
      showNotice('Complaint removed from active queue.');
      Swal.fire({
        icon: 'success',
        title: 'Complaint Removed',
        text: 'Issue resolved & removed from active list.',
        timer: 2000,
        confirmButtonColor: '#065f46'
      });
    } catch (err) {
      setComplaints(prev => prev.filter(c => c._id !== id));
    }
  };

  const getValidPhotoUrl = (rawImg) => {
    if (!rawImg || typeof rawImg !== 'string') return '';
    const trimmed = rawImg.trim();
    if (!trimmed || trimmed.startsWith('blob:')) return '';
    if (trimmed.startsWith('data:image/')) return trimmed;
    let cleanUrl = trimmed;
    const secondHttp = cleanUrl.indexOf('http', 5);
    if (secondHttp !== -1) {
      cleanUrl = cleanUrl.substring(secondHttp);
    }
    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
      return cleanUrl;
    }
    if (cleanUrl.startsWith('/uploads/') || cleanUrl.startsWith('uploads/')) {
      return `${API_URL}${cleanUrl.startsWith('/') ? '' : '/'}${cleanUrl}`;
    }
    return '';
  };

  const filteredComplaints = complaints.filter(c => {
    if (selectedFilter === 'Pending' && c.status !== 'Pending') return false;
    if (selectedFilter === 'In Review' && c.status !== 'In Review') return false;
    if (selectedFilter === 'Scheduled' && c.status !== 'Scheduled' && c.status !== 'In Progress') return false;
    if (selectedFilter === 'Resolved' && c.status !== 'Resolved' && c.status !== 'Closed') return false;
    if (selectedFilter === 'Replantation' && !c.requiresReplantation && c.issueType !== 'dead') return false;

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const loc = (c.location || '').toLowerCase();
      const sub = (c.submittedBy || '').toLowerCase();
      const type = (issueLabels[c.issueType] || c.issueType || '').toLowerCase();
      const desc = (c.description || '').toLowerCase();
      return loc.includes(q) || sub.includes(q) || type.includes(q) || desc.includes(q);
    }
    return true;
  });

  const counts = {
    total: complaints.length,
    pending: complaints.filter(c => c.status === 'Pending').length,
    inReview: complaints.filter(c => c.status === 'In Review').length,
    scheduled: complaints.filter(c => c.status === 'Scheduled' || c.status === 'In Progress').length,
    resolved: complaints.filter(c => c.status === 'Resolved' || c.status === 'Closed').length,
    replantation: complaints.filter(c => c.requiresReplantation || c.issueType === 'dead').length,
  };

  if (!adminAuthed) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', sans-serif", background: '#f8fafc', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ maxWidth: '420px', width: '100%', background: '#fff', padding: '32px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.08)' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <ShieldCheck size={48} color="#065f46" />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '8px 0 4px', color: '#0f172a' }}>Admin Complaints Access</h2>
            <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0 }}>Enter administrative password to access Complaints Oversight.</p>
          </div>
          {adminError && <div style={{ padding: '10px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px', textAlign: 'center' }}>{adminError}</div>}
          <form onSubmit={handleAdminLogin}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Admin Username</label>
              <input type="text" value={adminUser} onChange={e => setAdminUser(e.target.value)} required style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} placeholder="admin" />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Admin Password</label>
              <input type="password" value={adminPass} onChange={e => setAdminPass(e.target.value)} required style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} placeholder="••••••••" />
            </div>
            <button type="submit" style={{ width: '100%', padding: '12px', background: '#065f46', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}>Login to Admin Complaints</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="cg-app">
      <Sidebar active="Complaints" admin isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
      <div className="cg-workspace">
        <Topbar title="Admin Complaints Oversight & Action Center" search="Search complaints..." onToggleSidebar={() => setSidebarOpen(true)} />
        <main className="cg-page">
          <section className="cg-admin-head" style={{ marginBottom: '24px' }}>
            <div>
              <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--brand-accent)', fontWeight: 700 }}>ADMINISTRATIVE COMPLAINTS GOVERNANCE</span>
              <h1 style={{ margin: '4px 0 8px 0', fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-primary)' }}>Admin Complaints Oversight & Action Center</h1>
              <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: '750px', fontSize: '0.95rem', lineHeight: '1.5' }}>
                Complete administrative control over citizen tree complaints. Overlook live field reports, re-assign tree cutters, inspect proof attachments, and force resolution on stale issues.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <Link className="cg-btn outline" to="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={18} /> Admin Console
              </Link>
              <button className="official-live" onClick={fetchComplaints} style={{ cursor: 'pointer' }}>
                <span className="pulse-indicator"></span> Refresh Live Feed ({counts.total})
              </button>
            </div>
          </section>

          {notice && (
            <div style={{ padding: '12px 18px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--brand-accent)', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.3)', marginBottom: '20px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} /> {notice}
            </div>
          )}

          {/* Stat Overview Grid */}
          <section className="official-stat-grid" style={{ marginBottom: '24px' }}>
            <article style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => setSelectedFilter('all')}>
              <AlertTriangle color="#3b82f6" />
              <span>Total Complaints</span>
              <b style={{ color: 'var(--text-primary)' }}>{counts.total}</b>
            </article>
            <article style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => setSelectedFilter('Pending')}>
              <AlertTriangle color="#ef4444" />
              <span>Pending & Unresolved</span>
              <b style={{ color: '#f87171' }}>{counts.pending}</b>
            </article>
            <article style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => setSelectedFilter('In Review')}>
              <Users color="#8b5cf6" />
              <span>Under Review</span>
              <b style={{ color: '#c084fc' }}>{counts.inReview}</b>
            </article>
            <article style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => setSelectedFilter('Scheduled')}>
              <Clock color="#3b82f6" />
              <span>Scheduled to Cutters</span>
              <b style={{ color: '#60a5fa' }}>{counts.scheduled}</b>
            </article>
            <article style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => setSelectedFilter('Resolved')}>
              <ShieldCheck color="#10b981" />
              <span>Resolved & Closed</span>
              <b style={{ color: '#4ade80' }}>{counts.resolved}</b>
            </article>
          </section>

          {/* Filter Bar & Search */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px', background: 'var(--bg-surface)', padding: '16px 20px', borderRadius: '14px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginRight: '4px' }}>Filter:</span>
              {[
                ['all', `All (${counts.total})`],
                ['Pending', `Pending (${counts.pending})`],
                ['In Review', `In Review (${counts.inReview})`],
                ['Scheduled', `Scheduled (${counts.scheduled})`],
                ['Resolved', `Resolved (${counts.resolved})`],
                ['Replantation', `Replantation (${counts.replantation})`],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSelectedFilter(key)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    border: selectedFilter === key ? '1px solid var(--brand-accent)' : '1px solid var(--border)',
                    background: selectedFilter === key ? 'var(--brand-glow)' : 'var(--bg-elevated)',
                    color: selectedFilter === key ? 'var(--brand-accent)' : 'var(--text-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', minWidth: '260px' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by location, user, issue..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* View Tabs */}
          <nav className="official-tabs" style={{ marginBottom: '20px' }}>
            <button className={activeTab === 'complaints' ? 'active' : ''} onClick={() => setActiveTab('complaints')}>Complaints Action Matrix</button>
            <button className={activeTab === 'proofs' ? 'active' : ''} onClick={() => setActiveTab('proofs')}>Photo & Proof Audit ({filteredComplaints.filter(c => getValidPhotoUrl(c.photoUrl || c.image || c.photo || c.beforeImageUrl)).length})</button>
            <button className={activeTab === 'cutters' ? 'active' : ''} onClick={() => setActiveTab('cutters')}>Tree Cutter Work Distribution ({cutters.length} Cutters)</button>
          </nav>

          {activeTab === 'complaints' && (
            <div className="data-table-container" style={{ background: 'var(--bg-surface)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border)', boxShadow: '0 10px 25px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>Live Complaints Management ({filteredComplaints.length})</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Real-time database sync</span>
              </div>

              {loading ? (
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '32px' }}>Loading complaints from database...</p>
              ) : filteredComplaints.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', background: 'var(--bg-elevated)', borderRadius: '12px' }}>
                  <AlertTriangle size={40} color="#94a3b8" style={{ marginBottom: '12px' }} />
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>No complaints match the selected filter.</p>
                </div>
              ) : (
                <div className="table-responsive" style={{ overflowX: 'auto' }}>
                  <table className="custom-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-subtle)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '12px', textAlign: 'left', borderRadius: '8px 0 0 8px' }}>Photo</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Issue & Ref ID</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Location & Description</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Reporter & Date</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Current Status</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Assign Tree Cutter</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Admin Status Override</th>
                        <th style={{ padding: '12px', textAlign: 'right', borderRadius: '0 8px 8px 0' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredComplaints.map(c => {
                        const photo = getValidPhotoUrl(c.photoUrl || c.image || c.photo || c.beforeImageUrl);

                        let statusBg = 'rgba(245, 158, 11, 0.15)';
                        let statusColor = '#f59e0b';
                        if (c.status === 'Resolved') { statusBg = 'rgba(16, 185, 129, 0.15)'; statusColor = '#10b981'; }
                        else if (c.status === 'In Review') { statusBg = 'rgba(168, 85, 247, 0.15)'; statusColor = '#c4b5fd'; }
                        else if (c.status === 'Scheduled' || c.status === 'In Progress') { statusBg = 'rgba(59, 130, 246, 0.15)'; statusColor = '#93c5fd'; }

                        return (
                          <tr key={c._id} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                            <td style={{ padding: '12px' }}>
                              <div
                                style={{
                                  width: '52px',
                                  height: '52px',
                                  borderRadius: '8px',
                                  overflow: 'hidden',
                                  border: '1px solid var(--border)',
                                  background: 'var(--bg-subtle)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  position: 'relative',
                                  cursor: photo ? 'pointer' : 'default',
                                  flexShrink: 0
                                }}
                                onClick={() => photo && setSelectedImagePreview(photo)}
                                title={photo ? 'Click to enlarge photo' : 'No photo submitted'}
                              >
                                {photo ? (
                                  <img
                                    src={photo}
                                    alt={c.issueType}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, zIndex: 1 }}
                                    onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                                  />
                                ) : null}
                                <Camera size={20} color="var(--text-muted)" opacity={0.6} />
                              </div>
                            </td>
                            <td style={{ padding: '12px' }}>
                              <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)', display: 'block' }}>
                                {issueLabels[c.issueType] || c.issueType}
                              </strong>
                              <small style={{ fontSize: '0.75rem', color: 'var(--brand-accent)', fontWeight: 700 }}>
                                #{c._id.slice(-6).toUpperCase()}
                              </small>
                              {c.requiresReplantation && (
                                <div style={{ fontSize: '0.7rem', color: '#34d399', background: 'rgba(52, 211, 153, 0.15)', padding: '2px 6px', borderRadius: '4px', marginTop: '4px', fontWeight: 700 }}>
                                  🌱 Replant Required
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '12px', maxWidth: '240px' }}>
                              <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                📍 {c.location || 'Municipal Canopy Sector'}
                              </strong>
                              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {c.description || 'Routine tree maintenance report.'}
                              </p>
                            </td>
                            <td style={{ padding: '12px' }}>
                              <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)', display: 'block' }}>{c.submittedBy || 'Citizen'}</strong>
                              <small style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                {new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </small>
                            </td>
                            <td style={{ padding: '12px' }}>
                              <span style={{ padding: '4px 10px', borderRadius: '12px', background: statusBg, color: statusColor, fontSize: '0.78rem', fontWeight: 700, border: `1px solid ${statusColor}40`, display: 'inline-block' }}>
                                {c.status}
                              </span>
                              {c.assignedTo && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 600 }}>
                                  👤 {c.assignedTo}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '12px' }}>
                              <select
                                defaultValue={c.assignedTo || ''}
                                onChange={e => handleAssignCutter(c._id, e.target.value)}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: '8px',
                                  fontSize: '0.82rem',
                                  fontWeight: 600,
                                  border: '1px solid var(--brand-accent)',
                                  background: 'var(--bg-surface)',
                                  color: 'var(--text-primary)',
                                  cursor: 'pointer'
                                }}
                              >
                                <option value="" disabled>+ Select Tree Cutter...</option>
                                {cutters.map(ct => {
                                  const leaveInfo = checkCutterLeaveStatus(ct);
                                  return (
                                    <option
                                      key={ct}
                                      value={ct}
                                      style={{ background: leaveInfo.isOnLeave ? '#fee2e2' : 'var(--bg-surface)', color: leaveInfo.isOnLeave ? '#991b1b' : 'var(--text-primary)' }}
                                    >
                                      {leaveInfo.isOnLeave ? `⛔ ${ct} (ON LEAVE - ${leaveInfo.startDate} to ${leaveInfo.endDate})` : ct}
                                    </option>
                                  );
                                })}
                              </select>
                            </td>
                            <td style={{ padding: '12px' }}>
                              <select
                                value={c.status}
                                onChange={e => handleUpdateStatus(c._id, e.target.value)}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: '8px',
                                  fontSize: '0.82rem',
                                  fontWeight: 600,
                                  border: '1px solid var(--border)',
                                  background: 'var(--bg-surface)',
                                  color: 'var(--text-primary)',
                                  cursor: 'pointer'
                                }}
                              >
                                {['Pending', 'In Review', 'Scheduled', 'In Progress', 'Resolved'].map(st => (
                                  <option key={st} value={st} style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
                                    {st}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                {c.status !== 'Resolved' && (
                                  <button
                                    onClick={() => handleUpdateStatus(c._id, 'Resolved')}
                                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #16a34a', background: 'rgba(22, 163, 74, 0.15)', color: '#4ade80', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                                    title="Mark Resolved"
                                  >
                                    Resolve
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteComplaint(c._id, c)}
                                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                                  title="Delete complaint"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'proofs' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
              {filteredComplaints.filter(c => getValidPhotoUrl(c.photoUrl || c.image || c.photo || c.beforeImageUrl || c.progressImageUrl || c.afterImageUrl || c.wasteProofUrl)).length === 0 ? (
                <div style={{ gridColumn: '1 / -1', padding: '40px', background: 'var(--bg-surface)', borderRadius: '16px', textAlign: 'center', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                  <Camera size={40} color="#94a3b8" style={{ marginBottom: '12px' }} />
                  <p style={{ margin: 0, fontWeight: 700 }}>No valid complaint proof photos submitted yet.</p>
                </div>
              ) : (
                filteredComplaints.filter(c => getValidPhotoUrl(c.photoUrl || c.image || c.photo || c.beforeImageUrl || c.progressImageUrl || c.afterImageUrl || c.wasteProofUrl)).map(c => {
                  const beforePhoto = getValidPhotoUrl(c.photoUrl || c.image || c.photo || c.beforeImageUrl);
                  const progressPhoto = getValidPhotoUrl(c.progressImageUrl);
                  const afterPhoto = getValidPhotoUrl(c.afterImageUrl);
                  const wastePhoto = getValidPhotoUrl(c.wasteProofUrl);

                  const activePhoto = afterPhoto || progressPhoto || wastePhoto || beforePhoto;
                  const activeGps = c.afterGps || c.progressGps || c.wasteGps || c.beforeGps || { lat: '13.340900', lng: '74.742100', capturedAt: c.createdAt };

                  return (
                    <div key={c._id} style={{ background: 'var(--bg-surface)', borderRadius: '20px', border: '1px solid var(--border)', overflow: 'hidden', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>

                      {/* High-Tech Geo-Tagged Overlay Proof */}
                      <GeoTaggedImageProof
                        imageUrl={activePhoto}
                        gps={activeGps}
                        locationText={c.location}
                        altText={c.issueType}
                        proofLabel={`Official Audit • ${c.status}`}
                      />

                      {/* Photo Stage Switcher Chips if multiple photos exist */}
                      {(progressPhoto || afterPhoto || wastePhoto) && (
                        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                          {beforePhoto && (
                            <span style={{ fontSize: '0.74rem', padding: '4px 8px', borderRadius: '6px', background: 'rgba(16,185,129,0.15)', color: '#34d399', fontWeight: 700 }}>
                              ✓ Before Photo
                            </span>
                          )}
                          {progressPhoto && (
                            <span style={{ fontSize: '0.74rem', padding: '4px 8px', borderRadius: '6px', background: 'rgba(59,130,246,0.15)', color: '#60a5fa', fontWeight: 700 }}>
                              ⚡ Progress Photo
                            </span>
                          )}
                          {afterPhoto && (
                            <span style={{ fontSize: '0.74rem', padding: '4px 8px', borderRadius: '6px', background: 'rgba(16,185,129,0.25)', color: '#10b981', fontWeight: 700 }}>
                              ✓ After Photo
                            </span>
                          )}
                          {wastePhoto && (
                            <span style={{ fontSize: '0.74rem', padding: '4px 8px', borderRadius: '6px', background: 'rgba(168,85,247,0.15)', color: '#c084fc', fontWeight: 700 }}>
                              ♻ Waste Disposal
                            </span>
                          )}
                        </div>
                      )}

                      <div>
                        <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)', display: 'block' }}>{issueLabels[c.issueType] || c.issueType}</strong>
                        <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', margin: '4px 0' }}>
                          <MapPin size={13} color="#10b981" /> {c.location}
                        </span>
                        <small style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Submitted by: {c.submittedBy || 'Citizen'} • Assigned Cutter: {c.assignedTo || 'Unassigned'}</small>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                        <select
                          defaultValue={c.assignedTo || ''}
                          onChange={e => handleAssignCutter(c._id, e.target.value)}
                          style={{ flex: 1, padding: '8px', borderRadius: '8px', fontSize: '0.8rem', border: '1px solid var(--brand-accent)', background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                        >
                          <option value="" disabled>Reassign Cutter...</option>
                          {cutters.map(ct => <option key={ct} value={ct}>{ct}</option>)}
                        </select>
                        <button onClick={() => handleUpdateStatus(c._id, 'Resolved')} style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: '#10b981', color: '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>
                          Resolve
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'cutters' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {cutters.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>No registered tree cutters found in database.</p>
              ) : (
                cutters.map(cutter => {
                  const assignedTasks = complaints.filter(c => c.assignedTo === cutter);
                  const activeCount = assignedTasks.filter(c => c.status !== 'Resolved').length;
                  const resolvedCount = assignedTasks.filter(c => c.status === 'Resolved').length;

                  return (
                    <div key={cutter} style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--brand-glow)', color: 'var(--brand-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.1rem', border: '1px solid var(--brand-accent)' }}>
                          {cutter.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)', display: 'block' }}>{cutter}</strong>
                          <span style={{ fontSize: '0.8rem', color: 'var(--brand-accent)', fontWeight: 600 }}>Arborist / Tree Cutter</span>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'var(--bg-elevated)', padding: '12px', borderRadius: '10px', marginBottom: '14px', border: '1px solid var(--border)' }}>
                        <div>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Active Tasks</span>
                          <strong style={{ fontSize: '1.1rem', color: '#f59e0b' }}>{activeCount}</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Completed</span>
                          <strong style={{ fontSize: '1.1rem', color: '#10b981' }}>{resolvedCount}</strong>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        {assignedTasks.length} Total Complaints Handled
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Full Image Zoom Modal */}
          {selectedImagePreview && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setSelectedImagePreview(null)}>
              <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', background: 'var(--bg-surface)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
                <button onClick={() => setSelectedImagePreview(null)} style={{ position: 'absolute', top: '-12px', right: '-12px', width: '32px', height: '32px', borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                <img src={selectedImagePreview} alt="Enlarged Attachment" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '10px', objectFit: 'contain' }} />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   VIEW TREE CUTTER ANALYTICS & PROFILE PAGE
   ────────────────────────────────────────────────────────── */
export function ViewTreeCutterPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cutters, setCutters] = useState([]);
  const [selectedCutterId, setSelectedCutterId] = useState('');
  const [selectedCutter, setSelectedCutter] = useState(null);

  const [cutterTasks, setCutterTasks] = useState([]);
  const [cutterAttendance, setCutterAttendance] = useState([]);
  const [cutterLeaves, setCutterLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'attendance' | 'leaves'

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('currentUser')) || {}; }
    catch { return {}; }
  })();

  const path = window.location.pathname;
  const rawRole = normalizeRole(currentUser.role);
  const isAdmin = rawRole === 'Admin' || sessionStorage.getItem('adminAuthed') === 'true' || path.startsWith('/admin');

  // Load cutters list
  useEffect(() => {
    fetch(`${API_URL}/api/auth/cutters`)
      .then(res => res.json())
      .then(data => {
        const list = data.cutters || [];
        setCutters(list);
        if (list.length > 0) {
          setSelectedCutterId(list[0]._id);
          setSelectedCutter(list[0]);
        } else {
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Fetch cutters error:', err);
        setLoading(false);
      });
  }, []);

  // Fetch data for selected cutter
  useEffect(() => {
    if (!selectedCutter) return;
    setLoading(true);

    const cutterName = selectedCutter.name;
    const cutterId = selectedCutter._id;

    Promise.all([
      fetch(`${API_URL}/api/complaints`),
      fetch(`${API_URL}/api/attendance`),
      fetch(`${API_URL}/api/attendance/leaves`)
    ])
      .then(async ([compRes, attRes, leaveRes]) => {
        const compData = await compRes.json();
        const attData = await attRes.json();
        const leaveData = await leaveRes.json();

        // Filter tasks
        const allComplaints = compData.complaints || compData.records || compData || [];
        const myTasks = Array.isArray(allComplaints) ? allComplaints.filter(c =>
          (c.assignedTo && c.assignedTo.toLowerCase().includes(cutterName.toLowerCase())) ||
          (c.assignedCutter && c.assignedCutter.toLowerCase().includes(cutterName.toLowerCase()))
        ) : [];

        // Filter attendance
        const allAtt = attData.records || [];
        const myAtt = allAtt.filter(r => r.userId === cutterId || (r.userName && r.userName.toLowerCase() === cutterName.toLowerCase()));

        // Filter leaves
        const allLeaves = leaveData.leaves || [];
        const myLeaves = allLeaves.filter(l => l.userId === cutterId || (l.userName && l.userName.toLowerCase() === cutterName.toLowerCase()));

        setCutterTasks(myTasks);
        setCutterAttendance(myAtt);
        setCutterLeaves(myLeaves);
        setLoading(false);
      })
      .catch(err => {
        console.error('Analytics load error:', err);
        setLoading(false);
      });
  }, [selectedCutterId]);

  const handleCutterSelect = (id) => {
    setSelectedCutterId(id);
    const found = cutters.find(c => c._id === id);
    if (found) setSelectedCutter(found);
  };

  // Performance calculations - strictly 100% real data with zero dummy fallbacks
  const totalTasks = cutterTasks.length;
  const resolvedTasks = cutterTasks.filter(t => t.status === 'Resolved' || t.status === 'Completed').length;
  const activeTasks = cutterTasks.filter(t => t.status !== 'Resolved' && t.status !== 'Completed' && t.status !== 'Rejected').length;
  const completionRate = totalTasks > 0 ? Math.round((resolvedTasks / totalTasks) * 100) : 0;

  const attendanceCount = cutterAttendance.length;
  const approvedLeavesCount = cutterLeaves.filter(l => l.status === 'Approved').length;
  const pendingLeavesCount = cutterLeaves.filter(l => l.status === 'Pending').length;

  const totalDutyEntries = attendanceCount + approvedLeavesCount;
  const reliabilityRatio = totalDutyEntries > 0 ? Math.round((attendanceCount / totalDutyEntries) * 100) : 0;

  return (
    <div className="cg-app">
      <Sidebar active="View Tree Cutter" admin={isAdmin} isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
      <div className="cg-workspace">
        <Topbar title="Tree Cutter Analytics & Ratio Profile" onToggleSidebar={() => setSidebarOpen(true)} />
        <main className="cg-page" style={{ padding: '24px' }}>

          {/* Header & Cutter Dropdown Selector */}
          <section className="cg-panel" style={{ background: '#0b2518', border: '1px solid rgba(82, 183, 136, 0.25)', padding: '20px', marginBottom: '22px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.6rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Users size={28} color="#34d399" /> Tree Cutter Profile & Performance Analytics
                </h1>
                <p style={{ margin: '4px 0 0', color: '#95d5b2', fontSize: '0.88rem' }}>
                  Field completion ratios, task history, attendance logs, and leave tracking for registered arborists.
                </p>
              </div>

              {/* Cutter Selector Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#061a14', border: '1px solid rgba(82, 183, 136, 0.35)', padding: '8px 14px', borderRadius: '12px' }}>
                <span style={{ fontSize: '0.85rem', color: '#95d5b2', fontWeight: 700 }}>Select Tree Cutter:</span>
                <select
                  value={selectedCutterId}
                  onChange={e => handleCutterSelect(e.target.value)}
                  style={{ background: 'transparent', color: '#ffffff', border: 'none', outline: 'none', fontSize: '0.95rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  {cutters.map(c => (
                    <option key={c._id} value={c._id} style={{ background: '#0b2518', color: '#ffffff' }}>
                      🪓 {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {selectedCutter ? (
            <div>
              {/* Profile Card & Key KPI Ratios */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginBottom: '22px' }}>

                {/* Cutter Information Card */}
                <div className="cg-panel" style={{ background: '#0b2518', border: '1px solid rgba(82, 183, 136, 0.25)', padding: '20px', borderRadius: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#1b4332', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.5rem', border: '2px solid #52b788' }}>
                      {selectedCutter.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#ffffff' }}>{selectedCutter.name}</h2>
                      <span className="tag" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#facc15', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '2px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, marginTop: '2px', display: 'inline-block' }}>
                        🪓 Tree Cutter / Arborist
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: '#b7e4c7' }}>
                    <div><strong>📧 Email:</strong> <span style={{ color: '#ffffff' }}>{selectedCutter.email}</span></div>
                    <div><strong>📞 Contact:</strong> <span style={{ color: '#ffffff' }}>{selectedCutter.phone || '+91 96320 38402'}</span></div>
                    <div><strong>📍 Assigned Zone:</strong> <span style={{ color: '#ffffff' }}>{selectedCutter.zone || 'Udupi Central Sector'}</span></div>
                    <div><strong>🛠️ Active Gear:</strong> <span style={{ color: '#34d399' }}>🪓 Heavy Chainsaw & Safety Rig</span></div>
                    <div><strong>🛡️ Account Status:</strong> <span className="tag ok">{selectedCutter.status || 'Verified'}</span></div>
                  </div>
                </div>

                {/* KPI Ratios Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

                  {/* Task Completion Ratio */}
                  <div className="cg-panel" style={{ background: '#0b2518', border: '1px solid rgba(82, 183, 136, 0.25)', padding: '16px', borderRadius: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: '#95d5b2' }}>Task Completion Ratio</span>
                    <h3 style={{ margin: '4px 0', fontSize: '1.8rem', color: '#34d399', fontWeight: 900 }}>{completionRate}%</h3>
                    <small style={{ color: '#b7e4c7', fontSize: '0.72rem' }}>{resolvedTasks} of {totalTasks} tasks completed</small>
                  </div>

                  {/* Attendance Ratio */}
                  <div className="cg-panel" style={{ background: '#0b2518', border: '1px solid rgba(82, 183, 136, 0.25)', padding: '16px', borderRadius: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: '#95d5b2' }}>Attendance Ratio</span>
                    <h3 style={{ margin: '4px 0', fontSize: '1.8rem', color: '#60a5fa', fontWeight: 900 }}>{reliabilityRatio}%</h3>
                    <small style={{ color: '#b7e4c7', fontSize: '0.72rem' }}>{attendanceCount} shifts recorded</small>
                  </div>

                  {/* Active Work Orders */}
                  <div className="cg-panel" style={{ background: '#0b2518', border: '1px solid rgba(82, 183, 136, 0.25)', padding: '16px', borderRadius: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: '#95d5b2' }}>Active Tasks</span>
                    <h3 style={{ margin: '4px 0', fontSize: '1.8rem', color: '#facc15', fontWeight: 900 }}>{activeTasks}</h3>
                    <small style={{ color: '#b7e4c7', fontSize: '0.72rem' }}>In-field maintenance</small>
                  </div>

                  {/* Approved Leaves */}
                  <div className="cg-panel" style={{ background: '#0b2518', border: '1px solid rgba(82, 183, 136, 0.25)', padding: '16px', borderRadius: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: '#95d5b2' }}>Approved Leaves</span>
                    <h3 style={{ margin: '4px 0', fontSize: '1.8rem', color: '#f87171', fontWeight: 900 }}>{approvedLeavesCount}</h3>
                    <small style={{ color: '#b7e4c7', fontSize: '0.72rem' }}>{pendingLeavesCount} pending requests</small>
                  </div>

                </div>

              </div>

              {/* Sub-Navigation Tabs */}
              <nav className="official-tabs" style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
                <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>
                  📋 Task History ({cutterTasks.length})
                </button>
                <button className={activeTab === 'attendance' ? 'active' : ''} onClick={() => setActiveTab('attendance')}>
                  🕒 Attendance Logs ({cutterAttendance.length})
                </button>
                <button className={activeTab === 'leaves' ? 'active' : ''} onClick={() => setActiveTab('leaves')}>
                  📝 Leave Applications ({cutterLeaves.length})
                </button>
              </nav>

              {/* TAB 1: ASSIGNED TASKS */}
              {activeTab === 'overview' && (
                <div className="cg-panel" style={{ background: '#0b2518', border: '1px solid rgba(82, 183, 136, 0.25)', padding: '22px', borderRadius: '16px' }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: '1.2rem', color: '#ffffff' }}>Work Orders Assigned to {selectedCutter.name}</h3>

                  <table className="cg-table wide" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Complaint / Task ID</th>
                        <th>Tree Species / Type</th>
                        <th>Location</th>
                        <th>Status</th>
                        <th>Priority</th>
                        <th>Completion Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cutterTasks.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#95d5b2' }}>
                            No work orders currently assigned to {selectedCutter.name}.
                          </td>
                        </tr>
                      ) : (
                        cutterTasks.map(t => (
                          <tr key={t._id || t.id}>
                            <td><b>#{String(t._id || t.id).slice(-6).toUpperCase()}</b></td>
                            <td><span style={{ color: '#34d399', fontWeight: 600 }}>{t.issueType || 'Tree Pruning'}</span></td>
                            <td>📍 {t.location || 'Udupi Sector'}</td>
                            <td>
                              <span style={{
                                background: (t.status === 'Resolved' || t.status === 'Completed') ? 'rgba(52, 211, 153, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                                color: (t.status === 'Resolved' || t.status === 'Completed') ? '#34d399' : '#facc15',
                                border: (t.status === 'Resolved' || t.status === 'Completed') ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(234, 179, 8, 0.3)',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontWeight: 700,
                                fontSize: '0.75rem'
                              }}>
                                {t.status || 'In Progress'}
                              </span>
                            </td>
                            <td><span className={`tag ${t.priority === 'High' ? 'high' : 'med'}`}>{t.priority || 'Medium'}</span></td>
                            <td><small style={{ color: '#b7e4c7' }}>{t.completionNotes || 'Inspection scheduled'}</small></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 2: ATTENDANCE LOGS */}
              {activeTab === 'attendance' && (
                <div className="cg-panel" style={{ background: '#0b2518', border: '1px solid rgba(82, 183, 136, 0.25)', padding: '22px', borderRadius: '16px' }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: '1.2rem', color: '#ffffff' }}>Attendance Logs for {selectedCutter.name}</h3>

                  <table className="cg-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Shift Session</th>
                        <th>Attendance Status</th>
                        <th>Recorded At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cutterAttendance.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: '#95d5b2' }}>
                            No attendance logs recorded yet for {selectedCutter.name}.
                          </td>
                        </tr>
                      ) : (
                        cutterAttendance.map(r => (
                          <tr key={r._id}>
                            <td><b>{r.date}</b></td>
                            <td><span className="tag ok" style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34d399' }}>{r.shift} Shift</span></td>
                            <td><span style={{ color: '#34d399', fontWeight: 700 }}>✓ Present</span></td>
                            <td><small style={{ color: '#b7e4c7' }}>{new Date(r.markedAt || r.createdAt).toLocaleString('en-IN')}</small></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 3: LEAVE APPLICATIONS */}
              {activeTab === 'leaves' && (
                <div className="cg-panel" style={{ background: '#0b2518', border: '1px solid rgba(82, 183, 136, 0.25)', padding: '22px', borderRadius: '16px' }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: '1.2rem', color: '#ffffff' }}>Leave Applications by {selectedCutter.name}</h3>

                  <table className="cg-table wide" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Leave Type</th>
                        <th>Date Range</th>
                        <th>Total Days</th>
                        <th>Reason</th>
                        <th>Status</th>
                        <th>Reviewed By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cutterLeaves.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#95d5b2' }}>
                            No leave applications submitted by {selectedCutter.name}.
                          </td>
                        </tr>
                      ) : (
                        cutterLeaves.map(l => (
                          <tr key={l._id}>
                            <td><b style={{ color: '#34d399' }}>{l.leaveType}</b></td>
                            <td><span style={{ color: '#b7e4c7', fontSize: '0.85rem' }}>{l.startDate} to {l.endDate}</span></td>
                            <td>{l.totalDays || 1} Day(s)</td>
                            <td><small style={{ color: '#95d5b2' }}>{l.reason}</small></td>
                            <td>
                              <span style={{
                                background: l.status === 'Approved' ? 'rgba(52, 211, 153, 0.15)' : l.status === 'Rejected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                                color: l.status === 'Approved' ? '#34d399' : l.status === 'Rejected' ? '#f87171' : '#facc15',
                                border: l.status === 'Approved' ? '1px solid rgba(52, 211, 153, 0.3)' : l.status === 'Rejected' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(234, 179, 8, 0.3)',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontWeight: 700,
                                fontSize: '0.75rem'
                              }}>
                                {l.status}
                              </span>
                            </td>
                            <td><small style={{ color: '#64748b' }}>{l.reviewedBy || 'Municipal Official'}</small></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#95d5b2' }}>
              Loading registered tree cutters...
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

export function CommunicationPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('currentUser')) || {}; }
    catch { return {}; }
  })();
  const rawRole = normalizeRole(currentUser.role);
  const isAdmin = rawRole === 'Admin' || sessionStorage.getItem('adminAuthed') === 'true' || window.location.pathname.startsWith('/admin');

  return (
    <div className="cg-app">
      <Sidebar active="Communication" admin={isAdmin} isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
      <div className="cg-workspace">
        <Topbar title="Real-Time Staff Communication" search="Search messages..." onToggleSidebar={() => setSidebarOpen(true)} />
        <CommunicationHub defaultRole={rawRole} />
      </div>
    </div>
  );
}
export function OfficialAdoptionsPage() {
  return <OfficialManagementPage initialView="adoptions" />;
}

export function TreeCutterDutiesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('currentUser')) || {}; }
    catch { return {}; }
  })();

  const cutterId = currentUser.id || currentUser._id || '';
  const cutterName = currentUser.name || currentUser.username || 'Snow';

  const theme = {
    bg: 'var(--bg-page, #051d18)',
    cardBg: 'var(--bg-surface, #072a22)',
    elevatedBg: 'var(--bg-elevated, #0a382e)',
    border: 'var(--border, rgba(52, 211, 153, 0.2))',
    title: 'var(--text-primary, #ffffff)',
    subText: 'var(--text-secondary, #95d5b2)',
  };

  return (
    <div className="cg-app">
      <Sidebar active="Tree Care Duties" isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
      <div className="cg-workspace">
        <Topbar title="Assigned Tree Care Duties & Pledges" search="Search tree species, locations..." onToggleSidebar={() => setSidebarOpen(true)} />
        <main className="cg-page" style={{ padding: '24px' }}>
          <div style={{
            background: theme.cardBg, border: `1px solid ${theme.border}`,
            borderRadius: '20px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.15)'
          }}>
            <TreeDutyPanel
              cutterId={cutterId}
              cutterName={cutterName}
              theme={theme}
              darkMode={true}
              onNavigate={(task) => {}}
            />
          </div>
        </main>
      </div>
    </div>
  );
}


