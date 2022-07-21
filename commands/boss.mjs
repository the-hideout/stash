import { SlashCommandBuilder } from '@discordjs/builders';
import { MessageEmbed } from 'discord.js';

import gameData from '../modules/game-data.mjs';

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('boss')
        .setDescription('Get detailed information about a boss')
        .addStringOption(option => option
            .setName('boss')
            .setDescription('Select a boss')
            .setRequired(true)
            .setChoices(gameData.bosses.choices())
        ),

    async execute(interaction) {
        console.log('starting boss command');

        await interaction.deferReply();
        const bossName = interaction.options.getString('boss');

        const bossData = await gameData.bosses.getAll();
        const embed = new MessageEmbed();

        // Construct the embed
        embed.setTitle(bossName);
        embed.addField('Spawn Chance 🎲', bossData.spawnChance, true);

        await interaction.editReply({
            embeds: [embed],
        });
    },
    examples: [
        '/boss Killa',
        '/map Reshala'
    ]
};

export default defaultFunction;
