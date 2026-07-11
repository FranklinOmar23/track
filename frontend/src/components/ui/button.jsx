import React from 'react';
export const Button = React.forwardRef(({ className, variant, size, children, ...props }, ref) => {
  const variantClasses = {
    default: "bg-gray-900 text-white hover:bg-gray-900/90",
    ghost: "hover:bg-gray-100 hover:text-gray-900",
    outline: "border border-gray-200 bg-white hover:bg-gray-100 hover:text-gray-900",
  };
  
  const sizeClasses = {
    default: "h-10 px-4 py-2",
    sm: "h-8 rounded-md px-3 text-xs",
    lg: "h-11 rounded-md px-8",
    icon: "h-10 w-10",
  };
  
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-400 disabled:pointer-events-none disabled:opacity-50 ${variantClasses[variant] || variantClasses.default} ${sizeClasses[size] || sizeClasses.default} ${className || ''}`}
      {...props}
    >
      {children}
    </button>
  );
});
Button.displayName = "Button";