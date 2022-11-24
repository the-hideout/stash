import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import gameData from '../modules/game-data.mjs';
import { getFixedT } from '../modules/translations.mjs';

const baseImageUrl = 'https://assets.tarkov.dev';

const bossDetails = [
    {
        "name": "cultist-priest",
        "details": "Sneaky bois. Cultists lurk in the shadows in groups of 3-5, waiting for a player to approach. They silently approach their enemies and stab them using either normal knives or, in case of the priests, the poisoned Cultist knife. If fired upon, the Cultists will return fire using firearms and grenades. After they attack a player with their knife, they may choose to run off into the woods again and return to the shadows.",
        "image": `${baseImageUrl}/cultist-priest.jpg`,
        "health": 850,
        "loot": "Secure Flash drive, SAS drive, Cultist knife"
    },
    {
        "name": "death-knight",
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
];

const comT = getFixedT(null, 'command');

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('boss')
        .setDescription('Get detailed information about a boss')
        .setNameLocalizations({
            'es-ES': comT('boss', {lng: 'es-ES'}),
            ru: comT('boss', {lng: 'ru'}),
        })
        .setDescriptionLocalizations({
            'es-ES': comT('boss_desc', {lng: 'es-ES'}),
            ru: comT('boss_desc', {lng: 'ru'}),
        })
        .addStringOption(option => option
            .setName('boss')
            .setDescription('Select a boss')
            .setNameLocalizations({
                'es-ES': comT('boss', {lng: 'es-ES'}),
                ru: comT('boss', {lng: 'ru'}),
            })
            .setDescriptionLocalizations({
                'es-ES': comT('boss_select', {lng: 'es-ES'}),
                ru: comT('boss_select', {lng: 'ru'}),
            })
            .setRequired(true)
            .setChoices(...gameData.bosses.choices())
        ),

    async execute(interaction) {
        await interaction.deferReply();
        const t = getFixedT(interaction.locale);

        // Get the boss name from the command interaction
        const bossName = interaction.options.getString('boss');

        // Fetch all current map/boss data
        const maps = await gameData.maps.getAll(interaction.locale);

        // Construct the embed
        const embed = new EmbedBuilder();

        // Add base fields to the embed
        // Construct the description with boss details
        let details = t('Unknown');
        let health = t('Unknown');
        let loot = t('Unknown');
        for (const boss of bossDetails) {
            if (boss.name === bossName) {
                details = boss.details;
                health = boss.health;
                loot = boss.loot;
                embed.setThumbnail(boss.image);
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
