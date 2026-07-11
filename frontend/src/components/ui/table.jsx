import React from 'react';
export const Table = React.forwardRef(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={`w-full caption-bottom text-sm ${className || ''}`}
      {...props}
    />
  </div>
));
Table.displayName = "Table";

export const TableHeader = React.forwardRef(({ className, ...props }, ref) => (
  <thead ref={ref} className={`[&_tr]:border-b border-white/[0.07] ${className || ''}`} {...props} />
));
TableHeader.displayName = "TableHeader";

export const TableBody = React.forwardRef(({ className, ...props }, ref) => (
  <tbody ref={ref} className={`[&_tr:last-child]:border-0 ${className || ''}`} {...props} />
));
TableBody.displayName = "TableBody";

export const TableRow = React.forwardRef(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={`border-b border-white/[0.05] transition-colors hover:bg-white/[0.03] data-[state=selected]:bg-white/[0.07] ${className || ''}`}
    {...props}
  />
));
TableRow.displayName = "TableRow";

export const TableHead = React.forwardRef(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={`h-12 px-4 text-left align-middle font-medium text-gray-500 [&:has([role=checkbox])]:pr-0 ${className || ''}`}
    {...props}
  />
));
TableHead.displayName = "TableHead";

export const TableCell = React.forwardRef(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={`p-4 align-middle text-gray-300 [&:has([role=checkbox])]:pr-0 ${className || ''}`}
    {...props}
  />
));
TableCell.displayName = "TableCell";
