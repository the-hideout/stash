import {
    MessageEmbed,
} from 'discord.js';

const servers = (message, client) => {
    if (message.author.id !== process.env.ADMIN_ID){
        return false;
    }

    if(message.channel.type !== 'DM') {
        return false;
    }
    const sendTo = message.fallbackChannel || message.channel;
    const embed = new MessageEmbed();
    let serverCount = 0;
    let reach = 0;

    client.guilds.cache.each(server => {
        embed.addField(server.name, server.id, true);
        serverCount = serverCount + 1;
        reach = reach +  server.memberCount;
    });
    embed.setTitle(`Servers (${serverCount})`);
    embed.setDescription(`Total reach: ${reach} users`);

    if (embed.length == 0) {
        message.react('❌');

        return true;
    }

    sendTo.send({embeds: [embed]})
        .catch(console.error);
        // .then(console.log)
};

export default servers;