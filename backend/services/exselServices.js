const ExcelJS = require('exceljs');
const { Resend } = require('resend');
const UserLead = require('./models/UserLead');

const resend = new Resend(process.env.RESEND_API_KEY);

async function exportToExcelAndEmail() {
    try {
        const leads = await UserLead.find({});
        
        // 1. எக்செல் வொர்க் புக் உருவாக்குதல்
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Portfolio Leads');

        // ஹெட்டிங் செட்டிங்ஸ்
        worksheet.columns = [
            { header: 'S.No', key: 'sno', width: 10 },
            { header: 'Telegram ID', key: 'telegramId', width: 20 },
            { header: 'Telegram Username', key: 'telegramUsername', width: 20 },
            { header: 'Real Name', key: 'realName', width: 20 },
            { header: 'Email ID', key: 'email', width: 25 },
            { header: 'Age', key: 'age', width: 10 },
            { header: 'Language', key: 'chosenLanguage', width: 15 },
            { header: 'Typed Location', key: 'locationFrom', width: 20 },
            { header: 'GPS (Lat, Long)', key: 'gps', width: 25 },
            { header: 'Device', key: 'deviceInfo', width: 20 },
            { header: 'Browser', key: 'browserInfo', width: 20 },
            { header: 'Screen Size', key: 'screenSize', width: 15 },
            { header: 'Flames Partner', key: 'flamesPartnerName', width: 20 },
            { header: 'Flames Result', key: 'flamesResult', width: 20 }
        ];

        // டேட்டாவை எக்செல்லில் ஏற்றுதல்
        leads.forEach((lead, index) => {
            worksheet.addRow({
                sno: index + 1,
                telegramId: lead.telegramId,
                telegramUsername: lead.telegramUsername,
                realName: lead.realName,
                email: lead.email,
                age: lead.age,
                chosenLanguage: lead.chosenLanguage,
                locationFrom: lead.locationFrom,
                gps: lead.gpsLocation.latitude ? `${lead.gpsLocation.latitude}, ${lead.gpsLocation.longitude}` : 'Not Allowed',
                deviceInfo: lead.deviceInfo,
                browserInfo: lead.browserInfo,
                screenSize: lead.screenSize,
                flamesPartnerName: lead.flamesPartnerName,
                flamesResult: lead.flamesResult
            });
        });

        // ஃபைலை மெமரியில் பஃபராக (Buffer) மாற்றுதல்
        const buffer = await workbook.xlsx.writeBuffer();

        // 2. Resend மூலம் மெயில் அனுப்புதல் (With Excel Attachment)
        await resend.emails.send({
            from: 'Rakesh Analytics <onboarding@resend.dev>',
            to: [process.env.MY_EMAIL],
            subject: '📊 Updated Portfolio Leads Excel Sheet',
            html: '<p>Hi Rakesh, please find the attached Excel sheet containing all the user tracking data from your Telegram WebApp.</p>',
            attachments: [
                {
                    filename: 'Portfolio_Leads_Report.xlsx',
                    content: buffer.toString('base64'),
                    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                }
            ]
        });

        console.log('Excel Email sent successfully! 🚀');
    } catch (error) {
        console.error('Error exporting Excel:', error);
    }
}