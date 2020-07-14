import Circle from './circle';

const colorChangeCoefficient = 0.001;

class Broadcast {
    constructor(sourcePosition, maxRadius, propogationRate) {
        this.circle = new Circle(0, sourcePosition);
        this.maxRadius = maxRadius;
        this.propogationRate = propogationRate;
        this.ended = false;
        this.interfered = false;
        this.finishListeners = [];
    }

    render(canvasContext) {
        this.circle.render(canvasContext);
    }

    tick(deltaTime) {
        if (this.ended || this.interfered) {
            this.circle.colorAlpha = Math.max(this.circle.colorAlpha - (deltaTime * colorChangeCoefficient), 0);
            return;
        }

        if (this.circle.radius + deltaTime * this.propogationRate / 100 < this.maxRadius) {
            this.circle.radius += deltaTime * this.propogationRate / 100;
        } else {
            this.circle.radius = this.maxRadius;
            this.onEndBroadcast();
        }
    }

    interferes(otherBroadcast) {
        return this.circle.collides(otherBroadcast.circle);
    }

    interfere() {
        if (!this.ended) {
            this.interfered = true;
            this.circle.color = 'red';
            this.notifyFinishListeners();
        }
    }

    onFinish(cb) {
        this.finishListeners.push(cb);
    }

    notifyFinishListeners() {
        this.finishListeners.forEach(cb => {
            cb(this);
        });
    }

    onEndBroadcast() {
        if (!this.interfered) {
            this.ended = true;
            this.circle.color = 'green';
            this.notifyFinishListeners();
        }
    }
}

export default Broadcast;
