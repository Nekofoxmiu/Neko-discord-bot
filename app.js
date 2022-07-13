'use strict';

import { createClient } from 'redis';
import axios from 'axios';
import Discord, { MessageEmbed } from 'discord.js';
import fs from 'fs';
import TwitterSpace from './twitterspace_dl.js';
import child_process from 'child_process';
import kill from 'tree-kill-promise';
import GetQueryId from './GetQueryId.js';



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
                        const response = await GetGuestToken(true);
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

async function GetGuestToken(outdataOrNot) {

    outdataOrNot = outdataOrNot || false;
    try { guestToken = JSON.parse(fs.readFileSync(`./Token.json`)); }
    catch (err) {
        console.log('Failed to load Token.json now clear old file and rebuild one.');

        guestToken = await axios("https://api.twitter.com/1.1/guest/activate.json", {
            "headers": {
                "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"
            },
            "method": "POST"
        })
            .then((response) => {  return response.data.guest_token; })
            .catch(() => { console.log('get x-guestToken fail.'); return -1; });

        if (guestToken === -1) { return -1; }

        fs.writeFileSync(`./Token.json`, JSON.stringify({ "guestToken": guestToken }));

        return guestToken;
    }
    if (outdataOrNot) {
        guestToken = await axios("https://api.twitter.com/1.1/guest/activate.json", {
            "headers": {
                "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"
            },
            "method": "POST"
        })
            .then((response) => { return response.data.guest_token; })
            .catch(() => { console.log('get x-guestToken fail.'); return -1; });

        fs.writeFileSync(`./Token.json`, JSON.stringify({ "guestToken": guestToken }));

        return guestToken;
    }
    else { return guestToken.guestToken; }
}

const formatDate = () => {
    const today = new Date();

    let month = '';
    if ((today.getMonth() + 1) < 10) {
        month = '0' + (today.getMonth() + 1);
    }
    else {
        month = (today.getMonth() + 1);
    }

    const AddZero = (time) => {
        if (time < 10) {
            time = '0' + time;
            return time;
        }
        else {
            return time;
        }
    }
    let currentDateTime =
        today.getFullYear() + '' +
        month + '' +
        AddZero(today.getDate()) + '_' +
        AddZero(today.getHours()) + '_' +
        AddZero(today.getMinutes());
    //console.log(currentDateTime);

    return currentDateTime;
}

const prefix = "!!!"

function wait(ms) {
    return new Promise(resolve => setTimeout(() => resolve(), ms));
};


const detectStop = async (userName, ms, checkTimeLimit) => {
    try {
        for (let checkStop = false, checkTime = 0; checkStop === false || checkTime < checkTimeLimit;) {

            TwitterSpace(userName, { "record": false }).then((response) => {
                try {
                    if (response.m3u8 === undefined) {
                        checkStop = true;
                        checkTime++
                    }
                    else {
                        checkStop = false;
                        checkTime = 0;
                    }
                }
                catch (err) {
                    console.log(err)
                }
            }
            );

            await wait(ms);
        }
    } catch (err) {
        console.log(err)
    }
}

const toUtf8 = (rawString) => {
    let outputString = "";
    let stringUtf8 = Buffer.from(rawString, 'utf-8').toString();
    for (let i = 0; i < stringUtf8.length; i++) { outputString += `\\u${stringUtf8.codePointAt(i).toString(16)}` }
    return outputString;
}

const forFunNitro = new MessageEmbed()
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





const client = new Discord.Client({
    intents: [
        Discord.Intents.FLAGS.GUILDS,
        Discord.Intents.FLAGS.GUILD_WEBHOOKS,
        Discord.Intents.FLAGS.GUILD_MESSAGES,
        Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Discord.Intents.FLAGS.GUILD_MESSAGE_TYPING
    ]
});
const auth = JSON.parse(fs.readFileSync('./auth.json'));

var spaceTrigger = child_process.fork("./spaceTrigger.js");

var guestToken = GetGuestToken(false);

try { client.login(auth.discord.key); } catch (err) { console.log(err) }

client.on('ready', () => { console.log(`Logged in as  \x1b[33m${client.user.tag}.\x1b[0m\x1b[K`); });

