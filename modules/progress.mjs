import fs from 'fs';
import path from 'path';
import moment from 'moment';

import {getProgress} from "./tarkovtracker.js";
import gameData from "./game-data.mjs";
import { messageUser, messageChannel } from "./shard-messenger.mjs";
import { getFixedT } from './translations.mjs';
import cloudflare from './cloudflare.mjs';

const saveToCloudflareIntervalMinutes = 60;
let cf = false;
if (process.env.CLOUDFLARE_TOKEN && process.env.CLOUDFLARE_ACCOUNT && process.env.CLOUDFLARE_NAMESPACE) {
    cf = true;
} else {
    console.log('Missing env var(s) for cloudflare KV; using local storage.');
}
const restockTimers = {};
let shutdown = false;
let progressLoaded = false;

let userProgress = {};

const usersJsonPath = path.join('./cache', 'users.json');

const defaultProgress = {
    level: 15,
    hideout: {},
    traders: {},
    skills: {},
    locale: 'en-US',
};

const tarkovTrackerUpdateIntervalMinutes = 1;

const restockAlertMinutes = 2;

const buildDefaultProgress = id => {
    const progress = {
        id: id,
        tarkovTracker: {
            lastUpdateStatus: 'n/a',
            lastUpdate: 0,
            token: false
        },
        level: defaultProgress.level,
        hideout: {},
        traders: {},
        skills: {},
        alerts: {
            restock: []
        },
        locale: 'en-US',
    };
    for (const stationId in defaultProgress.hideout) {
        progress.hideout[stationId] = defaultProgress.hideout[stationId];
    }
    for (const traderId in defaultProgress.traders) {
        progress.traders[traderId] = defaultProgress.traders[traderId];
    }
    for (const skillId in defaultProgress.skills) {
        progress.skills[skillId] = defaultProgress.skills[skillId];
    }
    return progress;
};

const loaded = async () => {
    if (progressLoaded) return Promise.resolve(true);
    return new Promise(resolve => {
        const loadedInterval = setInterval(() => {
            if (progressLoaded) {
                resolve(true);
                clearInterval(loadedInterval);
            }
        }, 1000);
    });
};

const getUsersForUpdate = () => {
    return Object.values(userProgress).filter(prog => {
        if (!prog.tarkovTracker) {
            return false;
        }
        if (prog.tarkovTracker.token && !prog.tarkovTracker.token.match(/^[a-zA-Z0-9]{22}$/)) {
            prog.tarkovTracker.token = false;
            prog.tarkovTracker.lastUpdateStatus = 'invalid';
        }
        return prog.tarkovTracker.token !== false;
    }).sort((a, b) => {
        return a.tarkovTracker.lastUpdate - b.tarkovTracker.lastUpdate;
    });
};

const updateTarkovTracker = async () => {
    const users = getUsersForUpdate();
    const hideout = await gameData.hideout.getAll();
    for (let i = 0; i < 25 && i < users.length; i++) {
        const user = users[i];
        try {
            const ttprog = await getProgress(user.tarkovTracker.token);
            //userProgress[user.id].level = ttprog.level;
            userProgress[user.id].hideout = {};
            for (const module of ttprog.hideoutModulesProgress) {
                if (!module.complete) continue;
                for (const station of hideout) {
                    for (const level of station.levels) {
                        if (level.id == module.id) {
                            if (!userProgress[user.id].hideout[station.id] || userProgress[user.id].hideout[station.id] < level.level) {
                                userProgress[user.id].hideout[station.id] = level.level;
                            }
                        }
                    }
                }
            }
            user.tarkovTracker.lastUpdate = Date.now();
            user.tarkovTracker.lastUpdateStatus = 'ok';
        } catch (error) {
            if (error.message.includes('Unauthorized')) {
                user.tarkovTracker.token = false;
                user.tarkovTracker.lastUpdateStatus = 'invalid';
                console.log(`User ${user.id} had an invalid TarkovTracker token`);
            } else {
                user.tarkovTracker.lastUpdateStatus = error.message;
                console.log(`Error updating TarkovTracker progress for user ${user.id} with token ${user.tarkovTracker.token}`, error.message);
            }
        }
    }
    saveUserProgress();
    setTimeout(updateTarkovTracker, 1000 * 60 * tarkovTrackerUpdateIntervalMinutes).unref();
};

