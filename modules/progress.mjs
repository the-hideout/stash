import fs from 'fs';
import path from 'path';
import moment from 'moment';

import {getProgress} from "./tarkovtracker.js";
import gameData from "./game-data.mjs";
import { messageUser, messageChannel } from "./shard-messenger.mjs";
import { getFixedT } from './translations.mjs';
import cloudflare from './cloudflare.mjs';
import gameModes from './game-modes.mjs';

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

for (const gameMode of gameModes) {
    restockTimers[gameMode] = {};
}

const usersJsonPath = path.join('./cache', 'users.json');

const defaultProgress = {
    level: 15,
    hideout: {},
    traders: {},
    skills: {},
    gameMode: 'regular',
    locale: 'en-US',
};

const tarkovTrackerUpdateIntervalMinutes = 1;

const restockAlertMinutes = 2;

const getDefaultGameModeProgress = () => {
    const prog = {
        tarkovTracker: {
            lastUpdateStatus: 'n/a',
            lastUpdate: 0,
            token: false
        },
        level: defaultProgress.level,
        hideout: {},
        traders: {},
        skills: {},
    };
    for (const stationId in defaultProgress.hideout) {
        prog.hideout[stationId] = defaultProgress.hideout[stationId];
    }
    for (const traderId in defaultProgress.traders) {
        prog.traders[traderId] = defaultProgress.traders[traderId];
    }
    for (const skillId in defaultProgress.skills) {
        prog.skills[skillId] = defaultProgress.skills[skillId];
    }
    return prog;
};

const buildDefaultProgress = id => {
    const progress = {
        id,
        locale: defaultProgress.locale,
        gameMode: defaultProgress.gameMode,
        alerts: {
            restock: {},
        },
    };
    const gameModes = ['regular', 'pve'];
    for (const gameMode of gameModes) {
        progress[gameMode] = getDefaultGameModeProgress();
        progress.alerts[gameMode] = [];
    }
    return progress;
};

const mergeGameModeProgress = (fullProgress) => {
    const merged = {
        ...fullProgress,
        ...fullProgress[fullProgress.gameMode],
    };
    return merged;
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
        const gameMode = prog.gameMode ?? 'regular';
        if (!prog[gameMode]?.tarkovTracker) {
            return false;
        }
        if (prog[gameMode].tarkovTracker.token && !prog[gameMode].tarkovTracker.token.match(/^[a-zA-Z0-9]{22}$/)) {
            prog[gameMode].tarkovTracker.token = false;
            prog[gameMode].tarkovTracker.lastUpdateStatus = 'invalid';
        }
        return prog[gameMode].tarkovTracker.token !== false;
    }).sort((a, b) => {
        return a[a.gameMode ?? 'regular'].tarkovTracker.lastUpdate - b[b.gameMode ?? 'regular'].tarkovTracker.lastUpdate;
    });
};

const updateTarkovTracker = async () => {
    const users = getUsersForUpdate();
    const hideout = await gameData.hideout.getAll();
    for (let i = 0; i < 25 && i < users.length; i++) {
        const user = users[i];
        const gameMode = user.gameMode ?? 'regular';
        try {
            const ttprog = await getProgress(user[gameMode].tarkovTracker.token);
            //userProgress[user.id].level = ttprog.level;
            user[gameMode].hideout = {};
            for (const module of ttprog.hideoutModulesProgress) {
                if (!module.complete) continue;
                for (const station of hideout) {
                    for (const level of station.levels) {
                        if (level.id === module.id) {
                            user[gameMode].hideout[station.id] = level.level;
                        }
                    }
                }
            }
            user[gameMode].tarkovTracker.lastUpdate = Date.now();
            user[gameMode].tarkovTracker.lastUpdateStatus = 'ok';
        } catch (error) {
            if (error.message.includes('Unauthorized')) {
                user[gameMode].tarkovTracker.token = false;
                user[gameMode].tarkovTracker.lastUpdateStatus = 'invalid';
                console.log(`User ${user.id} had an invalid TarkovTracker token`);
            } else {
                user[gameMode].tarkovTracker.lastUpdateStatus = error.message;
                console.log(`Error updating TarkovTracker progress for user ${user.id} with token ${user[gameMode].tarkovTracker.token}`, error.message);
            }
        }
    }
    saveUserProgress();
    setTimeout(updateTarkovTracker, 1000 * 60 * tarkovTrackerUpdateIntervalMinutes).unref();
};

