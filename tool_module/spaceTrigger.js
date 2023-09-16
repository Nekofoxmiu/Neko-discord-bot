import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path'
import { fileURLToPath } from 'url';

axios.defaults.retry = 10;
axios.defaults.retryDelay = 10000;
axios.defaults.timeout = 10000;
axios.defaults.headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' + ' ' +
    'AppleWebKit/537.36 (KHTML, like Gecko)' + ' ' +
    'Chrome/96.0.4664.93 Safari/537.36';
axios.defaults.headers['authorization'] = 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

const rootFloder = `${path.dirname(fileURLToPath(import.meta.url))}\\..\\`;


try {
    let data = fs.readFileSync(`${rootFloder}\\setting\\auth.json`);
    let auth_json = JSON.parse(data.toString());
    axios.defaults.headers['cookie'] = `auth_token=${auth_json.twitter.auth}`;
}
catch (err) {
    console.log('Failed to load auth.json now clear old file and rebuild one.');
    fs.writeFileSync(`${rootFloder}\\data_json\\spacetrackList.json`, JSON.stringify({}));
}





axios.interceptors.response.use(undefined, async (err) => {
    let config = err.config;
    try {
        // If config does not exist or the retry option is not set, reject
        if (!config || !config.retry)
            return Promise.reject(err);
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
        // Return the promise in which recalls axios to retry the request
        await backoff;
        return await axios(config);
    }
    catch (err) {
        if (config.__retryCount) {
            console.log(`spaceTrigger error retry: ${config.__retryCount}`);
            console.log(err);
        }
        else {
            console.log(err);
        }
    }
});


function wait(ms) {
    return new Promise(resolve => setTimeout(() => resolve(), ms));
}
let close = false;
let spacetrackList = {};
try {
    let data = fs.readFileSync(`${rootFloder}\\data_json\\spacetrackList.json`);
    spacetrackList = JSON.parse(data.toString());
}
catch (err) {
    console.log('Failed to load spacetrackList.json now clear old file and rebuild one.');
    fs.writeFileSync(`${rootFloder}\\data_json\\spacetrackList.json`, JSON.stringify({}));
}
let trackIds = Object.keys(spacetrackList);
let IdsForAxios = '';
let spaceIdsForAxios = '';
let alreadyPost = {};
let alreayPostOrNot = false;
let clearArray = [];
let spaceData;
let outputobj = {};
let mutex = false;
let spacemutex = false;

async function run_check(retry_times) {
    trackIds = Object.keys(spacetrackList);
    let result = [];
    for (let i = 0; i < trackIds.length; i += 100) {
        const group = trackIds.slice(i, i + 100);
        const groupStr = group.join(',');
        result.push(groupStr);
    }
    let startinit = true;
    while (!close) {
        if (startinit) {
            process.once('message', () => {
                close = true;
            });
            startinit = false;
        }
        while (spacemutex) {
            await wait(100);
        }
        spacemutex = true;
        for (let spacelist_count = 0; spacelist_count < result.length; ++spacelist_count) {
            spaceData = await axios.get(`https://twitter.com/i/api/fleets/v1/avatar_content?user_ids=${result[spacelist_count]}&only_spaces=true`)
                .then((response) => { return response.data; })
                .catch((err) => { console.log('space trigger error'); });

            if (!spaceData) { continue; }

            if (spaceData.users) {
                for (let i = 0; Object.keys(spaceData.users).length > i; i++) {
                    for (let j = 0; Object.keys(alreadyPost).length > j; j++) {
                        if (spaceData.users[Object.keys(spaceData.users)[i]].spaces.live_content.audiospace.broadcast_id === alreadyPost[Object.keys(alreadyPost)[j]]) {
                            alreayPostOrNot = true;
                        }
                    }
                    if (!alreayPostOrNot) {

                        outputobj = {
                            id: Object.keys(spaceData.users)[i],
                            sendplace: spacetrackList[Object.keys(spaceData.users)[i]]
                        };
                        if (process.send !== undefined) {
                            process.send(outputobj);
                        }
                        alreadyPost[Object.keys(spaceData.users)[i]] = spaceData.users[Object.keys(spaceData.users)[i]].spaces.live_content.audiospace.broadcast_id;

                    }
                    alreayPostOrNot = false;
                }
            }
            if (Object.keys(alreadyPost).length > 0) {
                spaceIdsForAxios = Object.keys(alreadyPost)[0];
                for (let i = 1; Object.keys(alreadyPost).length > i; i++) {
                    spaceIdsForAxios += `,${Object.keys(alreadyPost)[i]}`;
                }
                let spaceOnOffData = await axios.get(`https://twitter.com/i/api/fleets/v1/avatar_content?user_ids=${spaceIdsForAxios}&only_spaces=true`)
                    .then((response) => { return response.data; })
                    .catch((err) => { console.log('On off check error'); });

                let empty_count = 0;
                if (spaceOnOffData.users) {
                    for (let i = 0; Object.keys(spaceOnOffData.users).length > i; i++) {
                        alreadyPost[Object.keys(spaceOnOffData.users)[i]] = spaceOnOffData.users[Object.keys(spaceOnOffData.users)[i]]?.spaces?.live_content?.audiospace?.broadcast_id;
                    }
                }
                else {
                    empty_count++;
                    if (empty_count > retry_times) {
                        alreadyPost = {};
                        empty_count = 0;
                    }
                }
            }
            spacemutex = false;

        }
        await wait(30000);
    }
    close = false;

}


