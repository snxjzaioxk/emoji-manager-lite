import { useState, useEffect, useRef, useCallback } from 'react';

interface VirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  getScrollElement?: () => HTMLElement | null;
}

interface VirtualScrollResult<T> {
  visibleItems: T[];
  totalHeight: number;
  offsetY: number;
  startIndex: number;
  endIndex: number;
}

export function useVirtualScroll<T>(
  items: T[],
  options: VirtualScrollOptions
): VirtualScrollResult<T> {
  const { itemHeight, containerHeight, overscan = 3, getScrollElement } = options;
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLElement | null>(null);

  // 计算可见项
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetY = startIndex * itemHeight;
  const totalHeight = items.length * itemHeight;

  // 处理滚动事件
  const handleScroll = useCallback(() => {
    const element = scrollElementRef.current;
    if (element) {
      setScrollTop(element.scrollTop);
    }
  }, []);

  // 设置滚动监听
  useEffect(() => {
    const element = getScrollElement ? getScrollElement() : scrollElementRef.current;
    if (element) {
      scrollElementRef.current = element;
      element.addEventListener('scroll', handleScroll, { passive: true });

      return () => {
        element.removeEventListener('scroll', handleScroll);
      };
    }
  }, [getScrollElement, handleScroll]);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    startIndex,
    endIndex
  };
}

// 虚拟网格滚动 Hook
interface VirtualGridOptions {
  itemWidth: number;
  itemHeight: number;
  containerWidth: number;
  containerHeight: number;
  gap?: number;
  overscan?: number;
  getScrollElement?: () => HTMLElement | null;
}

interface VirtualGridResult<T> {
  visibleItems: T[];
  totalHeight: number;
  offsetY: number;
  startIndex: number;
  endIndex: number;
  columns: number;
}

export function useVirtualGrid<T>(
  items: T[],
  options: VirtualGridOptions
): VirtualGridResult<T> {
  const {
    itemWidth,
    itemHeight,
    containerWidth,
    containerHeight,
    gap = 16,
    overscan = 2,
    getScrollElement
  } = options;

  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLElement | null>(null);

  // 计算列数
  const columns = Math.floor((containerWidth + gap) / (itemWidth + gap)) || 1;

  // 计算行数
  const rows = Math.ceil(items.length / columns);

  // 计算每行高度（包括间隙）
  const rowHeight = itemHeight + gap;

  // 计算可见行
  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endRow = Math.min(
    rows - 1,
    Math.ceil((scrollTop + containerHeight) / rowHeight) + overscan
  );

  // 计算可见项索引
  const startIndex = startRow * columns;
  const endIndex = Math.min(items.length - 1, (endRow + 1) * columns - 1);

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetY = startRow * rowHeight;
  const totalHeight = rows * rowHeight;

  // 处理滚动事件
  const handleScroll = useCallback(() => {
    const element = scrollElementRef.current;
    if (element) {
      setScrollTop(element.scrollTop);
    }
  }, []);

  // 设置滚动监听
  useEffect(() => {
    const element = getScrollElement ? getScrollElement() : scrollElementRef.current;
    if (element) {
      scrollElementRef.current = element;
      element.addEventListener('scroll', handleScroll, { passive: true });

      // 初始化滚动位置
      setScrollTop(element.scrollTop);

      return () => {
        element.removeEventListener('scroll', handleScroll);
      };
    }
  }, [getScrollElement, handleScroll]);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    startIndex,
    endIndex,
    columns
  };
}