'use client';

import { ReactNode } from 'react';
import Image from 'next/image';

interface ExperimentLayoutProps {
  children: ReactNode;
  background?: 'dark' | 'light' | 'image';
  className?: string;
}

export function ExperimentLayout({ 
  children, 
  background = 'light',
  className = '' 
}: ExperimentLayoutProps) {
  const getBackgroundClass = () => {
    switch (background) {
      case 'dark':
        return 'bg-dark-purple text-white';
      case 'image':
        return 'relative';
      default:
        return 'bg-ivory text-dark-purple';
    }
  };

  return (
    <div className={`min-h-screen ${getBackgroundClass()} ${className}`}>
      {background === 'image' && (
        <div className="absolute inset-0 z-0">
          <Image
            src="/bg.png"
            alt="Background"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-dark-purple/20" />
        </div>
      )}
      <div className={`relative z-10 ${background === 'image' ? 'min-h-screen' : ''}`}>
        {children}
      </div>
    </div>
  );
}
