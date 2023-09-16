'use strict';


import fs from "fs"
import * as Discord from "discord.js";
import * as path from 'path'
import { fileURLToPath } from 'url';
import axios from "axios";
import * as small_tool from "./small_tool.js";
import child_process from 'child_process';


const rootFloder = `${path.dirname(fileURLToPath(import.meta.url))}\\..`;

async function space_m3u8download(client, interaction, spaceSavePlace) {


    if (!(interaction instanceof Discord.Interaction)) { throw new Error("Enter must be Interaction"); }
    if (!(interaction.options.get('m3u8url').value)) { throw new Error("m3u8url must exists"); }

    let channelId = interaction.channelId;
    let guildId = interaction.guildId;

    let currentDateTime = small_tool.formatDate();
    let m3u8Name;
    let m3u8URL;
    interaction.options.get('名稱') && (m3u8Name = interaction.options.get('名稱').value);
    interaction.options.get('m3u8url') && (m3u8URL = interaction.options.get('m3u8url').value);
    m3u8Name = m3u8Name.replace(/[<>:;,?"*|/\\]/g, "").replace(/\s/g, "_");
    if (m3u8Name === "") { m3u8Name = `unname_${currentDateTime}`; }
    let masterlist = (m3u8URL).replace(/(?<=audio-space\/).*?(?=_playlist.m3u8)/g, "master").replace(/\?type=live/g, "").replace(" ", "");
    let baseUrl = masterlist.replace(/\/master_playlist.m3u8/g, "");



    let _res = await axios.get(masterlist, { headers: { "User-Agent": "curl/7.79.1" } })
        .then((response) => {
            try {
                let _res = "https://prod-fastly-ap-southeast-1.video.pscp.tv" + response.data.replace(/(.|\r|\n)*?(?=\/Transcoding)/g, "").replace(" ", "");
                return _res;
            } catch (err) {
                console.log(err)
            }
        })
        .catch((err) => { console.log(err); });

    await axios.get(_res, { headers: { "User-Agent": "curl/7.79.1" } })
        .then((response) => {

            try {
                fs.writeFileSync(`${rootFloder}\\master_${currentDateTime}_${m3u8Name}.m3u8`, response.data.replace(/chunk/g, `${baseUrl}/chunk`));
            } catch (err) { console.log("建立m3u8失敗\n", err); };

            try {
                interaction.editReply(`已記錄。 m3u8檔案： master_${currentDateTime}_${m3u8Name}.m3u8`);
            } catch (err) { console.log("編輯交互失敗\n", err); }

            try {
                const m3u8download = child_process.exec(`ffmpeg.exe -y -protocol_whitelist file,http,https,tcp,tls -i "${rootFloder}\\master_${currentDateTime}_${m3u8Name}.m3u8" "${spaceSavePlace}\\${m3u8Name}.m4a" `, {
                    cwd: `${rootFloder}\\exe_tool`,
                    maxBuffer: 1024 * 1024 * 1024
                })

                m3u8download.on('spawn', () => {
                    try {
                        interaction.editReply(`${m3u8Name} 開始下載 `);
                        console.log(`${m3u8Name} 開始下載 `)
                    } catch (err) {
                        console.log(err);
                    }
                });
                m3u8download.on('close', async (code) => {

                    if (code === 0) {
                        try {
                            await client.guilds.cache.get(guildId).channels.cache.get(channelId).send(`${m3u8Name} 下載結束`);
                            console.log(`${m3u8Name} 下載結束 `)
                        } catch (err) { console.log(err); }
                    }
                    try {
                        fs.unlinkSync(`${rootFloder}\\master_${currentDateTime}_${m3u8Name}.m3u8`);
                    } catch (err) { console.log("刪除m3u8失敗\n", err); };
                });
            } catch (err) { console.log("自m3u8下載失敗\n", err) }
        })
}

export default space_m3u8download;