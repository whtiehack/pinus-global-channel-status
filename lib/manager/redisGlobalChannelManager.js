var utils = require('../util/utils');
var redisClass = require('redis');

var DEFAULT_PREFIX = 'POMELO:CHANNEL';

class GlobalChannelManager
{
    constructor(app, opts)
    {
        this.app = app;
        this.opts = opts || {};
        this.prefix = opts.prefix || DEFAULT_PREFIX;
        this.host = opts.host;
        this.port = opts.port;
        this.db = opts.db || '0';
        this.redisClient = null;
    }

    start(cb)
    {
        this.redisClient = redisClass.createClient(this.port, this.host, this.opts);
        if (this.opts.auth_pass)
        {
            this.redisClient.auth(this.opts.auth_pass);
        }
        this.redisClient.on("error",  (err)=>
        {
            cb('[globalChannel][redis]' + err.stack);
        });
        this.redisClient.once('ready', (err)=>
        {
            if (!!err)
            {
                cb(err);
            }
            else
            {
                this.redisClient.select(self.db, cb);
            }
        });
    }

    stop(force, cb)
    {
        if(this.redisClient)
        {
            this.redisClient.end(force);
            this.redisClient = null;
        }
        utils.invokeCallback(cb);
    }

    clean(cb)
    {
        const cmds = [];
        this.redisClient.keys(genCleanKey(this), (err, list) =>
        {
            if(!!err)
            {
                utils.invokeCallback(cb, err);
                return;
            }
            for(let i=0; i<list.length; i++)
            {
                cmds.push(['del', list[i]]);
            }
            execMultiCommands(this.redisClient, cmds, cb);
        });
    }

    flushall(cb)
    {
        this.redisClient.flushall((err)=>
        {
            if(!!err)
            {
                utils.invokeCallback(cb, err);
                return;
            }
            utils.invokeCallback(cb, null);
        });
    }

    destroyChannel(name, cb)
    {
        const servers = this.app.servers, cmds = [];
        let server;
        for(const sid in servers)
        {
            server = servers[sid];
            if(this.app.isFrontend(server))
            {
                cmds.push(['del', genKey(this, name, sid)]);
            }
        }
        execMultiCommands(this.redisClient, cmds, cb);
    }

    add(name, uid, sid, cb)
    {
        this.redisClient.sadd(genKey(this, name, sid), uid, function(err)
        {
            utils.invokeCallback(cb, err);
        });
    }
    leave(name, uid, sid, cb)
    {
        this.redisClient.srem(genKey(this, name, sid), uid, function(err)
        {
            utils.invokeCallback(cb, err);
        });
    }

    getMembersBySid(name, sid, cb)
    {
        this.redisClient.smembers(genKey(this, name, sid), function(err, list)
        {
            utils.invokeCallback(cb, err, list);
        });
    }
}

module.exports = GlobalChannelManager;

var execMultiCommands = function(redis, cmds, cb)
{
    if(!cmds.length)
    {
        utils.invokeCallback(cb);
        return;
    }
    redis.multi(cmds).exec(function(err, reply)
    {
        utils.invokeCallback(cb, err);
    });
};


var genKey = function(self, name, sid)
{
  return self.prefix + ':' + name + ':' + sid;
};

var genCleanKey = function(self)
{
  return self.prefix + '*';
};
