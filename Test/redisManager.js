/**
 * Created by frank on 16-11-3.
 */

const co = require('co');
const config = require('./config/redisConfig').redisChannel;
const RedisManager = require('../lib/manager/RedisGlobalChannelManager');

const redisManager = new RedisManager(config);



function *test()
{
    yield redisManager.start();
    const clean = yield redisManager.clean();
    const add = yield redisManager.add('scene_123','uuid_123','server1');
    const members = yield redisManager.getMembersBySid('scene_123','server1');
    console.info(clean, add, members);
}
co(test());