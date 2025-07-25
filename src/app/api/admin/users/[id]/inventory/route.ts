// src/app/api/admin/users/[id]/inventory/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, AuthenticatedRequest } from '@/lib/middleware/auth';
import { query } from '@/lib/db';
import { z } from 'zod';

const paramsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Invalid user ID')
});

export async function GET(
  request: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAdmin(async (req: AuthenticatedRequest) => {
    try {
      const { id } = await params;
      const validated = paramsSchema.parse({ id });
      const userId = parseInt(validated.id);

      // First get all characters for this user
      const characters = await query<any>(
        `SELECT id, name FROM characters WHERE accountid = ?`,
        [userId]
      );

      if (characters.length === 0) {
        return NextResponse.json({ 
          items: [],
          characters: [],
          message: 'No characters found for this user'
        });
      }

      // Get inventory items for all characters
      const characterIds = characters.map((c: any) => c.id);
      const placeholders = characterIds.map(() => '?').join(',');
      
      const items = await query<any>(
        `SELECT 
          inventoryitemid,
          characterid,
          itemid,
          inventorytype,
          position,
          quantity,
          owner,
          petid,
          flag,
          expiration,
          giftFrom
        FROM inventoryitems 
        WHERE characterid IN (${placeholders})
        ORDER BY inventorytype, position`,
        characterIds
      );

      // Get equipped items (position < 0 means equipped)
      const equippedItems = await query<any>(
        `SELECT 
          inventoryitemid,
          characterid,
          itemid,
          inventorytype,
          position,
          quantity,
          owner,
          petid,
          flag,
          expiration,
          giftFrom
        FROM inventoryitems 
        WHERE characterid IN (${placeholders})
        AND position < 0
        ORDER BY position DESC`,
        characterIds
      );

      // Get equipment details for all items
      const allItemIds = [...items, ...equippedItems].map(item => item.inventoryitemid);
      let equipmentDetails: { [key: number]: any } = {};
      
      if (allItemIds.length > 0) {
        const equipPlaceholders = allItemIds.map(() => '?').join(',');
        const equipStats = await query<any>(
          `SELECT 
            inventoryequipmentid,
            inventoryitemid,
            upgradeslots,
            level,
            str,
            dex,
            \`int\`,
            luk,
            hp,
            mp,
            watk,
            matk,
            wdef,
            mdef,
            acc,
            avoid,
            hands,
            speed,
            jump,
            locked,
            vicious,
            itemlevel,
            itemexp,
            ringid
          FROM inventoryequipment 
          WHERE inventoryitemid IN (${equipPlaceholders})`,
          allItemIds
        );

        // Create a map of equipment stats by inventoryitemid
        equipStats.forEach((stat: any) => {
          equipmentDetails[stat.inventoryitemid] = stat;
        });
      }

      // Add equipment details to items
      const enhanceItems = (itemList: any[]) => {
        return itemList.map(item => ({
          ...item,
          equipStats: equipmentDetails[item.inventoryitemid] || null
        }));
      };

      // Group items by character
      const itemsByCharacter: { [key: number]: any[] } = {};
      const equippedByCharacter: { [key: number]: any[] } = {};
      
      enhanceItems(items).forEach((item: any) => {
        if (!itemsByCharacter[item.characterid]) {
          itemsByCharacter[item.characterid] = [];
        }
        // Only add non-equipped items to regular inventory
        if (item.position >= 0) {
          itemsByCharacter[item.characterid].push(item);
        }
      });

      enhanceItems(equippedItems).forEach((item: any) => {
        if (!equippedByCharacter[item.characterid]) {
          equippedByCharacter[item.characterid] = [];
        }
        equippedByCharacter[item.characterid].push(item);
      });

      // Add items to characters
      const charactersWithItems = characters.map((char: any) => ({
        ...char,
        items: itemsByCharacter[char.id] || [],
        equipped: equippedByCharacter[char.id] || []
      }));

      return NextResponse.json({ 
        characters: charactersWithItems,
        totalItems: items.length,
        totalEquipped: equippedItems.length
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid user ID' },
          { status: 400 }
        );
      }

      console.error('Get inventory error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch inventory' },
        { status: 500 }
      );
    }
  })(request);
}