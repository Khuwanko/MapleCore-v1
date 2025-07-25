// src/utils/maplestory-items.ts

// Client-side cache for item data
const clientItemCache = new Map<number, { name: string; iconUrl: string }>();

// Get item icon path - now returns MapleStory.io URL
export function getItemIconPath(itemId: number): string {
  // Return the MapleStory.io icon URL directly
  return `https://maplestory.io/api/gms/latest/item/${itemId}/icon`;
}

// Format item ID (kept for backward compatibility)
export function formatItemId(itemId: number): string {
  return itemId.toString().padStart(8, '0');
}

// Fetch item data from our API
export async function fetchItemData(itemId: number): Promise<{ name: string; iconUrl: string } | null> {
  // Check client cache first
  if (clientItemCache.has(itemId)) {
    return clientItemCache.get(itemId)!;
  }

  try {
    const response = await fetch(`/api/maplestory/item/${itemId}`);
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const itemData = {
      name: data.name,
      iconUrl: data.iconUrl
    };

    // Cache on client
    clientItemCache.set(itemId, itemData);
    return itemData;
  } catch (error) {
    console.error(`Failed to fetch item ${itemId}:`, error);
    return null;
  }
}

// Fetch multiple items in batch
export async function fetchItemsBatch(itemIds: number[]): Promise<Map<number, { name: string; iconUrl: string }>> {
  const results = new Map<number, { name: string; iconUrl: string }>();
  
  // Get cached items and identify which need to be fetched
  const uncachedIds: number[] = [];
  
  itemIds.forEach(id => {
    if (clientItemCache.has(id)) {
      results.set(id, clientItemCache.get(id)!);
    } else {
      uncachedIds.push(id);
    }
  });

  // If all items are cached, return immediately
  if (uncachedIds.length === 0) {
    return results;
  }

  try {
    const response = await fetch('/api/maplestory/items/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ itemIds: uncachedIds }),
    });

    if (!response.ok) {
      return results;
    }

    const data = await response.json();
    
    // Process and cache the results
    Object.entries(data).forEach(([itemId, itemData]: [string, any]) => {
      const id = parseInt(itemId);
      const item = {
        name: itemData.name,
        iconUrl: itemData.iconUrl
      };
      clientItemCache.set(id, item);
      results.set(id, item);
    });
  } catch (error) {
    console.error('Failed to fetch items batch:', error);
  }

  return results;
}

// Clear client cache
export function clearItemCache() {
  clientItemCache.clear();
}

// Preload images for better performance
export function preloadItemIcons(itemIds: number[]) {
  itemIds.forEach(itemId => {
    const img = new Image();
    img.src = getItemIconPath(itemId);
  });
}