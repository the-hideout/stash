import { fork } from 'child_process';

import got from 'got';
import cron from 'cron';
import { ShardingManager } from 'discord.js';

import progress from './modules/progress.mjs';
import gameData from './modules/game-data.mjs';

const manager = new ShardingManager('./bot.mjs', { token: process.env.DISCORD_API_TOKEN });
let healthcheckJob = false;
let shutdownSignalReceived = false;

const startingChoices = {};

manager.on('shardCreate', shard => {
    console.log(`Created shard ${shard.id}`);
    shard.on('message', async message => {
        //console.log(`ShardingManager received message from shard ${shard.id}`, message);
        if (message.type === 'getReply') {
            const response = {uuid: message.uuid};
            try {
                if (message.data === 'userProgress') {
                    response.data = await progress.getProgress(message.userId);
                }
                if (message.data === 'defaultUserProgress') {
                    response.data = await progress.getDefaultProgress();
                }
                if (message.data === 'safeUserProgress') {
                    response.data = await progress.getSafeProgress(message.userId);
                }
                if (message.data === 'userTarkovTrackerUpdateTime') {
                    response.data = await progress.getUpdateTime(message.userId);
                }
                if (message.data === 'setUserLevel') {
                    await progress.setLevel(message.userId, message.level);
                    response.data = message.level;
                }
                if (message.data === 'setUserTraderLevel') {
                    await progress.setTrader(message.userId, message.traderId, message.level);
                    response.data = message.level;
                }
                if (message.data === 'setUserHideoutLevel') {
                    await progress.setHideout(message.userId, message.stationId, message.level);
                    response.data = message.level;
                }
                if (message.data === 'setUserSkillLevel') {
                    await progress.setSkill(message.userId, message.skillId, message.level);
                    response.data = message.level;
                }
                if (message.data === 'userTraderRestockAlerts') {
                    response.data = await progress.getRestockAlerts(message.userId);
                }
                if (message.data === 'addUserTraderRestockAlert') {
                    response.data = await progress.addRestockAlert(message.userId, message.traders, message.locale);
                }
                if (message.data === 'removeUserTraderRestockAlert') {
                    response.data = await progress.removeRestockAlert(message.userId, message.traders, message.locale);
                }
                if (message.data === 'setUserTarkovTrackerToken') {
                    await progress.setToken(message.userId, message.token);
                    response.data = message.token;
                }
                if (message.data === 'guildTraderRestockAlertChannel') {
                    response.data = await progress.setGuildTraderRestockAlertChannel(message.guildId, message.channelId);
                }
            } catch (error) {
                response.data = null;
                response.error = {message: error.message, stack: error.stack};
            }
            return shard.send(response);
        }
        if (message.uuid) {
            shard.emit(message.uuid, message);
        }
    });
});

manager.spawn().then(shards => {
    console.log(`🟢 Systems now online with ${shards.size} shards`);
    progress.init(manager);
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
            }
        ).catch(error => {
            console.error(`Healthcheck error: ${error}`);
        });
    });
    healthcheckJob.start();

} else {
    console.log("Healthcheck disabled");
}

gameData.updateAll().then(() => {
    const choiceTypes = [
        'traders',
        'maps',
        'bosses'
    ];
    for (const choiceType of choiceTypes) {
        startingChoices[choiceType] = gameData[choiceType].choices();
    }
    gameData.events.on('updated', () => {
        let registerCommands = false;
        for (const choiceType of choiceTypes) {
            startingChoices[choiceType].forEach(startChoice => {
                if (!gameData[choiceType].choices().some(currChoice => currChoice.value === startChoice.value && currChoice.name === startChoice.name)) {
                    // startChoice has been removed
                    console.warn(`${choiceType} choice ${startChoice.name} (${startChoice.value}) is no longer available via the API.`);
                    registerCommands = true;
                }
            });
            gameData[choiceType].choices().forEach(currChoice => {
                if (!startingChoices[choiceType].some(startChoice => currChoice.value === startChoice.value && currChoice.name === startChoice.name)) {
                    // currChoice is missing from choices
                    console.warn(`${choiceType} choice ${currChoice.name} (${currChoice.value}) is new but not registered as a choice.`);
                    registerCommands = true;
                }
            });
        }
        if (registerCommands) {
            const args = { env: { NODE_ENV: 'ci' } };
            let dev = '';
            if (process.env.NODE_ENV === 'development') {
                dev = '-dev';
            } else {
                args.env.DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
                args.env.DISCORD_TOKEN = process.env.DISCORD_API_TOKEN;
            }

            fork(`./deploy-commands${dev}.mjs`, args);
        }
    });
});

