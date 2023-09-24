'use strict';

import kill from "tree-kill-promise"
import space_create from "./tool_module/space_create.js";
import ytdlStop from './tool_module/yotubedl_stop.js';
import twitchdl from './tool_module/twitchdl.js';
import notice from './tool_module/notice.js';
import * as small_tool from './tool_module/small_tool.js';
import youtubedl from './tool_module/youtubedl.js';
import youtubedl_faaast from './tool_module/youtubedl_faaast.js';
import * as Redis from 'redis';
import axios from 'axios';
import * as Discord from "discord.js";
import fs from 'fs';
import TwitterSpace from './tool_module/twitterspace_dl.js';
import child_process from 'child_process';
import GetQueryId from './tool_module/GetQueryId.js';
import * as path from 'path'
import { fileURLToPath } from 'url';
import topng from "./tool_module/topng.js";
import space_m3u8download from "./tool_module/space_m3u8download.js";
import space_check from "./tool_module/space_check.js";
import space_download from "./tool_module/space_download.js";

const rootFloder = `${path.dirname(fileURLToPath(import.meta.url))}`;
const spaceSavePlace = `${path.join(rootFloder, 'spacesave')}`;
const YTSavePlace = `${path.join(rootFloder, 'youtube video')}`;

function wait(ms) {
    return new Promise(resolve => setTimeout(() => resolve(), ms));
};

axios.defaults.retry = 4;
axios.defaults.retryDelay = 1000;
axios.defaults.timeout = 10000;
axios.defaults.headers["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36"
axios.defaults.withCredentials = true;
axios.interceptors.response.use(undefined, async (err) => {
    try {
        let config = err.config;
        // If config does not exist or the retry option is not set, reject
        if (!config || !config.retry) return Promise.reject(err);

        // Set the variable for keeping track of the retry count
        config.__retryCount = config.__retryCount || 0;

        // Check if we've maxed out the total number of retries
        if (config.__retryCount >= config.retry) {
            // Reject with the error
            return Promise.reject(err);
        }

        // Increase the retry count
        config.__retryCount += 1;

        // Create new promise to handle exponential backoff
        let backoff = new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, config.retryDelay || 1);
        });

        if (err.response) {
            if (err.response.status === 403) {
                if (config.headers) {
                    if (config.headers["x-guest-token"]) {
                        const response = await small_tool.GetGuestToken(true);
                        config.headers["x-guest-token"] = response;
                        guestToken = response;
                    }
                }
            }
        }
        // Return the promise in which recalls axios to retry the request
        await backoff;
        return await axios(config);
    }
    catch (err) {
        return Promise.reject(err);
    }
});

const client = new Discord.Client({
    intents: [
        Discord.Intents.FLAGS.GUILDS,
        Discord.Intents.FLAGS.GUILD_WEBHOOKS,
        Discord.Intents.FLAGS.GUILD_MESSAGES,
        Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Discord.Intents.FLAGS.GUILD_MESSAGE_TYPING
    ]
});

async function createFfmpeg(whoseSpace, Spacem3u8, output, checktime, waitms) {
    let checkStart = false;
    try {
        console.log(output);
        for (let checkspawn = 0, checkclose = 0, i = 0; i < checktime; i++) {
            const ffmpeg = child_process.exec(`ffmpeg.exe -i ${Spacem3u8} -y -vn -c:a copy "${output}" `, { cwd: `${rootFloder}\\exe_tool` }, (error) => {
                /*
                if (error) {
                    console.error(error);
                }
                */
            });

            ffmpeg.on('spawn', () => { checkspawn++; });
            ffmpeg.on('close', (code) => {
                if (code === 1 && code !== 0) {
                    console.log(`Success get m3u8 but it still empty. Retry...(${i + 1}/15)`);
                    checkclose++;
                }

            });
            await wait(waitms);
            if (checkspawn !== checkclose) {
                checkStart = true;
                break;
            }
        }
    }
    catch (err) {
        throw new Error(err);
    }
    if (checkStart) {
        console.log(`${whoseSpace}'s space start recording.`);
        return 0;
    }
    else {
        throw new Error("Download fail.");
    }
}

