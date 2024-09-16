import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import gameData from '../modules/game-data.mjs';
import progress from '../modules/progress-shard.mjs';
import { getFixedT, getCommandLocalizations } from '../modules/translations.mjs';
import createEmbed from '../modules/create-embed.mjs';

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
        const { lang, gameMode } = await progress.getInteractionSettings(interaction);
        const t = getFixedT(lang);
        const searchString = interaction.options.getString('name');

        if (!searchString) {
            return interaction.editReply({
                content: t('You need to specify a search term'),
                ephemeral: true,
            });
        }

        const commandT = getFixedT(lang, 'command');
        const gameModeLabel = t(`Game mode: {{gameMode}}`, {gameMode: commandT(`game_mode_${gameMode}`)});

        const matchedCrafts = [];

        const [items, crafts, hideout] = await Promise.all([
            gameData.items.getAll({lang, gameMode}),
            gameData.crafts.getAll({gameMode}),
            gameData.hideout.getAll({lang, gameMode}),
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
            const embed = new EmbedBuilder();
            embed.setDescription(t(`Found no results for "{{searchString}}"`, {
                searchString: searchString
            }));
            embed.setFooter({text: gameModeLabel});
            return interaction.editReply({
                embeds: [embed],
                ephemeral: true,
            });
        }

        let embeds = [];

        const prog = await progress.getProgressOrDefault(interaction.user.id);

        for (let i = 0; i < matchedCrafts.length; i = i + 1) {
            const craft = crafts.find(c => c.id === matchedCrafts[i]);

            embeds.push(await createEmbed.craft(craft, interaction, {items, hideout, progress: prog, interactionSettings: {lang, gameMode}}));

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
                const station = hideout.find(s => s.id === craft.station.id);
                const bitemname = `[${rewardItem.name}](${rewardItem.link}) (${station.name} level ${craft.level})`;

                if (bitemname.length + 4 + otheritems.length > 2048) {
                    ending.setFooter({text: `${matchedCrafts.length-i} ${t('additional results not shown.')} | ${gameModeLabel}`,});

                    break;
                }
                otheritems += bitemname + "\r\n";
            }
            ending.setDescription(otheritems);

            embeds.push(ending);
        } else {
            embeds[embeds.length-1].setFooter({text: gameModeLabel});
        }

        return interaction.editReply({ embeds: embeds });
    },
    examples: '/$t(craft) 7n31'
};

export default defaultFunction;
