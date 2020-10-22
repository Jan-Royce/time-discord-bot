require('dotenv').config()
const DISCORD_CHANNEL=process.env.DISCORD_CHANNEL //timer channel
const DISCORD_BOT_TOKEN=process.env.DISCORD_BOT_TOKEN
const DISCORD_BOT_ID=process.env.DISCORD_BOT_ID

const Eris = require("eris");

var bot = new Eris(DISCORD_BOT_TOKEN);
const botId = DISCORD_BOT_ID;

const emojis = [
    "⌚", "😶", "😯", "✈", "✨", "❗", "➕", "🚀", "🅱", "🆒", "⌛",
    "⏰", "▶", "⚡", "⭐", "🌠", "🍆", "🎈", "🎲", "🐣", "👑"
];

const angryEmojis = ["😠","😡","🤬"];

//commands
const COMMAND_START = ['start', 's', 'begin', 'b'];
const COMMAND_END = ['end', 'e', 'stop', 'sp'];

var timeRecord = {};

bot.on("ready", () => {
    console.log("Ready!");
});

bot.on("error", (err)=>{console.log(err)});

bot.on("messageCreate", (msg) => {
  if(msg.author.id == botId) return;

  let content = msg.content.split(' ');
  let cmd = content[0].toLowerCase();

  if(msg.channel.id != DISCORD_CHANNEL && (COMMAND_START.includes(cmd) || COMMAND_END.includes(cmd))) {
    bot.createMessage(msg.channel.id, `<@${msg.author.id}>, please use the <#${DISCORD_CHANNEL}> channel.`);
    botAddMultipleReacts(msg.id, msg.channel.id, angryEmojis);
    return;
  }

  if(COMMAND_START.includes(cmd)) {
      bot.createMessage(msg.channel.id, startTime(msg.author.username, msg.content, msg.id));
  } else if(COMMAND_END.includes(cmd)) {
      bot.createMessage(msg.channel.id, endTime(msg.author.username, msg.id));
  }
});

function startTime(name, cmd, msgId) {
  if(timeRecord[name] == undefined) {
    timeRecord[name] = {};
  }
  if(!isTimeStarted(name)) {
    botAddReactsToStart(msgId);
    let params = checkParams(name, cmd);
    if(typeof params['offset'] == 'string') {
        let content = {
            tts: true,
            content : `Invalid offset parameter. Timer NOT started, ${name}`
        };
        bot.createMessage(DISCORD_CHANNEL, content);

        return `\`\`\`css\nInvalid offset parameter: '${params['offset']}'. Timer NOT started.\`\`\``;
    }
    timeRecord[name]['start'] = new Date();
    let msg = params['msg'] != undefined ? " with message:'" + params['msg'] + "'" : '';
    let offset = '';
    if(typeof params['offset'] == 'number') {
        offset = ' with offset: ' + params['offset'];
    }
    return `\`\`\`css\nTimer started for ${name} @ ${displayLocalTime(name,timeRecord[name]['start'])}${msg}${offset}. Use 'end' command to end current timer.\`\`\``;
  } else {
    botAddMultipleReacts(msgId, DISCORD_CHANNEL, angryEmojis);
    let msg = timeRecord[name]['msg'] != undefined ? " with message:'" + timeRecord[name]['msg'] + "'" : '';

    let content = {
        tts: true,
        content : `Timer already running for you, ${name}`
    };

    bot.createMessage(DISCORD_CHANNEL, content);

    return `\`\`\`css\nTimer already running for ${name} started @ ${displayLocalTime(name,timeRecord[name]['start'])}${msg}. Use 'end' command to end current timer.\`\`\``;
  }
}

function checkParams(name, cmd) {
  let paramObj = {};
  //msg param
  timeRecord[name]['msg'] = "";
  timeRecord[name]['offset'] = null;
  let cmdSplit = cmd.split(' ');
  if(cmdSplit.includes('-m')) {
    let msgParamIndex = cmdSplit.indexOf('-m') + 1;
    let msg = getMessage(cmd);
    if(cmdSplit[msgParamIndex] && msg) {
      timeRecord[name]['msg'] = msg;
      paramObj['msg'] = msg;
    }
  }
  if(cmdSplit.includes('-o')) {
      let offsetParamIndex = cmdSplit.indexOf('-o') + 1;
      let offset = getOffset(cmd);
      if(cmdSplit[offsetParamIndex] && offset) {
        timeRecord[name]['offset'] = offset;
        paramObj['offset'] = offset;
      }
  }

  return paramObj;
}

