import React, { useState } from 'react';
import { Columns2, Link, Unlink, Star, Check, X, Pin, ArrowLeftRight } from 'lucide-react';
import { PhotoGroupInfo } from '../types';
import { api } from '../services/api';

interface SplitCompareViewportProps {
  leftGroup?: PhotoGroupInfo;
  rightGroup?: PhotoGroupInfo;
  isLeftPinned: boolean;
  isRightPinned: boolean;
  onTogglePinLeft: () => void;
  onTogglePinRight: () => void;
  onSwap: () => void;
  onRate: (group: PhotoGroupInfo, rating: number) => void;
  onFlag: (group: PhotoGroupInfo, flag: 'pick' | 'reject' | 'none') => void;
  onSelectLeft: () => void;
  onSelectRight: () => void;
}

export const SplitCompareViewport: React.FC<SplitCompareViewportProps> = ({
  leftGroup,
  rightGroup,
  isLeftPinned,
  isRightPinned,
  onTogglePinLeft,
  onTogglePinRight,
  onSwap,
  onRate,
  onFlag,
  onSelectLeft,
  onSelectRight,
}) => {
  const [syncZoom, setSyncZoom] = useState(true);
  const [leftScale, setLeftScale] = useState(1);
  const [leftPos, setLeftPos] = useState({ x: 0, y: 0 });
  const [rightScale, setRightScale] = useState(1);
  const [rightPos, setRightPos] = useState({ x: 0, y: 0 });

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [activePane, setActivePane] = useState<'left' | 'right' | null>(null);

  const handleWheel = (isLeft: boolean, e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 1.15;
    const delta = e.deltaY < 0 ? zoomFactor : 1 / zoomFactor;

    if (syncZoom) {
      const newScale = Math.min(Math.max(leftScale * delta, 0.2), 10);
      setLeftScale(newScale);
      setRightScale(newScale);
    } else if (isLeft) {
      setLeftScale((s) => Math.min(Math.max(s * delta, 0.2), 10));
    } else {
      setRightScale((s) => Math.min(Math.max(s * delta, 0.2), 10));
    }
  };

  // Left-click mouse drag pan
  const handleMouseDown = (isLeft: boolean, e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setActivePane(isLeft ? 'left' : 'right');
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !activePane) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setDragStart({ x: e.clientX, y: e.clientY });

    if (syncZoom) {
      // Synchronously pan both viewports
      setLeftPos((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      setRightPos((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    } else if (activePane === 'left') {
      setLeftPos((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    } else {
      setRightPos((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setActivePane(null);
  };

  // Double click to toggle 100% (2.5x) / Fit (1.0x) and center
  const handleDoubleClick = (isLeft: boolean) => {
    const currentScale = isLeft ? leftScale : rightScale;
    const targetScale = currentScale === 1 ? 2.5 : 1;
    if (syncZoom) {
      setLeftScale(targetScale);
      setRightScale(targetScale);
      setLeftPos({ x: 0, y: 0 });
      setRightPos({ x: 0, y: 0 });
    } else if (isLeft) {
      setLeftScale(targetScale);
      setLeftPos({ x: 0, y: 0 });
    } else {
      setRightScale(targetScale);
      setRightPos({ x: 0, y: 0 });
    }
  };

  const renderPane = (
    group: PhotoGroupInfo | undefined,
    isLeft: boolean,
    scale: number,
    pos: { x: number; y: number },
    onSelect: () => void,
  ) => {
    const src = group?.jpg?.path
      ? api.toAssetUrl(group.jpg.path)
      : group?.raw?.path
      ? api.toAssetUrl(group.raw.path)
      : null;

    if (!group || !src) {
      return (
        <div className="flex-1 bg-[#101115] flex items-center justify-center text-white/40 text-xs">
          未选择对比照片
        </div>
      );
    }

    const isPinned = isLeft ? isLeftPinned : isRightPinned;
    const onTogglePin = isLeft ? onTogglePinLeft : onTogglePinRight;
    const shortcutHint = isLeft ? '[ 或 B' : '] 或 空格';

    return (
      <div
        onClick={onSelect}
        onWheel={(e) => handleWheel(isLeft, e)}
        onMouseDown={(e) => handleMouseDown(isLeft, e)}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={() => handleDoubleClick(isLeft)}
        className={`relative flex-1 bg-[#0c0d10] overflow-hidden flex items-center justify-center border-r border-[#20222a] last:border-r-0 select-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        } ${isPinned ? 'ring-2 ring-inset ring-amber-500/40' : ''}`}
      >
        <img
          src={src}
          alt={group.baseName}
          draggable={false}
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.05s ease-out',
            imageOrientation: 'from-image',
          }}
          className="max-h-full max-w-full object-contain pointer-events-none origin-center"
        />

        {/* Top title, Reference status & Pin button */}
        <div className="absolute top-3 left-3 flex items-center gap-2 select-none pointer-events-auto">
          <div className="bg-[#0A0A0A]/80 backdrop-blur px-3 py-1.5 rounded-lg text-xs text-white flex items-center gap-2 border border-white/10 select-text shadow-lg">
            <span className="font-mono font-medium">{group.baseName}</span>
            {group.exif && (
              <span className="text-[11px] text-white/60 font-mono tabular-nums">
                {[group.exif.focalLength, group.exif.aperture, group.exif.shutterSpeed, group.exif.iso ? `ISO${group.exif.iso}` : null]
                  .filter(Boolean)
                  .join(' ')}
              </span>
            )}
          </div>

          {/* Reference / Candidate badge & Pin trigger */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin();
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition shadow-lg ${
              isPinned
                ? 'bg-amber-500 text-black font-semibold ring-1 ring-amber-400'
                : 'bg-[#0A0A0A]/80 hover:bg-white/10 text-white/80 hover:text-white border border-white/15'
            }`}
            title={isPinned ? `已锁定为基准 (按 B 或对应键取消)` : `点击锁定为固定对比基准 (快捷键: ${shortcutHint})`}
          >
            <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-black' : ''}`} />
            <span className="pb-[1px]">{isPinned ? '基准参考 (固定)' : `设为基准 (${shortcutHint})`}</span>
          </button>
        </div>

        {/* Bottom ratings */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-3 bg-[#0A0A0A]/80 backdrop-blur px-3.5 py-1.5 rounded-full flex items-center gap-2.5 border border-white/15 shadow-xl pointer-events-auto"
          role="group"
          aria-label={`为照片 ${group.baseName} 打分和标记`}
        >
          {/* Stars */}
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => onRate(group, group.rating === star ? 0 : star)}
                className="p-1 hover:scale-125 active:scale-95 transition"
                title={`评 ${star} 星`}
                aria-label={`评 ${star} 星`}
                aria-pressed={group.rating >= star}
              >
                <Star
                  className={`w-3.5 h-3.5 ${
                    group.rating >= star
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-white/40 hover:text-white/80'
                  }`}
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>

          <div className="w-px h-3.5 bg-white/20" />

          {/* Pick / Reject */}
          <button
            onClick={() => onFlag(group, group.flag === 'pick' ? 'none' : 'pick')}
            className={`p-1.5 rounded-full text-xs active:scale-[0.96] transition ${
              group.flag === 'pick'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
            title="保留 (Pick)"
            aria-label="标记保留 (Pick)"
            aria-pressed={group.flag === 'pick'}
          >
            <Check className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <button
            onClick={() => onFlag(group, group.flag === 'reject' ? 'none' : 'reject')}
            className={`p-1.5 rounded-full text-xs active:scale-[0.96] transition ${
              group.flag === 'reject'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
            title="淘汰 (Reject)"
            aria-label="标记淘汰 (Reject)"
            aria-pressed={group.flag === 'reject'}
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-[#0c0d10] relative">
      {/* Top Sync & Compare Control Bar */}
      <div className="h-9 bg-[#0A0A0A] border-b border-white/10 flex items-center justify-between px-3 text-xs text-white/80 select-none">
        <div className="flex items-center gap-2 font-medium">
          <Columns2 className="w-4 h-4 text-white" aria-hidden="true" />
          <span>双图对比视图</span>
          <span className="text-[11px] text-white/40">
            ({isLeftPinned ? '左图为基准，流动切换右图' : isRightPinned ? '右图为基准，流动切换左图' : '点击“设为基准”固定任意一张对比'})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Swap A/B button */}
          <button
            onClick={onSwap}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-white/10 hover:bg-white/15 text-white/80 hover:text-white rounded text-[11px] font-medium transition"
            title="对调左右两张照片 (快捷键 S)"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-white" />
            <span className="pb-[1px]">左右互换 (S)</span>
          </button>

          {/* Reset View button */}
          <button
            onClick={() => {
              setLeftScale(1);
              setRightScale(1);
              setLeftPos({ x: 0, y: 0 });
              setRightPos({ x: 0, y: 0 });
            }}
            className="px-2 py-1 bg-white/10 hover:bg-white/15 text-white/80 hover:text-white rounded text-[11px] transition"
            title="复位缩放与平移 (亦可直接双击照片)"
          >
            复位
          </button>

          {/* Sync Zoom toggle */}
          <button
            onClick={() => setSyncZoom(!syncZoom)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium active:scale-[0.96] transition-transform ${
              syncZoom
                ? 'bg-white text-black font-medium shadow-sm'
                : 'bg-white/5 text-white/60 hover:text-white'
            }`}
            title="开启后双图同步缩放和平移"
            aria-label="切换双图联动同步缩放"
            aria-pressed={syncZoom}
          >
            {syncZoom ? <Link className="w-3 h-3" aria-hidden="true" /> : <Unlink className="w-3 h-3" aria-hidden="true" />}
            <span className="pb-[1px]">{syncZoom ? '联动同步开启' : '独立缩放'}</span>
          </button>
        </div>
      </div>

      {/* Side-by-side Panes */}
      <div className="flex-1 flex overflow-hidden select-none">
        {renderPane(leftGroup, true, leftScale, leftPos, onSelectLeft)}
        {renderPane(rightGroup, false, rightScale, rightPos, onSelectRight)}
      </div>
    </div>
  );
};
