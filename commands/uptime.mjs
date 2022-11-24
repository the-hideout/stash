import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import { formatHMS } from '../modules/utils.mjs';
import { getFixedT } from '../modules/translations.mjs';

const comT = getFixedT(null, 'command');

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('uptime')
        .setDescription('Shows the uptime of the bot')
        .setNameLocalizations({
            'es-ES': comT('uptime', {lng: 'es-ES'}),
            ru: comT('uptime', {lng: 'ru'}),
        })
        .setDescriptionLocalizations({
            'es-ES': comT('uptime_desc', {lng: 'es-ES'}),
            ru: comT('uptime_desc', {lng: 'ru'}),
        }),
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
