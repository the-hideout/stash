import EventEmitter from 'events';
import got from 'got';
import graphqlRequest from "./graphql-request.mjs";
import { updateTiers } from './loot-tier.mjs';
import { getDiscordLocale, getCommandLocalizations } from "./translations.mjs";
import { getParentReply } from './shard-messenger.mjs';

const gameData = {
    maps: {},
    bosses: false,
    bossNames: {},
    traders: {},
    hideout: {},
    barters: false,
    crafts: false,
    items: false,
    itemNames: {},
    tasks: {},
    flea: false,
    skills: [
        {
            id: 'hideoutManagement',
            name: 'Hideout Management',
            command_translation_key: 'hideout_management_skill_desc'
        },
        {
            id: 'crafting',
            name: 'Crafting',
            command_translation_key: 'crafting_skill_desc',
        }
    ],
    languages: [
        'cs',
        'de',
        'en',
        'es',
        'fr',
        'hu',
        'it',
        'ja',
        'pl',
        'pt',
        'ru',
        'sk',
        'tr',
        'zh',
    ],
};

const mapKeys = {
    '5b0fc42d86f7744a585f9105': 'labs',
    '59fc81d786f774390775787e': 'factory'
};

const choices = {
    boss: [],
    hideout: [],
    map: [],
    skill: gameData.skills.map(skill => {
        return {name: skill.name, value: skill.id, name_localizations: getCommandLocalizations(skill.command_translation_key)};
    }),
    trader: [],
};

const updateIntervalMinutes = 5;

const eventEmitter = new EventEmitter();

function validateLanguage(langCode) {
    if (process.env.IS_SHARD) {
        return getParentReply({data: 'gameData', function: 'validateLanguage', args: langCode});
    }
    if (!langCode || typeof langCode !== 'string') {
        return 'en';
    }
    langCode = langCode.split('-')[0];
    if (!gameData.languages.includes(langCode)) {
        return 'en';
    }
    return langCode;
}

export async function updateLanguages() {
    const query = `query StashLanguages {
        __type(name: "LanguageCode") {
            enumValues {
                name
            }
        }
    }`;
    const response = await graphqlRequest({ graphql: query });
    gameData.languages = response.data.__type.enumValues.map(e => e.name);
    return gameData.languages;
}

export async function updateMaps() {
    let mapQueries = [];
    for (const langCode of gameData.languages) {
        mapQueries.push(`${langCode}: maps(lang: ${langCode}) {
            ...MapFields
        }`);
    }
    const query = `query StashMaps {
        ${mapQueries.join('\n')}
    }
    fragment MapFields on Map {
        id
        tarkovDataId
        name
        normalizedName
        wiki
        description
        enemies
        raidDuration
        players
        bosses {
            name
            normalizedName
            spawnChance
            spawnLocations {
                name
                chance
            }
            escorts {
                name
                normalizedName
                amount {
                    count
                    chance
                }
            }
            spawnTime
            spawnTimeRandom
            spawnTrigger
        }
        accessKeys {
            id
        }
        accessKeysMinPlayerLevel
    }`;
    const [response, mapImages] = await Promise.all([
        graphqlRequest({ graphql: query }).then(response => response.data),
        got('https://raw.githubusercontent.com/the-hideout/tarkov-dev/master/src/data/maps.json', {
            responseType: 'json',
            headers: { "user-agent": "stash-tarkov-dev" }
        }).then(response => response.body)
    ]);

    for (const lang in response) {
        gameData.maps[lang] = response[lang];
        
        for (const mapData of gameData.maps[lang]) {
            let testKey = mapData.normalizedName;

            if (mapKeys[mapData.id]) 
                testKey = mapKeys[mapData.id];      // remap night-factory=>facory and the-lab=>labs map keys 
            
            for (const mapImage of mapImages) {
                if (mapImage.normalizedName !== testKey) 
                    continue;
                
                const map = mapImage.maps.find(m => m.projection === '2D');

                if (!map) {
                    continue;
                }

                mapData.key = map.key;
                mapData.source = map.source;
                mapData.sourceLink = map.sourceLink;

                break;
            }
        }
    }

    const newMapChoices = [];
    const bosses = [];
    // Loop through each map and collect names and bosses
    for (const mapData of gameData.maps.en) {
        newMapChoices.push({
            name: mapData.name, 
            value: mapData.id, 
            name_localizations: gameData.languages.reduce((loc, langCode) => {
                const dLocale = getDiscordLocale(langCode);
                if (dLocale) {
                    loc[dLocale] = gameData.maps[langCode].find(m => m.id === mapData.id).name;
                }
                return loc;
            }, {}),
        });

        // Loop through each boss and push the boss name to the bossChoices array
        for (const boss of mapData.bosses) {
            const boss_loc = {};
            // Don't add Rogues and Raiders
            if (boss.normalizedName === 'rogue' || boss.normalizedName === 'raider') {
                continue;
            }
            // Don't add duplicates
            if (bosses.some(bossChoice => bossChoice.value === boss.normalizedName)) {
                continue;
            }

            for (const langCode of gameData.languages) {
                const locMap = gameData.maps[langCode].find(m => m.id === mapData.id);
                if (!locMap) {
                    continue;
                }
                for (const locBoss of locMap.bosses) {
                    const dLocale = getDiscordLocale(langCode);
                    if (!dLocale) {
                        continue;
                    }
                    if (boss.normalizedName !== locBoss.normalizedName) {
                        continue;
                    }
                    boss_loc[dLocale] = locBoss.name;
                }
            }

            bosses.push({
                name: boss.name,
                value: boss.normalizedName,
                name_localizations: boss_loc,
            });
        }
    }
    choices.map = newMapChoices.sort((a, b) => {
        return a.name.localeCompare(b.name);
    });
    choices.boss = bosses.sort((a, b) => {
        return a.name.localeCompare(b.name);
    });

    return gameData.maps;
};

