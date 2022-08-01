import cron from 'cron';
import { ShardingManager } from 'discord.js';

import progress from './modules/progress.mjs';

const manager = new ShardingManager('./bot.mjs', { token: process.env.DISCORD_API_TOKEN });
let healthcheckJob = false;
let shutdownSignalReceived = false;

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
    const shutdown = () => {
        if (shutdownSignalReceived) return;
        shutdownSignalReceived = true;
        console.log('Shutting down discord ShardManager');
        if (healthcheckJob) healthcheckJob.stop();
        for (const [index, shard] of manager.shards) {
            console.log(`Killing shard ${index}`);
            shard.kill();
        }
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    process.on('SIGBREAK', shutdown);
    process.on('SIGHUP', shutdown);

    process.on('message', message => {
        console.log('message received on shard', message);
        if (!message.type === 'traderRestock') return;
        discordClient.users.fetch(message.userId, false).then(user => {
            user.send(`🛒 ${message.trader} restock in 1 minute 🛒`);
        });
    });
}).catch(console.error);

if (process.env.NODE_ENV === 'production') {
    // A healthcheck cron to send a GET request to our status server
    // The cron schedule is expressed in seconds for the first value
    healthcheckJob = new cron.CronJob('*/45 * * * * *', () => {
        got(
            `https://status.tarkov.dev/api/push/${process.env.HEALTH_ENDPOINT}?msg=OK`,
            {
                headers: { "user-agent": "stash-tarkov-dev" },
                timeout: { request: 5000 }
            }).catch(error => {
                console.log('Healthcheck error:', error);
            });
    });
    healthcheckJob.start();

} else {
    console.log("Healthcheck disabled");
}
