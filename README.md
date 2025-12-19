
# MapleCore CMS
A Modern, Full-Featured MapleStory v83 Private Server Website
MapleCore discord server (https://discord.gg/dHdckYGsTT)

## Installation Guide

### Step 1: Clone the Repository
```bash
git clone https://github.com/yourusername/MapleCore-cms.git
cd MapleCore-cms
```
Or download as ZIP and extract to your desired location.

### Step 2: Install Dependencies
```bash
npm install
# or if you encounter issues:
npm install --legacy-peer-deps
```

### Step 3: Configure Environment
Create a `.env.local` file:
```env
# ========================================
# SERVER CONFIGURATION
# ========================================
NEXT_PUBLIC_SERVER_NAME=MapleCore
NEXT_PUBLIC_SERVER_VERSION=v83 #just use 83 anyversion wont work unless some database setup cosmic
NEXT_PUBLIC_DOWNLOAD_URL=https://your-server.com/downloads/MapleCore-Client-v83.zip or any download link.
NODE_ENV=production

# ========================================
# DATABASE CONFIGURATION
# ========================================
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=cosmic

# ========================================
# SECURITY
# ========================================
JWT_SECRET=your-super-secret-jwt-key-here-make-it-random

# ========================================
# NETWORK CONFIGURATION
# ========================================
# Server URL - Your public IP or domain
NEXT_PUBLIC_API_URL=http://5.55.55.55:3000
# Examples:
# NEXT_PUBLIC_API_URL=http://192.16x.x.x:3000  (local network)
# NEXT_PUBLIC_API_URL=https://yourdomain.com     (domain with SSL)

# Hostname Configuration
NEXT_PUBLIC_HOSTNAME=5.55.55.55
# Examples:
# NEXT_PUBLIC_HOSTNAME=192.16x.x.x  (local)
# NEXT_PUBLIC_HOSTNAME=yourdomain.com (domain)
# CORS Configuration - Allowed origins for API access
ALLOWED_ORIGINS=http://localhost:3000,http://192.16x.x.x:3000,http://5.55.55.55:3000
# Add more origins separated by commas as needed

# ========================================
# VOTE SYSTEM CONFIGURATION
# ========================================
# Gtop100 Settings
GTOP100_PINGBACK_KEY=
GTOP100_SITE_ID=
GTOP100_VOTE_URL=https://gtop100.com/topsites/MapleStory/sitedetails/yourvotehere
GTOP100_NX_REWARD=
GTOP100_COOLDOWN_HOURS=24

# Vote Site Display Configuration
VOTE_SITE_1_NAME=gtop100
VOTE_SITE_1_DISPLAY=Gtop100
VOTE_SITE_1_ICON=🏆
VOTE_SITE_1_COLOR_FROM=orange-500
VOTE_SITE_1_COLOR_TO=orange-400

# Vote System Features
ENABLE_VOTE_LOGGING=true
ENABLE_VOTE_WEBHOOK_DEBUG=false
ENABLE_VOTE_WEBHOOK_LOGS=true

# Vote Security Settings
VOTE_WEBHOOK_MAX_RETRIES=3
VOTE_WEBHOOK_TIMEOUT_MS=30000

# ========================================
# INTEGRATIONS
# ========================================
# Discord Webhook (optional)
DISCORD_WEBHOOK_URL=your_discord_webhook_url_here

# ========================================
# DEVELOPMENT SETTINGS
# ========================================
# Disable Next.js telemetry
NEXT_TELEMETRY_DISABLED=1
```

### Step 4: Database Setup
- Navigate to `database/` folder  
- Import SQL files  
- Ensure these tables: `accounts`, `characters`, `inventoryitems`, and CMS-specific ones

### Step 5: Build and Run
**Development Mode**
```bash
npm run dev
```

**Production Mode**
```bash
npm run build
npm run start
```

## Project Structure
```
MapleCore/
├── src/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── services/
│   └── types/
├── public/
├── database/
├── .env.local
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

## Usage Guide

### For Players
- Register at `/auth`
- Dashboard: view characters, vote, download client

### For Admins
- Log in with GM account
- Access `/admin` panel

## Configuration
- Port Forwarding for Public Access
- Setup Discord Webhooks
- Enable HTTPS with NGINX

## Customization
- Change Name, Theme Colors
- Add Custom Features (API, UI)

## Troubleshooting
- Build errors: `rm -rf .next && npm run build`
- Increase memory: `NODE_OPTIONS="--max-old-space-size=4096" npm run build`
- DB/Auth: Check credentials, clear cookies

## Production Deployment
**Using PM2**
```bash
npm install -g pm2
pm2 start npm --name "MapleCore" -- start
pm2 save
pm2 startup
```

## Optimization
- Use Cloudflare CDN
- Add DB indexes
- Use Redis for sessions
- Optimize assets

## Contributing
1. Fork repo
2. Create feature branch
3. Push changes
4. Open PR

## Acknowledgments
MapleStory community, Cosmicms, Next.js, React contributors
