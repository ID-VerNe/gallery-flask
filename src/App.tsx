import { useState, useEffect, useMemo, useCallback } from 'react';
import { TopBar } from './components/TopBar';
import { ThumbnailGrid } from './components/ThumbnailGrid';
import { PreviewViewport } from './components/PreviewViewport';
import { SplitCompareViewport } from './components/SplitCompareViewport';
import { BottomBar } from './components/BottomBar';
import { BatchExportModal } from './components/BatchExportModal';
import { SettingsModal } from './components/SettingsModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { AppSettings, FilterMode, PhotoGroupInfo, SortOrder, ViewMode } from './types';
import { api } from './services/api';

export default function App() {
  const [jpgFolder, setJpgFolder] = useState('');
  const [rawFolder, setRawFolder] = useState('');
  const [groups, setGroups] = useState<PhotoGroupInfo[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [compareIndex, setCompareIndex] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('single');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('time_filename');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  // Load initial settings and default paths on startup
  useEffect(() => {
    api.getSettings().then((s) => {
      setSettings(s);
      if (s.defaultJpgFolder) setJpgFolder(s.defaultJpgFolder);
      if (s.defaultRawFolder) setRawFolder(s.defaultRawFolder);
      if (s.sortOrder) setSortOrder(s.sortOrder as SortOrder);
    });
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
  const compareGroup = filteredGroups[compareIndex] || filteredGroups[selectedIndex + 1] || undefined;

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

  // Selection navigation
  const handlePrev = useCallback(() => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const handleNext = useCallback(() => {
    setSelectedIndex((prev) =>
      prev < filteredGroups.length - 1 ? prev + 1 : prev,
    );
  }, [filteredGroups.length]);

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

  const handleToggleGrid = useCallback(() => {
    setViewMode((m) => (m === 'grid' ? 'single' : 'grid'));
  }, []);

  // Save session when index changes
  useEffect(() => {
    if (jpgFolder && selectedIndex >= 0) {
      api.saveSession(jpgFolder, rawFolder, selectedIndex, sortOrder);
    }
  }, [selectedIndex, jpgFolder, rawFolder, sortOrder]);

  // Register single-handed keyboard shortcuts
  useKeyboardShortcuts({
    onPrev: handlePrev,
    onNext: handleNext,
    onRate: (r) => handleRate(r),
    onFlag: (f) => handleFlag(f),
    onOpenExternal: handleOpenExternal,
    onToggleCompare: handleToggleCompare,
    onToggleGrid: handleToggleGrid,
  });

  return (
    <div className="flex flex-col h-screen w-screen bg-[#121316] text-[#e1e4ea] overflow-hidden">
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
            leftGroup={currentGroup}
            rightGroup={compareGroup}
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

        {viewMode === 'grid' && (
          <div className="flex-1 p-3">
            <ThumbnailGrid
              groups={filteredGroups}
              selectedIndex={selectedIndex}
              onSelect={(idx) => {
                setSelectedIndex(idx);
                setViewMode('single');
              }}
              isSidebar={false}
            />
          </div>
        )}

        {/* Right Thumbnail Sidebar (shown in single and split modes) */}
        {viewMode !== 'grid' && (
          <div className="w-80 h-full shrink-0">
            <ThumbnailGrid
              groups={filteredGroups}
              selectedIndex={selectedIndex}
              onSelect={setSelectedIndex}
              isSidebar={true}
            />
          </div>
        )}
      </div>

      {/* Bottom Status Bar */}
      <BottomBar
        currentGroup={currentGroup}
        currentIndex={selectedIndex}
        totalCount={filteredGroups.length}
        onOpenExternal={handleOpenExternal}
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
    </div>
  );
}
