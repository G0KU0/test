const axios = require('axios');
const config = require('./config');
const { HttpsProxyAgent } = require('https-proxy-agent');

class SheerIDClient {
    constructor() {
        const axiosConfig = {
            baseURL: config.apiBase,
            timeout: 30000, // 30 mp timeout
            headers: {
                'User-Agent': config.userAgent,
                'Accept': 'application/json, text/plain, */*',
                'Origin': 'https://services.sheerid.com',
                'Referer': 'https://services.sheerid.com/'
            }
        };

        // Proxy beállítása, ha meg van adva
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
            const urlObj = new URL(url);
            // 1. eset: verificationId paraméterben van
            if (urlObj.searchParams.has('verificationId')) {
                return { id: urlObj.searchParams.get('verificationId') };
            }
            // 2. eset: URL útvonalban van (/verify/ID)
            const pathParts = urlObj.pathname.split('/');
            const verifyIndex = pathParts.indexOf('verify');
            if (verifyIndex !== -1 && pathParts[verifyIndex + 1]) {
                return { id: pathParts[verifyIndex + 1] };
            }
        } catch (e) {
            return null;
        }
        return null;
    }

    async submitStudentInfo(verificationId, profile) {
        try {
            const payload = {
                firstName: profile.firstName,
                lastName: profile.lastName,
                email: profile.email,
                birthDate: profile.birthDate,
                organization: { id: profile.organization.id, name: profile.organization.name },
                deviceFingerprintHash: "c4ca4238a0b923820dcc509a6f75849b", // Statikus anti-detect hash
                metadata: { marketConsentValue: false }
            };

            const response = await this.client.post(
                `/verification/${verificationId}/step/collectStudentPersonalInfo`, 
                payload
            );
            return response.data;
        } catch (error) {
            // Részletesebb hiba logolás
            const errorMsg = error.response?.data?.message || error.message;
            console.error(`API Hiba (${verificationId}):`, errorMsg);
            throw new Error(errorMsg);
        }
    }
}

module.exports = new SheerIDClient();
