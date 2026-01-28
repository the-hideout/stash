import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import { getStims } from '../modules/game-data.mjs';
import { getFixedT, getCommandLocalizations } from '../modules/translations.mjs';
import progress from '../modules/progress-shard.mjs';

const MAX_ITEMS = 2;

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('stim')
        .setDescription('Get stim injector information')
        .setNameLocalizations(getCommandLocalizations('stim'))
        .setDescriptionLocalizations(getCommandLocalizations('stim_desc'))
        .addStringOption(option => {
            return option.setName('name')
                .setDescription('Stim to search for')
                .setNameLocalizations(getCommandLocalizations('name'))
                .setDescriptionLocalizations(getCommandLocalizations('stim_name_desc'))
                .setAutocomplete(true)
                .setRequired(true);
        }),

    async execute(interaction) {
        const locale = await progress.getServerLanguage(interaction.guildId) || interaction.locale;
        const t = getFixedT(locale);
        await interaction.deferReply();
        // Get the search string from the user invoked command
        let searchString = interaction.options.getString('name');

        const stims = await getStims(locale);

        const matchedStims = stims.filter(item => item.name.toLowerCase().includes(searchString.toLowerCase()));

        if (matchedStims.length === 0) {
            return interaction.editReply({
                content: t('Found no results for "{{searchString}}"', {
                    searchString: searchString
                }),
                ephemeral: true,
            });
        }

        let embeds = [];

        for (const item of stims) {
            if (item.shortName.toLowerCase() === searchString.toLowerCase()) {
                matchedStims.length = 0;
                matchedStims.push(item);
                break;
            }
        }

        for (let i = 0; i < matchedStims.length; i = i + 1) {
            const item = matchedStims[i];
            const embed = new EmbedBuilder();

            //let body = "**Price and Item Details:**\n";
            embed.setTitle(item.name);
            embed.setURL(item.link);

            embed.setThumbnail(item.iconLink);

            if (item.properties.cures.length > 0) {
                embed.addFields({name: t('Cures'), value: item.properties.cures.join('\n'), inline: true});
            }
            for (const effect of item.properties.stimEffects) {
                let title = effect.type;
                if (effect.skillName) title = `${title}: ${effect.skillName}`;
                const lines = [];
                if (effect.value !== 0) {
                    let sign = '+';
                    if (effect.value < 0) sign = '';
                    if (effect.percent) {
                        title += ` ${sign}${effect.value*100}%`;
                        //lines.push(`Value: ${effect.value*100}%`)
                    } else {
                        title += ` ${sign}${effect.value}`;
                        //lines.push(`Value: ${effect.value}`)
                    }
                }
                if (effect.chance !== 1) {
                    lines.push(`${t('Chance')}: ${effect.chance*100}%`);
                }
                if (effect.delay !== 1) {
                    lines.push(`${t('Delay')}: ${effect.delay} ${t('seconds')}`);
                }
                lines.push(`${t('Duration')}: ${effect.duration}`);
                embed.addFields({name: title, value: lines.join('\n'), inline: true});
            }

            embeds.push(embed);

            if (i >= MAX_ITEMS - 1) {
                break;
            }
        }

        if (MAX_ITEMS < matchedStims.length) {
            const ending = new EmbedBuilder();

            ending.setTitle("+" + (matchedStims.length - MAX_ITEMS) + ` ${t('more')}`);
            ending.setURL("https://tarkov.dev/?search=" + encodeURIComponent(searchString));

            let otheritems = '';
            for (let i = MAX_ITEMS; i < matchedStims.length; i = i + 1) {
                const itemname = `[${matchedStims[i].name}](${matchedStims[i].link})`;

                if (itemname.length + 2 + otheritems.length > 2048) {
                    ending.setFooter({text: `${matchedStims.length-i} ${t('additional results not shown.')}`,});

                    break;
                }

                otheritems += itemname + "\n";
            }

            ending.setDescription(otheritems);

            embeds.push(ending);
        }

        return interaction.editReply({ embeds: embeds });
    },
    examples: [
        '/$t(stim) Obdolbos'
    ]
};

export default defaultFunction;
