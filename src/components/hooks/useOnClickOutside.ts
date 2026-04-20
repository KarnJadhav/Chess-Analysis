// src/lib/hooks/useOnClickOutside.ts
import { useEffect, RefObject } from 'react';

type Handler = (event: MouseEvent | TouchEvent) => void;

/**
 * Custom hook that triggers a handler function when a click or touch event occurs outside of the referenced element.
 * @param {RefObject<T>} ref - The React ref object attached to the element to monitor.
 * @param {Handler} handler - The function to call when a click outside occurs.
 */
export function useOnClickOutside(
  ref: RefObject<HTMLElement | null>,
  handler: Handler
): void {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      // Do nothing if clicking ref's element or descendent elements
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}