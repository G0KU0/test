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
            console.log("✅ Proxy konfigurálva.");
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
                const id = pathParts[verifyIndex + 1];
                if (id && id.length > 5) return { id: id, type: 'PROGRAM' };
            }
        } catch (e) {
            return null;
        }
        return null;
    }

    // Módosítva: Visszaadja a teljes objektumot, nem csak az ID-t
    async initiateSession(programId) {
        try {
            const response = await this.client.post('/verification', {
                programId: programId,
                trackingId: null
            });
            return response.data; // { id: "...", currentStep: "..." }
        } catch (error) {
            console.error("Session Init Hiba:", error.response?.data);
            throw new Error("Nem sikerült elindítani a verifikációt.");
        }
    }

    async getStatus(verificationId) {
        try {
            const response = await this.client.get(`/verification/${verificationId}`);
            return response.data;
        } catch (error) {
            return null;
        }
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

            const response = await this.client.post(
                `/verification/${verificationId}/step/collectStudentPersonalInfo`, 
                payload
            );
            return response.data;
        } catch (error) {
            // Ha 'invalidStep' hibát kapunk, lekérjük az aktuális állapotot
            if (error.response?.data?.errorIds?.includes('invalidStep')) {
                console.log("⚠️ Invalid Step detected, fetching current status...");
                const status = await this.getStatus(verificationId);
                return status; // Visszaadjuk az aktuális állapotot, hogy az index.js kezelni tudja
            }
            
            const serverMsg = JSON.stringify(error.response?.data) || error.message;
            throw new Error(`SheerID Hiba: ${serverMsg}`);
        }
    }

    async bypassDocumentStep(verificationId) {
        try {
            console.log(`⚡ BYPASS KÍSÉRLET: ${verificationId}`);
            const fakeImageBuffer = Buffer.from(
                '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
                'base64'
            );

            const form = new FormData();
            form.append('document', fakeImageBuffer, {
                filename: 'student_id_card.jpg',
                contentType: 'image/jpeg',
            });

            const response = await this.client.post(
                `/verification/${verificationId}/step/docUpload`,
                form,
                { headers: { ...form.getHeaders() } }
            );

            return response.data;
        } catch (error) {
            console.error("Bypass Failed:", error.message);
            return { status: 'FAILED', message: 'Bypass sikertelen.' };
        }
    }
}

module.exports = new SheerIDClient();
