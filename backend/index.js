const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const { Resend } = require('resend'); 
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const cron = require('node-cron');
const cors = require('cors');
const dns = require('dns');
const axios = require('axios');
require('dotenv').config();

dns.setServers(['8.8.8.8', '8.8.4.4']);

const app = express();
app.use(cors());
app.use(express.json());

const bot = new Telegraf(process.env.BOT_TOKEN);
const resend = new Resend(process.env.RESEND_API_KEY);

const trackedUsers = {};  
const sessionTimers = {}; 

const textTemplates = {
    EN: {
        welcome: "Hello! Welcome to Rakesh Daniel's Assistant Bot. 🧑‍💻\n\nWhat is your name?",
        ask_email: "Please enter your Email Address: 📧",
        ask_dob: "Please enter your Birthday 📅\nFormat: DD-MM-YYYY (Example: 15-08-2001)",
        ask_interest: (name) => `Nice to meet you ${name}! What would you like to know about Rakesh? Choose an option:`,
        about: "🧑‍💻 *Rakesh Daniel - Full-Stack Developer*\n\n" +
               "📍 *Location:* Tirunelveli, Tamil Nadu - 627654\n" +
               "📧 *Email:* rakeshdaniel321@gmail.com\n" +
               "📱 *Mobile:* +91 63797 69075\n\n" +
               "🎓 *Education:* Bachelor of Computer Applications (BCA) [2023 - 2026] from Sri Sankara Bhagavathi Arts And Science College, Thoothukudi (Manonmaniam Sundaranar University).\n\n" +
               "✨ *Summary:* Motivated Fresher specializing in building scalable web applications using the MERN Stack & Next.js. Tech enthusiast dedicated to clean code and optimized backend architecture.",
        projects: "🚀 *Rakesh's Top Projects:*\n\n" +
                  "1️⃣ *Secure & Scalable Login System (Backend)*\n" +
                  "• Built with Node.js & Express.js using Token Bucket Algorithm for API Rate Limiting.\n" +
                  "• Managed heavy background jobs using Redis & BullMQ distributed queues.\n" +
                  "• Features HTTP-Only cookie Refresh Tokens with token rotation & OWASP security shielding.\n\n" +
                  "2️⃣ *Hotel Booking Management (MERN)*\n" +
                  "• Complete full-stack room booking workflow with real-time availability and responsive React UI.\n" +
                  "• Live: https://hotel-booking-management-navy.vercel.app\n\n" +
                  "3️⃣ *Mobile Shop E-Commerce (Next.js)*\n" +
                  "• Built using Next.js & MongoDB with Real-time Filtering & Search optimization.",
        resume: "📄 *Skills & Expertise:*\n\n" +
                "💻 *Languages:* JavaScript (ES6+)\n" +
                "🌐 *Frontend:* HTML5, CSS3, React.js, Next.js\n" +
                "⚙️ *Backend:* Node.js, Express.js, REST APIs, Redis, BullMQ, Telegraf API\n" +
                "🗄️ *Databases:* MongoDB, MySQL\n" +
                "🛠️ *Tools:* Git, GitHub, Postman, Vercel, Render\n\n" +
                "🏅 *Certification:* 30-Day Intensive FSD Master Class Certificate from NoviTech R&D Pvt Ltd.",
        ask_from: "Where are you from? (Enter your city/town)",
        ask_flames: "Awesome! Shall we play a fun FLAMES game? 🥳",
        flames_n1: "Great! Enter YOUR name:",
        flames_n2: "Enter your PARTNER's name:",
        flames_res: (res) => `🥳 Your FLAMES Result: *${res}*\n\nThank you for visiting Rakesh's bot!`,
        bye: "Thank you for visiting! Your details have been shared with Rakesh."
    },
    TA: {
        welcome: "வணக்கம்! ராகேஷ் டேனியலின் அசிஸ்டண்ட் போட்டிற்கு உங்களை வரவேற்கிறோம். 🧑‍💻\n\nஉங்க பெயர் என்ன?",
        ask_email: "தயவுசெய்து உங்கள் ஈமெயில் முகவரியை டைப் செய்யவும்: 📧",
        ask_dob: "தயவுசெய்து உங்கள் பிறந்தநாளை உள்ளிடவும் 📅\nFormat: DD-MM-YYYY (உதாரணம்: 15-08-2001)",
        ask_interest: (name) => `மகிழ்ச்சி ${name}! உங்களுக்கு ராகேஷ் பற்றி என்ன விபரம் தெரிய வேண்டும்?`,
        about: "🧑‍💻 *ராகேஷ் டேனியல் - ஃபல்-ஸ்டாக் டெவலப்பர்*\n\n" +
               "📍 *ஊர்:* திருநெல்வேலி, தமிழ்நாடு - 627654\n" +
               "📧 *ஈமெயில்:* rakeshdaniel321@gmail.com\n" +
               "📱 *மொபைல்:* +91 63797 69075\n\n" +
               "🎓 *படிப்பு:* மனோன்மணியம் சுந்தரனார் பல்கலைக்கழகத்தின் (MSU) கீழ் உள்ள ஸ்ரீ சங்கர பகவதி கலை மற்றும் அறிவியல் கல்லூரியில் BCA (2023-2026) பயின்று வருகிறார்.\n" +
               "✨ *சுருக்கம்:* MERN ஸ்டாக் மற்றும் Next.js மூலம் சிறந்த இணையதளங்களை உருவாக்குவதில் வல்லவர்.",
        projects: "🚀 *முக்கிய பிராஜெக்ட்கள்:*\n\n" +
                  "1️⃣ *பாதுகாப்பான லாகின் சிஸ்டம் (Backend)*\n" +
                  "• Node.js, Express, Redis மற்றும் BullMQ Rate Limiting கொண்டு உருவாக்கப்பட்டது.\n\n" +
                  "2️⃣ *ஹோட்டல் புக்கிங் மேனேஜ்மென்ட் (MERN)*\n" +
                  "• பயனர்கள் எளிதாக அறைகளை புக் செய்யும் வசதி கொண்ட தளம்.\n" +
                  "• லிங்க்: https://hotel-booking-management-navy.vercel.app\n\n" +
                  "3️⃣ *மொபைல் ஷாப் இ-காமர்ஸ் (Next.js)*\n" +
                  "• Next.js & MongoDB கொண்டு உருவாக்கப்பட்ட அதிவேக தேடல் வசதி கொண்ட தளம்.",
        resume: "📄 *தொழில்நுட்ப திறன்கள்:*\n\n" +
                "💻 *மொழிகள்:* JavaScript (ES6+)\n" +
                "🌐 *ஃபிரண்ட்-எண்ட்:* HTML5, CSS3, React.js, Next.js\n" +
                "⚙️ *பேக்-எண்ட்:* Node.js, Express.js, REST APIs, Redis, BullMQ, Telegraf API\n" +
                "🗄️ *டேட்டாபேஸ்:* MongoDB, MySQL\n" +
                "🛠️ *டூல்ஸ்:* Git, GitHub, Postman, Vercel, Render\n\n" +
                "🏅 *சான்றிதழ்:* NoviTech நிறுவனத்திடம் இருந்து 30 நாட்கள் முழுமையான FSD மாஸ்டர்கிளாஸ் சான்றிதழ் பெற்றுள்ளார்.",
        ask_from: "நீங்கள் எந்த ஊரில் இருந்து மெசேஜ் செய்கிறீர்கள்? (ஊரின் பெயரை டைப் செய்யவும்)",
        ask_flames: "அருமை! நாம் இப்போது ஒரு ஜாலியான FLAMES விளையாட்டு விளையாடலாமா? 🥳",
        flames_n1: "சூப்பர்! முதலில் உங்களுடைய பெயரை டைப் செய்யுங்கள்:",
        flames_n2: "இப்போது உங்களுடைய பார்ட்னர் (Partner) பெயரை டைப் செய்யுங்கள்:",
        flames_res: (res) => `🥳 உங்களுடைய FLAMES ரிசல்ட்: *${res}*\n\nராகேஷின் போட்டை பயன்படுத்தியதற்கு மிக்க நன்றி!`,
        bye: "விபரங்களைப் பார்த்ததற்கு நன்றி! உங்களுடைய தகவல்கள் ராகேஷிற்கு அனுப்பப்பட்டது."
    },
    TG: {
        welcome: "Vanakkam! Rakesh Daniel-oda Assistant Bot-uku welcome. 🧑‍💻\n\nUnga peru enna?",
        ask_email: "Unga Email Address-a type pannunga: 📧",
        ask_dob: "Unga Birthday-a enter pannunga 📅\nFormat: DD-MM-YYYY (Example: 15-08-2001)",
        ask_interest: (name) => `Magizhchi ${name}! Ungaluku Rakesh pathi enna theriyanum?`,
        about: "🧑‍💻 *Rakesh Daniel - MERN Stack Developer*\n\n" +
               "📍 *Oor:* Tirunelveli, Tamil Nadu - 627654\n" +
               "📧 *Email:* rakeshdaniel321@gmail.com\n" +
               "📱 *Mobile:* +91 63797 69075\n\n" +
               "🎓 *Education:* BCA (2023-2026) Sri Sankara Bhagavathi College, Thoothukudi (MS University).\n" +
               "✨ *Summary:* Clean code & scalable backend design-la specialized-ana MERN stack fresher developer.",
        projects: "🚀 *Important Projects:*\n\n" +
                  "1️⃣ *Secure User Login System (Backend)*\n" +
                  "• Node.js, Express, Redis & BullMQ backend hardening.\n\n" +
                  "2️⃣ *Hotel Booking System (Full-Stack)*\n" +
                  "• Clean React UI room booking site.\n" +
                  "• Link: https://hotel-booking-management-navy.vercel.app\n\n" +
                  "3️⃣ *Mobile Shop Platform (Next.js)*\n" +
                  "• Advanced filter optimization and MongoDB backend setup.",
        resume: "📄 *Resume & Tech Skills:*\n\n" +
                "💻 *Languages:* JavaScript (ES6+)\n" +
                "🌐 *Frontend:* HTML5, CSS3, React.js, Next.js\n" +
                "⚙️ *Backend:* Node.js, Express.js, Redis, BullMQ, Telegraf\n" +
                "🗄️ *Databases:* MongoDB, MySQL\n" +
                "🛠️ *Tools:* Git, GitHub, Vercel, Render\n\n" +
                "🏅 *Certificate:* 30-Days Intensive FSD Training from NoviTech R&D.",
        ask_from: "Neenga endha oorla irundhu pesreenga? (Oor pera type pannunga)",
        ask_flames: "Super! Ippo nama oru jolly-ana FLAMES game vilayadlama? 🥳",
        flames_n1: "Sema! First UNGA pera type pannunga:",
        flames_n2: "Ippo unga PARTNER pera type pannunga:",
        flames_res: (res) => `🥳 Ungaloda FLAMES Result: *${res}*\n\nRakesh bot-a use pannadhuku romba thanks!`,
        bye: "Thanks for visiting! Unga details Rakesh-uku send panniyachu."
    }
};

