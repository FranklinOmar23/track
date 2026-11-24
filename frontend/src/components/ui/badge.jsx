import React from 'react';
export const Badge = React.forwardRef(({ className, variant, ...props }, ref) => {
  const variantClasses = {
    default: "bg-slate-100 text-slate-900 hover:bg-slate-100",
    secondary: "bg-slate-100 text-slate-800 hover:bg-slate-100",
    outline: "border border-slate-200 text-slate-700",
    resort: "bg-teal-50 text-teal-700 border border-teal-200",
    tour: "bg-cyan-50 text-cyan-700 border border-cyan-200",
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
