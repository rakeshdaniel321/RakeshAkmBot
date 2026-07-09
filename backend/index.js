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

// Render DNS அமைப்புகள்
dns.setServers(['8.8.8.8', '8.8.4.4']);

const app = express();
app.use(cors());
app.use(express.json());

const bot = new Telegraf(process.env.BOT_TOKEN);
const resend = new Resend(process.env.RESEND_API_KEY);

// 🗄️ டேட்டா ஸ்டோரேஜ் மேனேஜ்மென்ட்
const trackedUsers = {};  // வெப்சைட் அனலிட்டிக்ஸ் டேட்டா
const userSessions = {};  // பாட் உரையாடல் செஷன்கள்

// 3 மொழிகளுக்கான மெசேஜ் டெம்ப்ளேட்ஸ்
const textTemplates = {
    EN: {
        welcome: "Hello! Welcome to Rakesh Daniel's Assistant Bot. 🧑‍💻\n\nWhat is your name?",
        ask_email: "Please enter your Email Address: 📧",
        ask_age: "How old are you? (Enter your Age): 🔢",
        ask_interest: (name) => `Nice to meet you ${name}! What would you like to know about Rakesh? Choose an option:`,
        about: "🧑‍💻 *Rakesh Daniel*\n*Role:* Full-Stack Web Developer (MERN & Next.js)\n*Summary:* Motivated fresher dedicated to writing clean, efficient code and optimizing backend architecture.\n*Location:* Tirunelveli, Tamil Nadu\n*Portfolio:* https://rakesh-akm-portfolio.netlify.app",
        projects: "🚀 *Top Projects:* \n\n1️⃣ *Secure User Login System (Backend)*\n- Rate Limiting via Token Bucket Algorithm, Redis, BullMQ.\n- JWT tokens with rotation, HTTP-Only cookies.\n\n2️⃣ *Hotel Booking System (MERN)*\n- Live: https://hotel-booking-management-navy.vercel.app \n\n3️⃣ *Mobile Shop E-Commerce (Next.js)*\n- Real-time filtering, optimized MongoDB queries.",
        resume: "📄 *Resume Details:*\n- *Education:* BCA (2023-2026), MS University.\n- *Skills:* JavaScript, React.js, Node.js, Express.js, MongoDB, MySQL, Redis.\n- *Certification:* FSD Master Class (NoviTech).\n- *Contact:* +91 6379769075 | rakeshdaniel321@gmail.com",
        ask_from: "Where are you from? (Enter your city)",
        ask_flames: "Awesome! Shall we play a fun FLAMES game? 🥳",
        flames_n1: "Great! Enter YOUR name:",
        flames_n2: "Enter your PARTNER's name:",
        flames_res: (res) => `🥳 Your FLAMES Result: *${res}*\n\nThank you for visiting Rakesh's bot! He will contact you soon.`,
        bye: "Thank you for visiting! Your details have been shared with Rakesh."
    },
    TA: {
        welcome: "வணக்கம்! ராகேஷ் டேனியலின் அசிஸ்டண்ட் போட்டிற்கு உங்களை வரவேற்கிறோம். 🧑‍💻\n\nஉங்க பெயர் என்ன?",
        ask_email: "தயவுசெய்து உங்கள் ஈமெயில் முகவரியை டைப் செய்யவும்: 📧",
        ask_age: "உங்களுக்கு என்ன வயது ஆகிறது? (வயதை டைப் செய்யவும்): 🔢",
        ask_interest: (name) => `மகிழ்ச்சி ${name}! உங்களுக்கு ராகேஷ் பற்றி என்ன விபரம் தெரிய வேண்டும்? ஒரு ஆப்ஷனை தேர்ந்தெடுக்கவும்:`,
        about: "🧑‍💻 *ராகேஷ் டேனியல்*\n*வேலை:* Full-Stack Web Developer (MERN & Next.js)\n*சுருக்கம்:* தூய்மையான கோடிங் மற்றும் சிறந்த பேக்-எண்ட் ஆர்கிடெக்சர் அமைப்பதில் ஆர்வம் கொண்டவர்.\n*ஊர்:* திருநெல்வேலி, தமிழ்நாடு\n*Portfolio:* https://rakesh-akm-portfolio.netlify.app",
        projects: "🚀 *முக்கிய பிராஜெக்ட்கள்:* \n\n1️⃣ *Secure User Login System (Backend)*\n- Token Bucket Algorithm, Redis, BullMQ உபயோகித்து உருவாக்கப்பட்டது.\n- JWT tokens & HTTP-Only cookies பாதுகாப்பு.\n\n2️⃣ *Hotel Booking System (MERN)*\n- Live Link: https://hotel-booking-management-navy.vercel.app \n\n3️⃣ *Mobile Shop E-Commerce (Next.js)*\n- ரியல்-டைம் ஃபில்டரிங் மற்றும் ஆப்டிமைஸ்டு MongoDB குவரிகள்.",
        resume: "📄 *ரெஸ்யூமே விபரங்கள்:*\n- *படிப்பு:* BCA (2023-2026), மனோன்மணீயம் சுந்தரனார் பல்கலைக்கழகம்.\n- *திறமைகள்:* JavaScript, React.js, Node.js, Express.js, MongoDB, Redis.\n- *சான்றிதழ்:* FSD Master Class (NoviTech).\n- *தொடர்புக்கு:* +91 6379769075 | rakeshdaniel321@gmail.com",
        ask_from: "நீங்கள் எந்த ஊரில் இருந்து மெசேஜ் செய்கிறீர்கள்? (ஊரின் பெயரை டைப் செய்யவும்)",
        ask_flames: "அறுமை! நாம் இப்போது ஒரு ஜாலியான FLAMES விளையாட்டு விளையாடலாமா? 🥳",
        flames_n1: "சூப்பர்! முதலில் உங்களுடைய பெயரை டைப் செய்யுங்கள்:",
        flames_n2: "இப்போது உங்களுடைய பார்ட்னர் (Partner) பெயரை டைப் செய்யுங்கள்:",
        flames_res: (res) => `🥳 உங்களுடைய FLAMES ரிசல்ட்: *${res}*\n\nராகேஷின் போட்டை பயன்படுத்தியதற்கு மிக்க நன்றி!`,
        bye: "விபரங்களைப் பார்த்ததற்கு நன்றி! உங்களுடைய தகவல்கள் ராகேஷிற்கு அனுப்பப்பட்டது."
    },
    TG: {
        welcome: "Vanakkam! Rakesh Daniel-oda Assistant Bot-uku ungala welcome panrom. 🧑‍💻\n\nUnga peru enna?",
        ask_email: "Unga Email Address-a type pannunga: 📧",
        ask_age: "Unga Age enna? (Age-a type pannunga): 🔢",
        ask_interest: (name) => `Magizhchi ${name}! Ungaluku Rakesh pathi enna theriyanum? Oru option-a choose pannunga:`,
        about: "🧑‍💻 *Rakesh Daniel*\n*Role:* Full-Stack Web Developer (MERN & Next.js)\n*Summary:* Clean coding & efficient backend architecture-la interest ulla MERN fresher.\n*Location:* Tirunelveli, Tamil Nadu\n*Portfolio:* https://rakesh-akm-portfolio.netlify.app",
        projects: "🚀 *Important Projects:* \n\n1️⃣ *Secure User Login System (Backend)*\n- Token Bucket Algorithm, Redis, BullMQ use panni panniyathu.\n- JWT Access Tokens & HTTP-Only cookie security.\n\n2️⃣ *Hotel Booking System (MERN)*\n- Live: https://hotel-booking-management-navy.vercel.app \n\n3️⃣ *Mobile Shop E-Commerce (Next.js)*\n- Real-time search & filter, optimized MongoDB queries.",
        resume: "📄 *Resume Details:*\n- *Education:* BCA (2023-2026), MS University.\n- *Skills:* JavaScript, React.js, Node.js, Express.js, MongoDB, Redis.\n- *Certification:* FSD Master Class (NoviTech).\n- *Contact:* +91 6379769075 | rakeshdaniel321@gmail.com",
        ask_from: "Neenga endha oorla irundhu pesreenga? (Oor pera type pannunga)",
        ask_flames: "Super! Ippo nama oru jolly-ana FLAMES game vilayadlama? 🥳",
        flames_n1: "Sema! First UNGA pera type pannunga:",
        flames_n2: "Ippo unga PARTNER pera type pannunga:",
        flames_res: (res) => `🥳 Ungaloda FLAMES Result: *${res}*\n\nRakesh bot-a use pannadhuku romba thanks!`,
        bye: "Thanks for visiting! Unga details Rakesh-uku send panniyachu."
    }
};

