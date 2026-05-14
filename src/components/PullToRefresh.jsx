import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * Pull-to-Refresh wrapper component for mobile.
 * Wraps content and triggers onRefresh callback on pull-down gesture.
 */
export default function PullToRefresh({ children, onRefresh, isLoading = false }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const scrollableRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (isLoading) {
      setIsRefreshing(true);
    }
  }, [isLoading]);

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    if (!scrollableRef.current) return;

    const scrollTop = scrollableRef.current.scrollTop;
    if (scrollTop === 0) {
      const distance = e.touches[0].clientY - touchStartY.current;
      if (distance > 0) {
        e.preventDefault();
        setPullDistance(Math.min(distance, 120));
      }
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 80 && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(0);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    } else {
      setPullDistance(0);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden"
      style={{ height: '100%' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className={`absolute top-0 left-0 right-0 flex justify-center items-center transition-all duration-300 ${
          pullDistance > 0 ? 'visible' : 'invisible'
        }`}
        style={{ height: `${pullDistance}px`, overflow: 'hidden' }}
      >
        <div className="flex flex-col items-center gap-2">
          <RefreshCw
            className={`h-5 w-5 text-primary transition-transform ${
              isRefreshing ? 'animate-spin' : ''
            }`}
            style={{
              transform: `rotate(${Math.min(pullDistance, 120) * 1.5}deg)`,
            }}
          />
          <span className="text-xs text-muted-foreground">
            {pullDistance > 80 ? 'Release to refresh' : 'Pull to refresh'}
          </span>
        </div>
      </div>

      {/* Scrollable content */}
      <div
        ref={scrollableRef}
        className="w-full h-full overflow-y-auto"
        style={{ transform: `translateY(${Math.max(pullDistance, 0)}px)` }}
      >
        {children}
      </div>
    </div>
  );
}