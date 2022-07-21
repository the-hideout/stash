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

        // Fetch all current map/boss data
        const maps = await gameData.maps.getAll();


        // Construct the embed
        const embed = new MessageEmbed();
        embed.setTitle(bossName);
        embed.setThumbnail('https://static.wikia.nocookie.net/escapefromtarkov_gamepedia/images/a/ac/Killa_Portrait.png/revision/latest/scale-to-width-down/127?cb=20220710102646');
        embed.setDescription('<description will go here>');

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
