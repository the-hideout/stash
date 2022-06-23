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
    let cacheFilled = true;
    for (const cacheName in caches) {
        if (!caches[cacheName].nameCache) {
            cacheFilled = false;
            break;
        }
    }
    if (cacheFilled) {
        return true;
    }

    console.log('Filling autocomplete cache');
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

        const barterResponse = await graphqlRequest({
            graphql: `query {
                barters {
                    rewardItems {
                        item {
                            name
                        }
                    }
                    requiredItems {
                        item {
                            name
                        }
                    }
                }
            }`
        });

        caches.barter.nameCache = [];
        barterResponse.data.barters.map(barter => {
            caches.barter.nameCache = [...new Set([...caches.barter.nameCache, ...[...new Set([...barter.rewardItems.map(item => item.item.name), ...barter.requiredItems.map(item => item.item.name)])]])];
            return;
        });
        caches.barter.nameCache.sort();

        const craftResponse = await graphqlRequest({
            graphql: `query {
                crafts {
                    rewardItems {
                        item {
                            name
                        }
                    }
                    requiredItems {
                        item {
                            name
                        }
                    }
                }
            }`
        });

        caches.craft.nameCache = [];
        craftResponse.data.crafts.map(craft => {
            caches.craft.nameCache = [...new Set([...caches.craft.nameCache, ...[...new Set([...craft.rewardItems.map(item => item.item.name), ...craft.requiredItems.map(item => item.item.name)])]])];
            return;
        });
        caches.craft.nameCache.sort();
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

export {
    fillCache,
};

export default autocomplete;
