import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import { getFixedT, getCommandLocalizations } from '../modules/translations.mjs';
import progress from '../modules/progress-shard.mjs';

const BOT_INVITE_LINK = "https://discord.com/api/oauth2/authorize?client_id=955521336904667227&permissions=309237664832&scope=bot%20applications.commands";

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Get an invite link to invite the bot to another Discord server')
        .setNameLocalizations(getCommandLocalizations('invite'))
        .setDescriptionLocalizations(getCommandLocalizations('invite_desc')),

    async execute(interaction) {
        await interaction.deferReply();
        const locale = await progress.getServerLanguage(interaction.guildId) || interaction.locale;
        const t = getFixedT(locale);
        const embed = new EmbedBuilder();
        embed.setTitle(`${t('Stash Invite Link')} 🔗`);
        embed.setAuthor({
            name: 'Stash',
            iconURL: 'https://assets.tarkov.dev/tarkov-dev-icon.png',
        });
        embed.setDescription(t('Click the link above to invite the Stash bot to your Discord server!'));
        embed.setURL(BOT_INVITE_LINK);
        embed.setFooter({ text: `${t('Enjoy')} ❤️` });
        return interaction.editReply({ embeds: [embed] });
    },
};

export default defaultFunction;
