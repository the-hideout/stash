import { SlashCommandBuilder } from '@discordjs/builders';
import { MessageEmbed } from 'discord.js';

import getCraftsBarters from '../modules/get-crafts-barters.mjs';
import progress from '../modules/progress.mjs';

const MAX_BARTERS = 3;

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('barter')
        .setDescription('Find barters with a specific item')
        .addStringOption(option => {
            return option.setName('name')
                .setDescription('Item name to search for')
                .setAutocomplete(true)
                .setRequired(true);
        }),
    async execute(interaction) {
        await interaction.deferReply();
        const searchString = interaction.options.getString('name');

        if (!searchString) {
            await interaction.deleteReply();
            await interaction.followUp({
                content: 'You need to specify a search term',
                ephemeral: true,
            });

            return true;
        }

        const matchedBarters = [];

        const { barters } = await getCraftsBarters();

        for (const barter of barters) {
            if (barter.rewardItems[0].item.name.toLowerCase().includes(searchString.toLowerCase())) {
                matchedBarters.push(barter);
                continue;
            }

            for (const requiredItems of barter.requiredItems) {
                if (requiredItems.item.name.toLowerCase().includes(searchString.toLowerCase())) {
                    matchedBarters.push(barter);
                    break;
                }
            }
        }

        if (matchedBarters.length === 0) {
            await interaction.deleteReply();
            await interaction.followUp({
                content: 'Found no matching barters for that item',
                ephemeral: true,
            });

            return true;
        }

        let embeds = [];

        const prog = progress.getSafeProgress(interaction.user.id);

        for (let i = 0; i < matchedBarters.length; i = i + 1) {
            const barter = matchedBarters[i];
            let totalCost = 0;
            const embed = new MessageEmbed();

            let title = barter.rewardItems[0].item.name;

            if (barter.rewardItems[0].count > 1) {
                title += " (" + barter.rewardItems[0].count + ")";
            }

            const locked = prog.traders[barter.trader.id] < barter.level ? '🔒' : '';
            title += `\r\n ${barter.trader.name} LL${barter.level}${locked}`;
            embed.setTitle(title);
            embed.setURL(`${barter.rewardItems[0].item.link}#${i}`);

            if (barter.rewardItems[0].item.iconLink) {
                embed.setThumbnail(barter.rewardItems[0].item.iconLink);
            }

            for (const req of barter.requiredItems) {
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

                let reqName = req.item.name;
                if (itemCost === 0) {
                    itemCost = bestSellPrice;

                    const isDogTag = req.attributes.some(att => att.name === 'minLevel');
                    if (isDogTag) {
                        const tagLevel = req.attributes.find(att => att.name === 'minLevel').value;
                        itemCost = bestSellPrice * tagLevel;
                        reqName += ' >= '+tagLevel;
                    }
                }

                totalCost += itemCost * req.count;
                embed.addField(reqName, itemCost.toLocaleString() + "₽ x " + req.count, true);
            }

            embed.addField("Total", totalCost.toLocaleString() + "₽", false);

            embeds.push(embed);

            if (i == MAX_BARTERS - 1) {
                break;
            }
        }

        if (matchedBarters.length > MAX_BARTERS) {
            const ending = new MessageEmbed();

            ending.setTitle("+" + (matchedBarters.length - MAX_BARTERS) + " more");
            ending.setURL("https://tarkov.dev/barters/?search=" + encodeURIComponent(searchString));

            let otheritems = '';

            for (let i = MAX_BARTERS; i < matchedBarters.length; i = i + 1) {
                const bitemname = `[${matchedBarters[i].rewardItems[0].item.name}](${matchedBarters[i].rewardItems[0].item.link}) (${matchedBarters[i].trader.name} LL${matchedBarters[i].level})`;

                if (bitemname.length + 2 + otheritems.length > 2048) {
                    ending.setFooter({text: `${matchedBarters.length-i} additional results not shown.`,});
                    break;
                }
                otheritems += bitemname + "\n";
            }
            ending.setDescription(otheritems);

            embeds.push(ending);
        }

        await interaction.editReply({ embeds: embeds });
    },
    examples: '/barter slick'
};

export default defaultFunction;
