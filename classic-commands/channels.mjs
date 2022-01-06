const channels = (message, client) => {
    if (message.author.id !== process.env.ADMIN_ID){
        return false;
    }

    const serverid = message.content.toLowerCase().replace('!channels ', '');
    const sendTo = message.fallbackChannel || message.channel;
    let response = {
        content: '',
    };

    if (!client.guilds.cache.has(serverid)) {
        message.react('❌');
        console.log("Could not find server with id " + serverid);

        return false;
    }

    const server = client.guilds.cache.get(serverid);

    response.content = `Channels in ${server.name}\n`;

    server.channels.cache.map(channel => {
        if(channel.type !== 'GUILD_TEXT'){
            return true;
        }

        response.content = `${response.content}\n${channel.name} - ${channel.id}`;
    });

    sendTo.send(response)
        .catch(console.error);
        // .then(console.log)
};

export default channels;