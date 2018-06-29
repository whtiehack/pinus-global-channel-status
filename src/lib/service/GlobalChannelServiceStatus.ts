'use strict';
import utils from '../util/Utils';
import * as util from 'util';

import DefaultChannelManager from '../manager/RedisGlobalChannelManager';
import {PinusGlobalChannelStatusOptions} from "../manager/StatusChannelManager";

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
export class GlobalChannelServiceStatus
{
    private manager:DefaultChannelManager;
    private cleanOnStartUp:boolean;
    private state:number = ST_INITED;
    public name:string = '__globalChannel__';
    private readonly RpcInvokePromise = null;
	/**
	 * 构造函数
	 * @param {*} app pomelo instance
	 * @param {Object} opts 参数列表
	 */
	constructor(private app, private opts:PinusGlobalChannelStatusOptions = {})
	{
		this.manager = GetChannelManager(app, opts);
		this.cleanOnStartUp = opts.cleanOnStartUp;
		// app.rpcInvoke 是 bind了rpcClient this的rpcInvoke
		this.RpcInvokePromise = util.promisify(this.app.rpcInvoke);
	}

	/**
	 * TODO:发送消息给指定服务器 中的某一些人
	 * @param {String} route route string
	 * @param {Array} uids userId array
	 * @param {Object} msg 消息内容
	 * @param {String} serverType frontend server type
	 * @param {String} frontServerId  frontend server Id
	 * @returns {Array} send message fail userList
	 */
	async pushMessageForUid(route:string, msg:any, uids:string[], serverType:string, frontServerId:string)
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
		return await RpcInvoke(this.RpcInvokePromise, frontServerId, route, msg, uids);
	}

	/**
	 *  TODO:群发消息给玩家
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
		const records = new Map();
		const keysArr = Object.keys(uidObject);
		for (let i = 0; i < keysArr.length; i++)
		{
			const uid = keysArr[i];
			const sids = uidObject[uid];
			let uidSet = null;
			if (Array.isArray(sids) && sids.length > 0)
			{
				if (![null, undefined].includes(frontServerId))
				{
					if (sids.includes(frontServerId))
					{
						if (records.has(frontServerId))
						{
							uidSet = records.get(frontServerId);
						}
						else
						{
							uidSet = new Set();
							records.set(frontServerId, uidSet);
						}
						uidSet.add(uid);
					}
				}
				else
				{
					for (const serverId of sids)
					{
						if (records.has(serverId))
						{
							uidSet = records.get(serverId);
						}
						else
						{
							uidSet = new Set();
							records.set(serverId, uidSet);
						}
						uidSet.add(uid);
					}
				}
			}
		}

		const sendMessageArr = [];
		for (const [sid, uidSet] of records)
		{
			if (uidSet.size > 0)
			{
				sendMessageArr.push(RpcInvoke(this.RpcInvokePromise, sid, route, msg, uidSet));
			}
		}
		if (sendMessageArr.length > 0)
		{
			return await Promise.all(sendMessageArr);
		}
		return null;
	}

	/**
     * TODO:Send message by global channel.
     *  发送消息给指定 channelName 的所有玩家
     * @param  {String}   serverType  frontend server type
     * @param  {String}   route       route string
     * @param  {Object}   msg         message would be sent to clients
     * @param  {String}   channelName channel name
     * @memberOf GlobalChannelServiceStatus
     */
	async pushMessageByChannelName(serverType, route, msg, channelName)
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
		const keysArr = Object.keys(uidObject);
		for (let i = 0; i < keysArr.length; i++)
		{
			const sid = keysArr[i];
			const uids = uidObject[sid];
			if (uids && uids.length > 0)
			{
				sendMessageArr.push(RpcInvoke(this.RpcInvokePromise, sid, route, msg, uids));
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
     * TODO:Get members by channel name.
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
     * TODO:Get members by frontend server id.
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
	 *  TODO:获得指定玩家在所在的服务器
	 * @param uid 要查找的 玩家id
	 * @returns {Array}
	 */
	public async getSidsByUid(uid)
	{
		if (this.state !== ST_STARTED)
		{
			throw new Error('invalid state');
		}
		return await this.manager.getSidsByUid(uid);
	}

	/**
	 *  TODO:获取指定玩家的服务器列表
	 */
    public async getSidsByUidArr(uidArr)
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
					this.state = ST_STARTED;
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
     * Destroy  global channel or channels.
     */
	public async destroyChannel(channelName:string |string[]):Promise<number[]>
    {
		if (!channelName || channelName.length <= 0) return;
		if (this.state !== ST_STARTED)
		{
			throw new Error('invalid state');
		}
		return await this.manager.destroyChannel(channelName);
	}

	/**
	 * TODOx:添加一个玩家 到指定channelName
	 * Add a member into channel.
	 * @param {String} uid  user id
	 * @param {String} sid  frontend server id
	 * @param {String | Array} channelName  指定的 channelName
	 * @returns {number} is add: 1 add success, 0 fail
	 */
	public async add(uid:string, sid:string, channelName:string|string[]):Promise<number|number[]>
	{
		if (this.state !== ST_STARTED)
		{
			throw new Error('invalid state');
		}
		return await this.manager.add(uid, sid, channelName);
	}

    /**
	 * 加入 status
     * @param {string} uid
     * @param {string} sid
     * @returns {Promise<number>}
     */
	public async addStatus(uid:string,sid:string):Promise<number>{
        if (this.state !== ST_STARTED)
        {
            throw new Error('invalid state');
        }
        return await this.manager.add(uid, sid);
	}

    /**
	 * 指定channel 移除一个玩家
     * @param uid
     * @param sid
     * @param {string | string[]} channelName
     * @returns {Promise<number[]>}
     */
	public async leave(uid, sid, channelName:string|string[]):Promise<number|number[]>
    {
		if (this.state !== ST_STARTED)
		{
			throw new Error('invalid state');
		}
		return await this.manager.leave(uid, sid, channelName);
	}

    /**
	 * 离开 status 一般下线调用
     * @param {string} uid
     * @param {string} sid
     * @returns {Promise<number>}
     */
	public async leaveStatus(uid:string,sid:string):Promise<number>{
        if (this.state !== ST_STARTED)
        {
            throw new Error('invalid state');
        }
		return this.manager.leave(uid,sid);
	}

    /**
	 * 	通过 服务器ID(sid) 和 指定的 channel 获取玩家列表
     * @param {string} sid
     * @param {string | string[]} channelName
     * @returns {Promise<{[channelName: string]: string[]}>} key是 channelname example: { channelName1: [ 'uuid_18', 'uuid_3' ] }
     */
	public async getMembersByChannelNameAndSid(sid:string, channelName:string|string[]):Promise<{[channelName: string]: string[]}>
	{
		if (this.state !== ST_STARTED)
		{
			throw new Error('invalid state');
		}
		return await this.manager.getMembersByChannelNameAndSid(sid, channelName);
	}
}

/**
 *
 * @param app
 * @param opts
 * @returns {*}
 */
function GetChannelManager(app, opts)
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

async function  RpcInvoke(RpcInvokePromise, sid, route, msg, sendUids)
{
    return await RpcInvokePromise(sid,
    {
        namespace : 'sys',
        service   : 'channelRemote',
        method    : 'pushMessage',
        args      : [route, msg, sendUids, {isPush: true}]
    });
}