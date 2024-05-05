const { Events } = require('discord.js');

module.exports = {
	name: Events.InteractionCreate,
	once: false,
    
	async execute(interaction, client) {
		if (interaction.replied || interaction.deferred) {
            return
        }
    
        if (interaction.isCommand()) {
            const command = client.commands.get(interaction.commandName)
    
            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.log(error)
            }
        }
	},
};