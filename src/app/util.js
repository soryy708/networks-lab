/**
 * Get milliseconds until next occurance in poisson distribution, given `rateParameter` (λ)
 * https://en.wikipedia.org/wiki/Poisson_distribution
 * @param {Number} rateParameter Some floating point number between 0 and 1 = λ
 */
function nextTime(rateParameter) {
    return - Math.log(1 - Math.random()) / rateParameter;
}

/**
 * Return random element in `options` array
 * @param {Array} options 
 */
function pick(options) {
    const index = Math.floor(Math.random() * options.length);
    return options[index];
}

/**
 * Return string that looks like an ID
 */
function randomId() {
    /**
     * Randomly return `true` or `false`
     */
    function bool() {
        return !!(Math.round(Math.random()));
    }
    
    /**
     * Return a random digit
     */
    function digit() {
        return Math.round(Math.random() * 10);
    }
    
    /**
     * Return random number between `min` and `max`
     * @param {Number} min 
     * @param {Number} max 
     */
    function number(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.round(Math.random() * (max - min)) + min;
    }
    
    /**
     * Return random English letter (uppercase or lowercase)
     */
    function character() {
        const range = 'Z'.charCodeAt(0) - 'A'.charCodeAt(0);
        const num = number(0, range);
        const offset = bool() ? 'A'.charCodeAt(0) : 'a'.charCodeAt(0);
        return String.fromCharCode(num + offset);
    }

    /**
     * Return random string that's `length` characters long
     * @param {Number} length 
     */
    function string(length) {
        let str = '';
        for (let i = 0; i < length; ++i) {
            str += pick([digit(), character()]);
        }
        return str;
    }

    return `${string(6)}-${string(6)}-${string(6)}`;
}

export default {
    nextTime,
    pick,
    randomId,
};
