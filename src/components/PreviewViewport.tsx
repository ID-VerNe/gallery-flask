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
  Sparkles,
  Sliders,
} from 'lucide-react';
import { PhotoGroupInfo, ToneAdjustments } from '../types';
import { api } from '../services/api';
import { getToneFilterString } from '../utils/autoTone';

interface PreviewViewportProps {
  group?: PhotoGroupInfo;
  tone?: ToneAdjustments;
  isHoldOriginal?: boolean;
  onPrev: () => void;
  onNext: () => void;
  onRate: (rating: number) => void;
  onFlag: (flag: 'pick' | 'reject' | 'none') => void;
  onOpenExternal: () => void;
  onOpenLuminar?: () => void;
  onToggleTonalAdjuster?: () => void;
  isLuminarRunning?: boolean;
  onBrowseJpg?: () => void;
}

export const PreviewViewport: React.FC<PreviewViewportProps> = ({
  group,
  tone,
  isHoldOriginal = false,
  onPrev,
  onNext,
  onRate,
  onFlag,
  onOpenExternal,
  onOpenLuminar,
  onToggleTonalAdjuster,
  isLuminarRunning = false,
  onBrowseJpg,
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
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0A0A0A] text-white/60 p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#0A0A0A] border border-white/10 flex items-center justify-center mb-4 shadow-inner">
          <Camera className="w-8 h-8 text-white stroke-[1.5]" aria-hidden="true" />
        </div>
        <h3 className="text-base font-medium text-white mb-1">尚未加载照片</h3>
        <p className="text-xs text-white/60 max-w-sm mb-5 leading-relaxed">
          选择包含 JPG 或 RAW 格式的照片文件夹，系统将自动秒级提取内嵌缩略图并开启极速选片流程。
        </p>
        {onBrowseJpg && (
          <button
            onClick={onBrowseJpg}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-white/90 text-black active:scale-[0.96] rounded-lg text-xs font-semibold shadow-lg shadow-blue-600/20 transition-transform"
            aria-label="打开文件夹开始选片"
          >
            <span>选择文件夹开始选片</span>
          </button>
        )}
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
      className={`relative flex-1 bg-[#0A0A0A] overflow-hidden flex items-center justify-center select-none ${
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
          filter: getToneFilterString(isHoldOriginal ? undefined : tone),
        }}
        className="max-h-full max-w-full object-contain pointer-events-none origin-center"
      />

      {/* Hold Original Indicator */}
      {isHoldOriginal && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#0A0A0A]/85 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-semibold text-amber-300 border border-amber-500/30 shadow-2xl flex items-center gap-2 pointer-events-none animate-pulse">
          <span>正在查看原片 (松开 \ 键恢复)</span>
        </div>
      )}

      {/* Floating EXIF capsule at Top-Right (Text selectable) */}
      {group.exif && (
        <div className="absolute top-3 right-3 bg-[#0A0A0A]/75 backdrop-blur-md px-3.5 py-2.5 rounded-xl text-xs text-white/80 flex flex-col gap-1 border border-white/10 shadow-xl pointer-events-auto select-text">
          <div className="font-semibold text-white truncate max-w-xs">
            {group.exif.cameraModel || group.exif.cameraMake || '未知相机'}
          </div>
          {group.exif.lensModel && (
            <div className="text-[11px] text-white/60 truncate max-w-xs">
              {group.exif.lensModel}
            </div>
          )}
          <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums text-white/80 mt-0.5">
            {group.exif.focalLength && <span>{group.exif.focalLength}</span>}
            {group.exif.aperture && <span>{group.exif.aperture}</span>}
            {group.exif.shutterSpeed && <span>{group.exif.shutterSpeed}</span>}
            {group.exif.iso && <span>ISO{group.exif.iso}</span>}
          </div>
          {group.exif.dateTime && (
            <div className="text-[10px] text-white/60 font-mono tabular-nums mt-0.5">
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
        className="absolute left-3 top-1/2 -translate-y-1/2 p-3 bg-[#0A0A0A]/40 hover:bg-[#0A0A0A]/80 active:scale-[0.96] text-white rounded-full transition backdrop-blur-sm pointer-events-auto opacity-70 hover:opacity-100"
        title="上一张 (A / ←)"
        aria-label="上一张照片 (快捷键 A 或 ←)"
      >
        <ChevronLeft className="w-6 h-6" aria-hidden="true" />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-[#0A0A0A]/40 hover:bg-[#0A0A0A]/80 active:scale-[0.96] text-white rounded-full transition backdrop-blur-sm pointer-events-auto opacity-70 hover:opacity-100"
        title="下一张 (D / →)"
        aria-label="下一张照片 (快捷键 D 或 →)"
      >
        <ChevronRight className="w-6 h-6" aria-hidden="true" />
      </button>

      {/* Floating Bottom Quick Action Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#0A0A0A]/80 backdrop-blur-xl px-4 py-2 rounded-full flex items-center gap-3 border border-white/15 shadow-2xl pointer-events-auto opacity-50 hover:opacity-100 transition-opacity duration-200"
      >
        {/* Rating Stars (1 to 5) */}
        <div className="flex items-center gap-1 border-r border-white/15 pr-3" role="group" aria-label="照片星级打分">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => onRate(group.rating === star ? 0 : star)}
              className="p-1 hover:scale-125 active:scale-95 transition"
              title={`评 ${star} 星 (快捷键 ${star})`}
              aria-label={`评 ${star} 星`}
              aria-pressed={group.rating >= star}
            >
              <Star
                className={`w-4 h-4 ${
                  group.rating >= star
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-white/40 hover:text-white/80'
                }`}
                aria-hidden="true"
              />
            </button>
          ))}
        </div>

        {/* Pick / Reject / Unflag */}
        <div className="flex items-center gap-1.5 border-r border-white/15 pr-3" role="group" aria-label="保留或淘汰标记">
          <button
            onClick={() => onFlag(group.flag === 'pick' ? 'none' : 'pick')}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold active:scale-[0.96] transition ${
              group.flag === 'pick'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white/10 text-white/80 hover:bg-white/20'
            }`}
            title="标记保留 (快捷键 P)"
            aria-label="标记保留 (Pick)"
            aria-pressed={group.flag === 'pick'}
          >
            <Check className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Pick</span>
          </button>
          <button
            onClick={() => onFlag(group.flag === 'reject' ? 'none' : 'reject')}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold active:scale-[0.96] transition ${
              group.flag === 'reject'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white/10 text-white/80 hover:bg-white/20'
            }`}
            title="标记淘汰 (快捷键 X)"
            aria-label="标记淘汰 (Reject)"
            aria-pressed={group.flag === 'reject'}
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Reject</span>
          </button>
        </div>

        {/* Reset Zoom */}
        <button
          onClick={() => {
            setScale(1);
            setPosition({ x: 0, y: 0 });
          }}
          className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 active:scale-[0.96] rounded-full transition"
          title="重置缩放 (双击图片亦可)"
          aria-label="重置图片缩放与平移"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
        </button>

        {/* Tonal Adjuster Toggle */}
        {onToggleTonalAdjuster && (
          <button
            onClick={onToggleTonalAdjuster}
            className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 active:scale-[0.96] text-white rounded-full text-xs font-medium transition"
            title="打开调色面板 (快捷键 E)"
            aria-label="打开调色面板"
          >
            <Sliders className="w-3.5 h-3.5 text-white" aria-hidden="true" />
            <span>调色</span>
          </button>
        )}

        {/* Luminar AI Roundtrip */}
        {onOpenLuminar && (
          <button
            onClick={onOpenLuminar}
            disabled={isLuminarRunning}
            className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/15 text-white border border-white/10 active:scale-[0.96] disabled:opacity-50 text-white rounded-full text-xs font-medium transition shadow-sm"
            title="在 Luminar AI 中修图 (点 Apply 自动保存返回)"
            aria-label="在 Luminar AI 中修图"
          >
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{isLuminarRunning ? 'Luminar 运行中...' : 'Luminar AI'}</span>
          </button>
        )}

        {/* Open in Photoshop / External app */}
        <button
          onClick={onOpenExternal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-white/90 text-black active:scale-[0.96] disabled:bg-white/10 disabled:text-white/40 disabled:cursor-not-allowed rounded-md font-medium transition-transform shadow-sm"
          title="在 Photoshop / 外部软件中打开 (快捷键 O)"
          aria-label="在修图或外部程序中打开"
        >
          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="pb-[1px]">外部打开</span>
        </button>
      </div>
    </div>
  );
};
