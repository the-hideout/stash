import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import gameData from '../modules/game-data.mjs';
import realTimeToTarkovTime from '../modules/time.mjs';
import { getFixedT, getCommandLocalizations } from '../modules/translations.mjs';

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('map')
        .setDescription('Get detailed information about a map')
        .setNameLocalizations(getCommandLocalizations('map'))
        .setDescriptionLocalizations(getCommandLocalizations('map_desc'))
        .addStringOption(option => option
            .setName('map')
            .setDescription('Select a map')
            .setNameLocalizations(getCommandLocalizations('map'))
            .setDescriptionLocalizations(getCommandLocalizations('map_select_desc'))
            .setRequired(true)
            .setChoices(...gameData.maps.choices())
        ),

    async execute(interaction) {
        await interaction.deferReply();
        const t = getFixedT(interaction.locale);
        const mapId = interaction.options.getString('map');

        const mapData = await gameData.maps.getAll(interaction.locale);
        const embed = new EmbedBuilder();

        const selectedMapData = mapData.find(mapObject => mapObject.id === mapId);
        let displayDuration = `${selectedMapData.raidDuration} ${t('minutes')}`;

        // Get left and right real tarkov time
        let left = realTimeToTarkovTime(new Date(), true);
        let right = realTimeToTarkovTime(new Date(), false);
        let displayTime = `${left} - ${right}`;
        if (selectedMapData.normalizedName.includes('factory')) {
            // If the map is Factory, set the times to static values
            if (selectedMapData.normalizedName.includes('night')) {
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
        embed.addFields(
            { name: `${t('Duration')} ⌛`, value: displayDuration, inline: true},
            { name: `${t('Players')} 👥`, value: displayPlayers, inline: true},
            { name: `${t('Time')} 🕑`, value: displayTime, inline: true},
            { name: `${t('Bosses')} 💀`, value: bossArray.join('\n'), inline: true}
        );
        if (selectedMapData.key) {
            embed.setImage(`https://tarkov.dev/maps/${selectedMapData.key}.jpg`);
        }

        // If the map was made by a contributor, give them credit
        if (selectedMapData.source) {
            embed.setFooter({ text: t('Map made by {{author}}', {author: selectedMapData.source})});
        }

        return interaction.editReply({
            embeds: [embed],
        });
    },
    examples: [
        '/$t(map) Woods',
        '/$t(map) customs'
    ]
};

export default defaultFunction;
