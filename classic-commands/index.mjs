import servers from './servers.mjs';
import leaveServer from './leave-server.mjs';
import channels from './channels.mjs';

const commands = {
    '!servers': servers,
    '!leaveserver': leaveServer,
    '!channels': channels,
};

export default commands;