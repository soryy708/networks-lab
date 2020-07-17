import util from './util';
import Broadcast from './broadcast';

const rtsRate = 0.0001;

const propogationRateCoefficient = 2;
const maxRadiusCoefficient = 128;

function nextTimeExponentialBackoff(collisionCount) {
    const max = Math.pow(2, collisionCount);
    return Math.floor(Math.random() * max);
}

class Terminal {
    constructor(position, range) {
        this.id = util.randomId();
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
        this.rtsBroadcastQueue = [];
        this.unackedRtses = [];
        this.someoneElseHasCts = false;
        this.interfereCount = 0;
    }

    render(canvasContext) {
        canvasContext.save();
        if (this.someoneElseHasCts) {
            canvasContext.fillStyle = '#4488aa';
        } else {
            canvasContext.fillStyle = '#4488ff';
        }
        canvasContext.fillStyle = '#4488ff';
        canvasContext.beginPath();
        canvasContext.arc(this.position.x, this.position.y, 5, 0, 2 * Math.PI);
        canvasContext.fill();
        canvasContext.restore();
    }

    queueBroadcast(type, destination, data, isPriority = false, queue = this.broadcastQueue) {
        const newBroadcast = new Broadcast(this.position, this.range || (Math.random() * maxRadiusCoefficient), (Math.random() + 0.3) * propogationRateCoefficient, type);
        newBroadcast.source = this;
        newBroadcast.destination = destination;
        newBroadcast.data = data;
        if (isPriority) {
            queue.unshift(newBroadcast);
        } else {
            queue.push(newBroadcast);
        }
        return newBroadcast;
    }

    tick(deltaTime) {
        const canBroadcast = () => {
            return !this.currentBroadcast &&
                !this.channelIsBusy() &&
                [...this.broadcastQueue, ...this.rtsBroadcastQueue].length > 0 &&
                !this.someoneElseHasCts &&
                this.broadcastTimeAccumulator >= this.nextBroadcastTime;
        };

        this.rtsTimeAccumulator += deltaTime;
        if (this.rtsTimeAccumulator >= this.nextRtsTime) {
            this.nextRtsTime = util.nextTime(rtsRate);
            this.rtsTimeAccumulator = 0;
            if (this.rtsBroadcastQueue.length === 0) {
                const broadcast = this.queueBroadcast(Broadcast.types.RTS, util.pick(this.getTerminalsInRange()), null, false, this.rtsBroadcastQueue);
                this.unackedRtses.push(broadcast.id);
            }
        }

        this.broadcastTimeAccumulator += deltaTime;
        if (this.broadcastTimeAccumulator >= this.nextBroadcastTime) {
            this.nextBroadcastTime = 0;
            this.broadcastTimeAccumulator = 0;
        }
        if (canBroadcast()) {
            this.currentBroadcast = this.broadcastQueue.length > 0 ? this.broadcastQueue.shift() : this.rtsBroadcastQueue.shift();
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
            const broadcast = this.queueBroadcast(this.currentBroadcast.type, this.currentBroadcast.destination, this.currentBroadcast.data, true, this.currentBroadcast.type === Broadcast.types.RTS ? this.rtsBroadcastQueue : this.broadcastQueue);
            broadcast.maxRadius = this.currentBroadcast.maxRadius;
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
        console.log(`${this.id} Received broadcast`, {
            id: receivedBroadcast.id,
            type: receivedBroadcast.type,
            data: receivedBroadcast.data,
            source: receivedBroadcast.source && receivedBroadcast.source.id,
            destination: receivedBroadcast.destination && receivedBroadcast.destination.id,
        });

        if (receivedBroadcast.destination === this && (receivedBroadcast.types === Broadcast.types.CTS || receivedBroadcast.types === Broadcast.types.ACK)) {
            this.interfereCount = 0;
        }

        switch (receivedBroadcast.type) {
            case Broadcast.types.RTS: {
                if (receivedBroadcast.destination === this) {
                    this.queueBroadcast(Broadcast.types.CTS, receivedBroadcast.source, receivedBroadcast.id);
                }
                break;
            }
            case Broadcast.types.CTS: {
                if (receivedBroadcast.destination === this) {
                    const index = this.unackedRtses.findIndex(id => receivedBroadcast.data === id);
                    if (index !== -1) {
                        this.unackedRtses.splice(index, 1);
                        this.queueBroadcast(Broadcast.types.DATA, receivedBroadcast.source, receivedBroadcast.id);
                    }
                } else {
                    this.someoneElseHasCts = true;
                }
                break;
            }
            case Broadcast.types.DATA: {
                if (receivedBroadcast.destination === this) {
                    this.queueBroadcast(Broadcast.types.ACK, receivedBroadcast.source, receivedBroadcast.id);
                }
                break;
            }
            case Broadcast.types.ACK: {
                this.someoneElseHasCts = false;
                break;
            }
        }
    }
}

export default Terminal;
