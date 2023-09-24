import GetQueryId from "./GetQueryId.js"
import axios from "axios";
import tweetJsonToHtml from 'tweet-json-to-html';
import puppeteer from "puppeteer";

axios.defaults.headers["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36";
const Bearer = "Bearer AAAAAAAAAAAAAAAAAAAAADs4UAEAAAAAkf2Pm5P3rPxv4ETaIaO%2BUwoGcmY%3DcotVS1hV8OHA3DI1iuWg50uuujVPsbQN3sAAnSwqdLFjCtQYgc";
function wait(ms) {
    return new Promise(resolve => setTimeout(() => resolve(), ms));
};

function featureSwitchBuiler(queryToken) {
    let featureOBJ;
    for (let i = 0; (queryToken).length > i; i++) {
        featureOBJ[queryToken[i]] = false;
    }
    return featureOBJ;
}

async function GetQueryId_retry(queryInfo, times, retry_flag, check) {
    if (retry_flag === undefined) { retry_flag = 0 };
    if (check === undefined) { check = true };

    return GetQueryId(queryInfo, check, false)
        .then((response) => {
            return response;
        })
        .catch((err) => {
            if (retry_flag < times) {
                ++retry_flag;
                console.log(`Get Qraphl List fail. (retry: ${retry_flag}/${times})`);
                return GetQueryId_retry(queryInfo, times, retry_flag, false);
            }
            else {
                console.log('Get Qraphl List fail.');
                return Promise.reject(new Error(err));
            }

        });
}

async function axios_retry(url, headers, times, retry_flag) {
    if (!retry_flag) { retry_flag = 0 };

    return axios(url, headers)
        .catch((err) => {
            if (retry_flag < times) {
                ++retry_flag;
                console.log(`axios fail. (retry: ${retry_flag}/${times})`);
                return axios_retry(url, headers);
            }
            else {
                console.log('axios fail.');
                return Promise.reject(new Error(err));
            }

        });
}

async function tohtml(tweetid) {
        let jsondata = await axios_retry(`https://api.twitter.com/2/tweets/${tweetid}` + `?tweet.fields=attachments,author_id,context_annotations,conversation_id,created_at,` +
                                                                                            `edit_controls,edit_history_tweet_ids,entities,geo,id,in_reply_to_user_id,lang,` +
                                                                                            `possibly_sensitive,public_metrics,referenced_tweets,reply_settings,source,text,` +
                                                                                            `withheld&expansions=attachments.media_keys,attachments.poll_ids,author_id,edit_history_tweet_ids,` +
                                                                                            `entities.mentions.username,geo.place_id,in_reply_to_user_id,referenced_tweets.id,` +
                                                                                            `referenced_tweets.id.author_id&media.fields=alt_text,duration_ms,height,media_key,` +
                                                                                            `preview_image_url,public_metrics,type,url,variants,width&poll.fields=duration_minutes,` +
                                                                                            `end_datetime,id,options,voting_status&user.fields=created_at,description,entities,id,` +
                                                                                            `location,name,pinned_tweet_id,profile_image_url,protected,public_metrics,url,username,` +
                                                                                            `verified,withheld&place.fields=contained_within,country,country_code,full_name,geo,id,name,place_type`
            , { "headers": { "authorization": Bearer, "cookie": "guest_id=v1%3A168411793373102941"} },5)
            .then((res)=> {return res.data;})
            .catch((err) => {
                console.log(err)
            })
            
       if(jsondata.errors) { 
            if(jsondata.data) {
                delete jsondata.data.referenced_tweets; 
            }      
        }
        return tweetJsonToHtml(jsondata, "dim");
}

async function topng(tweetid) {
    let html = await tohtml(tweetid)
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html);
    const articleHandle = await page.$('body > article');
    const rect = await page.evaluate(el => {
        const { x, y, padding, width, height } = el.getBoundingClientRect();
        return { x, y, padding, width, height };
    },articleHandle);
    await page.setViewport({
        width: rect.width,
        height: Math.floor(rect.height),
        deviceScaleFactor: 1,
    });
    return await page.screenshot({
        path: `H:/bot/Twitter_screenshot/${tweetid}.png`,
        clip:{
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: Math.floor(rect.height)
        },
    
    
    })
    .then(async (res) => {
        await browser.close();
        return res;
    })
}

async function tweet_fetch() {
    let response;
    let UserByScreenNameQraphl;
    let UserByRestIdQraphl;
    let UserByScreenNameFeature;
    let UserByRestIdFeature;

    response = await GetQueryId_retry(['UserByScreenName', 'UserByRestId'], 5);

    UserByScreenNameQraphl = response[0].queryId;
    UserByRestIdQraphl = response[1].queryId;

    UserByScreenNameFeature = featureSwitchBuiler(response[0].queryToken);
    UserByRestIdFeature = featureSwitchBuiler(response[1].queryToken);

    console.log(`Get UserByScreenNameQraphl: [ ${response[0].queryId} ]`);
    console.log(`Get UserByRestIdQraphl: [ ${response[1].queryId} ]`);

}

//console.log(await topng("1551906988619370497"));

export default topng;
