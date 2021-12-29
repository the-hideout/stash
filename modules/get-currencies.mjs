import ttRequest from "./tt-request.mjs";

let currencies = {
    'RUB': 1,
    'EUR': 142,
    'USD': 125,
};

const getCurrencies = async () => {
    // const dollarsQuery = `query {
    //     item(id: "5696686a4bdc2da3298b456a") {
    //         buyFor {
    //             source
    //             price
    //             currency
    //             requirements {
    //                 type
    //                 value
    //             }
    //         }
    //     }
    // }`;
    // const eurosQuery = `query {
    //     item(id: "569668774bdc2da2298b4568") {
    //         buyFor {
    //             source
    //             price
    //             currency
    //             requirements {
    //                 type
    //                 value
    //             }
    //         }
    //     }
    // }`;

    // try {
    //     const responses = await Promise.all([
    //         ttRequest({ graphql: dollarsQuery }),
    //         ttRequest({ graphql: eurosQuery })
    //     ]);

    //     currencies['USD'] = responses[0].data.item.buyFor[0].price;
    //     currencies['EUR'] = responses[1].data.item.buyFor[0].price;
    // } catch (requestError){
    //     console.error(requestError);
    // }

    return currencies;
};

export default getCurrencies;