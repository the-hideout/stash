import { SlashCommandBuilder } from '@discordjs/builders';
import { MessageEmbed } from 'discord.js';

import gameData from '../modules/game-data.mjs';

const baseImageUrl = 'https://assets.tarkov.dev/';

const bossDetails = [
    {
        "name": "cultist priest",
        "details": "test",
        "image": `${baseImageUrl}cultist-priest.jpg`
    },
    {
        "name": "death knight",
        "details": "test",
        "image": `${baseImageUrl}death-knight.jpg`
    },
    {
        "name": "glukhar",
        "details": "test",
        "image": `${baseImageUrl}glukhar.jpg`
    },
    {
        "name": "killa",
        "details": "test",
        "image": `${baseImageUrl}killa.jpg`
    },
    {
        "name": "reshala",
        "details": "test",
        "image": `${baseImageUrl}reshala.jpg`
    },
    {
        "name": "sanitar",
        "details": "test",
        "image": `${baseImageUrl}sanitar.jpg`
    },
    {
        "name": "shturman",
        "details": "test",
        "image": `${baseImageUrl}shturman.jpg`
    },
    {
        "name": "tagilla",
        "details": "test",
        "image": `${baseImageUrl}tagilla.jpg`
    }
]

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

        // Fetch all current map/boss data
        const maps = await gameData.maps.getAll();

        // Construct the embed
        const embed = new MessageEmbed();

        var details
        var image
        for (const boss of bossDetails) {
            if (boss.name.toLowerCase() === bossName.toLowerCase()) {
                details = boss.details;
                image = boss.image;
            }
        }

        // Add base fields to the embed
        embed.setTitle(bossName);
        embed.setThumbnail(image);
        embed.setDescription(details);

        const mapEmbeds = [];
        for (const map of maps) {
            // Only use the data for the boss specified in the command
            const bossData = map.bosses.find(boss => boss.name === bossName);
            if (!bossData) continue;

            const mapEmbed = new MessageEmbed();
            mapEmbed.setTitle(map.name);
            //mapEmbed.addField('Map', `${map.name} (${bossData.spawnChance * 100}%)`, false);

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

            mapEmbed.addField('Spawn Chance 🎲', `${bossData.spawnChance * 100}%`, true);
            mapEmbed.addField('Spawn Locations 📍', spawnLocations, true);
            //embed.addField('Spawn Time 🕒', spawnTime, true);
            if (escortNames) {
                mapEmbed.addField('Escort 💂', escortNames, true);
            }
            mapEmbeds.push(mapEmbed);
        }
        if (mapEmbeds.length === 1) {
            embed.addField('Map', mapEmbeds[0].title, false);
            for (const field of mapEmbeds[0].fields) {
                embed.addField(field.name, field.value, true);
            }
            mapEmbeds.length = 0;
        }

        // Send the message
        await interaction.editReply({
            embeds: [embed, ...mapEmbeds],
        });
    },
    examples: [
        '/boss Killa',
        '/map Reshala'
    ]
};

export default defaultFunction;
