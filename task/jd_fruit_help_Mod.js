/*
cron 0 5,16 * * *
*/
const $ = new Env('东东农场只助力版');
const fs = require('fs');
const JD_API_HOST = 'https://api.m.jd.com/client.action';
let cookiesArr = [],
  cookie = '',
  isBox = false,
  notify = '',
  allMessage = '',
  newShareCodes = [],
  ttShareCodes = [],
  message = '',
  subTitle = '',
  option = {},
  jdNotify = false, // 是否关闭通知，false打开通知推送，true关闭通知推送
  NowHour = new Date().getHours(),
  llhelp = true,
  lnrun = 0,
  llgetshare = false;
if ($.isNode() && process.env.CC_NOHELPAFTER8) {
  if (process.env.CC_NOHELPAFTER8 == 'true') {
    if (NowHour > 8) {
      llhelp = false;
      console.log(`现在是9点后时段，不启用互助....`);
    }
  }
}

let boolneedUpdate = false,
  strShare = './Fruit_ShareCache.json',
  Fileexists = fs.existsSync(strShare),
  TempShareCache = [];
if (Fileexists) {
  console.log('检测到东东农场缓存文件Fruit_ShareCache.json，载入...');
  TempShareCache = fs.readFileSync(strShare, 'utf-8');
  if (TempShareCache) {
    TempShareCache = TempShareCache.toString();
    TempShareCache = JSON.parse(TempShareCache);
  }
}

let WP_APP_TOKEN_ONE = '';
if ($.isNode()) {
  if (process.env.WP_APP_TOKEN_ONE) {
    WP_APP_TOKEN_ONE = process.env.WP_APP_TOKEN_ONE;
  }
}

if (WP_APP_TOKEN_ONE) {
  console.log(`检测到已配置Wxpusher的Token，启用一对一推送...`);
  if (NowHour < 9 || NowHour > 21) {
    WP_APP_TOKEN_ONE = '';
    console.log(`农场只在9点后和22点前启用一对一推送，故此次暂时取消一对一推送...`);
  }
} else console.log(`检测到未配置Wxpusher的Token，禁用一对一推送...`);

!(async () => {
  await requireConfig();
  if (!cookiesArr[0]) {
    $.msg($.name, '【提示】请先获取京东账号一cookie\n直接使用NobyDa的京东签到获取', 'https://bean.m.jd.com/bean/signIndex.action', { 'open-url': 'https://bean.m.jd.com/bean/signIndex.action' });
    return;
  }
  if (llhelp) {
    console.log('开始收集您的互助码，用于账号内部互助，请稍等...');
    for (let i = 0; i < cookiesArr.length; i++) {
      if (cookiesArr[i]) {
        cookie = cookiesArr[i];
        $.UserName = decodeURIComponent(cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1]);
        $.index = i + 1;
        $.isLogin = true;
        $.nickName = '';
        await TotalBean();
        if (!$.isLogin) {
          $.msg($.name, `【提示】cookie已失效`, `京东账号${$.index} ${$.nickName || $.UserName}\n请重新登录获取\nhttps://bean.m.jd.com/bean/signIndex.action`, {
            'open-url': 'https://bean.m.jd.com/bean/signIndex.action',
          });

          if ($.isNode()) {
            await notify.sendNotify(`${$.name}cookie已失效 - ${$.UserName}`, `京东账号${$.index} ${$.UserName}\n请重新登录获取cookie`);
          }
          continue;
        }
        message = '';
        subTitle = '';
        option = {};
        $.retry = 0;
        llgetshare = false;
        await GetCollect();
        if (llgetshare) {
          await $.wait(5000);
          lnrun++;
        }
        if (lnrun == 10) {
          console.log(`访问接口次数达到10次，休息一分钟.....`);
          await $.wait(60 * 1000);
          lnrun = 0;
        }
      }
    }
    if (boolneedUpdate) {
      let str = JSON.stringify(TempShareCache, null, 2);
      fs.writeFile(strShare, str, (err) => {
        if (err) {
          console.log(err);
          console.log('缓存文件Fruit_ShareCache.json更新失败!');
        } else {
          console.log('缓存文件Fruit_ShareCache.json更新成功!');
        }
      });
    }
  }
  for (let i = 0; i < cookiesArr.length; i++) {
    if (cookiesArr[i]) {
      cookie = cookiesArr[i];
      $.UserName = decodeURIComponent(cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1]);
      $.index = i + 1;
      $.isLogin = true;
      $.nickName = '';
      await TotalBean();
      console.log(`\n开始【京东账号${$.index}】${$.nickName || $.UserName}\n`);
      if (!$.isLogin) {
        $.msg($.name, `【提示】cookie已失效`, `京东账号${$.index} ${$.nickName || $.UserName}\n请重新登录获取\nhttps://bean.m.jd.com/bean/signIndex.action`, {
          'open-url': 'https://bean.m.jd.com/bean/signIndex.action',
        });

        if ($.isNode()) {
          await notify.sendNotify(`${$.name}cookie已失效 - ${$.UserName}`, `京东账号${$.index} ${$.UserName}\n请重新登录获取cookie`);
        }
        continue;
      }
      message = '';
      subTitle = '';
      option = {};
      $.retry = 0;

      lnrun++;
      await jdFruit();
      if (lnrun == 5) {
        console.log(`访问接口次数达到5次，休息一分钟.....`);
        await $.wait(60 * 1000);
        lnrun = 0;
      }
    }
  }
  // if ($.isNode() && allMessage && $.ctrTemp) {
  //   await notify.sendNotify(`${$.name}`, `${allMessage}`);
  // }
})()
  .catch((e) => {
    $.log('', `❌ ${$.name}, 失败! 原因: ${e}!`, '');
  })
  .finally(() => {
    $.done();
  });
