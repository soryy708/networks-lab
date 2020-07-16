import Circle from './circle';
import util from './util';

const colorChangeCoefficient = 0.001;

const states = {
    BROADCASTING: 0,
    INTERFERED: 1,
    JAMMED: 2,
    FINISHED: 3,
};

const broadcastTypes = {
    RTS: 'RTS',
    CTS: 'CTS',
    DATA: 'DATA',
    ACK: 'ACK',
};

class Broadcast {
    constructor(sourcePosition, maxRadius, propogationRate, type) {
        this.circle = new Circle(0, sourcePosition);
        this.maxRadius = maxRadius;
        this.propogationRate = propogationRate;
        this.finishListeners = [];
        this.state = states.BROADCASTING;
        this.type = type;
        this.id = util.randomId();
        this.data = '';
        this.destination = null;
        this.interferedBroadcasts = [];
        this.interferedTerminals = [];
    }

    static get types() {
        return broadcastTypes;
    }

    render(canvasContext) {
        this.circle.render(canvasContext);
        canvasContext.save();
        canvasContext.fillStyle = 'white';
        canvasContext.font = '8px Consolas';
        canvasContext.fillText(`Type: ${this.type}\n`, this.circle.position.x - 16, this.circle.position.y + 12);
        canvasContext.restore();
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

    interfereBroadcast(broadcast) {
        const index = this.interferedBroadcasts.findIndex(b => b === broadcast);
        if (index === -1) {
            this.interferedBroadcasts.push(broadcast);
            this.interfere();
        }
    }

    interfereTerminal(terminal) {
        const index = this.interferedTerminals.findIndex(t => t === terminal);
        if (index === -1) {
            this.interferedTerminals.push(terminal);
            this.interfere();
            terminal.interfere(this);
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
