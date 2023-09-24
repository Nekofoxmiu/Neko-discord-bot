'use strict';

import * as Discord from "discord.js";
import * as path from 'path'
import { fileURLToPath } from 'url';
import axios from "axios";
import GetQueryId from "./GetQueryId.js";
import * as small_tool from "./small_tool.js";
import fs from "fs"

const rootFloder = `${path.dirname(fileURLToPath(import.meta.url))}\\..`;

const auth = JSON.parse(fs.readFileSync(`${rootFloder}\\setting\\auth.json`));

const cookie = auth.twitter;

var guestToken = small_tool.GetGuestToken(false);

async function space_create(spaceTrigger, interaction) {


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

    if (!(interaction instanceof Discord.Interaction)) { throw new Error("Enter must be Interaction"); }
    if (!(interaction.options.get('twitteruser').value)) { throw new Error("twitteruser must exists"); }


    let channelId = interaction.channelId;
    let guildId = interaction.guildId;
    let userName = interaction.options.get('twitteruser').value;
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
        let userId_Features = {};
        for (let i = 0; (UserByScreenNameQraphl.queryToken).length > i; i++) {
            userId_Features[(UserByScreenNameQraphl.queryToken)[i]] = false;
        }

        userId = await axios(`https://twitter.com/i/api/graphql/${UserByScreenNameQraphl.queryId}/UserByScreenName?variables=` + encodeURIComponent(JSON.stringify({
            "screen_name": `${userName}`,
            "withSafetyModeUserFields": true
        })) +
            "&features=" + encodeURIComponent(JSON.stringify(userId_Features)), {
            "headers": {
                "cookie": `auth_token=${cookie.auth}; ct0=${cookie.ct0}`,
                "x-csrf-token": cookie.ct0,
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
                console.log(err)
                interaction.editReply(`${userName} 加入追蹤失敗，請確認是否打錯，若無錯誤請再試一次`);
                console.log(`伺服器：${guildId}　頻道： ${channelId} userId 錯誤`)
            })

        idListData[userName] = userId;
        fs.writeFileSync(`${rootFloder}\\data_json\\ID_List.json`, JSON.stringify(idListData, null, '    '));
    }
}

export default space_create;
