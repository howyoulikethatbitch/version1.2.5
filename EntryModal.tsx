import { useState, useCallback, useEffect } from 'react';
import { Heart, Trash2, Camera } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApp } from '@/context/AppContext';
import Poster from './Poster';
import StatusBadge from './StatusBadge';
import RatingCircle from './RatingCircle';
import AirDaySelector from './AirDaySelector';
import type { Entry, Status, AirDay, FavoriteEntry } from '@/types';

const COUNTRIES = [
  'Thailand', 'Japan', 'South Korea', 'Taiwan', 'China', 'Philippines',
  'Vietnam', 'Singapore', 'Malaysia', 'Indonesia', 'India',
  'US', 'UK', 'Canada', 'Australia', 'Italy', 'Spain', 'France',
  'Germany', 'Netherlands', 'Belgium', 'Argentina', 'Brazil', 'Mexico',
  'Other'
];

interface EntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (entry: Entry) => void;
  entry?: Entry | null;
}

export default function EntryModal({ isOpen, onClose, onSave, entry }: EntryModalProps) {
  const { dispatch, isFavorited, getFavoriteByEntryId, getOngoingByEntryId } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form state - ALWAYS initialize from entry props when available
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'Movie' | 'Series'>('Series');
  const [year, setYear] = useState(new Date().getFullYear());
  const [country, setCountry] = useState('Thailand');
  const [status, setStatus] = useState<Status>('COMPLETE');
  const [posterData, setPosterData] = useState<string | null>(null);
  const [airDays, setAirDays] = useState<AirDay[]>([]);
  const [currentEp, setCurrentEp] = useState(0);
  const [totalEp, setTotalEp] = useState(1);
  const [error, setError] = useState('');

  const favorite = entry ? getFavoriteByEntryId(entry.id) : null;
  const ongoing = entry ? getOngoingByEntryId(entry.id) : null;
  const favorited = entry ? isFavorited(entry.id) : false;

  // Reset form whenever entry changes or modal opens/closes
  const resetForm = useCallback(() => {
    if (entry) {
      // EDIT MODE: Populate from actual entry data - NEVER use defaults
      setTitle(entry.title);
      setType(entry.type);
      setYear(entry.year);
      setCountry(entry.country.replace(/\s*\p{Emoji}\s*/gu, '').trim());
      setStatus(entry.status);
      setPosterData(entry.poster);
      if (ongoing) {
        setAirDays(ongoing.airDays as AirDay[]);
        setCurrentEp(ongoing.currentEpisode);
        setTotalEp(ongoing.totalEpisodes);
      } else {
        setAirDays([]);
        setCurrentEp(0);
        setTotalEp(1);
      }
    } else {
      // ADD MODE: Use sensible defaults
      setTitle('');
      setType('Series');
      setYear(new Date().getFullYear());
      setCountry('Thailand');
      setStatus('COMPLETE');
      setPosterData(null);
      setAirDays([]);
      setCurrentEp(0);
      setTotalEp(1);
    }
    setError('');
    setShowDeleteConfirm(false);
  }, [entry, ongoing]);

  useEffect(() => {
    if (isOpen) {
      resetForm();
      // If editing an existing entry, start in view mode
      // If adding a new entry, start in edit mode
      setIsEditing(!entry);
    }
  }, [isOpen, entry, resetForm]);

  const handlePosterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPosterData(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setError('');

    const newEntry: Entry = {
      id: entry?.id || `bl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: title.trim(),
      type,
      year,
      country,
      status,
      poster: posterData
    };

    if (onSave) {
      onSave(newEntry);
    } else {
      if (entry) {
        dispatch({ type: 'UPDATE_ENTRY', payload: newEntry });
      } else {
        dispatch({ type: 'ADD_ENTRY', payload: newEntry });
      }
    }

    if (status === 'ONGOING') {
      dispatch({
        type: 'UPDATE_ONGOING',
        payload: {
          entryId: newEntry.id,
          currentEpisode: currentEp,
          totalEpisodes: totalEp,
          airDays: airDays.length > 0 ? airDays : ['Monday'] as AirDay[]
        }
      });
    }

    setIsEditing(false);
    if (!entry) onClose();
  };

  const handleToggleFavorite = () => {
    if (!entry) return;
    dispatch({ type: 'TOGGLE_FAVORITE', payload: entry.id });
  };

  const handleUpdateFavorite = (updates: Partial<FavoriteEntry>) => {
    if (!entry || !favorite) return;
    dispatch({ type: 'UPDATE_FAVORITE', payload: { ...favorite, ...updates } });
  };

  const handleDelete = () => {
    if (!entry) return;
    dispatch({ type: 'DELETE_ENTRY', payload: entry.id });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#141414] border-white/10 text-white max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center justify-between">
            <span>{entry ? (isEditing ? 'Edit Entry' : entry.title) : 'Add New Entry'}</span>
          </DialogTitle>
        </DialogHeader>

        {entry && !isEditing && (
          <div className="space-y-4">
            {/* Poster and quick actions */}
            <div className="flex gap-4">
              <Poster src={entry.poster} title={entry.title} size="lg" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <StatusBadge status={entry.status} />
                  <span className="text-[#888] text-xs">{entry.type}</span>
                </div>
                <p className="text-[#B3B3B3] text-sm">{entry.year}</p>
                <p className="text-[#888] text-xs">{entry.country}</p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleToggleFavorite}
                    className={`p-2 rounded-full transition-colors ${favorited ? 'bg-[#E50914]/20 text-[#E50914]' : 'bg-white/[0.06] text-[#666] hover:text-[#E50914]'}`}
                  >
                    <Heart className={`w-4 h-4 ${favorited ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 rounded-full bg-white/[0.06] text-[#666] hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="p-2 rounded-full bg-white/[0.06] text-[#666] hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Ongoing info */}
            {ongoing && (
              <div className="bg-white/[0.04] rounded-xl p-4 space-y-3">
                <h4 className="text-sm font-medium text-[#B3B3B3]">Progress</h4>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Label className="text-[10px] text-[#666]">Episode</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="number"
                        value={ongoing.currentEpisode}
                        onChange={e => dispatch({
                          type: 'UPDATE_ONGOING',
                          payload: { ...ongoing, currentEpisode: parseInt(e.target.value) || 0 }
                        })}
                        className="w-16 h-8 bg-white/[0.06] border-white/10 text-white text-xs"
                      />
                      <span className="text-[#666]">/</span>
                      <Input
                        type="number"
                        value={ongoing.totalEpisodes}
                        onChange={e => dispatch({
                          type: 'UPDATE_ONGOING',
                          payload: { ...ongoing, totalEpisodes: parseInt(e.target.value) || 1 }
                        })}
                        className="w-16 h-8 bg-white/[0.06] border-white/10 text-white text-xs"
                      />
                    </div>
                  </div>
                </div>
                <AirDaySelector
                  value={ongoing.airDays as AirDay[]}
                  onChange={days => dispatch({
                    type: 'UPDATE_ONGOING',
                    payload: { ...ongoing, airDays: days }
                  })}
                />
              </div>
            )}

            {/* Favorite ratings */}
            {favorite && (
              <div className="bg-white/[0.04] rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-[#B3B3B3]">Ratings</h4>
                  <RatingCircle rating={favorite.overallRating} size={36} />
                </div>
                {[
                  ['storyline', 'Storyline'],
                  ['acting', 'Acting'],
                  ['music', 'Music'],
                  ['chemistry', 'Chemistry'],
                  ['cinematography', 'Cinematography']
                ].map(([key, label]) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-xs text-[#888] w-24">{label}</span>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      step={1}
                      value={favorite[key as keyof FavoriteEntry] as number}
                      onChange={e => handleUpdateFavorite({ [key]: parseInt(e.target.value) })}
                      className="flex-1 accent-[#E50914] h-1"
                    />
                    <span className="text-xs text-[#B3B3B3] w-6 text-right">
                      {favorite[key as keyof FavoriteEntry] as number}
                    </span>
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  {[
                    'originality', 'flowAndPacing', 'characterDepth',
                    'relationshipDynamics', 'emotionalImpact', 'ending', 'rewatchValue'
                  ].map(key => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={favorite[key as keyof FavoriteEntry] as boolean}
                        onChange={e => handleUpdateFavorite({ [key]: e.target.checked })}
                        className="accent-[#E50914] w-3.5 h-3.5 rounded"
                      />
                      <span className="text-[10px] text-[#888] capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Delete confirmation */}
            {showDeleteConfirm && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-red-400 text-sm">Delete this entry?</p>
                <p className="text-[#888] text-xs mt-1">This will also remove it from favorites and top 10.</p>
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="border-white/10 text-[#B3B3B3] hover:bg-white/[0.06]"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Edit/Add Form */}
        {(!entry || isEditing) && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="relative w-[120px] h-[160px] mx-auto rounded-lg border-2 border-dashed border-white/15 flex flex-col items-center justify-center cursor-pointer hover:border-[#E50914]/50 transition-colors overflow-hidden"
                onClick={() => document.getElementById('poster-upload')?.click()}
              >
                {posterData ? (
                  <>
                    <img src={posterData} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  </>
                ) : (
                  <>
                    <Camera className="w-8 h-8 text-[#B3B3B3] mb-2" />
                    <span className="text-[13px] text-[#B3B3B3] text-center px-2">Tap to upload poster</span>
                  </>
                )}
                <input
                  id="poster-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePosterUpload}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[#B3B3B3]">Title</Label>
              <Input
                value={title}
                onChange={e => { setTitle(e.target.value); setError(''); }}
                placeholder="Enter title..."
                className={`bg-white/[0.06] border-white/10 text-white placeholder-[#666] focus:border-[#E50914] ${error ? 'border-red-500' : ''}`}
              />
              {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[#B3B3B3]">Type</Label>
                <div className="flex gap-2">
                  {(['Series', 'Movie'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                        type === t
                          ? "bg-[#E50914] text-white"
                          : "bg-white/[0.06] text-[#B3B3B3] hover:bg-white/[0.1]"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[#B3B3B3]">Year</Label>
                <Input
                  type="number"
                  value={year}
                  onChange={e => setYear(parseInt(e.target.value) || new Date().getFullYear())}
                  min={1980}
                  max={2030}
                  className="bg-white/[0.06] border-white/10 text-white focus:border-[#E50914]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[#B3B3B3]">Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="bg-white/[0.06] border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-white/10 max-h-60">
                  {COUNTRIES.map(c => (
                    <SelectItem key={c} value={c} className="text-white">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[#B3B3B3]">Status</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['COMPLETE', 'ONGOING', 'DROPPED', 'INCOMPLETE'] as Status[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                      status === s ? 'bg-[#E50914] text-white' : 'bg-white/[0.06] text-[#888] hover:bg-white/[0.1]'
                    }`}
                  >
                    {s === 'COMPLETE' ? 'Complete' : s === 'ONGOING' ? 'Ongoing' : s === 'DROPPED' ? 'Dropped' : 'Incomplete'}
                  </button>
                ))}
              </div>
            </div>

            {status === 'ONGOING' && (
              <div className="space-y-3 bg-white/[0.04] rounded-xl p-4">
                <Label className="text-[#B3B3B3]">Air Days</Label>
                <AirDaySelector value={airDays} onChange={setAirDays} />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] text-[#666]">Current Episode</Label>
                    <Input
                      type="number"
                      value={currentEp}
                      onChange={e => setCurrentEp(parseInt(e.target.value) || 0)}
                      className="bg-white/[0.06] border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-[#666]">Total Episodes</Label>
                    <Input
                      type="number"
                      value={totalEp}
                      onChange={e => setTotalEp(parseInt(e.target.value) || 1)}
                      className="bg-white/[0.06] border-white/10 text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              {entry && (
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="border-white/10 text-[#B3B3B3] hover:bg-white/[0.06]"
                >
                  Cancel
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={!title.trim()}
                className="flex-1 bg-[#E50914] hover:bg-[#E50914]/90 text-white font-semibold"
              >
                Save
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
