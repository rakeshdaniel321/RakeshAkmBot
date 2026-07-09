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

// 🗄️ மெயின் ஒருங்கிணைக்கப்பட்ட டேட்டாவை சேமிக்க
const trackedUsers = {};  
// தற்காலிக டைமர்களைச் சேமிக்க (For Drop-out detection)
const sessionTimers = {}; 

const textTemplates = {
    EN: {
        welcome: "Hello! Welcome to Rakesh Daniel's Assistant Bot. 🧑‍💻\n\nWhat is your name?",
        ask_email: "Please enter your Email Address: 📧",
        ask_age: "How old are you? (Enter your Age): 🔢",
        ask_interest: (name) => `Nice to meet you ${name}! What would you like to know about Rakesh? Choose an option:`,
        about: "🧑‍💻 *Rakesh Daniel*\n*Role:* Full-Stack Web Developer (MERN Stack)...",
        projects: "🚀 *Top Projects:* ...",
        resume: "📄 *Resume Details:* ...",
        ask_from: "Where are you from? (Enter your city)",
        ask_flames: "Awesome! Shall we play a fun FLAMES game? 🥳",
        flames_n1: "Great! Enter YOUR name:",
        flames_n2: "Enter your PARTNER's name:",
        flames_res: (res) => `🥳 Your FLAMES Result: *${res}*\n\nThank you for visiting Rakesh's bot!`,
        bye: "Thank you for visiting! Your details have been shared with Rakesh."
    },
    TA: {
        welcome: "வணக்கம்! ராகேஷ் டேனியலின் அசிஸ்டண்ட் போட்டிற்கு உங்களை வரவேற்கிறோம். 🧑‍💻\n\nஉங்க பெயர் என்ன?",
        ask_email: "தயவுசெய்து உங்கள் ஈமெயில் முகவரியை டைப் செய்யவும்: 📧",
        ask_age: "உங்களுக்கு என்ன வயது ஆகிறது? (வயதை டைப் செய்யவும்): 🔢",
        ask_interest: (name) => `மகிழ்ச்சி ${name}! உங்களுக்கு ராகேஷ் பற்றி என்ன விபரம் தெரிய வேண்டும்?`,
        about: "🧑‍💻 *ராகேஷ் டேனியல்*...",
        projects: "🚀 *முக்கிய பிராஜெக்ட்கள்:* ...",
        resume: "📄 *ரெஸ்யூமே விபரங்கள்:* ...",
        ask_from: "நீங்கள் எந்த ஊரில் இருந்து மெசேஜ் செய்கிறீர்கள்? (ஊரின் பெயரை டைப் செய்யவும்)",
        ask_flames: "அருமை! நாம் இப்போது ஒரு ஜாலியான FLAMES விளையாட்டு விளையாடலாமா? 🥳",
        flames_n1: "சூப்பர்! முதலில் உங்களுடைய பெயரை டைப் செய்யுங்கள்:",
        flames_n2: "இப்போது உங்களுடைய பார்ட்னர் (Partner) பெயரை ტიப் செய்யுங்கள்:",
        flames_res: (res) => `🥳 உங்களுடைய FLAMES ரிசல்ட்: *${res}*\n\nராகேஷின் போட்டை பயன்படுத்தியதற்கு மிக்க நன்றி!`,
        bye: "விபரங்களைப் பார்த்ததற்கு நன்றி! உங்களுடைய தகவல்கள் ராகேஷிற்கு அனுப்பப்பட்டது."
    },
    TG: {
        welcome: "Vanakkam! Rakesh Daniel-oda Assistant Bot-uku welcome. 🧑‍💻\n\nUnga peru enna?",
        ask_email: "Unga Email Address-a type pannunga: 📧",
        ask_age: "Unga Age enna? (Age-a type pannunga): 🔢",
        ask_interest: (name) => `Magizhchi ${name}! Ungaluku Rakesh pathi enna theriyanum?`,
        about: "🧑‍💻 *Rakesh Daniel*...",
        projects: "🚀 *Important Projects:* ...",
        resume: "📄 *Resume Details:* ...",
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
        trackedUsers[tgId] = {
            telegramId: tgId,
            username: username,
            botStage: 'START',
            lang: 'EN',
            botName: 'Not Provided',
            botEmail: 'Not Provided',
            botAge: 'Not Provided',
            botFrom: 'Not Provided',
            flamesName1: 'Not Provided',
            flamesName2: 'Not Provided',
            flamesResult: 'Not Finished',
            usageFrequency: 0,
            screenTime: 0,
            visitedPages: [],
            resolvedLocation: 'N/A',
            screenSize: 'N/A',
            browser: 'N/A'
        };
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

// 📧 ஒரு குறிப்பிட்ட பயனருக்கு மட்டும் உடனடியாக அதிவேக PDF மெயில் அனுப்பும் ஃபங்ஷன்
async function sendInstantUserPDF(tgId, triggerReason) {
    try {
        const u = trackedUsers[tgId];
        if (!u) return;

        console.log(`[Instant Mail]: Generating PDF for ${tgId} due to: ${triggerReason}`);
        const pdfDoc = new PDFDocument();
        let pdfBuffers = [];
        pdfDoc.on('data', chunk => pdfBuffers.push(chunk));

        pdfDoc.fontSize(20).fillColor('#1E3A8A').text('Rakesh Daniel Portfolio Live Session Tracker', { align: 'center' });
        pdfDoc.fontSize(11).fillColor('#64748B').text(`Alert Trigger: ${triggerReason} | Time: ${new Date().toLocaleString('en-IN')}\n`, { align: 'center' });
        pdfDoc.moveDown();

        // PDFKit எமோஜிகளால் ஏற்படும் என்கோடிங் பிழைகளைத் (Garbage Character) தவிர்க்க எமோஜிகள் நீக்கப்பட்டுள்ளன
        pdfDoc.fontSize(13).fillColor('#0284C7').text(`User Metrics - Telegram ID: ${tgId} (${u.username})`, { bold: true });
        pdfDoc.fontSize(10).fillColor('#334155').text(
            `Current Bot Stage : ${u.botStage}\n` +
            `Bot Given Name   : ${u.botName}\n` +
            `Bot Given Email  : ${u.botEmail}\n` +
            `Bot Given Age    : ${u.botAge}\n` +
            `User Native City  : ${u.botFrom}\n` +
            `FLAMES Self Name : ${u.flamesName1}\n` +
            `FLAMES Partner   : ${u.flamesName2}\n` +
            `FLAMES Result    : ${u.flamesResult}\n\n` +
            `GPS True Location: ${u.resolvedLocation}\n` +
            `Total Screen Time : ${u.screenTime} Seconds\n` +
            `Interaction Freq  : ${u.usageFrequency} Hits\n` +
            `Device Resolution: ${u.screenSize}\n` +
            `Visited Web Paths: ${u.visitedPages.length > 0 ? u.visitedPages.join(' -> ') : 'Root / Opened Only'}\n` +
            `Browser Client    : ${u.browser}\n`
        );
        pdfDoc.end();

        const pdfBuffer = await new Promise((resolve) => {
            pdfDoc.on('end', () => resolve(Buffer.concat(pdfBuffers)));
        });

        await resend.emails.send({
            from: 'Rakesh Instant Alert <onboarding@resend.dev>',
            to: [process.env.MY_EMAIL],
            subject: `🚨 [${triggerReason}] User Session Alert - ID: ${tgId}`,
            html: `<h3>New User Status Update</h3><p>User <b>${u.botName}</b> (${tgId}) triggered an instant report via: <b>${triggerReason}</b>. Complete analytics PDF attached.</p>`,
            attachments: [
                {
                    filename: `User_Session_${tgId}.pdf`,
                    content: pdfBuffer.toString('base64'),
                    contentType: 'application/vnd.openxmlformats-officedocument.pdf'
                }
            ]
        });
        console.log(`[Instant Mail Success]: PDF sent for user ${tgId}`);
    } catch (err) {
        console.error('[Instant Mail Error]:', err.message);
    }
}

// ⏱️ பயனர் பாதியில் வெளியேறுவதைக் கண்டறியும் டைமர் மேனேஜர் (Inactivity Handler)
function handleUserActivityTimeout(tgId) {
    if (sessionTimers[tgId]) clearTimeout(sessionTimers[tgId]);

    sessionTimers[tgId] = setTimeout(() => {
        const u = trackedUsers[tgId];
        if (u && u.botStage !== 'ALL_DONE' && u.botStage !== 'COMPLETED_NO_FLAMES') {
            u.botStage = `${u.botStage}_(DROPPED_OUT)`;
            sendInstantUserPDF(tgId, 'USER_DROPPED_OUT_INACTIVE');
        }
    }, 5 * 60 * 1000); 
}

// 🌐 REACT API ROUTES
app.post('/api/save-metrics', (req, res) => {
    const { telegramId, browser, screenSize, latitude, longitude, resolvedLocation } = req.body;
    initUserSession(telegramId);
    
    trackedUsers[telegramId].browser = browser ? browser.substring(0, 50) : 'N/A';
    trackedUsers[telegramId].screenSize = screenSize || 'N/A';
    trackedUsers[telegramId].resolvedLocation = resolvedLocation || 'N/A';
    trackedUsers[telegramId].usageFrequency += 1;
    
    res.sendStatus(200);
});

app.post('/api/update-screen-time', (req, res) => {
    const { telegramId, screenTime } = req.body;
    initUserSession(telegramId);
    trackedUsers[telegramId].screenTime += screenTime;
    res.sendStatus(200);
});

app.post('/api/track-page', (req, res) => {
    const { telegramId, page } = req.body;
    initUserSession(telegramId);
    if (!trackedUsers[telegramId].visitedPages.includes(page)) {
        trackedUsers[telegramId].visitedPages.push(page);
    }
    res.sendStatus(200);
});

// 🤖 TELEGRAM BOT LOGIC
bot.start((ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.username ? `@${ctx.from.username}` : 'No Username';
    
    initUserSession(userId, username);
    trackedUsers[userId].botStage = 'CHOOSE_LANG';
    handleUserActivityTimeout(userId);

    // 🎯 பட்டன் லிங்க்கின் பின்னாடி ?tgId=${userId} பேராமீட்டரைச் சேர்த்து வெப்சைட்டிற்கு அனுப்புகிறோம்!
    const portfolioUrl = `https://rakesh-akm-portfolio.netlify.app/?tgId=${userId}`;

    ctx.reply(
        `வணக்கம் ${ctx.from.first_name || 'நண்பா'}! உங்கள் மொழியைத் தேர்ந்தெடுக்கவும் / Choose language:`,
        Markup.inlineKeyboard([
            [Markup.button.webApp('🌐 Open Portfolio Website', portfolioUrl)],
            [Markup.button.callback('English 🇬🇧', 'LANG_EN')],
            [Markup.button.callback('தமிழ் 🇮🇳', 'LANG_TA')],
            [Markup.button.callback('Tanglish ✍️', 'LANG_TG')]
        ])
    );
});

bot.action(/LANG_(EN|TA|TG)/, (ctx) => {
    const userId = ctx.from.id;
    const lang = ctx.match[1];
    initUserSession(userId);
    
    trackedUsers[userId].lang = lang;
    trackedUsers[userId].botStage = 'ASK_NAME';
    handleUserActivityTimeout(userId);
    ctx.answerCbQuery();
    ctx.reply(textTemplates[lang].welcome);
});

bot.action(/INT_(ABOUT|PROJECTS|RESUME)/, (ctx) => {
    const userId = ctx.from.id;
    const actionType = ctx.match[1];
    const session = trackedUsers[userId];
    if (!session) return ctx.reply("Please /start again.");
    const lang = session.lang;

    if (actionType === 'ABOUT') ctx.replyWithMarkdown(textTemplates[lang].about);
    if (actionType === 'PROJECTS') ctx.replyWithMarkdown(textTemplates[lang].projects);
    if (actionType === 'RESUME') ctx.replyWithMarkdown(textTemplates[lang].resume);

    session.botStage = 'ASK_FROM';
    handleUserActivityTimeout(userId);
    setTimeout(() => { ctx.reply(textTemplates[lang].ask_from); }, 1000);
    ctx.answerCbQuery();
});

bot.action(/FLAMES_(YES|NO)/, (ctx) => {
    const userId = ctx.from.id;
    const choice = ctx.match[1];
    const session = trackedUsers[userId];
    if (!session) return ctx.reply("Please /start again.");
    const lang = session.lang;

    if (choice === 'YES') {
        session.botStage = 'FLAMES_NAME1';
        handleUserActivityTimeout(userId);
        ctx.reply(textTemplates[lang].flames_n1);
    } else {
        ctx.reply(textTemplates[lang].bye);
        session.botStage = 'COMPLETED_NO_FLAMES';
        if (sessionTimers[userId]) clearTimeout(sessionTimers[userId]);
        sendInstantUserPDF(userId, 'FLAMES_DECLINED_COMPLETED');
    }
    ctx.answerCbQuery();
});

bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text.trim();
    const session = trackedUsers[userId];
    if (!session) return ctx.reply("Kindly type /start to begin.");
    const lang = session.lang;

    handleUserActivityTimeout(userId);

    if (session.botStage === 'ASK_NAME') {
        session.botName = text;
        session.botStage = 'ASK_EMAIL';
        ctx.reply(textTemplates[lang].ask_email);
        return;
    }
    if (session.botStage === 'ASK_EMAIL') {
        session.botEmail = text;
        session.botStage = 'ASK_AGE';
        ctx.reply(textTemplates[lang].ask_age);
        return;
    }
    if (session.botStage === 'ASK_AGE') {
        session.botAge = text;
        session.botStage = 'CHOOSING_INTEREST';
        ctx.reply(textTemplates[lang].ask_interest(session.botName), Markup.inlineKeyboard([
            [Markup.button.callback('About Rakesh 🧑‍💻', 'INT_ABOUT')],
            [Markup.button.callback('Projects 🚀', 'INT_PROJECTS')],
            [Markup.button.callback('Resume 📄', 'INT_RESUME')]
        ]));
        return;
    }
    if (session.botStage === 'ASK_FROM') {
        session.botFrom = text;
        session.botStage = 'FLAMES_DECISION';
        ctx.reply(textTemplates[lang].ask_flames, Markup.inlineKeyboard([
            [Markup.button.callback('Yes 👍', 'FLAMES_YES')],
            [Markup.button.callback('No 👎', 'FLAMES_NO')]
        ]));
        return;
    }
    if (session.botStage === 'FLAMES_NAME1') {
        session.flamesName1 = text; 
        session.botStage = 'FLAMES_NAME2';
        return ctx.reply(textTemplates[lang].flames_n2);
    }
    if (session.botStage === 'FLAMES_NAME2') {
        session.flamesName2 = text;
        const result = calculateFlames(session.flamesName1, session.flamesName2);
        session.flamesResult = result;
        session.botStage = 'ALL_DONE';
        
        if (sessionTimers[userId]) clearTimeout(sessionTimers[userId]);
        
        await ctx.replyWithMarkdown(textTemplates[lang].flames_res(result));
        sendInstantUserPDF(userId, 'FLAMES_GAME_FULLY_COMPLETED');
        return;
    }
});