export async function getMaps(lang = 'en') {
    if (process.env.IS_SHARD) {
        return getParentReply({data: 'gameData', function: 'maps.getAll', args: lang});
    }
    lang = validateLanguage(lang);
    if (gameData.maps[lang]) {
        return gameData.maps[lang];
    }
    return updateMaps().then(ms => ms[lang]);
};

export async function updateBosses() {
    let bossQueries = [];
    for (const langCode of gameData.languages) {
        if (langCode === 'en') {
            continue;
        }
        bossQueries.push(`${langCode}: bosses(lang: ${langCode}) {
            ...BossName
        }`);
    }
    const query = `query StashBosses {
        bosses {
            name
            normalizedName
            imagePortraitLink
            health {
                max
            }
            equipment {
                item {
                    id
                    containsItems {
                        item {
                            id
                        }
                    }
                }
            }
            items {
                id
            }
        }
        ${bossQueries.join('\n')}
    }
    fragment BossName on MobInfo {
        name
        normalizedName
    }`;
    const response = await graphqlRequest({ graphql: query }).then(response => response.data);
    gameData.bosses = response.bosses.map(boss => {
        return {
            ...boss,
            health: boss.health ? boss.health.reduce((total, healthPart) => {
                total += healthPart.max;
                return total;
            },0) : 0,
        }
    });

    for (const lang in response) {
        if (lang === 'bosses') {
            continue;
        }
        gameData.bossNames[lang] = response[lang].reduce((langData, boss) => {
            langData[boss.normalizedName] = boss;
            return langData;
        }, {});
    }

    /*const newBossChoices = [];
    for (const boss of gameData.bosses) {
        newBossChoices.push({
            name: boss.name, 
            value: normalizedName, 
            name_localizations: gameData.languages.reduce((loc, langCode) => {
                const dLocale = getDiscordLocale(langCode);
                if (dLocale) {
                    loc[dLocale] = gameData.bossNames[langCode].find(b => b.normalizedName === boss.normalizedName).name;
                }
                return loc;
            }, {}),
        });
    }
    bossChoices = newBossChoices.sort((a,b) => {
        return a.name.localeCompare(b.name);
    });*/
    eventEmitter.emit('updatedBosses');
    return gameData.bosses;
};

export async function getBosses(lang = 'en') {
    if (process.env.IS_SHARD) {
        return getParentReply({data: 'gameData', function: 'bosses.getAll', args: lang});
    }
    lang = validateLanguage(lang);
    if (!gameData.bosses) {
        await updateBosses();
    }
    if (lang === 'en') {
        return gameData.bosses;
    }
    const bossNames = gameData.bossNames[lang] || {};
    return gameData.bosses.map(boss => {
        return {
            ...boss,
            ...bossNames[boss.normalizedName],
        }
    });
}

