import fs from 'fs';
import path from 'path';

import moment from 'moment';

import {getProgress} from "./tarkovtracker.js";
import gameData, { getFlea } from "./game-data.mjs";

let userProgress = {};

const usersJsonPath = path.join('./cache', 'users.json');

const defaultProgress = {
    level: 15,
    hideout: {},
    traders: {},
    skills: {}
};

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
        skills: {}
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

const getUsersForUpdate = () => {
    return Object.values(userProgress).filter(prog => {
        return prog.tarkovTracker.token !== false;
    }).sort((a, b) => {
        return a.tarkovTracker.lastUpdate - b.tarkovTracker.lastUpdate;
    });
};

let tarkovTrackerTimeout = false;

const updateTarkovTracker = async () => {
    const users = getUsersForUpdate();
    const hideout = await gameData.hideout.getAll();
    for (let i = 0; i < 25 && i < users.length; i++) {
        const user = users[i];
        try {
            const ttprog = await getProgress(user.tarkovTracker.token);
            userProgress[user.id].level = ttprog.level;
            userProgress[user.id].hideout = {};
            for (const moduleId in ttprog.hideout) {
                const module = ttprog.hideout[moduleId];
                if (!module.complete) continue;
                for (const station of hideout) {
                    for (const level of station.levels) {
                        if (level.tarkovDataId == moduleId) {
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
                console.log(`Error updating progress for user ${user.id}`, error);
            }
        }
    }
    saveUserProgress();
    tarkovTrackerTimeout = setTimeout(updateTarkovTracker, 1000 * 60);
    tarkovTrackerTimeout.unref();
};

const saveUserProgress = () => {
    fs.writeFileSync(usersJsonPath, JSON.stringify(userProgress, null, 4));
};

const getUserProgress = id => {
    if (!userProgress[id]) {
        userProgress[id] = buildDefaultProgress(id);
    }
    return userProgress[id];
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

if (process.env.NODE_ENV !== 'ci') {
    try {
        fs.mkdirSync('./cache');
    } catch (createError){
        if(createError.code !== 'EEXIST'){
            console.error(createError);
        }
    }
    try {
        const savedUsers = fs.readFileSync(usersJsonPath);
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
            const user = userProgress[id];
            if (!user.traders[trader.id]) user.traders[trader.id] = 1;
        }
    }
    const skills = gameData.skills.getAll();
    for (const skill of skills) {
        defaultProgress.skills[skill.id] = 0;
        for (const id in userProgress) {
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
    tarkovTrackerTimeout = setTimeout(updateTarkovTracker, 1000 * 60);
    tarkovTrackerTimeout.unref();
}

export default {
    hasToken: id => {
        if (!userProgress[id]) return false;
        return userProgress[id].tarkovTracker.token != false;
    },
    setToken: (id, token) => {
        if (!userProgress[id]) {
            userProgress[id] = buildDefaultProgress(id);
        }
        userProgress[id].tarkovTracker.token = token;
        if (!token) userProgress[id].tarkovTracker.lastUpdateStatus = 'n/a';
    },
    getUpdateTime(id) {
        if (!userProgress[id] || !userProgress[id].tarkovTracker.token) throw new Error('Your TarkovTracker account is not linked');
        const users = getUsersForUpdate();
        for (let i = 0; i < users.length; i++) {
            let user = users[i];
            if (user.id !== id) continue;
            return moment(new Date()).add(Math.ceil((i+1) / 25), 'm').toDate();
        }
    },
    getProgress(id) {
        return userProgress[id];
    },
    getDefaultProgress() {
        return defaultProgress;
    },
    getSafeProgress(id) {
        if (userProgress[id]) return userProgress[id];
        return defaultProgress;
    },
    setLevel(id, level) {
        const prog = getUserProgress(id);
        prog.level = level;
    },
    setTrader(id, traderId, level) {
        const prog = getUserProgress(id);
        prog.traders[traderId] = level;
    },
    setHideout(id, stationId, level) {
        const prog = getUserProgress(id);
        prog.hideout[stationId] = level;
    },
    setSkill(id, skillId, level) {
        const prog = getUserProgress(id);
        prog.skills[skillId] = level;
    },
    getFleaFeeFactors(id) {
        return getFleaFactors(id);
    },
    async getFleaMarketFee(id, price, baseValue, args) {
        return calcFleaFee(id, price, baseValue, args);
    },
    getOptimalFleaPrice(id, baseValue) {
        return optimalFleaPrice(id, baseValue);
    }
}