// FLAMES கணக்கீடு லாஜிக்
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
    if (count === 0) return "Friendship 🤝";
    let flames = ['F', 'L', 'A', 'M', 'E', 'S'];
    let currIdx = 0;
    while (flames.length > 1) {
        currIdx = (currIdx + count - 1) % flames.length;
        flames.splice(currIdx, 1);
    }
    const resultMap = {
        'F': 'Friends 🤝', 'L': 'Love ❤️', 'A': 'Affection 🥰',
        'M': 'Marriage 💍', 'E': 'Enemies ⚔️', 'S': 'Siblings 👦👧'
    };
    return resultMap[flames[0]];
}

// 📩 5 மணிநேரத்திற்கு ஒருமுறை எக்செல் & பிடிஎஃப் அறிக்கையைத் தயாரித்து மெயில் அனுப்பும் ஃபங்ஷன்
async function generateAndSendReports() {
    try {
        console.log('[Cron Job]: Preparing automated Excel and PDF Reports...');
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-IN').replace(/\//g, '-');

        if (Object.keys(trackedUsers).length === 0) {
            console.log('[Cron Job]: No analytics data captured in the last 5 hours.');
            return;
        }

        // --- PART A: ADVANCED EXCEL GENERATION ---
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Live UX Analytics');

        worksheet.columns = [
            { header: 'S.No', key: 'sno', width: 8 },
            { header: 'User/Telegram ID', key: 'tgId', width: 18 },
            { header: 'Resolved GPS Location (Village/City)', key: 'loc', width: 40 },
            { header: 'Screen Time (Seconds)', key: 'screenTime', width: 20 },
            { header: 'Usage Freq', key: 'freq', width: 12 },
            { header: 'Device Screen Size', key: 'screenSize', width: 18 },
            { header: 'Visited Pages Path', key: 'pages', width: 30 },
            { header: 'Browser Agent', key: 'browser', width: 30 }
        ];

        let index = 1;
        for (const id in trackedUsers) {
            worksheet.addRow({
                sno: index++,
                tgId: id,
                loc: trackedUsers[id].resolvedLocation || 'N/A',
                screenTime: trackedUsers[id].screenTime || 0,
                freq: trackedUsers[id].usageFrequency || 1,
                screenSize: trackedUsers[id].screenSize || 'N/A',
                pages: trackedUsers[id].visitedPages ? trackedUsers[id].visitedPages.join(', ') : 'Root',
                browser: trackedUsers[id].browser || 'N/A'
            });
        }
        worksheet.getRow(1).font = { bold: true };
        const excelBuffer = await workbook.xlsx.writeBuffer();

        // --- PART B: ADVANCED PDF GENERATION ---
        const pdfDoc = new PDFDocument();
        let pdfBuffers = [];
        pdfDoc.on('data', chunk => pdfBuffers.push(chunk));

        pdfDoc.fontSize(22).fillColor('#1E3A8A').text('Rakesh Daniel Portfolio Screen Analytics', { align: 'center' });
        pdfDoc.fontSize(12).fillColor('#64748B').text(`Periodical Update: ${now.toLocaleString('en-IN')}\n`, { align: 'center' });
        pdfDoc.moveDown();

        for (const id in trackedUsers) {
            pdfDoc.fontSize(13).fillColor('#0284C7').text(`👤 Target User System ID: ${id}`, { bold: true });
            pdfDoc.fontSize(10).fillColor('#334155').text(
                `📍 True Location  : ${trackedUsers[id].resolvedLocation}\n` +
                `⏱️ Total Screen Time: ${trackedUsers[id].screenTime} Seconds\n` +
                `🔄 Interaction Freq : ${trackedUsers[id].usageFrequency} Hits\n` +
                `📱 Screen Metric     : ${trackedUsers[id].screenSize}\n` +
                `🛤️ Explored Paths   : ${trackedUsers[id].visitedPages ? trackedUsers[id].visitedPages.join(' -> ') : '/'}\n` +
                `------------------------------------------------------------------------------------------------------------------------\n`
            );
            pdfDoc.moveDown();
        }
        pdfDoc.end();

        const pdfBuffer = await new Promise((resolve) => {
            pdfDoc.on('end', () => resolve(Buffer.concat(pdfBuffers)));
        });

        // --- PART C: RESEND EMAIL ATTACHMENTS ---
        await resend.emails.send({
            from: 'Rakesh Live Analytics <onboarding@resend.dev>',
            to: [process.env.MY_EMAIL],
            subject: `📊 Automated 5-Hour UI/UX Analytics & Screen Time Report - ${dateStr}`,
            html: `<p>Hi Rakesh, attached are your advanced metric log files (Excel + PDF) capturing live data paths and user screen statistics.</p>`,
            attachments: [
                {
                    filename: `Live_Analytics_Log_${dateStr}.xlsx`,
                    content: excelBuffer.toString('base64'),
                    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                },
                {
                    filename: `Live_Analytics_Log_${dateStr}.pdf`,
                    content: pdfBuffer.toString('base64'),
                    contentType: 'application/vnd.openxmlformats-officedocument.pdf'
                }
            ]
        });

        console.log('[Cron Job Success]: Excel & PDF logs mailed successfully! ✅');
    } catch (err) {
        console.error('[Cron Job Error]:', err.message);
    }
}

