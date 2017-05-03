<a name="GlobalChannelService"></a>

## GlobalChannelService
**Kind**: global class  

* [GlobalChannelService](#GlobalChannelService)
    * [new GlobalChannelService()](#new_GlobalChannelService_new)
    * [.pushMessageForUid(serverType, frontServerId, route, sendUids, msg)](#GlobalChannelService+pushMessageForUid) ⇒ <code>\*</code>
    * [.pushMessageByUidArr(uidArr, route, msg, frontServerId)](#GlobalChannelService+pushMessageByUidArr) ⇒ <code>\*</code>
    * [.pushMessage(serverType, route, msg, channelName)](#GlobalChannelService+pushMessage)
    * [.getMembersByChannelName(serverType, channelName)](#GlobalChannelService+getMembersByChannelName)
    * [.getMembersBySid(channelName, frontId)](#GlobalChannelService+getMembersBySid)
    * [.getSidsByUid(uid)](#GlobalChannelService+getSidsByUid) ⇒ <code>\*</code>
    * [.getSidsByUidArr(uidArr)](#GlobalChannelService+getSidsByUidArr) ⇒ <code>\*</code>
    * [.destroyChannel(channelName)](#GlobalChannelService+destroyChannel)
    * [.add(uid, sid, channelName)](#GlobalChannelService+add) ⇒ <code>\*</code>
    * [.leave(uid, sid, channelName)](#GlobalChannelService+leave)

<a name="new_GlobalChannelService_new"></a>

### new GlobalChannelService()
Global channel service.
GlobalChannelService is created by globalChannel component which is a default
component of pomelo enabled by `app.set('globalChannelConfig', {...})`
and global channel service would be accessed by
`app.get('globalChannelService')`.

<a name="GlobalChannelService+pushMessageForUid"></a>

### globalChannelService.pushMessageForUid(serverType, frontServerId, route, sendUids, msg) ⇒ <code>\*</code>
发送消息给指定服务器中的某一些人

**Kind**: instance method of [<code>GlobalChannelService</code>](#GlobalChannelService)  

| Param | Description |
| --- | --- |
| serverType | frontend server type |
| frontServerId | frontend server Id |
| route | route string |
| sendUids | uids |
| msg |  |

<a name="GlobalChannelService+pushMessageByUidArr"></a>

### globalChannelService.pushMessageByUidArr(uidArr, route, msg, frontServerId) ⇒ <code>\*</code>
群发消息给玩家

**Kind**: instance method of [<code>GlobalChannelService</code>](#GlobalChannelService)  

| Param | Default | Description |
| --- | --- | --- |
| uidArr |  | 要发送的玩家列表 |
| route |  | 消息号 |
| msg |  | 消息内容 |
| frontServerId | <code>null</code> | 指定的前端服务器Id, 默认不指定 |

<a name="GlobalChannelService+pushMessage"></a>

### globalChannelService.pushMessage(serverType, route, msg, channelName)
Send message by global channel.
 发送消息给指定 channelName 的所有玩家

**Kind**: instance method of [<code>GlobalChannelService</code>](#GlobalChannelService)  

| Param | Type | Description |
| --- | --- | --- |
| serverType | <code>String</code> | frontend server type |
| route | <code>String</code> | route string |
| msg | <code>Object</code> | message would be sent to clients |
| channelName | <code>String</code> | channel name |

<a name="GlobalChannelService+getMembersByChannelName"></a>

### globalChannelService.getMembersByChannelName(serverType, channelName)
Get members by channel name.
获取指定 channelName 和 服务器类型的成员

**Kind**: instance method of [<code>GlobalChannelService</code>](#GlobalChannelService)  

| Param | Type | Description |
| --- | --- | --- |
| serverType | <code>String</code> | frontend server type string |
| channelName | <code>String</code> | channel name |

<a name="GlobalChannelService+getMembersBySid"></a>

### globalChannelService.getMembersBySid(channelName, frontId)
Get members by frontend server id.
获取指定服务器和channelName 的玩家列表

**Kind**: instance method of [<code>GlobalChannelService</code>](#GlobalChannelService)  

| Param | Type | Description |
| --- | --- | --- |
| channelName | <code>String</code> | channel name |
| frontId | <code>String</code> | frontend server id |

<a name="GlobalChannelService+getSidsByUid"></a>

### globalChannelService.getSidsByUid(uid) ⇒ <code>\*</code>
获得指定玩家在所在的服务器

**Kind**: instance method of [<code>GlobalChannelService</code>](#GlobalChannelService)  

| Param |
| --- |
| uid | 

<a name="GlobalChannelService+getSidsByUidArr"></a>

### globalChannelService.getSidsByUidArr(uidArr) ⇒ <code>\*</code>
获取指定玩家的服务器列表

**Kind**: instance method of [<code>GlobalChannelService</code>](#GlobalChannelService)  

| Param |
| --- |
| uidArr | 

<a name="GlobalChannelService+destroyChannel"></a>

### globalChannelService.destroyChannel(channelName)
Destroy a global channel.

**Kind**: instance method of [<code>GlobalChannelService</code>](#GlobalChannelService)  

| Param | Type | Description |
| --- | --- | --- |
| channelName | <code>String</code> | global channel name |

<a name="GlobalChannelService+add"></a>

### globalChannelService.add(uid, sid, channelName) ⇒ <code>\*</code>
添加一个玩家 到指定channelName
Add a member into channel.

**Kind**: instance method of [<code>GlobalChannelService</code>](#GlobalChannelService)  
**Returns**: <code>\*</code> - is add: 1 add success, 0 fail  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| uid | <code>String</code> |  | user id |
| sid | <code>String</code> |  | frontend server id |
| channelName | <code>String</code> | <code>null</code> | if channelName == null add redis |

<a name="GlobalChannelService+leave"></a>

### globalChannelService.leave(uid, sid, channelName)
Remove user from channel.
移除一个玩家

**Kind**: instance method of [<code>GlobalChannelService</code>](#GlobalChannelService)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| uid | <code>String</code> |  | user id |
| sid | <code>String</code> |  | frontend server id |
| channelName | <code>String</code> | <code>null</code> | channel name |

