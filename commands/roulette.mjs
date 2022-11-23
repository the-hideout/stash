import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import fs from 'fs';

import { changeLanguage, t } from '../modules/translations.mjs';

const rouletteData = JSON.parse(fs.readFileSync('data/roulette.json'));

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('roulette')
        .setDescription('Spin the roulette wheel for a fun or challenging game of Tarkov!')
        .setNameLocalizations({
            'es-ES': 'ruleta',
            ru: 'рулетка',
        })
        .setDescriptionLocalizations({
            'es-ES': '¡Gira la rueda de la ruleta para un juego divertido o desafiante de Tarkov!',
            ru: 'Вращайте рулетку для веселой или сложной игры в тарков!',
        }),
    async execute(interaction) {
        const draw = rouletteData[Math.floor(Math.random()*rouletteData.length)];

        changeLanguage(interaction.locale);

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
