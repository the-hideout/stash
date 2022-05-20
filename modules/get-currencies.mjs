import graphqlRequest from "./graphql-request.mjs";

let currencies = {
    'RUB': 1,
    'EUR': 142,
    'USD': 125,
};

let intervalId = false;

// 5696686a4bdc2da3298b456a = dollars
// 569668774bdc2da2298b4568 = euros
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
        const response = await graphqlRequest({ graphql: query });
        currencies['USD'] = response.data.itemsByIDs[0].buyFor[0].price;
        currencies['EUR'] = response.data.itemsByIDs[1].buyFor[0].price;
    } catch (requestError){
        console.error('Error updating currencies', requestError);
    }
};

if (process.env.NODE_ENV !== 'ci') {
    intervalId = setInterval(updateCurrencies, 1000 * 60 * 60);
    intervalId.unref();
    updateCurrencies();
}

const getCurrencies = () => {
    return currencies;
};

export default getCurrencies;
