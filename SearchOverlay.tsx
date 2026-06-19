import { useState, useMemo, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import Poster from './Poster';
import StatusBadge from './StatusBadge';
import EntryModal from './EntryModal';
import type { Entry } from '@/types';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

const SearchResultItem = memo(function SearchResultItem({
  entry,
  onClick
}: {
  entry: Entry;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-xl bg-[#141414] card-hover cursor-pointer"
    >
      <Poster src={entry.poster} title={entry.title} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{entry.title}</p>
        <p className="text-xs text-[#B3B3B3]">
          {entry.type} · {entry.year} · {entry.country}
        </p>
      </div>
      <StatusBadge status={entry.status} />
    </div>
  );
});

export default function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const { state } = useApp();
  const [query, setQuery] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const debouncedQuery = useDebounce(query, 200);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) setQuery("");
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const results = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    const q = debouncedQuery.toLowerCase();
    return state.entries.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.country.toLowerCase().includes(q) ||
        e.type.toLowerCase().includes(q) ||
        e.status.toLowerCase().includes(q) ||
        e.year.toString().includes(q)
    );
  }, [debouncedQuery, state.entries]);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black z-[100] flex flex-col"
          >
            {/* Search Header */}
            <div className="flex items-center gap-3 p-4 border-b border-white/[0.06]">
              <div className="flex-1 flex items-center gap-2 bg-white/[0.06] rounded-lg px-3 h-12 border border-white/10 focus-within:border-[#E50914] focus-within:ring-1 focus-within:ring-[#E50914]/20 transition-all">
                <Search className="w-5 h-5 text-[#B3B3B3] flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search titles, countries, types..."
                  className="flex-1 bg-transparent text-white placeholder:text-[#666] outline-none text-base"
                />
                {query && (
                  <button onClick={() => setQuery("")} className="tap-active">
                    <X className="w-4 h-4 text-[#B3B3B3]" />
                  </button>
                )}
              </div>
              <button onClick={onClose} className="text-[#B3B3B3] text-sm font-medium tap-active">
                Cancel
              </button>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-4">
              {query.trim() && results.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16">
                  <Search className="w-12 h-12 text-[#666] mb-4" />
                  <p className="text-base text-[#B3B3B3]">No results found</p>
                </div>
              )}

              {results.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs uppercase text-[#B3B3B3] font-medium tracking-wider mb-2">
                    {results.length} result{results.length !== 1 ? "s" : ""}
                  </p>
                  {results.map((entry) => (
                    <SearchResultItem
                      key={entry.id}
                      entry={entry}
                      onClick={() => setSelectedEntry(entry)}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <EntryModal
        isOpen={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
        entry={selectedEntry}
      />
    </>
  );
}
