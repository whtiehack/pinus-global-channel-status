const redisClass = require('redis');
const blueBird = require('bluebird');

const DEFAULT_PREFIX = 'POMELO:CHANNEL';

class StatusChannelManager
{
	constructor(app, opts)
	{
		this.app = app;
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
		const cleanKey = StatusChannelManager.GenCleanKey(this.prefix);
		const list = yield this.redisClient.keysAsync(cleanKey)
			.then(list => {return list;})
			.catch(err => {return err;});
		const cmdArr = [];
		for (let value of list.values())
		{
			cmdArr.push(['del', value]);
		}
		return yield StatusChannelManager.ExecMultiCommands(this.redisClient, cmdArr);
	}

	*flushall()
	{
		return yield this.redisClient.flushallAsync()
			.then(result => {return result;})
			.catch(err => {return err;});
	}

	*add(uid, sid)
	{
		const genKey = StatusChannelManager.GenKey(this.prefix, uid);
		return yield this.redisClient.saddAsync(genKey, sid)
			.then(result => {return result;})
			.catch(err => {return err;});
	}

	*leave(uid, sid)
	{
		const genKey = StatusChannelManager.GenKey(this.prefix, uid);
		return yield this.redisClient.sremAsync(genKey, sid)
			.then(result => {return true;})
			.catch(errInfo => {return false;});
	}

	*getSidsByUid (uid)
	{
		const genKey = StatusChannelManager.GenKey(this.prefix, uid);
		return yield this.redisClient.smembersAsync(genKey)
			.then(result => {return result;})
			.catch(err => {return err;});
	}

	*getSidsByUidArr (uidArr)
	{
		const cmdArr = [];
		for (let uid of uidArr.values()) {
			cmdArr.push(['exists', StatusChannelManager.GenKey(this.prefix, uid)]);
		}
		return yield StatusChannelManager.ExecMultiCommands(this.redisClient, cmdArr);
	}

	static *ExecMultiCommands(redisClient, cmdList)
	{
		if (!cmds || cmds.length <= 0)
		{
			return null;
		}
		return yield redisClient.multi(cmdList).execAsync()
			.then(list => {return list;})
			.catch(err => {return err;});
	}

	static GenKey(prefix, id, channelName = null)
	{
		let genKey = "";
		if (channelName == null)
			genKey = `${prefix}:${id}`;
		else
			genKey = `${prefix}:${channelName}:${id}`;
		return genKey;
	}

	static GenCleanKey(prefix)
	{
		return `${prefix}*`;
	}
}

module.exports = StatusChannelManager;