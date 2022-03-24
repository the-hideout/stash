import fs from 'fs';

import cron from 'cron';

import {
    Client,
    Intents,
    Permissions,
    Collection,
} from 'discord.js';
// import Rollbar from 'rollbar';

import commands from './classic-commands/index.mjs';
import autocomplete, {fillCache} from './modules/autocomplete.mjs';
import got from 'got';

// if(process.env.NODE_ENV === 'production'){
//     console.log('Setting up rollbar');

//     new Rollbar({
//         accessToken: '7ac07140aabe45698942a94bc636d58c',
//         captureUncaught: true,
//         captureUnhandledRejections: true
//     });
// }

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

await fillCache();

discordClient.on('ready', () => {
    console.log(`Logged in as ${discordClient.user.tag}!`);

    discordClient.user.setActivity('tarkov.dev', {
        type: 'PLAYING',
    });
});

discordClient.login(process.env.DISCORD_API_TOKEN);

discordClient.on('guildCreate', async (guild) => {
    if (!guild.available) {
        return false;
    }

    const message = `Joined server ${guild.name} with ${guild.memberCount} members (${guild.id})!`;

    console.log(message);

    discordClient.users.fetch(process.env.ADMIN_ID, false)
        .then((user) => {
            user.send(message);
        });

    try {
        const owner = await guild.fetchOwner();
        owner.send(`Thank you so much for adding the Stash bot to your Discord!\n\rTo get more information on how the bot works, try !help or /help to get started.`);
    } catch (someError){
        console.error(someError);
    }
});

discordClient.on('guildDelete', (guild) => {
    if (!guild.available) {
        return false;
    }

    const message = `Kicked from server ${guild.name} with ${guild.memberCount} members (${guild.id})!`;

    console.log(message);

    discordClient.users.fetch(process.env.ADMIN_ID, false)
        .then((user) => {
            user.send(message);
        });
});

discordClient.on('messageCreate', async (message) => {
    // console.log(message);

    if (message.channel.type != 'DM' && message.channel.type != 'GUILD_TEXT') {
        return false;
    }

    if(message.author.bot){
        // Don't do anything from other bots

        return false;
    }

    let formattedMessage = message.content.toLowerCase();

    if(message.mentions.has(discordClient.user)){
        formattedMessage = '!help';
    }

    for(const command in commands){
        if(formattedMessage.indexOf(command) !== 0){
            continue;
        }

        if(message.channel.type === 'GUILD_TEXT' && !message.guild.me.permissionsIn(message.channel).has(Permissions.FLAGS.SEND_MESSAGES)){
            const user = await discordClient.users.fetch(message.author.id, false);
            user.send(`Missing posting permissions in ${message.guild.name}#${message.channel.name} (${message.guild.id}). Replying here instead.\n\rIf you want to fix this, talk to your discord admin`);

            message.fallbackChannel = user;
        }

        if(message.channel.type === 'GUILD_TEXT' && !message.guild.me.permissionsIn(message.channel).has(Permissions.FLAGS.EMBED_LINKS)){
            const user = await discordClient.users.fetch(message.author.id, false);
            user.send(`Missing embed permissions in ${message.guild.name}#${message.channel.name} (${message.guild.id}). Replying here instead.\n\rIf you want to fix this, talk to your discord admin`);

            message.fallbackChannel = user;
        }

        console.log(formattedMessage);

        try {
            commands[command](message, discordClient);
        } catch (someError){
            console.error(someError);
        }

        return true;
    }

    // If somebody said something to us
    if(message.channel.type === 'DM'){
        commands['!help'](message);
    }
});

discordClient.on('interactionCreate', async (interaction) => {
    if(interaction.isAutocomplete()){
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

    if(interaction.isSelectMenu()){
        command = discordClient.commands.get(interaction.message.interaction.commandName);
    } else if (interaction.isCommand()) {
        command = discordClient.commands.get(interaction.commandName);
    }

	if (!command) {
        return false;
    }

    await interaction.deferReply();

	try {
        console.log(command.default.data.name);
		await command.default.execute(interaction);
	} catch (error) {
		console.error(error);

		await interaction.editReply({
            content: 'There was an error while executing this command!',
            ephemeral: true,
        });
	}
});

if (process.env.NODE_ENV === 'production') {
// A healthcheck cron to send a GET request to our status server
let healthcheck = new cron.CronJob('*/45 * * * * *', () => {
    got(`https://status.tarkov.dev/api/push/${process.env.HEALTH_ENDPOINT}?msg=OK`);
  });
healthcheck.start();
} else {
    console.log("healthcheck disabled");
}
