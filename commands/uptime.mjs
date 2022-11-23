import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import { formatHMS } from '../modules/utils.mjs';
import { changeLanguage, t } from '../modules/translations.mjs';

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('uptime')
        .setDescription('Shows the uptime of the bot')
        .setNameLocalizations({
            'es-ES': 'uptime',
            ru: 'uptime',
        })
        .setDescriptionLocalizations({
            'es-ES': 'Muestra el tiempo de actividad del bot.',
            ru: 'Показывает время работы бота',
        }),
    async execute(interaction) {
        const embed = new EmbedBuilder();
        changeLanguage(interaction.locale);
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
