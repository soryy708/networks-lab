import Circle from './circle';

const colorChangeCoefficient = 0.001;

const states = {
    BROADCASTING: 0,
    INTERFERED: 1,
    JAMMED: 2,
    FINISHED: 3,
};

class Broadcast {
    constructor(sourcePosition, maxRadius, propogationRate) {
        this.circle = new Circle(0, sourcePosition);
        this.maxRadius = maxRadius;
        this.propogationRate = propogationRate;
        this.finishListeners = [];
        this.state = states.BROADCASTING;
    }

    render(canvasContext) {
        this.circle.render(canvasContext);
    }

    tick(deltaTime) {
        if (this.state === states.FINISHED) {
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

    interferesWithBroadcast(otherBroadcast) {
        return this.circle.collides(otherBroadcast.circle);
    }

    reachesTerminal(terminal) {
        return this.circle.containsPoint(terminal.position);
    }

    interferesWithTerminal(terminal) {
        return this.reachesTerminal(terminal) && terminal.isBroadcasting();
    }

    onFinish(cb) {
        this.finishListeners.push(cb);
    }

    notifyFinishListeners() {
        this.finishListeners.forEach(cb => {
            cb(this);
        });
    }

    interfere() {
        if (this.state !== states.JAMMED && this.state !== states.FINISHED) {
            this.state = states.INTERFERED;
            this.circle.color = 'red';
        }
    }

    jam() {
        this.state = states.JAMMED;
        this.circle.color = 'yellow';
    }

    onEndBroadcast() {
        if (this.state !== states.INTERFERED && this.state !== states.JAMMED) {
            this.circle.color = 'green';
        }
        this.state = states.FINISHED;
        this.notifyFinishListeners();
    }
}

export default Broadcast;
