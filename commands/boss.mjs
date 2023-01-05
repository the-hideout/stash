import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import gameData from '../modules/game-data.mjs';
import { getFixedT, getCommandLocalizations } from '../modules/translations.mjs';

const baseImageUrl = 'https://assets.tarkov.dev';

const bossDetails = [
    {
        "name": "cultist-priest",
        "details": "Sneaky bois. Cultists lurk in the shadows in groups of 3-5, waiting for a player to approach. They silently approach their enemies and stab them using either normal knives or, in case of the priests, the poisoned Cultist knife. If fired upon, the Cultists will return fire using firearms and grenades. After they attack a player with their knife, they may choose to run off into the woods again and return to the shadows.",
        "image": `${baseImageUrl}/cultist-priest.jpg`,
        "health": 850,
        "loot": [
            {
                "id": "590c621186f774138d11ea29",
                "name": "Secure Flash drive"
            },
            {
                "id": "590c37d286f77443be3d7827",
                "name": "SAS drive"
            },
            {
                "id": "5fc64ea372b0dd78d51159dc",
                "name": "Cultist knife"
            },
        ]
    },
    {
        "name": "death-knight",
        "details": "The leader of 'The Goons'. Can spawn on many different maps.",
        "image": `${baseImageUrl}/death-knight.jpg`,
        "health": 1120,
        "loot": [
            {
                "id": "62963c18dbc8ab5f0d382d0b",
                "name": "Death Knight mask"
            },
            {
                "id": "628b9c7d45122232a872358f",
                "name": "Crye Precision CPC plate carrier (Goons Edition)"
            },
            {
                "id": "6287549856af630b0f672cc4",
                "name": "Desert Tech MDR 7.62x51 assault rifle Killtube"
            },
            {
                "id": "628755f166bb7d4a3c32bc45",
                "name": "FN SCAR-H 7.62x51 assault rifle (FDE) Face"
            },
            {
                "id": "628755c60c9eb3366b521908",
                "name": "CMMG Mk47 Mutant 7.62x39 assault rifle Mace"
            },
            {
                "id": "628754510c9eb3366b5218f8",
                "name": "Glock 17 9x19 pistol Jackie"
            },
            {
                "id": "628753ee0c9eb3366b5218d4",
                "name": "Glock 18C 9x19 machine pistol Lizzie"
            },
        ]
    },
    {
        "name": "glukhar",
        "details": "Glukhar and his many guards are extremely hostile. It's very unlikely to find success while fighting in any open areas. Small hallways and closed rooms are preferable. Glukhar and his guards are very accurate. Glukhar and his guards will stay near each other at all times and his guards will follow him to wherever he goes.",
        "image": `${baseImageUrl}/glukhar.jpg`,
        "health": 1010,
        "loot": [
            {
                "id": "5d235b4d86f7742e017bc88a",
                "name": "GP Coin"
            },
            {
                "id": "5cadfbf7ae92152ac412eeef",
                "name": "ASh-12"
            },
        ]
    },
    {
        "name": "killa",
        "details": "The true Giga Chad of Tarkov. Killa uses a light machine gun or other automatic weapon to suppress the enemy, while lurking from cover to cover, getting closer to his target for the final push. During the assault he moves in a zig-zag pattern, uses smoke and fragmentation grenades, and relentlessly suppresses enemies with automatic fire. He will follow his target large distances out of his patrol route, so be sure to run very far to get away from him if he has locked onto you.",
        "image": `${baseImageUrl}/killa.jpg`,
        "health": 890,
        "loot": [
            {
                "id": "5c0e541586f7747fa54205c9",
                "name": "6B13 M modified assault armor (Tan)"
            },
            {
                "id": "5c0e874186f7745dc7616606",
                "name": "Maska-1SCh (Killa)"
            },
        ]
    },
    {
        "name": "reshala",
        "details": "He will normally try to stay at the back of the fight and hidden from the player's view. Additionally, he never wears armor. Be careful as a player scav, as if you are at lower scav karma levels Reshala or his guards may shoot you without provocation or will shoot you if you come to close to Reshala. His guards are sometimes known to give warnings to player scavs with low karma before becoming hostile.",
        "image": `${baseImageUrl}/reshala.jpg`,
        "health": 752,
        "loot": [
            {
                "id": "5b3b713c5acfc4330140bd8d",
                "name": "TT-33 7.62x25 TT pistol (Golden)"
            },
            {
                "id": "59faff1d86f7746c51718c9c",
                "name": "Physical bitcoin",
            }
        ]
    },
    {
        "name": "sanitar",
        "details": "When engaged in combat, he will fight alongside his fellow scavs and guards, but may often break away to heal or inject himself. He has plenty of meds, so a prolonged engagement is possible.",
        "image": `${baseImageUrl}/sanitar.jpg`,
        "health": 1270,
        "loot": [
            {
                "id": "5e997f0b86f7741ac73993e2",
                "name": "Sanitar's bag"
            },
            {
                "id": "5c0530ee86f774697952d952",
                "name": "LEDX"
            },
            {
                "id": "5efde6b4f5448336730dbd61",
                "name": "Keycard with a blue marking"
            },
            {
                "id": "5eff09cd30a7dc22fd1ddfed",
                "name": "Health Resort office key with a blue tape"
            },
        ]
    },
    {
        "name": "shturman",
        "details": "Shturman and his followers will engage the player at a long range protecting the sawmill area of the woods. They prefer to keep their distance, as they are not suited for close quarters combat.",
        "image": `${baseImageUrl}/shturman.jpg`,
        "health": 812,
        "loot": [
            {
                "id": "5d08d21286f774736e7c94c3",
                "name": "Shturman's stash key"
            },
            {
                "id": "5c0126f40db834002a125382",
                "name": "Red Rebel ice pick"
            },
        ]
    },
    {
        "name": "tagilla",
        "details": "He is batshit insane and will attempt to hammer you down. However, if you are in a position that he cannot path-find to, such as the rafters, he will use his secondary weapon (usually a shotgun) to kill you from a distance. He's active immediately at the start of raid. The boss can set ambushes, open suppressive fire, and breach if needed.",
        "image": `${baseImageUrl}/tagilla.jpg`,
        "health": 1220,
        "loot": [
            {
                "id": "609e860ebd219504d8507525",
                "name": "Crye Precision AVS MBAV (Tagilla Edition)"
            },
            {
                "id": "5ed515e03a40a50460332579",
                "name": "L1 (Norepinephrine) injector"
            },
            {
                "id": "59faff1d86f7746c51718c9c",
                "name": "Physical bitcoin"
            },
            {
                "id": "60a7ad2a2198820d95707a2e",
                "name": "Tagilla's welding mask 'UBEY'"
            },
            {
                "id": "60a7ad3a0c5cb24b0134664a",
                "name": "Tagilla's welding mask 'Gorilla'"
            },
            {
                "id": "60a7acf20c5cb24b01346648",
                "name": "BOSS cap"
            }
        ],
    },
    {
        "name": "zryachiy",
        "details": "Lightkeeper's cultist sniper.",
        //"image": `${baseImageUrl}/zryachiy.jpg`,
        "health": 1305,
        "loot": [
            {
                "id": "627e14b21713922ded6f2c15",
                "name": "Accuracy International AXMC .338 LM bolt-action sniper rifle"
            },
            {
                "id": "5a1eaa87fcdbcb001865f75e",
                "name": "Trijicon REAP-IR thermal scope"
            },
            {
                "id": "5bd05f1186f774572f181678",
                "name": "HK MP7A1 4.6x30 submachine gun SEALS"
            },
            {
                "id": "59f98b4986f7746f546d2cef",
                "name": "Serdyukov SR-1MP Gyurza 9x21 pistol"
            },
            {
                "id": "63626d904aa74b8fe30ab426",
                "name": "Zryachiy's balaclava"
            },
            {
                "id": "636270263f2495c26f00b007",
                "name": "Zryachiy's balaclava (folded)"
            },
        ],
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

        // Fetch all current map/boss data
        const maps = await gameData.maps.getAll(interaction.locale);

        // Fetch all items
        const items = await gameData.items.getAll(interaction.locale);

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
                loot = boss.loot?.map(lootItem => items.find(i => i.id === lootItem.id)?.name).filter(Boolean).join(', ');
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
