'use client';
import { ReactNode } from 'react';

interface TooltipProps {
  text: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  disabled?: boolean;
  wrapperClassName?: string;
}

export function Tooltip({ text, children, position = 'top', disabled = false, wrapperClassName = 'inline-flex' }: TooltipProps) {
  if (!text || disabled) return <>{children}</>;

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }[position];

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 -mt-1',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 -mb-1',
    left: 'left-full top-1/2 -translate-y-1/2 -ml-1',
    right: 'right-full top-1/2 -translate-y-1/2 -mr-1',
  }[position];

  return (
    <div className={`relative group ${wrapperClassName}`}>
      {children}
      <div
        className={`absolute ${positionClasses} z-[9999] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap bg-gray-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-lg`}
        role="tooltip"
      >
        {text}
        <div className={`absolute w-2 h-2 bg-gray-900 rotate-45 ${arrowClasses}`} />
      </div>
    </div>
  );
}
