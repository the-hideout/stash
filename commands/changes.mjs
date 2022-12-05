import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import got from 'got';

import { getFixedT, getCommandLocalizations } from '../modules/translations.mjs';

const URL = 'https://tarkov-changes.com';
const MAX_EMBED_LENGTH = 4096;
let changes = false;
let lastCheck = new Date(0);

const getChanges = async () => {
    if (changes && new Date() - lastCheck < 1000 * 60 * 10) return changes;
    const data = await got(`${URL}/changelogs/data.txt`);
    lastCheck = new Date();
    changes = data.body;
    return changes;
};

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('changes')
        .setDescription('Get the latest changes for EFT')
        .setNameLocalizations(getCommandLocalizations('changes'))
        .setDescriptionLocalizations(getCommandLocalizations('changes_desc')),
    async execute(interaction) {
        await interaction.deferReply();
        const t = getFixedT(interaction.locale);
        
        const data = await getChanges();

        var message = `**${t('Changes provided by')} https://tarkov-changes.com**\n\n${data}`;

        if (message.length >= MAX_EMBED_LENGTH) {
            message = `${t('Sorry, the current change list is too long to be displayed in Discord')}\n\n${t('Please visit {{url}} for more information', {url: URL})}`;
        }

        const embed = new EmbedBuilder();
        embed.setURL(URL);
        embed.setTitle(`${t('Latest EFT Changes')} 🗒️`);
        embed.setDescription(message);
        embed.setFooter({text: t('Get the full data from {{url}}', {url: URL})});
        await interaction.editReply({ embeds: [embed] });
    }
};

export default defaultFunction;
