import React from 'react';

const Badge = ({ children, variant = 'default', className = '' }) => {
  const styleMap = {
    default: 'badge',
    success: 'badgeOk',
    warning: 'badgePend',
    stack: 'badgeStack',
  };

  return <span className={`${styleMap[variant] || styleMap.default} ${className}`}>{children}</span>;
};

export default Badge;
