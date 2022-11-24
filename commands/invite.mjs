import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import { getFixedT } from '../modules/translations.mjs';

const comT = getFixedT(null, 'command');

const BOT_INVITE_LINK = "https://discord.com/api/oauth2/authorize?client_id=955521336904667227&permissions=309237664832&scope=bot%20applications.commands";

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Get an invite link to invite the bot to another Discord server')
        .setNameLocalizations({
            'es-ES': comT('invite', {lng: 'es-ES'}),
            ru: comT('invite', {lng: 'ru'}),
        })
        .setDescriptionLocalizations({
            'es-ES': comT('invite_desc', {lng: 'es-ES'}),
            ru: comT('invite_desc', {lng: 'ru'}),
        }),

    async execute(interaction) {
        const t = getFixedT(interaction.locale);
        const embed = new EmbedBuilder();
        embed.setTitle(`${t('Stash Invite Link')} 🔗`);
        embed.setAuthor({
            name: 'Stash',
            iconURL: 'https://assets.tarkov.dev/tarkov-dev-icon.png',
        });
        embed.setDescription(t('Click the link above to invite the Stash bot to your Discord server!'));
        embed.setURL(BOT_INVITE_LINK);
        embed.setFooter({ text: `${t('Enjoy')} ❤️` });
        await interaction.reply({ embeds: [embed] });
    },
};

export default defaultFunction;