export async function updateTraders() {
    const traderQueries = [];
    for (const langCode of gameData.languages) {
        traderQueries.push(`${langCode}: traders(lang: ${langCode}) {
            ...TraderFields
        }`);
    }
    const query = `query StashTraders {
        ${traderQueries.join('\n')}
    }
    fragment TraderFields on Trader {
        id
        tarkovDataId
        name
        normalizedName
        resetTime
        discount
        imageLink
        levels {
            id
            level
            payRate
        }
    }`;
    const response = await graphqlRequest({ graphql: query }).then(response => response.data);

    for (const lang in response) {
        gameData.traders[lang] = response[lang];
    }

    const newTraderChoices = [];
    for (const trader of gameData.traders.en) {
        newTraderChoices.push({
            name: trader.name, 
            value: trader.id, 
            name_localizations: gameData.languages.reduce((loc, langCode) => {
                const dLocale = getDiscordLocale(langCode);
                if (dLocale) {
                    loc[dLocale] = gameData.traders[langCode].find(tr => tr.id === trader.id).name;
                }
                return loc;
            }, {}),
        });
    }
    choices.trader = newTraderChoices.sort((a,b) => {
        return a.name.localeCompare(b.name);
    });
    eventEmitter.emit('updatedTraders');
    return gameData.traders;
};

export async function getTraders(lang = 'en') {
    if (process.env.IS_SHARD) {
        return getParentReply({data: 'gameData', function: 'traders.getAll', args: lang});
    }
    lang = validateLanguage(lang);
    if (gameData.traders[lang]) {
        return gameData.traders[lang];
    }
    return updateTraders().then(ts => ts[lang]);
};

export async function updateHideout() {
    const hideoutQueries = [];
    for (const langCode of gameData.languages) {
        hideoutQueries.push(`${langCode}: hideoutStations(lang: ${langCode}) {
            ...HideoutStationFields
        }`);
    }
    const query = `query StashHideout {
        ${hideoutQueries.join('\n')}
    }
    fragment HideoutStationFields on HideoutStation {
        id
        tarkovDataId
        name
        levels {
            id
            tarkovDataId
            level
        }
    }`;
    const response = await graphqlRequest({ graphql: query }).then(response => response.data);
    for (const lang in response) {
        gameData.hideout[lang] = response[lang];
    }

    const newWideoutChoices = [];
    for (const hideoutData of gameData.hideout.en) {
        newWideoutChoices.push({
            name: hideoutData.name, 
            value: hideoutData.id, 
            name_localizations: gameData.languages.reduce((loc, langCode) => {
                const dLocale = getDiscordLocale(langCode);
                if (dLocale) {
                    loc[dLocale] = gameData.hideout[langCode].find(hi => hi.id === hideoutData.id).name;
                }
                return loc;
            }, {}),
        });
    }
    choices.hideout = newWideoutChoices.sort((a,b) => {
        return a.name.localeCompare(b.name);
    });

    return gameData.hideout;
};

export async function getHideout(lang = 'en') {
    if (process.env.IS_SHARD) {
        return getParentReply({data: 'gameData', function: 'hideout.getAll', args: lang});
    }
    lang = validateLanguage(lang);
    if (gameData.hideout[lang]) {
        return gameData.hideout[lang];
    }
    return updateHideout().then(hs => hs[lang]);
};

export async function getFlea() {
    if (gameData.flea) {
        return gameData.flea;
    }
    return updateFlea();
};

export async function updateFlea() {
    const query = `query StashFleaMarket {
        fleaMarket {
            minPlayerLevel
            enabled
            sellOfferFeeRate
            sellRequirementFeeRate
        }
    }`;
    const response = await graphqlRequest({ graphql: query });
    gameData.flea = response.data.fleaMarket;

    return gameData.flea;
};

export async function updateBarters() {
    const query = `query StashBarters {
        barters {
            id
            trader {
                id
            }
            level
            taskUnlock {
                id
            }
            requiredItems {
                item {
                    id
                }
                attributes {
                    name
                    value
                }
                count
            }
            rewardItems {
                item {
                    id
                }
                count
            }
        }
    }`;
    const response = await graphqlRequest({ graphql: query });
    gameData.barters = response.data.barters;

    return gameData.barters;
}

