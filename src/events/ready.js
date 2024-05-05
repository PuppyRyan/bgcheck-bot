const { Events } = require('discord.js');

const deployment = require('../deployment')

require('dotenv').config();

module.exports = {
	name: Events.ClientReady,
	once: true,

	async execute(client) {
        console.log('✅ Bot online')

        deployment.SetCommands(client.commands)
        deployment.DeployCommands()
	},
};