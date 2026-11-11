import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import { formatHMS } from '../modules/utils.mjs';
import { getFixedT, getCommandLocalizations } from '../modules/translations.mjs';
import progress from '../modules/progress-shard.mjs';

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('uptime')
        .setDescription('Shows the uptime of the bot')
        .setNameLocalizations(getCommandLocalizations('uptime'))
        .setDescriptionLocalizations(getCommandLocalizations('uptime_desc')),
    async execute(interaction) {
        await interaction.deferReply();
        const locale = await progress.getServerLanguage(interaction.guildId) || interaction.locale;
        const t = getFixedT(locale);
        const embed = new EmbedBuilder();
        embed.setTitle(`${t('Stash Uptime')} ⌛`);

        const uptime = process.uptime();
        const date = new Date(uptime * 1000);
        const uptimeFmt = formatHMS(date);

        embed.setDescription(`${t('I have been online for')}: ${uptimeFmt}`);
        embed.setFooter({text: t('Format HH:MM:SS')});
        return interaction.editReply({ embeds: [embed] });
    },
};

export default defaultFunction;
