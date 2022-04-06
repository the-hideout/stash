// Source: https://github.com/adamburgess/tarkov-time/blob/b62355b8dcff2548fc256cbcd6d6ffd80ceca5a9/src/time.ts#L6-L19

import { formatHMS, hrs } from './utils.mjs';

// 1 second real time = 7 seconds tarkov time
const tarkovRatio = 7;

function realTimeToTarkovTime (time, left = true) {
    // tarkov time moves at 7 seconds per second.
    // surprisingly, 00:00:00 does not equal unix 0... but it equals unix 10,800,000.
    // Which is 3 hours. What's also +3? Yep, Russia. UTC+3.
    // therefore, to convert real time to tarkov time,
    // tarkov time = (real time * 7 % 24 hr) + 3 hour

    const oneDay = hrs(24);
    const russia = hrs(3);

    const offset = russia + (left ? 0 : hrs(12));
    const tarkovTime = formatHMS(new Date((offset + (time.getTime() * tarkovRatio)) % oneDay));
    return tarkovTime;
}

export default realTimeToTarkovTime;
