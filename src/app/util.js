function nextTime(rateParameter) {
    return - Math.log(1 - Math.random()) / rateParameter;
}

function randomId() {
    function bool() {
        return !!(Math.round(Math.random()));
    }
    
    function digit() {
        return Math.round(Math.random() * 10);
    }
    
    function number(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.round(Math.random() * (max - min)) + min;
    }
    
    function character() {
        const range = 'Z'.charCodeAt(0) - 'A'.charCodeAt(0);
        const num = number(0, range);
        const offset = bool() ? 'A'.charCodeAt(0) : 'a'.charCodeAt(0);
        return String.fromCharCode(num + offset);
    }

    function pick(options) {
        const index = Math.floor(Math.random() * options.length);
        return options[index];
    }

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
    randomId,
};