function initUserSession(tgId, username = 'N/A') {
    if (!trackedUsers[tgId]) {
        const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
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
            createdAt: timestamp,
            updatedAt: timestamp,
            startTime: timestamp,
            endTime: 'Active Now',
            duration: 'Calculating...',
            chatHistory: [],
            statusFlag: 'In-Progress'
        };
    }
}

function updateTimestampsAndDuration(tgId) {
    const session = trackedUsers[tgId];
    if (session) {
        const now = new Date();
        session.updatedAt = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        
        const startDiff = new Date(session.createdAt);
        const durationSec = Math.floor((now - startDiff) / 1000);
        session.duration = `${durationSec} Seconds`;
    }
}

function calculateFlames(name1, name2) {
    let n1 = name1.toLowerCase().replace(/\s+/g, '').split('');
    let n2 = name2.toLowerCase().replace(/\s+/g, '').split('');
    for (let i = 0; i < n1.length; i++) {
        let index = n2.indexOf(n1[i]);
        if (index !== -1) {
            n1.splice(i, 1);
            n2.splice(index, 1);
            i--;
        }
    }
    let count = n1.length + n2.length;
    if (count === 0) return "Friendship";
    let flames = ['F', 'L', 'A', 'M', 'E', 'S'];
    let currIdx = 0;
    while (flames.length > 1) {
        currIdx = (currIdx + count - 1) % flames.length;
        flames.splice(currIdx, 1);
    }
    const resultMap = {
        'F': 'Friends', 'L': 'Love', 'A': 'Affection',
        'M': 'Marriage', 'E': 'Enemies', 'S': 'Siblings'
    };
    return resultMap[flames[0]];
}

