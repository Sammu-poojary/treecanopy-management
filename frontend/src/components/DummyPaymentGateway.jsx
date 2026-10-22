/**
 * DummyPaymentGateway.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * A fully-simulated payment gateway modal that replaces Razorpay.
 * Razorpay integration has been COMMENTED OUT and replaced with this
 * dummy gateway for development/demo purposes.
 *
 * Props:
 *   isOpen       – boolean: controls visibility
 *   onClose      – fn: called when user dismisses the modal
 *   onSuccess    – fn(paymentResult): called with fake payment data on success
 *   onFailure    – fn(error): called when user cancels or failure is simulated
 *   amount       – number: amount in INR (e.g. 299)
 *   orderNumber  – string: display reference (e.g. "ORD-ECO-2026-01001")
 *   description  – string: what the payment is for
 *   prefill      – { name, email, contact } user prefill data
 */

import React, { useState, useEffect, useRef } from 'react';

// ── helper: generate a fake transaction ID ──────────────────────────────
const fakeTxnId = () =>
  `pay_dummy_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

// ── Luhn-style card number formatter ────────────────────────────────────
const formatCardNum = (v) =>
  v.replace(/\D/g, '').substring(0, 16).replace(/(.{4})/g, '$1 ').trim();

// ── UPI IDs for demo autofill ────────────────────────────────────────────
const DEMO_UPIS = ['citizen@upi', 'test@paytm', 'demo@ybl', 'canopy@icici'];

export default function DummyPaymentGateway({
  isOpen,
  onClose,
  onSuccess,
  onFailure,
  amount = 0,
  orderNumber = '',
  description = 'Payment',
  prefill = {},
}) {
  const [tab, setTab] = useState('card'); // 'card' | 'upi' | 'netbanking'
  const [stage, setStage] = useState('form'); // 'form' | 'processing' | 'success' | 'failure'
  const [progress, setProgress] = useState(0);
  const [txnId, setTxnId] = useState('');
  const [failReason, setFailReason] = useState('');

  // Card fields
  const [cardNum, setCardNum] = useState('');
  const [cardName, setCardName] = useState(prefill.name || '');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardError, setCardError] = useState('');

  // UPI fields
  const [upiId, setUpiId] = useState('');
  const [upiError, setUpiError] = useState('');
  const [upiValidated, setUpiValidated] = useState(false);
  const [validatingUpi, setValidatingUpi] = useState(false);

  const timerRef = useRef(null);

  // Reset state whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setTab('card');
      setStage('form');
      setProgress(0);
      setTxnId('');
      setCardNum('');
      setCardName(prefill.name || '');
      setCardExpiry('');
      setCardCvv('');
      setCardError('');
      setUpiId('');
      setUpiError('');
      setUpiValidated(false);
    }
    return () => clearTimeout(timerRef.current);
  }, [isOpen]);

  if (!isOpen) return null;

  // ── Simulate payment processing ──────────────────────────────────────
  const runProcessing = () => {
    setStage('processing');
    setProgress(0);
    const id = fakeTxnId();
    setTxnId(id);

    let pct = 0;
    const interval = setInterval(() => {
      pct += Math.random() * 18 + 5;
      if (pct >= 100) {
        pct = 100;
        clearInterval(interval);
        setProgress(100);
        // 95% success rate in demo
        timerRef.current = setTimeout(() => {
          if (Math.random() > 0.05) {
            setStage('success');
            onSuccess &&
              onSuccess({
                razorpay_payment_id: id,
                razorpay_order_id: `order_demo_${Date.now()}`,
                razorpay_signature: 'dummy_sig_sandbox',
                isDemo: true,
              });
          } else {
            setStage('failure');
            setFailReason('Your bank declined the transaction. Please try again or use a different payment method.');
          }
        }, 600);
      } else {
        setProgress(Math.round(pct));
      }
    }, 200);
  };

  // ── Validate card fields ─────────────────────────────────────────────
  const submitCard = () => {
    const raw = cardNum.replace(/\s/g, '');
    if (raw.length < 16) return setCardError('Enter a valid 16-digit card number.');
    if (!cardName.trim()) return setCardError('Cardholder name is required.');
    if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) return setCardError('Enter expiry as MM/YY.');
    if (cardCvv.length < 3) return setCardError('CVE/CVV must be 3 digits.');
    setCardError('');
    runProcessing();
  };

  // ── Simulate UPI ID validation ───────────────────────────────────────
  const validateUpi = () => {
    if (!upiId.includes('@')) return setUpiError('Enter a valid UPI ID (e.g. name@upi).');
    setValidatingUpi(true);
    setUpiError('');
    setTimeout(() => {
      setValidatingUpi(false);
      setUpiValidated(true);
    }, 1200);
  };

  const submitUpi = () => {
    if (!upiValidated) return setUpiError('Please verify your UPI ID first.');
    runProcessing();
  };

  // ── Net banking: instant proceed ──────────────────────────────────────
  const submitNetBanking = () => runProcessing();

  const handleClose = () => {
    if (stage === 'processing') return; // don't allow close during processing
    clearTimeout(timerRef.current);
    if (stage !== 'success') {
      onFailure && onFailure({ message: 'Payment cancelled by user.' });
    }
    onClose && onClose();
  };

  // ── Styles ───────────────────────────────────────────────────────────
  const S = {
    overlay: {
      position: 'fixed', inset: 0, zIndex: 999999,
      background: 'rgba(0,0,0,0.72)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
      backdropFilter: 'blur(6px)',
    },
    modal: {
      background: 'linear-gradient(145deg,#0f172a 0%,#1e293b 100%)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '20px',
      width: '100%',
      maxWidth: '440px',
      boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
      overflow: 'hidden',
      position: 'relative',
    },
    header: {
      background: 'linear-gradient(135deg,#064e3b 0%,#065f46 50%,#047857 100%)',
      padding: '20px 24px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    },
    brand: { display: 'flex', alignItems: 'center', gap: '10px' },
    brandIcon: {
      width: '36px', height: '36px', borderRadius: '10px',
      background: 'rgba(255,255,255,0.15)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '18px',
    },
    brandName: { color: '#fff', fontWeight: '700', fontSize: '15px', letterSpacing: '-0.3px' },
    brandSub: { color: 'rgba(255,255,255,0.65)', fontSize: '11px', marginTop: '1px' },
    amtBox: { textAlign: 'right' },
    amtLabel: { color: 'rgba(255,255,255,0.6)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px' },
    amtValue: { color: '#fff', fontSize: '22px', fontWeight: '800', fontFamily: 'monospace' },
    closeBtn: {
      position: 'absolute', top: '14px', right: '14px',
      background: 'rgba(255,255,255,0.12)', border: 'none',
      borderRadius: '50%', width: '28px', height: '28px',
      color: '#fff', cursor: 'pointer', fontSize: '14px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    body: { padding: '20px 24px 24px' },
    dummyBadge: {
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)',
      borderRadius: '8px', padding: '6px 12px', marginBottom: '16px',
      color: '#fbbf24', fontSize: '11px', fontWeight: '600', letterSpacing: '0.5px',
    },
    tabs: {
      display: 'flex', gap: '6px', marginBottom: '20px',
      background: 'rgba(255,255,255,0.04)',
      borderRadius: '10px', padding: '4px',
    },
    label: { display: 'block', color: '#94a3b8', fontSize: '11px', fontWeight: '600', marginBottom: '6px', letterSpacing: '0.5px' },
    input: {
      width: '100%', padding: '11px 14px', borderRadius: '10px',
      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
      color: '#f1f5f9', fontSize: '14px', outline: 'none',
      transition: 'border-color 0.2s',
      boxSizing: 'border-box',
    },
    row: { display: 'flex', gap: '12px', marginBottom: '14px' },
    col: { flex: 1 },
    error: {
      background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
      borderRadius: '8px', padding: '10px 12px',
      color: '#f87171', fontSize: '12px', marginBottom: '14px',
    },
    payBtn: {
      width: '100%', padding: '14px',
      background: 'linear-gradient(135deg,#059669,#10b981)',
      border: 'none', borderRadius: '12px',
      color: '#fff', fontSize: '15px', fontWeight: '700',
      cursor: 'pointer', letterSpacing: '-0.3px',
      boxShadow: '0 4px 20px rgba(16,185,129,0.4)',
      transition: 'transform 0.15s, box-shadow 0.15s',
      marginTop: '4px',
    },
    secureRow: {
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: '6px', marginTop: '14px', color: '#475569', fontSize: '11px',
    },
  };

  const tabStyle = (active) => ({
    flex: 1, padding: '8px 4px', border: 'none', borderRadius: '7px',
    fontSize: '12px', fontWeight: '600', cursor: 'pointer',
    transition: 'all 0.2s',
    background: active ? 'rgba(16,185,129,0.2)' : 'transparent',
    color: active ? '#34d399' : '#64748b',
    outline: active ? '1px solid rgba(16,185,129,0.3)' : 'none',
  });

  // ── Processing screen ────────────────────────────────────────────────
  if (stage === 'processing') {
    return (
      <div style={S.overlay}>
        <div style={S.modal}>
          <div style={S.header}>
            <div style={S.brand}>
              <div style={S.brandIcon}>🌿</div>
              <div>
                <div style={S.brandName}>CanopyGuard Pay</div>
                <div style={S.brandSub}>Dummy Payment Gateway</div>
              </div>
            </div>
            <div style={S.amtBox}>
              <div style={S.amtLabel}>Total</div>
              <div style={S.amtValue}>₹{amount.toLocaleString('en-IN')}</div>
            </div>
          </div>
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              border: '4px solid rgba(16,185,129,0.2)',
              borderTop: '4px solid #10b981',
              margin: '0 auto 24px',
              animation: 'spin 1s linear infinite',
            }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pop{from{transform:scale(0.5);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
            <div style={{ color: '#f1f5f9', fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>
              Processing Payment…
            </div>
            <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '24px' }}>
              Connecting to secure dummy gateway
            </div>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '99px', height: '6px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: '99px',
                background: 'linear-gradient(90deg,#059669,#34d399)',
                width: `${progress}%`,
                transition: 'width 0.2s ease',
              }} />
            </div>
            <div style={{ color: '#475569', fontSize: '12px', marginTop: '10px' }}>{progress}% — Please do not close this window</div>
            <div style={{ marginTop: '20px', color: '#64748b', fontSize: '11px' }}>
              Ref: <span style={{ fontFamily: 'monospace', color: '#94a3b8' }}>{txnId}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Success screen ───────────────────────────────────────────────────
  if (stage === 'success') {
    return (
      <div style={S.overlay}>
        <div style={S.modal}>
          <div style={{ background: 'linear-gradient(135deg,#064e3b,#065f46)', padding: '20px 24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={S.brand}>
              <div style={S.brandIcon}>🌿</div>
              <div>
                <div style={S.brandName}>CanopyGuard Pay</div>
                <div style={S.brandSub}>Payment Successful</div>
              </div>
            </div>
            <div style={S.amtBox}>
              <div style={S.amtValue}>₹{amount.toLocaleString('en-IN')}</div>
            </div>
          </div>
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'rgba(16,185,129,0.15)', border: '3px solid #10b981',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '36px', margin: '0 auto 20px',
              animation: 'pop 0.4s cubic-bezier(.3,1.5,.6,1)',
            }}>✓</div>
            <div style={{ color: '#34d399', fontSize: '20px', fontWeight: '800', marginBottom: '6px' }}>
              Payment Successful!
            </div>
            <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>{description}</div>
            <div style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px', padding: '14px 18px', marginBottom: '24px', textAlign: 'left',
            }}>
              {[
                ['Transaction ID', txnId],
                ...(orderNumber ? [['Order Ref', orderNumber]] : []),
                ['Amount Paid', `₹${amount.toLocaleString('en-IN')}`],
                ['Status', '✅ Paid (Demo)'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                  <span style={{ color: '#64748b' }}>{k}</span>
                  <span style={{ color: '#f1f5f9', fontFamily: k === 'Transaction ID' ? 'monospace' : 'inherit', fontSize: k === 'Transaction ID' ? '11px' : '12px' }}>{v}</span>
                </div>
              ))}
            </div>
            <button onClick={() => { onClose && onClose(); }} style={S.payBtn}>
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Failure screen ───────────────────────────────────────────────────
  if (stage === 'failure') {
    return (
      <div style={S.overlay}>
        <div style={S.modal}>
          <div style={{ background: 'linear-gradient(135deg,#7f1d1d,#991b1b)', padding: '20px 24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={S.brand}>
              <div style={S.brandIcon}>❌</div>
              <div>
                <div style={S.brandName}>CanopyGuard Pay</div>
                <div style={S.brandSub}>Payment Failed</div>
              </div>
            </div>
          </div>
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <div style={{ color: '#f87171', fontSize: '18px', fontWeight: '700', marginBottom: '10px' }}>
              Transaction Failed
            </div>
            <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '28px' }}>{failReason}</div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => { setStage('form'); setProgress(0); }}
                style={{ ...S.payBtn, background: 'linear-gradient(135deg,#1e40af,#3b82f6)' }}
              >
                Try Again
              </button>
              <button
                onClick={handleClose}
                style={{ ...S.payBtn, background: 'rgba(255,255,255,0.08)', color: '#94a3b8', boxShadow: 'none' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main form ─────────────────────────────────────────────────────────
  return (
    <div
      style={S.overlay}
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={S.header}>
          <div style={S.brand}>
            <div style={S.brandIcon}>🌿</div>
            <div>
              <div style={S.brandName}>CanopyGuard Pay</div>
              <div style={S.brandSub}>Secure Dummy Payment Gateway</div>
            </div>
          </div>
          <div style={S.amtBox}>
            <div style={S.amtLabel}>Pay</div>
            <div style={S.amtValue}>₹{amount.toLocaleString('en-IN')}</div>
          </div>
          <button
            type="button"
            style={S.closeBtn}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleClose();
            }}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={S.body}>
          {/* Demo badge */}
          <div style={S.dummyBadge}>
            <span>⚠</span>
            <span>DEMO MODE — No real payment will be charged</span>
          </div>

          {description && (
            <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '14px', fontStyle: 'italic' }}>
              {description}
            </div>
          )}

          {/* Tabs */}
          <div style={S.tabs}>
            {[['card', '💳 Card'], ['upi', '📱 UPI'], ['netbanking', '🏦 Net Banking']].map(([id, label]) => (
              <button
                key={id}
                type="button"
                style={tabStyle(tab === id)}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setTab(id);
                  setCardError('');
                  setUpiError('');
                  setUpiValidated(false);
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── Card Tab ── */}
          {tab === 'card' && (
            <div>
              <div style={{ marginBottom: '14px' }}>
                <label style={S.label}>Card Number</label>
                <input
                  style={S.input}
                  placeholder="1234 5678 9012 3456"
                  value={cardNum}
                  onChange={(e) => setCardNum(formatCardNum(e.target.value))}
                  maxLength={19}
                />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={S.label}>Cardholder Name</label>
                <input
                  style={S.input}
                  placeholder="Name on Card"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                />
              </div>
              <div style={S.row}>
                <div style={S.col}>
                  <label style={S.label}>Expiry (MM/YY)</label>
                  <input
                    style={S.input}
                    placeholder="MM/YY"
                    value={cardExpiry}
                    onChange={(e) => {
                      let v = e.target.value.replace(/\D/g, '').substring(0, 4);
                      if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
                      setCardExpiry(v);
                    }}
                    maxLength={5}
                  />
                </div>
                <div style={S.col}>
                  <label style={S.label}>CVV</label>
                  <input
                    style={S.input}
                    type="password"
                    placeholder="•••"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').substring(0, 4))}
                    maxLength={4}
                  />
                </div>
              </div>
              {cardError && <div style={S.error}>{cardError}</div>}
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '10px 12px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>💡</span>
                <span style={{ color: '#64748b', fontSize: '11px' }}>
                  Use any dummy details (e.g. 4111 1111 1111 1111, any expiry, any CVV)
                </span>
              </div>
              <button
                type="button"
                style={S.payBtn}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  submitCard();
                }}
              >
                Pay ₹{amount.toLocaleString('en-IN')} Securely →
              </button>
            </div>
          )}

          {/* ── UPI Tab ── */}
          {tab === 'upi' && (
            <div>
              <div style={{ marginBottom: '14px' }}>
                <label style={S.label}>UPI ID / VPA</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    style={{ ...S.input, flex: 1 }}
                    placeholder="yourname@upi"
                    value={upiId}
                    onChange={(e) => { setUpiId(e.target.value); setUpiValidated(false); setUpiError(''); }}
                    disabled={upiValidated}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      validateUpi();
                    }}
                    disabled={validatingUpi || upiValidated}
                    style={{
                      padding: '11px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                      background: upiValidated ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.1)',
                      color: upiValidated ? '#34d399' : '#94a3b8', fontSize: '13px', fontWeight: '600',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {validatingUpi ? '…' : upiValidated ? '✓ Verified' : 'Verify'}
                  </button>
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ color: '#64748b', fontSize: '11px', marginBottom: '8px' }}>Quick picks (demo):</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {DEMO_UPIS.map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setUpiId(u);
                        setUpiValidated(false);
                        setUpiError('');
                      }}
                      style={{
                        background: upiId === u ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${upiId === u ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: '6px', padding: '5px 10px',
                        color: upiId === u ? '#34d399' : '#94a3b8', fontSize: '12px', cursor: 'pointer',
                      }}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
              {upiError && <div style={S.error}>{upiError}</div>}
              <button
                type="button"
                style={{ ...S.payBtn, opacity: upiValidated ? 1 : 0.6 }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  submitUpi();
                }}
              >
                Pay ₹{amount.toLocaleString('en-IN')} via UPI →
              </button>
            </div>
          )}

          {/* ── Net Banking Tab ── */}
          {tab === 'netbanking' && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <label style={S.label}>Select Bank</label>
                {['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Canara Bank'].map((bank) => (
                  <div
                    key={bank}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '12px 14px', borderRadius: '10px', marginBottom: '8px',
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                      cursor: 'pointer', color: '#94a3b8', fontSize: '13px',
                    }}
                    onClick={submitNetBanking}
                  >
                    <span style={{ fontSize: '20px' }}>🏦</span>
                    <span style={{ flex: 1 }}>{bank}</span>
                    <span style={{ color: '#475569' }}>→</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Secure footer */}
          <div style={S.secureRow}>
            <span>🔒</span>
            <span>256-bit SSL Encrypted • Dummy Gateway • Demo Mode Only</span>
          </div>
        </div>
      </div>
    </div>
  );
}
