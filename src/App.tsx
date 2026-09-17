import { useState, useEffect, useMemo, useCallback } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { TopBar } from './components/TopBar';
import { ThumbnailGrid } from './components/ThumbnailGrid';
import { PreviewViewport } from './components/PreviewViewport';
import { SplitCompareViewport } from './components/SplitCompareViewport';
import { BottomBar } from './components/BottomBar';
import { BatchExportModal } from './components/BatchExportModal';
import { SettingsModal } from './components/SettingsModal';
import { MetadataEditorModal } from './components/MetadataEditorModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { AppSettings, FilterMode, PhotoGroupInfo, SortOrder, ViewMode } from './types';
import { api } from './services/api';

export default function App() {
  const [jpgFolder, setJpgFolder] = useState('');
  const [rawFolder, setRawFolder] = useState('');
  const [groups, setGroups] = useState<PhotoGroupInfo[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [compareIndex, setCompareIndex] = useState<number>(1);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [isPinnedOnLeft, setIsPinnedOnLeft] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('single');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('time_filename');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMetadataOpen, setIsMetadataOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  // Load initial settings and default paths on startup
  useEffect(() => {
    api.getSettings().then((s) => {
      setSettings(s);
      if (s.defaultJpgFolder) setJpgFolder(s.defaultJpgFolder);
      if (s.defaultRawFolder) setRawFolder(s.defaultRawFolder);
      if (s.sortOrder) setSortOrder(s.sortOrder as SortOrder);
    });

    // Check for updates
    const checkForUpdates = async () => {
      try {
        const update = await check();
        if (update) {
          const yes = window.confirm(`🎉 发现新版本 ${update.version}！\n\n更新日志：\n${update.body || '修复已知问题，优化体验。'}\n\n是否立即下载并升级？`);
          if (yes) {
            await update.downloadAndInstall();
            await relaunch();
          }
        }
      } catch (err) {
        console.error('Failed to check for updates:', err);
      }
    };
    // small delay to not block initial render
    setTimeout(checkForUpdates, 1000);
  }, []);

  // Filtered list of groups
  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      switch (filterMode) {
        case 'pick':
          return g.flag === 'pick';
        case 'reject':
          return g.flag === 'reject';
        case 'unmarked':
          return g.flag === 'none' && g.rating === 0;
        case 'star3':
          return g.rating >= 3;
        case 'star5':
          return g.rating === 5;
        case 'all':
        default:
          return true;
      }
    });
  }, [groups, filterMode]);

  const currentGroup = filteredGroups[selectedIndex] || undefined;

  // Compute compare groups based on pinned reference
  const { leftCompareGroup, rightCompareGroup, isLeftPinned, isRightPinned } = useMemo(() => {
    const leftBase = filteredGroups[selectedIndex];
    const rightDefault =
      filteredGroups[compareIndex] ||
      filteredGroups[selectedIndex + 1] ||
      filteredGroups[0];

    if (!pinnedId) {
      return {
        leftCompareGroup: leftBase,
        rightCompareGroup: rightDefault,
        isLeftPinned: false,
        isRightPinned: false,
      };
    }

    const pinnedGroup = filteredGroups.find((g) => g.id === pinnedId) || leftBase;

    if (isPinnedOnLeft) {
      return {
        leftCompareGroup: pinnedGroup,
        rightCompareGroup: filteredGroups[compareIndex] || rightDefault,
        isLeftPinned: true,
        isRightPinned: false,
      };
    } else {
      return {
        leftCompareGroup: filteredGroups[selectedIndex] || leftBase,
        rightCompareGroup: pinnedGroup,
        isLeftPinned: false,
        isRightPinned: true,
      };
    }
  }, [filteredGroups, selectedIndex, compareIndex, pinnedId, isPinnedOnLeft]);

  // Pin / Unpin Left as Reference
  const handleTogglePinLeft = useCallback(() => {
    if (isLeftPinned) {
      setPinnedId(null);
    } else if (leftCompareGroup) {
      setPinnedId(leftCompareGroup.id);
      setIsPinnedOnLeft(true);
    }
  }, [isLeftPinned, leftCompareGroup]);

  // Pin / Unpin Right as Reference
  const handleTogglePinRight = useCallback(() => {
    if (isRightPinned) {
      setPinnedId(null);
    } else if (rightCompareGroup) {
      setPinnedId(rightCompareGroup.id);
      setIsPinnedOnLeft(false);
    }
  }, [isRightPinned, rightCompareGroup]);

  // Swap A / B (Candidate becomes new pinned benchmark or swap positions)
  const handleSwapCompare = useCallback(() => {
    if (pinnedId) {
      if (isPinnedOnLeft && rightCompareGroup) {
        setPinnedId(rightCompareGroup.id);
      } else if (!isPinnedOnLeft && leftCompareGroup) {
        setPinnedId(leftCompareGroup.id);
      }
    } else {
      const temp = selectedIndex;
      setSelectedIndex(compareIndex);
      setCompareIndex(temp);
    }
  }, [pinnedId, isPinnedOnLeft, leftCompareGroup, rightCompareGroup, selectedIndex, compareIndex]);

  // Benchmark toggle shortcut (B)
  const handleTogglePinBenchmark = useCallback(() => {
    if (pinnedId) {
      setPinnedId(null);
    } else if (leftCompareGroup) {
      setPinnedId(leftCompareGroup.id);
      setIsPinnedOnLeft(true);
    }
  }, [pinnedId, leftCompareGroup]);

  // Folder scanning handler
  const handleScan = useCallback(async () => {
    if (!jpgFolder.trim()) return;
    setIsLoading(true);

    try {
      const res = await api.scanFolders(jpgFolder, rawFolder, sortOrder);
      setGroups(res.groups);

      // Check session history for this folder
      const history = await api.loadSession(jpgFolder);
      if (history && history[0] < res.groups.length) {
        setSelectedIndex(history[0]);
        setCompareIndex(Math.min(history[0] + 1, res.groups.length - 1));
      } else {
        setSelectedIndex(0);
        setCompareIndex(res.groups.length > 1 ? 1 : 0);
      }

      // Save as default in settings
      if (settings) {
        api.saveSettings({
          ...settings,
          defaultJpgFolder: jpgFolder,
          defaultRawFolder: rawFolder,
          sortOrder,
        });
      }
    } catch (err) {
      alert(`扫描失败: ${err}`);
    } finally {
      setIsLoading(false);
    }
  }, [jpgFolder, rawFolder, sortOrder, settings]);

  // Folder picker handlers
  const handleBrowseJpg = async () => {
    const selected = await api.selectFolderDialog(jpgFolder);
    if (selected) {
      setJpgFolder(selected);
    }
  };

  const handleBrowseRaw = async () => {
    const selected = await api.selectFolderDialog(rawFolder);
    if (selected) {
      setRawFolder(selected);
    }
  };

  // Selection navigation (aware of pinned compare mode)
  const handlePrev = useCallback(() => {
    if (viewMode === 'split' && pinnedId && isPinnedOnLeft) {
      setCompareIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    }
  }, [viewMode, pinnedId, isPinnedOnLeft]);

  const handleNext = useCallback(() => {
    if (viewMode === 'split' && pinnedId && isPinnedOnLeft) {
      setCompareIndex((prev) =>
        prev < filteredGroups.length - 1 ? prev + 1 : prev,
      );
    } else {
      setSelectedIndex((prev) =>
        prev < filteredGroups.length - 1 ? prev + 1 : prev,
      );
    }
  }, [viewMode, pinnedId, isPinnedOnLeft, filteredGroups.length]);

  // Select photo from thumbnail list
  const handleSelectPhoto = useCallback(
    (idx: number) => {
      if (viewMode === 'split' && pinnedId && isPinnedOnLeft) {
        setCompareIndex(idx);
      } else {
        setSelectedIndex(idx);
        if (viewMode === 'split' && !pinnedId) {
          setCompareIndex(Math.min(idx + 1, filteredGroups.length - 1));
        }
      }
    },
    [viewMode, pinnedId, isPinnedOnLeft, filteredGroups.length],
  );

  // Update Rating & Flag (syncs to XMP)
  const handleRate = useCallback(
    async (rating: number, targetGroup: PhotoGroupInfo = currentGroup!) => {
      if (!targetGroup) return;
      const targetPath = targetGroup.raw?.path || targetGroup.jpg?.path;
      if (!targetPath) return;

      // Update in local state
      setGroups((prev) =>
        prev.map((g) => (g.id === targetGroup.id ? { ...g, rating } : g)),
      );

      // Sync to XMP in background
      try {
        await api.updateRatingFlag(targetPath, rating, targetGroup.flag, true);
      } catch (err) {
        console.error('XMP update error:', err);
      }
    },
    [currentGroup],
  );

  const handleFlag = useCallback(
    async (
      flag: 'pick' | 'reject' | 'none',
      targetGroup: PhotoGroupInfo = currentGroup!,
    ) => {
      if (!targetGroup) return;
      const targetPath = targetGroup.raw?.path || targetGroup.jpg?.path;
      if (!targetPath) return;

      setGroups((prev) =>
        prev.map((g) => (g.id === targetGroup.id ? { ...g, flag } : g)),
      );

      try {
        await api.updateRatingFlag(targetPath, targetGroup.rating, flag, true);
      } catch (err) {
        console.error('XMP update error:', err);
      }
    },
    [currentGroup],
  );

  // Open in Photoshop / External app
  const handleOpenExternal = useCallback(async () => {
    if (!currentGroup) return;
    const targetPath = currentGroup.raw?.path || currentGroup.jpg?.path;
    if (!targetPath) return;

    try {
      await api.openInPhotoshop(targetPath, settings?.photoshopPath);
    } catch (e) {
      console.warn('Photoshop failed, falling back to default:', e);
      await api.openInDefaultApp(targetPath);
    }
  }, [currentGroup, settings?.photoshopPath]);

  // View mode toggles
  const handleToggleCompare = useCallback(() => {
    setViewMode((m) => (m === 'split' ? 'single' : 'split'));
  }, []);

  // Save session when index changes
  useEffect(() => {
    if (jpgFolder && selectedIndex >= 0) {
      api.saveSession(jpgFolder, rawFolder, selectedIndex, sortOrder);
    }
  }, [selectedIndex, jpgFolder, rawFolder, sortOrder]);

  // Metadata batch updated handler
  const handleMetadataUpdated = useCallback(
    (targetIds: string[], lensModel: string, focalLength: string, aperture: string) => {
      setGroups((prev) =>
        prev.map((g) => {
          if (targetIds.includes(g.id)) {
            return {
              ...g,
              hasXmp: true,
              exif: {
                ...g.exif,
                lensModel: lensModel || g.exif?.lensModel,
                focalLength: focalLength || g.exif?.focalLength,
                aperture: aperture || g.exif?.aperture,
              },
            };
          }
          return g;
        }),
      );
    },
    [],
  );

  // Register single-handed keyboard shortcuts
  useKeyboardShortcuts({
    onPrev: handlePrev,
    onNext: handleNext,
    onRate: (r) => handleRate(r),
    onFlag: (f) => handleFlag(f),
    onOpenExternal: handleOpenExternal,
    onToggleCompare: handleToggleCompare,
    onSwapCompare: handleSwapCompare,
    onTogglePinReference: handleTogglePinBenchmark,
    onPinLeft: handleTogglePinLeft,
    onPinRight: handleTogglePinRight,
    onOpenMetadataModal: () => setIsMetadataOpen(true),
  });

  return (
    <div className="flex flex-col h-screen w-screen bg-[#121316] text-[#e1e4ea] overflow-hidden antialiased">
      {/* Top Controls Bar */}
      <TopBar
        jpgFolder={jpgFolder}
        rawFolder={rawFolder}
        onJpgFolderChange={setJpgFolder}
        onRawFolderChange={setRawFolder}
        onBrowseJpg={handleBrowseJpg}
        onBrowseRaw={handleBrowseRaw}
        onScan={handleScan}
        isLoading={isLoading}
        filterMode={filterMode}
        onFilterChange={setFilterMode}
        sortOrder={sortOrder}
        onSortChange={(order) => {
          setSortOrder(order);
          // Auto re-scan or sort
          handleScan();
        }}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onOpenExportModal={() => setIsExportOpen(true)}
        onOpenSettingsModal={() => setIsSettingsOpen(true)}
        onOpenMetadataModal={() => setIsMetadataOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Center Viewport */}
        {viewMode === 'single' && (
          <PreviewViewport
            group={currentGroup}
            onPrev={handlePrev}
            onNext={handleNext}
            onRate={(r) => handleRate(r)}
            onFlag={(f) => handleFlag(f)}
            onOpenExternal={handleOpenExternal}
            onBrowseJpg={handleBrowseJpg}
          />
        )}

        {viewMode === 'split' && (
          <SplitCompareViewport
            leftGroup={leftCompareGroup}
            rightGroup={rightCompareGroup}
            isLeftPinned={isLeftPinned}
            isRightPinned={isRightPinned}
            onTogglePinLeft={handleTogglePinLeft}
            onTogglePinRight={handleTogglePinRight}
            onSwap={handleSwapCompare}
            onRate={(g, r) => handleRate(r, g)}
            onFlag={(g, f) => handleFlag(f, g)}
            onSelectLeft={() => {}}
            onSelectRight={() => {
              if (compareIndex >= 0 && compareIndex < filteredGroups.length) {
                setSelectedIndex(compareIndex);
              }
            }}
          />
        )}
        {/* Right Thumbnail Sidebar (Multi-column Compact Grid: 3-4 cols) */}
        <div className="w-[390px] h-full shrink-0">
          <ThumbnailGrid
            groups={filteredGroups}
            selectedIndex={selectedIndex}
            pinnedId={pinnedId}
            onSelect={handleSelectPhoto}
          />
        </div>
      </div>

      {/* Bottom Status Bar */}
      <BottomBar
        currentGroup={currentGroup}
        currentIndex={selectedIndex}
        totalCount={filteredGroups.length}
        onOpenExternal={handleOpenExternal}
        onOpenMetadataModal={() => setIsMetadataOpen(true)}
      />

      {/* Batch Export Modal */}
      <BatchExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        groups={groups}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsSaved={(s) => setSettings(s)}
      />

      {/* Manual Lens Metadata Editor Modal */}
      <MetadataEditorModal
        isOpen={isMetadataOpen}
        onClose={() => setIsMetadataOpen(false)}
        currentGroup={currentGroup}
        filteredGroups={filteredGroups}
        allGroups={groups}
        onMetadataUpdated={handleMetadataUpdated}
      />
    </div>
  );
}