// ⏰ 5 மணிநேரத்திற்கு ஒருமுறை தானியங்கி ரன் அமைத்தல் (Cron Schedule)
cron.schedule('0 */5 * * *', () => {
    generateAndSendReports();
});

// 🌐 REACT-இல் இருந்து வரும் லைவ் அனலிட்டிக்ஸ் டேட்டாவைப் பெறும் API பாதைகள்
app.post('/api/save-metrics', (req, res) => {
    const { telegramId, browser, screenSize, latitude, longitude, resolvedLocation } = req.body;
    
    if (!trackedUsers[telegramId]) {
        trackedUsers[telegramId] = { usageFrequency: 0, screenTime: 0, visitedPages: [] };
    }
    
    trackedUsers[telegramId] = {
        ...trackedUsers[telegramId],
        browser: browser.substring(0, 60),
        screenSize,
        latitude,
        longitude,
        resolvedLocation,
        usageFrequency: trackedUsers[telegramId].usageFrequency + 1
    };
    res.sendStatus(200);
});

app.post('/api/update-screen-time', (req, res) => {
    const { telegramId, screenTime } = req.body;
    if (trackedUsers[telegramId]) {
        trackedUsers[telegramId].screenTime += screenTime;
    }
    res.sendStatus(200);
});

app.post('/api/track-page', (req, res) => {
    const { telegramId, page } = req.body;
    if (trackedUsers[telegramId]) {
        if (!trackedUsers[telegramId].visitedPages) trackedUsers[telegramId].visitedPages = [];
        if (!trackedUsers[telegramId].visitedPages.includes(page)) {
            trackedUsers[telegramId].visitedPages.push(page);
        }
    }
    res.sendStatus(200);
});

