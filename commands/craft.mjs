import { SlashCommandBuilder } from '@discordjs/builders';
import {
    MessageEmbed,
} from 'discord.js';

import getCurrencies from '../modules/get-currencies.mjs';
import getCraftsBarters from '../modules/get-crafts-barters.mjs';
import progress from '../modules/progress.mjs';

const MAX_CRAFTS = 2;

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('craft')
        .setDescription('Find crafts with a specific item')
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
            await interaction.editReply({
                content: 'You need to specify a search term',
                ephemeral: true,
            });

            return true;
        }

        console.log(`Craft ${searchString}`);

        const matchedCrafts = [];

        const { crafts } = await getCraftsBarters();
        const currencies = getCurrencies();

        for (const id in crafts) {
            const craft = crafts[id];

            if (craft.rewardItems[0].item.name.toLowerCase().includes(searchString.toLowerCase())) {
                matchedCrafts.push(craft);
                continue;
            }

            for (const requiredItems of craft.requiredItems) {
                if (requiredItems.item.name.toLowerCase().includes(searchString.toLowerCase())) {
                    matchedCrafts.push(craft);
                    break;
                }
            }
        }

        if (matchedCrafts.length === 0) {
            await interaction.deleteReply();
            await interaction.followUp({
                content: 'Found no matching crafts for that item',
                ephemeral: true,
            });

            return true;
        }

        let embeds = [];

        const prog = progress.getSafeProgress(interaction.user.id);

        for (let i = 0; i < matchedCrafts.length; i = i + 1) {
            const craft = matchedCrafts[i];
            let totalCost = 0;
            const embed = new MessageEmbed();
            const toolsEmbed = new MessageEmbed();
            toolsEmbed.setTitle('Required Tools 🛠️');
            let toolCost = 0;

            let title = craft.rewardItems[0].item.name;

            if (craft.rewardItems[0].count > 1) {
                title += " (" + craft.rewardItems[0].count + ")";
            }

            const measuredTime = new Date(null);
            let timeDiscount = prog.skills['crafting']*0.0075*craft.duration;
            measuredTime.setSeconds(craft.duration - timeDiscount);
            const locked = prog.hideout[craft.station.id] < craft.level ? '🔒' : '';
            title += `\r\n${craft.station.name} (${measuredTime.toISOString().substr(11, 8)})${locked}`;
            embed.setTitle(title);
            embed.setURL(`${craft.rewardItems[0].item.link}#${i}`);

            if (craft.rewardItems[0].item.iconLink) {
                embed.setThumbnail(craft.rewardItems[0].item.iconLink);
            }

            for (const req of craft.requiredItems) {
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

                let isTool = false;
                for (let i = 0; i < req.attributes.length; i++) {
                    if (req.attributes[i].type === 'tool') {
                        isTool = true;
                        break;
                    }
                }
                if (isTool) {
                    toolCost += itemCost * req.count;
                    toolsEmbed.addField(req.item.name, itemCost.toLocaleString() + "₽ x " + req.count, true);
                    if(!toolsEmbed.thumbnail) {
                        toolsEmbed.setThumbnail(req.item.iconLink);
                    }
                    continue;
                }
                let quantity = req.count;
                // water filter consumption rate reduction
                if (craft.station.id === '5d484fc8654e760065037abf' && req.item.id === '5d1b385e86f774252167b98a') {
                    let time = prog.skills['crafting']*0.0075*quantity;
                    let consumption = prog.skills['hideoutManagement']*0.005*quantity;
                    quantity = Math.round((quantity - time - consumption) * 100) /100;
                }
                totalCost += itemCost * quantity;
                //totalCost += req.item.avg24hPrice * req.count;
                embed.addField(req.item.name, itemCost.toLocaleString() + "₽ x " + quantity, true);
            }
            embed.addField("Total", totalCost.toLocaleString() + "₽", false);

            embeds.push(embed);
            if (toolsEmbed.fields.length > 0) {
                toolsEmbed.addField("Total", toolCost.toLocaleString() + "₽", false);
                embeds.push(toolsEmbed);
            }

            if (i == MAX_CRAFTS - 1) {
                break;
            }
        }

        if (matchedCrafts.length > MAX_CRAFTS) {
            const ending = new MessageEmbed();

            ending.setTitle("+" + (matchedCrafts.length - MAX_CRAFTS) + " more");
            ending.setURL("https://tarkov.dev/hideout-profit/?search=" + encodeURIComponent(searchString));

            let otheritems = '';

            for (let i = MAX_CRAFTS; i < matchedCrafts.length; i = i + 1) {
                const bitemname = matchedCrafts[i].rewardItems[0].item.name + " (" + matchedCrafts[i].source + ")";

                if (bitemname.length + 4 + otheritems.length > 2048) {
                    embed.setFooter({ text: "Not all results shown." });

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
