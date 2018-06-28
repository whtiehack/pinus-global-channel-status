'use strict';
import * as redisClass from 'redis';
import promisifyAll from '../util/promisifyAll';
promisifyAll(redisClass.RedisClient.prototype);
promisifyAll(redisClass.Multi.prototype);
const DEFAULT_PREFIX = 'PINUS:CHANNEL';
const STATUS_PREFIX = 'PINUS:STATUS';
export interface PinusGlobalChannelStatusOptions {
	// channel 前缀
    prefix?:string;
    // status 前缀
    statusPrefix?:string;
    auth_pass?:string;
    password?:string;
    // 启动时候清除
    cleanOnStartUp?:boolean;
}


export abstract class StatusChannelManager
{
	protected readonly prefix:string;
	private readonly statusPrefix:string;
    protected redisClient:any = null;
    protected constructor(protected app:any, protected opts:PinusGlobalChannelStatusOptions = {} as any)
	{
		this.prefix = opts.prefix || DEFAULT_PREFIX;
		this.statusPrefix = opts.statusPrefix || STATUS_PREFIX;
		if (this.opts.auth_pass)
		{
			this.opts.password = this.opts.auth_pass;
			delete this.opts.auth_pass;
		}
	}

	public start():Promise<any>
	{
		return new Promise((resolve, reject) =>
		{
			const redisClient = redisClass.createClient(this.opts);
			redisClient.on('error', err =>
			{
				// throw new Error(`[globalChannel][redis errorEvent]err:${err.stack}`);
				return reject(`[globalChannel][redis errorEvent]err:${err.stack}`);
			});

			redisClient.on('ready', err =>
			{
				if (err)
				{
					return reject(`[globalChannel][redis readyEvents]err:${err.stack}`);
				}
				this.redisClient = redisClient;
				return resolve();
			});
		});
	}

	public async stop(force = true)
	{
		if (this.redisClient)
		{
			// this.redisClient.quit();
			this.redisClient.quitAsync();
			this.redisClient.endAsync(force);
			this.redisClient = null;
			return true;
		}
		return true;
	}

	public async clean()
	{
		let cleanKey = StatusChannelManager.GenCleanKey(this.prefix);
		let result = await this.redisClient.keysAsync(cleanKey);
        const cmdArr = [];
		if (Array.isArray(result) && result.length > 0)
		{
			for (const value of result)
			{
				cmdArr.push(['del', value]);
			}
		}
        cleanKey = StatusChannelManager.GenCleanKey(this.statusPrefix);
        result = await this.redisClient.keysAsync(cleanKey);
        if (Array.isArray(result) && result.length > 0)
        {
            for (const value of result)
            {
                cmdArr.push(['del', value]);
            }
        }
		if(!cmdArr.length){
			return [];
		}
        return await StatusChannelManager.ExecMultiCommands(this.redisClient, cmdArr);
	}

    public async flushall():Promise<string>
	{
		return await this.redisClient.flushallAsync();
	}

    public async add(uid:string, sid:string):Promise<number>
	{
		const genKey = StatusChannelManager.GenKey(this.statusPrefix, uid);
		return await this.redisClient.saddAsync(genKey, sid);
	}

    public async leave(uid:string, sid:string):Promise<number>
	{
		const genKey = StatusChannelManager.GenKey(this.statusPrefix, uid);
		return await this.redisClient.sremAsync(genKey, sid);
	}

    public async getSidsByUid(uid:string):Promise<string[]>
	{
		const genKey = StatusChannelManager.GenKey(this.statusPrefix, uid);
		return await this.redisClient.smembersAsync(genKey);
	}

    public async getSidsByUidArr(uidArr:string[]):Promise<{[key:string]:string}>
	{
		let serverIdArr;
		if(!uidArr || !uidArr.length){
			return null;
		}
        uidArr = [...new Set(uidArr)];
        serverIdArr = uidArr.map(uid =>
        {
            return ['smembers', StatusChannelManager.GenKey(this.statusPrefix, uid)];
        });
		const uidObjectArr = await StatusChannelManager.ExecMultiCommands(this.redisClient, serverIdArr);
		const uidObject = {};
		for (let i = 0; i < uidArr.length; i++)
		{
			uidObject[uidArr[i]] = uidObjectArr[i];
		}
		return uidObject;
	}

    protected static async ExecMultiCommands(redisClient, cmdList)
	{
		if (!cmdList || cmdList.length <= 0)
		{
			return null;
		}
		return await redisClient.multi(cmdList).execAsync();
	}

    protected static GenKey(prefix:string, id:string, channelName:string = null)
	{
		let genKey = '';
		if (channelName === null)
			genKey = `${prefix}:${id}`;
		else
			genKey = `${prefix}:${channelName}:${id}`;
		return genKey;
	}

    protected static GenCleanKey(prefix)
	{
		return `${prefix}*`;
	}
}

