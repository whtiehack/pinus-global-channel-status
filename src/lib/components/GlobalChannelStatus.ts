'use strict';


import {GlobalChannelServiceStatus} from "../service/GlobalChannelServiceStatus";
import {PinusGlobalChannelStatusOptions} from "../manager/StatusChannelManager";


module.exports = function (app, opts: PinusGlobalChannelStatusOptions) {
    return new GlobalChannelServiceStatus(app, opts);
};