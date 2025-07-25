// src/components/admin-dashboard/EquipmentModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, Shield, Swords, Search, User, Coins, Sparkles
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

interface EquipmentItem {
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
  items: EquipmentItem[];
  equipped: EquipmentItem[];
}

interface EquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  username: string;
}

const EquipmentModal: React.FC<EquipmentModalProps> = ({
  isOpen,
  onClose,
  userId,
  username
}) => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'main' | 'cash'>('main');

  // Equipment slot positions (negative values in database)
  const equipSlots: { [key: string]: string } = {
    '-1': 'Hat',
    '-2': 'Face Accessory',
    '-3': 'Eye Accessory',
    '-4': 'Earrings',
    '-5': 'Top',
    '-6': 'Bottom',
    '-7': 'Shoes',
    '-8': 'Gloves',
    '-9': 'Cape',
    '-10': 'Shield',
    '-11': 'Weapon',
    '-12': 'Ring 1',
    '-13': 'Ring 2',
    '-14': 'Ring 3',
    '-15': 'Ring 4',
    '-16': 'Pendant 1',
    '-17': 'Pendant 2',
    '-18': 'Belt',
    '-19': 'Medal',
    '-20': 'Shoulder',
    '-21': 'Pocket',
    '-22': 'Badge',
    '-23': 'Emblem',
    '-24': 'Android',
    '-25': 'Android Heart',
    '-26': 'Secondary Weapon',
    '-29': 'Totem 1',
    '-30': 'Totem 2',
    '-31': 'Totem 3',
    // Cash Equipment Slots
    '-101': 'Cash Hat',
    '-102': 'Cash Face',
    '-103': 'Cash Eye',
    '-104': 'Cash Earrings',
    '-105': 'Cash Top',
    '-106': 'Cash Bottom',
    '-107': 'Cash Shoes',
    '-108': 'Cash Gloves',
    '-109': 'Cash Cape',
    '-110': 'Cash Ring',
    '-111': 'Cash Weapon',
    '-114': 'Cash Overall'
  };

  // Main equipment slots for display - Perfect MapleStory character layout
  const mainSlots = [
    { position: -1, name: 'Hat', row: 0, col: 2 },
    { position: -2, name: 'Face', row: 1, col: 1 },
    { position: -3, name: 'Eye', row: 1, col: 3 },
    { position: -4, name: 'Earrings', row: 2, col: 0 },
    { position: -9, name: 'Cape', row: 1, col: 2 },
    { position: -5, name: 'Top', row: 2, col: 2 },
    { position: -11, name: 'Weapon', row: 2, col: 4 },
    { position: -8, name: 'Gloves', row: 3, col: 1 },
    { position: -6, name: 'Bottom', row: 3, col: 2 },
    { position: -10, name: 'Shield', row: 3, col: 3 },
    { position: -7, name: 'Shoes', row: 4, col: 2 },
  ];

  // Accessory slots arranged in a nice grid
  const accessorySlots = [
    { position: -16, name: 'Pendant 1', row: 0, col: 0 },
    { position: -17, name: 'Pendant 2', row: 0, col: 1 },
    { position: -12, name: 'Ring 1', row: 1, col: 0 },
    { position: -13, name: 'Ring 2', row: 1, col: 1 },
    { position: -14, name: 'Ring 3', row: 2, col: 0 },
    { position: -15, name: 'Ring 4', row: 2, col: 1 },
    { position: -18, name: 'Belt', row: 3, col: 0 },
    { position: -19, name: 'Medal', row: 3, col: 1 },
    { position: -20, name: 'Shoulder', row: 4, col: 0 },
    { position: -21, name: 'Pocket', row: 4, col: 1 },
  ];

  // Cash equipment slots for display
  const cashSlots = [
    { position: -101, name: 'Hat', row: 0, col: 2 },
    { position: -102, name: 'Face', row: 1, col: 1 },
    { position: -103, name: 'Eye', row: 1, col: 3 },
    { position: -104, name: 'Earrings', row: 2, col: 0 },
    { position: -109, name: 'Cape', row: 1, col: 2 },
    { position: -105, name: 'Top', row: 2, col: 2 },
    { position: -111, name: 'Weapon', row: 2, col: 4 },
    { position: -108, name: 'Gloves', row: 3, col: 1 },
    { position: -106, name: 'Bottom', row: 3, col: 2 },
    { position: -114, name: 'Overall', row: 3, col: 3 },
    { position: -107, name: 'Shoes', row: 4, col: 2 }
  ];

  useEffect(() => {
    if (isOpen) {
      fetchEquipment();
    }
  }, [isOpen, userId]);

  const fetchEquipment = async () => {
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
      console.error('Failed to fetch equipment:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentCharacter = characters.find(c => c.id === selectedCharacter);
  const equippedItems = currentCharacter?.equipped || [];
  
  // Create a map of equipped items by position
  const equippedMap = new Map<number, EquipmentItem>();
  equippedItems.forEach(item => {
    equippedMap.set(item.position, item);
  });

  // Check if there are any cash items equipped
  const hasCashItems = equippedItems.some(item => 
    item.position <= -101 && item.position >= -114
  );

  if (!isOpen) return null;

  const renderEquipmentSlot = (position: number, slotName: string) => {
    const item = equippedMap.get(position);
    
    return (
      <div className="text-center relative" style={{ zIndex: 1 }}>
        <div className="text-xs text-gray-500 font-semibold mb-2 truncate" style={{ width: '70px' }}>
          {slotName}
        </div>
        <div className="w-14 h-14 mx-auto bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 rounded-xl p-1.5 hover:border-red-400 hover:shadow-lg hover:scale-110 transition-all duration-300 cursor-pointer relative group overflow-visible">
          {item ? (
            <div className="relative w-full h-full overflow-visible" style={{ zIndex: 10 }}>
              <MapleStoryItem
                itemId={item.itemid}
                quantity={item.quantity}
                slotName={slotName}
                giftFrom={item.giftFrom}
                equipStats={item.equipStats}
                slotPosition={position}
                className="w-full h-full relative z-20"
              />
              {/* Enhanced glow effect for equipped items */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
              <div className="text-xl font-light">+</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ zIndex: 100 }}>
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative z-[101]" style={{ width: '720px', zIndex: 101 }}>
        {/* Enhanced Modal Window */}
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-visible backdrop-blur-xl">
          {/* Enhanced Title Bar */}
          <div className="bg-gradient-to-r from-red-50 via-red-100 to-pink-50 px-8 py-5 flex items-center justify-between border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Equipment Viewer
                </h2>
                <p className="text-sm text-gray-600 font-medium">
                  Viewing equipment for: <span className="text-red-600 font-bold">{username}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-300 hover:scale-105"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Enhanced Content */}
          <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-8" style={{ position: 'relative', zIndex: 1 }}>
            {/* Character Selector */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-5">
                {characters.length > 0 && (
                  <select
                    value={selectedCharacter || ''}
                    onChange={(e) => setSelectedCharacter(Number(e.target.value))}
                    className="bg-white text-gray-900 px-5 py-3 rounded-xl border-2 border-gray-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-sm hover:shadow-md transition-all"
                  >
                    {characters.map((char) => (
                      <option key={char.id} value={char.id}>
                        {char.name}
                      </option>
                    ))}
                  </select>
                )}
                <div className="text-gray-700 text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-red-500" />
                  Character Equipment
                </div>
              </div>
              <div className="bg-gradient-to-r from-red-50 to-pink-50 px-6 py-3 rounded-full text-gray-800 text-sm font-bold border-2 border-red-200 shadow-sm">
                Equipped: <span className="text-red-600 text-lg">{equippedItems.length}</span> items
              </div>
            </div>

            {/* Enhanced Tab Navigation */}
            {hasCashItems && (
              <div className="flex gap-3 mb-6 p-1 bg-white rounded-2xl border border-gray-200 shadow-sm">
                <button
                  onClick={() => setActiveTab('main')}
                  className={`flex-1 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                    activeTab === 'main'
                      ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg transform scale-[1.02]'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-red-50'
                  }`}
                >
                  <Swords className="w-4 h-4" />
                  Main Equipment
                </button>
                <button
                  onClick={() => setActiveTab('cash')}
                  className={`flex-1 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                    activeTab === 'cash'
                      ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg transform scale-[1.02]'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-purple-50'
                  }`}
                >
                  <Coins className="w-4 h-4" />
                  Cash Equipment
                </button>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin mx-auto mb-6"></div>
                  <p className="text-gray-600 font-medium text-lg">Loading equipment...</p>
                </div>
              </div>
            ) : activeTab === 'main' ? (
              <div className="grid grid-cols-5 gap-8">
                {/* Main Equipment - 3 columns */}
                <div className="col-span-3 bg-white rounded-2xl p-6 border border-gray-200 shadow-lg overflow-visible" style={{ position: 'relative', zIndex: 1 }}>
                  <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
                      <Swords className="w-5 h-5 text-white" />
                    </div>
                    Main Equipment
                  </h3>
                  
                  {/* Perfect Character Equipment Layout */}
                  <div className="relative mx-auto overflow-visible" style={{ width: '350px', height: '400px', position: 'relative', zIndex: 1 }}>
                    {mainSlots.map(slot => (
                      <div
                        key={slot.position}
                        className="absolute overflow-visible"
                        style={{
                          top: `${slot.row * 80}px`,
                          left: `${slot.col * 70}px`,
                          zIndex: 10
                        }}
                      >
                        {renderEquipmentSlot(slot.position, slot.name)}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Accessories - 2 columns */}
                <div className="col-span-2 bg-white rounded-2xl p-6 border border-gray-200 shadow-lg overflow-visible" style={{ position: 'relative', zIndex: 1 }}>
                  <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    Accessories
                  </h3>
                  
                  {/* Accessories Grid */}
                  <div className="relative mx-auto overflow-visible" style={{ width: '150px', height: '400px', position: 'relative', zIndex: 1 }}>
                    {accessorySlots.map(slot => (
                      <div
                        key={slot.position}
                        className="absolute overflow-visible"
                        style={{
                          top: `${slot.row * 80}px`,
                          left: `${slot.col * 75}px`,
                          zIndex: 10
                        }}
                      >
                        {renderEquipmentSlot(slot.position, slot.name)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg overflow-visible" style={{ position: 'relative', zIndex: 1 }}>
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Coins className="w-5 h-5 text-white" />
                  </div>
                  Cash Equipment
                </h3>
                
                {/* Cash Equipment Character Layout */}
                <div className="relative mx-auto overflow-visible" style={{ width: '350px', height: '400px', position: 'relative', zIndex: 1 }}>
                  {cashSlots.map(slot => (
                    <div
                      key={slot.position}
                      className="absolute overflow-visible"
                      style={{
                        top: `${slot.row * 80}px`,
                        left: `${slot.col * 70}px`,
                        zIndex: 10
                      }}
                    >
                      {renderEquipmentSlot(slot.position, slot.name)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EquipmentModal;