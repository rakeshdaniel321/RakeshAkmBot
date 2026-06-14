const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const nodemailer = require('nodemailer');
require('dotenv').config();
const dns = require('dns');
const axios = require('axios');

// Render-ல் ஏற்படும் சில DNS பிரச்சனைகளைத் தவிர்க்க கூகுள் DNS செட் செய்யப்படுகிறது
dns.setServers(['8.8.8.8', '8.8.4.4']);

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);

app.get('/', (req, res) => {
    res.send('Rakesh Daniel Portfolio Bot is Alive and Running! 🚀');
});

// Render Self-Ping லாஜிக் (சர்வர் தூங்காமல் (Sleep) இருக்க)
setInterval(() => {
    axios.get('https://rakeshakmbot.onrender.com') 
        .then(() => console.log('Self-Ping Success: Keeping the bot awake! ⚡'))
        .catch((err) => console.error('Self-Ping Error:', err.message));
}, 10 * 60 * 1000); // ஒவ்வொரு 10 நிமிடத்திற்கும் பிங் செய்யும்

// யூஸர் செஷன் மேனேஜ்மென்ட்
const userSessions = {};

// 3 மொழிகளுக்கான மெசேஜ் டெம்ப்ளேட்ஸ் (Localization)
const textTemplates = {
    EN: {
        welcome: "Hello! Welcome to Rakesh Daniel's Assistant Bot. 🧑‍💻\n\nWhat is your name?",
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

// ஜிமெயில் அனுப்பும் ஃபங்ஷன் (IPv6 நெட்வொர்க் பிளாக் எர்ரர் முற்றிலும் சரிசெய்யப்பட்ட வடிவம்)
async function sendEmailData(userData) {
    const cleanPassword = process.env.EMAIL_PASSWORD ? process.env.EMAIL_PASSWORD.replace(/\s+/g, '') : '';

    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true, // Port 465 என்பதால் true
        connectionTimeout: 15000,
        socketTimeout: 15000,
        // Render கிளவுட் சர்வருக்கான பிரத்யேக நெட்வொர்க் செட்டிங் (Force IPv4)
        connectionOptions: {
            family: 4 // இது ENETUNREACH IPv6 எர்ரர் வராமல் தடுத்து IPv4-ல் மெயில் அனுப்பும்!
        },
        auth: {
            user: process.env.MY_EMAIL, 
            pass: cleanPassword        
        }
    });

    let mailOptions = {
        from: process.env.MY_EMAIL,
        to: process.env.MY_EMAIL,
        subject: `New Portfolio Lead: ${userData.name || 'Unknown'} (${userData.lang || 'N/A'})`,
        text: `Rakesh, உங்களது போட்டிலிருந்து வந்த புதிய விபரம்:\n\n` +
              `User Name: ${userData.name || 'N/A'}\n` +
              `Selected Language: ${userData.lang || 'N/A'}\n` +
              `From (Oor): ${userData.from || 'N/A'}\n` +
              `Interested In: ${userData.interest || 'N/A'}\n\n` +
              `-- FLAMES Data --\n` +
              `User Name for FLAMES: ${userData.flamesName1 || 'N/A'}\n` +
              `Partner Name for FLAMES: ${userData.flamesName2 || 'N/A'}\n` +
              `FLAMES Result: ${userData.flamesResult || 'Not Played'}\n`
    };

    try {
        console.log("Attempting to send email via Google SMTP (Forced IPv4)...");
        await transporter.sendMail(mailOptions);
        console.log("Lead details emailed to Rakesh successfully! ✅");
    } catch (err) {
        console.error("Google SMTP Delivery Failed: ❌ Reason:", err.message);
    }
}

// பாட் /start கமாண்ட் லாஜிக்
bot.start((ctx) => {
    const userId = ctx.from.id;
    userSessions[userId] = { stage: 'CHOOSE_LANG' };

    ctx.reply(
        "Choose your preferred language / உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்:",
        Markup.inlineKeyboard([
            [Markup.button.callback('English 🇬🇧', 'LANG_EN')],
            [Markup.button.callback('தமிழ் 🇮🇳', 'LANG_TA')],
            [Markup.button.callback('Tanglish ✍️', 'LANG_TG')]
        ])
    );
});

// பட்டன் க்ளிக்குகளை ஹேண்டில் செய்ய (Action Listeners)
bot.action(/LANG_(EN|TA|TG)/, (ctx) => {
    const userId = ctx.from.id;
    const lang = ctx.match[1];

    if (!userSessions[userId]) userSessions[userId] = {};
    
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
        await sendEmailData(session);
        delete userSessions[userId];
    }
    ctx.answerCbQuery();
});

// யூஸர் டெக்ஸ்ட் மெசேஜ் அனுப்பினால் ஒர்க் ஆகும் லாஜிக்
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
        session.stage = 'CHOOSING_INTEREST';
        
        ctx.reply(
            textTemplates[lang].ask_interest(text),
            Markup.inlineKeyboard([
                [Markup.button.callback('About Rakesh 🧑‍💻', 'INT_ABOUT')],
                [Markup.button.callback('Projects 🚀', 'INT_PROJECTS')],
                [Markup.button.callback('Resume 📄', 'INT_RESUME')]
            ])
        );
        return;
    }

    // 2. ஊர் வாங்குதல்
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

    // 3. FLAMES முதல் பெயர்
    if (session.stage === 'FLAMES_NAME1') {
        session.flamesName1 = text;
        session.stage = 'FLAMES_NAME2';
        ctx.reply(textTemplates[lang].flames_n2);
        return;
    }

    // 4. FLAMES இரண்டாம் பெயர் + முடிவு + மெயில் அனுப்புதல்
    if (session.stage === 'FLAMES_NAME2') {
        session.flamesName2 = text;
        const result = calculateFlames(session.flamesName1, session.flamesName2);
        session.flamesResult = result;

        ctx.replyWithMarkdown(textTemplates[lang].flames_res(result));

        // விபரங்களை உங்களுடைய ஜிமெயிலுக்கு அனுப்பும்
        await sendEmailData(session);

        // செஷனை க்ளியர் செய்தல்
        delete userSessions[userId];
        return;
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is perfectly running on port ${PORT}`);
    bot.launch();
    console.log("Rakesh Daniel's Multi-language Bot is Online! 🤖✅");
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));