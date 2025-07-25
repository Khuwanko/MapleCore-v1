// src/app/api/dashboard/characters/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthenticatedRequest } from '@/lib/middleware/auth';
import { secureQueries } from '@/lib/db';

// Helper function to convert database skin color to MapleStory.io API skin color
function mapSkinColor(dbSkinColor: number): number {
  // Convert database skin color to MapleStory.io API skin color
  const skinMap: { [key: number]: number } = {
    0: 2000, // Light skin
    1: 2001, // Tanned skin  
    2: 2002, // Dark skin
    3: 2003  // Pale skin
  };
  return skinMap[dbSkinColor] ?? 2000; // Default to light skin if unknown value
}

export const GET = requireAuth(async (req: AuthenticatedRequest) => {
  try {
    const userId = req.user!.userId;

    // Get all user's characters with appearance data
    const characters = await secureQueries.getCharactersByAccountId(userId);

    // Get equipment for all characters at once (more efficient)
    const characterIds = characters.map((char: any) => char.id);
    const allEquipment = await secureQueries.getCharactersEquipment(characterIds);

    // Format characters data with equipment
    const formattedCharacters = characters.map((char: any) => {
      // Get equipment for this character from the batch query
      const equipment = allEquipment[char.id] || {};

      // Debug log equipment for first character
      if (char.id === 1) {
        console.log('Character 1 equipment from DB:', equipment);
      }

      // Calculate exp percentage (simplified)
      const expToNextLevel = getExpForLevel(char.level + 1);
      const expCurrentLevel = getExpForLevel(char.level);
      const expProgress = expToNextLevel > expCurrentLevel ? 
        Math.floor(((char.exp - expCurrentLevel) / (expToNextLevel - expCurrentLevel)) * 100) : 0;

      return {
        id: char.id,
        name: char.name,
        level: char.level,
        job: getJobName(char.job),
        jobId: char.job,
        exp: Math.max(0, Math.min(100, expProgress)),
        meso: char.meso || 0,
        // Add appearance data with FIXED skin color conversion
        skincolor: mapSkinColor(char.skincolor || 0), // <-- CHANGED: Now converts DB skin to API skin
        gender: char.gender || 0,
        hair: char.hair || 30000,
        face: char.face || 20000,
        // Add stats
        stats: {
          str: char.str || 4,
          dex: char.dex || 4,
          int: char.int || 4,
          luk: char.luk || 4
        },
        // Add equipment - this now includes proper cash item override logic
        equipment: equipment,
        // Additional useful data
        fame: char.fame || 0,
        map: char.map || 0,
        guildid: char.guildid || 0
      };
    });

    return NextResponse.json({ characters: formattedCharacters });

  } catch (error) {
    console.error('Characters error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch characters' },
      { status: 500 }
    );
  }
});

// Helper function to get exp required for level (simplified)
function getExpForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level <= 15) return Math.floor(level * level * level / 3);
  if (level <= 30) return Math.floor(level * level * level * 1.2);
  return Math.floor(level * level * level * 1.5);
}

// Helper function to convert job ID to job name
function getJobName(jobId: number): string {
  const jobMap: { [key: number]: string } = {
    // Beginner
    0: 'Beginner',
    
    // Warriors
    100: 'Warrior',
    110: 'Fighter',
    111: 'Crusader',
    112: 'Hero',
    120: 'Page',
    121: 'White Knight',
    122: 'Paladin',
    130: 'Spearman',
    131: 'Dragon Knight',
    132: 'Dark Knight',
    
    // Magicians
    200: 'Magician',
    210: 'F/P Wizard',
    211: 'F/P Mage',
    212: 'F/P Arch Mage',
    220: 'I/L Wizard',
    221: 'I/L Mage',
    222: 'I/L Arch Mage',
    230: 'Cleric',
    231: 'Priest',
    232: 'Bishop',
    
    // Archers
    300: 'Archer',
    310: 'Hunter',
    311: 'Ranger',
    312: 'Bowmaster',
    320: 'Crossbowman',
    321: 'Sniper',
    322: 'Marksman',
    
    // Thieves
    400: 'Rogue',
    410: 'Assassin',
    411: 'Hermit',
    412: 'Night Lord',
    420: 'Bandit',
    421: 'Chief Bandit',
    422: 'Shadower',
    430: 'Blade Recruit',
    431: 'Blade Acolyte',
    432: 'Blade Specialist',
    433: 'Blade Lord',
    434: 'Dual Blade',
    
    // Pirates
    500: 'Pirate',
    501: 'Cannon Shooter',
    510: 'Brawler',
    511: 'Marauder',
    512: 'Buccaneer',
    520: 'Gunslinger',
    521: 'Outlaw',
    522: 'Corsair',
    530: 'Cannoneer',
    531: 'Cannon Trooper',
    532: 'Cannon Master',
    
    // Special Jobs
    800: 'Maple Leaf Brigadier',
    900: 'GM',
    910: 'SuperGM',
    
    // Cygnus Knights
    1000: 'Noblesse',
    1100: 'Dawn Warrior',
    1110: 'Dawn Warrior 2nd',
    1111: 'Dawn Warrior 3rd',
    1112: 'Dawn Warrior 4th',
    1200: 'Blaze Wizard',
    1210: 'Blaze Wizard 2nd',
    1211: 'Blaze Wizard 3rd',
    1212: 'Blaze Wizard 4th',
    1300: 'Wind Archer',
    1310: 'Wind Archer 2nd',
    1311: 'Wind Archer 3rd',
    1312: 'Wind Archer 4th',
    1400: 'Night Walker',
    1410: 'Night Walker 2nd',
    1411: 'Night Walker 3rd',
    1412: 'Night Walker 4th',
    1500: 'Thunder Breaker',
    1510: 'Thunder Breaker 2nd',
    1511: 'Thunder Breaker 3rd',
    1512: 'Thunder Breaker 4th',
    
    // Legends
    2000: 'Aran Beginner',
    2001: 'Evan Beginner',
    2100: 'Aran',
    2110: 'Aran 2nd',
    2111: 'Aran 3rd',
    2112: 'Aran 4th',
    
    // Evan
    2200: 'Evan 1st Growth',
    2210: 'Evan 2nd Growth',
    2211: 'Evan 3rd Growth',
    2212: 'Evan 4th Growth',
    2213: 'Evan 5th Growth',
    2214: 'Evan 6th Growth',
    2215: 'Evan 7th Growth',
    2216: 'Evan 8th Growth',
    2217: 'Evan 9th Growth',
    2218: 'Evan 10th Growth'
  };

  return jobMap[jobId] || 'Unknown';
}