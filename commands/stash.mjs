import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import progress from '../modules/progress-shard.mjs';
import { getFixedT, comT, getCommandLocalizations, getTranslationChoices } from '../modules/translations.mjs';

function userIsAuthorized(interaction) {
    return !!process.env.ADMIN_ID && process.env.ADMIN_ID.split(',').includes(interaction.user.id)
}

const subCommands = {
    servers: async interaction => {
        await interaction.deferReply({ephemeral: true});
        // The the message comes from a user other than the bot admin, return
        if (!userIsAuthorized(interaction)) {
            return interaction.editReply('You are not authorized to perform that command.');
        }
        const embed = new EmbedBuilder();

        // Collect data from all shards
        const results = await Promise.all([
            interaction.client.shard.fetchClientValues('guilds.cache.size'),
            interaction.client.shard.broadcastEval(c => c.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)),
        ]);

        const totalGuilds = results[0].reduce((acc, guildCount) => acc + guildCount, 0).toLocaleString("en-US");
        const totalMembers = results[1].reduce((acc, memberCount) => acc + memberCount, 0).toLocaleString("en-US");

        embed.setTitle(`Servers: ${totalGuilds}`);
        embed.setDescription(`Total reach: ${totalMembers} users\nShards: ${interaction.client.shard.count}`);

        return interaction.editReply({ embeds: [embed] }).catch(console.error);
    },
    find_server: async interaction => {
        await interaction.deferReply({ephemeral: true});
        // The the message comes from a user other than the bot admin, return
        if (!userIsAuthorized(interaction)) {
            return interaction.editReply('You are not authorized to perform that command.');
        }
    
        const searchName = interaction.options.getString('server_name');

        const shardResults = await interaction.client.shard.broadcastEval((client, context) => client.guilds.cache.reduce((matchedGuilds, guild) => {
            if (guild.name.toLowerCase().includes(context.searchName.toLowerCase())) {
                matchedGuilds.push({
                    id: guild.id,
                    name: guild.name,
                });
            }
            return matchedGuilds;
        }, []), {context: {searchName}});
        
        const matches = shardResults.reduce((all, result) => {
            return [
                ...all,
                ...result,
            ];
        }, []);

        const embed = new EmbedBuilder();
        if (matches.length > 0) {
            embed.setTitle(`Servers matching "${searchName}"`);
            let description = '';
            for (let i = 0; i < matches.length; i++) {
                const server = matches[i];
                const addition = `${server.name} (${server.id})\n`;
                if (addition.length + description.length > 2048) {
                    embed.setFooter({text: `${matches.length-i} additional results not shown.`});
                    break;
                }

                description += addition;
            }
            embed.setDescription(description);
        } else {
            embed.setTitle(`Could not find server with name ${searchName}`);
        }
            
        return interaction.editReply({ embeds: [embed] }).catch(console.error);
    },
    leave_server: async interaction => {
        await interaction.deferReply({ephemeral: true});
        // The the message comes from a user other than the bot admin, return
        if (!userIsAuthorized(interaction)) {
            return interaction.editReply('You are not authorized to perform that command.');
        }
    
        const serverid = interaction.options.getString('server_id');
        let response = {
            content: `Could not find server with id ${serverid}`
        };

        await interaction.client.shard.broadcastEval(client => {
            if (!client.guilds.cache.has(serverid)) {
                return false;
            }
            const server = client.guilds.cache.get(serverid);
            server.leave();
            response.content = `Left server ${server.name} (${server.id})`;
            return true;
        });
        
        return interaction.editReply(response).catch(console.error);
    },
    language: async interaction => {
        await interaction.deferReply({ephemeral: true});
        const t = getFixedT(interaction.locale);

        let locale = interaction.options.getString('locale') || 'none';
        if (locale === 'none') {
            locale = false;
        }

        await progress.setServerLanguage(interaction.guildId, locale);

        return interaction.editReply({
            content: `✅ ${t('Server language set to {{languageCode}}.', {languageCode: locale || comT('none_desc')})}`
        });
    },
};

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('stash')
        .setDescription('Admin commands for the bot')
        .addSubcommand(subcommand => subcommand
            .setName('servers')
            .setDescription('List total number of servers in which bot is a member')
        )
        .setDefaultMemberPermissions(0)
        .addSubcommand(subcommand => subcommand
            .setName('find_server')
            .setDescription('Search for member server by name')
            .addStringOption(option => option
                .setName('server_name')
                .setDescription('Server name to search for')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName('leave_server')
            .setDescription('Force the bot to leave a specified server')
            .addStringOption(option => option
                .setName('server_id')
                .setDescription('Server ID')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName('language')
            .setDescription('Force the bot to respond in one language on this server')
            .setNameLocalizations(getCommandLocalizations('language'))
            .setDescriptionLocalizations(getCommandLocalizations('stash_language_desc'))
            .addStringOption(option => option
                .setName('locale')
                .setDescription('Language to use')
                .setNameLocalizations(getCommandLocalizations('locale'))
                .setDescriptionLocalizations(getCommandLocalizations('stash_language_locale_desc'))
                .setRequired(true)
                .setChoices(...getTranslationChoices({none: true}))
            )
        ),
    async execute(interaction) {
        subCommands[interaction.options._subcommand](interaction);
    },
};

export default defaultFunction;
