require('dotenv').config();
const express = require('express');
const { Telegraf, Markup } = require('telegraf');
const { Resend } = require('resend');
const PDFDocument = require('pdfkit');
const cors = require('cors');
const axios = require('axios');


const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const MY_EMAIL = process.env.MY_EMAIL || 'rakeshdaniel321@gmail.com';
const DEV_NAME = process.env.DEVELOPER_NAME || 'Rakesh Daniel';

if (!BOT_TOKEN) {
  console.error('FATAL ERROR: BOT_TOKEN is not defined in environment variables.');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const app = express();

app.use(cors());
app.use(express.json());
const sessions = new Map();
const historyLogs = new Map();

const PORTFOLIO_DATA = {
  about: `👋 Hello! I'm ${DEV_NAME}, a passionate Full-Stack Developer specializing in modern backend systems, APIs, and scalable web solutions.`,
  projects: `🚀 *Top Projects:*\n\n1. *Doc-Genie* - AI Powered Document Automation\n2. *Syntax Surgeon* - Code Debugger & Refactoring Tool\n3. *E-Commerce Engine* - Scalable Node.js Backend API`,
  skills: `💻 *Technical Skills:*\n\n• Backend: Node.js, Express.js, REST APIs\n• Frontend: React, JavaScript, HTML/CSS\n• Databases: MongoDB, PostgreSQL, Redis\n• DevOps & Tools: Git, Docker, Render, Vercel`,
  resume: `📄 *Professional Profile - ${DEV_NAME}*\n\n• *Education:* Bachelor of Computer Applications (BCA)\n• *Experience:* Full-Stack Web Development\n• *GitHub:* https://github.com\n• *LinkedIn:* https://linkedin.com\n• *Portfolio:* https://example.com\n• *Email:* contact@example.com\n• *Phone:* +91 9876543210`,
  contact: `📞 *Contact Information:*\n\nFeel free to reach out via Email or LinkedIn!\n\n📧 Email: contact@example.com\n🌐 Website: https://example.com`
};


const QUIZ_QUESTIONS = [
  {
    question: "1. What is the capital of Tamil Nadu?",
    options: ["Madurai", "Chennai", "Coimbatore", "Trichy"],
    correct: 1,
    explanation: "Chennai is the capital city of Tamil Nadu."
  },
  {
    question: "2. Which city is known as the 'Rice Bowl of Tamil Nadu'?",
    options: ["Thanjavur", "Salem", "Tirunelveli", "Erode"],
    correct: 0,
    explanation: "Thanjavur is famous for its rich agricultural yield of rice."
  },
  {
    question: "3. Which is the official language of Tamil Nadu?",
    options: ["Telugu", "Malayalam", "Tamil", "Kannada"],
    correct: 2,
    explanation: "Tamil is the official language spoken in Tamil Nadu."
  },
  {
    question: "4. Which state borders Tamil Nadu to the west?",
    options: ["Andhra Pradesh", "Kerala", "Karnataka", "Odisha"],
    correct: 1,
    explanation: "Kerala shares the western border with Tamil Nadu."
  },
  {
    question: "5. What is the state animal of Tamil Nadu?",
    options: ["Nilgiri Tahr", "Indian Elephant", "Bengal Tiger", "Sambar Deer"],
    correct: 0,
    explanation: "The Nilgiri Tahr is the state animal of Tamil Nadu."
  }
];

function getOrCreateSession(ctx) {
  const userId = ctx.from.id;
  if (!sessions.has(userId)) {
    sessions.set(userId, {
      sessionId: `SESS-${userId}-${Date.now()}`,
      telegramId: userId,
      username: ctx.from.username || 'N/A',
      name: '',
      birthday: '',
      age: 0,
      city: '',
      step: 'START',
      quizIndex: 0,
      quizScore: 0,
      correctCount: 0,
      wrongCount: 0,
      quizAnswers: [],
      status: 'In Progress'
    });
    historyLogs.set(userId, []);
  }
  return sessions.get(userId);
}

function logMessage(userId, sender, text) {
  if (!historyLogs.has(userId)) {
    historyLogs.set(userId, []);
  }
  historyLogs.get(userId).push({
    timestamp: new Date().toISOString(),
    sender: sender,
    message: text
  });
}

function calculateAge(birthDateString) {
  const parts = birthDateString.split('-');
  if (parts.length !== 3) return 0;
  const birthDate = new Date(parts[0], parts[1] - 1, parts[2]);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age > 0 ? age : 0;
}


function showMainMenu(ctx) {
  return ctx.reply(
    `✨ *Main Menu*\nChoose an option below to explore:`,
    {
      parse_mode: 'Markdown',
      ...Markup.keyboard([
        ['👨 About Me', '🚀 Projects'],
        ['💻 Skills', '📄 Resume'],
        ['📞 Contact', '🧩 Start TN Quiz']
      ]).resize()
    }
  );
}


bot.start(async (ctx) => {
  const session = getOrCreateSession(ctx);
  session.step = 'AWAITING_NAME';
  
  const welcomeText = `Hi 👋\nI'm ${DEV_NAME}'s AI Portfolio Assistant.\n\nTo get started, please tell me **your full name**:`;
  logMessage(ctx.from.id, 'Bot', welcomeText);
  await ctx.reply(welcomeText, { parse_mode: 'Markdown' });
});

bot.on('text', async (ctx, next) => {
  const text = ctx.message.text;
  const userId = ctx.from.id;
  const session = sessions.get(userId);

  logMessage(userId, 'User', text);

  if (!session || session.step === 'COMPLETED') {
    return handleMenuButtons(ctx, text);
  }

  // Onboarding Step 1: Name
  if (session.step === 'AWAITING_NAME') {
    session.name = text;
    session.step = 'AWAITING_BIRTHDAY';
    const replyMsg = `Nice to meet you, ${text}! 😊\n\nPlease enter your Birthday in **YYYY-MM-DD** format (e.g., 2000-05-15):`;
    logMessage(userId, 'Bot', replyMsg);
    return ctx.reply(replyMsg, { parse_mode: 'Markdown' });
  }

  // Onboarding Step 2: Birthday
  if (session.step === 'AWAITING_BIRTHDAY') {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(text)) {
      const errText = `⚠️ Invalid format! Please enter date as **YYYY-MM-DD** (e.g., 2000-05-15):`;
      logMessage(userId, 'Bot', errText);
      return ctx.reply(errText, { parse_mode: 'Markdown' });
    }
    session.birthday = text;
    session.age = calculateAge(text);
    session.step = 'AWAITING_CITY';

    const replyMsg = `Got it! You are ${session.age} years old. 🎂\n\nWhich city are you currently living in?`;
    logMessage(userId, 'Bot', replyMsg);
    return ctx.reply(replyMsg, { parse_mode: 'Markdown' });
  }

  // Onboarding Step 3: City
  if (session.step === 'AWAITING_CITY') {
    session.city = text;
    session.step = 'COMPLETED';

    const replyMsg = `Awesome! Profile updated successfully. 🎉\nFeel free to explore the options below!`;
    logMessage(userId, 'Bot', replyMsg);
    await ctx.reply(replyMsg);
    return showMainMenu(ctx);
  }

  return handleMenuButtons(ctx, text);
});

