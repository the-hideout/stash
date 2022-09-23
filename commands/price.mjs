import { SlashCommandBuilder } from '@discordjs/builders';
import { MessageEmbed } from 'discord.js';

import getItemsByName from '../modules/get-items.mjs';
import lootTier from '../modules/loot-tier.js';
import progress from '../modules/progress-shard.mjs';
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
        try {
            response = await graphql_query(interaction, searchString);
        } catch (error) {
            console.log('/price command query error', error);
            throw error;
        }

        // If we failed to get a response from the graphql_query, return
        if (!response) {
            return;
        }

        let embeds = [];

        for (const item of response.data.items) {
            if (item.shortName.toLowerCase() !== searchString) {
                continue;
            }

            response.data.items = [item];
            break;
        }

        for (let i = 0; i < response.data.items.length; i = i + 1) {
            const item = response.data.items[i];
            const embed = new MessageEmbed();

            let body = "**Price and Item Details:**\n";
            embed.setTitle(item.name);
            embed.setURL(item.link);
            embed.setFooter({text: `🕑 Last Updated: ${moment(item.updated).fromNow()}`});

            const prog = await progress.getSafeProgress(interaction.user.id);

            embed.setThumbnail(item.iconLink);

            const size = parseInt(item.width) * parseInt(item.height);
            let bestTraderName = false;
            let bestTraderPrice = -1;

            for (const traderPrice of item.traderPrices) {
                if (traderPrice.priceRUB > bestTraderPrice) {
                    bestTraderPrice = traderPrice.priceRUB;
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

                embed.addFields({name: 'Flea Price (avg)', value: fleaPrice, inline: true});
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

                embed.addFields({name: 'Flea Price (low)', value: fleaPrice, inline: true});
                
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

                embed.addFields({name: 'Flea Price (optimal)', value: fleaPrice, inline: true});
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
                embed.addFields({name: bestTraderName + ' Value', value: traderVal, inline: true});
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

                let traderPrice = offer.priceRUB.toLocaleString() + "₽";
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
                embed.addFields({name: title, value: traderPrice, inline: true});
            }

            for (const b of item.bartersFor) {
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

                            let traderPrice = offer.priceRUB;

                            if ((traderPrice < itemCost && prog.traders[offer.vendor.trader.id] >= offer.vendor.minTraderLevel) || itemCost == 0) {
                                itemCost = traderPrice;
                            }
                        }

                        let bestSellPrice = 0;
                        for (const offer of req.item.sellFor) {
                            if (!offer.vendor.trader) {
                                continue;
                            }
                            if (offer.priceRUB > bestSellPrice) {
                                bestSellPrice = offer.priceRUB;
                            }
                        }

                        if (itemCost === 0) {
                            itemCost = bestSellPrice;
        
                            const isDogTag = req.attributes.some(att => att.name === 'minLevel');
                            if (isDogTag) {
                                const tagLevel = req.attributes.find(att => att.name === 'minLevel').value;
                                itemCost = bestSellPrice * tagLevel;
                            }
                        }

                        barterCost += itemCost * req.count;
                    }

                    barterCost = Math.round(barterCost / b.rewardItems[0].count).toLocaleString() + "₽";
                    const locked = prog.traders[b.trader.id] < b.level ? '🔒' : '';
                    const title = `${b.trader.name} LL${b.level} Barter${locked}`;
                    embed.addFields({name: title, value: barterCost, inline: true});
                }
            }

            for (const c of item.craftsFor) {
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

                            let traderPrice = offer.priceRUB;

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
                    embed.addFields({name: title, value: craftCost, inline: true});
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

        if (MAX_ITEMS < response.data.items.length) {
            const ending = new MessageEmbed();

            ending.setTitle("+" + (response.data.items.length - MAX_ITEMS) + " more");
            ending.setURL("https://tarkov.dev/?search=" + encodeURIComponent(searchString));

            let otheritems = '';
            for (let i = MAX_ITEMS; i < response.data.items.length; i = i + 1) {
                const itemname = `[${response.data.items[i].name}](${response.data.items[i].link})`;

                if (itemname.length + 2 + otheritems.length > 2048) {
                    ending.setFooter({text: `${response.data.items.length-i} additional results not shown.`,});

                    break;
                }

                otheritems += itemname + "\n";
            }

            ending.setDescription(otheritems);

            embeds.push(ending);
        }

        await interaction.editReply({ embeds: embeds });
    },
    examples: [
        '/price bitcoin'
    ]
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

    // Send the graphql query
    let response;
    try {
        response = await getItemsByName(searchString);//graphqlRequest({ graphql: query });
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

    // If we have errors, loop through and log them - Attempt to continue with execution
    if (response.hasOwnProperty('errors')) {
        for (const error of response.errors) {
            console.error("Item search error: " + error.message, JSON.stringify(error.locations, null, 4));
        }
    }

    // If we did not get usable data from the API, send a message and return
    if (!response.hasOwnProperty('data') || !response.data.hasOwnProperty('items')) {
        await interaction.deleteReply();
        await interaction.followUp({
            content: 'Got no data from the API (oh no)',
            ephemeral: true,
        });
        return false;
    }

    // If no items matched the search string, send a message and return
    if (response.data.items.length === 0) {
        await interaction.deleteReply();
        await interaction.followUp({
            content: `Found no matching items for "${searchString}"`,
            ephemeral: true,
        });
        return false;
    }

    // If everything else succeeded, return the API response
    return response;
}

export default defaultFunction;
