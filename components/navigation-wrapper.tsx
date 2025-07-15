"use client";

import { useState, useEffect } from "react";
import type { UserData } from "@/lib/features/user/userSlice";

// Static navigation skeleton that matches the final layout exactly
function NavigationSkeleton({ hasUser }: { hasUser?: boolean }) {
  return (
    <>
      {/* Desktop Navigation Skeleton */}
      <div className="hidden md:block fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo skeleton */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="w-20 h-6 bg-gray-200 rounded animate-pulse"></div>
          </div>
          
          {/* Navigation links skeleton */}
          <div className="flex items-center space-x-6">
            <div className="w-12 h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
          </div>
          
          {/* Right section skeleton */}
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
            {hasUser ? (
              <>
                <div className="w-16 h-8 bg-gray-200 rounded animate-pulse"></div>
                <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
              </>
            ) : (
              <>
                <div className="w-16 h-8 bg-gray-200 rounded animate-pulse"></div>
                <div className="w-20 h-8 bg-gray-200 rounded animate-pulse"></div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Skeleton */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="safe-area-bottom">
          <div className="flex items-center justify-around h-16 px-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex flex-col items-center justify-center h-12 min-w-[60px]">
                <div className={`${index === 2 ? "w-12 h-12 bg-gray-200 rounded-full" : "w-5 h-5 bg-gray-200 rounded"} animate-pulse mb-0.5`}></div>
                {index !== 2 && <div className="w-8 h-3 bg-gray-200 rounded animate-pulse"></div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

interface NavigationWrapperProps {
  initialUser: UserData | null;
}

// This component ensures the navigation only renders on the client to prevent hydration errors
export default function NavigationWrapper({ initialUser }: NavigationWrapperProps) {
  const [isClient, setIsClient] = useState(false);
  const [componentsLoaded, setComponentsLoaded] = useState(false);
  const [NavBar, setNavBar] = useState<any>(null);
  const [MobileNavigation, setMobileNavigation] = useState<any>(null);
  const [MobileTopNavbar, setMobileTopNavbar] = useState<any>(null);

  useEffect(() => {
    // Mark as client-side immediately
    setIsClient(true);
    
    // Load navigation components in parallel for faster loading
    const loadComponents = async () => {
      try {
        // Preload critical components immediately
        const componentPromises = [
          import('./NavBar'),
          import('./mobile-navigation'),
          import('./mobile-top-navbar')
        ];
        
        const [navBarModule, mobileNavModule, mobileTopNavModule] = await Promise.all(componentPromises);
        
        setNavBar(() => navBarModule?.default || null);
        setMobileNavigation(() => mobileNavModule?.default || null);
        setMobileTopNavbar(() => mobileTopNavModule?.default || null);
        setComponentsLoaded(true);
      } catch (error) {
        console.error('Error loading navigation components:', error);
        // Fallback to show skeleton on error
        setComponentsLoaded(false);
      }
    };

    // Use requestIdleCallback for non-blocking loading if available
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(loadComponents);
    } else {
      loadComponents();
    }
  }, []);

  // Always show skeleton during SSR and until components are loaded
  if (!isClient || !componentsLoaded || !NavBar || !MobileNavigation || !MobileTopNavbar) {
    return <NavigationSkeleton hasUser={!!initialUser} />;
  }

  // Only render actual navigation on client after components are loaded
  return (
    <>
      {/* Mobile top navbar for unauthenticated users */}
      <MobileTopNavbar />

      {/* Desktop nav (client-only) */}
      <div className="hidden md:block">
        <NavBar initialUser={initialUser} />
      </div>

      {/* Mobile nav (client-only) */}
      <div className="md:hidden">
        <MobileNavigation initialUser={initialUser} />
      </div>
    </>
  );
} 