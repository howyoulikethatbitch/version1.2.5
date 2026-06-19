export type Status = 'COMPLETE' | 'ONGOING' | 'DROPPED' | 'INCOMPLETE';

export type AirDay = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface Entry {
  id: string;
  poster: string | null;
  title: string;
  type: 'Movie' | 'Series';
  year: number;
  country: string;
  status: Status;
}

export interface OngoingEntry {
  entryId: string;
  currentEpisode: number;
  totalEpisodes: number;
  airDays: AirDay[];
}

export interface FavoriteEntry {
  entryId: string;
  storyline: number;
  acting: number;
  music: number;
  chemistry: number;
  cinematography: number;
  originality: boolean;
  flowAndPacing: boolean;
  characterDepth: boolean;
  relationshipDynamics: boolean;
  emotionalImpact: boolean;
  ending: boolean;
  rewatchValue: boolean;
  gapPenalty: number;
  overallRating: number;
}

export interface Top10Entry {
  entryId: string;
  rank: number;
}

export interface Top10Drawer {
  year: number;
  entries: Top10Entry[];
}

export interface AppState {
  entries: Entry[];
  ongoing: OngoingEntry[];
  favorites: FavoriteEntry[];
  top10Drawers: Top10Drawer[];
  ongoingYear: number;
}

export interface BackupMetadata {
  backupVersion: string;
  exportDate: string;
  appVersion: string;
}

export interface FullBackup {
  metadata: BackupMetadata;
  entries: Entry[];
  ongoing: OngoingEntry[];
  favorites: FavoriteEntry[];
  top10Drawers: Top10Drawer[];
  ongoingYear: number;
}

export interface LegacyBackupData {
  entries: Entry[];
}

export type AppAction =
  | { type: 'SET_STATE'; payload: AppState }
  | { type: 'ADD_ENTRY'; payload: Entry }
  | { type: 'UPDATE_ENTRY'; payload: Entry }
  | { type: 'DELETE_ENTRY'; payload: string }
  | { type: 'TOGGLE_FAVORITE'; payload: string }
  | { type: 'UPDATE_FAVORITE'; payload: FavoriteEntry }
  | { type: 'REMOVE_FAVORITE'; payload: string }
  | { type: 'UPDATE_ONGOING'; payload: OngoingEntry }
  | { type: 'ADD_TO_TOP10'; payload: { year: number; entryId: string } }
  | { type: 'REMOVE_FROM_TOP10'; payload: { year: number; entryId: string } }
  | { type: 'REORDER_TOP10'; payload: { year: number; entries: Top10Entry[] } }
  | { type: 'ADD_DRAWER'; payload: number }
  | { type: 'DELETE_DRAWER'; payload: number }
  | { type: 'IMPORT_DATA'; payload: unknown }
  | { type: 'SET_ONGOING_YEAR'; payload: number };

export interface StorageResult {
  success: boolean;
  message: string;
  details?: string;
  error?: string;
}
