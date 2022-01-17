import got from 'got';

let mapData = false;

const getMapData = async () => {
    if(mapData){
        return mapData;
    }

    const response = await got ('https://raw.githubusercontent.com/kokarn/tarkov-tools/master/src/data/maps.json', {
        responseType: 'json',
    });

    mapData = response.body;

    return mapData;
};

export default getMapData;
