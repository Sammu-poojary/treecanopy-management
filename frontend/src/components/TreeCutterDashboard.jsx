import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  TreePine, FileText, CheckCircle2, Clock, AlertTriangle, MapPin,
  Compass, MessageSquare, Database, RefreshCw, Layers, ExternalLink,
  ChevronRight, Calendar, UserCheck, ShieldAlert, Sparkles, Navigation2,
  Package, Search, Filter, Phone, CheckSquare, Maximize2, Minimize2, X, Activity, Radio,
  Upload, Camera, Leaf, Star, Eye, ChevronDown, ChevronUp
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import Swal from 'sweetalert2';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Custom Colored Leaflet Marker Icons
const createCustomIcon = (color) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="34" height="34">
      <path fill="${color}" stroke="#ffffff" stroke-width="2" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
      <circle cx="12" cy="9" r="3" fill="#ffffff"/>
    </svg>`;
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: svg,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -30]
  });
};

const redIcon = createCustomIcon('#ef4444');
const yellowIcon = createCustomIcon('#f59e0b');
const greenIcon = createCustomIcon('#10b981');

// ── Dedicated Live GPS Turn-by-Turn Navigation Modal (Pop-Up & Fullscreen) ──────
function TreeCutterNavigationModal({ activeTask, onClose, theme, darkMode }) {
  const [userPos, setUserPos] = useState([13.3500, 74.7500]);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isLiveTracking, setIsLiveTracking] = useState(true);
  const [routePolyline, setRoutePolyline] = useState([]);
  const [navigationSteps, setNavigationSteps] = useState([]);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [totalDistance, setTotalDistance] = useState(null);
  const [totalDuration, setTotalDuration] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(true);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [gpsReady, setGpsReady] = useState(false);
  const [gpsError, setGpsError] = useState(null);

  const destLat = Number(activeTask?.locationLat || activeTask?.lat || activeTask?.latitude || activeTask?.beforeGps?.lat) || 13.3409;
  const destLng = Number(activeTask?.locationLng || activeTask?.lng || activeTask?.longitude || activeTask?.beforeGps?.lng) || 74.7421;
  const destPos = useMemo(() => [destLat, destLng], [destLat, destLng]);

  // Live Geolocation Current & Watch Position
  useEffect(() => {
    let watchId;
    if ('geolocation' in navigator && isLiveTracking) {
      const onSuccess = (pos) => {
        setUserPos([pos.coords.latitude, pos.coords.longitude]);
        setGpsAccuracy(Math.round(pos.coords.accuracy));
        setGpsReady(true);
        setGpsError(null);
      };
      const onError = (err) => {
        if (err.code === 1) setGpsError('Browser location permission denied.');
        else if (err.code === 2) setGpsError('GPS signal unavailable.');
        else if (err.code === 3) setGpsError('GPS timeout.');
      };
      const opts = { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 };
      navigator.geolocation.getCurrentPosition(onSuccess, onError, opts);
      watchId = navigator.geolocation.watchPosition(onSuccess, () => {}, opts);
    }
    return () => {
      if (watchId && navigator.geolocation) navigator.geolocation.clearWatch(watchId);
    };
  }, [isLiveTracking]);

  // Fetch real road route from OSRM Routing Engine
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
                else if (type === 'continue') text = `Continue ${modifier} ${name}`.trim();
                else if (type === 'arrive') text = `Arrive at field location: ${activeTask.location || activeTask.ward || 'Destination'}`;

                return {
                  id: idx,
                  text: text.charAt(0).toUpperCase() + text.slice(1),
                  distanceMeters: Math.round(st.distance),
                  durationSec: Math.round(st.duration),
                  location: [st.maneuver.location[1], st.maneuver.location[0]],
                  modifier: modifier,
                  type: type
                };
              });
              setNavigationSteps(stepsData);
            }
          }
        }
      } catch (err) {
        console.error('OSRM fetch error:', err);
      } finally {
        if (isMounted) setLoadingRoute(false);
      }
    };

    fetchOSRMRoute();
    return () => { isMounted = false; };
  }, [userPos[0], userPos[1], destLat, destLng]);

  const getStepIcon = (modifier, type) => {
    if (type === 'arrive') return '🎯';
    if (modifier.includes('right')) return '↪️';
    if (modifier.includes('left')) return '↩️';
    if (modifier.includes('straight') || type === 'continue') return '⬆️';
    return '🏎️';
  };

  const handleOpenGoogleMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${userPos[0]},${userPos[1]}&destination=${destLat},${destLng}&travelmode=driving`;
    window.open(url, '_blank');
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: isFullScreen ? theme.bg : 'rgba(0,0,0,0.82)',
      backdropFilter: isFullScreen ? 'none' : 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 99999, padding: isFullScreen ? '0' : '20px'
    }}>
      <div style={{
        background: theme.cardBg, border: isFullScreen ? 'none' : `1px solid ${theme.border}`,
        borderRadius: isFullScreen ? '0' : '24px', padding: '24px',
        width: '100%', maxWidth: isFullScreen ? '100vw' : '960px',
        height: isFullScreen ? '100vh' : 'auto', maxHeight: isFullScreen ? '100vh' : '92vh',
        overflowY: 'auto', boxShadow: isFullScreen ? 'none' : '0 25px 60px rgba(0,0,0,0.6)',
        display: 'flex', flexDirection: 'column', gap: '16px'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800 }}>
                LEAFLET LIVE GPS ROUTING
              </span>
              <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Radio size={12} color="#34d399" /> LIVE GPS ACTIVE {gpsAccuracy ? `(±${gpsAccuracy}m)` : ''}
              </span>
            </div>
            <h3 style={{ margin: '4px 0 0', color: theme.title, fontSize: '1.3rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Navigation2 size={22} color="#3b82f6" /> {activeTask.title || activeTask.treeSpecies || activeTask.issueType || 'Work Order Navigation'}
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              style={{
                background: theme.elevatedBg, color: theme.title, border: `1px solid ${theme.border}`,
                borderRadius: '10px', padding: '8px 14px', fontSize: '0.82rem', fontWeight: 800,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
              }}
              title={isFullScreen ? "Exit Fullscreen Mode" : "Switch to Fullscreen Map View"}
            >
              {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              {isFullScreen ? 'Pop-Up View' : 'Full Screen'}
            </button>

            <button onClick={onClose} style={{ background: 'none', border: 'none', color: theme.subText, cursor: 'pointer', padding: '4px' }}>
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Live Navigation Route Summary Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(59, 130, 246, 0.15) 100%)',
          border: '1px solid rgba(52, 211, 153, 0.3)', borderRadius: '16px', padding: '14px 18px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px'
        }}>
          <div>
            <div style={{ fontSize: '0.94rem', fontWeight: 800, color: theme.title, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={17} color="#34d399" /> Target Site: {activeTask.location || activeTask.ward || `Lat ${destLat.toFixed(4)}, Lng ${destLng.toFixed(4)}`}
            </div>
            <div style={{ fontSize: '0.85rem', color: theme.subText, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span>📏 Road Distance: <b style={{ color: '#60a5fa' }}>{totalDistance || 'Calculating...'} km</b></span>
              <span>⏱️ Est. Driving: <b style={{ color: '#34d399' }}>~{totalDuration || 'calculating'} mins</b></span>
              <span>🚦 Turns: <b style={{ color: '#facc15' }}>{navigationSteps.length} maneuvers</b></span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleOpenGoogleMaps}
              style={{
                background: theme.elevatedBg, color: theme.title, border: `1px solid ${theme.border}`,
                borderRadius: '10px', padding: '9px 14px', fontSize: '0.82rem', fontWeight: 700,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px'
              }}
            >
              <ExternalLink size={15} /> External Google Maps
            </button>
          </div>
        </div>

        {/* Turn HUD (Step Banner) */}
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
                  MANEUVER {activeStepIndex + 1} OF {navigationSteps.length} • {navigationSteps[activeStepIndex]?.distanceMeters}m AHEAD
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

        {/* Dual Layout: Leaflet Map + Turn-by-Turn Maneuvers */}
        <div style={{
          display: 'grid', gridTemplateColumns: isFullScreen ? '1fr 340px' : '1fr clamp(280px, 32vw, 360px)',
          gap: '16px', flex: 1, minHeight: isFullScreen ? 'calc(100vh - 220px)' : '380px'
        }}>
          {/* Leaflet Map Canvas */}
          <div style={{ borderRadius: '16px', overflow: 'hidden', border: `1px solid ${theme.border}`, position: 'relative', height: isFullScreen ? '100%' : '400px' }}>
            <MapContainer
              bounds={routePolyline.length > 0 ? routePolyline : [userPos, destPos]}
              padding={[40, 40]}
              style={{ width: '100%', height: '100%' }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              
              <Marker position={userPos}>
                <Popup>📍 Your Current Live GPS Location</Popup>
              </Marker>

              <Marker position={destPos} ref={(r) => r && setTimeout(() => r.openPopup(), 300)}>
                <Popup>🎯 Target Field Location: {activeTask.location || 'Site'}</Popup>
              </Marker>

              {navigationSteps.length > 0 && navigationSteps[activeStepIndex] && (
                <Marker position={navigationSteps[activeStepIndex].location}>
                  <Popup><b>Step {activeStepIndex + 1}:</b> {navigationSteps[activeStepIndex].text}</Popup>
                </Marker>
              )}

              {routePolyline.length > 0 ? (
                <Polyline positions={routePolyline} color="#3b82f6" weight={6} opacity={0.85} />
              ) : (
                <Polyline positions={[userPos, destPos]} color="#3b82f6" weight={5} dashArray="8, 8" />
              )}
            </MapContainer>
          </div>

          {/* Turn-by-Turn Maneuvers Panel */}
          <div style={{
            background: theme.elevatedBg, border: `1px solid ${theme.border}`,
            borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column',
            maxHeight: isFullScreen ? '100%' : '400px', overflowY: 'auto'
          }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 800, color: theme.title, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={16} color="#3b82f6" /> Step-by-Step Directions ({navigationSteps.length})
            </h4>

            {loadingRoute ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: theme.subText, fontSize: '0.85rem' }}>
                Calculating OSRM road route...
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
        </div>
      </div>
    </div>
  );
}

// ── TreeDutyPanel: Manages Subscription-based Tree Care Duties ───────────────
export function TreeDutyPanel({ cutterId, cutterName, theme, darkMode, onNavigate }) {
  const [duties, setDuties] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [expandedId, setExpandedId] = React.useState(null);
  const [uploading, setUploading] = React.useState({});
  const [uploadForm, setUploadForm] = React.useState({});
  const [previewUrls, setPreviewUrls] = React.useState({});

  const fetchDuties = React.useCallback(async () => {
    if (!cutterId && !cutterName) { setLoading(false); return; }
    try {
      const res = await fetch(`${API_URL}/api/subscriptions/cutter-duties?cutterId=${encodeURIComponent(cutterId || '')}&cutterName=${encodeURIComponent(cutterName || '')}`);
      const data = await res.json();
      setDuties(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Tree duty fetch error:', err);
    } finally { setLoading(false); }
  }, [cutterId, cutterName]);

  React.useEffect(() => { fetchDuties(); }, [fetchDuties]);

  const handleFileChange = (subId, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrls(prev => ({ ...prev, [subId]: url }));
    const reader = new FileReader();
    reader.onload = ev => {
      setUploadForm(prev => ({ ...prev, [subId]: { ...(prev[subId] || {}), imageBase64: ev.target.result } }));
    };
    reader.readAsDataURL(file);
  };

  const handleFormChange = (subId, field, value) => {
    setUploadForm(prev => ({ ...prev, [subId]: { ...(prev[subId] || {}), [field]: value } }));
  };

  const handleUploadProof = async (sub) => {
    const form = uploadForm[sub._id] || {};
    if (!form.imageBase64) {
      Swal.fire({ icon: 'warning', title: 'No Photo', text: 'Please select a care proof photo first.', confirmButtonColor: '#10b981' });
      return;
    }
    setUploading(prev => ({ ...prev, [sub._id]: true }));
    try {
      const res = await fetch(`${API_URL}/api/subscriptions/${sub._id}/upload-proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskType: form.taskType || 'Watering',
          description: form.description || '',
          uploadedBy: cutterId,
          uploadedByName: cutterName,
          uploadedByRole: 'Tree Cutter',
          imageBase64: form.imageBase64,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setUploadForm(prev => { const n = { ...prev }; delete n[sub._id]; return n; });
      setPreviewUrls(prev => { const n = { ...prev }; delete n[sub._id]; return n; });
      // Refresh duties list
      await fetchDuties();
      Swal.fire({
        icon: 'success',
        title: '✅ Care Proof Submitted!',
        html: `<p>Your <strong>${form.taskType || 'Watering'}</strong> proof for <strong>${sub.treeName}</strong> has been uploaded to Cloudinary and is pending official review.</p>`,
        confirmButtonColor: '#10b981',
        timer: 4000,
        timerProgressBar: true,
      });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Upload Failed', text: err.message, confirmButtonColor: '#ef4444' });
    } finally {
      setUploading(prev => ({ ...prev, [sub._id]: false }));
    }
  };

  const taskStatusColor = (s) => {
    if (s === 'Validated') return '#34d399';
    if (s === 'Rejected') return '#f87171';
    return '#fbbf24';
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: theme.subText }}>
        <div style={{ fontSize: '3rem', marginBottom: '12px', animation: 'pulse 1.5s infinite' }}>🌳</div>
        <p style={{ fontWeight: 700 }}>Loading your assigned tree duties...</p>
      </div>
    );
  }

  if (!cutterId) {
    return <div style={{ textAlign: 'center', padding: '40px', color: theme.subText }}>Login required to view tree duties.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Panel Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, color: theme.title, fontSize: '1.2rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>🌿</span> Subscription Tree Care Duties
          </h3>
          <span style={{ fontSize: '0.8rem', color: theme.subText }}>Upload Cloudinary proof photos for your assigned adopted trees · Reviewed by Official/Admin · Visible to Citizens</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)', padding: '4px 14px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 800 }}>
            {duties.length} Tree{duties.length !== 1 ? 's' : ''} Assigned
          </span>
          <button
            onClick={fetchDuties}
            style={{ background: theme.elevatedBg, color: theme.title, border: `1px solid ${theme.border}`, borderRadius: '10px', padding: '7px 14px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Duty Cards */}
      {duties.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', background: theme.elevatedBg, borderRadius: '20px', border: `2px dashed ${theme.border}` }}>
          <div style={{ fontSize: '4rem', marginBottom: '14px' }}>🌱</div>
          <h4 style={{ margin: '0 0 8px', color: theme.title, fontSize: '1.1rem' }}>No Tree Duties Assigned Yet</h4>
          <p style={{ margin: '0 0 6px', color: theme.subText, fontSize: '0.9rem', maxWidth: '400px', marginInline: 'auto' }}>You will appear here once an official/admin assigns you to a citizen's adopted tree subscription.</p>
          <p style={{ margin: 0, color: theme.subText, fontSize: '0.8rem' }}>Check back after an official assigns you via the Adoptions Management portal.</p>
        </div>
      ) : (
        duties.map(sub => {
          const isExpanded = expandedId === sub._id;
          const form = uploadForm[sub._id] || {};
          const preview = previewUrls[sub._id];
          const isUploading = uploading[sub._id];
          const sched = sub._scheduleInfo || {};
          const pendingTasks = sched.pendingTaskCount || (sub.careTasks || []).filter(t => t.status === 'Pending').length;
          const validatedTasks = sched.validatedTaskCount || (sub.careTasks || []).filter(t => t.status === 'Validated').length;
          const totalTasks = sched.totalTaskCount || (sub.careTasks || []).length;
          const daysUntilDue = sched.daysUntilDue;
          const isOverdue = sched.isOverdue;

          return (
            <div key={sub._id} style={{
              background: theme.cardBg, borderRadius: '18px',
              border: `1px solid ${isExpanded ? 'rgba(16,185,129,0.5)' : isOverdue ? 'rgba(239,68,68,0.4)' : theme.border}`,
              overflow: 'hidden', transition: 'all 0.25s',
              boxShadow: isExpanded ? `0 8px 28px rgba(16,185,129,0.1)` : isOverdue ? '0 4px 16px rgba(239,68,68,0.07)' : 'none'
            }}>

              {/* Card Summary Row */}
              <div
                style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', flexWrap: 'wrap' }}
                onClick={() => setExpandedId(isExpanded ? null : sub._id)}
              >
                {/* Tree thumbnail */}
                <div style={{ width: '58px', height: '58px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0, border: '2px solid rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.08)', position: 'relative' }}>
                  <img src={sub.treeImage || 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=200&q=80'} alt={sub.treeName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.src = 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=200&q=80'; }} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: '160px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: theme.title }}>{sub.treeName}</span>
                    <span style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)', padding: '2px 9px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700 }}>
                      {sub.plan === 'monthly' ? '₹500/mo' : sub.plan === 'yearly' ? '₹6K/yr' : 'Self Adopted'}
                    </span>
                    {/* Schedule badge */}
                    {typeof daysUntilDue === 'number' && (
                      <span style={{
                        background: isOverdue ? 'rgba(239,68,68,0.15)' : daysUntilDue <= 2 ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.12)',
                        color: isOverdue ? '#f87171' : daysUntilDue <= 2 ? '#fbbf24' : '#34d399',
                        border: `1px solid ${isOverdue ? 'rgba(239,68,68,0.3)' : daysUntilDue <= 2 ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`,
                        padding: '2px 8px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700
                      }}>
                        {isOverdue ? `🔴 Overdue by ${Math.abs(daysUntilDue)}d` : daysUntilDue <= 2 ? `⚠️ Due in ${daysUntilDue}d` : `📅 Due in ${daysUntilDue}d`}
                      </span>
                    )}
                    {pendingTasks > 0 && (
                      <span style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)', padding: '2px 8px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700 }}>
                        ⏳ {pendingTasks} Pending
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: theme.subText, display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                    {sub.treeLocation && <span>📍 {sub.treeLocation}</span>}
                    <span>👤 Citizen: {sub.userName}</span>
                    <span>✅ {validatedTasks} validated · 📸 {totalTasks} total records</span>
                  </div>
                </div>

                {/* Actions + Expand */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  {onNavigate && sub.treeLocation && (
                    <button
                      onClick={() => onNavigate({ location: sub.treeLocation, treeName: sub.treeName })}
                      style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', padding: '6px 10px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      title="Navigate to tree location"
                    >
                      <Compass size={13} /> Navigate
                    </button>
                  )}
                  <span style={{ color: theme.subText, fontSize: '0.82rem' }} onClick={() => setExpandedId(isExpanded ? null : sub._id)}>
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </span>
                </div>
              </div>

              {/* Expanded Panel */}
              {isExpanded && (
                <div style={{ borderTop: `1px solid ${theme.border}`, padding: '22px', display: 'flex', flexDirection: 'column', gap: '22px' }}>

                  {/* Citizen & Schedule Info Banner */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                    {[
                      { icon: '👤', label: 'Adopting Citizen', val: sub.userName || '—' },
                      { icon: '📅', label: 'Assigned On', val: sub.assignedAt ? new Date(sub.assignedAt).toLocaleDateString('en-IN') : '—' },
                      { icon: '⏰', label: 'Next Care Due', val: sched.nextCareDue ? new Date(sched.nextCareDue).toLocaleDateString('en-IN') : '—' },
                      { icon: '📸', label: 'Total Records', val: `${totalTasks} (${validatedTasks} ✓)` },
                    ].map((item, idx) => (
                      <div key={idx} style={{ background: theme.elevatedBg, borderRadius: '12px', padding: '12px 14px', border: `1px solid ${theme.border}` }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: theme.subText, marginBottom: '3px' }}>{item.icon} {item.label}</div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 800, color: theme.title }}>{item.val}</div>
                      </div>
                    ))}
                  </div>

                  {/* Upload Form */}
                  <div style={{ background: theme.elevatedBg, borderRadius: '14px', padding: '20px', border: `1px solid ${theme.border}` }}>
                    <h4 style={{ margin: '0 0 16px', color: '#34d399', fontSize: '0.95rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Camera size={16} /> Upload New Care Proof (→ Cloudinary)
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: theme.subText, marginBottom: '5px' }}>Care Activity Type</label>
                        <select
                          value={form.taskType || 'Watering'}
                          onChange={e => handleFormChange(sub._id, 'taskType', e.target.value)}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.title, fontSize: '0.88rem', cursor: 'pointer', outline: 'none' }}
                        >
                          {['Watering', 'Pruning', 'Inspection', 'Fertilizing', 'Pest Control', 'Mulching', 'Cleaning', 'Other'].map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: theme.subText, marginBottom: '5px' }}>Photo Proof *</label>
                        <label style={{
                          display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '10px',
                          border: `2px dashed ${preview ? '#34d399' : theme.border}`,
                          background: preview ? 'rgba(16,185,129,0.06)' : theme.cardBg, cursor: 'pointer',
                          fontSize: '0.82rem', color: preview ? '#34d399' : theme.subText, fontWeight: 700, transition: 'all 0.2s'
                        }}>
                          <Upload size={14} /> {preview ? '✅ Photo ready to upload' : 'Tap to choose / take photo'}
                          <input type="file" accept="image/*" capture="environment" onChange={e => handleFileChange(sub._id, e)} style={{ display: 'none' }} />
                        </label>
                      </div>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: theme.subText, marginBottom: '5px' }}>Care Notes (optional)</label>
                      <textarea
                        rows={2}
                        value={form.description || ''}
                        onChange={e => handleFormChange(sub._id, 'description', e.target.value)}
                        placeholder="Describe the care performed e.g. Watered 5L, removed dead leaves..."
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.title, fontSize: '0.85rem', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                      {preview && (
                        <div style={{ position: 'relative', width: '90px', height: '68px', borderRadius: '10px', overflow: 'hidden', border: '2px solid #34d399', flexShrink: 0 }}>
                          <img src={preview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', fontSize: '0.6rem', color: '#fff', textAlign: 'center', padding: '2px' }}>Preview</div>
                        </div>
                      )}
                      <button
                        onClick={() => handleUploadProof(sub)}
                        disabled={isUploading || !form.imageBase64}
                        style={{
                          padding: '11px 26px', borderRadius: '12px', border: 'none',
                          background: form.imageBase64 ? 'linear-gradient(135deg, #059669, #047857)' : theme.elevatedBg,
                          color: form.imageBase64 ? '#fff' : theme.subText,
                          fontWeight: 800, fontSize: '0.92rem', cursor: form.imageBase64 ? 'pointer' : 'not-allowed',
                          display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s',
                          boxShadow: form.imageBase64 ? '0 4px 16px rgba(5,150,105,0.35)' : 'none'
                        }}
                      >
                        <Upload size={15} />
                        {isUploading ? 'Uploading to Cloudinary...' : 'Submit Care Proof'}
                      </button>
                      <div style={{ fontSize: '0.75rem', color: theme.subText }}>
                        🔒 Uploaded to Cloudinary · reviewed by Official · visible to citizen
                      </div>
                    </div>
                  </div>

                  {/* Existing Care Task Gallery */}
                  <div>
                    <h4 style={{ margin: '0 0 12px', color: theme.title, fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      🗂️ Care Proof History
                      <span style={{ background: 'rgba(52,211,153,0.1)', color: '#95d5b2', padding: '2px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600 }}>{totalTasks} records</span>
                      {validatedTasks > 0 && <span style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', padding: '2px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600 }}>✅ {validatedTasks} Validated</span>}
                    </h4>
                    {totalTasks === 0 ? (
                      <div style={{ textAlign: 'center', padding: '28px 0', color: theme.subText, fontSize: '0.85rem', background: theme.elevatedBg, borderRadius: '12px' }}>
                        <div style={{ fontSize: '2.2rem', marginBottom: '8px' }}>🌿</div>
                        No care records yet. Upload your first proof above!
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))', gap: '12px' }}>
                        {[...(sub.careTasks || [])].reverse().map((task, i) => (
                          <div key={i} style={{ background: darkMode ? '#061a14' : '#f8fafc', borderRadius: '14px', overflow: 'hidden', border: `1px solid ${task.status === 'Validated' ? 'rgba(52,211,153,0.3)' : task.status === 'Rejected' ? 'rgba(248,113,113,0.3)' : theme.border}` }}>
                            {task.proofImageUrl ? (
                              <div style={{ height: '115px', overflow: 'hidden', cursor: 'pointer', position: 'relative' }} onClick={() => window.open(task.proofImageUrl, '_blank')}>
                                <img src={task.proofImageUrl} alt="care proof" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }} onMouseEnter={e => e.target.style.transform = 'scale(1.08)'} onMouseLeave={e => e.target.style.transform = 'scale(1)'} />
                                <div style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>🔗 Cloudinary</div>
                              </div>
                            ) : (
                              <div style={{ height: '115px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(52,211,153,0.05)', color: theme.subText, fontSize: '2rem' }}>🌱</div>
                            )}
                            <div style={{ padding: '10px 12px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <span style={{ fontWeight: 700, color: theme.title, fontSize: '0.82rem' }}>{task.taskType}</span>
                                <span style={{ color: taskStatusColor(task.status), fontSize: '0.65rem', fontWeight: 800, background: `${taskStatusColor(task.status)}22`, padding: '2px 7px', borderRadius: '6px' }}>{task.status}</span>
                              </div>
                              {task.description && <p style={{ margin: '0 0 4px', fontSize: '0.74rem', color: theme.subText, lineHeight: 1.4 }}>{task.description}</p>}
                              <div style={{ fontSize: '0.67rem', color: '#64748b' }}>
                                {task.uploadedAt && `📅 ${new Date(task.uploadedAt).toLocaleDateString('en-IN')}`}
                                {task.uploadedByName && ` · ${task.uploadedByName}`}
                              </div>
                              {task.validationNote && (
                                <div style={{ marginTop: '4px', fontSize: '0.7rem', color: task.status === 'Validated' ? '#34d399' : '#f87171', background: task.status === 'Validated' ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)', padding: '3px 6px', borderRadius: '5px' }}>
                                  💬 {task.validationNote}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// ── Main Tree Cutter Dashboard Component ─────────────────────────────────────
export default function TreeCutterDashboard() {
  const currentUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('currentUser')) || {}; }
    catch { return {}; }
  }, []);

  const cutterId = String(currentUser.id || currentUser._id || currentUser.userId || '').trim();
  const cutterName = currentUser.name || currentUser.username || 'Tree Cutter';

  const [tasks, setTasks] = useState([]);
  const [borrowedInventory, setBorrowedInventory] = useState([]);
  const [duties, setDuties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('work-orders'); // 'work-orders' | 'tree-duties'

  // Navigation Modal state
  const [navModalTask, setNavModalTask] = useState(null);

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
    accent: '#10b981',
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch(`${API_URL}/api/complaints`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.complaints || [];
        setTasks(list);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    }
  };

  const fetchDutiesCount = async () => {
    if (!cutterId) return;
    try {
      const res = await fetch(`${API_URL}/api/subscriptions/cutter-duties?cutterId=${cutterId}`);
      if (res.ok) {
        const data = await res.json();
        setDuties(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching duties count:', err);
    }
  };

  const fetchBorrowedInventory = async () => {
    try {
      const userId = cutterId || currentUser?.id || currentUser?._id || 'snow-id';
      const nameLower = cutterName.toLowerCase().trim();

      const returnedList = (() => {
        try { return JSON.parse(localStorage.getItem(`cutter_returned_tools_${userId}`) || '[]'); }
        catch { return []; }
      })();

      const localList = (() => {
        const key1 = `cutter_borrowed_tools_${userId}`;
        const item1 = (() => { try { return JSON.parse(localStorage.getItem(key1) || '[]'); } catch { return []; } })();
        const item2 = (() => { try { return JSON.parse(localStorage.getItem('officialBorrowed') || '[]'); } catch { return []; } })();
        return [...item1, ...item2];
      })();

      const map = new window.Map();

      // 1. Local storage borrowed tools
      localList.forEach(item => {
        const itemKey = item._id || item.id;
        if (itemKey && !returnedList.includes(itemKey)) {
          map.set(itemKey, {
            property: item.property || item,
            req: item.req || item.purchaseRequests?.[0] || { _id: `req-${itemKey}` },
            checkoutDate: item.checkoutDate || 'Active'
          });
        }
      });

      // 2. Fetch properties from server API
      const res = await fetch(`${API_URL}/api/properties`);
      if (res.ok) {
        const data = await res.json();
        const propertyList = Array.isArray(data) ? data : [];

        propertyList.forEach(p => {
          if (returnedList.includes(p._id)) return;
          if (Array.isArray(p.purchaseRequests)) {
            p.purchaseRequests.forEach(req => {
              const reqUserId = String(req.userId || req.id || '').trim();
              const reqUserName = String(req.userName || req.username || '').toLowerCase();

              const matchId = userId && (reqUserId === userId);
              const matchName = nameLower && (reqUserName.includes(nameLower) || nameLower.includes(reqUserName));

              if (matchId || matchName || !cutterId) {
                map.set(p._id, {
                  property: p,
                  req: req,
                  checkoutDate: req.requestedAt ? new Date(req.requestedAt).toLocaleDateString('en-IN') : 'Recent'
                });
              }
            });
          }
        });
      }

      setBorrowedInventory(Array.from(map.values()));
    } catch (err) {
      console.error('Error fetching inventory:', err);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([fetchTasks(), fetchBorrowedInventory(), fetchDutiesCount()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAllData();
  }, [cutterId, cutterName]);

  // ── Automatic 1-Hour & Overdue Return Deadline Pop-Up Alert & Email Dispatcher ──
  useEffect(() => {
    if (!borrowedInventory || borrowedInventory.length === 0) return;

    const cutterEmail = currentUser?.email || currentUser?.emailId || localStorage.getItem('userEmail') || (cutterName.toLowerCase().includes('snow') ? 'neelanjanv8@gmail.com' : `${cutterName.toLowerCase()}@gmail.com`);

    borrowedInventory.forEach(item => {
      const prop = item.property || item;
      const req = item.req || prop.purchaseRequests?.[0] || { requestedAt: new Date(Date.now() - 24.5 * 3600 * 1000).toISOString() };

      let requestedAtMs = Date.now() - 23.5 * 3600 * 1000;
      if (req.requestedAt) {
        const d = new Date(req.requestedAt).getTime();
        if (!isNaN(d)) requestedAtMs = d;
      }

      const dueMs = requestedAtMs + 24 * 3600 * 1000;
      const diffMs = dueMs - Date.now();
      const isOverdue = diffMs <= 0;
      const isWarning1Hour = diffMs <= 3600 * 1000 && diffMs > 0;
      const dueStr = new Date(dueMs).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

      // 1. OVERDUE EMAIL DISPATCH
      if (isOverdue) {
        const overdueNotifKey = `cutter_overdue_notif_${prop._id || prop.id}_${cutterName}`;
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
                  <b style="color: #991b1b; font-size: 1rem;">Overdue Tool: ${prop.name}</b><br/>
                  <span style="color: #dc2626; font-weight: 800;">Status: EXPIRED 24-HOUR RETURN DEADLINE</span><br/>
                  <small style="color: #64748b;">Return Deadline Was: ${dueStr}</small>
                </div>
                <p style="margin-bottom: 8px;">
                  📧 <b>Urgent Overdue Reminder Email Dispatched To:</b> <code>${cutterEmail}</code>
                </p>
                <p style="margin-bottom: 0; font-size: 0.85rem; color: #991b1b; font-weight: bold;">
                  Please submit and return this equipment to the Municipal Property Depot immediately.
                </p>
              </div>
            `,
            confirmButtonText: 'I Will Return Tool Now',
            confirmButtonColor: '#ef4444'
          });

          // Dispatch Email to Backend API
          fetch(`${API_URL}/api/notifications/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: cutterEmail,
              subject: `🚨 OVERDUE URGENT: Return Required for Municipal Equipment - ${prop.name}`,
              body: `DEPT NOTICE - URGENT OVERDUE\n\nDear ${cutterName},\n\nYour borrowed equipment "${prop.name}" has EXPIRED its 24-hour return deadline.\n\nPlease submit and return the tool back to Municipal Equipment Depot immediately.\n\nCanopyGuard Municipal Management System`
            })
          }).then(r => r.json()).then(data => {
            console.log('Overdue reminder email dispatched:', data);
          }).catch(e => console.log('Overdue email send note:', e.message));
        }
      }

      // 2. 1-HOUR WARNING EMAIL DISPATCH
      else if (isWarning1Hour) {
        const warnNotifKey = `cutter_warn_notif_${prop._id || prop.id}_${cutterName}`;
        const alreadyNotifiedWarn = localStorage.getItem(warnNotifKey);

        if (!alreadyNotifiedWarn) {
          localStorage.setItem(warnNotifKey, new Date().toISOString());

          Swal.fire({
            icon: 'warning',
            title: '⚠️ EQUIPMENT RETURN DEADLINE (1 HOUR LEFT)',
            html: `
              <div style="text-align: left; font-size: 0.92rem; line-height: 1.5; color: #1e293b;">
                <p style="margin-top:0;">Attention Arborist <b>${cutterName}</b>,</p>
                <div style="background: #fffbebfb; border: 1px solid #fcd34d; padding: 14px; border-radius: 10px; margin-bottom: 12px;">
                  <b style="color: #92400e; font-size: 1rem;">Borrowed Tool: ${prop.name}</b><br/>
                  <span style="color: #d97706; font-weight: 800;">Deadline: 1 Hour Remaining</span><br/>
                  <small style="color: #64748b;">Return Deadline: ${dueStr}</small>
                </div>
                <p style="margin-bottom: 8px;">
                  📧 <b>Automated Warning Email Sent To:</b> <code>${cutterEmail}</code>
                </p>
                <p style="margin-bottom: 0; font-size: 0.85rem; color: #475569;">
                  Please submit and return this equipment back to the Municipal Property Depot immediately.
                </p>
              </div>
            `,
            confirmButtonText: 'I Will Return Equipment Now',
            confirmButtonColor: '#d97706'
          });

          fetch(`${API_URL}/api/notifications/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: cutterEmail,
              subject: `⚠️ URGENT: Equipment Return Deadline in 1 Hour - ${prop.name}`,
              body: `Dear ${cutterName},\n\nYour borrowed equipment "${prop.name}" must be returned within 1 hour.\n\nPlease submit and return the tool to the Municipal Equipment Depot immediately.\n\nCanopyGuard Municipal System`
            })
          }).then(r => r.json()).then(data => {
            console.log('1-Hour warning email dispatched:', data);
          }).catch(e => console.log('Warning email send note:', e.message));
        }
      }
    });
  }, [borrowedInventory, cutterName]);

  // Strictly filter tasks for logged in Tree Cutter only
  const myAssignedTasks = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];
    if (!cutterId && !cutterName) return [];

    const nameLower = cutterName.toLowerCase().trim();
    const idStr = String(cutterId || '').trim();

    return tasks.filter(t => {
      const assignedId = String(t.assignedToId || t.assignedCutterId || t.assignedTo || t.cutterId || t.userId || '').trim();
      const assignedName = String(t.assignedTo || t.assignedCutter || t.assignedCutterName || t.assignedToName || t.userName || '').toLowerCase().trim();

      const matchId = idStr && (assignedId === idStr);
      const matchName = nameLower && (assignedName.length > 0 && (assignedName.includes(nameLower) || nameLower.includes(assignedName)));
      return matchId || matchName;
    });
  }, [tasks, cutterId, cutterName]);

  // Stage & Progress Pipeline Helper
  const getStageInfo = (status) => {
    switch (status) {
      case 'Scheduled':
      case 'Assigned':
        return {
          label: 'Scheduled',
          progress: 25,
          color: '#3b82f6',
          bg: 'rgba(59, 130, 246, 0.15)',
          border: 'rgba(59, 130, 246, 0.3)',
          nextStatus: 'Reached Location',
          nextActionLabel: '📍 Reached Location'
        };
      case 'Reached Location':
        return {
          label: 'Reached Site',
          progress: 45,
          color: '#06b6d4',
          bg: 'rgba(6, 182, 212, 0.15)',
          border: 'rgba(6, 182, 212, 0.3)',
          nextStatus: 'In Progress',
          nextActionLabel: '⚡ Start Cutting'
        };
      case 'In Progress':
        return {
          label: 'Cutting In Progress',
          progress: 65,
          color: '#f59e0b',
          bg: 'rgba(245, 158, 11, 0.15)',
          border: 'rgba(245, 158, 11, 0.3)',
          nextStatus: 'Work Completed',
          nextActionLabel: '✂️ Work Completed'
        };
      case 'Work Completed':
        return {
          label: 'Work Completed',
          progress: 85,
          color: '#8b5cf6',
          bg: 'rgba(139, 92, 246, 0.15)',
          border: 'rgba(139, 92, 246, 0.3)',
          nextStatus: 'Waste Disposed',
          nextActionLabel: '🚛 Waste Disposed'
        };
      case 'Waste Disposed':
        return {
          label: 'Waste Disposed',
          progress: 95,
          color: '#10b981',
          bg: 'rgba(16, 185, 129, 0.15)',
          border: 'rgba(16, 185, 129, 0.3)',
          nextStatus: 'Resolved',
          nextActionLabel: '✓ Resolve Work Order'
        };
      case 'Resolved':
      case 'Closed':
      case 'Completed':
        return {
          label: 'Fully Resolved',
          progress: 100,
          color: '#10b981',
          bg: 'rgba(16, 185, 129, 0.2)',
          border: 'rgba(16, 185, 129, 0.4)',
          nextStatus: null,
          nextActionLabel: null
        };
      default:
        return {
          label: status || 'Pending',
          progress: 15,
          color: '#94a3b8',
          bg: 'rgba(148, 163, 184, 0.15)',
          border: 'rgba(148, 163, 184, 0.3)',
          nextStatus: 'Scheduled',
          nextActionLabel: 'Schedule Task'
        };
    }
  };

  const stats = useMemo(() => {
    const total = myAssignedTasks.length;
    const completed = myAssignedTasks.filter(t => ['Work Completed', 'Waste Disposed', 'Completed', 'Resolved', 'Closed'].includes(t.status)).length;
    const inProgress = myAssignedTasks.filter(t => ['Scheduled', 'Assigned', 'Reached Location', 'In Progress', 'Pending'].includes(t.status)).length;
    const emergency = myAssignedTasks.filter(t => t.priority === 'High' || t.issueType === 'damaged' || t.issueType === 'fallen').length;
    const treeDuties = duties.length;
    return { total, completed, inProgress, emergency, treeDuties };
  }, [myAssignedTasks, duties]);

  const filteredTasks = useMemo(() => {
    return myAssignedTasks.filter(t => {
      const isFinished = ['Work Completed', 'Waste Disposed', 'Completed', 'Resolved', 'Closed'].includes(t.status);
      if (filterStatus === 'pending') {
        if (isFinished) return false;
      } else if (filterStatus === 'completed') {
        if (!isFinished) return false;
      } else if (filterStatus === 'high') {
        if (t.priority !== 'High') return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const title = (t.title || t.treeSpecies || t.issueType || '').toLowerCase();
        const loc = (t.location || t.ward || '').toLowerCase();
        return title.includes(q) || loc.includes(q);
      }

      return true;
    });
  }, [myAssignedTasks, filterStatus, searchQuery]);

  const mapCenter = useMemo(() => {
    if (myAssignedTasks.length > 0) {
      const firstWithCoords = myAssignedTasks.find(t => t.locationLat && t.locationLng);
      if (firstWithCoords) return [firstWithCoords.locationLat, firstWithCoords.locationLng];
    }
    return [13.3409, 74.7421];
  }, [myAssignedTasks]);

  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      // Primary: PATCH /api/complaints/:id/status
      let res = await fetch(`${API_URL}/api/complaints/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      // Fallback: PATCH /api/complaints/:id
      if (!res.ok) {
        res = await fetch(`${API_URL}/api/complaints/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });
      }

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: `Stage Updated to: ${newStatus}`,
          text: `Task #${String(taskId).slice(-6).toUpperCase()} status successfully updated.`,
          toast: true,
          position: 'top-end',
          timer: 2500,
          showConfirmButton: false
        });
        fetchTasks();
      } else {
        throw new Error('Failed to update stage on backend');
      }
    } catch (err) {
      console.error('Update status error:', err);
      Swal.fire({ icon: 'error', title: 'Could not update task status', text: err.message });
    }
  };

  return (
    <div style={{ background: theme.bg, minHeight: '100vh', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. Header Banner */}
      <div style={{
        background: theme.cardBg, border: `1px solid ${theme.border}`,
        borderRadius: '20px', padding: '24px 28px', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.05)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 800 }}>
              TREE CUTTER & ARBORIST DASHBOARD
            </span>
            <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 }}>
              Sector: Central Ward 4 (Udupi Zone)
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, color: theme.title }}>
            Welcome back, {cutterName}!
          </h1>
          <p style={{ margin: '4px 0 0', color: theme.subText, fontSize: '0.9rem' }}>
            Track assigned hazard cutting work orders, field GPS routes, and borrowed equipment.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={loadAllData}
            style={{
              background: theme.elevatedBg, color: theme.title, border: `1px solid ${theme.border}`,
              borderRadius: '12px', padding: '10px 16px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', fontWeight: 700
            }}
          >
            <RefreshCw size={16} /> Sync Data
          </button>

          <Link
            to="/treecutter/communication"
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
              color: '#ffffff', border: 'none', borderRadius: '12px', padding: '11px 20px',
              fontSize: '0.88rem', fontWeight: 800, textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              boxShadow: '0 4px 14px rgba(16,185,129,0.35)'
            }}
          >
            <MessageSquare size={17} /> Ask Doubt / Contact Official
          </Link>
        </div>
      </div>

      {/* 2. Quick Analytics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: theme.subText }}>Total Work Orders</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: theme.title }}>{stats.total}</div>
          </div>
        </div>

        <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: theme.subText }}>In Progress / Pending</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#f59e0b' }}>{stats.inProgress}</div>
          </div>
        </div>

        <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: theme.subText }}>Completed Tasks</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#34d399' }}>{stats.completed}</div>
          </div>
        </div>

        <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldAlert size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: theme.subText }}>Emergency Hazards</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#f87171' }}>{stats.emergency}</div>
          </div>
        </div>

        {/* Tree Duties Card - clickable to switch tab */}
        <div
          onClick={() => setActiveTab('tree-duties')}
          style={{ background: activeTab === 'tree-duties' ? 'rgba(16,185,129,0.1)' : theme.cardBg, border: `1px solid ${activeTab === 'tree-duties' ? 'rgba(16,185,129,0.4)' : theme.border}`, borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Leaf size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: theme.subText }}>Assigned Trees</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#10b981' }}>{stats.treeDuties}</div>
            <div style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 700 }}>Click to view duties →</div>
          </div>
        </div>
      </div>

      {/* 3. Main Grid: Interactive Leaflet Field Map & Borrowed Inventory */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* Left Side: Leaflet Field Work Map */}
        <div style={{
          background: theme.cardBg, border: `1px solid ${theme.border}`,
          borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, color: theme.title, fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={18} color="#3b82f6" /> Assigned Field Work Map
              </h3>
              <span style={{ fontSize: '0.78rem', color: theme.subText }}>
                Interactive pins for tasks assigned specifically to {cutterName}
              </span>
            </div>
            <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '4px 10px', borderRadius: '10px', fontSize: '0.76rem', fontWeight: 700 }}>
              {myAssignedTasks.length} Field Pins
            </span>
          </div>

          <div style={{ height: '380px', borderRadius: '14px', overflow: 'hidden', border: `1px solid ${theme.border}`, position: 'relative', zIndex: 1, isolation: 'isolate' }}>
            <MapContainer center={mapCenter} zoom={13} style={{ width: '100%', height: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {myAssignedTasks.map((t, idx) => {
                const lat = Number(t.locationLat) || (13.3409 + (idx * 0.005));
                const lng = Number(t.locationLng) || (74.7421 + (idx * 0.006));
                const isHigh = t.priority === 'High' || t.issueType === 'damaged' || t.issueType === 'fallen';
                const isDone = t.status === 'Completed' || t.status === 'Resolved';
                const markerIcon = isDone ? greenIcon : isHigh ? redIcon : yellowIcon;

                return (
                  <Marker key={t._id || t.id || idx} position={[lat, lng]} icon={markerIcon}>
                    <Popup>
                      <div style={{ minWidth: '200px', padding: '4px' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', marginBottom: '4px' }}>
                          {t.title || t.treeSpecies || t.issueType || 'Tree Cutting Task'}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#475569', marginBottom: '6px' }}>
                          📍 {t.location || t.ward || 'Udupi Zone'}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                          <span style={{ background: isDone ? '#d1fae5' : isHigh ? '#fee2e2' : '#fef3c7', color: isDone ? '#047857' : isHigh ? '#b91c1c' : '#b45309', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800 }}>
                            {t.status || 'In Progress'}
                          </span>
                        </div>

                        {/* SEPARATE BUTTONS FOR CHAT AND NAVIGATION */}
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <Link
                            to="/treecutter/communication"
                            style={{
                              background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px',
                              padding: '6px 10px', fontSize: '0.75rem', fontWeight: 800, textDecoration: 'none',
                              display: 'inline-flex', alignItems: 'center', gap: '4px'
                            }}
                          >
                            <MessageSquare size={13} /> Chat
                          </Link>

                          <button
                            type="button"
                            onClick={() => setNavModalTask(t)}
                            style={{
                              background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px',
                              padding: '6px 10px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
                              display: 'inline-flex', alignItems: 'center', gap: '4px'
                            }}
                          >
                            <Compass size={13} /> Live Navigate
                          </button>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </div>

        {/* Right Side: Property / Borrowed Inventory Reminders */}
        <div style={{
          background: theme.cardBg, border: `1px solid ${theme.border}`,
          borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, color: theme.title, fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={18} color="#f59e0b" /> Borrowed Equipment & Tool Inventory
              </h3>
              <span style={{ fontSize: '0.78rem', color: theme.subText }}>
                Equipment checked out by {cutterName}
              </span>
            </div>
            <Link
              to="/treecutter/property-inventory"
              style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '6px 12px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 800, textDecoration: 'none' }}
            >
              View Inventory
            </Link>
          </div>

          <div style={{ flex: 1, maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {borrowedInventory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: theme.subText }}>
                <Package size={40} style={{ opacity: 0.3, marginBottom: '8px' }} />
                <h4 style={{ margin: 0, color: theme.title }}>No Borrowed Equipment</h4>
                <p style={{ margin: '4px 0 0', fontSize: '0.84rem' }}>
                  You currently have no checked-out tools from municipal inventory.
                </p>
              </div>
            ) : (
              borrowedInventory.map(({ property, req, checkoutDate }, idx) => (
                <div
                  key={req._id || idx}
                  style={{
                    background: theme.elevatedBg, border: `1px solid ${theme.border}`,
                    borderRadius: '14px', padding: '14px 16px', display: 'flex',
                    justifyContent: 'space-between', alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: theme.title }}>
                      🛠️ {property.name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: theme.subText, marginTop: '2px' }}>
                      Category: {property.category || 'Tool'} • Checked out: {checkoutDate}
                    </div>
                  </div>

                  <span style={{
                    background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800
                  }}>
                    1 Unit (In Use)
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* 4. Tab Bar: Work Orders | Tree Care Duties */}
      <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '16px', padding: '6px', display: 'flex', gap: '4px' }}>
        {[
          { id: 'work-orders', label: '📋 Work Orders & Cutting Tasks', count: myAssignedTasks.length },
          { id: 'tree-duties', label: '🌿 Tree Care Duties', count: duties.length, highlight: true },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: '12px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer',
              background: activeTab === tab.id ? (tab.highlight ? 'linear-gradient(135deg, #059669, #047857)' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)') : 'transparent',
              color: activeTab === tab.id ? '#ffffff' : theme.subText,
              fontWeight: 800, fontSize: '0.9rem', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            {tab.label}
            <span style={{ background: activeTab === tab.id ? 'rgba(255,255,255,0.25)' : 'rgba(148,163,184,0.15)', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem' }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* 4. Work Order Tasks Table (shown when work-orders tab active) */}
      {activeTab === 'work-orders' && <div style={{
        background: theme.cardBg, border: `1px solid ${theme.border}`,
        borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, color: theme.title, fontSize: '1.2rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={20} color="#10b981" /> Assigned Work Orders & Cutting Tasks
            </h3>
            <span style={{ fontSize: '0.8rem', color: theme.subText }}>
              Manage tree pruning, hazard removal, and emergency clearance work for {cutterName}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: theme.elevatedBg, border: `1px solid ${theme.border}`, padding: '6px 12px', borderRadius: '10px' }}>
              <Search size={15} color={theme.subText} />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', color: theme.title, fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '4px', background: theme.elevatedBg, padding: '4px', borderRadius: '10px', border: `1px solid ${theme.border}` }}>
              {['all', 'pending', 'completed', 'high'].map(st => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  style={{
                    background: filterStatus === st ? '#10b981' : 'transparent',
                    color: filterStatus === st ? '#ffffff' : theme.subText,
                    border: 'none', borderRadius: '8px', padding: '6px 12px',
                    fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${theme.border}`, textAlign: 'left', color: theme.subText }}>
                <th style={{ padding: '12px' }}>Work Order ID</th>
                <th style={{ padding: '12px' }}>Tree Issue / Species</th>
                <th style={{ padding: '12px' }}>Location / Ward</th>
                <th style={{ padding: '12px' }}>Priority</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: theme.subText }}>
                    Loading assigned tasks...
                  </td>
                </tr>
              ) : filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: theme.subText }}>
                    {myAssignedTasks.length === 0
                      ? `No work order tasks currently assigned to ${cutterName}.`
                      : 'No work order tasks found for this filter.'}
                  </td>
                </tr>
              ) : (
                filteredTasks.map(t => {
                  const info = getStageInfo(t.status);
                  const isDone = ['Work Completed', 'Waste Disposed', 'Completed', 'Resolved', 'Closed'].includes(t.status);
                  const isHigh = t.priority === 'High';
                  const taskId = t._id || t.id;

                  return (
                    <tr key={taskId} style={{ borderBottom: `1px solid ${theme.border}` }}>
                      <td style={{ padding: '12px', fontWeight: 800, color: theme.title }}>
                        #{String(taskId).slice(-6).toUpperCase()}
                      </td>
                      <td style={{ padding: '12px', fontWeight: 700, color: theme.title }}>
                        {t.title || t.treeSpecies || t.issueType || 'Tree Cutting Task'}
                      </td>
                      <td style={{ padding: '12px', color: theme.subText }}>
                        📍 {t.location || t.ward || 'Central Ward 4'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          background: isHigh ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: isHigh ? '#f87171' : '#f59e0b',
                          border: isHigh ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                          padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800
                        }}>
                          {t.priority || 'Medium'}
                        </span>
                      </td>

                      {/* CLEAN STATUS BADGE */}
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          background: info.bg,
                          color: info.color,
                          border: `1px solid ${info.border}`,
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          display: 'inline-block'
                        }}>
                          {t.status || 'Scheduled'}
                        </span>
                      </td>

                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          
                          {/* STEP ACTION BUTTON */}
                          {!isDone && (
                            <button
                              onClick={() => handleUpdateStatus(taskId, info.nextStatus || 'Completed')}
                              style={{
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#34d399',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                borderRadius: '8px',
                                padding: '6px 10px',
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title={`Mark task as ${info.nextStatus || 'Completed'}`}
                            >
                              ✓ Complete
                            </button>
                          )}

                          {/* SEPARATE BUTTON 1: CHAT SUPPORT */}
                          <Link
                            to="/treecutter/communication"
                            style={{
                              background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)',
                              borderRadius: '8px', padding: '6px 10px', fontSize: '0.78rem', fontWeight: 800, textDecoration: 'none',
                              display: 'inline-flex', alignItems: 'center', gap: '4px'
                            }}
                            title="Chat with Official or Admin regarding this task"
                          >
                            <MessageSquare size={14} /> Chat
                          </Link>

                          {/* SEPARATE BUTTON 2: LIVE NAVIGATION MODAL */}
                          <button
                            type="button"
                            onClick={() => setNavModalTask(t)}
                            style={{
                              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                              color: '#ffffff', border: 'none', borderRadius: '8px',
                              padding: '6px 12px', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer',
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
                            }}
                            title="Open Leaflet Live GPS Navigation from your location to this site"
                          >
                            <Compass size={14} /> Live Navigate
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>}

      {/* 5. Tree Care Duties Section (shown when tree-duties tab active) */}
      {activeTab === 'tree-duties' && <div style={{
        background: theme.cardBg, border: `1px solid ${theme.border}`,
        borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px'
      }}>
        <TreeDutyPanel
          cutterId={cutterId}
          cutterName={cutterName}
          theme={theme}
          darkMode={darkMode}
          onNavigate={(task) => setNavModalTask(task)}
        />
      </div>}

      {/* 6. Separate Live Navigation Modal Component */}
      {navModalTask && (
        <TreeCutterNavigationModal
          activeTask={navModalTask}
          onClose={() => setNavModalTask(null)}
          theme={theme}
          darkMode={darkMode}
        />
      )}

    </div>
  );
}
