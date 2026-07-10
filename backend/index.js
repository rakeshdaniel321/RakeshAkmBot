const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { Telegraf } = require('telegraf');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 💾 இன்-மெமரி டேட்டாபேஸ் (உன்னோட போட் மற்றும் வெப்சைட் டேட்டாவை தற்காலிகமாக சேமிக்க)
const trackedUsers = {};

// 🛠️ 1. பயனர் செஷனைத் துவங்கும் ஹெல்பர் ஃபங்க்ஷன்
function initUserSession(tgId, username = 'No Username') {
    if (!trackedUsers[tgId]) {
        const now = new Date();
        const timestamp = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        
        trackedUsers[tgId] = {
            telegramId: tgId,
            username: username,
            botStage: 'START',
            lang: 'EN',
            botName: 'Not Provided',
            botEmail: 'Not Provided',
            botDOB: 'Not Provided',
            botAge: 'Not Provided',
            botFrom: 'Not Provided',
            flamesName1: 'Not Provided',
            flamesName2: 'Not Provided',
            flamesResult: 'Not Finished',
            usageFrequency: 0,
            screenTime: 0,
            visitedPages: [],
            latitude: 'N/A',
            longitude: 'N/A',
            currentArea: 'N/A',
            village: 'N/A',
            city: 'N/A',
            district: 'N/A',
            state: 'N/A',
            country: 'N/A',
            postalCode: 'N/A',
            screenSize: 'N/A',
            browser: 'N/A',
            os: 'N/A',
            device: 'N/A',
            epochStart: Date.now(), // மைனஸ் டைம் வராமல் தடுக்க Epoch மில்லிசெகண்ட்ஸ்
            createdAt: timestamp,
            updatedAt: timestamp,
            startTime: timestamp,
            endTime: 'Active Now',
            duration: 'Calculating...',
            chatHistory: [],
            statusFlag: 'In-Progress'
        };
    } else {
        // ஏற்கனவே போட் மூலமா யூசர் வந்திருந்தா, அவங்க யூசர்நேம் 'No Username'னு இருந்தா மட்டும் அப்டேட் செய்யும்
        if (username !== 'No Username' && (trackedUsers[tgId].username === 'No Username' || !trackedUsers[tgId].username)) {
            trackedUsers[tgId].username = username;
        }
    }
}

// 🛠️ 2. டைம்ஸ்டாம்ப் மற்றும் செஷன் டூரேஷனை அப்டேட் செய்யும் ஃபங்க்ஷன்
function updateTimestampsAndDuration(tgId) {
    const session = trackedUsers[tgId];
    if (!session) return;

    const now = new Date();
    session.updatedAt = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    session.endTime = session.updatedAt;

    // துல்லியமான செஷன் டூரேஷன் கணக்கீடு (Epoch மில்லிசெகண்ட்ஸ் வித்தியாசம்)
    const diffSeconds = Math.floor((Date.now() - session.epochStart) / 1000);
    session.screenTime = diffSeconds > 0 ? diffSeconds : 0;
    session.duration = `${session.screenTime} Seconds`;
}

// 🛠️ 3. UserAgent-ஐ பிரித்து போன் மாடல் மற்றும் ஓஎஸ்-ஐக் கண்டறியும் ஃபங்க்ஷன்
function parseUserAgentDetails(ua) {
    let os = "Unknown OS";
    let device = "Unknown Device";
    let browser = "Unknown Browser";

    if (/android/i.test(ua)) {
        os = "Android";
        const match = ua.match(/Android\s+([^\s;]+)/);
        if(match) os += ` ${match[1]}`;
        
        // மொபைல் மாடலைக் கண்டறிதல் (e.g., Vivo, Samsung)
        const deviceMatch = ua.match(/Build\/([^\s;]+)/) || ua.match(/\;\s+([^;)]+)\s+Build/);
        if(deviceMatch) device = deviceMatch[1].trim();
    } else if (/iphone|ipad|ipod/i.test(ua)) {
        os = "iOS";
        device = /iphone/i.test(ua) ? "iPhone" : "iPad";
    } else if (/windows/i.test(ua)) {
        os = "Windows";
        device = "PC / Laptop";
    }

    if (/chrome|crios/i.test(ua) && !/edge|opr/i.test(ua)) {
        const chromeMatch = ua.match(/(?:Chrome|CrMo|CriOS)\/([0-9]+)/);
        browser = chromeMatch ? `Chrome ${chromeMatch[1]}` : "Chrome";
    } else if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
        browser = "Safari";
    } else if (/firefox/i.test(ua)) {
        browser = "Firefox";
    }

    return { os, device, browser };
}

