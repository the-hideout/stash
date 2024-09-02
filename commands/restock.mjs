import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import moment from 'moment/min/moment-with-locales.js';
import { ChannelType, PermissionFlagsBits } from 'discord-api-types/v10';

import gameData from '../modules/game-data.mjs';
import progress from '../modules/progress-shard.mjs';
import { getFixedT, getCommandLocalizations, getTranslationChoices } from '../modules/translations.mjs';

const subCommands = {
    show: async interaction => {
        await interaction.deferReply({ephemeral: true});
        const { lang, gameMode } = await progress.getInteractionSettings(interaction);
        const t = getFixedT(lang);
        const commandT = getFixedT(lang, 'command');
        const gameModeLabel = t(`Game mode: {{gameMode}}`, {gameMode: commandT(`game_mode_${gameMode}`)});
        try {
            //let prog = progress.getProgress(interaction.user.id);
            const traders = (await gameData.traders.getAll({lang, gameMode})).filter(trader => trader.normalizedName !== 'lightkeeper' && trader.normalizedName !== 'btr-driver');
            const embed = new EmbedBuilder();
            embed.setTitle(`${t('Trader restocks')} 🛒`);
            //embed.setDescription(``);
            moment.locale(lang);
            for (const trader of traders) {
                embed.addFields({name: trader.name, value: moment(trader.resetTime).fromNow(), inline: true});
            }
            const alertsFor = await progress.getRestockAlerts(interaction.user.id, gameMode);
            if (alertsFor.length > 0) {
                embed.setFooter({text: `${t('You have restock alerts set for')}: ${alertsFor.map(traderId => {
                    return traders.find(trader => trader.id === traderId).name;
                })} | ${gameModeLabel}`});
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
        const { lang, gameMode } = await progress.getInteractionSettings(interaction);
        const t = getFixedT(lang);
        const commandT = getFixedT(lang, 'command');
        const gameModeLabel = t(`Game mode: {{gameMode}}`, {gameMode: commandT(`game_mode_${gameMode}`)});
        const traders = await gameData.traders.getAll({lang, gameMode});
        let traderId = interaction.options.getString('trader');
        const sendAlert = interaction.options.getBoolean('send_alert');
        let forWho = t('all traders');
        if (traderId === 'all') {
            traderId = traders.map(trader => trader.id);
        } else {
            const trader = traders.find(trader => trader.id === traderId);
            if (!trader) {
                let traderName = 'Unknown Trader';
                for (const gm of gameData.gameModes.getAll()) {
                    const gmTrader = await gameData.traders.get(traderId, {lang, gameMode: gm});
                    if (!gmTrader) {
                        continue;
                    }
                    traderName = gmTrader.name;
                    break;
                }
                const errorEmbed = new EmbedBuilder();
                errorEmbed.setDescription(`❌ ${t('Trader {{traderName}} does not exist in {{gameMode}}.', {traderName, gameMode: commandT(`game_mode_${gameMode}`)})}`);
                return interaction.editReply({
                    embeds: [errorEmbed],
                });
            }
            forWho = trader.name;
        }

        let alertsFor = [];
        let action = 'enabled';
        if (sendAlert) {
            alertsFor = await progress.addRestockAlert(interaction.user.id, traderId, interaction.locale, gameMode);
        } else {
            action = 'disabled';
            alertsFor = await progress.removeRestockAlert(interaction.user.id, traderId, interaction.locale, gameMode);
        }
        let allAlerts = '';
        if ((sendAlert && alertsFor.length > 1 && alertsFor.length !== traders.length) || (!sendAlert && alertsFor.length > 0)) {
            allAlerts = `\n${t('You have alerts enabled for')}: ` + alertsFor.map(traderId => {
                return traders.find(trader => trader.id === traderId).name;
            }).join(', ');
        }

        const embed = new EmbedBuilder();
        embed.setDescription(`✅ ${t(`Restock alert ${action} for {{traderName}}.`, {traderName: forWho})}${allAlerts}`);
        embed.setFooter({text: gameModeLabel});
        return interaction.editReply({
            embeds: [embed],
        });
    },
    channel: async interaction => {
        await interaction.deferReply({ephemeral: true});
        const { lang, gameMode } = await progress.getInteractionSettings(interaction);
        const t = getFixedT(lang);
        const commandT = getFixedT(lang, 'command');
        const gameModeLabel = t(`Game mode: {{gameMode}}`, {gameMode: commandT(`game_mode_${gameMode}`)});

        const embed = new EmbedBuilder();
        embed.setFooter({text: gameModeLabel});

        if (interaction.channel.type === ChannelType.DM || interaction.channel.type === ChannelType.GroupDM) {
            embed.setDescription(`❌ ${t('You must invoke this command in the server with the channel in which you want restock alerts.')}`);
            return interaction.editReply({
                embeds: [embed],
            });
        }
        const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
        if (!isAdmin) {
            embed.setDescription(`❌ ${t('You must be an administrator to set channel restock alerts.')}`);
            return interaction.editReply({
                embeds: [embed],
            });
        }
        const channel = interaction.options.getChannel('channel');
        if (!channel) {
            await progress.setRestockAlertChannel(interaction.guildId, false, undefined, gameMode);
            embed.setDescription(`✅ ${t('Restock alert channel disabled for this server.')}`);
            return interaction.editReply({
                embeds: [embed],
            });
        }
        const botMember = channel.members.find(user => user.id === interaction.client.user.id);
        if (!botMember) {
            embed.setDescription(`❌ ${t('Stash bot does not have access to #{{channelName}}.', {channelName: channel.name})}`);
            return interaction.editReply({
                embeds: [embed],
            });
        }
        const hasSendMessagesPermission = botMember.permissionsIn(channel) & PermissionFlagsBits.SendMessages;
        if (!hasSendMessagesPermission) {
            embed.setDescription(`❌ ${t('Stash bot does not have permission to send messages in #{{channelName}}.', {channelName: channel.name})}`);
            return interaction.editReply({
                embeds: [embed],
            });
        }
        const locale = interaction.options.getString('locale') || 'en';
        await progress.setRestockAlertChannel(interaction.guildId, channel?.id, locale, gameMode);
        embed.setDescription(`✅ ${t('Restock alert channel set to #{{channelName}}.', {channelName: channel.name})}`);
        return interaction.editReply({
            embeds: [embed],
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
                .setChoices(...gameData.traders.choices({all: true, blacklist: ['Fence', 'Lightkeeper', 'BTR Driver']}))
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
