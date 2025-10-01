import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Crop,
  Type,
  Palette,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  ZoomIn,
  ZoomOut,
  Download,
  Undo,
  Redo,
  Sliders,
  Sun,
  Contrast,
  Droplet,
  Zap
} from 'lucide-react';

interface ImageEditorProps {
  isOpen: boolean;
  onClose: () => void;
  imagePath: string;
  onSave?: (editedImageData: string) => Promise<void>;
}

interface EditState {
  brightness: number;
  contrast: number;
  saturation: number;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  crop: { x: number; y: number; width: number; height: number } | null;
  texts: Array<{
    id: string;
    text: string;
    x: number;
    y: number;
    fontSize: number;
    color: string;
    fontFamily: string;
  }>;
}

type EditMode = 'none' | 'crop' | 'text' | 'filter';

export const ImageEditor: React.FC<ImageEditorProps> = ({
  isOpen,
  onClose,
  imagePath,
  onSave
}) => {
  const [editMode, setEditMode] = useState<EditMode>('none');
  const [editState, setEditState] = useState<EditState>({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    rotation: 0,
    flipH: false,
    flipV: false,
    crop: null,
    texts: []
  });
  const [history, setHistory] = useState<EditState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [zoom, setZoom] = useState(100);
  const [isSaving, setIsSaving] = useState(false);
  const [imageData, setImageData] = useState<string>('');
  const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const cropStartRef = useRef<{ x: number; y: number } | null>(null);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

  // Load image
  useEffect(() => {
    if (isOpen && imagePath) {
      loadImage();
    }
  }, [isOpen, imagePath]);

  const loadImage = async () => {
    try {
      const dataUrl = await window.api?.files?.readAsDataURL?.(imagePath);
      if (dataUrl) {
        setImageData(dataUrl);
        // Load image to get dimensions
        const img = new Image();
        img.onload = () => {
          setOriginalSize({ width: img.width, height: img.height });
        };
        img.src = dataUrl;
      }
    } catch (error) {
      console.error('Failed to load image:', error);
    }
  };

  // Render canvas with current edit state
  useEffect(() => {
    if (imageData && canvasRef.current) {
      renderCanvas();
    }
  }, [imageData, editState, zoom]);

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !imageData) return;

    const img = new Image();
    img.onload = () => {
      // Set canvas size
      canvas.width = img.width;
      canvas.height = img.height;

      // Apply transformations
      ctx.save();

      // Apply filters
      ctx.filter = `brightness(${editState.brightness}%) contrast(${editState.contrast}%) saturate(${editState.saturation}%)`;

      // Center point for transformations
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      ctx.translate(centerX, centerY);
      ctx.rotate((editState.rotation * Math.PI) / 180);
      ctx.scale(
        editState.flipH ? -1 : 1,
        editState.flipV ? -1 : 1
      );
      ctx.translate(-centerX, -centerY);

      // Draw image
      if (editState.crop) {
        ctx.drawImage(
          img,
          editState.crop.x,
          editState.crop.y,
          editState.crop.width,
          editState.crop.height,
          0,
          0,
          canvas.width,
          canvas.height
        );
      } else {
        ctx.drawImage(img, 0, 0);
      }

      ctx.restore();

      // Draw texts
      editState.texts.forEach(text => {
        ctx.font = `${text.fontSize}px ${text.fontFamily}`;
        ctx.fillStyle = text.color;
        ctx.fillText(text.text, text.x, text.y);
      });

      // Draw crop overlay if in crop mode
      if (editMode === 'crop' && editState.crop) {
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(
          editState.crop.x,
          editState.crop.y,
          editState.crop.width,
          editState.crop.height
        );
      }
    };
    img.src = imageData;
  };

  const pushHistory = (newState: EditState) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setEditState(newState);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setEditState(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setEditState(history[historyIndex + 1]);
    }
  };

  const handleBrightnessChange = (value: number) => {
    pushHistory({ ...editState, brightness: value });
  };

  const handleContrastChange = (value: number) => {
    pushHistory({ ...editState, contrast: value });
  };

  const handleSaturationChange = (value: number) => {
    pushHistory({ ...editState, saturation: value });
  };

  const handleRotate = () => {
    pushHistory({ ...editState, rotation: (editState.rotation + 90) % 360 });
  };

  const handleFlipH = () => {
    pushHistory({ ...editState, flipH: !editState.flipH });
  };

  const handleFlipV = () => {
    pushHistory({ ...editState, flipV: !editState.flipV });
  };

  const handleAddText = () => {
    const newText = {
      id: Date.now().toString(),
      text: '双击编辑文字',
      x: 50,
      y: 50,
      fontSize: 24,
      color: '#FFFFFF',
      fontFamily: 'Arial'
    };
    pushHistory({
      ...editState,
      texts: [...editState.texts, newText]
    });
    setSelectedTextId(newText.id);
  };

  const handleSave = async () => {
    if (!canvasRef.current) return;

    setIsSaving(true);
    try {
      const dataUrl = canvasRef.current.toDataURL('image/png');

      if (onSave) {
        await onSave(dataUrl);
      }

      onClose();
    } catch (error) {
      console.error('Failed to save image:', error);
      alert('保存失败: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (editMode === 'text') {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        handleAddText();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg w-full h-full max-w-[95vw] max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Palette className="w-5 h-5" />
            图片编辑器
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Toolbar */}
          <div className="w-16 bg-gray-800 border-r border-gray-700 flex flex-col items-center py-4 gap-2">
            <button
              onClick={() => setEditMode(editMode === 'crop' ? 'none' : 'crop')}
              className={`p-3 rounded hover:bg-gray-700 transition-colors ${
                editMode === 'crop' ? 'bg-blue-600' : ''
              }`}
              title="裁剪"
            >
              <Crop className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={() => setEditMode(editMode === 'text' ? 'none' : 'text')}
              className={`p-3 rounded hover:bg-gray-700 transition-colors ${
                editMode === 'text' ? 'bg-blue-600' : ''
              }`}
              title="添加文字"
            >
              <Type className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={() => setEditMode(editMode === 'filter' ? 'none' : 'filter')}
              className={`p-3 rounded hover:bg-gray-700 transition-colors ${
                editMode === 'filter' ? 'bg-blue-600' : ''
              }`}
              title="滤镜"
            >
              <Sliders className="w-5 h-5 text-white" />
            </button>

            <div className="my-4 w-full border-t border-gray-700" />

            <button
              onClick={handleRotate}
              className="p-3 rounded hover:bg-gray-700 transition-colors"
              title="旋转90度"
            >
              <RotateCw className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={handleFlipH}
              className="p-3 rounded hover:bg-gray-700 transition-colors"
              title="水平翻转"
            >
              <FlipHorizontal className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={handleFlipV}
              className="p-3 rounded hover:bg-gray-700 transition-colors"
              title="垂直翻转"
            >
              <FlipVertical className="w-5 h-5 text-white" />
            </button>

            <div className="my-4 w-full border-t border-gray-700" />

            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="p-3 rounded hover:bg-gray-700 transition-colors disabled:opacity-30"
              title="撤销"
            >
              <Undo className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="p-3 rounded hover:bg-gray-700 transition-colors disabled:opacity-30"
              title="重做"
            >
              <Redo className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 flex flex-col bg-gray-950">
            {/* Canvas Controls */}
            <div className="p-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoom(Math.max(25, zoom - 25))}
                  className="p-2 rounded hover:bg-gray-700"
                >
                  <ZoomOut className="w-4 h-4 text-white" />
                </button>
                <span className="text-sm text-gray-300 w-16 text-center">{zoom}%</span>
                <button
                  onClick={() => setZoom(Math.min(400, zoom + 25))}
                  className="p-2 rounded hover:bg-gray-700"
                >
                  <ZoomIn className="w-4 h-4 text-white" />
                </button>
              </div>
              <div className="text-sm text-gray-400">
                {originalSize.width} × {originalSize.height} px
              </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-4">
              <div style={{ transform: `scale(${zoom / 100})` }}>
                <canvas
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  className="border border-gray-700 max-w-full max-h-full"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>
            </div>
          </div>

          {/* Side Panel */}
          {editMode !== 'none' && (
            <div className="w-80 bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto">
              {editMode === 'filter' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-white mb-4">滤镜调整</h3>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm text-gray-300 flex items-center gap-2">
                        <Sun className="w-4 h-4" />
                        亮度
                      </label>
                      <span className="text-sm text-white">{editState.brightness}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={editState.brightness}
                      onChange={(e) => handleBrightnessChange(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm text-gray-300 flex items-center gap-2">
                        <Contrast className="w-4 h-4" />
                        对比度
                      </label>
                      <span className="text-sm text-white">{editState.contrast}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={editState.contrast}
                      onChange={(e) => handleContrastChange(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm text-gray-300 flex items-center gap-2">
                        <Droplet className="w-4 h-4" />
                        饱和度
                      </label>
                      <span className="text-sm text-white">{editState.saturation}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={editState.saturation}
                      onChange={(e) => handleSaturationChange(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <button
                    onClick={() => {
                      pushHistory({
                        ...editState,
                        brightness: 100,
                        contrast: 100,
                        saturation: 100
                      });
                    }}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
                  >
                    重置滤镜
                  </button>
                </div>
              )}

              {editMode === 'text' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white mb-4">文字工具</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    点击画布添加文字，双击文字可编辑
                  </p>
                  <button
                    onClick={handleAddText}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    添加文字
                  </button>

                  {editState.texts.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <h4 className="text-sm font-medium text-gray-300">文字列表</h4>
                      {editState.texts.map(text => (
                        <div
                          key={text.id}
                          className={`p-2 rounded cursor-pointer ${
                            selectedTextId === text.id
                              ? 'bg-blue-900 border border-blue-600'
                              : 'bg-gray-700 hover:bg-gray-600'
                          }`}
                          onClick={() => setSelectedTextId(text.id)}
                        >
                          <p className="text-sm text-white truncate">{text.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {editMode === 'crop' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white mb-4">裁剪工具</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    在画布上拖动以选择裁剪区域
                  </p>
                  <button
                    onClick={() => {
                      pushHistory({ ...editState, crop: null });
                    }}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
                  >
                    重置裁剪
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex items-center justify-between bg-gray-900">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                保存
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};