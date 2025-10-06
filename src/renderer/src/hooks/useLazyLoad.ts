import { useState, useEffect, useRef, useCallback } from 'react';
import { EmojiItem } from '../../../shared/types';

interface UseLazyLoadOptions {
  pageSize?: number;
  threshold?: number;
}

export function useLazyLoad<T extends EmojiItem>(
  items: T[],
  options: UseLazyLoadOptions = {}
) {
  const { pageSize = 50, threshold = 100 } = options;
  const [displayedItems, setDisplayedItems] = useState<T[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Initial load
  useEffect(() => {
    if (items.length > 0) {
      setDisplayedItems(items.slice(0, pageSize));
      setCurrentPage(1);
    }
  }, [items, pageSize]);

  // Load more items
  const loadMore = useCallback(() => {
    if (isLoading) return;

    const startIndex = currentPage * pageSize;
    const endIndex = startIndex + pageSize;

    if (startIndex < items.length) {
      setIsLoading(true);

      // Simulate async loading
      setTimeout(() => {
        const newItems = items.slice(startIndex, endIndex);
        setDisplayedItems(prev => [...prev, ...newItems]);
        setCurrentPage(prev => prev + 1);
        setIsLoading(false);
      }, 100);
    }
  }, [currentPage, items, pageSize, isLoading]);

  // Setup intersection observer
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: `${threshold}px` }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMore, threshold]);

  return {
    displayedItems,
    isLoading,
    loadMoreRef,
    hasMore: displayedItems.length < items.length,
    reset: () => {
      setDisplayedItems(items.slice(0, pageSize));
      setCurrentPage(1);
    }
  };
}