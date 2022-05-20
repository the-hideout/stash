import {
    SlashCommandBuilder
} from '@discordjs/builders';

import gameData from '../modules/game-data.mjs';
import getMapEmbed from '../modules/get-map-embed.js';

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('map')
        .setDescription('Get detailed information about a map')
        .addStringOption(option => option
            .setName('map')
            .setDescription('Select a map')
            .setRequired(true)
            .setChoices(gameData.maps.choices())
        ),

    async execute(interaction) {
        await interaction.deferReply();
        const mapId = interaction.options.getString('map');

        const embed = await getMapEmbed(mapId);

        await interaction.editReply({
            embeds: [embed],
        });
    },
};

export default defaultFunction;
