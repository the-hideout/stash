import {
    SlashCommandBuilder
} from '@discordjs/builders';

import allMaps from '../modules/all-maps.js';
import getMapEmbed from '../modules/get-map-embed.js';

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('map')
        .setDescription('Get detailed information about a map')
        .addStringOption(option => option
            .setName('maplist')
            .setDescription('Select a map')
            .setRequired(true)
            .setChoices(allMaps)
        ),

    async execute(interaction) {
        const inputMaps = interaction.options.getString('maplist');

        console.log(`map ${inputMaps}`);

        const embed = await getMapEmbed(inputMaps);

        await interaction.editReply({
            embeds: [embed],
        });
    },
};

export default defaultFunction;