import util from './util';
import Broadcast from './broadcast';

const broadcastRate = 0.0005;

const propogationRateCoefficient = 2;
const maxRadiusCoefficient = 128;

class Terminal {
    constructor(position, range) {
        this.position = position;
        this.nextBroadcastTime = util.nextTime(broadcastRate);
        this.broadcastTimeAccumulator = 0;
        this.broadcastListeners = [];
        this.broadcastFinishListeners = [];
        this.checkIfBusyListeners = [];
        this.currentBroadcast = null;
        this.range = range;
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

            if (!this.currentBroadcast && !this.channelIsBusy()) {
                this.currentBroadcast = new Broadcast(this.position, this.range || (Math.random() * maxRadiusCoefficient), (Math.random() + 0.3) * propogationRateCoefficient);
                this.currentBroadcast.onFinish(() => {
                    this.notifyBroadcastFinishListeners(this.currentBroadcast);
                    this.currentBroadcast = null;
                });
                this.notifyBroadcastListeners(this.currentBroadcast);
            }
        }
    }

    interfere(broadcast) {
        if (broadcast !== this.currentBroadcast) {
            this.currentBroadcast.jam();
        }
    }

    isBroadcasting() {
        return !!this.currentBroadcast;
    }

    onBroadcast(cb) {
        this.broadcastListeners.push(cb);
    }

    onBroadcastFinish(cb) {
        this.broadcastFinishListeners.push(cb);
    }

    onCheckIfBusy(cb) {
        this.checkIfBusyListeners.push(cb);
    }

    channelIsBusy() {
        return this.checkIfBusyListeners.map(cb => cb()).reduce((prev, cur) => prev || cur, false);
    }

    notifyBroadcastListeners(broadcast) {
        this.broadcastListeners.forEach(cb => cb(broadcast));
    }

    notifyBroadcastFinishListeners(broadcast) {
        this.broadcastFinishListeners.forEach(cb => cb(broadcast));
    }

    ownsBroadcast(broadcast) {
        return broadcast === this.currentBroadcast;
    }
}

export default Terminal;
