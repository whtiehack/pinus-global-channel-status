const ChannelService = require('../service/globalChannelService');

class GlobalChannel
{
    constructor(app, opts)
    {
        const service = new ChannelService(app, opts);
        app.set('globalChannelService', service, true);
        return service;
    }
}

module.exports = GlobalChannel;