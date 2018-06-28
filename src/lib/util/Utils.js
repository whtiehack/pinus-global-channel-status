'use strict';
class Utils
{
    /**
     * Invoke callback with check
     * @param cb
     * @param args
     * @private
     */
	static InvokeCallback(cb, ...args)
    {
		if (cb && typeof cb === 'function')
		{
			const arg = Array.from ? Array.from(args) : [].slice.call(args);
			cb(...arg);
		}
	}
}

module.exports = Utils;