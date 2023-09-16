'use strict';

import * as Discord from "discord.js";
import TwitterSpace from './twitterspace_dl.js';
import * as small_tool from "./small_tool.js"
async function space_download(interaction, client, spaceSavePlace, auth) {
    
    if (!(interaction instanceof Discord.Interaction)) { throw new Error("Enter must be Interaction"); }
    if (!(interaction.options.get('twitteruser').value)) { throw new Error("twitteruser must exists"); }


    let userName = interaction.options.get('twitteruser').value;
    let channelId = interaction.channelId;
    let guildId = interaction.guildId;
    TwitterSpace(userName, auth.twitter, {
        "record": true,
        "outputPath": spaceSavePlace
    })

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
                        if (response) {
                            if (response.m3u8) {
                                interaction.editReply(`開始下載 ${userName} 的 ${response.title}`);
                                console.log(`開始下載 ${userName} 的 ${response.title}`);
                                small_tool.detectStop(response.spaceId, 30000, 3).then(async () => {
                                    try { await client.guilds.cache.get(guildId).channels.cache.get(channelId).send(`下載 ${userName} 的 ${response.title} 完成`); } catch (err) { console.log(err); }
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

export default space_download;