import fs from 'fs';

import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';

import gameData from './modules/game-data.mjs';

let clientId;
let token;

if (process.env.NODE_ENV === "ci") {
    clientId = process.env.DISCORD_CLIENT_ID;
    token = process.env.DISCORD_TOKEN;
} else {
    let { clientId, token } = JSON.parse(fs.readFileSync('config.json'));
}

const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.mjs'));

try {
    await gameData.load();
    
    for (const file of commandFiles) {
        const command = await import(`./commands/${file}`);
        commands.push(command.default.data.toJSON());
    }
    
    const rest = new REST({ version: '9' }).setToken(token);
    
    rest.put(Routes.applicationCommands(clientId), { body: commands })
        .then(() => console.log('Successfully registered global application commands.'))
        .catch(console.error);
} catch (error) {
    console.log('Error registering commands', error);
}
