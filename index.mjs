import got from 'got';
import cron from 'cron';
import { ShardingManager } from 'discord.js';

import progress from './modules/progress.mjs';

const manager = new ShardingManager('./bot.mjs', { token: process.env.DISCORD_API_TOKEN });
let healthcheckJob = false;
let shutdownSignalReceived = false;

manager.on('shardCreate', shard => {
    console.log(`Launched shard ${shard.id}`);
    shard.on('message', message => {
        //console.log(`ShardingManager received message from shard ${shard.id}`, message);
        if (message.type === 'getData') {
            const response = {uuid: message.uuid};
            if (message.data === 'userProgress') {
                response.data = progress.getProgress(message.userId);
            }
            if (message.data === 'defaultUserProgress') {
                response.data = progress.getDefaultProgress();
            }
            if (message.data === 'safeUserProgress') {
                response.data = progress.getSafeProgress(message.userId);
            }
            if (message.data === 'userTarkovTrackerUpdateTime') {
                try {
                    response.data = progress.getUpdateTime(message.userId);
                } catch (error) {
                    response.data = null;
                    response.error = error.message;
                }
            }
            return shard.send(response);
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
        if (message.type === 'setUserTarkovTrackerToken') {
            return progress.setToken(message.userId, message.token);
        }
    });
    shard.on('ready', () => {
        /*shard.eval(client => {
            client.users.fetch('144059683253125120', false).then(user => {
                if (!user) return;
                user.send(`🛒 Pappy restock in 1 minute 🛒`);
            });
            return true;
        });*/
    });
});

manager.spawn().then(shards => {
    console.log(`Spawned ${shards.size} shards`);
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