const saveUserProgress = () => {
    fs.writeFileSync(usersJsonPath, JSON.stringify(userProgress, null, 4));
};

const getUserProgress = id => {
    if (!userProgress[id]) {
        userProgress[id] = buildDefaultProgress(id);
    }
    if (!userProgress[id].alerts) userProgress[id].alerts = {restock : []};
    return userProgress[id];
};

const getSafeProgress = async id => {
    await loaded();
    if (userProgress[id]) return userProgress[id];
    return defaultProgress;
};

const getFleaFactors = id => {
    let prog = userProgress[id];
    if (!prog) {
        prog = defaultProgress;
    } else {
        if (!prog.hideout['5d484fdf654e7600691aadf8']) prog.hideout['5d484fdf654e7600691aadf8'] = 0;
        if (!prog.skills['hideoutManagement']) prog.skills['hideoutManagement'] = 0;
    }
    return {
        intel: prog.hideout['5d484fdf654e7600691aadf8'],
        management: prog.skills['hideoutManagement']
    }
};

const calcFleaFee = async (id, price, baseValue, args) => {
    const options = {
        count: 1,
        requireAll: false,
        ...args
    };
    if (typeof options.intel === 'undefined') {
        const prog = getFleaFactors(id);
        options.intel = prog.intel;
        options.management = prog.management;
    }
    const flea = await gameData.flea.get();
    const q = options.requireAll ? 1 : options.count;
    const vo = baseValue*(options.count/q);
    const vr = price;
    let po = Math.log10(vo / vr);
    if (vr < vo) po = Math.pow(po, 1.08);
    let pr = Math.log10(vr / vo);
    if (vr >= vo) pr = Math.pow(pr, 1.08);
    const ti = flea.sellOfferFeeRate;
    const tr = flea.sellRequirementFeeRate;
    let fee = (vo*ti*Math.pow(4.0,po)*q)+(vr*tr*Math.pow(4.0,pr)*q);
    if (options.intel >= 3) {
        let discount = 0.3;
        discount = discount+(discount*options.management*0.01);
        fee = fee-(fee*discount);
    }
    return Math.round(fee);
};

const optimalFleaPrice = async (id, baseValue, lowerBound, upperBound) => {
    if (!lowerBound) lowerBound = baseValue*5;
    if (!upperBound) upperBound = baseValue*25;
    let step = Math.round((upperBound - lowerBound) / 50);
    if (step < 1) step = 1;
    let highPrice = 0;
    let highProfit = 0;
    let highFee = 0;
    const args = getFleaFactors(id);
    for (let price = lowerBound; price <= upperBound; price += step) {
        const fee = await calcFleaFee(id, price,baseValue, args);
        const profit = price - fee;
        if (profit >= highProfit) {
            highProfit = profit;
            highPrice = price;
            highFee = fee;
        } else if (profit < highProfit) {
            if (step != 1) return optimalFleaPrice(id, baseValue, highPrice, price);
            break;
        }
    }
    return highPrice;
};

const addRestockAlert = async (id, traders, locale) => {
    await loaded();
    if (typeof traders === 'string') traders = [traders];
    const prog = await getUserProgress(id);
    if (locale) {
        prog.locale = locale;
    }
    const restockAlerts = prog.alerts.restock;
    for (const traderId of traders) {
        if (!restockAlerts.includes(traderId)) restockAlerts.push(traderId);
    }
    return prog.alerts.restock;
};

const removeRestockAlert = async (id, traders, locale) => {
    await loaded();
    if (typeof traders === 'string') traders = [traders];
    const prog = await getUserProgress(id);
    if (locale) {
        prog.locale = locale;
    }
    prog.alerts.restock = prog.alerts.restock.filter(traderId => !traders.includes(traderId));
    return prog.alerts.restock;
};

