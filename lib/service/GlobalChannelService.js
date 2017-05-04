const utils = require('../util/Utils');
const co = require('co');
const _ = require('lodash');
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
	constructor(app, opts) {
		this.app = app;
		this.opts = opts || {};
		this.manager = GlobalChannelServiceUtility.GetChannelManager(app, opts);
		this.cleanOnStartUp = opts.cleanOnStartUp;
		this.state = ST_INITED;
		this.name = '__globalChannel__';
	}

	/**
	 * 发送消息给指定服务器 中的某一些人
	 * @param {String} serverType frontend server type
	 * @param{String} frontServerId  frontend server Id
	 * @param {String} route route string
	 * @param {Array} uids userId array
	 * @param msg
	 * @returns {*}
	 */
	*pushMessageForUid(serverType, frontServerId, route, uids, msg) {
		if (this.state !== ST_STARTED) {
			throw new Error('invalid state');
		}
		if (!uids || uids.length === 0) {
			return [];
		}
		const servers = this.app.getServersByType(serverType);

		if (!servers || servers.length === 0) {
            // no frontend server infos
			return [];
		}
		return yield GlobalChannelServiceUtility.RpcInvoke(this.app, frontServerId, route, msg, uids);

	}

	/**
	 *  群发消息给玩家
	 * @param {String|Array} uidArr 要发送的玩家列表
	 * @param {String} route   消息号
	 * @param {String} msg    消息内容
	 * @param {String} frontServerId 指定的前端服务器Id, 默认不指定
	 * @returns {*}
	 */
	*pushMessageByUidArr(uidArr, route, msg, frontServerId = null)	{
		if (this.state !== ST_STARTED)		{
			throw new Error('invalid state');
		}

		const uidObject = yield this.getSidsByUidArr(uidArr);
		const records = {};
		_.forEach(uidObject, (sids, uid) =>		{
			if (Array.isArray(sids) && sids.length > 0)	{
				if (frontServerId != null) {
					if (sids.includes(frontServerId)) {
						if (records[frontServerId] == null) {
							records[frontServerId] = new Set();
						}
						records[frontServerId].add(uid);
					}
				}
				else {
					for (const serverId of sids) {
						if (records[serverId] == null) {
							records[serverId] = new Set();
						}
						records[serverId].add(uid);
					}
				}
			}
		});

		const sendMessageArr = [];
		let failIds = [];
		_.forEach(records, (sid, uid) => {
			if (uid.size > 0) {
				sendMessageArr.push(
					co(GlobalChannelServiceUtility.RpcInvoke(this.app, sid, route, msg, Array.from(uid)))
						.then(fails => {failIds = failIds.concat(fails);})
						.catch(err => {logger.error(`[pushMessage] fail to dispatch msg, err:${err.stack}`);})
					);
			}
		});
		if (sendMessageArr.length > 0) {
			yield sendMessageArr;
			return failIds;
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
	*pushMessage(serverType, route, msg, channelName) {
		if (this.state !== ST_STARTED) {
			throw new Error('invalid state');
		}
		const servers = this.app.getServersByType(serverType);
		if (!servers || servers.length === 0) {
			return [];
		}
		const uidObject = yield this.getMembersByChannelName(serverType, channelName);
	    let failIds = [];
	    const coRpcArr = [];
	    _.forEach(uidObject, (sid, uids) => {
		    if (uids && uids.length > 0) {
			    coRpcArr.push(co(GlobalChannelServiceUtility.RpcInvoke(this.app, sid, route, msg, uids))
				    .then(fails => {failIds = failIds.concat(fails);})
				    .catch(err => {logger.error(`[pushMessage] fail to dispatch msg, err:${err.stack}`);})
			    );
		    }
	    });
	    if (coRpcArr.length > 0) {
		    yield coRpcArr;
		    return failIds;
	    }
		return null;
	}

    /**
     * Get members by channel name.
     * 获取指定 channelName 和 服务器类型的成员
     * @param  {String}   serverType frontend server type string
     * @param  {String}   channelName channel name
     *
     * @memberOf GlobalChannelService
     */
	*getMembersByChannelName(serverType, channelName) {
		if (this.state !== ST_STARTED) {
			throw new Error('invalid state');
		}
	    return yield this.manager.getMembersByChannelName(serverType, channelName);
	}

    /**
     * Get members by frontend server id.
     * 获取指定服务器和channelName 的玩家列表
     * @param  {String}   channelName channel name
     * @param  {String}   frontId  frontend server id
     * @memberOf GlobalChannelService
     */
	*getMembersBySid(channelName, frontId) {
		if (this.state !== ST_STARTED) {
			throw new Error('invalid state');
		}
		return yield this.manager.getMembersBySid(channelName, frontId);
	}

	/**
	 *  获得指定玩家在所在的服务器
	 * @param uid
	 * @returns {*}
	 */
	*getSidsByUid(uid)	{
		if (this.state !== ST_STARTED)		{
			throw new Error('invalid state');
		}
		return yield this.manager.getSidsByUid(uid);
	}

	/**
	 *  获取指定玩家的服务器列表
	 * @param uidArr
	 * @returns {*}
	 */
	*getSidsByUidArr(uidArr)	{
		if (this.state !== ST_STARTED)		{
			throw new Error('invalid state');
		}
		return yield this.manager.getSidsByUidArr(uidArr);
	}

	start(cb) {
		if (this.state !== ST_INITED) {
			utils.InvokeCallback(cb, new Error('invalid state'));
			return;
		}

		if (typeof this.manager.start === 'function') {
			co(this.manager.start())
				.then(result => {
			        this.state = ST_STARTED;
				    if (this.cleanOnStartUp) {
				        co(this.manager.clean())
				            .then(result => {utils.InvokeCallback(cb, null);})
				            .catch(err => {utils.InvokeCallback(cb, err);});
				    }
			        else {
				        utils.InvokeCallback(cb, null);
				    }
				})
				.catch(err => {
					utils.InvokeCallback(cb, err);
				});
		}
		else {
			process.nextTick(function() {
				utils.InvokeCallback(cb);
			});
		}
	}

	stop(force, cb) {
		this.state = ST_CLOSED;
		if (typeof this.manager.stop === 'function') {
			co(this.manager.stop(force))
                .then(result => {utils.InvokeCallback(cb, result);})
                .catch(err => {utils.InvokeCallback(cb, err);});
		}
		else {
			process.nextTick(function() {
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
	*destroyChannel(channelName) {
		if (this.state !== ST_STARTED) {
			throw new Error('invalid state');
		}
		return yield this.manager.destroyChannel(channelName);
	}

	/**
	 * 添加一个玩家 到指定channelName
	 * Add a member into channel.
	 * @param {String} uid  user id
	 * @param {String} sid  frontend server id
	 * @param {String} channelName  if channelName == null add redis
	 * @returns {*} is add: 1 add success, 0 fail
	 */
	*add(uid, sid, channelName = null) {
		if (this.state !== ST_STARTED) {
			throw new Error('invalid state');
		}
		return yield this.manager.add(uid, sid, channelName);

	}

    /**
     * Remove user from channel.
     * 移除一个玩家
     * @param  {String}   uid  user id
     * @param  {String}   sid  frontend server id
     * @param  {String}   channelName channel name
     * @memberOf GlobalChannelService
     */
	*leave(uid, sid, channelName = null) {
		if (this.state !== ST_STARTED) {
			throw new Error('invalid state');
		}
		return yield this.manager.leave(uid, sid, channelName);
	}
}

class GlobalChannelServiceUtility
{
	static GetChannelManager(app, opts) {
		let channelManager;
		if (typeof opts.channelManager === 'function') {
			try {
				channelManager = opts.channelManager(app, opts);
			}
			catch (err) {
				channelManager = new opts.channelManager(app, opts);
			}
		}
		else {
			channelManager = opts.channelManager;
		}

		if (!channelManager)		{
			channelManager = new DefaultChannelManager(app, opts);
		}
		return channelManager;
	}

	static RpcInvoke(app, sid, route, msg, sendUids) {
		return new Promise((resolve, reject) => {
			app.rpcInvoke(sid,
				{
					namespace : 'sys',
					service   : 'channelRemote',
					method    : 'pushMessage',
					args      : [route, msg, sendUids, {isPush: true}]
				}, (...args) => {
	                args = [].concat(...args);
	                const err = args[0], fails = args[1];
					if (err) return reject(err);
					return resolve(fails);
				});
		});
	}
}

module.exports = GlobalChannelService;