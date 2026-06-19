import { useState, useMemo, memo, useCallback } from "react";
import { motion } from "framer-motion";
import { PlayCircle, ArrowUpDown, Filter, Pencil, Check, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import Poster from "../Poster";
import AirDaySelector from "../AirDaySelector";
import type { AirDay, Entry } from "@/types";
import EntryModal from "../EntryModal";

const OngoingCard = memo(function OngoingCard({
  entryId,
  entry,
  ongoingData,
  todayName,
  onEpisodeChange,
  onAirDaysChange,
  onEntryClick,
}: {
  entryId: string;
  entry: { title: string; poster: string | null; country: string };
  ongoingData: { currentEpisode: number; totalEpisodes: number; airDays: AirDay[] };
  todayName: AirDay;
  onEpisodeChange: (entryId: string, field: "currentEpisode" | "totalEpisodes", value: number) => void;
  onAirDaysChange: (entryId: string, days: AirDay[]) => void;
  onEntryClick: (entry: Entry) => void;
}) {
  const isAiringToday = ongoingData.airDays.includes(todayName);
  const progress = ongoingData.totalEpisodes > 0 ? (ongoingData.currentEpisode / ongoingData.totalEpisodes) * 100 : 0;

  return (
    <motion.div
      key={entryId}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-3 rounded-xl bg-[#141414] relative overflow-hidden ${
        isAiringToday ? "glow-border-red pulse-glow" : ""
      }`}
    >
      {isAiringToday && (
        <span className="absolute top-2 right-2 bg-[#E50914] text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
          Airing Today
        </span>
      )}

      <div className="flex items-start gap-3">
        <div onClick={() => onEntryClick(entry as Entry)} className="cursor-pointer flex-shrink-0">
          <Poster src={entry.poster} title={entry.title} size="md" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold truncate pr-16">{entry.title}</p>
          <p className="text-xs text-[#B3B3B3]">{entry.country}</p>

          {/* Episode Tracker */}
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#B3B3B3]">Episode</span>
              <input
                type="number"
                value={ongoingData.currentEpisode}
                onChange={(e) => onEpisodeChange(entryId, "currentEpisode", parseInt(e.target.value) || 0)}
                className="w-10 h-7 bg-white/[0.06] border border-white/10 rounded text-center text-sm text-white focus:border-[#E50914] outline-none"
                min={0}
              />
              <span className="text-xs text-[#B3B3B3]">/</span>
              <input
                type="number"
                value={ongoingData.totalEpisodes}
                onChange={(e) => onEpisodeChange(entryId, "totalEpisodes", parseInt(e.target.value) || 0)}
                className="w-10 h-7 bg-white/[0.06] border border-white/10 rounded text-center text-sm text-white focus:border-[#E50914] outline-none"
                min={1}
              />
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[#E50914] rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, progress)}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>

            {/* Air Days */}
            <div className="pt-1">
              <span className="text-xs text-[#B3B3B3] mr-2">Air Days:</span>
              <AirDaySelector
                value={ongoingData.airDays}
                onChange={(days: AirDay[]) => onAirDaysChange(entryId, days)}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

type SortType = "airDay" | "year" | "titleAZ" | "titleZA" | "country";
type FilterType = "all" | "today" | AirDay;

const sortOptions: { value: SortType; label: string }[] = [
  { value: "airDay", label: "Air Day" },
  { value: "year", label: "Year" },
  { value: "titleAZ", label: "Title (A \u2192 Z)" },
  { value: "titleZA", label: "Title (Z \u2192 A)" },
  { value: "country", label: "Country" },
];

const dayFilters: { value: FilterType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "today", label: "Airing Today" },
  { value: "Monday", label: "Mon" },
  { value: "Tuesday", label: "Tue" },
  { value: "Wednesday", label: "Wed" },
  { value: "Thursday", label: "Thu" },
  { value: "Friday", label: "Fri" },
  { value: "Saturday", label: "Sat" },
  { value: "Sunday", label: "Sun" },
];

export default function OngoingTab() {
  const { state, dispatch, getOngoingByEntryId } = useApp();
  const [sort, setSort] = useState<SortType>("airDay");
  const [filter, setFilter] = useState<FilterType>("all");
  const [showSort, setShowSort] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);

  // Editable year state
  const [isEditingYear, setIsEditingYear] = useState(false);
  const [yearInput, setYearInput] = useState(state.ongoingYear.toString());

  const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" }) as AirDay;

  // Derive ongoing entries from entries with status ONGOING
  const ongoingEntries = useMemo(() => {
    let result = state.entries
      .filter((e) => e.status === "ONGOING")
      .map((entry) => {
        const ongoingData = getOngoingByEntryId(entry.id);
        return {
          entry,
          ongoingData,
        };
      })
      .filter((item): item is { entry: Entry; ongoingData: NonNullable<typeof item.ongoingData> } =>
        item.ongoingData !== undefined
      );

    // Apply filter
    if (filter === "today") {
      result = result.filter(({ ongoingData }) => ongoingData.airDays.includes(todayName));
    } else if (filter !== "all") {
      result = result.filter(({ ongoingData }) => ongoingData.airDays.includes(filter as AirDay));
    }

    // Apply sort
    result = [...result].sort((a, b) => {
      switch (sort) {
        case "airDay": {
          const aHasToday = a.ongoingData.airDays.includes(todayName) ? 0 : 1;
          const bHasToday = b.ongoingData.airDays.includes(todayName) ? 0 : 1;
          return aHasToday - bHasToday || a.entry.title.localeCompare(b.entry.title);
        }
        case "year": return b.entry.year - a.entry.year;
        case "titleAZ": return a.entry.title.localeCompare(b.entry.title);
        case "titleZA": return b.entry.title.localeCompare(a.entry.title);
        case "country": return a.entry.country.localeCompare(b.entry.country);
        default: return 0;
      }
    });

    return result;
  }, [state.entries, getOngoingByEntryId, todayName, filter, sort]);

  const handleEpisodeChange = useCallback((entryId: string, field: "currentEpisode" | "totalEpisodes", value: number) => {
    const existing = state.ongoing.find((o) => o.entryId === entryId);
    if (!existing) return;
    dispatch({
      type: "UPDATE_ONGOING",
      payload: { ...existing, [field]: Math.max(0, value) },
    });
  }, [state.ongoing, dispatch]);

  const handleAirDaysChange = useCallback((entryId: string, days: AirDay[]) => {
    const existing = state.ongoing.find((o) => o.entryId === entryId);
    if (!existing) return;
    dispatch({
      type: "UPDATE_ONGOING",
      payload: { ...existing, airDays: days },
    });
  }, [state.ongoing, dispatch]);

  const handleYearSave = useCallback(() => {
    const year = parseInt(yearInput);
    if (year && year >= 2000 && year <= 2100) {
      dispatch({ type: 'SET_ONGOING_YEAR', payload: year });
      setIsEditingYear(false);
    }
  }, [yearInput, dispatch]);

  const handleYearCancel = useCallback(() => {
    setYearInput(state.ongoingYear.toString());
    setIsEditingYear(false);
  }, [state.ongoingYear]);

  if (ongoingEntries.length === 0) {
    return (
      <div className="space-y-4 w-full">
        <div>
          {isEditingYear ? (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-extrabold">Ongoing BL (</span>
              <input
                type="number"
                value={yearInput}
                onChange={(e) => setYearInput(e.target.value)}
                className="w-20 h-8 bg-white/[0.06] border border-white/10 rounded text-center text-lg font-extrabold text-white focus:border-[#E50914] outline-none"
                min={2000}
                max={2100}
                autoFocus
              />
              <span className="text-2xl font-extrabold">)</span>
              <button onClick={handleYearSave} className="p-1 rounded-lg bg-green-500/20 text-green-400 tap-active">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={handleYearCancel} className="p-1 rounded-lg bg-red-500/20 text-red-400 tap-active">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold">Ongoing BL ({state.ongoingYear})</h1>
              <button
                onClick={() => {
                  setYearInput(state.ongoingYear.toString());
                  setIsEditingYear(true);
                }}
                className="p-1.5 rounded-lg hover:bg-white/[0.06] tap-active"
                aria-label="Edit year"
              >
                <Pencil className="w-3.5 h-3.5 text-[#666] hover:text-[#B3B3B3]" />
              </button>
            </div>
          )}
          <p className="text-sm text-[#B3B3B3]">0 currently airing</p>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <PlayCircle className="w-8 h-8 text-[#333] mb-3" />
          <p className="text-[#666] text-sm">No ongoing BLs</p>
          <p className="text-[#555] text-xs mt-1">Mark entries as Ongoing to track them here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      {/* Header with Editable Year */}
      <div>
        {isEditingYear ? (
          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold">Ongoing BL (</span>
            <input
              type="number"
              value={yearInput}
              onChange={(e) => setYearInput(e.target.value)}
              className="w-20 h-8 bg-white/[0.06] border border-white/10 rounded text-center text-lg font-extrabold text-white focus:border-[#E50914] outline-none"
              min={2000}
              max={2100}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleYearSave();
                if (e.key === 'Escape') handleYearCancel();
              }}
            />
            <span className="text-2xl font-extrabold">)</span>
            <button onClick={handleYearSave} className="p-1 rounded-lg bg-green-500/20 text-green-400 tap-active">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={handleYearCancel} className="p-1 rounded-lg bg-red-500/20 text-red-400 tap-active">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold">Ongoing BL ({state.ongoingYear})</h1>
            <button
              onClick={() => {
                setYearInput(state.ongoingYear.toString());
                setIsEditingYear(true);
              }}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] tap-active"
              aria-label="Edit year"
            >
              <Pencil className="w-3.5 h-3.5 text-[#666] hover:text-[#B3B3B3]" />
            </button>
          </div>
        )}
        <p className="text-sm text-[#B3B3B3]">{ongoingEntries.length} currently airing</p>
      </div>

      {/* Sort & Filter Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => { setShowSort(!showSort); setShowFilter(false); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all tap-active ${
            showSort ? "bg-[#E50914] text-white" : "glass text-[#B3B3B3] hover:bg-white/[0.1]"
          }`}
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          Sort
        </button>
        <button
          onClick={() => { setShowFilter(!showFilter); setShowSort(false); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all tap-active ${
            showFilter ? "bg-[#E50914] text-white" : "glass text-[#B3B3B3] hover:bg-white/[0.1]"
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          Filter
        </button>
      </div>

      {/* Sort Options */}
      {showSort && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-1.5 overflow-x-auto scrollbar-hide"
        >
          {sortOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setSort(opt.value); setShowSort(false); }}
              className={`flex-shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-all tap-active ${
                sort === opt.value
                  ? "bg-white/[0.1] text-white"
                  : "bg-transparent text-[#B3B3B3] hover:bg-white/[0.06]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </motion.div>
      )}

      {/* Filter Options */}
      {showFilter && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-1.5 overflow-x-auto scrollbar-hide"
        >
          {dayFilters.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setFilter(opt.value); setShowFilter(false); }}
              className={`flex-shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-all tap-active ${
                filter === opt.value
                  ? "bg-white/[0.1] text-white"
                  : "bg-transparent text-[#B3B3B3] hover:bg-white/[0.06]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </motion.div>
      )}

      {/* Ongoing Cards */}
      <div className="space-y-3 w-full">
        {ongoingEntries.map(({ entry, ongoingData }) => (
          <OngoingCard
            key={entry.id}
            entryId={entry.id}
            entry={entry}
            ongoingData={ongoingData}
            todayName={todayName}
            onEpisodeChange={handleEpisodeChange}
            onAirDaysChange={handleAirDaysChange}
            onEntryClick={setSelectedEntry}
          />
        ))}
      </div>

      {/* Entry Modal */}
      <EntryModal
        isOpen={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
        entry={selectedEntry}
      />
    </div>
  );
}
