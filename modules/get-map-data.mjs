import got from 'got';

let mapData = false;

const getMapData = async () => {
    if (mapData) {
        return mapData;
    }

    const response = await got('https://raw.githubusercontent.com/the-hideout/tarkov-dev/master/src/data/maps.json', {
        responseType: 'json',
        headers: { "user-agent": "stash-tarkov-dev" }
    });

    mapData = response.body;

    return mapData;
};

export default getMapData;
