import 'jest';
import { default as GlobalChannelManager } from '../lib/manager/RedisGlobalChannelManager';
import { GlobalChannelServiceStatus } from "../lib/service/GlobalChannelServiceStatus";

const config = require('./config/redisConfig').redisChannel;

// const test = require('ava').test;


const serverType = 'connector';
const serverId = ['connector_1', 'connector_2', 'connector_3'];
const serverData = [{ id: 'connector_1' }, { id: 'connector_2' }, { id: 'connector_3' }];
const channelName = ['channelName1', 'channelName2', 'channelName3'];
const serversValue = { 'connector_1': serverData[0], 'connector_2': serverData[1], 'connector_3': serverData[2] };

const app: any = {
    getServersByType(serverType) {
        return serverData;
    },
    getServerType() {
        return "";
    },
    rpcInvoke(serverId: string, msg: object, cb: Function) {
        console.log('app.rpcInvoke', serverId, msg);
        cb(null, [])
    },
    isFrontend(server) {
        return true;
    },
    getServers() {
        return serversValue;
    },
    set() {
    }
};
config.channelPrefix = 'TEST:CHANNEL';
config.statusPrefix = 'TEST:STATUS';
config.cleanOnStartUp = true;
if (process.env.NODE_ENV == 'ci') {
    config.host = '127.0.0.1';
    config.port = 6379;
} else if (process.env.NODE_ENV == 'gitlab') {
    config.host = 'redis';
    config.port = 6379;
}
console.log('test service config', config);
const globalChannel = new GlobalChannelServiceStatus(app, config);
const redisManager: GlobalChannelManager = (globalChannel as any).manager;

class Test {

    static async before() {
        await new Promise(resolve => {
            globalChannel.start(resolve);
        });
        await redisManager.clean();
    }

    static async after() {
        //   await redisManager.clean();
        //   await redisManager.stop();
        await new Promise(resolve => {
            globalChannel.stop(true, resolve);
        });
    }

    static async add() {
        const coArr = [];
        for (let i = 0; i < 50; i++) {
            const index = Test.random(0, serverId.length - 1);
            coArr.push(redisManager.add(`uuid_${i}`, serverId[index], channelName[i % 3]));
        }
        const result = await Promise.all(coArr);
        console.info('test.add', JSON.stringify(result));
    }


    static random(min, max) {
        return min + Math.floor(Math.random() * (max - min + 1));
    }

    static async leave() {
        const coArr = [];
        for (const id of serverId) {
            coArr.push(redisManager.leave('uuid_1', id, channelName));
        }
        const result = await Promise.all(coArr);
        console.info('test.leave', result);
    }


    static async addNoChannel() {
        const coArr = [];
        for (let i = 0; i < 10; i++) {
            const index = Test.random(0, serverId.length - 1);
            coArr.push(redisManager.add(`uuid_${i}`, serverId[index]));
        }
        const result = await Promise.all(coArr);
        console.info('test.addNoChannel', result);
    }


    static async leaveNoChannel() {
        const coArr = [];
        for (const id of serverId) {
            coArr.push(redisManager.leave('uuid_3', id));
        }
        const result = await Promise.all(coArr);
        console.info('leaveNoChannel', result);
    }

}

//Test.test();
// Test.globalService();

