class App {
    constructor(canvasElement) {
        this.canvasElement = canvasElement;
        this.canvasContext = canvasElement.getContext('2d');
    }

    tick(/*deltaTime*/) {
    }
}

function init(canvasElement) {
    const app = new App(canvasElement);
    const framesPerSecond = 120;
    let prevTime = Date.now();
    setInterval(() => {
        app.tick(Date.now() - prevTime);
        prevTime = Date.now();
    }, 1000 / framesPerSecond);
}

export default {
    init,
};
