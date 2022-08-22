import {SlashCommandBuilder} from '@discordjs/builders';
import {MessageEmbed} from 'discord.js';
import moment from 'moment';

import gameData from '../modules/game-data.mjs';
import progress from '../modules/progress-shard.mjs';

const subCommands = {
    show: async interaction => {
        await interaction.deferReply({ephemeral: true});
        try {
            //let prog = progress.getProgress(interaction.user.id);
            const traders = await gameData.traders.getAll();
            const embed = new MessageEmbed();
            embed.setTitle(`Trader restocks 🛒`);
            //embed.setDescription(``);
            for (const trader of traders) {
                embed.addFields({name: trader.name, value: moment(trader.resetTime).fromNow(), inline: true});
            }
            const alertsFor = await progress.getRestockAlerts(interaction.user.id);
            if (alertsFor.length > 0) {
                embed.setFooter({text: `You have restock alerts set for: ${alertsFor.map(traderId => {
                    return traders.find(trader => trader.id === traderId).name;
                })}`});
            }

            await interaction.editReply({
                embeds: [embed]
            });
        } catch (error) {
            interaction.editReply('There was an error processing your request.');
        }
    },
    alert: async interaction => {
        await interaction.deferReply({ephemeral: true});
        const traders = await gameData.traders.getAll();
        let traderId = interaction.options.getString('trader');
        const sendAlert = interaction.options.getBoolean('send_alert');
        let forWho = 'all traders';
        if (traderId === 'all') {
            traderId = traders.map(trader => trader.id);
        } else {
            forWho = traders.find(trader => trader.id === traderId).name;
        }

        let alertsFor = [];
        let action = 'set';
        if (sendAlert) {
            alertsFor = await progress.addRestockAlert(interaction.user.id, traderId);
        } else {
            action = 'disabled';
            alertsFor = await progress.removeRestockAlert(interaction.user.id, traderId);
        }
        let allAlerts = '';
        if ((sendAlert && alertsFor.length > 1 && alertsFor.length !== traders.length) || (!sendAlert && alertsFor.length > 0)) {
            allAlerts = '\nYou have alerts set for: ' + alertsFor.map(traderId => {
                return traders.find(trader => trader.id === traderId).name;
            }).join(', ');
        }

        await interaction.editReply({
            content: `✅ Restock alert ${action} for ${forWho}.${allAlerts}`
        });
    },
};

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('restock')
        .setDescription('Show or set alerts for trader restock timers')
        .addSubcommand(subcommand => subcommand
            .setName('show')
            .setDescription('Show trader restock timers')
        )
        .addSubcommand(subcommand => subcommand
            .setName('alert')
            .setDescription('Set alerts for trader restocks')
            .addStringOption(option => option
                .setName('trader')
                .setDescription('Trader')
                .setRequired(true)
                .setChoices(gameData.traders.choices(true))
            )
            .addBooleanOption(option => option
                .setName('send_alert')
                .setDescription('Whether to send an alert')
                .setRequired(true)
            )
        ),

    async execute(interaction) {
        subCommands[interaction.options._subcommand](interaction);
    },
};

export default defaultFunction;
