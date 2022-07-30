import {
    MessageEmbed,
} from 'discord.js';

// Admin only command that returns the servers and the reach the bot has
const servers = (message, client) => {
    // The the message comes from a user other than the bot admin, return
    if (!process.env.ADMIN_ID || !process.env.ADMIN_ID.split(',').includes(message.author.id)) {
        return false;
    }

    const sendTo = message.fallbackChannel || message.channel;
    const embed = new MessageEmbed();

    // Collect data from all shards
    const promises = [
        client.shard.fetchClientValues('guilds.cache.size'),
        client.shard.broadcastEval(c => c.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)),
    ];

    return Promise.all(promises)
        .then(results => {
            const totalGuilds = results[0].reduce((acc, guildCount) => acc + guildCount, 0);
            const totalMembers = results[1].reduce((acc, memberCount) => acc + memberCount, 0);

            embed.setTitle(`Servers: ${totalGuilds}`);
            embed.setDescription(`Total reach: ${totalMembers} users`);

            if (embed.length == 0) {
                message.react('❌');

                return true;
            }

            sendTo.send({ embeds: [embed] })
                .catch(console.error);
        })
        .catch(console.error);
};

export default servers;
