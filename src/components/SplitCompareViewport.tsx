import React, { useState } from 'react';
import { Columns2, Link, Unlink, Star, Check, X } from 'lucide-react';
import { PhotoGroupInfo } from '../types';
import { api } from '../services/api';

interface SplitCompareViewportProps {
  leftGroup?: PhotoGroupInfo;
  rightGroup?: PhotoGroupInfo;
  onRate: (group: PhotoGroupInfo, rating: number) => void;
  onFlag: (group: PhotoGroupInfo, flag: 'pick' | 'reject' | 'none') => void;
  onSelectLeft: () => void;
  onSelectRight: () => void;
}

export const SplitCompareViewport: React.FC<SplitCompareViewportProps> = ({
  leftGroup,
  rightGroup,
  onRate,
  onFlag,
  onSelectLeft,
  onSelectRight,
}) => {
  const [syncZoom, setSyncZoom] = useState(true);
  const [leftScale, setLeftScale] = useState(1);
  const [leftPos] = useState({ x: 0, y: 0 });
  const [rightScale, setRightScale] = useState(1);
  const [rightPos] = useState({ x: 0, y: 0 });

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
        <div className="flex-1 bg-[#101115] flex items-center justify-center text-gray-500 text-xs">
          未选择对比照片
        </div>
      );
    }

    return (
      <div
        onClick={onSelect}
        onWheel={(e) => handleWheel(isLeft, e)}
        className="relative flex-1 bg-[#0c0d10] overflow-hidden flex items-center justify-center border-r border-[#20222a] last:border-r-0 cursor-crosshair"
      >
        <img
          src={src}
          alt={group.baseName}
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
            transition: 'transform 0.05s ease-out',
          }}
          className="max-h-full max-w-full object-contain pointer-events-none origin-center"
        />

        {/* Top title & metadata */}
        <div className="absolute top-3 left-3 bg-black/70 backdrop-blur px-2.5 py-1.5 rounded text-xs text-white flex items-center gap-2 border border-white/10">
          <span className="font-mono font-medium">{group.baseName}</span>
          {group.exif && (
            <span className="text-[10px] text-gray-400 font-mono">
              {[group.exif.focalLength, group.exif.aperture, group.exif.shutterSpeed, group.exif.iso ? `ISO${group.exif.iso}` : null]
                .filter(Boolean)
                .join(' ')}
            </span>
          )}
        </div>

        {/* Bottom ratings */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-3 bg-black/75 backdrop-blur px-3 py-1 rounded-full flex items-center gap-2 border border-white/10"
        >
          {/* Stars */}
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => onRate(group, group.rating === star ? 0 : star)}
                className="p-0.5 hover:scale-125 transition"
              >
                <Star
                  className={`w-3.5 h-3.5 ${
                    group.rating >= star
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Pick / Reject */}
          <button
            onClick={() => onFlag(group, group.flag === 'pick' ? 'none' : 'pick')}
            className={`p-1 rounded text-xs ${
              group.flag === 'pick'
                ? 'bg-green-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
            title="Pick"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onFlag(group, group.flag === 'reject' ? 'none' : 'reject')}
            className={`p-1 rounded text-xs ${
              group.flag === 'reject'
                ? 'bg-red-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
            title="Reject"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-[#0c0d10] relative select-none">
      {/* Top Sync Control Bar */}
      <div className="h-8 bg-[#14151a] border-b border-[#242731] flex items-center justify-between px-3 text-xs text-gray-300">
        <div className="flex items-center gap-1.5 font-medium">
          <Columns2 className="w-4 h-4 text-blue-400" />
          <span>双图对比视图 (A / B 对比)</span>
        </div>

        <button
          onClick={() => setSyncZoom(!syncZoom)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition ${
            syncZoom
              ? 'bg-blue-600/80 text-white'
              : 'bg-[#252834] text-gray-400 hover:text-gray-200'
          }`}
          title="开启后双图同步缩放和平移"
        >
          {syncZoom ? <Link className="w-3 h-3" /> : <Unlink className="w-3 h-3" />}
          <span>{syncZoom ? '联动同步已开启' : '独立缩放'}</span>
        </button>
      </div>

      {/* Side-by-side Panes */}
      <div className="flex-1 flex overflow-hidden">
        {renderPane(leftGroup, true, leftScale, leftPos, onSelectLeft)}
        {renderPane(rightGroup, false, rightScale, rightPos, onSelectRight)}
      </div>
    </div>
  );
};