// Handle Dynamic Menu Commands
async function handleMenuButtons(ctx, text) {
  const userId = ctx.from.id;

  switch (text) {
    case '👨 About Me':
      logMessage(userId, 'Bot', PORTFOLIO_DATA.about);
      return ctx.reply(PORTFOLIO_DATA.about, { parse_mode: 'Markdown' });

    case '🚀 Projects':
      logMessage(userId, 'Bot', PORTFOLIO_DATA.projects);
      return ctx.reply(PORTFOLIO_DATA.projects, { parse_mode: 'Markdown' });

    case '💻 Skills':
      logMessage(userId, 'Bot', PORTFOLIO_DATA.skills);
      return ctx.reply(PORTFOLIO_DATA.skills, { parse_mode: 'Markdown' });

    case '📄 Resume':
      logMessage(userId, 'Bot', PORTFOLIO_DATA.resume);
      return ctx.reply(PORTFOLIO_DATA.resume, { parse_mode: 'Markdown' });

    case '📞 Contact':
      logMessage(userId, 'Bot', PORTFOLIO_DATA.contact);
      return ctx.reply(PORTFOLIO_DATA.contact, { parse_mode: 'Markdown' });

    case '🧩 Start TN Quiz':
      return startQuiz(ctx);

    default:
      return;
  }
}