describe('test channel', () => {
    beforeAll((done) => {
        let f = async () => {
            await Test.before();
            globalChannel.afterStartAll();
            await Test.add();
            console.log('before all success');
            done()
        };
        f()
    }, 3000);

    afterAll(async () => {
        console.log('clean test data');
        await Test.after();
    });

    test('test globalService', async () => {
        let count = await globalChannel.getCountStatus();
        console.log(' status count:', count);
        expect(count).toBe(0);
        await Test.addNoChannel();
        count = await globalChannel.getCountStatus();
        console.log(' status count:', count);
        expect(count).toBe(10);
        const members = await redisManager.getSidsByUid('uuid_3');
        console.info('test.getSidsByUid', members);

        const c1members = await redisManager.getSidsByUidArr(['uuid_10', 'uuid_3', 'uuid_0']);
        console.info('test.getSidsByUidArr c1members', c1members);
        expect(c1members['uuid_3'][0]).toBe(members[0]);

        await Test.leaveNoChannel();

        const c2members = await redisManager.getSidsByUidArr(['uuid_10', 'uuid_3', 'uuid_0']);
        console.info('test.getSidsByUidArr c2members', c2members);
        expect(!!c2members['uuid_3'][0]).toBeFalsy();
        expect(c2members['uuid_0'][0]).toBe(c1members['uuid_0'][0]);

    });

    test('getMembersBySid', async () => {
        const index = Test.random(0, serverId.length - 1);
        const members = await redisManager.getMembersBySid(channelName[0], serverId[index]);
        console.info('getMembersBySid', members);
    });

    test('getMembersByChannelNameAndSid', async () => {
        const members = await redisManager.getMembersByChannelNameAndSid('connector_1', channelName[0]);
        console.info('test.getMembersByChannelNameAndSid', members);
        const c2members = await redisManager.getMembersByChannelNameAndSid('connector_1', channelName);
        console.info('test.getMembersByChannelNameAndSid c2members', c2members);
        expect(c2members[channelName[0]]).toMatchObject(members[channelName[0]]);
    });

    test('getMembersByChannel and leave uuid_1', async () => {
        const mock = jest.spyOn(app as any, 'getServersByType').mockImplementation((val) => val);
        const members = await redisManager.getMembersByChannelName(serverData as any, channelName);
        console.info('test.getMembersByChannel', members);
        const c1members = await redisManager.getMembersByChannelName(serverData as any, channelName[0]);
        console.info('test.getMembersByChannel c1members', c1members);
        expect(c1members[serverId[0]][channelName[0]]).toMatchObject(members[serverId[0]][channelName[0]]);

        const c2members = await redisManager.getMembersByChannelName(serverData as any, channelName[1]);
        expect(c2members[serverId[0]][channelName[1]]).toMatchObject(members[serverId[0]][channelName[1]]);

        await Test.leave();
        const c3members = await redisManager.getMembersByChannelName(serverData as any, channelName);
        console.info('test.getMembersByChannel c3members', c3members);
        expect(JSON.stringify(c3members).indexOf('"uuid_1"') == -1).toBeTruthy();
        expect(JSON.stringify(c3members).indexOf('"uuid_2"') == -1).toBeFalsy();
    });

    // uuid_3  uuid_1 不要用来测试
    describe('test global channel service', () => {

        it('test global service', async () => {
            console.log('!! test global service');
            let val = await globalChannel.leaveStatus('vvvv', 'whatthefuck');
            expect(val).toBe(0);
            val = await globalChannel.addStatus('vvvv', 'whatthefuck');
            expect(val).toBe(1);
            val = await globalChannel.addStatus('vvvv', 'whatthefuck');
            expect(val).toBe(0);
            val = await globalChannel.leaveStatus('vvvv', 'whatthefuck');
            expect(val).toBe(1);
        });


        it('test getMembersByChannelNameAndSid', async () => {
            let val = await globalChannel.getMembersByChannelNameAndSid(serverId[0], channelName);
            expect(Object.keys(val)).toMatchObject(channelName);
            expect(val[channelName[0]].length).toBeGreaterThan(0);

            val = await globalChannel.getMembersByChannelNameAndSid('noid', channelName);
            console.log('getMembersByChannelNameAndSid val:', val);
            expect(Object.keys(val)).toMatchObject(channelName);
            expect([]).toMatchObject(val[channelName[0]]);
        });

        it('test destroyChannel', async () => {
            let val = await globalChannel.destroyChannel(channelName[0]);
            console.log('destroy val:', val);
            expect(val.length).toBe(3);
            expect(val).toMatchObject([1, 1, 1]);
            val = await globalChannel.destroyChannel(channelName);
            console.log('destroy val22:', val);
            await Test.add();
        });

        it('test add and leave channel', async () => {
            let val = await globalChannel.add('myid', serverId[0], channelName[0]);
            console.log('!!! myid val:', val);
            expect(val).toBe(1);
            val = await globalChannel.add('myid', serverId[0], channelName[0]);

            expect(val).toBe(0);
            val = await globalChannel.leave('myid1', serverId[0], channelName[0]);
            expect(val).toBe(0);
            val = await globalChannel.leave('myid', serverId[0], channelName[0]);
            expect(val).toBe(1);

            val = await globalChannel.add('myid', serverId[0], channelName);
            console.log('!!! myid add channels val:', val);
            expect(val).toMatchObject([1, 1, 1]);
            val = await globalChannel.add('myid', serverId[0], channelName);
            console.log('!!! myid add channels val again:', val);
            expect(val).toMatchObject([0, 0, 0]);

            val = await globalChannel.leave('myid', serverId[0], channelName);
            console.log('!!! myid leave channels val:', val);
            expect(val).toMatchObject([1, 1, 1]);
        });

        it('test service getSidsByUidArr', async () => {
            let val = await globalChannel.getSidsByUidArr(['?id']);

            expect(!!val).toBeTruthy();
            expect(val['?id'].length).toBe(0);

            let addVal = await globalChannel.addStatus('?id', 'testserver');
            expect(addVal).toBe(1);

            val = await globalChannel.getSidsByUidArr(['?id']);
            expect(val['?id'].length).toBe(1);
            expect(val['?id'][0]).toBe('testserver');
            console.log('testservice  getSidsByUidArr', val);
            addVal = await globalChannel.leaveStatus('?id', 'testserver');
            expect(addVal).toBe(1);

        });


        it('test service getSidsByUid', async () => {
            let val = await globalChannel.getSidsByUid('!!id');
            expect(val).toMatchObject([]);
            let nVal = await globalChannel.addStatus('!!id', 'ss1');
            expect(nVal).toBe(1);

            val = await globalChannel.getSidsByUid('!!id');
            expect(val).toMatchObject(['ss1']);

            nVal = await globalChannel.addStatus('!!id', 'ss2');
            expect(nVal).toBe(1);

            val = await globalChannel.getSidsByUid('!!id');
            expect(val.sort()).toMatchObject(['ss2', 'ss1'].sort());

            nVal = await globalChannel.leaveStatus('!!id', 'ss1');
            expect(nVal).toBe(1);


        });


        it('test service getMembersBySid ,add channel ,leave channel', async () => {
            let val = await globalChannel.getMembersBySid(channelName[0], 'none');
            expect(val).toMatchObject([]);
            let nVal = await globalChannel.add('__testGetSid', 'none', channelName[0]);
            expect(nVal).toBe(1);
            val = await globalChannel.getMembersBySid(channelName[0], 'none');
            expect(val).toMatchObject(['__testGetSid']);

            nVal = await globalChannel.leave('__testGetSid', 'none', channelName[0]);
            expect(nVal).toBe(1);

        });

        it('test service getMembersByChannelName', async () => {
            let val = await globalChannel.getMembersByChannelName('unused', 'failedChannel');
            console.log('!! getMembersByChannelName val', val);
            expect(Object.keys(val)).toMatchObject(serverId);
            expect(val).toMatchObject({
                connector_1: { failedChannel: [] },
                connector_2: { failedChannel: [] },
                connector_3: { failedChannel: [] }
            });

            await globalChannel.add('@2uid', serverId[0], '@2channel');
            val = await globalChannel.getMembersByChannelName('unused', ['@2channel', '@222channel']);
            console.log('@2!! getMembersByChannelName val', val);
            expect(Object.keys(val)).toMatchObject(serverId);

            expect(val).toMatchObject({
                connector_1: { '@2channel': ['@2uid'], '@222channel': [] },
                connector_2: { '@2channel': [], '@222channel': [] },
                connector_3: { '@2channel': [], '@222channel': [] }
            });


        });

        it('test service pushMessageByChannelName', async () => {
            const mockRpc = jest.spyOn(globalChannel as any, 'RpcInvokePromise',);
            let failedArr = [];
            (mockRpc as any).mockImplementation(async (serverId: string, msg: object) => {
                console.log('mock app.rpcInvoke', serverId, msg);
                if (serverId == 'connector_1') {
                    return failedArr = msg['args'][2];
                }
                return []
            });
            let val = await globalChannel.pushMessageByChannelName('unused', 'testRoute', 'testMsg', channelName[2]);
            console.log('test pushMessageByChannelName val:', val);
            expect(!!val).toBeTruthy();
            expect(val.length).toBeGreaterThan(0);
            let members = await globalChannel.getMembersByChannelName('unused', channelName[2]);
            let strVal = JSON.stringify(members);
            for (let uid of val) {
                expect(strVal.indexOf(uid)).toBeGreaterThan(0);
            }

            val = await globalChannel.pushMessageByChannelName('unused', 'testRoute', 'testMsg', channelName);
            console.log('@@2test pushMessageByChannelName val:', val);
            expect(!!val).toBeTruthy();
            expect(val.length).toBeGreaterThan(0);
            expect(val).toMatchObject(failedArr);
        });

        it('test service pushMessageByUids', async () => {
            await redisManager.clean();
            await Test.add();
            let val = await globalChannel.pushMessageByUids(['sss', 'ggg'], 'route pushMessageByUids', 'msg pushMessageByUids');
            expect(val).toBe(null);

            let members = await globalChannel.getMembersBySid(channelName[0], serverId[0]);
            for (const uuid of members) {
                const ret = await globalChannel.addStatus(uuid, serverId[0]);
                if (ret != 1) {
                    console.error('pushMessageByUids  err:', ret, uuid, 'members:', members);
                }
                expect(ret).toBe(1);
            }
            val = await globalChannel.pushMessageByUids(members, 'route pushMessageByUids', 'msg pushMessageByUids');
            console.log('!! pushMessageByUids val', val, members);
            expect(val).toMatchObject([]);

            let failedIds = [];
            const mockRpc = jest.spyOn(globalChannel as any, 'RpcInvokePromise',);
            (mockRpc as any).mockImplementation(async (serverId: string, msg: object) => {
                console.log('mock app.rpcInvoke', serverId, msg);
                if (serverId == 'connector_1') {
                    return failedIds = msg['args'][2];
                }
                return []
            });

            val = await globalChannel.pushMessageByUids(members, 'route pushMessageByUids', 'msg pushMessageByUids');
            console.log('@3!! pushMessageByUids val', val, members);
            expect(val).toMatchObject(failedIds);
        });
    });


});