// 🤖 டெலிகிராம் சாட் பாட் லாஜிக் (மாற்றப்படாத பழைய ஃப்ளோ + WebApp பட்டன்)
bot.start((ctx) => {
    const userId = ctx.from.id;
    userSessions[userId] = { 
        stage: 'CHOOSE_LANG',
        telegramId: userId,
        telegramUsername: ctx.from.username ? `@${ctx.from.username}` : 'No Username'
    };

    ctx.reply(
        `வணக்கம் ${ctx.from.first_name || 'நண்பா'}! உங்கள் மொழியைத் தேர்ந்தெடுக்கவும் / Choose language:\n\n(Note: எனது வெப்சைட்டை நேரடியாகப் பார்க்க கீழே உள்ள "🌐 Open Portfolio" பட்டனைப் பயன்படுத்தவும்!)`,
        Markup.inlineKeyboard([
            [Markup.button.webApp('🌐 Open Portfolio Website', 'https://rakesh-akm-portfolio.netlify.app')],
            [Markup.button.callback('English 🇬🇧', 'LANG_EN')],
            [Markup.button.callback('தமிழ் 🇮🇳', 'LANG_TA')],
            [Markup.button.callback('Tanglish ✍️', 'LANG_TG')]
        ])
    );
});

bot.action(/LANG_(EN|TA|TG)/, (ctx) => {
    const userId = ctx.from.id;
    const lang = ctx.match[1];
    if (!userSessions[userId]) userSessions[userId] = { telegramId: userId, telegramUsername: ctx.from.username || 'N/A' };
    userSessions[userId].lang = lang;
    userSessions[userId].stage = 'ASK_NAME';
    ctx.answerCbQuery();
    ctx.reply(textTemplates[lang].welcome);
});

