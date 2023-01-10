import fs from 'fs';
import * as Sentry from "@sentry/node";
import "@sentry/tracing";
import {
    Client,
    GatewayIntentBits,
    Collection,
} from 'discord.js';

import autocomplete from './modules/autocomplete.mjs';
import progress from "./modules/progress-shard.mjs";
import { updateAll, getTraders } from './modules/game-data.mjs';
import { t } from './modules/translations.mjs';

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
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildPresences,
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

console.time('Prefetch-game-data');
await updateAll();
console.timeEnd('Prefetch-game-data');

discordClient.on('ready', () => {
    console.log(`Logged in as ${discordClient.user.tag} on shard ${discordClient.shard.ids[0]}`);

    progress.init(discordClient);

    discordClient.user.setActivity('Tarkov.dev', {
        type: 'PLAYING',
    });

    process.on('message', async message => {
        if (!message.uuid) return;
        if (message.type === 'getReply') {
            if (message.data === 'messageUser') {
                const response = {uuid: message.uuid, data: {shardId: discordClient.shard.ids[0], userId: message.userId, success: false}};
                discordClient.users.fetch(message.userId).then(async user => {
                    if (!user) return Promise.reject(new Error('User not found'));
                    if (typeof message.messageValues === 'object') {
                        for (const field in message.messageValues) {
                            if (field === 'trader') {
                                const traders = await getTraders(message.messageValues?.lng);
                                message.messageValues.trader = traders.find(tr => tr.id === message.messageValues.trader.id);
                            }
                        }
                    }
                    return user.send(t(message.message, message.messageValues)).then(() => {
                        response.data.success = true;
                        discordClient.shard.send(response);
                    });
                }).catch(error => {
                    response.error = {message: error.message, stack: error.stack};
                    discordClient.shard.send(response);
                });
            }
            if (message.data === 'messageChannel') {
                const response = {uuid: message.uuid, data: {shardId: discordClient.shard.ids[0], guildId: message.guildId, channelId: message.channelId, success: false}};
                discordClient.guilds.fetch(message.guildId).then(async guild => {
                    if (!guild) return Promise.reject(new Error('Guild not found'));
                    return guild.channels.fetch(message.channelId).then(async channel => {
                        if (!channel) return Promise.reject(new Error('Channel not found'));
                        if (!channel.isTextBased) return Promise.reject(new Error('Channel is not text-based'));
                        if (typeof message.messageValues === 'object') {
                            for (const field in message.messageValues) {
                                if (field === 'trader') {
                                    const traders = await getTraders(message.messageValues.lng);
                                    message.messageValues.trader = traders.find(tr => tr.id === message.messageValues.trader.id);
                                }
                            }
                        }
                        return channel.send(t(message.message, message.messageValues)).then(() => {
                            response.data.success = true;
                            discordClient.shard.send(response);
                        });
                    });
                }).catch(error => {
                    response.error = {message: error.message, stack: error.stack};
                    discordClient.shard.send(response);
                });
            }
            return;
        }
        process.emit(message.uuid, message);
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

discordClient.on('interactionCreate', async interaction => {
    if (interaction.isAutocomplete()) {
        let options = await autocomplete(interaction);

        options = options.splice(0, 25);

        await interaction.respond(options.map(name => {
            return {
                name: name,
                value: name,
            };
        })).catch(error => {
            console.error(`Error responding to /${interaction.commandName} command autocomplete request for locale ${interaction.locale} on shard ${discordClient.shard.ids[0]}: ${error}`);
            //console.error('interaction', interaction);
            //console.error(error);
        });

        return true;
    }

    let command = false;

    if (interaction.isStringSelectMenu()) {
        command = discordClient.commands.get(interaction.message.interaction.commandName);
    } else if (interaction.isCommand()) {
        command = discordClient.commands.get(interaction.commandName);
    }

    if (!command) {
        return false;
    }

    try {
        await command.default.execute(interaction);
    } catch (error) {
        console.error(`Error executing /${interaction.commandName} command on shard ${discordClient.shard.ids[0]}`, error);
        if (error.message === 'Unknown Message') {
            return;
        }
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
