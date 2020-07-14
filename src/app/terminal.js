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
        this.broadcastQueue = [];
        this.unackedRtses = [];
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
            const broadcast = new Broadcast(this.position, this.range || (Math.random() * maxRadiusCoefficient), (Math.random() + 0.3) * propogationRateCoefficient, Broadcast.types.RTS);
            this.broadcastQueue.push(broadcast);
            this.unackedRtses.push(broadcast.id);
        }

        if (!this.currentBroadcast && !this.channelIsBusy() && this.broadcastQueue.length > 0) {
            this.currentBroadcast = this.broadcastQueue.shift();
            this.currentBroadcast.onFinish(() => {
                this.notifyBroadcastFinishListeners(this.currentBroadcast);
                this.currentBroadcast = null;
            });
            this.notifyBroadcastListeners(this.currentBroadcast);
        }
    }

    interfere(interferingBroadcast) {
        if (interferingBroadcast !== this.currentBroadcast) {
            this.currentBroadcast.jam();
            const broadcast = new Broadcast(this.position, this.currentBroadcast.maxRadius, this.currentBroadcast.propogationRate, this.currentBroadcast.type);
            broadcast.data = this.currentBroadcast.data;
            this.broadcastQueue.unshift(broadcast);
            if (this.currentBroadcast.type === Broadcast.types.RTS) {
                this.unackedRtses.push(broadcast.id);
                const oldRtsId = this.currentBroadcast.id;
                const index = this.unackedRtses.findIndex(id => oldRtsId === id);
                if (index !== -1) {
                    this.unackedRtses.splice(index, 1);
                }
            }
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

    receiveBroadcast(broadcast) {
        if (broadcast.type === Broadcast.types.CTS) {
            const index = this.unackedRtses.findIndex(id => broadcast.data === id);
            if (index !== -1) {
                this.unackedRtses.splice(index, 1);
                const broadcast = new Broadcast(this.position, this.range || (Math.random() * maxRadiusCoefficient), (Math.random() + 0.3) * propogationRateCoefficient, Broadcast.types.DATA);
                this.broadcastQueue.push(broadcast);
            }
        }
    }
}

export default Terminal;
