import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import gameData from '../modules/game-data.mjs';
import { getFixedT, getCommandLocalizations } from '../modules/translations.mjs';
import { getTiers } from '../modules/loot-tier.mjs';

const bossDetails = [
    {
        "name": "cultist-priest",
        "details": "Sneaky bois. Cultists lurk in the shadows in groups of 3-5, waiting for a player to approach. They silently approach their enemies and stab them using either normal knives or, in case of the priests, the poisoned Cultist knife. If fired upon, the Cultists will return fire using firearms and grenades. After they attack a player with their knife, they may choose to run off into the woods again and return to the shadows.",
    },
    {
        "name": "death-knight",
        "details": "The leader of 'The Goons'. Can spawn on many different maps.",
    },
    {
        "name": "glukhar",
        "details": "Glukhar and his many guards are extremely hostile. It's very unlikely to find success while fighting in any open areas. Small hallways and closed rooms are preferable. Glukhar and his guards are very accurate. Glukhar and his guards will stay near each other at all times and his guards will follow him to wherever he goes.",
    },
    {
        "name": "killa",
        "details": "The true Giga Chad of Tarkov. Killa uses a light machine gun or other automatic weapon to suppress the enemy, while lurking from cover to cover, getting closer to his target for the final push. During the assault he moves in a zig-zag pattern, uses smoke and fragmentation grenades, and relentlessly suppresses enemies with automatic fire. He will follow his target large distances out of his patrol route, so be sure to run very far to get away from him if he has locked onto you.",
    },
    {
        "name": "reshala",
        "details": "He will normally try to stay at the back of the fight and hidden from the player's view. Additionally, he never wears armor. Be careful as a player scav, as if you are at lower scav karma levels Reshala or his guards may shoot you without provocation or will shoot you if you come to close to Reshala. His guards are sometimes known to give warnings to player scavs with low karma before becoming hostile.",
    },
    {
        "name": "sanitar",
        "details": "When engaged in combat, he will fight alongside his fellow scavs and guards, but may often break away to heal or inject himself. He has plenty of meds, so a prolonged engagement is possible.",
    },
    {
        "name": "shturman",
        "details": "Shturman and his followers will engage the player at a long range protecting the sawmill area of the woods. They prefer to keep their distance, as they are not suited for close quarters combat.",
    },
    {
        "name": "tagilla",
        "details": "He is batshit insane and will attempt to hammer you down. However, if you are in a position that he cannot path-find to, such as the rafters, he will use his secondary weapon (usually a shotgun) to kill you from a distance. He's active immediately at the start of raid. The boss can set ambushes, open suppressive fire, and breach if needed.",
    },
    {
        "name": "zryachiy",
        "details": "Lightkeeper's cultist sniper.",
    }
];

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('boss')
        .setDescription('Get detailed information about a boss')
        .setNameLocalizations(getCommandLocalizations('boss'))
        .setDescriptionLocalizations(getCommandLocalizations('boss_desc'))
        .addStringOption(option => option
            .setName('boss')
            .setDescription('Select a boss')
            .setNameLocalizations(getCommandLocalizations('boss'))
            .setDescriptionLocalizations(getCommandLocalizations('boss_select_desc'))
            .setRequired(true)
            .setChoices(...gameData.bosses.choices())
        ),

    async execute(interaction) {
        await interaction.deferReply();
        const t = getFixedT(interaction.locale);

        // Get the boss name from the command interaction
        const bossName = interaction.options.getString('boss');

        const bosses = await gameData.bosses.getAll(interaction.locale);

        // Fetch all current map/boss data
        const maps = await gameData.maps.getAll(interaction.locale);

        // Fetch all items
        const items = await gameData.items.getAll(interaction.locale);

        const tiers = await getTiers();

        // Construct the embed
        const embed = new EmbedBuilder();

        const boss = bosses.find(b => b.normalizedName === bossName);

        // Add base fields to the embed
        // Construct the description with boss details
        let details = t('Unknown');
        let health = boss.health;
        const allLoot = {};
        const addLoot = (id) => {
            if (allLoot[id]) {
                return;
            }
            const item = items.find(i => i.id === id);
            if (item) {
                allLoot[item.id] = item;
            }
        };
        boss.equipment.forEach(contained => {
            addLoot(contained.item.id);
            for (const part of contained.item.containsItems) {
                addLoot(part.item.id);
            }
        });
        boss.items.forEach(it => {
            addLoot(it.id)
        });

        let loot = Object.values(allLoot).filter(item => {
            if (item.types.includes('noFlea')) {
                return true;
            }
        });
        const legendaryLoot = Object.values(allLoot).map(item => {
            if (item.types.includes('noFlea')) {
                return false;
            }
            const size = item.width * item.height;
            const sellValue = item.sellFor.reduce((bestValue, sellFor) => {
                const sellValue = Math.round(sellFor.priceRUB/size);
                if (sellValue > bestValue) {
                    bestValue = sellValue;
                }
                return bestValue;
            }, 0);
            return {
                ...item,
                sellValue
            }
        }).filter(Boolean).filter(item => item.sellValue >= tiers.legendary).sort((a, b) => b.sellValue - a.sellValue);
        for (const item of legendaryLoot) {
            if (loot.length >= 15) {
                break;
            }
            loot.push(item);
        }
        loot = loot.map(item => item.name).join(', ');
        embed.setThumbnail(boss.imagePortraitLink);
        embed.setURL(`https://tarkov.dev/boss/${boss.normalizedName}`);

        for (const bossData of bossDetails) {
            if (bossData.name === bossName) {
                details = bossData.details;
                //loot = boss.loot?.map(lootItem => items.find(i => i.id === lootItem.id)?.name).filter(Boolean).join(', ');
                break;
            }
        }
        let description = `💡 **${t('About')}:**\n`;
        description += `${details}\n\n`;
        description += `• 💚 **${t('Health')}:** ${health}\n`;
        description += `• 💎 **${t('Special Loot')}:** ${loot}\n`;

        embed.setDescription(description);

        const mapEmbeds = [];
        for (const map of maps) {
            // Only use the data for the boss specified in the command
            const bossData = map.bosses.find(boss => boss.normalizedName === bossName);
            if (!bossData) continue;

            embed.setTitle(bossData.name);
            const mapEmbed = new EmbedBuilder();
            mapEmbed.setTitle(map.name);
            //mapEmbed.addFields({name: 'Map', value: `${map.name} (${bossData.spawnChance * 100}%)`, inline: false});

            // Join the spawn locations into a comma separated string
            const spawnLocations = bossData.spawnLocations.map(spawnLocation => spawnLocation.name).join(', ');

            // Join the escort names into a comma separated string
            const escortNames = bossData.escorts.map(escortName => `${escortName.name} x${escortName.amount[0].count}`).join(', ').replaceAll(' x1', '');

            var spawnTime;
            if (bossData.spawnTime === -1) {
                spawnTime = t('Raid Start');
            } else {
                spawnTime = `${bossData.spawnTime} ${t('seconds')}`;
            }

            // Format the embed description body
            // var description = '';
            // description += `• **Spawn Locations**: ${spawnLocations}\n`;

            mapEmbed.addFields(
                { name: `${t('Spawn Chance')} 🎲`, value: `${bossData.spawnChance * 100}%`, inline: true },
                { name: `${t('Spawn Locations')} 📍`, value: spawnLocations, inline: true },
                //{ name: 'Spawn Time 🕒', value: spawnTime, inline: true },
            );
            if (escortNames) {
                mapEmbed.addFields({name: `${t('Escort')} 💂`, value: escortNames, inline: true});
            }
            mapEmbeds.push(mapEmbed);
        }
        if (mapEmbeds.length === 1) {
            embed.addFields({name: t('Map'), value: mapEmbeds[0].data.title, inline: false});
            for (const field of mapEmbeds[0].data.fields) {
                embed.addFields({name: field.name, value: field.value, inline: true});
            }
            mapEmbeds.length = 0;
        }
        
        let overflowEmbeds = [];
        if (mapEmbeds.length >= 10) {
            overflowEmbeds = mapEmbeds.slice(9);
            mapEmbeds.splice(9)
        }

        // Send the message
        return interaction.editReply({
            embeds: [embed, ...mapEmbeds],
        }).then(reply => {
            if (overflowEmbeds.length > 0) {
                return interaction.followUp({
                    embeds: overflowEmbeds
                })
            }
            return reply;
        });
    },
    examples: [
        '/$t(boss) Killa',
        '/$t(boss) Reshala'
    ]
};

export default defaultFunction;
