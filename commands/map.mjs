import { SlashCommandBuilder } from '@discordjs/builders';

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
        .addStringOption(option => option.setName('maplist').setDescription('Enter a list of maps to include')),
	async execute(interaction) {
        const inputMaps = interaction.options.getString('maplist');
        let randomMaps = allMaps;

        if(inputMaps){
            randomMaps = inputMaps.split(' ');
        }

        console.log(`map ${inputMaps}`);

        const outputMap = randomMaps[Math.floor(Math.random() * randomMaps.length)];

		await interaction.reply(outputMap.charAt(0).toUpperCase() + outputMap.slice(1));
	},
};

export default defaultFunction;