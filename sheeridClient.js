const axios = require('axios');
const config = require('./config');
const { HttpsProxyAgent } = require('https-proxy-agent');

class SheerIDClient {
    constructor() {
        const axiosConfig = {
            baseURL: config.apiBase,
            timeout: 30000,
            headers: {
                'User-Agent': config.userAgent,
                'Accept': 'application/json, text/plain, */*',
                'Origin': 'https://services.sheerid.com',
                'Referer': 'https://services.sheerid.com/'
            }
        };

        if (config.proxyUrl) {
            const agent = new HttpsProxyAgent(config.proxyUrl);
            axiosConfig.httpsAgent = agent;
            axiosConfig.httpAgent = agent;
            console.log("✅ Proxy konfigurálva.");
        }

        this.client = axios.create(axiosConfig);
    }

    extractInfo(url) {
        try {
            // Tisztítás
            const cleanUrl = url.trim();
            const urlObj = new URL(cleanUrl);
            
            // 1. Ha már van Verification ID (ritka)
            if (urlObj.searchParams.has('verificationId')) {
                return { id: urlObj.searchParams.get('verificationId'), type: 'VERIFICATION' };
            }
            
            // 2. Program ID keresése (Gyakori: /verify/PROGRAM_ID)
            const pathParts = urlObj.pathname.split('/');
            const verifyIndex = pathParts.indexOf('verify');
            
            if (verifyIndex !== -1 && pathParts[verifyIndex + 1]) {
                const id = pathParts[verifyIndex + 1];
                // Ellenőrizzük, hogy nem üres-e
                if (id && id.length > 5) {
                    return { id: id, type: 'PROGRAM' };
                }
            }
        } catch (e) {
            console.error("URL Parsing Error:", e.message);
            return null;
        }
        return null;
    }

    // ÚJ: Munkamenet indítása (Program ID -> Verification ID)
    async initiateSession(programId) {
        try {
            console.log(`⏳ Session indítása Program ID-vel: ${programId}`);
            const response = await this.client.post('/verification', {
                programId: programId,
                trackingId: null
            });
            console.log(`✅ Session létrehozva. Verification ID: ${response.data.id}`);
            return response.data.id; // Ez az új Verification ID
        } catch (error) {
            console.error("Session Init Error:", error.response?.data || error.message);
            throw new Error("Nem sikerült elindítani a verifikációt (Hibás Program ID?).");
        }
    }

    async submitStudentInfo(verificationId, profile) {
        try {
            if (!verificationId) throw new Error("Hiányzó Verification ID!");

            const payload = {
                firstName: profile.firstName,
                lastName: profile.lastName,
                email: profile.email,
                birthDate: profile.birthDate,
                organization: { id: profile.organization.id, name: profile.organization.name },
                deviceFingerprintHash: "c4ca4238a0b923820dcc509a6f75849b",
                metadata: { marketConsentValue: false }
            };

            const response = await this.client.post(
                `/verification/${verificationId}/step/collectStudentPersonalInfo`, 
                payload
            );
            return response.data;
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.message;
            console.error(`API Hiba (${verificationId}):`, error.response?.status, errorMsg);
            throw new Error(errorMsg);
        }
    }
}

module.exports = new SheerIDClient();
