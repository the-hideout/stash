import got from 'got';

const ttRequest = async (options) => {
    if (!options.hasOwnProperty('graphql')) {
        throw new Error("you must provide graphql");
    }

    if (options.hasOwnProperty('channel') && options.channel.sendTyping) {
        options.channel.sendTyping();
    }

    try {
        const response = await got.post('https://tarkov-tools.com/graphql', {
            responseType: 'json',
            body: JSON.stringify({
                query: options.graphql,
            }),
        });

        return response.body;
    } catch (requestError){
        console.error(requestError);

        throw requestError;
    }
};

export default ttRequest;