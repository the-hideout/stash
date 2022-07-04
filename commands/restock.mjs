import {SlashCommandBuilder} from '@discordjs/builders';
import {MessageEmbed} from 'discord.js';
import moment from 'moment';

import gameData from '../modules/game-data.mjs';
import progress from '../modules/progress.mjs';

const subCommands = {
    show: async interaction => {
        await interaction.deferReply();
        //let prog = progress.getProgress(interaction.user.id);
        const traders = await gameData.traders.getAll();
        const embed = new MessageEmbed();
        embed.setTitle(`Trader restocks 🛒`);
        //embed.setDescription(``);
        for (const trader of traders) {
            embed.addField(trader.name, moment(trader.resetTime).fromNow(), true);
        }

        await interaction.editReply({
            embeds: [embed],
            ephemeral: true
        });
    },
    alert: async interaction => {
        await interaction.deferReply({ephemeral: true});
        const traders = await gameData.traders.getAll();
        let traderId = interaction.options.getString('trader');
        const sendAlert = interaction.options.getBoolean('send_alert');
        let action = 'set';
        let forWho = 'all traders';
        if (traderId === 'all') {
            traderId = traders.map(trader => trader.id);
            /*for (const trader of traders) {
                let lvl = level;
                let maxValue = trader.levels[trader.levels.length-1].level;
                if (lvl > maxValue) lvl = maxValue;
                progress.setTrader(interaction.user.id, trader.id, lvl);
            }
            await interaction.editReply({
                content: `✅ All traders set to ${level}.`
            });
            return;*/
        } else {
            forWho = traders.find(trader => trader.id === traderId).name;
        }

        if (sendAlert) {
            progress.addRestockAlert(interaction.user.id, traderId);
        } else {
            action = 'disabled';
            progress.removeRestockAlert(interaction.user.id, traderId);
        }

        await interaction.editReply({
            content: `✅ Restock alert ${action} for ${forWho}.`
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
