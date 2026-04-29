import gameData from "./game-data.mjs";
import progress from '../modules/progress-shard.mjs';
import { getCommandLocalizations } from "./translations.mjs";

const caches = {
    default: async lang => {
        return gameData.items.getAll(lang).then(items => items.map(item => item.name).sort());
    },
    barter: async lang => {
        const [items, barters] = await Promise.all([
            gameData.items.getAll(lang),
            gameData.barters.getAll(),
        ]);
        return items.filter(item => barters.some(b => b.rewardItems.some(r => r.item === item.id) || b.requiredItems.some(r => r.item === item.id))).map(item => item.name).sort();
    },
    craft: async lang => {
        const [items, crafts] = await Promise.all([
            gameData.items.getAll(lang),
            gameData.crafts.getAll(),
        ]);
        return items.filter(item => crafts.some(c => c.rewardItems.some(r => r.item === item.id) || c.requiredItems.some(r => r.item === item.id))).map(item => item.name).sort();
    },
    key: async lang => {
        return gameData.items.getKeys(lang).then(items => items.map(item => item.name).sort());
    },
    ammo: async lang => {
        return gameData.items.getAmmo(lang).then(items => items.map(item => item.name).sort());
    },
    stim: async lang => {
        return gameData.items.getStims(lang).then(items => items.map(item => item.name).sort());
    },
    hideout: async lang => {
        const stations = await gameData.hideout.getAll(lang).then(stations => stations.reduce((all, current) => {
            all.push(current.name);
            return all;
        }, []).sort());
        const allOption = allLocalizations[lang] || allLocalizations['en-US'];
        stations.push(allOption);
        return stations;
    },
    quest: async lang => {
        return gameData.tasks.getAll(lang).then(tasks => tasks.map(t => t.name).sort());
    },
};

const allLocalizations = getCommandLocalizations('all_desc');

async function autocomplete(interaction) {
    let searchString;
    try {
        searchString = interaction.options.getString('name');
    } catch (getError) {
        console.error(getError);
    }
    const { lang, gameMode } = await progress.getInteractionSettings(interaction);
    let cacheKey = interaction.commandName;
    if (cacheKey === 'player') {
        const nameResults = await gameData.profiles.search(interaction.options.getString('account'), {gameMode});
        const names = [];
        for (const id in nameResults) {
            names.push({name: nameResults[id], value: id});
        }
        return names;
    }
    if (cacheKey === 'progress' && interaction.options.getSubcommand() === 'hideout') {
        cacheKey = interaction.options.getSubcommand();
        searchString = interaction.options.getString('station');
    }
    const cacheFunction = caches[cacheKey] || caches.default;
    const nameCache = await cacheFunction(lang);

    if (cacheKey === 'ammo') {
        return nameCache.filter(name => name.toLowerCase().replace(/\./g, '').includes(searchString.toLowerCase().replace(/\./g, '')));
    }

    return nameCache.filter(name => name.toLowerCase().includes(searchString.toLowerCase()));
};

export default autocomplete;
