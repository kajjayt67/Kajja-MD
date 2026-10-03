const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, downloadContentFromMessage } = require('@whiskeysockets/baileys');
const pino = require('pino');
const axios = require('axios');

const BOT_NAME = "Kajja MD";
const PREFIX = ".";
const PHONE_NUMBER = "94716029694";
const MENU_IMAGE_URL = "https://i.ibb.co/68X3p2q/kajja-md.jpg"; 

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
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || "";

        if (!body.startsWith(PREFIX)) return;

        const args = body.slice(PREFIX.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        const text = args.join(" ");

        // 🖼️ MENU COMMAND
        if (command === 'menu' || command === 'help') {
            const menuText = `
*━━━━━━[ 🤖 ${BOT_NAME} 🤖 ]━━━━━━*

👋 *ආයුබෝවන්! Kajja MD සිංහල Bot වෙත සාදරයෙන් පිළිගනිමු!*

📌 *මුලික විධානයන් (General):*
🔹 \`${PREFIX}ping\` - Botගේ වේගය පරීක්ෂාව
🔹 \`${PREFIX}alive\` - Bot සක්‍රියදැයි බලන්න
🔹 \`${PREFIX}හලෝ\` - Bot සමඟ කතා කිරීමට

📥 *බාගත කිරීම් (Downloaders):*
🔹 \`${PREFIX}song <නම/Link>\` - YouTube Audio බාගත කරන්න
🔹 \`${PREFIX}video <නම/Link>\` - YouTube Video බාගත කරන්න
🔹 \`${PREFIX}tiktok <Link>\` - TikTok Videos බාගත කරන්න
🔹 \`${PREFIX}fb <Link>\` - Facebook Videos බාගත කරන්න

🎨 *වෙනත් (Tools):*
🔹 \`${PREFIX}sticker\` - Photo එකක් Sticker එකක් කරන්න (Reply to photo)

*━━━━━━[ ${BOT_NAME} ]━━━━━━*
`;
            await sock.sendMessage(from, { image: { url: MENU_IMAGE_URL }, caption: menuText }, { quoted: msg });
        } 

        // ⚡ PING COMMAND
        else if (command === 'ping') {
            await sock.sendMessage(from, { text: '⚡ *Kajja MD ඉතාම වේගයෙන් වැඩ කරයි!*' }, { quoted: msg });
        } 

        // 🤖 ALIVE COMMAND
        else if (command === 'alive') {
            await sock.sendMessage(from, { text: '🤖 *මම Kajja MD Bot, දැනට සක්‍රියව පවතී!*' }, { quoted: msg });
        } 

        // 👋 HELLO COMMAND
        else if (command === 'හලෝ' || command === 'hello') {
            await sock.sendMessage(from, { text: 'ආයුබෝවන්! මම Kajja MD. ඔබට උදව් කරන්නේ කෙසේද?' }, { quoted: msg });
        }

        // 🎵 YOUTUBE SONG DOWNLOADER
        else if (command === 'song' || command === 'ytmp3') {
            if (!text) return await sock.sendMessage(from, { text: '⚠️ කරුණාකර සිංදුවේ නම හෝ YouTube Link එකක් ලබාදෙන්න.\n*උදා:* `.song karandula`' }, { quoted: msg });
            await sock.sendMessage(from, { text: '📥 *ඔබගේ සින්දුව ඩවුන්ලෝඩ් වෙමින් පවතී, කරුණාකර රැඳී සිටින්න...*' }, { quoted: msg });
            try {
                const res = await axios.get(`https://api.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(text)}`);
                if (res.data && res.data.result && res.data.result.download_url) {
                    await sock.sendMessage(from, { audio: { url: res.data.result.download_url }, mimetype: 'audio/mp4' }, { quoted: msg });
                } else {
                    await sock.sendMessage(from, { text: '❌ සින්දුව ලබාගැනීමට නොහැකි විය.' }, { quoted: msg });
                }
            } catch (e) {
                await sock.sendMessage(from, { text: '❌ දෝෂයක් සිදු විය. කරුණාකර පසුව නැවත උත්සාහ කරන්න.' }, { quoted: msg });
            }
        }

        // 📹 YOUTUBE VIDEO DOWNLOADER
        else if (command === 'video' || command === 'ytmp4') {
            if (!text) return await sock.sendMessage(from, { text: '⚠️ කරුණාකර වීඩියෝවේ නම හෝ YouTube Link එකක් ලබාදෙන්න.' }, { quoted: msg });
            await sock.sendMessage(from, { text: '📥 *ඔබගේ වීඩියෝව ඩවුන්ලෝඩ් වෙමින් පවතී...*' }, { quoted: msg });
            try {
                const res = await axios.get(`https://api.davidcyriltech.my.id/download/ytmp4?url=${encodeURIComponent(text)}`);
                if (res.data && res.data.result && res.data.result.download_url) {
                    await sock.sendMessage(from, { video: { url: res.data.result.download_url }, caption: '🎬 *Kajja MD Video Downloader*' }, { quoted: msg });
                } else {
                    await sock.sendMessage(from, { text: '❌ වීඩියෝව ලබාගැනීමට නොහැකි විය.' }, { quoted: msg });
                }
            } catch (e) {
                await sock.sendMessage(from, { text: '❌ දෝෂයක් සිදු විය.' }, { quoted: msg });
            }
        }

        // 🎵 TIKTOK DOWNLOADER
        else if (command === 'tiktok') {
            if (!text) return await sock.sendMessage(from, { text: '⚠️ කරුණාකර TikTok Link එකක් ඇතුළත් කරන්න.' }, { quoted: msg });
            await sock.sendMessage(from, { text: '📥 *TikTok Video එක බාගත වෙමින් පවතී...*' }, { quoted: msg });
            try {
                const res = await axios.get(`https://api.davidcyriltech.my.id/download/tiktok?url=${encodeURIComponent(text)}`);
                if (res.data && res.data.result && res.data.result.video) {
                    await sock.sendMessage(from, { video: { url: res.data.result.video }, caption: '🎵 *Kajja MD TikTok Downloader*' }, { quoted: msg });
                } else {
                    await sock.sendMessage(from, { text: '❌ TikTok වීඩියෝව හමු නොවීය.' }, { quoted: msg });
                }
            } catch (e) {
                await sock.sendMessage(from, { text: '❌ දෝෂයක් සිදු විය.' }, { quoted: msg });
            }
        }

        // 📘 FACEBOOK DOWNLOADER
        else if (command === 'fb' || command === 'facebook') {
            if (!text) return await sock.sendMessage(from, { text: '⚠️ කරුණාකර Facebook Video Link එකක් ලබාදෙන්න.' }, { quoted: msg });
            await sock.sendMessage(from, { text: '📥 *Facebook Video එක බාගත වෙමින් පවතී...*' }, { quoted: msg });
            try {
                const res = await axios.get(`https://api.davidcyriltech.my.id/download/facebook?url=${encodeURIComponent(text)}`);
                if (res.data && res.data.result && (res.data.result.hd || res.data.result.sd)) {
                    const videoUrl = res.data.result.hd || res.data.result.sd;
                    await sock.sendMessage(from, { video: { url: videoUrl }, caption: '📘 *Kajja MD Facebook Downloader*' }, { quoted: msg });
                } else {
                    await sock.sendMessage(from, { text: '❌ Facebook වීඩියෝව හමු නොවීය.' }, { quoted: msg });
                }
            } catch (e) {
                await sock.sendMessage(from, { text: '❌ දෝෂයක් සිදු විය.' }, { quoted: msg });
            }
        }
    });
}

startBot();
