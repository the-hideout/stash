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

async function fillCache() {
    console.time('Fill-autocomplete-cache');
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

        caches.default.nameCache = itemNamesResponse.data.items.map(item => item.name);

        caches.ammo.nameCache = itemNamesResponse.data.items.filter(item => {
            return item.category.id === '5485a8684bdc2da71d8b4567';
        }).map(item => {
            return item.name;
        });
        caches.ammo.nameCache.sort();

        caches.stim.nameCache = itemNamesResponse.data.items.filter(item => {
            return item.category.id === '5448f3a64bdc2d60728b456a';
        }).map(item => {
            return item.name;
        });
        caches.stim.nameCache.sort();

        let barterNameCache = [];
        itemNamesResponse.data.items.filter(item => {
            return item.bartersFor.length > 0 || item.bartersUsing.length > 0;
        }).forEach(item => {
            barterNameCache = [...new Set([...barterNameCache, item.name])];
        });
        barterNameCache.sort();
        caches.barter.nameCache = barterNameCache;

        let craftNameCache = [];
        itemNamesResponse.data.items.filter(item => {
            return item.craftsFor.length > 0 || item.craftsUsing.length > 0;
        }).forEach(item => {
            craftNameCache = [...new Set([...craftNameCache, item.name])];
            return;
        });
        craftNameCache.sort();
        caches.craft.nameCache = craftNameCache;
    } catch (requestError) {
        console.error(requestError);
    }

    console.timeEnd('Fill-autocomplete-cache');
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

let updateInterval = false;
if (process.env.NODE_ENV !== 'ci') {
    console.log('setting interval');
    updateInterval = setInterval(() => fillCache(), 1000 * 60 * 10);
    updateInterval.unref();
} 

export {
    fillCache,
};

export default autocomplete;
