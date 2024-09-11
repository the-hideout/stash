import EventEmitter from 'events';
import got from 'got';
import graphqlRequest from "./graphql-request.mjs";
import { updateTiers } from './loot-tier.mjs';
import { getDiscordLocale, getCommandLocalizations } from "./translations.mjs";
import { getParentReply } from './shard-messenger.mjs';
import gameModes from './game-modes.mjs';

const defaultOptions = {
    lang: 'en',
    gameMode: 'regular',
};

const mergeOptions = (options = {}) => {
    if (typeof options === 'string') {
        options = {lang: options};
    }
    return {
        ...defaultOptions,
        ...options,
    };
};

const gameData = {
    maps: {},
    bosses: false,
    bossNames: {},
    traders: {},
    hideout: {},
    barters: {},
    crafts: {},
    items: {},
    itemNames: {},
    tasks: {},
    playerLevels: [],
    flea: {},
    goonReports: {},
    achievements: {},
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
    profiles: {},
};

let profileIndexUpdateInterval = false;

const mapKeys = {
    '5b0fc42d86f7744a585f9105': 'labs',
    '59fc81d786f774390775787e': 'factory'
};

const choices = {
    boss: [],
    hideout: [],
    map: [],
    goonsMaps: [],
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
    if (!response.errors?.length) {
        gameData.languages = response.data.__type.enumValues.map(e => e.name);
    }
    return gameData.languages;
}

