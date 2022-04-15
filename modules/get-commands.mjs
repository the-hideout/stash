const commands = {
    'help': {
        syntax: '/help [command]',
        description: 'Show details for command',
        examples: '/help barter',
    },
    'map': {
        syntax: '/map [mapname mapname] [-mapname]',
        description: 'Get a map and some info about it',
        examples: '/map woods\r\n/map customs shoreline interchange',
    },
    'price': {
        syntax: '/price itemname',
        description: 'Show prices for item(s) matching itemname',
        examples: '/price bitcoin',
    },
    'barter': {
        syntax: '/barter itemname',
        description: 'Shows barter trades for item(s) matching itemname',
        examples: '/barter slick',
    },
    'craft': {
        syntax: '/craft itemname',
        description: 'Shows crafts for item(s) matching itemname',
        examples: '/craft 7n31',
    },
    'ammo': {
        syntax: '/ammo ammo_type',
        description: 'Shows ammo stats for all ammo items of the specified type',
        examples: '/ammo 7.62x51mm',
    },
};

export default commands;
