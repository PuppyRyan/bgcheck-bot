const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('see bot uptime and ping'),

    async execute(command_interaction, client) {
        const reply = 'Pinging...'
        const sent = await command_interaction.reply({content: reply, fetchReply: true, ephemeral: true})

        let totalSeconds = (client.uptime / 1000);
        let days = Math.floor(totalSeconds / 86400);
        totalSeconds %= 86400;
        let hours = Math.floor(totalSeconds / 3600);
        totalSeconds %= 3600;
        let minutes = Math.floor(totalSeconds / 60);
        let seconds = Math.floor(totalSeconds % 60);
        let uptime = `${days} days, ${hours} hours, ${minutes} minutes and ${seconds} seconds`;

        const PingEmbed = new EmbedBuilder()
            .setColor(0x248046)
            .setTitle('Ping')
            .addFields(
                {name: 'Client Latency', value: `${sent.createdTimestamp - command_interaction.createdTimestamp}ms`, inline: true},
                {name: 'API Latency', value: `${Math.round(client.ws.ping)}ms`, inline: true},
                {name: 'Uptime', value: `${uptime}`, inline: false},
            )

        command_interaction.fetchReply()
            .then(
                await command_interaction.editReply({
                    content: ' ',
                    embeds: [PingEmbed],
                })
            )
    },
};