function getMessage(cmd) {
  let exp = /(?<=\-m\s\").*?(?=\")/g;
  return cmd.match(exp);
}

function getOffset(cmd) {
  let exp = /(?<=\-o\s\").*?(?=\")/g;
  let offsetExp = /\-?\d+(\.\d+)?/g
  let offsetString = cmd.match(exp);
  if(!offsetString) return offsetString;
  if(offsetString[0].replace(offsetExp, '') === '') return parseFloat(offsetString);
  return offsetString[0];
}

function endTime(name, msgId) {
  if(isTimeStarted(name)) {
    let end = new Date();
    let start = timeRecord[name]['start'];
    let offset = timeRecord[name]['offset'];
    let time = getRenderedTime(start, end, offset);
    let msg = renderMessage(name);
    bot.addMessageReaction(DISCORD_CHANNEL, msgId, "🛑");
    timeRecord[name]['start'] = '';
    return `\`\`\`css\n${name}: Timer ON ${displayLocalTime(name,start)} ended @ ${displayLocalTime(name,end)}. Use 'start' command to create a new timer.\`\`\`${msg}\n${time}`;
  } else {
    return `\`\`\`css\nYou haven't started any timer, ${name}. Use 'start' command to do so.\`\`\``;
  }
}

function isTimeStarted(name) {
  return timeRecord[name] != undefined && timeRecord[name]['start'] != undefined && timeRecord[name]['start'] != '';
}

function displayLocalTime(name, time) {
  let tz = name != "J0SH" ? "Asia/Manila" : "America/Edmonton";
  return time.toLocaleString("en-US",{timeZone: tz});
}

function getRenderedTime(start, end, offset) {
  let endTime = new Date(end);
  let offsetMsg = '';
  if(typeof offset == 'number') {
      endTime.setTime(endTime.getTime() + (offset*60*60*1000));
      offsetMsg = `Offset: **${offset}**\n`;
  }
  let diff = endTime - start;
  diff /= (1000*60*60);
  let hr = Math.floor(diff);
  let min = Math.round((diff % 1)*60);

  /*
    0-7   => 0
    8-22 => .25
    23-37 => .5
    38-52 => .75
    54-60 => 1
  */

  let decimal = min <= 7 ? 0
         : min >= 8 && min <= 22 ? .25
         : min >= 23 && min <= 37 ? .5
         : min >= 38 && min <= 52 ? .75
         : 1; //53-60

  let time = hr + decimal;


  return `${offsetMsg}Computed: **${hr}H ${min}m** => **${time}**`;
}

function renderMessage(name) {
    return timeRecord[name]['msg'] ? '\nMessage: **' + timeRecord[name]['msg'] + '**' : '';
}

function getRandomEmoji() {
    return emojis[Math.floor(Math.random() * emojis.length)];
}

function getRandomEmojiArray(emojiCount) {
    let emojis = [];
    let counter = emojiCount;

    while(counter > 0) {
        let emoji = getRandomEmoji();
        if(!emojis.includes(emoji)) {
            emojis.push(emoji);
            counter--;
        }
    }
    return emojis;
}

function botAddReactsToStart(msgId) {
    let emojiCount = Math.floor(Math.random() * 10 + 1);
    let emojis = getRandomEmojiArray(emojiCount);
    for(i=0; i<emojis.length; i++) {
        bot.addMessageReaction(DISCORD_CHANNEL, msgId, emojis[i]);
    }
}

function botAddMultipleReacts(msgId, channel, emojis) {
    for(i=0; i<emojis.length; i++) {
        bot.addMessageReaction(channel, msgId, emojis[i]);
    }
}
bot.connect(3000);
