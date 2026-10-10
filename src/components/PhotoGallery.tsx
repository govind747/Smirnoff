import { useState } from 'react';
import { Camera, Check, ImagePlus, MessageCircle, X } from 'lucide-react';
import type { ActivityPhoto } from '@/lib/supabase';

type Props = {
  photos: ActivityPhoto[];
  onUpload: (file: File, type: 'login' | 'logout' | 'slot', slotNumber?: number) => Promise<void>;
  title?: string;
};

const labels: Record<ActivityPhoto['photo_type'], string> = {
  login: 'Login',
  logout: 'Logout',
  slot: 'Slot',
};

export default function PhotoGallery({ photos, onUpload, title = 'Activity photos' }: Props) {
  const [type, setType] = useState<ActivityPhoto['photo_type']>('login');
  const [slotNumber, setSlotNumber] = useState('1');
  const [uploading, setUploading] = useState(false);
  const [activePhoto, setActivePhoto] = useState<ActivityPhoto | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === photos.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(photos.map((p) => p.id)));
    }
  };

  const shareSelected = async () => {
    const chosen = photos.filter((p) => selected.has(p.id));
    if (!chosen.length) return;
    const text = `${title}\n${chosen.map((photo) => `${labels[photo.photo_type]}${photo.slot_number ? ` ${photo.slot_number}` : ''} photo: ${photo.photo_url}`).join('\n')}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, text });
        return;
      } catch {
        // fall through to WhatsApp
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const shareAll = async () => {
    if (!photos.length) return;
    const text = `${title}\n${photos.map((photo) => `${labels[photo.photo_type]}${photo.slot_number ? ` ${photo.slot_number}` : ''} photo: ${photo.photo_url}`).join('\n')}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, text });
        return;
      } catch {
        // fall through to WhatsApp
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    await onUpload(file, type, type === 'slot' ? Number(slotNumber) : undefined);
    setUploading(false);
  };

  const handleMultiUpload = async (files: FileList) => {
    setUploading(true);
    for (const file of Array.from(files)) {
      await onUpload(file, type, type === 'slot' ? Number(slotNumber) : undefined);
    }
    setUploading(false);
  };

  return (
    <div className="bg-jamun-800/40 border border-jamun-700/30 rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-mint-300 text-xs font-medium tracking-wider uppercase">Evidence gallery</p>
          <h3 className="text-white font-semibold">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {photos.length > 0 && (
            <button
              onClick={() => { setSelectMode(!selectMode); setSelected(new Set()); }}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs border transition-colors ${selectMode ? 'border-mint-300/50 bg-mint-400/15 text-mint-200' : 'border-jamun-600/40 text-jamun-200 hover:text-white'}`}
            >
              <Check className="w-4 h-4" /> {selectMode ? 'Cancel' : 'Select'}
            </button>
          )}
          <button
            onClick={shareAll}
            disabled={!photos.length}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#25D366]/15 text-[#8af0ad] text-xs disabled:opacity-40 hover:bg-[#25D366]/25 transition-colors"
          >
            <MessageCircle className="w-4 h-4" /> Share all
          </button>
        </div>
      </div>

      {selectMode && photos.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-4 px-3 py-2.5 rounded-xl bg-jamun-900/50 border border-jamun-700/30">
          <button onClick={selectAll} className="text-xs text-mint-200 hover:text-white transition-colors">
            {selected.size === photos.length ? 'Deselect all' : 'Select all'}
          </button>
          <span className="text-jamun-300 text-xs">{selected.size} selected</span>
          <button
            onClick={shareSelected}
            disabled={!selected.size}
            className="ml-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#25D366]/15 text-[#8af0ad] text-xs disabled:opacity-40 hover:bg-[#25D366]/25 transition-colors"
          >
            <MessageCircle className="w-4 h-4" /> Share selected
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {(['login', 'logout', 'slot'] as const).map((photoType) => (
          <button
            key={photoType}
            onClick={() => setType(photoType)}
            className={`px-3 py-2 rounded-lg text-xs border transition-colors ${type === photoType ? 'border-mint-300/50 bg-mint-400/15 text-mint-200' : 'border-jamun-600/40 text-jamun-200'}`}
          >
            {labels[photoType]} photo
          </button>
        ))}
        {type === 'slot' && (
          <select
            value={slotNumber}
            onChange={(event) => setSlotNumber(event.target.value)}
            className="bg-jamun-900 border border-jamun-600/40 rounded-lg px-3 text-xs text-white"
          >
            <option value="1">2-4 PM</option>
            <option value="2">4-6 PM</option>
            <option value="3">6-8 PM</option>
            <option value="4">8-10 PM</option>
          </select>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <label className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-mint-300/30 bg-mint-400/5 text-mint-200 text-sm cursor-pointer hover:bg-mint-400/10 transition-colors">
          <ImagePlus className="w-4 h-4" /> {uploading ? 'Uploading...' : `Add single ${labels[type].toLowerCase()} photo`}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleUpload(file); event.currentTarget.value = ''; }}
          />
        </label>
        <label className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-gold-400/30 bg-gold-400/5 text-gold-300 text-sm cursor-pointer hover:bg-gold-400/10 transition-colors">
          <ImagePlus className="w-4 h-4" /> {uploading ? 'Uploading...' : `Add multiple ${labels[type].toLowerCase()} photos`}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={(event) => { const files = event.target.files; if (files && files.length) void handleMultiUpload(files); event.currentTarget.value = ''; }}
          />
        </label>
      </div>

      {photos.length ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative aspect-square rounded-xl overflow-hidden border border-white/10 group"
            >
              <button
                onClick={() => selectMode ? toggleSelect(photo.id) : setActivePhoto(photo)}
                className="block w-full h-full"
              >
                <img
                  src={photo.photo_url}
                  alt={`${labels[photo.photo_type]} activity`}
                  className={`w-full h-full object-cover group-hover:scale-105 transition-transform ${selectMode && selected.has(photo.id) ? 'opacity-60' : ''}`}
                />
              </button>
              {selectMode && (
                <button
                  onClick={() => toggleSelect(photo.id)}
                  className={`absolute top-2 left-2 w-6 h-6 rounded-md flex items-center justify-center transition-all ${selected.has(photo.id) ? 'bg-mint-400 text-jamun-950' : 'bg-black/50 text-white border border-white/30'}`}
                >
                  {selected.has(photo.id) && <Check className="w-4 h-4" />}
                </button>
              )}
              <span className="absolute bottom-0 inset-x-0 bg-black/65 text-white text-[10px] px-2 py-1 text-left pointer-events-none">
                {labels[photo.photo_type]}{photo.slot_number ? ` ${photo.slot_number}` : ''}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center text-jamun-300 text-sm">
          <Camera className="w-8 h-8 mx-auto mb-2 text-jamun-500" />
          No photos added yet
        </div>
      )}

      {activePhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setActivePhoto(null)}>
          <div className="relative max-w-3xl max-h-[90vh]" onClick={(event) => event.stopPropagation()}>
            <button onClick={() => setActivePhoto(null)} className="absolute -right-2 -top-10 text-white">
              <X className="w-6 h-6" />
            </button>
            <img src={activePhoto.photo_url} alt="Activity evidence enlarged" className="max-h-[85vh] max-w-full rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
}
