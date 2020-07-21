import util from './util';
import Broadcast from './broadcast';

const rtsRate = 0.00005;

const dataSizeCoefficient= 500;
const propogationRateCoefficient = 2;
const maxRadiusCoefficient = 128;
const backoffCoefficient= 500;
const diff = 500;
const siff= 50;
const dataTimeout=10000;

/**
 * Returns milliseconds until next broadcast, based on binary exponential backoff as function of `collisionCount`
 * @param {Number} collisionCount 
 */
function nextTimeExponentialBackoff(collisionCount) {
    const max = Math.pow(2, collisionCount);
    return Math.floor((Math.random() * max +1) * backoffCoefficient);
}

class Terminal {
    /**
     * 
     * @param {Object} position Vector2D
     * @param {Number} range radius
     */
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
        this.sentData=false;
        this.toSend=0;
        this.dataTimeAccumulator=0;
    }

    /**
     * Defines how this object is to be rendered
     * @param {*} canvasContext https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D
     */
    render(canvasContext) {
        canvasContext.save();

        // Draw a dot where the terminal is
        if (this.someoneElseHasCts) {
            canvasContext.fillStyle = '#4488aa';
        } else {
            canvasContext.fillStyle = '#4488ff';
        }
        canvasContext.beginPath();
        canvasContext.arc(this.position.x, this.position.y, 5, 0, 2 * Math.PI);
        canvasContext.fill();

        // Draw a circle where the terminal's range is, if it exists
        if (this.range) {
            canvasContext.strokeStyle = '#222';
            canvasContext.beginPath();
            canvasContext.arc(this.position.x, this.position.y, this.range, 0, 2 * Math.PI);
            canvasContext.stroke();
        }

        canvasContext.restore();
    }

    /**
     * Add a new broadcast to `queue`
     * @param {*} type One of `Broadcast.types`
     * @param {Object} destination Terminal to which to broadcast
     * @param {*} data What to include in the broadcast
     * @param {Boolean} isPriority Whether the broadcast is high priority
     * @param {Array} queue Which queue to add the broadcast to
     */
    queueBroadcast(type, destination, data, isPriority = false, queue = this.broadcastQueue) {
        const newBroadcast = new Broadcast(this.position, this.range || (Math.random() * maxRadiusCoefficient), (Math.random() + 0.3) * propogationRateCoefficient, type);
        newBroadcast.source = this;
        newBroadcast.destination = destination;
        newBroadcast.data = data;
        if (type === Broadcast.types.DATA ) {
            this.nextBroadcastTime=diff;
        }
        else if (type === Broadcast.types.ACK) {
            this.nextBroadcastTime=siff;
        }

        if (isPriority) {
            queue.unshift(newBroadcast);
        } else {
            queue.push(newBroadcast);
        }
        return newBroadcast;
    }

    /**
     * Defines what should be done every tick of the simulation
     * @param {Number} deltaTime milliseconds since the last call to `tick`
     */
    tick(deltaTime) {
        // Define under which circumstances a broadcast can be sent
        const canBroadcast = () => {
            return !this.currentBroadcast &&
                !this.channelIsBusy() &&
                [...this.broadcastQueue, ...this.rtsBroadcastQueue].length > 0 &&
                !this.someoneElseHasCts &&
                this.broadcastTimeAccumulator >= this.nextBroadcastTime;
        };

        // If it's time to initiate a RTS, do so
        this.rtsTimeAccumulator += deltaTime;
        if (this.rtsTimeAccumulator >= this.nextRtsTime) {
            this.nextRtsTime = util.nextTime(rtsRate);
            this.rtsTimeAccumulator = 0;
            if (this.rtsBroadcastQueue.length === 0) {
                const broadcast = this.queueBroadcast(Broadcast.types.RTS, util.pick(this.getTerminalsInRange()), Math.random()*dataSizeCoefficient, false, this.rtsBroadcastQueue);
                this.unackedRtses.push(broadcast.id);
            }
        }

        // If we can broadcast, do so
        this.broadcastTimeAccumulator += deltaTime;
        if (this.broadcastTimeAccumulator >= this.nextBroadcastTime) {
            this.nextBroadcastTime = 0;
            this.broadcastTimeAccumulator = 0;
        }
        if (canBroadcast()) {
            this.currentBroadcast = this.broadcastQueue.length > 0 ? this.broadcastQueue.shift() : this.rtsBroadcastQueue.shift();
            // Define what to do when the broadcast finishes
            this.currentBroadcast.onFinish(() => {
                this.notifyBroadcastFinishListeners(this.currentBroadcast);
                this.currentBroadcast = null;
            });
            this.notifyBroadcastListeners(this.currentBroadcast);
        }
        if(this.sentData) {
            this.dataTimeAccumulator+=deltaTime;
            if(this.dataTimeAccumulator>dataTimeout) {
                this.dataTimeAccumulator=0;
                this.reBroadcast(Broadcast.types.DATA,this.toSend);
            }
        }
    }

    /**
     * Queues a new broadcast of type=`type` that's a response to `broadcast`
     * @param {*} type One of `Broadcast.types`
     * @param {Object} broadcast Broadcast
     */
    reBroadcast(type,broadcast) {
        this.queueBroadcast(type, broadcast.source,broadcast.id);
    }

    /**
     * `this` is directly aware of interference by `interferingBroadcast` because it reached `this` while `this` is broadcasting
     * @param {Object} interferingBroadcast Broadcast
     */
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

    /**
     * Is `this` terminal currently broadcasting?
     */
    isBroadcasting() {
        return !!this.currentBroadcast;
    }

    /**
     * Adds listener for when terminal broadcasts
     * @param {Function} cb (broadcast) => {}
     */
    onBroadcast(cb) {
        this.broadcastListeners.push(cb);
    }

    /**
     * Adds listener for when terminal finishes broadcast
     * @param {Function} cb (broadcast) => {}
     */
    onBroadcastFinish(cb) {
        this.broadcastFinishListeners.push(cb);
    }

    /**
     * Adds listener for how to check if channel is busy
     * @param {Function} cb () => {}
     */
    onCheckIfBusy(cb) {
        this.checkIfBusyListeners.push(cb);
    }

    /**
     * Adds listener for how to check what terminals are in range of `this`
     * @param {Function} cb () => {}
     */
    onGetTerminalsInRange(cb) {
        this.getTerminalsInRangeListeners.push(cb);
    }

    /**
     * Checks if the channel is busy
     */
    channelIsBusy() {
        return this.checkIfBusyListeners.map(cb => cb()).reduce((prev, cur) => prev || cur, false);
    }

    /**
     * Gets all terminals in range of `this`
     */
    getTerminalsInRange() {
        return this.getTerminalsInRangeListeners.map(cb => cb()).reduce((prev, cur) => [...prev, ...cur], []);
    }

    /**
     * Notifies all broadcast listeners that `this` broadcasted `broadcast`
     * @param {Object} broadcast Broadcast
     */
    notifyBroadcastListeners(broadcast) {
        this.broadcastListeners.forEach(cb => cb(broadcast));
    }

    /**
     * Notifies all broadcast finish listeners that `this` finished broadcasting `broadcast`
     * @param {Object} broadcast Broadcast
     */
    notifyBroadcastFinishListeners(broadcast) {
        this.broadcastFinishListeners.forEach(cb => cb(broadcast));
    }

    /**
     * Checks if `broadcast` originated at `this` terminal
     * @param {Object} broadcast Broadcast
     */
    ownsBroadcast(broadcast) {
        return broadcast === this.currentBroadcast;
    }

    /**
     * Handle receiving good broadcasts
     * @param {Object} receivedBroadcast Broadcast
     */
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
            // Received RTS
            case Broadcast.types.RTS: {
                if (receivedBroadcast.destination === this && !this.sentData) {
                    this.queueBroadcast(Broadcast.types.CTS, receivedBroadcast.source, [receivedBroadcast.id,receivedBroadcast.data]);
                }
                break;
            }

            // Received CTS
            case Broadcast.types.CTS: {
                if (receivedBroadcast.destination === this) {
                    const index = this.unackedRtses.findIndex(id => receivedBroadcast.data[0] === id);
                    if (index !== -1) {
                        this.unackedRtses.splice(index, 1);
                        this.queueBroadcast(Broadcast.types.DATA, receivedBroadcast.source, receivedBroadcast.id);
                        this.toSend=receivedBroadcast;
                        this.sentData=true;
                    }
                } else {
                    this.someoneElseHasCts = true;
                    this.nextBroadcastTime =receivedBroadcast.data[1];
                }
                break;
            }

            // Received DATA
            case Broadcast.types.DATA: {
                if (receivedBroadcast.destination === this) {
                    this.queueBroadcast(Broadcast.types.ACK, receivedBroadcast.source, receivedBroadcast.id);
                }
                break;
            }

            // Received ACK
            case Broadcast.types.ACK: {
                this.sentData = false;
                this.someoneElseHasCts = false;
                break;
            }
        }
    }
}

export default Terminal;
