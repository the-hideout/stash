import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import moment from 'moment/min/moment-with-locales.js';

import gameData from '../modules/game-data.mjs';
import progress from '../modules/progress-shard.mjs';
import { changeLanguage, t } from '../modules/translations.mjs';

const subCommands = {
    show: async interaction => {
        let prog = await progress.getProgress(interaction.user.id);

        changeLanguage(interaction.locale);

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

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    },
    level: async interaction => {
        const level = interaction.options.getInteger('level');
        progress.setLevel(interaction.user.id, level);
        changeLanguage(interaction.locale);
        await interaction.reply({
            content: `✅ ${t('PMC level set to {{level}}.', {level: level})}`,
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
            changeLanguage(interaction.locale);
            await interaction.editReply({
                content: `✅ ${t('All traders set to {{level}}.', {level: level})}`
            });
            return;
        }
        changeLanguage(interaction.locale);
        const trader = await gameData.traders.get(traderId);
        if (!trader) {
            await interaction.editReply({
                content: `❌ ${t('No matching trader found.')}`
            });
            return;
        }
        let lvl = level;
        let maxValue = trader.levels[trader.levels.length-1].level;
        if (lvl > maxValue) lvl = maxValue;
        progress.setTrader(interaction.user.id, trader.id, lvl);

        await interaction.editReply({
            content: `✅ ${t('{{thingName}} set to {{level}}.', {thingName: trader.name, level: lvl})}`
        });
    },
    hideout: async interaction => {
        await interaction.deferReply({ephemeral: true});
        const stationId = interaction.options.getString('station');
        const level = interaction.options.getInteger('level');
        const prog = await progress.getProgress(interaction.user.id);
        let ttWarn = '';
        changeLanguage(interaction.locale);
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
            await interaction.editReply({
                content: `✅ ${t('All hideout stations set to {{level}}.', {level: level})}${ttWarn}`
            });
            return;
        }

        const station = await gameData.hideout.get(stationId);
        if (!station) {
            await interaction.editReply({
                content: `❌ ${t('No matching hideout station found.')}`
            });
            return;
        }
        let lvl = level;
        let maxValue = station.levels[station.levels.length-1].level;
        if (lvl > maxValue) lvl = maxValue;
        progress.setHideout(interaction.user.id, station.id, lvl);

        await interaction.editReply({
            content: `✅ ${t('{{thingName}} set to {{level}}.', {thingName: station.name, level: lvl})}${ttWarn}`
        });
    },
    skill: async interaction => {
        const skillId = interaction.options.getString('skill');
        let level = interaction.options.getInteger('level');
        if (level > 50) level = 50;
        if (level < 0) level = 0;
        progress.setSkill(interaction.user.id, skillId, level);
        const skill = await gameData.skills.get(skillId);
        changeLanguage(interaction.locale);
        await interaction.reply({
            content: `✅ ${t('{{thingName}} set to {{level}}.', {thingName: skill.name, level: level})}`,
            ephemeral: true
        });
    },
    link: async interaction => {
        const token = interaction.options.getString('token');
        changeLanguage(interaction.locale);
        if (!token) {
            await interaction.reply({
                content: `❌ ${t('You must supply your [TarkovTracker API token](https://tarkovtracker.io/settings/) to link your account.')}`,
                ephemeral: true
            });
            return;
        }
        if (!token.match(/^[a-zA-Z0-9]{22}$/)) {
            await interaction.reply({
                content: `❌ ${t('The token you provided is invalid. Provide your [TarkovTracker API token](https://tarkovtracker.io/settings/) to link your account.')}`,
                ephemeral: true
            });
            return;
        }

        progress.setToken(interaction.user.id, token);
        moment.locale(interaction.locale);
        const updateTime = moment(await progress.getUpdateTime(interaction.user.id)).fromNow();
        await interaction.reply({
            content: `✅ ${t('Your hideout progress will update from TarkovTracker {{updateTime}}.', {updateTime: updateTime})}`,
            ephemeral: true
        });
    },
    unlink: async interaction => {
        progress.setToken(interaction.user.id, false);
        changeLanguage(interaction.locale);
        await interaction.reply({
            content: `✅ ${t('TarkovTracker account unlinked.')}`,
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
        changeLanguage(interaction.locale);
        await interaction.reply({
            content: `✅ ${t('{{thingName}} set to {{level}}.', {thingName: t('Intelligence Center'), level: intel})}.\n✅ ${t('Hideout Management skill set to {{managementLevel}}.', {managementLevel: mgmt})}`,
            ephemeral: true
        });
    }
};

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('progress')
        .setDescription('Manage your customized hideout and trader progress')
        .setNameLocalizations({
            'es-ES': 'progreso',
            ru: 'прогресс',
        })
        .setDescriptionLocalizations({
            'es-ES': 'Administre su escondite personalizado y el progreso del comerciante',
            ru: 'Управляйте своим индивидуальным убежищем и прогрессом торговца',
        })
        .addSubcommand(subcommand => subcommand
            .setName('show')
            .setDescription('Show your customized progress')
            .setNameLocalizations({
                'es-ES': 'mostrar',
                ru: 'показывать',
            })
            .setDescriptionLocalizations({
                'es-ES': 'Muestra tu progreso personalizado',
                ru: 'Покажите свой индивидуальный прогресс',
            })
        )
        .addSubcommand(subcommand => subcommand
            .setName('level')
            .setDescription('Set your PMC level')
            .setNameLocalizations({
                'es-ES': 'nivel',
                ru: 'уровень',
            })
            .setDescriptionLocalizations({
                'es-ES': 'Establece tu nivel de PMC',
                ru: 'Установите свой уровень PMC',
            })
            .addIntegerOption(option => option
                .setName('level')
                .setDescription('PMC level')
                .setNameLocalizations({
                    'es-ES': 'nivel',
                    ru: 'уровень',
                })
                .setDescriptionLocalizations({
                    'es-ES': 'nivel de PMC',
                    ru: 'уровень ЧВК',
                })
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName('trader')
            .setDescription('Set trader level')
            .setNameLocalizations({
                'es-ES': 'comerciante',
                ru: 'торговец',
            })
            .setDescriptionLocalizations({
                'es-ES': 'Establecer nivel de comerciante',
                ru: 'Установить уровень трейдера',
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
                    ru: 'Торговец',
                })
                .setRequired(true)
                .setChoices(...gameData.traders.choices(true))
            )
            .addIntegerOption(option => option
                .setName('level')
                .setDescription('The trader\'s level')
                .setNameLocalizations({
                    'es-ES': 'nivel',
                    ru: 'уровень',
                })
                .setDescriptionLocalizations({
                    'es-ES': 'El nivel del comerciante',
                    ru: 'уровень трейдера',
                })
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
            .setNameLocalizations({
                'es-ES': 'escondite',
                ru: 'убежище',
            })
            .setDescriptionLocalizations({
                'es-ES': 'Establecer el nivel de la estación de escondite',
                ru: 'Установить уровень убежища',
            })
            .addStringOption(option => option
                .setName('station')
                .setDescription('Hideout Station')
                .setNameLocalizations({
                    'es-ES': 'estación',
                    ru: 'станция',
                })
                .setDescriptionLocalizations({
                    'es-ES': 'Estación de escondite',
                    ru: 'Станция убежища',
                })
                .setRequired(true)
                .setChoices(...gameData.hideout.choices(true))
            )
            .addIntegerOption(option => option
                .setName('level')
                .setDescription('The station\'s level')
                .setNameLocalizations({
                    'es-ES': 'nivel',
                    ru: 'уровень',
                })
                .setDescriptionLocalizations({
                    'es-ES': 'El nivel de la estación',
                    ru: 'уровень станции',
                })
                .setRequired(true)
                .setChoices(
                    {name: 'Not built', value: 0},
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
            .setNameLocalizations({
                'es-ES': 'habilidad',
                ru: 'навык',
            })
            .setDescriptionLocalizations({
                'es-ES': 'Establecer nivel de habilidad',
                ru: 'Установить уровень мастерства',
            })
            .addStringOption(option => option
                .setName('skill')
                .setDescription('Skill')
                .setNameLocalizations({
                    'es-ES': 'habilidad',
                    ru: 'навык',
                })
                .setDescriptionLocalizations({
                    'es-ES': 'Habilidad',
                    ru: 'Навык',
                })
                .setRequired(true)
                .setChoices(...gameData.skills.choices(false))
            )
            .addIntegerOption(option => option
                .setName('level')
                .setDescription('The skill\'s level')
                .setNameLocalizations({
                    'es-ES': 'nivel',
                    ru: 'уровень',
                })
                .setDescriptionLocalizations({
                    'es-ES': 'El nivel de habilidad',
                    ru: 'Уровень навыка',
                })
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName('link')
            .setDescription('Link your TarkovTracker account to sync hideout progress')
            .setNameLocalizations({
                'es-ES': 'vincular',
                ru: 'ссылка',
            })
            .setDescriptionLocalizations({
                'es-ES': 'Vincula tu cuenta de TarkovTracker para sincronizar el progreso del escondite',
                ru: 'Свяжите свою учетную запись TarkovTracker, чтобы синхронизировать прогресс в укрытии',
            })
            .addStringOption(option => option
                .setName('token')
                .setDescription('Your TarkovTracker API token from https://tarkovtracker.io/settings/')
                .setNameLocalizations({
                    'es-ES': 'token',
                    ru: 'жетон',
                })
                .setDescriptionLocalizations({
                    'es-ES': 'Su token API TarkovTracker de https://tarkovtracker.io/settings/',
                    ru: 'Ваш токен TarkovTracker API с https://tarkovtracker.io/settings/',
                })
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName('unlink')
            .setDescription('Unlink your TarkovTracker account')
            .setNameLocalizations({
                'es-ES': 'desvincular',
                ru: 'разъединить',
            })
            .setDescriptionLocalizations({
                'es-ES': 'Desvincule su cuenta de TarkovTracker',
                ru: 'Отвяжите свою учетную запись TarkovTracker',
            })
        )
        .addSubcommand(subcommand => subcommand
            .setName('flea_market_fee')
            .setDescription('Set your progress to accurately calculate flea market fees')
            .setNameLocalizations({
                'es-ES': 'tarifa_mercado_pulgas',
                ru: 'барахолка_плата',
            })
            .setDescriptionLocalizations({
                'es-ES': 'Configure su progreso para calcular con precisión las tarifas del mercado de pulgas',
                ru: 'Установите свой прогресс, чтобы точно рассчитать комиссию барахолки',
            })
            .addIntegerOption(option => option
                .setName('intel_center_level')
                .setDescription('Intelligence Center level')
                .setNameLocalizations({
                    'es-ES': 'nivel_central_inteligencia',
                    ru: 'центральный_уровень_интеллекта',
                })
                .setDescriptionLocalizations({
                    'es-ES': 'Nivel del Centro de Inteligencia',
                    ru: 'Уровень разведывательного центра',
                })
                .setRequired(true)
                .setChoices(
                    {name: 'Not built', value: 0},
                    {name: '1', value: 1},
                    {name: '2', value: 2},
                    {name: '3', value: 3},
                )
            )
            .addIntegerOption(option => option
                .setName('hideout_management_level')
                .setDescription('Hideout Management skill level')
                .setNameLocalizations({
                    'es-ES': 'nivel_gestión_escondite',
                    ru: 'уровень_управления_убежищем',
                })
                .setDescriptionLocalizations({
                    'es-ES': 'Nivel de habilidad de gestión de escondite',
                    ru: 'уровень навыка управления убежищем',
                })
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