process.on('message', async (msg) => {
    //先確認數據庫是否有這個id
    if (spacetrackList[msg.id]) {
        let checkid = true;
        for (let i = 0; (spacetrackList[msg.id]).length > i; i++) {
            for (let j = 0; (spacetrackList[msg.id][i].channel).length > j; j++) {
                if (spacetrackList[msg.id][i].channel[j] === msg.channel) {
                    checkid = false;
                    if (process.send !== undefined) {
                        process.send('repeatError');
                    }
                }
            }
        }
        //確認輸入的id在輸入的頻道中有無跟數據庫中的重複
        if (checkid) {
            let checkserver = true;
            for (let i = 0; (spacetrackList[msg.id]).length > i; i++) {
                if (spacetrackList[msg.id][i].server !== msg.server) { continue; }

                checkserver = false;
                spacetrackList[msg.id][i].channel.push(msg.channel);
                while (mutex) {
                    await wait(100);
                }
                mutex = true;
                fs.writeFileSync(`${rootFloder}\\data_json\\spacetrackList.json`, JSON.stringify(spacetrackList, null, '    '));
                mutex = false;
                if (process.send !== undefined) {
                    process.send('addSuccess');
                }
                await axios.get(`https://twitter.com/i/api/fleets/v1/avatar_content?user_ids=${msg.id}&only_spaces=true`)
                    .then((response) => {
                        if (response?.data?.users) {
                            if (process.send !== undefined) {
                                process.send({ id: msg.id, sendplace: [{ server: msg.server, channel: [msg.channel] }] });
                            }
                        }
                    })
                    .catch((err) => { console.log(err); });

            }
            if (checkserver) {
                spacetrackList[msg.id].push({ server: msg.server, channel: [msg.channel] });
                while (mutex) { await wait(100); }
                mutex = true;
                fs.writeFileSync(`${rootFloder}\\data_json\\spacetrackList.json`, JSON.stringify(spacetrackList, null, '    '));
                mutex = false;
                if (process.send !== undefined) { process.send('addSuccess'); }
                await axios.get(`https://twitter.com/i/api/fleets/v1/avatar_content?user_ids=${msg.id}&only_spaces=true`)
                    .then((response) => {
                        if (response?.data?.users) {
                            if (process.send !== undefined) {
                                process.send({ id: msg.id, sendplace: [{ server: msg.server, channel: [msg.channel] }] });
                            }
                        }
                    })
                    .catch((err) => { console.log('space trigger error'); });
            }
        }
    }
    else {
        spacetrackList[msg.id] = [{ server: msg.server, channel: [msg.channel] }];
        while (mutex) { await wait(100); }
        mutex = true;
        fs.writeFileSync(`${rootFloder}\\data_json\\spacetrackList.json`, JSON.stringify(spacetrackList, null, '    '));
        mutex = false;
        if (process.send !== undefined) {
            process.send('addSuccess');
        }
    }
    run_check(5);
});


if (trackIds.length > 0) {
    run_check(5);
}
/*

{
    
1227290686602371075: [
    {
        server: 778954285731151883,
        channel: 778954285731151883
    },
    {
        server: 778954285731151883,
        channel: 778954285731151883
    },
    {
        server: 778954285731151883,
        channel: 778954285731151883
    },
]


}



*/
