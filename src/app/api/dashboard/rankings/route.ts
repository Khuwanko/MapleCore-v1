// src/app/api/dashboard/rankings/route.ts - Simplified Version
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/security/password';
import { secureQueries } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get auth token from cookie (optional for rankings)
    const token = request.cookies.get('auth-token')?.value;
    let currentUserId = null;
    
    if (token) {
      try {
        const decoded = verifyToken(token);
        currentUserId = decoded.userId;
      } catch (e) {
        // Token invalid, but we can still show rankings
      }
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const jobFilter = searchParams.get('job') || 'all';
    const searchName = searchParams.get('search') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '15')));
    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereConditions = ['c.gm = 0'];
    let queryParams: any[] = [];

    // Add job filtering
    const jobCondition = getJobFilterCondition(jobFilter);
    if (jobCondition) {
      whereConditions.push(jobCondition);
    }

    // Add search filtering
    if (searchName.trim()) {
      whereConditions.push('c.name LIKE ?');
      queryParams.push(`${searchName.trim()}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count for pagination - Simple query
    const totalCountQuery = `SELECT COUNT(*) as total FROM characters c ${whereClause}`;
    
    const totalResult = await query<any>(totalCountQuery, queryParams);
    const total = totalResult[0]?.total || 0;

    // Get rankings - Simple query without ROW_NUMBER()
    const rankingsQuery = `
      SELECT 
        c.id,
        c.name,
        c.level,
        c.exp,
        c.job,
        c.fame,
        c.accountid,
        c.guildid,
        c.skincolor,
        c.gender,
        c.hair,
        c.face,
        c.str,
        c.dex,
        c.int,
        c.luk,
        c.meso,
        g.name as guild_name
      FROM characters c
      LEFT JOIN guilds g ON c.guildid = g.guildid AND c.guildid > 0
      ${whereClause}
      ORDER BY c.level DESC, c.exp DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    const rankings = await query<any>(rankingsQuery, queryParams);

    // Get equipment for all characters at once
    const characterIds = rankings.map((char: any) => char.id);
    const allEquipment = characterIds.length > 0 
      ? await secureQueries.getCharactersEquipment(characterIds)
      : {};

    // Format rankings - Simple ranking calculation
    const formattedRankings = rankings.map((char: any, index: number) => ({
      rank: offset + index + 1,
      overallRank: offset + index + 1,
      id: char.id,
      name: char.name,
      level: char.level,
      exp: char.exp,
      job: getJobName(char.job),
      jobId: char.job,
      jobCategory: getJobCategory(char.job),
      guild: char.guild_name || '',
      fame: char.fame || 0,
      accountId: char.accountid,
      isCurrentUser: currentUserId === char.accountid,
      skincolor: char.skincolor || 0,
      gender: char.gender || 0,
      hair: char.hair || 30000,
      face: char.face || 20000,
      equipment: allEquipment[char.id] || {},
      stats: {
        str: char.str || 4,
        dex: char.dex || 4,
        int: char.int || 4,
        luk: char.luk || 4
      },
      meso: char.meso || 0
    }));

    // Find user's ranking if logged in
    let userRanking = null;
    if (currentUserId) {
      // Check if user is in current page results
      const userCharsInRankings = formattedRankings.filter(char => char.isCurrentUser);
      
      if (userCharsInRankings.length > 0) {
        userRanking = userCharsInRankings[0]; // Get first user character
      } else {
        // Find user's best character overall - Simple query
        const userCharQuery = `
          SELECT 
            c.id,
            c.name,
            c.level,
            c.exp,
            c.job,
            c.fame,
            c.guildid,
            c.skincolor,
            c.gender,
            c.hair,
            c.face,
            c.str,
            c.dex,
            c.int,
            c.luk,
            c.meso,
            g.name as guild_name
          FROM characters c
          LEFT JOIN guilds g ON c.guildid = g.guildid AND c.guildid > 0
          WHERE c.accountid = ? AND c.gm = 0
          ORDER BY c.level DESC, c.exp DESC
          LIMIT 1
        `;

        const userCharResult = await query<any>(userCharQuery, [currentUserId]);
        
        if (userCharResult.length > 0) {
          const userChar = userCharResult[0];
          
          // Calculate user rank - Simple count query
          const rankQuery = `
            SELECT COUNT(*) + 1 as user_rank
            FROM characters c2 
            WHERE c2.gm = 0
            AND (c2.level > ? OR (c2.level = ? AND c2.exp > ?))
          `;
          
          const rankResult = await query<any>(rankQuery, [userChar.level, userChar.level, userChar.exp]);
          const userRank = rankResult[0]?.user_rank || 1;
          
          // Get equipment for this user character
          const userEquipment = await secureQueries.getCharacterEquipment(userChar.id);
          
          userRanking = {
            rank: userRank,
            overallRank: userRank,
            id: userChar.id,
            name: userChar.name,
            level: userChar.level,
            exp: userChar.exp,
            job: getJobName(userChar.job),
            jobId: userChar.job,
            jobCategory: getJobCategory(userChar.job),
            guild: userChar.guild_name || '',
            fame: userChar.fame || 0,
            accountId: currentUserId,
            isCurrentUser: true,
            skincolor: userChar.skincolor || 0,
            gender: userChar.gender || 0,
            hair: userChar.hair || 30000,
            face: userChar.face || 20000,
            equipment: userEquipment,
            stats: {
              str: userChar.str || 4,
              dex: userChar.dex || 4,
              int: userChar.int || 4,
              luk: userChar.luk || 4
            },
            meso: userChar.meso || 0
          };
        }
      }
    }

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({ 
      rankings: formattedRankings,
      userRanking,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage,
        hasPrevPage,
        startItem: offset + 1,
        endItem: Math.min(offset + limit, total)
      },
      filters: {
        job: jobFilter,
        search: searchName,
        availableJobs: getAvailableJobCategories()
      }
    });

  } catch (error) {
    console.error('Rankings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rankings' },
      { status: 500 }
    );
  }
}

