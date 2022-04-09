import ttRequest from "./tt-request.mjs";

let currencies = {
    'RUB': 1,
    'EUR': 142,
    'USD': 125,
};

let intervalId = false;

const updateCurrencies = async () => {
    const query = `query {
        itemsByIDs(ids: ["5696686a4bdc2da3298b456a", "569668774bdc2da2298b4568"]) {
            id
            buyFor {
                source
                price
                currency
                requirements {
                    type
                    value
                }
            }
        }
    }`;

    try {
        const response = await ttRequest({ graphql: query });
        currencies['USD'] = response.data.itemsByIDs[0].buyFor[0].price;
        currencies['EUR'] = response.data.itemsByIDs[1].buyFor[0].price;
    } catch (requestError){
        console.error('Error updating currencies', requestError);
    }
};

if (process.env.REGISTERING_COMMANDS !== 'TRUE') {
    intervalId = setInterval(updateCurrencies, 1000 * 60 * 60);
    updateCurrencies();
}

const getCurrencies = () => {
    return currencies;
};

export default getCurrencies;