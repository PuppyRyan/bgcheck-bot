const { Client, IntentsBitField, Collection } = require('discord.js');

const deployment = require('./deployment')

require('dotenv').config();

const myIntents = new IntentsBitField();
myIntents.add(
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
);

const client = new Client({ 
    intents: myIntents,
});

client.commands = new Collection();

deployment.DeployEvents(client);
client.login(process.env.token);
