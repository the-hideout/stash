import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import fs from 'fs';

import { getFixedT, getCommandLocalizations } from '../modules/translations.mjs';
import progress from '../modules/progress-shard.mjs';

const rouletteData = JSON.parse(fs.readFileSync('data/roulette.json'));

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('roulette')
        .setDescription('Spin the roulette wheel for a fun or challenging game of Tarkov!')
        .setNameLocalizations(getCommandLocalizations('roulette'))
        .setDescriptionLocalizations(getCommandLocalizations('roulette_desc')),
    async execute(interaction) {
        const locale = await progress.getServerLanguage(interaction.guildId) || interaction.locale;
        const t = getFixedT(locale);

        const draw = rouletteData[Math.floor(Math.random()*rouletteData.length)];

        const embed = new EmbedBuilder();
        embed.setTitle(t(draw.name));
        embed.setDescription(t(draw.description));
        embed.setFooter({
            text: `${t('Good Luck!')} 🎲`,
        });

        return interaction.reply({ embeds: [embed] });
    },
};

export default defaultFunction;