async function sendInstantUserPDF(tgId, triggerReason) {
    try {
        const u = trackedUsers[tgId];
        if (!u) return;

        u.endTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        u.statusFlag = triggerReason.includes('DROPPED') ? 'Dropped' : 'Completed';

        console.log(`[Instant Mail]: Generating Advanced PDF for ${tgId}`);
        const pdfDoc = new PDFDocument({ margin: 30 });
        let pdfBuffers = [];
        pdfDoc.on('data', chunk => pdfBuffers.push(chunk));

        pdfDoc.fontSize(22).fillColor('#1E3A8A').text('RAKESH DANIEL PORTFOLIO LOGS', { align: 'center', underline: true });
        pdfDoc.fontSize(10).fillColor('#555555').text(`Session Status: ${u.statusFlag.toUpperCase()} | Reason: ${triggerReason}\n`, { align: 'center' });
        pdfDoc.moveDown();

        const printSection = (title, dataObject) => {
            pdfDoc.fontSize(14).fillColor('#0284C7').text(`■ ${title}`, { underline: false });
            pdfDoc.moveTo(30, pdfDoc.y).lineTo(570, pdfDoc.y).strokeColor('#CBD5E1').stroke();
            pdfDoc.moveDown(0.3);
            pdfDoc.fontSize(10).fillColor('#334155');
            
            for (const [key, value] of Object.entries(dataObject)) {
                pdfDoc.text(`   • ${key}: ${value}`);
            }
            pdfDoc.moveDown();
        };

        printSection('User Identity & Timeline', {
            'Telegram ID': u.telegramId,
            'Username': u.username,
            'Created At': u.createdAt,
            'Updated At': u.updatedAt,
            'Start Time': u.startTime,
            'End Time': u.endTime,
            'Session Duration': u.duration,
            'Current Stage': u.botStage
        });

        printSection('User Form Details & FLAMES', {
            'Given Name': u.botName,
            'Email Address': u.botEmail,
            'Date of Birth': u.botDOB,
            'Calculated Age': u.botAge,
            'Typed Location (Native)': u.botFrom,
            'FLAMES Your Name': u.flamesName1,
            'FLAMES Partner Name': u.flamesName2,
            'FLAMES Result': u.flamesResult
        });

        printSection('Advanced GPS Geolocation Data', {
            'Latitude': u.latitude,
            'Longitude': u.longitude,
            'Current Area': u.currentArea,
            'Village / Suburb': u.village,
            'City': u.city,
            'District': u.district,
            'State': u.state,
            'Country': u.country,
            'Postal Code': u.postalCode
        });

        printSection('Device & Web Application Metrics', {
            'Browser Name': u.browser,
            'Operating System': u.os,
            'Device Model': u.device,
            'Screen Resolution': u.screenSize,
            'Usage Frequency': `${u.usageFrequency} Hits`,
            'Total Web Screen Time': `${u.screenTime} Seconds`,
            'Visited Web Pages': u.visitedPages.length > 0 ? u.visitedPages.join(' -> ') : 'None'
        });

        pdfDoc.fontSize(14).fillColor('#0284C7').text(`■ Step-by-Step Chat Conversation History`);
        pdfDoc.moveTo(30, pdfDoc.y).lineTo(570, pdfDoc.y).strokeColor('#CBD5E1').stroke();
        pdfDoc.moveDown(0.3);
        pdfDoc.fontSize(10).fillColor('#475569');
        if(u.chatHistory.length > 0) {
            u.chatHistory.forEach((log) => {
                pdfDoc.text(`   [${log.time}] ${log.role.toUpperCase()}: ${log.text}`);
            });
        } else {
            pdfDoc.text('   No text interaction recorded.');
        }

        pdfDoc.end();

        const pdfBuffer = await new Promise((resolve) => {
            pdfDoc.on('end', () => resolve(Buffer.concat(pdfBuffers)));
        });

        await resend.emails.send({
            from: 'Rakesh Portfolio Tracker <onboarding@resend.dev>',
            to: ['rakeshdaniel321@gmail.com'],
            subject: `🚨 [${u.statusFlag}] Session Report - ID: ${tgId} (${u.botName})`,
            html: `<h3>Detailed Analytics Attached</h3><p>User <b>${u.botName}</b> (${tgId}) session status is <b>${u.statusFlag}</b>.</p>`,
            attachments: [
                {
                    filename: `${u.statusFlag}_Report_${tgId}.pdf`,
                    content: pdfBuffer.toString('base64'),
                    contentType: 'application/pdf'
                }
            ]
        });
        console.log(`[Email Alert Sent]: Successfully for user ${tgId}`);
    } catch (err) {
        console.error('[Email Dispatch Error]:', err.message);
    }
}

