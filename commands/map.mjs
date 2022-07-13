import { SlashCommandBuilder } from '@discordjs/builders';
import { MessageEmbed } from 'discord.js';

import gameData from '../modules/game-data.mjs';
import realTimeToTarkovTime from '../modules/time.mjs';

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('map')
        .setDescription('Get detailed information about a map')
        .addStringOption(option => option
            .setName('map')
            .setDescription('Select a map')
            .setRequired(true)
            .setChoices(gameData.maps.choices())
        ),

    async execute(interaction) {
        await interaction.deferReply();
        const mapId = interaction.options.getString('map');

        const mapData = await gameData.maps.getAll();
        const embed = new MessageEmbed();

        const selectedMapData = mapData.find(mapObject => mapObject.id === mapId);
        let displayDuration = `${selectedMapData.raidDuration} minutes`;

        // Get left and right real tarkov time
        let left = realTimeToTarkovTime(new Date(), true);
        let right = realTimeToTarkovTime(new Date(), false);
        let displayTime = `${left} - ${right}`;
        if (selectedMapData.name.includes('Factory')) {
            // If the map is Factory, set the times to static values
            if (selectedMapData.name.includes('Night')) {
                displayTime = '03:00';
            } else {
                displayTime = '15:00';
            }
        } 

        let displayPlayers = '???';
        if (selectedMapData.players) {
            displayPlayers = selectedMapData.players;
        }

        let mapUrl = false; `https://tarkov.dev/map/${selectedMapData.key}`;
        if (selectedMapData.key) {
            mapUrl = `https://tarkov.dev/map/${selectedMapData.key}`;
        } else if (selectedMapData.wiki) {
            mapUrl = selectedMapData.wiki;
        }

        const bosses = {};
        for (const boss of selectedMapData.bosses) {
            if (!bosses[boss.name]) {
                bosses[boss.name] = {
                    ...boss,
                    minSpawn: boss.spawnChance,
                    maxSpawn: boss.spawnChance
                };
            }
            if (bosses[boss.name].minSpawn > boss.spawnChance) bosses[boss.name].minSpawn = boss.spawnChance;
            if (bosses[boss.name].maxSpawn < boss.spawnChance) bosses[boss.name].maxSpawn = boss.spawnChance;
        }
        const bossArray = [];
        for (const name in bosses) {
            const boss = bosses[name];
            let spawnChance = boss.minSpawn*100;
            if (boss.minSpawn !== boss.maxSpawn) {
                spawnChance = `${boss.minSpawn*100}-${boss.maxSpawn*100}`;
            }
            bossArray.push(`${boss.name} (${spawnChance}%)`);
        }

        // Construct the embed
        embed.setTitle(selectedMapData.name);
        if (mapUrl) {
            embed.setURL(mapUrl);
        }
        embed.addField('Duration ⌛', displayDuration, true);
        embed.addField('Players 👥', displayPlayers, true);
        embed.addField('Time 🕑', displayTime, true);
        embed.addField('Bosses 💀', bossArray.join('\n', true));
        if (selectedMapData.key) {
            embed.setImage(`https://tarkov.dev/maps/${selectedMapData.key}.jpg`);
        }

        // If the map was made by a contributor, give them credit
        if (selectedMapData.source) {
            embed.setFooter({ text: `Map made by ${selectedMapData.source}` });
        }

        await interaction.editReply({
            embeds: [embed],
        });
    },
    examples: [
        '/map woods',
        '/map customs'
    ]
};

export default defaultFunction;
