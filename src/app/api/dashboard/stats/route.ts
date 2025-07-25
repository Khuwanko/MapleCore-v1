// src/app/api/dashboard/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthenticatedRequest } from '@/lib/middleware/auth';
import { secureQueries, query } from '@/lib/db';

export const GET = requireAuth(async (req: AuthenticatedRequest) => {
  try {
    const userId = req.user!.userId;

    // Get user data
    const user = await secureQueries.getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get main character
    const mainCharacter = await secureQueries.getMainCharacter(userId);

    // Get online count
    const [onlineResult] = await query<{ count: number }>(
      'SELECT COUNT(*) as count FROM accounts WHERE loggedin = 2'
    );

    return NextResponse.json({
      user: {
        id: userId,
        username: user.name,
        nx: user.nxCredit || 0,  // Changed back to nxCredit
        votePoints: user.votepoints || 0  // Fixed: was votePoints, should be votepoints
      },
      onlineCount: onlineResult?.count || 0,
      mainCharacter: mainCharacter ? {
        name: mainCharacter.name,
        level: mainCharacter.level,
        job: getJobName(mainCharacter.job)
      } : null
    });

  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
});

// Helper function to convert job ID to job name - COMPLETE LIST
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