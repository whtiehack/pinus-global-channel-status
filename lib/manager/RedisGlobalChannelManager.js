const redisClass = require('redis');
const blueBird = require('bluebird');

const DEFAULT_PREFIX = 'POMELO:CHANNEL';

class GlobalChannelManager
{
	constructor(opts)
    {
		blueBird.promisifyAll(redisClass.RedisClient.prototype);
		blueBird.promisifyAll(redisClass.Multi.prototype);
		this.opts = opts || {};
		this.prefix = opts.prefix || DEFAULT_PREFIX;
		if (this.opts.auth_pass)
        {
			this.opts.password = this.opts.auth_pass;
			delete this.opts.auth_pass;
		}
		this.redisClient = null;
	}

	*start()
    {
		return new Promise((resolve, reject) =>
        {
			const redisClient = redisClass.createClient(this.opts);
			redisClient.on('error', err =>
            {
                // throw new Error(`[globalChannel][redis errorEvent]err:${err.stack}`);
				return reject(`[globalChannel][redis errorEvent]err:${err.stack}`);
			});

			redisClient.on('ready', err =>
            {
				if (err)
                {
					return reject(`[globalChannel][redis readyEvents]err:${err.stack}`);
				}
                this.redisClient = redisClient;
                return resolve();
			});
		});

	}

	*stop(force)
    {
		if (this.redisClient)
        {
			yield this.redisClient.endAsync(force);
            // this.redisClient.end(force);
			this.redisClient = null;
			return true;
		}
		return true;
	}

	*clean()
    {
		const cleanKey = RedisGlobalChannelManagerUtility.GenCleanKey(this.prefix);
		const list = yield this.redisClient.keysAsync(cleanKey)
            .then(list => {return list;})
            .catch(err => {return err;});
		const cmds = [];
		for (let i = 0; i < list.length; i++)
        {
			cmds.push(['del', list[i]]);
		}
		return yield RedisGlobalChannelManagerUtility.ExecMultiCommands(this.redisClient, cmds);
	}

	*flushall()
    {
		return yield this.redisClient.flushallAsync()
            .then(result => {return result;})
            .catch(err => {return err;});
	}

	*add(name, uid, sid)
    {
		const genKey = RedisGlobalChannelManagerUtility.GenKey(this.prefix, name, sid);
		return yield this.redisClient.saddAsync(genKey, uid)
            .then(result => {return result;})
            .catch(err => {return err;});
	}

	*destroyChannel(servers, name)
    {
		const cmds = [];
		let server;
		for (const sid in servers)
        {
			server = servers[sid];
			if (this.app.isFrontend(server))
            {
				cmds.push(['del', genKey(this, name, sid)]);
			}
		}
		return yield RedisGlobalChannelManagerUtility.ExecMultiCommands(this.redisClient, cmds);
	}

	*leave(name, uid, sid)
    {
		const genKey = RedisGlobalChannelManagerUtility.GenKey(this.prefix, name, sid);
		const isOk = yield this.redisClient.sremAsync(genKey, uid)
            .then(result => {return isOk;})
            .catch(errInfo => {return null;});
		return isOk;
	}

	*getMembersBySid(name, sid)
    {
		const genKey = RedisGlobalChannelManagerUtility.GenKey(this.prefix, name, sid);
		const result = yield this.redisClient.smembersAsync(genKey)
            .then(result => {return result;})
            .catch(err => {return err;});
		return result;
	}
}

class RedisGlobalChannelManagerUtility
{
	static *ExecMultiCommands(redisClient, cmds)
    {
		if (!cmds || cmds.length <= 0)
        {
			return null;
		}
		return yield redisClient.multi(cmds).execAsync()
            .then(list => {return list;})
            .catch(err => {return err;});
	}

	static GenKey(prefix, channelName, sid)
    {
		return `${prefix}:${channelName}:${sid}`;
	}

	static GenCleanKey(prefix)
    {
		return `${prefix}*`;
	}
}

module.exports = GlobalChannelManager;