// Helper function to get job filter condition
function getJobFilterCondition(jobFilter: string): string | null {
  const jobFilters: { [key: string]: string } = {
    'beginner': 'c.job = 0',
    'noblesse': 'c.job = 1000',
    'warrior': 'c.job BETWEEN 100 AND 132',
    'dawn-warrior': 'c.job BETWEEN 1100 AND 1112',
    'magician': 'c.job BETWEEN 200 AND 232',
    'blaze-wizard': 'c.job BETWEEN 1200 AND 1212',
    'archer': 'c.job BETWEEN 300 AND 322',
    'wind-archer': 'c.job BETWEEN 1300 AND 1312',
    'thief': 'c.job BETWEEN 400 AND 434', // Updated to include Dual Blade
    'night-walker': 'c.job BETWEEN 1400 AND 1412',
    'pirate': 'c.job BETWEEN 500 AND 532', // Updated to include all pirate jobs
    'thunder-breaker': 'c.job BETWEEN 1500 AND 1512',
    'legend-beginner': 'c.job IN (2000, 2001)', // Aran and Evan beginners
    'aran': 'c.job BETWEEN 2000 AND 2112', // Includes Aran beginner
    'evan': 'c.job BETWEEN 2001 AND 2218', // Includes Evan beginner
    'gm': 'c.job BETWEEN 800 AND 910'
  };

  return jobFilters[jobFilter] || null;
}

// Helper function to get job category
function getJobCategory(jobId: number): string {
  if (jobId === 0) return 'beginner';
  if (jobId === 1000) return 'noblesse';
  if (jobId >= 100 && jobId <= 132) return 'warrior';
  if (jobId >= 1100 && jobId <= 1112) return 'dawn-warrior';
  if (jobId >= 200 && jobId <= 232) return 'magician';
  if (jobId >= 1200 && jobId <= 1212) return 'blaze-wizard';
  if (jobId >= 300 && jobId <= 322) return 'archer';
  if (jobId >= 1300 && jobId <= 1312) return 'wind-archer';
  if (jobId >= 400 && jobId <= 434) return 'thief';
  if (jobId >= 1400 && jobId <= 1412) return 'night-walker';
  if (jobId >= 500 && jobId <= 532) return 'pirate';
  if (jobId >= 1500 && jobId <= 1512) return 'thunder-breaker';
  if (jobId >= 2000 && jobId <= 2001) return 'legend-beginner';
  if (jobId >= 2100 && jobId <= 2112) return 'aran';
  if (jobId >= 2200 && jobId <= 2218) return 'evan';
  if (jobId >= 800 && jobId <= 910) return 'gm';
  return 'unknown';
}

// Helper function to get available job categories
function getAvailableJobCategories() {
  return [
    { value: 'all', label: 'All Jobs', icon: 'all' },
    { value: 'beginner', label: 'Beginner', icon: 'beginner' },
    { value: 'noblesse', label: 'Noblesse', icon: 'beginner' },
    { value: 'warrior', label: 'Warrior', icon: 'warrior' },
    { value: 'dawn-warrior', label: 'Dawn Warrior', icon: 'warrior' },
    { value: 'magician', label: 'Magician', icon: 'magician' },
    { value: 'blaze-wizard', label: 'Blaze Wizard', icon: 'magician' },
    { value: 'archer', label: 'Archer', icon: 'archer' },
    { value: 'wind-archer', label: 'Wind Archer', icon: 'archer' },
    { value: 'thief', label: 'Thief', icon: 'thief' },
    { value: 'night-walker', label: 'Night Walker', icon: 'thief' },
    { value: 'pirate', label: 'Pirate', icon: 'pirate' },
    { value: 'thunder-breaker', label: 'Thunder Breaker', icon: 'pirate' },
    { value: 'aran', label: 'Aran', icon: 'aran' },
    { value: 'evan', label: 'Evan', icon: 'evan' }
  ];
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