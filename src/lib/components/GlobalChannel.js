'use strict';

const ChannelService = require('../service/GlobalChannelServiceStatus');

class GlobalChannel
{
	constructor(app, opts)
	{
		const service = new ChannelService(app, opts);
		app.set('globalChannelService', service, true);
		return service;
	}
}

module.exports = function(app, opts)
{
	return new GlobalChannel(app, opts);
};