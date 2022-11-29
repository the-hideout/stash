import EventEmitter from 'events';
import got from 'got';
import graphqlRequest from "./graphql-request.mjs";
import { updateTiers } from './loot-tier.mjs';
import { t } from "./translations.mjs";

const gameData = {
    maps: {},
    traders: {},
    hideout: {},
    barters: false,
    crafts: false,
    items: false,
    itemNames: {},
    flea: false,
    skills: [
        {
            id: 'hideoutManagement',
            name: 'Hideout Management'
        },
        {
            id: 'crafting',
            name: 'Crafting'
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

let mapChoices = [];
let bossChoices = [];
let traderChoices = [];
let hideoutChoices = [];

const updateIntervalMinutes = 10;

const eventEmitter = new EventEmitter();

function validateLanguage(langCode) {
    if (!langCode || typeof langCode !== 'string') {
        return 'en';
    }
    langCode = langCode.split('-')[0];
    if (!gameData.languages.includes(langCode)) {
        return 'en';
    }
    return langCode;
}

function getDiscordLocale(langCode) {
    const subs = {
        cs: 'cs',
        de: 'de',
        en: 'en-US',
        es: 'es-ES',
        fr: 'fr',
        hu: 'hu',
        it: 'it',
        ja: 'ja',
        pl: 'pl',
        pt: 'pt-BR',
        ru: 'ru',
        tr: 'tr',
        zh: 'zh-CN',
    };
    return subs[langCode];
}

function getAllChoice() {
    const allChoice = {name: 'All', value: 'all', name_localizations: {}};
    for (const langCode of gameData.languages) {
        const dLocale = getDiscordLocale(langCode);
        if (!dLocale) continue;;
        allChoice.name_localizations[dLocale] = t('All', {lng: langCode});
    }
    return allChoice;
}

export async function updateLanguages() {
    const query = `{
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
        mapQueries.push(`maps_${langCode}: maps(lang: ${langCode}) {
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
                    amount {
                        count
                        chance
                    }
                }
                spawnTime
                spawnTimeRandom
                spawnTrigger
            }
        }`);
    }
    const query = `query {
        ${mapQueries.join('\n')}
    }`;
    const [response, mapImages] = await Promise.all([
        graphqlRequest({ graphql: query }).then(response => response.data),
        got('https://raw.githubusercontent.com/the-hideout/tarkov-dev/master/src/data/maps.json', {
            responseType: 'json',
            headers: { "user-agent": "stash-tarkov-dev" }
        }).then(response => response.body)
    ]);

    for (const queryName in response) {
        const lang = queryName.replace('maps_', '');
        gameData.maps[lang] = response[queryName];
        
        for (const mapData of gameData.maps[lang]) {
            let testKey = mapData.normalizedName;

            if (mapKeys[mapData.id]) 
                testKey = mapKeys[mapData.id];      // remap night-factory=>facory and the-lab=>labs map keys 
            
            for (const mapImage of mapImages) {
                if (mapImage.normalizedName !== testKey) 
                    continue;
                
                let map = mapImage.maps[0];

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
    mapChoices = newMapChoices.sort((a, b) => {
        return a.name.localeCompare(b.name);
    });
    bossChoices = bosses.sort((a, b) => {
        return a.name.localeCompare(b.name);
    });

    return gameData.maps;
};

export async function getMaps(lang = 'en') {
    lang = validateLanguage(lang);
    if (gameData.maps[lang]) {
        return gameData.maps[lang];
    }
    return updateMaps().then(ms => ms[lang]);
};

export async function updateTraders() {
    const traderQueries = [];
    for (const langCode of gameData.languages) {
        traderQueries.push(`traders_${langCode}: traders(lang: ${langCode}) {
            id
            tarkovDataId
            name
            resetTime
            discount
            levels {
                id
                level
                payRate
            }
        }`);
    }
    const query = `query {
        ${traderQueries.join('\n')}
    }`;
    const response = await graphqlRequest({ graphql: query }).then(response => response.data);

    for (const queryName in response) {
        const lang = queryName.replace('traders_', '');
        gameData.traders[lang] = response[queryName];
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
    traderChoices = newTraderChoices.sort((a,b) => {
        return a.name.localeCompare(b.name);
    });

    return gameData.traders;
};

export async function getTraders(lang = 'en') {
    lang = validateLanguage(lang);
    if (gameData.traders[lang]) {
        return gameData.traders[lang];
    }
    return updateTraders().then(ts => ts[lang]);
};

export async function updateHideout() {
    const hideoutQueries = [];
    for (const langCode of gameData.languages) {
        hideoutQueries.push(`hideout_${langCode}: hideoutStations(lang: ${langCode}) {
            id
            tarkovDataId
            name
            levels {
                id
                tarkovDataId
                level
            }
        }`);
    }
    const query = `query {
        ${hideoutQueries.join('\n')}
    }`;
    const response = await graphqlRequest({ graphql: query }).then(response => response.data);
    for (const queryName in response) {
        const lang = queryName.replace('hideout_', '');
        gameData.hideout[lang] = response[queryName];
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
    hideoutChoices = newWideoutChoices.sort((a,b) => {
        return a.name.localeCompare(b.name);
    });

    return gameData.hideout;
};

export async function getHideout(lang = 'en') {
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
    const query = `query {
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
    const query = `query {
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
    if (gameData.barters) {
        return gameData.barters;
    }
    return updateBarters();
}

export async function updateCrafts() {
    const query = `query {
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
    if (gameData.crafts) {
        return gameData.crafts;
    }
    return updateCrafts();
}

export async function updateItemNames(lang = 'en') {
    lang = validateLanguage(lang);
    const query = `query {
        items(lang: ${lang}) {
            id
            name
            shortName
        }
    }`;
    const response = await graphqlRequest({ graphql: query });
    
    gameData.itemNames[lang] = response.data.items.reduce((langData, item) => {
        langData[item.id] = item;
        return langData;
    }, {});

    return gameData.itemNames[lang];
}

export async function getItemNames(lang = 'en') {
    if (gameData.itemNames[lang]) {
        return gameData.itemNames[lang];
    }
    return updateItemNames(lang);
}

export async function updateItems() {
    const query = `query {
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

    return gameData.items;
}

export async function getItems(lang = 'en') {
    lang = validateLanguage(lang);
    if (!gameData.items) {
        await updateItems();
    }
    if (lang === 'en') {
        return gameData.items;
    }
    const itemNames = await getItemNames(lang);
    return gameData.items.map(item => {
        return {
            ...item,
            ...itemNames[item.id],
        }
    });
}

export async function getAmmo(lang = 'en') {
    return getItems(lang).then(items => {
        return items.filter(item => item.category.id === '5485a8684bdc2da71d8b4567');
    });
}

export async function getStims(lang = 'en') {
    return getItems(lang).then(items => {
        return items.filter(item => item.category.id === '5448f3a64bdc2d60728b456a');
    });
}

export async function updateAll(rejectOnError = false) {
    await updateLanguages();
    await Promise.allSettled([
        updateBarters(),
        updateCrafts(),
        updateMaps(),
        updateTraders(),
        updateHideout(),
        updateItems().then(() => {
            const promises = [];
            for (const langCode in gameData.itemNames) {
                if (langCode === 'en') {
                    continue;
                }
                promises.push(updateItemNames(langCode));
            }
            return Promise.all(promises);
        }),
    ]).then(results => {
        const taskNames = [
            'barters',
            'crafts',
            'maps',
            'traders',
            'hideout',
            'items',
        ];
        let reject = false;
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                return;
            }
            console.error(`Error updating ${taskNames[index]}`, error);
            if (rejectOnError && !reject) {
                reject = error;
            }
        });
        if (reject) {
            return Promise.reject(reject);
        }
        return results;
    });
    eventEmitter.emit('updated');
}

if (process.env.NODE_ENV !== 'ci') {
    setInterval(updateAll, 1000 * 60 * updateIntervalMinutes).unref();
}

export default {
    maps: {
        getAll: getMaps,
        update: updateMaps,
        choices: () => {
            return mapChoices;
        }
    },
    bosses: {
        choices: () => {
            return bossChoices;
        }
    },
    traders: {
        getAll: getTraders,
        get: async (id, lang = 'en') => {
            const traders = await getTraders(lang);
            return traders.find(trader => trader.id === id);
        },
        update: updateTraders,
        choices: includeAllOption => {
            if (!includeAllOption) return traderChoices;
            return [
                ...traderChoices,
                getAllChoice()
            ];
        }
    },
    hideout: {
        getAll: getHideout,
        get: async (id, lang = 'en') => {
            const stations = await getHideout(lang);
            return stations.find(station => station.id === id);
        },
        update: updateHideout,
        choices: includeAllOption => {
            if (!includeAllOption) return hideoutChoices;
            return [
                ...hideoutChoices,
                getAllChoice()
            ];
        }
    },
    skills: {
        getAll: () => {
            return gameData.skills;
        },
        get: async id => {
            return gameData.skills.find(skill => skill.id === id);
        },
        choices: includeAllOption => {
            const choices = gameData.skills.map(skill => {
                const skill_loc = {};
                for (const lang of gameData.languages) {
                    const langCode = getDiscordLocale(lang);
                    if (!langCode) {
                        continue;
                    }
                    skill_loc[langCode] = t(skill.name, {lng: lang});
                }
                return {name: skill.name, value: skill.id, name_localizations: skill_loc};
            });
            if (!includeAllOption) return choices;
            return [
                ...choices,
                getAllChoice()
            ];
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
            const items = await getItems(lang);
            return items.find(item => item.id === id);
        },
        getAmmo: getAmmo,
        getStims: getStims,
    },
    events: eventEmitter,
    updateAll: updateAll,
};
