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

        // Construct the embed
        embed.setTitle(selectedMapData.name);
        if (mapUrl) {
            embed.setURL(mapUrl);
        }
        embed.addField('Duration ⌛', displayDuration, true);
        embed.addField('Players 👥', displayPlayers, true);
        embed.addField('Time 🕑', displayTime, true);
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
