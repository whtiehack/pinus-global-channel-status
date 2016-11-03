class CountDownLatch
{
    /**
     * Count down to zero and invoke cb finally.
     */
    constructor(count, cb)
    {
        if(!count || count <= 0)
        {
            throw new Error('count should be positive.');
        }
        if(typeof cb !== 'function')
        {
            throw new Error('cb should be a function.');
        }
        this.count = count;
        this.cb = cb;
    }

    /**
     * Call when a task finish to count down.
     *
     * @api public
     */
    done()
    {
        if (this.count <= 0)
        {
            throw new Error('illegal state.');
        }

        this.count--;
        if (this.count === 0)
        {
            this.cb();
        }
    }
}

module.exports = CountDownLatch;