const axios = require('axios');
const config = require('./config');
const { HttpsProxyAgent } = require('https-proxy-agent');
const FormData = require('form-data');

class SheerIDClient {
    constructor() {
        const axiosConfig = {
            baseURL: config.apiBase,
            timeout: 45000,
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
        }

        this.client = axios.create(axiosConfig);
    }

    extractInfo(url) {
        try {
            const cleanUrl = url.trim();
            const urlObj = new URL(cleanUrl);
            if (urlObj.searchParams.has('verificationId')) {
                return { id: urlObj.searchParams.get('verificationId'), type: 'VERIFICATION' };
            }
            const pathParts = urlObj.pathname.split('/');
            const verifyIndex = pathParts.indexOf('verify');
            if (verifyIndex !== -1 && pathParts[verifyIndex + 1]) {
                return { id: pathParts[verifyIndex + 1], type: 'PROGRAM' };
            }
        } catch (e) { return null; }
        return null;
    }

    async initiateSession(programId) {
        try {
            const response = await this.client.post('/verification', { programId, trackingId: null });
            return response.data;
        } catch (error) { throw new Error("Session Init Hiba"); }
    }

    async getStatus(verificationId) {
        try {
            const response = await this.client.get(`/verification/${verificationId}`);
            return response.data;
        } catch (error) { return null; }
    }

    async submitStudentInfo(verificationId, profile) {
        try {
            const payload = {
                firstName: profile.firstName,
                lastName: profile.lastName,
                email: profile.email,
                birthDate: profile.birthDate,
                organization: { id: profile.organization.id, name: profile.organization.name },
                deviceFingerprintHash: "c4ca4238a0b923820dcc509a6f75849b",
                metadata: { marketConsentValue: false }
            };
            const response = await this.client.post(`/verification/${verificationId}/step/collectStudentPersonalInfo`, payload);
            return response.data;
        } catch (error) {
            if (error.response?.data?.errorIds?.includes('invalidStep')) {
                return await this.getStatus(verificationId);
            }
            throw error;
        }
    }

    async bypassDocumentStep(verificationId) {
        try {
            console.log(`⚡ BYPASS KÍSÉRLET (Javított): ${verificationId}`);
            
            // Generálunk egy minimális, de formailag érvényes üres JPEG-et (200x200 fehér négyzet)
            const fakeJpeg = Buffer.from(
                'e1ffd8ffe000104a46494600010101006000600000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffc0000b080001000101011100ffc4001f0000010501010101010100000000000000000102030405060708090a0bffc400b5100002010303020403050504040000017d010203000411051221314106135161072271810814324291a1092352b1c1153362d1f02443537282920a161718191a25262728292a3435363738393a4445464748494a5455565758595a6465666768696a7475767778797a8485868788898a9495969798999aa4a5a6a7a8a9aa4b5b6b7b8b9babbc4c5c6c7c8c9cad4d5d6d7d8d9dae4e5e6e7e8e9eaf4f5f6f7f8f9faffda000c03010002110311003f00d29cf7ff00d9', 
                'hex'
            );

            const form = new FormData();
            form.append('file', fakeJpeg, { // Fontos: a mezőnév 'file' legyen
                filename: 'identity_card.jpg',
                contentType: 'image/jpeg',
            });

            // A kérést direkt a SheerID upload endpointjára küldjük
            const response = await this.client.post(
                `/verification/${verificationId}/step/docUpload`,
                form,
                { 
                    headers: { 
                        ...form.getHeaders(),
                        'Accept-Encoding': 'gzip, deflate, br'
                    } 
                }
            );

            return response.data;
        } catch (error) {
            console.error("Bypass Error Log:", error.response?.data || error.message);
            return { status: 'FAILED', message: error.response?.data?.message || 'Bypass elutasítva.' };
        }
    }
}

module.exports = new SheerIDClient();
