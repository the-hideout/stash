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
                ...on ItemPropertiesWeapon {
                    defaultPreset {
                        iconLink
                        width
                        height
                        traderPrices {
                            price
                            priceRUB
                            currency
                            trader {
                                id
                                name
                            }
                        }
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
    const response = await graphqlRequest({
        graphql: itemsQuery,
    });
    response.data?.items.forEach(item => {
        if (item.properties?.defaultPreset) {
            item.iconLink = item.properties.defaultPreset.iconLink;
            item.bartersFor.forEach(barter => {
                barter.rewardItems[0].item.iconLink = item.properties.defaultPreset.iconLink;
            });
            item.bartersUsing.forEach(barter => {
                barter.requiredItems.forEach(req => {
                    if (req.item.id === item.id) {
                        req.item.iconLink = item.properties.defaultPreset.iconLink;
                    }
                });
            });
            item.craftsFor.forEach(craft => {
                craft.rewardItems[0].item.iconLink = item.properties.defaultPreset.iconLink;
            });
            item.craftsUsing.forEach(craft => {
                craft.requiredItems.forEach(req => {
                    if (req.item.id === item.id) {
                        req.item.iconLink = item.properties.defaultPreset.iconLink;
                    }
                });
            });
            item.width = item.properties.defaultPreset.width;
            item.height = item.properties.defaultPreset.height;
            item.traderPrices = item.properties.defaultPreset.traderPrices;
        }
    });
    return response;
};

export default getItemsByName;
