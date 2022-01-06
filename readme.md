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

### Create a Disord Bot

Before you can test the bot out locally, you will need to create a Discord bot to authenticate with.

Create your bot:

![create bot](./assets/1-new-app.png)

### The `config-dev.json` file

An example of the `config-dev.json` file can be found at the root of this repo at `config-dev.example.json`. You will need to edit and rename this file to `config-dev.json` and add the appropriate values as seen below:

```json
{
    "clientId": "<add_value_here>",
    "guildId": "<add_value_here>",
    "token": "<add_value_here>"
}
```

#### clientId

The `clientId` can be found in your Discord bot's general information under `APPLICATION_ID` [https://discord.com/developers/applications/](https://discord.com/developers/applications/)

![client id](./assets/2-copy-app-id.png)

#### guildId

Copy the `guildId` from the Discord server you want to add the bot to:

![guild id](./assets/3-copy-id.png)

> Note: In order to copy a guild id, you will need to have Discord developer mode enabled, scroll down in the guide to see how to do so (its easy!)

#### token

The token is the same as the `DISCORD_API_TOKEN` which can be found in the `.env` setup steps below.

### The `.env` file

Next, you will need to edit the `.env` file and add the appropriate values as seen below:

```ini
DISCORD_API_TOKEN=<value_here>
ADMIN_ID=<value_here>
```

The `DISCORD_API_TOKEN` can be found here:

![token](./assets/4-bot-token.png)

`ADMIN_ID` is your personal Discord user ID, which is used for admin commands and can be found here:

![admin id](./assets/admin-id.jpg)

To add the DEV bot to your server, click this link where you've replaced the `<MY_CLIENT_ID>` with your bots application id:

[https://discord.com/api/oauth2/authorize?client_id=<MY_CLIENT_ID>&permissions=274877910080&scope=bot%20applications.commands](https://discord.com/api/oauth2/authorize?client_id=MY_CLIENT_ID&permissions=274877910080&scope=bot%20applications.commands)

### How to Enable Developer Mode

In order to copy certain values (such as channel/guild/user IDs) you need to enable developer mode in the Discord client

1. In Discord, open your User Settings by clicking the Settings Cog next to your user name on the bottom.
2. Go to Appearance and enable Developer Mode under the Advanced section, then close User Settings.
3. Open your Discord server, right-click on the server name, then select Copy ID (to obtain the "guild ID" of your Discord server)
