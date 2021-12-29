import help from './help.mjs';
import map from './map.mjs';
import price from './price.mjs';
import barter from './barter.mjs';
import craft from './craft.mjs';
import servers from './servers.mjs';
import leaveServer from './leave-server.mjs';

const commands = {
    '!help': help,
    '!price': price,
    '!map': map,
    '!barter': barter,
    '!craft': craft,
    '!servers': servers,
    '!leaveserver': leaveServer,
};

export default commands;