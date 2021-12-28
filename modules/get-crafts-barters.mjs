import ttRequest from "./tt-request.mjs";

const getCraftsBarters = async () => {
    const craftsQuery = 'query { crafts { source duration requiredItems { item { id name avg24hPrice lastLowPrice buyFor { source price currency requirements { type value } } } count } rewardItems { item { id name iconLink link } count } } }';
    const bartersQuery = 'query { barters { source requiredItems { item { id name avg24hPrice lastLowPrice buyFor { source price currency requirements { type value } } } count } rewardItems { item { id name iconLink link } count } } }';
    const responses = await Promise.all([ttRequest({ graphql: craftsQuery }), ttRequest({ graphql: bartersQuery })]).catch(error => {
        console.error(`Barters query error: ${error.message}`);
    });

    return {
        crafts: responses[0].data.crafts,
        barters: responses[1].data.barters,
    };
};

export default getCraftsBarters;