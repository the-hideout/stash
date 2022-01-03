import ttRequest from "./tt-request.mjs";

let nameCache = false;
let lookupCache = {};

async function fillCache(){
    if(nameCache){
        return true;
    }

    console.log('Filling autocomplete cache');
    console.time('fill-autocomplete-cache');
    try {
        const itemNamesResponse = await ttRequest({
            graphql: `query {
                itemsByType(type: any) {
                    name
                }
            }`
        });

        nameCache = itemNamesResponse.data.itemsByType.map(item => item.name);
    } catch (requestError){
        console.error(requestError);
    }

    console.timeEnd('fill-autocomplete-cache');
};

function autocomplete(interaction){
    // const searchString = 'm4a1';
    let searchString;
    try {
        searchString = interaction.options.getString('name');
    } catch(getError){
        console.error(getError);
    }

    if(lookupCache[searchString]){
        return [...lookupCache[searchString]];
    }

    lookupCache[searchString] = nameCache.filter(name => name.toLowerCase().includes(searchString.toLowerCase()));

    return [...lookupCache[searchString]];
};

export {
    fillCache,
};

export default autocomplete;