'use strict';

import child_process from 'child_process';
import * as Discord from "discord.js";
import * as path from 'path'
import { fileURLToPath } from 'url';

const rootFloder = `${path.dirname(fileURLToPath(import.meta.url))}\\..\\`;

function wait(ms) {
    return new Promise(resolve => setTimeout(() => resolve(), ms));
};

async function youtubedl_faaast(client, interaction) {

    if (!(interaction instanceof Discord.Interaction)) { throw new Error("Enter must be Interaction"); }

    let mutex = {
        unlock: true,
        data: ""
    }
    
    if (!(interaction.options.get('url').value)) { throw new Error("URL must exists"); }
    let video_ID;
    if (!(interaction.options.get('url').value).match(/https?:\/\/(?:[\w-]+\.)?(?:youtu\.be\/|youtube(?:-nocookie)?\.com\S*[^\w\s-])([\w-]{11})(?=[^\w-]|$)(?![?=&+%\w.-]*(?:['""][^<>]*>|<\/a>))[?=&+%\w.-]*/)) {

        await interaction.editReply("請確認你輸入的是Youtube網址 如果確認為youtube網址 請試著將後端不必要網址刪除，或確保v=後只有11碼") 
        throw new Error("URL error");       
    }
    video_ID = "https://www.youtube.com/watch?v=" + (interaction.options.get('url').value).match(/https?:\/\/(?:[\w-]+\.)?(?:youtu\.be\/|youtube(?:-nocookie)?\.com\S*[^\w\s-])([\w-]{11})(?=[^\w-]|$)(?![?=&+%\w.-]*(?:['""][^<>]*>|<\/a>))[?=&+%\w.-]*/)[1];

    let startMsg;
    let channelId = interaction.channelId;
    let guildId = interaction.guildId;

    let ytdl = child_process.exec(`ytarchive.exe --merge --add-metadata --no-frag-files --thumbnail --threads 8 -w -o "${rootFloder}\\youtube video\\%(title)s-%(id)s" ${video_ID} best `, {
        cwd: `${rootFloder}\\exe_tool`,
        maxBuffer: 1024 * 1024 * 1024
    })

    ytdl.on('spawn', async () => {
        try {
            while (mutex.lock) {
                await wait(100);
            }
            mutex.lock = true;
            startMsg = await interaction.editReply(
                {
                    "content": `開始下載 ${video_ID}`,
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

                data = data.replace(/\x1b\[31m/g, "");
                data = data.replace(/\x1b\[33m/g, "");
                data = data.replace(/\x1b\[0m\x1b\[K/g, "");
                data = data.replace(/\n\r/g, "\n");
                data = data.trim();


                if (
                    data.match(/(Video Fragments:).+/) || 
                    data.match(/.+seconds late.../) || 
                    data.match(/ytarchive/) || 
                    data.match(/Video details no longer available mid download./) ||
                    data.match(/Stream was likely privated after finishing./) ||
                    data.match(/We will continue to download, but if it starts to fail, nothing can be done./) ||
                    data.match(/Video Details not found, video is likely private or does not exist./)
                    ) {
                    //process.stdout.write(`${data}\r`);
                }
                else if (data.match(/Selected quality/)) {
                    console.log(`${data}  ${video_ID}`);
                }
                else if (data.match(/Download.+/) || data.match(/Muxing.+/) || data.match(/Final file.+/)) {
                    console.log(data);
                }
                else {
                    if (data && data !== "\n") {
                        try { client.guilds.cache.get(guildId).channels.cache.get(channelId).send(data); } catch(err) {console.log(err);} 
                        console.log(data);
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

export default youtubedl_faaast;
