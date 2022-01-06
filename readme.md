# Tarkov-Tools Discord bot 🤖

This is the official [tarkov-tools](https://tarkov-tools.com) discord bot.

To add it to your server, just click the link below:

[https://discord.com/api/oauth2/authorize?client_id=925298399371231242&permissions=309237664832&scope=bot%20applications.commands](https://discord.com/api/oauth2/authorize?client_id=925298399371231242&permissions=309237664832&scope=bot%20applications.commands)

or here:

[discordbotlist.com/bots/tarkov-tools](https://discordbotlist.com/bots/tarkov-tools)

---

## Development 🔨

For development you need to crate 2 files in your local directory. One is for registering commands and one is for running the bot.

The files are:

- `config-dev.json`
- `.env`

First is `config-dev.json`

```json
{
    "clientId": "",
    "guildId": "",
    "token": ""
}
```

### How to Enable Developer Mode

1. In Discord, open your User Settings by clicking the Settings Cog next to your user name on the bottom.
2. Go to Appearance and enable Developer Mode under the Advanced section, then close User Settings.
3. Open your Discord server, right-click on the server name, then select Copy ID

### Set your Bot Token

The bot token your dev bot has gotten

![token](./assets/token.jpg)

The second file is `.env`

```ini
DISCORD_API_TOKEN=<value_here>
ADMIN_ID=<value_here>
```

`DISCORD_API_TOKEN` is the same as token above

`ADMIN_ID` is your client ID, to be used for admin commands.

![admin id](./assets/admin-id.jpg)

To add the DEV bot to your server, click this link where you've replaced the `<MY_CLIENT_ID>` with your bots application id:

[https://discord.com/api/oauth2/authorize?client_id=<MY_CLIENT_ID>&permissions=274877910080&scope=bot%20applications.commands](https://discord.com/api/oauth2/authorize?client_id=MY_CLIENT_ID&permissions=274877910080&scope=bot%20applications.commands)

### clientId

What your dev application has as "APPLICATION ID" [https://discord.com/developers/applications/](https://discord.com/developers/applications/)

![client id](./assets/application-id.jpg)

### guildId

What discord server you want to run your bot during development

![guild id](./assets/guild-id.jpg)
