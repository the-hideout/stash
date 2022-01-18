import {
    SlashCommandBuilder
} from '@discordjs/builders';

import allMaps from '../modules/all-maps.js';
import getMapEmbed from '../modules/get-map-embed.js';

const defaultFunction = {
	data: new SlashCommandBuilder()
		.setName('map')
		.setDescription('Replies with a random map')
        .addStringOption(option => option
                .setName('maplist')
                .setDescription('Enter a list of maps to include')
        ),
	async execute(interaction) {
        const inputMaps = interaction.options.getString('maplist');
        let randomMaps = allMaps;

        if(inputMaps){
            randomMaps = inputMaps.split(' ');
        }

        console.log(`map ${inputMaps}`);

        const outputMap = randomMaps[Math.floor(Math.random() * randomMaps.length)];

        // If we have a non-custom list just return that
        if(!allMaps.includes(outputMap)){
            await interaction.editReply({content: outputMap});

            return true;
        }

        const embed = await getMapEmbed(outputMap);


		await interaction.editReply({
            embeds: [embed],
        });
	},
};

export default defaultFunction;