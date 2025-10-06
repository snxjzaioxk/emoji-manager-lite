import { useEffect, useRef, useCallback, useState } from 'react';

interface ProcessImageOptions {
  targetSize?: number;
  format?: 'webp' | 'jpeg' | 'png';
  quality?: number;
}

interface ProcessResult {
  id: string;
  data?: string;
  error?: string;
}

export function useImageProcessor() {
  const workerRef = useRef<Worker | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const pendingCallbacks = useRef<Map<string, {
    resolve: (data: string) => void;
    reject: (error: Error) => void;
  }>>(new Map());

  // Initialize worker
  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/imageProcessor.worker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (event) => {
      const { type, id, data, error, progress: currentProgress, total } = event.data;

      switch (type) {
        case 'SUCCESS':
          if (id && pendingCallbacks.current.has(id)) {
            const callback = pendingCallbacks.current.get(id);
            callback?.resolve(data);
            pendingCallbacks.current.delete(id);
          }
          break;

        case 'ERROR':
          if (id && pendingCallbacks.current.has(id)) {
            const callback = pendingCallbacks.current.get(id);
            callback?.reject(new Error(error || 'Processing failed'));
            pendingCallbacks.current.delete(id);
          }
          break;

        case 'PROGRESS':
          if (currentProgress !== undefined && total !== undefined) {
            setProgress({ current: currentProgress, total });
          }
          break;
      }

      // Check if all processing is done
      if (pendingCallbacks.current.size === 0) {
        setProcessing(false);
        setProgress({ current: 0, total: 0 });
      }
    };

    workerRef.current.onerror = (error) => {
      console.error('Worker error:', error);
      // Reject all pending callbacks
      pendingCallbacks.current.forEach(callback => {
        callback.reject(new Error('Worker error'));
      });
      pendingCallbacks.current.clear();
      setProcessing(false);
    };

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  // Process single image
  const processImage = useCallback(
    (id: string, dataUrl: string, options?: ProcessImageOptions): Promise<string> => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current) {
          reject(new Error('Worker not initialized'));
          return;
        }

        setProcessing(true);
        pendingCallbacks.current.set(id, { resolve, reject });

        workerRef.current.postMessage({
          type: 'PROCESS_IMAGE',
          id,
          dataUrl,
          ...options
        });
      });
    },
    []
  );

  // Process batch of images
  const processBatch = useCallback(
    (
      images: Array<{ id: string; dataUrl: string }>,
      options?: ProcessImageOptions
    ): Promise<ProcessResult[]> => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current) {
          reject(new Error('Worker not initialized'));
          return;
        }

        setProcessing(true);
        setProgress({ current: 0, total: images.length });

        const results: ProcessResult[] = [];
        const completed = new Set<string>();

        // Set up callbacks for each image
        images.forEach(({ id }) => {
          pendingCallbacks.current.set(id, {
            resolve: (data) => {
              results.push({ id, data });
              completed.add(id);

              // Check if all done
              if (completed.size === images.length) {
                resolve(results);
              }
            },
            reject: (error) => {
              results.push({ id, error: error.message });
              completed.add(id);

              // Check if all done
              if (completed.size === images.length) {
                resolve(results);
              }
            }
          });
        });

        workerRef.current.postMessage({
          type: 'PROCESS_BATCH',
          images,
          ...options
        });
      });
    },
    []
  );

  // Cancel processing
  const cancel = useCallback((id?: string) => {
    if (!workerRef.current) return;

    workerRef.current.postMessage({
      type: 'CANCEL',
      id
    });

    if (id) {
      const callback = pendingCallbacks.current.get(id);
      callback?.reject(new Error('Cancelled'));
      pendingCallbacks.current.delete(id);
    } else {
      pendingCallbacks.current.forEach(callback => {
        callback.reject(new Error('Cancelled'));
      });
      pendingCallbacks.current.clear();
      setProcessing(false);
      setProgress({ current: 0, total: 0 });
    }
  }, []);

  return {
    processImage,
    processBatch,
    cancel,
    processing,
    progress
  };
}