import util from './util';
import Broadcast from './broadcast';

const broadcastRate = 0.0005;

const propogationRateCoefficient = 2;
const maxRadiusCoefficient = 128;

class Terminal {
    constructor(position) {
        this.position = position;
        this.nextBroadcastTime = util.nextTime(broadcastRate);
        this.broadcastTimeAccumulator = 0;
        this.broadcastListeners = [];
        this.currentBroadcast = null;
    }

    render(canvasContext) {
        canvasContext.fillStyle = '#4488ff';
        canvasContext.beginPath();
        canvasContext.arc(this.position.x, this.position.y, 5, 0, 2 * Math.PI);
        canvasContext.fill();
    }

    tick(deltaTime) {
        this.broadcastTimeAccumulator += deltaTime;
        if (this.broadcastTimeAccumulator >= this.nextBroadcastTime) {
            this.nextBroadcastTime = util.nextTime(broadcastRate);
            this.broadcastTimeAccumulator = 0;

            if (!this.currentBroadcast) {
                this.currentBroadcast = new Broadcast(this.position, Math.random() * maxRadiusCoefficient, (Math.random() + 0.1) * propogationRateCoefficient);
                this.currentBroadcast.onFinish(() => {
                    this.currentBroadcast = null;
                });
                this.notifyBroadcastListeners(this.currentBroadcast);
            }
        }
    }

    onBroadcast(cb) {
        this.broadcastListeners.push(cb);
    }

    notifyBroadcastListeners(broadcast) {
        this.broadcastListeners.forEach(cb => cb(broadcast));
    }
}

export default Terminal;
