import React from 'react';

export const Badge = React.forwardRef(({ className, variant, ...props }, ref) => {
  const variantClasses = {
    default: "bg-gray-900 text-white hover:bg-gray-900/80",
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-100/80",
    outline: "border border-gray-200 text-gray-950",
    resort: "bg-teal-50 text-teal-700 border border-teal-200",
    tour: "bg-cyan-50 text-cyan-700 border border-cyan-200",
  };
  
  return (
    <span
      ref={ref}
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 ${variantClasses[variant] || variantClasses.default} ${className || ''}`}
      {...props}
    />
  );
});
Badge.displayName = "Badge";