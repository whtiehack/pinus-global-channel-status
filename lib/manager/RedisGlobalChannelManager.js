'use strict';

const StatusChannelManager = require('./StatusChannelManager');

class GlobalChannelManager extends StatusChannelManager
{
	async add(uid, sid, channelName = null)
	{
		if ([null, undefined].includes(channelName) || channelName.length < 0)
			return await super.add(uid, sid);
		if (Array.isArray(channelName))
		{
			const cmdArr = channelName.map(channel =>
			{
				return ['sadd', StatusChannelManager.GenKey(this.prefix, sid, channel), uid];
			});
			return await StatusChannelManager.ExecMultiCommands(this.redisClient, cmdArr);
		}
		const genKey = StatusChannelManager.GenKey(this.prefix, sid, channelName);
		return await this.redisClient.saddAsync(genKey, uid);
	}

	async destroyChannel(channelName)
	{
		const servers = this.app.getServers();
		const cmdArr = [];
		for (const serverId of Object.keys(servers))
		{
			const server = servers[serverId];
			if (this.app.isFrontend(server))
			{
				if (Array.isArray(channelName))
				{
					for (const channel of channelName)
					{
						if (![null, undefined].includes(channel) || channel.length > 0)
							cmdArr.push(['del', StatusChannelManager.GenKey(this.prefix, serverId, channel)]);
					}
				}
				else
				{
					cmdArr.push(['del', StatusChannelManager.GenKey(this.prefix, serverId, channelName)]);
				}
			}
		}
		return await StatusChannelManager.ExecMultiCommands(this.redisClient, cmdArr);
	}

	async leave(uid, sid, channelName = null)
	{
		if ([null, undefined].includes(channelName) || channelName.length < 0)
			return await super.leave(uid, sid);
		if (Array.isArray(channelName))
	    {
			const cmdArr = channelName.map(channel =>
			{
				return ['srem', StatusChannelManager.GenKey(this.prefix, sid, channel), uid];
			});
			return await StatusChannelManager.ExecMultiCommands(this.redisClient, cmdArr);
		}
		const genKey = StatusChannelManager.GenKey(this.prefix, sid, channelName);
		return await this.redisClient.sremAsync(genKey, uid);
	}

	async getMembersBySid(channelName, sid)
	{
		const genKey = StatusChannelManager.GenKey(this.prefix, sid, channelName);
		return await this.redisClient.smembersAsync(genKey);
	}

	/**
	 * Get members by channelName and serverType.
	 * 获取指定 channelName 的成员
	 * @param  {String}   serverType frontend server type string
	 * @param  {String|Array}   channelName channel name
	 * @private
	 */
	async getMembersByChannelName(serverType, channelName)
	{
		let servers = serverType;
		if (typeof serverType === 'string')
		{
			servers = this.app.getServersByType(serverType);
		}
		if (!servers || servers.length === 0)
		{
			// no frontend server infos
			return [];
		}
		const cmdArr = new Map();
		if (Array.isArray(channelName))
			channelName = Array.from(new Set(channelName));
		for (const serverObject of servers)
		{
			const sid = serverObject.id;
			let serverIdArr = cmdArr.has(sid) ? cmdArr.get(sid) : [];
			if (Array.isArray(channelName))
			{
				serverIdArr = channelName.map(change =>
				{
					return ['smembers', StatusChannelManager.GenKey(this.prefix, sid, change)];
				});
			}
			else
			{
				serverIdArr.push(['smembers', StatusChannelManager.GenKey(this.prefix, sid, channelName)]);
			}
			cmdArr.set(sid, StatusChannelManager.ExecMultiCommands(this.redisClient, serverIdArr));
		}
		const channelObjectArr = await Promise.all(cmdArr.values());
		const channelObject = {};
		const keys = Array.from(cmdArr.keys());
		for (let i = 0; i < cmdArr.size; i++)
		{
			channelObject[keys[i]] = [].concat(...channelObjectArr[i]);
		}
		return channelObject;
	}

	/**
	 *  通过 服务器ID(sid) 和 指定的 channel 获取玩家列表
	 * @param {string} sid
	 * @param channelName
	 * @return {Promise.<void>}
	 */
	async getMembersByChannelNameAndSid(sid, ...channelName)
	{
		if (typeof sid !== 'string' || sid.length <= 0) return Promise.reject(`sid ( ${sid} ) 不存在`);
		channelName = [].concat(...channelName);
		if (channelName.length > 1)
			channelName = Array.from(new Set(...channelName));
		const serverIdArr = channelName.map(change =>
		{
			return ['smembers', StatusChannelManager.GenKey(this.prefix, sid, change)];
		});

		const channelObjectArr = await StatusChannelManager.ExecMultiCommands(this.redisClient, serverIdArr);
		const channelObject = {};
		for (let i = 0; i < channelName.length; i++)
		{
			channelObject[channelName[i]] = [].concat(...channelObjectArr[i]);
		}
		return channelObject;
	}
}

module.exports = GlobalChannelManager;