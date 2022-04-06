import {
    MessageEmbed,
} from 'discord.js';

import getMapData from './get-map-data.mjs';
import realTimeToTarkovTime from './time.mjs';

const getMapEmbed = async (outputMap) => {
    const mapData = await getMapData();
    const embed = new MessageEmbed();

    let mapKey = outputMap;

    if (outputMap === 'factory (night)') {
        mapKey = 'factory';
    }

    const selectedMapData = mapData.find(mapObject => mapObject.key === mapKey);
    let displayDuration = selectedMapData.duration;

    // If the selected map has multiple durations, use the night or day time if specified
    if (selectedMapData.duration.includes('/')) {
        const [day, night] = selectedMapData.duration.split('/');
        if (outputMap.includes('night')) {
            displayDuration = night;
        } else {
            displayDuration = day;
        }
    }

    // Format the duration text
    displayDuration = displayDuration.replace('min', 'minutes');

    // Get left and right real tarkov time
    var left, right;
    if (outputMap.includes('factory')) {
        // If the map is Factory, set the times to static values
        left = "15:00";
        right = "03:00";
    } else {
        // Get the realtime in Tarkov
        left = realTimeToTarkovTime(new Date(), true);
        right = realTimeToTarkovTime(new Date(), false);
    }

    // Construct the embed
    embed.setTitle(outputMap.charAt(0).toUpperCase() + outputMap.slice(1));
    embed.setURL(`https://tarkov.dev/map/${mapKey}`);
    embed.addField('Duration ⌛', displayDuration, true);
    embed.addField('Players 👥', selectedMapData.players, true);
    embed.addField('Time 🕑', `${left} - ${right}`, true);
    embed.setImage(`https://tarkov.dev/maps/${mapKey}.jpg`);

    // If the map was made by a contributor, give them credit
    if (selectedMapData.source) {
        embed.setFooter({ text: `Map made by ${selectedMapData.source}` });
    }

    // Return the embed
    return embed;
};

export default getMapEmbed;
