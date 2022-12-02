import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import { formatHMS } from '../modules/utils.mjs';
import { getFixedT, getCommandLocalizations } from '../modules/translations.mjs';

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('uptime')
        .setDescription('Shows the uptime of the bot')
        .setNameLocalizations(getCommandLocalizations('uptime'))
        .setDescriptionLocalizations(getCommandLocalizations('uptime_desc')),
    async execute(interaction) {
        const t = getFixedT(interaction.locale);
        const embed = new EmbedBuilder();
        embed.setTitle(`${('Stash Uptime')} ⌛`);

        const uptime = process.uptime();
        const date = new Date(uptime * 1000);
        const uptimeFmt = formatHMS(date);

        embed.setDescription(`${t('I have been online for')}: ${uptimeFmt}`);
        embed.setFooter({text: t('Format HH:MM:SS')});
        await interaction.reply({ embeds: [embed] });
    },
};

export default defaultFunction;
