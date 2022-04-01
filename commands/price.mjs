import { SlashCommandBuilder } from '@discordjs/builders';
import {
    MessageEmbed,
} from 'discord.js';

import ttRequest from '../modules/tt-request.mjs';
import getCurrencies from '../modules/get-currencies.mjs';
import getCraftsBarters from '../modules/get-crafts-barters.mjs';
import colors from '../modules/colors.js';

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
        let searchString = interaction.options.getString('name');

        if (!searchString) {
            await interaction.editReply({
                content: 'You need to specify a search term',
                ephemeral: true,
            });

            return true;
        }

        searchString = searchString.toLowerCase().trim();
        
        // Sanitize for graphql query
        searchString = searchString.replaceAll('\\', '\\\\').replaceAll('\"', '\\"')

        console.log(`price ${searchString}`);

        const query = `query {
            itemsByName(name: "${searchString}") {
                id
                name
                normalizedName
                shortName
                updated
                width
                height
                iconLink
                imageLink
                link
                avg24hPrice
                traderPrices {
                    price
                    trader {
                        id
                        name
                    }
                }
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
        }`;
        let response;
        try {
            response = await ttRequest({ graphql: query });
        } catch (error) {
            console.error(error);
        }

        if (!response.hasOwnProperty('data') || !response.data.hasOwnProperty('itemsByName')) {
            console.log('Got no data');

            return false;
        }

        if (response.hasOwnProperty('errors')) {
            for (const errorIndex in response.errors) {
                console.error("Item search error: " + response.errors[errorIndex].message);
            }
        }

        if (response.data.itemsByName.length === 0) {
            await interaction.editReply({
                content: 'Your search term matched no items',
                ephemeral: true,
            });

            return true;
        }

        let embeds = [];

        const currencies = await getCurrencies();
        const { crafts, barters } = await getCraftsBarters();

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
            embed.setFooter(`Last Updated: ${item.updated}`);


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

            if (item.avg24hPrice > 0) {
                let fleaPrice = parseInt(item.avg24hPrice).toLocaleString() + "₽";

                if (size > 1) {
                    fleaPrice += "\r\n" + Math.round(parseInt(item.avg24hPrice) / size).toLocaleString() + "₽/slot";
                }
                embed.addField("Flea Price (avg)", fleaPrice, true);
            }

            if (item.lastLowPrice > 0) {
                let fleaPrice = parseInt(item.lastLowPrice).toLocaleString() + "₽";

                if (size > 1) {
                    fleaPrice += "\r\n" + Math.round(parseInt(item.avg24hPrice) / size).toLocaleString() + "₽/slot";
                }
                embed.addField("Flea Price (low)", fleaPrice, true);
            }

            if (bestTraderName) {
                let traderVal = bestTraderPrice.toLocaleString() + "₽";

                body += `• Sell to: \`${bestTraderName}\` for \`${traderVal}\`\n`;

                // Calculate item tier
                var tier = get_item_tier(bestTraderPrice);
                embed.setColor(tier.color);
                body += `• Item Tier: ${tier.msg}\n`;

                if (size > 1) {
                    traderVal += "\r\n" + Math.round(bestTraderPrice / size).toLocaleString() + "₽/slot";
                }
                embed.addField(bestTraderName + " Value", traderVal, true);
            }

            for (const offerindex in item.buyFor) {
                const offer = item.buyFor[offerindex];

                if (offer.source == 'fleaMarket') {
                    continue;
                }

                let traderPrice = (parseInt(offer.price) * currencies[offer.currency]).toLocaleString() + "₽";
                let level = 1;
                let quest = '';

                for (const reqindex in offer.requirements) {
                    const req = offer.requirements[reqindex];

                    if (req.type == 'loyaltyLevel') {
                        level = req.value;
                    } else if (req.type == 'questCompleted') {
                        quest = req.value;
                    }
                }

                if (quest) {
                    quest = ' +Task';
                }

                let trader = offer.source.charAt(0).toUpperCase() + offer.source.slice(1);

                embed.addField(`${trader} LL${level}${quest} Price`, traderPrice);
            }

            for (const barterIndex in barters) {
                const b = barters[barterIndex];

                if (b.rewardItems[0].item.id == item.id) {
                    let barterCost = 0;

                    for (const reqIndex in b.requiredItems) {
                        const req = b.requiredItems[reqIndex];
                        let itemCost = req.item.avg24hPrice;

                        if (req.item.lastLowPrice > itemCost && req.item.lastLowPrice > 0) {
                            itemCost = req.item.lastLowPrice;
                        }

                        for (const offerindex in req.item.buyFor) {
                            const offer = req.item.buyFor[offerindex];

                            if (offer.source == 'fleaMarket') {
                                continue;
                            }

                            let traderPrice = offer.price * currencies[offer.currency];

                            if (traderPrice < itemCost || itemCost == 0) {
                                itemCost = traderPrice;
                            }
                        }

                        barterCost += itemCost * req.count;
                    }

                    barterCost = Math.round(barterCost / b.rewardItems[0].count).toLocaleString() + "₽";
                    embed.addField(b.source + " Barter", barterCost, true);
                }
            }

            for (const craftIndex in crafts) {
                const c = crafts[craftIndex];

                if (c.rewardItems[0].item.id == item.id) {
                    let craftCost = 0;

                    for (const reqIndex in c.requiredItems) {
                        const req = c.requiredItems[reqIndex];
                        let itemCost = req.item.avg24hPrice;

                        if (req.item.lastLowPrice > itemCost && req.item.lastLowPrice > 0) {
                            itemCost = req.item.lastLowPrice;
                        }

                        for (const offerindex in req.item.buyFor) {
                            const offer = req.item.buyFor[offerindex];

                            if (offer.source == 'fleaMarket') {
                                continue;
                            }

                            let traderPrice = offer.price * currencies[offer.currency];

                            if (traderPrice < itemCost || itemCost == 0) {
                                itemCost = traderPrice;
                            }
                        }
                        craftCost += itemCost * req.count;
                    }
                    craftCost = Math.round(craftCost / c.rewardItems[0].count).toLocaleString() + "₽";
                    if (c.rewardItems[0].count > 1) {
                        craftCost += ' (' + c.rewardItems[0].count + ')';
                    }

                    embed.addField(c.source + " Craft", craftCost, true);
                }
            }

            if (embed.fields.length == 0) {
                embed.setDescription('No prices available.');
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
                    ending.setFooter("Not all results shown.");

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

function get_item_tier(price) {
    var color;
    var tier_msg;
    if (price >= 25000) {
        color = colors.yellow;
        tier_msg = "⭐ Legendary ⭐";
    } else if (price >= 12500) {
        color = colors.green;
        tier_msg = "🟢 Great";
    } else if (price >= 8000) {
        color = colors.blue;
        tier_msg = "🔵 Average";
    } else {
        color = colors.red;
        tier_msg = "🔴 Poor";
    }

    return { color: color, msg: tier_msg };

}

export default defaultFunction;
