/**Require the dependencies*/
//uwu
global.Promise = require('bluebird');
const winston = require('winston');
let version = require('./../package.json').version;
winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, {
    'timestamp': true,
    'colorize': true
});
const util = require('util');
const configTemplate = require('./structures/template.js');
let wsWorker;
let config;
try {
    if (process.env.secret_name) {
        config = require(`/run/secrets/${process.env.secret_name}`);
        winston.info(`Using docker secrets!`);
    } else {
        config = require('../config/main.json');
        winston.info(`Using local secrets!`);
    }

} catch (e) {
    winston.error(e);
    winston.error('Failed to require config!');
    process.exit(1);
}
global.remConfig = config;
if (remConfig.use_ws) {
    wsWorker = require('./ws/worker');
}
require('longjohn');
if (!process.env.environment && !remConfig.environment) {
    winston.warn('No environment config was found, setting the environment config to development!');
    remConfig.environment = 'development';
}
if (!process.env.statsdhost && remConfig.statsdhost) {
    winston.warn('No environment/config setting named statsdhost was found, setting the statsdhost config to localhost!');
    remConfig.statsdhost = 'localhost';
}
for (let key in configTemplate) {
    if (configTemplate.hasOwnProperty(key)) {
        if (!remConfig[key]) {
            if (configTemplate[key].required) {
                throw new Error(`The required config key ${key} is missing!`);
            } else {
                winston.warn(`The optional config key ${key} is missing!`)
            }
        }
    }
}
let Raven = require('raven');
if (!remConfig.no_error_tracking) {
    Raven.config(remConfig.sentry_token, {
        release: version,
        environment: remConfig.environment
    }).install(() => {
        winston.error('Oh no I died because of an unhandled error!');
        process.exit(1);
    });
    winston.info('Initializing error tracking!');
} else {
    winston.warn('No error tracking is used!');
}
let Shard = require('./shard');
let client;
if (remConfig.use_ws) {
    let wsService = new wsWorker();
    wsService.on('ws_ready', (data) => {
        if (client) {
            try {
                client.shutdown();
            } catch (e) {
                console.error(e);
            }
            console.log(`Restarting Client for Resharding!`);
        }
        setTimeout(() => {
            client = new Shard(data.sid, data.shards, wsService, Raven);
        }, 500);

    });
    wsService.on('shutdown_client', () => {
        if (client) {
            try {
                client.shutdown();
            } catch (e) {
                console.error(e);
            }
            process.exit(1);
        }
    })
} else {
    client = new Shard(0, 1, null, Raven);
}
winston.info(`Client Started!`);
process.on('SIGINT', () => {
    winston.error('Received SIGINT');
    if (client) {
        try {
            client.shutdown();
        } catch (e) {
            console.error(e);
        }

    }
    process.exit(0);
});
winston.cli();
process.on('unhandledRejection', (reason, promise) => {
    if (typeof reason === 'undefined') return;
    winston.error(`Unhandled rejection: ${reason} - ${util.inspect(promise)}`);
});
// Now look at this net
function net() { // that I just found!
    // When I say go,
    // be ready to throw!

    // GO!
    throw net;
} // Urgh, let's try somthing else

