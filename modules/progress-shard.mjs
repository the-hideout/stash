import { v4 as uuidv4 } from "uuid";

import gameData from "./game-data.mjs";

let discordClient;

const getFleaFactors = prog => {
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

const calcFleaFee = async (progress, price, baseValue, args) => {
    const options = {
        count: 1,
        requireAll: false,
        ...args
    };
    if (typeof options.intel === 'undefined') {
        const prog = getFleaFactors(progress);
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

const optimalFleaPrice = async (progress, baseValue, lowerBound, upperBound) => {
    if (!lowerBound) lowerBound = baseValue*5;
    if (!upperBound) upperBound = baseValue*25;
    let step = Math.round((upperBound - lowerBound) / 50);
    if (step < 1) step = 1;
    let highPrice = 0;
    let highProfit = 0;
    let highFee = 0;
    const args = getFleaFactors(progress);
    for (let price = lowerBound; price <= upperBound; price += step) {
        const fee = await calcFleaFee(progress, price,baseValue, args);
        const profit = price - fee;
        if (profit >= highProfit) {
            highProfit = profit;
            highPrice = price;
            highFee = fee;
        } else if (profit < highProfit) {
            if (step != 1) return optimalFleaPrice(progress, baseValue, highPrice, price);
            break;
        }
    }
    return highPrice;
};

const getParentReply = async(message) => {
    message.uuid = uuidv4();
    message.type = 'getReply';
    return new Promise((resolve, reject) => {
        process.once(message.uuid, response => {
            if (response.error) return reject(response.error);
            resolve(response.data);
        });
        discordClient.shard.send(message);
    });
};

const getProgress = async (id) => {
    return getParentReply({data: 'userProgress', userId: id});
};

const getDefaultProgress = async () => {
    return getParentReply({data: 'defaultUserProgress'});
};

const getSafeProgress = async(id) => {
    return getParentReply({data: 'safeUserProgress', userId: id});
};

export default {
    async getUpdateTime(id) {
        return getParentReply({data: 'userTarkovTrackerUpdateTime', userId: id});
    },
    getProgress: getProgress,
    getDefaultProgress: getDefaultProgress,
    getSafeProgress: getSafeProgress,
    async setToken(id, token) {
        return getParentReply({data: 'setUserTarkovTrackerToken', userId: id, token: token});
    },
    async setLevel(id, level) {
        return getParentReply({data: 'setUserLevel', userId: id, level: level});
    },
    async setTrader(id, traderId, level) {
        return getParentReply({data: 'setUserTraderLevel', userId: id, traderId: traderId, level: level});
    },
    async setHideout(id, stationId, level) {
        return getParentReply({data: 'setUserHideoutLevel', userId: id, stationId: stationId, level: level});
    },
    async setSkill(id, skillId, level) {
        return getParentReply({data: 'setUserSkillLevel', userId: id, skillId: skillId, level: level});
    },
    async getFleaMarketFee(id, price, baseValue, args) {
        const progress = await getSafeProgress(id);
        return calcFleaFee(progress, price, baseValue, args);
    },
    async getOptimalFleaPrice(id, baseValue) {
        const progress = await getSafeProgress(id);
        return optimalFleaPrice(progress, baseValue);
    },
    async getRestockAlerts(id) {
        return getParentReply({data: 'userTraderRestockAlerts', userId: id});
    },
    async addRestockAlert(id, traders) {
        return getParentReply({data: 'addUserTraderRestockAlert', userId: id, traders: traders});
    },
    async removeRestockAlert(id, traders) {
        return getParentReply({data: 'removeUserTraderRestockAlert', userId: id, traders: traders});
    },
    async setRestockAlertChannel(guildId, channelId) {
        return getParentReply({data: 'guildTraderRestockAlertChannel', guildId: guildId, channelId: channelId});
    },
    init(client) {
        discordClient = client;
        gameData.load();
    }
}