const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');

const BOT_NAME = "Kajja MD";
const PREFIX = ".";
const PHONE_NUMBER = "94716029694";

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

    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(PHONE_NUMBER.trim());
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log(`\n===========================================`);
                console.log(`🤖 ඔබේ ${BOT_NAME} PAIRING CODE එක: 👉 ${code} 👈`);
                console.log(`===========================================\n`);
            } catch (err) {
                console.log("❌ Pairing Code එක ලබාගැනීමට නොහැකි විය.");
            }
        }, 3000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log(`🤖 ${BOT_NAME} සාර්ථකව Connect විය!`);
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

        if (!body.startsWith(PREFIX)) return;

        const command = body.slice(PREFIX.length).trim().split(/ +/).shift().toLowerCase();

        if (command === 'menu' || command === 'help') {
            const menuText = `
*━━━━━━[ 🤖 ${BOT_NAME} 🤖 ]━━━━━━*

👋 *ආයුබෝවන්! Kajja MD සිංහල Bot වෙත සාදරයෙන් පිළිගනිමු!*

📌 *ප්‍රධාන විධානයන් (Commands):*
🔹 \`${PREFIX}ping\` - Botගේ වේගය පරීක්ෂා කිරීමට
🔹 \`${PREFIX}alive\` - Bot සක්‍රියදැයි බලන්න
🔹 \`${PREFIX}හලෝ\` - Bot සමඟ කතා කිරීමට

*━━━━━━[ ${BOT_NAME} ]━━━━━━*
`;
            await sock.sendMessage(from, { text: menuText }, { quoted: msg });
        } else if (command === 'ping') {
            await sock.sendMessage(from, { text: '⚡ *Kajja MD ඉතාම වේගයෙන් වැඩ කරයි!*' }, { quoted: msg });
        } else if (command === 'alive') {
            await sock.sendMessage(from, { text: '🤖 *මම Kajja MD Bot, දැනට සක්‍රියව පවතී!*' }, { quoted: msg });
        } else if (command === 'හලෝ' || command === 'hello') {
            await sock.sendMessage(from, { text: 'ආයුබෝවන්! මම Kajja MD. ඔබට උදව් කරන්නේ කෙසේද?' }, { quoted: msg });
        }
    });
}

startBot();
