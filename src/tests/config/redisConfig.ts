/**
 * Created by frank on 16-11-4.
 */

module.exports.redisChannel =
    {
        family: 4,           // 4 (IPv4) or 6 (IPv6)
        options: {},
        host: '192.168.1.10',
        port: 6379,
        db: 9      // optinal, from 0 to 15 with default redis configure
    };