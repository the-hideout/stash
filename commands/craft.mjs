import {
    MessageEmbed,
} from 'discord.js';

import getCraftsBarters from '../modules/get-crafts-barters.mjs';
import getCurrencies from '../modules/get-currencies.mjs';

const MAX_CRAFTS = 2;

const craft = async (message) => {
    const itemname = message.content.replace('!craft ', '').toLowerCase();

    const matchedCrafts = [];

    const {crafts} = await getCraftsBarters();
    const currencies = await getCurrencies();

    for (const id in crafts) {
        const craft = crafts[id];

        if (craft.rewardItems[0].item.name.toLowerCase().includes(itemname)) {
            matchedCrafts.push(craft);
        }
    }
    if (matchedCrafts.length <= 0) {
        message.react('❌');

        return false;
    }

    let endingsent = false;

    for (let i = 0; i < matchedCrafts.length; i = i + 1) {
        const craft = matchedCrafts[i];
        let totalCost = 0;
        const embed = new MessageEmbed();

        let title = craft.rewardItems[0].item.name;

        if (craft.rewardItems[0].count > 1) {
            title += " (" + craft.rewardItems[0].count + ")";
        }

        const measuredTime = new Date(null);

        measuredTime.setSeconds(craft.duration);
        title += "\r\n" + craft.source + " (" + measuredTime.toISOString().substr(11, 8) + ")";
        embed.setTitle(title);
        embed.setURL(craft.rewardItems[0].item.link);

        if (craft.rewardItems[0].item.iconLink) {
            embed.setThumbnail(craft.rewardItems[0].item.iconLink);
        }

        for (const ri in craft.requiredItems) {
            const req = craft.requiredItems[ri];
            let itemCost = req.item.avg24hPrice;

            if (req.item.lastLowPrice > itemCost && req.item.lastLowPrice > 0) {
                itemCost = req.item.lastLowPrice;
            }

            for (const offerindex in req.item.buyFor) {
                const offer = req.item.buyFor[offerindex];
                if (offer.source == 'fleaMarket') {
                    continue;
                }

                let traderPrice = offer.price * currencies[offer.currency];

                if (traderPrice < itemCost || itemCost == 0) {
                    itemCost = traderPrice;
                }
            }

            totalCost += itemCost * req.count;
            //totalCost += req.item.avg24hPrice * req.count;
            embed.addField(req.item.name, itemCost.toLocaleString() + "₽ x " + req.count, true);
        }
        embed.addField("Total", totalCost.toLocaleString() + "₽", true);

        message.channel.send({embeds: [embed]})
            .then(() => {
                if (i == MAX_CRAFTS - 1 && matchedCrafts.length > MAX_CRAFTS && !endingsent) {
                    endingsent = true;
                    const ending = new MessageEmbed();
                    ending.setTitle("+" + (matchedCrafts.length - MAX_CRAFTS) + " more");
                    ending.setURL("https://tarkov-tools.com/hideout-profit/?search=" + encodeURIComponent(itemname));

                    let otheritems = '';
                    for (let ii = MAX_CRAFTS; ii < matchedCrafts.length; ii++) {
                        const citemname = matchedCrafts[ii].rewardItems[0].item.name + " (" + matchedCrafts[ii].source + ")";
                        if (citemname.length + 4 + otheritems.length > 2048) {
                            ending.setFooter("Not all results shown.");

                            break;
                        }

                        otheritems += citemname + "\r\n";
                    }
                    ending.setDescription(otheritems);
                    message.channel.send({embeds: [ending]})
                        .catch(console.error);
                        // .then(console.log)
                }
            })
            .catch(console.error);

        if (i == MAX_CRAFTS - 1) {
            break;
        }
    }
};

export default craft;