import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import fs from 'fs';

import { getFixedT, getCommandLocalizations } from '../modules/translations.mjs';

const rouletteData = JSON.parse(fs.readFileSync('data/roulette.json'));

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('roulette')
        .setDescription('Spin the roulette wheel for a fun or challenging game of Tarkov!')
        .setNameLocalizations(getCommandLocalizations('roulette'))
        .setDescriptionLocalizations(getCommandLocalizations('roulette_desc')),
    async execute(interaction) {
        const t = getFixedT(interaction.locale);

        const draw = rouletteData[Math.floor(Math.random()*rouletteData.length)];

        const embed = new EmbedBuilder();
        embed.setTitle(draw.name);
        embed.setDescription(draw.description);
        embed.setFooter({
            text: `${t('Good Luck!')} 🎲`,
        });

        await interaction.reply({ embeds: [embed] });
    },
};

export default defaultFunction;
