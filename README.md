# 使用说明

- es6 语法
- 兼容 pomelo2.x 系列
- 内置 redis使用
- 发送消息给某一个或多个玩家
- 发送消息给指定的channelName
- 发送消息给指定 sid 和 channelName 
- 发送消息给用户列表中指定sid的用户



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

## [API](./GlobalChannelService.md)

path: [doc/GlobalChannelService.html]


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
