
class utils
{
    /**
     * Invoke callback with check
     * @param cb
     * @param args
     */
    static invokeCallback(cb, ...args)
    {
        if (!!cb && typeof cb === 'function')
        {
            const arg = Array.from ? Array.from(args) : [].slice.call(args);
            cb(...arg);
        }
    }
}

module.exports = utils;