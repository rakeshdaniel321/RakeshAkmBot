const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const { Resend } = require('resend'); 
const ExcelJS = require('exceljs'); // ExcelJS பேக்கேஜ்
require('dotenv').config();
const dns = require('dns');
const axios = require('axios');

// Render DNS செட்டிங்ஸ்
dns.setServers(['8.8.8.8', '8.8.4.4']);

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);
const resend = new Resend(process.env.RESEND_API_KEY);

app.get('/', (req, res) => {
    res.send('Rakesh Daniel Portfolio Bot with Excel Export is Running! 🚀');
});

// Render Self-Ping லாஜிக்
setInterval(() => {
    axios.get('https://rakeshakmbot.onrender.com') 
        .then(() => console.log('Self-Ping Success: Keeping the bot awake! ⚡'))
        .catch((err) => console.error('Self-Ping Error:', err.message));
}, 10 * 60 * 1000);

// யூஸர் செஷன் மேனேஜ்மென்ட்
const userSessions = {};

// 3 மொழிகளுக்கான மெசேஜ் டெம்ப்ளேட்ஸ் (Email மற்றும் Age கேள்விகள் சேர்க்கப்பட்டுள்ளது)
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
        ask_flames: "அருமை! நாம் இப்போது ஒரு ஜாலியான FLAMES விளையாட்டு விளையாடலாமா? 🥳",
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

// 📊 Excel உருவாக்கி Resend மூலம் மின்னஞ்சல் அனுப்பும் புதிய ஃபங்ஷன்
async function sendExcelEmail(userData) {
    try {
        console.log('[Excel & Resend]: Creating Excel Sheet...');

        // 1. புதிய Excel வொர்க்புக் உருவாக்குதல்
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Lead Details');

        // தற்போதைய தேதி மற்றும் நேரம் கணக்கிடுதல்
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-IN'); // DD/MM/YYYY
        const timeStr = now.toLocaleTimeString('en-IN'); // HH:MM:SS

        // எக்செல் ஹெட்டிங் வரிசை அமைப்பு (S.No முதல் அனைத்து விவரங்களும்)
        worksheet.columns = [
            { header: 'S.No', key: 'sno', width: 8 },
            { header: 'Date', key: 'date', width: 12 },
            { header: 'Time', key: 'time', width: 12 },
            { header: 'Telegram ID', key: 'tgId', width: 15 },
            { header: 'Telegram Username', key: 'tgUsername', width: 20 },
            { header: 'Real Name', key: 'realName', width: 20 },
            { header: 'Email ID', key: 'email', width: 25 },
            { header: 'Age', key: 'age', width: 10 },
            { header: 'Language Choice', key: 'lang', width: 15 },
            { header: 'Location (Oor)', key: 'from', width: 20 },
            { header: 'Interest Selected', key: 'interest', width: 18 },
            { header: 'FLAMES User', key: 'flames1', width: 18 },
            { header: 'FLAMES Partner', key: 'flames2', width: 18 },
            { header: 'FLAMES Result', key: 'flamesRes', width: 18 }
        ];

        // டேட்டாவை எக்செல் ரோவாக (Row) சேர்த்தல்
        worksheet.addRow({
            sno: 1,
            date: dateStr,
            time: timeStr,
            tgId: userData.telegramId,
            tgUsername: userData.telegramUsername,
            realName: userData.name || 'N/A',
            email: userData.email || 'N/A',
            age: userData.age || 'N/A',
            lang: userData.lang || 'N/A',
            from: userData.from || 'N/A',
            interest: userData.interest || 'N/A',
            flames1: userData.flamesName1 || 'N/A',
            flames2: userData.flamesName2 || 'N/A',
            flamesRes: userData.flamesResult || 'Not Played'
        });

        // ஹெட்டிங் ஸ்டைல் மாற்றுதல் (Bold)
        worksheet.getRow(1).font = { bold: true };

        // எக்செல் கோப்பை பஃபராக (Buffer) மாற்றுதல்
        const buffer = await workbook.xlsx.writeBuffer();

        console.log('[Resend]: Sending Email with Excel Attachment...');

        // 2. Resend API மூலம் அட்டாச்மென்ட்டாக மெயில் அனுப்புதல்
        const { data, error } = await resend.emails.send({
            from: 'Rakesh Analytics <onboarding@resend.dev>',
            to: [process.env.MY_EMAIL], 
            subject: `📊 New Excel Lead: ${userData.name || 'Unknown'} - ${dateStr}`,
            html: `<p>Hi Rakesh, a new user has interacted with your bot. Please find the attached <strong>Excel Sheet</strong> for full tracking data.</p>`,
            attachments: [
                {
                    filename: `Lead_${userData.name || 'User'}_${dateStr.replace(/\//g, '-')}.xlsx`,
                    content: buffer.toString('base64'),
                    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                }
            ]
        });

        if (error) {
            console.error('[Resend Error]: ❌', error.message);
            return { success: false, error };
        }

        console.log('[Resend Email Sent!]: Excel Sheet delivered successfully. ✅ ID:', data.id);
        return { success: true, data };
    } catch (err) {
        console.error('[Excel/Resend System Crash]: ❌', err.message);
        return { success: false, error: err };
    }
}

