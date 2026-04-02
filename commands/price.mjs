import { EmbedBuilder, SlashCommandBuilder, MessageFlags } from 'discord.js';

import progress from '../modules/progress-shard.mjs';
import gameData from '../modules/game-data.mjs';
import { getFixedT, getCommandLocalizations } from '../modules/translations.mjs';
import createEmbed from '../modules/create-embed.mjs';

const MAX_ITEMS = 2;

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('price')
        .setDescription('Get an item\'s flea and trader value')
        .setNameLocalizations(getCommandLocalizations('price'))
        .setDescriptionLocalizations(getCommandLocalizations('price_desc'))
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
        const locale = lang;
        const t = getFixedT(locale);
        const commandT = getFixedT(lang, 'command');
        const gameModeLabel = t(`Game mode: {{gameMode}}`, {gameMode: commandT(`game_mode_${gameMode}`)});
        // Get the search string from the user invoked command
        const searchString = interaction.options.getString('name');

        const [ items, traders, hideout, barters, crafts ] = await Promise.all([
            gameData.items.getAll({lang, gameMode}),
            gameData.traders.getAll({lang, gameMode}),
            gameData.hideout.getAll({lang, gameMode}),
            gameData.barters.getAll({ gameMode}),
            gameData.crafts.getAll({ gameMode}),
        ]);
        const matchedItems = items.filter(i => i.name.toLowerCase().includes(searchString.toLowerCase()));

        if (matchedItems.length === 0) {
            const embed = new EmbedBuilder();
            embed.setDescription(t(`Found no results for "{{searchString}}"`, {
                searchString: searchString
            }));
            embed.setFooter({text: gameModeLabel});
            return interaction.editReply({
                embeds: [embed],
                flags: MessageFlags.Ephemeral,
            });
        }

        let embeds = [];

        const prog = await progress.getProgressOrDefault(interaction.user.id);

        for (const item of matchedItems) {
            if (item.shortName?.toLowerCase() === searchString) {
                matchedItems.length = 0;
                matchedItems.push(item);
                break;
            }
        }

        for (let i = 0; i < matchedItems.length; i = i + 1) {
            const item = matchedItems[i];
            const embed = await createEmbed.price(item, interaction, {items, traders, hideout, barters, crafts, interactionSettings: {lang, gameMode}, progress: prog});

            embeds.push(embed);

            if (i >= MAX_ITEMS - 1) {
                break;
            }
        }

        if (MAX_ITEMS < matchedItems.length) {
            const ending = new EmbedBuilder();

            ending.setTitle("+" + (matchedItems.length - MAX_ITEMS) + ` ${t('more')}`);
            ending.setURL("https://tarkov.dev/?search=" + encodeURIComponent(searchString));

            let otheritems = '';
            for (let i = MAX_ITEMS; i < matchedItems.length; i = i + 1) {
                const item = matchedItems[i];
                const itemname = `[${matchedItems[i].name}](${matchedItems[i].link})`;

                if (itemname.length + 2 + otheritems.length > 2048) {
                    ending.setFooter({text: `${matchedItems.length-i} ${t('additional results not shown.')} | ${gameModeLabel}`});

                    break;
                }

                otheritems += itemname + "\n";
            }

            ending.setDescription(otheritems);

            embeds.push(ending);
        } else {
            //embeds[embeds.length-1].setFooter({text: gameModeLabel});
        }

        return interaction.editReply({ embeds: embeds });
    },
    examples: [
        '/$t(price) bitcoin'
    ]
};

export default defaultFunction;
