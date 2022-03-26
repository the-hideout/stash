import { SlashCommandBuilder } from '@discordjs/builders';
import {
    MessageEmbed,
} from 'discord.js';
import ttRequest from '../modules/tt-request.mjs';
import generalError from '../modules/general-error.mjs';

const statusCodes = [
    '🟢 OK',
    '🔄 Updating',
    '🟡 Unstable',
    '🔴 Down',
];

const colorCodes = [
    '#70b035',
    '#90c1eb',
    '#ca8a00',
    '#ff0000',
];

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Gives you the current server status'),
    async execute(interaction) {
        const embed = new MessageEmbed();
        let currentStatus;

        try {
            const statusResponse = await ttRequest({
                graphql: `{
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

            currentStatus = statusResponse.data.status;
        } catch (requestError) {
            console.error(requestError);

            generalError(interaction, 'Something went wrong when trying to fetch status, please try again');

            return true;
        }

        // console.log(currentStatus);

        const globalStatus = currentStatus.currentStatuses.find(status => status.name === 'Global');

        embed.setTitle(globalStatus.message);
        embed.setURL('https://status.escapefromtarkov.com/');
        if (currentStatus.messages[0]?.content) {
            embed.setDescription(currentStatus.messages[0].content);
        }
        // embed.setAuthor({
        //     name: 'Built by tarkov.dev',
        //     iconURL: 'https://tarkov.dev/apple-touch-icon.png',
        //     url: 'https://tarkov.dev',
        // });
        embed.setColor(colorCodes[globalStatus.status]);

        for (const message of currentStatus.currentStatuses) {
            embed.addField(message.name, statusCodes[message.status], true);
        }

        await interaction.editReply({ embeds: [embed] });
    },
};

export default defaultFunction;