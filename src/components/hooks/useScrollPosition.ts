// src/lib/hooks/useScrollPosition.ts
import { useState, useEffect } from 'react';

/**
 * Custom hook to determine if the user has scrolled past a specific threshold.
 * @param {number} [threshold=10] - The scroll position in pixels to trigger the scrolled state.
 * @returns {boolean} - True if the window's Y scroll position is greater than the threshold, false otherwise.
 */
export const useScrollPosition = (threshold = 10): boolean => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > threshold);
    };

    // Add event listener on mount
    window.addEventListener('scroll', handleScroll);

    // Call handler once on mount to set initial state
    handleScroll();

    // Clean up event listener on unmount
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return isScrolled;
};