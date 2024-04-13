import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

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
            .setDescriptionLocalizations(getCommandLocalizations('account_seach_desc'))
            .setAutocomplete(true)
            .setRequired(true)
            .setMinLength(3)
            .setMaxLength(15)
        ),

    async execute(interaction) {
        await interaction.deferReply();
        const locale = await progress.getServerLanguage(interaction.guildId) || interaction.locale;
        const t = getFixedT(locale);
        const accountId = interaction.options.getString('account');
        if (isNaN(accountId)) {
            return interaction.editReply({
                content: `❌ ${t('{{accountId}} is not a valid account id', {accountId})}`
            });
        }

        const profile = await fetch(`https://player.tarkov.dev/account/${accountId}`).then(r => r.json()).catch(error => {
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

        const [playerLevels, items] = await Promise.all([
            gameData.playerLevels.getAll(),
            gameData.items.getAll(locale),
        ]);

        const playerLevel = getPlayerLevel(profile.info.experience, playerLevels);

        const dogtagIds = {
            Usec: '59f32c3b86f77472a31742f0',
            Bear: '59f32bb586f774757e1e8442'
        };

        const dogtagItem = items.find(i => i.id === dogtagIds[profile.info.side]);

        const embed = new EmbedBuilder();

        // Construct the embed
        embed.setTitle(`${profile.info.nickname} (${playerLevel} ${t(profile.info.side)})`);
        embed.setThumbnail(dogtagItem.iconLink);
        /*embed.setAuthor({
            name: trader.name,
            iconURL: trader.imageLink,
            url: `https://tarkov.dev/trader/${trader.normalizedName}`,
        });*/
        embed.setURL(`https://tarkov.dev/player/${accountId}`);
        const descriptionParts = [`${t('Started Wipe')}: ${new Date(profile.info.registrationDate * 1000).toLocaleString()}`];
        /*if (task.minPlayerLevel) {
            descriptionParts.push(`${t('Minimum Level')}: ${task.minPlayerLevel}`);
        }*/
        embed.setDescription(descriptionParts.join('\n'));
        
        /*embed.addFields(
            { name: t('Objectives'), value: task.objectives.map(obj => `${obj.description}${obj.count > 1 ? ` (x${obj.count})` : ''}`).join('\n'), inline: false },
        );

        const footerParts = [`${task.experience} EXP`];
        for (const repReward of task.finishRewards.traderStanding) {
            const repTrader = traders.find(t => t.id === repReward.trader.id);
            const sign = repReward.standing >= 0 ? '+' : '';
            footerParts.push(`${repTrader.name} ${sign}${repReward.standing}`);
        }

        embed.setFooter({ text: footerParts.join(' | ') });*/

        return interaction.editReply({
            embeds: [embed],
        });
    },
    examples: [
        '/$t(player) Nikita',
        '/$t(player) Prapor'
    ]
};

export default defaultFunction;
