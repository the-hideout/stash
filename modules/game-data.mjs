import EventEmitter from 'events';
import jsonApi from "./json-api.mjs";
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

const getLocales = async (path) => {
    const locales = {};
    await Promise.all(gameData.languages.map(langCode => {
        return jsonApi.request(`${path}_${langCode}`).then(langData => {
            locales[langCode] = langData.data;
            return langData;
        }).catch(error => {
            console.log(`Error getting ${path}_${langCode}: ${error.message}`);
            locales[langCode] = {};
        });
    }));
    return locales;
};

export async function updateLanguages() {
    gameData.languages = await jsonApi.request('endpoints').then(data => data.data.languages);
    return gameData.languages;
}

export async function updateMaps() {
    for (const gameMode of gameModes) {
        gameData.maps[gameMode] ??= {};
        const [response, mapImages, langData] = await Promise.all([
            jsonApi.request(`${gameMode}/maps`),
            fetch('https://raw.githubusercontent.com/the-hideout/tarkov-dev/master/src/data/maps.json', {
                headers: { "user-agent": "stash-tarkov-dev" }
            }).then(response => response.json()),
            getLocales(`${gameMode}/maps`),
        ]);

        for (const mapId in response.data.maps) {
            const map = response.data.maps[mapId];
            const testKey = mapKeys[map.id] ?? map.normalizedName;

            for (const mapImage of mapImages) {
                if (mapImage.normalizedName !== testKey) {
                    continue;
                }
                
                const visualMap = mapImage.maps.find(m => m.projection === '2D');

                if (!visualMap) {
                    continue;
                }

                map.key = visualMap.key;
                map.source = visualMap.source;
                map.sourceLink = visualMap.sourceLink;

                break;
            }
        }

        for (const mobId in response.data.mobs) {
            const mob = response.data.mobs[mobId];
            mob.health = mob.health?.reduce((total, healthPart) => {
                total += healthPart.max;
                return total;
            },0) ?? 0;
        }

        gameData.maps[gameMode].data = response;
        gameData.maps[gameMode].locale = langData;
    }
    
    const newMapChoices = [];
    const bosses = [];
    // Loop through each map and collect names and bosses
    for (const mapData of Object.values(gameData.maps.regular.data.data.maps)) {
        const langEn = gameData.maps.regular.locale
        newMapChoices.push({
            name: langEn[mapData.name] ?? mapData.name, 
            value: mapData.id, 
            name_localizations: gameData.languages.reduce((loc, langCode) => {
                const dLocale = getDiscordLocale(langCode);
                if (dLocale) {
                    loc[dLocale] = gameData.maps.regular.locale[langCode][mapData.name] ?? mapData.name;
                }
                return loc;
            }, {}),
        });

        // Loop through each boss and push the boss name to the bossChoices array
        for (const spawn of mapData.bosses) {
            const boss_loc = {};
            // Don't add Rogues and Raiders
            if (spawn.mob === 'ExUsec' || spawn.mob === 'PmcBot') {
                continue;
            }
            // Don't add duplicates
            if (bosses.some(bossChoice => bossChoice.value === spawn.mob)) {
                continue;
            }
            const boss = gameData.maps.regular.data.data.mobs[spawn.mob];

            for (const langCode of gameData.languages) {
                const dLocale = getDiscordLocale(langCode);
                if (!dLocale) {
                    continue;
                }
                const bossName = gameData.maps.regular.locale[langCode][boss.name];
                if (!bossName) {
                    continue;
                }
                boss_loc[dLocale] = bossName;
            }

            bosses.push({
                name: gameData.maps.regular.locale.en[boss.name] ?? boss.name,
                value: boss.id,
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
    choices.goonsMaps = choices.map.filter(c => Object.values(gameData.maps.regular.data.data.maps).some(m => m.id === c.value && m.bosses.some(spawn => spawn.mob === 'bossKnight')));
    eventEmitter.emit('updatedBosses');
    return gameData.maps;
};

export async function getMaps(options = defaultOptions) {
    if (process.env.IS_SHARD) {
        return getParentReply({data: 'gameData', function: 'maps.getAll', args: options});
    }
    let { lang, gameMode } = mergeOptions(options);
    lang = validateLanguage(lang);
    if (!gameData.maps[gameMode]) {
        await updateMaps();
    }
    return Object.values(jsonApi.translate(gameData.maps[gameMode], {lang}).maps);
};

export async function getBosses(options = defaultOptions) {
    if (process.env.IS_SHARD) {
        return getParentReply({data: 'gameData', function: 'bosses.getAll', args: options});
    }
    let { lang, gameMode } = mergeOptions(options);
    lang = validateLanguage(lang);
    if (!gameData.maps[gameMode]) {
        await updateMaps();
    }
    return Object.values(jsonApi.translate(gameData.maps[gameMode], {lang}).mobs);
}

export async function updateTraders() {
    for (const gameMode of gameModes) {
        const [response, langData] = await Promise.all([
            jsonApi.request(`${gameMode}/traders`),
            getLocales(`${gameMode}/traders`),
        ]);
    
        gameData.traders[gameMode] ??= {};

        gameData.traders[gameMode].data = response;
        gameData.traders[gameMode].locale = langData;
    }

    const newTraderChoices = [];
    for (const trader of Object.values(gameData.traders.regular.data.data)) {
        newTraderChoices.push({
            name: gameData.traders.regular.locale.en[trader.name] ?? trader.name, 
            value: trader.id, 
            name_localizations: gameData.languages.reduce((loc, langCode) => {
                const dLocale = getDiscordLocale(langCode);
                if (dLocale) {
                    loc[dLocale] = gameData.traders.regular.locale[langCode][trader.name] ?? trader.name;
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
    if (!gameData.traders[gameMode]) {
        await updateTraders();
    }
    return Object.values(jsonApi.translate(gameData.traders[gameMode], {lang}));
};

export async function updateHideout() {
    for (const gameMode of gameModes) {
        const [response, langData] = await Promise.all([
            jsonApi.request(`${gameMode}/hideout`),
            getLocales(`${gameMode}/hideout`),
        ]);
    
        gameData.hideout[gameMode] ??= {};

        gameData.hideout[gameMode].data = response;
        gameData.hideout[gameMode].locale = langData;
    }

    const newWideoutChoices = [];
    for (const hideoutData of Object.values(gameData.hideout.regular.data.data)) {
        newWideoutChoices.push({
            name: gameData.hideout.regular.locale.en[hideoutData.name] ?? hideoutData.name, 
            value: hideoutData.id, 
            name_localizations: gameData.languages.reduce((loc, langCode) => {
                const dLocale = getDiscordLocale(langCode);
                if (dLocale && gameData.hideout.regular.locale[langCode]) {
                    loc[dLocale] = gameData.hideout.regular.locale[langCode][hideoutData.name] ?? hideoutData.name;
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
    if (!gameData.hideout[gameMode]) {
        await updateHideout();
    }
    return Object.values(jsonApi.translate(gameData.hideout[gameMode], {lang}));
};

export async function updateBarters() {
    for (const gameMode of gameModes) {
        const response = await jsonApi.request(`${gameMode}/barters`);
        for (const barter of response.data) {
            barter.rewardItems ??= [barter.offeredItem];
        }
        gameData.barters[gameMode] = response.data;
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
        const response = await jsonApi.request(`${gameMode}/crafts`);
        for (const craft of response.data) {
            craft.rewardItems ??= [craft.productItem];
        }
        gameData.crafts[gameMode] = response.data;
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

export async function updateItems() {
    for (const gameMode of gameModes) {
        const [response, langData] = await Promise.all([
            jsonApi.request(`${gameMode}/items`),
            getLocales(`${gameMode}/items`),
        ]);
        for (const item of (Object.values(response.data.items))) {
            // add buyFor
            item.buyFor = [];
            const fleaBuyPrice = item.avg24hPrice ?? item.lastLowPrice;
            if (fleaBuyPrice) {
                item.buyFor.push({
                    vendor: {
                        id: 'flea-market',
                    },
                    price: fleaBuyPrice,
                    currency: "RUB",
                    priceRUB: fleaBuyPrice,
                });
            }
            for (const offer of item.buyFromTrader) {
                item.buyFor.push({
                    vendor: {
                        id: offer.trader,
                        minTraderLevel: offer.minTraderLevel,
                        taskUnlock: offer.taskUnlock,
                    },
                    price: offer.price,
                    currency: offer.currency,
                    priceRUB: offer.priceRUB,
                });
            }

            item.sellFor = [];
            if (item.lastLowPrice) {
                item.sellFor.push({
                    vendor: {
                        id: 'flea-market',
                    },
                    price: item.lastLowPrice,
                    currency: "RUB",
                    priceRUB: item.lastLowPrice,
                });
            }
            for (const offer of item.sellToTrader) {
                item.sellFor.push({
                    vendor: {
                        id: offer.trader,
                    },
                    price: offer.price,
                    currency: offer.currency,
                    priceRUB: offer.priceRUB,
                });
            }
        }
        Object.values(response.data.items).forEach(item => {
            if (!item.properties?.defaultPreset) {
                return;
            }
            const defaultPreset = response.data.items[item.properties.defaultPreset];
            if (!defaultPreset) {
                return;
            }
            item.iconLink = defaultPreset.iconLink;
            item.width = defaultPreset.width;
            item.height = defaultPreset.height;
            item.sellFor = item.sellFor.filter(sellFor => sellFor.vendor.id === 'flea-market');
            defaultPreset.sellFor.forEach(sellFor => {
                if (sellFor.vendor.id !== 'flea-market') {
                    item.sellFor.push(sellFor);
                }
            });
        });
        gameData.items[gameMode] ??= {};
        gameData.items[gameMode].data = response;
        gameData.items[gameMode].locale = langData
        await updateTiers(Object.values(gameData.items[gameMode].data.data.items), gameMode);
    }

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
    return Object.values(jsonApi.translate(gameData.items[gameMode], {lang}).items);
}

export async function getFlea(options = defaultOptions) {
    const { lang, gameMode } = mergeOptions(options);
    if (!gameData.items[gameMode]) {
        await updateItems();
    }
    return jsonApi.translate(gameData.items[gameMode], {lang}).fleaMarket;
};

export async function getAmmo(options = defaultOptions) {
    if (process.env.IS_SHARD) {
        return getParentReply({data: 'gameData', function: 'items.getAmmo', args: options});
    }
    return getItems(options).then(items => {
        return items.filter(item => item.categories[0] === '5485a8684bdc2da71d8b4567');
    });
}

export async function getStims(options = defaultOptions) {
    if (process.env.IS_SHARD) {
        return getParentReply({data: 'gameData', function: 'items.getStims', args: options});
    }
    return getItems(options).then(items => {
        return items.filter(item => item.categories[0] === '5448f3a64bdc2d60728b456a');
    });
}

export async function updateTasks() {
    for (const gameMode of gameModes) {
        const [response, langData] = await Promise.all([
            jsonApi.request(`${gameMode}/tasks`),
            getLocales(`${gameMode}/tasks`),
        ]);
    
        gameData.tasks[gameMode] ??= {};

        gameData.tasks[gameMode].data = response;
        gameData.tasks[gameMode].locale = langData;
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
    if (!gameData.tasks[gameMode]) {
        await updateTasks();
    }
    return Object.values(jsonApi.translate(gameData.tasks[gameMode], {lang}).tasks);
};

export async function getGoonReports(options = defaultOptions) {
    const { gameMode } = mergeOptions(options);
    if (gameData.maps[gameMode]) {
        await updateMaps();
    }
    return gameData.maps[gameMode].data.data.goonReports;
}

export async function getPlayerLevels(options = defaultOptions) {
    const { gameMode } = mergeOptions(options);
    if (process.env.IS_SHARD) {
        return getParentReply({data: 'gameData', function: 'playerLevels.getAll'});
    }
    if (!gameData.items[gameMode]) {
        await updateItems();
    }
    return gameData.items[gameMode].data.data.playerLevels;
};

export async function getAchievements(options = defaultOptions) {
    if (process.env.IS_SHARD) {
        return getParentReply({data: 'gameData', function: 'achievements.getAll', args: options});
    }
    let { lang, gameMode } = mergeOptions(options);
    lang = validateLanguage(lang);
    if (!gameData.tasks[gameMode]) {
        await updateTasks();
    }
    return Object.values(jsonApi.translate(gameData.tasks[gameMode], {lang}).achievements);
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
        updateTraders(),
        updateHideout(),
        updateItems(),
        updateTasks(),
    ]).then(results => {
        const taskNames = [
            'barters',
            'crafts',
            'maps',
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
        getMerchants: async (options) => {
            const [traders, items, barters] = await Promise.all([
                getTraders(options),
                getItems(options),
                getBarters(options),
            ]);
            return traders.filter(trader => barters.some(b => b.trader === trader.id) || items.some(i => i.buyFor.some(buy => buy.vendor.id === trader.id)));
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
    },
    goonReports: {
        get: async (options) => {
            if (process.env.IS_SHARD) {
                return getParentReply({data: 'gameData', function: 'goonReports.get', args: [options]});
            }
            return getGoonReports(options);
        },
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
        getKeys: async (options) => {
            if (process.env.IS_SHARD) {
                return getParentReply({data: 'gameData', function: 'items.getKeys', args: options});
            }
            return getItems(options).then(items => {
                return items.filter(item => item.categories.some(id => id === '543be5e94bdc2df1348b4568'));
            });
        },
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
        search: async (name, options) => {
            if (process.env.IS_SHARD) {
                return getParentReply({data: 'gameData', function: 'profiles.search', args: [name, options]});
            }
            if (!name || name.length < 3) {
                return [];
            }
            let { gameMode } = mergeOptions(options);
            const nameLower = name.toLowerCase();
            const results = {};
            for (const id in gameData.profiles[gameMode]) {
                const playerName = gameData.profiles[gameMode][id];
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
        for (const gameMode of gameModes) {
            let folder = 'profile';
            if (gameMode !== 'regular') {
                folder = gameMode;
            }
            const response = await fetch(`https://players.tarkov.dev/${folder}/index.json`);
            gameData.profiles[gameMode] = await response.json();
            console.log(`Retrieved ${gameMode} player profile index of ${Object.keys(gameData.profiles[gameMode]).length} profiles`);
            if (!profileIndexUpdateInterval) {
                profileIndexUpdateInterval = setInterval(gameDataExport.updateProfileIndex, 1000 * 60 * 60 * 24);
                profileIndexUpdateInterval.unref();
            }
        }
    }
};

export default gameDataExport;