export async function updateMaps() {
    for (const gameMode of gameModes) {
        let mapQueries = [];
        for (const langCode of gameData.languages) {
            mapQueries.push(`${langCode}: maps(lang: ${langCode}, gameMode: ${gameMode}) {
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
            nameId
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

        if (!gameData.maps[gameMode]) {
            gameData.maps[gameMode] = {};
        }
    
        for (const lang in response) {
            if (gameData.maps[gameMode][lang] && response.errors?.length) {
                continue;
            }
            gameData.maps[gameMode][lang] = response[lang];
            
            for (const mapData of gameData.maps[gameMode][lang]) {
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
    }
    
    const newMapChoices = [];
    const bosses = [];
    // Loop through each map and collect names and bosses
    for (const mapData of gameData.maps.regular.en) {
        newMapChoices.push({
            name: mapData.name, 
            value: mapData.id, 
            name_localizations: gameData.languages.reduce((loc, langCode) => {
                const dLocale = getDiscordLocale(langCode);
                if (dLocale) {
                    loc[dLocale] = gameData.maps.regular[langCode].find(m => m.id === mapData.id).name;
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
                const locMap = gameData.maps.regular[langCode].find(m => m.id === mapData.id);
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
    choices.goonsMaps = choices.map.filter(c => gameData.maps.regular.en.some(m => m.id === c.value && m.bosses.some(b => b.normalizedName === 'death-knight')));
    return gameData.maps;
};

export async function getMaps(options = defaultOptions) {
    if (process.env.IS_SHARD) {
        return getParentReply({data: 'gameData', function: 'maps.getAll', args: options});
    }
    let { lang, gameMode } = mergeOptions(options);
    lang = validateLanguage(lang);
    if (gameData.maps[gameMode]?.[lang]) {
        return gameData.maps[gameMode][lang];
    }
    return updateMaps().then(ms => ms[gameMode][lang]);
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

    if (gameData.bosses && response.errors?.length) {
        return gameData.bosses;
    }

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
    eventEmitter.emit('updatedBosses');
    return gameData.bosses;
};

export async function getBosses(options = defaultOptions) {
    if (process.env.IS_SHARD) {
        return getParentReply({data: 'gameData', function: 'bosses.getAll', args: options});
    }
    let { lang } = mergeOptions(options);
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
    for (const gameMode of gameModes) {
        const traderQueries = [];
        for (const langCode of gameData.languages) {
            traderQueries.push(`${langCode}: traders(lang: ${langCode}, gameMode: ${gameMode}) {
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
    

        if (!gameData.traders[gameMode]) {
            gameData.traders[gameMode] = {};
        }
        for (const lang in response) {
            if (gameData.traders[gameMode][lang] && response.errors?.length) {
                continue;
            }
            gameData.traders[gameMode][lang] = response[lang];
        }
    }

    const newTraderChoices = [];
    for (const trader of gameData.traders.regular.en) {
        newTraderChoices.push({
            name: trader.name, 
            value: trader.id, 
            name_localizations: gameData.languages.reduce((loc, langCode) => {
                const dLocale = getDiscordLocale(langCode);
                if (dLocale) {
                    loc[dLocale] = gameData.traders.regular[langCode].find(tr => tr.id === trader.id).name;
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

export async function getTraders(options = defaultOptions) {
    if (process.env.IS_SHARD) {
        return getParentReply({data: 'gameData', function: 'traders.getAll', args: options});
    }
    let { lang, gameMode } = mergeOptions(options);
    lang = validateLanguage(lang);
    if (gameData.traders[gameMode]?.[lang]) {
        return gameData.traders[gameMode][lang];
    }
    return updateTraders().then(ts => ts[gameMode][lang]);
};

export async function updateHideout() {
    for (const gameMode of gameModes) {
        const hideoutQueries = [];
        for (const langCode of gameData.languages) {
            hideoutQueries.push(`${langCode}: hideoutStations(lang: ${langCode}, gameMode: ${gameMode}) {
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
            normalizedName
            imageLink
            levels {
                id
                tarkovDataId
                level
            }
        }`;
        const response = await graphqlRequest({ graphql: query }).then(response => response.data);
        if (!gameData.hideout[gameMode]) {
            gameData.hideout[gameMode] = {};
        }
        for (const lang in response) {
            if (gameData.hideout[gameMode][lang] && response.errors?.length) {
                continue;
            }
            gameData.hideout[gameMode][lang] = response[lang];
        }
    }

    const newWideoutChoices = [];
    for (const hideoutData of gameData.hideout.regular.en) {
        newWideoutChoices.push({
            name: hideoutData.name, 
            value: hideoutData.id, 
            name_localizations: gameData.languages.reduce((loc, langCode) => {
                const dLocale = getDiscordLocale(langCode);
                if (dLocale) {
                    loc[dLocale] = gameData.hideout.regular[langCode].find(hi => hi.id === hideoutData.id).name;
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

export async function getHideout(options = defaultOptions) {
    if (process.env.IS_SHARD) {
        return getParentReply({data: 'gameData', function: 'hideout.getAll', args: options});
    }
    let { lang, gameMode } = mergeOptions(options);
    lang = validateLanguage(lang);
    if (gameData.hideout[gameMode]?.[lang]) {
        return gameData.hideout[gameMode][lang];
    }
    return updateHideout().then(hs => hs[gameMode][lang]);
};

export async function getFlea(options = defaultOptions) {
    const { gameMode } = mergeOptions(options);
    if (gameData.flea[gameMode]) {
        return gameData.flea[gameMode];
    }
    return updateFlea().then(flea => flea[gameMode]);
};

export async function updateFlea() {
    for (const gameMode of gameModes) {
        const query = `query StashFleaMarket {
            fleaMarket(gameMode: ${gameMode}) {
                minPlayerLevel
                enabled
                sellOfferFeeRate
                sellRequirementFeeRate
            }
        }`;
        const response = await graphqlRequest({ graphql: query });
        if (gameData.flea[gameMode] && response.errors?.length) {
            continue;
        }
        gameData.flea[gameMode] = response.data.fleaMarket;
    }

    return gameData.flea;
};

export async function updateBarters() {
    for (const gameMode of gameModes) {
        const query = `query StashBarters {
            barters(gameMode: ${gameMode}) {
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
        if (gameData.barters[gameMode] && response.errors?.length) {
            continue;
        }
        gameData.barters[gameMode] = response.data.barters;
    }

    return gameData.barters;
}

export async function getBarters(options = defaultOptions) {
    if (process.env.IS_SHARD) {
        return getParentReply({data: 'gameData', function: 'barters.getAll', args: options});
    }
    const { gameMode } = mergeOptions(options);
    if (gameData.barters[gameMode]) {
        return gameData.barters[gameMode];
    }
    return updateBarters().then(b => b[gameMode]);
}

export async function updateCrafts() {
    for (const gameMode of gameModes) {
        const query = `query StashCrafts {
            crafts(gameMode: ${gameMode}) {
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
        if (gameData.crafts[gameMode] && response.errors?.length) {
            continue;
        }
        gameData.crafts[gameMode] = response.data.crafts;
    }

    return gameData.crafts;
}

export async function getCrafts(options = defaultOptions) {
    if (process.env.IS_SHARD) {
        return getParentReply({data: 'gameData', function: 'crafts.getAll', args: options});
    }
    const { gameMode } = mergeOptions(options);
    if (gameData.crafts[gameMode]) {
        return gameData.crafts[gameMode];
    }
    return updateCrafts().then(c => c[gameMode]);
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
            ...on ItemPropertiesStim {
                cures
                stimEffects {
                    type
                    skillName
                }
            }
        }
    }`;
    const response = await graphqlRequest({ graphql: query }).then(response => response.data);
    for (const lang in response) {
        if (gameData.itemNames[lang] && response.errors?.length) {
            continue;
        }
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
    for (const gameMode of gameModes) {
        const query = `query StashItems {
            items(gameMode: ${gameMode}) {
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
        if (gameData.items[gameMode] && response.errors?.length) {
            continue;
        }
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
        gameData.items[gameMode] = response.data.items;
        await updateTiers(gameData.items[gameMode], gameMode);
    }
    await updateItemNames().catch(error => {
        console.log(`Error updating item names: ${error.message}`);
    });

    return gameData.items;
}

export async function getItems(options = defaultOptions) {
    if (process.env.IS_SHARD) {
        return getParentReply({data: 'gameData', function: 'items.getAll', args: options});
    }
    let { lang, gameMode } = mergeOptions(options);
    lang = validateLanguage(lang);
    if (!gameData.items[gameMode]) {
        await updateItems();
    }
    if (lang === 'en') {
        return gameData.items[gameMode];
    }
    const itemNames = await getItemNames(lang).catch(error => {
        console.log(`Error getting ${lang} item names: ${error.message}`);
        return {};
    });
    return gameData.items[gameMode].map(item => {
        let properties = item.properties;
        if (properties) {
            if (properties.cures) {
                properties = {
                    ...item.properties,
                    cures: itemNames[item.id].properties.cures,
                    stimEffects: item.properties.stimEffects.map((effect, index) => {
                        return {
                            ...effect,
                            type: itemNames[item.id].properties.stimEffects[index].type,
                            skillName: itemNames[item.id].properties.stimEffects[index].skillName,
                        };
                    }),
                };
            }
        }
        return {
            ...item,
            name: itemNames[item.id].name,
            shortName: itemNames[item.id].shortName,
            properties,
        }
    });
}

export async function getAmmo(options = defaultOptions) {
    if (process.env.IS_SHARD) {
        return getParentReply({data: 'gameData', function: 'items.getAmmo', args: options});
    }
    return getItems(options).then(items => {
        return items.filter(item => item.category.id === '5485a8684bdc2da71d8b4567');
    });
}

export async function getStims(options = defaultOptions) {
    if (process.env.IS_SHARD) {
        return getParentReply({data: 'gameData', function: 'items.getStims', args: options});
    }
    return getItems(options).then(items => {
        return items.filter(item => item.category.id === '5448f3a64bdc2d60728b456a');
    });
}

export async function updateTasks() {
    for (const gameMode of gameModes) {
        const taskQueries = [];
        for (const langCode of gameData.languages) {
            taskQueries.push(`${langCode}: tasks(lang: ${langCode}, gameMode: ${gameMode}) {
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

        if (!gameData.tasks[gameMode]) {
            gameData.tasks[gameMode] = {};
        }
        for (const lang in response) {
            if (gameData.tasks[gameMode][lang] && response.errors?.length) {
                continue;
            }
            gameData.tasks[gameMode][lang] = response[lang];
        }
    }

    eventEmitter.emit('updatedTasks');
    return gameData.tasks;
};

export async function getTasks(options = defaultOptions) {
    if (process.env.IS_SHARD) {
        return getParentReply({data: 'gameData', function: 'tasks.getAll', args: options});
    }
    let { lang, gameMode } = mergeOptions(options);
    lang = validateLanguage(lang);
    if (gameData.tasks[gameMode]?.[lang]) {
        return gameData.tasks[gameMode][lang];
    }
    return updateTasks().then(ts => ts[gameMode][lang]);
};

export async function updateGoonReports() {
    for (const gameMode of gameModes) {
        const query = `query StashGoonReports {
            goonReports(gameMode: ${gameMode}) {
                map {
                    id
                }
                timestamp
            }
        }`;
        const response = await graphqlRequest({ graphql: query });
        if (gameData.goonReports[gameMode] && response.errors?.length) {
            continue;
        }
        gameData.goonReports[gameMode] = response.data.goonReports;
    }
    
    return gameData.goonReports;
}

export async function getGoonReports(options = defaultOptions) {
    const { gameMode } = mergeOptions(options);
    if (gameData.goonReports[gameMode]) {
        return gameData.goonReports[gameMode];
    }
    return updateGoonReports().then(goonReports => goonReports[gameMode]);
}

export async function updatePlayerLevels() {
    const query = `query StashPlayerLevels {
        playerLevels {
            level
            exp
        }
    }`;
    const response = await graphqlRequest({ graphql: query });
    if (!gameData.playerLevels || !response.errors?.length) {
        gameData.playerLevels = response.data.playerLevels;
    }

    eventEmitter.emit('updatedPlayerLevels');
    return gameData.playerLevels;
};

export async function getPlayerLevels() {
    if (process.env.IS_SHARD) {
        return getParentReply({data: 'gameData', function: 'playerLevels.getAll'});
    }
    if (gameData.playerLevels.length) {
        return gameData.playerLevels;
    }
    return updatePlayerLevels();
};

export async function updateAchievements() {
    const achievementQueries = [];
        for (const langCode of gameData.languages) {
            achievementQueries.push(`${langCode}: achievements(lang: ${langCode}) {
                ...AchievementFields
            }`);
        }
        const query = `query StashAchievements {
            ${achievementQueries.join('\n')}
        }
        fragment AchievementFields on Achievement {
            id
            name
            adjustedPlayersCompletedPercent
        }`;
        const response = await graphqlRequest({ graphql: query }).then(response => response.data);
        for (const lang in response) {
            if (gameData.achievements[lang] && response.errors?.length) {
                continue;
            }
            gameData.achievements[lang] = response[lang];
        }

    eventEmitter.emit('updatedAchievements');
    return gameData.achievements;
};

export async function getAchievements(options = defaultOptions) {
    if (process.env.IS_SHARD) {
        return getParentReply({data: 'gameData', function: 'achievements.getAll', args: options});
    }
    let { lang } = mergeOptions(options);
    lang = validateLanguage(lang);
    if (gameData.achievements[lang]) {
        return gameData.achievements[lang];
    }
    return updateAchievements().then(as => as[lang]);
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
        updateGoonReports(),
        updatePlayerLevels(),
        updateAchievements(),
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
            'goonReports',
            'playerLevels',
            'achievements',
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

const gameDataExport = {
    maps: {
        getAll: getMaps,
        update: updateMaps,
        choices: (includeAllOption, options) => {
            return getChoices('map', includeAllOption, options);
        },
        choicesGoons: (includeAllOption, options) => {
            return getChoices('goonsMaps', includeAllOption, options);
        },
    },
    bosses: {
        getAll: getBosses,
        choices: (includeAllOption, options) => {
            return getChoices('boss', includeAllOption, options);
        }
    },
    traders: {
        getAll: getTraders,
        get: async (id, options) => {
            if (process.env.IS_SHARD) {
                return getParentReply({data: 'gameData', function: 'traders.get', args: [id, options]});
            }
            const traders = await getTraders(options);
            return traders.find(trader => trader.id === id);
        },
        update: updateTraders,
        choices: (includeAllOption, options) => {
            return getChoices('trader', includeAllOption, options);
        }
    },
    hideout: {
        getAll: getHideout,
        get: async (id, options) => {
            if (process.env.IS_SHARD) {
                return getParentReply({data: 'gameData', function: 'hideout.get', args: [id, options]});
            }
            const stations = await getHideout(options);
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
    goonReports: {
        get: async (options) => {
            if (process.env.IS_SHARD) {
                return getParentReply({data: 'gameData', function: 'goonReports.get', args: [options]});
            }
            return getGoonReports(options);
        },
        update: updateGoonReports,
    },
    gameModes: {
        getAll: () => {
            return gameModes;
        },
        choices: () => {
            return gameModes.map(gameMode => {
                return {
                    name: gameMode, 
                    value: gameMode, 
                    name_localizations: getCommandLocalizations(`game_mode_${gameMode}`),
                }
            });
        },
    },
    barters: {
        getAll: getBarters
    },
    crafts: {
        getAll: getCrafts
    },
    items: {
        getAll: getItems,
        get: async (id, options) => {
            if (process.env.IS_SHARD) {
                return getParentReply({data: 'gameData', function: 'items.get', args: [id, options]});
            }
            const items = await getItems(options);
            return items.find(item => item.id === id);
        },
        getAmmo: getAmmo,
        getStims: getStims,
    },
    tasks: {
        getAll: getTasks,
        get: async (id, options) => {
            if (process.env.IS_SHARD) {
                return getParentReply({data: 'gameData', function: 'tasks.get', args: [id, options]});
            }
            const tasks = await getTasks(options);
            return tasks.find(task => task.id === id);
        },
    },
    playerLevels: {
        getAll: getPlayerLevels,
    },
    achievements: {
        getAll: getAchievements,
    },
    profiles: {
        search: async (name) => {
            if (process.env.IS_SHARD) {
                return getParentReply({data: 'gameData', function: 'profiles.search', args: [name]});
            }
            if (!name || name.length < 3) {
                return [];
            }
            const nameLower = name.toLowerCase();
            const results = {};
            for (const id in gameData.profiles) {
                const playerName = gameData.profiles[id];
                if (!playerName.toLowerCase().includes(nameLower)) {
                    continue;
                }
                results[id] = playerName;
            }
            return results;
        },
    },
    events: eventEmitter,
    updateAll: updateAll,
    validateLanguage,
    updateProfileIndex: async () => {
        const response = await fetch('https://players.tarkov.dev/profile/index.json');
        gameData.profiles = await response.json();
        console.log(`Retrieved player profile index of ${Object.keys(gameData.profiles).length} profiles`);
        if (!profileIndexUpdateInterval) {
            profileIndexUpdateInterval = setInterval(gameDataExport.updateProfileIndex, 1000 * 60 * 60 * 24);
            profileIndexUpdateInterval.unref();
        }
    }
};

export default gameDataExport;
