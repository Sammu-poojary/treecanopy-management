import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MessageSquare, Send, Paperclip, CheckCheck, Users, ShieldAlert,
  Search, RefreshCw, Bell, BellOff, MapPin, Tag, Info, AlertTriangle,
  UserCheck, Sparkles, CheckCircle2, ChevronRight, X, Clock, HelpCircle,
  FileText, Calendar, Database, Crosshair, Layers, ExternalLink, Compass, Navigation2
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import Swal from 'sweetalert2';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Fix Leaflet default marker icons safely
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

const normalizeRole = (role) => {
  if (!role) return 'Citizen';
  const r = String(role).trim().toLowerCase();
  if (r.includes('admin')) return 'Admin';
  if (r.includes('official') || r.includes('officer')) return 'Official';
  if (r.includes('cutter') || r.includes('arborist') || r.includes('tree cutter')) return 'Tree Cutter';
  return 'Citizen';
};

// Interactive Leaflet Location Selector Component
function LocationMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });
  return position ? (
    <Marker position={position}>
      <Popup>Selected Field Location</Popup>
    </Marker>
  ) : null;
}

// Leaflet Directions & In-App Turn-by-Turn Navigation Modal Component
function LeafletDirectionsModal({ viewMapModal, setViewMapModal, theme, darkMode }) {
  const [userPos, setUserPos] = useState([13.3500, 74.7500]);
  const [gettingLocation, setGettingLocation] = useState(true);
  const [routePolyline, setRoutePolyline] = useState([]);
  const [navigationSteps, setNavigationSteps] = useState([]);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [totalDistance, setTotalDistance] = useState(null);
  const [totalDuration, setTotalDuration] = useState(null);
  const [showStepsList, setShowStepsList] = useState(true);
  const [loadingRoute, setLoadingRoute] = useState(true);

  const destLat = viewMapModal.lat || 13.3409;
  const destLng = viewMapModal.lng || 74.7421;
  const destPos = useMemo(() => [destLat, destLng], [destLat, destLng]);

  // Geolocation detection
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserPos([pos.coords.latitude, pos.coords.longitude]);
          setGettingLocation(false);
        },
        () => {
          setGettingLocation(false);
        }
      );
    } else {
      setGettingLocation(false);
    }
  }, []);

  // Fetch real road route from OpenSource OSRM Routing Engine
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
            // Convert GeoJSON [lng, lat] to Leaflet [lat, lng]
            const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
            setRoutePolyline(coords);
            setTotalDistance((route.distance / 1000).toFixed(2));
            setTotalDuration(Math.ceil(route.duration / 60));

            // Extract Turn-by-Turn Steps
            if (route.legs && route.legs[0] && route.legs[0].steps) {
              const stepsData = route.legs[0].steps.map((st, idx) => {
                const type = st.maneuver.type;
                const modifier = st.maneuver.modifier || '';
                const name = st.name ? `onto ${st.name}` : '';
                let text = `Head ${modifier || 'forward'} ${name}`.trim();

                if (type === 'turn') {
                  text = `Turn ${modifier} ${name}`.trim();
                } else if (type === 'new name' || type === 'continue') {
                  text = `Continue ${modifier} ${name}`.trim();
                } else if (type === 'arrive') {
                  text = `Arrive at field destination: ${viewMapModal.address || 'Target Location'}`;
                } else if (type === 'depart') {
                  text = `Depart from starting point ${name}`.trim();
                } else if (type === 'fork' || type === 'off ramp' || type === 'on ramp') {
                  text = `Take ${type} ${modifier} ${name}`.trim();
                } else if (type === 'roundabout') {
                  text = `At roundabout, take exit ${name}`.trim();
                }

                return {
                  id: idx,
                  text: text.charAt(0).toUpperCase() + text.slice(1),
                  distanceMeters: Math.round(st.distance),
                  durationSec: Math.round(st.duration),
                  location: [st.maneuver.location[1], st.maneuver.location[0]],
                  type: type,
                  modifier: modifier
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

  // Haversine fallback distance calculation if OSRM fails
  const distKm = useMemo(() => {
    if (totalDistance) return totalDistance;
    const R = 6371;
    const dLat = (destPos[0] - userPos[0]) * Math.PI / 180;
    const dLon = (destPos[1] - userPos[1]) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(userPos[0] * Math.PI / 180) * Math.cos(destPos[0] * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2);
  }, [userPos, destPos, totalDistance]);

  const estMinutes = totalDuration || Math.max(2, Math.round(Number(distKm) * 2.5));

  // Auto step navigation simulator
  useEffect(() => {
    let timer;
    if (isNavigating && navigationSteps.length > 0) {
      timer = setInterval(() => {
        setActiveStepIndex(prev => {
          if (prev < navigationSteps.length - 1) return prev + 1;
          setIsNavigating(false);
          return prev;
        });
      }, 4000);
    }
    return () => clearInterval(timer);
  }, [isNavigating, navigationSteps]);

  const getStepIcon = (modifier, type) => {
    if (type === 'arrive') return '🎯';
    if (modifier.includes('right')) return '↪️';
    if (modifier.includes('left')) return '↩️';
    if (modifier.includes('straight') || type === 'continue') return '⬆️';
    return '🏎️';
  };

  const handleOpenGoogleMapsFallback = () => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${userPos[0]},${userPos[1]}&destination=${destPos[0]},${destPos[1]}&travelmode=driving`;
    window.open(url, '_blank');
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '20px'
    }}>
      <div style={{
        background: theme.cardBg, border: `1px solid ${theme.border}`,
        borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '900px',
        maxHeight: '92vh', overflowY: 'auto',
        boxShadow: '0 25px 60px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', gap: '16px'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800 }}>
                IN-APP LEAFLET ROUTING ENGINE
              </span>
              {isNavigating && (
                <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800, animation: 'pulse 1.5s infinite' }}>
                  ● LIVE NAVIGATION ACTIVE
                </span>
              )}
            </div>
            <h3 style={{ margin: '4px 0 0', color: theme.title, fontSize: '1.3rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Navigation2 size={22} color="#3b82f6" /> In-App Turn-by-Turn GPS Navigation
            </h3>
          </div>
          <button onClick={() => setViewMapModal(null)} style={{ background: 'none', border: 'none', color: theme.subText, cursor: 'pointer', padding: '4px' }}>
            <X size={24} />
          </button>
        </div>

        {/* Route Details Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(59, 130, 246, 0.15) 100%)',
          border: '1px solid rgba(52, 211, 153, 0.3)', borderRadius: '16px', padding: '14px 18px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px'
        }}>
          <div>
            <div style={{ fontSize: '0.94rem', fontWeight: 800, color: theme.title, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={17} color="#34d399" /> Destination: {viewMapModal.address || `Lat ${destPos[0].toFixed(4)}, Lng ${destPos[1].toFixed(4)}`}
            </div>
            <div style={{ fontSize: '0.85rem', color: theme.subText, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span>🛣️ Road Distance: <b style={{ color: '#60a5fa' }}>{distKm} km</b></span>
              <span>⏱️ Est. Time: <b style={{ color: '#34d399' }}>~{estMinutes} mins</b></span>
              <span>🚦 Turns: <b style={{ color: '#facc15' }}>{navigationSteps.length} steps</b></span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setIsNavigating(!isNavigating)}
              style={{
                background: isNavigating ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                color: '#ffffff', border: 'none', borderRadius: '10px', padding: '10px 18px',
                fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                boxShadow: isNavigating ? '0 4px 12px rgba(239,68,68,0.4)' : '0 4px 12px rgba(16,185,129,0.4)'
              }}
            >
              <Compass size={16} /> {isNavigating ? 'Stop In-App Guidance' : 'Start In-App Navigation'}
            </button>

            <button
              type="button"
              onClick={handleOpenGoogleMapsFallback}
              style={{
                background: theme.elevatedBg, color: theme.title, border: `1px solid ${theme.border}`,
                borderRadius: '10px', padding: '10px 14px', fontSize: '0.82rem', fontWeight: 700,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px'
              }}
              title="Open external Google Maps directions as alternative"
            >
              <ExternalLink size={15} /> External Maps
            </button>
          </div>
        </div>

        {/* Navigation Step Banner (When Active) */}
        {navigationSteps.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            color: '#ffffff', borderRadius: '14px', padding: '14px 18px',
            border: '1px solid rgba(96, 165, 250, 0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ fontSize: '2rem' }}>
                {getStepIcon(navigationSteps[activeStepIndex]?.modifier || '', navigationSteps[activeStepIndex]?.type || '')}
              </div>
              <div>
                <div style={{ fontSize: '0.76rem', color: '#93c5fd', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  STEP {activeStepIndex + 1} OF {navigationSteps.length} • {navigationSteps[activeStepIndex]?.distanceMeters}m AWAY
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, marginTop: '2px', color: '#ffffff' }}>
                  {navigationSteps[activeStepIndex]?.text}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                disabled={activeStepIndex === 0}
                onClick={() => setActiveStepIndex(prev => Math.max(0, prev - 1))}
                style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 800, cursor: activeStepIndex === 0 ? 'not-allowed' : 'pointer' }}
              >
                ◀ Prev
              </button>
              <button
                disabled={activeStepIndex === navigationSteps.length - 1}
                onClick={() => setActiveStepIndex(prev => Math.min(navigationSteps.length - 1, prev + 1))}
                style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 800, cursor: activeStepIndex === navigationSteps.length - 1 ? 'not-allowed' : 'pointer' }}
              >
                Next Step ▶
              </button>
            </div>
          </div>
        )}

        {/* Dual Layout: Leaflet Map + Turn-by-Turn Steps Panel */}
        <div style={{
          display: 'grid', gridTemplateColumns: showStepsList ? '1fr clamp(280px, 32vw, 360px)' : '1fr',
          gap: '16px', minHeight: '380px'
        }}>
          {/* Leaflet Map Canvas */}
          <div style={{ height: '400px', borderRadius: '16px', overflow: 'hidden', border: `1px solid ${theme.border}`, position: 'relative' }}>
            <MapContainer
              bounds={routePolyline.length > 0 ? routePolyline : [userPos, destPos]}
              padding={[40, 40]}
              style={{ width: '100%', height: '100%' }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              
              {/* Current User Marker */}
              <Marker position={userPos}>
                <Popup>📍 Current Starting Location</Popup>
              </Marker>

              {/* Destination Marker */}
              <Marker position={destPos} ref={(r) => r && setTimeout(() => r.openPopup(), 300)}>
                <Popup>🎯 Target Field Location: {viewMapModal.address || 'Destination'}</Popup>
              </Marker>

              {/* Active Step Marker */}
              {navigationSteps.length > 0 && navigationSteps[activeStepIndex] && (
                <Marker position={navigationSteps[activeStepIndex].location}>
                  <Popup>
                    <b>Step {activeStepIndex + 1}:</b> {navigationSteps[activeStepIndex].text}
                  </Popup>
                </Marker>
              )}

              {/* Real Road Geometry Route Polyline */}
              {routePolyline.length > 0 ? (
                <Polyline positions={routePolyline} color="#3b82f6" weight={6} opacity={0.85} />
              ) : (
                <Polyline positions={[userPos, destPos]} color="#3b82f6" weight={5} dashArray="8, 8" />
              )}
            </MapContainer>
          </div>

          {/* Turn-by-Turn Directions List Panel */}
          {showStepsList && (
            <div style={{
              background: theme.elevatedBg, border: `1px solid ${theme.border}`,
              borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column',
              maxHeight: '400px', overflowY: 'auto'
            }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 800, color: theme.title, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={16} color="#3b82f6" /> Step-by-Step Directions ({navigationSteps.length})
              </h4>

              {loadingRoute ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: theme.subText, fontSize: '0.85rem' }}>
                  Fetching turn-by-turn road route...
                </div>
              ) : navigationSteps.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: theme.subText, fontSize: '0.85rem' }}>
                  Direct line navigation route generated.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {navigationSteps.map((st, idx) => {
                    const isActive = idx === activeStepIndex;
                    return (
                      <div
                        key={st.id}
                        onClick={() => setActiveStepIndex(idx)}
                        style={{
                          padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
                          background: isActive ? (darkMode ? 'rgba(59, 130, 246, 0.25)' : '#dbeafe') : theme.cardBg,
                          border: isActive ? '1px solid #3b82f6' : `1px solid ${theme.border}`,
                          transition: 'all 0.15s', display: 'flex', alignItems: 'flex-start', gap: '10px'
                        }}
                      >
                        <div style={{ fontSize: '1.2rem', marginTop: '1px' }}>
                          {getStepIcon(st.modifier, st.type)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: isActive ? 900 : 700, fontSize: '0.82rem', color: theme.title, lineHeight: 1.3 }}>
                            {st.text}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: theme.subText, marginTop: '2px' }}>
                            {st.distanceMeters > 0 ? `${st.distanceMeters} meters` : 'At destination'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CommunicationHub({ defaultRole }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('currentUser')) || {}; }
    catch { return {}; }
  });

  const rawRole = currentUser.role || defaultRole || 'Official';
  const myRole = normalizeRole(rawRole);
  const myUserId = currentUser.id || currentUser._id || currentUser.userId || `guest-${myRole.toLowerCase()}`;
  const myName = currentUser.name || currentUser.username || currentUser.fullName || `${myRole} User`;

  // UI State
  const [partners, setPartners] = useState([]);
  const [activePartner, setActivePartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Context Attachment Picker State (Tasks, Leaves, Inventory)
  const [showContextModal, setShowContextModal] = useState(false);
  const [contextTab, setContextTab] = useState('tasks');
  const [selectedContext, setSelectedContext] = useState(null);

  // Raw Database Lists
  const [taskList, setTaskList] = useState([]);
  const [leaveList, setLeaveList] = useState([]);
  const [inventoryList, setInventoryList] = useState([]);

  // Leaflet GPS Location Modal State
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [mapPosition, setMapPosition] = useState([13.3409, 74.7421]);
  const [locationAddress, setLocationAddress] = useState('Central Ward 4 (Udupi Zone)');
  const [selectedLocation, setSelectedLocation] = useState(null);

  // View Interactive Leaflet Map Modal for Messages
  const [viewMapModal, setViewMapModal] = useState(null);

  // Notification state
  const [notifPermission, setNotifPermission] = useState('default');
  const knownMsgIdsRef = useRef(new Set());
  const messagesEndRef = useRef(null);

  // Dark mode state
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    const handleTheme = () => setDarkMode(localStorage.getItem('theme') === 'dark');
    window.addEventListener('themeChange', handleTheme);
    return () => window.removeEventListener('themeChange', handleTheme);
  }, []);

  const theme = {
    bg: darkMode ? '#061a14' : '#f8fafc',
    cardBg: darkMode ? '#0b2518' : '#ffffff',
    elevatedBg: darkMode ? '#0f3329' : '#f1f5f9',
    border: darkMode ? 'rgba(82, 183, 136, 0.25)' : '#e2e8f0',
    title: darkMode ? '#ffffff' : '#0f172a',
    subText: darkMode ? '#95d5b2' : '#64748b',
    inputBg: darkMode ? '#051d18' : '#ffffff',
    inputText: darkMode ? '#ffffff' : '#0f172a',
    myBubbleBg: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    partnerBubbleBg: darkMode ? '#0f3329' : '#e2e8f0',
    partnerBubbleText: darkMode ? '#f8fafc' : '#0f172a',
  };

  // Target Tree Cutter Identification
  const targetCutterId = useMemo(() => {
    if (myRole === 'Tree Cutter') return myUserId;
    if (activePartner && normalizeRole(activePartner.role) === 'Tree Cutter') return activePartner._id || activePartner.id;
    return null;
  }, [myRole, myUserId, activePartner]);

  const targetCutterName = useMemo(() => {
    if (myRole === 'Tree Cutter') return myName;
    if (activePartner && normalizeRole(activePartner.role) === 'Tree Cutter') return activePartner.name || activePartner.username || '';
    return '';
  }, [myRole, myName, activePartner]);

  // Fetch Partners
  const fetchPartners = async () => {
    try {
      const res = await fetch(`${API_URL}/api/chat/threads?userId=${myUserId}&userRole=${encodeURIComponent(myRole)}`);
      if (res.ok) {
        const data = await res.json();
        const pList = Array.isArray(data.partners) ? data.partners : [];
        setPartners(pList);
        if (!activePartner && pList.length > 0) {
          setActivePartner(pList[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching chat partners:', err);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch(`${API_URL}/api/complaints`);
      if (res.ok) {
        const data = await res.json();
        setTaskList(Array.isArray(data) ? data : []);
      }
    } catch (_) {}
  };

  const fetchLeaves = async () => {
    try {
      const res = await fetch(`${API_URL}/api/attendance/leaves`);
      if (res.ok) {
        const data = await res.json();
        setLeaveList(Array.isArray(data) ? data : []);
      }
    } catch (_) {}
  };

  const fetchInventory = async () => {
    try {
      const res = await fetch(`${API_URL}/api/properties`);
      if (res.ok) {
        const data = await res.json();
        setInventoryList(Array.isArray(data) ? data : []);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchPartners();
    fetchTasks();
    fetchLeaves();
    fetchInventory();
  }, [myUserId, myRole]);

  // Specific Work Tasks for Target Tree Cutter
  const targetTasks = useMemo(() => {
    if (!taskList || taskList.length === 0) return [];
    if (!targetCutterId && !targetCutterName) return taskList;

    const nameLower = targetCutterName.toLowerCase().trim();
    const idStr = String(targetCutterId || '').trim();

    const specific = taskList.filter(t => {
      const assignedId = String(t.assignedCutterId || t.assignedTo || t.cutterId || t.userId || '');
      const assignedName = String(t.assignedCutter || t.assignedCutterName || t.assignedToName || t.userName || '').toLowerCase();
      
      const matchId = idStr && (assignedId === idStr);
      const matchName = nameLower && (assignedName.includes(nameLower) || nameLower.includes(assignedName));
      return matchId || matchName;
    });

    return specific.length > 0 ? specific : taskList;
  }, [taskList, targetCutterId, targetCutterName]);

  // Specific Leave Requests for Target Tree Cutter
  const targetLeaves = useMemo(() => {
    if (!leaveList || leaveList.length === 0) return [];
    if (!targetCutterId && !targetCutterName) return leaveList;

    const nameLower = targetCutterName.toLowerCase().trim();
    const idStr = String(targetCutterId || '').trim();

    return leaveList.filter(l => {
      const uId = String(l.userId || l.user || '');
      const uName = String(l.userName || l.userFullName || '').toLowerCase();

      const matchId = idStr && (uId === idStr);
      const matchName = nameLower && (uName.includes(nameLower) || nameLower.includes(uName));
      return matchId || matchName;
    });
  }, [leaveList, targetCutterId, targetCutterName]);

  // Specific Borrowed Tool Reminders for Target Tree Cutter
  const targetInventory = useMemo(() => {
    if (!inventoryList || inventoryList.length === 0) return [];

    const nameLower = targetCutterName.toLowerCase().trim();
    const idStr = String(targetCutterId || '').trim();

    const checkedOutList = [];

    inventoryList.forEach(p => {
      if (Array.isArray(p.purchaseRequests) && p.purchaseRequests.length > 0) {
        p.purchaseRequests.forEach(req => {
          const rId = String(req.userId || req.id || '');
          const rName = String(req.userName || '').toLowerCase();

          const matchId = idStr && (rId === idStr);
          const matchName = nameLower && (rName.includes(nameLower) || nameLower.includes(rName));

          if (!targetCutterId && !targetCutterName) {
            checkedOutList.push({ property: p, req });
          } else if (matchId || matchName) {
            checkedOutList.push({ property: p, req });
          }
        });
      }
    });

    return checkedOutList;
  }, [inventoryList, targetCutterId, targetCutterName]);

  // Compute current threadId
  const currentThreadId = useMemo(() => {
    if (!activePartner) return null;
    const partnerId = activePartner._id || activePartner.id;
    const ids = [String(myUserId), String(partnerId)].sort();
    return `thread_${ids[0]}_${ids[1]}`;
  }, [activePartner, myUserId]);

  // Fetch thread messages
  const fetchMessages = async (isPolling = false) => {
    if (!currentThreadId) return;
    if (!isPolling) setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/chat/messages?threadId=${encodeURIComponent(currentThreadId)}`);
      if (res.ok) {
        const data = await res.json();
        const msgList = Array.isArray(data) ? data : [];

        if (isPolling && msgList.length > 0) {
          msgList.forEach(m => {
            if (!knownMsgIdsRef.current.has(m._id) && m.senderId !== myUserId) {
              if ('Notification' in window && Notification.permission === 'granted') {
                const titleSnippet = m.relatedTaskTitle ? ` [Re: ${m.relatedTaskTitle}]` : '';
                new Notification(`💬 Message from ${m.senderName} (${m.senderRole})`, {
                  body: `${titleSnippet} ${m.message}`,
                  icon: '/favicon.ico'
                });
              }
            }
          });
        }

        msgList.forEach(m => knownMsgIdsRef.current.add(m._id));
        setMessages(msgList);

        fetch(`${API_URL}/api/chat/mark-read`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ threadId: currentThreadId, userId: myUserId })
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Error fetching thread messages:', err);
    } finally {
      if (!isPolling) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages(false);
  }, [currentThreadId]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchMessages(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [currentThreadId]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Direct Message Dispatched Immediately into Conversation Stream
  const postDirectMessage = async ({
    messageText,
    contextType,
    relatedTaskId,
    relatedTaskTitle,
    relatedTaskLocation,
    locationLat,
    locationLng,
    locationAddress
  }) => {
    if (!activePartner) return;

    const partnerRole = normalizeRole(activePartner.role);
    const partnerId = activePartner._id || activePartner.id;

    if (myRole === 'Tree Cutter' && partnerRole === 'Tree Cutter') {
      Swal.fire({
        icon: 'error',
        title: 'Communication Restricted',
        text: 'Direct messaging between Tree Cutters is disabled. You can chat with Municipal Officials or System Admins regarding assigned tasks.',
        confirmButtonColor: '#10b981'
      });
      return;
    }

    const payload = {
      threadId: currentThreadId,
      senderId: myUserId,
      senderName: myName,
      senderRole: myRole,
      receiverId: partnerId,
      receiverName: activePartner.name || activePartner.username || 'Staff Partner',
      receiverRole: partnerRole,
      message: messageText,
      contextType: contextType || null,
      relatedTaskId: relatedTaskId || null,
      relatedTaskTitle: relatedTaskTitle || null,
      relatedTaskLocation: relatedTaskLocation || null,
      locationLat: locationLat ? Number(locationLat) : null,
      locationLng: locationLng ? Number(locationLng) : null,
      locationAddress: locationAddress || null
    };

    const tempMsg = {
      _id: `temp-${Date.now()}`,
      ...payload,
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, tempMsg]);
    setSending(true);

    try {
      const res = await fetch(`${API_URL}/api/chat/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Could not send message');
      fetchMessages(true);
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Message Error',
        text: err.message || 'Could not deliver message',
        confirmButtonColor: '#10b981'
      });
    } finally {
      setSending(false);
    }
  };

  // Auto-Detect Device Geolocation
  const handleDetectLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = [pos.coords.latitude, pos.coords.longitude];
          setMapPosition(coords);
          setLocationAddress(`GPS Coordinates (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
          Swal.fire({
            icon: 'success',
            title: 'GPS Location Detected!',
            text: `Latitude: ${pos.coords.latitude.toFixed(5)}, Longitude: ${pos.coords.longitude.toFixed(5)}`,
            timer: 2000,
            showConfirmButton: false
          });
        },
        () => {
          Swal.fire({
            icon: 'warning',
            title: 'Geolocation Restricted',
            text: 'Could not access device GPS. Tap on the interactive Leaflet map to select field coordinates.',
            confirmButtonColor: '#10b981'
          });
        }
      );
    }
  };

  // Confirm and Send GPS Location directly into conversation stream
  const handleConfirmLocation = () => {
    const addr = locationAddress || 'Selected Leaflet Map Coordinates';
    postDirectMessage({
      messageText: `📍 Shared Field GPS Location: ${addr}`,
      contextType: 'location',
      locationLat: mapPosition[0],
      locationLng: mapPosition[1],
      locationAddress: addr
    });
    setShowLocationModal(false);
  };

  // Send Custom Input Text Message
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    postDirectMessage({
      messageText: inputText.trim(),
      contextType: selectedContext ? selectedContext.type : null,
      relatedTaskId: selectedContext ? selectedContext.id : null,
      relatedTaskTitle: selectedContext ? selectedContext.title : null,
      relatedTaskLocation: selectedContext ? selectedContext.subtitle : null
    });

    setInputText('');
    setSelectedContext(null);
  };

  const filteredPartners = partners.filter(p => {
    const pRole = normalizeRole(p.role);
    if (myRole === 'Tree Cutter' && pRole === 'Tree Cutter') return false;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (p.name || '').toLowerCase().includes(q) || (p.role || '').toLowerCase().includes(q);
  });

  const getRoleBadgeClass = (role) => {
    const r = normalizeRole(role);
    if (r === 'Admin') return 'tag danger';
    if (r === 'Official') return 'tag info';
    return 'tag ok';
  };

  return (
    <div style={{
      background: theme.bg, minHeight: 'calc(100vh - 70px)', padding: '20px',
      display: 'flex', flexDirection: 'column', gap: '16px'
    }}>
      {/* Top Banner */}
      <div style={{
        background: theme.cardBg, border: `1px solid ${theme.border}`,
        borderRadius: '16px', padding: '20px 24px', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px',
        boxShadow: '0 4px 14px rgba(0,0,0,0.04)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '6px 12px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 800 }}>
              REAL-TIME COMMUNICATION HUB
            </span>
            <span className={getRoleBadgeClass(myRole)} style={{ fontSize: '0.78rem', padding: '4px 12px' }}>
              Logged as {myRole}: {myName}
            </span>
          </div>
          <h1 style={{ margin: '8px 0 0', fontSize: '1.6rem', fontWeight: 900, color: theme.title }}>
            Staff Messaging & Field Clarification
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {notifPermission !== 'granted' ? (
            <button
              onClick={() => Notification.requestPermission().then(setNotifPermission)}
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#fff', border: 'none', borderRadius: '10px', padding: '9px 16px',
                fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                boxShadow: '0 4px 12px rgba(217,119,6,0.3)'
              }}
            >
              <Bell size={16} /> Enable PWA Push Alerts
            </button>
          ) : (
            <span style={{
              background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '10px', padding: '8px 14px', fontSize: '0.82rem', fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', gap: '6px'
            }}>
              <CheckCircle2 size={16} color="#34d399" /> Desktop PWA Alerts Active
            </span>
          )}
          <button
            onClick={() => fetchMessages(false)}
            style={{
              background: theme.elevatedBg, color: theme.title, border: `1px solid ${theme.border}`,
              borderRadius: '10px', padding: '9px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700
            }}
          >
            <RefreshCw size={15} /> Sync
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'clamp(260px, 30vw, 360px) 1fr',
        gap: '16px', minHeight: '620px', height: 'calc(100vh - 200px)'
      }}>
        {/* Left Contacts List */}
        <div style={{
          background: theme.cardBg, border: `1px solid ${theme.border}`,
          borderRadius: '16px', display: 'flex', flexDirection: 'column',
          overflow: 'hidden', boxShadow: '0 4px 14px rgba(0,0,0,0.04)'
        }}>
          <div style={{ padding: '16px', borderBottom: `1px solid ${theme.border}` }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: theme.elevatedBg, padding: '8px 14px', borderRadius: '10px',
              border: `1px solid ${theme.border}`
            }}>
              <Search size={16} color={theme.subText} />
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.88rem', color: theme.inputText }}
              />
            </div>
            {myRole === 'Tree Cutter' && (
              <div style={{ marginTop: '10px', padding: '8px 12px', background: 'rgba(59, 130, 246, 0.12)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.25)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <Info size={14} color="#60a5fa" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span style={{ fontSize: '0.76rem', color: '#93c5fd', lineHeight: 1.4 }}>
                  P2P Tree Cutter messaging disabled. You can chat directly with Municipal Officials & Central Admin.
                </span>
              </div>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {filteredPartners.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: theme.subText }}>
                <Users size={32} style={{ opacity: 0.4, marginBottom: '8px' }} />
                <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600 }}>No eligible contacts</p>
              </div>
            ) : (
              filteredPartners.map(p => {
                const partnerId = p._id || p.id;
                const isActive = activePartner && (activePartner._id || activePartner.id) === partnerId;
                const pRole = normalizeRole(p.role);

                return (
                  <div
                    key={partnerId}
                    onClick={() => setActivePartner(p)}
                    style={{
                      padding: '12px 14px', borderRadius: '12px', cursor: 'pointer',
                      background: isActive ? (darkMode ? 'rgba(52, 211, 153, 0.15)' : '#e0f2fe') : 'transparent',
                      border: isActive ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid transparent',
                      marginBottom: '4px', transition: 'all 0.2s', display: 'flex',
                      alignItems: 'center', gap: '12px'
                    }}
                  >
                    <div style={{
                      width: '42px', height: '42px', borderRadius: '50%',
                      background: pRole === 'Admin' ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' : pRole === 'Official' ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' : 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                      color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: '1rem', flexShrink: 0
                    }}>
                      {(p.name || p.username || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: theme.title, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.name || p.username}
                      </div>
                      <span className={getRoleBadgeClass(pRole)} style={{ fontSize: '0.7rem', padding: '2px 8px', marginTop: '2px', display: 'inline-block' }}>
                        {pRole}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Chat Window */}
        <div style={{
          background: theme.cardBg, border: `1px solid ${theme.border}`,
          borderRadius: '16px', display: 'flex', flexDirection: 'column',
          overflow: 'hidden', boxShadow: '0 4px 14px rgba(0,0,0,0.04)'
        }}>
          {activePartner ? (
            <>
              {/* Header */}
              <div style={{
                padding: '16px 20px', borderBottom: `1px solid ${theme.border}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: theme.elevatedBg
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    background: normalizeRole(activePartner.role) === 'Admin' ? '#ef4444' : normalizeRole(activePartner.role) === 'Official' ? '#3b82f6' : '#10b981',
                    color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '1rem'
                  }}>
                    {(activePartner.name || activePartner.username || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: theme.title }}>
                      {activePartner.name || activePartner.username}
                    </h3>
                    <span className={getRoleBadgeClass(activePartner.role)} style={{ fontSize: '0.72rem', padding: '2px 8px', display: 'inline-block' }}>
                      {normalizeRole(activePartner.role)}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setShowContextModal(true)}
                    style={{
                      background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.3)',
                      borderRadius: '8px', padding: '7px 12px', fontSize: '0.82rem', fontWeight: 700,
                      cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px'
                    }}
                  >
                    <Paperclip size={14} /> Attach Record Context
                  </button>

                  <button
                    onClick={() => setShowLocationModal(true)}
                    style={{
                      background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '8px', padding: '7px 12px', fontSize: '0.82rem', fontWeight: 700,
                      cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px'
                    }}
                  >
                    <MapPin size={14} /> Share GPS Location
                  </button>
                </div>
              </div>

              {/* Selected Context Banner */}
              {selectedContext && (
                <div style={{
                  padding: '10px 18px', background: 'rgba(52, 211, 153, 0.12)',
                  borderBottom: '1px solid rgba(52, 211, 153, 0.25)', display: 'flex',
                  alignItems: 'center', justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Tag size={15} color="#34d399" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#34d399' }}>
                      📌 Selected Context: {selectedContext.title} ({selectedContext.subtitle})
                    </span>
                  </div>
                  <button onClick={() => setSelectedContext(null)} style={{ background: 'none', border: 'none', color: '#34d399', cursor: 'pointer' }}>
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Message Stream */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {loading ? (
                  <p style={{ textAlign: 'center', padding: '40px', color: theme.subText }}>Loading messages...</p>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: theme.subText }}>
                    <MessageSquare size={48} style={{ opacity: 0.3, marginBottom: '10px' }} />
                    <h4 style={{ margin: '0 0 4px', color: theme.title, fontWeight: 700 }}>Start Conversation</h4>
                    <p style={{ margin: 0, fontSize: '0.88rem' }}>Send messages, ask task doubts, attach leave requests, or share GPS coordinates.</p>
                  </div>
                ) : (
                  messages.map((m, idx) => {
                    const isMine = String(m.senderId) === String(myUserId);
                    const hasLocation = m.locationLat && m.locationLng;
                    const isLocationMessage = hasLocation || (m.message && (m.message.includes('Shared Field GPS Location') || m.message.includes('📍')));
                    const cType = m.contextType;

                    const openMapModalForMessage = () => {
                      setViewMapModal({
                        lat: m.locationLat || 13.3409,
                        lng: m.locationLng || 74.7421,
                        address: m.locationAddress || m.message,
                        title: m.senderName
                      });
                    };

                    return (
                      <div
                        key={m._id || idx}
                        style={{
                          display: 'flex', flexDirection: 'column',
                          alignItems: isMine ? 'flex-end' : 'flex-start'
                        }}
                      >
                        <div
                          onClick={isLocationMessage ? openMapModalForMessage : undefined}
                          style={{
                            maxWidth: '78%', borderRadius: '16px', padding: '12px 16px',
                            background: isMine ? theme.myBubbleBg : theme.partnerBubbleBg,
                            color: isMine ? '#ffffff' : theme.partnerBubbleText,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                            cursor: isLocationMessage ? 'pointer' : 'default',
                            transition: 'transform 0.15s, boxShadow 0.15s'
                          }}
                          title={isLocationMessage ? "Click to open interactive Leaflet Directions & Navigation map!" : undefined}
                        >
                          {!isMine && (
                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#34d399', marginBottom: '6px' }}>
                              {m.senderName} ({m.senderRole})
                            </div>
                          )}

                          {/* Render Rich Context Cards */}
                          {cType === 'leave' && (
                            <div style={{
                              background: isMine ? 'rgba(0,0,0,0.2)' : 'rgba(234, 179, 8, 0.15)',
                              border: isMine ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(234, 179, 8, 0.3)',
                              borderRadius: '10px', padding: '10px 12px', marginBottom: '8px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 800, color: isMine ? '#ffffff' : '#facc15', marginBottom: '4px' }}>
                                <Calendar size={15} /> Leave Application Reference
                              </div>
                              <div style={{ fontSize: '0.88rem', fontWeight: 800 }}>{m.relatedTaskTitle}</div>
                              {m.relatedTaskLocation && (
                                <div style={{ fontSize: '0.78rem', opacity: 0.9, marginTop: '2px' }}>{m.relatedTaskLocation}</div>
                              )}
                            </div>
                          )}

                          {cType === 'property' && (
                            <div style={{
                              background: isMine ? 'rgba(0,0,0,0.2)' : 'rgba(59, 130, 246, 0.15)',
                              border: isMine ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(59, 130, 246, 0.3)',
                              borderRadius: '10px', padding: '10px 12px', marginBottom: '8px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 800, color: isMine ? '#ffffff' : '#60a5fa', marginBottom: '4px' }}>
                                <Database size={15} /> Equipment & Tool Reminder
                              </div>
                              <div style={{ fontSize: '0.88rem', fontWeight: 800 }}>{m.relatedTaskTitle}</div>
                              {m.relatedTaskLocation && (
                                <div style={{ fontSize: '0.78rem', opacity: 0.9, marginTop: '2px' }}>{m.relatedTaskLocation}</div>
                              )}
                            </div>
                          )}

                          {(cType === 'task' || (m.relatedTaskTitle && !cType)) && (
                            <div style={{
                              background: isMine ? 'rgba(0,0,0,0.2)' : 'rgba(16, 185, 129, 0.15)',
                              border: isMine ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                              borderRadius: '10px', padding: '10px 12px', marginBottom: '8px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 800, color: isMine ? '#ffffff' : '#34d399', marginBottom: '4px' }}>
                                <FileText size={15} /> Work Order Task Context
                              </div>
                              <div style={{ fontSize: '0.88rem', fontWeight: 800 }}>{m.relatedTaskTitle}</div>
                              {m.relatedTaskLocation && (
                                <div style={{ fontSize: '0.78rem', opacity: 0.9, marginTop: '2px' }}>📍 {m.relatedTaskLocation}</div>
                              )}
                            </div>
                          )}

                          {isLocationMessage && (
                            <div style={{
                              background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(59, 130, 246, 0.4)',
                              borderRadius: '10px', padding: '10px 12px', marginBottom: '8px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700, color: '#60a5fa', marginBottom: '4px' }}>
                                <Navigation2 size={15} /> Leaflet GPS Location & Route Navigation
                              </div>
                              <div style={{ fontSize: '0.76rem', opacity: 0.9, marginBottom: '8px' }}>
                                {m.locationAddress || m.message}
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openMapModalForMessage();
                                }}
                                style={{
                                  background: '#3b82f6', color: '#fff', border: 'none',
                                  borderRadius: '6px', padding: '6px 12px', fontSize: '0.78rem',
                                  fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px'
                                }}
                              >
                                <Compass size={13} /> Open Turn-by-Turn Directions
                              </button>
                            </div>
                          )}

                          <div style={{ fontSize: '0.92rem', lineHeight: 1.5, wordBreak: 'break-word' }}>
                            {m.message}
                          </div>

                          <div style={{
                            display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px',
                            marginTop: '6px', fontSize: '0.7rem', opacity: 0.8
                          }}>
                            <span>{new Date(m.createdAt || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                            {isMine && <CheckCheck size={14} color="#ffffff" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Bar */}
              <form onSubmit={handleSendMessage} style={{
                padding: '16px', borderTop: `1px solid ${theme.border}`,
                background: theme.elevatedBg, display: 'flex', gap: '10px', alignItems: 'center'
              }}>
                <button
                  type="button"
                  onClick={() => setShowContextModal(true)}
                  style={{ background: 'none', border: 'none', color: theme.subText, cursor: 'pointer', padding: '6px' }}
                  title="Attach Record Context"
                >
                  <Paperclip size={20} />
                </button>

                <button
                  type="button"
                  onClick={() => setShowLocationModal(true)}
                  style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', padding: '6px' }}
                  title="Share GPS Location"
                >
                  <MapPin size={20} />
                </button>

                <input
                  type="text"
                  placeholder="Type message, doubt, or update..."
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  style={{
                    flex: 1, padding: '12px 16px', borderRadius: '12px',
                    border: `1px solid ${theme.border}`, background: theme.inputBg,
                    color: theme.inputText, outline: 'none', fontSize: '0.92rem'
                  }}
                />

                <button
                  type="submit"
                  disabled={!inputText.trim() || sending}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                    color: '#ffffff', border: 'none', borderRadius: '12px',
                    padding: '12px 20px', fontWeight: 800, fontSize: '0.9rem',
                    cursor: (!inputText.trim() || sending) ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
                    opacity: (!inputText.trim() || sending) ? 0.6 : 1
                  }}
                >
                  <Send size={16} /> Send
                </button>
              </form>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '100px 20px', color: theme.subText }}>
              <MessageSquare size={56} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <h3 style={{ color: theme.title, margin: '0 0 6px' }}>Select Contact to Start Messaging</h3>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>Choose an Official or Admin from the left list.</p>
            </div>
          )}
        </div>
      </div>

      {/* Multi-Category Attachment Modal */}
      {showContextModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '20px'
        }}>
          <div style={{
            background: theme.cardBg, border: `1px solid ${theme.border}`,
            borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '580px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.4)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, color: theme.title, fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Tag size={18} color="#10b981" /> Send Context Record as Chat
                </h3>
                {targetCutterName && (
                  <span style={{ fontSize: '0.78rem', color: theme.subText, fontWeight: 700 }}>
                    Filtered for Tree Cutter: {targetCutterName}
                  </span>
                )}
              </div>
              <button onClick={() => setShowContextModal(false)} style={{ background: 'none', border: 'none', color: theme.subText, cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Category Tabs */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: `1px solid ${theme.border}`, marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => setContextTab('tasks')}
                style={{
                  padding: '8px 16px', border: 'none', background: 'none', fontSize: '0.88rem', fontWeight: 800,
                  color: contextTab === 'tasks' ? '#10b981' : theme.subText,
                  borderBottom: contextTab === 'tasks' ? '3px solid #10b981' : '3px solid transparent',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <FileText size={15} /> Work Tasks ({targetTasks.length})
              </button>
              <button
                type="button"
                onClick={() => setContextTab('leaves')}
                style={{
                  padding: '8px 16px', border: 'none', background: 'none', fontSize: '0.88rem', fontWeight: 800,
                  color: contextTab === 'leaves' ? '#10b981' : theme.subText,
                  borderBottom: contextTab === 'leaves' ? '3px solid #10b981' : '3px solid transparent',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <Calendar size={15} /> Leave Requests ({targetLeaves.length})
              </button>
              <button
                type="button"
                onClick={() => setContextTab('inventory')}
                style={{
                  padding: '8px 16px', border: 'none', background: 'none', fontSize: '0.88rem', fontWeight: 800,
                  color: contextTab === 'inventory' ? '#10b981' : theme.subText,
                  borderBottom: contextTab === 'inventory' ? '3px solid #10b981' : '3px solid transparent',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <Database size={15} /> Tool Inventory ({targetInventory.length})
              </button>
            </div>

            {/* Tab 1: Work Tasks */}
            {contextTab === 'tasks' && (
              <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {targetTasks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px 16px', color: theme.subText }}>
                    <FileText size={36} style={{ opacity: 0.4, marginBottom: '8px' }} />
                    <p style={{ margin: 0, fontWeight: 700 }}>No active work tasks assigned to {targetCutterName || 'this Tree Cutter'}.</p>
                  </div>
                ) : (
                  targetTasks.map(t => (
                    <div
                      key={t._id || t.id}
                      onClick={() => {
                        postDirectMessage({
                          messageText: `📋 Work Order Task Reference: "${t.title || t.treeSpecies || 'Tree Cutting Task'}" (${t.location || t.ward || 'Udupi Zone'})`,
                          contextType: 'task',
                          relatedTaskId: t._id || t.id,
                          relatedTaskTitle: t.title || t.treeSpecies || 'Tree Cutting Task',
                          relatedTaskLocation: t.location || t.ward || 'Udupi Zone'
                        });
                        setShowContextModal(false);
                      }}
                      style={{
                        padding: '12px 14px', borderRadius: '12px', background: theme.elevatedBg,
                        border: `1px solid ${theme.border}`, cursor: 'pointer', transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: theme.title }}>
                          {t.title || t.treeSpecies || 'Work Order Task'}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: theme.subText, marginTop: '2px' }}>
                          📍 {t.location || t.ward || 'Ward Zone'} • Status: {t.status || 'Assigned'}
                        </div>
                      </div>
                      <span style={{ background: '#10b981', color: '#fff', borderRadius: '6px', padding: '4px 10px', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Send as Chat <ChevronRight size={14} />
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 2: Leave Applications */}
            {contextTab === 'leaves' && (
              <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {targetLeaves.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px 16px', color: theme.subText }}>
                    <Calendar size={36} style={{ opacity: 0.4, marginBottom: '8px' }} />
                    <p style={{ margin: 0, fontWeight: 700 }}>No leave applications submitted by {targetCutterName || 'this Tree Cutter'}.</p>
                  </div>
                ) : (
                  targetLeaves.map(l => (
                    <div
                      key={l._id || l.id}
                      onClick={() => {
                        postDirectMessage({
                          messageText: `📅 Leave Application Reference: ${l.leaveType || 'Leave Request'} (${l.startDate} to ${l.endDate}) - Status: ${l.status}`,
                          contextType: 'leave',
                          relatedTaskId: l._id || l.id,
                          relatedTaskTitle: `${l.leaveType || 'Leave Request'} (${l.startDate} to ${l.endDate})`,
                          relatedTaskLocation: `Status: ${l.status} • Reason: ${l.reason || 'Staff leave'}`
                        });
                        setShowContextModal(false);
                      }}
                      style={{
                        padding: '12px 14px', borderRadius: '12px', background: theme.elevatedBg,
                        border: `1px solid ${theme.border}`, cursor: 'pointer', transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: theme.title }}>
                          {l.leaveType || 'Leave Application'} ({l.totalDays || 1} Days)
                        </div>
                        <div style={{ fontSize: '0.78rem', color: theme.subText, marginTop: '2px' }}>
                          📅 {l.startDate} to {l.endDate} • Status: {l.status} ({l.userName})
                        </div>
                      </div>
                      <span style={{ background: '#f59e0b', color: '#fff', borderRadius: '6px', padding: '4px 10px', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Send as Chat <ChevronRight size={14} />
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 3: Tool Inventory Checkouts */}
            {contextTab === 'inventory' && (
              <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {targetInventory.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px 16px', color: theme.subText }}>
                    <Database size={36} style={{ opacity: 0.4, marginBottom: '8px' }} />
                    <p style={{ margin: 0, fontWeight: 700 }}>No active borrowed equipment held by {targetCutterName || 'this Tree Cutter'}.</p>
                  </div>
                ) : (
                  targetInventory.map(({ property, req }, idx) => (
                    <div
                      key={req._id || idx}
                      onClick={() => {
                        postDirectMessage({
                          messageText: `🛠️ Equipment Checkout Reminder: "${property.name}" (Held by ${req.userName || targetCutterName})`,
                          contextType: 'property',
                          relatedTaskId: property._id || property.id,
                          relatedTaskTitle: property.name,
                          relatedTaskLocation: `Staff: ${req.userName || targetCutterName} • Date: ${req.requestedAt ? new Date(req.requestedAt).toLocaleDateString('en-IN') : 'Recent'}`
                        });
                        setShowContextModal(false);
                      }}
                      style={{
                        padding: '12px 14px', borderRadius: '12px', background: theme.elevatedBg,
                        border: `1px solid ${theme.border}`, cursor: 'pointer', transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: theme.title }}>
                          🛠️ {property.name} (1 Unit Checked Out)
                        </div>
                        <div style={{ fontSize: '0.78rem', color: theme.subText, marginTop: '2px' }}>
                          Staff: {req.userName || targetCutterName} • Status: Checked Out
                        </div>
                      </div>
                      <span style={{ background: '#3b82f6', color: '#fff', borderRadius: '6px', padding: '4px 10px', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Send as Chat <ChevronRight size={14} />
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Interactive Leaflet GPS Location Selection Modal */}
      {showLocationModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '20px'
        }}>
          <div style={{
            background: theme.cardBg, border: `1px solid ${theme.border}`,
            borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '640px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.4)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, color: theme.title, fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={18} color="#60a5fa" /> Share Leaflet GPS Field Location
              </h3>
              <button onClick={() => setShowLocationModal(false)} style={{ background: 'none', border: 'none', color: theme.subText, cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
              <button
                type="button"
                onClick={handleDetectLocation}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 14px',
                  fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: '6px'
                }}
              >
                <Crosshair size={14} /> Auto-Detect Device GPS
              </button>
              <input
                type="text"
                value={locationAddress}
                onChange={e => setLocationAddress(e.target.value)}
                placeholder="Enter location description..."
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: '8px',
                  border: `1px solid ${theme.border}`, background: theme.inputBg,
                  color: theme.inputText, fontSize: '0.85rem'
                }}
              />
            </div>

            <div style={{ height: '300px', borderRadius: '12px', overflow: 'hidden', border: `1px solid ${theme.border}`, marginBottom: '16px' }}>
              <MapContainer center={mapPosition} zoom={13} style={{ width: '100%', height: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <LocationMarker position={mapPosition} setPosition={setMapPosition} />
              </MapContainer>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', color: theme.subText, fontWeight: 600 }}>
                Selected: Lat {mapPosition[0].toFixed(5)}, Lng {mapPosition[1].toFixed(5)}
              </span>
              <button
                type="button"
                onClick={handleConfirmLocation}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                  color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 20px',
                  fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer'
                }}
              >
                Send GPS Map Location into Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Turn-by-Turn Leaflet Directions & Navigation Modal */}
      {viewMapModal && (
        <LeafletDirectionsModal
          viewMapModal={viewMapModal}
          setViewMapModal={setViewMapModal}
          theme={theme}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}
