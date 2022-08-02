import newrelic from 'newrelic';

import fs from 'fs';
import * as Sentry from "@sentry/node";
import "@sentry/tracing";

import {
    Client,
    Intents,
    Permissions,
    Collection,
} from 'discord.js';
// import Rollbar from 'rollbar';

import commands from './classic-commands/index.mjs';
import autocomplete, { fillCache } from './modules/autocomplete.mjs';
import progress from "./modules/progress-shard.mjs";
//import gameData from "./modules/game-data.mjs";

if (process.env.NODE_ENV === 'production') {
    Sentry.init({
        dsn: "https://ed4cc8e31fd6417998db23fb37819bec@o1189140.ingest.sentry.io/6312417",
        tracesSampleRate: 1.0,
    });
} else {
    console.log(`Bypassing Sentry in ${process.env.NODE_ENV || 'dev'} environment`);
}

const discordClient = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGES,
    ],
    partials: ["CHANNEL"],
});

discordClient.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.mjs'));

for (const file of commandFiles) {
    const command = await import(`./commands/${file}`);

    // Set a new item in the Collection
    // With the key as the command name and the value as the exported module
    discordClient.commands.set(command.default.data.name, command);
}

console.time('Fill-autocomplete-cache');
await fillCache();
console.timeEnd('Fill-autocomplete-cache');

discordClient.on('ready', () => {
    console.log(`Logged in as ${discordClient.user.tag}!`);
    //gameData.load();
    progress.init(discordClient);

    console.log('🟢 Systems now online');

    discordClient.user.setActivity('Tarkov.dev', {
        type: 'PLAYING',
    });
});

discordClient.login(process.env.DISCORD_API_TOKEN);

discordClient.on('guildCreate', async guild => {
    if (!guild.available) {
        return false;
    }

    try {
        const owner = await guild.fetchOwner();
        owner.send(`Thank you so much for adding the Stash bot to your Discord!\n\rTo get more information on how the bot works, try \`/help\` to get started.`);
    } catch (error) {
        console.error(error);
    }
});

discordClient.on('messageCreate', async message => {
    if (message.channel.type != 'DM' && message.channel.type != 'GUILD_TEXT') {
        return false;
    }

    if (message.author.bot) {
        // Don't do anything from other bots
        return false;
    }

    let formattedMessage = message.content.toLowerCase();

    if (message.mentions.has(discordClient.user)) {
        formattedMessage = '!help';
    }

    for (const command in commands) {
        if (formattedMessage.indexOf(command) !== 0) {
            continue;
        }

        if (message.channel.type === 'GUILD_TEXT' && !message.guild.me.permissionsIn(message.channel).has(Permissions.FLAGS.SEND_MESSAGES)) {
            const user = await discordClient.users.fetch(message.author.id, false);
            user.send(`Missing posting permissions in ${message.guild.name}#${message.channel.name} (${message.guild.id}). Replying here instead.\n\rIf you want to fix this, talk to your discord admin`);

            message.fallbackChannel = user;
        }

        if (message.channel.type === 'GUILD_TEXT' && !message.guild.me.permissionsIn(message.channel).has(Permissions.FLAGS.EMBED_LINKS)) {
            const user = await discordClient.users.fetch(message.author.id, false);
            user.send(`Missing embed permissions in ${message.guild.name}#${message.channel.name} (${message.guild.id}). Replying here instead.\n\rIf you want to fix this, talk to your discord admin`);

            message.fallbackChannel = user;
        }

        console.log(formattedMessage);

        try {
            commands[command](message, discordClient);
        } catch (error) {
            console.error(error);
        }

        return true;
    }
});

discordClient.on('interactionCreate', async interaction => {
    if (interaction.isAutocomplete()) {
        let options = autocomplete(interaction);

        options = options.splice(0, 25);

        await interaction.respond(options.map(name => {
            return {
                name: name,
                value: name,
            };
        }));

        return true;
    }

    let command = false;

    if (interaction.isSelectMenu()) {
        command = discordClient.commands.get(interaction.message.interaction.commandName);
    } else if (interaction.isCommand()) {
        command = discordClient.commands.get(interaction.commandName);
    }

    if (!command) {
        return false;
    }

    //await interaction.deferReply();

    try {
        if (process.env.NODE_ENV === 'production') {
            newrelic.incrementMetric(`Command/${command.default.data.name}`);
        }
        await command.default.execute(interaction);
    } catch (error) {
        if (process.env.NODE_ENV === 'production') {
            newrelic.incrementMetric(`Error/${command.default.data.name}`);
        }
        console.error(error);

        const message = {
            content: 'There was an error while executing this command!',
            ephemeral: true,
        };
        if (interaction.deferred) {
            await interaction.editReply(message);
        } else {
            await interaction.reply(message);
        }
    }
});