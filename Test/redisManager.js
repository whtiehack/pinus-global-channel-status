/**
 * Created by frank on 16-11-3.
 */

const co = require('co');
const _ = require('lodash');
const config = require('./config/redisConfig').redisChannel;
const RedisManager = require('../lib/manager/RedisGlobalChannelManager');

const redisManager = new RedisManager(null, config);

const serverType = 'connector';
const serverId = ['connector_1', 'connector_2', 'connector_3'];
const serverData = [{id: 'connector_1'}, {id: 'connector_2'}, {id: 'connector_3'}];
const channelName = 'channelName';

describe('channelName', () => {
	before(done => {
		co(function *() {
			yield redisManager.start();
			yield redisManager.clean();
			done();
		});
	});

	after(done => {
		co(function *() {
	        yield redisManager.stop();
	        done();
		});
	});

	it('add', done => {
		co(function *() {
			const coArr = [];
			for (let i = 0; i < 10; i++) {
	            coArr.push(redisManager.add(`uuid_${i}`, _.sample(serverId), channelName));
			}
			const result = yield coArr;
			console.info(result);
	        done();
		});
	});

	it('getMembersBySid', done => {
		co(function *()	{
			const members = yield redisManager.getMembersBySid(channelName, _.sample(serverId));
			console.info(members);
			done();
		});
	});

	it('leave', done =>	{
		co(function *()		{
			const coArr = [];
			for (const id of serverId) {
				coArr.push(redisManager.leave('uuid_1', id, channelName));
			}
			const result = yield coArr;
			console.info(result);
			done();
		});
	});

	it('getMembersByChannel', done => {
		co(function *()		{
			const members = yield redisManager.getMembersByChannelName(serverData, channelName);
			console.info(members);
			done();
		});
	});
});

describe('global service ', () => {
	before(done =>	{
		co(function *()	{
			yield redisManager.start();
			yield redisManager.clean();
			done();
		});
	});

	after(done =>	{
		co(function *()	{
			yield redisManager.stop();
			done();
		});
	});

	it('add', done =>	{
		co(function *()		{
			const coArr = [];
			for (let i = 0; i < 10; i++) {
				coArr.push(redisManager.add(`uuid_${i % 3}`, _.sample(serverId)));
			}
			const result = yield coArr;
			console.info(result);
			done();
		});
	});

	it('getSidsByUid', done =>	{
		co(function *()		{
			const members = yield redisManager.getSidsByUid('uuid_1');
			console.info(members);
			done();
		});
	});

	it('getSidsByUidArr', done =>	{
		co(function *()		{
			const members = yield redisManager.getSidsByUidArr(['uuid_1', 'uuid_2', 'uuid_0']);
			console.info(members);
			done();
		});
	});

	it('leave', done =>	{
		co(function *()		{
			const coArr = [];
			for (const id of serverId) {
				coArr.push(redisManager.leave('uuid_1', id));
			}
			const result = yield coArr;
			console.info(result);
			done();
		});
	});

	it('getSidsByUidArr', done =>	{
		co(function *()		{
			const members = yield redisManager.getSidsByUidArr(['uuid_1', 'uuid_2', 'uuid_0']);
			console.info(members);
			done();
		});
	});
});