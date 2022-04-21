import graphqlRequest from "./graphql-request.mjs";

const getCraftsBarters = async () => {
    const query = `query {
        crafts {
          source
          duration
          requiredItems {
            item {
              id
              name
              iconLink
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
            attributes {
              type
              value
            }
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
        barters {
          source
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
    const response = await graphqlRequest({ graphql: query });

    return {
        crafts: response.data.crafts,
        barters: response.data.barters,
    };
};

export default getCraftsBarters;
