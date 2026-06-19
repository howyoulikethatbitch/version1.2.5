import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import type { AppState, AppAction, Entry, OngoingEntry, FavoriteEntry, Top10Drawer, AirDay } from '@/types';
import { saveToIndexedDB, loadFromIndexedDB } from '@/hooks/useIndexedDB';

const AIR_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

function getCurrentDay(): string {
  const day = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  return AIR_DAYS.includes(day as typeof AIR_DAYS[number]) ? day : 'Monday';
}

function calculateGapPenalty(f: FavoriteEntry): number {
  const checked = [
    f.originality, f.flowAndPacing, f.characterDepth,
    f.relationshipDynamics, f.emotionalImpact, f.ending, f.rewatchValue
  ].filter(Boolean).length;
  return Math.round((7 - checked) * 0.1 * 10) / 10;
}

function calculateOverallRating(f: FavoriteEntry): number {
  return Math.round(((f.storyline + f.acting + f.music + f.chemistry + f.cinematography) / 5 - f.gapPenalty) * 10) / 10;
}

export const initialState: AppState = {
  entries: [],
  ongoing: [],
  favorites: [],
  top10Drawers: [],
  ongoingYear: new Date().getFullYear()
};

function validateData(data: unknown): AppState {
  if (!data || typeof data !== 'object') return { ...initialState };
  const d = data as Record<string, unknown>;
  const entries = Array.isArray(d.entries) ? d.entries : [];
  const ongoing = Array.isArray(d.ongoing) ? d.ongoing : [];
  const favorites = Array.isArray(d.favorites) ? d.favorites : [];
  const top10Drawers = Array.isArray(d.top10Drawers) ? d.top10Drawers : [];
  const ongoingYear = typeof d.ongoingYear === 'number' ? d.ongoingYear : new Date().getFullYear();

  return {
    entries: entries.map((e: Record<string, unknown>) => ({
      ...e,
      status: (e.status as string) || 'COMPLETE',
      poster: (e.poster as string) ?? null,
      type: (e.type as 'Movie' | 'Series') || 'Series',
      year: typeof e.year === 'number' ? e.year : new Date().getFullYear(),
      country: (e.country as string) || 'Unknown',
      title: (e.title as string) || 'Untitled',
      id: (e.id as string) || `bl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    })) as Entry[],
    ongoing: ongoing as OngoingEntry[],
    favorites: favorites.map((f: Record<string, unknown>) => ({
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
    })) as FavoriteEntry[],
    top10Drawers: top10Drawers.map((td: Record<string, unknown>) => ({
      year: typeof td.year === 'number' ? td.year : new Date().getFullYear(),
      entries: Array.isArray(td.entries) ? td.entries.map((e: Record<string, unknown>) => ({
        entryId: (e.entryId as string) || '',
        rank: typeof e.rank === 'number' ? e.rank : 1
      })) : []
    })) as Top10Drawer[],
    ongoingYear
  };
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_STATE':
      return action.payload;

    case 'ADD_ENTRY': {
      const entry = action.payload;
      let ongoing = state.ongoing;
      if (entry.status === 'ONGOING') {
        const o: OngoingEntry = {
          entryId: entry.id,
          currentEpisode: 0,
          totalEpisodes: 1,
          airDays: [getCurrentDay() as AirDay]
        };
        ongoing = [...state.ongoing, o];
      }
      return { ...state, entries: [...state.entries, entry], ongoing };
    }

    case 'UPDATE_ENTRY': {
      const entries = state.entries.map(e => e.id === action.payload.id ? action.payload : e);
      const entry = action.payload;
      let ongoing = state.ongoing;
      if (entry.status === 'ONGOING') {
        if (!state.ongoing.find(o => o.entryId === entry.id)) {
          const o: OngoingEntry = {
            entryId: entry.id,
            currentEpisode: 0,
            totalEpisodes: 1,
            airDays: [getCurrentDay() as AirDay]
          };
          ongoing = [...state.ongoing, o];
        }
      } else if (state.entries.find(e => e.id === entry.id)?.status === 'ONGOING') {
        ongoing = state.ongoing.filter(o => o.entryId !== entry.id);
      }
      return { ...state, entries, ongoing };
    }

    case 'DELETE_ENTRY': {
      const id = action.payload;
      return {
        ...state,
        entries: state.entries.filter(e => e.id !== id),
        ongoing: state.ongoing.filter(o => o.entryId !== id),
        favorites: state.favorites.filter(f => f.entryId !== id),
        top10Drawers: state.top10Drawers.map(d => ({
          ...d,
          entries: d.entries.filter(e => e.entryId !== id)
        }))
      };
    }

    case 'TOGGLE_FAVORITE': {
      const entryId = action.payload;
      if (state.favorites.find(f => f.entryId === entryId)) {
        return { ...state, favorites: state.favorites.filter(f => f.entryId !== entryId) };
      }
      if (!state.entries.find(e => e.id === entryId)) return state;
      const newFav: FavoriteEntry = {
        entryId,
        storyline: 5,
        acting: 5,
        music: 5,
        chemistry: 5,
        cinematography: 5,
        originality: false,
        flowAndPacing: false,
        characterDepth: false,
        relationshipDynamics: false,
        emotionalImpact: false,
        ending: false,
        rewatchValue: false,
        gapPenalty: 0.7,
        overallRating: 4.3
      };
      return { ...state, favorites: [...state.favorites, newFav] };
    }

    case 'UPDATE_FAVORITE': {
      const updated = {
        ...action.payload,
        gapPenalty: calculateGapPenalty(action.payload),
        overallRating: 0
      };
      updated.overallRating = calculateOverallRating(updated);
      return {
        ...state,
        favorites: state.favorites.map(f => f.entryId === updated.entryId ? updated : f)
      };
    }

    case 'REMOVE_FAVORITE':
      return { ...state, favorites: state.favorites.filter(f => f.entryId !== action.payload) };

    case 'UPDATE_ONGOING':
      return state.ongoing.find(o => o.entryId === action.payload.entryId)
        ? { ...state, ongoing: state.ongoing.map(o => o.entryId === action.payload.entryId ? action.payload : o) }
        : { ...state, ongoing: [...state.ongoing, action.payload] };

    case 'ADD_TO_TOP10': {
      const { year, entryId } = action.payload;
      return {
        ...state,
        top10Drawers: state.top10Drawers.map(d => {
          if (d.year === year && d.entries.length < 10 && !d.entries.find(e => e.entryId === entryId)) {
            const rank = d.entries.length + 1;
            return { ...d, entries: [...d.entries, { entryId, rank }] };
          }
          return d;
        })
      };
    }

    case 'REMOVE_FROM_TOP10': {
      const { year, entryId } = action.payload;
      return {
        ...state,
        top10Drawers: state.top10Drawers.map(d => {
          if (d.year === year) {
            const entries = d.entries.filter(e => e.entryId !== entryId).map((e, i) => ({ ...e, rank: i + 1 }));
            return { ...d, entries };
          }
          return d;
        })
      };
    }

    case 'REORDER_TOP10': {
      const { year, entries } = action.payload;
      return {
        ...state,
        top10Drawers: state.top10Drawers.map(d =>
          d.year === year ? { ...d, entries: entries.map((e, i) => ({ ...e, rank: i + 1 })) } : d
        )
      };
    }

    case 'ADD_DRAWER': {
      const year = action.payload;
      return state.top10Drawers.find(d => d.year === year)
        ? state
        : { ...state, top10Drawers: [...state.top10Drawers, { year, entries: [] }].sort((a, b) => b.year - a.year) };
    }

    case 'DELETE_DRAWER':
      return { ...state, top10Drawers: state.top10Drawers.filter(d => d.year !== action.payload) };

    case 'IMPORT_DATA': {
      const validated = validateData(action.payload);
      return validated;
    }

    case 'SET_ONGOING_YEAR':
      return { ...state, ongoingYear: action.payload };

    default:
      return state;
  }
}

// Legacy localStorage keys (for migration)
const LEGACY_STORAGE_KEY = 'bl-watchlist-data';
const LEGACY_VERSION = 1;

// Migrate data from localStorage to IndexedDB
async function migrateFromLocalStorage(): Promise<AppState | null> {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.version === LEGACY_VERSION && parsed.data) {
      const migrated = validateData(parsed.data);
      await saveToIndexedDB(migrated);
      try { localStorage.removeItem(LEGACY_STORAGE_KEY); } catch { /* ignore */ }
      console.log('[Migration] Successfully migrated data from localStorage to IndexedDB');
      return migrated;
    }
  } catch (err) {
    console.warn('[Migration] Failed to migrate from localStorage:', err);
  }
  return null;
}

// Load from IndexedDB (with localStorage migration fallback)
async function loadInitialState(): Promise<AppState> {
  const indexedDBData = await loadFromIndexedDB();
  if (indexedDBData && (indexedDBData.entries.length > 0 || indexedDBData.favorites.length > 0)) {
    return indexedDBData;
  }
  const migrated = await migrateFromLocalStorage();
  if (migrated) return migrated;
  return { ...initialState };
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  isLoaded: boolean;
  getEntryById: (id: string) => Entry | undefined;
  getOngoingByEntryId: (id: string) => OngoingEntry | undefined;
  getFavoriteByEntryId: (id: string) => FavoriteEntry | undefined;
  isFavorited: (id: string) => boolean;
  isInTop10: (id: string) => { year: number; rank: number } | null;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [state, dispatch] = useReducer(appReducer, initialState);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    loadInitialState().then(loaded => {
      if (loaded.entries.length > 0 || loaded.favorites.length > 0) {
        dispatch({ type: 'SET_STATE', payload: loaded });
      }
      setIsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const timer = setTimeout(() => {
      saveToIndexedDB(state).catch(err => {
        console.warn('Auto-save failed:', err);
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [state, isLoaded]);

  const getEntryById = useCallback((id: string) => state.entries.find(e => e.id === id), [state.entries]);
  const getOngoingByEntryId = useCallback((id: string) => state.ongoing.find(o => o.entryId === id), [state.ongoing]);
  const getFavoriteByEntryId = useCallback((id: string) => state.favorites.find(f => f.entryId === id), [state.favorites]);
  const isFavorited = useCallback((id: string) => state.favorites.some(f => f.entryId === id), [state.favorites]);
  const isInTop10 = useCallback((id: string) => {
    for (const drawer of state.top10Drawers) {
      const entry = drawer.entries.find(e => e.entryId === id);
      if (entry) return { year: drawer.year, rank: entry.rank };
    }
    return null;
  }, [state.top10Drawers]);

  return (
    <AppContext.Provider value={{
      state, dispatch, isLoaded,
      getEntryById, getOngoingByEntryId, getFavoriteByEntryId,
      isFavorited, isInTop10
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
