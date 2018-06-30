# pinusGlobalChannelStatus  [![Build Status](https://travis-ci.org/whtiehack/pinus-global-channel-status.svg?branch=v8)](https://travis-ci.org/whtiehack/pinus-global-channel-status)
pinus 分布式服务器通讯 原址：https://github.com/frank198/pomeloGlobalChannel


# 使用说明

- only node version 8.x or greater support
- TS => es2017 语法
- 兼容 pomelo
- 兼容 pinus
- 内置 redis使用
- 发送消息给某一个或多个玩家
- 发送消息给指定的channelName
- 发送消息给指定 sid 和 channelName 
- 发送消息给用户列表中指定sid的用户




## Installation

```
npm install https://github.com/whtiehack/pinus-global-channel-status.git#v8
```

## Usage


### pinus 

```

```

### pomelo
```
var globalChannelStatus = require('pinus-global-channel-status').PomeloExports;

app.use(globalChannelStatus, {globalChannelStatus: {
  host: '127.0.0.1',
  port: 6379,
  db: '0'       // optinal, from 0 to 15 with default redis configure
}});

```
