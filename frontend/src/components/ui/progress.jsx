import React from 'react';

export const Progress = React.forwardRef(({ className, value, ...props }, ref) => (
  <div
    ref={ref}
    className={`relative h-2 w-full overflow-hidden rounded-full bg-white/10 ${className || ''}`}
    {...props}
  >
    <div
      className="h-full w-full flex-1 bg-teal-500 transition-all duration-300"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </div>
));
Progress.displayName = "Progress";
