'use strict';

import * as Discord from "discord.js";
import TwitterSpace from './twitterspace_dl.js';

async function space_check(interaction, auth) {

    if (!(interaction instanceof Discord.Interaction)) { throw new Error("Enter must be Interaction"); }
    if (!(interaction.options.get('twitteruser').value)) { throw new Error("twitteruser must exists"); }


    let userName = interaction.options.get('twitteruser').value;
    await TwitterSpace(userName, auth.twitter, { "record": false }).then(async (response) => {
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

export default space_check;