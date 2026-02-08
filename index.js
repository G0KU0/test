const { Client, GatewayIntentBits, EmbedBuilder, ActivityType } = require('discord.js');
const config = require('./config');
const studentGen = require('./studentGenerator');
const sheerIdClient = require('./sheeridClient');

// --- RENDER.COM WEBSZERVER RÉSZ (Kötelező!) ---
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Platinum Bot Online - Status: ACTIVE');
});

app.listen(port, () => {
    console.log(`🌐 Web szerver elindult a ${port}-es porton.`);
});
// ---------------------------------------------

const bot = new Client({
    intents: [GatewayIntentBits.Guilds]
});

bot.once('ready', () => {
    console.log(`>>> PLATINUM BOT ONLINE: ${bot.user.tag}`);
    bot.user.setActivity('/verify', { type: ActivityType.Listening });
});

bot.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'verify') {
        const url = interaction.options.getString('url');
        
        // Jelzi a felhasználónak, hogy dolgozunk (timeout elkerülése)
        await interaction.deferReply();

        const info = sheerIdClient.extractInfo(url);
        if (!info) {
            return interaction.editReply("❌ **Hiba:** Nem érvényes vagy nem támogatott link.");
        }

        // --- FÁZIS 1: Profil generálás ---
        const statusEmbed = new EmbedBuilder()
            .setTitle("⚙️ PROCESSING...")
            .setDescription(`**PHASE 1:** Profil generálása...\n**Target ID:** \`${info.id}\``)
            .setColor(0x0099FF);

        await interaction.editReply({ embeds: [statusEmbed] });

        try {
            const profile = studentGen.generateProfile();
            
            // --- FÁZIS 2: Beküldés ---
            const step2Embed = new EmbedBuilder(statusEmbed.data)
                .setDescription(`**PHASE 2:** Adatok beküldése...\n\n**Név:** ${profile.firstName} ${profile.lastName}\n**Egyetem:** ${profile.organization.name}`)
                .setColor(0xFFA500); // Narancs
            
            await interaction.editReply({ embeds: [step2Embed] });

            // API Hívás
            const apiResponse = await sheerIdClient.submitStudentInfo(info.id, profile);

            // --- FÁZIS 3: Eredmény ---
            if (apiResponse.status === 'COMPLETE' || apiResponse.currentStep === 'success') {
                const successEmbed = new EmbedBuilder()
                    .setTitle("✅ SIKERES VERIFIKÁCIÓ")
                    .setDescription(`${config.banner}\n\n**Fiók Email:** \`${profile.email}\``)
                    .setColor(0x00FF00);
                
                if (apiResponse.redirectUrl) {
                    successEmbed.addFields({ name: '🎁 KUPON LINK', value: `[KATTINTS IDE](${apiResponse.redirectUrl})` });
                } else if (apiResponse.rewardCode) {
                    successEmbed.addFields({ name: '🔑 KÓD', value: `\`${apiResponse.rewardCode}\`` });
                }
                
                await interaction.editReply({ embeds: [successEmbed] });
            
            } else if (apiResponse.currentStep === 'docUpload') {
                const docEmbed = new EmbedBuilder()
                    .setTitle("⚠️ DOKUMENTUM SZÜKSÉGES")
                    .setDescription("A rendszer dokumentumot kért. A Node.js bot jelenleg nem támogatja az automatikus képgenerálást és feltöltést.")
                    .setColor(0xFF0000);
                await interaction.editReply({ embeds: [docEmbed] });
            } else {
                await interaction.editReply({ embeds: [new EmbedBuilder().setTitle("❌ ELUTASÍTVA").setDescription("A SheerID nem fogadta el az adatokat.").setColor(0xFF0000)] });
            }

        } catch (error) {
            console.error(error);
            const errEmbed = new EmbedBuilder()
                .setTitle("CRITICAL ERROR")
                .setDescription(`Hiba történt: ${error.message}`)
                .setColor(0x8B0000); // Sötétvörös
            await interaction.editReply({ embeds: [errEmbed] });
        }
    }
});

bot.login(config.discordToken);
