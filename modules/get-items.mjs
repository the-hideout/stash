import graphqlRequest from "./graphql-request.mjs";

const getItemsByName = async (searchString) => {
    const craftsQuery = `query {
        items(name: "${searchString}") {
            id
            name
            shortName
            updated
            width
            height
            weight
            iconLink
            imageLink
            link
            avg24hPrice
            lastLowPrice
            traderPrices {
                price
                priceRUB
                currency
                trader {
                    id
                    name
                }
            }
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
            }
            types
            basePrice
            craftsFor {
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
                        basePrice
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
            craftsUsing {
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
                        basePrice
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
            bartersFor {
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
                        basePrice
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
                        sellFor {
                            price
                            currency
                            priceRUB
                            vendor {
                                name
                                ...on TraderOffer {
                                    trader {
                                        id
                                    }
                                }
                            }
                        }
                    }
                    attributes {
                        name
                        value
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
            bartersUsing {
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
                        basePrice
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
                        sellFor {
                            price
                            currency
                            priceRUB
                            vendor {
                                name
                                ...on TraderOffer {
                                    trader {
                                        id
                                    }
                                }
                            }
                        }
                    }
                    attributes {
                        name
                        value
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
        }
    }`;

    return graphqlRequest({
        graphql: craftsQuery,
    });
};

export default getItemsByName;