// ==========================================
// 🚀 EXPRESS REST ENDPOINTS (வெப்சைட் ஏபிஐ)
// ==========================================

// 🎯 அட்வான்ஸ்டு GPS மற்றும் மெட்ரிக்ஸ் டிராக்கிங் ரௌட்
app.post('/api/save-metrics', async (req, res) => {
    try {
        const { telegramId, browser, screenSize, latitude, longitude } = req.body;
        if (!telegramId) return res.status(400).send("Missing Telegram ID");

        // செஷனை செக் செய்து உருவாக்குதல்
        initUserSession(telegramId);
        const session = trackedUsers[telegramId];
        
        session.usageFrequency += 1;
        session.screenSize = screenSize || 'N/A';
        
        if (browser) {
            session.browser = browser;
            const parsed = parseUserAgentDetails(browser);
            session.os = parsed.os;
            session.device = parsed.device;
            if (parsed.browser !== "Unknown Browser") session.browser = parsed.browser;
        }

        // 🎯 பயனர் மொபைலில் "Allow" கொடுத்திருந்தால் (True-GPS)
        if (latitude && longitude) {
            session.latitude = latitude;
            session.longitude = longitude;

            console.log(`[GPS Dynamic Catch]: Lat ${latitude}, Lon ${longitude} for User ${telegramId}`);

            try {
                // OpenStreetMap API மூலம் ஏரியாவைக் கண்டறிதல்
                const geoRes = await axios.get(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
                    { 
                        headers: { 'User-Agent': 'RakeshPortfolioAnalytics/2.0' },
                        timeout: 8000 
                    }
                );
                
                if (geoRes.data && geoRes.data.address) {
                    const addr = geoRes.data.address;
                    session.currentArea = addr.road || addr.suburb || "N/A";
                    session.village = addr.village || addr.neighbourhood || addr.suburb || "N/A";
                    session.city = addr.city || addr.town || addr.village || "Unknown City";
                    session.district = addr.district || addr.county || "N/A";
                    session.state = addr.state || "Tamil Nadu";
                    session.country = addr.country || "India";
                    session.postalCode = addr.postcode || "N/A";
                }
            } catch (err) {
                console.log("[Geo-API Error]: Server Limited. Trying Backup Services...");
                // முதல் API பிளாக் ஆனால் மாற்று மேப் சர்வீஸ் ஏபிஐ
                try {
                    const fallbackGeo = await axios.get(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`, { timeout: 5000 });
                    if (fallbackGeo.data) {
                        const fd = fallbackGeo.data;
                        session.currentArea = fd.locality || "N/A";
                        session.city = fd.city || "N/A";
                        session.state = fd.principalSubdivision || "N/A";
                        session.country = fd.countryName || "N/A";
                    }
                } catch (failErr) {
                    console.log("All Geocoding API failed. Saving raw Lat/Lon.");
                }
            }
        } else {
            // 🎯 பயனர் GPS பிளாக் செய்திருந்தால் IP மூலமாக டிராக்கிங்
            console.log(`[IP Request]: User ${telegramId} denied GPS. Extracting Network location...`);
            try {
                const ipRes = await axios.get('https://ipapi.co/json/', { timeout: 4000 });
                if (ipRes.data) {
                    session.city = ipRes.data.city || "N/A";
                    session.district = ipRes.data.region || "N/A";
                    session.state = ipRes.data.region || "N/A";
                    session.country = ipRes.data.country_name || "India";
                    session.postalCode = ipRes.data.postal || "N/A";
                    session.currentArea = "Network IP Tracker";
                }
            } catch (ipErr) {
                console.log("Network IP location failed too.");
            }
        }
        
        updateTimestampsAndDuration(telegramId);
        return res.sendStatus(200);
    } catch (err) {
        console.error("API Metrics Processing Error:", err.message);
        return res.sendStatus(500);
    }
});

// 🎯 பக்கங்களை டிராக்கிங் செய்யும் ரௌட் (/about, /skills)
app.post('/api/track-page', (req, res) => {
    const { telegramId, page } = req.body;
    if (telegramId && trackedUsers[telegramId]) {
        const session = trackedUsers[telegramId];
        if (!session.visitedPages.includes(page)) {
            session.visitedPages.push(page);
        }
        updateTimestampsAndDuration(telegramId);
    }
    return res.sendStatus(200);
});

// 🎯 ஸ்கிரீன் டைம் டிராக்கிங் செய்யும் ரௌட்
app.post('/api/update-screen-time', (req, res) => {
    const { telegramId } = req.body;
    if (telegramId && trackedUsers[telegramId]) {
        updateTimestampsAndDuration(telegramId);
    }
    return res.sendStatus(200);
});

// ==========================================
// 🤖 TELEGRAM BOT LOGIC (டெலிகிராம் போட்)
// ==========================================

// உன்னுடைய .env ஃபைலில் BOT_TOKEN இருக்க வேண்டும்
const bot = new Telegraf(process.env.BOT_TOKEN);
// 🟢 இதை உன்னுடைய server.js கோப்பில் மாற்றிவிட்டு மீண்டும் Render-ல் புஷ் செய்:
bot.start((ctx) => {
    const from = ctx.from;
    const tgId = from.id.toString();
    const username = from.username ? `@${from.username}` : 'No Username';

    initUserSession(tgId, username);
    
    const session = trackedUsers[tgId];
    session.botStage = 'STARTED';
    session.chatHistory.push({ time: new Date().toLocaleTimeString(), sender: 'USER', text: '/start' });

    ctx.reply(`வணக்கம் ${from.first_name || 'நண்பா'}! 🚀 Rakesh-ன் Portfolio WebApp-ற்கு உங்களை வரவேற்கிறோம்.`, {
        reply_markup: {
            inline_keyboard: [
                // 🔥 பிக்ஸ்: சரியான நெட்லிஃபை டொமைன் லிங்க்கை இங்கு கொடுத்துள்ளேன்
                [{ text: "🌐 Open Portfolio WebApp", web_app: { url: `https://rakesh-akm-portfolio.netlify.app/?tgId=${tgId}` } }]
            ]
        }
    });
});

// ஏதேனும் மெசேஜ் அனுப்பினால் அதை ஹிஸ்டரியில் வைப்பது
bot.on('text', (ctx) => {
    const tgId = ctx.from.id.toString();
    if (trackedUsers[tgId]) {
        trackedUsers[tgId].chatHistory.push({
            time: new Date().toLocaleTimeString(),
            sender: 'USER',
            text: ctx.message.text
        });
    }
    ctx.reply("போர்ட்ஃபோலியோவை முழுமையாகப் பார்க்க மேலே உள்ள 'Open Portfolio' பட்டனை கிளிக் செய்யவும்!");
});

// ==========================================
// 🚀 SERVER INITIATION (சர்வர் துவக்கம்)
// ==========================================

app.get('/', (req, res) => {
    res.send({ status: "⚡ System Running Smoothly", totalActiveSessions: Object.keys(trackedUsers).length });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`[Express Server]: Active on port ${PORT}`);
    
    // டெலிகிராம் பாட்டை லான்ச் செய்வது
    bot.launch()
        .then(() => console.log('[Telegram Bot]: Listening for live users...'))
        .catch((err) => console.error('Bot launch failed:', err.message));
});

// போட் கிராஷ் ஆகாமல் இருக்க சேஃப்டி கேட்ச்
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));