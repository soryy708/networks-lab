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
    /**
     *
     * @param {Object} sourcePosition Vector2D
     * @param {Number} maxRadius
     * @param {Number} propogationRate
     * @param {*} type One of `broadcastTypes`
     */
    constructor(sourcePosition, maxRadius, propogationRate, type) {
        this.circle = new Circle(0, sourcePosition);
        this.maxRadius = maxRadius;
        this.propogationRate = propogationRate;
        this.finishListeners = [];
        this.state = states.BROADCASTING;
        this.type = type;
        this.id = util.randomId();
        this.data = '';
        this.source = null;
        this.destination = null;
        this.interactedBroadcasts = [];
        this.interactedTerminals = [];
    }

    static get types() {
        return broadcastTypes;
    }

    /**
     * Defines how this object is to be rendered
     * @param {*} canvasContext https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D
     */
    render(canvasContext) {
        this.circle.render(canvasContext);
        canvasContext.save();
        canvasContext.fillStyle = 'white';
        canvasContext.font = '8px Consolas';
        canvasContext.fillText(`Type: ${this.type}\n`, this.circle.position.x - 16, this.circle.position.y + 12);
        canvasContext.restore();
    }

    /**
     * Defines what should be done every tick of the simulation
     * @param {Number} deltaTime milliseconds since the last call to `tick`
     */
    tick(deltaTime) {
        if (this.state === states.FINISHED) {
            // Fade out
            this.circle.colorAlpha = Math.max(this.circle.colorAlpha - (deltaTime * colorChangeCoefficient), 0);
            return;
        }

        if (this.circle.radius + deltaTime * this.propogationRate / 100 < this.maxRadius) {
            // Increase radius
            this.circle.radius += deltaTime * this.propogationRate / 100;
        } else {
            // Done increasing radius
            this.circle.radius = this.maxRadius;
            this.onEndBroadcast();
        }
    }

    /**
     * Checks if the signal is pristine, so no interferences happened
     */
    isGood() {
        return (this.state === states.BROADCASTING || this.state === states.FINISHED) && this.interactedBroadcasts.length === 0;
    }

    /**
     * Checks if `this` broadcast would interfere with `otherBroadcast`
     * @param {Object} otherBroadcast Broadcast
     */
    interferesWithBroadcast(otherBroadcast) {
        return this.circle.collides(otherBroadcast.circle);
    }

    /**
     * Checks if `this` reaches `terminal`
     * @param {Object} terminal Terminal
     */
    reachesTerminal(terminal) {
        return this.circle.containsPoint(terminal.position);
    }

    /**
     * Checks if `this` interferes with `terminal`
     * @param {Object} terminal Terminal
     */
    interferesWithTerminal(terminal) {
        return this.reachesTerminal(terminal) && terminal.isBroadcasting();
    }

    /**
     * Adds something to do when the broadcast finishes
     * @param {Function} cb (Broadcast) => {}
     */
    onFinish(cb) {
        this.finishListeners.push(cb);
    }

    /**
     * Notifies listeners that the broadcast finished
     */
    notifyFinishListeners() {
        this.finishListeners.forEach(cb => {
            cb(this);
        });
    }

    /**
     * Updates the state that there was an interference
     */
    interfere() {
        if (this.state !== states.JAMMED && this.state !== states.FINISHED) {
            this.state = states.INTERFERED;
            this.circle.color = 'red';
        }
    }

    /**
     * If haven't interacted with `broadcast`, notify it of interference with `this`
     * @param {Object} broadcast Broadcast
     */
    interfereBroadcast(broadcast) {
        const index = this.interactedBroadcasts.findIndex(b => b === broadcast);
        if (index === -1 && broadcast !== this) {
            this.interactedBroadcasts.push(broadcast);
            this.interfere();
        }
    }

    /**
     * If haven't interacted with `terminal`, notify it of interference with `this`
     * @param {Object} terminal Terminal
     */
    interfereTerminal(terminal) {
        const index = this.interactedTerminals.findIndex(t => t === terminal);
        if (index === -1) {
            this.interactedTerminals.push(terminal);
            this.interfere();
            terminal.interfere(this);
        }
    }

    /**
     * If haven't interacted with `terminal`, notify it that `this` is delivered successfully
     * @param {Object} terminal Terminal
     */
    deliverToTerminal(terminal) {
        const index = this.interactedTerminals.findIndex(t => t === terminal);
        if (index === -1) {
            this.interactedTerminals.push(terminal);
            terminal.receiveBroadcast(this);
        }
    }

    /**
     * Updates the state that the broadcast contains jam signal
     */
    jam() {
        this.state = states.JAMMED;
        this.circle.color = 'yellow';
    }

    /**
     * Updates the state that the broadcast ended, and notifies listeners
     */
    onEndBroadcast() {
        if (this.state !== states.INTERFERED && this.state !== states.JAMMED) {
            this.circle.color = 'green';
        }
        this.state = states.FINISHED;
        this.notifyFinishListeners();
    }
}

export default Broadcast;