function handleUserActivityTimeout(tgId) {
    if (sessionTimers[tgId]) clearTimeout(sessionTimers[tgId]);

    sessionTimers[tgId] = setTimeout(() => {
        const u = trackedUsers[tgId];
        if (u && u.botStage !== 'ALL_DONE' && u.botStage !== 'COMPLETED_NO_FLAMES' && !u.botStage.includes('DROPPED_OUT')) {
            u.botStage = `${u.botStage}_(DROPPED_OUT)`;
            updateTimestampsAndDuration(tgId);
            sendInstantUserPDF(tgId, 'USER_DROPPED_OUT_INACTIVE');
        }
    }, 4 * 60 * 1000); 
}

function parseUserAgentDetails(userAgentStr) {
    let os = "Unknown OS";
    let device = "Generic Device";
    let browser = "Unknown Browser";

    if (!userAgentStr || userAgentStr === 'N/A') return { os, device, browser };

    const ua = userAgentStr;
    if (ua.includes("Android")) {
        os = "Android";
        const match = ua.match(/Android\s([0-9\.]+)/);
        if (match) os = `Android ${match[1]}`;
    } else if (ua.includes("Windows NT")) {
        os = "Windows";
    } else if (ua.includes("iPhone") || ua.includes("iPad")) {
        os = "iOS";
    }

    if (ua.includes("Vivo") || ua.includes("V23") || ua.includes("V30")) device = "Vivo V30";
    else if (ua.includes("Samsung")) device = "Samsung Galaxy";
    else if (ua.includes("iPhone")) device = "iPhone";
    else if (ua.includes("Windows")) device = "PC / Laptop";

    if (ua.includes("Chrome")) {
        const match = ua.match(/Chrome\/([0-9]+)/);
        browser = match ? `Chrome ${match[1]}` : "Chrome";
    } else if (ua.includes("Safari")) {
        browser = "Safari";
    } else if (ua.includes("Firefox")) {
        browser = "Firefox";
    }

    return { os, device, browser };
}

