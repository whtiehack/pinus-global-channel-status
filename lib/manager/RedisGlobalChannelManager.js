const StatusChannelManager = require('./StatusChannelManager');

class GlobalChannelManager extends StatusChannelManager
{

	*add(uid, sid, channelName = null)
    {
		if (channelName == null) return yield super.add(uid, sid);
		const genKey = StatusChannelManager.GenKey(this.prefix, sid, channelName);
		return yield this.redisClient.saddAsync(genKey, uid)
            .then(result => {return result;})
            .catch(err => {return err;});
	}

	*destroyChannel(channelName)
    {
	    const servers = this.app.getServers();
		const cmdArr = [];
		for (const serverId in servers)
        {
			const server = servers[serverId];
			if (this.app.isFrontend(server))
            {
	            cmdArr.push(['del', genKey(this, channelName, serverId)]);
			}
		}
		return yield StatusChannelManager.ExecMultiCommands(this.redisClient, cmdArr);
	}

	*leave(uid, sid, channelName = null)
    {
	    if (channelName == null) return yield super.leave(uid, sid);
		const genKey = StatusChannelManager.GenKey(this.prefix, sid, channelName);
	    return yield this.redisClient.sremAsync(genKey, sid)
		    .then(result => {return true;})
		    .catch(errInfo => {return false;});
	}

	*getMembersBySid(channelName, sid)
    {
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
	*getMembersByChannelName(serverType, channelName)
	{
		if (this.state !== ST_STARTED)
		{
			throw new Error('invalid state');
		}
		const servers = this.app.getServersByType(serverType);

		if (!servers || servers.length === 0)
		{
			// no frontend server infos
			return [];
		}
		let members = [];
		const coArr = [];
		for (let i = 0, l = servers.length; i < l; i++)
		{
			((self, arg) =>
			{
				coArr.push(co(self.getMembersBySid(channelName, servers[arg].id))
					.then(uids => {members = members.concat(uids);})
					.catch(err => {logger.error(`[getMembersBySid] fail to get members, err${err.stack}`);})
				);
			})(this, i);
		}
		yield coArr;
		return members;
	}
}

module.exports = GlobalChannelManager;