import { EmbedBuilder } from 'discord.js';
import moment from 'moment/min/moment-with-locales.js';

import realTimeToTarkovTime from './time.mjs';
import lootTier from './loot-tier.mjs';
import progress from './progress-shard.mjs';
import gameData from './game-data.mjs';
import { getFixedT } from './translations.mjs';

const createEmbed = {
    barter: async (barter, interaction, options = {}) => {
        const { lang, gameMode } = options.interactionSettings ?? await progress.getInteractionSettings(interaction);
        const t = getFixedT(lang);
        const commandT = getFixedT(lang, 'command');
        const gameModeLabel = t(`Game mode: {{gameMode}}`, {gameMode: commandT(`game_mode_${gameMode}`)});

        const [ items, traders, prog ] = await Promise.all([
            options.items ?? gameData.items.getAll({lang, gameMode}),
            options.traders ?? gameData.traders.getAll({lang, gameMode}),
            options.progress ?? progress.getProgressOrDefault(interaction.user.id),
        ]);

        let totalCost = 0;
        const embed = new EmbedBuilder();

        const rewardItem = items.find(it => it.id === barter.rewardItems[0].item.id);
        let title = rewardItem.name;

        if (barter.rewardItems[0].count > 1) {
            title += " (" + barter.rewardItems[0].count + ")";
        }

        //title += `\r\n ${traders.find(tr => tr.id === barter.trader.id).name} ${t('LL')}${barter.level}${locked}`;
        embed.setTitle(title);
        embed.setURL(rewardItem.link + `?barter=${barter.id}`);
        embed.setFooter({text: gameModeLabel});
        const locked = prog.traders[barter.trader.id] < barter.level ? '🔒' : '';
        const trader = traders.find(tr => tr.id === barter.trader.id);
        embed.setAuthor({
            name: `${trader.name} ${t('LL')}${barter.level}${locked}`,
            iconURL: trader.imageLink,
            url: `https://tarkov.dev/trader/${trader.normalizedName}`,
        });

        if (rewardItem.iconLink) {
            embed.setThumbnail(rewardItem.iconLink);
        }

        for (const req of barter.requiredItems) {
            const reqItem = items.find(i => i.id === req.item.id);
            let itemCost = reqItem.avg24hPrice || 0;

            if (reqItem.lastLowPrice > itemCost && reqItem.lastLowPrice > 0) {
                itemCost = reqItem.lastLowPrice;
            }

            for (const offer of reqItem.buyFor) {
                if (!offer.vendor.trader) {
                    continue;
                }
                let traderPrice = offer.priceRUB;

                if ((traderPrice < itemCost && prog.traders[offer.vendor.trader.id] >= offer.vendor.minTraderLevel) || itemCost == 0) {
                    itemCost = traderPrice;
                }
            }

            let bestSellPrice = 0;
            for (const offer of reqItem.sellFor) {
                if (!offer.vendor.trader) {
                    continue;
                }
                if (offer.priceRUB > bestSellPrice) {
                    bestSellPrice = offer.priceRUB;
                }
            }

            let reqName = reqItem.name;
            if (itemCost === 0) {
                itemCost = bestSellPrice;

                const isDogTag = req.attributes.some(att => att.name === 'minLevel');
                if (isDogTag) {
                    const tagLevel = req.attributes.find(att => att.name === 'minLevel').value;
                    itemCost = bestSellPrice * tagLevel;
                    reqName += ' >= '+tagLevel;
                }
            }

            totalCost += itemCost * req.count;
            const valueString = itemCost.toLocaleString(lang) + "₽ x " + req.count;
            embed.addFields({name: reqName, value: `[${valueString}](${reqItem.link})`, inline: true});
        }

        embed.addFields({name: t('Total'), value: totalCost.toLocaleString(lang) + "₽", inline: false});

        return embed;
    },
    craft: async (craft, interaction, options = {}) => {
        const { lang, gameMode } = options.interactionSettings ?? await progress.getInteractionSettings(interaction);
        const t = getFixedT(lang);
        const commandT = getFixedT(lang, 'command');
        const gameModeLabel = t(`Game mode: {{gameMode}}`, {gameMode: commandT(`game_mode_${gameMode}`)});

        const [ items, hideout, prog ] = await Promise.all([
            options.items ?? gameData.items.getAll({lang, gameMode}),
            options.hideout ?? gameData.hideout.getAll({lang, gameMode}),
            options.progress ?? progress.getProgressOrDefault(interaction.user.id)
        ]);

        let totalCost = 0;
        const embed = new EmbedBuilder();

        const rewardItem = items.find(it => it.id === craft.rewardItems[0].item.id)
        let title = rewardItem.name;

        if (craft.rewardItems[0].count > 1) {
            title += " (" + craft.rewardItems[0].count + ")";
        }

        embed.setTitle(title);
        embed.setURL(rewardItem.link + `?craft=${craft.id}`);
        embed.setFooter({text: gameModeLabel});

        const measuredTime = new Date(null);
        let timeDiscount = prog.skills['crafting']*0.0075*craft.duration;
        measuredTime.setSeconds(craft.duration - timeDiscount);
        const locked = prog.hideout[craft.station.id] < craft.level ? '🔒' : '';
        const station = hideout.find(st => st.id === craft.station.id);
        embed.setAuthor({
            name: `${station.name} ${t('level')} ${craft.level} (${measuredTime.toISOString().substring(11, 19)})${locked}`,
            iconURL: station.imageLink,
            url: `https://tarkov.dev/hideout-profit/?all=true&station=${station.normalizedName}&search=${encodeURIComponent(rewardItem.name)}`,
        });

        if (rewardItem.iconLink) {
            embed.setThumbnail(rewardItem.iconLink);
        }

        const ingredients = craft.requiredItems.filter(req => !req.attributes.some(att => att.type === 'tool'));
        const tools = craft.requiredItems.filter(req => req.attributes.some(att => att.type === 'tool'));
        const getRequirementCost = (reqItem) => {
            let itemCost = reqItem.avg24hPrice || 0;

            if (reqItem.lastLowPrice > itemCost && reqItem.lastLowPrice > 0) {
                itemCost = reqItem.lastLowPrice;
            }

            for (const offer of reqItem.buyFor) {
                if (!offer.vendor.trader) {
                    continue;
                }

                let traderPrice = offer.priceRUB;

                if ((traderPrice < itemCost && prog.traders[offer.vendor.trader.id] >= offer.vendor.minTraderLevel) || itemCost == 0) {
                    itemCost = traderPrice;
                }
            }
            return itemCost;
        };

        if (tools.length > 0) {
            embed.addFields({name: `${t('Required Tools')} 🛠️`, value: t('Not consumed by craft'), inline: false});
            let toolCost = 0;
            for (const req of tools) {
                const reqItem = items.find(it => it.id === req.item.id);
                const itemCost = getRequirementCost(reqItem);
                toolCost += itemCost * req.count;
                const valueString = itemCost.toLocaleString(lang) + "₽ x " + req.count
                embed.addFields({name: reqItem.name, value: `[${valueString}](${reqItem.link})`, inline: true});
                continue;
            }
            embed.addFields({name: t('Tools Total'), value: toolCost.toLocaleString(lang) + '₽', inline: false});
        }

        embed.addFields({name: `${t('Required Ingredients')} ⚙️`, value: t('Consumed by craft'), inline: false});
        for (const req of ingredients) {
            const reqItem = items.find(it => it.id === req.item.id);
            const itemCost = getRequirementCost(reqItem);
            let quantity = req.count;
            // water filter consumption rate reduction
            if (craft.station.id === '5d484fc8654e760065037abf' && req.item.id === '5d1b385e86f774252167b98a') {
                let time = prog.skills['crafting']*0.0075*quantity;
                let consumption = prog.skills['hideoutManagement']*0.005*quantity;
                quantity = Math.round((quantity - time - consumption) * 100) /100;
            }
            totalCost += itemCost * quantity;
            const valueString = itemCost.toLocaleString(lang) + "₽ x " + req.count
            embed.addFields({name: reqItem.name, value: `[${valueString}](${reqItem.link})`, inline: true});
        }
        embed.addFields({name: t('Total'), value: totalCost.toLocaleString(lang) + '₽', inline: false});

        return embed;
    },
    map: async (map, interaction, options = {}) => {
        const { lang, gameMode } = options.interactionSettings ?? await progress.getInteractionSettings(interaction);
        const t = getFixedT(lang);
        const commandT = getFixedT(lang, 'command');
        const gameModeLabel = t(`Game mode: {{gameMode}}`, {gameMode: commandT(`game_mode_${gameMode}`)});

        const [ maps, items ] = await Promise.all([
            options.maps ?? gameData.maps.getAll({lang, gameMode}),
            options.items ?? gameData.items.getAll({lang, gameMode}),
        ]);

        const embed = new EmbedBuilder();

        const selectedMapData = maps.find(mapObject => mapObject.id === map.id);
        let displayDuration = `${selectedMapData.raidDuration} ${t('minutes')}`;

        // Get left and right real tarkov time
        let left = realTimeToTarkovTime(new Date(), true);
        let right = realTimeToTarkovTime(new Date(), false);
        let displayTime = `${left} - ${right}`;
        if (selectedMapData.normalizedName.includes('factory')) {
            // If the map is Factory, set the times to static values
            if (selectedMapData.normalizedName.includes('night')) {
                displayTime = '03:00';
            } else {
                displayTime = '15:00';
            }
        } 

        let displayPlayers = '???';
        if (selectedMapData.players) {
            displayPlayers = selectedMapData.players;
        }

        let mapUrl = `https://tarkov.dev/map/${selectedMapData.normalizedName}`;
        /*if (selectedMapData.key) {
            mapUrl = `https://tarkov.dev/map/${selectedMapData.key}`;
        } else if (selectedMapData.wiki) {
            mapUrl = selectedMapData.wiki;
        }*/
       if (options.queryString) {
            mapUrl += options.queryString;
       }

        const bosses = {};
        for (const spawn of selectedMapData.bosses) {
            if (!bosses[spawn.boss.id]) {
                bosses[spawn.boss.id] = {
                    ...spawn.boss,
                    ...spawn,
                    minSpawn: spawn.spawnChance,
                    maxSpawn: spawn.spawnChance
                };
            }
            if (bosses[spawn.boss.id].minSpawn > spawn.spawnChance) bosses[spawn.boss.id].minSpawn = spawn.spawnChance;
            if (bosses[spawn.boss.id].maxSpawn < spawn.spawnChance) bosses[spawn.boss.id].maxSpawn = spawn.spawnChance;
        }
        const bossArray = [];
        for (const bossId in bosses) {
            const boss = bosses[bossId];
            let spawnChance = boss.minSpawn*100;
            if (boss.minSpawn !== boss.maxSpawn) {
                spawnChance = `${boss.minSpawn*100}-${boss.maxSpawn*100}`;
            }
            bossArray.push(`${boss.name} (${spawnChance}%)`);
        }

        // Construct the embed
        embed.setTitle(selectedMapData.name);
        if (mapUrl) {
            embed.setURL(mapUrl);
        }
        embed.addFields(
            { name: `${t('Duration')} ⌛`, value: displayDuration, inline: true},
            { name: `${t('Players')} 👥`, value: displayPlayers, inline: true},
            { name: `${t('Time')} 🕑`, value: displayTime, inline: true},
        );
        if (selectedMapData.accessKeys.length > 0) {
            const itemNames = items.filter(item => selectedMapData.accessKeys.some(access => access.id === item.id)).map(item => item.name);
            let accessLabel = t('Access item(s)');
            if (selectedMapData.accessKeysMinPlayerLevel > 0) {
                accessLabel = t('Access item(s) for level >= {{playerLevel}}', {playerLevel: selectedMapData.accessKeysMinPlayerLevel});
            }
            embed.addFields(
                { name: `${accessLabel} 🔑`, value: itemNames.join('\n') || t('N/A'), inline: true}
            );  
        }
        if (bossArray.length > 0) {
            embed.addFields(
                { name: `${t('Bosses')} 💀`, value: bossArray.join('\n') || t('N/A'), inline: true}
            );  
        }
        if (selectedMapData.key && !options.hideImage) {
            embed.setImage(`https://tarkov.dev/maps/${selectedMapData.key}.jpg`);
        }

        // If the map was made by a contributor, give them credit
        if (selectedMapData.source) {
            embed.setFooter({ text: `${t('Map made by {{author}}', {author: selectedMapData.source})} | ${gameModeLabel}`});
        } else {
            embed.setFooter({ text: gameModeLabel});
        }

        return embed;
    },
    price: async (item, interaction, options = {}) => {
        const { lang, gameMode } = options.interactionSettings ?? await progress.getInteractionSettings(interaction);
        const t = getFixedT(lang);
        const commandT = getFixedT(lang, 'command');
        const gameModeLabel = t(`Game mode: {{gameMode}}`, {gameMode: commandT(`game_mode_${gameMode}`)});

        const [ items, traders, hideout, barters, crafts, prog ] = await Promise.all([
            options.items ?? gameData.items.getAll({lang, gameMode}),
            options.traders ?? gameData.traders.getAll({lang, gameMode}),
            options.hideout ?? gameData.hideout.getAll({lang, gameMode}),
            options.barters ?? gameData.barters.getAll({ gameMode}),
            options.crafts ?? gameData.crafts.getAll({ gameMode}),
            options.progress ?? progress.getProgressOrDefault(interaction.user.id)
        ]);

        const embed = new EmbedBuilder();

        let body = `**${t('Price and Item Details')}:**\n`;
        embed.setTitle(item.name);
        embed.setURL(item.link);
        moment.locale(lang);
        embed.setFooter({text: `🕑 ${t('Last Updated')}: ${moment(item.updated).fromNow()} | ${gameModeLabel}`});

        embed.setThumbnail(item.iconLink);

        const size = parseInt(item.width) * parseInt(item.height);
        let bestTraderName = false;
        let bestTraderPrice = -1;

        for (const traderPrice of item.traderPrices) {
            if (traderPrice.priceRUB > bestTraderPrice) {
                bestTraderPrice = traderPrice.priceRUB;
                bestTraderName = traders.find(tr => tr.id === traderPrice.trader.id).name;
            }
        }

        let tierPrice = item.avg24hPrice || 0;
        let tierFee = 0;
        let sellTo = t('Flea Market');
        if (item.avg24hPrice > 0) {
            tierFee = await progress.getFleaMarketFee(interaction.user.id, item.avg24hPrice, item.basePrice, {gameMode});
            //tierPrice -= avgFee;
            let fleaPrice = parseInt(item.avg24hPrice).toLocaleString(lang) + "₽";

            if (size > 1) {
                fleaPrice += "\r\n" + Math.round(parseInt(item.avg24hPrice) / size).toLocaleString(lang) + `₽/${t('slot')}`;
            }
            fleaPrice += `\r\n\r\n ${t('Fee')}: ~${tierFee.toLocaleString(lang)}₽`;
            fleaPrice += `\r\n ${t('Net')}: ${parseInt(item.avg24hPrice-tierFee).toLocaleString(lang)}₽`;
            if (size > 1) {
                fleaPrice += `\r\n ${Math.round(parseInt(item.avg24hPrice-tierFee) / size).toLocaleString(lang)}₽/${t('slot')}`;
            }

            embed.addFields({name: t('Flea Price (avg)'), value: fleaPrice, inline: true});
        }

        if (item.lastLowPrice > 0) {
            const lowFee = await progress.getFleaMarketFee(interaction.user.id, item.lastLowPrice, item.basePrice, {gameMode});
            let fleaPrice = parseInt(item.lastLowPrice).toLocaleString(lang) + "₽";

            if (size > 1) {
                fleaPrice += "\r\n" + Math.round(parseInt(item.lastLowPrice) / size).toLocaleString(lang) + `₽/${t('slot')}`;
            }
            fleaPrice += `\r\n\r\n ${t('Fee')}: ~${lowFee.toLocaleString(lang)}₽`;
            fleaPrice += `\r\n ${t('Net')}: ${parseInt(item.lastLowPrice-lowFee).toLocaleString(lang)}₽`;
            if (size > 1) {
                fleaPrice += `\r\n ${Math.round(parseInt(item.lastLowPrice-lowFee) / size).toLocaleString(lang)}₽/${t('slot')}`;
            }

            embed.addFields({name: t('Flea Price (low)'), value: fleaPrice, inline: true});
            
            if (item.lastLowPrice < tierPrice || tierPrice == 0) {
                tierPrice = item.lastLowPrice;
                tierFee = lowFee;
            }
        }

        const optimalPrice = await progress.getOptimalFleaPrice(interaction.user.id, item.basePrice, gameMode);
        const optimalFee = await progress.getFleaMarketFee(interaction.user.id, optimalPrice, item.basePrice, {gameMode});
        if (optimalPrice - optimalFee > tierPrice - tierFee && optimalPrice < tierPrice) {
            tierPrice = optimalPrice;
            tierFee = optimalFee;

            let fleaPrice = parseInt(optimalPrice).toLocaleString(lang) + "₽";

            if (size > 1) {
                fleaPrice += "\r\n" + Math.round(parseInt(optimalPrice) / size).toLocaleString(lang) + `₽/${t('slot')}`;
            }
            fleaPrice += `\r\n\r\n ${t('Fee')}: ~${optimalFee.toLocaleString(lang)}₽`;
            fleaPrice += `\r\n ${t('Net')}: ${parseInt(optimalPrice-optimalFee).toLocaleString(lang)}₽`;
            if (size > 1) {
                fleaPrice += `\r\n ${Math.round(parseInt(optimalPrice-optimalFee) / size).toLocaleString(lang)}₽/${t('slot')}`;
            }

            embed.addFields({name: t('Flea Price (optimal)'), value: fleaPrice, inline: true});
        }

        if (bestTraderName) {
            if (bestTraderPrice > (tierPrice - tierFee)) {
                tierPrice = bestTraderPrice;
                tierFee = 0;
                sellTo = bestTraderName;
            }
            let traderVal = bestTraderPrice.toLocaleString(lang) + "₽";

            if (size > 1) {
                traderVal += "\r\n" + Math.round(bestTraderPrice / size).toLocaleString(lang) + `₽/${t('slot')}`;
            }
            embed.addFields({name: bestTraderName + ` ${t('Value')}`, value: traderVal, inline: true});
        }

        if (tierPrice > 0) {
            body += `• ${t('Sell to')}: \`${sellTo}\` ${t('for')} \`${tierPrice.toLocaleString(lang) + "₽"}\`\n`;
        }

        // Calculate item tier
        let tier = await lootTier(tierPrice / (item.width * item.height), item.types.includes('noFlea'), gameMode);
        embed.setColor(tier.color);
        body += `• ${t('Item Tier')}: ${t(tier.msg)}\n`;

        for (const offer of item.buyFor) {
            if (!offer.vendor.trader) {
                continue;
            }

            let traderPrice = offer.priceRUB.toLocaleString(lang) + "₽";
            let level = 1;
            let quest = '';

            if (offer.vendor.minTraderLevel) {
                level = offer.vendor.minTraderLevel;
            }
            if (offer.vendor.taskUnlock) {
                quest = ` +${t('Task')}`;
            }

            const locked = prog.traders[offer.vendor.trader.id] < level ? '🔒' : '';
            const title = `${traders.find(tr => tr.id === offer.vendor.trader.id).name} ${t('LL')}${level}${quest} ${t('Price')}${locked}`;
            embed.addFields({name: title, value: traderPrice, inline: true});
        }

        for (const ib of item.bartersFor) {
            const barter = barters.find(b => b.id === ib.id);
            let barterCost = 0;

            for (const req of barter.requiredItems) {
                const reqItem = items.find(it => it.id === req.item.id);
                let itemCost = reqItem.avg24hPrice || 0;

                if (reqItem.lastLowPrice > itemCost && reqItem.lastLowPrice > 0) {
                    itemCost = reqItem.lastLowPrice;
                }

                for (const offer of reqItem.buyFor) {
                    if (!offer.vendor.trader) {
                        continue;
                    }

                    let traderPrice = offer.priceRUB;

                    if ((traderPrice < itemCost && prog.traders[offer.vendor.trader.id] >= offer.vendor.minTraderLevel) || itemCost == 0) {
                        itemCost = traderPrice;
                    }
                }

                let bestSellPrice = 0;
                for (const offer of reqItem.sellFor) {
                    if (!offer.vendor.trader) {
                        continue;
                    }
                    if (offer.priceRUB > bestSellPrice) {
                        bestSellPrice = offer.priceRUB;
                    }
                }

                if (itemCost === 0) {
                    itemCost = bestSellPrice;

                    const isDogTag = req.attributes.some(att => att.name === 'minLevel');
                    if (isDogTag) {
                        const tagLevel = req.attributes.find(att => att.name === 'minLevel').value;
                        itemCost = bestSellPrice * tagLevel;
                    }
                }

                barterCost += itemCost * req.count;
            }

            barterCost = Math.round(barterCost / barter.rewardItems[0].count).toLocaleString(lang) + "₽";
            const locked = prog.traders[barter.trader.id] < barter.level ? '🔒' : '';
            const title = `${traders.find(t => t.id === barter.trader.id).name} ${t('LL')}${barter.level} ${t('Barter')}${locked}`;
            embed.addFields({name: title, value: barterCost, inline: true});
        }

        for (const c of item.craftsFor) {
            const craft = crafts.find(cr => cr.id === c.id);
            let craftCost = 0;

            for (const req of craft.requiredItems) {
                const reqItem = items.find(it => it.id === req.item.id);
                let itemCost = reqItem.avg24hPrice || 0;

                if (reqItem.lastLowPrice > itemCost && reqItem.lastLowPrice > 0) {
                    itemCost = reqItem.lastLowPrice;
                }

                for (const offer of reqItem.buyFor) {
                    if (!offer.vendor.trader) {
                        continue;
                    }

                    let traderPrice = offer.priceRUB;

                    if ((traderPrice < itemCost && prog.traders[offer.vendor.trader.id] >= offer.vendor.minTraderLevel) || itemCost == 0) {
                        itemCost = traderPrice;
                    }
                }
                craftCost += itemCost * req.count;
            }
            craftCost = Math.round(craftCost / craft.rewardItems[0].count).toLocaleString(lang) + "₽";
            if (craft.rewardItems[0].count > 1) {
                craftCost += ' (' + craft.rewardItems[0].count + ')';
            }

            const locked = prog.hideout[craft.station.id] < craft.level ? '🔒' : '';
            const title = `${hideout.find(s => s.id === craft.station.id).name} ${t('level')} ${craft.level} ${t('Craft')}${locked}`;
            embed.addFields({name: title, value: craftCost, inline: true});
        }

        if (embed.data.fields?.length == 0) {
            embed.setDescription(t('No prices available.'));
        }

        // Add the item weight
        body += `• ${t('Weight')}: \`${item.weight} ${t('kg')}\`\n`;

        // Add the item description
        embed.setDescription(body);

        return embed;
    },
    unlockMaps: async (item, interaction, options = {}) => {
        const { lang, gameMode } = options.interactionSettings ?? await progress.getInteractionSettings(interaction);
        const t = getFixedT(lang);

        const [ maps ] = await Promise.all([
            options.maps ?? gameData.maps.getAll({lang, gameMode}),
        ]);

        const unlocksEmbed = new EmbedBuilder();
        const mapLinks = maps.filter(m => m.locks.some(lock => lock.key.id === item.id)).map(map => `[${map.name}](http://tarkov.dev/map/${map.normalizedName}?q=${item.id})`);
        if (mapLinks.length === 0) {
            unlocksEmbed.setTitle(`${t('Not used on any maps')} 🔐`);
        } else {
            unlocksEmbed.setTitle(`${t('Opens locks on')} 🔐`);
            unlocksEmbed.setDescription(mapLinks.join('\n'));
        }
        return unlocksEmbed;
    },
    itemUsedInTasks: async (item, interaction, options = {}) => {
        const { lang, gameMode } = options.interactionSettings ?? await progress.getInteractionSettings(interaction);
        const t = getFixedT(lang);

        const [ tasks ] = await Promise.all([
            options.tasks ?? gameData.tasks.getAll({lang, gameMode}),
        ]);

        const embed = new EmbedBuilder();

        for (const task of tasks) {
            let needed = task.objectives.some(obj => obj.requiredKeys?.some(keyOptions => keyOptions.some(k => k.id === item.id)));
            needed = needed || task.objectives.some(obj => obj.items?.some(i => i.id === item.id));
            if (!needed) {
                continue;
            }

            let alternates = task.objectives.some(obj => obj.requiredKeys?.some(keyOptions => keyOptions.some(k => k.id === item.id) && keyOptions.length > 1));
            alternates = alternates || task.objectives.some(obj => obj.items?.some(i => i.id === item.id) && obj.items.length > 1);
            const fieldValueLines = [];
            if (alternates) {
                fieldValueLines.push(t('Has alternates'));
            } else {
                fieldValueLines.push(t('No alternates'));
            }
            const fir = task.objectives.some(obj => obj.items?.some(i => i.id === item.id) && obj.foundInRaid);
            if (fir) {
                fieldValueLines.push(t('Found in raid'));
            }
            embed.addFields({name: task.name, value: `[${fieldValueLines.join('\n')}](https://tarkov.dev/task/${task.normalizedName})`});
        }
        if (embed.data?.fields?.length > 0) {
            embed.setTitle(`${t('Used in tasks')} 📋`);
        } else {
            embed.setTitle(`${t('Not used in any tasks')} 📋`);
        }

        return embed;
    },
};

export default createEmbed;
