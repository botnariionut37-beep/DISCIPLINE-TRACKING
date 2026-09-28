import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Check, 
  Sparkles, 
  User, 
  ShieldCheck, 
  AlertCircle 
} from 'lucide-react';

interface ProfilePhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPhotoURL: string | null;
  displayName: string | null;
  onSavePhoto: (photoURL: string) => Promise<void>;
}

// Curated high-res warrior discipline avatars
const PRESET_WARRIOR_AVATARS = [
  {
    id: 'spartan-helmet',
    name: 'Gladiator / Spartan',
    url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=200&auto=format&fit=crop&q=80',
    tag: 'Elite'
  },
  {
    id: 'focused-monk',
    name: 'Stoic Focus',
    url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=200&auto=format&fit=crop&q=80',
    tag: 'Mind'
  },
  {
    id: 'cyber-runner',
    name: 'Endurance Runner',
    url: 'https://images.unsplash.com/photo-1483721074573-586540da5703?w=200&auto=format&fit=crop&q=80',
    tag: 'Stamina'
  },
  {
    id: 'stealth-warrior',
    name: 'Iron Will',
    url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=200&auto=format&fit=crop&q=80',
    tag: 'Strength'
  },
  {
    id: 'cyber-samurai',
    name: 'Shadow Ronin',
    url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=200&auto=format&fit=crop&q=80',
    tag: 'Discipline'
  },
  {
    id: 'mountain-climber',
    name: 'Peak Climber',
    url: 'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=200&auto=format&fit=crop&q=80',
    tag: 'Apex'
  },
  {
    id: 'dicebear-bot',
    name: 'Cyber Sentinel',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=SentinelMaster',
    tag: 'Cyber'
  },
  {
    id: 'dicebear-lorelei',
    name: 'Athena Sage',
    url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=AthenaWarrior',
    tag: 'Wisdom'
  }
];

export const ProfilePhotoModal: React.FC<ProfilePhotoModalProps> = ({
  isOpen,
  onClose,
  currentPhotoURL,
  displayName,
  onSavePhoto
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<string>(currentPhotoURL || '');
  const [customUrlInput, setCustomUrlInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload a valid image file (PNG, JPG, WebP, GIF).');
      return;
    }

    if (file.size > 2.5 * 1024 * 1024) {
      setErrorMessage('Image size must be under 2.5MB.');
      return;
    }

    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setSelectedPhoto(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyCustomUrl = () => {
    if (!customUrlInput.trim().startsWith('http')) {
      setErrorMessage('Please enter a valid image URL starting with http:// or https://');
      return;
    }
    setErrorMessage(null);
    setSelectedPhoto(customUrlInput.trim());
    setCustomUrlInput('');
  };

  const handleSave = async () => {
    if (!selectedPhoto) {
      setErrorMessage('Please select or upload a profile picture.');
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await onSavePhoto(selectedPhoto);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update profile picture.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div 
        className="relative w-full max-w-lg bg-[#0C0E12] border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono mb-1.5">
              <Sparkles size={12} />
              <span>Warrior Identity</span>
            </div>
            <h2 className="text-xl font-sans font-bold text-white tracking-tight">
              Choose Profile Picture
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Select a warrior avatar or upload your custom photo.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto pr-1 space-y-5 flex-1">
          {/* Active Preview */}
          <div className="p-4 rounded-2xl bg-[#12151D] border border-white/5 flex items-center gap-4">
            <div className="relative">
              {selectedPhoto ? (
                <img
                  src={selectedPhoto}
                  alt="Preview"
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500 shadow-lg shadow-emerald-500/20"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500">
                  <User size={28} />
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-black p-1 rounded-full shadow">
                <Check size={10} className="stroke-[3]" />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                {displayName || 'Warrior Profile'}
              </h4>
              <p className="text-xs text-gray-400 mt-0.5">
                Will be displayed in your profile header and on the arena leaderboard.
              </p>
            </div>
          </div>

          {/* Upload Button */}
          <div>
            <label className="block text-xs font-mono text-gray-400 mb-2">
              Upload from your device
            </label>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/30 text-white font-sans text-xs font-medium transition-all cursor-pointer"
            >
              <Upload size={14} className="text-emerald-400" />
              <span>Upload Custom Image (PNG, JPG, WebP)</span>
            </button>
          </div>

          {/* Image URL Input */}
          <div>
            <label className="block text-xs font-mono text-gray-400 mb-1.5">
              Or paste image URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={customUrlInput}
                onChange={(e) => setCustomUrlInput(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="flex-1 bg-[#161A22] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50"
              />
              <button
                type="button"
                onClick={handleApplyCustomUrl}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-sans text-xs font-medium transition-colors cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>

          {/* Curated Warrior Avatars Grid */}
          <div>
            <label className="block text-xs font-mono text-gray-400 mb-2.5">
              Or select a warrior avatar
            </label>
            <div className="grid grid-cols-4 gap-2.5">
              {PRESET_WARRIOR_AVATARS.map((avatar) => {
                const isSelected = selectedPhoto === avatar.url;
                return (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => {
                      setSelectedPhoto(avatar.url);
                      setErrorMessage(null);
                    }}
                    className={`relative rounded-2xl overflow-hidden border-2 transition-all p-1 cursor-pointer group flex flex-col items-center ${
                      isSelected
                        ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-500/10'
                        : 'border-white/10 hover:border-white/30 bg-[#12151D]'
                    }`}
                  >
                    <img
                      src={avatar.url}
                      alt={avatar.name}
                      className="w-full aspect-square rounded-xl object-cover transition-transform group-hover:scale-105"
                    />
                    <span className="text-[10px] text-gray-400 group-hover:text-white mt-1 truncate w-full text-center">
                      {avatar.name.split(' ')[0]}
                    </span>
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-emerald-500 text-black p-0.5 rounded-full shadow-md">
                        <Check size={10} className="stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2 text-xs">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-white/5 mt-4 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-sans transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-sans font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
          >
            {isSaving ? (
              <span className="inline-block w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <ShieldCheck size={14} />
            )}
            <span>Save Profile Picture</span>
          </button>
        </div>
      </div>
    </div>
  );
};
