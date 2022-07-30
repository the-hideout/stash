import { ShardingManager } from 'discord.js';

const manager = new ShardingManager('./bot.mjs', { token: process.env.DISCORD_API_TOKEN });

manager.on('shardCreate', shard => console.log(`Launched shard ${shard.id}`));

manager.spawn();
