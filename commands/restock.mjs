import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import moment from 'moment/min/moment-with-locales.js';
import { ChannelType, PermissionFlagsBits } from 'discord-api-types/v10';

import gameData from '../modules/game-data.mjs';
import progress from '../modules/progress-shard.mjs';
import { changeLanguage, t } from '../modules/translations.mjs';

const subCommands = {
    show: async interaction => {
        await interaction.deferReply({ephemeral: true});
        changeLanguage(interaction.locale);
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

            await interaction.editReply({
                embeds: [embed]
            });
        } catch (error) {
            interaction.editReply(t('There was an error processing your request.'));
        }
    },
    alert: async interaction => {
        await interaction.deferReply({ephemeral: true});
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
            alertsFor = await progress.addRestockAlert(interaction.user.id, traderId);
        } else {
            action = 'disabled';
            alertsFor = await progress.removeRestockAlert(interaction.user.id, traderId);
        }
        changeLanguage(interaction.locale);
        let allAlerts = '';
        if ((sendAlert && alertsFor.length > 1 && alertsFor.length !== traders.length) || (!sendAlert && alertsFor.length > 0)) {
            allAlerts = `\n${t('You have alerts enabled for')}: ` + alertsFor.map(traderId => {
                return traders.find(trader => trader.id === traderId).name;
            }).join(', ');
        }

        await interaction.editReply({
            content: `✅ ${t(`Restock alert ${action} for {{traderName}}.`, {traderName: forWho})}${allAlerts}`
        });
    },
    channel: async interaction => {
        await interaction.deferReply({ephemeral: true});
        const isAdmin = interaction.memberPermissions.has(PermissionFlagsBits.Administrator);
        if (!isAdmin) {
            await interaction.editReply({
                content: `❌ ${t('You must be an administrator to set channel restock alerts.')}`
            });
            return;
        }
        const channel = interaction.options.getChannel('channel');
        if (!channel) {
            await progress.setRestockAlertChannel(interaction.guildId, false);
            await interaction.editReply({
                content: `✅ ${t('Restock alert channel disabled for this server.')}`
            });
            return;
        }
        const result = await progress.setRestockAlertChannel(interaction.guildId, channel?.id);
        await interaction.editReply({
            content: `✅ ${t('Restock alert channel set to #{{channelName}}.', {channelName: channel.name})}`
        });
    },
};

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('restock')
        .setDescription('Show or set alerts for trader restock timers')
        .setNameLocalizations({
            'es-ES': 'repoblar',
            ru: 'пополнить_запасы',
        })
        .setDescriptionLocalizations({
            'es-ES': 'Mostrar o establecer alertas para los temporizadores de reabastecimiento del comerciante',
            ru: 'Показать или настроить оповещения для таймеров пополнения запасов трейдера',
        })
        .addSubcommand(subcommand => subcommand
            .setName('show')
            .setDescription('Show trader restock timers')
            .setNameLocalizations({
                'es-ES': 'mostrar',
                ru: 'показывать',
            })
            .setDescriptionLocalizations({
                'es-ES': 'Mostrar temporizadores de reposición de comerciantes',
                ru: 'Показать таймеры пополнения запасов трейдеров',
            })
        )
        .addSubcommand(subcommand => subcommand
            .setName('alert')
            .setDescription('Set alerts for trader restocks')
            .setNameLocalizations({
                'es-ES': 'alerta',
                ru: 'тревога',
            })
            .setDescriptionLocalizations({
                'es-ES': 'Establezca alertas para reabastecimientos de comerciantes',
                ru: 'Установите оповещения о пополнении запасов трейдера',
            })
            .addStringOption(option => option
                .setName('trader')
                .setDescription('Trader')
                .setNameLocalizations({
                    'es-ES': 'comerciante',
                    ru: 'торговец',
                })
                .setDescriptionLocalizations({
                    'es-ES': 'Comerciante',
                    ru: 'Tорговец',
                })
                .setRequired(true)
                .setChoices(...gameData.traders.choices(true))
            )
            .addBooleanOption(option => option
                .setName('send_alert')
                .setDescription('Whether to send an alert')
                .setNameLocalizations({
                    'es-ES': 'enviar_alerta',
                    ru: 'отправить_оповещение',
                })
                .setDescriptionLocalizations({
                    'es-ES': 'Ya sea para enviar una alerta',
                    ru: 'Отправлять ли оповещение',
                })
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName('channel')
            .setDescription('Announce trader restocks in a Discord channel')
            .setNameLocalizations({
                'es-ES': 'canal',
                ru: 'канал',
            })
            .setDescriptionLocalizations({
                'es-ES': 'Anuncie las reposiciones de los comerciantes en un canal de Discord',
                ru: 'Объявите трейдеру о пополнении запасов в канале Discord',
            })
            .addChannelOption(option => 
                option.setName('channel')
                .setDescription('The channel on this server in which to make announcements')
                .setNameLocalizations({
                    'es-ES': 'canal',
                    ru: 'канал',
                })
                .setDescriptionLocalizations({
                    'es-ES': 'El canal en este servidor en el que hacer anuncios.',
                    ru: 'Канал на этом сервере, в котором делать объявления',
                })
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
        ),
    async execute(interaction) {
        subCommands[interaction.options._subcommand](interaction);
    },
};

export default defaultFunction;