async function startQuiz(ctx) {
  const session = getOrCreateSession(ctx);
  session.quizIndex = 0;
  session.quizScore = 0;
  session.correctCount = 0;
  session.wrongCount = 0;
  session.quizAnswers = [];
  
  await ctx.reply(`🏆 *Welcome to the Tamil Nadu Quiz!* 🏆\nAnswer 5 simple questions:`, { parse_mode: 'Markdown' });
  return sendQuizQuestion(ctx);
}

async function sendQuizQuestion(ctx) {
  const session = getOrCreateSession(ctx);
  const qIndex = session.quizIndex;
  const qData = QUIZ_QUESTIONS[qIndex];

  const buttons = qData.options.map((opt, idx) => [
    Markup.button.callback(opt, `quiz_ans_${idx}`)
  ]);

  const msg = await ctx.reply(`*Question ${qIndex + 1}/5:*\n${qData.question}`, Markup.inlineKeyboard(buttons));
  logMessage(ctx.from.id, 'Bot', qData.question);
}

bot.action(/^quiz_ans_(\d+)$/, async (ctx) => {
  const selectedIdx = parseInt(ctx.match[1]);
  const session = getOrCreateSession(ctx);
  const qIndex = session.quizIndex;
  const qData = QUIZ_QUESTIONS[qIndex];

  await ctx.answerCbQuery();

  let responseMsg = '';
  if (selectedIdx === qData.correct) {
    session.quizScore += 20;
    session.correctCount++;
    responseMsg = `✅ *Correct & Excellent!* 🎉\n\n💡 _${qData.explanation}_`;
  } else {
    session.wrongCount++;
    responseMsg = `❌ *Wrong Answer!*\n\n✔ *Correct Answer:* ${qData.options[qData.correct]}\n💡 _${qData.explanation}_`;
  }

  session.quizAnswers.push({
    question: qData.question,
    selected: qData.options[selectedIdx],
    correct: qData.options[qData.correct]
  });

  logMessage(ctx.from.id, 'Bot', responseMsg);
  await ctx.reply(responseMsg, { parse_mode: 'Markdown' });

  session.quizIndex++;

  if (session.quizIndex < QUIZ_QUESTIONS.length) {
    return sendQuizQuestion(ctx);
  } else {
    return finishQuizAndProcess(ctx);
  }
});

async function finishQuizAndProcess(ctx) {
  const session = getOrCreateSession(ctx);
  session.status = 'Completed';

  const summary = `🎉 *Quiz Completed!*\n\n📊 *Your Results:*\n• Final Score: ${session.quizScore}/100\n• Correct Answers: ${session.correctCount}\n• Wrong Answers: ${session.wrongCount}\n\n📄 *Generating session PDF and sending report to host...*`;
  logMessage(ctx.from.id, 'Bot', summary);
  await ctx.reply(summary, { parse_mode: 'Markdown' });

  // Generate PDF Buffer
  const pdfBuffer = await generatePDFReport(session, historyLogs.get(ctx.from.id) || []);

  // Send Email via Resend
  await sendReportEmail(session, pdfBuffer);

  return ctx.reply(`✅ *All done!* Check your main menu anytime.`, { parse_mode: 'Markdown' });
}

