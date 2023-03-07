'use strict';

import kill from "tree-kill-promise"
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

const rootFloder = `${path.dirname(fileURLToPath(import.meta.url))}`;
const spaceSavePlace = `${path.join(rootFloder, 'spacesave')}`;
const YTSavePlace = `${path.join(rootFloder, 'youtube video')}`;

function wait(ms) {
    return new Promise(resolve => setTimeout(() => resolve(), ms));
};

axios.defaults.retry = 4;
axios.defaults.retryDelay = 1000;
axios.defaults.timeout = 10000;
axios.defaults.headers["User-Agent"] = "curl/7.79.1";
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
        console.log(err);
    }
});

const prefix = "!!!"

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
client.once('ready', async () => { 
    for(let i = 0; i < Object.keys(noticeList).length; ++i) {
    let inLoopNoticeList = {};
    let timeObj = noticeList[Object.keys(noticeList)[i]];
    if(timeObj.time - Date.now() > 0) {
        await wait(timeObj.time - Date.now());
        try { client.guilds.cache.get(timeObj.guildId).channels.cache.get(timeObj.channelId).send(`<@${timeObj.userId}> ${timeObj.todo}`); } catch (err) { console.log(err); }
    }
    else {
        try { client.guilds.cache.get(timeObj.guildId).channels.cache.get(timeObj.channelId).send(`<@${timeObj.userId}>\n很抱歉我們在停機時間中錯過了你的提醒，\n儘管已經超過了時間 我們還是在此提醒你：\n${timeObj.todo}`); } catch (err) { console.log(err); }
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
            console.log(`Space通知 ->\n`, data);
            let spaceEmbed;
            await TwitterSpace((data.id), auth.twitter.key, { "record": false, "saveIds": false, "searchByName": false, "outputPath": spaceSavePlace })
                .then(async (response) => {
                    try {
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
                                        client.guilds.cache.get(data.sendplace[i].server)
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

    let severId = msg.guildId;
    let channelId = msg.channelId;
    
    if ((msg.content.match(new RegExp(small_tool.toUtf8("我婆"))) !== null) && msg.author.id !== "637590163068813363") {
        console.log(`從伺服器：${severId}  頻道：${channelId} 發出 觸發關鍵字：gsh`)
        try { msg.channel.send({files: [{attachment: 'reply_attach/kaela_oh_gsh.wav', name: 'kaela_oh_gsh.wav'}]}); } catch (err) { console.log(err); }
    }

    if (msg.content.match(new RegExp(small_tool.toUtf8("哭啊"))) !== null) {
        console.log(`從伺服器：${severId}  頻道：${channelId} 發出 觸發關鍵字：哭啊`)
        try { msg.channel.send("阿一古C8哭啊"); } catch (err) { console.log(err); }
    }

    if (msg.content.match(new RegExp(small_tool.toUtf8("冰淇淋"))) !== null) {
        console.log(`從伺服器：${severId}  頻道：${channelId} 發出 觸發關鍵字：冰淇淋`)
        try { msg.channel.send("地鳴與巨人9"); } catch (err) { console.log(err); }
    }
    if (msg.content.match(new RegExp(small_tool.toUtf8("居然是免費尼戳"))) !== null) {
        if (msg.channelId === "940853823428263946" || msg.author.id === "637590163068813363") {
            console.log(`從伺服器：${severId} 頻道：${channelId} 發出 觸發關鍵字：居然是免費尼戳`)
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
        console.log(`從伺服器：${severId} 頻道：${channelId} 發出`);
        try { msg.channel.send(msg); } catch (err) { console.log(err); }
        console.log(msg);
    }

    if (msg.content.match(new RegExp(small_tool.toUtf8("重啟啦重啟哪次不重啟的"))) != null) {
        if (msg.author.id === "637590163068813363") {
            console.log(`從伺服器：${severId} 頻道：${channelId} 發出 重啟space追蹤`);

            await kill(spaceTriggerPid);
            spaceTrigger = child_process.fork("spaceTrigger.js", {
                cwd: `${rootFloder}\\tool_module`,
                maxBuffer: 1024 * 1024 * 1024
            });
            spaceTriggerPid = spaceTrigger.pid;
            spaceTrigger.on('message', async (data) => {
                try {
                    if (data.id) {
                        console.log(`Space通知 ->\n`, data);
                        let spaceEmbed;
                        await TwitterSpace((data.id), auth.twitter.key, { "record": false, "saveIds": false, "searchByName": false, "outputPath": spaceSavePlace })
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
                                try { client.guilds.cache.get(data.sendplace[i].server).channels.cache.get(data.sendplace[i].channel[j]).send({ embeds: [spaceEmbed] }); } catch (err) { console.log(err); }
                            }
                        }

                        await TwitterSpace((data.id), auth.twitter.key, { "record": true, "saveIds": false, "searchByName": false, "outputPath": spaceSavePlace });
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
                                let userName = returnValue;
                                await TwitterSpace(userName, auth.twitter.key, { "record": false }).then(async (response) => {
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
                                                if (response.m3u8 != undefined) {
                                                    //console.log(response.spaceData);
                                                    //console.log(response.userData);
                                                    let spaceEmbed = new Discord.MessageEmbed()
                                                        .setThumbnail(String(response.userData.legacy.profile_image_url_https))
                                                        .setColor(16711680)
                                                        .setDescription(`**[${String(response.userData.legacy.name)}](${String(response.m3u8)})**`)
                                                        .setURL(`https://twitter.com/i/spaces/${response.spaceData.metadata.rest_id}/peek`)
                                                        .setTitle(String(response.title))
                                                        .setFields({
                                                            "name": "**開始時間**",
                                                            "value": `**<t:${response.spaceData.metadata.started_at.toString().replace(/(?<=.{10}).+/, "")}:F>**`,
                                                            "inline": false
                                                        })
                                                    interaction.editReply({ embeds: [spaceEmbed] });
                                                    console.log(`回覆：${userName} 正在開：${response.title}, 資訊：${response.broadcastId}`);
                                                    break;

                                                }
                                                else {
                                                    break;
                                                }

                                        }
                                    } catch (err) {
                                        console.log(err)
                                    }
                                });
                            }
                            catch (err) {
                                console.log(err)
                            }
                            break;
                        }

                        case 'spacedownload': {
                            try {
                                let channelId = interaction.channelId;
                                let guildId = interaction.guildId;
                                let userName = returnValue;
                                TwitterSpace(userName, auth.twitter.key, {
                                    "record": true,
                                    "outputPath": spaceSavePlace
                                })

                                    .then((response) => {
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
                                                    if (response) {
                                                        if (response.m3u8) {
                                                            interaction.editReply(`開始下載 ${userName} 的 ${response.title}`);
                                                            console.log(`開始下載 ${userName} 的 ${response.title}`);
                                                            small_tool.detectStop(response.spaceId, 30000, 3).then(() => {
                                                                try { client.guilds.cache.get(guildId).channels.cache.get(channelId).send(`下載 ${userName} 的 ${response.title} 完成`); } catch (err) { console.log(err); }
                                                            })
                                                            break;
                                                        }
                                                        else { break; }
                                                    }
                                                    else { break; }
                                            }
                                        } catch (err) {
                                            console.log(err)
                                        }
                                    }); 
                            }
                            catch (err) {
                                console.log(err)
                            }
                            break;
                        }

                        case "m3u8download": {
                            try {
                                let currentDateTime = small_tool.formatDate();
                                let m3u8Name;
                                let m3u8URL;
                                interaction.options.get('名稱') && (m3u8Name = interaction.options.get('名稱').value);
                                interaction.options.get('m3u8url') && (m3u8URL = interaction.options.get('m3u8url').value);
                                m3u8Name = m3u8Name.replace(/[<>:;,?"*|/\\]/g, "").replace(/\s/g, "_");
                                if (m3u8Name === "") { m3u8Name = `unname_${currentDateTime}`; }
                                let masterlist = (m3u8URL).replace(/(?<=audio-space\/).*?(?=_playlist.m3u8)/g, "master").replace(/\?type=live/g, "").replace(" ", "");
                                let baseUrl = masterlist.replace(/\/master_playlist.m3u8/g, "");



                                let _res = await axios.get(masterlist)
                                    .then((response) => {
                                        try {
                                            let _res = "https://prod-fastly-ap-southeast-1.video.pscp.tv" + response.data.replace(/(.|\r|\n)*?(?=\/Transcoding)/g, "").replace(" ", "");
                                            return _res;
                                        } catch (err) {
                                            console.log(err)
                                        }
                                    })
                                    .catch((err) => { console.log(err); });

                                await axios.get(_res)
                                    .then((response) => {

                                        try {
                                            fs.writeFileSync(`${rootFloder}\\master_${currentDateTime}_${m3u8Name}.m3u8`, response.data.replace(/chunk/g, `${baseUrl}/chunk`));
                                        } catch (err) { console.log("建立m3u8失敗\n", err); };

                                        try {
                                            interaction.editReply(`已記錄。 m3u8檔案： master_${currentDateTime}_${m3u8Name}.m3u8`);
                                        } catch (err) { console.log("編輯交互失敗\n", err); }

                                        let channelId = interaction.channelId;
                                        let guildId = interaction.guildId;

                                        try {
                                            const twdl = child_process.exec(`ffmpeg.exe -y -protocol_whitelist file,http,https,tcp,tls -i "${rootFloder}\\master_${currentDateTime}_${m3u8Name}.m3u8" "${spaceSavePlace}\\${m3u8Name}.m4a" `, {
                                                cwd: `${rootFloder}\\exe_tool`,
                                                maxBuffer: 1024 * 1024 * 1024
                                            })

                                            twdl.on('spawn', () => {
                                                try {
                                                    interaction.editReply(`開始下載 `);
                                                } catch (err) {
                                                    console.log(err)
                                                }
                                            });
                                            twdl.on('close', (code) => {

                                                if (code === 0) {
                                                    try { client.guilds.cache.get(guildId).channels.cache.get(channelId).send(`下載結束`); } catch (err) { console.log(err); }
                                                }
                                                try {
                                                    fs.unlinkSync(`${rootFloder}\\master_${currentDateTime}_${m3u8Name}.m3u8`);
                                                } catch (err) { console.log("刪除m3u8失敗\n", err); };
                                            });
                                        } catch (err) { console.log("自m3u8下載失敗\n", err) }
                                    })  
                            }
                            catch (err) {
                                console.log(err)
                            }
                            break;
                        }

                        case "create": {

                            try {
                                spaceTrigger.once('message', async (data) => {
                                    if (!data.id) {
                                        if (data === "repeatError") {
                                            interaction.editReply(`${userName} 已經加入此頻道了`);
                                        }
                                        if (data === "addSuccess") {
                                            interaction.editReply(`${userName} 加入追蹤成功`);

                                        }
                                    }

                                });
                            } catch (err) {
                                console.log(err)
                            }
                            let channelId = interaction.channelId;
                            let guildId = interaction.guildId;
                            let userName = returnValue;
                            let userId;
                            let idListData;
                            try { idListData = JSON.parse(fs.readFileSync(`${rootFloder}\\data_json\\ID_List.json`)); }
                            catch (err) {
                                console.log('Failed to load ID_List.json now clear old file and rebuild one.');
                                fs.writeFileSync(`ID_List.json`, JSON.stringify({}));
                            }

                            if (idListData[userName]) {
                                spaceTrigger.send({
                                    id: idListData[userName],
                                    server: guildId,
                                    channel: channelId
                                })
                            }
                            else {
                                let UserByScreenNameQraphl = await GetQueryId('UserByScreenName', true)
                                    .then((response) => {
                                        return response;
                                    })
                                    .catch((err) => {
                                        console.log('Get UserByScreenNameQraphl fail.');
                                        return Promise.reject(new Error(err))
                                    });
                                userId = await axios(`https://twitter.com/i/api/graphql/${UserByScreenNameQraphl.queryId}/UserByScreenName?variables=` + encodeURIComponent(JSON.stringify({
                                    "screen_name": `${userName}`,
                                    "withSafetyModeUserFields": true,
                                    "withSuperFollowsUserFields": true
                                })), {
                                    "headers": {
                                        "x-guest-token": guestToken,
                                        "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"
                                    },
                                    "method": "GET"
                                })
                                    .then((response) => {
                                        let userId = response.data.data.user.result.rest_id;
                                        spaceTrigger.send({
                                            id: userId,
                                            server: guildId,
                                            channel: channelId
                                        })
                                        return userId;
                                    })

                                    .catch((err) => {
                                        interaction.editReply(`${userName} 加入追蹤失敗，請確認是否打錯，若無錯誤請再試一次`);
                                        console.log(`伺服器：${guildId}　頻道： ${channelId} userId 錯誤`)
                                    })
                            }
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
            try {
                while (mutex.lock) {
                    await wait(100);
                }
                mutex.lock = true;
                await ytdlStop(interaction);
                mutex.lock = false;
            } catch (err) {
                console.log(err)
            }
        }

    } catch (err) {
        console.log(err)
    }
});




//ffprobe -i '.\あきくり◇お仕事受付中 - おめめぱちぱちみこち🌸 #さくらみこ #miko_Art.mp4' -v error -select_streams v:0 -count_frames -show_entries stream=nb_read_frames -print_format default=nokey=1:noprint_wrappers=1
