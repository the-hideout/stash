import ttRequest from "./tt-request.mjs";

const getAmmo = async () => {
    const query = `query {
        ammo { item { id name shortName iconLink } caliber penetrationPower damage armorDamage fragmentationChance initialSpeed }
    }`;
    const response = await ttRequest({ graphql: query });
    return response.data.ammo;
};

export default getAmmo;