// src/components/admin-dashboard/MapleStoryItem.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  slotPosition?: number;
}

// Global name cache - persists across component instances
const globalNameCache = new Map<number, string>();
// Track items that are currently being fetched to prevent duplicate requests
const fetchingItems = new Set<number>();

// Image cache to prevent re-fetching
const imageCache = new Map<string, boolean>();

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
  const [itemName, setItemName] = useState<string>(() => {
    // Check cache immediately on mount
    return globalNameCache.get(itemId) || '';
  });
  const [nameLoading, setNameLoading] = useState(() => {
    // Only loading if not in cache
    return !globalNameCache.has(itemId);
  });
  const [showTooltipState, setShowTooltipState] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;
  
  // Use a more reliable URL format
  const getIconUrl = (id: number, version: string = '241') => {
    return `https://maplestory.io/api/GMS/${version}/item/${id}/icon`;
  };

  // Check if this is a cash item
  const isCashItem = slotPosition !== undefined && slotPosition <= -101;

  // Initialize image URL
  useEffect(() => {
    const url = getIconUrl(itemId);
    setImageUrl(url);
    
    // Check if image was previously cached as successful
    if (imageCache.get(url)) {
      setImageLoaded(true);
      setImageError(false);
    }
  }, [itemId]);

  // Fetch item name - FIXED VERSION
  useEffect(() => {
    mountedRef.current = true;
    
    // If already in cache, we're done
    if (globalNameCache.has(itemId)) {
      const cachedName = globalNameCache.get(itemId)!;
      setItemName(cachedName);
      setNameLoading(false);
      return;
    }

    // If already being fetched by another component, wait a bit then check cache again
    if (fetchingItems.has(itemId)) {
      const checkInterval = setInterval(() => {
        if (globalNameCache.has(itemId)) {
          const cachedName = globalNameCache.get(itemId)!;
          setItemName(cachedName);
          setNameLoading(false);
          clearInterval(checkInterval);
        }
      }, 100);
      
      // Stop checking after 2 seconds and use fallback
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!globalNameCache.has(itemId) && mountedRef.current) {
          const fallbackName = `Item #${itemId}`;
          globalNameCache.set(itemId, fallbackName);
          setItemName(fallbackName);
          setNameLoading(false);
        }
      }, 2000);
      
      return () => clearInterval(checkInterval);
    }

    // Mark as fetching
    fetchingItems.add(itemId);

    // Set a hard timeout to ensure we never get stuck loading
    fetchTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current && nameLoading) {
        const fallbackName = `Item #${itemId}`;
        globalNameCache.set(itemId, fallbackName);
        setItemName(fallbackName);
        setNameLoading(false);
        fetchingItems.delete(itemId);
      }
    }, 1500); // 1.5 second hard limit

    // Try to fetch the name
    const fetchItemName = async () => {
      try {
        // Don't even try if we already have a name
        if (globalNameCache.has(itemId)) {
          fetchingItems.delete(itemId);
          return;
        }

        const itemData = await mapleStoryAPI.getCachedItemData(itemId);
        
        if (!mountedRef.current) {
          fetchingItems.delete(itemId);
          return;
        }

        if (itemData && itemData.name) {
          // Cache the name globally
          globalNameCache.set(itemId, itemData.name);
          setItemName(itemData.name);
        } else {
          // Use fallback
          const fallbackName = `Item #${itemId}`;
          globalNameCache.set(itemId, fallbackName);
          setItemName(fallbackName);
        }
      } catch (error) {
        console.log(`Error fetching name for item ${itemId}:`, error);
        if (mountedRef.current) {
          const fallbackName = `Item #${itemId}`;
          globalNameCache.set(itemId, fallbackName);
          setItemName(fallbackName);
        }
      } finally {
        if (mountedRef.current) {
          setNameLoading(false);
        }
        fetchingItems.delete(itemId);
        if (fetchTimeoutRef.current) {
          clearTimeout(fetchTimeoutRef.current);
        }
      }
    };

    // Start fetching
    fetchItemName();

    return () => {
      mountedRef.current = false;
      fetchingItems.delete(itemId);
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [itemId, nameLoading]);

  const handleImageError = () => {
    if (!mountedRef.current) return;
    
    // Try alternate versions before giving up
    if (retryCountRef.current < MAX_RETRIES) {
      retryCountRef.current++;
      const versions = ['241', '255', '240', 'latest'];
      const nextVersion = versions[retryCountRef.current];
      
      if (nextVersion) {
        console.log(`Retrying item ${itemId} with version ${nextVersion}`);
        const newUrl = getIconUrl(itemId, nextVersion);
        setImageUrl(newUrl);
        return;
      }
    }
    
    setImageError(true);
    setImageLoaded(true);
  };

  const handleImageLoad = () => {
    if (!mountedRef.current) return;
    setImageLoaded(true);
    setImageError(false);
    // Cache successful URL
    if (imageUrl) {
      imageCache.set(imageUrl, true);
    }
    retryCountRef.current = 0;
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

  // Handle tooltip visibility
  const handleMouseEnter = () => {
    if (showTooltip) {
      setShowTooltipState(true);
    }
  };

  const handleMouseLeave = () => {
    setShowTooltipState(false);
  };

  // Display name in tooltip - ensure we never show "Loading..." forever
  const displayName = itemName || `Item #${itemId}`;

  return (
    <div 
      className={`relative group ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="w-full h-full flex items-center justify-center p-1">
        {!imageError && imageUrl ? (
          <>
            {!imageLoaded && (
              // Loading placeholder with spinner
              <div className="absolute inset-0 bg-gray-100 rounded animate-pulse flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin" />
              </div>
            )}
            <img
              key={imageUrl} // Force re-render on URL change
              src={imageUrl}
              alt={displayName}
              className={`w-full h-full object-contain ${imageLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
              onLoad={handleImageLoad}
              onError={handleImageError}
              loading="lazy"
              decoding="async"
            />
          </>
        ) : (
          // Error/Fallback state - show item ID or loading
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 rounded flex items-center justify-center text-[10px] font-bold text-gray-600 shadow-sm">
            {!imageUrl && !imageError ? (
              <div className="w-6 h-6 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin" />
            ) : (
              itemId
            )}
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
      {showTooltip && showTooltipState && (
        <div 
          className="absolute z-[99999] bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-3 bg-white border border-gray-200 rounded-lg shadow-xl transition-opacity duration-200 pointer-events-none whitespace-nowrap" 
          style={{ 
            minWidth: '200px',
            maxWidth: '300px'
          }}
        >
          <div className="text-red-600 font-bold text-sm mb-1">
            {displayName}
          </div>
          {slotName && (
            <div className="text-gray-500 text-xs mb-1">{slotName}</div>
          )}
          <div className="text-gray-600 text-xs space-y-1">
            <div>Item ID: <span className="font-medium">{itemId}</span></div>
            {quantity > 1 && <div>Quantity: <span className="font-medium">{quantity.toLocaleString()}</span></div>}
            {giftFrom && <div>From: <span className="font-medium">{giftFrom}</span></div>}
            {isCashItem && (
              <div className="text-purple-600 font-medium">Cash Item</div>
            )}
            
            {/* Equipment Stats */}
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

// Export a function to clear the name cache if needed
export const clearItemNameCache = () => {
  globalNameCache.clear();
  fetchingItems.clear();
};

// Pre-populate cache with common item names if it was very slow u can use this.(optional)
export const preloadCommonItems = () => {
  // You can add common items here if you know them
  // For example:
  // globalNameCache.set(1002043, 'Zakum Helmet');
  // globalNameCache.set(1102041, 'Pink Adventurer Cape');
};

export default MapleStoryItem;