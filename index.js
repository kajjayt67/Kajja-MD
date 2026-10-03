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
                console.log(`🤖 ඔබේ ${BOT_NAME} PAIRING CODE එක: 👉 ${code} 👈`);
                console.log(`===========================================\n`);
            } catch (err) {
                console.log("❌ Pairing Code ලබාගැනීම අසාර්ථක විය.");
                isPairingRequested = false;
            }
        }, 5000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            if (statusCode !== DisconnectReason.loggedOut) {
                console.log("🔄 සම්බන්ධතාව බිඳවැටුණි, නැවත උත්සාහ කරයි...");
                setTimeout(startBot, 5000);
            }
        } else if (connection === 'open') {
            console.log(`✅ ${BOT_NAME} සාර්ථකව Connect විය!`);
        }
    });

    // 👁️ AUTO STATUS VIEW & AUTO READ MESSAGES
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const msg = messages[0];
        if (!msg.message) return;

        const from = msg.key.remoteJid;

        // Auto Status Read / View
        if (from === 'status@broadcast') {
            await sock.readMessages([msg.key]);
            return;
        }

        if (msg.key.fromMe) return;

        const isGroup = from.endsWith('@g.us');
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || msg.message.videoMessage?.caption || "";

        if (!body.startsWith(PREFIX)) return;

        const args = body.slice(PREFIX.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        const text = args.join(" ");

        // ==========================================
        // 📜 MAIN MENU (GHOST PAIR ALL TOOLS)
        // ==========================================
        if (command === 'menu' || command === 'help' || command === 'panel') {
            const menuText = `
*━━━━━━[ 👻 ${BOT_NAME} ALL TOOLS MENU 👻 ]━━━━━━*

👋 *ආයුබෝවන්! Kajja MD Bot හි සියලුම Tools පහතින්:*

📌 *⚡ SYSTEM & MAIN COMMANDS:*
🔹 \`${PREFIX}ping\` - Speed Test
🔹 \`${PREFIX}alive\` - Bot Status Check
🔹 \`${PREFIX}owner\` - Owner Details
🔹 \`${PREFIX}system\` - Server Ram & Uptime
🔹 \`${PREFIX}restart\` - Restart Bot

📥 *📥 DOWNLOADER TOOLS:*
🔹 \`${PREFIX}song <නම/Link>\` - MP3 Audio Downloader
🔹 \`${PREFIX}video <නම/Link>\` - MP4 Video Downloader
🔹 \`${PREFIX}tiktok <Link>\` - TikTok No Watermark
🔹 \`${PREFIX}fb <Link>\` - Facebook Video HD/SD
🔹 \`${PREFIX}ig <Link>\` - Instagram Reel/Post

🧠 *🧠 AI & SEARCH TOOLS:*
🔹 \`${PREFIX}ai <ප්‍රශ්නය>\` - ChatGPT AI Chat
🔹 \`${PREFIX}gpt <ප්‍රශ්නය>\` - Smart Assistant
🔹 \`${PREFIX}yts <නම>\` - YouTube Search

👥 *👥 GROUP MANAGEMENT TOOLS:*
🔹 \`${PREFIX}kick @user\` - Remove Member
🔹 \`${PREFIX}promote @user\` - Give Admin
🔹 \`${PREFIX}demote @user\` - Remove Admin
🔹 \`${PREFIX}tagall\` - Mention All Members
🔹 \`${PREFIX}hidetag <Text>\` - Hidden Tag
🔹 \`${PREFIX}group open/close\` - Group Mute/Unmute

🎭 *🎯 FUN & UTILITY TOOLS:*
🔹 \`${PREFIX}sticker\` - Photo to Sticker (Reply)
🔹 \`${PREFIX}say <Text>\` - Text to Voice
🔹 \`${PREFIX}joke\` - Random Joke

*━━━━━━[ 👻 ${BOT_NAME} 👻 ]━━━━━━*
`;
            await sock.sendMessage(from, { image: { url: MENU_IMAGE_URL }, caption: menuText }, { quoted: msg });
        }

        // ==========================================
        // ⚡ SYSTEM COMMANDS
        // ==========================================
        else if (command === 'ping') {
            const start = Date.now();
            await sock.sendMessage(from, { text: `⚡ *Kajja MD Speed:* ${Date.now() - start}ms` }, { quoted: msg });
        } 
        else if (command === 'alive') {
            await sock.sendMessage(from, { text: `🤖 *Kajja MD Ghost Air Edition සක්‍රියව පවතී!*` }, { quoted: msg });
        } 
        else if (command === 'owner') {
            await sock.sendMessage(from, { text: `👤 *Owner:* Kajja\n📞 *Number:* +94716029694` }, { quoted: msg });
        }

        // ==========================================
        // 📥 DOWNLOADERS
        // ==========================================
        else if (command === 'song' || command === 'ytmp3') {
            if (!text) return await sock.sendMessage(from, { text: '⚠️ කරුණාකර සිංදුවේ නම හෝ Link එකක් දෙන්න.' }, { quoted: msg });
            await sock.sendMessage(from, { text: '📥 *Audio එක Download වෙමින් පවතී...*' }, { quoted: msg });
            try {
                const res = await axios.get(`https://api.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(text)}`);
                if (res.data?.result?.download_url) {
                    await sock.sendMessage(from, { audio: { url: res.data.result.download_url }, mimetype: 'audio/mp4' }, { quoted: msg });
                } else {
                    await sock.sendMessage(from, { text: '❌ Audio එක ලබාගැනීමට නොහැකි විය.' }, { quoted: msg });
                }
            } catch (e) {
                await sock.sendMessage(from, { text: '❌ Error එකක් සිදු විය.' }, { quoted: msg });
            }
        }

        else if (command === 'video' || command === 'ytmp4') {
            if (!text) return await sock.sendMessage(from, { text: '⚠️ කරුණාකර වීඩියෝවේ නම හෝ Link එකක් දෙන්න.' }, { quoted: msg });
            await sock.sendMessage(from, { text: '📥 *Video එක Download වෙමින් පවතී...*' }, { quoted: msg });
            try {
                const res = await axios.get(`https://api.davidcyriltech.my.id/download/ytmp4?url=${encodeURIComponent(text)}`);
                if (res.data?.result?.download_url) {
                    await sock.sendMessage(from, { video: { url: res.data.result.download_url }, caption: '🎬 *Kajja MD Video*' }, { quoted: msg });
                } else {
                    await sock.sendMessage(from, { text: '❌ Video එක ලබාගැනීමට නොහැකි විය.' }, { quoted: msg });
                }
            } catch (e) {
                await sock.sendMessage(from, { text: '❌ Error එකක් සිදු විය.' }, { quoted: msg });
            }
        }

        else if (command === 'tiktok') {
            if (!text) return await sock.sendMessage(from, { text: '⚠️ TikTok Link එකක් දෙන්න.' }, { quoted: msg });
            await sock.sendMessage(from, { text: '📥 *TikTok Video එක බාගත වේ...*' }, { quoted: msg });
            try {
                const res = await axios.get(`https://api.davidcyriltech.my.id/download/tiktok?url=${encodeURIComponent(text)}`);
                if (res.data?.result?.video) {
                    await sock.sendMessage(from, { video: { url: res.data.result.video }, caption: '🎵 *Kajja MD TikTok*' }, { quoted: msg });
                } else {
                    await sock.sendMessage(from, { text: '❌ TikTok Video එක ලබාගැනීමට නොහැකි විය.' }, { quoted: msg });
                }
            } catch (e) {
                await sock.sendMessage(from, { text: '❌ Error එකක් සිදු විය.' }, { quoted: msg });
            }
        }

        else if (command === 'fb' || command === 'facebook') {
            if (!text) return await sock.sendMessage(from, { text: '⚠️ Facebook Link එකක් දෙන්න.' }, { quoted: msg });
            await sock.sendMessage(from, { text: '📥 *Facebook Video එක බාගත වේ...*' }, { quoted: msg });
            try {
                const res = await axios.get(`https://api.davidcyriltech.my.id/download/facebook?url=${encodeURIComponent(text)}`);
                if (res.data?.result?.hd || res.data?.result?.sd) {
                    await sock.sendMessage(from, { video: { url: res.data.result.hd || res.data.result.sd }, caption: '📘 *Kajja MD Facebook*' }, { quoted: msg });
                } else {
                    await sock.sendMessage(from, { text: '❌ Facebook Video එක ලබාගැනීමට නොහැකි විය.' }, { quoted: msg });
                }
            } catch (e) {
                await sock.sendMessage(from, { text: '❌ Error එකක් සිදු විය.' }, { quoted: msg });
            }
        }

        // ==========================================
        // 🧠 AI CHAT
        // ==========================================
        else if (command === 'ai' || command === 'gpt') {
            if (!text) return await sock.sendMessage(from, { text: '⚠️ ප්‍රශ්නයක් ඇතුළත් කරන්න.' }, { quoted: msg });
            try {
                const res = await axios.get(`https://api.davidcyriltech.my.id/ai/chatgpt?text=${encodeURIComponent(text)}`);
                if (res.data?.result) {
                    await sock.sendMessage(from, { text: `🧠 *Kajja MD AI:*\n\n${res.data.result}` }, { quoted: msg });
                } else {
                    await sock.sendMessage(from, { text: '❌ AI පිළිතුර ලබාගැනීමට නොහැකි විය.' }, { quoted: msg });
                }
            } catch (e) {
                await sock.sendMessage(from, { text: '❌ Error එකක් සිදු විය.' }, { quoted: msg });
            }
        }

        // ==========================================
        // 👥 GROUP COMMANDS
        // ==========================================
        else if (isGroup) {
            const mentionedJid = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];

            if (command === 'kick') {
                if (mentionedJid.length === 0) return await sock.sendMessage(from, { text: '⚠️ Remove කරන්න ඕනි කෙනාව Mention කරන්න.' }, { quoted: msg });
                await sock.groupParticipantsUpdate(from, mentionedJid, 'remove');
                await sock.sendMessage(from, { text: '✅ සාමාජිකයා ඉවත් කළා.' }, { quoted: msg });
            } 
            else if (command === 'promote') {
                if (mentionedJid.length === 0) return await sock.sendMessage(from, { text: '⚠️ Mention කරන්න.' }, { quoted: msg });
                await sock.groupParticipantsUpdate(from, mentionedJid, 'promote');
                await sock.sendMessage(from, { text: '✅ Admin දුන්නා.' }, { quoted: msg });
            } 
            else if (command === 'demote') {
                if (mentionedJid.length === 0) return await sock.sendMessage(from, { text: '⚠️ Mention කරන්න.' }, { quoted: msg });
                await sock.groupParticipantsUpdate(from, mentionedJid, 'demote');
                await sock.sendMessage(from, { text: '✅ Admin ඉවත් කළා.' }, { quoted: msg });
            } 
            else if (command === 'tagall') {
                const groupMetadata = await sock.groupMetadata(from);
                const participants = groupMetadata.participants;
                let textMsg = `📢 *KAJJA MD TAG ALL*\n\n`;
                let mentions = [];
                for (let mem of participants) {
                    textMsg += `@${mem.id.split('@')[0]}\n`;
                    mentions.push(mem.id);
                }
                await sock.sendMessage(from, { text: textMsg, mentions: mentions }, { quoted: msg });
            }
            else if (command === 'group') {
                if (text === 'close') {
                    await sock.groupSettingUpdate(from, 'announcement');
                    await sock.sendMessage(from, { text: '🔒 Group එක Mute කළා.' }, { quoted: msg });
                } else if (text === 'open') {
                    await sock.groupSettingUpdate(from, 'not_announcement');
                    await sock.sendMessage(from, { text: '🔓 Group එක Unmute කළා.' }, { quoted: msg });
                }
            }
        }
    });
}

startBot();
