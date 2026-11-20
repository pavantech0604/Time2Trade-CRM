import React from 'react';

export const BrandLogo: React.FC<{ variant?: 'navbar' | 'auth' }> = ({ variant = 'navbar' }) => (
  <span className={`t2t-brand t2t-brand--${variant}`}>
    <span className="t2t-logo-crop">
      <img src="/time2trade-display.png?v=20261120" alt="TIME2TRADE" width={1254} height={1254} draggable={false} />
    </span>
  </span>
);
