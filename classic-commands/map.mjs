import allMaps from '../modules/all-maps.js';

import getMapEmbed from '../modules/get-map-embed.js';

const map = async (message) => {
    const args = message.content.toLowerCase().replace('!map', '').trim().toLowerCase().split(' ');
    const sendTo = message.fallbackChannel || message.channel;
    let maps = [];
    const skips = [];

    for (let i = 0; i < args.length; i = i + 1) {
        let arg = args[i];
        if (arg.indexOf('-') == 0) {
            arg = arg.replace('-', '');
            skips.push(arg);
        } else if (arg.length > 0) {
            maps.push(arg);
        }
    }

    if (maps.length == 0) {
        maps = allMaps;
    }

    for (let i = 0; i < skips.length; i = i + 1) {
        let index = maps.findIndex(element => {
            if (element === skips[i]) {
                return true;
            }
        });

        if (index != -1) {
            maps.splice(index, 1);
        }
    }

    if (maps.length > 0) {
        const response = {};
        let map = maps[Math.floor(Math.random() * maps.length)];

        if (!allMaps.includes(map)) {
            map = map.charAt(0).toUpperCase() + map.slice(1);
            response.content = map;
        } else {
            response.embeds = [await getMapEmbed(map)];
        }

        sendTo.send(response)
            .catch(console.error);
        // .then(console.log)
    } else {
        message.react('❌');
    }
};

export default map;