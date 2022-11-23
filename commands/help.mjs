import fs from 'fs';

import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import { changeLanguage, t } from '../modules/translations.mjs';

function getCommandOptions(command) {
    let optionString = '';
    for (const option of command.options) {
        let optionName = option.name;
        if (!option.required) {
            optionName = `[${optionName}]`;
        }
        optionString += ` ${optionName}`;
    }
    return optionString;
};

function buildSyntax(command, subcommand) {
    let stem = `/${command.name}`;
    let subCommands = false;
    if (command.options.length > 0 && command.options[0].options) {
        subCommands = true;
    }
    if (!subCommands) {
        return `${stem}${getCommandOptions(command)}`;
    } 
    const syntaxes = {};
    for (const sub of command.options) {
        const subCommandSyntax = `${stem} ${sub.name}${getCommandOptions(sub)}`;
        if (subcommand && sub.name == sub.name) {
            return subCommandSyntax;
        }
        syntaxes[sub.name] = `${stem} ${sub.name}${getCommandOptions(sub)}`;
    }
    return syntaxes;
};

const commands = {};
let commandChoices = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.mjs') && file !== 'help.mjs');

for (const file of commandFiles) {
    const command = await import(`./${file}`);
    commands[command.default.data.name] = {
        name: command.default.data.name,
        description: command.default.data.description,
        options: command.default.data.options,
        syntax: buildSyntax(command.default.data),
        examples: command.default.examples
    }
    commandChoices.push({name: command.default.data.name, value: command.default.data.name});
}
commandChoices.push({name: 'help', value: 'help'});
commandChoices = commandChoices.sort((a,b) => {
    return a.name.localeCompare(b.name);
});

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Tells you a bit about the bot commands')
        .setNameLocalizations({
            'es-ES': 'ayuda',
            ru: 'помощь',
        })
        .setDescriptionLocalizations({
            'es-ES': 'Te cuenta un poco sobre los comandos del bot.',
            ru: 'расскажет вам немного о командах бота',
        })
        .addStringOption(option => option
            .setName('command')
            .setDescription('Get help about command')
            .setNameLocalizations({
                'es-ES': 'comando',
                ru: 'приказ',
            })
            .setDescriptionLocalizations({
                'es-ES': 'Obtener ayuda sobre el comando',
                ru: 'Получить помощь по приказ',
            })
            .setChoices(...commandChoices)
        ),

    async execute(interaction) {
        const embed = new EmbedBuilder();
        const helpCommand = interaction.options.getString('command');
        changeLanguage(interaction.locale);

        if (!commands[helpCommand]) {
            embed.setTitle(t('Available Commands'));
            embed.setDescription(`${t('Need Help or Have Questions?')}
        [Come visit us in our server.](https://discord.gg/XPAsKGHSzH)
        ${t('You can learn more about the bot\'s commands by entering:')}`);
            embed.addFields({ 
                name: t('/help [command]'), 
                value: `${t('Where [command] is one of the following commands:')} \n`+Object.keys(commands).join('\n')
            });

            await interaction.reply({ embeds: [embed] });

            return true;
        }

        const cmd = commands[helpCommand];

        embed.setTitle(t("Help for /") + helpCommand);

        if (typeof cmd.syntax === 'string') {
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
                exampleString = `\n\n${t('Examples')}: \n ${examples.join('\n')}`;
            }
            embed.addFields({name: cmd.syntax, value: cmd.description+exampleString});
        } else {
            embed.setDescription(cmd.description);
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
                    exampleString = `\n\n${t('Examples')}: \n ${examples.join('\n')}`;
                }
                const syntax = cmd.syntax[subCommand.name];
                embed.addFields({name: syntax, value: subCommand.description+exampleString});
            }
        }

        await interaction.reply({ embeds: [embed] });
    },
    examples: [
        '/help barter',
        '/help progress'
    ]
};

commands.help = {
    name: defaultFunction.data.name,
    description: defaultFunction.data.description,
    options: defaultFunction.data.options,
    syntax: buildSyntax(defaultFunction.data),
    examples: defaultFunction.examples
};

export default defaultFunction;