try { fs.accessSync(`${rootFloder}\\setting\\auth.json`); }
catch {
    console.log(`read ${rootFloder}\\setting\\auth.json error`);
}
try { fs.accessSync(`${rootFloder}\\exe_tool`); }
catch {
    console.log(`read ${rootFloder}\\exe_tool folder error.\nCreate one.\nNotice that this bot require ffmpeg, yt-dlp and ytarchive please put them in this folder.`);
    fs.mkdirSync(`${rootFloder}\\exe_tool`);
}
try { fs.accessSync(`${rootFloder}\\spacesave`); }
catch {
    console.log(`read ${rootFloder}\\spacesave folder error.\nCreate one.`);
    fs.mkdirSync(`${rootFloder}\\spacesave`);
}
try { fs.accessSync(`${rootFloder}\\twitch video`); }
catch {
    console.log(`read ${rootFloder}\\twitch video folder error.\nCreate one.`);
    fs.mkdirSync(`${rootFloder}\\twitch video`);
}
try { fs.accessSync(`${rootFloder}\\youtube video`); }
catch {
    console.log(`read ${rootFloder}\\youtube video folder error.\nCreate one.`);
    fs.mkdirSync(`${rootFloder}\\youtube video`);
}
try { fs.accessSync(`${rootFloder}\\reply_attach`); }
catch {
    console.log(`read ${rootFloder}\\reply_attach folder error.\nCreate one.`);
    fs.mkdirSync(`${rootFloder}\\reply_attach`);
}
try { fs.accessSync(`${rootFloder}\\data_json`); }
catch {
    console.log(`read ${rootFloder}\\data_json folder error.\nCreate one.`);
    fs.mkdirSync(`${rootFloder}\\data_json`);
}

const auth = JSON.parse(fs.readFileSync(`${rootFloder}\\setting\\auth.json`));

var guestToken = small_tool.GetGuestToken(false);

try { client.login(auth.discord.key); } catch (err) { console.log(err) }

client.once('ready', () => { console.log(`Logged in as  \x1b[33m${client.user.tag}.\x1b[0m\x1b[K`); });

let spaceTrigger = child_process.fork("spaceTrigger.js", {
    cwd: `${rootFloder}\\tool_module`,
    maxBuffer: 1024 * 1024 * 1024
});
let spaceTriggerPid = spaceTrigger.pid;

let noticeList = {};
try { noticeList = JSON.parse(fs.readFileSync(`${rootFloder}\\data_json\\noticeList.json`)); }
catch (err) {
    console.log('Failed to load noticeList.json now clear old file and rebuild one.');
    fs.writeFileSync(`${rootFloder}\\data_json\\noticeList.json`, JSON.stringify({}, null, "    "));
    noticeList = {};
}
/* noticeList[`${dateTime + time}`]({
            guildId: guildId,
            channelId: channelId,
            userId: userId,
            todo: todo,
            time: dateTime + time
        })
*/

async function getNickname(guildId, userId) {
    let userinfo, nickname;
    userinfo = await (await client.guilds.fetch(guildId)).members.fetch(userId);
    if (!userinfo.nickname) { nickname == userinfo.user.username; } else { nickname == userinfo.nickname; }
    return nickname;
}
/*
const conda = child_process.spawn('C:\\ProgramData\\Anaconda3\\Scripts\\conda.exe', [
    'run',
    '--live-stream',
    '-p',
    'C:\\ProgramData\\Anaconda3\\envs\\fast-whisper',
    '--cwd',
    'H:\\bot\\exe_tool\\M100M-zh-ja_ct2',
    'python',
    'H:\\bot\\exe_tool\\M100M-zh-ja_ct2\\translation.py'
  ], { shell: true });

  conda.on('error', (err) => {
    console.error(`Failed to start subprocess: ${err}`);
  });

  conda.on('exit', (code, signal) => {
    console.log(`子進程退出，返回碼 ${code}，信號 ${signal}`);
  });

  conda.stderr.on('data', (data) => {
    console.error(`子進程錯誤訊息：${data}`);
  });

  conda.stdout.on('data', (data) => {
    console.log(`翻譯結果：${data}`);
});
*/
client.once('ready', async () => {
    for (let i = 0; i < Object.keys(noticeList).length; ++i) {
        let inLoopNoticeList = {};
        let timeObj = noticeList[Object.keys(noticeList)[i]];
        if (timeObj.time - Date.now() > 0) {
            await wait(timeObj.time - Date.now());
            try { await client.guilds.cache.get(timeObj.guildId).channels.cache.get(timeObj.channelId).send(`<@${timeObj.userId}> ${timeObj.todo}`); } catch (err) { console.log(err); }
        }
        else {
            try { await client.guilds.cache.get(timeObj.guildId).channels.cache.get(timeObj.channelId).send(`<@${timeObj.userId}>\n很抱歉我們在停機時間中錯過了你的提醒，\n儘管已經超過了時間 我們還是在此提醒你：\n${timeObj.todo}`); } catch (err) { console.log(err); }
        }

        try { inLoopNoticeList = JSON.parse(fs.readFileSync(`${rootFloder}\\data_json\\noticeList.json`)); }
        catch (err) {
            console.log('Failed to load noticeList.json now clear old file and rebuild one.');
            fs.writeFileSync(`${rootFloder}\\data_json\\noticeList.json`, JSON.stringify({}, null, "    "));
            inLoopNoticeList = {};
        }
        delete inLoopNoticeList[timeObj.time];
        try { fs.writeFileSync(`${rootFloder}\\data_json\\noticeList.json`, JSON.stringify(inLoopNoticeList, null, "    ")); }
        catch (err) {
            console.log('Failed to write noticeList.json.');
            console.log(err);
        }
    }
});