const saveUserProgress = () => {
    fs.writeFileSync(usersJsonPath, JSON.stringify(userProgress, null, 4));
};

const getUserProgress = async id => {
    if (!userProgress[id]) {
        userProgress[id] = buildDefaultProgress(id);
    }
    if (!userProgress[id].alerts) userProgress[id].alerts = {restock : {}};
    if (Array.isArray(userProgress[id].alerts.restock)) {
        userProgress[id].alerts.restock = {
            regular: userProgress[id].alerts.restock,
            pve: [],
        };
    }
    return userProgress[id];
};

const getFleaFactors = id => {
    let prog = userProgress[id];
    if (!prog) {
        prog = buildDefaultProgress();
    }
    const gameMode = prog.gameMode ?? 'regular';
    prog = prog[gameMode];
    return {
        intel: prog.hideout['5d484fdf654e7600691aadf8'],
        management: prog.skills['hideoutManagement']
    }
};

const calcFleaFee = async (id, price, baseValue, args) => {
    const options = {
        count: 1,
        requireAll: false,
        gameMode: 'regular',
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

const optimalFleaPrice = async (id, baseValue, gameMode = 'regular', lowerBound, upperBound) => {
    if (!lowerBound) lowerBound = baseValue*5;
    if (!upperBound) upperBound = baseValue*25;
    let step = Math.round((upperBound - lowerBound) / 50);
    if (step < 1) step = 1;
    let highPrice = 0;
    let highProfit = 0;
    let highFee = 0;
    const args = getFleaFactors(id);
    for (let price = lowerBound; price <= upperBound; price += step) {
        const fee = await calcFleaFee(id, price,baseValue, {...args, gameMode});
        const profit = price - fee;
        if (profit >= highProfit) {
            highProfit = profit;
            highPrice = price;
            highFee = fee;
        } else if (profit < highProfit) {
            if (step != 1) return optimalFleaPrice(id, baseValue, gameMode, highPrice, price);
            break;
        }
    }
    return highPrice;
};

const addRestockAlert = async (id, traders, locale) => {
    await loaded();
    if (typeof traders === 'string') traders = [traders];
    const prog = await getUserProgress(id);
    const gameMode = prog.gameMode ?? 'regular';
    if (locale) {
        prog.locale = locale;
    }
    if (!prog.alerts.restock[gameMode]) {
        prog.alerts.restock[gameMode] = [];
    }
    const restockAlerts = prog.alerts.restock[gameMode];
    for (const traderId of traders) {
        if (!restockAlerts.includes(traderId)) restockAlerts.push(traderId);
    }
    return prog.alerts.restock;
};

const removeRestockAlert = async (id, traders, locale) => {
    await loaded();
    if (typeof traders === 'string') traders = [traders];
    const prog = await getUserProgress(id);
    const gameMode = prog.gameMode ?? 'regular';
    if (locale) {
        prog.locale = locale;
    }
    prog.alerts.restock[gameMode] = prog.alerts.restock[gameMode].filter(traderId => !traders.includes(traderId));
    return prog.alerts.restock[gameMode];
};

const startRestockAlerts = async () => {
    const setRestockTimers = async () => {
        for (const gameMode of gameModes) {
            const traders = await gameData.traders.getAll({gameMode});
            // traders to skip restock timers for
            const skipTraders = ['fence', 'lightkeeper', 'btr-driver'];
            for (const trader of traders) {
                const currentTimer = restockTimers[gameMode][trader.id];
                if (currentTimer != trader.resetTime) {
                    //console.log(`Setting new restock timer for ${trader.name} at ${trader.resetTime}`);
                    restockTimers[gameMode][trader.id] = trader.resetTime;
                    const alertTime = new Date(trader.resetTime) - new Date() - 1000 * 60 * restockAlertMinutes;
                    if (alertTime < 0) continue;
                    if (skipTraders.includes(trader.normalizedName)) continue;
                    setTimeout(async () => {
                        const restockMessage = '🛒 {{traderName}} restock in {{numMinutes}} minutes 🛒 ({{gameMode}})';
                        const messageVars = {numMinutes: restockAlertMinutes};
                        for (const userId in userProgress) {
                            if (!userProgress[userId].alerts) continue;
                            if (Array.isArray(userProgress[userId].alerts.restock)) {
                                userProgress[userId].alerts.restock = {
                                    regular: userProgress[userId].alerts.restock,
                                    pve: [],
                                };
                            }
                            if (!userProgress[userId].alerts.restock[gameMode]) continue;
                            if (userProgress[userId].alerts.restock[gameMode].includes(trader.id)) {
                                const locale = userProgress[userId].locale || 'en';
                                const t = getFixedT(locale);
                                const commandT = getFixedT(locale, 'command');
                                messageVars.gameMode = commandT(`game_mode_${gameMode}`);
                                messageVars.traderName = (await gameData.traders.get(trader.id, {lang: locale})).name;
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
                                if (typeof guildSettings.restockAlertChannel !== 'object') {
                                    guildSettings.restockAlertChannel = {
                                        regular: guildSettings.restockAlertChannel,
                                        pve: false,
                                    };
                                }
                                if (!guildSettings.restockAlertChannel[gameMode]) {
                                    continue;
                                }
                                const locale = guildSettings.restockAlertLocale || 'en';
                                const t = getFixedT(locale);
                                const commandT = getFixedT(locale, 'command');
                                messageVars.gameMode = commandT(`game_mode_${gameMode}`);
                                messageVars.traderName = (await gameData.traders.get(trader.id, {lang: locale})).name;
                                messageChannel(guildId, guildSettings.restockAlertChannel[gameMode], t(restockMessage, messageVars)).catch(error => {
                                    // only rejects if all shards fail to send the message
                                    console.log(`Error sending ${trader.name} restock notification to channel ${guildId} ${guildSettings.restockAlertChannel}: ${error.message}`);
                                    userProgress.guilds[guildId].restockAlertChannel[gameMode] = false;
                                });
                            }
                        }
                    }, alertTime).unref();
                }
            }
        }
    };

    gameData.events.on('updatedTraders', setRestockTimers);
    setRestockTimers();
};

function setGuildTraderRestockAlertChannel(guildId, channelId, locale, gameMode = 'regular') {
    if (!userProgress.guilds) {
        userProgress.guilds = {};
    }
    if (!userProgress.guilds[guildId]) {
        userProgress.guilds[guildId] = {
            restockAlertChannel: {
                regular: [],
                pve: [],
            },
        };
    }
    if (typeof userProgress.guilds[guildId].restockAlertChannel !== 'object') {
        userProgress.guilds[guildId].restockAlertChannel = {
            regular: userProgress.guilds[guildId].restockAlertChannel,
            pve: [],
        };
    }
    userProgress.guilds[guildId].restockAlertChannel[gameMode] = channelId;
    userProgress.guilds[guildId].restockAlertLocale = locale;
    return userProgress.guilds[guildId];
}

function setGuildLanguage(guildId, locale) {
    if (!userProgress.guilds) {
        userProgress.guilds = {};
    }
    if (!userProgress.guilds[guildId]) {
        userProgress.guilds[guildId] = {
            restockAlertChannel: {
                regular: [],
                pve: [],
            },
            forceLanguage: false,
        };
    }
    userProgress.guilds[guildId].forceLanguage = locale;
    return userProgress.guilds[guildId];
}

function getGuildLanguage(guildId) {
    if (!userProgress.guilds) {
        userProgress.guilds = {};
    }
    if (!userProgress.guilds[guildId]) {
        userProgress.guilds[guildId] = {
            restockAlertChannel: {
                regular: [],
                pve: [],
            },
            forceLanguage: false,
        };
    }
    return userProgress.guilds[guildId].forceLanguage;
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

const settings = {
    async hasToken(id) {
        await loaded();
        if (!userProgress[id]) return false;
        const gameMode = userProgress[id].gameMode ?? 'regular';
        return !!userProgress[id][gameMode]?.tarkovTracker?.token;
    },
    async setToken(id, token) {
        await loaded();
        if (!userProgress[id]) {
            userProgress[id] = buildDefaultProgress(id);
        }
        const gameMode = userProgress[id].gameMode ?? 'regular';
        userProgress[id][gameMode].tarkovTracker.token = token;
        if (!token) userProgress[id][gameMode].tarkovTracker.lastUpdateStatus = 'n/a';
    },
    async getUpdateTime(id) {
        await loaded();
        const gameMode = userProgress[id]?.gameMode ?? 'regular';
        if (!userProgress[id] || !userProgress[id][gameMode]?.tarkovTracker?.token) {
            throw new Error('Your TarkovTracker account is not linked');
        }
        const users = getUsersForUpdate();
        for (let i = 0; i < users.length; i++) {
            let user = users[i];
            if (user.id !== id) continue;
            return moment(new Date()).add(Math.ceil((i+1) / 25), 'm').toDate();
        }
    },
    async getProgress(id) {
        await loaded();
        if (!userProgress[id]) {
            return false;
        }
        return mergeGameModeProgress(userProgress[id]);
    },
    async getDefaultProgress() {
        await loaded();
        return mergeGameModeProgress(buildDefaultProgress());
    },
    async getProgressOrDefault(id) {
        await loaded();
        return mergeGameModeProgress(userProgress[id] ?? settings.getDefaultProgress());
    },
    async setLevel(id, level) {
        await loaded();
        const prog = await getUserProgress(id);
        const gameMode = prog.gameMode ?? 'regular';
        prog[gameMode].level = level;
    },
    async setTrader(id, traderId, level) {
        await loaded();
        const prog = await getUserProgress(id);
        const gameMode = prog.gameMode ?? 'regular';
        prog[gameMode].traders[traderId] = level;
    },
    async setHideout(id, stationId, level) {
        await loaded();
        const prog = await getUserProgress(id);
        const gameMode = prog.gameMode ?? 'regular';
        prog[gameMode].hideout[stationId] = level;
    },
    async setSkill(id, skillId, level) {
        await loaded();
        const prog = await getUserProgress(id);
        const gameMode = prog.gameMode ?? 'regular';
        prog[gameMode].skills[skillId] = level;
    },
    async getFleaFeeFactors(id) {
        await loaded();
        return getFleaFactors(id);
    },
    async getFleaMarketFee(id, price, baseValue, args) {
        return calcFleaFee(id, price, baseValue, args);
    },
    getOptimalFleaPrice(id, baseValue, gameMode = 'regular') {
        return optimalFleaPrice(id, baseValue, gameMode);
    },
    async getRestockAlerts(id) {
        const prog = settings.getProgressOrDefault(id);
        const gameMode = prog.gameMode ?? 'regular';
        if (!prog.alerts) prog.alerts = {restock: {regular: [], pve: []}};
        return prog.alerts.restock[gameMode];
    },
    addRestockAlert: addRestockAlert,
    removeRestockAlert: removeRestockAlert,
    getGameMode: async (id) => {
        await loaded();
        const prog = await getUserProgress(id);
        return prog?.gameMode || 'regular';
    },
    setGameMode: async (id, gameMode) => {
        await loaded();
        const prog = await getUserProgress(id);
        return prog.gameMode = gameMode;
    },
    setGuildTraderRestockAlertChannel: setGuildTraderRestockAlertChannel,
    setGuildLanguage: setGuildLanguage,
    getGuildLanguage: getGuildLanguage,
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
        const [flea, traders, hideout] = await Promise.all([
            gameData.flea.get(),
            gameData.traders.getAll(),
            gameData.hideout.getAll(),
        ]);
        defaultProgress.level = flea.minPlayerLevel;
        for (const trader of traders) {
            const maxLevel = trader.levels[trader.levels.length-1].level;
            defaultProgress.traders[trader.id] = maxLevel;
        }
        const skills = gameData.skills.getAll();
        for (const skill of skills) {
            defaultProgress.skills[skill.id] = 0;
        }
        for (const station of hideout) {
            const maxLevel = station.levels[station.levels.length-1].level;
            defaultProgress.hideout[station.id] = maxLevel;
        }

        // upgrade progress to multiple game modes
        for (const id in userProgress) {
            if (id === 'guilds') continue;
            const prog = userProgress[id];
            if (!prog.regular) {
                prog.regular = {
                    tarkovTracker: prog.tarkovTracker,
                    level: prog.level,
                    hideout: prog.hideout,
                    traders: prog.traders,
                    skills: prog.skills,
                };
                delete prog.tarkovTracker;
                delete prog.level;
                delete prog.hideout;
                delete prog.traders;
                delete prog.skills;
                prog.alerts = {
                    restock: {
                        regular: prog.alerts?.restock || [],
                        pve: [],
                    },
                };
                prog.gameMode = 'regular';
            }
            for (const gameMode of gameModes) {
                if (!prog[gameMode]) {
                    prog[gameMode] = getDefaultGameModeProgress();
                    continue;
                }
                for (const trader of traders) {
                    if (!prog[gameMode].traders[trader.id]) prog[gameMode].traders[trader.id] = 1;
                }
                for (const skill of skills) {
                    if (!prog[gameMode].skills[skill.id]) prog[gameMode].skills[skill.id] = 0;
                }
                for (const station of hideout) {
                    if (!prog[gameMode].hideout[station.id]) prog[gameMode].hideout[station.id] = 0;
                }
            }
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

export default settings;
