'use strict';
const utils = require('../util/Utils');
const util = require('util');

const DefaultChannelManager = require('../manager/RedisGlobalChannelManager');

const ST_INITED = 0;
const ST_STARTED = 1;
const ST_CLOSED = 2;

/**
 * Global channel service.
 * GlobalChannelService is created by globalChannel component which is a default
 * component of pomelo enabled by `app.set('globalChannelConfig', {...})`
 * and global channel service would be accessed by
 * `app.get('globalChannelService')`.
 * @class
 */
class GlobalChannelService
{
	/**
	 * 构造函数
	 * @param {*} app pomelo instance
	 * @param {Object} opts 参数列表
	 */
	constructor(app, opts)
	{
		this.app = app;
		this.opts = opts || {};
		this.manager = GlobalChannelServiceUtility.GetChannelManager(app, opts);
		this.RpcInvokePromise = util.promisify(this.app.rpcInvoke);
		this.cleanOnStartUp = opts.cleanOnStartUp;
		this.state = ST_INITED;
		this.name = '__globalChannel__';
	}

	/**
	 * 发送消息给指定服务器 中的某一些人
	 * @param {String} route route string
	 * @param {Array} uids userId array
	 * @param {Object} msg 消息内容
	 * @param {String} serverType frontend server type
	 * @param {String} frontServerId  frontend server Id
	 * @returns {Array} send message fail userList
	 */
	async pushMessageForUid(route, msg, uids, serverType, frontServerId)
	{
		if (this.state !== ST_STARTED)
		{
			throw new Error('invalid state');
		}
		if (!uids || uids.length === 0)
		{
			return [];
		}
		const servers = this.app.getServersByType(serverType);

		if (!servers || servers.length === 0)
		{
            // no frontend server infos
			return [];
		}
		return await GlobalChannelServiceUtility.RpcInvoke(this.RpcInvokePromise, frontServerId, route, msg, uids);
	}

	/**
	 *  群发消息给玩家
	 * @param {String|Array} uidArr 要发送的玩家列表
	 * @param {String} route   消息号
	 * @param {String} msg    消息内容
	 * @param {String | null} frontServerId 指定的前端服务器Id, 默认不指定
	 * @returns {Array} send message fail userList
	 */
	async pushMessageByUidArr(uidArr, route, msg, frontServerId = null)
	{
		if ([null, undefined].includes(uidArr) || uidArr.length <= 0) throw new Error('userId List is null');
		if (this.state !== ST_STARTED)
		{
			throw new Error('invalid state');
		}

		const uidObject = await this.getSidsByUidArr(uidArr);
		const records = {};
		for (const [uid, sids] of Object.entities(uidObject))
		{
			if (Array.isArray(sids) && sids.length > 0)
			{
				if (![null, undefined].includes(frontServerId))
				{
					if (sids.includes(frontServerId))
					{
						if (records[frontServerId] === null)
						{
							records[frontServerId] = new Set();
						}
						records[frontServerId].add(uid);
					}
				}
				else
				{
					for (const serverId of sids)
					{
						if (records[serverId] === null)
						{
							records[serverId] = new Set();
						}
						records[serverId].add(uid);
					}
				}
			}
		}

		const sendMessageArr = [];
		for (const [sid, uid] of Object.entities(uidObject))
		{
			if (uid.size > 0)
			{
				sendMessageArr.push(GlobalChannelServiceUtility.RpcInvoke(this.RpcInvokePromise, sid, route, msg, Array.from(uid)));
			}
		}
		if (sendMessageArr.length > 0)
		{
			const failIds = await Promise.all(sendMessageArr);
			return [...new Set([].concat(...failIds))];
		}
		return null;
	}

	/**
     * Send message by global channel.
     *  发送消息给指定 channelName 的所有玩家
     * @param  {String}   serverType  frontend server type
     * @param  {String}   route       route string
     * @param  {Object}   msg         message would be sent to clients
     * @param  {String}   channelName channel name
     * @memberOf GlobalChannelService
     */
	async pushMessage(serverType, route, msg, channelName)
	{
		if (this.state !== ST_STARTED)
		{
			throw new Error('invalid state');
		}
		const servers = this.app.getServersByType(serverType);
		if (!servers || servers.length === 0)
		{
			return [];
		}
		const uidObject = await this.getMembersByChannelName(serverType, channelName);
		const sendMessageArr = [];
		for (const [sid, uids] of Object.entities(uidObject))
		{
			if (uids && uids.length > 0)
			{
				sendMessageArr.push(GlobalChannelServiceUtility.RpcInvoke(this.RpcInvokePromise, sid, route, msg, uids));
			}
		}
		if (sendMessageArr.length > 0)
		{
			const failIds = await Promise.all(sendMessageArr);
			return [...new Set([].concat(...failIds))];
		}
		return null;
	}

