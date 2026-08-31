import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import {
  Search,
  Umbrella,
  Wind,
  Sprout,
  Bird,
  Leaf,
  Activity,
  Droplet,
  CalendarDays,
  ShieldAlert,
  Bug,
  Ban,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  MapPin,
  School,
  Building2,
  Trees,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { Sidebar, Topbar } from './CanopyPages';

// Setup Leaflet icon markers correctly
const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const orangeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function TreeEncyclopediaPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [trees, setTrees] = useState([]);
  const [selectedTree, setSelectedTree] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all'); // 'all' | 'park' | 'hospital' | 'school'
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('standard'); // 'standard' | 'satellite'

  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/api/trees`)
      .then(res => res.json())
      .then(data => {
        setTrees(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching trees in Encyclopedia:', err);
        setLoading(false);
      });
  }, []);

  // Filter Udupi trees
  const udupiTrees = useMemo(() => {
    return trees.filter(tree => 
      (tree.origin && tree.origin.toLowerCase().includes('udupi')) ||
      (tree.notes && tree.notes.toLowerCase().includes('udupi')) ||
      (tree.description && tree.description.toLowerCase().includes('udupi'))
    );
  }, [trees]);

  // Categorize and Search
  const filteredTrees = useMemo(() => {
    return udupiTrees.filter(tree => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        (tree.name || '').toLowerCase().includes(q) ||
        (tree.scientificName || '').toLowerCase().includes(q) ||
        (tree.family || '').toLowerCase().includes(q) ||
        (tree.origin || '').toLowerCase().includes(q);

      let matchesCategory = true;
      const targetText = `${tree.origin || ''} ${tree.notes || ''} ${tree.description || ''} ${tree.category || ''}`.toLowerCase();
      
      if (activeCategory === 'park') {
        matchesCategory = targetText.includes('park') || targetText.includes('promenade') || targetText.includes('stadium');
      } else if (activeCategory === 'hospital') {
        matchesCategory = targetText.includes('hospital') || targetText.includes('clinical') || targetText.includes('medical') || targetText.includes('garden');
      } else if (activeCategory === 'school') {
        matchesCategory = targetText.includes('school') || targetText.includes('college') || targetText.includes('academy') || targetText.includes('scholastic');
      }

      return matchesSearch && matchesCategory;
    });
  }, [udupiTrees, searchQuery, activeCategory]);

  // Compute statistic counts
  const stats = useMemo(() => {
    const total = udupiTrees.length;
    const parksCount = udupiTrees.filter(t => {
      const txt = `${t.origin || ''} ${t.notes || ''} ${t.description || ''} ${t.category || ''}`.toLowerCase();
      return txt.includes('park') || txt.includes('promenade') || txt.includes('stadium');
    }).length;
    
    const hospitalsCount = udupiTrees.filter(t => {
      const txt = `${t.origin || ''} ${t.notes || ''} ${t.description || ''} ${t.category || ''}`.toLowerCase();
      return txt.includes('hospital') || txt.includes('clinical') || txt.includes('medical') || txt.includes('garden');
    }).length;
    
    const schoolsCount = udupiTrees.filter(t => {
      const txt = `${t.origin || ''} ${t.notes || ''} ${t.description || ''} ${t.category || ''}`.toLowerCase();
      return txt.includes('school') || txt.includes('college') || txt.includes('academy') || txt.includes('scholastic');
    }).length;

    return { total, parksCount, hospitalsCount, schoolsCount };
  }, [udupiTrees]);

  const getMarkerIcon = (score) => {
    const hs = score ?? 90;
    if (hs >= 90) return greenIcon;
    if (hs >= 75) return orangeIcon;
    return redIcon;
  };

  const getHealthColor = (score) => {
    if (score >= 85) return '#10b981'; // green
    if (score >= 70) return '#f59e0b'; // orange/yellow
    return '#ef4444'; // red
  };

  const getHealthLabel = (score) => {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    return 'Critical';
  };

  const getBenefitIcon = (benefit = '') => {
    const text = benefit.toLowerCase();
    if (text.includes('shade') || text.includes('cooling') || text.includes('cool') || text.includes('temperature')) return <Umbrella size={16} />;
    if (text.includes('air') || text.includes('oxygen') || text.includes('purif') || text.includes('pollut')) return <Wind size={16} />;
    if (text.includes('soil') || text.includes('erosion') || text.includes('root')) return <Sprout size={16} />;
    if (text.includes('bird') || text.includes('bee') || text.includes('pollinator') || text.includes('wildlife') || text.includes('nesting')) return <Bird size={16} />;
    return <Leaf size={16} />;
  };

  return (
    <div className="cg-app cg-dashboard-screen">
      <Sidebar active="Tree Encyclopedia" isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
      <div className="cg-workspace">
        <Topbar title="Udupi Landmark Tree Encyclopedia" onToggleSidebar={() => setSidebarOpen(true)} />
        
        <main className="cg-page" style={{ padding: '24px clamp(16px, 2vw, 32px)', maxWidth: '1400px', margin: '0 auto' }}>
          
          {/* Back button link if tree selected */}
          {selectedTree && (
            <button
              onClick={() => setSelectedTree(null)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: 'none', border: '1px solid #d1d5db', borderRadius: '8px',
                padding: '8px 16px', cursor: 'pointer', color: '#374151',
                fontWeight: 600, fontSize: '0.875rem', marginBottom: '20px',
                transition: 'all 0.2s', alignSelf: 'flex-start'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f3f4f6'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
            >
              <ChevronLeft size={18} /> Back to Catalog
            </button>
          )}

          {/* Selected Tree Detailed View */}
          {selectedTree ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Header Hero Banner */}
              <div style={{
                background: 'linear-gradient(135deg, #022319 0%, #054f3a 50%, #036b4e 100%)',
                borderRadius: '20px', padding: '32px', color: '#ffffff',
                display: 'flex', gap: '28px', alignItems: 'center', flexWrap: 'wrap',
                boxShadow: '0 10px 30px rgba(2,35,25,0.2)'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                  <div style={{
                    width: '180px', height: '180px', borderRadius: '16px',
                    overflow: 'hidden', background: 'rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, border: '2px solid rgba(255,255,255,0.2)',
                    position: 'relative'
                  }}>
                    {viewMode === 'satellite' ? (
                      <div style={{ width: '100%', height: '100%', pointerEvents: 'none' }}>
                        <MapContainer center={[selectedTree.lat || 13.3409, selectedTree.lng || 74.7421]} zoom={19} zoomControl={false} dragging={false} scrollWheelZoom={false} doubleClickZoom={false} style={{ height: '100%', width: '100%' }}>
                          <TileLayer
                            attribution='Esri'
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                          />
                          <Marker position={[selectedTree.lat || 13.3409, selectedTree.lng || 74.7421]} icon={greenIcon} />
                        </MapContainer>
                      </div>
                    ) : selectedTree.image ? (
                      <img src={selectedTree.image} alt={selectedTree.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Trees size={64} style={{ color: 'rgba(255,255,255,0.6)' }} />
                    )}
                  </div>
                  <button
                    onClick={() => setViewMode(viewMode === 'standard' ? 'satellite' : 'standard')}
                    style={{
                      background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
                      borderRadius: '20px', padding: '4px 10px', color: '#ffffff', fontSize: '0.75rem',
                      fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', marginTop: '2px'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                  >
                    {viewMode === 'standard' ? '🛰️ Satellite Crop' : '🖼️ Photo View'}
                  </button>
                </div>

                <div style={{ flex: 1, minWidth: '280px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800 }}>{selectedTree.name}</h1>
                    <span style={{
                      background: getHealthColor(selectedTree.healthScore),
                      color: '#ffffff', borderRadius: '20px', padding: '4px 14px',
                      fontWeight: 700, fontSize: '0.8rem', whiteSpace: 'nowrap',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                    }}>
                      Health Index: {selectedTree.healthScore ?? 90}% ({getHealthLabel(selectedTree.healthScore)})
                    </span>
                  </div>
                  <p style={{ margin: '0 0 16px', fontStyle: 'italic', color: 'rgba(255,255,255,0.8)', fontSize: '1.1rem' }}>
                    {selectedTree.scientificName} · {selectedTree.family} Family
                  </p>
                  
                  {/* Proximity Location Pin */}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.15)', padding: '6px 14px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.25)', fontSize: '0.9rem' }}>
                    <MapPin size={16} />
                    <span>Location: <strong>{selectedTree.origin}</strong></span>
                  </div>
                </div>
              </div>

              {/* Layout Content: Map on Right, Details on Left */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
                
                {/* Left Side: Botanical specs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* About Card */}
                  <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#065f46', fontWeight: 700 }}>
                      <BookOpen size={20} /> Botanical Profile
                    </h3>
                    <p style={{ margin: '0 0 16px', color: '#475569', lineHeight: 1.6 }}>{selectedTree.description}</p>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.9rem' }}>
                      <div style={{ borderLeft: '3px solid #059669', paddingLeft: '10px' }}>
                        <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>SPECIES CATEGORY</span>
                        <strong style={{ color: '#1e293b' }}>{selectedTree.category || 'N/A'}</strong>
                      </div>
                      <div style={{ borderLeft: '3px solid #059669', paddingLeft: '10px' }}>
                        <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>LIFESPAN PROJECTION</span>
                        <strong style={{ color: '#1e293b' }}>{selectedTree.lifespan || 'N/A'}</strong>
                      </div>
                      <div style={{ borderLeft: '3px solid #059669', paddingLeft: '10px' }}>
                        <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>ESTIMATED AGE</span>
                        <strong style={{ color: '#1e293b' }}>{selectedTree.ageRange || 'N/A'}</strong>
                      </div>
                      <div style={{ borderLeft: '3px solid #059669', paddingLeft: '10px' }}>
                        <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>CANOPY SPREAD</span>
                        <strong style={{ color: '#1e293b' }}>{selectedTree.canopySpread || 'N/A'} (Coverage: {selectedTree.canopyCoverage}%)</strong>
                      </div>
                    </div>
                  </div>

                  {/* Growth Metrics */}
                  <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#065f46', fontWeight: 700 }}>
                      <Sprout size={20} /> Growth & Environmental Requirements
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '14px', fontSize: '0.85rem' }}>
                      <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                        <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem', fontWeight: 600 }}>CLIMATE</span>
                        <strong style={{ color: '#1e293b' }}>{selectedTree.climate || 'Tropical'}</strong>
                      </div>
                      <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                        <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem', fontWeight: 600 }}>SOIL PREFERENCE</span>
                        <strong style={{ color: '#1e293b' }}>{selectedTree.soilType || 'Well-drained'}</strong>
                      </div>
                      <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                        <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem', fontWeight: 600 }}>SUNLIGHT</span>
                        <strong style={{ color: '#1e293b' }}>{selectedTree.sunlight || 'Full Sun'}</strong>
                      </div>
                      <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                        <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem', fontWeight: 600 }}>GROWTH RATE</span>
                        <strong style={{ color: '#1e293b' }}>{selectedTree.growthRate || 'Moderate'}</strong>
                      </div>
                      <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                        <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem', fontWeight: 600 }}>FLOWERING</span>
                        <strong style={{ color: '#1e293b' }}>{selectedTree.floweringSeason || 'Seasonal'}</strong>
                      </div>
                      <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                        <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem', fontWeight: 600 }}>FRUITING</span>
                        <strong style={{ color: '#1e293b' }}>{selectedTree.fruitingSeason || 'Seasonal'}</strong>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Right Side: Map location & Benefits */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Map Pinpoint */}
                  <div style={{ background: '#ffffff', borderRadius: '16px', padding: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={18} color="#ef4444" /> Tree Location Map (Udupi Grid)
                    </div>
                    <div style={{ height: '220px', width: '100%', borderRadius: '10px', overflow: 'hidden', zIndex: 1 }}>
                      <MapContainer center={[selectedTree.lat || 13.3409, selectedTree.lng || 74.7421]} zoom={15} style={{ height: '100%', width: '100%' }}>
                        {viewMode === 'satellite' ? (
                          <TileLayer
                            attribution='Tiles &copy; Esri &mdash; Source: Esri'
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                          />
                        ) : (
                          <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          />
                        )}
                        <Marker position={[selectedTree.lat || 13.3409, selectedTree.lng || 74.7421]} icon={getMarkerIcon(selectedTree.healthScore)}>
                          <Popup>
                            <strong>{selectedTree.name}</strong><br />
                            {selectedTree.origin}
                          </Popup>
                        </Marker>
                      </MapContainer>
                    </div>
                  </div>

                  {/* Ecological Values */}
                  <div style={{ background: '#f0fdf4', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(4,80,60,0.04)', border: '1px solid #bbf7d0' }}>
                    <h3 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: 700 }}>
                      <Leaf size={20} /> Ecological & Practical Benefits
                    </h3>
                    <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {Array.isArray(selectedTree.benefits) && selectedTree.benefits.length > 0 ? (
                        selectedTree.benefits.map((b, idx) => (
                          <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: '#14532d' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#dcfce7', width: '28px', height: '28px', borderRadius: '50%', color: '#15803d', flexShrink: 0 }}>
                              {getBenefitIcon(b)}
                            </div>
                            <span>{b}</span>
                          </li>
                        ))
                      ) : (
                        <li style={{ color: '#15803d', fontSize: '0.9rem', fontStyle: 'italic' }}>Provides ecosystem stabilization and microclimate cooling.</li>
                      )}
                    </ul>

                    {/* CO2 Sequestration Stat */}
                    <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '10px', background: '#dcfce7', padding: '10px 14px', borderRadius: '10px', border: '1.5px dashed #86efac' }}>
                      <Activity size={18} color="#15803d" />
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>Carbon Sequestration Volume</div>
                        <div style={{ fontWeight: 800, color: '#14532d', fontSize: '1.05rem' }}>{selectedTree.carbonSequestration || 'High Sequestration Capacity'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Diseases and Pests */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '12px', padding: '16px' }}>
                      <h4 style={{ margin: '0 0 10px', color: '#92400e', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ShieldAlert size={16} /> Susceptibilities
                      </h4>
                      <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', color: '#78350f' }}>
                        {Array.isArray(selectedTree.diseases) && selectedTree.diseases.length > 0 ? (
                          selectedTree.diseases.map((d, i) => (
                            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <AlertTriangle size={12} /> {d}
                            </li>
                          ))
                        ) : (
                          <li>None reported</li>
                        )}
                      </ul>
                    </div>

                    <div style={{ background: '#fff1f2', border: '1px solid #ffe4e6', borderRadius: '12px', padding: '16px' }}>
                      <h4 style={{ margin: '0 0 10px', color: '#9f1239', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Bug size={16} /> Associated Pests
                      </h4>
                      <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', color: '#881337' }}>
                        {Array.isArray(selectedTree.pests) && selectedTree.pests.length > 0 ? (
                          selectedTree.pests.map((p, i) => (
                            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Ban size={12} /> {p}
                            </li>
                          ))
                        ) : (
                          <li>None reported</li>
                        )}
                      </ul>
                    </div>
                  </div>

                </div>

              </div>

              {/* Maintenance Notes */}
              <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 10px', color: '#1e293b', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CalendarDays size={18} color="#059669" /> Arborist & Maintenance Log
                </h3>
                <p style={{ margin: 0, color: '#475569', fontSize: '0.9rem', lineHeight: 1.6 }}>{selectedTree.notes || 'No active alerts or notes. Specimen shows normal healthy development in the local ecosystem.'}</p>
              </div>

            </div>
          ) : (
            
            // Database Listing Grid
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              
              {/* Hero Banner Grid */}
              <section style={{
                background: 'linear-gradient(135deg, #022319 0%, #054f3a 50%, #036b4e 100%)',
                borderRadius: '20px', padding: '40px 32px', color: '#ffffff',
                boxShadow: '0 10px 35px rgba(2,35,25,0.18)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px'
              }}>
                <div>
                  <h1 style={{ margin: '0 0 8px', fontSize: '2.2rem', fontWeight: 800 }}>
                    🌿 Udupi Tree Encyclopedia
                  </h1>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: '1.05rem', maxWidth: '600px', lineHeight: 1.5 }}>
                    Study the botanical catalog, local locations, health scores, and ecological contributions of trees surrounding our schools, parks, and hospitals in the Udupi Municipality.
                  </p>
                </div>
                
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '14px', padding: '14px 20px', border: '1px solid rgba(255,255,255,0.2)', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.total}</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.85, fontWeight: 600 }}>Total Udupi Species</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '14px', padding: '14px 20px', border: '1px solid rgba(255,255,255,0.2)', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.parksCount}</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.85, fontWeight: 600 }}>Near Parks</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '14px', padding: '14px 20px', border: '1px solid rgba(255,255,255,0.2)', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.hospitalsCount}</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.85, fontWeight: 600 }}>Near Hospitals</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '14px', padding: '14px 20px', border: '1px solid rgba(255,255,255,0.2)', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.schoolsCount}</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.85, fontWeight: 600 }}>Near Schools</div>
                  </div>
                </div>
              </section>

              {/* Filtering and search row */}
              <div style={{
                display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
                background: '#ffffff', padding: '18px 24px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0'
              }}>
                {/* Search Bar */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 300px', maxWidth: '500px',
                  background: '#f8fafc', borderRadius: '10px', padding: '10px 16px', border: '1.5px solid #cbd5e1'
                }}>
                  <Search size={18} color="#94a3b8" />
                  <input
                    type="text"
                    placeholder="Search by common name, scientific name, or family..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.9rem', color: '#1e293b' }}
                  />
                </div>

                {/* Filter Landmark Buttons */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'all', label: 'All Landmarks', icon: <Trees size={16} /> },
                    { id: 'park', label: 'Near Parks', icon: <MapPin size={16} /> },
                    { id: 'hospital', label: 'Near Hospitals', icon: <Building2 size={16} /> },
                    { id: 'school', label: 'Near Schools', icon: <School size={16} /> }
                  ].map(btn => (
                    <button
                      key={btn.id}
                      onClick={() => setActiveCategory(btn.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 18px', borderRadius: '10px',
                        border: activeCategory === btn.id ? 'none' : '1px solid #cbd5e1',
                        background: activeCategory === btn.id ? '#059669' : '#ffffff',
                        color: activeCategory === btn.id ? '#ffffff' : '#334155',
                        fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s',
                        boxShadow: activeCategory === btn.id ? '0 4px 12px rgba(5,150,105,0.2)' : 'none'
                      }}
                      onMouseEnter={e => {
                        if (activeCategory !== btn.id) { e.currentTarget.style.background = '#f8fafc'; }
                      }}
                      onMouseLeave={e => {
                        if (activeCategory !== btn.id) { e.currentTarget.style.background = '#ffffff'; }
                      }}
                    >
                      {btn.icon}
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Interactive Leaflet Map for Landmarked Trees */}
              <div style={{ background: '#ffffff', borderRadius: '16px', padding: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={20} color="#059669" /> Interactive Geo-Distribution Map (Udupi Region)
                  </div>
                  <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '2px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <button
                      onClick={() => setViewMode('standard')}
                      style={{
                        padding: '4px 10px', borderRadius: '6px', border: 'none',
                        background: viewMode === 'standard' ? '#059669' : 'transparent',
                        color: viewMode === 'standard' ? '#ffffff' : '#475569',
                        fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer'
                      }}
                    >
                      🗺️ Street
                    </button>
                    <button
                      onClick={() => setViewMode('satellite')}
                      style={{
                        padding: '4px 10px', borderRadius: '6px', border: 'none',
                        background: viewMode === 'satellite' ? '#059669' : 'transparent',
                        color: viewMode === 'satellite' ? '#ffffff' : '#475569',
                        fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer'
                      }}
                    >
                      🛰️ Satellite
                    </button>
                  </div>
                </div>
                <div style={{ height: '350px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #cbd5e1', zIndex: 1 }}>
                  <MapContainer center={[13.3409, 74.7421]} zoom={13} style={{ height: '100%', width: '100%' }}>
                    {viewMode === 'satellite' ? (
                      <TileLayer
                        attribution='Tiles &copy; Esri &mdash; Source: Esri'
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                      />
                    ) : (
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                    )}
                    {filteredTrees.map(tree => (
                      <Marker
                        key={tree._id || tree.id}
                        position={[tree.lat || 13.3409, tree.lng || 74.7421]}
                        icon={getMarkerIcon(tree.healthScore)}
                      >
                        <Popup>
                          <div style={{ minWidth: '160px', padding: '4px' }}>
                            <strong style={{ display: 'block', color: '#065f46', fontSize: '0.9rem', marginBottom: '2px' }}>🌳 {tree.name}</strong>
                            <span style={{ fontSize: '0.75rem', fontStyle: 'italic', display: 'block', color: '#64748b', marginBottom: '4px' }}>{tree.scientificName}</span>
                            <span style={{ fontSize: '0.75rem', display: 'block', borderTop: '1px solid #e2e8f0', paddingTop: '4px', color: '#334155' }}>
                              📍 {tree.origin}
                            </span>
                            <button
                              onClick={() => setSelectedTree(tree)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '4px', width: '100%', border: 'none', background: '#059669',
                                color: '#ffffff', borderRadius: '4px', padding: '4px 8px', marginTop: '6px', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600
                              }}
                            >
                              Explore Details <ArrowRight size={10} />
                            </button>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              </div>

              {/* Grid Catalog */}
              {loading ? (
                <div style={{ textAlign: 'center', padding: '80px 0', color: '#64748b' }}>
                  <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '3.5px solid #cbd5e1', borderTopColor: '#059669', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
                  <p style={{ marginTop: '16px', fontWeight: 600, fontSize: '1rem' }}>Loading species database...</p>
                </div>
              ) : filteredTrees.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 20px', background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1' }}>
                  <Trees size={64} style={{ margin: '0 auto 16px', color: '#94a3b8', opacity: 0.6 }} />
                  <h3 style={{ margin: '0 0 8px', color: '#1e293b' }}>No specimens matched</h3>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>No trees match your current search queries or location filters in the Udupi catalog.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                  {filteredTrees.map(tree => {
                    const hs = tree.healthScore ?? 90;
                    
                    return (
                      <article
                        key={tree._id || tree.id}
                        onClick={() => setSelectedTree(tree)}
                        style={{
                          background: '#ffffff', borderRadius: '16px', overflow: 'hidden',
                          boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0',
                          cursor: 'pointer', transition: 'all 0.25s', display: 'flex', flexDirection: 'column'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.transform = 'translateY(-6px)';
                          e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.08)';
                          e.currentTarget.style.borderColor = '#bbf7d0';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.03)';
                          e.currentTarget.style.borderColor = '#e2e8f0';
                        }}
                      >
                        {/* Image Header */}
                        <div style={{ height: '200px', background: '#f1f5f9', position: 'relative' }}>
                          {tree.image ? (
                            <img src={tree.image} alt={tree.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                              <Trees size={48} style={{ opacity: 0.5 }} />
                            </div>
                          )}
                          <span style={{
                            position: 'absolute', top: '12px', right: '12px',
                            background: getHealthColor(hs), color: '#ffffff', borderRadius: '20px',
                            padding: '4px 12px', fontSize: '0.75rem', fontWeight: 700,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                          }}>
                            Health: {hs}%
                          </span>
                        </div>

                        {/* Card Body */}
                        <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <h3 style={{ margin: '0 0 4px', color: '#1e293b', fontSize: '1.2rem', fontWeight: 700 }}>
                            {tree.name}
                          </h3>
                          <span style={{ display: 'block', color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic', marginBottom: '12px' }}>
                            {tree.scientificName}
                          </span>

                          <p style={{ margin: '0 0 16px', color: '#475569', fontSize: '0.85rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '54px', lineHeight: '18px' }}>
                            {tree.description}
                          </p>

                          {/* Quick details */}
                          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '14px', fontSize: '0.8rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
                              <MapPin size={14} color="#059669" />
                              <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tree.origin}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.75rem' }}>
                              <span>Spread: <strong>{tree.canopySpread}</strong></span>
                              <span>Height: <strong>{tree.height}</strong></span>
                            </div>
                          </div>
                        </div>

                      </article>
                    );
                  })}
                </div>
              )}

            </div>
          )}

        </main>
      </div>
    </div>
  );
}