export async function getBarters() {
    if (process.env.IS_SHARD) {
        return getParentReply({data: 'gameData', function: 'barters.getAll'});
    }
    if (gameData.barters) {
        return gameData.barters;
    }
    return updateBarters();
}

export async function updateCrafts() {
    const query = `query StashCrafts {
        crafts {
            id
            station {
                id
            }
            level
            duration
            requiredItems {
                item {
                    id
                }
                count
                attributes {
                    type
                    value
                }
            }
            rewardItems {
                item {
                    id
                }
                count
            }
        }
    }`;
    const response = await graphqlRequest({ graphql: query });
    gameData.crafts = response.data.crafts;

    return gameData.crafts;
}

export async function getCrafts() {
    if (process.env.IS_SHARD) {
        return getParentReply({data: 'gameData', function: 'crafts.getAll'});
    }
    if (gameData.crafts) {
        return gameData.crafts;
    }
    return updateCrafts();
}

export async function updateItemNames() {
    const nameQueries = [];
    for (const langCode of gameData.languages) {
        if (langCode === 'en') {
            continue;
        }
        nameQueries.push(`${langCode}: items(lang: ${langCode}) {
            ...ItemNameFields
        }`);
    }
    const query = `query StashItemNames {
        ${nameQueries.join('\n')}
    }
    fragment ItemNameFields on Item {
        id
        name
        shortName
        properties {
            ...on ItemPropertiesAmmo {
                caliber
                penetrationPower
                damage
                armorDamage
                fragmentationChance
                initialSpeed
            }
            ...on ItemPropertiesStim {
                cures
                stimEffects {
                    type
                    chance
                    delay
                    duration
                    value
                    percent
                    skillName
                }
            }
            ...on ItemPropertiesWeapon {
                defaultPreset {
                    iconLink
                    width
                    height
                    traderPrices {
                        price
                        priceRUB
                        currency
                        trader {
                            id
                            name
                        }
                    }
                    sellFor {
                        price
                        currency
                        priceRUB
                        vendor {
                            name
                            normalizedName
                            ...on TraderOffer {
                                trader {
                                    id
                                }
                            }
                        }
                    }
                }
            }
        }
    }`;
    const response = await graphqlRequest({ graphql: query }).then(response => response.data);
    for (const lang in response) {
        gameData.itemNames[lang] = response[lang].reduce((langData, item) => {
            langData[item.id] = item;
            return langData;
        }, {});
    }
    return gameData.itemNames;
}

export async function getItemNames(lang) {
    if (gameData.itemNames[lang]) {
        return gameData.itemNames[lang];
    }
    return Promise.reject(new Error(`No item names found for language ${lang}`));
}

export async function updateItems() {
    const query = `query StashItems {
        items {
            id
            name
            shortName
            normalizedName
            updated
            width
            height
            weight
            iconLink
            link
            category {
                name
                id
            }
            properties {
                ...on ItemPropertiesAmmo {
                    caliber
                    penetrationPower
                    damage
                    armorDamage
                    fragmentationChance
                    initialSpeed
                }
                ...on ItemPropertiesStim {
                    cures
                    stimEffects {
                        type
                        chance
                        delay
                        duration
                        value
                        percent
                        skillName
                    }
                }
                ...on ItemPropertiesWeapon {
                    defaultPreset {
                        iconLink
                        width
                        height
                        traderPrices {
                            price
                            priceRUB
                            currency
                            trader {
                                id
                                name
                            }
                        }
                        sellFor {
                            price
                            currency
                            priceRUB
                            vendor {
                                name
                                normalizedName
                                ...on TraderOffer {
                                    trader {
                                        id
                                    }
                                }
                            }
                        }
                    }
                }
            }
            avg24hPrice
            lastLowPrice
            traderPrices {
                price
                priceRUB
                currency
                trader {
                    id
                    name
                }
            }
            buyFor {
                price
                currency
                priceRUB
                vendor {
                    name
                    ...on TraderOffer {
                        trader {
                            id
                        }
                        minTraderLevel
                        taskUnlock {
                            id
                        }
                    }
                }
            }
            sellFor {
                price
                currency
                priceRUB
                vendor {
                    name
                    ...on TraderOffer {
                        trader {
                            id
                        }
                    }
                }
            }
            types
            basePrice
            craftsFor {
                id
            }
            craftsUsing {
                id
            }
            bartersFor {
                id
            }
            bartersUsing {
                id
            }
        }
    }`;
    const response = await graphqlRequest({ graphql: query });
    response.data?.items.forEach(item => {
        if (item.properties?.defaultPreset) {
            item.iconLink = item.properties.defaultPreset.iconLink;
            item.width = item.properties.defaultPreset.width;
            item.height = item.properties.defaultPreset.height;
            item.traderPrices = item.properties.defaultPreset.traderPrices;
            item.sellFor = item.sellFor.filter(sellFor => sellFor.vendor.normalizedName === 'flea-market');
            item.properties.defaultPreset.sellFor.forEach(sellFor => {
                if (sellFor.vendor.normalizedName !== 'flea-market') {
                    item.sellFor.push(sellFor);
                }
            });
        }
    });
    gameData.items = response.data.items;
    await updateTiers(gameData.items);
    await updateItemNames().catch(error => {
        console.log(`Error updating item names: ${error.message}`);
    });

    return gameData.items;
}

