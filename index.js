const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
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
        const isGroup = from.endsWith('@g.us');
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || "";

        if (!body.startsWith(PREFIX)) return;

        const args = body.slice(PREFIX.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        const text = args.join(" ");

        // 🖼️ MENU COMMAND
        if (command === 'menu' || command === 'help') {
            const menuText = `
*━━━━━━[ 🤖 ${BOT_NAME} 🤖 ]━━━━━━*

👋 *ආයුබෝවන්! Kajja MD Bot වෙත සාදරයෙන් පිළිගනිමු!*

📌 *සාමාන්‍ය (General):*
🔹 \`${PREFIX}ping\` - Speed Test
🔹 \`${PREFIX}alive\` - Online Status
🔹 \`${PREFIX}හලෝ\` - Greetings

📥 *බාගත කිරීම් (Downloaders):*
🔹 \`${PREFIX}song <නම/Link>\` - YouTube Audio Download
🔹 \`${PREFIX}video <නම/Link>\` - YouTube Video Download
🔹 \`${PREFIX}tiktok <Link>\` - TikTok No Watermark
🔹 \`${PREFIX}fb <Link>\` - Facebook Video Download

🧠 *कृත්‍රිම බුද්ධිය (AI):*
🔹 \`${PREFIX}ai <ප්‍රශ්නය>\` - ChatGPT AI පිළිතුරු

👥 *Group Admin Commands:*
🔹 \`${PREFIX}kick @user\` - සාමාජිකයින් ඉවත් කිරීම
🔹 \`${PREFIX}promote @user\` - Admin තනතුර දීම
🔹 \`${PREFIX}demote @user\` - Admin තනතුර ඉවත් කිරීම
🔹 \`${PREFIX}tagall\` - Group එකේ හැමෝම Tag කිරීම

*━━━━━━[ ${BOT_NAME} ]━━━━━━*
`;
            await sock.sendMessage(from, { image: { url: MENU_IMAGE_URL }, caption: menuText }, { quoted: msg });
        } 

        // ⚡ PING & ALIVE & HELLO
        else if (command === 'ping') {
            await sock.sendMessage(from, { text: '⚡ *Kajja MD Speed: Super Fast!*' }, { quoted: msg });
        } 
        else if (command === 'alive') {
            await sock.sendMessage(from, { text: '🤖 *Kajja MD Bot සක්‍රියව පවතී!*' }, { quoted: msg });
        } 
        else if (command === 'හලෝ' || command === 'hello') {
            await sock.sendMessage(from, { text: 'ආයුබෝවන්! මම Kajja MD Bot. ඔබට උදව් කරන්නේ කෙසේද?' }, { quoted: msg });
        }

        // 🎵 YOUTUBE SONG
        else if (command === 'song' || command === 'ytmp3') {
            if (!text) return await sock.sendMessage(from, { text: '⚠️ කරුණාකර සිංදුවේ නම හෝ Link එකක් ලබාදෙන්න.' }, { quoted: msg });
            await sock.sendMessage(from, { text: '📥 *සිංදුව බාගත වෙමින් පවතී...*' }, { quoted: msg });
            try {
                const res = await axios.get(`https://api.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(text)}`);
                if (res.data?.result?.download_url) {
                    await sock.sendMessage(from, { audio: { url: res.data.result.download_url }, mimetype: 'audio/mp4' }, { quoted: msg });
                } else {
                    await sock.sendMessage(from, { text: '❌ සිංදුව ලබාගැනීමට නොහැකි විය.' }, { quoted: msg });
                }
            } catch (e) {
                await sock.sendMessage(from, { text: '❌ දෝෂයක් සිදු විය.' }, { quoted: msg });
            }
        }

        // 📹 YOUTUBE VIDEO
        else if (command === 'video' || command === 'ytmp4') {
            if (!text) return await sock.sendMessage(from, { text: '⚠️ කරුණාකර වීඩියෝවේ නම හෝ Link එකක් ලබාදෙන්න.' }, { quoted: msg });
            await sock.sendMessage(from, { text: '📥 *වීඩියෝව බාගත වෙමින් පවතී...*' }, { quoted: msg });
            try {
                const res = await axios.get(`https://api.davidcyriltech.my.id/download/ytmp4?url=${encodeURIComponent(text)}`);
                if (res.data?.result?.download_url) {
                    await sock.sendMessage(from, { video: { url: res.data.result.download_url }, caption: '🎬 *Kajja MD Video*' }, { quoted: msg });
                } else {
                    await sock.sendMessage(from, { text: '❌ වීඩියෝව ලබාගැනීමට නොහැකි විය.' }, { quoted: msg });
                }
            } catch (e) {
                await sock.sendMessage(from, { text: '❌ දෝෂයක් සිදු විය.' }, { quoted: msg });
            }
        }

        // 🎵 TIKTOK DOWNLOADER
        else if (command === 'tiktok') {
            if (!text) return await sock.sendMessage(from, { text: '⚠️ කරුණාකර TikTok Link එකක් ලබාදෙන්න.' }, { quoted: msg });
            await sock.sendMessage(from, { text: '📥 *TikTok Video එක බාගත වෙමින් පවතී...*' }, { quoted: msg });
            try {
                const res = await axios.get(`https://api.davidcyriltech.my.id/download/tiktok?url=${encodeURIComponent(text)}`);
                if (res.data?.result?.video) {
                    await sock.sendMessage(from, { video: { url: res.data.result.video }, caption: '🎵 *Kajja MD TikTok*' }, { quoted: msg });
                } else {
                    await sock.sendMessage(from, { text: '❌ TikTok Video එක ලබාගැනීමට නොහැකි විය.' }, { quoted: msg });
                }
            } catch (e) {
                await sock.sendMessage(from, { text: '❌ දෝෂයක් සිදු විය.' }, { quoted: msg });
            }
        }

        // 📘 FACEBOOK DOWNLOADER
        else if (command === 'fb' || command === 'facebook') {
            if (!text) return await sock.sendMessage(from, { text: '⚠️ කරුණාකර Facebook Link එකක් ලබාදෙන්න.' }, { quoted: msg });
            await sock.sendMessage(from, { text: '📥 *Facebook Video එක බාගත වෙමින් පවතී...*' }, { quoted: msg });
            try {
                const res = await axios.get(`https://api.davidcyriltech.my.id/download/facebook?url=${encodeURIComponent(text)}`);
                if (res.data?.result?.hd || res.data?.result?.sd) {
                    const videoUrl = res.data.result.hd || res.data.result.sd;
                    await sock.sendMessage(from, { video: { url: videoUrl }, caption: '📘 *Kajja MD Facebook*' }, { quoted: msg });
                } else {
                    await sock.sendMessage(from, { text: '❌ Facebook Video එක ලබාගැනීමට නොහැකි විය.' }, { quoted: msg });
                }
            } catch (e) {
                await sock.sendMessage(from, { text: '❌ දෝෂයක් සිදු විය.' }, { quoted: msg });
            }
        }

        // 🧠 AI CHATGPT COMMAND
        else if (command === 'ai' || command === 'gpt') {
            if (!text) return await sock.sendMessage(from, { text: '⚠ කරුණාකර ප්‍රශ්නයක් ඇතුළත් කරන්න.' }, { quoted: msg });
            try {
                const res = await axios.get(`https://api.davidcyriltech.my.id/ai/chatgpt?text=${encodeURIComponent(text)}`);
                if (res.data?.result) {
                    await sock.sendMessage(from, { text: `🧠 *Kajja MD AI:*\n\n${res.data.result}` }, { quoted: msg });
                } else {
                    await sock.sendMessage(from, { text: '❌ AI පිළිතුර ලබාගැනීමට නොහැකි විය.' }, { quoted: msg });
                }
            } catch (e) {
                await sock.sendMessage(from, { text: '❌ දෝෂයක් සිදු විය.' }, { quoted: msg });
            }
        }

        // 👥 GROUP COMMANDS
        else if (isGroup) {
            const mentionedJid = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];

            if (command === 'kick') {
                if (mentionedJid.length === 0) return await sock.sendMessage(from, { text: '⚠️ ඉවත් කිරීමට අවශ්‍ය අයව Mention කරන්න.' }, { quoted: msg });
                await sock.groupParticipantsUpdate(from, mentionedJid, 'remove');
                await sock.sendMessage(from, { text: '✅ සාමාජිකයා ඉවත් කරන ලදී.' }, { quoted: msg });
            } 
            else if (command === 'promote') {
                if (mentionedJid.length === 0) return await sock.sendMessage(from, { text: '⚠️ Mention කරන්න.' }, { quoted: msg });
                await sock.groupParticipantsUpdate(from, mentionedJid, 'promote');
                await sock.sendMessage(from, { text: '✅ Admin තනතුර ලබාදුන්නා.' }, { quoted: msg });
            } 
            else if (command === 'demote') {
                if (mentionedJid.length === 0) return await sock.sendMessage(from, { text: '⚠️ Mention කරන්න.' }, { quoted: msg });
                await sock.groupParticipantsUpdate(from, mentionedJid, 'demote');
                await sock.sendMessage(from, { text: '✅ Admin තනතුර ඉවත් කළා.' }, { quoted: msg });
            } 
            else if (command === 'tagall') {
                const groupMetadata = await sock.groupMetadata(from);
                const participants = groupMetadata.participants;
                let textMsg = `📢 *KAJJA MD GROUP TAG ALL*\n\n`;
                let mentions = [];
                for (let mem of participants) {
                    textMsg += `@${mem.id.split('@')[0]}\n`;
                    mentions.push(mem.id);
                }
                await sock.sendMessage(from, { text: textMsg, mentions: mentions }, { quoted: msg });
            }
        }
    });
}

startBot();
