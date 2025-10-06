/**
 * Image Processing Web Worker
 * Handles heavy image processing tasks off the main thread
 */

interface ProcessImageMessage {
  type: 'PROCESS_IMAGE';
  id: string;
  dataUrl: string;
  targetSize?: number;
  format?: 'webp' | 'jpeg' | 'png';
  quality?: number;
}

interface ProcessBatchMessage {
  type: 'PROCESS_BATCH';
  images: Array<{
    id: string;
    dataUrl: string;
  }>;
  targetSize?: number;
  format?: 'webp' | 'jpeg' | 'png';
  quality?: number;
}

interface CancelMessage {
  type: 'CANCEL';
  id?: string;
}

type WorkerMessage = ProcessImageMessage | ProcessBatchMessage | CancelMessage;

interface WorkerResponse {
  type: 'SUCCESS' | 'ERROR' | 'PROGRESS';
  id?: string;
  data?: string;
  error?: string;
  progress?: number;
  total?: number;
}

// Track active processing
const activeProcessing = new Set<string>();

// Process single image
async function processImage(
  id: string,
  dataUrl: string,
  targetSize = 150,
  format: 'webp' | 'jpeg' | 'png' = 'webp',
  quality = 75
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!activeProcessing.has(id)) return reject(new Error('Cancelled'));

    const img = new Image();

    img.onload = () => {
      if (!activeProcessing.has(id)) return reject(new Error('Cancelled'));

      const canvas = new OffscreenCanvas(targetSize, targetSize);
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Failed to get canvas context'));

      // Calculate scaling
      const scale = Math.min(targetSize / img.width, targetSize / img.height);
      const width = img.width * scale;
      const height = img.height * scale;
      const x = (targetSize - width) / 2;
      const y = (targetSize - height) / 2;

      // Draw scaled image centered
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, targetSize, targetSize);
      ctx.drawImage(img, x, y, width, height);

      // Convert to blob
      canvas.convertToBlob({
        type: `image/${format}`,
        quality: quality / 100
      }).then(blob => {
        if (!activeProcessing.has(id)) return reject(new Error('Cancelled'));

        const reader = new FileReader();
        reader.onload = () => {
          resolve(reader.result as string);
        };
        reader.onerror = () => reject(new Error('Failed to read blob'));
        reader.readAsDataURL(blob);
      }).catch(reject);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

// Handle messages
self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;

  switch (message.type) {
    case 'PROCESS_IMAGE': {
      const { id, dataUrl, targetSize, format, quality } = message;
      activeProcessing.add(id);

      try {
        const result = await processImage(id, dataUrl, targetSize, format, quality);

        if (activeProcessing.has(id)) {
          self.postMessage({
            type: 'SUCCESS',
            id,
            data: result
          } as WorkerResponse);
        }
      } catch (error) {
        if (activeProcessing.has(id)) {
          self.postMessage({
            type: 'ERROR',
            id,
            error: error instanceof Error ? error.message : 'Processing failed'
          } as WorkerResponse);
        }
      } finally {
        activeProcessing.delete(id);
      }
      break;
    }

    case 'PROCESS_BATCH': {
      const { images, targetSize, format, quality } = message;
      const total = images.length;

      for (let i = 0; i < images.length; i++) {
        const { id, dataUrl } = images[i];

        if (!activeProcessing.has('batch')) {
          break; // Batch cancelled
        }

        activeProcessing.add(id);

        try {
          const result = await processImage(id, dataUrl, targetSize, format, quality);

          self.postMessage({
            type: 'SUCCESS',
            id,
            data: result
          } as WorkerResponse);
        } catch (error) {
          self.postMessage({
            type: 'ERROR',
            id,
            error: error instanceof Error ? error.message : 'Processing failed'
          } as WorkerResponse);
        } finally {
          activeProcessing.delete(id);
        }

        // Report progress
        self.postMessage({
          type: 'PROGRESS',
          progress: i + 1,
          total
        } as WorkerResponse);
      }
      break;
    }

    case 'CANCEL': {
      if (message.id) {
        activeProcessing.delete(message.id);
      } else {
        activeProcessing.clear();
      }
      break;
    }
  }
});

// Export for TypeScript
export {};