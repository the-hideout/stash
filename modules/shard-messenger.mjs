import crypto from 'node:crypto';

import gameData from './game-data.mjs';
import progress from './progress.mjs';
import getPriceTier, {getTiers} from './loot-tier.mjs';

let shardingManager;
let discordClient;

export const getShardReply = async(shardId, message) => {
    if (process.env.IS_SHARD) {
        return Promise.reject(new Error('getShardReply can only be called by the parent process'));
    }
    message.uuid = crypto.randomUUID();
    message.type = 'getReply';
    return new Promise((resolve, reject) => {
        const responseFunction = (response) => {
            if (response.error) return reject(response.error);
            resolve(response.data);
        };
        shardingManager.shards.get(shardId).once(message.uuid, responseFunction);
        try {
            shardingManager.shards.get(shardId).send(message).catch((error) => {
                shardingManager.shards.get(shardId).off(message.uuid, responseFunction);
                console.log(`Error sending message to shard ${shardId}`, message, error);
                reject(error);
            });
        } catch (error) {
            shardingManager.shards.get(shardId).off(message.uuid, responseFunction);
            console.log(`Error sending message to shard ${shardId}`, message, error);
            reject(error);
        }
    });
};

export const messageUser = async (userId, message, messageValues, shardId = 0) => {
    if (process.env.IS_SHARD) {
        return Promise.reject(new Error('messageUser can only be called by the parent process'));
    }
    return getShardReply(shardId, {data: 'messageUser', userId: userId, message: message, messageValues: messageValues}).catch(error => {
        if (shardingManager.shards.has(shardId+1)) {
            return messageUser(userId, message, messageValues, shardId+1);
        }
        return Promise.reject(error);
    });
};

export const messageChannel = async (guildId, channelId, message, messageValues, shardId = 0) => {
    if (process.env.IS_SHARD) {
        return Promise.reject(new Error('messageChannel can only be called by the parent process'));
    }
    return getShardReply(shardId, {data: 'messageChannel', guildId, channelId, message, messageValues}).catch(error => {
        if (shardingManager.shards.has(shardId+1)) {
            return messageChannel(guildId, channelId, message, messageValues, shardId+1);
        }
        return Promise.reject(error);
    });
}

export const respondToShardMessage = async (message, shard) => {
    if (process.env.IS_SHARD) {
        return Promise.reject(new Error('respondToShardMessage can only be called by the parent process'));
    }
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
            if (message.data === 'userProgressOrDefault') {
                response.data = await progress.getProgressOrDefault(message.userId);
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
                response.data = await progress.getRestockAlerts(message.userId, message.gameMode);
            }
            if (message.data === 'addUserTraderRestockAlert') {
                response.data = await progress.addRestockAlert(message.userId, message.traders, message.locale, message.gameMode);
            }
            if (message.data === 'removeUserTraderRestockAlert') {
                response.data = await progress.removeRestockAlert(message.userId, message.traders, message.locale, message.gameMode);
            }
            if (message.data === 'setUserTarkovTrackerToken') {
                await progress.setToken(message.userId, message.token);
                response.data = message.token;
            }
            if (message.data === 'guildTraderRestockAlertChannel') {
                response.data = await progress.setGuildTraderRestockAlertChannel(message.guildId, message.channelId, message.locale, message.gameMode);
            }
            if (message.data === 'setGuildLanguage') {
                response.data = await progress.setGuildLanguage(message.guildId, message.locale);
            }
            if (message.data === 'getGuildLanguage') {
                response.data = await progress.getGuildLanguage(message.guildId);
            }
            if (message.data === 'gameData') {
                const functionPath = message.function.split('.');
                let gameDataFunction = gameData;
                for (const pathPart of functionPath) {
                    gameDataFunction = gameDataFunction[pathPart];
                }
                if (Array.isArray(message.args)) {
                    response.data = await gameDataFunction.apply(null, message.args);
                } else {
                    response.data = await gameDataFunction(message.args);
                }
            }
            if (message.data === 'getPriceTier') {
                response.data = await getPriceTier(message.price, message.noFlea, message.gameMode);
            }
            if (message.data === 'getTiers') {
                response.data = await getTiers(message.gameMode);
            }
            if (message.data === 'userGameMode') {
                response.data = await progress.getGameMode(message.userId);
            }
            if (message.data === 'setUserGameMode') {
                response.data = await progress.setGameMode(message.userId, message.gameMode);
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
};

export const respondToParentMessage = async (message) => {
    if (!message.uuid) return;
    if (message.type === 'getReply') {
        if (message.data === 'messageUser') {
            const response = {uuid: message.uuid, data: {shardId: discordClient.shard.ids[0], userId: message.userId, success: false}};
            try {
                const user = await discordClient.users.fetch(message.userId);
                if (!user) {
                    throw new Error('User not found');
                }
                await user.send(message.message);
                response.data.success = true;
            } catch (error) {
                response.error = {message: error.message, stack: error.stack};
            }
            discordClient.shard.send(response);
        }
        if (message.data === 'messageChannel') {
            const response = {uuid: message.uuid, data: {shardId: discordClient.shard.ids[0], guildId: message.guildId, channelId: message.channelId, success: false}};
            try {
                const channel = await discordClient.channels.fetch(message.channelId);
                if (!channel) {
                    throw new Error('Channel not found');
                }
                if (!channel.isTextBased()) {
                    throw new Error('Channel is not text-based');
                }
                await channel.send(message.message);
                response.data.success = true;
            } catch (error) {
                response.error = {message: error.message, stack: error.stack};
            }
            discordClient.shard.send(response);
        }
        return;
    }
    process.emit(message.uuid, message);
};

export const getParentReply = async (message) => {
    if (!process.env.IS_SHARD) {
        return Promise.reject(new Error('getParentReply can only be called by a shard'));
    }
    message.uuid = crypto.randomUUID();
    message.type = 'getReply';
    return new Promise((resolve, reject) => {
        const responseFunction = response => {
            if (response.error) return reject(response.error);
            resolve(response.data);
        };
        process.once(message.uuid, responseFunction);
        try {
            discordClient.shard.send(message).catch((error) => {
                process.off(message.uuid, responseFunction);
                console.log('Error sending message to shard mananger', message, error);
                reject(error);
            });
        } catch (error) {
            process.off(message.uuid, responseFunction);
            console.log('Error sending message to shard mananger', message, error);
            reject(error);
        }
    });
};

export function initShardMessenger(clientOrShardingManager) {
    if (process.env.IS_SHARD) {
        discordClient = clientOrShardingManager;
    } else {
        shardingManager = clientOrShardingManager;
    }
}
