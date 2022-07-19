'use strict';
import * as redisClass from 'redis';


const DEFAULT_PREFIX = 'PINUS:CHANNEL';
const STATUS_PREFIX = 'PINUS:STATUS';

export interface PinusGlobalChannelStatusOptions {
    // channel 前缀
    channelPrefix?: string;
    // status 前缀
    statusPrefix?: string;
    auth_pass?: string;
    password?: string;
    // 启动时候清除  建议对 connector 设置成启动时清除
    cleanOnStartUp?: boolean;

    // 兼容老的redis配置
    host?: string;
    port?: number;
    db?: number;

    // 新的redis配置
    url?: string
    username?: string;
    name?: string;
    database?: number;
    // 其它配置 参考 redis client https://github.com/redis/node-redis
}


export abstract class StatusChannelManager {
    protected readonly prefix: string;
    private readonly statusPrefix: string;
    private readonly statusPrefixKeys: string;
    protected redisClient: redisClass.RedisClientType<any,any,any> = null;

    protected constructor(protected app: any, protected opts: PinusGlobalChannelStatusOptions = {} as any) {
        this.prefix = opts.channelPrefix || DEFAULT_PREFIX;
        this.statusPrefix = opts.statusPrefix || STATUS_PREFIX;
        this.statusPrefixKeys = this.statusPrefix + ":*";
        if (this.opts.auth_pass) {
            this.opts.password = this.opts.auth_pass;
            delete this.opts.auth_pass;
        }
        if (this.opts.host && !this.opts.url) {
            // 兼容老的redis配置 转换
            this.opts.url = `redis://${ this.opts.host }:${ this.opts.port }`;
            if(!this.opts.database){
                this.opts.database = this.opts.db;
            }
        }
    }

    public start(): Promise<any> {
        return new Promise<void>((resolve, reject) => {
            const redisClient = redisClass.createClient(this.opts);
            redisClient.connect();
            redisClient.on('error', err => {
                console.error('redis error', err);
                // throw new Error(`[globalChannel][redis errorEvent]err:${err.stack}`);
                return reject(`[globalChannel][redis errorEvent]err:${ err.stack }`);
            });

            redisClient.on('ready', err => {
                if (err) {
                    console.error('redis ready error', err);
                    return reject(`[globalChannel][redis readyEvents]err:${ err.stack }`);
                }
                console.log('redis create success');
                this.redisClient = redisClient;
                return resolve();
            });
        });
    }

    public async stop(force = true) {
        if (this.redisClient) {
            // this.redisClient.quit();
            await this.redisClient.quit();
            this.redisClient = null;
            return true;
        }
        return true;
    }

    public async clean() {
        let cleanKey = StatusChannelManager.GenCleanKey(this.prefix);
        let result = await this.redisClient.keys(cleanKey);
        let multi = this.redisClient.multi();
        if (Array.isArray(result) && result.length > 0) {
            console.log("clean channel", result)
            for (const value of result) {
                multi.del(value);
            }
        }
        cleanKey = StatusChannelManager.GenCleanKey(this.statusPrefix);
        result = await this.redisClient.keys(cleanKey);
        if (Array.isArray(result) && result.length > 0) {
            console.log("clean status", result)
            for (const value of result) {
                multi.del(value);
            }
        }
        return multi.exec();
    }

    public async flushall(): Promise<string> {
        return await this.redisClient.flushAll();
    }

    public async statusCount(): Promise<number> {
         let result = await this.redisClient.eval(`local ks = redis.call('keys',KEYS[1]);return #ks;`,{keys: [this.statusPrefixKeys]});
         return Number(result);
    }

    public async add(uid: string, sid: string): Promise<number> {
        const genKey = StatusChannelManager.GenKey(this.statusPrefix, uid);
        return this.redisClient.sAdd(genKey, sid);
    }

    public async leave(uid: string, sid: string): Promise<number> {
        const genKey = StatusChannelManager.GenKey(this.statusPrefix, uid);
        return await this.redisClient.sRem(genKey, sid);
    }

    public async getSidsByUid(uid: string): Promise<string[]> {
        const genKey = StatusChannelManager.GenKey(this.statusPrefix, uid);
        return await this.redisClient.sMembers(genKey);
    }

    public async getSidsByUidArr(uidArr: string[]): Promise<{ [uid: string]: string[] }> {
        if (!uidArr || !uidArr.length) {
            return null;
        }
        let multi = this.redisClient.multi();
        //    uidArr = [...new Set(uidArr)];
        for (const uid of uidArr) {
            multi.sMembers(StatusChannelManager.GenKey(this.statusPrefix, uid));
        }
        const uidObjectArr = await multi.exec();
        const uidObject = {};
        for (let i = 0; i < uidArr.length; i++) {
            uidObject[uidArr[i]] = uidObjectArr[i];
        }
        return uidObject;
    }

    protected static GenKey(prefix: string, id: string, channelName: string = null) {
        let genKey = '';
        if (channelName === null)
            genKey = `${ prefix }:${ id }`;
        else
            genKey = `${ prefix }:${ channelName }:${ id }`;
        return genKey;
    }

    protected static GenCleanKey(prefix) {
        return `${ prefix }*`;
    }
}