const startRestockAlerts = async () => {
    const setRestockTimers = async () => {
        const traders = await gameData.traders.getAll();
        // traders to skip restock timers for
        const skipTraders = ['fence', 'lightkeeper'];
        for (const trader of traders) {
            const currentTimer = restockTimers[trader.id];
            if (currentTimer != trader.resetTime) {
                //console.log(`Setting new restock timer for ${trader.name} at ${trader.resetTime}`);
                restockTimers[trader.id] = trader.resetTime;
                const alertTime = new Date(trader.resetTime) - new Date() - 1000 * 60 * restockAlertMinutes;
                if (alertTime < 0) continue;
                if (skipTraders.includes(trader.normalizedName)) continue;
                setTimeout(async () => {
                    const restockMessage = '🛒 {{traderName}} restock in {{numMinutes}} minutes 🛒';
                    const messageVars = {numMinutes: restockAlertMinutes};
                    for (const userId in userProgress) {
                        if (!userProgress[userId].alerts) continue;
                        if (userProgress[userId].alerts.restock.includes(trader.id)) {
                            const locale = userProgress[userId].locale || 'en';
                            const t = getFixedT(locale);
                            messageVars.traderName = (await gameData.traders.get(trader.id, locale)).name;
                            messageUser(userId, t(restockMessage, messageVars)).catch(error => {
                                console.log(`Error sending ${trader.name} restock notification to user ${userId}: ${error.message}`);
                                if (error.message === 'Cannot send messages to this user') {
                                    console.log(`Disabling restock alerts for user ${userId}`);
                                    userProgress[userId].alerts.restock = [];
                                }
                            });
                        }
                    }
                    if (userProgress.guilds) {
                        for (const guildId in userProgress.guilds) {
                            const guildSettings = userProgress.guilds[guildId];
                            if (!guildSettings.restockAlertChannel) {
                                continue;
                            }
                            const locale = guildSettings.restockAlertLocale || 'en';
                            const t = getFixedT(locale);
                            messageVars.traderName = (await gameData.traders.get(trader.id, locale)).name;
                            messageChannel(guildId, guildSettings.restockAlertChannel, t(restockMessage, messageVars)).catch(error => {
                                // only rejects if all shards fail to send the message
                                console.log(`Error sending ${trader.name} restock notification to channel ${guildId} ${guildSettings.restockAlertChannel}: ${error.message}`);
                                userProgress.guilds[guildId].restockAlertChannel = false;
                            });
                        }
                    }
                }, alertTime).unref();
            }
        }
    };

    gameData.events.on('updatedTraders', setRestockTimers);
    setRestockTimers();
};

function setGuildTraderRestockAlertChannel(guildId, channelId, locale) {
    if (!userProgress.guilds) {
        userProgress.guilds = {};
    }
    if (!userProgress.guilds[guildId]) {
        userProgress.guilds[guildId] = {
            restockAlertChannel: false,
        };
    }
    userProgress.guilds[guildId].restockAlertChannel = channelId;
    userProgress.guilds[guildId].restockAlertLocale = locale;
    return userProgress.guilds[guildId];
}

const saveToCloudflare = () => {
    if (!cf) return;
    if (process.env.NODE_ENV !== 'production') {
        console.log(`Skipping Cloudflare save of progress in ${process.env.NODE_ENV} environment`);
        return;
    }
    return cloudflare.putValue('progress', userProgress).then(response => {
        if (shutdown) {
            console.log('Saved user progress to Cloudflare');
        }
        return response;
    }).catch(error => {
        console.log('Error saving user progress to Cloudflare KV', error);
    });
};

