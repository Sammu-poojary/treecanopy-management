import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Crosshair, X, Check, Search, Compass, Layers, Globe, Navigation, Loader2, Building, RefreshCw } from 'lucide-react';

// Custom Leaflet marker icon for tree selection
const treeLocationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to handle map clicks & position updates
function LocationMarker({ position, setPosition, accuracyRadius, onLocationChange }) {
  useMapEvents({
    click(e) {
      const newPos = {
        lat: parseFloat(e.latlng.lat.toFixed(6)),
        lng: parseFloat(e.latlng.lng.toFixed(6))
      };
      setPosition(newPos);
      if (onLocationChange) onLocationChange(newPos.lat, newPos.lng);
    },
  });

  const markerRef = useRef(null);

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker != null) {
        const latlng = marker.getLatLng();
        const newPos = {
          lat: parseFloat(latlng.lat.toFixed(6)),
          lng: parseFloat(latlng.lng.toFixed(6))
        };
        setPosition(newPos);
        if (onLocationChange) onLocationChange(newPos.lat, newPos.lng);
      }
    },
  };

  return position ? (
    <>
      {accuracyRadius ? (
        <Circle
          center={[position.lat, position.lng]}
          radius={accuracyRadius}
          pathOptions={{ color: '#059669', fillColor: '#10b981', fillOpacity: 0.18, weight: 1.5, dashArray: '4, 4' }}
        />
      ) : (
        <Circle
          center={[position.lat, position.lng]}
          radius={20}
          pathOptions={{ color: '#059669', fillColor: '#10b981', fillOpacity: 0.25, weight: 2 }}
        />
      )}
      <Marker
        draggable={true}
        eventHandlers={eventHandlers}
        position={[position.lat, position.lng]}
        ref={markerRef}
        icon={treeLocationIcon}
      >
        <Popup>
          <div style={{ padding: '4px', fontSize: '0.85rem' }}>
            <strong style={{ color: '#065f46', display: 'block', marginBottom: '2px' }}>🌳 Selected Tree Location</strong>
            <span style={{ color: '#334155', fontSize: '0.78rem' }}>
              Lat: {position.lat.toFixed(6)}<br />
              Lng: {position.lng.toFixed(6)}
            </span>
            <div style={{ marginTop: '4px', fontSize: '0.7rem', color: '#059669', fontWeight: 600 }}>
              Drag pin or click map to move
            </div>
          </div>
        </Popup>
      </Marker>
    </>
  ) : null;
}

// Helper to smoothly pan/zoom to new coordinates
function MapRecenter({ coords, zoom = 15 }) {
  const map = useMap();
  useEffect(() => {
    if (coords && coords.lat && coords.lng) {
      map.flyTo([coords.lat, coords.lng], Math.max(map.getZoom(), zoom), { duration: 0.8 });
    }
  }, [coords, zoom, map]);
  return null;
}

export const UDUPI_PRESETS = [
  { name: 'Udupi Center', lat: 13.3409, lng: 74.7421, icon: '🏛️', address: 'Town Center, Udupi' },
  { name: 'Manipal Campus', lat: 13.3525, lng: 74.7928, icon: '🏫', address: 'Manipal Academy Campus, Udupi' },
  { name: 'Ajjarkadu Park', lat: 13.3361, lng: 74.7486, icon: '🌳', address: 'Ajjarkadu Children Park, Udupi' },
  { name: 'Malpe Beach / Harbor', lat: 13.3582, lng: 74.7042, icon: '🏖️', address: 'Malpe Beach Road, Udupi' },
  { name: 'Santekatte', lat: 13.3768, lng: 74.7397, icon: '🏢', address: 'Santekatte Junction, Udupi' },
  { name: 'Kaup Lighthouse', lat: 13.2241, lng: 74.7363, icon: '🌴', address: 'Kaup Beach & Lighthouse, Udupi' },
  { name: 'Brahmavar', lat: 13.4350, lng: 74.7500, icon: '📍', address: 'Brahmavar Town, Udupi' },
  { name: 'Padubidri', lat: 13.1412, lng: 74.7801, icon: '🌊', address: 'Padubidri End Point, Udupi' }
];