    /**
     * Get members by channel name.
     * 获取指定 channelName 和 服务器类型的成员
     * @param  {String}   serverType frontend server type string
     * @param  {String}   channelName channel name
     * @memberOf GlobalChannelService.
     * @public
     */
	async getMembersByChannelName(serverType, channelName)
    {
		if (this.state !== ST_STARTED)
		{
			throw new Error('invalid state');
		}
		return await this.manager.getMembersByChannelName(serverType, channelName);
	}

    /**
     * Get members by frontend server id.
     * 获取指定服务器和channelName 的玩家列表
     * @param  {String}   channelName channel name
     * @param  {String}   frontId  frontend server id
     * @memberOf GlobalChannelService
     */
	async getMembersBySid(channelName, frontId)
    {
		if (this.state !== ST_STARTED)
		{
			throw new Error('invalid state');
		}
		return await this.manager.getMembersBySid(channelName, frontId);
	}

	/**
	 *  获得指定玩家在所在的服务器
	 * @param uid 要查找的 玩家id
	 * @returns {Array}
	 */
	async getSidsByUid(uid)
	{
		if (this.state !== ST_STARTED)
		{
			throw new Error('invalid state');
		}
		return await this.manager.getSidsByUid(uid);
	}

	/**
	 *  获取指定玩家的服务器列表
	 * @param uidArr 要查找的玩家列表
	 * @returns {Object}
	 */
	async getSidsByUidArr(uidArr)
	{
		if (this.state !== ST_STARTED)
		{
			throw new Error('invalid state');
		}
		return await this.manager.getSidsByUidArr(uidArr);
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
			this.manager.start()
				.then(result =>
				{
					if (this.cleanOnStartUp)
					{
						this.manager.clean()
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
			process.nextTick(() =>
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
			this.manager.stop(force)
                .then(result => {utils.InvokeCallback(cb, result);})
                .catch(err => {utils.InvokeCallback(cb, err);});
		}
		else
		{
			process.nextTick(() =>
			{
				utils.InvokeCallback(cb);
			});
		}
	}

    /**
     * Destroy a global channel.
     * @param  {String}  channelName global channel name
     * @memberOf GlobalChannelService
     */
	async destroyChannel(channelName)
    {
		if ([null, undefined].includes(channelName) || channelName.length <= 0) return;
		if (this.state !== ST_STARTED)
		{
			throw new Error('invalid state');
		}
		return await this.manager.destroyChannel(channelName);
	}

	/**
	 * 添加一个玩家 到指定channelName
	 * Add a member into channel.
	 * @param {String} uid  user id
	 * @param {String} sid  frontend server id
	 * @param {String | Array} channelName  指定的 channelName
	 * @returns {number} is add: 1 add success, 0 fail
	 */
	async add(uid, sid, channelName = null)
	{
		if (this.state !== ST_STARTED)
		{
			throw new Error('invalid state');
		}
		return await this.manager.add(uid, sid, channelName);
	}

    /**
     * Remove user from channel.
     * 移除一个玩家
     * @param  {String}   uid  user id
     * @param  {String}   sid  frontend server id
     * @param  {String | Array}   channelName channel name
     * @memberOf GlobalChannelService
     */
	async leave(uid, sid, channelName = null)
    {
		if (this.state !== ST_STARTED)
		{
			throw new Error('invalid state');
		}
		return await this.manager.leave(uid, sid, channelName);
	}

	/**
	 *  通过 服务器ID(sid) 和 指定的 channel 获取玩家列表
	 * @param {string} sid
	 * @param channelName
	 * @return {Promise.<void>}
	 */
	async getMembersByChannelNameAndSid(sid, channelName)
	{
		if (this.state !== ST_STARTED)
		{
			throw new Error('invalid state');
		}
		return await this.manager.getMembersByChannelNameAndSid(sid, channelName);
	}
}

/**
 * @private
 */
class GlobalChannelServiceUtility
{
	/**
	 *
	 * @param app
	 * @param opts
	 * @returns {*}
	 */
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

	static async RpcInvoke(RpcInvokePromise, sid, route, msg, sendUids)
	{
		return await RpcInvokePromise(sid,
			{
				namespace : 'sys',
				service   : 'channelRemote',
				method    : 'pushMessage',
				args      : [route, msg, sendUids, {isPush: true}]
			});
	}
}

module.exports = GlobalChannelService;