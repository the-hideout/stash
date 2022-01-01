import fs from 'fs';

import {
    Client,
    Intents,
    Permissions,
    Collection,
} from 'discord.js';
import Rollbar from 'rollbar';

import commands from './classic-commands/index.mjs';
import autocomplete, {fillCache} from './modules/autocomplete.mjs';

new Rollbar({
    accessToken: '7ac07140aabe45698942a94bc636d58c',
    captureUncaught: true,
    captureUnhandledRejections: true
});

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

    discordClient.user.setActivity('tarkov-tools.com', {
        type: 'PLAYING',
    });
});

discordClient.login(process.env.DISCORD_API_TOKEN);

discordClient.on('guildCreate', (guild) => {
    if (!guild.available) {
        return false;
    }

    console.log(`Joined server ${guild.name} (${guild.id})!`);

    discordClient.users.fetch(process.env.ADMIN_ID, false)
        .then((user) => {
            user.send(`Joined server ${guild.name} (${guild.id})!`);
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

    const formattedMessage = message.content.toLowerCase();

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

    if (!interaction.isCommand()) {
        return false;
    }

	const command = discordClient.commands.get(interaction.commandName);

	if (!command) {
        return false;
    }

	try {
		await command.default.execute(interaction);
	} catch (error) {
		console.error(error);

		await interaction.reply({
            content: 'There was an error while executing this command!',
            ephemeral: true,
        });
	}
});