async function jdFruit() {
  subTitle = `【京东账号${$.index}】${$.nickName || $.UserName}`;
  try {
    await initForFarm();
    if ($.farmInfo.farmUserPro) {
      await masterHelpShare(); // 助力好友
      await turntableFarm();
    } else {
      console.log(`初始化农场数据异常, 请登录京东 app查看农场功能是否正常`);
      message += `初始化农场数据异常, 请登录京东 app查看农场功能是否正常`;
    }
  } catch (e) {
    console.log(`任务执行异常，请检查执行日志 ‼️‼️`);
    $.logErr(e);
    const errMsg = `京东账号${$.index} ${$.nickName || $.UserName}\n任务执行异常，请检查执行日志 ‼️‼️`;
    if ($.isNode()) await notify.sendNotify(`${$.name}`, errMsg);
    $.msg($.name, '', `${errMsg}`);
  }
  // await showMsg();
}

// 天天抽奖助力
async function turntableFarm() {
  await initForTurntableFarm();
  if ($.initForTurntableFarmRes.code === '0') {
    console.log('开始天天抽奖--好友助力--每人每天只有三次助力机会.');
    for (let code of ttShareCodes) {
      if (code === $.farmInfo.farmUserPro.shareCode) {
        console.log('天天抽奖-不能自己给自己助力\n');
        continue;
      }
      await lotteryMasterHelp(code);
      // console.log('天天抽奖助力结果',lotteryMasterHelpRes.helpResult)
      if ($.lotteryMasterHelpRes.helpResult.code === '0') {
        console.log(`天天抽奖-助力${$.lotteryMasterHelpRes.helpResult.masterUserInfo.nickName}成功\n`);
      } else if ($.lotteryMasterHelpRes.helpResult.code === '11') {
        console.log(`天天抽奖-不要重复助力${$.lotteryMasterHelpRes.helpResult.masterUserInfo.nickName}\n`);
      } else if ($.lotteryMasterHelpRes.helpResult.code === '13') {
        console.log(`天天抽奖-助力${$.lotteryMasterHelpRes.helpResult.masterUserInfo.nickName}失败,助力次数耗尽\n`);
        break;
      }
    }
  } else {
    console.log('初始化天天抽奖得好礼失败');
  }
}

