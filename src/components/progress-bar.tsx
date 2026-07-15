import React from 'react';

export function ProgressBar({ 
  value, 
  max = 100, 
  colorClass = 'bg-primary',
  className = ''
}: { 
  value: number; 
  max?: number; 
  colorClass?: string;
  className?: string;
}) {
  const percentage = Math.min((value / Math.max(max, 1)) * 100, 100);
  
  return (
    <div className={`w-full h-1.5 bg-muted rounded-full overflow-hidden ${className}`}>
      <div 
        className={`h-full rounded-full transition-all duration-500 ${colorClass}`} 
        style={{ width: `${percentage}%` }} 
      />
    </div>
  );
}
