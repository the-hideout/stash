import graphqlRequest from '../modules/graphql-request.mjs';
import colors from '../modules/colors.js';

const tiers = {
    legendary: 40000,
    great: 25000,
    average: 11000
};

const updateIntervalMinutes = 60;

const arrayAverage = (array) => array.reduce((a, b) => a + b) / array.length;

const updateTiers = async () => {
    const query = `query {
        items {
            id
            name
            avg24hPrice
            lastLowPrice
            sellFor {
                source
                price
                currency
            }
            types
            width
            height
        }
    }`;

    // Send the graphql query
    let response;
    try {
        response = await graphqlRequest({ graphql: query });
    } catch (error) {
        // If an error occured -> log it, send a response to the user, and exit
        console.error(error);
        return;
    }

    // If we did not get usable data from the API, send a message and return
    if (!response.hasOwnProperty('data') || !response.data.hasOwnProperty('items')) {
        return;
    }

    // If we have errors, loop through and log them - Attempt to continue with execution
    if (response.hasOwnProperty('errors')) {
        for (const errorIndex in response.errors) {
            console.error("Item search error: " + response.errors[errorIndex].message);
        }
    }

    const items = response.data.items;
    // get prices per slot
    const prices = [];
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        let price = item.avg24hPrice;
        if (item.lastLowPrice < price && item.lastLowPrice > 0) price = item.lastLowPrice
        for (let ii = 0; ii < item.sellFor.length; ii++) {
            const traderPrice = item.sellFor[ii];
            if (traderPrice.source === 'fleaMarket') continue;
            if (traderPrice.price > price) price = traderPrice.price;
        }
        const size = item.width * item.height;
        const slotValue = Math.round(price / size);
        if (slotValue > 0) prices.push(slotValue);
    }
    // sort prices descending
    prices.sort((a, b) => b - a);
    // get index of top 10% of prices
    const decileIndex = Math.ceil(prices.length/10);
    // the floor for legendary is the price at the top decile,
    // disregarding digits less than 1000
    const legendaryFloor = Math.floor(prices[decileIndex] / 1000)*1000;
    // we then grab all non-legendary prices
    const plebPrices = prices.filter(price => price < legendaryFloor);
    // the floor for the average tier is the average of non-legendary prices,
    // disregarding digits less than 1000
    let averageFloor = Math.floor(arrayAverage(plebPrices));
    if (averageFloor > 1000) averageFloor = Math.floor(averageFloor / 1000) * 1000;
    // the floor for the great tier is the price midpoint between legendary and average,
    // disregarding digits less than 1000
    let greatFloor = Math.floor((averageFloor + ((legendaryFloor - averageFloor) / 2)) / 1000) * 1000;
    tiers.legendary = legendaryFloor;
    tiers.great = greatFloor;
    tiers.average = averageFloor;
};

if (process.env.NODE_ENV !== 'ci') {
    setInterval(updateTiers, 1000 * 60 * updateIntervalMinutes).unref();
    updateTiers();
}

function get_item_tier(price, noFlea) {
    let color, tier_msg;
    if (price >= tiers.legendary) {
        color = colors.yellow;
        tier_msg = "⭐ Legendary ⭐";
    } else if (noFlea) {
        color = colors.purple;
        tier_msg = "🟣 Flea Banned ";
    } else if (price >= tiers.great) {
        color = colors.green;
        tier_msg = "🟢 Great";
    } else if (price >= tiers.average) {
        color = colors.blue;
        tier_msg = "🔵 Average";
    } else {
        color = colors.red;
        tier_msg = "🔴 Poor";
    }

    return { color: color, msg: tier_msg };
}

const getTiers = () => {
    return tiers;
};

export {
    getTiers
};

export default get_item_tier;
