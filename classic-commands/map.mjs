const map = (message) => {
    const args = message.content.toLowerCase().replace('!map', '').trim().toLowerCase().split(' ');
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
        maps = [
            'customs',
            'factory',
            'factory (night)',
            'interchange',
            'labs',
            'lighthouse',
            'reserve',
            'shoreline',
            'woods',
        ];
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

        map = map.charAt(0).toUpperCase() + map.slice(1);
        response.content = map;

        message.channel.send(response)
            .catch(console.error);
            // .then(console.log)
    } else {
        message.react('❌');
    }
};

export default map;