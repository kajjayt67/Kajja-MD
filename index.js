const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const axios = require('axios');

const BOT_NAME = "Kajja MD";
const PREFIX = ".";
const PHONE_NUMBER = "94716029694";
const MENU_IMAGE_URL = "https://i.ibb.co/68X3p2q/kajja-md.jpg";

let isPairingRequested = false;

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('kajja_session');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    // 🔑 PAIRING CODE GENERATOR
    if (!sock.authState.creds.registered && !isPairingRequested) {
        isPairingRequested = true;
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(PHONE_NUMBER.trim());
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log(`\n===========================================`);
                console.log(`🤖 ඔබේ KAJJA MD PAIRING CODE එක: 👉 ${code} 👈`);
                console.log(`===========================================\n`);
            } catch (err) {
                console.log("❌ Pairing Code ලබාගැනීම අසාර්ථක විය: ", err?.message || err);
                isPairingRequested = false;
            }
        }, 10000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            if (statusCode !== DisconnectReason.loggedOut) {
                console.log("🔄 නැවත සම්බන්ධ වෙමින් පවතී...");
                setTimeout(startBot, 5000);
            }
        } else if (connection === 'open') {
            console.log(`✅ ${BOT_NAME} සාර්ථකව Connect විය!`);
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || "";

        if (!body.startsWith(PREFIX)) return;

        const command = body.slice(PREFIX.length).trim().split(/ +/)[0].toLowerCase();

        if (command === 'ping') {
            await sock.sendMessage(from, { text: '⚡ *Kajja MD Speed: Fast!*' }, { quoted: msg });
        } else if (command === 'alive') {
            await sock.sendMessage(from, { text: '🤖 *Kajja MD Bot සක්‍රියව පවතී!*' }, { quoted: msg });
        }
    });
}

startBot();
