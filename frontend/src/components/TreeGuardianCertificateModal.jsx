import React, { useRef } from 'react';
import { Award, Download, Printer, X, ShieldCheck, TreePine, Calendar, MapPin, Sparkles } from 'lucide-react';

export default function TreeGuardianCertificateModal({ adoption, onClose }) {
  const certificateRef = useRef();

  if (!adoption) return null;

  const handlePrint = () => {
    window.print();
  };

  const adoptedDateStr = new Date(adoption.adoptedAt || Date.now()).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      overflowY: 'auto'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        maxWidth: '800px',
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        animation: 'fadeIn 0.3s ease-out'
      }}>
        {/* Header Bar */}
        <div style={{
          padding: '18px 24px',
          background: '#043224',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Award size={24} color="#f59e0b" />
            <span style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>
              Official Tree Guardian Certificate
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Certificate Canvas Area */}
        <div style={{ padding: '28px', background: '#f8fafc' }}>
          <div
            ref={certificateRef}
            className="guardian-certificate-sheet"
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #fcfbf7 100%)',
              border: '8px double #b45309',
              borderRadius: '16px',
              padding: '40px 32px',
              textAlign: 'center',
              position: 'relative',
              boxShadow: 'inset 0 0 20px rgba(180, 83, 9, 0.08), 0 10px 25px rgba(0,0,0,0.06)'
            }}
          >
            {/* Watermark Leaf Logo */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              opacity: 0.04,
              pointerEvents: 'none'
            }}>
              <TreePine size={320} color="#043224" />
            </div>

            {/* Top Seal */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
              border: '2px solid #d97706',
              boxShadow: '0 4px 12px rgba(217, 119, 6, 0.25)',
              marginBottom: '16px'
            }}>
              <ShieldCheck size={40} color="#92400e" />
            </div>

            <h3 style={{
              margin: '0 0 4px',
              fontSize: '0.85rem',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              color: '#92400e',
              fontWeight: 800
            }}>
              City Urban Forestry Commission
            </h3>

            <h1 style={{
              margin: '0 0 12px',
              fontSize: '2rem',
              fontWeight: 900,
              color: '#043224',
              letterSpacing: '-0.02em',
              fontFamily: 'serif'
            }}>
              Certificate of Tree Guardianship
            </h1>

            <p style={{
              margin: '0 0 20px',
              color: '#64748b',
              fontSize: '0.95rem',
              fontStyle: 'italic'
            }}>
              This honor is proudly awarded in recognition of civic stewardship and commitment to our urban canopy.
            </p>

            <div style={{
              borderBottom: '2px dashed #cbd5e1',
              width: '160px',
              margin: '0 auto 20px'
            }} />

            <p style={{ margin: '0 0 6px', color: '#475569', fontSize: '1rem' }}>
              This certifies that
            </p>
            <h2 style={{
              margin: '0 0 16px',
              fontSize: '1.8rem',
              fontWeight: 800,
              color: '#065f46',
              textDecoration: 'underline',
              textUnderlineOffset: '6px'
            }}>
              {adoption.userName || 'Eco Citizen'}
            </h2>

            <p style={{
              margin: '0 auto 24px',
              maxWidth: '560px',
              color: '#334155',
              fontSize: '1rem',
              lineHeight: 1.6
            }}>
              has formally pledged guardianship and ongoing care for the living urban asset:
            </p>

            {/* Tree Info Badge Card */}
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '16px',
              padding: '16px 24px',
              maxWidth: '540px',
              margin: '0 auto 24px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '12px',
              textAlign: 'left'
            }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>Tree Name / Species</span>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                  {adoption.nickname ? `"${adoption.nickname}" (${adoption.treeName})` : adoption.treeName}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic' }}>{adoption.treeScientificName}</div>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>Location</span>
                <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={14} color="#059669" /> {adoption.treeLocation || 'Udupi Zone'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>Pledge Date</span>
                <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={14} color="#059669" /> {adoptedDateStr}
                </div>
              </div>
            </div>

            {/* Signatures & Verification ID */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              borderTop: '1px solid #e2e8f0',
              paddingTop: '20px',
              marginTop: '16px',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Certificate ID</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#043224', fontSize: '0.85rem' }}>
                  {adoption.certificateNumber || `CG-GUARDIAN-${adoption._id?.slice(-8).toUpperCase()}`}
                </div>
                <a
                  href={`/verify-certificate/${adoption.certificateNumber || 'CG-GUARD-SAMPLE'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700, textDecoration: 'underline', display: 'inline-block', marginTop: '2px' }}
                >
                  ✓ Verify Credential Registry
                </a>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: 'cursive',
                  fontSize: '1.25rem',
                  color: '#065f46',
                  fontWeight: 700,
                  marginBottom: '2px'
                }}>
                  CanopyGuard Forestry
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', borderTop: '1px solid #cbd5e1', paddingTop: '4px' }}>
                  Official Canopy Seal & Signature
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: '#fef3c7',
                  color: '#92400e',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}>
                  <Sparkles size={13} /> {adoption.totalEcoPoints || 100} Eco-Points Earned
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          padding: '16px 24px',
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            style={{
              padding: '10px 22px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #043224, #065f46)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(4, 50, 36, 0.25)'
            }}
          >
            <Printer size={18} /> Print / Save PDF
          </button>
        </div>
      </div>
    </div>
  );
}