/**
 * Real Live Reverse Geocoding with POI & Landmark Priority
 * Accurately detects campus names, colleges, parks, hospitals, institutions & street addresses
 */
export const fetchRealLiveLocationName = async (lat, lng) => {
  if (!lat || !lng) return 'Udupi, Karnataka';

  // 1. High-Priority: Check for specific POI / Institution / College / School / Park / Hospital at coordinates
  try {
    const poiRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&layer=poi`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'TreeCanopy-GIS-App/2.0'
        }
      }
    );
    if (poiRes.ok) {
      const poiData = await poiRes.json();
      if (poiData && poiData.name) {
        const city = poiData.address?.city || poiData.address?.town || poiData.address?.municipality || poiData.address?.county || 'Udupi';
        const sub = poiData.address?.suburb || poiData.address?.neighbourhood || '';
        const placeName = poiData.name;
        if (sub && sub.toLowerCase() !== placeName.toLowerCase() && sub.toLowerCase() !== city.toLowerCase()) {
          return `${placeName}, ${sub}, ${city}`;
        }
        return `${placeName}, ${city}`;
      }
    }
  } catch (err) {
    console.warn('POI reverse geocode error:', err);
  }

  // 2. Secondary: Detailed OpenStreetMap Nominatim Standard Reverse Geocoding
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'TreeCanopy-GIS-App/2.0'
        }
      }
    );
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};

      const specificPlace =
        addr.amenity ||
        addr.building ||
        addr.leisure ||
        addr.road ||
        addr.suburb ||
        addr.neighbourhood ||
        addr.residential ||
        addr.village ||
        addr.hamlet;

      const city = addr.city || addr.town || addr.municipality || addr.county || 'Udupi';
      const postcode = addr.postcode ? ` - ${addr.postcode}` : '';

      if (specificPlace && city) {
        if (specificPlace.toLowerCase() === city.toLowerCase()) {
          return `${city}, Karnataka${postcode}`;
        }
        return `${specificPlace}, ${city}${postcode}`;
      }

      if (data.display_name) {
        const parts = data.display_name.split(',').map((s) => s.trim()).filter(Boolean);
        return parts.slice(0, 3).join(', ');
      }
    }
  } catch (err) {
    console.warn('Nominatim standard reverse geocode error:', err);
  }

  // 3. Tertiary: BigDataCloud Reverse Geocode API Fallback
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    );
    if (res.ok) {
      const data = await res.json();
      const loc = data.locality || data.city || data.principalSubdivision || 'Udupi';
      return `${loc}, ${data.principalSubdivision || 'Karnataka'}`;
    }
  } catch (err) {
    console.warn('BigDataCloud reverse geocode error:', err);
  }

  return `Location: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
};

export const reverseGeocodeUdupi = fetchRealLiveLocationName;

export default function TreeLocationPickerModal({
  isOpen,
  onClose,
  initialLat = 13.3409,
  initialLng = 74.7421,
  initialLocationName = '',
  treeName = '',
  onSelectLocation
}) {
  const [coords, setCoords] = useState({
    lat: parseFloat(initialLat) || 13.3409,
    lng: parseFloat(initialLng) || 74.7421
  });
  const [locationName, setLocationName] = useState(initialLocationName || '');
  const [resolvingName, setResolvingName] = useState(false);
  const [mapType, setMapType] = useState('street');
  const [geoLocating, setGeoLocating] = useState(false);
  const [geoSuccessMsg, setGeoSuccessMsg] = useState('');
  const [geoError, setGeoError] = useState('');
  const [accuracyRadius, setAccuracyRadius] = useState(null);

  const updateLocationNameForCoords = async (lat, lng) => {
    setResolvingName(true);
    try {
      const name = await fetchRealLiveLocationName(lat, lng);
      setLocationName(name);
    } catch {
      // keep current
    } finally {
      setResolvingName(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const startLat = parseFloat(initialLat) || 13.3409;
      const startLng = parseFloat(initialLng) || 74.7421;
      setCoords({ lat: startLat, lng: startLng });
      if (initialLocationName) {
        setLocationName(initialLocationName);
      } else {
        updateLocationNameForCoords(startLat, startLng);
      }
      setGeoError('');
      setGeoSuccessMsg('');
      setAccuracyRadius(null);
    }
  }, [isOpen, initialLat, initialLng, initialLocationName]);

  if (!isOpen) return null;

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }
    setGeoLocating(true);
    setGeoError('');
    setGeoSuccessMsg('');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const newLat = parseFloat(position.coords.latitude.toFixed(6));
        const newLng = parseFloat(position.coords.longitude.toFixed(6));
        const acc = Math.round(position.coords.accuracy || 15);
        setCoords({ lat: newLat, lng: newLng });
        setAccuracyRadius(acc);
        setGeoLocating(false);
        setGeoSuccessMsg(`📍 Live GPS fetched: ${newLat}, ${newLng} (Accuracy ±${acc}m)`);
        await updateLocationNameForCoords(newLat, newLng);
        setTimeout(() => setGeoSuccessMsg(''), 6000);
      },
      (err) => {
        setGeoLocating(false);
        let msg = err.message;
        if (err.code === 1) msg = 'Location permission was denied. Please allow location access in browser.';
        else if (err.code === 2) msg = 'Location position unavailable. Please check GPS settings.';
        else if (err.code === 3) msg = 'Location request timed out.';
        setGeoError('Unable to fetch live location: ' + msg);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const handlePresetClick = (preset) => {
    setCoords({ lat: preset.lat, lng: preset.lng });
    setLocationName(preset.address);
    setAccuracyRadius(null);
  };

  const handleConfirm = () => {
    if (onSelectLocation) {
      onSelectLocation({
        lat: coords.lat,
        lng: coords.lng,
        locationName: locationName || `Location (${coords.lat}, ${coords.lng})`
      });
    }
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(5, 20, 15, 0.78)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '900px',
          background: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '94vh',
          border: '1px solid #cbd5e1'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
            color: '#ffffff'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <MapPin size={20} color="#a7f3d0" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>
                Leaflet Geolocation & Landmark Picker
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#a7f3d0', opacity: 0.9 }}>
                {treeName ? `Set location for "${treeName}"` : 'Select place on map, choose a preset, or fetch live GPS'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '8px',
              padding: '6px',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Top Control Bar with Live GPS & Map Type */}
        <div
          style={{
            padding: '10px 16px',
            background: '#ecfdf5',
            borderBottom: '1px solid #a7f3d0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={geoLocating}
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                border: 'none',
                color: '#ffffff',
                padding: '7px 16px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: geoLocating ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 6px rgba(5,150,105,0.3)',
                transition: 'all 0.15s'
              }}
            >
              {geoLocating ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>📡 Fetching GPS Location...</span>
                </>
              ) : (
                <>
                  <Crosshair size={16} />
                  <span>📍 Fetch & Pin Current Location</span>
                </>
              )}
            </button>
            <span style={{ fontSize: '0.78rem', color: '#065f46', fontWeight: 600 }}>
              Auto-detects GPS and fetches real live address
            </span>
          </div>

          <div style={{ display: 'flex', gap: '4px', background: '#ffffff', padding: '2px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
            <button
              type="button"
              onClick={() => setMapType('street')}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                border: 'none',
                background: mapType === 'street' ? '#059669' : 'transparent',
                color: mapType === 'street' ? '#ffffff' : '#475569',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              🗺️ Street
            </button>
            <button
              type="button"
              onClick={() => setMapType('satellite')}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                border: 'none',
                background: mapType === 'satellite' ? '#059669' : 'transparent',
                color: mapType === 'satellite' ? '#ffffff' : '#475569',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              🛰️ Satellite
            </button>
          </div>
        </div>

        {/* Quick Landmarks Bar */}
        <div
          style={{
            padding: '8px 16px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
            whiteSpace: 'nowrap'
          }}
        >
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>
            Landmark Presets:
          </span>
          {UDUPI_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => handlePresetClick(preset)}
              style={{
                background: coords.lat === preset.lat && coords.lng === preset.lng ? '#d1fae5' : '#ffffff',
                border: `1px solid ${coords.lat === preset.lat && coords.lng === preset.lng ? '#10b981' : '#cbd5e1'}`,
                color: coords.lat === preset.lat && coords.lng === preset.lng ? '#065f46' : '#334155',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '0.73rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                flexShrink: 0,
                transition: 'all 0.15s'
              }}
            >
              <span>{preset.icon}</span>
              <span>{preset.name}</span>
            </button>
          ))}
        </div>

        {/* Success / Error notification */}
        {geoSuccessMsg && (
          <div style={{ padding: '6px 16px', background: '#d1fae5', color: '#065f46', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Check size={14} color="#059669" /> {geoSuccessMsg}
          </div>
        )}
        {geoError && (
          <div style={{ padding: '6px 16px', background: '#fee2e2', color: '#991b1b', fontSize: '0.78rem', fontWeight: 600 }}>
            ⚠️ {geoError}
          </div>
        )}

        {/* Leaflet Map Body */}
        <div style={{ height: '350px', width: '100%', position: 'relative' }}>
          <MapContainer
            center={[coords.lat, coords.lng]}
            zoom={14}
            style={{ height: '100%', width: '100%' }}
          >
            <MapRecenter coords={coords} zoom={accuracyRadius ? 16 : 14} />
            {mapType === 'satellite' ? (
              <TileLayer
                attribution='Tiles &copy; Esri &mdash; Source: Esri'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
            ) : (
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            )}
            <LocationMarker
              position={coords}
              setPosition={setCoords}
              accuracyRadius={accuracyRadius}
              onLocationChange={(lat, lng) => updateLocationNameForCoords(lat, lng)}
            />
          </MapContainer>

          {/* Floating GPS button on map canvas */}
          <button
            type="button"
            onClick={handleGetCurrentLocation}
            disabled={geoLocating}
            title="Fetch Current Location"
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              zIndex: 999,
              background: '#ffffff',
              border: '2px solid #059669',
              borderRadius: '50%',
              width: '42px',
              height: '42px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: geoLocating ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
              color: '#059669',
              transition: 'transform 0.15s, background 0.15s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.08)';
              e.currentTarget.style.background = '#ecfdf5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.background = '#ffffff';
            }}
          >
            <Crosshair size={22} className={geoLocating ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Footer Unified Input Row: Location Name + Lat + Lng */}
        <div
          style={{
            padding: '14px 20px',
            background: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', alignItems: 'flex-end' }}>
            {/* Location / Landmark Name Input */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Building size={13} color="#059669" /> Live Address / Landmark Name (Real Data)
                </span>
                {resolvingName && (
                  <span style={{ color: '#059669', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <RefreshCw size={11} className="animate-spin" /> Fetching live address...
                  </span>
                )}
              </label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Brahmagiri, Udupi"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#1e293b',
                  background: '#f8fafc'
                }}
              />
            </div>

            {/* Latitude */}
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                Latitude (°N)
              </label>
              <input
                type="number"
                step="0.000001"
                value={coords.lat}
                onChange={(e) => setCoords({ ...coords, lat: parseFloat(e.target.value) || 0 })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#1e293b'
                }}
              />
            </div>

            {/* Longitude */}
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                Longitude (°E)
              </label>
              <input
                type="number"
                step="0.000001"
                value={coords.lng}
                onChange={(e) => setCoords({ ...coords, lng: parseFloat(e.target.value) || 0 })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#1e293b'
                }}
              />
            </div>
          </div>

          {/* Bottom Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
            <div
              style={{
                padding: '6px 12px',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '8px',
                color: '#065f46',
                fontSize: '0.78rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <MapPin size={14} /> {locationName || 'Live Location'} · {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                style={{
                  padding: '8px 22px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 10px rgba(5,150,105,0.3)'
                }}
              >
                <Check size={16} /> Confirm & Apply Location
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
