// src/components/user-dashboard/CharactersTab.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { CharacterEquipment } from '@/types/api';
import { 
  User, Shield, Star, Loader2, Sparkles, Crown, Zap
} from 'lucide-react';

interface CharactersTabProps {
  characters: any[];
  isLoading: boolean;
  refreshData: () => void;
}

// Equipment Item Component using MapleStory.io
const EquipmentItem: React.FC<{
  itemId: number;
  slotName: string;
  type: string;
}> = ({ itemId, slotName, type }) => {
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [itemName, setItemName] = useState<string>('');
  const [nameLoading, setNameLoading] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const loadIcon = async () => {
      try {
        const url = `https://maplestory.io/api/GMS/241/item/${itemId}/icon`;
        const img = new Image();
        img.src = url;
        
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          setTimeout(reject, 3000);
        });

        setIconUrl(url);
      } catch (err) {
        console.log(`Failed to load icon for item ${itemId}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadIcon();
  }, [itemId]);

  // Fetch item name using the MapleStory API service
  useEffect(() => {
    let mounted = true;

    const fetchItemName = async () => {
      try {
        setNameLoading(true);
        const { mapleStoryAPI } = await import('@/services/maplestory-api');
        const itemData = await mapleStoryAPI.getCachedItemData(itemId);
        
        if (itemData && mounted) {
          setItemName(itemData.name);
        } else if (mounted) {
          setItemName(`Item #${itemId}`);
        }
      } catch (error) {
        console.log(`Could not fetch name for item ${itemId}`);
        if (mounted) {
          setItemName(`Item #${itemId}`);
        }
      } finally {
        if (mounted) {
          setNameLoading(false);
        }
      }
    };

    fetchItemName();

    return () => {
      mounted = false;
    };
  }, [itemId]);

  return (
    <div className="relative">
      <div 
        className="relative w-14 h-14 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border-2 border-slate-200 overflow-hidden transition-all hover:border-orange-400 hover:shadow-lg hover:scale-110 duration-300 cursor-pointer"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
          </div>
        ) : iconUrl ? (
          <img 
            src={iconUrl}
            alt={slotName}
            className="absolute inset-0 w-full h-full object-contain p-1"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-500">
            {type.substring(0, 2).toUpperCase()}
          </div>
        )}
        
        {/* Enhanced equipped indicator */}
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
          <Star className="w-3 h-3 text-white fill-current" />
        </div>
      </div>

      {/* Tooltip - controlled by state */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl">
          {nameLoading ? (
            <span className="text-gray-300 italic">Loading...</span>
          ) : (
            <span className="font-medium">{itemName || slotName}</span>
          )}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced Simple Character Display (fallback)
const SimpleCharacterDisplay: React.FC<{
  character: any;
  className?: string;
}> = ({ character, className = "" }) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-32 h-32 bg-gradient-to-br from-orange-200 via-orange-300 to-red-300 rounded-full flex items-center justify-center shadow-xl border-4 border-white">
            <User className="w-16 h-16 text-orange-700" />
          </div>
          
          <div className="absolute -top-2 -right-2 bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-full w-10 h-10 flex items-center justify-center text-sm font-bold shadow-lg">
            {character.level}
          </div>
        </div>
        
        <div className="text-center">
          <h4 className="font-bold text-slate-800 text-lg">{character.name}</h4>
          <p className="text-slate-600 text-sm">{character.job}</p>
        </div>
        
        {character.equipment && Object.keys(character.equipment).length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center max-w-48">
            {Object.entries(character.equipment)
              .filter(([_, itemId]) => typeof itemId === 'number' && itemId > 0)
              .slice(0, 6)
              .map(([type, itemId]) => (
                <div key={type} className="w-8 h-8">
                  <EquipmentItem
                    itemId={itemId as number}
                    slotName={type}
                    type={type}
                  />
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced MapleStory.io Character Renderer - FIXED VERSION
const MapleStoryCharacterRenderer: React.FC<{
  character: any;
  className?: string;
  size?: number;
  x?: number;
  y?: number;
}> = ({ character, className = "", size = 2, x = 0, y = 0 }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isImageReady, setIsImageReady] = useState(false);

  useEffect(() => {
    const generateCharacterImage = async () => {
      try {
        setIsLoading(true);
        setError(false);
        setIsImageReady(false);

        const { mapleStoryAPI } = await import('@/services/maplestory-api');

        const characterOptions = {
          hair: character.hair,
          face: character.face,
          skin: character.skincolor,
          equipment: character.equipment || {},
          resize: size,
          renderMode: 'default',
          flipX: false
        };

        const testResult = await mapleStoryAPI.testCharacterEndpoint(characterOptions);
        
        if (testResult.success && testResult.url) {
          // Preload the image before setting URL
          const img = new Image();
          img.onload = () => {
            setImageUrl(testResult.url || null);  // Fixed: ensure it's never undefined
            setIsLoading(false);
            // Small delay to ensure image is rendered before showing
            setTimeout(() => setIsImageReady(true), 50);
          };
          img.onerror = () => {
            setError(true);
            setIsLoading(false);
          };
          img.src = testResult.url;
        } else {
          setError(true);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error generating character image:', err);
        setError(true);
        setIsLoading(false);
      }
    };

    generateCharacterImage();
  }, [character, size]);

  const handleImageError = () => {
    setError(true);
    setIsLoading(false);
    setIsImageReady(false);
  };

  const handleImageLoad = () => {
    // Image is already loaded in the effect, this is just a backup
    setIsImageReady(true);
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
            <Sparkles className="w-6 h-6 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-orange-300 animate-pulse" />
          </div>
          <span className="text-sm text-slate-600 font-medium">Summoning character...</span>
        </div>
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <SimpleCharacterDisplay 
        character={character}
        className={className}
      />
    );
  }

  return (
    <div 
      className={`relative ${className}`}
      style={{
        width: '100%',
        height: '100%'
      }}
    >
      <div
        className="absolute"
        style={{
          bottom: `${80 - y}px`,
          left: '50%',
          transform: `translateX(-50%) translateX(${x}px) scale(${size})`,
          transformOrigin: 'bottom center',
          // Only apply transition to opacity, not transform
          transition: isImageReady ? 'opacity 0.3s ease' : 'none',
          opacity: isImageReady ? 1 : 0
        }}
      >
        <img
          src={imageUrl}
          alt={`${character.name} character`}
          className="block drop-shadow-lg"
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading="eager"
          style={{ 
            imageRendering: 'pixelated',
            maxHeight: 'none',
            maxWidth: 'none'
          }}
        />
      </div>
    </div>
  );
};

const CharactersTab: React.FC<CharactersTabProps> = ({
  characters,
  isLoading,
  refreshData
}) => {
  // Global character positioning settings
  const GLOBAL_CHARACTER_SIZE = 1.1;
  const GLOBAL_CHARACTER_X = 0;
  const GLOBAL_CHARACTER_Y = 30;

  // Get highest level character for highlighting
  const maxLevel = Math.max(...characters.map(char => char.level || 0));

  return (
    <div className="space-y-8">
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="relative mb-6">
              <div className="w-16 h-16 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto"></div>
              <Sparkles className="w-8 h-8 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-orange-400 animate-pulse" />
            </div>
            <span className="text-slate-600 text-lg font-medium">Loading your heroes...</span>
          </div>
        </div>
      ) : characters.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <User className="w-10 h-10 text-slate-400" />
          </div>
          <p className="text-slate-600 text-xl font-semibold mb-2">No characters found</p>
          <p className="text-slate-500">Create your first character in-game to see it here!</p>
        </div>
      ) : (
        <>
          {/* Character count and level info */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-6 px-6 py-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-slate-600" />
                <span className="text-slate-700 font-medium">Total Characters: </span>
                <span className="font-bold text-orange-600">{characters.length}</span>
              </div>
              <div className="w-px h-6 bg-slate-300"></div>
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-500" />
                <span className="text-slate-700 font-medium">Highest Level: </span>
                <span className="font-bold text-yellow-600">{maxLevel}</span>
              </div>
            </div>
          </div>

          {/* Character Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {characters.map((char) => {
              const characterData = {
                id: char.id,
                name: char.name || 'Unknown',
                level: char.level || 1,
                job: char.job || 'Beginner',
                skincolor: char.skincolor,
                gender: char.gender ?? 0,
                hair: char.hair,
                face: char.face,
                equipment: char.equipment || {},
                stats: char.stats || { str: 4, dex: 4, int: 4, luk: 4 },
                exp: char.exp || 0,
                meso: char.meso || 0
              };

              const isMaxLevel = characterData.level === maxLevel;

              return (
                <div key={char.id} className={`bg-white rounded-3xl shadow-lg border overflow-hidden hover:shadow-2xl hover:-translate-y-3 transition-all duration-500 group ${
                  isMaxLevel ? 'border-yellow-300 ring-2 ring-yellow-200' : 'border-slate-200'
                }`}>
                  {/* Character Display Area */}
                  <div className="h-80 relative overflow-hidden">
                    {/* Background Image */}
                    <div 
                      className="absolute inset-0"
                      style={{
                        backgroundImage: 'url("/assets/character-bg.jpg")',
                        backgroundSize: '300%',
                        backgroundPosition: 'center calc(80% + 40px)',
                        backgroundRepeat: 'no-repeat',
                      }}
                    />
                    
                    {/* Enhanced Background Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 via-purple-400/20 to-pink-400/20">
                      <div className="absolute inset-0" style={{
                        backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(120, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.3) 0%, transparent 50%)',
                      }}></div>
                    </div>
                    
                    {/* Character Renderer */}
                    <div className="relative z-10 w-full h-full">
                      <MapleStoryCharacterRenderer 
                        character={characterData}
                        className="w-full h-full"
                        size={GLOBAL_CHARACTER_SIZE}
                        x={GLOBAL_CHARACTER_X}
                        y={GLOBAL_CHARACTER_Y}
                      />
                    </div>
                    
                    {/* Enhanced Level Badge */}
                    <div className={`absolute top-4 right-4 px-4 py-2 rounded-full shadow-lg border z-20 ${
                      isMaxLevel 
                        ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 border-yellow-300' 
                        : 'bg-white/95 backdrop-blur-sm border-white/20'
                    }`}>
                      <div className="flex items-center gap-2">
                        {isMaxLevel && <Crown className="w-4 h-4" />}
                        <div className={`w-2 h-2 rounded-full animate-pulse ${isMaxLevel ? 'bg-yellow-700' : 'bg-orange-500'}`}></div>
                        <span className={`font-bold text-sm ${isMaxLevel ? 'text-yellow-900' : 'text-orange-600'}`}>
                          Lv. {characterData.level}
                        </span>
                      </div>
                    </div>
                    
                    {/* Enhanced Job Badge */}
                    <div className="absolute top-4 left-4 px-4 py-2 bg-white/90 backdrop-blur-sm text-orange-600 rounded-full font-semibold text-sm border border-orange-200 z-20 shadow-lg">
                      {characterData.job}
                    </div>
                  </div>

                  {/* Enhanced Character Info */}
                  <div className="p-6">
                    <div className="mb-6">
                      <h3 className="text-2xl font-bold text-slate-900 mb-2">{characterData.name}</h3>
                      <div className="flex items-center gap-2 text-slate-600">
                        <User className="w-4 h-4" />
                        <span className="font-medium">{characterData.job}</span>
                      </div>
                    </div>
                    
                    {/* Enhanced EXP Progress */}
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-slate-600 text-sm font-semibold">EXP Progress</span>
                        <span className="text-slate-900 font-bold text-lg">{characterData.exp}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden shadow-inner">
                        <div 
                          className="h-full bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 rounded-full transition-all duration-1000 shadow-sm relative overflow-hidden"
                          style={{ width: `${Math.min(characterData.exp, 100)}%` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Equipment Preview */}
                    {characterData.equipment && Object.keys(characterData.equipment).length > 0 && (
                      <div className="mb-6 p-5 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200">
                        <div className="flex items-center gap-3 mb-4">
                          <Shield className="w-5 h-5 text-slate-600" />
                          <span className="text-sm font-bold text-slate-700">Equipment</span>
                          <div className="ml-auto px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                            {Object.keys(characterData.equipment).length} items
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                          {Object.entries(characterData.equipment)
                            .filter(([_, itemId]) => typeof itemId === 'number' && itemId > 0)
                            .map(([type, itemId]) => {
                              const equipmentLabels: { [key: string]: string } = {
                                cap: 'Hat', coat: 'Top', pants: 'Bottom', shoes: 'Shoes',
                                glove: 'Gloves', cape: 'Cape', shield: 'Shield', weapon: 'Weapon',
                                mask: 'Face', eyes: 'Eyes', ears: 'Earring'
                              };
                              
                              return (
                                <EquipmentItem
                                  key={type}
                                  itemId={itemId as number}
                                  slotName={equipmentLabels[type] || type}
                                  type={type}
                                />
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* Enhanced Meso Display */}
                    <div className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-2xl border border-yellow-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center shadow-lg">
                            <span className="text-white font-bold">₩</span>
                          </div>
                          <span className="text-yellow-800 font-bold">Meso</span>
                        </div>
                        <span className="text-yellow-900 font-bold text-xl">{characterData.meso.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Enhanced Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: 'str', label: 'STR', color: 'red', value: characterData.stats.str },
                        { key: 'dex', label: 'DEX', color: 'green', value: characterData.stats.dex },
                        { key: 'int', label: 'INT', color: 'blue', value: characterData.stats.int },
                        { key: 'luk', label: 'LUK', color: 'purple', value: characterData.stats.luk }
                      ].map(stat => (
                        <div key={stat.key} className={`bg-${stat.color}-50 border border-${stat.color}-200 rounded-xl p-4 text-center hover:scale-105 transition-transform`}>
                          <p className={`text-${stat.color}-600 text-xs font-bold mb-2`}>{stat.label}</p>
                          <p className={`text-${stat.color}-800 font-bold text-xl`}>{stat.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default CharactersTab;