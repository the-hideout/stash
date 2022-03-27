# Stash 🤖

[![CodeQL](https://github.com/the-hideout/stash/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/the-hideout/stash/actions/workflows/codeql-analysis.yml)

Stash is a Discord bot that helps you play Escape from Tarkov!

This is the official [tarkov.dev](https://tarkov.dev) Discord bot.

To add the bot to your server, just click the link below:

**[Invite Stash](https://discord.com/api/oauth2/authorize?client_id=955521336904667227&permissions=309237664832&scope=bot%20applications.commands)** 🔗

## About 💡

This bot takes all the data from [tarkov.dev](https://tarkov.dev) and exposes it in a user-friendly way.

This bot is open source and supported by the team behind [tarkov.dev](https://tarkov.dev).

### Commands 💬

|  Command  |  Example   |  Description   |
|    :----:   |     :----:    |        :----:       |
| `/help`      | `/help` or `help <command>`         | The help command to view all available commands |
| `/price` | `/price name: <item>`  | Get a detailed output on the price of an item, its price tier, and more! |
| `/map` | `/map woods` | View a map and some general info about it |
| `/barter` | `/barter name: <item>` | Check barter details for an item |
| `/craft` | `/craft name: <item>` | Check crafting details for an item |
| `/ammo` | `/ammo ammo_type: 5.45x39mm` | Get a sorted ammo table for a certain ammo type |
| `/status` | - | Get the game/server/website status of Escape from Tarkov |
| `/about` | - | View details about the bot |
| `/issue` | `/issue message: <text>` | Report an issue with the bot |
| `/invite` | - | Get a Discord invite link for the bot to join it to another server |

---

## Development 🔨

For development you need to create two files in your local directory. One is for registering commands and one is for running the bot.

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

[https://discord.com/api/oauth2/authorize?client_id=<MY_CLIENT_ID>&permissions=309237664832&scope=bot%20applications.commands](https://discord.com/api/oauth2/authorize?client_id=MY_CLIENT_ID&permissions=309237664832&scope=bot%20applications.commands)

### How to Enable Developer Mode

In order to copy certain values (such as channel/guild/user IDs) you need to enable developer mode in the Discord client

1. In Discord, open your User Settings by clicking the Settings Cog next to your user name on the bottom.
2. Go to Appearance and enable Developer Mode under the Advanced section, then close User Settings.
3. Open your Discord server, right-click on the server name, then select Copy ID (to obtain the "guild ID" of your Discord server)

---

### Starting the Bot 🚀

Before you start the bot you will need to register the Slash commands in your test server:

```console
$ node deploy-commands-dev.mjs
Successfully registered application commands.
```

Next, there are two ways to start the bot:

- Locally (suggested)
- Docker

#### Locally

To start the bot locally, run the following commands:

```console
$ export DISCORD_API_TOKEN=<token>
$ export NODE_ENV=development
$ node index.mjs
Filling autocomplete cache
fill-autocomplete-cache: 590.582ms
Logged in as stash-dev#1234!
```

#### Docker

To start the bot with Docker, simply run the following command:

```console
$ docker-compose up --build
Creating bot ... done
Attaching to bot
bot    | Setting up rollbar
bot    | Filling autocomplete cache
bot    | fill-autocomplete-cache: 944.249ms
bot    | Logged in as stash-dev#1234!
```

## Deployment 🚀

Deploying the bot is very easy! Just do the following:

1. Write the code for your changes
2. Open a pull request
3. Get a review and ensure CI is passing
4. Merge! Instantly upon merging your changes are deployed to the Heroku instance running the bot and your changes will go live

> Note: If you added a brand new slash command, it can take up to one hour for it to be registered by Discord globally
