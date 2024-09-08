import gameData from "./game-data.mjs";
import { getParentReply } from "./shard-messenger.mjs";

const getFleaFactors = async prog => {
    if (!prog) {
        prog = await getParentReply({data: 'defaultUserProgress'});
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
        gameMode: 'regular',
        ...args
    };
    if (typeof options.intel === 'undefined') {
        const prog = await getFleaFactors(progress);
        options.intel = prog.intel;
        options.management = prog.management;
    }
    const flea = await gameData.flea.get({gameMode: options.gameMode});
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

const optimalFleaPrice = async (progress, baseValue, gameMode = 'regular', lowerBound, upperBound) => {
    if (!lowerBound) lowerBound = baseValue*5;
    if (!upperBound) upperBound = baseValue*25;
    let step = Math.round((upperBound - lowerBound) / 50);
    if (step < 1) step = 1;
    let highPrice = 0;
    let highProfit = 0;
    let highFee = 0;
    const args = await getFleaFactors(progress);
    for (let price = lowerBound; price <= upperBound; price += step) {
        const fee = await calcFleaFee(progress, price,baseValue, {...args, gameMode});
        const profit = price - fee;
        if (profit >= highProfit) {
            highProfit = profit;
            highPrice = price;
            highFee = fee;
        } else if (profit < highProfit) {
            if (step != 1) return optimalFleaPrice(progress, baseValue, gameMode, highPrice, price);
            break;
        }
    }
    return highPrice;
};

const progressShard = {
    async getUpdateTime(id) {
        return getParentReply({data: 'userTarkovTrackerUpdateTime', userId: id});
    },
    async getProgress(id) {
        return getParentReply({data: 'userProgress', userId: id});
    },
    async getDefaultProgress() {
        return getParentReply({data: 'defaultUserProgress'});
    },
    async getProgressOrDefault (id) {
        return getParentReply({data: 'userProgressOrDefault', userId: id});
    },
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
        const progress = await progressShard.getProgressOrDefault(id);
        return calcFleaFee(progress, price, baseValue, args);
    },
    async getOptimalFleaPrice(id, baseValue, gameMode = 'regular') {
        const progress = await progressShard.getProgressOrDefault(id);
        return optimalFleaPrice(progress, baseValue, gameMode);
    },
    async getRestockAlerts(id, gameMode) {
        return getParentReply({data: 'userTraderRestockAlerts', userId: id});
    },
    async addRestockAlert(id, traders, locale, gameMode) {
        return getParentReply({data: 'addUserTraderRestockAlert', userId: id, traders, locale, gameMode});
    },
    async removeRestockAlert(id, traders, locale, gameMode) {
        return getParentReply({data: 'removeUserTraderRestockAlert', userId: id, traders, locale, gameMode});
    },
    async setRestockAlertChannel(guildId, channelId, locale, gameMode) {
        return getParentReply({data: 'guildTraderRestockAlertChannel', guildId, channelId, locale, gameMode});
    },
    async setServerLanguage(guildId, locale) {
        return getParentReply({data: 'setGuildLanguage', guildId: guildId, locale: locale});
    },
    async getServerLanguage(guildId) {
        return getParentReply({data: 'getGuildLanguage', guildId: guildId});
    },
    async getGameMode(id) {
        return getParentReply({data: 'userGameMode', userId: id});
    },
    async setGameMode(id, gameMode) {
        return getParentReply({data: 'setUserGameMode', userId: id, gameMode});
    },
    async getInteractionSettings(interaction) {
        const results = await Promise.all([
            progressShard.getServerLanguage(interaction.guildId).then(l => l || interaction.locale),
            progressShard.getGameMode(interaction.user.id).then(g => g || 'regular'),
        ]);
        return {
            lang: results[0],
            gameMode: results[1],
        };
    },
}

export default progressShard;
