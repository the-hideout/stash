import {
    MessageEmbed,
} from 'discord.js';

import getMapData from './get-map-data.mjs';

const getMapEmbed = async (outputMap) => {
    const mapData = await getMapData();
    const embed = new MessageEmbed();

    let mapKey = outputMap;

    if (outputMap === 'factory (night)') {
        mapKey = 'factory';
    }

    const selectedMapData = mapData.find(mapObject => mapObject.key === mapKey);
    let displayDuration = selectedMapData.duration;

    if (selectedMapData.duration.includes('/')) {
        const [day, night] = selectedMapData.duration.split('/');

        if (outputMap.includes('night')) {
            displayDuration = night;
        } else {
            displayDuration = day;
        }
    }

    displayDuration = displayDuration.replace('min', 'minutes');

    embed.setTitle(outputMap.charAt(0).toUpperCase() + outputMap.slice(1));
    embed.setURL(`https://tarkov.dev/map/${mapKey}`);
    embed.addField('Duration', displayDuration, true);
    embed.addField('Players', selectedMapData.players, true);
    embed.setImage(`https://tarkov.dev/maps/${mapKey}.jpg`);

    if (selectedMapData.source) {
        embed.setFooter({ text: `Map made by ${selectedMapData.source}` });
    }

    return embed;
}

export default getMapEmbed;