app.post('/api/save-metrics', async (req, res) => {
    try {
        const { telegramId, browser, screenSize, latitude, longitude } = req.body;
        if(!telegramId) return res.status(400).send("Missing ID");

        initUserSession(telegramId);
        const session = trackedUsers[telegramId];
        
        session.usageFrequency += 1;
        session.screenSize = screenSize || '1080x2400';
        
        if (browser) {
            session.browser = browser;
            const parsed = parseUserAgentDetails(browser);
            session.os = parsed.os;
            session.device = parsed.device;
            if(parsed.browser !== "Unknown Browser") session.browser = parsed.browser;
        }

        if (latitude && longitude) {
            session.latitude = latitude;
            session.longitude = longitude;

            try {
                const geoRes = await axios.get(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
                    { headers: { 'User-Agent': 'RakeshPortfolioAnalytics/1.0' } }
                );
                const addr = geoRes.data.address;
                session.currentArea = addr.road || "Anna Salai";
                session.village = addr.suburb || "Palayamkottai";
                session.city = addr.city || "Tirunelveli";
                session.district = addr.district || addr.county || "Tirunelveli";
                session.state = addr.state || "Tamil Nadu";
                session.country = addr.country || "India";
                session.postalCode = addr.postcode || "627005";
            } catch (err) {
                try {
                    const fallbackGeo = await axios.get(
                        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
                    );
                    const fd = fallbackGeo.data;
                    session.currentArea = fd.locality || "N/A";
                    session.city = fd.city || "N/A";
                    session.state = fd.principalSubdivision || "N/A";
                    session.country = fd.countryName || "N/A";
                    session.postalCode = fd.postcode || "N/A";
                } catch (failErr) {
                    console.log("Both Geo-APIs Failed.");
                }
            }
        }
        
        updateTimestampsAndDuration(telegramId);
        return res.sendStatus(200);
    } catch(err) {
        console.error("API Metrics Processing Error:", err.message);
        return res.sendStatus(500);
    }
});

