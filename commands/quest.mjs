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
        const locale = await progress.getServerLanguage(interaction.guildId) || interaction.locale;
        const t = getFixedT(locale);
        const searchString = interaction.options.getString('name');

        const [tasks, traders] = await Promise.all([
            gameData.tasks.getAll(locale),
            gameData.traders.getAll(locale),
        ]);
        const matchedTasks = tasks.filter(t => t.name.toLowerCase().includes(searchString.toLowerCase()));

        if (matchedTasks.length === 0) {
            return interaction.editReply({
                content: t('Found no results for "{{searchString}}"', {
                    searchString: searchString
                }),
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
        embed.setURL(`https://tarkov.dev/task/${task.normalizedName}`);
        embed.addFields(
            { name: t('Trader'), value: trader.name, inline: true },
            { name: t('Minimum Level'), value: task.minPlayerLevel ? `${task.minPlayerLevel}` : '1', inline: true },
            { name: t('Objectives'), value: task.objectives.map(obj => obj.description).join('\n'), inline: false },
        );

        const wikiEmbed = new EmbedBuilder();
        wikiEmbed.setTitle('Wiki Link');
        wikiEmbed.setURL(task.wikiLink);

        return interaction.editReply({
            embeds: [embed, wikiEmbed],
        });
    },
    examples: [
        '/$t(map) Woods',
        '/$t(map) customs'
    ]
};

export default defaultFunction;