export async function getItems(lang = 'en') {
    if (process.env.IS_SHARD) {
        return getParentReply({data: 'gameData', function: 'items.getAll', args: lang});
    }
    lang = validateLanguage(lang);
    if (!gameData.items) {
        await updateItems();
    }
    if (lang === 'en') {
        return gameData.items;
    }
    const itemNames = await getItemNames(lang).catch(error => {
        console.log(`Error getting ${lang} item names: ${error.message}`);
        return {};
    });
    return gameData.items.map(item => {
        return {
            ...item,
            ...itemNames[item.id],
        }
    });
}

export async function getAmmo(lang = 'en') {
    if (process.env.IS_SHARD) {
        return getParentReply({data: 'gameData', function: 'items.getAmmo', args: lang});
    }
    return getItems(lang).then(items => {
        return items.filter(item => item.category.id === '5485a8684bdc2da71d8b4567');
    });
}

export async function getStims(lang = 'en') {
    if (process.env.IS_SHARD) {
        return getParentReply({data: 'gameData', function: 'items.getStims', args: lang});
    }
    return getItems(lang).then(items => {
        return items.filter(item => item.category.id === '5448f3a64bdc2d60728b456a');
    });
}

export async function updateTasks() {
    const taskQueries = [];
    for (const langCode of gameData.languages) {
        taskQueries.push(`${langCode}: tasks(lang: ${langCode}) {
            ...TaskFields
        }`);
    }
    const query = `query StashTasks {
        ${taskQueries.join('\n')}
    }
    fragment TaskFields on Task {
        id
        name
        normalizedName
        taskImageLink
        objectives {
            id
            description
            __typename
            ...on TaskObjectiveBasic {
                requiredKeys {
                    id
                }
            }
            ...on TaskObjectiveItem {
                count
                requiredKeys {
                    id
                }
            }
            ...on TaskObjectivePlayerLevel {
                playerLevel
            }
            ...on TaskObjectiveShoot {
                count
            }
            ...on TaskObjectiveSkill {
                skillLevel {
                    name
                    level
                }
            }
            ...on TaskObjectiveTraderLevel {
                trader {
                    id
                }
                level
            }
            ...on TaskObjectiveUseItem {
                count
            }
        }
        trader {
            id
        }
        minPlayerLevel
        wikiLink
        experience
        finishRewards {
            traderStanding {
                trader {
                    id
                }
                standing
            }
        }
    }`;
    const response = await graphqlRequest({ graphql: query }).then(response => response.data);

    for (const lang in response) {
        gameData.tasks[lang] = response[lang];
    }

    eventEmitter.emit('updatedTasks');
    return gameData.tasks;
};

export async function getTasks(lang = 'en') {
    if (process.env.IS_SHARD) {
        return getParentReply({data: 'gameData', function: 'tasks.getAll', args: lang});
    }
    lang = validateLanguage(lang);
    if (gameData.tasks[lang]) {
        return gameData.tasks[lang];
    }
    return updateTasks().then(ts => ts[lang]);
};

