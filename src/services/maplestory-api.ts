// src/services/maplestory-api.ts
// Service for interacting with MapleStory.io API

interface ItemData {
  id: number;
  name: string;
  desc?: string;
  typeInfo?: {
    category?: string;
    overallCategory?: string;
    subCategory?: string;
  };
  metaInfo?: {
    icon?: string;
    iconRaw?: string;
  };
}

interface ItemNameResponse {
  id: number;
  name: string;
  description: string;
}

interface CachedItem {
  id: number;
  name: string;
  iconUrl: string;
  timestamp: number;
}

interface CharacterRenderOptions {
  hair?: number;
  face?: number;
  skin?: number;
  equipment?: { [key: string]: number };
  resize?: number;
  renderMode?: string;
  flipX?: boolean;
}

// In-memory cache for item data
const itemCache = new Map<number, CachedItem>();
const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours

// Batch request queue
let batchQueue: Set<number> = new Set();
let batchTimeout: NodeJS.Timeout | null = null;
let batchPromiseResolvers: Map<number, { resolve: (value: CachedItem | null) => void; reject: (reason: any) => void }> = new Map();

class MapleStoryAPI {
  private baseUrl = 'https://maplestory.io/api';
  private version = '241'; // Using version 241 as in your working example

  // Helper function to determine stance based on weapon type
  private getWeaponStance(weaponId?: number): string {
    if (!weaponId) return 'stand1'; // Default stance if no weapon
    
    // MapleStory weapon ID ranges for 2-handed weapons (including cash items)
    const twoHandedWeaponRanges = [
      // Regular 2H Swords
      { min: 1402000, max: 1402999 },
      // Regular 2H Axes  
      { min: 1412000, max: 1412999 },
      // Regular 2H BW (Blunt Weapons)
      { min: 1422000, max: 1422999 },
      // Regular Polearms/Spears
      { min: 1432000, max: 1432999 },
      // Regular Bows
      { min: 1452000, max: 1452999 },
      { min: 1450000, max: 1459999 }, // Extended bow range
      // Regular Crossbows  
      { min: 1462000, max: 1462999 },
      { min: 1460000, max: 1469999 }, // Extended crossbow range
      // Regular Staves (Magician weapons)
      { min: 1382000, max: 1382999 },
      { min: 1380000, max: 1389999 }, // Extended staff range
      // Regular Wands (some are 2-handed)
      { min: 1372000, max: 1372999 },
      { min: 1370000, max: 1379999 }, // Extended wand range
      // Additional 2H weapon ranges
      { min: 1442000, max: 1442999 }, // Two-handed maces
      { min: 1472000, max: 1472999 }, // Claws (some 2H)
      
      // CASH WEAPON RANGES (1xxxxxx series)
      // Cash 2H Swords
      { min: 1702000, max: 1702999 },
      // Cash 2H Axes
      { min: 1712000, max: 1712999 },  
      // Cash 2H BW (Blunt Weapons)
      { min: 1722000, max: 1722999 },
      // Cash Polearms/Spears
      { min: 1732000, max: 1732999 },
      // Cash Bows
      { min: 1752000, max: 1752999 },
      { min: 1750000, max: 1759999 }, // Extended cash bow range
      // Cash Crossbows
      { min: 1762000, max: 1762999 },
      { min: 1760000, max: 1769999 }, // Extended cash crossbow range
      // Cash Staves
      { min: 1682000, max: 1682999 },
      { min: 1680000, max: 1689999 }, // Extended cash staff range
      // Cash Wands (some are 2-handed)
      { min: 1672000, max: 1672999 },
      { min: 1670000, max: 1679999 }, // Extended cash wand range
      // Cash Two-handed maces
      { min: 1742000, max: 1742999 },
      // Cash Claws (some 2H)
      { min: 1772000, max: 1772999 },
      
      // ADDITIONAL CASH RANGES (higher series)
      // Some servers use 17xxxxx for cash weapons
      { min: 1700000, max: 1799999 }, // Broad cash weapon range
    ];
    
    // Check if weapon is 2-handed
    const isTwoHanded = twoHandedWeaponRanges.some(range => 
      weaponId >= range.min && weaponId <= range.max
    );
    
    console.log(`Weapon ${weaponId} is ${isTwoHanded ? '2-handed' : '1-handed'}`);
    
    return isTwoHanded ? 'stand2' : 'stand1';
  }

