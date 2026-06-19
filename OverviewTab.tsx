import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Tv, CheckCircle, Play, XCircle, AlertCircle, Heart, Star, TrendingUp } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import Poster from '../Poster';
import EntryModal from '../EntryModal';
import type { Entry } from '@/types';

export default function OverviewTab() {
  const { state } = useApp();
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);

  const stats = useMemo(() => {
    const total = state.entries.length;
    const completed = state.entries.filter(e => e.status === 'COMPLETE').length;
    const ongoing = state.entries.filter(e => e.status === 'ONGOING').length;
    const dropped = state.entries.filter(e => e.status === 'DROPPED').length;
    const incomplete = state.entries.filter(e => e.status === 'INCOMPLETE').length;
    const favorites = state.favorites.length;
    const top10 = state.top10Drawers.reduce((acc, d) => acc + d.entries.length, 0);
    const avgRating = state.favorites.length > 0
      ? (state.favorites.reduce((s, f) => s + f.overallRating, 0) / state.favorites.length).toFixed(1)
      : '0.0';
    return { total, completed, ongoing, dropped, incomplete, favorites, top10, avgRating };
  }, [state]);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const airingToday = useMemo(() => {
    return state.ongoing
      .filter(o => o.airDays.includes(today as typeof o.airDays[number]))
      .map(o => {
        const entry = state.entries.find(e => e.id === o.entryId);
        return entry ? { entry, ongoing: o } : null;
      })
      .filter(Boolean) as { entry: Entry; ongoing: typeof state.ongoing[number] }[];
  }, [state, today]);

  const statCards = [
    { label: 'TOTAL ENTRIES', value: stats.total, icon: Tv, color: 'text-white' },
    { label: 'COMPLETED', value: stats.completed, icon: CheckCircle, color: 'text-green-400' },
    { label: 'ONGOING', value: stats.ongoing, icon: Play, color: 'text-blue-400' },
    { label: 'DROPPED', value: stats.dropped, icon: XCircle, color: 'text-red-400' },
    { label: 'INCOMPLETE', value: stats.incomplete, icon: AlertCircle, color: 'text-yellow-400' },
    { label: 'FAVORITES', value: stats.favorites, icon: Heart, color: 'text-[#E50914]' },
    { label: 'TOP 10', value: stats.top10, icon: Star, color: 'text-yellow-400' },
    { label: 'AVG RATING', value: `★ ${stats.avgRating}`, icon: TrendingUp, color: 'text-yellow-400' },
  ];

  return (
    <div className="space-y-6 w-full">
      <div className="grid grid-cols-2 gap-3">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-3.5 h-3.5 ${card.color}`} />
                <span className="text-[10px] text-[#888] font-medium tracking-wide">{card.label}</span>
              </div>
              <p className={`text-2xl font-bold ${card.color === 'text-white' ? 'text-white' : card.color}`}>
                {card.value}
              </p>
            </motion.div>
          );
        })}
      </div>

      {airingToday.length > 0 && (
        <div>
          <h3 className="text-white font-semibold text-sm mb-3">
            <span className="text-[#E50914] mr-2">●</span>
            Currently Airing Today <span className="text-[#888] font-normal">{today}</span>
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {airingToday.map(({ entry, ongoing }) => (
              <button
                key={entry.id}
                onClick={() => setSelectedEntry(entry)}
                className="flex-shrink-0 w-32 text-left"
              >
                <Poster src={entry.poster} title={entry.title} size="lg" className="w-32 h-44 rounded-xl" />
                <p className="text-white text-xs font-medium mt-2 truncate">{entry.title}</p>
                <p className="text-[#888] text-[10px]">
                  Ep {ongoing.currentEpisode}/{ongoing.totalEpisodes}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Top 10 Preview */}
      {state.top10Drawers.length > 0 && (
        <div>
          <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-400" />
            Top 10 Rankings
          </h3>
          <div className="space-y-2">
            {state.top10Drawers.slice(0, 3).map(drawer => (
              <div key={drawer.year} className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{drawer.year}</span>
                  <span className="text-xs text-[#888]">{drawer.entries.length}/10</span>
                </div>
                {drawer.entries.length > 0 && (
                  <div className="flex gap-2 mt-2 overflow-x-auto scrollbar-hide">
                    {drawer.entries.slice(0, 5).map(item => {
                      const entry = state.entries.find(e => e.id === item.entryId);
                      if (!entry) return null;
                      return (
                        <div key={item.entryId} className="flex-shrink-0 text-center w-14">
                          <Poster src={entry.poster} title={entry.title} size="sm" className="w-10 h-14 rounded-lg mx-auto" />
                          <span className="text-[9px] text-[#E50914] font-bold">{item.rank}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <EntryModal
        isOpen={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
        entry={selectedEntry}
      />
    </div>
  );
}
