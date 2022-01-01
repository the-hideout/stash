import {
    MessageEmbed,
} from 'discord.js';

import getCraftsBarters from '../modules/get-crafts-barters.mjs';
import getCurrencies from '../modules/get-currencies.mjs';

const MAX_BARTERS = 2;

const barter = async (message) => {
    const itemname = message.content.replace('!barter ', '').toLowerCase();
    const sendTo = message.fallbackChannel || message.channel;
    const matchedBarters = [];

    const {barters} = await getCraftsBarters();
    const currencies = await getCurrencies();

    for (const bid in barters) {
        const barter = barters[bid];

        if (barter.rewardItems[0].item.name.toLowerCase().includes(itemname)) {
            matchedBarters.push(barter);
        }
    }

    if (matchedBarters.length <= 0) {
        message.react('❌');

        return false;
    }

    let endingsent = false;

    for (let i = 0; i < matchedBarters.length; i = i + 1) {
        const barter = matchedBarters[i];
        let totalCost = 0;
        const embed = new MessageEmbed();

        let title = barter.rewardItems[0].item.name;

        if (barter.rewardItems[0].count > 1) {
            title += " (" + barter.rewardItems[0].count + ")";
        }

        title += "\r\n" + barter.source;
        embed.setTitle(title);
        embed.setURL(barter.rewardItems[0].item.link);

        if (barter.rewardItems[0].item.iconLink) {
            embed.setThumbnail(barter.rewardItems[0].item.iconLink);
        }

        for (const ri in barter.requiredItems) {
            const req = barter.requiredItems[ri];
            let itemCost = req.item.avg24hPrice;
            if (req.item.lastLowPrice > itemCost && req.item.lastLowPrice > 0) itemCost = req.item.lastLowPrice;
            for (const offerindex in req.item.buyFor) {
                const offer = req.item.buyFor[offerindex];
                if (offer.source == 'fleaMarket') continue;
                let traderPrice = offer.price * currencies[offer.currency];
                if (traderPrice < itemCost || itemCost == 0) itemCost = traderPrice;
            }
            totalCost += itemCost * req.count;
            embed.addField(req.item.name, itemCost.toLocaleString() + "₽ x " + req.count, true);
        }

        embed.addField("Total", totalCost.toLocaleString() + "₽", true);

        sendTo.send({embeds: [embed]})
            .then(() => {
                if (i == MAX_BARTERS -1 && matchedBarters.length > MAX_BARTERS && !endingsent) {
                    endingsent = true;
                    const ending = new MessageEmbed();
                    ending.setTitle("+" + (matchedBarters.length - MAX_BARTERS) + " more");
                    ending.setURL("https://tarkov-tools.com/barters/?search=" + encodeURIComponent(itemname));

                    let otheritems = '';

                    for (let ii = MAX_BARTERS; ii < matchedBarters.length; ii++) {
                        const bitemname = matchedBarters[ii].rewardItems[0].item.name + " (" + matchedBarters[ii].source + ")";

                        if (bitemname.length + 4 + otheritems.length > 2048) {
                            ending.setFooter("Not all results shown.");

                            break;
                        }
                        otheritems += bitemname + "\r\n";
                    }
                    ending.setDescription(otheritems);
                    sendTo.send({embeds: [ending]})
                    .catch(console.error);
                        // .then(console.log)
                }
            })
            .catch(console.error);

        if (i == MAX_BARTERS - 1) {
            break;
        }
    }
};

export default barter;