// ⏰ 5 மணிநேரத்திற்கு ஒருமுறை இயங்கும் மாஸ்டர் எக்செல் பேக்கப் க்ரான் ஜாப்
async function generateAndSend5HourBackup() {
    try {
        console.log('[Cron Backup]: Preparing 5-Hour Master Excel Report...');
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-IN').replace(/\//g, '-');

        if (Object.keys(trackedUsers).length === 0) return;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Master Logs');

        worksheet.columns = [
            { header: 'S.No', key: 'sno', width: 6 },
            { header: 'User/Telegram ID', key: 'tgId', width: 18 },
            { header: 'Bot Stage', key: 'stage', width: 22 },
            { header: 'Chat Name', key: 'bName', width: 15 },
            { header: 'Chat Email', key: 'bEmail', width: 20 },
            { header: 'Age', key: 'bAge', width: 8 },
            { header: 'User City', key: 'bFrom', width: 15 },
            { header: 'FLAMES Self Name', key: 'flName1', width: 18 },
            { header: 'FLAMES Partner', key: 'flName2', width: 18 },
            { header: 'FLAMES Result', key: 'flRes', width: 15 },
            { header: 'Resolved GPS Location (Village/City)', key: 'loc', width: 35 },
            { header: 'Screen Time (Seconds)', key: 'screenTime', width: 18 },
            { header: 'Usage Freq', key: 'freq', width: 12 },
            { header: 'Device Screen Size', key: 'screenSize', width: 18 },
            { header: 'Visited Pages Path', key: 'pages', width: 25 },
            { header: 'Browser Agent', key: 'browser', width: 25 }
        ];

        let index = 1;
        for (const id in trackedUsers) {
            const u = trackedUsers[id];
            worksheet.addRow({
                sno: index++,
                tgId: id,
                stage: u.botStage,
                bName: u.botName,
                bEmail: u.botEmail,
                bAge: u.botAge,
                bFrom: u.botFrom,
                flName1: u.flamesName1,
                flName2: u.flamesName2,
                flRes: u.flamesResult,
                loc: u.resolvedLocation,
                screenTime: u.screenTime,
                freq: u.usageFrequency,
                screenSize: u.screenSize,
                pages: u.visitedPages.length > 0 ? u.visitedPages.join(', ') : 'None',
                browser: u.browser
            });
        }
        worksheet.getRow(1).font = { bold: true };
        const excelBuffer = await workbook.xlsx.writeBuffer();

        await resend.emails.send({
            from: 'Rakesh Master Backup <onboarding@resend.dev>',
            to: [process.env.MY_EMAIL],
            subject: `📊 Automated 5-Hour Master Excel Log - ${dateStr}`,
            html: `<p>Hi Rakesh, attached is the comprehensive Excel datasheet compiling all bot and website metrics over the past 5 hours.</p>`,
            attachments: [
                {
                    filename: `Master_User_Report_${dateStr}.xlsx`,
                    content: excelBuffer.toString('base64'),
                    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                }
            ]
        });
        console.log('[Cron Job Success]: Master Excel backup mailed! ✅');
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

app.get('/', (req, res) => { res.send('System Live with Fast Mail Alerts! ⚡'); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server connected on port ${PORT}`);
    bot.launch();
});