// src/components/admin-dashboard/MapleStoryItem.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { mapleStoryAPI } from '@/services/maplestory-api';

interface ItemStats {
  str?: number;
  dex?: number;
  int?: number;
  luk?: number;
  watk?: number;
  matk?: number;
  wdef?: number;
  mdef?: number;
  hp?: number;
  mp?: number;
  acc?: number;
  avoid?: number;
  speed?: number;
  jump?: number;
  upgradeslots?: number;
  level?: number;
}

interface MapleStoryItemProps {
  itemId: number;
  quantity?: number;
  slotName?: string;
  giftFrom?: string;
  equipStats?: ItemStats | null;
  className?: string;
  showTooltip?: boolean;
  slotPosition?: number; // Add this to detect cash items
}

const MapleStoryItem: React.FC<MapleStoryItemProps> = ({
  itemId,
  quantity = 1,
  slotName,
  giftFrom,
  equipStats,
  className = '',
  showTooltip = true,
  slotPosition
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [itemName, setItemName] = useState<string>('');
  const [nameLoading, setNameLoading] = useState(true);
  
  // Direct URL to MapleStory.io
  const iconUrl = `https://maplestory.io/api/GMS/255/item/${itemId}/icon`;

  // Check if this is a cash item (position <= -101)
  const isCashItem = slotPosition !== undefined && slotPosition <= -101;

  // Fetch item name using the MapleStory API service
  useEffect(() => {
    let mounted = true;

    const fetchItemName = async () => {
      try {
        setNameLoading(true);
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

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  // Helper function to check if a stat should be displayed
  const shouldDisplayStat = (value: number | undefined): boolean => {
    return value !== undefined && value > 0;
  };

  // Check if there are any valid stats to display
  const hasValidStats = equipStats && !isCashItem && (
    shouldDisplayStat(equipStats.str) ||
    shouldDisplayStat(equipStats.dex) ||
    shouldDisplayStat(equipStats.int) ||
    shouldDisplayStat(equipStats.luk) ||
    shouldDisplayStat(equipStats.watk) ||
    shouldDisplayStat(equipStats.matk) ||
    shouldDisplayStat(equipStats.wdef) ||
    shouldDisplayStat(equipStats.mdef) ||
    shouldDisplayStat(equipStats.hp) ||
    shouldDisplayStat(equipStats.mp) ||
    shouldDisplayStat(equipStats.acc) ||
    shouldDisplayStat(equipStats.avoid) ||
    shouldDisplayStat(equipStats.speed) ||
    shouldDisplayStat(equipStats.jump) ||
    shouldDisplayStat(equipStats.upgradeslots) ||
    shouldDisplayStat(equipStats.level)
  );

  return (
    <div className={`relative group ${className}`}>
      <div className="w-full h-full flex items-center justify-center p-1">
        {!imageError ? (
          <>
            {!imageLoaded && (
              // Loading placeholder
              <div className="absolute inset-0 bg-gray-100 rounded animate-pulse flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin" />
              </div>
            )}
            <img
              src={iconUrl}
              alt={itemName || `Item ${itemId}`}
              className={`w-full h-full object-contain ${imageLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
              onLoad={handleImageLoad}
              onError={handleImageError}
              loading="eager"
            />
          </>
        ) : (
          // Error/Fallback state
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 rounded flex items-center justify-center text-[10px] font-bold text-gray-600 shadow-sm">
            {itemId}
          </div>
        )}
      </div>

      {/* Quantity Badge */}
      {quantity > 1 && (
        <span className="absolute bottom-0 right-0 bg-gradient-to-r from-red-500 to-red-600 text-white text-[10px] px-1 py-0.5 rounded-tl-md font-bold shadow-md z-10">
          {quantity > 9999 ? '9999+' : quantity}
        </span>
      )}

      {/* Hover Tooltip */}
      {showTooltip && (
        <div className="absolute z-[99999] bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-3 bg-white border border-gray-200 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" 
             style={{ 
               minWidth: '200px',
               position: 'absolute',
               zIndex: 99999
             }}>
          <div className="text-red-600 font-bold text-sm mb-1">
            {nameLoading ? (
              <span className="text-gray-400 italic">Loading...</span>
            ) : (
              itemName || `Item #${itemId}`
            )}
          </div>
          {slotName && (
            <div className="text-gray-500 text-xs mb-1">{slotName}</div>
          )}
          <div className="text-gray-600 text-xs space-y-1">
            <div>Item ID: <span className="font-medium">{itemId}</span></div>
            {quantity > 1 && <div>Quantity: <span className="font-medium">{quantity.toLocaleString()}</span></div>}
            {giftFrom && <div>From: <span className="font-medium">{giftFrom}</span></div>}
            
            {/* Equipment Stats - Only show for non-cash items with valid stats */}
            {hasValidStats && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="font-bold text-gray-700 mb-1">Stats:</div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                  {shouldDisplayStat(equipStats!.str) && <div>STR: <span className="text-red-600 font-medium">+{equipStats!.str}</span></div>}
                  {shouldDisplayStat(equipStats!.dex) && <div>DEX: <span className="text-green-600 font-medium">+{equipStats!.dex}</span></div>}
                  {shouldDisplayStat(equipStats!.int) && <div>INT: <span className="text-blue-600 font-medium">+{equipStats!.int}</span></div>}
                  {shouldDisplayStat(equipStats!.luk) && <div>LUK: <span className="text-yellow-600 font-medium">+{equipStats!.luk}</span></div>}
                  {shouldDisplayStat(equipStats!.watk) && <div>W.ATK: <span className="text-orange-600 font-medium">+{equipStats!.watk}</span></div>}
                  {shouldDisplayStat(equipStats!.matk) && <div>M.ATK: <span className="text-purple-600 font-medium">+{equipStats!.matk}</span></div>}
                  {shouldDisplayStat(equipStats!.wdef) && <div>W.DEF: <span className="text-gray-600 font-medium">+{equipStats!.wdef}</span></div>}
                  {shouldDisplayStat(equipStats!.mdef) && <div>M.DEF: <span className="text-indigo-600 font-medium">+{equipStats!.mdef}</span></div>}
                  {shouldDisplayStat(equipStats!.hp) && <div>HP: <span className="text-red-500 font-medium">+{equipStats!.hp}</span></div>}
                  {shouldDisplayStat(equipStats!.mp) && <div>MP: <span className="text-blue-500 font-medium">+{equipStats!.mp}</span></div>}
                  {shouldDisplayStat(equipStats!.acc) && <div>ACC: <span className="text-teal-600 font-medium">+{equipStats!.acc}</span></div>}
                  {shouldDisplayStat(equipStats!.avoid) && <div>AVOID: <span className="text-pink-600 font-medium">+{equipStats!.avoid}</span></div>}
                  {shouldDisplayStat(equipStats!.speed) && <div>Speed: <span className="text-cyan-600 font-medium">+{equipStats!.speed}</span></div>}
                  {shouldDisplayStat(equipStats!.jump) && <div>Jump: <span className="text-lime-600 font-medium">+{equipStats!.jump}</span></div>}
                </div>
                {shouldDisplayStat(equipStats!.upgradeslots) && (
                  <div className="mt-1 text-purple-600 text-xs">Upgrade Slots: <span className="font-medium">{equipStats!.upgradeslots}</span></div>
                )}
                {shouldDisplayStat(equipStats!.level) && (
                  <div className="text-amber-600 text-xs">Enhancement: <span className="font-medium">+{equipStats!.level}</span></div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MapleStoryItem;