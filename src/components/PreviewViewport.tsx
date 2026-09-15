import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Star,
  Check,
  X,
  ExternalLink,
  Camera,
  RotateCcw,
} from 'lucide-react';
import { PhotoGroupInfo } from '../types';
import { api } from '../services/api';

interface PreviewViewportProps {
  group?: PhotoGroupInfo;
  onPrev: () => void;
  onNext: () => void;
  onRate: (rating: number) => void;
  onFlag: (flag: 'pick' | 'reject' | 'none') => void;
  onOpenExternal: () => void;
}

export const PreviewViewport: React.FC<PreviewViewportProps> = ({
  group,
  onPrev,
  onNext,
  onRate,
  onFlag,
  onOpenExternal,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Reset zoom & pan when image changes
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [group?.id]);

  // Handle Wheel Zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 1.15;
    const newScale = e.deltaY < 0 ? scale * zoomFactor : scale / zoomFactor;
    // Clamp scale between 0.2x and 10x
    const clampedScale = Math.min(Math.max(newScale, 0.2), 10);
    setScale(clampedScale);
  }, [scale]);

  // Handle Pan Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Double click to toggle 100% / Fit
  const handleDoubleClick = () => {
    if (scale === 1) {
      setScale(2.5);
    } else {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  };

  const imageSrc = group?.jpg?.path
    ? api.toAssetUrl(group.jpg.path)
    : group?.raw?.path
    ? api.toAssetUrl(group.raw.path)
    : null;

  if (!group || !imageSrc) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0e0f13] text-gray-500 select-none">
        <Camera className="w-12 h-12 stroke-[1.5] mb-2 opacity-50" />
        <p className="text-sm">请选择文件夹并加载照片</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      className={`relative flex-1 bg-[#0e0f13] overflow-hidden flex items-center justify-center select-none ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
    >
      {/* Zoomable Image */}
      <img
        src={imageSrc}
        alt={group.baseName}
        draggable={false}
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transition: isDragging ? 'none' : 'transform 0.08s ease-out',
        }}
        className="max-h-full max-w-full object-contain pointer-events-none origin-center"
      />

      {/* Floating EXIF capsule at Top-Right */}
      {group.exif && (
        <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md px-3 py-2 rounded-lg text-xs text-gray-300 flex flex-col gap-1 border border-white/10 shadow-lg pointer-events-auto">
          <div className="font-semibold text-white truncate max-w-xs">
            {group.exif.cameraModel || group.exif.cameraMake || '未知相机'}
          </div>
          {group.exif.lensModel && (
            <div className="text-[11px] text-gray-400 truncate max-w-xs">
              {group.exif.lensModel}
            </div>
          )}
          <div className="flex items-center gap-2 text-[11px] font-mono text-gray-300 mt-0.5">
            {group.exif.focalLength && <span>{group.exif.focalLength}</span>}
            {group.exif.aperture && <span>{group.exif.aperture}</span>}
            {group.exif.shutterSpeed && <span>{group.exif.shutterSpeed}</span>}
            {group.exif.iso && <span>ISO{group.exif.iso}</span>}
          </div>
          {group.exif.dateTime && (
            <div className="text-[10px] text-gray-400 font-mono mt-0.5">
              {group.exif.dateTime}
            </div>
          )}
        </div>
      )}

      {/* Navigation Overlay Buttons */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onPrev();
        }}
        className="absolute left-3 top-1/2 -translate-y-1/2 p-3 bg-black/40 hover:bg-black/80 text-white rounded-full transition backdrop-blur-sm pointer-events-auto opacity-70 hover:opacity-100"
        title="上一张 (A / ←)"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-black/40 hover:bg-black/80 text-white rounded-full transition backdrop-blur-sm pointer-events-auto opacity-70 hover:opacity-100"
        title="下一张 (D / →)"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Floating Bottom Quick Action Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/75 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-3 border border-white/10 shadow-xl pointer-events-auto"
      >
        {/* Rating Stars (1 to 5) */}
        <div className="flex items-center gap-1 border-r border-white/15 pr-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => onRate(group.rating === star ? 0 : star)}
              className="p-1 hover:scale-125 transition"
              title={`评 ${star} 星 (快捷键 ${star})`}
            >
              <Star
                className={`w-4 h-4 ${
                  group.rating >= star
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>

        {/* Pick / Reject / Unflag */}
        <div className="flex items-center gap-1.5 border-r border-white/15 pr-3">
          <button
            onClick={() => onFlag(group.flag === 'pick' ? 'none' : 'pick')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition ${
              group.flag === 'pick'
                ? 'bg-green-600 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
            title="标记保留 (快捷键 P)"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Pick</span>
          </button>
          <button
            onClick={() => onFlag(group.flag === 'reject' ? 'none' : 'reject')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition ${
              group.flag === 'reject'
                ? 'bg-red-600 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
            title="标记淘汰 (快捷键 X)"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reject</span>
          </button>
        </div>

        {/* Reset Zoom */}
        <button
          onClick={() => {
            setScale(1);
            setPosition({ x: 0, y: 0 });
          }}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition"
          title="重置缩放 (双击图片亦可)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Open in Photoshop / External app */}
        <button
          onClick={onOpenExternal}
          className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-xs font-medium transition"
          title="在 Photoshop / 外部软件中打开 (快捷键 O)"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>打开 RAW</span>
        </button>
      </div>
    </div>
  );
};
