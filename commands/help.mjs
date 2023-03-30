import fs from 'fs';

import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import { getFixedT, getCommandLocalizations, comT } from '../modules/translations.mjs';
import progress from '../modules/progress-shard.mjs';

const nameLocalizations = {
    'es-ES': comT('help', {lng: 'es-ES'}),
    ru: comT('help', {lng: 'ru'}),
};

function getCommandOptions(command, locale = 'en') {
    let optionString = '';
    for (const option of command.options) {
        let optionName = comT(option.name, {lng: locale});
        if (!option.required) {
            optionName = `[${optionName}]`;
        }
        optionString += ` ${optionName}`;
    }
    return optionString;
};

function buildSyntax(command, locale = 'en') {
    let stem = `/${comT(command.name, {lng: locale})}`;
    let subCommands = false;
    if (command.options.length > 0 && command.options[0].options) {
        subCommands = true;
    }
    if (!subCommands) {
        return `${stem}${getCommandOptions(command, locale)}`;
    } 
    const syntaxes = {};
    for (const sub of command.options) {
        //const subCommandSyntax = `${stem} ${sub.name}${getCommandOptions(sub)}`;
        /*if (subcommand && sub.name == sub.name) {
            return subCommandSyntax;
        }*/
        syntaxes[sub.name] = `${stem} ${comT(sub.name, {lng: locale})}${getCommandOptions(sub, locale)}`;
    }
    return syntaxes;
};

const commands = {};
let commandChoices = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.mjs') && file !== 'help.mjs');

for (const file of commandFiles) {
    const command = await import(`./${file}`);
    if (command.default.data.name === 'stash') {
        continue;
    }
    commands[command.default.data.name] = {
        ...command.default.data,
        hasSubcommands: command.default.data.options.length > 0 && command.default.data.options[0].options,
        examples: command.default.examples,
    }
    commandChoices.push({name: command.default.data.name, value: command.default.data.name, name_localizations: command.default.data.name_localizations});
}
commandChoices.push({name: 'help', value: 'help', name_localizations: nameLocalizations});
commandChoices = commandChoices.sort((a,b) => {
    return a.name.localeCompare(b.name);
});

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Tells you a bit about the bot commands')
        .setNameLocalizations(getCommandLocalizations('help'))
        .setDescriptionLocalizations(getCommandLocalizations('help_desc'))
        .addStringOption(option => option
            .setName('command')
            .setDescription('Get help about command')
            .setNameLocalizations(getCommandLocalizations('command'))
            .setDescriptionLocalizations(getCommandLocalizations('help_command_desc'))
            .setChoices(...commandChoices)
        ),

    async execute(interaction) {
        const locale = await progress.getServerLanguage(interaction.guildId) || interaction.locale;
        const t = getFixedT(locale);
        const embed = new EmbedBuilder();
        const helpCommand = interaction.options.getString('command');

        if (!commands[helpCommand]) {
            embed.setTitle(t('Available Commands'));
            embed.setDescription(`${t('Need Help or Have Questions?')}
                [${t('Come visit us in our server.')}](https://discord.gg/XPAsKGHSzH)
                ${t('You can learn more about the bot\'s commands by entering:')}`);
            embed.addFields({ 
                name: `/${comT('help', {lng: locale})} [${comT('command', {lng: locale})}]`,
                value: `${t('Where [command] is one of the following commands:')} \n`+Object.keys(commands).map(comm => comT(comm, {lng: locale})).join('\n')
            });

            return interaction.reply({ embeds: [embed] });
        }

        const cmd = commands[helpCommand];

        embed.setTitle(t('Help for /') + comT(helpCommand, {lng: locale}));

        if (!cmd.hasSubcommands) {
            // no subcommands
            let exampleString = '';
            let examples = [];
            if (cmd.examples) {
                if (typeof cmd.examples === 'string') {
                    examples.push(cmd.examples);
                } else if (Array.isArray(cmd.examples)) {
                    examples.push(...cmd.examples);
                }
            }
            if (examples.length > 0) {
                exampleString = `\n\n${t('Examples')}: \n ${examples.map(ex => comT(ex, {lng: locale})).join('\n')}`;
            }
            embed.addFields({name: buildSyntax(cmd, locale), value: comT(`${helpCommand}_desc`, {lng: locale})+exampleString});
        } else {
            embed.setDescription(comT(`${helpCommand}_desc`, {lng: locale}));
            for (const subCommand of cmd.options) {
                let exampleString = '';
                let examples = [];
                if (cmd.examples && cmd.examples[subCommand.name]) {
                    if (typeof cmd.examples[subCommand.name] === 'string') {
                        examples.push(cmd.examples[subCommand.name]);
                    } else if (Array.isArray(cmd.examples[subCommand.name])) {
                        examples.push(...cmd.examples[subCommand.name]);
                    }
                }
                if (examples.length > 0) {
                    exampleString = `\n\n${t('Examples')}: \n ${examples.map(ex => comT(ex, {lng: locale})).join('\n')}`;
                }
                const syntaxes = buildSyntax(cmd, locale);
                const syntax = syntaxes[subCommand.name];
                embed.addFields({name: syntax, value: comT(`${helpCommand}_${subCommand.name}_desc`, {lng: locale})+exampleString});
            }
        }

        return interaction.reply({ embeds: [embed] });
    },
    examples: [
        '/$t(help) $t(barter)',
        '/$t(help) $t(progress)'
    ]
};

commands.help = {
    ...defaultFunction.data,
    hasSubcommands: false,
    examples: defaultFunction.examples,
};

export default defaultFunction;
