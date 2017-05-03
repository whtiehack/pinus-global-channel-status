/**
 * Created by frank on 16-11-4.
 */

module.exports.redisChannel =
{
    family      : 4,           // 4 (IPv4) or 6 (IPv6)
    password : 'gameMirror',
    options     : {},
    host        : '192.168.31.132',
    port        : 6800,
    db          : 5      // optinal, from 0 to 15 with default redis configure
};