import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import moment from 'moment';

import gameData from '../modules/game-data.mjs';
import { getFixedT, getCommandLocalizations } from '../modules/translations.mjs';
import progress from '../modules/progress-shard.mjs';

const getPlayerLevel = (exp, levels) => {
    if (exp === 0) {
        return 0;
    }
    let expTotal = 0;
    for (let i = 0; i < levels.length; i++) {
        const levelData = levels[i];
        expTotal += levelData.exp;
        if (expTotal === exp) {
            return levelData.level;
        }
        if (expTotal > exp) {
            return levels[i - 1].level;
        }
        
    }
    return levels[levels.length-1].level;
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
        if (isNaN(accountId)) {
            return interaction.editReply({
                content: `❌ ${t('{{accountId}} is not a valid account id', {accountId})}`
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

        const [playerLevels, items, achievements] = await Promise.all([
            gameData.playerLevels.getAll(),
            gameData.items.getAll(lang),
            gameData.achievements.getAll(lang),
        ]);

        const playerLevel = getPlayerLevel(profile.info.experience, playerLevels);

        const dogtagIds = {
            Usec: '59f32c3b86f77472a31742f0',
            Bear: '59f32bb586f774757e1e8442'
        };

        const dogtagItem = items.find(i => i.id === dogtagIds[profile.info.side]);

        const embeds = [];

        const embed = new EmbedBuilder();
        embeds.push(embed);

        // Construct the embed
        embed.setTitle(`${profile.info.nickname} (${playerLevel} ${t(profile.info.side)})`);
        embed.setThumbnail(dogtagItem.iconLink);
        /*embed.setAuthor({
            name: trader.name,
            iconURL: trader.imageLink,
            url: `https://tarkov.dev/trader/${trader.normalizedName}`,
        });*/
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
        moment.locale(lang);
        const updatedText =  t('Updated {{updateTimeAgo}}', {updateTimeAgo: moment(new Date(profile.updated)).fromNow()});
        const gameModeLabel = t(`Game mode: {{gameMode}}`, {gameMode: commandT(`game_mode_${gameMode}`)});
        const footerText = `${updatedText} | ${gameModeLabel}`;
        
        const statTypes = {
            pmc: 'PMC',
            scav: 'Scav',
        };
        for (const statType in statTypes) {
            const sideLabel = statTypes[statType];
            const raidCount = profile[`${statType}Stats`].eft.overAllCounters.Items?.find(i => i.Key.includes('Sessions'))?.Value ?? 0
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
