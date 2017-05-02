const utils = require('../util/Utils');
const co = require('co');
const logger = require('pomelo-logger').getLogger(__filename);

const DefaultChannelManager = require('../manager/RedisGlobalChannelManager');

const ST_INITED = 0;
const ST_STARTED = 1;
const ST_CLOSED = 2;

class GlobalChannelService
{
    /**
     * Global channel service.
     * GlobalChannelService is created by globalChannel component which is a default
     * component of pomelo enabled by `app.set('globalChannelConfig', {...})`
     * and global channel service would be accessed by
     * `app.get('globalChannelService')`.
     *
     * @class
     * @constructor
     */
	constructor(app, opts)
    {
		this.app = app;
		this.opts = opts || {};
		this.manager = GlobalChannelServiceUtility.GetChannelManager(app, opts);
		this.cleanOnStartUp = opts.cleanOnStartUp;
		this.state = ST_INITED;
		this.name = '__globalChannel__';
	}

	/**
	 * 发送消息给指定服务器中的某一些人
	 * @param serverType frontend server type
	 * @param frontServerId  frontend server Id
	 * @param route route string
	 * @param sendUids uids
	 * @param msg
	 * @returns {*}
	 */
	*pushMessageForUid(serverType, frontServerId, route, sendUids, msg)
    {
		if (this.state !== ST_STARTED)
        {
			throw new Error('invalid state');
		}
		if (!sendUids || sendUids.length === 0)
        {
			return [];
		}
		const servers = this.app.getServersByType(serverType);

		if (!servers || servers.length === 0)
        {
            // no frontend server infos
			return [];
		}
		return yield GlobalChannelServiceUtility.RpcInvoke(this.app, frontServerId, route, msg, sendUids);

	}

	*pushMessageByUidArr(uidArr, route, msg, frontServerId = null)
	{
		if(this.state !== ST_STARTED) {
			throw new Error('invalid state');
		}

		const records = {};
		const coArr = [];

		for (const uid of uidArr.values())
		{
			const coItem = co(this.getSidsByUid(uid))
				.then(serverIdList =>
				{
					if (frontServerId != null)
					{
						if (records[frontServerId] == null)
						{
							records[frontServerId] = new Set();
						}
						if (serverIdList.includes(frontServerId))
							records[frontServerId].add(uid);
					}
					else
					{
						for (const serverId of serverIdList.values())
						{
							if (records[serverId] == null)
							{
								records[serverId] = new Set();
							}
							records[serverId].add(uid);
						}
					}
				});
			coArr.push(coItem);
		}
		yield coArr;
		const sendMessageArr = [];
		for (let [serverId, uidSet] of Object.entries(records)) {
			if (uidSet.size > 0)
			{
				sendMessageArr.push(GlobalChannelServiceUtility.RpcInvoke(this.app, serverId, route, msg, Array.from(uidSet)));
			}
		}
		return yield sendMessageArr;
	}

