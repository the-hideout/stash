import { SlashCommandBuilder } from '@discordjs/builders';
import { Message, MessageEmbed } from 'discord.js';

import graphqlRequest from '../modules/graphql-request.mjs';
import getCurrencies from '../modules/get-currencies.mjs';
import getCraftsBarters from '../modules/get-crafts-barters.mjs';
import lootTier from '../modules/loot-tier.js';
import progress from '../modules/progress.mjs';
import moment from 'moment';

const MAX_ITEMS = 2;

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('price')
        .setDescription('Replies with an item price')
        .addStringOption(option => {
            return option.setName('name')
                .setDescription('Item name to search for')
                .setAutocomplete(true)
                .setRequired(true);
        }),

    async execute(interaction) {
        await interaction.deferReply();
        // Get the search string from the user invoked command
        let searchString = interaction.options.getString('name');

        // Make a graphql query to get the item data from the API
        let response = false;
        let responses = false;
        try {
            responses = await Promise.all([graphql_query(interaction, searchString), getCraftsBarters()]);
            response = responses[0];
        } catch (error) {
            console.log('/price command query error', error);
            throw error;
        }

        // If we failed to get a response from the graphql_query, return
        if (!response) {
            return;
        }

        let embeds = [];

        const currencies = getCurrencies();
        const { crafts, barters } = responses[1];

        for (const item of response.data.itemsByName) {
            if (item.shortName.toLowerCase() !== searchString) {
                continue;
            }

            response.data.itemsByName = [item];
            break;
        }

        for (let i = 0; i < response.data.itemsByName.length; i = i + 1) {
            const item = response.data.itemsByName[i];
            const embed = new MessageEmbed();

            let body = "**Price and Item Details:**\n";
            embed.setTitle(item.name);
            embed.setURL(item.link);
            embed.setFooter({text: `🕑 Last Updated: ${moment(item.updated).fromNow()}`});

            const prog = progress.getSafeProgress(interaction.user.id);

            if (item.iconLink) {
                embed.setThumbnail(item.iconLink);
            } else {
                embed.setThumbnail(item.imageLink);
            }

            const size = parseInt(item.width) * parseInt(item.height);
            let bestTraderName = false;
            let bestTraderPrice = -1;

            for (const traderIndex in item.traderPrices) {
                const traderPrice = item.traderPrices[traderIndex];

                if (traderPrice.price > bestTraderPrice) {
                    bestTraderPrice = traderPrice.price;
                    bestTraderName = traderPrice.trader.name;
                }
            }

            let tierPrice = item.avg24hPrice;
            let tierFee = 0;
            let sellTo = 'Flea Market';
            if (item.avg24hPrice > 0) {
                tierFee = await progress.getFleaMarketFee(interaction.user.id, item.avg24hPrice, item.basePrice);
                //tierPrice -= avgFee;
                let fleaPrice = parseInt(item.avg24hPrice).toLocaleString() + "₽";

                if (size > 1) {
                    fleaPrice += "\r\n" + Math.round(parseInt(item.avg24hPrice) / size).toLocaleString() + "₽/slot";
                }
                fleaPrice += `\r\n\r\n Fee: ~${tierFee.toLocaleString()}₽`;
                fleaPrice += `\r\n Net: ${parseInt(item.avg24hPrice-tierFee).toLocaleString()}₽`;
                if (size > 1) {
                    fleaPrice += `\r\n ${Math.round(parseInt(item.avg24hPrice-tierFee) / size).toLocaleString()}₽/slot`;
                }

                embed.addField("Flea Price (avg)", fleaPrice, true);
            }

            if (item.lastLowPrice > 0) {
                const lowFee = await progress.getFleaMarketFee(interaction.user.id, item.lastLowPrice, item.basePrice);
                let fleaPrice = parseInt(item.lastLowPrice).toLocaleString() + "₽";

                if (size > 1) {
                    fleaPrice += "\r\n" + Math.round(parseInt(item.lastLowPrice) / size).toLocaleString() + "₽/slot";
                }
                fleaPrice += `\r\n\r\n Fee: ~${lowFee.toLocaleString()}₽`;
                fleaPrice += `\r\n Net: ${parseInt(item.lastLowPrice-lowFee).toLocaleString()}₽`;
                if (size > 1) {
                    fleaPrice += `\r\n ${Math.round(parseInt(item.lastLowPrice-lowFee) / size).toLocaleString()}₽/slot`;
                }

                embed.addField("Flea Price (low)", fleaPrice, true);
                
                if (item.lastLowPrice < tierPrice || tierPrice == 0) {
                    tierPrice = item.lastLowPrice;
                    tierFee = lowFee;
                }
            }

            const optimalPrice = await progress.getOptimalFleaPrice(interaction.user.id, item.basePrice);
            const optimalFee = await progress.getFleaMarketFee(interaction.user.id, optimalPrice, item.basePrice);
            if (optimalPrice - optimalFee > tierPrice - tierFee && optimalPrice < tierPrice) {
                tierPrice = optimalPrice;
                tierFee = optimalFee;

                let fleaPrice = parseInt(optimalPrice).toLocaleString() + "₽";

                if (size > 1) {
                    fleaPrice += "\r\n" + Math.round(parseInt(optimalPrice) / size).toLocaleString() + "₽/slot";
                }
                fleaPrice += `\r\n\r\n Fee: ~${optimalFee.toLocaleString()}₽`;
                fleaPrice += `\r\n Net: ${parseInt(optimalPrice-optimalFee).toLocaleString()}₽`;
                if (size > 1) {
                    fleaPrice += `\r\n ${Math.round(parseInt(optimalPrice-optimalFee) / size).toLocaleString()}₽/slot`;
                }

                embed.addField("Flea Price (optimal)", fleaPrice, true);
            }

            if (bestTraderName) {
                if (bestTraderPrice > (tierPrice - tierFee)) {
                    tierPrice = bestTraderPrice;
                    tierFee = 0;
                    sellTo = bestTraderName;
                }
                let traderVal = bestTraderPrice.toLocaleString() + "₽";

                if (size > 1) {
                    traderVal += "\r\n" + Math.round(bestTraderPrice / size).toLocaleString() + "₽/slot";
                }
                embed.addField(bestTraderName + " Value", traderVal, true);
            }

            body += `• Sell to: \`${sellTo}\` for \`${tierPrice.toLocaleString() + "₽"}\`\n`;

            // Calculate item tier
            let tier = lootTier(tierPrice / (item.width * item.height), item.types.includes('noFlea'));
            embed.setColor(tier.color);
            body += `• Item Tier: ${tier.msg}\n`;

            for (const offer of item.buyFor) {
                if (!offer.vendor.trader) {
                    continue;
                }

                let traderPrice = (parseInt(offer.price) * currencies[offer.currency]).toLocaleString() + "₽";
                let level = 1;
                let quest = '';

                if (offer.vendor.minTraderLevel) {
                    level = offer.vendor.minTraderLevel;
                }
                if (offer.vendor.taskUnlock) {
                    quest = ' +Task';
                }

                const locked = prog.traders[offer.vendor.trader.id] < level ? '🔒' : '';
                const title = `${offer.vendor.name} LL${level}${quest} Price${locked}`;
                embed.addField(title, traderPrice, true);
            }

            for (const b of barters) {
                if (b.rewardItems[0].item.id == item.id) {
                    let barterCost = 0;

                    for (const req of b.requiredItems) {
                        let itemCost = req.item.avg24hPrice;

                        if (req.item.lastLowPrice > itemCost && req.item.lastLowPrice > 0) {
                            itemCost = req.item.lastLowPrice;
                        }

                        for (const offer of req.item.buyFor) {
                            if (!offer.vendor.trader) {
                                continue;
                            }

                            let traderPrice = offer.price * currencies[offer.currency];

                            if ((traderPrice < itemCost && prog.traders[offer.vendor.trader.id] >= offer.vendor.minTraderLevel) || itemCost == 0) {
                                itemCost = traderPrice;
                            }
                        }

                        barterCost += itemCost * req.count;
                    }

                    barterCost = Math.round(barterCost / b.rewardItems[0].count).toLocaleString() + "₽";
                    const locked = prog.traders[b.trader.id] < b.level ? '🔒' : '';
                    const title = `${b.trader.name} LL${b.level} Barter${locked}`;
                    embed.addField(title, barterCost, true);
                }
            }

            for (const c of crafts) {
                if (c.rewardItems[0].item.id == item.id) {
                    let craftCost = 0;

                    for (const req of c.requiredItems) {
                        let itemCost = req.item.avg24hPrice;

                        if (req.item.lastLowPrice > itemCost && req.item.lastLowPrice > 0) {
                            itemCost = req.item.lastLowPrice;
                        }

                        for (const offer of req.item.buyFor) {
                            if (!offer.vendor.trader) {
                                continue;
                            }

                            let traderPrice = offer.price * currencies[offer.currency];

                            if ((traderPrice < itemCost && prog.traders[offer.vendor.trader.id] >= offer.vendor.minTraderLevel) || itemCost == 0) {
                                itemCost = traderPrice;
                            }
                        }
                        craftCost += itemCost * req.count;
                    }
                    craftCost = Math.round(craftCost / c.rewardItems[0].count).toLocaleString() + "₽";
                    if (c.rewardItems[0].count > 1) {
                        craftCost += ' (' + c.rewardItems[0].count + ')';
                    }

                    const locked = prog.hideout[c.station.id] < c.level ? '🔒' : '';
                    const title = `${c.station.name} level ${c.level} Craft${locked}`;
                    embed.addField(title, craftCost, true);
                }
            }

            if (embed.fields.length == 0) {
                embed.setDescription('No prices available.');
            }

            // Add the item weight
            try {
                body += `• Weight: \`${item.weight} kg\`\n`;
            } catch (e) {
                console.log(e);
                body += `• Weight: \`failed to get item weight\`\n`;
            }
            

            // Add the item description
            embed.setDescription(body);

            embeds.push(embed);

            if (i >= MAX_ITEMS - 1) {
                break;
            }
        }

        if (MAX_ITEMS < response.data.itemsByName.length) {
            const ending = new MessageEmbed();

            ending.setTitle("+" + (response.data.itemsByName.length - MAX_ITEMS) + " more");
            ending.setURL("https://tarkov.dev/?search=" + encodeURIComponent(searchString));

            let otheritems = '';
            for (let i = MAX_ITEMS; i < response.data.itemsByName.length; i = i + 1) {
                const itemname = response.data.itemsByName[i].name;

                if (itemname.length + 4 + otheritems.length > 2048) {
                    ending.setFooter({text: "Not all results shown."});

                    break;
                }

                otheritems += itemname + "\r\n";
            }

            ending.setDescription(otheritems);

            embeds.push(ending);
        }

        await interaction.editReply({ embeds: embeds });
    },
};

