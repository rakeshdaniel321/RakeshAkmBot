const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const { Resend } = require('resend'); 
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit'); // PDF உருவாக்குவதற்கான பேக்கேஜ்
const cron = require('node-cron');     // 5 மணிநேர டைமருக்கு
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const bot = new Telegraf(process.env.BOT_TOKEN);
const resend = new Resend(process.env.RESEND_API_KEY);

// இன்-மெமரி டேட்டாபேஸ் (உண்மையான பயன்பாட்டிற்கு இதில் MongoDB இணைக்கலாம்)
const trackedUsers = {};
const userSessions = {};

// 📩 1. எக்செல் மற்றும் பிடிஎஃப் கோப்புகளை உருவாக்கி மின்னஞ்சல் அனுப்பும் மாஸ்டர் ஃபங்ஷன்
async function generateReportsAndEmail() {
    try {
        console.log('[Automation]: Generating Excel and PDF Reports...');
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-IN').replace(/\//g, '-');

        if (Object.keys(trackedUsers).length === 0) {
            console.log('[Automation]: No user data available to send.');
            return;
        }

        // --- PART A: EXCEL GENERATION ---
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('UI-UX Screen Analytics');

        worksheet.columns = [
            { header: 'S.No', key: 'sno', width: 8 },
            { header: 'Telegram ID', key: 'tgId', width: 15 },
            { header: 'Resolved Location (Village/City)', key: 'loc', width: 35 },
            { header: 'Browser / Device', key: 'browser', width: 25 },
            { header: 'Screen Size', key: 'screen', width: 15 },
            { header: 'Screen Time (Sec)', key: 'time', width: 15 },
            { header: 'Usage Freq', key: 'freq', width: 12 }
        ];

        let index = 1;
        for (const id in trackedUsers) {
            worksheet.addRow({
                sno: index++,
                tgId: id,
                loc: trackedUsers[id].resolvedLocation || 'N/A',
                browser: trackedUsers[id].browser || 'N/A',
                screen: trackedUsers[id].screenSize || 'N/A',
                time: trackedUsers[id].screenTime || 0,
                freq: trackedUsers[id].usageFrequency || 1
            });
        }
        worksheet.getRow(1).font = { bold: true };
        const excelBuffer = await workbook.xlsx.writeBuffer();

        // --- PART B: PDF GENERATION ---
        const pdfDoc = new PDFDocument();
        let pdfBuffers = [];
        
        pdfDoc.on('data', chunk => pdfBuffers.push(chunk));
        
        // PDF உள்ளடக்கத்தை வடிவமைத்தல்
        pdfDoc.fontSize(20).text('Rakesh Daniel Portfolio Tracking Report', { align: 'center' });
        pdfDoc.fontSize(12).text(`Report Generated On: ${now.toLocaleString('en-IN')}\n\n`, { align: 'center' });
        pdfDoc.moveDown();

        for (const id in trackedUsers) {
            pdfDoc.fontSize(14).fillColor('#1e3a8a').text(`User ID: ${id}`, { underline: true });
            pdfDoc.fontSize(11).fillColor('#334155').text(
                `📍 Real Location: ${trackedUsers[id].resolvedLocation}\n` +
                `🖥️ Screen Size: ${trackedUsers[id].screenSize}\n` +
                `⏱️ Screen Time: ${trackedUsers[id].screenTime} Seconds\n` +
                `📊 Usage Frequency: ${trackedUsers[id].usageFrequency} Times\n` +
                `-------------------------------------------------------------\n`
            );
            pdfDoc.moveDown();
        }
        pdfDoc.end();

        // PDF பஃபர் முடிவடையும் வரை காத்திருத்தல்
        const pdfBuffer = await new Promise((resolve) => {
            pdfDoc.on('end', () => resolve(Buffer.concat(pdfBuffers)));
        });

        // --- PART C: RESEND EMAIL SENDING ---
        await resend.emails.send({
            from: 'Rakesh Analytics <onboarding@resend.dev>',
            to: [process.env.MY_EMAIL],
            subject: `📊 5-Hour UI/UX Analytics Update - ${dateStr}`,
            html: `<h3>Hi Rakesh,</h3><p>Attached are the automated <strong>Excel Sheet</strong> and <strong>PDF Report</strong> containing complete screen tracking and location metrics from the last 5 hours.</p>`,
            attachments: [
                {
                    filename: `Analytics_Report_${dateStr}.xlsx`,
                    content: excelBuffer.toString('base64'),
                    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                },
                {
                    filename: `Analytics_Report_${dateStr}.pdf`,
                    content: pdfBuffer.toString('base64'),
                    contentType: 'application/vnd.openxmlformats-officedocument.pdf'
                }
            ]
        });

        console.log('[Automation Email Sent]: 5-Hour Excel & PDF delivered! ✅');
    } catch (err) {
        console.error('[Automation Error]:', err.message);
    }
}

// ⏰ 3. CRON JOB JOB SETTINGS: ஒவ்வொரு 5 மணிநேரத்திற்கு ஒருமுறை தானியங்கி இயக்கம்
// '0 */5 * * *' என்பது துல்லியமாக 5 மணிநேரத்திற்கு ஒருமுறை இந்த ஃபங்ஷனை இயக்கும்
cron.schedule('0 */5 * * *', () => {
    generateReportsAndEmail();
});

// 🌐 4. REACT பக்கத்தில் இருந்து வரும் தரவுகளைப் பெறும் API பாதைகள் (Routes)
app.post('/api/save-metrics', (req, res) => {
    const { telegramId, browser, screenSize, latitude, longitude, resolvedLocation } = req.body;
    
    if (!trackedUsers[telegramId]) {
        trackedUsers[telegramId] = { usageFrequency: 0, screenTime: 0 };
    }
    
    trackedUsers[telegramId] = {
        ...trackedUsers[telegramId],
        browser: browser.substring(0, 50), // பிரவுசர் சுருக்கம்
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

// 🤖 5. டெலிகிராம் பாட் இண்டக்ரேஷன் (WebApp பட்டனுடன் கூடிய மாடிஃபைடு ஸ்டார்ட் கமாண்ட்)
bot.start((ctx) => {
    const userId = ctx.from.id;
    ctx.reply(
        `வணக்கம் ${ctx.from.first_name || 'நண்பா'}! ராகேஷின் போர்ட்ஃபோலியோவிற்கு உங்களை வரவேற்கிறோம். 🧑‍💻\n\nகீழே உள்ள பட்டனை கிளிக் செய்து எனது வெப்சைட்டை டெலிகிராமிற்குள்ளேயே பார்க்கலாம்!`,
        Markup.inlineKeyboard([
            [Markup.button.webApp('🌐 Open Portfolio Website', 'https://rakesh-akm-portfolio.netlify.app')]
        ])
    );
});

app.get('/', (req, res) => {
    res.send('Rakesh Advanced Live Tracking System is Active! ⚡');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    bot.launch();
});