import fs from 'fs';
import {
    Client,
    GatewayIntentBits,
    Collection,
    AttachmentBuilder,
} from 'discord.js';

import autocomplete from './modules/autocomplete.mjs';
//import { updateChoices } from './modules/game-data.mjs';
import { initShardMessenger, respondToParentMessage } from './modules/shard-messenger.mjs';
import sendWebhook from './modules/webhook.mjs';
import progress from './modules/progress-shard.mjs';

process.env.IS_SHARD = 'true';

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

//console.time('Prefetch-choice-data');
//await updateChoices();
//console.timeEnd('Prefetch-choice-data');

discordClient.on('ready', () => {
    console.log(`Logged in as ${discordClient.user.tag} on shard ${discordClient.shard.ids[0]}`);

    initShardMessenger(discordClient);

    discordClient.user.setActivity('Tarkov.dev', {
        type: 'PLAYING',
    });

    process.on('message', async message => {
        return respondToParentMessage(message);
    });
});

discordClient.login(process.env.DISCORD_API_TOKEN);

discordClient.on('guildCreate', async guild => {
    if (!guild.available) {
        return false;
    }

    try {
        const owner = await guild.fetchOwner();
        await owner.send(`Thank you so much for adding the Stash bot to your Discord!\n\rTo get more information on how the bot works, try \`/help\` to get started.`);
    } catch (error) {
        console.error('Error sending welcome message', error);
    }
});

discordClient.on('interactionCreate', async interaction => {
    interaction.start = new Date();
    if (interaction.isAutocomplete()) {
        let options = await autocomplete(interaction);

        options = options.splice(0, 25);

        await interaction.respond(options.map(name => {
            if (typeof name === 'object' && name.name && name.value) {
                return name;
            }
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
        const { lang, gameMode } = await progress.getInteractionSettings(interaction).catch(error => {
            console.log('Error getting lang and gameMode for error', error);
            return {
                lang: 'unknown',
                gameMode: 'unknown',
            };
        });
        console.error(`Error executing /${interaction.commandName} command on shard ${discordClient.shard.ids[0]}`, error);
        console.error(`Command duration:`, new Date() - interaction.start, 'ms');
        if (error.message === 'Unknown Message') {
            return;
        }
        if (error.message === 'Unknown interaction') {
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
        sendWebhook({
            title: `Error running /${interaction.commandName} command on shard ${discordClient.shard.ids[0]}`,
            message: error.stack,
            footer: `Command invoked by @${interaction.member.user.username} | ${interaction.member.guild ? `Server: ${interaction.member.guild.name}` : 'DM'} | lang: ${lang} | mode ${gameMode}`,
            files: [
                new AttachmentBuilder(
                    Buffer.from(JSON.stringify(interaction.options, null, 4), 'utf8'),
                    { name: 'options.json' },
                ),
            ],
        });
    }
});

process.on('uncaughtException', async (error) => {
    try {
        sendWebhook({title: `Uncaught exception on shard ${discordClient.shard.ids[0]}` , message: error.stack});
    } catch (error) {
        console.log('Error sending uncaught exception webhook alert from shard', error.stack);
    }
}); 
