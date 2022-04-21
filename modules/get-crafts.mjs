import graphqlRequest from "./graphql-request.mjs";

const getCrafts = async () => {
    const craftsQuery = `query {
        crafts {
            source
            duration
            requiredItems {
                item {
                    id
                    name
                    avg24hPrice
                    lastLowPrice
                    buyFor {
                        source
                        price
                        currency
                        requirements {
                            type
                            value
                        }
                    }
                }
                count
            }
            rewardItems {
                item {
                    id
                    name
                    iconLink
                    link
                }
                count
            }
        }
    }`;

    const responses = await graphqlRequest({
        graphql: craftsQuery,
    });

    return responses[0].data.crafts;
};

export default getCrafts;
