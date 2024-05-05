const fs = require('node:fs');
const path = require('node:path');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord.js');

require('dotenv').config();

const deploySequence = [
    {dir: './interactions/commands/global', guild: null},
]

async function GetCommandData(Data) {
    const commands = [];
    const commandsPath = path.join(__dirname, Data['dir']);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
            
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        commands.push(command.data.toJSON());
    }
    
    return commands;
}

async function DeployCommands() {
    const rest = new REST({ version: '10' }).setToken(process.env.token);

    for (const Data of deploySequence) {
        if (Data['guild'] === null) {

            const commands = await GetCommandData(Data)
            rest.put(Routes.applicationCommands(process.env.clientId), { body: commands })
                .then((data) => console.log(`   Successfully registered ${data.length} global commands`))
                .catch(console.error);

        } else {

            const commands = await GetCommandData(Data)
            rest.put(Routes.applicationGuildCommands(process.env.clientId, Data['guild']), { body: commands })
                .then((data) => console.log(`   Successfully registered ${data.length} ${Data['name']} commands.`))
                .catch(console.error);
        }
    }
}

async function SetCommands(clientCommands) {
    for (const Data of deploySequence) {
        const filepath = path.join(__dirname, Data['dir'])
        const files = fs.readdirSync(filepath).filter(file => file.endsWith('.js'));
    
        for (const file of files) {
            const filePath2 = path.join(filepath, file);
            const command = require(filePath2);
    
            clientCommands.set(command.data.name, command)
        }
    }
}

async function DeployEvents(client) {
    const eventsPath = path.join(__dirname, './events');
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);

        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
    }
}

module.exports = {
    DeployCommands: DeployCommands,
    SetCommands: SetCommands,
    DeployEvents: DeployEvents,
}