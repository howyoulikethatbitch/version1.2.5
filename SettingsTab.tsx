import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Download,
  Save,
  LogOut,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Database,
  Settings,
  Trash2,
  Info
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { saveToIndexedDB, clearIndexedDB } from '@/hooks/useIndexedDB';
import type { StorageResult, AppState, FullBackup, BackupMetadata } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const APP_VERSION = '1.2.4';

export default function SettingsTab() {
  const { state, dispatch } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save Now state
  const [showSaveStatus, setShowSaveStatus] = useState(false);
  const [saveResult, setSaveResult] = useState<StorageResult | null>(null);

  // Exit state
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [exitSaved, setExitSaved] = useState(false);
  const [exitResult, setExitResult] = useState<StorageResult | null>(null);

  // Import state
  const [importError, setImportError] = useState<string | null>(null);
  const [showImportError, setShowImportError] = useState(false);
  const [showImportSuccess, setShowImportSuccess] = useState(false);

  // Clear data state
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleSave = useCallback(async () => {
    setSaveResult(null);
    const result = await saveToIndexedDB(state);
    setSaveResult(result);
    setShowSaveStatus(true);
  }, [state]);

  const handleExit = useCallback(async () => {
    setExitResult(null);
    setExitSaved(false);
    const result = await saveToIndexedDB(state);
    setExitResult(result);
    setExitSaved(result.success);
    setShowExitConfirm(true);
  }, [state]);

  const handleExport = useCallback(() => {
    const metadata: BackupMetadata = {
      backupVersion: '1.0',
      exportDate: new Date().toISOString(),
      appVersion: APP_VERSION
    };

    const backup: FullBackup = {
      metadata,
      entries: state.entries,
      ongoing: state.ongoing,
      favorites: state.favorites,
      top10Drawers: state.top10Drawers,
      ongoingYear: state.ongoingYear
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BL-Watchlist-Backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [state]);

  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setShowImportError(false);
    setShowImportSuccess(false);

    try {
      // Check file size
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > 100) {
        setImportError(`File too large (${fileSizeMB.toFixed(1)} MB). Maximum allowed is 100 MB.`);
        setShowImportError(true);
        return;
      }

      const text = await file.text();

      // Try to parse
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        setImportError('Invalid JSON file. Please make sure the file is a valid BL Watchlist backup.');
        setShowImportError(true);
        return;
      }

      const data = parsed as Record<string, unknown>;

      // Check if this is a full backup (new format) or legacy format
      const hasMetadata = data.metadata && typeof data.metadata === 'object';
      const entries = Array.isArray(data.entries) ? data.entries : [];

      if (entries.length === 0) {
        setImportError('The backup file contains no entries.');
        setShowImportError(true);
        return;
      }

      // Check total data size after import
      const estimatedSizeMB = text.length / (1024 * 1024);
      if (estimatedSizeMB > 50) {
        setImportError(
          `Import too large (${estimatedSizeMB.toFixed(1)} MB). The data may exceed IndexedDB storage limits. ` +
          'Consider removing poster images from some entries to reduce size.'
        );
        setShowImportError(true);
        return;
      }

      // Build full state from imported data
      let newState: AppState;

      if (hasMetadata) {
        // Full backup format - restore everything
        newState = {
          entries: entries as AppState['entries'],
          ongoing: Array.isArray(data.ongoing) ? data.ongoing as AppState['ongoing'] : [],
          favorites: Array.isArray(data.favorites) ? data.favorites.map((f: Record<string, unknown>) => ({
            entryId: (f.entryId as string) || '',
            storyline: typeof f.storyline === 'number' ? f.storyline : 5,
            acting: typeof f.acting === 'number' ? f.acting : 5,
            music: typeof f.music === 'number' ? f.music : 5,
            chemistry: typeof f.chemistry === 'number' ? f.chemistry : 5,
            cinematography: typeof f.cinematography === 'number' ? f.cinematography : 5,
            originality: Boolean(f.originality),
            flowAndPacing: Boolean(f.flowAndPacing),
            characterDepth: Boolean(f.characterDepth),
            relationshipDynamics: Boolean(f.relationshipDynamics),
            emotionalImpact: Boolean(f.emotionalImpact),
            ending: Boolean(f.ending),
            rewatchValue: Boolean(f.rewatchValue),
            gapPenalty: typeof f.gapPenalty === 'number' ? f.gapPenalty : 0.7,
            overallRating: typeof f.overallRating === 'number' ? f.overallRating : 4.3,
          })) as AppState['favorites'] : [],
          top10Drawers: Array.isArray(data.top10Drawers) ? (data.top10Drawers as Array<Record<string, unknown>>).map((td: Record<string, unknown>) => ({
            year: typeof td.year === 'number' ? td.year : new Date().getFullYear(),
            entries: Array.isArray(td.entries) ? (td.entries as Array<Record<string, unknown>>).map((e: Record<string, unknown>) => ({
              entryId: (e.entryId as string) || '',
              rank: typeof e.rank === 'number' ? e.rank : 1
            })) : []
          })) as AppState['top10Drawers'] : [],
          ongoingYear: typeof data.ongoingYear === 'number' ? data.ongoingYear : new Date().getFullYear()
        };
      } else {
        // Legacy format - entries only
        newState = {
          entries: entries as AppState['entries'],
          ongoing: [],
          favorites: [],
          top10Drawers: [],
          ongoingYear: new Date().getFullYear()
        };
      }

      // Save directly to IndexedDB
      await saveToIndexedDB(newState);

      // Update app state
      dispatch({ type: 'SET_STATE', payload: newState });

      // Show success
      setShowImportSuccess(true);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setImportError(`Import failed: ${msg}`);
      setShowImportError(true);
    }
  }, [dispatch]);

  const handleClearData = useCallback(async () => {
    await clearIndexedDB();
    dispatch({
      type: 'SET_STATE',
      payload: {
        entries: [],
        ongoing: [],
        favorites: [],
        top10Drawers: [],
        ongoingYear: new Date().getFullYear()
      }
    });
    setShowClearConfirm(false);
  }, [dispatch]);

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Settings className="w-6 h-6 text-[#E50914]" />
        <h1 className="text-2xl font-extrabold">Settings</h1>
      </div>

      {/* Data Management Section */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider">Data Management</h2>

        <div className="space-y-2">
          {/* Import */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[#141414] border border-white/[0.06] text-white hover:bg-white/[0.04] transition-colors tap-active text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-[#E50914]/10 flex items-center justify-center flex-shrink-0">
              <Upload className="w-5 h-5 text-[#E50914]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Import JSON</p>
              <p className="text-xs text-[#666]">Restore from backup file</p>
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />

          {/* Export */}
          <button
            onClick={handleExport}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[#141414] border border-white/[0.06] text-white hover:bg-white/[0.04] transition-colors tap-active text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-[#E50914]/10 flex items-center justify-center flex-shrink-0">
              <Download className="w-5 h-5 text-[#E50914]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Export JSON</p>
              <p className="text-xs text-[#666]">Save full backup with all data</p>
            </div>
          </button>

          {/* Save Now */}
          <button
            onClick={handleSave}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[#141414] border border-white/[0.06] text-white hover:bg-white/[0.04] transition-colors tap-active text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-[#E50914]/10 flex items-center justify-center flex-shrink-0">
              <Save className="w-5 h-5 text-[#E50914]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Save Now</p>
              <p className="text-xs text-[#666]">Save all changes to IndexedDB</p>
            </div>
          </button>

          {/* Exit */}
          <button
            onClick={handleExit}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[#141414] border border-white/[0.06] text-white hover:bg-white/[0.04] transition-colors tap-active text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-[#E50914]/10 flex items-center justify-center flex-shrink-0">
              <LogOut className="w-5 h-5 text-[#E50914]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Exit</p>
              <p className="text-xs text-[#666]">Save and close application</p>
            </div>
          </button>

          {/* Clear All Data */}
          <button
            onClick={() => setShowClearConfirm(true)}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[#141414] border border-red-500/10 text-white hover:bg-red-500/5 transition-colors tap-active text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-400">Clear All Data</p>
              <p className="text-xs text-[#666]">Delete all entries and reset app</p>
            </div>
          </button>
        </div>
      </div>

      {/* About Section */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider">About</h2>
        <div className="bg-[#141414] border border-white/[0.06] rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#666]" />
            <p className="text-sm text-[#B3B3B3]">BL Watchlist Manager</p>
          </div>
          <div className="flex items-center justify-between text-xs text-[#666]">
            <span>Version</span>
            <span>{APP_VERSION}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-[#666]">
            <span>Entries</span>
            <span>{state.entries.length}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-[#666]">
            <span>Favorites</span>
            <span>{state.favorites.length}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-[#666]">
            <span>Top 10 Drawers</span>
            <span>{state.top10Drawers.length}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-[#666]">
            <span>Storage</span>
            <span>IndexedDB</span>
          </div>
        </div>
      </div>

      {/* Import Info Banner */}
      <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-blue-400 font-medium">What gets exported?</p>
            <p className="text-xs text-[#666] mt-1">
              The export includes all entries, ongoing metadata, air days, episode progress,
              favorites with ratings and checkboxes, Top 10 drawers with rankings, and the
              ongoing year setting.
            </p>
          </div>
        </div>
      </div>

      {/* ========== MODALS ========== */}

      {/* Save Status Modal */}
      <AnimatePresence>
        {showSaveStatus && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4"
            onClick={() => setShowSaveStatus(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6 max-w-sm w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-3">
                {saveResult?.success ? (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-500" />
                )}
                <h3 className="text-white font-semibold">
                  {saveResult?.success ? 'Save Status' : 'Save Failed'}
                </h3>
              </div>

              <p className="text-sm text-[#B3B3B3] mt-2">{saveResult?.message}</p>

              {saveResult?.details && (
                <div className="mt-3 p-3 rounded-lg bg-white/[0.04]">
                  <p className="text-xs text-[#888] leading-relaxed">{saveResult?.details}</p>
                </div>
              )}

              {!saveResult?.success && saveResult?.error && (
                <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-xs text-red-400 font-mono">{saveResult?.error}</p>
                </div>
              )}

              <button
                onClick={() => setShowSaveStatus(false)}
                className="mt-4 w-full py-2.5 rounded-xl bg-[#E50914] hover:bg-[#E50914]/90 text-white text-sm font-semibold transition-colors"
              >
                {saveResult?.success ? 'Got it' : 'Close'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exit Confirm Modal */}
      <AnimatePresence>
        {showExitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4"
            onClick={() => setShowExitConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6 max-w-sm w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-3">
                {exitResult?.success ? (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-500" />
                )}
                <h3 className="text-white font-semibold">
                  {exitResult?.success ? 'Save & Exit' : 'Exit - Save Failed'}
                </h3>
              </div>

              <p className="text-sm text-[#B3B3B3] mt-2">{exitResult?.message}</p>

              {exitResult?.details && (
                <div className="mt-3 p-3 rounded-lg bg-white/[0.04]">
                  <p className="text-xs text-[#888] leading-relaxed">{exitResult?.details}</p>
                </div>
              )}

              {!exitResult?.success && (
                <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <Database className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-yellow-400 font-medium">Root Cause:</p>
                    <p className="text-xs text-[#888] mt-1">
                      The original app used localStorage (5-10MB limit). With poster images,
                      every save hit the QuotaExceededError. We use IndexedDB (50MB+). If this
                      still fails, your browser storage is full or private mode is active.
                    </p>
                  </div>
                </div>
              )}

              {exitResult?.success && (
                <p className="text-sm text-[#B3B3B3] mt-1">
                  {exitSaved
                    ? 'You have saved all changes. Are you sure you want to exit?'
                    : 'You have unsaved changes. Save before exiting?'}
                </p>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#2a2a2a] hover:bg-[#333] text-white text-sm font-medium transition-colors"
                >
                  Stay
                </button>
                <button
                  onClick={() => window.close()}
                  className="flex-1 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#E50914]/90 text-white text-sm font-semibold transition-colors"
                >
                  Close Tab
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import Error Modal */}
      <AnimatePresence>
        {showImportError && importError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4"
            onClick={() => setShowImportError(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6 max-w-sm w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-3">
                <XCircle className="w-6 h-6 text-red-500" />
                <h3 className="text-white font-semibold">Import Failed</h3>
              </div>
              <p className="text-sm text-[#B3B3B3] mt-2">{importError}</p>
              <button
                onClick={() => setShowImportError(false)}
                className="mt-4 w-full py-2.5 rounded-xl bg-[#E50914] hover:bg-[#E50914]/90 text-white text-sm font-semibold transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import Success Modal */}
      <AnimatePresence>
        {showImportSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4"
            onClick={() => setShowImportSuccess(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6 max-w-sm w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <h3 className="text-white font-semibold">Import Successful</h3>
              </div>
              <p className="text-sm text-[#B3B3B3] mt-2">
                All data has been restored successfully, including entries, ongoing metadata,
                favorites, ratings, Top 10 rankings, and settings.
              </p>
              <button
                onClick={() => setShowImportSuccess(false)}
                className="mt-4 w-full py-2.5 rounded-xl bg-[#E50914] hover:bg-[#E50914]/90 text-white text-sm font-semibold transition-colors"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clear Data Confirmation Dialog */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent className="bg-[#141414] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#E50914]" />
              Clear All Data?
            </DialogTitle>
            <DialogDescription className="text-[#B3B3B3]">
              This will permanently delete all entries, favorites, ongoing data, and Top 10 rankings.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowClearConfirm(false)}
              className="flex-1 bg-white/[0.06] border-white/10 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleClearData}
              className="flex-1 bg-red-600 text-white hover:bg-red-700 font-semibold"
            >
              Delete Everything
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
