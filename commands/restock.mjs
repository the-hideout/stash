import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import moment from 'moment/min/moment-with-locales.js';
import { ChannelType, PermissionFlagsBits } from 'discord-api-types/v10';

import gameData from '../modules/game-data.mjs';
import progress from '../modules/progress-shard.mjs';
import { getFixedT, getCommandLocalizations, getTranslationChoices } from '../modules/translations.mjs';

const subCommands = {
    show: async interaction => {
        await interaction.deferReply({ephemeral: true});
        const t = getFixedT(interaction.locale);
        try {
            //let prog = progress.getProgress(interaction.user.id);
            const traders = await gameData.traders.getAll();
            const embed = new EmbedBuilder();
            embed.setTitle(`${t('Trader restocks')} 🛒`);
            //embed.setDescription(``);
            moment.locale(interaction.locale);
            for (const trader of traders) {
                embed.addFields({name: trader.name, value: moment(trader.resetTime).fromNow(), inline: true});
            }
            const alertsFor = await progress.getRestockAlerts(interaction.user.id);
            if (alertsFor.length > 0) {
                embed.setFooter({text: `${t('You have restock alerts set for')}: ${alertsFor.map(traderId => {
                    return traders.find(trader => trader.id === traderId).name;
                })}`});
            }

            return interaction.editReply({
                embeds: [embed]
            });
        } catch (error) {
            interaction.editReply(t('There was an error processing your request.'));
        }
    },
    alert: async interaction => {
        await interaction.deferReply({ephemeral: true});
        const t = getFixedT(interaction.locale);
        const traders = await gameData.traders.getAll();
        let traderId = interaction.options.getString('trader');
        const sendAlert = interaction.options.getBoolean('send_alert');
        let forWho = t('all traders');
        if (traderId === 'all') {
            traderId = traders.map(trader => trader.id);
        } else {
            forWho = traders.find(trader => trader.id === traderId).name;
        }

        let alertsFor = [];
        let action = 'enabled';
        if (sendAlert) {
            alertsFor = await progress.addRestockAlert(interaction.user.id, traderId, interaction.locale);
        } else {
            action = 'disabled';
            alertsFor = await progress.removeRestockAlert(interaction.user.id, traderId, interaction.locale);
        }
        let allAlerts = '';
        if ((sendAlert && alertsFor.length > 1 && alertsFor.length !== traders.length) || (!sendAlert && alertsFor.length > 0)) {
            allAlerts = `\n${t('You have alerts enabled for')}: ` + alertsFor.map(traderId => {
                return traders.find(trader => trader.id === traderId).name;
            }).join(', ');
        }

        return interaction.editReply({
            content: `✅ ${t(`Restock alert ${action} for {{traderName}}.`, {traderName: forWho})}${allAlerts}`
        });
    },
    channel: async interaction => {
        await interaction.deferReply({ephemeral: true});
        const t = getFixedT(interaction.locale);
        const isAdmin = interaction.memberPermissions.has(PermissionFlagsBits.Administrator);
        if (!isAdmin) {
            return interaction.editReply({
                content: `❌ ${t('You must be an administrator to set channel restock alerts.')}`
            });
        }
        const channel = interaction.options.getChannel('channel');
        if (!channel) {
            await progress.setRestockAlertChannel(interaction.guildId, false);
            return interaction.editReply({
                content: `✅ ${t('Restock alert channel disabled for this server.')}`
            });
        }
        const locale = interaction.options.getString('locale') || 'en';
        await progress.setRestockAlertChannel(interaction.guildId, channel?.id, locale);
        return interaction.editReply({
            content: `✅ ${t('Restock alert channel set to #{{channelName}}.', {channelName: channel.name})}`
        });
    },
};

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('restock')
        .setDescription('Show or set alerts for trader restock timers')
        .setNameLocalizations(getCommandLocalizations('restock'))
        .setDescriptionLocalizations(getCommandLocalizations('restock_desc'))
        .addSubcommand(subcommand => subcommand
            .setName('show')
            .setDescription('Show trader restock timers')
            .setNameLocalizations(getCommandLocalizations('show'))
            .setDescriptionLocalizations(getCommandLocalizations('restock_show_desc'))
        )
        .addSubcommand(subcommand => subcommand
            .setName('alert')
            .setDescription('Set alerts for trader restocks')
            .setNameLocalizations(getCommandLocalizations('alert'))
            .setDescriptionLocalizations(getCommandLocalizations('restock_alert_desc'))
            .addStringOption(option => option
                .setName('trader')
                .setDescription('Trader')
                .setNameLocalizations(getCommandLocalizations('trader'))
                .setDescriptionLocalizations(getCommandLocalizations('trader_desc'))
                .setRequired(true)
                .setChoices(...gameData.traders.choices(true))
            )
            .addBooleanOption(option => option
                .setName('send_alert')
                .setDescription('Whether to send an alert')
                .setNameLocalizations(getCommandLocalizations('send_alert'))
                .setDescriptionLocalizations(getCommandLocalizations('restock_alert_send_desc'))
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName('channel')
            .setDescription('Announce trader restocks in a Discord channel')
            .setNameLocalizations(getCommandLocalizations('channel'))
            .setDescriptionLocalizations(getCommandLocalizations('restock_channel_desc'))
            .addChannelOption(option => 
                option.setName('channel')
                .setDescription('The channel on this server in which to make announcements')
                .setNameLocalizations(getCommandLocalizations('channel'))
                .setDescriptionLocalizations(getCommandLocalizations('restock_channel_select_desc'))
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
            .addStringOption(option =>
                option.setName('locale')
                .setDescription('The language in which to post the restock notification')
                .setNameLocalizations(getCommandLocalizations('locale'))
                .setDescriptionLocalizations(getCommandLocalizations('restock_channel_locale_desc'))
                .setChoices(...getTranslationChoices()))
        ),
    async execute(interaction) {
        subCommands[interaction.options._subcommand](interaction);
    },
};

export default defaultFunction;
