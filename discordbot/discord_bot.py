# discord_bot.py
import discord
from discord.ext import commands, tasks
import asyncio
import mysql.connector
from mysql.connector import pooling
import json
from datetime import datetime, timezone
import logging
from typing import Optional, Dict, List
import os

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('AnnouncementBot')

class AnnouncementBot:
    def __init__(self, config_path: str = 'config.json'):
        """Initialize the Discord bot with configuration"""
        self.config = self.load_config(config_path)
        
        # Set up intents - only use what we need
        intents = discord.Intents.default()
        # Only enable message_content if you need to read message content for commands
        # This requires enabling the intent in Discord Developer Portal
        intents.message_content = True  # Required for reading command messages
        
        self.bot = commands.Bot(
            command_prefix=self.config['bot']['prefix'],
            intents=intents
        )
        self.db_pool = self.create_db_pool()
        self.last_announcement_id = self.get_last_announcement_id()
        self.setup_events()
        
    def load_config(self, config_path: str) -> dict:
        """Load configuration from JSON file"""
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            logger.error(f"Configuration file {config_path} not found!")
            raise
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON in {config_path}")
            raise
    
    def create_db_pool(self) -> mysql.connector.pooling.MySQLConnectionPool:
        """Create a connection pool for database operations"""
        db_config = self.config['database']
        return mysql.connector.pooling.MySQLConnectionPool(
            pool_name="announcement_pool",
            pool_size=5,
            pool_reset_session=True,
            host=db_config['host'],
            port=db_config['port'],
            user=db_config['user'],
            password=db_config['password'],
            database=db_config['database']
        )
    
    def get_last_announcement_id(self) -> int:
        """Get the ID of the last processed announcement"""
        try:
            if os.path.exists('last_announcement.txt'):
                with open('last_announcement.txt', 'r', encoding='utf-8') as f:
                    return int(f.read().strip())
        except:
            pass
        
        # If file doesn't exist, get the current highest ID from database
        # This prevents posting all old announcements
        try:
            connection = self.db_pool.get_connection()
            cursor = connection.cursor()
            cursor.execute("SELECT MAX(id) FROM announcements WHERE active = 1")
            result = cursor.fetchone()
            cursor.close()
            connection.close()
            
            if result and result[0]:
                last_id = result[0]
                # Save it for next time
                self.save_last_announcement_id(last_id)
                logger.info(f"Starting from announcement ID: {last_id}")
                return last_id
        except Exception as e:
            logger.error(f"Error getting max announcement ID: {e}")
        
        return 0
    
    def save_last_announcement_id(self, announcement_id: int):
        """Save the ID of the last processed announcement"""
        with open('last_announcement.txt', 'w', encoding='utf-8') as f:
            f.write(str(announcement_id))
    
    def setup_events(self):
        """Set up bot events"""
        @self.bot.event
        async def on_ready():
            logger.info(f'{self.bot.user} has connected to Discord!')
            logger.info(f'Bot is in {len(self.bot.guilds)} guilds')
            
            # Start the announcement checker
            self.check_announcements.start()
            
            # Set bot status
            await self.bot.change_presence(
                activity=discord.Activity(
                    type=discord.ActivityType.watching,
                    name="for announcements"
                )
            )
        
        @self.bot.event
        async def on_command_error(ctx, error):
            if isinstance(error, commands.CommandNotFound):
                return
            logger.error(f'Command error: {error}')
    
    def get_announcement_embed(self, announcement: Dict) -> discord.Embed:
        """Create a Discord embed for an announcement"""
        # Choose color based on announcement type
        colors = {
            'event': 0x9333EA,  # Purple
            'update': 0x3B82F6,  # Blue
            'maintenance': 0xF97316  # Orange
        }
        
        embed = discord.Embed(
            title=announcement['title'],
            description=announcement['description'],
            color=colors.get(announcement['type'], 0x6B7280),
            timestamp=announcement['created_at']
        )
        
        # Add type as a field
        type_emojis = {
            'event': '🎉',
            'update': '⚡',
            'maintenance': '🔧'
        }
        
        embed.add_field(
            name="Type",
            value=f"{type_emojis.get(announcement['type'], '📢')} {announcement['type'].title()}",
            inline=True
        )
        
        # Add priority if it's high
        if announcement.get('priority', 0) > 0:
            embed.add_field(
                name="Priority",
                value=f"⭐ {announcement['priority']}",
                inline=True
            )
        
        # Add author
        embed.set_footer(
            text=f"Posted by {announcement['created_by_name']}",
            icon_url=self.config['bot'].get('footer_icon_url', '') if self.config['bot'].get('footer_icon_url') else None
        )
        
        # Add thumbnail based on type or default
        thumbnails = self.config['bot'].get('thumbnails', {})
        thumbnail_url = thumbnails.get(announcement['type']) or thumbnails.get('default') or self.config['bot'].get('thumbnail_url', '')
        
        if thumbnail_url:
            embed.set_thumbnail(url=thumbnail_url)
        
        return embed
    
    @tasks.loop(seconds=30)  # Check every 30 seconds
    async def check_announcements(self):
        """Check for new announcements in the database"""
        try:
            connection = self.db_pool.get_connection()
            cursor = connection.cursor(dictionary=True)
            
            # Query for new announcements
            query = """
                SELECT 
                    a.id,
                    a.type,
                    a.title,
                    a.description,
                    a.created_at,
                    a.priority,
                    acc.name as created_by_name
                FROM announcements a
                JOIN accounts acc ON a.created_by = acc.id
                WHERE a.active = 1 AND a.id > %s
                ORDER BY a.id ASC
            """
            
            cursor.execute(query, (self.last_announcement_id,))
            new_announcements = cursor.fetchall()
            
            cursor.close()
            connection.close()
            
            # Process new announcements
            for announcement in new_announcements:
                await self.send_announcement(announcement)
                self.last_announcement_id = announcement['id']
                self.save_last_announcement_id(self.last_announcement_id)
                
                # Small delay between announcements to avoid rate limiting
                await asyncio.sleep(2)
                
        except Exception as e:
            logger.error(f"Error checking announcements: {e}")
    
    async def send_announcement(self, announcement: Dict):
        """Send an announcement to the configured Discord channel"""
        try:
            # Get the channel
            channel_id = self.config['discord']['announcement_channel_id']
            channel = self.bot.get_channel(channel_id)
            
            if not channel:
                logger.error(f"Channel with ID {channel_id} not found!")
                return
            
            # Check bot permissions in the channel
            permissions = channel.permissions_for(channel.guild.me)
            if not permissions.send_messages:
                logger.error(f"Bot doesn't have permission to send messages in channel: {channel.name} (ID: {channel_id})")
                return
            if not permissions.embed_links:
                logger.error(f"Bot doesn't have permission to embed links in channel: {channel.name} (ID: {channel_id})")
                return
            
            # Create and send embed
            embed = self.get_announcement_embed(announcement)
            
            # Send the announcement
            message = await channel.send(embed=embed)
            
            # Add reactions if configured
            if 'reactions' in self.config['bot'] and permissions.add_reactions:
                for reaction in self.config['bot']['reactions']:
                    await message.add_reaction(reaction)
            
            # Send ping if it's a high priority announcement
            if announcement.get('priority', 0) >= self.config['bot'].get('ping_priority_threshold', 5):
                role_id = self.config['discord'].get('ping_role_id')
                if role_id and permissions.mention_everyone:
                    await channel.send(f"<@&{role_id}> New high priority announcement!")
            
            logger.info(f"Sent announcement: {announcement['title']} to channel: {channel.name}")
            
        except discord.Forbidden as e:
            logger.error(f"Permission error in channel {channel_id}: {e}")
        except Exception as e:
            logger.error(f"Error sending announcement: {e}")
    
    def run(self):
        """Run the bot"""
        self.bot.run(self.config['discord']['bot_token'])

