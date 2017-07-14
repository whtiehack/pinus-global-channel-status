
const config = require('./config/redisConfig').redisChannel;
const RedisManager = require('../lib/manager/RedisGlobalChannelManager');

// const test = require('ava').test;

const redisManager = new RedisManager(null, config);

const serverType = 'connector';
const serverId = ['connector_1', 'connector_2', 'connector_3'];
const serverData = [{id: 'connector_1'}, {id: 'connector_2'}, {id: 'connector_3'}];
const channelName = ['channelName1', 'channelName2', 'channelName3'];

class Test
{

	static async before()
	{
		await redisManager.start();
		await redisManager.clean();
	}

	static async after()
	{
		await redisManager.stop();
	}
	
	static async add()
	{
		const coArr = [];
		for (let i = 0; i < 30; i++)
		{
			const index = Test.random(0, serverId.length - 1);
			coArr.push(redisManager.add(`uuid_${i}`, serverId[index], channelName[i%3]));
		}
		const result = await Promise.all(coArr);
		console.info(result);
	}

	static async getMembersBySid()
	{
		const index = Test.random(0, serverId.length - 1);
		const members = await redisManager.getMembersBySid(channelName[0], serverId[index]);
		console.info(members);
	}

	static random(min, max)
	{
		return min + Math.floor(Math.random() * (max - min + 1));
	}

	static async leave()
	{
		const coArr = [];
		for (const id of serverId)
		{
			coArr.push(redisManager.leave('uuid_1', id, channelName));
		}
		const result = await Promise.all(coArr);
		console.info(result);
	}

	static async getMembersByChannel()
	{
		const members = await redisManager.getMembersByChannelName(serverData, channelName);
		console.info(members);
	}

	static async addNoChannel()
	{
		const coArr = [];
		for (let i = 0; i < 10; i++)
		{
			const index = Test.random(0, serverId.length - 1);
			coArr.push(redisManager.add(`uuid_${i}`, serverId[index]));
		}
		const result = await Promise.all(coArr);
		console.info(result);
	}

	static async getSidsByUid()
	{
		const members = await redisManager.getSidsByUid('uuid_1');
		console.info(members);
	}

	static async getSidsByUidArr()
	{
		const members = await redisManager.getSidsByUidArr(['uuid_1', 'uuid_2', 'uuid_0']);
		console.info(members);
	}

	static async getMembersByChannelNameAndSid()
	{
		const members = await redisManager.getMembersByChannelNameAndSid('connector_1', channelName[0]);
		console.info(members);
	}

	static async leaveNoChannel()
	{
		const coArr = [];
		for (const id of serverId)
		{
			coArr.push(redisManager.leave('uuid_1', id));
		}
		const result = await Promise.all(coArr);
		console.info(result);
	}

	static async test()
	{
		await Test.before();
		await Test.add();
		await Test.getMembersBySid();
		await Test.getMembersByChannelNameAndSid();
		await Test.getMembersByChannel();
		await Test.leave();
		await Test.getMembersByChannel();
		await Test.after();
	}

	static async globalService()
	{
		await Test.before();
		await Test.addNoChannel();
		await Test.getSidsByUid();
		await Test.getSidsByUidArr();
		await Test.leaveNoChannel();
		await Test.getSidsByUidArr();
		await Test.after();
	}
}
Test.test();
// Test.globalService();



// describe('channelName', () => {
// 	before(done => {
// 		co(function *() {
// 			yield redisManager.start();
// 			yield redisManager.clean();
// 			done();
// 		});
// 	});
//
// 	after(done => {
// 		co(function *() {
// 	        yield redisManager.stop();
// 	        done();
// 		});
// 	});
//
// 	it('add', done => {
// 		co(function *() {
// 			const coArr = [];
// 			for (let i = 0; i < 10; i++) {
// 	            coArr.push(redisManager.add(`uuid_${i}`, _.sample(serverId), channelName));
// 			}
// 			const result = yield coArr;
// 			console.info(result);
// 	        done();
// 		});
// 	});
//
// 	it('getMembersBySid', done => {
// 		co(function *()	{
// 			const members = yield redisManager.getMembersBySid(channelName, _.sample(serverId));
// 			console.info(members);
// 			done();
// 		});
// 	});
//
// 	it('leave', done =>	{
// 		co(function *()		{
// 			const coArr = [];
// 			for (const id of serverId) {
// 				coArr.push(redisManager.leave('uuid_1', id, channelName));
// 			}
// 			const result = yield coArr;
// 			console.info(result);
// 			done();
// 		});
// 	});
//
// 	it('getMembersByChannel', done => {
// 		co(function *()		{
// 			const members = yield redisManager.getMembersByChannelName(serverData, channelName);
// 			console.info(members);
// 			done();
// 		});
// 	});
// });

// describe('global service ', () => {
// 	before(done =>	{
// 		co(function *()	{
// 			yield redisManager.start();
// 			yield redisManager.clean();
// 			done();
// 		});
// 	});
//
// 	after(done =>	{
// 		co(function *()	{
// 			yield redisManager.stop();
// 			done();
// 		});
// 	});
//
// 	it('add', done =>	{
// 		co(function *()		{
// 			const coArr = [];
// 			for (let i = 0; i < 10; i++) {
// 				coArr.push(redisManager.add(`uuid_${i % 3}`, _.sample(serverId)));
// 			}
// 			const result = yield coArr;
// 			console.info(result);
// 			done();
// 		});
// 	});
//
// 	it('getSidsByUid', done =>	{
// 		co(function *()		{
// 			const members = yield redisManager.getSidsByUid('uuid_1');
// 			console.info(members);
// 			done();
// 		});
// 	});
//
// 	it('getSidsByUidArr', done =>	{
// 		co(function *()		{
// 			const members = yield redisManager.getSidsByUidArr(['uuid_1', 'uuid_2', 'uuid_0']);
// 			console.info(members);
// 			done();
// 		});
// 	});
//
// 	it('leave', done =>	{
// 		co(function *()		{
// 			const coArr = [];
// 			for (const id of serverId) {
// 				coArr.push(redisManager.leave('uuid_1', id));
// 			}
// 			const result = yield coArr;
// 			console.info(result);
// 			done();
// 		});
// 	});
//
// 	it('getSidsByUidArr', done =>	{
// 		co(function *()		{
// 			const members = yield redisManager.getSidsByUidArr(['uuid_1', 'uuid_2', 'uuid_0']);
// 			console.info(members);
// 			done();
// 		});
// 	});
// });