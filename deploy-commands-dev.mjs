import fs from 'fs';

import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';

const { clientId, guildId, token } = JSON.parse(fs.readFileSync('config-dev.json'));

const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.mjs'));

process.env.REGISTERING_COMMANDS = 'TRUE';

for (const file of commandFiles) {
	const command = await import(`./commands/${file}`);
	commands.push(command.default.data.toJSON());
}

const rest = new REST({ version: '9' }).setToken(token);

rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
    .then(() => console.log('Successfully registered application commands.'))
    .catch(console.error);
