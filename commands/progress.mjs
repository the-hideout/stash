import {SlashCommandBuilder} from '@discordjs/builders';
import {MessageEmbed} from 'discord.js';
import moment from 'moment';

import gameData from '../modules/game-data.mjs';
import progress from '../modules/progress.mjs';

const subCommands = {
    show: async interaction => {
        const prog = progress.getProgress(interaction.user.id);
        if (!prog) {
            await interaction.reply({
                content: `You have no customized progress.`,
                ephemeral: true
            });
            return;
        }
        const embed = new MessageEmbed();
        embed.setTitle(`${interaction.user.username} - Level ${prog.level}`);

        const hideoutStatus = [];
        for (const stationId in prog.hideout) {
            const station = await gameData.hideout.get(stationId);
            hideoutStatus.push(`${station.name} level ${prog.hideout[stationId]}`);
        }
        if (hideoutStatus.length > 0) embed.addField('Hideout 🏠', hideoutStatus.join('\n'), true);

        const traderStatus = [];
        for (const traderId in prog.traders) {
            const trader = await gameData.traders.get(traderId);
            traderStatus.push(`${trader.name} LL${prog.traders[traderId]}`);
        }
        if (traderStatus.length > 0) embed.addField('Traders 🛒', traderStatus.join('\n'), true);

        const skillStatus = [];
        for (const skillId in prog.skills) {
            const skill = await gameData.skills.get(skillId);
            skillStatus.push(`${skill.name} level ${prog.skills[skillId]}`);
        }
        if (skillStatus.length > 0) embed.addField('Skills 💪', skillStatus.join('\n'), true);

        if (prog.tarkovTracker.token) {
            let lastUpdate = moment(prog.tarkovTracker.lastUpdate).fromNow();
            if (prog.tarkovTracker.lastUpdate == 0) lastUpdate = 'never';
            const nextUpdate = moment(progress.getUpdateTime(interaction.user.id)).fromNow();
            embed.addField('TarkovTracker 🧭', `Last update: ${lastUpdate}\nNext Update: ${nextUpdate}`, false);
        } else if (prog.tarkovTracker.lastUpdateStatus === 'invalid') {
            embed.addField('TarkovTracker 🧭', `❌ Invalid token`, false);
        }

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    },
    level: async interaction => {
        const level = interaction.options.getInteger('level');
        progress.setLevel(interaction.user.id, level);
        await interaction.reply({
            content: `✅ PMC level set to ${level}.`,
            ephemeral: true
        });
    },
    trader: async interaction => {
        await interaction.deferReply({ephemeral: true});
        const traderId = interaction.options.getString('trader');
        const level = interaction.options.getString('level');
        if (traderId === 'all') {
            const traders = await gameData.traders.getAll();
            for (const trader of traders) {
                let lvl = parseInt(level);
                let maxValue = trader.levels[trader.levels.length-1].level;
                if (lvl > maxValue) lvl = maxValue;
                progress.setTrader(interaction.user.id, trader.id, lvl);
            }
            await interaction.editReply({
                content: `✅ All traders set to ${level}.`,
                ephemeral: true
            });
            return;
        }

        const trader = await gameData.traders.get(traderId);
        if (!trader) {
            await interaction.editReply({
                content: '❌ No matching trader found.',
                ephemeral: true
            });
            return;
        }
        let lvl = parseInt(level);
        let maxValue = trader.levels[trader.levels.length-1].level;
        if (lvl > maxValue) lvl = maxValue;
        progress.setTrader(interaction.user.id, trader.id, lvl);

        await interaction.editReply({
            content: `✅ ${trader.name} set to LL${lvl}.`,
            ephemeral: true
        });
    },
    hideout: async interaction => {
        await interaction.deferReply({ephemeral: true});
        const stationId = interaction.options.getString('station');
        const level = interaction.options.getString('level');
        if (stationId === 'all') {
            const stations = await gameData.hideout.getAll();
            for (const station of stations) {
                let lvl = parseInt(level);
                let maxValue = station.levels[station.levels.length-1].level;
                if (lvl > maxValue) lvl = maxValue;
                progress.setHideout(interaction.user.id, station.id, lvl);
            }
            await interaction.editReply({
                content: `✅ All hideout stations set to ${level}.`,
                ephemeral: true
            });
            return;
        }

        const station = await gameData.hideout.get(stationId);
        if (!station) {
            await interaction.editReply({
                content: '❌ No matching hideout station found.',
                ephemeral: true
            });
            return;
        }
        let lvl = parseInt(level);
        let maxValue = station.levels[station.levels.length-1].level;
        if (lvl > maxValue) lvl = maxValue;
        progress.setHideout(interaction.user.id, station.id, lvl);

        await interaction.editReply({
            content: `✅ ${station.name} set to level ${lvl}.`,
            ephemeral: true
        });
    },
    skill: async interaction => {
        const skillId = interaction.options.getString('skill');
        let level = interaction.options.getInteger('level');
        if (level > 50) level = 50;
        if (level < 0) level = 0;
        progress.setSkill(interaction.user.id, skillId, level);
        const skill = await gameData.skills.get(skillId);
        await interaction.reply({
            content: `✅ ${skill.name} set to ${level}.`,
            ephemeral: true
        });
    },
    link: async interaction => {
        const token = interaction.options.getString('token');
        if (!token) {
            await interaction.reply({
                content: `❌ You must supply your TarkovTracker API token to link your account.`,
                ephemeral: true
            });
            return;
        }

        progress.setToken(interaction.user.id, token);
        const updateTime = moment(progress.getUpdateTime(interaction.user.id)).fromNow();
        await interaction.reply({
            content: `✅ Your hideout progress will update from TarkovTracker ${updateTime}.`,
            ephemeral: true
        });
    },
    unlink: async interaction => {
        progress.setToken(interaction.user.id, false);
        await interaction.reply({
            content: `✅ TarkovTracker account unlinked.`,
            ephemeral: true
        });
    }
};

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('progress')
        .setDescription('Manage your customized hideout and trader progress')
        .addSubcommand(subcommand => subcommand
            .setName('show')
            .setDescription('Show your customized progress')
        )
        .addSubcommand(subcommand => subcommand
            .setName('level')
            .setDescription('Set your PMC level')    
            .addIntegerOption(option => option
                .setName('level')
                .setDescription('PMC level')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName('trader')
            .setDescription('Set trader level')
            .addStringOption(option => option
                .setName('trader')
                .setDescription('Trader')
                .setRequired(true)
                .setChoices(gameData.traders.choices(true))
            )
            .addStringOption(option => option
                .setName('level')
                .setDescription('The trader\'s level')
                .setRequired(true)
                .setChoices([
                    ['1', '1'],
                    ['2', '2'],
                    ['3', '3'],
                    ['4', '4'],
                ])
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName('hideout')
            .setDescription('Set hideout station level')
            .addStringOption(option => option
                .setName('station')
                .setDescription('Hideout Station')
                .setRequired(true)
                .setChoices(gameData.hideout.choices(true))
            )
            .addStringOption(option => option
                .setName('level')
                .setDescription('The station\'s level')
                .setRequired(true)
                .setChoices([
                    ['Not built', '0'],
                    ['1', '1'],
                    ['2', '2'],
                    ['3', '3'],
                ])
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName('skill')
            .setDescription('Set skill level')
            .addStringOption(option => option
                .setName('skill')
                .setDescription('Skill')
                .setRequired(true)
                .setChoices(gameData.skills.choices(false))
            )
            .addIntegerOption(option => option
                .setName('level')
                .setDescription('The skill\'s level')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName('link')
            .setDescription('Link your TarkovTools account to sync hideout progress')
            .addStringOption(option => option
                .setName('token')
                .setRequired(true)
                .setDescription('Your TarkovTracker API token from https://tarkovtracker.io/settings/')
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName('unlink')
            .setDescription('Unlink your TarkovTools account')
        ),

    async execute(interaction) {
        subCommands[interaction.options._subcommand](interaction);
    },
};

export default defaultFunction;
