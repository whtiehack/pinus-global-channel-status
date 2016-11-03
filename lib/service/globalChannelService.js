const utils = require('../util/utils');
const redis = require('redis');
const CountDownLatch = require('../util/countDownLatch');
const logger = require('pomelo-logger').getLogger(__filename);

const DefaultChannelManager = require('../manager/redisGlobalChannelManager');

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
    pushMessageForUid(serverType, sid, route, sendUids, msg, cb)
    {
        if(this.state !== ST_STARTED)
        {
            utils.invokeCallback(cb, new Error('invalid state'));
            return;
        }
        const namespace = 'sys';
        const service = 'channelRemote';
        const method = 'pushMessage';
        let failIds = [];

        const servers = this.app.getServersByType(serverType);

        if(!servers || servers.length === 0)
        {
            // no frontend server infos
            utils.invokeCallback(cb, null, failIds);
            return;
        }
        const rpcCB = (err, fails) =>
        {
            if(err)
            {
                utils.invokeCallback(cb, new Error(`${sid} server push message fail ${err}`));
                return;
            }
            utils.invokeCallback(cb, null, fails);
        };

        if(sendUids && sendUids.length > 0)
        {
            this.app.rpcInvoke(sid, {namespace: namespace, service: service,
                method: method, args: [route, msg, sendUids, {isPush: true}]}, rpcCB);
        }
        else
        {
            process.nextTick(rpcCB);
        }
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
    pushMessage(serverType, route, msg, channelName, opts, cb)
    {
        if(this.state !== ST_STARTED) {
            utils.invokeCallback(cb, new Error('invalid state'));
            return;
        }

        const namespace = 'sys';
        const service = 'channelRemote';
        const method = 'pushMessage';
        let failIds = [];

        const servers = this.app.getServersByType(serverType);

        if(!servers || servers.length === 0)
        {
            // no frontend server infos
            utils.invokeCallback(cb, null, failIds);
            return;
        }

        let successFlag = false;
        const latch = new CountDownLatch(servers.length, () =>
        {
            if(!successFlag)
            {
                utils.invokeCallback(cb, new Error('all frontend server push message fail'));
                return;
            }
            utils.invokeCallback(cb, null, failIds);
        });


        var rpcCB = function(err, fails) {
            if(err)
            {
                logger.error('[pushMessage] fail to dispatch msg, err:' + err.stack);
                latch.done();
                return;
            }
            if(fails)
            {
                failIds = failIds.concat(fails);
            }
            successFlag = true;
            latch.done();
        };


        for(let i=0, l=servers.length; i<l; i++)
        {
            (function(self, arg){
                self.getMembersBySid(channelName, servers[arg].id, function(err, uids)
                {
                    if(err) {
                        logger.error('[getMembersBySid] fail to get members, err' + err.stack);
                    }
                    if(uids && uids.length > 0)
                    {
                        self.app.rpcInvoke(servers[arg].id, {namespace: namespace, service: service,
                            method: method, args: [route, msg, uids, {isPush: true}]}, rpcCB);
                    }
                    else
                    {
                        process.nextTick(rpcCB);
                    }
                });
            })(this, i);
        }
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
    getMembersByChannelName(stype, name, cb)
    {
        if(this.state !== ST_STARTED)
        {
            utils.invokeCallback(cb, new Error('invalid state'));
            return;
        }
        let members = [];
        const servers = this.app.getServersByType(stype);

        if(!servers || servers.length === 0)
        {
            utils.invokeCallback(cb, null, []);
            return;
        }

        const latch = new CountDownLatch(servers.length, function()
        {
            utils.invokeCallback(cb, null, members);
        });

        for(let i=0, l=servers.length; i<l; i++)
        {
            this.getMembersBySid(name, servers[i].id, function(err, list)
            {
                if(err)
                {
                    utils.invokeCallback(cb, err, null);
                    return;
                }
                if(list && list.length !== 0)
                {
                    members = members.concat(list);
                }
                latch.done();
            });
        }
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
    getMembersBySid(name, sid, cb)
    {
        if(this.state !== ST_STARTED)
        {
            utils.invokeCallback(cb, new Error('invalid state'));
            return;
        }
        this.manager.getMembersBySid(name, sid, cb);
    }

    start(cb)
    {
        if(this.state !== ST_INITED)
        {
            utils.invokeCallback(cb, new Error('invalid state'));
            return;
        }

        if(typeof this.manager.start === 'function')
        {
            var self = this;
            this.manager.start( (err)=>
            {
                if(!err) {
                    this.state = ST_STARTED;
                }
                if(!!self.cleanOnStartUp)
                {
                    this.manager.clean((err)=>
                    {
                        utils.invokeCallback(cb, err);
                    });
                }
                else
                {
                    utils.invokeCallback(cb, err);
                }
            });
        }
        else
        {
            process.nextTick(function()
            {
                utils.invokeCallback(cb);
            });
        }
    }

    stop(force, cb)
    {
        this.state = ST_CLOSED;

        if(typeof this.manager.stop === 'function')
        {
            this.manager.stop(force, cb);
        }
        else
        {
            process.nextTick(function()
            {
                utils.invokeCallback(cb);
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
    destroyChannel(name, cb)
    {
        if(this.state !== ST_STARTED)
        {
            utils.invokeCallback(cb, new Error('invalid state'));
            return;
        }

        this.manager.destroyChannel(name, cb);
    };

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
    add(name, uid, sid, cb)
    {
        if(this.state !== ST_STARTED)
        {
            utils.invokeCallback(cb, new Error('invalid state'));
            return;
        }
        this.manager.add(name, uid, sid, cb);
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
    leave(name, uid, sid, cb)
    {
        if(this.state !== ST_STARTED)
        {
            utils.invokeCallback(cb, new Error('invalid state'));
            return;
        }
        this.manager.leave(name, uid, sid, cb);
    }
}

class GlobalChannelServiceUtility
{
    static GetChannelManager(app, opts)
    {
        let channelManager;
        if(typeof opts.channelManager === 'function')
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

        if(!channelManager) {
            channelManager = new DefaultChannelManager(app, opts);
        }
        return channelManager;
    }
}

module.exports = GlobalChannelService;