import React from 'react';
export const Badge = React.forwardRef(({ className, variant, ...props }, ref) => {
  const variantClasses = {
    default: "bg-white/10 text-white hover:bg-white/20",
    secondary: "bg-white/10 text-gray-200 hover:bg-white/20",
    outline: "border border-white/20 text-gray-300",
    resort: "bg-teal-900/40 text-teal-400 border border-teal-600/40",
    tour: "bg-cyan-900/40 text-cyan-400 border border-cyan-600/40",
  };

  return (
    <span
      ref={ref}
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none ${variantClasses[variant] || variantClasses.default} ${className || ''}`}
      {...props}
    />
  );
});
Badge.displayName = "Badge";
