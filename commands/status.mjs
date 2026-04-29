import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import jsonApi from '../modules/json-api.mjs';
import generalError from '../modules/general-error.mjs';
import { getFixedT, getCommandLocalizations } from '../modules/translations.mjs';
import progress from '../modules/progress-shard.mjs';

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
        .setDescription('Gives you the current server status')
        .setNameLocalizations(getCommandLocalizations('status'))
        .setDescriptionLocalizations(getCommandLocalizations('status_desc')),
    async execute(interaction) {
        await interaction.deferReply();
        const locale = await progress.getServerLanguage(interaction.guildId) || interaction.locale;
        const t = getFixedT(locale);
        const embed = new EmbedBuilder();
        let currentStatus;

        try {
            const statusResponse = await jsonApi.request('status');

            currentStatus = statusResponse.data;
        } catch (requestError) {
            console.error(requestError);

            return generalError(interaction, t('Something went wrong when trying to fetch status, please try again'));
        }

        const globalStatus = currentStatus.currentStatuses.find(status => status.name === 'Global');

        embed.setTitle(t('Escape from Tarkov Status'));
        embed.setURL('https://status.escapefromtarkov.com/');

        if (currentStatus.messages.length > 0 && currentStatus.messages[0].content) {
            embed.setDescription(currentStatus.messages[0].content);
        }

        embed.setColor(colorCodes[globalStatus.status]);

        for (const message of currentStatus.currentStatuses) {
            embed.addFields({name: message.name, value: statusCodes[message.status], inline: true});
        }

        return interaction.editReply({ embeds: [embed] });
    },
};

export default defaultFunction;
