import { SlashCommandBuilder } from '@discordjs/builders';
import { MessageEmbed } from 'discord.js';

import gameData from '../modules/game-data.mjs';

const baseImageUrl = 'https://assets.tarkov.dev';

const bossDetails = [
    {
        "name": "cultist priest",
        "details": "test",
        "image": `${baseImageUrl}/cultist-priest.jpg`
    },
    {
        "name": "death knight",
        "details": "test",
        "image": `${baseImageUrl}/death-knight.jpg`
    },
    {
        "name": "glukhar",
        "details": "test",
        "image": `${baseImageUrl}/glukhar.jpg`
    },
    {
        "name": "killa",
        "details": "test",
        "image": `${baseImageUrl}/killa.jpg`
    },
    {
        "name": "reshala",
        "details": "test",
        "image": `${baseImageUrl}/reshala.jpg`
    },
    {
        "name": "sanitar",
        "details": "test",
        "image": `${baseImageUrl}/sanitar.jpg`
    },
    {
        "name": "shturman",
        "details": "Shturman and his followers will engage the player at a long range protecting the sawmill area of the woods. They prefer to keep their distance, as they are not suited for close quarters combat.",
        "image": `${baseImageUrl}/shturman.jpg`,
        "health": 812,
        "loot": "Shturman's stash key, Red Rebel"
    },
    {
        "name": "tagilla",
        "details": "He is batshit insane and will attempt to hammer you down. However, if you are in a position that he cannot path-find to, such as the rafters, he will use his secondary weapon (usually a shotgun) to kill you from a distance. He's active immediately at the start of raid. The boss can set ambushes, open suppressive fire, and breach if needed.",
        "image": `${baseImageUrl}/tagilla.jpg`,
        "health": 1220,
        "loot": "Crye Precision AVS MBAV (Tagilla Edition), L1 (Norepinephrine) injector, Bitcoin, Tagilla's welding mask, BOSS cap"
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

        // Get unique boss details
        var details
        var image
        var health
        var loot
        for (const boss of bossDetails) {
            if (boss.name.toLowerCase() === bossName.toLowerCase()) {
                details = boss.details;
                image = boss.image;
                health = boss.health;
                loot = boss.loot;
            }
        }

        // Add base fields to the embed
        embed.setTitle(bossName);
        embed.setThumbnail(image);

        // Construct the description
        var description = '💡 **About:**\n';
        description += `${details}\n\n`;
        description += `• 💚 **Health:** ${health}\n`;
        description += `• 💎 **Unique Loot:** ${loot}\n`;

        embed.setDescription(description);

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
