'use strict';

import child_process from 'child_process';
import * as Discord from "discord.js";
import * as path from 'path'
import { fileURLToPath } from 'url';

const rootFloder = `${path.dirname(fileURLToPath(import.meta.url))}\\..\\`;

function twitchdl(interaction) {
    if (!(interaction instanceof Discord.Interaction)) { throw new Error("Enter must be Interaction"); }
    let channelId = interaction.channelId;
    let guildId = interaction.guildId;

    let videoURL = interaction.options.get('url').value;

    const twitchdl = child_process.exec(`yt-dlp --hls-use-mpegts --force-overwrites -o "${rootFloder}\\twitch video\\%(title)s.%(ext)s" -R infinite -f best ${videoURL} `, {
        cwd: `${rootFloder}\\exe_tool`,
        maxBuffer: 1024 * 1024 * 1024
    })

    twitchdl.on('spawn', () => {
        try {
            interaction.editReply(`開始下載 ${videoURL}`);
        }
        catch (err) {
            console.log(err)
        }
    });
    twitchdl.on('close', (code) => {
        console.log(code);
    });
}


export default twitchdl;