export async function updateAll(rejectOnError = false) {
    try {
        await updateLanguages();
    } catch (error) {
        console.error(`Error updating languages: ${error.message} (${new Date()})`);
        if (rejectOnError) {
            return Promise.reject(error);
        }
    }
    await Promise.allSettled([
        updateBarters(),
        updateCrafts(),
        updateMaps(),
        updateBosses(),
        updateTraders(),
        updateHideout(),
        updateItems(),
        updateTasks(),
    ]).then(results => {
        const taskNames = [
            'barters',
            'crafts',
            'maps',
            'bosses',
            'traders',
            'hideout',
            'items',
            'tasks',
        ];
        let reject = false;
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                return;
            }
            console.error(`Error updating ${taskNames[index]}: ${result.reason.message} (${new Date()})`);
            if (rejectOnError && !reject) {
                reject = result.reason;
            }
        });
        if (reject) {
            return Promise.reject(reject);
        }
        return results;
    });
    eventEmitter.emit('updated');
}

/*export async function updateChoices() {
    return Promise.all([
        updateMaps(),
        updateBosses(),
        updateTraders(),
        updateHideout(),
    ]);
}*/

if (process.env.NODE_ENV !== 'ci' && !process.env.IS_SHARD) {
    setInterval(updateAll, 1000 * 60 * updateIntervalMinutes).unref();
}

const getChoices = (choiceType, options) => {
    if (process.env.IS_SHARD) {
        return [];
    }
    options = {
        all: false,
        whitelist: [],
        blacklist: [],
        ...options,
    };
    const filteredChoices = choices[choiceType].filter(c => {
        if (options.blacklist.includes(c.name) || options.blacklist.includes(c.value)) {
            return false;
        }
        if (options.whitelist.length === 0) {
            return true;
        }
        return options.whitelist.includes(c.name) || options.whitelist.includes(c.value);
    });
    if (!options.all) return filteredChoices;
    return [
        ...filteredChoices,
        {name: 'All', value: 'all', name_localizations: getCommandLocalizations('all_desc')},
    ];
};

export default {
    maps: {
        getAll: getMaps,
        update: updateMaps,
        choices: (includeAllOption, options) => {
            return getChoices('map', includeAllOption, options);
        }
    },
    bosses: {
        getAll: getBosses,
        choices: (includeAllOption, options) => {
            return getChoices('boss', includeAllOption, options);
        }
    },
    traders: {
        getAll: getTraders,
        get: async (id, lang = 'en') => {
            if (process.env.IS_SHARD) {
                return getParentReply({data: 'gameData', function: 'traders.get', args: [id, lang]});
            }
            const traders = await getTraders(lang);
            return traders.find(trader => trader.id === id);
        },
        update: updateTraders,
        choices: (includeAllOption, options) => {
            return getChoices('trader', includeAllOption, options);
        }
    },
    hideout: {
        getAll: getHideout,
        get: async (id, lang = 'en') => {
            if (process.env.IS_SHARD) {
                return getParentReply({data: 'gameData', function: 'hideout.get', args: [id, lang]});
            }
            const stations = await getHideout(lang);
            return stations.find(station => station.id === id);
        },
        update: updateHideout,
        choices: (includeAllOption, options) => {
            return getChoices('hideout', includeAllOption, options);
        }
    },
    skills: {
        getAll: () => {
            if (process.env.IS_SHARD) {
                return getParentReply({data: 'gameData', function: 'skills.getAll'});
            }
            return gameData.skills;
        },
        get: async id => {
            if (process.env.IS_SHARD) {
                return getParentReply({data: 'gameData', function: 'skills.get', args: id});
            }
            return gameData.skills.find(skill => skill.id === id);
        },
        choices: (includeAllOption, options) => {
            return getChoices('skill', includeAllOption, options);
        }
    },
    flea: {
        get: getFlea,
        update: updateFlea
    },
    barters: {
        getAll: getBarters
    },
    crafts: {
        getAll: getCrafts
    },
    items: {
        getAll: getItems,
        get: async (id, lang = 'en') => {
            if (process.env.IS_SHARD) {
                return getParentReply({data: 'gameData', function: 'items.get', args: [id, lang]});
            }
            const items = await getItems(lang);
            return items.find(item => item.id === id);
        },
        getAmmo: getAmmo,
        getStims: getStims,
    },
    tasks: {
        getAll: getTasks,
        get: async (id, lang = 'en') => {
            if (process.env.IS_SHARD) {
                return getParentReply({data: 'gameData', function: 'tasks.get', args: [id, lang]});
            }
            const tasks = await getTasks(lang);
            return tasks.find(task => task.id === id);
        },
    },
    events: eventEmitter,
    updateAll: updateAll,
    validateLanguage,
};
