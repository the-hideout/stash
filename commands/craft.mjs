import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import gameData from '../modules/game-data.mjs';
import progress from '../modules/progress-shard.mjs';
import { getFixedT, getCommandLocalizations } from '../modules/translations.mjs';

const MAX_CRAFTS = 2;

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('craft')
        .setDescription('Find crafts with a specific item')
        .setNameLocalizations(getCommandLocalizations('craft'))
        .setDescriptionLocalizations(getCommandLocalizations('craft_desc'))
        .addStringOption(option => option
            .setName('name')
            .setDescription('Item name to search for')
            .setNameLocalizations(getCommandLocalizations('name'))
            .setDescriptionLocalizations(getCommandLocalizations('name_search_desc'))
            .setAutocomplete(true)
            .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply();
        const locale = await progress.getServerLanguage(interaction.guildId) || interaction.locale;
        const t = getFixedT(locale);
        const searchString = interaction.options.getString('name');

        if (!searchString) {
            return interaction.editReply({
                content: t('You need to specify a search term'),
                ephemeral: true,
            });
        }

        const matchedCrafts = [];

        const [items, crafts, stations] = await Promise.all([
            gameData.items.getAll(locale),
            gameData.crafts.getAll(),
            gameData.hideout.getAll(locale),
        ]);

        const searchedItems = items.filter(item => item.name.toLowerCase().includes(searchString.toLowerCase()));

        for (const item of searchedItems) {
            for (const craft of item.craftsFor) {
                if (matchedCrafts.includes(craft.id)) continue;
                matchedCrafts.push(craft.id);
            }
            for (const craft of item.craftsUsing) {
                if (matchedCrafts.includes(craft.id)) continue;
                matchedCrafts.push(craft.id);
            }
        }

        if (matchedCrafts.length === 0) {
            return interaction.editReply({
                content: t('Found no results for "{{searchString}}"', {searchString: searchString}),
                ephemeral: true,
            });
        }

        let embeds = [];

        const prog = await progress.getSafeProgress(interaction.user.id);

        for (let i = 0; i < matchedCrafts.length; i = i + 1) {
            const craft = crafts.find(c => c.id === matchedCrafts[i]);
            let totalCost = 0;
            const embed = new EmbedBuilder();
            const toolsEmbed = new EmbedBuilder();
            toolsEmbed.setTitle(`${t('Required Tools')} 🛠️`);
            let toolCost = 0;

            const rewardItem = items.find(it => it.id === craft.rewardItems[0].item.id)
            let title = rewardItem.name;

            if (craft.rewardItems[0].count > 1) {
                title += " (" + craft.rewardItems[0].count + ")";
            }

            embed.setTitle(title);
            embed.setURL(rewardItem.link);

            const measuredTime = new Date(null);
            let timeDiscount = prog.skills['crafting']*0.0075*craft.duration;
            measuredTime.setSeconds(craft.duration - timeDiscount);
            const locked = prog.hideout[craft.station.id] < craft.level ? '🔒' : '';
            const station = stations.find(st => st.id === craft.station.id);
            embed.setAuthor({
                name: `${station.name} ${t('level')} ${craft.level} (${measuredTime.toISOString().substr(11, 8)})${locked}`,
                iconURL: station.imageLink,
                url: `https://tarkov.dev/hideout-profit/?all=true&station=${station.normalizedName}&search=${encodeURIComponent(rewardItem.name)}`,
            });

            if (rewardItem.iconLink) {
                embed.setThumbnail(rewardItem.iconLink);
            }

            for (const req of craft.requiredItems) {
                const reqItem = items.find(it => it.id === req.item.id);
                let itemCost = reqItem.avg24hPrice;

                if (reqItem.lastLowPrice > itemCost && reqItem.lastLowPrice > 0) {
                    itemCost = reqItem.lastLowPrice;
                }

                for (const offer of reqItem.buyFor) {
                    if (!offer.vendor.trader) {
                        continue;
                    }

                    let traderPrice = offer.priceRUB;

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
                    toolsEmbed.addFields({name: reqItem.name, value: itemCost.toLocaleString(locale) + "₽ x " + req.count, inline: true});
                    if(!toolsEmbed.thumbnail) {
                        toolsEmbed.setThumbnail(reqItem.iconLink);
                    }
                    continue;
                }
                let quantity = req.count;
                // water filter consumption rate reduction
                if (craft.station.id === '5d484fc8654e760065037abf' && reqItem.id === '5d1b385e86f774252167b98a') {
                    let time = prog.skills['crafting']*0.0075*quantity;
                    let consumption = prog.skills['hideoutManagement']*0.005*quantity;
                    quantity = Math.round((quantity - time - consumption) * 100) /100;
                }
                totalCost += itemCost * quantity;
                //totalCost += req.item.avg24hPrice * req.count;
                embed.addFields({name: reqItem.name, value: itemCost.toLocaleString(locale) + '₽ x ' + quantity, inline: true});
            }
            embed.addFields({name: t('Total'), value: totalCost.toLocaleString(locale) + '₽', inline: false});

            embeds.push(embed);
            if (toolsEmbed.data.fields?.length > 0) {
                toolsEmbed.addFields({name: t('Total'), value: toolCost.toLocaleString(locale) + '₽', inline: false});
                embeds.push(toolsEmbed);
            }

            if (i == MAX_CRAFTS - 1) {
                break;
            }
        }

        if (matchedCrafts.length > MAX_CRAFTS) {
            const ending = new EmbedBuilder();

            ending.setTitle("+" + (matchedCrafts.length - MAX_CRAFTS) + ` ${('more')}`);
            ending.setURL("https://tarkov.dev/hideout-profit/?search=" + encodeURIComponent(searchString));

            let otheritems = '';

            for (let i = MAX_CRAFTS; i < matchedCrafts.length; i = i + 1) {
                const craft = crafts.find(c => c.id === matchedCrafts[i]);
                const rewardItem = items.find(it => it.id === craft.rewardItems[0].item.id);
                const station = stations.find(s => s.id === craft.station.id);
                const bitemname = `[${rewardItem.name}](${rewardItem.link}) (${station.name} level ${craft.level})`;

                if (bitemname.length + 4 + otheritems.length > 2048) {
                    ending.setFooter({text: `${matchedCrafts.length-i} ${t('additional results not shown.')}`,});

                    break;
                }
                otheritems += bitemname + "\r\n";
            }
            ending.setDescription(otheritems);

            embeds.push(ending);
        }

        return interaction.editReply({ embeds: embeds });
    },
    examples: '/$t(craft) 7n31'
};

export default defaultFunction;