  // Get full item data
  async getItem(itemId: number): Promise<ItemData | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/GMS/${this.version}/item/${itemId}`,
        { 
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(5000)
        }
      );

      if (!response.ok) {
        console.error(`Failed to fetch item ${itemId}: ${response.status}`);
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching item ${itemId}:`, error);
      return null;
    }
  }

  // Get item name only
  async getItemName(itemId: number): Promise<string | null> {
    try {
      const url = `${this.baseUrl}/GMS/${this.version}/item/${itemId}/name`;
      console.log(`Fetching item name from: ${url}`);
      
      const response = await fetch(url, { 
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        console.error(`Failed to fetch item ${itemId} name: ${response.status} ${response.statusText}`);
        return null;
      }

      const data: ItemNameResponse = await response.json();
      return data.name || null;
    } catch (error) {
      console.error(`Error fetching item name ${itemId}:`, error);
      return null;
    }
  }

  // Get item icon URL
  getItemIconUrl(itemId: number): string {
    return `${this.baseUrl}/GMS/${this.version}/item/${itemId}/icon`;
  }

  // Generate character URL using the EXACT format from your working example
  generateCharacterUrl(options: CharacterRenderOptions): string {
    try {
      // Build items array in the EXACT order from your working example
      const items: object[] = [];
      
      // 1. Hair FIRST (from database or default)
      items.push({
        itemId: options.hair || 30021,
        version: this.version
      });
      
      // Get weapon ID for stance determination
      let weaponId: number | undefined;
      
      // 2. Add equipment items in the exact order from your example
      // Using YOUR database equipment structure
      if (options.equipment) {
        // Add weapon from database (position -11/-111)
        if (options.equipment.weapon) {
          weaponId = options.equipment.weapon; // Store for stance detection
          items.push({
            itemId: options.equipment.weapon,
            version: this.version
          });
        }
        
        // Add shoes from database (position -7/-107)
        if (options.equipment.shoes) {
          items.push({
            itemId: options.equipment.shoes,
            version: this.version
          });
        }
        
        // Add pants from database (position -6/-106)
        if (options.equipment.pants) {
          items.push({
            itemId: options.equipment.pants,
            version: this.version
          });
        }
        
        // Add coat from database (position -5/-105)
        if (options.equipment.coat) {
          items.push({
            itemId: options.equipment.coat,
            version: this.version
          });
        }
        
        // Add gloves from database (position -8/-108)
        if (options.equipment.glove) {
          items.push({
            itemId: options.equipment.glove,
            version: this.version
          });
        }
        
        // Add cape from database (position -9/-109)
        if (options.equipment.cape) {
          items.push({
            itemId: options.equipment.cape,
            version: this.version
          });
        }
        
        // Add shield from database (position -10/-110)
        if (options.equipment.shield) {
          items.push({
            itemId: options.equipment.shield,
            version: this.version
          });
        }
        
        // Add hat/cap from database (position -1/-101)
        if (options.equipment.cap) {
          items.push({
            itemId: options.equipment.cap,
            version: this.version
          });
        }
        
        // Add face accessories from database
        if (options.equipment.mask) { // position -2/-102
          items.push({
            itemId: options.equipment.mask,
            version: this.version
          });
        }
        
        if (options.equipment.eyes) { // position -3/-103
          items.push({
            itemId: options.equipment.eyes,
            version: this.version
          });
        }
        
        if (options.equipment.ears) { // position -4/-104
          items.push({
            itemId: options.equipment.ears,
            version: this.version
          });
        }
      }
      
      // 3. Add skin from database (or default)
      items.push({
        itemId: options.skin !== undefined ? options.skin : 2000,
        version: this.version
      });
      
      // 4. Add hair color/style (like in your example - item 12000)
      // This seems to be required for proper head rendering
      items.push({
        itemId: 12000,
        version: this.version
      });
      
      // 5. Add face from database (or default) - ALWAYS LAST
      items.push({
        itemId: options.face || 20001,
        version: this.version
      });

      // Convert to JSON strings and join with commas
      const itemStrings = items.map(item => JSON.stringify(item));
      const itemsParam = itemStrings.join(',');
      
      // Determine the correct stance based on weapon type
      const stance = this.getWeaponStance(weaponId);
      
      // Build URL using the format: /api/character/${itemlist}/${action}/${frame}
      const encodedItems = encodeURIComponent(itemsParam);
      const baseUrl = `${this.baseUrl}/character/${encodedItems}/${stance}/0`;
      
      // Add query parameters
      const resize = options.resize || 1;
      const renderMode = options.renderMode || 'default';
      const flipX = options.flipX || false;
      
      const finalUrl = `${baseUrl}?resize=${resize}&renderMode=${renderMode}&flipX=${flipX}`;
      
      console.log('Generated character URL:', finalUrl);
      console.log('Items used:', itemsParam);
      console.log('Weapon ID:', weaponId);
      console.log('Stance used:', stance);
      
      return finalUrl;
    } catch (error) {
      console.error('Error generating character URL:', error);
      throw error;
    }
  }

  // Test character rendering endpoint
  async testCharacterEndpoint(options: CharacterRenderOptions): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const url = this.generateCharacterUrl(options);
      
      console.log('Testing character endpoint:', url);
      
      // Test if the image loads
      const success = await new Promise<boolean>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        const timeout = setTimeout(() => {
          resolve(false);
        }, 10000); // 10 second timeout
        
        img.onload = () => {
          clearTimeout(timeout);
          resolve(true);
        };
        
        img.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };
        
        img.src = url;
      });

      if (success) {
        return { success: true, url };
      } else {
        return { success: false, error: 'Character image failed to load' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  // Get item data with caching
  async getCachedItemData(itemId: number): Promise<CachedItem | null> {
    // Check cache first
    const cached = itemCache.get(itemId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached;
    }

    // Add to batch queue
    return this.addToBatchQueue(itemId);
  }

  // Batch fetch items
  private addToBatchQueue(itemId: number): Promise<CachedItem | null> {
    return new Promise((resolve, reject) => {
      batchQueue.add(itemId);
      batchPromiseResolvers.set(itemId, { resolve, reject });

      // Clear existing timeout
      if (batchTimeout) {
        clearTimeout(batchTimeout);
      }

      // Set new timeout to process batch
      batchTimeout = setTimeout(() => {
        this.processBatch();
      }, 50); // Wait 50ms to collect more items
    });
  }

  private async processBatch() {
    const itemIds = Array.from(batchQueue);
    batchQueue.clear();
    batchTimeout = null;

    // Process items in parallel (max 10 at a time)
    const chunks = [];
    for (let i = 0; i < itemIds.length; i += 10) {
      chunks.push(itemIds.slice(i, i + 10));
    }

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (itemId) => {
          try {
            const name = await this.getItemName(itemId);
            const itemData: CachedItem = {
              id: itemId,
              name: name || `Item ${itemId}`,
              iconUrl: this.getItemIconUrl(itemId),
              timestamp: Date.now()
            };

            // Cache the result
            itemCache.set(itemId, itemData);

            // Resolve the promise
            const resolver = batchPromiseResolvers.get(itemId);
            if (resolver) {
              resolver.resolve(itemData);
              batchPromiseResolvers.delete(itemId);
            }
          } catch (error) {
            const resolver = batchPromiseResolvers.get(itemId);
            if (resolver) {
              resolver.resolve(null);
              batchPromiseResolvers.delete(itemId);
            }
          }
        })
      );
    }
  }

  // Prefetch multiple items
  async prefetchItems(itemIds: number[]): Promise<void> {
    const uniqueIds = [...new Set(itemIds)];
    const uncachedIds = uniqueIds.filter(id => {
      const cached = itemCache.get(id);
      return !cached || Date.now() - cached.timestamp >= CACHE_DURATION;
    });

    // Add all uncached items to the batch queue
    await Promise.all(uncachedIds.map(id => this.getCachedItemData(id)));
  }

  // Clear cache
  clearCache() {
    itemCache.clear();
  }

  // Get cache size
  getCacheSize(): number {
    return itemCache.size;
  }
}

// Export singleton instance
export const mapleStoryAPI = new MapleStoryAPI();

// Export types
export type { ItemData, CachedItem, CharacterRenderOptions };