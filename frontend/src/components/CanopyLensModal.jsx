import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  UploadCloud,
  MapPin,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldCheck,
  HeartHandshake,
  Sprout,
  FileText,
  Lock,
  RefreshCw,
  Search
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function CanopyLensModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [photo, setPhoto] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [location, setLocation] = useState({ lat: 13.3409, lng: 74.7421, text: 'Detecting GPS...' });
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState('');
  const [selectedSpeciesHint, setSelectedSpeciesHint] = useState('');
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [proposalSubmitted, setProposalSubmitted] = useState(false);
  const fileInputRef = useRef(null);

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('currentUser')) || {};
    } catch {
      return {};
    }
  })();

  const udupiLocationPresets = [
    { label: '📍 Central Ajjarkadu Park, Udupi', lat: 13.3412, lng: 74.7415 },
    { label: '📍 KMC Hospital Campus, Manipal', lat: 13.3538, lng: 74.7865 },
    { label: '📍 Udupi Town Centre', lat: 13.3375, lng: 74.7450 },
    { label: '📍 Bhujanga Park, Udupi', lat: 13.3425, lng: 74.7430 },
    { label: '📍 MGM College Campus, Udupi', lat: 13.3518, lng: 74.7612 },
    { label: '📍 Sri Krishna Temple Zone', lat: 13.3450, lng: 74.7380 },
    { label: '📍 Malpe Coast Zone', lat: 13.3560, lng: 74.7020 },
  ];

  const fetchPlaceName = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
        headers: { 'Accept-Language': 'en' }
      });
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const parts = [
          addr.amenity || addr.building || addr.road || addr.suburb || addr.neighbourhood || addr.residential,
          addr.village || addr.town || addr.city || addr.county || 'Udupi',
          addr.state || 'Karnataka'
        ].filter(Boolean);
        if (parts.length > 0) {
          return parts.join(', ');
        }
      }
    } catch (e) {
      console.warn('Reverse geocode failed:', e);
    }
    return null;
  };

  const detectGPS = () => {
    if (navigator.geolocation) {
      setLocation(prev => ({ ...prev, text: 'Fetching place name...' }));
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const place = await fetchPlaceName(lat, lng);
          setLocation({
            lat,
            lng,
            text: place ? `${place} (${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E)` : `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E (Live GPS)`
          });
        },
        (err) => {
          console.warn('Geolocation fallback to Ajjarkadu:', err);
          setLocation({
            lat: 13.3412,
            lng: 74.7415,
            text: 'Ajjarkadu Park, Udupi'
          });
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  useEffect(() => {
    if (isOpen) {
      detectGPS();
    } else {
      setPhoto(null);
      setPhotoFile(null);
      setScanResult(null);
      setScanError('');
      setScanning(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhoto(URL.createObjectURL(file));
      setScanResult(null);
      setScanError('');
    }
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  const handleRunScan = async () => {
    if (!photo && !photoFile) {
      setScanError('Please select or capture a tree image to scan.');
      return;
    }

    setScanning(true);
    setScanError('');
    try {
      let uploadedPhotoUrl = photo;

      if (photoFile) {
        try {
          const uploadForm = new FormData();
          uploadForm.append('image', photoFile);
          const uploadRes = await fetch(`${API_URL}/api/upload`, {
            method: 'POST',
            body: uploadForm
          });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            uploadedPhotoUrl = uploadData.url.startsWith('http')
              ? uploadData.url
              : `${API_URL}${uploadData.url}`;
          } else {
            // Fallback to base64 encoding if upload fails
            uploadedPhotoUrl = await fileToBase64(photoFile);
          }
        } catch (_) {
          uploadedPhotoUrl = await fileToBase64(photoFile);
        }
      }

      const res = await fetch(`${API_URL}/api/trees/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: uploadedPhotoUrl,
          lat: location.lat,
          lng: location.lng,
          hintSpecies: selectedSpeciesHint,
          userId: currentUser._id || currentUser.id || null
        })
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const textErr = await res.text();
        throw new Error('Server route returned non-JSON. Please restart backend server.');
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Scan failed');

      setScanResult(data);
    } catch (err) {
      console.error('Scan error:', err);
      setScanError(err.message || 'Could not complete scan. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  const handleRegisterProposal = async () => {
    if (!scanResult || !scanResult.identification) return;
    setSubmittingProposal(true);
    try {
      let finalImg = photo;
      if (photoFile) {
        try {
          finalImg = await fileToBase64(photoFile);
        } catch (_) {
          finalImg = photo;
        }
      }

      const rawLat = location?.lat;
      const rawLng = location?.lng;
      const parsedLat = (rawLat !== undefined && !isNaN(Number(rawLat))) ? Number(rawLat) : 13.3412;
      const parsedLng = (rawLng !== undefined && !isNaN(Number(rawLng))) ? Number(rawLng) : 74.7415;

      const userIdStr = currentUser?._id ? String(currentUser._id) : (currentUser?.id ? String(currentUser.id) : null);

      const res = await fetch(`${API_URL}/api/trees/register-proposal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: scanResult.identification.commonName || 'Unassigned Species',
          scientificName: scanResult.identification.scientificName || scanResult.identification.commonName || 'Botanical Species',
          image: finalImg,
          lat: parsedLat,
          lng: parsedLng,
          locationText: location?.text || 'Udupi Region',
          submittedBy: currentUser?.name || 'Citizen User',
          submittedByEmail: currentUser?.email || '',
          submittedByUserId: userIdStr,
          notes: `Scanned with CanopyLens AI (${Math.round((scanResult.identification.confidence || 0.9) * 100)}% AI match)`
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setProposalSubmitted(true);
      } else {
        alert(data.msg || 'Could not submit tree proposal.');
      }
    } catch (err) {
      console.error('Proposal submit error:', err);
      alert('Server error submitting tree proposal.');
    } finally {
      setSubmittingProposal(false);
    }
  };


  const matchedTree = scanResult?.matchedTree;
  const isAdopted = matchedTree?.isAdopted;
  const isUserTree = matchedTree?.isAdoptedByCurrentUser;

  return (
    <div className="canopylens-backdrop" style={styles.backdrop}>
      <div className="canopylens-modal" style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={styles.iconWrapper}>
              <Sparkles size={22} color="#52b788" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
                CanopyLens AI 🌳
              </h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted, #64748b)' }}>
                See a tree. Know its story. (Scan &amp; Inventory Matcher)
              </p>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn} title="Close">
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={styles.body}>
          {!scanResult ? (
            <>
              {/* Image Input Section */}
              <div
                style={{
                  ...styles.dropzone,
                  borderColor: photo ? 'var(--forest-leaf, #2d6a4f)' : 'var(--border, #cbd5e1)'
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                {photo ? (
                  <img src={photo} alt="Scanned tree" style={styles.previewImage} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <div style={styles.cameraCircle}>
                      <Camera size={36} color="var(--forest-leaf, #2d6a4f)" />
                    </div>
                    <b style={{ color: 'var(--text-primary, #0f172a)', fontSize: '1rem' }}>
                      Click to Capture or Upload Tree Image
                    </b>
                    <span style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.85rem' }}>
                      Supports JPEG, PNG • Point camera directly at foliage or trunk
                    </span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handlePhotoSelect}
                />
              </div>

              {/* GPS Bar with Location Selector */}
              <div style={{ ...styles.gpsBar, flexDirection: 'column', alignItems: 'stretch', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}>
                    <MapPin size={16} color="var(--forest-leaf, #2d6a4f)" />
                    <b>Current Location:</b> {location.text}
                  </span>
                  <button
                    type="button"
                    onClick={detectGPS}
                    style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Auto-GPS
                  </button>
                </div>
                <select
                  style={{
                    background: 'var(--bg-surface, #ffffff)',
                    border: '1px solid var(--border, #cbd5e1)',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    fontSize: '0.82rem',
                    color: 'var(--text-primary, #0f172a)',
                    cursor: 'pointer'
                  }}
                  onChange={(e) => {
                    const preset = udupiLocationPresets[e.target.value];
                    if (preset) {
                      setLocation({
                        lat: preset.lat,
                        lng: preset.lng,
                        text: preset.label
                      });
                    }
                  }}
                >
                  <option value="">Select / Adjust Udupi Zone Location...</option>
                  {udupiLocationPresets.map((loc, idx) => (
                    <option key={idx} value={idx}>{loc.label}</option>
                  ))}
                </select>
              </div>

              {scanError && (
                <div style={styles.errorBanner}>
                  <AlertCircle size={18} /> {scanError}
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={handleRunScan}
                disabled={scanning || !photo}
                style={{
                  ...styles.scanBtn,
                  opacity: scanning || !photo ? 0.6 : 1,
                  cursor: scanning || !photo ? 'not-allowed' : 'pointer'
                }}
              >
                {scanning ? (
                  <><RefreshCw className="spin" size={18} /> Analyzing with CanopyLens AI…</>
                ) : (
                  <><Sparkles size={18} /> Scan &amp; Identify Tree</>
                )}
              </button>
            </>
          ) : (
            /* Scan Results View */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Species Identification Card */}
              <div style={styles.resultCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={styles.confidenceTag}>
                      <Sparkles size={12} /> {Math.round(scanResult.identification.confidence * 100)}% AI Confidence
                    </span>
                    <h2 style={{ margin: '6px 0 2px 0', fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
                      {scanResult.identification.commonName}
                    </h2>
                    <i style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.9rem' }}>
                      {scanResult.identification.scientificName}
                    </i>
                  </div>
                  {photo && <img src={photo} alt="Scanned" style={styles.thumbImage} />}
                </div>

                <div style={{ marginTop: '14px' }}>
                  <b style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #475569)' }}>Key Characteristics:</b>
                  <ul style={{ margin: '4px 0 10px 0', paddingLeft: '20px', fontSize: '0.88rem', color: 'var(--text-primary, #1e293b)' }}>
                    {Array.isArray(scanResult.identification.characteristics) ? (
                      scanResult.identification.characteristics.map((c, i) => <li key={i}>{c}</li>)
                    ) : (
                      <li>Urban tree specimen with foliage spread</li>
                    )}
                  </ul>
                  <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--text-secondary, #475569)', background: 'var(--bg-page, #f8fafc)', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid var(--forest-leaf, #2d6a4f)' }}>
                    <b>💡 Care Tip:</b> {scanResult.identification.careTip}
                  </p>

                  {/* Manual Species Correction Option */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', background: 'rgba(2, 132, 199, 0.06)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(2, 132, 199, 0.2)' }}>
                    <span style={{ fontSize: '0.78rem', color: '#0369a1', fontWeight: 600 }}>✏️ Not the right tree? Correct species:</span>
                    <select
                      style={{ background: '#fff', border: '1px solid #bae6fd', borderRadius: '6px', padding: '4px 8px', fontSize: '0.8rem', color: '#0369a1', fontWeight: 600, cursor: 'pointer' }}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                          setScanResult(prev => ({
                            ...prev,
                            identification: {
                              ...prev.identification,
                              commonName: val,
                              confidence: 0.98
                            }
                          }));
                        }
                      }}
                    >
                      <option value="">Switch species...</option>
                      <option value="Neem">Neem (Azadirachta indica)</option>
                      <option value="Banyan Tree">Banyan Tree (Ficus benghalensis)</option>
                      <option value="Peepal">Peepal (Ficus religiosa)</option>
                      <option value="Teak">Teak (Tectona grandis)</option>
                      <option value="Gulmohar">Gulmohar (Delonix regia)</option>
                      <option value="Orchard Mango">Orchard Mango (Mangifera indica)</option>
                      <option value="Jackfruit">Jackfruit (Artocarpus heterophyllus)</option>
                      <option value="Coconut Palm">Coconut Palm (Cocos nucifera)</option>
                      <option value="Ashoka">Ashoka (Polyalthia longifolia)</option>
                      <option value="Honge">Honge (Pongamia pinnata)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* CanopyGuard Inventory Match Status Banner */}
              {matchedTree ? (
                <div
                  style={{
                    ...styles.statusBox,
                    background: isAdopted
                      ? isUserTree
                        ? 'rgba(45, 106, 79, 0.1)'
                        : 'rgba(245, 158, 11, 0.1)'
                      : 'rgba(16, 185, 129, 0.1)',
                    borderColor: isAdopted
                      ? isUserTree
                        ? 'var(--forest-leaf, #2d6a4f)'
                        : '#f59e0b'
                      : '#10b981'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {isAdopted ? (
                      isUserTree ? (
                        <ShieldCheck size={24} color="var(--forest-leaf, #2d6a4f)" />
                      ) : (
                        <Lock size={24} color="#d97706" />
                      )
                    ) : (
                      <CheckCircle2 size={24} color="#10b981" />
                    )}
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
                        {isAdopted
                          ? isUserTree
                            ? '💚 Your Adopted Tree Registered in GIS'
                            : '🟡 Registered Tree — Already Adopted'
                          : '🟢 Registered Tree — Available for Adoption'}
                      </h4>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary, #475569)' }}>
                        Matched <b>{matchedTree.name}</b> ({matchedTree.distanceMeters}m away in Udupi Inventory)
                      </p>
                    </div>
                  </div>

                  {/* Adoption Details */}
                  {isAdopted && (
                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed rgba(0,0,0,0.1)', fontSize: '0.85rem' }}>
                      <span><b>Community Guardian:</b> {matchedTree.guardianName}</span>
                      {matchedTree.careStreak && (
                        <span style={{ marginLeft: '14px', background: 'rgba(0,0,0,0.05)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                          🔥 {matchedTree.careStreak} Care Streak
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Unregistered Case */
                <div style={{ ...styles.statusBox, background: 'rgba(2, 132, 199, 0.1)', borderColor: '#0284c7' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <AlertCircle size={24} color="#0284c7" />
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0369a1' }}>
                        🔵 Unregistered Tree Discovered
                      </h4>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#334155' }}>
                        This tree is not yet registered in CanopyGuard's GIS inventory.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons based on Adoption Condition */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button onClick={() => setScanResult(null)} style={styles.secondaryBtn}>
                  <RefreshCw size={16} /> Scan Another Tree
                </button>

                {matchedTree ? (
                  isAdopted ? (
                    isUserTree ? (
                      <button
                        onClick={() => {
                          onClose();
                          navigate('/citizen-dashboard?tab=adoptions');
                        }}
                        style={styles.primaryBtn}
                      >
                        <HeartHandshake size={16} /> Log Care Activity
                      </button>
                    ) : (
                      /* CRITICAL CONDITION: CANNOT ADOPT ALREADY ADOPTED TREE */
                      <button
                        disabled
                        title="You cannot adopt an already adopted tree."
                        style={{ ...styles.disabledBtn, flex: 1 }}
                      >
                        <Lock size={16} /> Already Adopted
                      </button>
                    )
                  ) : (
                    /* Available for adoption */
                    <button
                      onClick={() => {
                        onClose();
                        navigate('/citizen-dashboard?tab=explore');
                      }}
                      style={styles.primaryBtn}
                    >
                      <Sprout size={16} /> Adopt This Tree
                    </button>
                  )
                ) : proposalSubmitted ? (
                  <div style={{ flex: 1, padding: '14px 16px', background: '#ecfdf5', borderRadius: '10px', border: '1px solid #10b981', color: '#047857', fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={18} color="#10b981" /> Tree Proposal Sent to Admin for Verification! (+100 Eco-Pts pending)
                  </div>
                ) : (
                  <button
                    onClick={handleRegisterProposal}
                    disabled={submittingProposal}
                    style={{ ...styles.primaryBtn, background: '#0284c7' }}
                  >
                    {submittingProposal ? (
                      <><RefreshCw className="spin" size={16} /> Sending to Admin…</>
                    ) : (
                      <><Sprout size={16} /> Submit Tree for Official Registration</>
                    )}
                  </button>
                )}

              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(6px)',
    zIndex: 9999,
    display: 'grid',
    placeItems: 'center',
    padding: '20px'
  },
  modal: {
    background: 'var(--bg-surface, #ffffff)',
    border: '1px solid var(--border, #e2e8f0)',
    borderRadius: '20px',
    width: 'min(580px, 100%)',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 40px -15px rgba(0, 32, 20, 0.25)',
    animation: 'fadeIn 0.25s ease'
  },
  header: {
    padding: '20px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--border, #e2e8f0)',
    background: 'var(--bg-surface, #ffffff)'
  },
  iconWrapper: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    background: 'rgba(45, 106, 79, 0.1)',
    display: 'grid',
    placeItems: 'center'
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted, #64748b)',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '8px'
  },
  body: {
    padding: '24px'
  },
  dropzone: {
    border: '2px dashed',
    borderRadius: '16px',
    padding: '28px 20px',
    textAlign: 'center',
    cursor: 'pointer',
    background: 'var(--bg-page, #f8fafc)',
    transition: 'all 0.2s ease',
    overflow: 'hidden',
    position: 'relative'
  },
  cameraCircle: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: 'rgba(45, 106, 79, 0.12)',
    display: 'grid',
    placeItems: 'center'
  },
  previewImage: {
    width: '100%',
    maxHeight: '260px',
    objectFit: 'cover',
    borderRadius: '12px'
  },
  gpsBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '14px',
    padding: '10px 14px',
    background: 'rgba(45, 106, 79, 0.06)',
    borderRadius: '10px',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--forest-leaf, #2d6a4f)'
  },
  errorBanner: {
    marginTop: '12px',
    padding: '10px 14px',
    background: '#fef2f2',
    color: '#dc2626',
    borderRadius: '8px',
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  scanBtn: {
    width: '100%',
    marginTop: '18px',
    height: '50px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)',
    color: '#ffffff',
    fontWeight: 700,
    fontSize: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxShadow: '0 4px 14px rgba(27, 67, 50, 0.25)'
  },
  resultCard: {
    background: 'var(--bg-page, #f8fafc)',
    border: '1px solid var(--border, #e2e8f0)',
    borderRadius: '14px',
    padding: '20px'
  },
  confidenceTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    background: 'rgba(45, 106, 79, 0.12)',
    color: 'var(--forest-leaf, #2d6a4f)',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '0.78rem',
    fontWeight: 700
  },
  thumbImage: {
    width: '72px',
    height: '72px',
    objectFit: 'cover',
    borderRadius: '10px',
    border: '1px solid var(--border, #cbd5e1)'
  },
  statusBox: {
    border: '1.5px solid',
    borderRadius: '14px',
    padding: '16px 20px'
  },
  primaryBtn: {
    flex: 1,
    height: '46px',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)',
    color: '#ffffff',
    fontWeight: 700,
    fontSize: '0.92rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(27, 67, 50, 0.2)'
  },
  secondaryBtn: {
    height: '46px',
    padding: '0 16px',
    borderRadius: '10px',
    border: '1px solid var(--border, #cbd5e1)',
    background: 'var(--bg-surface, #ffffff)',
    color: 'var(--text-primary, #0f172a)',
    fontWeight: 600,
    fontSize: '0.88rem',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer'
  },
  disabledBtn: {
    height: '46px',
    padding: '0 16px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    background: '#cbd5e1',
    color: '#64748b',
    fontWeight: 700,
    fontSize: '0.9rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: 'not-allowed'
  }
};