app.post('/api/update-screen-time', (req, res) => {
    try {
        const { telegramId, screenTime } = req.body;
        if(!telegramId) return res.status(400).send("Missing ID");
        initUserSession(telegramId);
        trackedUsers[telegramId].screenTime += Number(screenTime || 0);
        updateTimestampsAndDuration(telegramId);
        return res.sendStatus(200);
    } catch(err) {
        return res.sendStatus(500);
    }
});

app.post('/api/track-page', (req, res) => {
    try {
        const { telegramId, page } = req.body;
        if(!telegramId) return res.status(400).send("Missing ID");
        initUserSession(telegramId);
        if (page && !trackedUsers[telegramId].visitedPages.includes(page)) {
            trackedUsers[telegramId].visitedPages.push(page);
        }
        updateTimestampsAndDuration(telegramId);
        return res.sendStatus(200);
    } catch(err) {
        return res.sendStatus(500);
    }
});

bot.start((ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.username ? `@${ctx.from.username}` : 'No Username';
    
    initUserSession(userId, username);
    const session = trackedUsers[userId];
    session.botStage = 'CHOOSE_LANG';
    session.chatHistory.push({ time: new Date().toLocaleTimeString(), role: 'user', text: '/start' });
    
    handleUserActivityTimeout(userId);
    updateTimestampsAndDuration(userId);

    const portfolioUrl = `https://rakesh-akm-portfolio.netlify.app/?tgId=${userId}`;

    ctx.reply(
        `வணக்கம் ${ctx.from.first_name || 'நண்பா'}! உங்கள் மொழியைத் தேர்ந்தெடுக்கவும் / Choose language:`,
        Markup.inlineKeyboard([
            [Markup.button.webApp('🌐 Open Portfolio Website', portfolioUrl)],
            [Markup.button.callback('English 🇬🇧', 'LANG_EN')],
            [Markup.button.callback('தமிழ் 🇮🇳', 'LANG_TA')],
            [Markup.button.callback('Tanglish ✍', 'LANG_TG')]
        ])
    ).catch(err => console.error("Bot Reply Error:", err.message));
});

bot.action(/LANG_(EN|TA|TG)/, (ctx) => {
    const userId = ctx.from.id;
    const lang = ctx.match[1];
    initUserSession(userId);
    
    const session = trackedUsers[userId];
    session.lang = lang;
    session.botStage = 'ASK_NAME';
    session.chatHistory.push({ time: new Date().toLocaleTimeString(), role: 'bot', text: `Selected Language: ${lang}. Prompted for name.` });
    
    handleUserActivityTimeout(userId);
    updateTimestampsAndDuration(userId);
    ctx.answerCbQuery().catch(() => {});
    ctx.reply(textTemplates[lang].welcome).catch(() => {});
});

bot.action(/INT_(ABOUT|PROJECTS|RESUME)/, (ctx) => {
    const userId = ctx.from.id;
    const actionType = ctx.match[1];
    const session = trackedUsers[userId];
    if (!session) return ctx.reply("Please /start again.");
    const lang = session.lang;

    session.chatHistory.push({ time: new Date().toLocaleTimeString(), role: 'user', text: `Selected Menu Option: ${actionType}` });

    if (actionType === 'ABOUT') ctx.replyWithMarkdown(textTemplates[lang].about).catch(() => {});
    if (actionType === 'PROJECTS') ctx.replyWithMarkdown(textTemplates[lang].projects).catch(() => {});
    if (actionType === 'RESUME') ctx.replyWithMarkdown(textTemplates[lang].resume).catch(() => {});

    session.botStage = 'ASK_FROM';
    handleUserActivityTimeout(userId);
    updateTimestampsAndDuration(userId);
    
    setTimeout(() => { ctx.reply(textTemplates[lang].ask_from).catch(() => {}); }, 1000);
    ctx.answerCbQuery().catch(() => {});
});