export default {
    async hasToken(id) {
        await loaded();
        if (!userProgress[id]) return false;
        return userProgress[id].tarkovTracker.token != false;
    },
    async setToken(id, token) {
        await loaded();
        if (!userProgress[id]) {
            userProgress[id] = buildDefaultProgress(id);
        }
        userProgress[id].tarkovTracker.token = token;
        if (!token) userProgress[id].tarkovTracker.lastUpdateStatus = 'n/a';
    },
    async getUpdateTime(id) {
        await loaded();
        if (!userProgress[id] || !userProgress[id].tarkovTracker.token) throw new Error('Your TarkovTracker account is not linked');
        const users = getUsersForUpdate();
        for (let i = 0; i < users.length; i++) {
            let user = users[i];
            if (user.id !== id) continue;
            return moment(new Date()).add(Math.ceil((i+1) / 25), 'm').toDate();
        }
    },
    async getProgress(id) {
        await loaded();
        return userProgress[id];
    },
    async getDefaultProgress() {
        await loaded();
        return defaultProgress;
    },
    getSafeProgress: getSafeProgress,
    async setLevel(id, level) {
        await loaded();
        const prog = getUserProgress(id);
        prog.level = level;
    },
    async setTrader(id, traderId, level) {
        await loaded();
        const prog = getUserProgress(id);
        prog.traders[traderId] = level;
    },
    async setHideout(id, stationId, level) {
        await loaded();
        const prog = getUserProgress(id);
        prog.hideout[stationId] = level;
    },
    async setSkill(id, skillId, level) {
        await loaded();
        const prog = getUserProgress(id);
        prog.skills[skillId] = level;
    },
    async getFleaFeeFactors(id) {
        await loaded();
        return getFleaFactors(id);
    },
    async getFleaMarketFee(id, price, baseValue, args) {
        return calcFleaFee(id, price, baseValue, args);
    },
    getOptimalFleaPrice(id, baseValue) {
        return optimalFleaPrice(id, baseValue);
    },
    async getRestockAlerts(id) {
        const prog = getSafeProgress(id);
        if (!prog.alerts) prog.alerts = {restock: []};
        return prog.alerts.restock;
    },
    addRestockAlert: addRestockAlert,
    removeRestockAlert: removeRestockAlert,
    setGuildTraderRestockAlertChannel: setGuildTraderRestockAlertChannel,
    async init() {
        if (process.env.NODE_ENV === 'ci') return;
        startRestockAlerts();
        try {
            fs.mkdirSync('./cache');
        } catch (createError){
            if(createError.code !== 'EEXIST'){
                console.error(createError);
            }
        }
        try {
            let savedUsers = {};
            if (cf) {
                savedUsers = await cloudflare.getValue('progress').catch(error => {
                    console.log('Error reading user progress from CloudflareKV', error);
                    console.log('Reading progress from local storage');
                    return fs.readFileSync(usersJsonPath);
                });
            } else {
                savedUsers = fs.readFileSync(usersJsonPath);
            }
            userProgress = JSON.parse(savedUsers);
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('No saved user progress found.');
            } else {
                console.log(`Error reading ${usersJsonPath}`, error);
            }
        }
        const flea = await gameData.flea.get();
        defaultProgress.level = flea.minPlayerLevel;
        const traders = await gameData.traders.getAll();
        for (const trader of traders) {
            const maxLevel = trader.levels[trader.levels.length-1].level;
            defaultProgress.traders[trader.id] = maxLevel;
            for (const id in userProgress) {
                if (id === 'guilds') continue;
                const user = userProgress[id];
                if (!user.traders) continue;
                if (!user.traders[trader.id]) user.traders[trader.id] = 1;
            }
        }
        const skills = gameData.skills.getAll();
        for (const skill of skills) {
            defaultProgress.skills[skill.id] = 0;
            for (const id in userProgress) {
                if (id === 'guilds') continue;
                const user = userProgress[id];
                if (!user.skills[skill.id]) user.skills[skill.id] = 0;
            }
        }
        const hideout = await gameData.hideout.getAll();
        for (const station of hideout) {
            const maxLevel = station.levels[station.levels.length-1].level;
            defaultProgress.hideout[station.id] = maxLevel;
            /*for (const id in userProgress) {
                const user = userProgress[id];
                if (typeof user.hideout[station.id] === 'undefined') {
                    user.hideout[station.id] = 0;
                }
            }*/
        }
        setTimeout(updateTarkovTracker, 1000 * 60 * tarkovTrackerUpdateIntervalMinutes).unref();
        if (cf) {
            setInterval(saveToCloudflare, 1000 * 60 * saveToCloudflareIntervalMinutes).unref();
        }
        //save user progress on shutdown
        const saveOnExit = () => {
            if (shutdown) return;
            shutdown = true;
            console.log('Saving user progress before exit');
            const promises = [];
            promises.push(new Promise(resolve => {
                saveUserProgress();
                resolve();
            }));
            if (cf) {
                promises.push(saveToCloudflare());
            }
            return Promise.all(promises);
        };
        process.on( 'SIGINT', saveOnExit);
        process.on( 'SIGTERM', saveOnExit);
        process.on( 'SIGBREAK', saveOnExit);
        process.on( 'SIGHUP', saveOnExit);
        progressLoaded = true;
    },
}
