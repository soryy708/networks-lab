function nextTime(rateParameter) {
    return - Math.log(1 - Math.random()) / rateParameter;
}

export default {
    nextTime,
};
