/**
 * Created by frank on 16-11-4.
 */

const envHost = process.env.REDISHOST;
module.exports.redisChannel =
    {
        family   : 4,           // 4 (IPv4) or 6 (IPv6)
        options  : {},
        host     : envHost?envHost:'192.168.99.100',
        port     : 6379,
        db       : envHost?0:10      // optinal, from 0 to 15 with default redis configure
    };