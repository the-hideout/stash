import {
    SlashCommandBuilder
} from '@discordjs/builders';
import {
    MessageEmbed,
} from 'discord.js';

import getMapData from '../modules/get-map-data.mjs';

const allMaps = [
    'customs',
    'factory',
    'factory (night)',
    'interchange',
    'labs',
    'lighthouse',
    'reserve',
    'shoreline',
    'woods',
];

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

        let mapKey = outputMap;

        if(outputMap === 'factory (night)'){
            mapKey = 'factory';
        }

        // If we have a non-custom list just return that
        if(!allMaps.includes(mapKey)){
            await interaction.editReply({content: mapKey});

            return true;
        }

        const mapData = await getMapData();
        const embed = new MessageEmbed();
        const selectedMapData = mapData.find(mapObject => mapObject.key === mapKey);
        let displayDuration = selectedMapData.duration;

        if(selectedMapData.duration.includes('/')){
            const [day, night] = selectedMapData.duration.split('/');

            if(outputMap.includes('night')){
                displayDuration = night;
            } else {
                displayDuration = day;
            }
        }

        displayDuration = displayDuration.replace('min', 'minutes');

        embed.setTitle(outputMap.charAt(0).toUpperCase() + outputMap.slice(1));
        embed.setURL(`https://tarkov-tools.com/map/${mapKey}`);
        embed.addField('Duration', displayDuration, true);
        embed.addField('Players', selectedMapData.players, true);
        embed.setImage(`https://tarkov-tools.com/maps/${mapKey}.jpg`);

        if(selectedMapData.source){
            embed.setFooter({text: `Map made by ${selectedMapData.source}`});
        }

		await interaction.editReply({
            embeds: [embed],
        });
	},
};

export default defaultFunction;