'use strict';

const redisClass = require('redis');
const promisifyAll = require('../util/promisifyAll');

const DEFAULT_PREFIX = 'POMELO:CHANNEL';

class StatusChannelManager
{
	constructor(app, opts)
	{
		this.app = app;
		promisifyAll(redisClass.RedisClient.prototype);
		promisifyAll(redisClass.Multi.prototype);
		this.opts = opts || {};
		this.prefix = opts.prefix || DEFAULT_PREFIX;
		if (this.opts.auth_pass)
		{
			this.opts.password = this.opts.auth_pass;
			delete this.opts.auth_pass;
		}
		this.redisClient = null;
	}

	start()
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

	async stop(force = true)
	{
		if (this.redisClient)
		{
			// this.redisClient.quit();
			this.redisClient.quitAsync();
			this.redisClient.endAsync(force);
			this.redisClient = null;
			return true;
		}
		return true;
	}

	async clean()
	{
		const cleanKey = StatusChannelManager.GenCleanKey(this.prefix);
		const result = await this.redisClient.keysAsync(cleanKey);
		if (Array.isArray(result) && result.length > 0)
		{
			const cmdArr = [];
			for (const value of result)
			{
				cmdArr.push(['del', value]);
			}
			return await StatusChannelManager.ExecMultiCommands(this.redisClient, cmdArr);
		}
		return [];
	}

	async flushall()
	{
		return await this.redisClient.flushallAsync();
	}

	async add(uid, sid)
	{
		const genKey = StatusChannelManager.GenKey(this.prefix, uid);
		return await this.redisClient.saddAsync(genKey, sid);
	}

	async leave(uid, sid)
	{
		const genKey = StatusChannelManager.GenKey(this.prefix, uid);
		return await this.redisClient.sremAsync(genKey, sid);
	}

	async getSidsByUid(uid)
	{
		const genKey = StatusChannelManager.GenKey(this.prefix, uid);
		return await this.redisClient.smembersAsync(genKey);
	}

	async getSidsByUidArr(uidArr)
	{
		let serverIdArr;
		if (Array.isArray(uidArr))
		{
			uidArr = [...new Set(uidArr)];
			serverIdArr = uidArr.map(uid =>
			{
				return ['smembers', StatusChannelManager.GenKey(this.prefix, uid)];
			});
		}
		else if (typeof uidArr === 'string')
		{
			serverIdArr = [['smembers', StatusChannelManager.GenKey(this.prefix, uidArr)]];
		}
		const uidObjectArr = await StatusChannelManager.ExecMultiCommands(this.redisClient, serverIdArr);
		const uidObject = {};
		for (let i = 0; i < uidArr.length; i++)
		{
			uidObject[uidArr[i]] = [].concat(...uidObjectArr[i]);
		}
		return uidObject;
	}

	static async ExecMultiCommands(redisClient, cmdList)
	{
		if (!cmdList || cmdList.length <= 0)
		{
			return null;
		}
		return await redisClient.multi(cmdList).execAsync();
	}

	static GenKey(prefix, id, channelName = null)
	{
		let genKey = '';
		if (channelName === null)
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