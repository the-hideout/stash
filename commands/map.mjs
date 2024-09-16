import { SlashCommandBuilder } from 'discord.js';

import gameData from '../modules/game-data.mjs';
import { getCommandLocalizations } from '../modules/translations.mjs';
import progress from '../modules/progress-shard.mjs';
import createEmbed from '../modules/create-embed.mjs';

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('map')
        .setDescription('Get detailed information about a map')
        .setNameLocalizations(getCommandLocalizations('map'))
        .setDescriptionLocalizations(getCommandLocalizations('map_desc'))
        .addStringOption(option => option
            .setName('map')
            .setDescription('Select a map')
            .setNameLocalizations(getCommandLocalizations('map'))
            .setDescriptionLocalizations(getCommandLocalizations('map_select_desc'))
            .setRequired(true)
            .setChoices(...gameData.maps.choices())
        ),

    async execute(interaction) {
        await interaction.deferReply();
        const { lang, gameMode } = await progress.getInteractionSettings(interaction);
        const mapId = interaction.options.getString('map');

        const [maps, items] = await Promise.all([
            gameData.maps.getAll({lang, gameMode}),
            gameData.items.getAll({lang, gameMode}),
        ]);

        const selectedMapData = maps.find(mapObject => mapObject.id === mapId);

        const embed = await createEmbed.map(selectedMapData, interaction, {items, maps, interactionOptions: {lang, gameMode}});

        return interaction.editReply({
            embeds: [embed],
        });
    },
    examples: [
        '/$t(map) Woods',
        '/$t(map) customs'
    ]
};

export default defaultFunction;
