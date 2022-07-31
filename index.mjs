import { ShardingManager } from 'discord.js';

import progress from './modules/progress.mjs';

const manager = new ShardingManager('./bot.mjs', { token: process.env.DISCORD_API_TOKEN });

manager.on('shardCreate', shard => {
    console.log(`Launched shard ${shard.id}`)
    shard.on('message', message => {
        //console.log(`Shard[${shard.id}] : ${message._eval} : ${message._result}`);
        console.log('message received on manager', message);
        if (message.type === 'getUserProgress') {
            return shard.send({type: 'userProgress', progress: progress.getProgress(message.userId)});
        }
        if (message.type === 'getDefaultUserProgress') {
            return shard.send({type: 'defaultUserProgress', progress: progress.getDefaultProgress()});
        }
        if (message.type === 'getSafeUserProgress') {
            return shard.send({type: 'userProgress', progress: progress.getSafeProgress(message.userId)});
        }
        if (message.type === 'getUserTarkovTrackerUpdateTime') {
            try {
                return shard.send({type: 'userTarkovTrackerUpdateTime', userId: message.userId, date: progress.getUpdateTime(message.userId)});
            } catch (error) {
                return shard.send({type: 'userTarkovTrackerUpdateTime', userId: message.userId, date: null, error: error});
            }
        }
        if (message.type === 'setUserLevel') {
            return progress.setLevel(message.userId, message.level);
        }
        if (message.type === 'setUserTraderLevel') {
            return progress.setTrader(message.userId, message.traderId, message.level);
        }
        if (message.type === 'setUserHideoutLevel') {
            return progress.setHideout(message.userId, message.stationId, message.level);
        }
        if (message.type === 'setUserSkillLevel') {
            return progress.setHideout(message.userId, message.skillId, message.level);
        }
        if (message.type === 'addUserTraderRestockAlert') {
            return progress.addRestockAlert(message.userId, message.traders);
        }
        
        if (message.type === 'removeUserTraderRestockAlert') {
            return progress.removeRestockAlert(message.userId, message.traders);
        }
    });
});

process.on('message', message => {
    console.log('received message', message);
});

manager.spawn().then(shards => {
    progress.startRestockAlerts(manager);
}).catch(console.error);
