// src/types/api.ts

// User types - UPDATED with secret question support
export interface User {
  id: number;
  username: string;
  email?: string;
  nx?: number;
  votePoints?: number;
  isLoggedIn?: boolean;
  hasSecretQuestion?: boolean; // NEW: Indicates if user has set up security question
  isAdmin?: boolean;
}

// NEW: Secret question types
export interface SecretQuestion {
  id: number;
  question_text: string;
  is_active: boolean;
  created_at: string;
}

export interface UserSecretQuestionInfo {
  hasSecretQuestion: boolean;
  questionText?: string; // Only shown for password reset verification
}

// Character equipment types
export interface CharacterEquipment {
  cap?: number;      // Item ID for cap/hat
  mask?: number;     // Item ID for face accessory
  eyes?: number;     // Item ID for eye accessory
  ears?: number;     // Item ID for earrings
  coat?: number;     // Item ID for top/overall
  pants?: number;    // Item ID for bottom
  shoes?: number;    // Item ID for shoes
  glove?: number;    // Item ID for gloves
  cape?: number;     // Item ID for cape
  shield?: number;   // Item ID for shield
  weapon?: number;   // Item ID for weapon
}

// Character types
export interface Character {
  id: number;
  name: string;
  level: number;
  job: string;
  exp: number;
  meso: number;
  skincolor: number;  // 0-3 for different skin tones
  gender: number;     // 0 for male, 1 for female
  hair: number;       // Hair ID (e.g., 30000)
  face: number;       // Face ID (e.g., 20000)
  stats: {
    str: number;
    dex: number;
    int: number;
    luk: number;
  };
  equipment: CharacterEquipment;
  guildname?: string; // Guild name if in guild
  fame?: number;
}

// Announcement types
export interface Announcement {
  id: number;
  type: 'event' | 'update' | 'maintenance';
  title: string;
  description: string;
  date: string;
  time?: string;
  createdBy: string;
  gradient: string;
  priority?: number;
}

// Ranking filter types
export interface RankingFilters {
  job: string;
  search: string;
  page: number;
  limit: number;
}

export interface JobCategory {
  value: string;
  label: string;
  icon: string;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  startItem: number;
  endItem: number;
}

// Updated ranking types to match enhanced API
export interface RankingPlayer {
  rank: number;
  overallRank: number;
  id: number;
  name: string;
  level: number;
  exp: number;
  job: string;
  jobId: number;
  jobCategory: string;
  guild: string;
  fame: number;
  accountId: number;
  isCurrentUser: boolean;
  // Character appearance data
  skincolor: number;
  gender: number;
  hair: number;
  face: number;
  equipment: CharacterEquipment;
  stats: {
    str: number;
    dex: number;
    int: number;
    luk: number;
  };
  meso: number;
}

// Vote types
export interface VoteSite {
  id: number;
  name: string;
  url: string;
  nx_reward: number;
  icon: string;
}

export interface VoteStatus {
  sites: VoteSite[];
  voteStatus: {
    [key: string]: {
      voted: boolean;
      canVoteAt?: number;
      pending?: boolean;
    };
  };
  todayRewards: number;
  username: string;
  currentNX: number;
  totalVotes: number;
}

// NEW: Vote history types
export interface VoteRecord {
  id: number;
  site: string;
  voted_at: string;
  nx_reward: number;
}

export interface VoteHistory {
  records: VoteRecord[];
  pagination: PaginationInfo;
  totalNXEarned: number;
  totalVotes: number;
}

// API Response types
export interface ApiResponse<T = any> {
  ok: boolean;
  data: T;
  status: number;
}

export interface StatsResponse {
  user: User & {
    nx: number;
    votePoints: number;
  };
  mainCharacter?: {
    level: number;
    job: string;
  };
  onlineCount: number;
}

export interface CharactersResponse {
  characters: Character[];
}

// Updated rankings response to match enhanced API
export interface RankingsResponse {
  rankings: RankingPlayer[];
  userRanking?: RankingPlayer;
  pagination: PaginationInfo;
  filters: {
    job: string;
    search: string;
    availableJobs: JobCategory[];
  };
}

export interface AnnouncementsResponse {
  announcements: Announcement[];
  pagination?: PaginationInfo; // NEW: Pagination support
}

export interface AdminCheckResponse {
  isAdmin: boolean;
  username?: string;
}

// UPDATED: Enhanced user management types
export interface AdminUser {
  id: number;
  name: string;
  email?: string;
  createdat: string;
  lastlogin?: string;
  nxCredit?: number;
  votepoints?: number;
  banned: number;
  loggedin: number;
  hasSecretQuestion: boolean; // NEW
  charactersCount?: number; // NEW
}

export interface UsersResponse {
  users: AdminUser[];
  total: number;
  pagination: PaginationInfo;
}

// NEW: Password reset attempt types
export interface PasswordResetAttempt {
  id: number;
  account_id: number;
  username: string;
  ip_address: string;
  attempt_time: string;
  success: boolean;
}

export interface PasswordResetAttemptsResponse {
  attempts: PasswordResetAttempt[];
  pagination: PaginationInfo;
  stats: {
    totalAttempts: number;
    successfulAttempts: number;
    failedAttempts: number;
    uniqueIPs: number;
  };
}

// NEW: Admin activity log types
export interface AdminActivityLog {
  id: number;
  admin_id: number;
  admin_username: string;
  action: string;
  target_type: 'user' | 'character' | 'announcement' | 'system';
  target_id?: number;
  details: string;
  ip_address: string;
  timestamp: string;
}

export interface AdminActivityLogsResponse {
  logs: AdminActivityLog[];
  pagination: PaginationInfo;
}

// NEW: Authentication request/response types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  birthday: string;
  secretQuestionId: number;
  secretAnswer: string;
}

export interface ForgotPasswordRequest {
  username: string;
  secretAnswer: string;
  newPassword: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  warning?: string; // For password reset warnings
}

export interface SecretQuestionsResponse {
  questions: SecretQuestion[];
}

// NEW: Profile update types
export interface ProfileUpdateRequest {
  email?: string;
  secretQuestionId?: number;
  secretAnswer?: string;
}

// NEW: Server status types
export interface ServerStatus {
  online: boolean;
  players: number;
  uptime: string;
  version: string;
  events: ServerEvent[];
}

export interface ServerEvent {
  id: number;
  name: string;
  description: string;
  start_time: string;
  end_time: string;
  active: boolean;
}

export interface ServerStats {
  totalAccounts: number;
  totalCharacters: number;
  averageLevel: number;
  topGuilds: Array<{
    name: string;
    memberCount: number;
    averageLevel: number;
  }>;
}

// NEW: Inventory types for admin equipment viewer
export interface InventoryItem {
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

export interface EquipmentStats {
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

export interface CharacterInventory {
  id: number;
  name: string;
  items: InventoryItem[];
  equipped: InventoryItem[];
}

export interface UserInventoryResponse {
  characters: CharacterInventory[];
}

// NEW: Error types
export interface ApiError {
  error: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
  code?: string;
}

// NEW: Success response wrapper
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  details?: any;
}

export type ApiResult<T = any> = SuccessResponse<T> | ErrorResponse;

// Export the character data type for the renderer
export type CharacterData = Character;