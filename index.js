const { Client, GatewayIntentBits, EmbedBuilder, ActivityType } = require('discord.js');
const config = require('./config');
const studentGen = require('./studentGenerator');
const sheerIdClient = require('./sheeridClient');
const express = require('express');

// --- 1. WEBSZERVER ---
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => { res.send('Platinum Bot Online - Status: ACTIVE'); });
app.listen(port, () => { console.log(`🌐 Web szerver elindult a ${port}-es porton.`); });

// --- 2. BOT ---
const bot = new Client({ intents: [GatewayIntentBits.Guilds] });

bot.once('ready', () => {
    console.log(`>>> PLATINUM BOT ONLINE: ${bot.user.tag}`);
    bot.user.setActivity('/verify', { type: ActivityType.Listening });
});

bot.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'verify') {
        const url = interaction.options.getString('url');
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
            let verificationId = info.id;
            let currentStep = 'collectStudentPersonalInfo'; // Alapértelmezett

            // 2. Session indítása (Ha Program ID)
            if (info.type === 'PROGRAM') {
                const sessionData = await sheerIdClient.initiateSession(info.id);
                verificationId = sessionData.id;
                currentStep = sessionData.currentStep; // Megnézzük, mit kér a rendszer
            } else {
                // Ha már Verification ID van, lekérjük az állapotot
                const status = await sheerIdClient.getStatus(verificationId);
                if (status) currentStep = status.currentStep;
            }

            // Profil generálás (szükség lehet rá később)
            const profile = studentGen.generateProfile();
            let apiResponse = null;

            // --- DINAMIKUS LÉPÉS KEZELÉS ---
            
            // Ha a rendszer adatokat kér (Név, Email...)
            if (currentStep === 'collectStudentPersonalInfo') {
                const step2Embed = new EmbedBuilder(statusEmbed.data)
                    .setDescription(`**PHASE 2:** Adatok beküldése...\n**Session:** \`${verificationId}\`\n**Step:** ${currentStep}`)
                    .setColor(0xFFA500);
                await interaction.editReply({ embeds: [step2Embed] });

                apiResponse = await sheerIdClient.submitStudentInfo(verificationId, profile);
            } 
            // Ha MÁR a doksi feltöltésnél tartunk (vagy az volt az első lépés)
            else if (currentStep === 'docUpload') {
                console.log("Skipping Info Submit -> Jumping to Doc Upload");
                // Szimulálunk egy választ, hogy a lenti logika fusson le
                apiResponse = { currentStep: 'docUpload' }; 
            }
            
            // --- AUTO-BYPASS LOGIKA ---
            // Ellenőrizzük az API választ VAGY az eredeti lépést
            if (apiResponse?.currentStep === 'docUpload') {
                const bypassEmbed = new EmbedBuilder(statusEmbed.data)
                    .setDescription(`**⚠️ DOKUMENTUM SZÜKSÉGES**\n\n⚙️ **AUTO-BYPASS:** Aktiválva...\nGenerált token beküldése...`)
                    .setColor(0xFF00FF);
                
                await interaction.editReply({ embeds: [bypassEmbed] });
                await new Promise(r => setTimeout(r, 2000));

                apiResponse = await sheerIdClient.bypassDocumentStep(verificationId);
            }

            // 3. Végeredmény
            if (apiResponse?.status === 'COMPLETE' || apiResponse?.currentStep === 'success') {
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
                const failReason = apiResponse?.message || apiResponse?.systemErrorMessage || "Ismeretlen hiba";
                await interaction.editReply({ 
                    embeds: [new EmbedBuilder()
                        .setTitle("❌ ELUTASÍTVA")
                        .setDescription(`Indok: ${failReason}\n\nLépés: ${apiResponse?.currentStep || 'N/A'}`)
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
