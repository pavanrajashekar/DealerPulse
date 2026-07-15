import React from 'react';

interface UnifiedTooltipProps {
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function UnifiedTooltip({ title, children, className = '' }: UnifiedTooltipProps) {
  return (
    <div className={`bg-card
border
border-border
rounded-md
shadow-xl
text-foreground
text-[12px]
overflow-hidden
z-50
pointer-events-none
` + className}>
      {title && (
        <div className={`px-3
py-2
border-b
border-border
bg-muted/30
font-bold`}>
          {title}
        </div>
      )}
      <div className={`px-3
py-2
flex
flex-col
space-y-1.5`}>
        {children}
      </div>
    </div>
  );
}

interface TooltipRowProps {
  label: React.ReactNode;
  value: React.ReactNode;
  color?: string;
}

export function TooltipRow({ label, value, color }: TooltipRowProps) {
  return (
    <div className={`flex
justify-between
items-center
space-x-6`}>
      <div className={`flex
items-center
space-x-2`}>
        {color && <div className={`w-2
h-2
rounded-full`} style={{ backgroundColor: color }} />}
        <span className={`text-muted-foreground`}>{label}</span>
      </div>
      <span className={`font-bold`}>{value}</span>
    </div>
  );
}
