require('dotenv').config();

module.exports = {
    discordToken: process.env.DISCORD_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    proxyUrl: process.env.PROXY_URL || null,
    apiBase: "https://services.sheerid.com/rest/v2",
    // Chrome 131 User-Agent a hitelességért
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    banner: "```\n" +
    " _____ _                    ___________\n" +
    "/  ___| |                  |_   _|  _  \\\n" +
    "\\ `--.| |__   ___  ___ _ __  | | | | | |\n" +
    " `--. \\ '_ \\ / _ \\/ _ \\ '__| | | | | | |\n" +
    "/\\__/ / | | |  __/  __/ |   _| |_| |/ /\n" +
    "\\____/|_| |_|\\___|\\___|_|   |___/|___/\n" +
    "      P L A T I N U M   E D I T I O N\n```"
};
