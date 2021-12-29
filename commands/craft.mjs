import { SlashCommandBuilder } from '@discordjs/builders';
import {
    MessageEmbed,
} from 'discord.js';

import getCurrencies from '../modules/get-currencies.mjs';
import getCraftsBarters from '../modules/get-crafts-barters.mjs';

const MAX_CRAFTS = 2;

const defaultFunction = {
	data: new SlashCommandBuilder()
		.setName('craft')
		.setDescription('Find crafts with a specific item')
        .addStringOption(option => option.setName('name').setDescription('Item name to search for')),
	async execute(interaction) {
        const searchString = interaction.options.getString('name');

        if(!searchString){
            await interaction.reply({
                content: 'You need to specify a search term',
                ephemeral: true,
            });

            return true;
        }

        console.log(`craft ${searchString}`);

        const matchedCrafts = [];

        const {crafts} = await getCraftsBarters();
        const currencies = await getCurrencies();

        for (const id in crafts) {
            const craft = crafts[id];

            if (craft.rewardItems[0].item.name.toLowerCase().includes(searchString)) {
                matchedCrafts.push(craft);
            }
        }

        if(matchedCrafts.length === 0){
            await interaction.reply({
                content: 'Found no matching crafts for that item',
                ephemeral: true,
            });

            return true;
        }

        let embeds = [];

        for (let i = 0; i < matchedCrafts.length; i = i + 1) {
            const craft = matchedCrafts[i];
            let totalCost = 0;
            const embed = new MessageEmbed();

            let title = craft.rewardItems[0].item.name;

            if (craft.rewardItems[0].count > 1) {
                title += " (" + craft.rewardItems[0].count + ")";
            }

            const measuredTime = new Date(null);

            measuredTime.setSeconds(craft.duration);
            title += "\r\n" + craft.source + " (" + measuredTime.toISOString().substr(11, 8) + ")";
            embed.setTitle(title);
            embed.setURL(`${craft.rewardItems[0].item.link}#${i}`);

            if (craft.rewardItems[0].item.iconLink) {
                embed.setThumbnail(craft.rewardItems[0].item.iconLink);
            }

            for (const ri in craft.requiredItems) {
                const req = craft.requiredItems[ri];
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
                //totalCost += req.item.avg24hPrice * req.count;
                embed.addField(req.item.name, itemCost.toLocaleString() + "₽ x " + req.count, true);
            }
            embed.addField("Total", totalCost.toLocaleString() + "₽", true);

            embeds.push(embed);

            if (i == MAX_CRAFTS - 1) {
                break;
            }
        }

        if(matchedCrafts.length > MAX_CRAFTS){
            const ending = new MessageEmbed();

            ending.setTitle("+" + (matchedCrafts.length - MAX_CRAFTS) + " more");
            ending.setURL("https://tarkov-tools.com/hideout-profit/?search=" + encodeURIComponent(searchString));

            let otheritems = '';

            for (let i = MAX_CRAFTS; i < matchedCrafts.length; i = i + 1) {
                const bitemname = matchedCrafts[i].rewardItems[0].item.name + " (" + matchedCrafts[i].source + ")";

                if (bitemname.length + 4 + otheritems.length > 2048) {
                    ending.setFooter("Not all results shown.");

                    break;
                }
                otheritems += bitemname + "\r\n";
            }
            ending.setDescription(otheritems);

            embeds.push(ending);
        }

        await interaction.reply({embeds: embeds});
	},
};

export default defaultFunction;