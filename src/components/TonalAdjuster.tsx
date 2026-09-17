import React, { useState } from 'react';
import {
  Wand2,
  RotateCcw,
  Save,
  Sliders,
  SunMedium,
  Contrast,
  Thermometer,
  CloudSun,
  X,
} from 'lucide-react';
import { ToneAdjustments } from '../types';
import { DEFAULT_TONE } from '../utils/autoTone';

interface TonalAdjusterProps {
  tone: ToneAdjustments;
  onChange: (tone: ToneAdjustments) => void;
  onAutoTone?: () => void;
  onAuto?: () => void;
  onReset?: () => void;
  onSaveXmp: () => void;
  onClose: () => void;
  isSaving?: boolean;
}

export const TonalAdjuster: React.FC<TonalAdjusterProps> = ({
  tone,
  onChange,
  onAutoTone,
  onAuto,
  onReset,
  onSaveXmp,
  onClose,
  isSaving = false,
}) => {
  const [saveFeedback, setSaveFeedback] = useState(false);

  const handleSlider = (field: keyof ToneAdjustments, value: number) => {
    onChange({
      ...tone,
      [field]: value,
    });
  };

  const handleReset = () => {
    if (onReset) {
      onReset();
    } else {
      onChange({ ...DEFAULT_TONE });
    }
  };

  const triggerAutoTone = () => {
    if (onAuto) onAuto();
    else if (onAutoTone) onAutoTone();
  };

  const handleSaveClick = async () => {
    onSaveXmp();
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2000);
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="bg-[#0A0A0A] border-l border-white/10 h-full w-full p-5 text-xs flex flex-col gap-6"
      role="region"
      aria-label="快速调色控制面板"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2 font-medium text-white">
          <Sliders className="w-4 h-4 text-white/60" aria-hidden="true" />
          <span>调色</span>
        </div>
        <button
          onClick={onClose}
          className="text-white/60 hover:text-white p-1 rounded-md hover:bg-white/5 transition"
          title="关闭面板"
          aria-label="关闭面板"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* Sliders Container */}
      <div className="flex flex-col gap-4">
        {/* Exposure */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-white/80">
            <span className="flex items-center gap-1.5">
              <SunMedium className="w-3.5 h-3.5 text-white/40" aria-hidden="true" />
              曝光
            </span>
            <span className="font-mono text-[11px] tabular-nums text-white/60">
              {tone.exposure >= 0 ? `+${tone.exposure.toFixed(2)}` : tone.exposure.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="-3"
            max="3"
            step="0.05"
            value={tone.exposure}
            onChange={(e) => handleSlider('exposure', parseFloat(e.target.value))}
            className="w-full accent-white bg-white/10 rounded-lg h-1 cursor-pointer"
            aria-label="曝光"
          />
        </div>

        {/* Shadows */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-white/80">
            <span className="flex items-center gap-1.5">
              <CloudSun className="w-3.5 h-3.5 text-white/40" aria-hidden="true" />
              阴影
            </span>
            <span className="font-mono text-[11px] tabular-nums text-white/60">
              {tone.shadows >= 0 ? `+${Math.round(tone.shadows)}` : Math.round(tone.shadows)}
            </span>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            step="1"
            value={tone.shadows}
            onChange={(e) => handleSlider('shadows', parseFloat(e.target.value))}
            className="w-full accent-white bg-white/10 rounded-lg h-1 cursor-pointer"
            aria-label="阴影"
          />
        </div>

        {/* Highlights */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-white/80">
            <span className="flex items-center gap-1.5">
              <SunMedium className="w-3.5 h-3.5 text-white/40" aria-hidden="true" />
              高光
            </span>
            <span className="font-mono text-[11px] tabular-nums text-white/60">
              {tone.highlights >= 0 ? `+${Math.round(tone.highlights)}` : Math.round(tone.highlights)}
            </span>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            step="1"
            value={tone.highlights}
            onChange={(e) => handleSlider('highlights', parseFloat(e.target.value))}
            className="w-full accent-white bg-white/10 rounded-lg h-1 cursor-pointer"
            aria-label="高光"
          />
        </div>

        {/* Temperature */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-white/80">
            <span className="flex items-center gap-1.5">
              <Thermometer className="w-3.5 h-3.5 text-white/40" aria-hidden="true" />
              色温
            </span>
            <span className="font-mono text-[11px] tabular-nums text-white/60">
              {tone.temperature >= 0 ? `+${Math.round(tone.temperature)}` : Math.round(tone.temperature)}
            </span>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            step="1"
            value={tone.temperature}
            onChange={(e) => handleSlider('temperature', parseFloat(e.target.value))}
            className="w-full accent-white bg-white/10 rounded-lg h-1 cursor-pointer"
            aria-label="色温"
          />
        </div>

        {/* Contrast */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-white/80">
            <span className="flex items-center gap-1.5">
              <Contrast className="w-3.5 h-3.5 text-white/40" aria-hidden="true" />
              对比度
            </span>
            <span className="font-mono text-[11px] tabular-nums text-white/60">
              {tone.contrast >= 0 ? `+${Math.round(tone.contrast)}` : Math.round(tone.contrast)}
            </span>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            step="1"
            value={tone.contrast}
            onChange={(e) => handleSlider('contrast', parseFloat(e.target.value))}
            className="w-full accent-white bg-white/10 rounded-lg h-1 cursor-pointer"
            aria-label="对比度"
          />
        </div>
      </div>

      {/* Action Buttons: Auto, Reset, Save to XMP */}
      <div className="flex items-center gap-2 pt-3 mt-1 border-t border-white/10">
        {/* Auto Button */}
        <button
          onClick={triggerAutoTone}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg text-xs active:scale-[0.98] transition"
          title="基于直方图智能自适应计算"
          aria-label="智能自动调色"
        >
          <Wand2 className="w-3.5 h-3.5 text-white/60" aria-hidden="true" />
          <span>自动</span>
        </button>

        {/* Reset Button */}
        <button
          onClick={handleReset}
          className="p-2 text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg active:scale-[0.98] transition"
          title="重置所有参数"
          aria-label="重置调色滑块"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
        </button>

        {/* Save to XMP Button */}
        <button
          onClick={handleSaveClick}
          disabled={isSaving}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 font-medium rounded-lg text-xs active:scale-[0.98] transition ${
            saveFeedback
              ? 'bg-white/20 text-white'
              : 'bg-white hover:bg-white/90 text-black shadow-sm'
          }`}
          title="将调色参数写入 .xmp"
          aria-label="保存调色至 XMP"
        >
          <Save className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="pb-[1px]">{saveFeedback ? '已写入' : isSaving ? '保存中...' : '同步'}</span>
        </button>
      </div>
    </div>
  );
};
