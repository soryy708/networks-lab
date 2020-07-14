import Circle from './circle';

class Broadcast {
    constructor(sourcePosition, maxRadius, propogationRate) {
        this.circle = new Circle(0, sourcePosition);
        this.maxRadius = maxRadius;
        this.propogationRate = propogationRate;
        this.ended = false;
        this.interfered = false;
    }

    render(canvasContext) {
        this.circle.render(canvasContext);
    }

    tick(deltaTime) {
        if (this.ended || this.interfered) {
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
        return this.circle.collides(otherBroadcast.circle) && !this.ended && !otherBroadcast.ended && !this.interfered && !otherBroadcast.interfered;
    }

    onInterfere() {
        if (!this.ended) {
            this.interfered = true;
            this.circle.color = 'red';
        }
    }

    onEndBroadcast() {
        if (!this.interfered) {
            this.ended = true;
            this.circle.color = 'green';
        }
    }
}

export default Broadcast;
