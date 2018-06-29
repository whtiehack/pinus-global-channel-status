'use strict';


import {GlobalChannelServiceStatus} from "../service/GlobalChannelServiceStatus";
import {PinusGlobalChannelStatusOptions} from "../manager/StatusChannelManager";



module.exports = function(app, opts:PinusGlobalChannelStatusOptions) {
    const service = new GlobalChannelServiceStatus(app, opts);
    app.set('globalChannelServiceStatus', service, true);
	return service
};