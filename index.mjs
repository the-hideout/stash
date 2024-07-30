import { fork } from 'child_process';

import got from 'got';
import { CronJob } from 'cron';
import { ShardingManager } from 'discord.js';

import progress from './modules/progress.mjs';
import gameData from './modules/game-data.mjs';
import { initShardMessenger, respondToShardMessage } from './modules/shard-messenger.mjs';
import sendWebhook from './modules/webhook.mjs';

const manager = new ShardingManager('./bot.mjs', { token: process.env.DISCORD_API_TOKEN });
let healthcheckJob = false;
let shutdownSignalReceived = false;

const startingChoices = {};

manager.on('shardCreate', shard => {
    console.log(`Created shard ${shard.id}`);
    shard.on('message', async message => {
        return respondToShardMessage(message, shard);
    });
});

manager.spawn().then(shards => {
    console.log(`🟢 Systems now online with ${shards.size} shards`);
    initShardMessenger(manager);
    progress.init();
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
    healthcheckJob = new CronJob('*/45 * * * * *', () => {
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

console.time('Prefetch-game-data');
gameData.updateAll().then(() => {
    console.timeEnd('Prefetch-game-data');
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
gameData.updateProfileIndex();

process.on('uncaughtException', (error) => {
    try {
        sendWebhook({title: 'Uncaught exception in Stash Bot', message: error.stack});
    } catch (error) {
        console.log('Error sending uncaught exception webhook alert', error.stack);
    }
}); 