// பாட் /start கமாண்ட் லாஜிக்
bot.start((ctx) => {
    const userId = ctx.from.id;
    userSessions[userId] = { 
        stage: 'CHOOSE_LANG',
        telegramId: userId,
        telegramUsername: ctx.from.username ? `@${ctx.from.username}` : 'No Username'
    };

    ctx.reply(
        "Choose your preferred language / உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்:",
        Markup.inlineKeyboard([
            [Markup.button.callback('English 🇬🇧', 'LANG_EN')],
            [Markup.button.callback('தமிழ் 🇮🇳', 'LANG_TA')],
            [Markup.button.callback('Tanglish ✍️', 'LANG_TG')]
        ])
    );
});

// பட்டன் க்ளிக்குகளை ஹேண்டில் செய்ய
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
    setTimeout(() => {
        ctx.reply(textTemplates[lang].ask_from);
    }, 1000);
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
        // Excel ஷீட் மெயில் அனுப்புதல்
        await sendExcelEmail(session);
        delete userSessions[userId];
    }
    ctx.answerCbQuery();
});

// யூஸர் டெக்ஸ்ட் மெசேஜ் அனுப்பினால் ஒர்க் ஆகும் லாஜிக் (மாற்றியமைக்கப்பட்ட ஃப்ளோ)
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text.trim();
    const session = userSessions[userId];

    if (!session) {
        return ctx.reply("Kindly type /start to begin interaction.");
    }

    const lang = session.lang;

    // 1. பெயர் வாங்குதல்
    if (session.stage === 'ASK_NAME') {
        session.name = text;
        session.stage = 'ASK_EMAIL';
        ctx.reply(textTemplates[lang].ask_email);
        return;
    }

    // 2. புதிய ஃபீச்சர்: ஈமெயில் வாங்குதல்
    if (session.stage === 'ASK_EMAIL') {
        session.email = text;
        session.stage = 'ASK_AGE';
        ctx.reply(textTemplates[lang].ask_age);
        return;
    }

    // 3. புதிய ஃபீச்சர்: வயது வாங்குதல்
    if (session.stage === 'ASK_AGE') {
        session.age = text;
        session.stage = 'CHOOSING_INTEREST';
        
        ctx.reply(
            textTemplates[lang].ask_interest(session.name),
            Markup.inlineKeyboard([
                [Markup.button.callback('About Rakesh 🧑‍💻', 'INT_ABOUT')],
                [Markup.button.callback('Projects 🚀', 'INT_PROJECTS')],
                [Markup.button.callback('Resume 📄', 'INT_RESUME')]
            ])
        );
        return;
    }

    // 4. ஊர் விபரம் வாங்குதல்
    if (session.stage === 'ASK_FROM') {
        session.from = text;
        session.stage = 'FLAMES_DECISION';

        ctx.reply(
            textTemplates[lang].ask_flames,
            Markup.inlineKeyboard([
                [Markup.button.callback('Yes 👍', 'FLAMES_YES')],
                [Markup.button.callback('No 👎', 'FLAMES_NO')]
            ])
        );
        return;
    }

    // 5. FLAMES பெயர் 1
    if (session.stage === 'FLAMES_NAME1') {
        session.flamesName1 = text;
        session.stage = 'FLAMES_NAME2';
        ctx.reply(textTemplates[lang].flames_n2);
        return;
    }

    // 6. FLAMES பெயர் 2 & முடிவு
    if (session.stage === 'FLAMES_NAME2') {
        session.flamesName2 = text;
        const result = calculateFlames(session.flamesName1, session.flamesName2);
        session.flamesResult = result;

        ctx.replyWithMarkdown(textTemplates[lang].flames_res(result));

        // Excel ஷீட் மெயில் அனுப்புதல்
        await sendExcelEmail(session);

        delete userSessions[userId];
        return;
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    bot.launch();
    console.log("Rakesh Daniel's Bot with Excel Delivery is Online! 🤖✅");
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));