import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import fs from 'fs';

import { getFixedT } from '../modules/translations.mjs';

const comT = getFixedT(null, 'command');

const rouletteData = JSON.parse(fs.readFileSync('data/roulette.json'));

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('roulette')
        .setDescription('Spin the roulette wheel for a fun or challenging game of Tarkov!')
        .setNameLocalizations({
            'es-ES': comT('roulette', {lng: 'es-ES'}),
            ru: comT('roulette', {lng: 'ru'}),
        })
        .setDescriptionLocalizations({
            'es-ES': comT('roulette_desc', {lng: 'es-ES'}),
            ru: comT('roulette_desc', {lng: 'ru'}),
        }),
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