# Additional bot commands
def setup_commands(bot_instance: AnnouncementBot):
    """Set up additional bot commands"""
    bot = bot_instance.bot
    
    @bot.command(name='status')
    async def status(ctx):
        """Check bot status"""
        embed = discord.Embed(
            title="Bot Status",
            color=0x00ff00
        )
        embed.add_field(
            name="Last Announcement ID",
            value=bot_instance.last_announcement_id,
            inline=True
        )
        embed.add_field(
            name="Database Pool",
            value="Connected ✅",
            inline=True
        )
        embed.add_field(
            name="Uptime",
            value=f"{(datetime.now(timezone.utc) - bot.user.created_at).days} days",
            inline=True
        )
        await ctx.send(embed=embed)
    
    @bot.command(name='test')
    @commands.has_permissions(administrator=True)
    async def test_announcement(ctx):
        """Send a test announcement"""
        test_announcement = {
            'id': 0,
            'type': 'event',
            'title': 'Test Announcement',
            'description': 'This is a test announcement from the Discord bot!',
            'created_at': datetime.now(timezone.utc),
            'priority': 0,
            'created_by_name': 'Discord Bot'
        }
        
        embed = bot_instance.get_announcement_embed(test_announcement)
        await ctx.send(embed=embed)
        await ctx.send("✅ Test announcement sent!")
    
    @bot.command(name='reload')
    @commands.has_permissions(administrator=True)
    async def reload_config(ctx):
        """Reload bot configuration"""
        try:
            bot_instance.config = bot_instance.load_config('config.json')
            await ctx.send("✅ Configuration reloaded successfully!")
        except Exception as e:
            await ctx.send(f"❌ Error reloading configuration: {e}")

# Main execution
if __name__ == "__main__":
    # Create and run the bot
    bot = AnnouncementBot()
    setup_commands(bot)
    
    try:
        bot.run()
    except KeyboardInterrupt:
        logger.info("Bot stopped by user")
    except Exception as e:
        logger.error(f"Fatal error: {e}")