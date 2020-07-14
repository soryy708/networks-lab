import Circle from './circle';

class Broadcast {
    constructor(sourcePosition, maxRadius, propogationRate) {
        this.circle = new Circle(0, sourcePosition);
        this.maxRadius = maxRadius;
        this.propogationRate = propogationRate;
    }

    render(canvasContext) {
        this.circle.render(canvasContext);
    }

    tick(deltaTime) {
        this.circle.radius += deltaTime * this.propogationRate / 100;
    }

    interferes(otherBroadcast) {
        return this.circle.collides(otherBroadcast.circle);
    }

    onInterfere() {
        this.circle.color = 'red';
    }
}

export default Broadcast;
