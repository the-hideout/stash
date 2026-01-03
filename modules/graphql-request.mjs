const url = 'https://api.tarkov.dev/graphql';

const graphqlRequest = async (options) => {
    if (!options.hasOwnProperty('graphql')) {
        return Promise.reject(new Error('You must provide a graphql query'));
    }

    const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({
            query: options.graphql,
        }),
        headers: { 
            'user-agent': 'stash-tarkov-dev', 
            'Content-Type': 'application/json',
        },
    });
    if (!response.ok) {
        return Promise.reject(new Error(`${response.status} ${response.statusText}`));
    }
    return response.json();
};

export default graphqlRequest;
