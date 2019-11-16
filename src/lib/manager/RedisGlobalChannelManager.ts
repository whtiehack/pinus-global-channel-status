'use strict';


import { PinusGlobalChannelStatusOptions, StatusChannelManager } from "./StatusChannelManager";

export default class GlobalChannelManager extends StatusChannelManager {
    constructor(app, opts: PinusGlobalChannelStatusOptions) {
        super(app, opts);
    }

    public async add(uid: string, sid: string, channelName: string | string[] = null) {
        if (!channelName || !channelName.length)
            return await super.add(uid, sid);
        if (typeof channelName == 'string') {
            const genKey = StatusChannelManager.GenKey(this.prefix, sid, channelName);
            return await this.redisClient.saddAsync(genKey, uid);
        }
        const cmdArr = channelName.map(channel => {
            return ['sadd', StatusChannelManager.GenKey(this.prefix, sid, channel), uid];
        });
        return await StatusChannelManager.ExecMultiCommands(this.redisClient, cmdArr);
    }

    public async destroyChannel(channelName: string | string[]): Promise<number[]> {
        if (!channelName) {
            return null;
        }
        const servers = this.app.getServers();
        const cmdArr = [];
        if (typeof channelName == 'string') {
            channelName = [channelName];
        }
        for (const serverId of Object.keys(servers)) {
            const server = servers[serverId];
            if (this.app.isFrontend(server)) {
                for (const channel of channelName) {
                    if (channel)
                        cmdArr.push(['del', StatusChannelManager.GenKey(this.prefix, serverId, channel)]);
                }
            }
        }
        return await StatusChannelManager.ExecMultiCommands(this.redisClient, cmdArr);
    }

    /**
     *
     * @param {string} uid
     * @param {string} sid serverid
     * @param {string | string[]} channelName
     * @returns {Promise<any>}
     */
    public async leave(uid: string, sid: string, channelName: string | string[] = null) {
        if (!channelName || !channelName.length)
            return await super.leave(uid, sid);
        if (typeof channelName == 'string') {
            const genKey = StatusChannelManager.GenKey(this.prefix, sid, channelName);
            return await this.redisClient.sremAsync(genKey, uid);
        }
        const cmdArr = channelName.map(channel => {
            return ['srem', StatusChannelManager.GenKey(this.prefix, sid, channel), uid];
        });
        return await StatusChannelManager.ExecMultiCommands(this.redisClient, cmdArr);

    }

    /**
     *
     * @param {string} channelName
     * @param {string} sid  server id
     * @returns {Promise<string[]>}
     */
    public async getMembersBySid(channelName: string, sid: string): Promise<string[]> {
        const genKey = StatusChannelManager.GenKey(this.prefix, sid, channelName);
        return await this.redisClient.smembersAsync(genKey);
    }

    /**
     * Get members by channelName and serverType.
     * 获取指定 channelName 的成员
     * @param  {String}   serverType frontend server type string
     * @param  {String|Array}   channelName channel name
     * @returns {Promise<Object>} { connector_1:{ channelName1: [ 'uuid_21', 'uuid_12', 'uuid_24', 'uuid_27' ] },
      								connector_2: { channelName1: [ 'uuid_15', 'uuid_9', 'uuid_0', 'uuid_18' ] },
      								connector_3: { channelName1: [ 'uuid_6', 'uuid_3' ] }
     */
    public async getMembersByChannelName(serverType: string, channelName: string | string[]): Promise<{ [serverid: string]: { [channelName: string]: string[] } }> {
        if (!serverType) {
            return {};
        }
        let servers = this.app.getServersByType(serverType);
        if (!servers || servers.length === 0) {
            // no frontend server infos
            return {};
        }
        if (typeof channelName == 'string') {
            channelName = [channelName];
        } else {
            channelName = Array.from(new Set(channelName));
        }
        const cmdArr = {};
        for (const serverObject of servers) {
            const sid = serverObject.id;
            let serverIdArr = cmdArr[sid] ? cmdArr[sid] : [];
            serverIdArr = channelName.map(change => {
                return ['smembers', StatusChannelManager.GenKey(this.prefix, sid, change)];
            });
            cmdArr[sid] = StatusChannelManager.ExecMultiCommands(this.redisClient, serverIdArr);
        }
        const channelObjectArr = await Promise.all(Object.values(cmdArr));
        const channelObject = {};
        const keys = Object.keys(cmdArr);
        for (let i = 0; i < keys.length; i++) {
            channelObject[keys[i]] = {};
            for (let idx in channelObjectArr[i]) {
                channelObject[keys[i]][channelName[idx]] = channelObjectArr[i][idx];
            }
        }
        return channelObject;
    }

    /**
     *  通过 服务器ID(sid) 和 指定的 channel 获取玩家列表
     * @param {string} sid
     * @param channelName
     * @return {Promise.<void>}  key是channelid { channelName1: [ 'uuid_18', 'uuid_3' ] }
     */
    async getMembersByChannelNameAndSid(sid: string, channelName: string | string[]): Promise<{ [key: string]: string[] }> {
        if (!sid) {
            return null;
        }
        if (typeof channelName == 'string') {
            channelName = [channelName];
        }
        const serverIdArr = channelName.map(change => {
            return ['smembers', StatusChannelManager.GenKey(this.prefix, sid, change)];
        });

        const channelObjectArr = await StatusChannelManager.ExecMultiCommands(this.redisClient, serverIdArr);
        const channelObject = {};
        for (let i = 0; i < channelName.length; i++) {
            channelObject[channelName[i]] = channelObjectArr[i];
        }
        return channelObject;
    }
}

