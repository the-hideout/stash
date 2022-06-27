import graphqlRequest from "./graphql-request.mjs";

const getItemsByName = async (searchString) => {
    // Sanitize the search string for the graphql query
    searchString = searchString.toLowerCase().trim();
    searchString = searchString.replaceAll('\\', '\\\\').replaceAll('\"', '\\"');
    const itemsQuery = `query {
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
            category {
                name
                id
            }
            properties {
                ...on ItemPropertiesAmmo {
                    caliber
                    penetrationPower
                    damage
                    armorDamage
                    fragmentationChance
                    initialSpeed
                }
                ...on ItemPropertiesStim {
                    cures
                    stimEffects {
                        type
                        chance
                        delay
                        duration
                        value
                        percent
                        skillName
                    }
                }
            }
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
                id
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
                id
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
        graphql: itemsQuery,
    });
};

export default getItemsByName;
