import graphqlRequest from "./graphql-request.mjs";

const getCraftsBarters = async () => {
    const query = `query {
        crafts {
          station {
            id
            name
          }
          level
          duration
          requiredItems {
            item {
              id
              name
              iconLink
              avg24hPrice
              lastLowPrice
              link
              buyFor {
                price
                currency
                priceRUB
                vendor {
                  name
                  ...on TraderOffer {
                    trader {
                      id
                    }
                    minTraderLevel
                    taskUnlock {
                      id
                    }
                  }
                }
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
          trader {
            id
            name
          }
          level
          taskUnlock {
            id
          }
          requiredItems {
            item {
              id
              name
              avg24hPrice
              lastLowPrice
              link
              buyFor {
                price
                currency
                priceRUB
                vendor {
                  name
                  ...on TraderOffer {
                    trader {
                      id
                    }
                    minTraderLevel
                    taskUnlock {
                      id
                    }
                  }
                }
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
