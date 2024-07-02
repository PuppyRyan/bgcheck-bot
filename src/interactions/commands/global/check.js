let { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
let backgroundCheckModule = require('../../../modules/backgroundCheck')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('check')
        .setDescription('run an account check')
        .addStringOption(option => 
            option.setName('username')
                .setDescription('User to background check')
                .setRequired(true))

        /*.addStringOption(option => 
            option.setName('debug')
                .setDescription('Enable debug')
                .setRequired(false)
                .addChoices(
                    {name: 'true', value: 'true'},
                    {name: 'false', value: 'false'},
                ))*/,
        
    async execute(interaction, client) {
        let target = interaction.options.getString('username');
    
        await interaction.deferReply()

        backgroundCheckModule.execute(target, 'standard', client, interaction).then(async result => {
            if (result[0] == 'embed') {
                await interaction.editReply({
                    embeds: [result[1]]
                })

            } else {
                let FailedEmbed = new EmbedBuilder()
                    .setColor(0xff5757)
                    .setTitle('Background Check Failed')
                    .setDescription(result[1])

                await interaction.editReply({
                    embeds: [FailedEmbed]
                })
            }
        })
    },
};