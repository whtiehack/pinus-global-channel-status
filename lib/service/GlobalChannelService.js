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
     * 发送消息给当前服务器中的某一些人
     *
     * @param  {String}   serverType  frontend server type
     * @param  {String}   route       route string
     * @param  {Object}   msg         message would be sent to clients
     * @param  {String}   channelName channel name
     * @param  {Object}   opts        reserved
     * @param  {Function} cb          callback function
     *
     * @memberOf GlobalChannelService
     */
	*pushMessageForUid(serverType, sid, route, sendUids, msg)
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
		return yield GlobalChannelServiceUtility.RpcInvoke(this.app, sid, route, msg, sendUids);

	}

    /**
     * Send message by global channel.
     *
     * @param  {String}   serverType  frontend server type
     * @param  {String}   route       route string
     * @param  {Object}   msg         message would be sent to clients
     * @param  {String}   channelName channel name
     * @param  {Object}   opts        reserved
     * @param  {Function} cb          callback function
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
     * 获取当前场景所有 成员
     * @param  {String}   stype frontend server type string
     * @param  {String}   name channel name
     * @param  {Function} cb   callback function
     *
     * @memberOf GlobalChannelService
     */
	*getMembersByChannelName(stype, name)
    {
		if (this.state !== ST_STARTED)
        {
			throw new Error('invalid state');
		}
		const servers = this.app.getServersByType(stype);

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
				coArr.push(co(self.getMembersBySid(name, servers[arg].id))
                    .then(uids => {members = members.concat(uids);})
                    .catch(err => {logger.error(`[getMembersBySid] fail to get members, err${err.stack}`);})
                );
			})(this, i);
		}
		yield coArr;
		return members;
	}

    /**
     * Get members by frontend server id.
     *
     * @param  {String}   name channel name
     * @param  {String}   sid  frontend server id
     * @param  {Function} cb   callback function
     *
     * @memberOf GlobalChannelService
     */
	*getMembersBySid(name, sid)
    {
		if (this.state !== ST_STARTED)
        {
			throw new Error('invalid state');
		}
		return yield this.manager.getMembersBySid(name, sid);
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
     * @param  {String}   name global channel name
     * @param  {Function} cb callback function
     *
     * @memberOf GlobalChannelService
     */
	*destroyChannel(name)
    {
		if (this.state !== ST_STARTED)
        {
			throw new Error('invalid state');
		}
		return yield this.manager.destroyChannel(this.app.servers, name);
	}

    /**
     * Add a member into channel.
     *
     * @param  {String}   name channel name
     * @param  {String}   uid  user id
     * @param  {String}   sid  frontend server id
     * @param  {Function} cb   callback function
     *
     * @memberOf GlobalChannelService
     */
	*add(name, uid, sid)
    {
		if (this.state !== ST_STARTED)
        {
			throw new Error('invalid state');
		}
		return yield this.manager.add(name, uid, sid);

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
		return yield this.manager.leave(name, uid, sid);
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
			channelManager = new DefaultChannelManager(opts);
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