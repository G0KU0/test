// ... (A fenti importok maradnak) ...
// ... (A webszerver rész marad) ...

bot.on('interactionCreate', async interaction => {
    // ... (Ellenőrzések maradnak) ...
    
    if (interaction.commandName === 'verify') {
        // ... (Eleje ugyanaz: URL kinyerés, Embed küldés) ...

        try {
            // ... (Session init és Profil generálás ugyanaz) ...
            
            // API Beküldés (1. lépés)
            let apiResponse = await sheerIdClient.submitStudentInfo(verificationId, profile);

            // --- ITT A VÁLTOZÁS: AUTOMATA BYPASS ---
            if (apiResponse.currentStep === 'docUpload') {
                
                // Frissítjük az Embed-et: "Bypass aktiválva"
                const bypassEmbed = new EmbedBuilder(statusEmbed.data)
                    .setDescription(`**⚠️ DOC UPLOAD DETECTED**\n\n⚙️ **AUTO-BYPASS:** Aktiválva...\nPróbáljuk megkerülni a képfeltöltést egy generált tokennel.`)
                    .setColor(0xFF00FF); // Lila szín a "Magic" jelzésére
                
                await interaction.editReply({ embeds: [bypassEmbed] });

                // Várakozás a hitelesség kedvéért (2 mp)
                await new Promise(r => setTimeout(r, 2000));

                // A Bypass meghívása
                apiResponse = await sheerIdClient.bypassDocumentStep(verificationId);
            }
            // ----------------------------------------

            // Eredmény kezelése (Ez már kezeli a Bypass eredményét is)
            if (apiResponse.status === 'COMPLETE' || apiResponse.currentStep === 'success') {
                // ... (Siker kódja ugyanaz) ...
                 const successEmbed = new EmbedBuilder()
                    .setTitle("✅ SIKERES VERIFIKÁCIÓ (BYPASSED)")
                    .setDescription(`${config.banner}\n\n**Email:** \`${profile.email}\``)
                    .setColor(0x00FF00);
                
                if (apiResponse.redirectUrl) {
                    successEmbed.addFields({ name: '🎁 KUPON LINK', value: `[KATTINTS IDE](${apiResponse.redirectUrl})` });
                } else if (apiResponse.rewardCode) {
                    successEmbed.addFields({ name: '🔑 KÓD', value: `\`${apiResponse.rewardCode}\`` });
                }
                
                await interaction.editReply({ embeds: [successEmbed] });

            } else {
                // Ha még a bypass után is kéri, vagy elutasította
                await interaction.editReply({ 
                    embeds: [new EmbedBuilder()
                        .setTitle("❌ BYPASS FAILED")
                        .setDescription("A rendszer észlelte a generált dokumentumot és elutasította.\nPróbálj másik egyetemet vagy proxyt.")
                        .setColor(0xFF0000)
                    ] 
                });
            }

        } catch (error) {
           // ... (Hiba kezelés marad) ...
        }
    }
});