// A helper function to make a graphql query to get item data from the API
// :param interaction: The interaction object to edit the reply with
// :param searchString: The search string to search for via the graphql API
// :return response: The graphql response object - False (bool) if anything fails
async function graphql_query(interaction, searchString) {
    // If no search string is provided, send a message and return
    if (!searchString) {
        await interaction.deleteReply();
        await interaction.followUp({
            content: 'You need to specify a search term',
            ephemeral: true,
        });
        return false;
    }

    // Sanitize the search string for the graphql query
    searchString = searchString.toLowerCase().trim();
    searchString = searchString.replaceAll('\\', '\\\\').replaceAll('\"', '\\"');

    const query = `query {
        itemsByName(name: "${searchString}") {
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
                trader {
                    id
                    name
                }
            }
            buyFor {
                price
                currency
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
        }
    }`;

    // Send the graphql query
    let response;
    try {
        response = await graphqlRequest({ graphql: query });
    } catch (error) {
        // If an error occured -> log it, send a response to the user, and exit
        console.error(error);
        await interaction.deleteReply();
        await interaction.followUp({
            content: 'An error occured while trying to contact api.tarkov.dev',
            ephemeral: true,
        });
        return false;
    }

    // If we did not get usable data from the API, send a message and return
    if (!response.hasOwnProperty('data') || !response.data.hasOwnProperty('itemsByName')) {
        await interaction.deleteReply();
        await interaction.followUp({
            content: 'Got no data from the API (oh no)',
            ephemeral: true,
        });
        return false;
    }

    // If we have errors, loop through and log them - Attempt to continue with execution
    if (response.hasOwnProperty('errors')) {
        for (const errorIndex in response.errors) {
            console.error("Item search error: " + response.errors[errorIndex].message);
        }
    }

    // If no items matched the search string, send a message and return
    if (response.data.itemsByName.length === 0) {
        await interaction.deleteReply();
        await interaction.followUp({
            content: 'Your search term matched no items',
            ephemeral: true,
        });
        return false;
    }

    // If everything else succeeded, return the API response
    return response;
}

export default defaultFunction;
