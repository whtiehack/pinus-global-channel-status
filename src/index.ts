'use strict';


import {GlobalChannelServiceStatus} from "./lib/service/GlobalChannelServiceStatus";

export {PinusGlobalChannelStatusOptions} from "./lib/manager/StatusChannelManager";

export {GlobalChannelServiceStatus} from './lib/service/GlobalChannelServiceStatus';

/**
 * 实现一个基本的插件，插件载入时，会被自动扫描handlerPath和remoterPath指向的目录
 */
export class GlobalChannelStatusPlugin {
    name = 'GlobalChannelStatusPlugin';
    components = [GlobalChannelServiceStatus];
}

export function createGlobalChannelStatusPlugin() {
    return new GlobalChannelStatusPlugin();
}

export const PomeloExports = {
    components: __dirname + '/lib/components/',
//	events:__dirname + '/lib/events/'
};