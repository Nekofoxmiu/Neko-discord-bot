import axios from 'axios';
import fs from 'fs';
import * as path from 'path'
import { fileURLToPath } from 'url';

const rootFloder = `${path.dirname(fileURLToPath(import.meta.url))}\\..\\`;
var guestToken;

axios.defaults.retry = 4;
axios.defaults.retryDelay = 1000;
axios.defaults.timeout = 10000;
axios.defaults.headers["User-Agent"] = "curl/7.79.1";
axios.interceptors.response.use(undefined, async (err) => {
    try {
        let config = err.config;
        // If config does not exist or the retry option is not set, reject
        if (!config || !config.retry) return Promise.reject(err);

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

        if (err.response) {
            if (err.response.status === 403) {
                if (config.headers) {
                    if (config.headers["x-guest-token"]) {
                        const response = await GetGuestToken(true);
                        config.headers["x-guest-token"] = response;
                        guestToken = response;
                    }
                }
            }
        }
        // Return the promise in which recalls axios to retry the request
        await backoff;
        return await axios(config);
    }
    catch (err) {
        //console.log(err);
    }
});


function wait(ms) {
    return new Promise(resolve => setTimeout(() => resolve(), ms));
};

export let GetGuestToken = async function GetGuestToken(outdataOrNot) {

    
    outdataOrNot = outdataOrNot || false;
    try { guestToken = JSON.parse(fs.readFileSync(`${rootFloder}\\data_json\\Token.json`)); }
    catch (err) {
        console.log('Failed to load Token.json now clear old file and rebuild one.');

        guestToken = await axios("https://api.twitter.com/1.1/guest/activate.json", {
            "headers": {
                "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"
            },
            "method": "POST"
        })
            .then((response) => { return response.data.guest_token; })
            .catch(() => { console.log('get x-guestToken fail.'); return -1; });

        if (guestToken === -1) { return -1; }

        fs.writeFileSync(`${rootFloder}\\data_json\\Token.json`, JSON.stringify({ "guestToken": guestToken }));

        return guestToken;
    }
    if (outdataOrNot) {
        guestToken = await axios("https://api.twitter.com/1.1/guest/activate.json", {
            "headers": {
                "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"
            },
            "method": "POST"
        })
            .then((response) => { return response.data.guest_token; })
            .catch(() => { console.log('get x-guestToken fail.'); return -1; });

        fs.writeFileSync(`${rootFloder}\\data_json\\Token.json`, JSON.stringify({ "guestToken": guestToken }));

        return guestToken;
    }
    else { return guestToken.guestToken; }
}

export let formatDate = function formatDate(unixtime) {
    let today;
    if(unixtime) {
        today = new Date(unixtime);
    } 
    else {
        today = new Date();
    }

    let month = '';
    if ((today.getMonth() + 1) < 10) {
        month = '0' + (today.getMonth() + 1);
    }
    else {
        month = (today.getMonth() + 1);
    }

    const AddZero = (time) => {
        if (time < 10) {
            time = '0' + time;
            return time;
        }
        else {
            return time;
        }
    }
    let currentDateTime =
        today.getFullYear() + '' +
        month + '' +
        AddZero(today.getDate()) + '_' +
        AddZero(today.getHours()) + '_' +
        AddZero(today.getMinutes());
    //console.log(currentDateTime);

    return currentDateTime;
}

export let toUtf8 = function toUtf8(rawString) {
    let outputString = "";
    let stringUtf8 = Buffer.from(rawString, 'utf-8').toString();
    for (let i = 0; i < stringUtf8.length; i++) { outputString += `\\u${stringUtf8.codePointAt(i).toString(16)}` }
    return outputString;
}

export let detectStop = async function(spaceId, ms, checkTimeLimit) {
    try {

        
        for (let checkStop = false, checkTime = 0; checkStop === false || checkTime < checkTimeLimit;) {


            let spaceOnOffData = await axios.get(`https://api.twitter.com/2/spaces?ids=${spaceId}`)
                    .then((response) => { return response.data; })
                    .catch((err) => { console.log('On off check error'); });
                if (spaceOnOffData) {
                        if (spaceOnOffData.data[i].state == 'ended') {
                            checkStop = true;
                            checkTime++;
                        }
                        else {
                            checkStop = false;
                            checkTime = 0;
                        }
                    
                }

            await wait(ms);
        }
    } catch (err) {
        console.log(err)
    }
}
