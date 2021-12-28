import {
    Client,
    Intents,
} from 'discord.js';

import commands from './commands/index.mjs';

const discordClient = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGES,
    ],
    partials: ["CHANNEL"],
});


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
    //optionally do something to notify you when the bot joins a new server
});

discordClient.on('messageCreate', (message) => {
    // console.log(message);

    if (message.channel.type != 'DM' && message.channel.type != 'GUILD_TEXT') {
        return false;
    }

    const formattedMessage = message.content.toLowerCase();

    for(const command in commands){
        if(formattedMessage.indexOf(command) !== 0){
            continue;
        }

        commands[command](message, discordClient);

        break;
    }
});
