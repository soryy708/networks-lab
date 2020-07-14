import Circle from './circle';
import vector from './vector';

const spawnRate = 0.0005;

const propogationRate = 1;

function nextTime(rateParameter) {
    return - Math.log(1 - Math.random()) / rateParameter;
}

class App {
    constructor(canvasElement) {
        this.canvasElement = canvasElement;
        this.canvasContext = canvasElement.getContext('2d');

        this.nextSpawnTime = nextTime(spawnRate);
        this.spawnTimeAccumulator = 0;

        this.circles = [];

        const boundingRect = this.canvasElement.getBoundingClientRect();
        this.updateSize(boundingRect.width, boundingRect.height);
    }

    updateSize(width, height) {
        this.width = width;
        this.height = height;
        this.canvasElement.width = width;
        this.canvasElement.height = height;
    }

    tick(deltaTime) {
        const boundingRect = this.canvasElement.getBoundingClientRect();
        if (this.width !== boundingRect.width || this.height !== boundingRect.height) {
            this.updateSize(boundingRect.width, boundingRect.height);
        }

        this.canvasContext.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

        this.spawnTimeAccumulator += deltaTime;
        if (this.spawnTimeAccumulator >= this.nextSpawnTime) {
            this.nextSpawnTime = nextTime(spawnRate);
            this.spawnTimeAccumulator = 0;
            
            this.circles.push(new Circle(Math.random(), new vector.Vector2D(Math.random() * boundingRect.width, Math.random() * boundingRect.height)));
        }

        this.circles.forEach((circle, index) => {
            circle.radius += deltaTime * propogationRate / 100;
            circle.render(this.canvasContext);

            for (let otherIndex = index + 1; otherIndex < this.circles.length; ++otherIndex) {
                const otherCircle = this.circles[otherIndex];
                if (circle.collides(otherCircle)) {
                    circle.color = 'red';
                    otherCircle.color = 'red';
                }
            }
        });
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