try {
    spaceTrigger.on('message', async (data) => {
        if (data.id) {
            console.log(`Space通知 ->\n`, data);
            let spaceEmbed;
            await TwitterSpace((data.id), { "record": true, "saveIds": false, "searchByName": false, "outputPath": "./spacesave" })
            .then(async (response) => {
                try {
                    if (response.m3u8 != undefined) {
                        //console.log(response.spaceData);
                        //console.log(response.userData);
                        spaceEmbed = new MessageEmbed()
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
                    client.guilds.cache.get(data.sendplace[i].server).channels.cache.get(data.sendplace[i].channel[j]).send({ embeds: [spaceEmbed] });
                }
            }
        }
        else {
            console.log(`space_channel: ${data}`)
        }

    })
} catch (err) {
    console.log(err)
}



client.on('messageCreate', msg => {
    if (msg.member != null) {
        if (msg.member.user.bot) { return };
    }

    let severId = msg.guildId;
    let channelId = msg.channelId;

    if (msg.content.match(new RegExp(toUtf8("哭啊"))) != null) {
        console.log(`從伺服器：${severId}\n頻道：${channelId} 發出`)
        msg.channel.send("阿一古C8哭啊");
        console.log(`觸發關鍵字：哭啊`);

    }

    if (msg.content.match(new RegExp(toUtf8("冰淇淋"))) != null) {
        console.log(`從伺服器：${severId}\n頻道：${channelId} 發出`)
        msg.channel.send("地鳴與巨人9");
        console.log(`觸發關鍵字：冰淇淋`);

    }
    if (msg.content.match(new RegExp(toUtf8("居然是免費尼戳"))) != null) {
        if (msg.channelId === "940853823428263946" || msg.author.id === "637590163068813363") {
            console.log(`從伺服器：${severId}\n頻道：${channelId} 發出`)
            msg.channel.send({ embeds: [forFunNitro] });
            console.log(`觸發關鍵字：居然是免費尼戳`);

        }

    }
    if (msg.content.match(new RegExp(toUtf8("居然是測試"))) != null) {
        console.log(`從伺服器：${severId}\n頻道：${channelId} 發出`);
        msg.channel.send(msg);
        console.log(msg);
    }


    if (msg.content.substring(0, "神啊告訴我".length) === "神啊告訴我") {
        if (msg.channelId === "780743486298259466" || msg.author.id === "637590163068813363") {
            const operateName = msg.content.substring("神啊告訴我".length).split(" ");
            if (operateName[1]) {
                let url = "https://nhentai.net/g/" + operateName[1].replace(/[^0-9]/g, "").substring(0, 6);
                msg.channel.send(`神說 ${url}`);
            }
            else {
                let url = "https://nhentai.net/g/" + Math.floor(Math.random() * 404403);
                msg.channel.send(`神說隨機推薦 ${url}`);
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
        if (interaction.isCommand()) {
            try {
                let returnValue = interaction.options._hoistedOptions[0].value;

                //console.log(interaction);
                await interaction.deferReply();
                //interaction.reply(returnValue);

                if (interaction.commandName === "twitterspace") {
                    switch (interaction.options._subcommand) {

                        case 'spacecheck': {
                            try {
                                let userName = returnValue;
                                await TwitterSpace(userName, { "record": false }).then(async (response) => {
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
                                                    let spaceEmbed = new MessageEmbed()
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
                                break;
                            }
                            catch (err) {
                                console.log(err)
                            }
                        }

                        case 'spacedownload': {
                            try {
                                let channelId = interaction.channelId;
                                let guildId = interaction.guildId;
                                let userName = returnValue;
                                TwitterSpace(userName, {
                                    "record": true,
                                    "outputPath": "./spacesave"
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
                                                    if (response.m3u8) {
                                                        interaction.editReply(`開始下載 ${userName} 的 ${response.title}`);
                                                        console.log(`開始下載 ${userName} 的 ${response.title}`);
                                                        detectStop(userName, 30000, 3).then(() => {
                                                            try {
                                                                client.guilds.cache.get(guildId).channels.cache.get(channelId).send(`下載 ${userName} 的 ${response.title} 完成`);
                                                            } catch (err) {
                                                                console.log(err)
                                                            }
                                                        })
                                                        break;
                                                    }
                                                    else { break; }
                                            }
                                        } catch (err) {
                                            console.log(err)
                                        }
                                    });
                                break;
                            }
                            catch (err) {
                                console.log(err)
                            }
                        }

                        case "m3u8download": {
                            try {
                                let masterlist = (returnValue).replace(/(?<=audio-space\/).*?(?=_playlist.m3u8)/g, "master").replace(/\?type=live/g, "").replace(" ", "");
                                let baseUrl = masterlist.replace(/\/master_playlist.m3u8/g, "");

                                let currentDateTime = formatDate();

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
                                            fs.writeFileSync(`./master_${currentDateTime}.m3u8`, response.data.replace(/chunk/g, `${baseUrl}/chunk`));
                                        } catch (err) { console.log("建立m3u8失敗\n", err); };

                                        try {
                                            interaction.editReply(`已記錄。 m3u8檔案： master_${currentDateTime}.m3u8`);
                                        } catch (err) { console.log("編輯交互失敗\n", err); }

                                        let channelId = interaction.channelId;
                                        let guildId = interaction.guildId;

                                        try {
                                            const twdl = child_process.exec(`ffmpeg -protocol_whitelist file,http,https,tcp,tls -i "./master_${currentDateTime}.m3u8" master_${currentDateTime}.m4a `, {
                                                env: "./",
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
                                                    client.guilds.cache.get(guildId).channels.cache.get(channelId).send(`下載結束`);
                                                }

                                            });
                                        } catch (err) { console.log("自m3u8下載失敗\n", err) }
                                    })


                                break;
                            }
                            catch (err) {
                                console.log(err)
                            }
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
                            try { idListData = JSON.parse(fs.readFileSync(`./ID_List.json`)); }
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
                            
                        }
                    }
                }



                if (interaction.commandName === "youtubedl") {

                    try {

                        let channelId = interaction.channelId;
                        let guildId = interaction.guildId;
                        let messageId;
                        let startMsg;

                        let ytdl = child_process.exec(`ytarchive.exe --merge --add-metadata --no-frag-files --thumbnail -w -o "./youtube video\\%(title)s-%(id)s" ${returnValue} best `, {
                            env: "./",
                            maxBuffer: 1024 * 1024 * 1024
                        })

                        ytdl.on('spawn', async () => {
                            try {
                                /*
                                    console.log(ytdl.pid);
                                    console.log(interaction);
                                    console.log(messageId);
                                */
                                //messageId = msgData.id;
                                while (mutex.lock) {
                                    await wait(100);
                                }
                                mutex.lock = true;
                                startMsg = await interaction.editReply(
                                    {
                                        "content": `開始下載 ${returnValue}`
                                    }
                                );
                                mutex.lock = false;
                                while (mutex.lock) {
                                    await wait(100);
                                }
                                mutex.lock = true;
                                await interaction.editReply(
                                    {
                                        "content": `開始下載 ${returnValue}`,
                                        "components": [
                                            {
                                                "type": 1,
                                                "components": [
                                                    {
                                                        "type": 2,
                                                        "label": "停止下載！",
                                                        "style": 4,
                                                        "custom_id": `ytdlStop_${ytdl.pid}`
                                                    }
                                                ]

                                            }
                                        ]
                                    }
                                );
                                mutex.lock = false;
                                //console.log(startMsg.embeds[0].title);
                                //console.log(`${startMsg.content.replace(/開始下載 /g, "")} 下載完成`)
                            } catch (err) {
                                console.log(err)
                            }
                        });
                        ytdl.stderr.on('data', async (data) => {
                            try {
                                if (data) {
                                    data = data.replace(/\x1b\[31m/g, "").replace(/\x1b\[33m/g, "").replace(/\x1b\[0m\x1b\[K/g, "").replace(/\n\B/g, "").replace(/\B\n/g, "");
                                    if (data && data !== "\n") {
                                        client.guilds.cache.get(guildId).channels.cache.get(channelId).send(data);
                                        process.stdout.write(`${data}\n`);
                                    }
                                }
                            } catch (err) {
                                console.log(err)
                            }
                        });

                        ytdl.stdout.on('data', async (data) => {
                            try {
                                if (data) {
                                    data = data.replace(/\n\B/g, "").replace(/\B\n/g, "").replace(/\r/g, "");
                                    if (data.match(/(?<=Video Fragments:).+/)) {
                                        //process.stdout.write(`${data}\r`);
                                    }
                                    else if (data.match(/.+seconds late.../)) {
                                        //process.stdout.write(`${data}\r`);
                                    }
                                    else if (data.match(/ytarchive.+/)) {
                                        //process.stdout.write(`${data}\r`);
                                    }
                                    else if (data.match(/Selected quality.+/)) {
                                        process.stdout.write(`${data}\n`);
                                    }
                                    else if (data.match(/Download.+/)) {
                                        process.stdout.write(`${data}\n`);
                                    }
                                    else if (data.match(/Muxing.+/)) {
                                        process.stdout.write(`${data}\n`);
                                    }
                                    else if (data.match(/Final file.+/)) {
                                        process.stdout.write(`${data}\n`);
                                    }
                                    else {
                                        data = data.replace(/\x1b\[31m/g, "").replace(/\x1b\[33m/g, "").replace(/\x1b\[0m\x1b\[K/g, "");
                                        if (data && data !== "\n") {
                                            client.guilds.cache.get(guildId).channels.cache.get(channelId).send(data);
                                            process.stdout.write(`${data}\n`);
                                        }

                                    }
                                }
                            }
                            catch (err) {
                                console.log(err)
                            }
                        });

                        ytdl.on('close', async (code) => {
                            try {
                                if (code === 0) {
                                    //client.guilds.cache.get(guildId).channels.cache.get(channelId).send(`下載 ${startMsg.embeds[0].title} 結束`);
                                    while (mutex.lock) {
                                        await wait(100);
                                    }
                                    mutex.lock = true;
                                    startMsg.edit({
                                        "content": `${startMsg.content.replace(/開始下載 /g, "")} 下載完成`,
                                        "components": [
                                            {
                                                "type": 1,
                                                "components": [
                                                    {
                                                        "type": 2,
                                                        "label": "下載已完成！",
                                                        "style": 2,
                                                        "custom_id": `normalEnd`,
                                                        "disabled": true
                                                    }
                                                ]

                                            }
                                        ]
                                    });
                                    mutex.lock = false;
                                }
                                else {
                                    startMsg.reply(`停止下載 (附註：無法下載已結束直播) 報告碼：${code}`);

                                    if (startMsg.components[0].disabled !== true) {
                                        while (mutex.lock) {
                                            await wait(100);
                                        }
                                        mutex.lock = true;
                                        startMsg.edit({
                                            "content": `${startMsg.content.replace(/開始下載 /g, "")} 下載失敗`,
                                            "components": [
                                                {
                                                    "type": 1,
                                                    "components": [
                                                        {
                                                            "type": 2,
                                                            "label": "下載失敗！",
                                                            "style": 2,
                                                            "custom_id": `notNormalEnd`,
                                                            "disabled": true
                                                        }
                                                    ]

                                                }
                                            ]
                                        });
                                        mutex.lock = false;
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
                }

                if (interaction.commandName === "twitchdl") {
                    try {
                        let channelId = interaction.channelId;
                        let guildId = interaction.guildId;


                        const twitchdl = child_process.exec(` yt-dlp --hls-use-mpegts --force-overwrites -o "./twitch video\\%(title)s.%(ext)s" -R infinite -f best ${returnValue} `, {
                            env: "./",
                            maxBuffer: 1024 * 1024 * 1024
                        })

                        twitchdl.on('spawn', () => {
                            try {
                                interaction.editReply(`開始下載 ${returnValue}`);
                            }
                            catch (err) {
                                console.log(err)
                            }
                        });
                        twitchdl.on('close', (code) => {
                            console.log(code);
                            //if(code === 0){
                            //client.guilds.cache.get(guildId).channels.cache.get(channelId).send(`下載 ${returnValue} 結束`); 
                            // }
                            //else{
                            //client.guilds.cache.get(guildId).channels.cache.get(channelId).send("出錯了，無法下載已結束直播");
                            //setTimeout(() => interaction.editReply("出錯了，無法下載已結束直播"), 3000)
                            //}
                        });
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
                if (interaction.customId.match(new RegExp("ytdlStop_"))) {
                    await kill(Number(`${interaction.customId.replace(/ytdlStop_/g, "")}`));
                    while (mutex.lock) {
                        await wait(100);
                    }
                    mutex.lock = true;
                    interaction.update({
                        "content": `${interaction.message.content.replace(/開始下載 /g, "")} 停止下載`,
                        "components": [
                            {
                                "type": 1,
                                "components": [
                                    {
                                        "type": 2,
                                        "label": "下載已停止！",
                                        "style": 2,
                                        "custom_id": `alredystop_${interaction.customId.replace(/ytdlStop_/g, "")}`,
                                        "disabled": true
                                    }
                                ]

                            }
                        ]
                    });
                    mutex.lock = false;
                }

            } catch (err) {
                console.log(err)
            }
        }
    } catch (err) {
        console.log(err)
    }
});