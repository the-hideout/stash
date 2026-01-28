import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { DateTime } from 'luxon';

import gameData from '../modules/game-data.mjs';
import { getFixedT, getCommandLocalizations } from '../modules/translations.mjs';
import progress from '../modules/progress-shard.mjs';

const getPlayerLevel = (exp, levels) => {
    let expTotal = 0;
    for (let i = 0; i < levels.length; i++) {
        const levelData = levels[i];
        expTotal += levelData.exp;
        if (expTotal === exp) {
            return levelData;
        }
        if (expTotal > exp) {
            return levels[i - 1];
        }
    }
    return levels[levels.length-1];
};

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('player')
        .setDescription('Get player profile information')
        .setNameLocalizations(getCommandLocalizations('player'))
        .setDescriptionLocalizations(getCommandLocalizations('player_desc'))
        .addStringOption(option => option
            .setName('account')
            .setDescription('Account to retrieve')
            .setNameLocalizations(getCommandLocalizations('account'))
            .setDescriptionLocalizations(getCommandLocalizations('account_search_desc'))
            .setAutocomplete(true)
            .setRequired(true)
            .setMinLength(3)
            .setMaxLength(15)
        ),

    async execute(interaction) {
        await interaction.deferReply();
        const { lang, gameMode } = await progress.getInteractionSettings(interaction);
        const t = getFixedT(lang);
        const commandT = getFixedT(lang, 'command');
        const accountId = interaction.options.getString('account');

        const gameModeLabel = t(`Game mode: {{gameMode}}`, {gameMode: commandT(`game_mode_${gameMode}`)});

        const embeds = [];

        const embed = new EmbedBuilder();
        embeds.push(embed);

        if (isNaN(accountId)) {
            embed.setTitle(`❌ ${t('Account id {{accountId}} not found', {accountId})}`);
            embed.setDescription(t('Make sure you have the right game mode active and that the profile has been viewed on [tarkov.dev](https://tarkov.dev/players). It may take up to 24 hours after the profile first being viewed on tarkov.dev to be available here.'));
            embed.setFooter({text: gameModeLabel});
            return interaction.editReply({
                embeds,
            });
        }
        let profilePath = 'profile';
        if (gameMode !== 'regular') {
            profilePath = gameMode;
        }

        const profile = await fetch(`https://players.tarkov.dev/${profilePath}/${accountId}.json`).then(r => r.json()).catch(error => {
            return {
                err: error.message,
                errmsg: error.message,
            };
        });

        if (profile.err) {
            return interaction.editReply({
                content: `❌ ${t('Error retrieving account {{accountId}}: {{errorMessage}}', {accountId, errorMessage: profile.errmsg})}`,
            });
        }

        const [playerLevels, achievements] = await Promise.all([
            gameData.playerLevels.getAll(),
            gameData.achievements.getAll(lang),
        ]);

        const { level: playerLevel, levelBadgeImageLink } = getPlayerLevel(profile.info.experience, playerLevels);

        // Construct the embed
        embed.setTitle(`${profile.info.nickname} (${playerLevel} ${t(profile.info.side)})`);
        embed.setThumbnail(levelBadgeImageLink);
        /*embed.setAuthor({
            name: trader.name,
            iconURL: trader.imageLink,
            url: `https://tarkov.dev/trader/${trader.normalizedName}`,
        });*/
        const profileImageUrl = new URL(`https://imagemagic.tarkov.dev/player/${profile.aid}.webp`);
        const skipSlots = [
            'FirstPrimaryWeapon',
            'SecondPrimaryWeapon',
            'Holster',
            'Scabbard',
            'Pockets',
            'SecuredContainer',
            'ArmBand',
        ];
        const armorSlots = [
            /_plate$/,
            /^[Ss]oft_armor_/,
            /^Collar$/,
            /^Groin$/,
            /^[Hh]elmet_/,
        ];
        const skipProps = [
            'Repairable',
            'Sight',
            'StackObjectsCount',
        ];
        const equipment = {
            ...profile.equipment,
            Items: profile.equipment.Items.filter(e => {
                if (e._id === profile.equipment.Id) {
                    return true;
                }
                if (armorSlots.some(pattern => e.slotId.match(pattern))) {
                    return false;
                }
                let rootItem = e;
                while (rootItem.parentId !== profile.equipment.Id) {
                    rootItem = profile.equipment.Items.find(ee => ee._id === rootItem.parentId);
                }
                return !skipSlots.includes(rootItem.slotId);
            }).map(e => {
                if (!e.upd) {
                    return e;
                }
                for (const key in e.upd) {
                    if (skipProps.includes(key)) {
                        delete e.upd[key];
                    }
                }
                if (!Object.keys(e.upd)) {
                    delete e.upd;
                }
                return e;
            }),
        };

        profileImageUrl.searchParams.set('data', JSON.stringify({aid: profile.aid, customization: profile.customization, equipment}));
        if (profileImageUrl.toString().length <= 2048) {
            embed.setImage(profileImageUrl.toString());
        } else {
            console.log(`Skipping /player profile image for url length ${profileImageUrl.toString().length}`);
            console.log(JSON.stringify(equipment, null, 4));
        }
        embed.setURL(`https://tarkov.dev/players/${gameMode}/${accountId}`);
        const descriptionParts = [`${t('Hours Played')}: ${Math.round(profile.pmcStats.eft.totalInGameTime / 60 / 60)}`];
        const lastActive = profile.skills.Common.reduce((mostRecent, skill) => {
            if (skill.LastAccess > mostRecent) {
                return skill.LastAccess;
            }
            return mostRecent;
        }, 0);
        if (lastActive > 0) {
            descriptionParts.push(`${t('Last Active')}: ${new Date(lastActive * 1000).toLocaleString(lang)}`);
        }
        /*if (task.minPlayerLevel) {
            descriptionParts.push(`${t('Minimum Level')}: ${task.minPlayerLevel}`);
        }*/
        embed.setDescription(descriptionParts.join('\n'));
        const updatedText =  t('Updated {{updateTimeAgo}}', {updateTimeAgo: DateTime.fromMillis(profile.updated, {locale: lang}).toRelative()});
        const footerText = `${updatedText} | ${gameModeLabel}`;
        
        const statTypes = {
            pmc: 'PMC',
            scav: 'Scav',
        };
        for (const statType in statTypes) {
            const sideLabel = statTypes[statType];
            const raidCount = profile[`${statType}Stats`].eft.overAllCounters.Items?.find(i => i.Key.includes('Sessions'))?.Value ?? 0;
            const raidsSurvived = profile[`${statType}Stats`].eft.overAllCounters.Items?.find(i => i.Key.includes('Survived'))?.Value ?? 0;
            const raidsDied = profile[`${statType}Stats`].eft.overAllCounters.Items?.find(i => i.Key.includes('Killed'))?.Value ?? 0;
            const raidSurvivalRatio = raidCount > 0 ? raidsSurvived / raidCount : 0;
            const raidDiedRatio = raidCount > 0 ? raidsDied / raidCount : 0;
            const kills = profile[`${statType}Stats`].eft.overAllCounters.Items?.find(i => i.Key.includes('Kills'))?.Value ?? 0;
            const kdr = raidsDied > 0 ? (kills / raidsDied).toFixed(2) : '∞';
            const survivalStreak = profile[`${statType}Stats`].eft.overAllCounters.Items?.find(i => i.Key.includes('LongestWinStreak'))?.Value ?? 0;
            const fieldValue = `${t('Survive Rate')}: ${raidSurvivalRatio.toFixed(2)} (${raidsSurvived}/${raidCount})
                                ${t('Death Rate')}: ${raidDiedRatio.toFixed(2)} (${raidsDied}/${raidCount})
                                ${t('K:D', {nsSeparator: '|'})}: ${kdr} (${kills}/${raidsDied})
                                ${t('Longest Survival Streak')}: ${survivalStreak}`;
            embed.addFields(
                { name: t('{{side}} Stats', {side: t(sideLabel)}), value: fieldValue, inline: true },
            );
        }

        const completedAchievements = [];
        for (const achievementId in profile.achievements) {
            const achievement = achievements.find(a => a.id === achievementId);
            if (!achievement) {
                continue;
            }
            completedAchievements.push({...achievement, completed: profile.achievements[achievementId]});
        }
        if (completedAchievements.length > 0) {
            const achievementsEmbed = new EmbedBuilder();
            embeds.push(achievementsEmbed);
            achievementsEmbed.setTitle(t('Achievements'));
            for (const achievement of completedAchievements) {
                const completed = new Date(achievement.completed * 1000);
                if (!completed) {
                    continue;
                }
                if (achievementsEmbed.data.fields?.length >= 25) {
                    break;
                }
                achievementsEmbed.addFields(
                    { name: achievement.name, value: completed.toLocaleString(lang), inline: true },
                );
            }
            achievementsEmbed.setFooter({text: footerText});
        } else {
            embed.setFooter({text: footerText});
        }

        return interaction.editReply({
            embeds,
        });
    },
    examples: [
        '/$t(player) Nikita',
        '/$t(player) Prapor'
    ]
};

export default defaultFunction;
