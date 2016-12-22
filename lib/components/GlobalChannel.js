const ChannelService = require('../service/GlobalChannelService');

class GlobalChannel
{
	constructor(app, opts)
    {
		const service = new ChannelService(app, opts);
		app.set('globalChannelService', service, true);
		return service;
	}
}

module.exports = (app, opts) => {return new GlobalChannel(app, opts)};