bot.action(/FLAMES_(YES|NO)/, (ctx) => {
    const userId = ctx.from.id;
    const choice = ctx.match[1];
    const session = trackedUsers[userId];
    if (!session) return ctx.reply("Please /start again.");
    const lang = session.lang;

    session.chatHistory.push({ time: new Date().toLocaleTimeString(), role: 'user', text: `Flames Decision Choice: ${choice}` });

    if (choice === 'YES') {
        session.botStage = 'FLAMES_NAME1';
        handleUserActivityTimeout(userId);
        updateTimestampsAndDuration(userId);
        ctx.reply(textTemplates[lang].flames_n1).catch(() => {});
    } else {
        ctx.reply(textTemplates[lang].bye).catch(() => {});
        session.botStage = 'COMPLETED_NO_FLAMES';
        if (sessionTimers[userId]) clearTimeout(sessionTimers[userId]);
        updateTimestampsAndDuration(userId);
        sendInstantUserPDF(userId, 'FLAMES_DECLINED_COMPLETED');
    }
    ctx.answerCbQuery().catch(() => {});
});

bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text.trim();
    const session = trackedUsers[userId];
    if (!session) return ctx.reply("Kindly type /start to begin.");
    const lang = session.lang;

    session.chatHistory.push({ time: new Date().toLocaleTimeString(), role: 'user', text: text });
    handleUserActivityTimeout(userId);

    // 1. ASK NAME STAGE
    if (session.botStage === 'ASK_NAME') {
        session.botName = text;
        session.botStage = 'ASK_EMAIL';
        updateTimestampsAndDuration(userId);
        return ctx.reply(textTemplates[lang].ask_email);
    }

    // 2. ASK EMAIL STAGE
    if (session.botStage === 'ASK_EMAIL') {
        session.botEmail = text;
        session.botStage = 'ASK_DOB';
        updateTimestampsAndDuration(userId);
        return ctx.reply(textTemplates[lang].ask_dob);
    }

    // 3. ASK DOB STAGE (With Full Validation & Auto Age Calculation)
    if (session.botStage === 'ASK_DOB') {
        const dobRegex = /^([0-2][0-9]|3[0-1])-(0[1-9]|1[0-2])-\d{4}$/;
        
        if (!dobRegex.test(text)) {
            return ctx.reply("❌ Invalid Format! Please enter in DD-MM-YYYY format. (Example: 15-08-2001) 📅");
        }
        
        const [day, month, year] = text.split('-').map(Number);
        const parsedDate = new Date(year, month - 1, day);
        const isValid = parsedDate.getFullYear() === year && (parsedDate.getMonth() + 1) === month && parsedDate.getDate() === day;
        
        if (!isValid) {
            return ctx.reply("❌ That date doesn't exist in the calendar! Please enter a valid date.");
        }
        
        const today = new Date();
        let age = today.getFullYear() - year;
        const monthDiff = today.getMonth() - (month - 1);
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
            age--; 
        }
        
        if (parsedDate > today) {
            return ctx.reply("❌ Future date not allowed! Please enter your real birthday.");
        }
        
        if (age < 5 || age > 100) {
            return ctx.reply(`❌ Invalid Birthday! Your calculated age is ${age}. Please enter a valid year.`);
        }
        
        session.botDOB = text; 
        session.botAge = age; // Auto-calculated age saved here
        session.botStage = 'CHOOSING_INTEREST';
        updateTimestampsAndDuration(userId);
        
        return ctx.reply(textTemplates[lang].ask_interest(session.botName), Markup.inlineKeyboard([
            [Markup.button.callback('About Rakesh 🧑‍💻', 'INT_ABOUT')],
            [Markup.button.callback('Projects 🚀', 'INT_PROJECTS')],
            [Markup.button.callback('Resume 📄', 'INT_RESUME')]
        ]));
    }

    // 4. ASK FROM STAGE
    if (session.botStage === 'ASK_FROM') {
        session.botFrom = text;
        session.botStage = 'FLAMES_DECISION';
        updateTimestampsAndDuration(userId);
        return ctx.reply(textTemplates[lang].ask_flames, Markup.inlineKeyboard([
            [Markup.button.callback('Yes 👍', 'FLAMES_YES')],
            [Markup.button.callback('No 👎', 'FLAMES_NO')]
        ]));
    }

    // 5. FLAMES NAME 1 STAGE
    if (session.botStage === 'FLAMES_NAME1') {
        session.flamesName1 = text; 
        session.botStage = 'FLAMES_NAME2';
        updateTimestampsAndDuration(userId);
        return ctx.reply(textTemplates[lang].flames_n2);
    }

    // 6. FLAMES NAME 2 STAGE
    if (session.botStage === 'FLAMES_NAME2') {
        session.flamesName2 = text;
        const result = calculateFlames(session.flamesName1, session.flamesName2);
        session.flamesResult = result;
        session.botStage = 'ALL_DONE';
        
        if (sessionTimers[userId]) clearTimeout(sessionTimers[userId]);
        updateTimestampsAndDuration(userId);
        
        await ctx.replyWithMarkdown(textTemplates[lang].flames_res(result)).catch(() => {});
        sendInstantUserPDF(userId, 'FLAMES_GAME_FULLY_COMPLETED');
        return;
    }
});

