// src/config/vote.config.ts
// Centralized vote system configuration

export const voteConfig = {
  // Server info
  server: {
    name: process.env.NEXT_PUBLIC_SERVER_NAME,
    version: process.env.NEXT_PUBLIC_SERVER_VERSION
  },
  
  // Gtop100 specific configuration
  gtop100: {
    pingbackKey: process.env.GTOP100_PINGBACK_KEY!,
    siteId: process.env.GTOP100_SITE_ID,
    baseUrl: process.env.GTOP100_VOTE_URL,
    nxReward: parseInt(process.env.GTOP100_NX_REWARD || '8000'),
    cooldownHours: parseInt(process.env.GTOP100_COOLDOWN_HOURS || '24')
  },
  
  // Feature flags
  features: {
    enableLogging: process.env.ENABLE_VOTE_LOGGING === 'true',
    enableDebug: process.env.ENABLE_VOTE_WEBHOOK_DEBUG === 'true',
    enableWebhookLogs: process.env.ENABLE_VOTE_WEBHOOK_LOGS !== 'false'
  },
  
  // Security settings
  security: {
    maxRetries: parseInt(process.env.VOTE_WEBHOOK_MAX_RETRIES || '3'),
    timeoutMs: parseInt(process.env.VOTE_WEBHOOK_TIMEOUT_MS || '30000'),
    allowedPorts: [80, 443, ...Array.from({length: 4001}, (_, i) => 2000 + i)] // 2000-6000
  },
  
  // UI Configuration
  ui: {
    colors: {
      primary: {
        from: process.env.VOTE_SITE_1_COLOR_FROM || 'orange-500',
        to: process.env.VOTE_SITE_1_COLOR_TO || 'orange-400'
      }
    }
  }
};

// Helper function to validate configuration
export function validateVoteConfig(): string[] {
  const errors: string[] = [];
  
  if (!voteConfig.gtop100.pingbackKey) {
    errors.push('GTOP100_PINGBACK_KEY is not set in environment variables');
  }
  
  if (!voteConfig.gtop100.baseUrl) {
    errors.push('GTOP100_VOTE_URL is not set in environment variables');
  }
  
  if (voteConfig.gtop100.nxReward <= 0) {
    errors.push('GTOP100_NX_REWARD must be a positive number');
  }
  
  if (voteConfig.gtop100.cooldownHours <= 0) {
    errors.push('GTOP100_COOLDOWN_HOURS must be a positive number');
  }
  
  return errors;
}

// Get vote URL with username
export function getVoteUrl(username: string): string {
  return `${voteConfig.gtop100.baseUrl}?vote=1&pingUsername=${encodeURIComponent(username)}`;
}

// Format time remaining
export function formatTimeRemaining(milliseconds: number): string {
  if (milliseconds <= 0) return 'Now';
  
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// Check if debugging is enabled
export function isDebugEnabled(): boolean {
  return voteConfig.features.enableDebug || process.env.NODE_ENV === 'development';
}

// Export type for vote site
export interface VoteSite {
  id: number;
  name: string;
  url: string;
  nx_reward: number;
  cooldown_hours: number;
  icon: string;
}