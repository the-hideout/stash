import { SlashCommandBuilder } from '@discordjs/builders';
import { MessageEmbed } from 'discord.js';

import gameData from '../modules/game-data.mjs';

const baseImageUrl = 'https://assets.tarkov.dev';

const bossDetails = [
    {
        "name": "cultist priest",
        "details": "Sneaky bois. Cultists lurk in the shadows in groups of 3-5, waiting for a player to approach. They silently approach their enemies and stab them using either normal knives or, in case of the priests, the poisoned Cultist knife. If fired upon, the Cultists will return fire using firearms and grenades. After they attack a player with their knife, they may choose to run off into the woods again and return to the shadows.",
        "image": `${baseImageUrl}/cultist-priest.jpg`,
        "health": 850,
        "loot": "Secure Flash drive, SAS drive, Cultist knife"
    },
    {
        "name": "death knight",
        "details": "The leader of 'The Goons'. Can spawn on many different maps.",
        "image": `${baseImageUrl}/death-knight.jpg`,
        "health": 1120,
        "loot": "Death Knight mask, Crye Precision CPC plate carrier (Goons Edition)"
    },
    {
        "name": "glukhar",
        "details": "Glukhar and his many guards are extremely hostile. It's very unlikely to find success while fighting in any open areas. Small hallways and closed rooms are preferable. Glukhar and his guards are very accurate. Glukhar and his guards will stay near each other at all times and his guards will follow him to wherever he goes.",
        "image": `${baseImageUrl}/glukhar.jpg`,
        "health": 1010,
        "loot": "GP coin, ASh-12 12.7x55 assault rifle"
    },
    {
        "name": "killa",
        "details": "The true Giga Chad of Tarkov. Killa uses a light machine gun or other automatic weapon to suppress the enemy, while lurking from cover to cover, getting closer to his target for the final push. During the assault he moves in a zig-zag pattern, uses smoke and fragmentation grenades, and relentlessly suppresses enemies with automatic fire. He will follow his target large distances out of his patrol route, so be sure to run very far to get away from him if he has locked onto you.",
        "image": `${baseImageUrl}/killa.jpg`,
        "health": 890,
        "loot": "6B13 M modified assault armor (Tan), 'Maska-1SCh' bulletproof helmet (Killa)"
    },
    {
        "name": "reshala",
        "details": "He will normally try to stay at the back of the fight and hidden from the player's view. Additionally, he never wears armor. Be careful as a player scav, as if you are at lower scav karma levels Reshala or his guards may shoot you without provocation or will shoot you if you come to close to Reshala. His guards are sometimes known to give warnings to player scavs with low karma before becoming hostile.",
        "image": `${baseImageUrl}/reshala.jpg`,
        "health": 752,
        "loot": "Golden TT Pistol, Bitcoin"
    },
    {
        "name": "sanitar",
        "details": "When engaged in combat, he will fight alongside his fellow scavs and guards, but may often break away to heal or inject himself. He has plenty of meds, so a prolonged engagement is possible.",
        "image": `${baseImageUrl}/sanitar.jpg`,
        "health": 1270,
        "loot": "Sanitar's bag, LEDX Skin Transilluminator, Keycard with a blue marking, Health Resort office key with a blue tape, multiple stims and meds"
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

        // Add base fields to the embed
        embed.setTitle(bossName);

        // Construct the description with boss details
        let details = 'Unknown';
        let health = 'Unknown';
        let loot = 'Unknown';
        for (const boss of bossDetails) {
            if (boss.name.toLowerCase() === bossName.toLowerCase()) {
                details = boss.details;
                health = boss.health;
                loot = boss.loot;
                embed.setThumbnail(boss.image);
                break;
            }
        }
        let description = '???? **About:**\n';
        description += `${details}\n\n`;
        description += `??? ???? **Health:** ${health}\n`;
        description += `??? ???? **Unique Loot:** ${loot}\n`;

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
            // description += `??? **Spawn Locations**: ${spawnLocations}\n`;

            mapEmbed.addField('Spawn Chance ????', `${bossData.spawnChance * 100}%`, true);
            mapEmbed.addField('Spawn Locations ????', spawnLocations, true);
            //embed.addField('Spawn Time ????', spawnTime, true);
            if (escortNames) {
                mapEmbed.addField('Escort ????', escortNames, true);
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
