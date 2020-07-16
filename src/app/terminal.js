import util from './util';
import Broadcast from './broadcast';

const rtsRate = 0.0005;

const propogationRateCoefficient = 2;
const maxRadiusCoefficient = 128;

function nextTimeExponentialBackoff(collisionCount) {
    const max = Math.pow(2, collisionCount);
    return Math.floor(Math.random() * max);
}

class Terminal {
    constructor(position, range) {
        this.position = position;
        this.nextRtsTime = util.nextTime(rtsRate);
        this.rtsTimeAccumulator = 0;
        this.nextBroadcastTime = 0;
        this.broadcastTimeAccumulator = 0;
        this.broadcastListeners = [];
        this.broadcastFinishListeners = [];
        this.checkIfBusyListeners = [];
        this.getTerminalsInRangeListeners = [];
        this.currentBroadcast = null;
        this.range = range;
        this.broadcastQueue = [];
        this.unackedRtses = [];
        this.someoneElseHasCts = false;
        this.interfereCount = 0;
    }

    render(canvasContext) {
        canvasContext.fillStyle = '#4488ff';
        canvasContext.beginPath();
        canvasContext.arc(this.position.x, this.position.y, 5, 0, 2 * Math.PI);
        canvasContext.fill();
    }

    tick(deltaTime) {
        const canBroadcast = () => {
            return !this.currentBroadcast &&
                !this.channelIsBusy() &&
                this.broadcastQueue.length > 0 &&
                !this.someoneElseHasCts &&
                this.broadcastTimeAccumulator >= this.nextBroadcastTime;
        };

        this.rtsTimeAccumulator += deltaTime;
        if (this.rtsTimeAccumulator >= this.nextRtsTime) {
            this.nextRtsTime = util.nextTime(rtsRate);
            this.rtsTimeAccumulator = 0;
            const broadcast = new Broadcast(this.position, this.range || (Math.random() * maxRadiusCoefficient), (Math.random() + 0.3) * propogationRateCoefficient, Broadcast.types.RTS);
            broadcast.source = this;
            broadcast.destination = util.pick(this.getTerminalsInRange());
            this.broadcastQueue.push(broadcast);
            this.unackedRtses.push(broadcast.id);
        }

        this.broadcastTimeAccumulator += deltaTime;
        if (this.broadcastTimeAccumulator >= this.nextBroadcastTime) {
            this.nextBroadcastTime = 0;
            this.broadcastTimeAccumulator = 0;
        }
        if (canBroadcast()) {
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
            broadcast.source = this;
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
            ++this.interfereCount;
            this.nextBroadcastTime = nextTimeExponentialBackoff(this.interfereCount);
            this.broadcastTimeAccumulator = 0;
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
    
    onGetTerminalsInRange(cb) {
        this.getTerminalsInRangeListeners.push(cb);
    }

    channelIsBusy() {
        return this.checkIfBusyListeners.map(cb => cb()).reduce((prev, cur) => prev || cur, false);
    }

    getTerminalsInRange() {
        return this.getTerminalsInRangeListeners.map(cb => cb()).reduce((prev, cur) => [...prev, ...cur], []);
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

    receiveBroadcast(receivedBroadcast) {
        if (receivedBroadcast.destination === this) {
            this.interfereCount = 0;
        }

        switch (receivedBroadcast.type) {
            case Broadcast.types.RTS: {
                if (receivedBroadcast.destination === this) {
                    const newBroadcast = new Broadcast(this.position, this.range || (Math.random() * maxRadiusCoefficient), (Math.random() + 0.3) * propogationRateCoefficient, Broadcast.types.CTS);
                    newBroadcast.source = this;
                    newBroadcast.destination = receivedBroadcast.source;
                    newBroadcast.data = receivedBroadcast.id;
                    this.broadcastQueue.push(newBroadcast);
                }
                break;
            }
            case Broadcast.types.CTS: {
                if (receivedBroadcast.destination === this) {
                    const index = this.unackedRtses.findIndex(id => receivedBroadcast.data === id);
                    if (index !== -1) {
                        this.unackedRtses.splice(index, 1);
                        const newBroadcast = new Broadcast(this.position, this.range || (Math.random() * maxRadiusCoefficient), (Math.random() + 0.3) * propogationRateCoefficient, Broadcast.types.DATA);
                        newBroadcast.source = this;
                        newBroadcast.destination = receivedBroadcast.source;
                        this.broadcastQueue.push(newBroadcast);
                    }
                } else {
                    this.someoneElseHasCts = true;
                }
                break;
            }
            case Broadcast.types.DATA: {
                break;
            }
            case Broadcast.types.ACK: {
                // TODO: this.someoneElseHasCts = false;
                break;
            }
        }
    }
}

export default Terminal;
