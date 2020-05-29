global._mckay_statistics_opt_out = true; // Opt out of node-steam-user stats

const optionDefinitions = [
  { name: 'config', alias: 'c', type: String, defaultValue: './config.js' }, // Config file location
  { name: 'steam_data', alias: 's', type: String } // Steam data directory
];

const fs = require('fs'),
  winston = require('winston'),
  { Subject } = require('rxjs'),
  { first } = require('rxjs/operators'),
  args = require('command-line-args')(optionDefinitions),
  queue = new (require('./lib/queue'))(),
  InspectURL = require('./lib/inspect_url'),
  botController = new (require('./lib/bot_controller'))(),
  resHandler = require('./lib/res_handler'),
  CONFIG = require(args.config),
  DB = new (require('./lib/db'))(CONFIG.database_url),
  gameData = new (require('./lib/game_data'))(CONFIG.game_files_update_interval, CONFIG.enable_game_file_updates);

if (CONFIG.max_simultaneous_requests === undefined) {
  CONFIG.max_simultaneous_requests = 1;
}

const subject = new Subject();
const LoadingItems = new Set();

winston.level = CONFIG.logLevel || 'debug';

const errorMsgs = {
  1: 'Improper Parameter Structure',
  2: 'Invalid Inspect Link Structure',
  3: `You may only have ${CONFIG.max_simultaneous_requests} pending request(s) at a time`,
  4: 'Valve\'s servers didn\'t reply in time',
  5: 'Valve\'s servers appear to be offline, please try again later',
  6: 'Something went wrong on our end, please try again'
};

if (CONFIG.logins.length === 0) {
  console.log('There are no bot logins. Please add some in config.json');
  process.exit(1);
}

if (args.steam_data) {
  CONFIG.bot_settings.steam_user.dataDirectory = args.steam_data;
}

for (let loginData of CONFIG.logins) {
  botController.addBot(loginData, CONFIG.bot_settings);
}

const lookupHandler = function (params) {
  // Check if the item is already in the DB
  DB.getItemData(params).then((doc) => {
    // If we got the result, just return it
    if (doc) {
      gameData.addAdditionalItemProperties(doc);
      resHandler.respondFloatToUser(params, { 'iteminfo': doc });
      return;
    }

    // Check if there is a bot online to process this request
    if (!botController.hasBotOnline()) {
      resHandler.respondErrorToUser(params, { error: errorMsgs[5], code: 5 }, 503);
      return;
    }

    if (CONFIG.max_simultaneous_requests > 0 &&
      queue.getUserQueuedAmt(params.ip) >= CONFIG.max_simultaneous_requests) {
      resHandler.respondErrorToUser(params, { error: errorMsgs[3], code: 3 }, 400);
      return;
    }

    const hash = itemHash(params);
    if (LoadingItems.has(hash)) {
      subject.pipe(
        first((itemData) => hash === itemHash(itemData)))
        .subscribe((itemData) => resHandler.respondFloatToUser(params, itemData));
    } else {
      queue.addJob(params, CONFIG.bot_settings.max_attempts);
    }
  }).catch((err) => {
    winston.error(`getItemData Promise rejected: ${err.message}`);
    resHandler.respondErrorToUser(params, { error: errorMsgs[6], code: 6 }, 500);
  });
};

// Setup and configure express
const app = require('express')();

if (CONFIG.trust_proxy === true) {
  app.enable('trust proxy');
}

CONFIG.allowed_regex_origins = CONFIG.allowed_regex_origins || [];
CONFIG.allowed_origins = CONFIG.allowed_origins || [];
const allowedRegexOrigins = CONFIG.allowed_regex_origins.map((origin) => new RegExp(origin));

app.get('/', function (req, res) {
  // Allow some origins
  if (CONFIG.allowed_origins.length > 0 && req.get('origin') != undefined) {
    // check to see if its a valid domain
    const allowed = CONFIG.allowed_origins.indexOf(req.get('origin')) > -1 ||
      allowedRegexOrigins.findIndex((reg) => reg.test(req.get('origin'))) > -1;

    if (allowed) {
      res.header('Access-Control-Allow-Origin', req.get('origin'));
      res.header('Access-Control-Allow-Methods', 'GET');
    }
  }

  // Get and parse parameters
  let thisLink;

  if ('url' in req.query) {
    thisLink = new InspectURL(req.query.url);
  } else if ('a' in req.query && 'd' in req.query && ('s' in req.query || 'm' in req.query)) {
    thisLink = new InspectURL(req.query);
  }

  // Make sure the params are valid
  if (!thisLink || !thisLink.getParams()) {
    res.status(400).json({ error: errorMsgs[2], code: 2 });
    return;
  }

  // Look it up
  let params = thisLink.getParams();

  params.ip = req.ip;
  params.type = 'http';
  params.res = res;

  lookupHandler(params);
});

let http_server = require('http').Server(app);

let https_server;

if (CONFIG.https.enable) {
  const credentials = {
    key: fs.readFileSync(CONFIG.https.key_path, 'utf8'),
    cert: fs.readFileSync(CONFIG.https.cert_path, 'utf8'),
    ca: fs.readFileSync(CONFIG.https.ca_path, 'utf8')
  };

  https_server = require('https').Server(credentials, app);
}


if (CONFIG.http.enable) {
  http_server.listen(CONFIG.http.port);
  winston.info('Listening for HTTP on port: ' + CONFIG.http.port);
}

if (CONFIG.https.enable) {
  https_server.listen(CONFIG.https.port);
  winston.info('Listening for HTTPS on port: ' + CONFIG.https.port);
}

queue.process(CONFIG.logins.length, async (job) => {
  const hash = itemHash(job.data);
  try {
    LoadingItems.add(hash);
    const itemData = await botController.lookupFloat(job.data);
    winston.debug(`Received itemData for ${job.data.a}`);

    // Save and remove the delay attribute
    let delay = itemData.delay;
    delete itemData.delay;

    // add the item info to the DB
    DB.insertItemData(itemData.iteminfo);

    gameData.addAdditionalItemProperties(itemData.iteminfo);
    resHandler.respondFloatToUser(job.data, itemData);
    LoadingItems.delete(hash);
    subject.next(itemData);
    return delay;
  } catch (e) {
    LoadingItems.delete(hash);
    winston.warn(`Request Timeout for ${job.data.a}`);
    throw e;
  }
});

queue.on('job failed', (job) => {
  winston.warn(`Job Failed! S: ${job.data.s} A: ${job.data.a} D: ${job.data.d} M: ${job.data.m} IP: ${job.data.ip}`);

  resHandler.respondErrorToUser(job.data, { error: errorMsgs[4], code: 4 }, 500);
});

function itemHash(item) {
  return [item.s, item.a, item.d, item.m].join['---'];
}
