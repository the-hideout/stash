import graphqlRequest from "./graphql-request.mjs";

const caches = {
    default: {
        nameCache: false,
        lookupCache: {}
    },
    barter: {
        nameCache: false,
        lookupCache: {}
    },
    craft: {
        nameCache: false,
        lookupCache: {}
    },
    ammo: {
        nameCache: false,
        lookupCache: {}
    },
    stim: {
        nameCache: false,
        lookupCache: {}
    }
}

const updateIntervalMinutes = 10;

async function fillCache() {
    try {
        const itemNamesResponse = await graphqlRequest({
            graphql: `query {
                items {
                    name
                    category {
                        name
                        id
                    }
                    bartersFor {
                        level
                    }
                    bartersUsing {
                        level
                    }
                    craftsFor {
                        level
                    }
                    craftsUsing {
                        level
                    }
                }
            }`
        });

        caches.default.nameCache = itemNamesResponse.data.items.map(item => item.name).sort();
        caches.default.lookupCache = {};

        caches.ammo.nameCache = itemNamesResponse.data.items.filter(item => {
            return item.category.id === '5485a8684bdc2da71d8b4567';
        }).map(item => {
            return item.name;
        }).sort();
        caches.ammo.lookupCache = {};

        caches.stim.nameCache = itemNamesResponse.data.items.filter(item => {
            return item.category.id === '5448f3a64bdc2d60728b456a';
        }).map(item => {
            return item.name;
        }).sort();
        caches.stim.lookupCache = {};

        let barterNameSet = new Set();
        itemNamesResponse.data.items.filter(item => {
            return item.bartersFor.length > 0 || item.bartersUsing.length > 0;
        }).forEach(item => {
            barterNameSet.add(item.name);
        });
        caches.barter.nameCache = [...barterNameSet].sort();
        caches.barter.lookupCache = {};

        let craftNameSet = new Set();
        itemNamesResponse.data.items.filter(item => {
            return item.craftsFor.length > 0 || item.craftsUsing.length > 0;
        }).forEach(item => {
            craftNameSet.add(item.name);
        });
        caches.craft.nameCache = [...craftNameSet].sort();
        caches.craft.lookupCache = {};
    } catch (requestError) {
        console.error(requestError);
    }
};

function autocomplete(interaction) {
    let searchString;
    try {
        searchString = interaction.options.getString('name');
    } catch (getError) {
        console.error(getError);
    }

    let lookupCache = caches.default.lookupCache;
    let nameCache = caches.default.nameCache;
    if (caches[interaction.commandName]) {
        lookupCache = caches[interaction.commandName].lookupCache;
        nameCache = caches[interaction.commandName].nameCache;
    }
    if (lookupCache[searchString]) {
        return [...lookupCache[searchString]];
    }

    if (interaction.commandName === 'ammo') {
        lookupCache[searchString] = nameCache.filter(name => name.toLowerCase().replace(/\./g, '').includes(searchString.toLowerCase().replace(/\./g, '')));
    } else {
        lookupCache[searchString] = nameCache.filter(name => name.toLowerCase().includes(searchString.toLowerCase()));
    }

    return [...lookupCache[searchString]];
};

if (process.env.NODE_ENV !== 'ci') {
    setInterval(fillCache, 1000 * 60 * updateIntervalMinutes).unref();
} 

export {
    fillCache,
};

export default autocomplete;
