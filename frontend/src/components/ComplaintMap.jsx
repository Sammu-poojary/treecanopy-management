import React from 'react';

const ComplaintMap = ({ position = [13.3409, 74.7421], zoom = 13 }) => {
  const [lat, lng] = position;
  const mapSrc = `https://www.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`;

  return (
    <div style={{ marginBottom: '1rem' }}>
      <div
        style={{
          height: '320px',
          width: '100%',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid #d1fae5',
        }}
      >
        <iframe
          title="Live Google Map"
          src={mapSrc}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      <div
        style={{
          marginTop: '0.75rem',
          padding: '0.7rem 0.9rem',
          borderRadius: '10px',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          color: '#166534',
          fontSize: '0.9rem',
          fontWeight: 600,
        }}
      >
        Live Google map view of the monitored zone
      </div>
    </div>
  );
};

export default ComplaintMap;