	/**
     * Send message by global channel.
     *  发送消息给指定 channelName 的所有玩家
     * @param  {String}   serverType  frontend server type
     * @param  {String}   route       route string
     * @param  {Object}   msg         message would be sent to clients
     * @param  {String}   channelName channel name
     * @param  {Object}   opts        reserved
     *
     * @memberOf GlobalChannelService
     */
	*pushMessage(serverType, route, msg, channelName, opts)
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
		let failIds = [];
		const coArr = [];
		const coRpcArr = [];
		for (let i = 0, l = servers.length; i < l; i++)
        {
			((self, arg) =>
            {
				coArr.push(co(self.getMembersBySid(channelName, servers[arg].id))
                    .then(uids =>
					{
						if (uids && uids.length > 0)
						{
							coRpcArr.push(co(GlobalChannelServiceUtility.RpcInvoke(self.app, servers[arg].id, route, msg, uids))
                                .then(fails => {failIds = failIds.concat(fails);})
                                .catch(err => {logger.error(`[pushMessage] fail to dispatch msg, err:${err.stack}`);})
                            );
						}
					})
                    .catch(err => {logger.error(`[getMembersBySid] fail to get members, err${err.stack}`);})
                );
			})(this, i);
		}
		yield coArr;
		yield coRpcArr;
		return failIds;
	}

    /**
     * Get members by channel name.
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
	    return yield this.manager.getMembersByChannelName(serverType, channelName);
	}

    /**
     * Get members by frontend server id.
     *
     * @param  {String}   channelName channel name
     * @param  {String}   frontId  frontend server id
     * @memberOf GlobalChannelService
     */
	*getMembersBySid(channelName, frontId)
    {
		if (this.state !== ST_STARTED)
        {
			throw new Error('invalid state');
		}
		return yield this.manager.getMembersBySid(channelName, frontId);
	}

	*getSidsByUid(uid)
	{
		if (this.state !== ST_STARTED)
		{
			throw new Error('invalid state');
		}
		return yield this.manager.getSidsByUid(uid);
	}

	*getSidsByUidArr (uidArr)
	{
		if (this.state !== ST_STARTED)
		{
			throw new Error('invalid state');
		}
		return yield this.manager.getSidsByUidArr(uidArr);
	}

	start(cb)
    {
		if (this.state !== ST_INITED)
        {
			utils.InvokeCallback(cb, new Error('invalid state'));
			return;
		}

		if (typeof this.manager.start === 'function')
        {
			co(this.manager.start())
                .then(result =>
				{
					this.state = ST_STARTED;
					if (this.cleanOnStartUp)
					{
						co(this.manager.clean())
                            .then(result => {utils.InvokeCallback(cb, null);})
                            .catch(err => {utils.InvokeCallback(cb, err);});
					}
					else
					{
						utils.InvokeCallback(cb, null);
					}
				})
                .catch(err =>
				{
					utils.InvokeCallback(cb, err);
				});
		}
		else
        {
			process.nextTick(function()
            {
				utils.InvokeCallback(cb);
			});
		}
	}

	stop(force, cb)
    {
		this.state = ST_CLOSED;
		if (typeof this.manager.stop === 'function')
        {
			co(this.manager.stop(force))
                .then(result => {utils.InvokeCallback(cb, result);})
                .catch(err => {utils.InvokeCallback(cb, err);});
		}
		else
        {
			process.nextTick(function()
            {
				utils.InvokeCallback(cb);
			});
		}
	}

    /**
     * Destroy a global channel.
     *
     * @param  {String}  channelName global channel name
     * @memberOf GlobalChannelService
     */
	*destroyChannel(channelName)
    {
		if (this.state !== ST_STARTED)
        {
			throw new Error('invalid state');
		}
		return yield this.manager.destroyChannel(channelName);
	}

	/**
	 * Add a member into channel.
	 * @param  {String} channelName channel name
	 * @param  {String}   uid  user id
	 * @param  {String}   sid  frontend server id
	 * @returns {*}
	 */
	*add(uid, sid, channelName)
    {
		if (this.state !== ST_STARTED)
        {
			throw new Error('invalid state');
		}
		return yield this.manager.add(uid, sid, channelName);

	}

    /**
     * Remove user from channel.
     *
     * @param  {String}   name channel name
     * @param  {String}   uid  user id
     * @param  {String}   sid  frontend server id
     * @param  {Function} cb   callback function
     *
     * @memberOf GlobalChannelService
     */
	*leave(name, uid, sid)
    {
		if (this.state !== ST_STARTED)
        {
			throw new Error('invalid state');
		}
		return yield this.manager.leave(uid, sid, name);
	}
}

class GlobalChannelServiceUtility
{
	static GetChannelManager(app, opts)
    {
		let channelManager;
		if (typeof opts.channelManager === 'function')
        {
			try
            {
				channelManager = opts.channelManager(app, opts);
			}
			catch (err)
            {
				channelManager = new opts.channelManager(app, opts);
			}
		}
		else
        {
			channelManager = opts.channelManager;
		}

		if (!channelManager)
		{
			channelManager = new DefaultChannelManager(app, opts);
		}
		return channelManager;
	}

	static RpcInvoke(app, sid, route, msg, sendUids)
    {
		return new Promise((resolve, reject) =>
        {
			app.rpcInvoke(sid,
				{
					namespace : 'sys',
					service   : 'channelRemote',
					method    : 'pushMessage',
					args      : [route, msg, sendUids, {isPush: true}]
				}, (...args) =>
                {
	                args = [].concat(...args);
	                const err = args[0], fails = args[1];
					if (err) return reject(err);
					return resolve(fails);
				});
		});
	}
}

module.exports = GlobalChannelService;