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
        await interaction.deferReply();

        // Get the boss name from the command interaction
        const bossName = interaction.options.getString('boss');

        // Fetch all current boss data
        const allBossData = await gameData.bosses.getAll();

        // Only use the data for the boss specified in the command
        const bossData = allBossData.find(boss => boss.name === bossName);

        // Join the spawn locations into a comma separated string
        const spawnLocations = bossData.spawnLocations.map(spawnLocation => spawnLocation.name).join(', ');

        // Format the embed description body
        var description = '';
        description += `• **Spawn Locations**: ${spawnLocations}\n`;

        // Construct the embed
        const embed = new MessageEmbed();
        embed.setTitle(bossName);
        embed.setDescription(description)
        embed.addField('Spawn Chance 🎲', `${bossData.spawnChance * 100}%`, true);

        // Send the message
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