// 助力好友
async function masterHelpShare() {
  await initForFarm();
  let salveHelpAddWater = 0,
    remainTimes = 3, // 今日剩余助力次数,默认3次（京东农场每人每天3次助力机会）。
    helpSuccessPeoples = ''; // 成功助力好友
  if (llhelp) {
    console.log('开始助力好友');
    for (let code of newShareCodes) {
      console.log(`${$.UserName}开始助力: ${code}`);
      if (!code) continue;
      if (!$.farmInfo.farmUserPro) {
        console.log('未种植,跳过助力\n');
        continue;
      }
      if (code === $.farmInfo.farmUserPro.shareCode) {
        console.log('不能为自己助力哦，跳过自己的shareCode\n');
        continue;
      }
      await masterHelp(code);
      if ($.helpResult.code === '0') {
        if ($.helpResult.helpResult.code === '0') {
          // 助力成功
          salveHelpAddWater += $.helpResult.helpResult.salveHelpAddWater;
          console.log(`【助力好友结果】: 已成功给【${$.helpResult.helpResult.masterUserInfo.nickName}】助力`);
          console.log(`给好友【${$.helpResult.helpResult.masterUserInfo.nickName}】助力获得${$.helpResult.helpResult.salveHelpAddWater}g水滴`);
          helpSuccessPeoples += ($.helpResult.helpResult.masterUserInfo.nickName || '匿名用户') + ',';
        } else if ($.helpResult.helpResult.code === '8') {
          console.log(`【助力好友结果】: 助力【${$.helpResult.helpResult.masterUserInfo.nickName}】失败，您今天助力次数已耗尽`);
        } else if ($.helpResult.helpResult.code === '9') {
          console.log(`【助力好友结果】: 之前给【${$.helpResult.helpResult.masterUserInfo.nickName}】助力过了`);
        } else if ($.helpResult.helpResult.code === '10') {
          console.log(`【助力好友结果】: 好友【${$.helpResult.helpResult.masterUserInfo.nickName}】已满五人助力`);
          newShareCodes = newShareCodes.filter((v) => v !== code);
          console.log(`删除${code}成功`);
        } else {
          console.log(`助力其他情况：${JSON.stringify($.helpResult.helpResult)}`);
        }
        console.log(`【今日助力次数还剩】${$.helpResult.helpResult.remainTimes}次\n`);
        if ($.helpResult.helpResult.remainTimes === 0) {
          console.log(`您当前助力次数已耗尽，跳出助力`);
          break;
        }
      } else {
        console.log(`助力失败::${JSON.stringify($.helpResult)}`);
      }
    }
  }
  if (helpSuccessPeoples && helpSuccessPeoples.length > 0) {
    message += `【您助力的好友👬】${helpSuccessPeoples.substr(0, helpSuccessPeoples.length - 1)}\n`;
  }
  if (salveHelpAddWater > 0) {
    // message += `【助力好友👬】获得${salveHelpAddWater}g💧\n`;
    console.log(`【助力好友👬】获得${salveHelpAddWater}g💧\n`);
  }
  // message += `【今日剩余助力👬】${remainTimes}次\n`;
}

async function GetCollect() {
  try {
    console.log(`\n【京东账号${$.index}（${$.UserName}）的${$.name}好友互助码】`);
    let llfound = false,
      strShareCode = '';
    if (TempShareCache) {
      for (let j = 0; j < TempShareCache.length; j++) {
        if (TempShareCache[j].pt_pin == $.UserName) {
          llfound = true;
          strShareCode = TempShareCache[j].ShareCode;
        }
      }
    }
    if (!llfound) {
      console.log($.UserName + '该账号无缓存，尝试联网获取互助码.....');
      llgetshare = true;
      await initForFarm();
      if ($.farmInfo.farmUserPro) {
        let tempAddCK = {};
        strShareCode = $.farmInfo.farmUserPro.shareCode;
        tempAddCK = {
          pt_pin: $.UserName,
          ShareCode: strShareCode,
        };
        TempShareCache.push(tempAddCK);
        // 标识，需要更新缓存文件
        boolneedUpdate = true;
      }
    }

    if (strShareCode) {
      console.log(`\n` + strShareCode);
      newShareCodes.push(strShareCode);
      ttShareCodes.push(strShareCode);
    } else {
      console.log(`\n数据异常`);
    }
  } catch (e) {
    $.logErr(e);
  }
}

