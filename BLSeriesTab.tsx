import { useState, useMemo, memo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Heart, Star, Pencil, Trash2, ArrowUpDown } from "lucide-react";
import { useApp } from "@/context/AppContext";
import type { Entry } from "@/types";
import Poster from "../Poster";
import StatusBadge from "../StatusBadge";
import EntryModal from "../EntryModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type FilterType = "All" | "Series" | "Movies" | "Complete" | "Ongoing" | "Dropped" | "Incomplete";
type SortType = "yearNew" | "yearOld" | "titleAZ" | "titleZA" | "country" | "status";

const filters: FilterType[] = ["All", "Series", "Movies", "Complete", "Ongoing", "Dropped", "Incomplete"];

const sortOptions: { value: SortType; label: string }[] = [
  { value: "yearNew", label: "Year (Newest)" },
  { value: "yearOld", label: "Year (Oldest)" },
  { value: "titleAZ", label: "Title (A → Z)" },
  { value: "titleZA", label: "Title (Z → A)" },
  { value: "country", label: "Country" },
  { value: "status", label: "Status" },
];

const EntryCard = memo(function EntryCard({
  entry,
  favorited,
  top10Info,
  onToggleFavorite,
  onAddToTop10,
  onEdit,
  onDelete,
  canAddToTop10,
}: {
  entry: Entry;
  favorited: boolean;
  top10Info: { year: number; rank: number } | null;
  onToggleFavorite: (id: string) => void;
  onAddToTop10: (entry: Entry) => void;
  onEdit: (entry: Entry) => void;
  onDelete: (id: string) => void;
  canAddToTop10: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.25 }}
      className="flex items-start gap-3 p-3 rounded-xl bg-[#141414] card-hover w-full min-w-0"
    >
      <Poster src={entry.poster} title={entry.title} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold truncate">{entry.title}</p>
            <p className="text-xs text-[#B3B3B3] mt-0.5">
              {entry.type} · {entry.year} · {entry.country}
            </p>
          </div>
          <StatusBadge status={entry.status} />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <button
            onClick={() => onToggleFavorite(entry.id)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium tap-active transition-colors ${
              favorited
                ? "bg-[#FF2D7B]/15 text-[#FF2D7B]"
                : "bg-white/[0.06] text-[#B3B3B3] hover:bg-white/[0.1]"
            }`}
          >
            <Heart className={`w-3 h-3 ${favorited ? "fill-current" : ""}`} />
            <span className="hidden sm:inline">{favorited ? "Favorited" : "Favorite"}</span>
          </button>

          {top10Info ? (
            <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-[#E50914]/15 text-[#E50914]">
              <Star className="w-3 h-3 fill-current" />
              #{top10Info.rank}
            </span>
          ) : (
            <button
              onClick={() => onAddToTop10(entry)}
              disabled={!canAddToTop10}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-white/[0.06] text-[#B3B3B3] hover:bg-white/[0.1] tap-active disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Star className="w-3 h-3" />
              <span className="hidden sm:inline">Top 10</span>
            </button>
          )}

          <button
            onClick={() => onEdit(entry)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-white/[0.06] text-[#B3B3B3] hover:bg-white/[0.1] tap-active"
          >
            <Pencil className="w-3 h-3" />
            <span className="hidden sm:inline">Edit</span>
          </button>

          <button
            onClick={() => onDelete(entry.id)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-white/[0.06] text-[#B3B3B3] hover:bg-red-500/15 hover:text-red-400 tap-active"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </motion.div>
  );
});

export default function BLSeriesTab() {
  const { state, dispatch, isFavorited, isInTop10 } = useApp();
  const [filter, setFilter] = useState<FilterType>("All");
  const [sort, setSort] = useState<SortType>("yearNew");
  const [showSort, setShowSort] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filteredAndSortedEntries = useMemo(() => {
    let entries = state.entries.filter((e) => {
      switch (filter) {
        case "Series": return e.type === "Series";
        case "Movies": return e.type === "Movie";
        case "Complete": return e.status === "COMPLETE";
        case "Ongoing": return e.status === "ONGOING";
        case "Dropped": return e.status === "DROPPED";
        case "Incomplete": return e.status === "INCOMPLETE";
        default: return true;
      }
    });

    entries = [...entries].sort((a, b) => {
      switch (sort) {
        case "yearNew": return b.year - a.year;
        case "yearOld": return a.year - b.year;
        case "titleAZ": return a.title.localeCompare(b.title);
        case "titleZA": return b.title.localeCompare(a.title);
        case "country": return a.country.localeCompare(b.country);
        case "status": return a.status.localeCompare(b.status);
        default: return 0;
      }
    });

    return entries;
  }, [state.entries, filter, sort]);

  const handleAdd = useCallback(() => {
    setEditingEntry(null);
    setModalOpen(true);
  }, []);

  const handleEdit = useCallback((entry: Entry) => {
    setEditingEntry(entry);
    setModalOpen(true);
  }, []);

  const handleSave = useCallback((entry: Entry) => {
    if (editingEntry) {
      dispatch({ type: "UPDATE_ENTRY", payload: entry });
    } else {
      dispatch({ type: "ADD_ENTRY", payload: entry });
    }
  }, [editingEntry, dispatch]);

  const handleDelete = useCallback((id: string) => {
    dispatch({ type: "DELETE_ENTRY", payload: id });
    setDeleteConfirm(null);
  }, [dispatch]);

  const handleToggleFavorite = useCallback((id: string) => {
    dispatch({ type: "TOGGLE_FAVORITE", payload: id });
  }, [dispatch]);

  const handleAddToTop10 = useCallback((entry: Entry) => {
    const drawer = state.top10Drawers.find((d) => d.year === entry.year);
    if (drawer && drawer.entries.length < 10) {
      dispatch({ type: "ADD_TO_TOP10", payload: { year: entry.year, entryId: entry.id } });
    }
  }, [state.top10Drawers, dispatch]);

  return (
    <div className="space-y-4 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">BL Series &amp; Movies</h1>
          <p className="text-sm text-[#B3B3B3]">{filteredAndSortedEntries.length} entries</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 bg-[#E50914] text-white px-4 py-2 rounded-lg text-sm font-semibold tap-active flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      {/* Filter Chips - scrollable with no overflow issues */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4" style={{ WebkitOverflowScrolling: "touch" }}>
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-all tap-active ${
              filter === f
                ? "bg-[#E50914] text-white"
                : "glass text-[#B3B3B3] hover:bg-white/[0.1]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Sort Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowSort(!showSort)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all tap-active ${
            showSort ? "bg-[#E50914] text-white" : "glass text-[#B3B3B3] hover:bg-white/[0.1]"
          }`}
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          Sort
        </button>
        {showSort && (
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide flex-1">
            {sortOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSort(opt.value)}
                className={`flex-shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-all tap-active ${
                  sort === opt.value
                    ? "bg-white/[0.1] text-white"
                    : "bg-transparent text-[#B3B3B3] hover:bg-white/[0.06]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Entry List */}
      <div className="space-y-2 w-full">
        <AnimatePresence mode="popLayout">
          {filteredAndSortedEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Plus className="w-8 h-8 text-[#333] mb-3" />
              <p className="text-[#666] text-sm">No entries found</p>
              <p className="text-[#555] text-xs mt-1">Add your first BL!</p>
            </div>
          ) : (
            filteredAndSortedEntries.map((entry) => {
              const favorited = isFavorited(entry.id);
              const top10Info = isInTop10(entry.id);
              const drawer = state.top10Drawers.find((d) => d.year === entry.year);
              const canAddToTop10 = !!drawer && drawer.entries.length < 10;

              return (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  favorited={favorited}
                  top10Info={top10Info}
                  onToggleFavorite={handleToggleFavorite}
                  onAddToTop10={handleAddToTop10}
                  onEdit={handleEdit}
                  onDelete={setDeleteConfirm}
                  canAddToTop10={canAddToTop10}
                />
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Entry Modal */}
      <EntryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        entry={editingEntry}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent className="bg-[#141414] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">Delete Entry?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#B3B3B3]">
              This will remove the entry from all lists (Ongoing, Favorites, Top 10).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="bg-white/[0.06] border-white/10 text-white hover:bg-white/10 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-[#E50914] text-white hover:bg-[#E50914]/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
