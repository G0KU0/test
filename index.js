const { Client, GatewayIntentBits, EmbedBuilder, ActivityType } = require('discord.js');
const config = require('./config');
const studentGen = require('./studentGenerator');
const sheerIdClient = require('./sheeridClient');
const express = require('express');

// --- 1. WEBSZERVER (Renderhez kötelező) ---
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Platinum Bot Online - Status: ACTIVE');
});

app.listen(port, () => {
    console.log(`🌐 Web szerver elindult a ${port}-es porton.`);
});

// --- 2. BOT LÉTREHOZÁSA (Ez hiányzott!) ---
const bot = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// --- 3. ESEMÉNYEK ---

bot.once('ready', () => {
    console.log(`>>> PLATINUM BOT ONLINE: ${bot.user.tag}`);
    bot.user.setActivity('/verify', { type: ActivityType.Listening });
});

bot.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'verify') {
        const url = interaction.options.getString('url');
        
        // Timeout elkerülése
        await interaction.deferReply();

        // 1. URL Elemzése
        const info = sheerIdClient.extractInfo(url);
        if (!info) {
            return interaction.editReply("❌ **Hiba:** Nem érvényes vagy nem támogatott link.");
        }

        const statusEmbed = new EmbedBuilder()
            .setTitle("⚙️ PROCESSING...")
            .setDescription(`**PHASE 1:** Inicializálás...\n**ID:** \`${info.id}\` (${info.type})`)
            .setColor(0x0099FF);

        await interaction.editReply({ embeds: [statusEmbed] });

        try {
            // 2. Session kezelés
            let verificationId = info.id;
            if (info.type === 'PROGRAM') {
                verificationId = await sheerIdClient.initiateSession(info.id);
            }

            // 3. Profil generálás
            const profile = studentGen.generateProfile();
            
            const step2Embed = new EmbedBuilder(statusEmbed.data)
                .setDescription(`**PHASE 2:** Adatok beküldése...\n**Session:** \`${verificationId}\`\n\n**Név:** ${profile.firstName} ${profile.lastName}\n**Egyetem:** ${profile.organization.name}`)
                .setColor(0xFFA500);
            
            await interaction.editReply({ embeds: [step2Embed] });

            // 4. API Beküldés
            let apiResponse = await sheerIdClient.submitStudentInfo(verificationId, profile);

            // --- AUTO-BYPASS LOGIKA ---
            if (apiResponse.currentStep === 'docUpload') {
                const bypassEmbed = new EmbedBuilder(statusEmbed.data)
                    .setDescription(`**⚠️ DOKUMENTUM SZÜKSÉGES**\n\n⚙️ **AUTO-BYPASS:** Aktiválva...\nGenerált token beküldése...`)
                    .setColor(0xFF00FF); // Lila
                
                await interaction.editReply({ embeds: [bypassEmbed] });

                // Kis szünet a hitelességért
                await new Promise(r => setTimeout(r, 2000));

                // Bypass meghívása
                apiResponse = await sheerIdClient.bypassDocumentStep(verificationId);
            }
            // -------------------------

            // 5. Végeredmény kiértékelése
            if (apiResponse.status === 'COMPLETE' || apiResponse.currentStep === 'success') {
                const successEmbed = new EmbedBuilder()
                    .setTitle("✅ SIKERES VERIFIKÁCIÓ")
                    .setDescription(`${config.banner}\n\n**Email:** \`${profile.email}\``)
                    .setColor(0x00FF00);
                
                if (apiResponse.redirectUrl) {
                    successEmbed.addFields({ name: '🎁 KUPON LINK', value: `[KATTINTS IDE](${apiResponse.redirectUrl})` });
                } else if (apiResponse.rewardCode) {
                    successEmbed.addFields({ name: '🔑 KÓD', value: `\`${apiResponse.rewardCode}\`` });
                }
                
                await interaction.editReply({ embeds: [successEmbed] });
            
            } else {
                // Ha a bypass után is sikertelen
                const failReason = apiResponse.message || "A SheerID elutasította az adatokat.";
                await interaction.editReply({ 
                    embeds: [new EmbedBuilder()
                        .setTitle("❌ ELUTASÍTVA")
                        .setDescription(`Indok: ${failReason}\n\nTipp: Próbálj másik proxyt vagy egyetemet.`)
                        .setColor(0xFF0000)
                    ] 
                });
            }

        } catch (error) {
            console.error(error);
            const errEmbed = new EmbedBuilder()
                .setTitle("CRITICAL ERROR")
                .setDescription(`Hiba történt: ${error.message}`)
                .setColor(0x8B0000);
            await interaction.editReply({ embeds: [errEmbed] });
        }
    }
});

bot.login(config.discordToken);
