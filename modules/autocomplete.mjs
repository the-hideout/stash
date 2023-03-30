import gameData from "./game-data.mjs";
import progress from '../modules/progress-shard.mjs';

const caches = {
    default: async lang => {
        return gameData.items.getAll(lang).then(items => items.map(item => item.name).sort());
    },
    barter: async lang => {
        return gameData.items.getAll(lang).then(items => items.filter(item => item.bartersFor.length > 0 || item.bartersUsing.length > 0).reduce((names, item) => {
            if (!names.includes(item.name)) {
                names.push(item.name);
            }
            return names;
        }, []).sort());
    },
    craft: async lang => {
        return gameData.items.getAll(lang).then(items => items.filter(item => item.craftsFor.length > 0 || item.craftsUsing.length > 0).reduce((names, item) => {
            if (!names.includes(item.name)) {
                names.push(item.name);
            }
            return names;
        }, []).sort());
    },
    ammo: async lang => {
        return gameData.items.getAmmo(lang).then(items => items.map(item => item.name).sort());
    },
    stim: async lang => {
        return gameData.items.getStims(lang).then(items => items.map(item => item.name).sort());
    }
};

async function autocomplete(interaction) {
    let searchString;
    try {
        searchString = interaction.options.getString('name');
    } catch (getError) {
        console.error(getError);
    }

    const cacheFunction = caches[interaction.commandName] || caches.default;
    const locale = await progress.getServerLanguage(interaction.guildId) || interaction.locale;
    const nameCache = await cacheFunction(locale);

    if (interaction.commandName === 'ammo') {
        return nameCache.filter(name => name.toLowerCase().replace(/\./g, '').includes(searchString.toLowerCase().replace(/\./g, '')));
    }

    return nameCache.filter(name => name.toLowerCase().includes(searchString.toLowerCase()));
};

export default autocomplete;
