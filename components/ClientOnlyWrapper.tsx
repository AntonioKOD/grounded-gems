'use client'

import React, { ComponentType, useEffect, useState, ReactNode } from 'react';

// HOC (Higher Order Component) to ensure client-side only rendering
// Based on solution from: https://github.com/vercel/next.js/discussions/35773
const withClientValidation = <P extends object>(
  Component: ComponentType<P>
) => {
  const HOC: React.FC<P & { children?: ReactNode }> = ({
    children,
    ...restProps
  }) => {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
      setIsClient(true);
    }, []);

    // Don't render anything during SSR to prevent hydration mismatches
    if (!isClient) {
      return null;
    }

    return (
      <Component {...(restProps as P)} suppressHydrationWarning>
        {children}
      </Component>
    );
  };

  // Set display name for better debugging
  HOC.displayName = `ClientOnly(${Component.displayName || Component.name || 'Component'})`;

  return HOC;
};

// Simple wrapper component for client-only rendering
export const ClientOnlyWrapper: React.FC<{ 
  children: ReactNode;
  fallback?: ReactNode;
}> = ({ children, fallback = null }) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <>{fallback}</>;
  }

  return <div suppressHydrationWarning>{children}</div>;
};

export default withClientValidation; 