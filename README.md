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

or

npm install pinus-global-channel-status
```

## Usage


### pinus 

```
import {createGlobalChannelStatusPlugin} from 'pinus-global-channel-status';

app.configure('production|development', 'connector', function () {
    ...
    app.use(createGlobalChannelStatusPlugin(),{
        family   : 4,           // 4 (IPv4) or 6 (IPv6)
        options  : {},
        host     : '192.168.99.100',
        password : null,
        port     : 6379,
        db       : 10,      // optinal, from 0 to 15 with default redis configure
        // optional
        cleanOnStartUp:app.getServerType() == 'connector',
    });
});

```

---
* use
```
import { GlobalChannelServiceStatus } from "pinus-global-channel-status";
const globalChannelStatus:GlobalChannelServiceStatus = app.get(GlobalChannelServiceStatus.PLUGIN_NAME);

```


### pomelo
```
var globalChannelStatus = require('pinus-global-channel-status').PomeloExports;

app.use(globalChannelStatus, {globalChannelStatus: {
  host: '127.0.0.1',
  port: 6379,
  password : null,
  db: '0'       // optinal, from 0 to 15 with default redis configure
}});

```


---
* use
```

const globalChannelStatus = app.get('globalChannelServiceStatus');

or
const GlobalChannelServiceStatus = require('pinus-global-channel-status').GlobalChannelServiceStatus;
const globalChannelStatus = app.get(GlobalChannelServiceStatus.PLUGIN_NAME);

```