bot.action(/INT_(ABOUT|PROJECTS|RESUME)/, async (ctx) => {
    const userId = ctx.from.id;
    const actionType = ctx.match[1];
    const session = userSessions[userId];
    if (!session) return ctx.reply("Please /start again.");
    const lang = session.lang;
    session.interest = actionType;

    if (actionType === 'ABOUT') ctx.replyWithMarkdown(textTemplates[lang].about);
    if (actionType === 'PROJECTS') ctx.replyWithMarkdown(textTemplates[lang].projects);
    if (actionType === 'RESUME') ctx.replyWithMarkdown(textTemplates[lang].resume);

    session.stage = 'ASK_FROM';
    setTimeout(() => { ctx.reply(textTemplates[lang].ask_from); }, 1000);
    ctx.answerCbQuery();
});

bot.action(/FLAMES_(YES|NO)/, async (ctx) => {
    const userId = ctx.from.id;
    const choice = ctx.match[1];
    const session = userSessions[userId];
    if (!session) return ctx.reply("Please /start again.");
    const lang = session.lang;

    if (choice === 'YES') {
        session.stage = 'FLAMES_NAME1';
        ctx.reply(textTemplates[lang].flames_n1);
    } else {
        ctx.reply(textTemplates[lang].bye);
        delete userSessions[userId];
    }
    ctx.answerCbQuery();
});

bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text.trim();
    const session = userSessions[userId];
    if (!session) return ctx.reply("Kindly type /start to begin interaction.");
    const lang = session.lang;

    if (session.stage === 'ASK_NAME') {
        session.name = text;
        session.stage = 'ASK_EMAIL';
        ctx.reply(textTemplates[lang].ask_email);
        return;
    }
    if (session.stage === 'ASK_EMAIL') {
        session.email = text;
        session.stage = 'ASK_AGE';
        ctx.reply(textTemplates[lang].ask_age);
        return;
    }
    if (session.stage === 'ASK_AGE') {
        session.age = text;
        session.stage = 'CHOOSING_INTEREST';
        ctx.reply(textTemplates[lang].ask_interest(session.name), Markup.inlineKeyboard([
            [Markup.button.callback('About Rakesh 🧑‍💻', 'INT_ABOUT')],
            [Markup.button.callback('Projects 🚀', 'INT_PROJECTS')],
            [Markup.button.callback('Resume 📄', 'INT_RESUME')]
        ]));
        return;
    }
    if (session.stage === 'ASK_FROM') {
        session.from = text;
        session.stage = 'FLAMES_DECISION';
        ctx.reply(textTemplates[lang].ask_flames, Markup.inlineKeyboard([
            [Markup.button.callback('Yes 👍', 'FLAMES_YES')],
            [Markup.button.callback('No 👎', 'FLAMES_NO')]
        ]));
        return;
    }
    if (session.stage === 'FLAMES_NAME1') {
        session.flamesName1 = text;
        session.stage = 'FLAMES_NAME2';
        ctx.reply(textTemplates[lang].flames_n2);
        return;
    }
    if (session.stage === 'FLAMES_NAME2') {
        session.flamesName2 = text;
        const result = calculateFlames(session.flamesName1, session.flamesName2);
        session.flamesResult = result;
        ctx.replyWithMarkdown(textTemplates[lang].flames_res(result));
        delete userSessions[userId];
        return;
    }
});

// Self-Ping லாஜிக்
setInterval(() => {
    axios.get('https://rakeshakmbot.onrender.com').catch((err) => console.log('Ping active.'));
}, 10 * 60 * 1000);

app.get('/', (req, res) => { res.send('System Live Server Online! ⚡'); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    bot.launch();
});