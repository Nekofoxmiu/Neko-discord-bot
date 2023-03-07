'use strict';

import * as Discord from "discord.js";
import kill from 'tree-kill-promise';

async function ytdlStop(interaction) {
    if (!(interaction instanceof Discord.Interaction)) { throw new Error("Enter must be Interaction"); }
    if (interaction.customId.match(new RegExp("ytdlStop_"))) {
        await kill(Number(`${interaction.customId.replace(/ytdlStop_/g, "")}`));
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
    }
}

export default ytdlStop;
