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
axios.defaults.headers['authorization'] = 'Bearer AAAAAAAAAAAAAAAAAAAAADs4UAEAAAAAkf2Pm5P3r' +
    'Pxv4ETaIaO%2BUwoGcmY%3DcotVS1hV8OHA3DI1iuWg50uuujVPsbQN3sAAnSwqdLFjCtQYgc';
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

const rootFloder = `${path.dirname(fileURLToPath(import.meta.url))}\\..\\`;

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
let alreadyPost = [];
let checkAlreay = false;
let clearArray = [];
let spaceData;
let outputobj = {};
let mutex = false;
let spacemutex = false;
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
                if (spacetrackList[msg.id][i].server === msg.server) {
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
                    await axios.get(`https://api.twitter.com/2/spaces/by/creator_ids?user_ids=${msg.id}&space.fields=host_ids`)
                        .then((response) => {
                        if (response.data) {
                            if (response.data.data) {
                                if (process.send !== undefined) {
                                    process.send({ id: msg.id, sendplace: [{ server: msg.server, channel: [msg.channel] }] });
                                }
                            }
                        }
                    })
                        .catch((err) => { console.log(err); });
                }
            }
            if (checkserver) {
                spacetrackList[msg.id].push({
                    server: msg.server,
                    channel: [msg.channel]
                });
                while (mutex) {
                    await wait(100);
                }
                mutex = true;
                fs.writeFileSync(`${rootFloder}\\data_json\\spacetrackList.json`, JSON.stringify(spacetrackList, null, '    '));
                mutex = false;
                if (process.send !== undefined) {
                    process.send('addSuccess');
                }
                await axios.get(`https://api.twitter.com/2/spaces/by/creator_ids?user_ids=${msg.id}&space.fields=host_ids`)
                    .then((response) => {
                    if (response.data) {
                        if (response.data.data) {
                            if (process.send !== undefined) {
                                process.send({
                                    id: msg.id,
                                    sendplace: [
                                        {
                                            server: msg.server,
                                            channel: [msg.channel]
                                        }
                                    ]
                                });
                            }
                        }
                    }
                })
                    .catch((err) => { console.log('space trigger error'); });
            }
        }
    }
    else {
        spacetrackList[msg.id] = [
            {
                server: msg.server,
                channel: [msg.channel]
            }
        ];
        while (mutex) {
            await wait(100);
        }
        mutex = true;
        fs.writeFileSync(`${rootFloder}\\data_json\\spacetrackList.json`, JSON.stringify(spacetrackList, null, '    '));
        mutex = false;
        if (process.send !== undefined) {
            process.send('addSuccess');
        }
    }
    trackIds = Object.keys(spacetrackList);
    IdsForAxios = trackIds[0];
    for (let i = 1; trackIds.length > i; i++) {
        IdsForAxios += `%2C${trackIds[i]}`;
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
        spaceData = await axios.get(`https://api.twitter.com/2/spaces/by/creator_ids?user_ids=${IdsForAxios}&space.fields=host_ids`)
            .then((response) => { return response.data; })
            .catch((err) => { console.log('space trigger error'); });
        if (spaceData) {
            if (spaceData.data) {
                for (let i = 0; spaceData.meta.result_count > i; i++) {
                    for (let j = 0; alreadyPost.length > j; j++) {
                        if (spaceData.data[i].id === alreadyPost[j]) {
                            checkAlreay = true;
                        }
                    }
                    if (!checkAlreay) {
                        if (spaceData.data[i].state !== 'scheduled' && spaceData.data[i].state === 'live') {
                            outputobj = {
                                id: spaceData.data[i].host_ids[0],
                                sendplace: spacetrackList[spaceData.data[i].host_ids[0]]
                            };
                            if (process.send !== undefined) {
                                process.send(outputobj);
                            }
                            alreadyPost.push(spaceData.data[i].id);
                        }
                    }
                    checkAlreay = false;
                }
            }
            if (alreadyPost.length > 0) {
                spaceIdsForAxios = alreadyPost[0];
                for (let i = 1; alreadyPost.length > i; i++) {
                    spaceIdsForAxios += `%2C${alreadyPost[i]}`;
                }
                let spaceOnOffData = await axios.get(`https://api.twitter.com/2/spaces?ids=${spaceIdsForAxios}`)
                    .then((response) => { return response.data; })
                    .catch((err) => { console.log('On off check error'); });
                if (spaceOnOffData) {
                    for (let i = 0, k = 0; alreadyPost.length > i; i++) {
                        if (spaceOnOffData.data[i].state !== 'ended') {
                            clearArray[k] = alreadyPost[i];
                            k++;
                        }
                    }
                    alreadyPost = clearArray;
                    clearArray = [];
                }
            }
            spacemutex = false;
        }
        await wait(15000);
    }
    close = false;
});
if (trackIds.length > 0) {
    IdsForAxios = trackIds[0];
    for (let i = 1; trackIds.length > i; i++) {
        IdsForAxios += `%2C${trackIds[i]}`;
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
        spaceData = await axios.get(`https://api.twitter.com/2/spaces/by/creator_ids?user_ids=${IdsForAxios}&space.fields=host_ids`)
            .then((response) => { return response.data; })
            .catch((err) => { console.log('space trigger error'); });
        if (spaceData) {
            if (spaceData.data) {
                for (let i = 0; spaceData.meta.result_count > i; i++) {
                    for (let j = 0; alreadyPost.length > j; j++) {
                        if (spaceData.data[i].id === alreadyPost[j]) {
                            checkAlreay = true;
                        }
                    }
                    if (!checkAlreay) {
                        if (spaceData.data[i].state !== 'scheduled' && spaceData.data[i].state === 'live') {
                            outputobj = {
                                id: spaceData.data[i].host_ids[0],
                                sendplace: spacetrackList[spaceData.data[i].host_ids[0]]
                            };
                            if (process.send !== undefined) {
                                process.send(outputobj);
                            }
                            alreadyPost.push(spaceData.data[i].id);
                        }
                    }
                    checkAlreay = false;
                }
            }
            if (alreadyPost.length > 0) {
                spaceIdsForAxios = alreadyPost[0];
                for (let i = 1; alreadyPost.length > i; i++) {
                    spaceIdsForAxios += `%2C${alreadyPost[i]}`;
                }
                let spaceOnOffData = await axios.get(`https://api.twitter.com/2/spaces?ids=${spaceIdsForAxios}`)
                    .then((response) => { return response.data; })
                    .catch((err) => { console.log('On off check error'); });
                if (spaceOnOffData) {
                    for (let i = 0, k = 0; alreadyPost.length > i; i++) {
                        if (spaceOnOffData.data[i].state !== 'ended') {
                            clearArray[k] = alreadyPost[i];
                            k++;
                        }
                    }
                    alreadyPost = clearArray;
                    clearArray = [];
                }
            }
            spacemutex = false;
        }
        await wait(15000);
    }
    close = false;
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
