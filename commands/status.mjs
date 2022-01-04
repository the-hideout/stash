import { SlashCommandBuilder } from '@discordjs/builders';
import {
    MessageEmbed,
} from 'discord.js';
import ttRequest from '../modules/tt-request.mjs';

const statusCodes = [
    'OK',
    'Down',
    'Unstable',
];

const colorCodes = [
    '#70b035',
    '#ff0000',
    '#ca8a00',
];

const defaultFunction = {
	data: new SlashCommandBuilder()
		.setName('status')
		.setDescription('Gives you the current server status'),
	async execute(interaction) {
        const embed = new MessageEmbed();
        let currentStatus;

        try {
            const statusReponse = await ttRequest({
                graphql: `query {
                    status {
                        currentStatuses {
                            name
                            message
                            status
                        }
                        messages {
                            time
                            type
                            content
                            solveTime
                        }
                    }
                }`
            });

            currentStatus = statusReponse.data.status;
        } catch (requestError){
            console.error(requestError);
        }

        // console.log(currentStatus);

        const globalStatus = currentStatus.currentStatuses.find(status => status.name === 'Global');

        embed.setTitle(globalStatus.message);
        embed.setURL('https://status.escapefromtarkov.com/');
        embed.setDescription(currentStatus.messages[0].content);
        // embed.setAuthor({
        //     name: 'Built by tarkov-tools',
        //     iconURL: 'https://tarkov-tools.com/apple-touch-icon.png',
        //     url: 'https://tarkov-tools.com',
        // });
        embed.setColor(colorCodes[globalStatus.status]);

        for(const message of currentStatus.currentStatuses){
            embed.addField(message.name, statusCodes[message.status], true);
        }

        await interaction.reply({ embeds: [embed] });
	},
};

export default defaultFunction;