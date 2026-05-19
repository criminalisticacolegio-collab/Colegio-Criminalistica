import { useState } from 'react';

export default function PaymentButton({ amount, text = 'Pagar Ahora', email = '' }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePay = async () => {
    if (!amount || amount <= 0) {
      setError('Monto inválido.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, email, title: text }),
      });

      if (!res.ok) throw new Error('Error del servidor');

      const { init_point } = await res.json();
      window.location.href = init_point;
    } catch {
      setError('No se pudo iniciar el pago. Reintente.');
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <button
        onClick={handlePay}
        disabled={loading}
        style={{
          background: loading ? '#9ca3af' : 'var(--primary, #1b5e20)',
          color: 'white',
          border: 'none',
          padding: '0.9rem 1.5rem',
          borderRadius: '10px',
          fontWeight: '700',
          fontSize: '1rem',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s',
          width: '100%',
        }}
      >
        {loading ? 'Redirigiendo a MercadoPago...' : text}
      </button>
      {error && (
        <span style={{ color: '#991b1b', fontSize: '0.85rem', fontWeight: '600' }}>
          {error}
        </span>
      )}
    </div>
  );
}
