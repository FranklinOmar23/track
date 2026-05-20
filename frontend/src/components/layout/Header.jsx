import React from 'react';

const Header = () => (
  <header className="header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--color-border-tertiary)', marginBottom: '1.5rem' }}>
    <div>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>ResortMamaTingo — Control de pagos</h1>
      <p style={{ margin: '0.4rem 0 0', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Diciembre 2025 · Registro individual por persona</p>
    </div>
  </header>
);

export default Header;
