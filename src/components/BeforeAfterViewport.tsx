import React, { useState, useRef, useEffect } from 'react';
import {
  Columns2,
  Link,
  Star,
  Check,
  X,
  Sparkles,
  Sliders,
  RotateCcw,
} from 'lucide-react';
import { PhotoGroupInfo, ToneAdjustments } from '../types';
import { api } from '../services/api';
import { getToneFilterString } from '../utils/autoTone';

interface BeforeAfterViewportProps {
  group?: PhotoGroupInfo;
  tone?: ToneAdjustments;
  isHoldOriginal?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  onRate: (rating: number) => void;
  onFlag: (flag: 'pick' | 'reject' | 'none') => void;
  onOpenLuminar?: () => void;
  onToggleTonalAdjuster?: () => void;
  isLuminarRunning?: boolean;
}

export const BeforeAfterViewport: React.FC<BeforeAfterViewportProps> = ({
  group,
  tone,
  isHoldOriginal = false,
  onRate,
  onFlag,
  onOpenLuminar,
  onToggleTonalAdjuster,
  isLuminarRunning = false,
}) => {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const leftImgRef = useRef<HTMLImageElement>(null);
  const rightImgRef = useRef<HTMLImageElement>(null);

  // Reset zoom and pan on photo change
  useEffect(() => {
    setScale(1);
    setPos({ x: 0, y: 0 });
  }, [group?.id]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 1.15;
    const delta = e.deltaY < 0 ? zoomFactor : 1 / zoomFactor;
    const newScale = Math.min(Math.max(scale * delta, 0.2), 10);
    setScale(newScale);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pos.x, y: e.clientY - pos.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPos({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDoubleClick = () => {
    if (scale === 1) {
      setScale(2.5);
    } else {
      setScale(1);
      setPos({ x: 0, y: 0 });
    }
  };

  // Original image source (Before)
  const beforeSrc = group?.jpg?.path
    ? api.toAssetUrl(group.jpg.path)
    : group?.raw?.path
    ? api.toAssetUrl(group.raw.path)
    : null;

  // After image source: If Luminar AI edited version exists, use it; otherwise use base image with tone filter
  const hasLuminarEdit = !!group?.edited?.path;
  const afterSrc = group?.edited?.path
    ? api.toAssetUrl(group.edited.path)
    : beforeSrc;

  const toneFilter = (!hasLuminarEdit && !isHoldOriginal) ? getToneFilterString(tone) : 'none';

  if (!group || !beforeSrc) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0A0A0A] text-white/60 p-6 text-center">
        <h3 className="text-base font-medium text-white mb-1">请选择照片以进行前后对比</h3>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-[#0c0d10] relative select-none">
      {/* Top Header Control Bar */}
      <div className="h-9 bg-[#0A0A0A] border-b border-white/10 flex items-center justify-between px-3 text-xs text-white/80">
        <div className="flex items-center gap-2 font-medium">
          <Columns2 className="w-4 h-4 text-amber-400" aria-hidden="true" />
          <span>本张照片前后对照 (Before / After)</span>
          <span className="text-[11px] text-white/40">
            {hasLuminarEdit
              ? '右侧呈现 Luminar AI 精修成品'
              : '右侧呈现 WebGL 实时调色预检效果'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick open Luminar AI */}
          <button
            onClick={onOpenLuminar}
            disabled={isLuminarRunning}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-white/10 hover:bg-white/15 text-white border border-white/10 text-white rounded text-[11px] font-semibold transition active:scale-[0.96] shadow-sm disabled:opacity-50"
            title="像 PS 滤镜一样唤起 Luminar AI 进行天空替换、AI 磨皮与高级调色"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isLuminarRunning ? 'animate-spin' : ''}`} />
            <span>{isLuminarRunning ? '精修中...' : 'Luminar AI 精修'}</span>
          </button>

          {/* Toggle Tonal Adjuster */}
          <button
            onClick={onToggleTonalAdjuster}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-white/10 hover:bg-white/15 text-white/80 hover:text-white rounded text-[11px] font-medium transition active:scale-[0.96]"
            title="展开/折叠曝光与暗部提亮微调面板"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>调色面板</span>
          </button>

          {/* Reset Zoom */}
          <button
            onClick={() => {
              setScale(1);
              setPos({ x: 0, y: 0 });
            }}
            className="p-1 text-white/60 hover:text-white hover:bg-white/10 rounded transition"
            title="复位缩放与平移 (双击视口亦可)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Sync Zoom indicator */}
          <div
            className="flex items-center gap-1 px-2 py-0.5 bg-blue-600/20 text-white border border-blue-500/30 rounded text-[11px] font-medium"
            title="双图前后完全锁定同步缩放"
          >
            <Link className="w-3 h-3" />
            <span>联动锁焦</span>
          </div>
        </div>
      </div>

      {/* Dual Split Panes */}
      <div
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        className={`flex-1 flex overflow-hidden ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        {/* Left: Before (Original) */}
        <div className="relative flex-1 bg-[#0c0d10] overflow-hidden flex items-center justify-center border-r border-[#222532]">
          {beforeSrc && (
            <img
              ref={leftImgRef}
              src={beforeSrc}
              alt={`${group.baseName} Before`}
              draggable={false}
              style={{
                transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
                transition: isDragging ? 'none' : 'transform 0.05s ease-out',
                imageOrientation: 'from-image',
              }}
              className="max-h-full max-w-full object-contain pointer-events-none origin-center"
            />
          )}

          {/* Before Badge */}
          <div className="absolute top-3 left-3 bg-[#0A0A0A]/80 backdrop-blur-xl px-3 py-1.5 rounded-lg text-xs text-white/80 flex items-center gap-2 border border-white/15 shadow-xl select-text">
            <span className="font-semibold text-white">原片 (Before)</span>
            <span className="text-white/40">|</span>
            <span className="font-mono text-[11px] text-white/60">{group.baseName}</span>
          </div>
        </div>

        {/* Right: After (Adjusted or Luminar Edit) */}
        <div className="relative flex-1 bg-[#0c0d10] overflow-hidden flex items-center justify-center">
          {afterSrc && (
            <img
              ref={rightImgRef}
              src={afterSrc}
              alt={`${group.baseName} After`}
              draggable={false}
              style={{
                transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
                transition: isDragging ? 'none' : 'transform 0.05s ease-out',
                filter: toneFilter,
                imageOrientation: 'from-image',
              }}
              className="max-h-full max-w-full object-contain pointer-events-none origin-center"
            />
          )}

          {/* After Badge */}
          <div className="absolute top-3 right-3 bg-[#0A0A0A]/80 backdrop-blur-xl px-3 py-1.5 rounded-lg text-xs text-white/80 flex items-center gap-2 border border-white/15 shadow-xl select-text">
            {hasLuminarEdit ? (
              <span className="font-semibold text-purple-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Luminar AI 精修 (After)
              </span>
            ) : (
              <span className="font-semibold text-amber-400 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5" />
                实时调色预检 (After)
                {tone && tone.exposure !== 0 && (
                  <span className="font-mono text-[11px] text-amber-300 ml-1">
                    ({tone.exposure > 0 ? `+${tone.exposure.toFixed(2)}` : tone.exposure.toFixed(2)}EV)
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Floating Rating & Flag Capsule */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#0A0A0A]/80 backdrop-blur-xl px-4 py-2 rounded-full flex items-center gap-3 border border-white/15 shadow-2xl pointer-events-auto opacity-70 hover:opacity-100 transition-opacity duration-200"
      >
        {/* Rating Stars */}
        <div className="flex items-center gap-1 border-r border-white/15 pr-3" role="group" aria-label="照片星级打分">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => onRate(group.rating === star ? 0 : star)}
              className="p-1 hover:scale-125 active:scale-95 transition"
              title={`评 ${star} 星`}
            >
              <Star
                className={`w-4 h-4 ${
                  group.rating >= star
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-white/40 hover:text-white/80'
                }`}
              />
            </button>
          ))}
        </div>

        {/* Pick / Reject */}
        <div className="flex items-center gap-1.5" role="group" aria-label="保留或淘汰标记">
          <button
            onClick={() => onFlag(group.flag === 'pick' ? 'none' : 'pick')}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold active:scale-[0.96] transition ${
              group.flag === 'pick'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white/10 text-white/80 hover:bg-white/20'
            }`}
            title="保留 (Pick)"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Pick</span>
          </button>
          <button
            onClick={() => onFlag(group.flag === 'reject' ? 'none' : 'reject')}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold active:scale-[0.96] transition ${
              group.flag === 'reject'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white/10 text-white/80 hover:bg-white/20'
            }`}
            title="淘汰 (Reject)"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reject</span>
          </button>
        </div>
      </div>
    </div>
  );
};