async function initForTurntableFarm() {
  $.initForTurntableFarmRes = await request(arguments.callee.name.toString(), { version: 4, channel: 1 });
}

/**
 * 天天抽奖拿好礼-助力API(每人每天三次助力机会)
 */
async function lotteryMasterHelp() {
  $.lotteryMasterHelpRes = await request(`initForFarm`, {
    imageUrl: '',
    nickName: '',
    shareCode: arguments[0] + '-3',
    babelChannel: '3',
    version: 4,
    channel: 1,
  });
}

// 助力好友API
async function masterHelp() {
  $.helpResult = await request(`initForFarm`, {
    imageUrl: '',
    nickName: '',
    shareCode: arguments[0],
    babelChannel: '3',
    version: 2,
    channel: 1,
  });
}

/**
 * 初始化农场, 可获取果树及用户信息API
 */
async function initForFarm() {
  return new Promise((resolve) => {
    const option = {
      url: `${JD_API_HOST}?functionId=initForFarm`,
      body: `body=${escape(JSON.stringify({ version: 4 }))}&appid=wh5&clientVersion=9.1.0`,
      headers: {
        accept: '*/*',
        'accept-encoding': 'gzip, deflate, br',
        'accept-language': 'zh-CN,zh;q=0.9',
        'cache-control': 'no-cache',
        cookie: cookie,
        origin: 'https://home.m.jd.com',
        pragma: 'no-cache',
        referer: 'https://home.m.jd.com/myJd/newhome.action',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
        'User-Agent': $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : require('./JS_USER_AGENTS').USER_AGENT) : $.getdata('JDUA') ? $.getdata('JDUA') : 'jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 10000,
    };
    $.post(option, (err, resp, data) => {
      try {
        if (err) {
          console.log('\ninitForFarm: API查询请求失败 ‼️‼️');
          console.log(JSON.stringify(err));
          $.logErr(err);
        } else {
          if (safeGet(data)) {
            $.farmInfo = JSON.parse(data);
          }
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    });
  });
}

async function showMsg() {
  if ($.isNode() && process.env.FRUIT_NOTIFY_CONTROL) {
    $.ctrTemp = `${process.env.FRUIT_NOTIFY_CONTROL}` === 'false';
  } else if ($.getdata('jdFruitNotify')) {
    $.ctrTemp = $.getdata('jdFruitNotify') === 'false';
  } else {
    $.ctrTemp = `${jdNotify}` === 'false';
  }
  if ($.ctrTemp) {
    $.msg($.name, subTitle, message, option);
    if ($.isNode()) {
      allMessage += `${subTitle}\n${message}${$.index !== cookiesArr.length ? '\n\n' : ''}`;
      // await notify.sendNotify(`${$.name} - 账号${$.index} - ${$.nickName}`, `${subTitle}\n${message}`);
    }
  } else {
    $.log(`\n${message}\n`);
  }
}

function requireConfig() {
  return new Promise((resolve) => {
    console.log('开始获取配置文件\n');
    notify = $.isNode() ? require('./sendNotify') : '';
    // Node.js用户请在jdCookie.js处填写京东ck;
    const jdCookieNode = $.isNode() ? require('./jdCookie.js') : '';
    // IOS等用户直接用NobyDa的jd cookie
    if ($.isNode()) {
      Object.keys(jdCookieNode).forEach((item) => {
        if (jdCookieNode[item]) {
          cookiesArr.push(jdCookieNode[item]);
        }
      });
      if (process.env.JD_DEBUG && process.env.JD_DEBUG === 'false') console.log = () => {};
    } else {
      cookiesArr = [$.getdata('CookieJD'), $.getdata('CookieJD2'), ...jsonParse($.getdata('CookiesJD') || '[]').map((item) => item.cookie)].filter((item) => !!item);
    }
    console.log(`共${cookiesArr.length}个京东账号\n`);
    $.shareCodesArr = [];
    resolve();
  });
}
function TotalBean() {
  return new Promise(async (resolve) => {
    const options = {
      url: 'https://me-api.jd.com/user_new/info/GetJDUserInfoUnion',
      headers: {
        Host: 'me-api.jd.com',
        Accept: '*/*',
        Connection: 'keep-alive',
        Cookie: cookie,
        'User-Agent': $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : require('./JS_USER_AGENTS').USER_AGENT) : $.getdata('JDUA') ? $.getdata('JDUA') : 'jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1',
        'Accept-Language': 'zh-cn',
        Referer: 'https://home.m.jd.com/myJd/newhome.action?sceneval=2&ufc=&',
        'Accept-Encoding': 'gzip, deflate, br',
      },
    };
    $.get(options, (err, resp, data) => {
      try {
        if (err) {
          $.logErr(err);
        } else {
          if (data) {
            data = JSON.parse(data);
            if (data['retcode'] === '1001') {
              $.isLogin = false; // cookie过期
              return;
            }
            if (data['retcode'] === '0' && data.data && data.data.hasOwnProperty('userInfo')) {
              $.nickName = data.data.userInfo.baseInfo.nickname;
            }
          } else {
            $.log('京东服务器返回空数据');
          }
        }
      } catch (e) {
        $.logErr(e);
      } finally {
        resolve();
      }
    });
  });
}
function request(function_id, body = {}, timeout = 1000) {
  return new Promise((resolve) => {
    setTimeout(() => {
      $.get(taskUrl(function_id, body), (err, resp, data) => {
        try {
          if (err) {
            console.log('\nrequest: API查询请求失败 ‼️‼️');
            console.log(JSON.stringify(err));
            console.log(`function_id:${function_id}`);
            $.logErr(err);
          } else {
            if (safeGet(data)) {
              data = JSON.parse(data);
            }
          }
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve(data);
        }
      });
    }, timeout);
  });
}
function safeGet(data) {
  try {
    if (typeof JSON.parse(data) === 'object') {
      return true;
    }
  } catch (e) {
    console.log(e);
    console.log(`京东服务器访问数据为空，请检查自身设备网络情况`);
    return false;
  }
}
function taskUrl(function_id, body = {}) {
  return {
    url: `${JD_API_HOST}?functionId=${function_id}&body=${encodeURIComponent(JSON.stringify(body))}&appid=wh5`,
    headers: {
      Host: 'api.m.jd.com',
      Accept: '*/*',
      Origin: 'https://carry.m.jd.com',
      'Accept-Encoding': 'gzip, deflate, br',
      'User-Agent': $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : require('./JS_USER_AGENTS').USER_AGENT) : $.getdata('JDUA') ? $.getdata('JDUA') : 'jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1',
      'Accept-Language': 'zh-CN,zh-Hans;q=0.9',
      Referer: 'https://carry.m.jd.com/',
      Cookie: cookie,
    },
    timeout: 10000,
  };
}
function jsonParse(str) {
  if (typeof str === 'string') {
    try {
      return JSON.parse(str);
    } catch (e) {
      console.log(e);
      $.msg($.name, '', '请勿随意在BoxJs输入框修改内容\n建议通过脚本去获取cookie');
      return [];
    }
  }
}
// prettier-ignore
/* eslint-disable */
function Env(t, e) { "undefined" !== typeof process && JSON.stringify(process.env).indexOf("GITHUB") > -1 && process.exit(0); class s { constructor(t) { this.env = t } send(t, e = "GET") { t = typeof t === "string" ? { url: t } : t; let s = this.get; return e === "POST" && (s = this.post), new Promise((e, i) => { s.call(this, t, (t, s, r) => { t ? i(t) : e(s) }) }) } get(t) { return this.send.call(this.env, t) } post(t) { return this.send.call(this.env, t, "POST") } } return new class { constructor(t, e) { this.name = t, this.http = new s(this), this.data = null, this.dataFile = "box.dat", this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.startTime = (new Date).getTime(), Object.assign(this, e), this.log("", `🔔${this.name}, 开始!`) } isNode() { return "undefined" !== typeof module && !!module.exports } isQuanX() { return "undefined" !== typeof $task } isSurge() { return "undefined" !== typeof $httpClient && typeof $loon === "undefined" } isLoon() { return "undefined" !== typeof $loon } toObj(t, e = null) { try { return JSON.parse(t) } catch { return e } } toStr(t, e = null) { try { return JSON.stringify(t) } catch { return e } } getjson(t, e) { let s = e; const i = this.getdata(t); if (i) try { s = JSON.parse(this.getdata(t)) } catch { } return s } setjson(t, e) { try { return this.setdata(JSON.stringify(t), e) } catch { return !1 } } getScript(t) { return new Promise(e => { this.get({ url: t }, (t, s, i) => e(i)) }) } runScript(t, e) { return new Promise(s => { let i = this.getdata("@chavy_boxjs_userCfgs.httpapi"); i = i ? i.replace(/\n/g, "").trim() : i; let r = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout"); r = r ? Number(r) : 20, r = e && e.timeout ? e.timeout : r; const [o, h] = i.split("@"); const n = { url: `http://${h}/v1/scripting/evaluate`, body: { script_text: t, mock_type: "cron", timeout: r }, headers: { "X-Key": o, Accept: "*/*" } }; this.post(n, (t, e, i) => s(i)) }).catch(t => this.logErr(t)) } loaddata() { if (!this.isNode()) return {}; { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile); const e = this.path.resolve(process.cwd(), this.dataFile); const s = this.fs.existsSync(t); const i = !s && this.fs.existsSync(e); if (!s && !i) return {}; { const i = s ? t : e; try { return JSON.parse(this.fs.readFileSync(i)) } catch (t) { return {} } } } } writedata() { if (this.isNode()) { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile); const e = this.path.resolve(process.cwd(), this.dataFile); const s = this.fs.existsSync(t); const i = !s && this.fs.existsSync(e); const r = JSON.stringify(this.data); s ? this.fs.writeFileSync(t, r) : i ? this.fs.writeFileSync(e, r) : this.fs.writeFileSync(t, r) } } lodash_get(t, e, s) { const i = e.replace(/\[(\d+)\]/g, ".$1").split("."); let r = t; for (const t of i) if (r = Object(r)[t], void 0 === r) return s; return r } lodash_set(t, e, s) { return Object(t) !== t ? t : (Array.isArray(e) || (e = e.toString().match(/[^.[\]]+/g) || []), e.slice(0, -1).reduce((t, s, i) => Object(t[s]) === t[s] ? t[s] : t[s] = Math.abs(e[i + 1]) >> 0 == Number(e[i + 1]) ? [] : {}, t)[e[e.length - 1]] = s, t) } getdata(t) { let e = this.getval(t); if (/^@/.test(t)) { const [, s, i] = /^@(.*?)\.(.*?)$/.exec(t); const r = s ? this.getval(s) : ""; if (r) try { const t = JSON.parse(r); e = t ? this.lodash_get(t, i, "") : e } catch (t) { e = "" } } return e } setdata(t, e) { let s = !1; if (/^@/.test(e)) { const [, i, r] = /^@(.*?)\.(.*?)$/.exec(e); const o = this.getval(i); const h = i ? o === "null" ? null : o || "{}" : "{}"; try { const e = JSON.parse(h); this.lodash_set(e, r, t), s = this.setval(JSON.stringify(e), i) } catch (e) { const o = {}; this.lodash_set(o, r, t), s = this.setval(JSON.stringify(o), i) } } else s = this.setval(t, e); return s } getval(t) { return this.isSurge() || this.isLoon() ? $persistentStore.read(t) : this.isQuanX() ? $prefs.valueForKey(t) : this.isNode() ? (this.data = this.loaddata(), this.data[t]) : this.data && this.data[t] || null } setval(t, e) { return this.isSurge() || this.isLoon() ? $persistentStore.write(t, e) : this.isQuanX() ? $prefs.setValueForKey(t, e) : this.isNode() ? (this.data = this.loaddata(), this.data[e] = t, this.writedata(), !0) : this.data && this.data[e] || null } initGotEnv(t) { this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar)) } get(t, e = (() => { })) { t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"]), this.isSurge() || this.isLoon() ? (this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.get(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) })) : this.isQuanX() ? (this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t))) : this.isNode() && (this.initGotEnv(t), this.got(t).on("redirect", (t, e) => { try { if (t.headers["set-cookie"]) { const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString(); s && this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar } } catch (t) { this.logErr(t) } }).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) })) } post(t, e = (() => { })) { if (t.body && t.headers && !t.headers["Content-Type"] && (t.headers["Content-Type"] = "application/x-www-form-urlencoded"), t.headers && delete t.headers["Content-Length"], this.isSurge() || this.isLoon()) this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.post(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) }); else if (this.isQuanX()) t.method = "POST", this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t)); else if (this.isNode()) { this.initGotEnv(t); const { url: s, ...i } = t; this.got.post(s, i).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) }) } } time(t, e = null) { const s = e ? new Date(e) : new Date; let i = { "M+": s.getMonth() + 1, "d+": s.getDate(), "H+": s.getHours(), "m+": s.getMinutes(), "s+": s.getSeconds(), "q+": Math.floor((s.getMonth() + 3) / 3), S: s.getMilliseconds() }; /(y+)/.test(t) && (t = t.replace(RegExp.$1, (String(s.getFullYear())).substr(4 - RegExp.$1.length))); for (let e in i) new RegExp("(" + e + ")").test(t) && (t = t.replace(RegExp.$1, RegExp.$1.length == 1 ? i[e] : ("00" + i[e]).substr((String(i[e])).length))); return t } msg(e = t, s = "", i = "", r) { const o = t => { if (!t) return t; if (typeof t === "string") return this.isLoon() ? t : this.isQuanX() ? { "open-url": t } : this.isSurge() ? { url: t } : void 0; if (typeof t === "object") { if (this.isLoon()) { let e = t.openUrl || t.url || t["open-url"]; let s = t.mediaUrl || t["media-url"]; return { openUrl: e, mediaUrl: s } } if (this.isQuanX()) { let e = t["open-url"] || t.url || t.openUrl; let s = t["media-url"] || t.mediaUrl; return { "open-url": e, "media-url": s } } if (this.isSurge()) { let e = t.url || t.openUrl || t["open-url"]; return { url: e } } } }; if (this.isMute || (this.isSurge() || this.isLoon() ? $notification.post(e, s, i, o(r)) : this.isQuanX() && $notify(e, s, i, o(r))), !this.isMuteLog) { let t = ["", "==============📣系统通知📣=============="]; t.push(e), s && t.push(s), i && t.push(i), console.log(t.join("\n")), this.logs = this.logs.concat(t) } } log(...t) { t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator)) } logErr(t, e) { const s = !this.isSurge() && !this.isQuanX() && !this.isLoon(); s ? this.log("", `❗️${this.name}, 错误!`, t.stack) : this.log("", `❗️${this.name}, 错误!`, t) } wait(t) { return new Promise(e => setTimeout(e, t)) } done(t = {}) { const e = (new Date).getTime(); const s = (e - this.startTime) / 1e3; this.log("", `🔔${this.name}, 结束! 🕛 ${s} 秒`), this.log(), (this.isSurge() || this.isQuanX() || this.isLoon()) && $done(t) } }(t, e) }
