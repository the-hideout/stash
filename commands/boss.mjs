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

        // Join the escort names into a comma separated string
        const escortNames = bossData.escorts.map(escortName => `${escortName.name} x${escortName.amount[0].count}`).join(', ').replaceAll(' x1', '');

        var spawnTime;
        if (bossData.spawnTime === -1) {
            spawnTime = 'Raid Start';
        } else {
            spawnTime = `${bossData.spawnTime} seconds`;
        }

        // Format the embed description body
        // var description = '';
        // description += `• **Spawn Locations**: ${spawnLocations}\n`;

        // Construct the embed
        const embed = new MessageEmbed();
        embed.setTitle(bossName);
        embed.setThumbnail('https://static.wikia.nocookie.net/escapefromtarkov_gamepedia/images/a/ac/Killa_Portrait.png/revision/latest/scale-to-width-down/127?cb=20220710102646');
        embed.setDescription('<description will go here>');
        embed.addField('Spawn Chance 🎲', `${bossData.spawnChance * 100}%`, true);
        embed.addField('Spawn Locations 📍', spawnLocations, true);
        embed.addField('Spawn Time 🕒', spawnTime, true);
        if (escortNames) {
            embed.addField('Escort 💂', escortNames, true);
        }

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
