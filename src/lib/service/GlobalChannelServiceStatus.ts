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
    public static  PLUGIN_NAME = 'globalChannelServiceStatus';
    private manager:DefaultChannelManager;
    private cleanOnStartUp:boolean;
    private state:number = ST_INITED;
    public name:string = '__globalChannelStatus__';
    private RpcInvokePromise = null;
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
        app.set(GlobalChannelServiceStatus.PLUGIN_NAME, this, true);
	}

    /**
     * Component lifecycle callback
     *
     * @param {Function} cb
     * @return {Void}
     */
    afterStart(){
    	if(this.app.components && this.app.components.__proxy__ &&
			this.app.components.__proxy__.client&& this.app.components.__proxy__.client.rpcInvoke){
            this.RpcInvokePromise = util.promisify(this.app.components.__proxy__.client.rpcInvoke.bind(this.app.components.__proxy__.client));
		}
	};

    afterStartAll(){
    	if(!this.RpcInvokePromise){
            this.RpcInvokePromise = util.promisify(this.app.rpcInvoke);
		}
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
	 * 群发消息给指定的玩家
     * @param {string[]} uidArr
     * @param {string} route
     * @param msg
     * @returns {Promise<null|number[]>} 失败的玩家id数组
     */
	async pushMessageByUids(uidArr:string[], route:string, msg:any):Promise<null|number[]>
	{
		if (!uidArr || !uidArr.length) throw new Error('userId List is null');
		if (this.state !== ST_STARTED)
		{
			throw new Error('invalid state');
		}

		const uidObject = await this.getSidsByUidArr(uidArr);
		const records:{[serverid:string]:string[]} = {};
		const keysArr = Object.keys(uidObject);
		for (let i = 0; i < keysArr.length; i++)
		{
			const uid = keysArr[i];
			const sids = uidObject[uid];
			let uidSet:string[] = null;
			if (sids && sids.length )
			{
                for (const serverId of sids)
                {
                    if (records[serverId])
                    {
                        uidSet = records[serverId];
                    }
                    else
                    {
                        uidSet = [];
                        records[serverId] = uidSet;
                    }
                    uidSet.push(uid);
                }
			}
		}

		const sendMessageArr = [];
		for (const sid in records)
		{
			const uidSet = records[sid];
			if (uidSet.length)
			{
				sendMessageArr.push(RpcInvoke(this.RpcInvokePromise, sid, route, msg, uidSet));
			}
		}
		if (sendMessageArr.length > 0)
		{
			const results =  await Promise.all(sendMessageArr);
			return [].concat(...results);
		}
		return null;
	}

    /**
	 * 发送消息给指定 channelName 的所有玩家
     * @param {string} serverType  一般是 ‘connector’  frontendServer
     * @param {string} route    push 路由
     * @param msg
     * @param {string | string[]} channelName
     * @returns {Promise<string[]>}  返回失败的 id玩家id数组
     */
	public async pushMessageByChannelName(serverType:string, route:string, msg:any, channelName:string|string[]):Promise<string[]> {
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
		for(let sid in uidObject){
            const channels = uidObject[sid];
            let uids:string[] = [];
            for(let channelName in channels){
            	let cUids = channels[channelName];
                uids = uids.concat(cUids);
			}
            if (uids && uids.length)
            {
                sendMessageArr.push(RpcInvoke(this.RpcInvokePromise, sid, route, msg, uids));
            }
		}
		if (sendMessageArr.length > 0)
		{
			let failIds = await Promise.all(sendMessageArr);
			return [].concat(...failIds);
		}
		return [];
	}

    /**
	 * 获取指定 channelName 和 服务器类型的成员
     * @param {string} serverType
     * @param {string | string[]} channelName
     * @returns {Promise<{[p: string]: {[p: string]: string[]}}>}
     */
	public async getMembersByChannelName(serverType:string, channelName:string|string[]):Promise<{[serverid:string]:{[channelName:string]:string[]}}> {
		if (this.state !== ST_STARTED)
		{
			throw new Error('invalid state');
		}
		return await this.manager.getMembersByChannelName(serverType, channelName);
	}

    /**
	 * 获取指定服务器和channelName 的玩家列表
     * @param channelName
     * @param sid
     * @returns {Promise<string[]>}
     */
	public async getMembersBySid(channelName:string, sid:string):Promise<string[]> {
		if (this.state !== ST_STARTED)
		{
			throw new Error('invalid state');
		}
		return await this.manager.getMembersBySid(channelName, sid);
	}

    /**
	 * 获得指定玩家在所在的服务器
     * @param uid
     * @returns {Promise<string[]>}
     */
	public async getSidsByUid(uid:string):Promise<string[]> {
		if (this.state !== ST_STARTED)
		{
			throw new Error('invalid state');
		}
		return await this.manager.getSidsByUid(uid);
	}

    /**
	 * 获取指定玩家 addStatus的服务器
     * @param uidArr
     * @returns {Promise<{[uid: string]: string[]}>}
     */
    public async getSidsByUidArr(uidArr:string[]):Promise<{[uid:string]:string[]}> {
		if (this.state !== ST_STARTED)
		{
			throw new Error('invalid state');
		}
		return await this.manager.getSidsByUidArr(uidArr);
	}

	start(cb)
	{
		if(process.env.NODE_ENV=='ci'){
			this.afterStartAll();
		}
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

async function  RpcInvoke(RpcInvokePromise, sid:string, route:string, msg:any, sendUids:string[])
{
    return await RpcInvokePromise(sid,
    {
        namespace : 'sys',
        service   : 'channelRemote',
        method    : 'pushMessage',
        args      : [route, msg, sendUids, {isPush: true}]
    });
}