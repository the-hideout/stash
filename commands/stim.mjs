import { SlashCommandBuilder } from '@discordjs/builders';
import { MessageEmbed } from 'discord.js';

import getItemsByName from '../modules/get-items.mjs';

const MAX_ITEMS = 2;

const defaultFunction = {
    data: new SlashCommandBuilder()
        .setName('stim')
        .setDescription('Replies with an stim injector information')
        .addStringOption(option => {
            return option.setName('name')
                .setDescription('Stim to search for')
                .setAutocomplete(true)
                .setRequired(true);
        }),

    async execute(interaction) {
        await interaction.deferReply();
        // Get the search string from the user invoked command
        let searchString = interaction.options.getString('name');

        // Make a graphql query to get the item data from the API
        let response = false;
        try {
            response = await graphql_query(interaction, searchString);
        } catch (error) {
            console.log('stim command query error', error);
            throw error;
        }

        // If we failed to get a response from the graphql_query, return
        if (!response) {
            return;
        }

        let embeds = [];

        for (const item of response.data.items) {
            if (item.shortName.toLowerCase() !== searchString) {
                continue;
            }

            response.data.items = [item];
            break;
        }

        for (let i = 0; i < response.data.items.length; i = i + 1) {
            const item = response.data.items[i];
            if (item.category.id !== '5448f3a64bdc2d60728b456a') continue;
            const embed = new MessageEmbed();

            //let body = "**Price and Item Details:**\n";
            embed.setTitle(item.name);
            embed.setURL(item.link);
            //embed.setFooter({text: `🕑 Last Updated: ${moment(item.updated).fromNow()}`});

            if (item.iconLink) {
                embed.setThumbnail(item.iconLink);
            } else {
                embed.setThumbnail(item.imageLink);
            }

            if (item.properties.cures.length > 0) {
                embed.addFields({name: 'Cures', values: item.properties.cures.join('\n'), inline: true});
            }
            for (const effect of item.properties.stimEffects) {
                let title = effect.type;
                if (title === 'Skill') title = `${title}: ${effect.skillName}`;
                const lines = [];
                if (effect.value !== 0) {
                    let sign = '+';
                    if (effect.value < 0) sign = '';
                    if (effect.percent) {
                        title += ` ${sign}${effect.value*100}%`;
                        //lines.push(`Value: ${effect.value*100}%`)
                    } else {
                        title += ` ${sign}${effect.value}`;
                        //lines.push(`Value: ${effect.value}`)
                    }
                }
                if (effect.chance !== 1) {
                    lines.push(`Chance: ${effect.chance*100}%`);
                }
                if (effect.delay !== 1) {
                    lines.push(`Delay: ${effect.delay} seconds`);
                }
                lines.push(`Duration: ${effect.duration}`);
                embed.addFielsd({name: title, value: lines.join('\n'), inline: true});
            }

            embeds.push(embed);

            if (i >= MAX_ITEMS - 1) {
                break;
            }
        }

        if (MAX_ITEMS < response.data.items.length) {
            const ending = new MessageEmbed();

            ending.setTitle("+" + (response.data.items.length - MAX_ITEMS) + " more");
            ending.setURL("https://tarkov.dev/?search=" + encodeURIComponent(searchString));

            let otheritems = '';
            for (let i = MAX_ITEMS; i < response.data.items.length; i = i + 1) {
                const itemname = `[${response.data.items[i].name}](${response.data.items[i].link})`;

                if (itemname.length + 2 + otheritems.length > 2048) {
                    ending.setFooter({text: `${response.data.items.length-i} additional results not shown.`,});

                    break;
                }

                otheritems += itemname + "\n";
            }

            ending.setDescription(otheritems);

            embeds.push(ending);
        }

        await interaction.editReply({ embeds: embeds });
    },
    examples: [
        '/stim Obdolbos'
    ]
};

// A helper function to make a graphql query to get item data from the API
// :param interaction: The interaction object to edit the reply with
// :param searchString: The search string to search for via the graphql API
// :return response: The graphql response object - False (bool) if anything fails
async function graphql_query(interaction, searchString) {
    // If no search string is provided, send a message and return
    if (!searchString) {
        await interaction.deleteReply();
        await interaction.followUp({
            content: 'You need to specify a search term',
            ephemeral: true,
        });
        return false;
    }

    // Send the graphql query
    let response;
    try {
        response = await getItemsByName(searchString);//graphqlRequest({ graphql: query });
    } catch (error) {
        // If an error occured -> log it, send a response to the user, and exit
        console.error(error);
        await interaction.deleteReply();
        await interaction.followUp({
            content: 'An error occured while trying to contact api.tarkov.dev',
            ephemeral: true,
        });
        return false;
    }

    // If we did not get usable data from the API, send a message and return
    if (!response.hasOwnProperty('data') || !response.data.hasOwnProperty('items')) {
        await interaction.deleteReply();
        await interaction.followUp({
            content: 'Got no data from the API (oh no)',
            ephemeral: true,
        });
        return false;
    }

    // If we have errors, loop through and log them - Attempt to continue with execution
    if (response.hasOwnProperty('errors')) {
        for (const errorIndex in response.errors) {
            console.error("Stim search error: " + response.errors[errorIndex].message);
        }
    }

    // If no items matched the search string, send a message and return
    if (response.data.items.length === 0) {
        await interaction.deleteReply();
        await interaction.followUp({
            content: `Found no matching stims for "${searchString}"`,
            ephemeral: true,
        });
        return false;
    }

    // If everything else succeeded, return the API response
    return response;
}

export default defaultFunction;
