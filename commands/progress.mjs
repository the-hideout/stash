import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import moment from 'moment/min/moment-with-locales.js';

import gameData from '../modules/game-data.mjs';
import progress from '../modules/progress-shard.mjs';
import { getFixedT, getCommandLocalizations } from '../modules/translations.mjs';

const subCommands = {
    show: async interaction => {
        const t = getFixedT(interaction.locale);
        let prog = await progress.getProgress(interaction.user.id);

        const embed = new EmbedBuilder();
        if (!prog) {
            prog = await progress.getDefaultProgress();
            embed.setTitle(`${t('Default progress')} - ${t('Level')} ${prog.level}`);
            embed.setDescription(t(`You do not have any saved progress. Below are the defaults used to determine craft/barter/price unlocks and flea market fees.`));
        } else {
            embed.setTitle(`${interaction.user.username} - ${('Level')} ${prog.level}`);
            embed.setDescription(t(`These values are used to determine craft/barter/price unlocks and flea market fees.`));
        }

        const hideoutStatus = [];
        for (const stationId in prog.hideout) {
            const station = await gameData.hideout.get(stationId);
            hideoutStatus.push(`${station.name} ${t('level')} ${prog.hideout[stationId]}`);
        }
        if (hideoutStatus.length > 0) embed.addFields({name: `${t('Hideout')} 🏠`, value: hideoutStatus.join('\n'), inline: true});

        const traderStatus = [];
        for (const traderId in prog.traders) {
            const trader = await gameData.traders.get(traderId);
            traderStatus.push(`${trader.name} ${t('LL')}${prog.traders[traderId]}`);
        }
        if (traderStatus.length > 0) embed.addFields({name: `${t('Traders')} 🛒`, value: traderStatus.join('\n'), inline: true});

        const skillStatus = [];
        for (const skillId in prog.skills) {
            const skill = await gameData.skills.get(skillId);
            skillStatus.push(`${skill.name} ${t('level')} ${prog.skills[skillId]}`);
        }
        if (skillStatus.length > 0) embed.addFields({name: `${('Skills')} 💪`, value: skillStatus.join('\n'), inline: true});

        if (prog.tarkovTracker && prog.tarkovTracker.token) {
            moment.locale(interaction.locale);
            let lastUpdate = moment(prog.tarkovTracker.lastUpdate).fromNow();
            if (prog.tarkovTracker.lastUpdate == 0) lastUpdate = t('never');
            const nextUpdate = moment(await progress.getUpdateTime(interaction.user.id)).fromNow();
            embed.addFields({name: 'TarkovTracker 🧭', value: `${t('Last Updated')}: ${lastUpdate}\n${t('Next update')}: ${nextUpdate}`, inline: false});
        } else if (prog.tarkovTracker && prog.tarkovTracker.lastUpdateStatus === 'invalid') {
            embed.addFields({name: 'TarkovTracker 🧭', value: `[❌ ${t('Invalid token')}](https://tarkovtracker.io/settings/)`, inline: false});
        }

        return interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    },
    level: async interaction => {
        const t = getFixedT(interaction.locale);
        const level = interaction.options.getInteger('level');
        progress.setLevel(interaction.user.id, level);
        return interaction.reply({
            content: `✅ ${t('PMC level set to {{level}}.', {level: level})}`,
            ephemeral: true
        });
    },
    trader: async interaction => {
        await interaction.deferReply({ephemeral: true});
        const t = getFixedT(interaction.locale);
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
            return interaction.editReply({
                content: `✅ ${t('All traders set to {{level}}.', {level: level})}`
            });
        }
        const trader = await gameData.traders.get(traderId);
        if (!trader) {
            return interaction.editReply({
                content: `❌ ${t('No matching trader found.')}`
            });
        }
        let lvl = level;
        let maxValue = trader.levels[trader.levels.length-1].level;
        if (lvl > maxValue) lvl = maxValue;
        progress.setTrader(interaction.user.id, trader.id, lvl);

        return interaction.editReply({
            content: `✅ ${t('{{thingName}} set to {{level}}.', {thingName: trader.name, level: lvl})}`
        });
    },
    hideout: async interaction => {
        await interaction.deferReply({ephemeral: true});
        const t = getFixedT(interaction.locale);
        const stationId = interaction.options.getString('station');
        const level = interaction.options.getInteger('level');
        const prog = await progress.getProgress(interaction.user.id);
        let ttWarn = '';
        if (prog && prog.tarkovTracker.token) {
            ttWarn = '\n'+t('Note: Progress synced via [TarkovTracker](https://tarkovtracker.io/settings/) will overwrite your hideout settings. \nUse `/progress unlink` to stop syncing from TarkovTracker.');
        }
        if (stationId === 'all') {
            const stations = await gameData.hideout.getAll();
            for (const station of stations) {
                let lvl = level;
                let maxValue = station.levels[station.levels.length-1].level;
                if (lvl > maxValue) lvl = maxValue;
                progress.setHideout(interaction.user.id, station.id, lvl);
            }
            return interaction.editReply({
                content: `✅ ${t('All hideout stations set to {{level}}.', {level: level})}${ttWarn}`
            });
        }

        const station = await gameData.hideout.get(stationId);
        if (!station) {
            return interaction.editReply({
                content: `❌ ${t('No matching hideout station found.')}`
            });
        }
        let lvl = level;
        let maxValue = station.levels[station.levels.length-1].level;
        if (lvl > maxValue) lvl = maxValue;
        progress.setHideout(interaction.user.id, station.id, lvl);

        return interaction.editReply({
            content: `✅ ${t('{{thingName}} set to {{level}}.', {thingName: station.name, level: lvl})}${ttWarn}`
        });
    },
    skill: async interaction => {
        const t = getFixedT(interaction.locale);
        const skillId = interaction.options.getString('skill');
        let level = interaction.options.getInteger('level');
        if (level > 50) level = 50;
        if (level < 0) level = 0;
        progress.setSkill(interaction.user.id, skillId, level);
        const skill = await gameData.skills.get(skillId);
        return interaction.reply({
            content: `✅ ${t('{{thingName}} set to {{level}}.', {thingName: skill.name, level: level})}`,
            ephemeral: true
        });
    },
    link: async interaction => {
        const t = getFixedT(interaction.locale);
        const token = interaction.options.getString('token');
        if (!token) {
            return interaction.reply({
                content: `❌ ${t('You must supply your [TarkovTracker API token](https://tarkovtracker.io/settings/) to link your account.')}`,
                ephemeral: true
            });
        }
        if (!token.match(/^[a-zA-Z0-9]{22}$/)) {
            return interaction.reply({
                content: `❌ ${t('The token you provided is invalid. Provide your [TarkovTracker API token](https://tarkovtracker.io/settings/) to link your account.')}`,
                ephemeral: true
            });
        }

        progress.setToken(interaction.user.id, token);
        moment.locale(interaction.locale);
        const updateTime = moment(await progress.getUpdateTime(interaction.user.id)).fromNow();
        return interaction.reply({
            content: `✅ ${t('Your hideout progress will update from TarkovTracker {{updateTime}}.', {updateTime: updateTime})}`,
            ephemeral: true
        });
    },
    unlink: async interaction => {
        const t = getFixedT(interaction.locale);
        progress.setToken(interaction.user.id, false);
        return interaction.reply({
            content: `✅ ${t('TarkovTracker account unlinked.')}`,
            ephemeral: true
        });
    },
    flea_market_fee: async interaction => {
        const t = getFixedT(interaction.locale);
        const intel = interaction.options.getInteger('intel_center_level');
        let mgmt = interaction.options.getInteger('hideout_management_level');
        if (mgmt > 50) mgmt = 50;
        if (mgmt < 0) mgmt = 0;
        progress.setHideout(interaction.user.id, '5d484fdf654e7600691aadf8', intel);
        progress.setSkill(interaction.user.id, 'hideoutManagement', mgmt);
        return interaction.reply({
            content: `✅ ${t('{{thingName}} set to {{level}}.', {thingName: t('Intelligence Center'), level: intel})}.\n✅ ${t('Hideout Management skill set to {{managementLevel}}.', {managementLevel: mgmt})}`,
            ephemeral: true
        });
    }
};

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('progress')
        .setDescription('Manage your customized hideout and trader progress')
        .setNameLocalizations(getCommandLocalizations('progress'))
        .setDescriptionLocalizations(getCommandLocalizations('progress_desc'))
        .addSubcommand(subcommand => subcommand
            .setName('show')
            .setDescription('Show your customized progress')
            .setNameLocalizations(getCommandLocalizations('show'))
            .setDescriptionLocalizations(getCommandLocalizations('progress_show_desc'))
        )
        .addSubcommand(subcommand => subcommand
            .setName('level')
            .setDescription('Set your PMC level')
            .setNameLocalizations(getCommandLocalizations('level'))
            .setDescriptionLocalizations(getCommandLocalizations('progress_level_desc'))
            .addIntegerOption(option => option
                .setName('level')
                .setDescription('PMC level')
                .setNameLocalizations(getCommandLocalizations('level'))
                .setDescriptionLocalizations(getCommandLocalizations('progress_level_select_desc'))
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName('trader')
            .setDescription('Set trader level')
            .setNameLocalizations(getCommandLocalizations('trader'))
            .setDescriptionLocalizations(getCommandLocalizations('progress_trader_desc'))
            .addStringOption(option => option
                .setName('trader')
                .setDescription('Trader')
                .setNameLocalizations(getCommandLocalizations('trader'))
                .setDescriptionLocalizations(getCommandLocalizations('trader_desc'))
                .setRequired(true)
                .setChoices(...gameData.traders.choices(true))
            )
            .addIntegerOption(option => option
                .setName('level')
                .setDescription('The trader\'s level')
                .setNameLocalizations(getCommandLocalizations('level'))
                .setDescriptionLocalizations(getCommandLocalizations('progress_trader_level_select_desc'))
                .setRequired(true)
                .setChoices(
                    {name: '1', value: 1},
                    {name: '2', value: 2},
                    {name: '3', value: 3},
                    {name: '4', value: 4},
                )
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName('hideout')
            .setDescription('Set hideout station level')
            .setNameLocalizations(getCommandLocalizations('hideout'))
            .setDescriptionLocalizations(getCommandLocalizations('progress_hideout_desc'))
            .addStringOption(option => option
                .setName('station')
                .setDescription('Hideout Station')
                .setNameLocalizations(getCommandLocalizations('station'))
                .setDescriptionLocalizations(getCommandLocalizations('progress_hideout_station_select_desc'))
                .setRequired(true)
                .setChoices(...gameData.hideout.choices(true))
            )
            .addIntegerOption(option => option
                .setName('level')
                .setDescription('The station\'s level')
                .setNameLocalizations(getCommandLocalizations('level'))
                .setDescriptionLocalizations(getCommandLocalizations('progress_hideout_level_select_desc'))
                .setRequired(true)
                .setChoices(
                    {name: '-', value: 0},
                    {name: '1', value: 1},
                    {name: '2', value: 2},
                    {name: '3', value: 3},
                    {name: '4', value: 4},
                )
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName('skill')
            .setDescription('Set skill level')
            .setNameLocalizations(getCommandLocalizations('skill'))
            .setDescriptionLocalizations(getCommandLocalizations('progress_skill_desc'))
            .addStringOption(option => option
                .setName('skill')
                .setDescription('Skill')
                .setNameLocalizations(getCommandLocalizations('skill'))
                .setDescriptionLocalizations(getCommandLocalizations('skill_desc'))
                .setRequired(true)
                .setChoices(...gameData.skills.choices(false))
            )
            .addIntegerOption(option => option
                .setName('level')
                .setDescription('The skill\'s level')
                .setNameLocalizations(getCommandLocalizations('level'))
                .setDescriptionLocalizations(getCommandLocalizations('progress_skill_level_select_desc'))
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName('link')
            .setDescription('Link your TarkovTracker account to sync hideout progress')
            .setNameLocalizations(getCommandLocalizations('link'))
            .setDescriptionLocalizations(getCommandLocalizations('progress_link_desc'))
            .addStringOption(option => option
                .setName('token')
                .setDescription('Your TarkovTracker API token from https://tarkovtracker.io/settings/')
                .setNameLocalizations(getCommandLocalizations('token'))
                .setDescriptionLocalizations(getCommandLocalizations('progress_link_token_desc'))
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName('unlink')
            .setDescription('Unlink your TarkovTracker account')
            .setNameLocalizations(getCommandLocalizations('unlink'))
            .setDescriptionLocalizations(getCommandLocalizations('progress_unlink_desc'))
        )
        .addSubcommand(subcommand => subcommand
            .setName('flea_market_fee')
            .setDescription('Set your progress to accurately calculate flea market fees')
            .setNameLocalizations(getCommandLocalizations('flea_market_fee'))
            .setDescriptionLocalizations(getCommandLocalizations('progress_flea_market_fee_desc'))
            .addIntegerOption(option => option
                .setName('intel_center_level')
                .setDescription('Intelligence Center level')
                .setNameLocalizations(getCommandLocalizations('intel_center_level'))
                .setDescriptionLocalizations(getCommandLocalizations('progress_flea_market_fee_intel_select_desc'))
                .setRequired(true)
                .setChoices(
                    {name: '-', value: 0},
                    {name: '1', value: 1},
                    {name: '2', value: 2},
                    {name: '3', value: 3},
                )
            )
            .addIntegerOption(option => option
                .setName('hideout_management_level')
                .setDescription('Hideout Management skill level')
                .setNameLocalizations(getCommandLocalizations('hideout_management_level'))
                .setDescriptionLocalizations(getCommandLocalizations('progress_flea_market_fee_mgmt_select_desc'))
                .setRequired(true)
            )
        ),

    async execute(interaction) {
        subCommands[interaction.options._subcommand](interaction);
    },
    examples: {
        level: ['/$t(progress) $t(level) 42'],
        trader: ['/$t(progress) $t(trader) Prapor 3', '/$t(progress) $t(trader) Therapist 2'],
        link: '/$t(progress) $t(link) [TarkovTracker $t(token)]'
    }
};

export default defaultFunction;