function generatePDFReport(session, logs) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    let buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });

    // Title
    doc.fontSize(20).fillColor('#1E293B').text('Portfolio Bot Session Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#64748B').text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(1.5);

    // User Details Table Section
    doc.fontSize(14).fillColor('#0F172A').text('User Profile & Session Information');
    doc.text('--------------------------------------------------');
    doc.fontSize(10).fillColor('#334155');
    doc.text(`Session ID   : ${session.sessionId}`);
    doc.text(`Telegram ID  : ${session.telegramId}`);
    doc.text(`Username     : @${session.username}`);
    doc.text(`Name         : ${session.name || 'N/A'}`);
    doc.text(`Birthday     : ${session.birthday || 'N/A'}`);
    doc.text(`Age          : ${session.age}`);
    doc.text(`City         : ${session.city || 'N/A'}`);
    doc.text(`Status       : ${session.status}`);
    doc.moveDown(1.5);

    // Quiz Score Section
    doc.fontSize(14).fillColor('#0F172A').text('Tamil Nadu Quiz Performance');
    doc.text('--------------------------------------------------');
    doc.fontSize(10).fillColor('#334155');
    doc.text(`Final Score  : ${session.quizScore} / 100`);
    doc.text(`Correct      : ${session.correctCount}`);
    doc.text(`Wrong        : ${session.wrongCount}`);
    doc.moveDown(1.5);

    // Conversation History Section
    doc.fontSize(14).fillColor('#0F172A').text('Conversation Logs');
    doc.text('--------------------------------------------------');
    doc.moveDown(0.5);

    logs.forEach((log) => {
      doc.fontSize(9).fillColor('#475569').text(`[${log.timestamp.slice(11, 19)}] ${log.sender}: ${log.message}`);
    });

    doc.end();
  });
}


async function sendReportEmail(session, pdfBuffer) {
  if (!resend) {
    console.log('⚠️ Resend API Key missing. Skipping email dispatch.');
    return;
  }

  try {
    await resend.emails.send({
      from: 'Portfolio Assistant <onboarding@resend.dev>',
      to: [MY_EMAIL],
      subject: `📥 New Portfolio Visitor: ${session.name || 'Anonymous'} (@${session.username})`,
      html: `
        <h2>New Visitor Report</h2>
        <p><strong>Name:</strong> ${session.name}</p>
        <p><strong>City:</strong> ${session.city}</p>
        <p><strong>Age:</strong> ${session.age}</p>
        <p><strong>Quiz Score:</strong> ${session.quizScore}/100</p>
        <p>Please find the attached PDF report for full interaction logs.</p>
      `,
      attachments: [
        {
          filename: `Session_Report_${session.telegramId}.pdf`,
          content: pdfBuffer
        }
      ]
    });
    console.log(`✉️ Email report sent successfully for user: ${session.telegramId}`);
  } catch (err) {
    console.error('❌ Error sending email via Resend:', err.message);
  }
}


app.get('/', (req, res) => {
  res.status(200).json({
    status: 'Online',
    bot: 'Active',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Self Ping / Keep Alive Mechanism (Prevent Render/Vercel sleep)
const SERVER_URL = process.env.RENDER_EXTERNAL_URL;
if (SERVER_URL) {
  setInterval(() => {
    axios.get(`${SERVER_URL}/health`)
      .then(() => console.log('🔄 Keep-alive ping successful.'))
      .catch((err) => console.error('❌ Keep-alive ping failed:', err.message));
  }, 10 * 60 * 1000); // Ping every 10 minutes
}

// Launch Express Server & Telegraf Bot
app.listen(PORT, () => {
  console.log(`🚀 Express Server listening on port ${PORT}`);
  bot.launch()
    .then(() => console.log('🤖 Telegram Bot started successfully!'))
    .catch((err) => console.error('❌ Bot Launch Error:', err));
});

// Graceful Shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));