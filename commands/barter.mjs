import { SlashCommandBuilder } from '@discordjs/builders';
import {
    MessageEmbed,
} from 'discord.js';

import getCurrencies from '../modules/get-currencies.mjs';
import getCraftsBarters from '../modules/get-crafts-barters.mjs';

const MAX_BARTERS = 2;

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
        const searchString = interaction.options.getString('name');

        if (!searchString) {
            await interaction.editReply({
                content: 'You need to specify a search term',
                ephemeral: true,
            });

            return true;
        }

        console.log(`barter ${searchString}`);

        const matchedBarters = [];

        const { barters } = await getCraftsBarters();
        const currencies = await getCurrencies();

        for (const bid in barters) {
            const barter = barters[bid];

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
            await interaction.editReply({
                content: 'Found no matching barters for that item',
                ephemeral: true,
            });

            return true;
        }

        let embeds = [];

        for (let i = 0; i < matchedBarters.length; i = i + 1) {
            const barter = matchedBarters[i];
            let totalCost = 0;
            const embed = new MessageEmbed();

            let title = barter.rewardItems[0].item.name;

            if (barter.rewardItems[0].count > 1) {
                title += " (" + barter.rewardItems[0].count + ")";
            }

            title += "\r\n" + barter.source;
            embed.setTitle(title);
            embed.setURL(`${barter.rewardItems[0].item.link}#${i}`);

            if (barter.rewardItems[0].item.iconLink) {
                embed.setThumbnail(barter.rewardItems[0].item.iconLink);
            }

            for (const ri in barter.requiredItems) {
                const req = barter.requiredItems[ri];
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

                totalCost += itemCost * req.count;
                embed.addField(req.item.name, itemCost.toLocaleString() + "₽ x " + req.count, true);
            }

            embed.addField("Total", totalCost.toLocaleString() + "₽", true);

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
                const bitemname = matchedBarters[i].rewardItems[0].item.name + " (" + matchedBarters[i].source + ")";

                if (bitemname.length + 4 + otheritems.length > 2048) {
                    ending.setFooter({text: "Not all results shown.",});
                    break;
                }
                otheritems += bitemname + "\r\n";
            }
            ending.setDescription(otheritems);

            embeds.push(ending);
        }

        await interaction.editReply({ embeds: embeds });
    },
};

export default defaultFunction;
