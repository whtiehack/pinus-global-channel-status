# pomeloGlobalChannel
pomelo 分布式服务器通讯 原址：https://github.com/NetEase/pomelo-globalchannel-plugin

##Installation

```
npm install pomeloGlobalChannel
```

##Usage

```
var globalChannel = require('pomeloGlobalChannel');

app.use(globalChannel, {globalChannel: {
  host: '127.0.0.1',
  port: 6379,
  db: '0'       // optinal, from 0 to 15 with default redis configure
}});

```

##API

###add(name, uid, sid, cb)
add a member into channel
####Arguments
+ name - channel name.
+ uid - user id.
+ sid - frontend server id
+ cb - callback function

###leave(name, uid, sid, cb)
remove user from channel
####Arguments
+ name - channel name.
+ uid - user id.
+ sid - frontend server id
+ cb - callback function

###getMemberBySid(name, sid, cb)
get members by frontend server id
####Arguments
+ name - channel name
+ sid - frontend server id
+ cb - callback function

###getMembersByChannelName(stype, name, cb)
get members by channel name
####Arguments
+ stype - frontend server type string
+ name - channel name
+ cb callback function

###pushMessage(stype, route, msg, name, opts, cb)
send message by global channel
####Arguments
+ stype - frontend server type string
+ route - route string
+ msg - message would be sent to clients
+ name - channel name
+ opts - optional parameters
+ cb - callback function

###destroyChannel(name, cb)
destroy a global channel
####Arguments
+ name - channel name
+ cb - callback function

##Notice

Global channel use redis as a default persistent storage, you can change it with your own implementation.

```
var globalChannel = require('pomeloGlobalChannel');
var mysqlGlobalChannelManager = require('./mysqlGlobalChannelManager');

app.use(globalChannel, {globalChannel: {
  host: '127.0.0.1',
  port: 6379,
  channelManager: mysqlGlobalChannelManager
}});

```