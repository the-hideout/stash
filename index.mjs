import {
    Client,
    Intents,
    Permissions,
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

    discordClient.users.fetch(process.env.ADMIN_ID, false)
        .then((user) => {
            user.send(`Joined server ${guild.name} (${guild.id})!`);
        });
});

discordClient.on('messageCreate', (message) => {
    // console.log(message);

    if (message.channel.type != 'DM' && message.channel.type != 'GUILD_TEXT') {
        return false;
    }

    // if(!message.guild?.me.permissionsIn(message.channel).has(Permissions.FLAGS.SEND_MESSAGES)){
    //     discordClient.users.fetch(process.env.ADMIN_ID, false)
    //         .then((user) => {
    //             user.send(`Missing posting permissions in ${message} (${message})`);
    //         });

    //     return false;
    // }

    const formattedMessage = message.content.toLowerCase();

    for(const command in commands){
        if(formattedMessage.indexOf(command) !== 0){
            continue;
        }

        console.log(formattedMessage);

        try {
            commands[command](message, discordClient);
        } catch (someError){
            console.error(someError);
        }

        break;
    }
});
