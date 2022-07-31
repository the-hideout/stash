import {SlashCommandBuilder} from '@discordjs/builders';
import {MessageEmbed} from 'discord.js';
import moment from 'moment';

import gameData from '../modules/game-data.mjs';
import progress from '../modules/progress-shard.mjs';

const subCommands = {
    show: async interaction => {
        let prog = await progress.getProgress(interaction.user.id);
        const embed = new MessageEmbed();
        if (!prog) {
            prog = await progress.getDefaultProgress();
            embed.setTitle(`Default progress - Level ${prog.level}`);
            embed.setDescription(`You do not have any saved progress. Below are the defaults used to determine craft/barter/price unlocks and flea market fees.`);
        } else {
            embed.setTitle(`${interaction.user.username} - Level ${prog.level}`);
            embed.setDescription(`These values are used to determine craft/barter/price unlocks and flea market fees.`);
        }

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

        if (prog.tarkovTracker && prog.tarkovTracker.token) {
            let lastUpdate = moment(prog.tarkovTracker.lastUpdate).fromNow();
            if (prog.tarkovTracker.lastUpdate == 0) lastUpdate = 'never';
            const nextUpdate = moment(await progress.getUpdateTime(interaction.user.id)).fromNow();
            embed.addField('TarkovTracker 🧭', `Last update: ${lastUpdate}\nNext update: ${nextUpdate}`, false);
        } else if (prog.tarkovTracker && prog.tarkovTracker.lastUpdateStatus === 'invalid') {
            embed.addField('TarkovTracker 🧭', '[❌ Invalid token](https://tarkovtracker.io/settings/)', false);
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
        const level = interaction.options.getInteger('level');
        if (traderId === 'all') {
            const traders = await gameData.traders.getAll();
            for (const trader of traders) {
                let lvl = level;
                let maxValue = trader.levels[trader.levels.length-1].level;
                if (lvl > maxValue) lvl = maxValue;
                progress.setTrader(interaction.user.id, trader.id, lvl);
            }
            await interaction.editReply({
                content: `✅ All traders set to ${level}.`
            });
            return;
        }

        const trader = await gameData.traders.get(traderId);
        if (!trader) {
            await interaction.editReply({
                content: '❌ No matching trader found.'
            });
            return;
        }
        let lvl = level;
        let maxValue = trader.levels[trader.levels.length-1].level;
        if (lvl > maxValue) lvl = maxValue;
        progress.setTrader(interaction.user.id, trader.id, lvl);

        await interaction.editReply({
            content: `✅ ${trader.name} set to LL${lvl}.`
        });
    },
    hideout: async interaction => {
        await interaction.deferReply({ephemeral: true});
        const stationId = interaction.options.getString('station');
        const level = interaction.options.getInteger('level');
        const prog = await progress.getProgress(interaction.user.id);
        let ttWarn = '';
        if (prog && prog.tarkovTracker.token) {
            ttWarn = '\nNote: Progress synced via [TarkovTracker](https://tarkovtracker.io/settings/) will overwrite your hideout settings. \nUse `/progress unlink` to stop syncing from TarkovTracker.';
        }
        if (stationId === 'all') {
            const stations = await gameData.hideout.getAll();
            for (const station of stations) {
                let lvl = level;
                let maxValue = station.levels[station.levels.length-1].level;
                if (lvl > maxValue) lvl = maxValue;
                progress.setHideout(interaction.user.id, station.id, lvl);
            }
            await interaction.editReply({
                content: `✅ All hideout stations set to ${level}.${ttWarn}`
            });
            return;
        }

        const station = await gameData.hideout.get(stationId);
        if (!station) {
            await interaction.editReply({
                content: '❌ No matching hideout station found.'
            });
            return;
        }
        let lvl = level;
        let maxValue = station.levels[station.levels.length-1].level;
        if (lvl > maxValue) lvl = maxValue;
        progress.setHideout(interaction.user.id, station.id, lvl);

        await interaction.editReply({
            content: `✅ ${station.name} set to level ${lvl}.${ttWarn}`
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
                content: `❌ You must supply your [TarkovTracker API token](https://tarkovtracker.io/settings/) to link your account.`,
                ephemeral: true
            });
            return;
        }

        progress.setToken(interaction.user.id, token);
        const updateTime = moment(await progress.getUpdateTime(interaction.user.id)).fromNow();
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
    },
    flea_market_fee: async interaction => {
        const intel = interaction.options.getInteger('intel_center_level');
        let mgmt = interaction.options.getInteger('hideout_management_level');
        if (mgmt > 50) mgmt = 50;
        if (mgmt < 0) mgmt = 0;
        progress.setHideout(interaction.user.id, '5d484fdf654e7600691aadf8', intel);
        progress.setSkill(interaction.user.id, 'hideoutManagement', mgmt);
        await interaction.reply({
            content: `✅ Intelligence Center set to ${intel}.\n✅ Hideout Management skill set to ${mgmt}.`,
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
            .addIntegerOption(option => option
                .setName('level')
                .setDescription('The trader\'s level')
                .setRequired(true)
                .setChoices([
                    ['1', 1],
                    ['2', 2],
                    ['3', 3],
                    ['4', 4],
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
            .addIntegerOption(option => option
                .setName('level')
                .setDescription('The station\'s level')
                .setRequired(true)
                .setChoices([
                    ['Not built', 0],
                    ['1', 1],
                    ['2', 2],
                    ['3', 3],
                    ['4', 4],
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
            .setDescription('Link your TarkovTracker account to sync hideout progress')
            .addStringOption(option => option
                .setName('token')
                .setRequired(true)
                .setDescription('Your TarkovTracker API token from https://tarkovtracker.io/settings/')
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName('unlink')
            .setDescription('Unlink your TarkovTracker account')
        )
        .addSubcommand(subcommand => subcommand
            .setName('flea_market_fee')
            .setDescription('Set your progress to accurately calculate flea market fees')    
            .addIntegerOption(option => option
                .setName('intel_center_level')
                .setDescription('Intelligence Center level')
                .setRequired(true)
                .setChoices([
                    ['Not built', 0],
                    ['1', 1],
                    ['2', 2],
                    ['3', 3],
                ])
            )
            .addIntegerOption(option => option
                .setName('hideout_management_level')
                .setDescription('Hideout Management skill level')
                .setRequired(true)
            )
        ),

    async execute(interaction) {
        subCommands[interaction.options._subcommand](interaction);
    },
    examples: {
        level: ['/progress level 42'],
        trader: ['/progress trader Prapor 3', '/progress trader Therapist 2'],
        link: '/progress link [TarkovTracker token]'
    }
};

export default defaultFunction;