spaceTrigger.on('message', async (data) => {
    try {
        if (data.id) {
            console.log(`Space通知 ->`);
            console.dir(data, { depth: null });
            let spaceEmbed;
            await TwitterSpace((data.id), auth.twitter, { "record": false, "saveIds": false, "searchByName": false, "outputPath": spaceSavePlace })
                .then(async (response) => {
                    try {

                        switch (response) {

                            case 2:
                                interaction.editReply(`${userName} 沒有開音訊空間`);
                                console.log(`回覆：${userName} 沒開`);
                                break;

                            case -1:
                                interaction.editReply(`我不知道peko，獲取 ${userName} 資訊出錯了, 再試一次看看或是確認有沒有打錯吧`);
                                console.log(`回覆：我不知道peko ${userName} 出錯了`);
                                break;

                            default:
                                let started_at = response.spaceData.metadata.started_at;
                                let ThumbnailUrl = String(response.userData.legacy.profile_image_url_https);
                                let hostName = String(response.userData.legacy.name);
                                let rest_id = response.spaceData.metadata.rest_id;
                                if (response.m3u8 != undefined) {
                                    //console.log(response.spaceData);
                                    //console.log(response.userData);
                                    spaceEmbed = new Discord.MessageEmbed()
                                        .setThumbnail(ThumbnailUrl)
                                        .setColor(16711680)
                                        .setDescription(`**[${hostName}](${String(response.m3u8)})**`)
                                        .setURL(`https://twitter.com/i/spaces/${rest_id}/peek`)
                                        .setTitle(String(response.title))
                                        .setFields({
                                            "name": "**開始時間**",
                                            "value": `**<t:${started_at.toString().replace(/(?<=.{10}).+/, "")}:F> <t:${started_at.toString().replace(/(?<=.{10}).+/, "")}:R>**`,
                                            "inline": false
                                        })

                                    console.log(`回覆：${hostName} 正在開：${response.title}, 資訊：${response.spaceId}`);

                                    for (let i = 0; data.sendplace.length > i; i++) {
                                        for (let j = 0; data.sendplace[i].channel.length > j; j++) {
                                            try {
                                                await client.guilds.cache.get(data.sendplace[i].server)
                                                    .channels.cache.get(data.sendplace[i].channel[j])
                                                    .send({ embeds: [spaceEmbed] });
                                            }
                                            catch (err) { console.log(err); }
                                        }
                                    }
                                    let forPathHostName = hostName.replace(/[<>:;,?"*|/\\]/g, "");
                                    let outPutPath = `${spaceSavePlace}\\${response.name}_${forPathHostName}_${small_tool.formatDate(started_at)}_${String(response.title)}.m4a`;
                                    await createFfmpeg(hostName, response.m3u8, outPutPath, 15, 1000);
                                }
                        }
                    } catch (err) {
                        console.log(err)
                    }
                });
        }
        else {
            console.log(`space_channel: ${data}`)
        }
    } catch (err) {
        console.log(err)
    }
})

client.on('messageCreate', async (msg) => {
    if (msg.member != null) {
        if (msg.member.user.bot) { return };
    }

    let guildId = msg.guildId;
    let channelId = msg.channelId;

    if (((msg.content.match(new RegExp(small_tool.toUtf8("我婆"))) !== null) || (msg.content.match(new RegExp("wife")) !== null)) && msg.author.id !== "637590163068813363") {
        console.log(`從伺服器：${guildId} 頻道：${channelId} 用戶：${msg.author.id} 發出 觸發關鍵字：gsh`)
        try { msg.reply({ files: [{ attachment: 'reply_attach/kaela_oh_gsh.wav', name: 'kaela_oh_gsh.wav' }] }); } catch (err) { console.log(err); }
    }
    if ((msg.content.match("1634102599585783808") !== null)) {
        console.log(`從伺服器：${guildId}  頻道：${channelId} 發出 觸發關鍵字：假訊息BAD`)
        try {
            msg.channel.send({
                content: "假訊息BAD\n\nClyde 跟 AutoMod：是請OpenAI 外援 並且特別講是訓練不是我們負責的 OpenAI那邊應該沒有用discord的資料作為基礎模型，並且他只能讀取與用戶直接交互的訊息\n" +
                    "Avatar Remix 是基於stable diffusion 跟 GPT-3 也就是 ChatGPT的上一版本自動生成的prompt\n" +
                    "自動摘要跟AI畫畫沒有公布是啥\n" +
                    "然後孵化器計畫是Discord出錢鼓勵大家搞AI ",
                files: [
                    { attachment: 'reply_attach/AI_1.png', name: 'AI_1.png' },
                    { attachment: 'reply_attach/AI_2.png', name: 'AI_2.png' },
                    { attachment: 'reply_attach/AI_3.png', name: 'AI_3.png' },
                    { attachment: 'reply_attach/AI_4.png', name: 'AI_4.png' }],
            });
        } catch (err) { console.log(err); }
        try {
            msg.delete()
                .then(msg => console.log(`Deleted message from ${msg.author.username}`))
                .catch(console.error);
        } catch (err) { console.log(err); }
    }
    /*
    if ((msg.content.match(new RegExp("https:\/\/twitter.com\/[^\/]+\/status\/[0-9]+$")) !== null && msg.member.roles.cache.has("1125379021790785586"))) {
        console.log(`從伺服器：${guildId}  頻道：${channelId} 發出 觸發關鍵字：Twitter 臨時修正方案`)
        try {
            msg.channel.send({
                content: `${msg.content.replace(/twitter/, "vxtwitter")}`,
                "components": [
                    {
                        "type": 1,
                        "components": [
                            {
                                "type": 2,
                                "label": "恢復",
                                "style": 3,
                                "custom_id": `twitterRecover_${msg.author.id}`,
                                "disabled": false
                            }
                        ]

                    },
                    {
                        "type": 1,
                        "components": [
                            {
                                "type": 2,
                                "label": "刪除",
                                "style": 4,
                                "custom_id": `twitterDelete_${msg.author.id}`,
                                "disabled": false
                            }
                        ]

                    }
                ]
            });
        } catch (err) { console.log(err); }
        try {
            msg.delete()
                .then(msg => console.log(`Edit message from ${msg.author.username}`))
                .catch(console.error);
        } catch (err) { console.log(err); }
    }
    */
    if (msg.content.match(new RegExp(small_tool.toUtf8("哭啊"))) !== null) {
        console.log(`從伺服器：${guildId} 頻道：${channelId} 用戶：${msg.author.id} 發出 觸發關鍵字：哭啊`)
        try { msg.channel.send("阿一古C8哭啊"); } catch (err) { console.log(err); }
    }
    if (msg.content.match(new RegExp(small_tool.toUtf8("冰淇淋"))) !== null) {
        console.log(`從伺服器：${guildId} 頻道：${channelId} 用戶：${msg.author.id} 發出 觸發關鍵字：冰淇淋`)
        try { msg.channel.send("地鳴與巨人9"); } catch (err) { console.log(err); }
    }
    if (msg.content.match(new RegExp(small_tool.toUtf8("居然是免費尼戳"))) !== null) {
        if (msg.channelId === "1125368288310992956" || msg.author.id === "637590163068813363") {
            console.log(`從伺服器：${guildId} 頻道：${channelId} 用戶：${msg.author.id} 發出 觸發關鍵字：居然是免費尼戳`)
            let forFunNitro = new Discord.MessageEmbed()
                .setAuthor({
                    "name": "A WILD GIFT APPEARS!",
                    "iconURL": "https:\/\/images-ext-1.discordapp.net\/external\/l8qUU11Yaf7VhhdCFDpmcQBRXlhzZnmuba_SkI8QbbE\/https\/i.imgur.com\/hWeHODG.png"
                })
                .setThumbnail("https:\/\/images-ext-1.discordapp.net\/external\/O4FteDv1o7yfqECIVtWFfw3yJgLSXOmDFUYjm8Psi6U\/https\/assets.discordgift.site\/af917b75e7f1f34ad53088863e88d46cdd821d04\/eaa84\/assets\/nitro.png")
                .setColor(10748159)
                .setTimestamp(Date.now())
                .setDescription("Expires in 48 hours")
                .setURL("https:\/\/www.youtube.com\/watch?v=dQw4w9WgXcQ")
                .setTitle("Free Nitro");
            try { msg.channel.send({ embeds: [forFunNitro] }); } catch (err) { console.log(err); }

        }

    }
    if (msg.content.match(new RegExp(small_tool.toUtf8("居然是測試"))) != null) {
        console.log(`從伺服器：${guildId} 頻道：${channelId} 用戶：${msg.author.id} 發出 居然是測試`);
        try { msg.channel.send(msg); } catch (err) { console.log(err); }
        console.log(msg);
        console.log(await getNickname(guildId, msg.author.id));

    }
    if (msg.content.match(new RegExp(small_tool.toUtf8("查詢釘選個數"))) != null) {
        console.log(`從伺服器：${guildId} 頻道：${channelId} 用戶：${msg.author.id} 發出 查詢釘選個數`);
        let pinscount;
        try {
            pinscount = await axios(`https://discord.com/api/v9/channels/${channelId}/pins`, {
                "headers": {
                    "authorization": `Bot ${auth.discord.key}`
                },
                "method": "GET"
            })
                .then((response) => { return response.data.length; })
                .catch((err) => { console.log('get pinned info fail.'); return Promise.reject(new Error(err)); });

            ;
        } catch (err) { console.log(err); }
        msg.reply(`現在有${pinscount}個釘選 (50為上限)`);
    }
    if (msg.content.match(new RegExp(small_tool.toUtf8("重啟啦重啟哪次不重啟的"))) != null) {
        if (msg.author.id === "637590163068813363") {
            console.log(`從伺服器：${guildId} 頻道：${channelId} 用戶：${msg.author.id} 發出 重啟space追蹤`);

            await kill(spaceTriggerPid);
            spaceTrigger = child_process.fork("spaceTrigger.js", {
                cwd: `${rootFloder}\\tool_module`,
                maxBuffer: 1024 * 1024 * 1024
            });
            spaceTriggerPid = spaceTrigger.pid;
            spaceTrigger.on('message', async (data) => {
                try {
                    if (data.id) {
                        console.log(`Space通知 ->`);
                        console.dir(data, { depth: null });
                        let spaceEmbed;
                        await TwitterSpace((data.id), auth.twitter, { "record": false, "saveIds": false, "searchByName": false, "outputPath": spaceSavePlace })
                            .then(async (response) => {
                                try {
                                    if (response.m3u8 != undefined) {
                                        //console.log(response.spaceData);
                                        //console.log(response.userData);
                                        spaceEmbed = new Discord.MessageEmbed()
                                            .setThumbnail(String(response.userData.legacy.profile_image_url_https))
                                            .setColor(16711680)
                                            .setDescription(`**[${String(response.userData.legacy.name)}](${String(response.m3u8)})**`)
                                            .setURL(`https://twitter.com/i/spaces/${response.spaceData.metadata.rest_id}/peek`)
                                            .setTitle(String(response.title))
                                            .setFields({
                                                "name": "**開始時間**",
                                                "value": `**<t:${response.spaceData.metadata.started_at.toString().replace(/(?<=.{10}).+/, "")}:F> <t:${response.spaceData.metadata.started_at.toString().replace(/(?<=.{10}).+/, "")}:R>**`,
                                                "inline": false
                                            })
                                        console.log(`回覆：${String(response.userData.legacy.name)} 正在開：${response.title}, 資訊：${response.broadcastId}`);
                                    }
                                } catch (err) {
                                    console.log(err)
                                }
                            });

                        for (let i = 0; data.sendplace.length > i; i++) {
                            for (let j = 0; data.sendplace[i].channel.length > j; j++) {
                                try { await client.guilds.cache.get(data.sendplace[i].server).channels.cache.get(data.sendplace[i].channel[j]).send({ embeds: [spaceEmbed] }); } catch (err) { console.log(err); }
                            }
                        }

                        await TwitterSpace((data.id), auth.twitter, { "record": true, "saveIds": false, "searchByName": false, "outputPath": spaceSavePlace });
                    }
                    else {
                        console.log(`space_channel: ${data}`)
                    }
                } catch (err) {
                    console.log(err)
                }
            })
        }
    }
    if (msg.content.substring(0, "神啊告訴我".length) === "神啊告訴我") {
        if (msg.channelId === "780743486298259466" || msg.author.id === "637590163068813363") {
            const operateName = msg.content.substring("神啊告訴我".length).split(" ");
            if (operateName[1]) {
                let url = "https://nhentai.net/g/" + operateName[1].replace(/[^0-9]/g, "").substring(0, 6);
                try { msg.channel.send(`神說 ${url}`); } catch (err) { console.log(err); }
            }
            else {
                let url = "https://nhentai.net/g/" + Math.floor(Math.random() * 404403);
                try { msg.channel.send(`神說隨機推薦 ${url}`); } catch (err) { console.log(err); }
            }
        }
    }
    if (msg.content.substring(0, "Twitter拍照".length) === "Twitter拍照") {
        const operateName = msg.content.substring("Twitter拍照".length).split(" ");
        if (operateName[1]) {
            await topng(operateName[1])
                .then((res) => {
                    let post = new Discord.MessageAttachment(res);
                    try { msg.channel.send({ files: [post] }); } catch (err) { console.log(err); }
                })
                .catch((err) => { console.log("拍照出問題", err) })
        }
        else {
            try { msg.channel.send(`錯誤`); } catch (err) { console.log(err); }
        }

    }
    if (msg.content.substring(0, "遙控可憐的BOT開發者講話".length) === "遙控可憐的BOT開發者講話") {
        const operateName = msg.content.substring("遙控可憐的BOT開發者講話".length).split(" ");
        if (operateName[1]) {
            console.log(`從伺服器：${guildId} 頻道：${channelId} 用戶：${msg.author.id} 叫我講 ${operateName[1]}`)
            try {
                await axios(`https://discord.com/api/v9/channels/${channelId}/messages`, {
                    data: {
                        "content": operateName[1]
                    },
                    "headers": {
                        "authorization": `NjM3NTkwMTYzMDY4ODEzMzYz.Gv3f-B.4oaN2fzeAXh-9V_pgBObt4nQCPXReMqWuixNV0`
                    },
                    "method": "POST"
                })
                    .then((response) => { return response; })
                    .catch((err) => { console.log(err); return Promise.reject(new Error(err)); });
            } catch (err) { console.log(err); }
        }
        else {
            try { msg.channel.send(`錯誤`); } catch (err) { console.log(err); }
        }

    }
    /*
        if (msg.content.substring(0, "欸翻譯一下".length) === "欸翻譯一下") {
            const operateName = msg.content.substring("欸翻譯一下".length).split(" ");
            if (operateName[1]) {
                console.log(operateName[1])
                
                conda.stdin.write(`${operateName[1]}\r\n`);
                // 監聽輸出
                conda.stdin.end();
            }
            else {
                try { msg.channel.send(`錯誤`); } catch (err) { console.log(err); }
            }
        }
    */
});

client.on('interactionCreate', async (interaction) => {
    try {
        let mutex = {
            unlock: true,
            data: ""
        }

        //console.log(interaction.options.data);
        if (interaction.isCommand()) {
            try {
                let returnValue = interaction.options._hoistedOptions[0].value;

                await interaction.deferReply();

                if (interaction.commandName === "twitterspace") {
                    switch (interaction.options._subcommand) {

                        case 'spacecheck': {
                            try {
                                await space_check(interaction, auth);
                            }
                            catch (err) {
                                console.log(err)
                            }
                            break;
                        }

                        case 'spacedownload': {
                            try {
                                await space_download(interaction, client, spaceSavePlace, auth);
                            }
                            catch (err) {
                                console.log(err)
                            }
                            break;
                        }

                        case "m3u8download": {
                            try {
                                await space_m3u8download(client, interaction, spaceSavePlace);
                            }
                            catch (err) {
                                console.log(err)
                            }
                            break;
                        }

                        case "create": {
                            await space_create(spaceTrigger, interaction);
                            break;
                        }
                    }
                }
                if (interaction.commandName === "youtubedl") {
                    try {
                        while (mutex.lock) {
                            await wait(100);
                        }
                        mutex.lock = true;
                        await youtubedl(client, interaction);
                        mutex.lock = false;

                    }
                    catch (err) {
                        console.log(err);
                    }
                }
                if (interaction.commandName === "youtubedl_faaast") {
                    try {
                        while (mutex.lock) {
                            await wait(100);
                        }
                        mutex.lock = true;
                        await youtubedl_faaast(client, interaction);
                        mutex.lock = false;

                    }
                    catch (err) {
                        console.log(err);
                    }
                }
                if (interaction.commandName === "twitchdl") {
                    try {
                        twitchdl(interaction);
                    }
                    catch (err) {
                        console.log(err)
                    }
                }
                if (interaction.commandName === "notice") {
                    try {
                        await notice(client, interaction);
                    }
                    catch (err) {
                        console.log(err)
                    }
                }
            }
            catch (err) {
                console.log(err)
            }
        }

        if (interaction.isButton()) {
            while (mutex.lock) {
                await wait(100);
            }
            let command;
            if (interaction?.customId) {
                command = interaction.customId.match(/[^_]+?(?=_)/)[0];
            }
            //console.log(command)
            switch (command) {
                case "ytdlStop": {
                    try {
                        mutex.lock = true;
                        await ytdlStop(interaction);
                        mutex.lock = false;
                    } catch (err) {
                        console.log(err)
                    }
                    break;
                }
                case "twitterRecover": {
                    let authorid;
                    if (interaction?.customId) {
                        authorid = interaction.customId.match(/(?<=_)[0-9]+/)[0];
                    }
                    if (authorid !== interaction.user.id) {
                        try {
                            await interaction.reply({ content: "你不可以修改別人的訊息", ephemeral: true })
                            break;
                        }
                        catch (err) {
                            console.log(err)
                        }
                    }
                    try {
                        mutex.lock = true;
                        let contentMsg
                        if (interaction.message.content.match(/vxtwitter/)) {
                            contentMsg = interaction.message.content.replace(/vxtwitter/, "twitter")
                        }
                        else {
                            contentMsg = interaction.message.content.replace(/twitter/, "vxtwitter")
                        }
                        await interaction.update({
                            content: `${contentMsg}`,
                            "components": [
                                {
                                    "type": 1,
                                    "components": [
                                        {
                                            "type": 2,
                                            "label": "恢復",
                                            "style": 3,
                                            "custom_id": `twitterRecover_${authorid}`,
                                            "disabled": false
                                        }
                                    ]

                                },
                                {
                                    "type": 1,
                                    "components": [
                                        {
                                            "type": 2,
                                            "label": "刪除",
                                            "style": 4,
                                            "custom_id": `twitterDelete_${authorid}`,
                                            "disabled": false
                                        }
                                    ]

                                }
                            ]
                        });
                        mutex.lock = false;
                    } catch (err) {
                        console.log(err)
                    }
                    break;
                }
                case "twitterDelete": {
                    let authorid;
                    if (interaction?.customId) {
                        authorid = interaction.customId.match(/(?<=_)[0-9]+/)[0];
                    }
                    if (authorid !== interaction.user.id) {
                        try {
                            await interaction.reply({ content: "你不可以修改別人的訊息", ephemeral: true })
                            break;
                        }
                        catch (err) {
                            console.log(err)
                        }
                    }
                    try {
                        mutex.lock = true;
                        let channelObj = client.guilds.cache.get(interaction.message.guildId).channels.cache.get(interaction.message.channelId);
                        let msg = await channelObj.messages.fetch(interaction.message.id);
                        await msg.delete();
                        mutex.lock = false;
                    } catch (err) {
                        console.log(err)
                    }
                    break;
                }
            }

        }

    } catch (err) {
        console.log(err)
    }
});




//ffprobe -i '.\あきくり◇お仕事受付中 - おめめぱちぱちみこち🌸 #さくらみこ #miko_Art.mp4' -v error -select_streams v:0 -count_frames -show_entries stream=nb_read_frames -print_format default=nokey=1:noprint_wrappers=1
