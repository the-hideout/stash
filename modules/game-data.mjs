import EventEmitter from 'events';
import got from 'got';
import graphqlRequest from "./graphql-request.mjs";
import { updateTiers } from './loot-tier.mjs';

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

export async function updateMaps(lang = 'en') {
    lang = validateLanguage(lang);
    const query = `query {
        maps(lang: ${lang}) {
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
        }
    }`;
    const responses = await Promise.all([
        graphqlRequest({ graphql: query }),
        got('https://raw.githubusercontent.com/the-hideout/tarkov-dev/master/src/data/maps.json', {
            responseType: 'json',
            headers: { "user-agent": "stash-tarkov-dev" }
        })
    ]);
    gameData.maps[lang] = responses[0].data.maps;     // graphql

    if (lang === 'en') {
        const newMapChoices = [];
        const bosses = [];
        // Loop through each map and collect names and bosses
        for (const mapData of gameData.maps[lang]) {
            newMapChoices.push({name: mapData.name, value: mapData.id});
            // Loop through each boss and push the boss name to the bossChoices array
            for (const boss of mapData.bosses) {
                // Don't add Rogues and Raiders
                if (boss.normalizedName !== 'rogue' && boss.normalizedName !== 'raider') {
                    if (bosses.some(bossChoice => bossChoice.value === boss.normalizedName)) {
                        continue;
                    }
                    bosses.push({
                        name: boss.name,
                        value: boss.normalizedName
                    });
                }
            }
        }
        mapChoices = newMapChoices.sort((a, b) => {
            return a.name.localeCompare(b.name);
        });
        bossChoices = bosses.sort((a, b) => {
            return a.name.localeCompare(b.name);
        });
    }

    const mapImages = responses[1].body;        // static

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

    return gameData.maps[lang];
};

export async function getMaps(lang = 'en') {
    lang = validateLanguage(lang);
    if (gameData.maps[lang]) {
        return gameData.maps[lang];
    }
    return updateMaps(lang);
};

export async function updateTraders(lang = 'en') {
    lang = validateLanguage(lang);
    const query = `query {
        traders(lang: ${lang}) {
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
        }
    }`;
    const response = await graphqlRequest({ graphql: query });
    gameData.traders[lang] = response.data.traders;

    if (lang === 'en') {
        const newTraderChoices = [];
        for (const traderData of gameData.traders[lang]) {
            newTraderChoices.push({name: traderData.name, value: traderData.id});
        }
        traderChoices = newTraderChoices.sort((a,b) => {
            return a.name.localeCompare(b.name);
        });
    }

    return gameData.traders[lang];
};

export async function getTraders(lang = 'en') {
    lang = validateLanguage(lang);
    if (gameData.traders[lang]) {
        return gameData.traders[lang];
    }
    return updateTraders(lang);
};

export async function updateHideout(lang = 'en') {
    lang = validateLanguage(lang);
    const query = `query {
        hideoutStations(lang: ${lang}) {
            id
            tarkovDataId
            name
            levels {
                id
                tarkovDataId
                level
            }
        }
    }`;
    const response = await graphqlRequest({ graphql: query });
    gameData.hideout[lang] = response.data.hideoutStations;

    if (lang === 'en') {
        const newWideoutChoices = [];
        for (const hideoutData of gameData.hideout[lang]) {
            newWideoutChoices.push({name: hideoutData.name, value: hideoutData.id});
        }
        hideoutChoices = newWideoutChoices.sort((a,b) => {
            return a.name.localeCompare(b.name);
        });
    }

    return gameData.hideout[lang];
};

export async function getHideout(lang = 'en') {
    lang = validateLanguage(lang);
    if (gameData.hideout[lang]) {
        return gameData.hideout[lang];
    }
    return updateHideout(lang);
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
    gameData.itemNames[lang] = {};
    response.data.items.forEach(item => {
        gameData.itemNames[lang][item.id] = item;
    })

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

export async function updateAll(lang = 'en') {
    await Promise.allSettled([
        updateLanguages(),
        updateBarters(),
        updateCrafts(),
        updateMaps(lang).then(() => {
            const promises = [];
            for (const langCode in gameData.maps) {
                if (langCode === lang) {
                    continue;
                }
                promises.push(updateMaps(langCode));
            }
            return Promise.all(promises);
        }),
        updateTraders(lang).then(() => {
            const promises = [];
            for (const langCode in gameData.traders) {
                if (langCode === lang) {
                    continue;
                }
                promises.push(updateTraders(langCode));
            }
            return Promise.all(promises);
        }),
        updateHideout(lang).then(() => {
            const promises = [];
            for (const langCode in gameData.traders) {
                if (langCode === lang) {
                    continue;
                }
                promises.push(updateTraders(langCode));
            }
            return Promise.all(promises);
        }),
        updateItems(lang).then (() => {
            const promises = [];
            for (const langCode in gameData.itemNames) {
                if (langCode === lang) {
                    continue;
                }
                promises.push(updateItemNames(langCode));
            }
            return Promise.all(promises);
        }),
    ]);
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
            for (const trader of traders) {
                if (trader.id == id || trader.tarkovDataId == id) return trader;
            }
            return false;
        },
        update: updateTraders,
        choices: includeAllOption => {
            if (!includeAllOption) return traderChoices;
            return [
                ...traderChoices,
                {name: 'All', value: 'all'}
            ];
        }
    },
    hideout: {
        getAll: getHideout,
        get: async (id, lang = 'en') => {
            const stations = await getHideout(lang);
            for (const station of stations) {
                if (station.id == id || station.tarkovDataId == id) return station;
            }
            return false;
        },
        update: updateHideout,
        choices: includeAllOption => {
            if (!includeAllOption) return hideoutChoices;
            return [
                ...hideoutChoices,
                {name: 'All', value: 'all'}
            ];
        }
    },
    skills: {
        getAll: () => {
            return gameData.skills;
        },
        get: async id => {
            for (const skill of gameData.skills) {
                if (skill.id == id) return skill;
            }
            return false;
        },
        choices: includeAllOption => {
            const choices = gameData.skills.map(skill => {
                return {name: skill.name, value: skill.id}
            });
            if (!includeAllOption) return choices;
            return [
                ...choices,
                {name: 'All', value: 'all'}
            ];
        }
    },
    flea: {
        get: getFlea,
        update: updateFlea
    },
    load: (lang = 'en') => {
        return Promise.all([
            getMaps(lang),
            getTraders(lang),
            getHideout(lang),
            getFlea()
        ]);
    },
    barters: {
        getAll: getBarters
    },
    crafts: {
        getAll: getCrafts
    },
    items: {
        getAll: getItems,
        getAmmo: getAmmo,
        getStims: getStims,
    },
    events: eventEmitter
};
