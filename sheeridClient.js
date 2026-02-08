const axios = require('axios');
const config = require('./config');
const { HttpsProxyAgent } = require('https-proxy-agent');
const FormData = require('form-data'); // Ez kell a fájlfeltöltéshez

class SheerIDClient {
    constructor() {
        const axiosConfig = {
            baseURL: config.apiBase,
            timeout: 45000, // Növelt timeout a feltöltéshez
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

    async initiateSession(programId) {
        try {
            const response = await this.client.post('/verification', {
                programId: programId,
                trackingId: null
            });
            return response.data.id;
        } catch (error) {
            throw new Error("Nem sikerült elindítani a verifikációt.");
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
            const errorMsg = error.response?.data?.message || error.message;
            throw new Error(errorMsg);
        }
    }

    // --- AZ ÚJ "BYPASS" FUNKCIÓ ---
    async bypassDocumentStep(verificationId) {
        try {
            console.log(`⚡ BYPASS KÍSÉRLET: ${verificationId}`);

            // 1. Generálunk egy 1x1 pixeles "kamu" képet (vagy zajt)
            // Ez egy minimális valid JPEG header
            const fakeImageBuffer = Buffer.from(
                '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
                'base64'
            );

            // 2. Form Data összeállítása
            const form = new FormData();
            form.append('document', fakeImageBuffer, {
                filename: 'student_id_card.jpg',
                contentType: 'image/jpeg',
            });

            // 3. Beküldés a SheerID-nek
            // Fontos: A SheerID néha a /step/docUpload végpontot használja
            const response = await this.client.post(
                `/verification/${verificationId}/step/docUpload`,
                form,
                {
                    headers: {
                        ...form.getHeaders(), // Ez nagyon fontos a multipart miatt
                    }
                }
            );

            return response.data;

        } catch (error) {
            console.error("Bypass Failed:", error.message);
            // Ha 400-as hiba, az azt jelenti, hogy az AI felismerte, hogy kamu a kép
            return { status: 'FAILED', message: error.response?.data?.message || 'AI Detection Triggered' };
        }
    }
}

module.exports = new SheerIDClient();
