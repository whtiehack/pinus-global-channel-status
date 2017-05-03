
class Utils
{
    /**
     * Invoke callback with check
     * @param cb
     * @param args
     */
	static InvokeCallback(cb, ...args)
    {
		if (Boolean(cb) && typeof cb === 'function') {
			const arg = Array.from ? Array.from(args) : [].slice.call(args);
			cb(...arg);
		}
	}
}

module.exports = Utils;