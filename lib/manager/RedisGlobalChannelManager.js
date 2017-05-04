const StatusChannelManager = require('./StatusChannelManager');
const _ = require('lodash');

class GlobalChannelManager extends StatusChannelManager
{

	*add(uid, sid, channelName = null) {
		if (channelName == null) return yield super.add(uid, sid);
		const genKey = StatusChannelManager.GenKey(this.prefix, sid, channelName);
		return yield this.redisClient.saddAsync(genKey, uid)
            .then(result => {return result;})
            .catch(err => {return err;});
	}

	*destroyChannel(channelName) {
	    const servers = this.app.getServers();
		const cmdArr = [];
		for (const serverId in servers) {
			const server = servers[serverId];
			if (this.app.isFrontend(server)) {
	            cmdArr.push(['del', StatusChannelManager.GenKey(this.prefix, serverId, channelName)]);
			}

		}
		return yield StatusChannelManager.ExecMultiCommands(this.redisClient, cmdArr);
	}

	*leave(uid, sid, channelName = null) {
	    if (channelName == null) return yield super.leave(uid, sid);
	    if (Array.isArray(channelName) && channelName.length > 0) {
		    const cmdArr = [];
			for (const channel of channelName) {
				cmdArr.push(['srem', StatusChannelManager.GenKey(this.prefix, sid, channel), uid]);
			}
		    return yield StatusChannelManager.ExecMultiCommands(this.redisClient, cmdArr);
	    }
		const genKey = StatusChannelManager.GenKey(this.prefix, sid, channelName);
	    return yield this.redisClient.sremAsync(genKey, uid)
		    .then(result => {return result;})
		    .catch(errInfo => {return false;});
	}

	*getMembersBySid(channelName, sid) {
		const genKey = StatusChannelManager.GenKey(this.prefix, sid, channelName);
		return yield this.redisClient.smembersAsync(genKey)
            .then(result => {return result;})
            .catch(err => {return err;});
	}

	/**
	 * Get members by channelName and serverType.
	 * 获取指定 channelName 的成员
	 * @param  {String}   serverType frontend server type string
	 * @param  {String}   channelName channel name
	 *
	 * @memberOf GlobalChannelService
	 */
	*getMembersByChannelName(serverType, channelName) {
		let servers = serverType;
		if (typeof serverType == 'string') {
			servers = this.app.getServersByType(serverType);
		}
		if (!servers || servers.length === 0) {
			// no frontend server infos
			return [];
		}
		const serverId = [];
		const cmdArr = [];
		for (const serverObject of servers)	{
			const sid = serverObject.id;
			serverId.push(sid);
			cmdArr.push(['smembers', StatusChannelManager.GenKey(this.prefix, sid, channelName)]);
		}
		const result = yield StatusChannelManager.ExecMultiCommands(this.redisClient, cmdArr);
		return _.zipObject(serverId, result);
	}
}

module.exports = GlobalChannelManager;