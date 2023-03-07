'use strict';

import * as Discord from "discord.js";
import fs from "fs";
import * as path from 'path'
import { fileURLToPath } from 'url';

const rootFloder = `${path.dirname(fileURLToPath(import.meta.url))}\\..\\`;

function wait(ms) {
    return new Promise(resolve => setTimeout(() => resolve(), ms));
};

async function notice(client, interaction) {
    if (!(interaction instanceof Discord.Interaction)) { throw new Error("Enter must be Interaction"); }
    let channelId = interaction.channelId;
    let guildId = interaction.guildId;
    let dateTime = interaction.createdTimestamp;
    let userId = interaction.member.id;
    let noticeList = {};
    let time = 0;
    let day = 0;
    let hour = 0;
    let min = 0;
    let sec = 0;
    let todo = interaction.options.get('做啥').value;
    interaction.options.get('天') && (day = interaction.options.get('天').value);
    interaction.options.get('小時') && (hour = interaction.options.get('小時').value);
    interaction.options.get('分鐘') && (min = interaction.options.get('分鐘').value);
    interaction.options.get('秒') && (sec = interaction.options.get('秒').value);
    try { time = (24 * 3600 * day + 3600 * hour + 60 * min + sec) * 1000; } catch (err) { console.log(err); }

    if (time == 0) {
        try { interaction.editReply(`所以說...給我馬上去做`); } catch (err) { console.log(err); }
    }
    else {
        try { interaction.editReply(`將會在<t:${Math.floor((dateTime + time) / 1000)}:F> 提醒 <@${userId}> ${todo}`); } catch (err) { console.log(err); }

        try { noticeList = JSON.parse(fs.readFileSync(`${rootFloder}\\data_json\\noticeList.json`)); }
        catch (err) {
            console.log('Failed to load noticeList.json now clear old file and rebuild one.');
            fs.writeFileSync(`${rootFloder}\\data_json\\noticeList.json`, JSON.stringify({}, null, "    "));
            noticeList = {};
        }
        noticeList[`${dateTime + time}`] = {
            guildId: guildId,
            channelId: channelId,
            userId: userId,
            todo: todo,
            time: dateTime + time
        };
        try { fs.writeFileSync(`${rootFloder}\\data_json\\noticeList.json`, JSON.stringify(noticeList, null, "    ")); }
        catch (err) {
            console.log('Failed to write noticeList.json.');
            console.log(err);
        }
        await wait(time);
        try { client.guilds.cache.get(guildId).channels.cache.get(channelId).send(`<@${userId}> ${todo}`); } catch (err) { console.log(err); }
        try { noticeList = JSON.parse(fs.readFileSync(`${rootFloder}\\data_json\\noticeList.json`)); }
        catch (err) {
            console.log('Failed to load noticeList.json now clear old file and rebuild one.');
            fs.writeFileSync(`${rootFloder}\\data_json\\noticeList.json`, JSON.stringify({}, null, "    "));
            noticeList = {};
        }
        delete noticeList[`${dateTime + time}`];
        try { fs.writeFileSync(`${rootFloder}\\data_json\\noticeList.json`, JSON.stringify(noticeList, null, "    ")); }
        catch (err) {
            console.log('Failed to write noticeList.json.');
            console.log(err);
        }
    }
}


export default notice;