async function generateAndSend5HourBackup() {
    try {
        console.log('[Cron Backup]: Preparing Report...');
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-IN').replace(/\//g, '-');

        if (Object.keys(trackedUsers).length === 0) return;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Master Logs');

        worksheet.columns = [
            { header: 'Telegram ID', key: 'tgId', width: 15 },
            { header: 'Stage', key: 'stage', width: 18 },
            { header: 'Name', key: 'bName', width: 15 },
            { header: 'Email', key: 'bEmail', width: 20 },
            { header: 'DOB', key: 'bDob', width: 15 },
            { header: 'Age', key: 'bAge', width: 10 },
            { header: 'City', key: 'bFrom', width: 15 },
            { header: 'FLAMES Result', key: 'flRes', width: 15 },
            { header: 'City (GPS)', key: 'city', width: 15 },
            { header: 'Postal Code', key: 'zip', width: 12 },
            { header: 'Screen Time (s)', key: 'screenTime', width: 15 },
            { header: 'OS', key: 'os', width: 15 },
            { header: 'Device', key: 'device', width: 15 },
            { header: 'Status', key: 'statusFlag', width: 12 }
        ];

        for (const id in trackedUsers) {
            const u = trackedUsers[id];
            worksheet.addRow({
                tgId: u.telegramId,
                stage: u.botStage,
                bName: u.botName,
                bEmail: u.botEmail,
                bDob: u.botDOB,
                bAge: u.botAge,
                bFrom: u.botFrom,
                flRes: u.flamesResult,
                city: u.city,
                zip: u.postalCode,
                screenTime: u.screenTime,
                os: u.os,
                device: u.device,
                statusFlag: u.statusFlag
            });
        }
        worksheet.getRow(1).font = { bold: true };
        const excelBuffer = await workbook.xlsx.writeBuffer();

        await resend.emails.send({
            from: 'Rakesh Master Backup <onboarding@resend.dev>',
            to: ['rakeshdaniel321@gmail.com'],
            subject: `📊 Automated 5-Hour Master Excel Log - ${dateStr}`,
            html: `<p>Hi Rakesh, attached is the comprehensive Excel datasheet.</p>`,
            attachments: [
                {
                    filename: `Master_User_Report_${dateStr}.xlsx`,
                    content: excelBuffer.toString('base64'),
                    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                }
            ]
        });
    } catch (err) {
        console.error('[Cron Job Error]:', err.message);
    }
}

cron.schedule('0 */5 * * *', () => {
    generateAndSend5HourBackup();
});

setInterval(() => {
    axios.get('https://rakeshakmbot.onrender.com').catch(() => console.log('Keep-alive'));
}, 10 * 60 * 1000);

app.get('/', (req, res) => { res.send('System Live with Advanced Geo and History PDF Logging! ⚡'); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server connected on port ${PORT}`);
    bot.launch();
});