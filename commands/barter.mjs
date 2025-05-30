import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import gameData from '../modules/game-data.mjs';
import progress from '../modules/progress-shard.mjs';
import { getFixedT, getCommandLocalizations } from '../modules/translations.mjs';
import createEmbed from '../modules/create-embed.mjs';

const MAX_BARTERS = 3;

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('barter')
        .setDescription('Find barters with a specific item')
        .setNameLocalizations(getCommandLocalizations('barter'))
        .setDescriptionLocalizations(getCommandLocalizations('barter_desc'))
        .addStringOption(option => option
            .setName('name')
            .setDescription('Item name to search for')
            .setNameLocalizations(getCommandLocalizations('name'))
            .setDescriptionLocalizations(getCommandLocalizations('name_search_desc'))
            .setAutocomplete(true)
            .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply();
        const { lang, gameMode } = await progress.getInteractionSettings(interaction);
        const t = getFixedT(lang);
        const commandT = getFixedT(lang, 'command');
        const searchString = interaction.options.getString('name');

        if (!searchString) {
            return interaction.editReply({
                content: t('You need to specify a search term'),
                ephemeral: true,
            });
        }

        const gameModeLabel = t(`Game mode: {{gameMode}}`, {gameMode: commandT(`game_mode_${gameMode}`)});

        const matchedBarters = [];

        const [items, barters, traders] = await Promise.all([
            gameData.items.getAll({lang, gameMode}),
            gameData.barters.getAll({gameMode}),
            gameData.traders.getAll({lang, gameMode})
        ]);
        const searchedItems = items.filter(item => item.name.toLowerCase().includes(searchString.toLowerCase()));

        for (const item of searchedItems) {
            for (const barter of item.bartersFor) {
                if (matchedBarters.includes(barter.id)) continue;
                matchedBarters.push(barter.id);
            }
            for (const barter of item.bartersUsing) {
                if (matchedBarters.includes(barter.id)) continue;
                matchedBarters.push(barter.id);
            }
        }

        if (matchedBarters.length === 0) {
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

        let embeds = [];

        const prog = await progress.getProgressOrDefault(interaction.user.id);

        for (let i = 0; i < matchedBarters.length; i = i + 1) {
            const barter = barters.find(b => b.id === matchedBarters[i]);
            const embed = await createEmbed.barter(barter, interaction, {items, traders, progress: prog, interactionSettings: {lang, gameMode}});

            embeds.push(embed);

            if (i == MAX_BARTERS - 1) {
                break;
            }
        }

        if (matchedBarters.length > MAX_BARTERS) {
            const ending = new EmbedBuilder();

            ending.setTitle("+" + (matchedBarters.length - MAX_BARTERS) + ` ${t('more')}`);
            ending.setURL("https://tarkov.dev/barters/?search=" + encodeURIComponent(searchString));

            let otheritems = '';

            for (let i = MAX_BARTERS; i < matchedBarters.length; i = i + 1) {
                const barter = barters.find(b => b.id === matchedBarters[i]);
                const rewardItem = items.find(it => it.id === barter.rewardItems[0].item.id);
                const trader = traders.find(tr => tr.id === barter.trader.id);
                const bitemname = `[${rewardItem.name}](${rewardItem.link}) (${trader.name} LL${barter.level})`;

                if (bitemname.length + 2 + otheritems.length > 2048) {
                    ending.setFooter({text: `${matchedBarters.length-i} ${t('additional results not shown.')} | ${gameModeLabel}`,});
                    break;
                }
                otheritems += bitemname + "\n";
            }
            ending.setDescription(otheritems);

            embeds.push(ending);
        } else {
            embeds[embeds.length-1].setFooter({text: gameModeLabel});
        }

        return interaction.editReply({ embeds: embeds });
    },
    examples: '/$t(barter) slick'
};

export default defaultFunction;
