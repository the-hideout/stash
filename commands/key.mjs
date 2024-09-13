import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import progress from '../modules/progress-shard.mjs';
import gameData from '../modules/game-data.mjs';
import { getFixedT, getCommandLocalizations } from '../modules/translations.mjs';
import createEmbed from '../modules/create-embed.mjs';

const MAX_ITEMS = 1;

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('key')
        .setDescription('Get a key\'s price and maps it is used on')
        .setNameLocalizations(getCommandLocalizations('key'))
        .setDescriptionLocalizations(getCommandLocalizations('key_desc'))
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
        const locale = lang;
        const t = getFixedT(locale);
        const commandT = getFixedT(lang, 'command');
        const gameModeLabel = t(`Game mode: {{gameMode}}`, {gameMode: commandT(`game_mode_${gameMode}`)});
        // Get the search string from the user invoked command
        const searchString = interaction.options.getString('name');

        const [ items, traders, hideout, barters, crafts, maps ] = await Promise.all([
            gameData.items.getAll({lang, gameMode}),
            gameData.traders.getAll({lang, gameMode}),
            gameData.hideout.getAll({lang, gameMode}),
            gameData.barters.getAll({ gameMode}),
            gameData.crafts.getAll({ gameMode}),
            gameData.maps.getAll({ lang, gameMode}),
        ]);
        const matchedItems = items.filter(i => i.name.toLowerCase().includes(searchString.toLowerCase()));

        if (matchedItems.length === 0) {
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

        for (const item of matchedItems) {
            if (item.shortName?.toLowerCase() === searchString) {
                matchedItems.length = 0;
                matchedItems.push(item);
                break;
            }
        }

        for (let i = 0; i < matchedItems.length; i = i + 1) {
            const item = matchedItems[i];
            const embed = await createEmbed.price(item, interaction, {items, traders, hideout, barters, crafts, interactionSettings: {lang, gameMode}, progress: prog});

            embeds.push(embed);

            embeds.push(await createEmbed.unlockMaps(item, interaction, {maps, interactionSettings: {lang, gameMode}}));

            if (i >= MAX_ITEMS - 1) {
                break;
            }
        }

        if (embeds.length > 10) {
            embeds = embeds.slice(0, 9);
        }

        return interaction.editReply({ embeds: embeds });
    },
    examples: [
        '/$t(key) Factory Emergency Exit Key'
    ]
};

export default defaultFunction;
