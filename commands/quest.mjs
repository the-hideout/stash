import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import gameData from '../modules/game-data.mjs';
import { getFixedT, getCommandLocalizations } from '../modules/translations.mjs';
import progress from '../modules/progress-shard.mjs';

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('quest')
        .setDescription('Get detailed information about a quest')
        .setNameLocalizations(getCommandLocalizations('quest'))
        .setDescriptionLocalizations(getCommandLocalizations('quest_desc'))
        .addStringOption(option => option
            .setName('name')
            .setDescription('Quest name to search for')
            .setNameLocalizations(getCommandLocalizations('name'))
            .setDescriptionLocalizations(getCommandLocalizations('quest_seach_desc'))
            .setAutocomplete(true)
            .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply();
        const { lang, gameMode } = await progress.getInteractionSettings(interaction);
        const t = getFixedT(lang);
        const commandT = getFixedT(lang, 'command');
        const gameModeLabel = t(`Game mode: {{gameMode}}`, {gameMode: commandT(`game_mode_${gameMode}`)});
        const searchString = interaction.options.getString('name');

        const [tasks, traders] = await Promise.all([
            gameData.tasks.getAll({lang, gameMode}),
            gameData.traders.getAll({lang, gameMode}),
        ]);
        const matchedTasks = tasks.filter(t => t.name.toLowerCase().includes(searchString.toLowerCase()));

        if (matchedTasks.length === 0) {
            const embed = new EmbedBuilder();
            embed.setDescription(t(`Found no results for "{{searchString}}"`, {
                searchString: searchString
            }));
            embed.setFooter({text: gameModeLabel});
            return interaction.editReply({
                embeds: [embed],
                ephemeral: true,
            });
        }

        let task = matchedTasks.find(t => t.name.toLowerCase() === searchString.toLowerCase());

        if (!task) {
            task = matchedTasks[0];
        }

        const trader = traders.find(t => t.id === task.trader.id);

        const embed = new EmbedBuilder();

        // Construct the embed
        embed.setTitle(task.name);
        if (task.taskImageLink) {
            embed.setImage(task.taskImageLink);
        }
        embed.setAuthor({
            name: trader.name,
            iconURL: trader.imageLink,
            url: `https://tarkov.dev/trader/${trader.normalizedName}`,
        });
        embed.setURL(`https://tarkov.dev/task/${task.normalizedName}`);
        const descriptionParts = [`[${t('Wiki Link')}](${task.wikiLink})`];
        if (task.minPlayerLevel) {
            descriptionParts.push(`${t('Minimum Level')}: ${task.minPlayerLevel}`);
        }
        embed.setDescription(descriptionParts.join('\n'));
        
        let objectivesText = task.objectives.map(obj => `${obj.description}${obj.count > 1 ? ` (x${obj.count})` : ''}`).join('\n');
        if (objectivesText.length > 1024) {
            objectivesText = objectivesText.substring(0, 1021) + '...';
        }
        embed.addFields(
            { name: t('Objectives'), value: objectivesText, inline: false },
        );

        const footerParts = [`${task.experience} EXP`];
        for (const repReward of task.finishRewards.traderStanding) {
            const repTrader = traders.find(t => t.id === repReward.trader.id);
            const sign = repReward.standing >= 0 ? '+' : '';
            footerParts.push(`${repTrader.name} ${sign}${repReward.standing}`);
        }
        footerParts.push(gameModeLabel);

        embed.setFooter({ text: footerParts.join(' | ') });

        return interaction.editReply({
            embeds: [embed],
        });
    },
    examples: [
        '/$t(quest) Debut',
        '/$t(quest) Supplier'
    ]
};

export default defaultFunction;
