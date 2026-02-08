const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const config = require('./config');

const commands = [
    new SlashCommandBuilder()
        .setName('verify')
        .setDescription('SheerID verifikáció indítása')
        .addStringOption(option =>
            option.setName('url')
                .setDescription('A verifikációs link')
                .setRequired(true))
]
.map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(config.discordToken);

(async () => {
    try {
        console.log('(/) Slash parancsok regisztrálása...');

        await rest.put(
            Routes.applicationCommands(config.clientId),
            { body: commands },
        );

        console.log('✅ Siker! A parancsok regisztrálva.');
    } catch (error) {
        console.error('Hiba a parancsok regisztrálásakor:', error);
    }
})();
