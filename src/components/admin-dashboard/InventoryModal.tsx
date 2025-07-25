// src/components/admin-dashboard/InventoryModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, Package, Search, Coins, Shield, Sparkles
} from 'lucide-react';
import { adminAPI } from '@/services/api';
import MapleStoryItem from './MapleStoryItem';

interface EquipmentStats {
  inventoryequipmentid: number;
  inventoryitemid: number;
  upgradeslots: number;
  level: number;
  str: number;
  dex: number;
  int: number;
  luk: number;
  hp: number;
  mp: number;
  watk: number;
  matk: number;
  wdef: number;
  mdef: number;
  acc: number;
  avoid: number;
  hands: number;
  speed: number;
  jump: number;
  locked: number;
  vicious: number;
  itemlevel: number;
  itemexp: number;
  ringid: number;
}

interface InventoryItem {
  inventoryitemid: number;
  characterid: number;
  itemid: number;
  quantity: number;
  position: number;
  owner: string;
  petid: number;
  flag: number;
  expiration: string;
  giftFrom: string;
  inventorytype: number;
  equipStats?: EquipmentStats | null;
}

interface Character {
  id: number;
  name: string;
  items: InventoryItem[];
  equipped: InventoryItem[];
}

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  username: string;
}

const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  userId,
  username
}) => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<number>(1);

  const inventoryTabs = [
    { id: 1, name: 'EQUIP', label: 'EQUIP' },
    { id: 2, name: 'USE', label: 'USE' },
    { id: 3, name: 'SETUP', label: 'SET-UP' },
    { id: 4, name: 'ETC', label: 'ETC' },
    { id: 5, name: 'CASH', label: 'CASH' }
  ];

  // MapleStory inventory - let's use 48 slots (8 columns x 6 rows)
  const SLOTS_PER_TAB = 48;
  const COLS = 8;
  const ROWS = 6;

  useEffect(() => {
    if (isOpen) {
      fetchInventory();
    }
  }, [isOpen, userId]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getUserInventory(userId);
      if (response.ok) {
        setCharacters(response.data.characters);
        if (response.data.characters.length > 0) {
          setSelectedCharacter(response.data.characters[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentCharacter = characters.find(c => c.id === selectedCharacter);
  const currentItems = currentCharacter?.items || [];
  
  // Filter items by current tab
  const tabItems = currentItems.filter(item => item.inventorytype === selectedTab);
  
  // Create a map of position to item for quick lookup
  const itemMap = new Map<number, InventoryItem>();
  tabItems.forEach(item => {
    itemMap.set(item.position, item);
  });

  if (!isOpen) return null;



  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ zIndex: 100 }}>
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative z-[101]" style={{ width: '720px', zIndex: 101 }}>
        {/* Enhanced Modal Window */}
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-visible">
          {/* Enhanced Title Bar */}
          <div className="bg-gradient-to-r from-red-50 to-red-100 px-6 py-4 flex items-center justify-between border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Inventory Viewer</h2>
                <p className="text-sm text-gray-600">Viewing items for: {username}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Enhanced Tab Bar */}
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
            <div className="flex gap-2">
              {inventoryTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${
                    selectedTab === tab.id
                      ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg transform scale-105'
                      : 'bg-white text-gray-600 hover:text-gray-900 hover:bg-red-50 hover:scale-102 border border-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Enhanced Content */}
          <div className="bg-gray-50 p-6" style={{ position: 'relative', zIndex: 1 }}>
            {/* Character Selector and Slot Info */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                {characters.length > 0 && (
                  <select
                    value={selectedCharacter || ''}
                    onChange={(e) => setSelectedCharacter(Number(e.target.value))}
                    className="bg-white text-gray-900 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    {characters.map((char) => (
                      <option key={char.id} value={char.id}>
                        {char.name}
                      </option>
                    ))}
                  </select>
                )}
                <div className="text-gray-600 text-sm font-medium">
                  Character Inventory
                </div>
              </div>
              <div className="bg-gradient-to-r from-red-50 to-red-100 px-5 py-2 rounded-full text-gray-700 text-sm font-bold border border-red-200">
                SLOT: <span className="text-red-600">{tabItems.length}</span> / {SLOTS_PER_TAB}
              </div>
            </div>

            {/* Enhanced Inventory Grid */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm overflow-visible" style={{ position: 'relative', zIndex: 1 }}>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="w-12 h-12 border-3 border-red-500/30 border-t-red-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading inventory...</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-8 gap-1 overflow-visible">
                  {Array.from({ length: SLOTS_PER_TAB }, (_, index) => {
                    const position = index + 1;
                    const item = itemMap.get(position);
                    
                    return (
                      <div
                        key={position}
                        className="w-14 h-14 bg-gray-50 border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 hover:scale-105 transition-all cursor-pointer relative overflow-visible"
                        style={{ zIndex: 50 }}
                      >
                        {item ? (
                          <div className="relative w-full h-full overflow-visible" style={{ zIndex: 100 }}>
                            <MapleStoryItem
                              itemId={item.itemid}
                              quantity={item.quantity}
                              giftFrom={item.giftFrom}
                              equipStats={item.equipStats}
                              slotPosition={item.position}
                              className="w-full h-full relative overflow-visible"
                            />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <div className="text-2xl">+</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Enhanced Bottom Info Bar */}
            <div className="flex justify-between items-center mt-4">
              <div className="flex gap-3">
                <div className="px-4 py-2 bg-white rounded-lg border border-gray-200 text-sm font-medium text-gray-700 shadow-sm">
                  <Package className="w-4 h-4 inline mr-2 text-red-500" />
                  Total Items: <span className="text-red-600 font-bold">{currentItems.length}</span>
                </div>
                {currentCharacter && (
                  <div className="px-4 py-2 bg-white rounded-lg border border-gray-200 text-sm font-medium text-gray-700 shadow-sm">
                    <Shield className="w-4 h-4 inline mr-2 text-red-500" />
                    Equipped: <span className="text-red-600 font-bold">{currentCharacter.equipped.length}</span>
                  </div>
                )}
              </div>
              <div className="text-gray-500 text-sm">
                Currently viewing: <span className="font-medium text-gray-700">{currentCharacter?.name || 'No character'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryModal;