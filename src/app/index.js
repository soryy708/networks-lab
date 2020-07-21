import Terminal from './terminal';
import vector from './vector';
import util from './util';
import Circle from './circle';

const terminalSpawnRate = 0.0;
const terminalDisconnectRate = 0.0;
const broadcastDeleteDelay = 1000;

class App {
    /**
     * 
     * @param {HTMLElement} canvasElement HTML element that is a `<canvas>`
     */
    constructor(canvasElement) {
        this.canvasElement = canvasElement;
        this.canvasContext = canvasElement.getContext('2d'); // https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext

        this.nextSpawnTime = util.nextTime(terminalSpawnRate);
        this.spawnTimeAccumulator = 0;
        this.nextDisconnectTime = util.nextTime(terminalDisconnectRate);
        this.disconnectTimeAccumulator = 0;

        this.broadcasts = [];
        this.doneBroadcasts = [];
        this.terminals = [];

        const boundingRect = this.canvasElement.getBoundingClientRect();
        this.updateSize(boundingRect.width, boundingRect.height);

        // Create a configuration where a hidden-terminal problem can occur
        this.spawnTerminal(new vector.Vector2D(boundingRect.width/2, boundingRect.height / 2), 42);
        this.spawnTerminal(new vector.Vector2D(boundingRect.width/2 + 32, boundingRect.height / 2), 42);
        this.spawnTerminal(new vector.Vector2D(boundingRect.width/2 - 32, boundingRect.height / 2), 42);
    }

    /**
     * Resize the renderable resolution based on `width` and `height`
     * @param {Number} width in pixels
     * @param {Number} height in pixels
     */
    updateSize(width, height) {
        this.width = width;
        this.height = height;
        this.canvasElement.width = width;
        this.canvasElement.height = height;
    }

    /**
     * Create a new terminal on `position` with maximum range = `range`
     * @param {Object} position Vector2D
     * @param {Number} range 
     */
    spawnTerminal(position, range) {
        const boundingRect = this.canvasElement.getBoundingClientRect();
        const terminal = new Terminal(
            position || new vector.Vector2D(
                Math.random() * boundingRect.width,
                Math.random() * boundingRect.height
            ),
            range,
        );

        // Set up how to check if a terminal's channel is busy
        terminal.onCheckIfBusy(() => {
            let isBusy = false;
            this.broadcasts.forEach(broadcast => {
                if (broadcast.reachesTerminal(terminal) && !terminal.ownsBroadcast(broadcast)) {
                    isBusy = true;
                }
            });
            return isBusy;
        });

        // Set up how to get all terminals in a terminal's range
        terminal.onGetTerminalsInRange(() => {
            return this.terminals.filter(otherTerminal => {
                const rangeCircle = new Circle(terminal.range, terminal.position);
                return rangeCircle.containsPoint(otherTerminal.position) && otherTerminal !== terminal;
            });
        });

        // Set up what to do when a terminal creates a broadcast
        terminal.onBroadcast(broadcast => {
            this.broadcasts.push(broadcast);
        });

        // Set up what to do when a terminal finishes broadcasting (= it reaches it's maximum radius range)
        terminal.onBroadcastFinish(broadcast => {
            const index = this.broadcasts.findIndex(b => b === broadcast);
            if (index !== -1) {
                this.broadcasts.splice(index, 1);

                this.doneBroadcasts.push(broadcast);
                setTimeout(() => {
                    const index = this.doneBroadcasts.findIndex(b => b === broadcast);
                    if (index !== -1) {
                        this.doneBroadcasts.splice(index, 1);
                    }
                }, broadcastDeleteDelay);
            }
        });

        this.terminals.push(terminal);
    }

    /**
     * Defines what should be done every tick of the simulation
     * @param {Number} deltaTime milliseconds since the last call to `tick`
     */
    tick(deltaTime) {
        const boundingRect = this.canvasElement.getBoundingClientRect();
        // If the size of the canvas element changed, update the simulation resolution
        if (this.width !== boundingRect.width || this.height !== boundingRect.height) {
            this.updateSize(boundingRect.width, boundingRect.height);
        }

        // Clean the screen from the previous frame's drawings
        this.canvasContext.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

        // If it's time to spawn a terminal, do it
        this.spawnTimeAccumulator += deltaTime;
        if (this.spawnTimeAccumulator >= this.nextSpawnTime) {
            this.nextSpawnTime = util.nextTime(terminalSpawnRate);
            this.spawnTimeAccumulator = 0;
            this.spawnTerminal();
        }

        // If it's time to disconnect a terminal, do it
        this.disconnectTimeAccumulator += deltaTime;
        if (this.disconnectTimeAccumulator >= this.nextDisconnectTime) {
            this.nextDisconnectTime = util.nextTime(terminalDisconnectRate);
            this.disconnectTimeAccumulator = 0;

            if (this.terminals.length > 0) {
                const index = Math.floor(Math.random() * this.terminals.length);
                this.terminals.splice(index);
            }
        }

        // Handle done broadcasts
        this.doneBroadcasts.forEach(broadcast => {
            broadcast.tick(deltaTime);
            broadcast.render(this.canvasContext);
        });

        // Handle broadcasts
        this.broadcasts.forEach((broadcast, index) => {
            broadcast.tick(deltaTime);
            broadcast.render(this.canvasContext);

            // Resolve broadcast-broadcast interferences
            for (let otherIndex = index + 1; otherIndex < this.broadcasts.length; ++otherIndex) {
                const otherBroadcast = this.broadcasts[otherIndex];
                if (broadcast.interferesWithBroadcast(otherBroadcast)) {
                    broadcast.interfereBroadcast(otherBroadcast);
                    otherBroadcast.interfereBroadcast(broadcast);
                }
            }

            // Resolve broadcast-terminal interferences
            this.terminals.forEach(terminal => {
                if (broadcast.reachesTerminal(terminal)) {
                    if (broadcast.interferesWithTerminal(terminal) && broadcast.source !== terminal) {
                        broadcast.interfereTerminal(terminal);
                    }
                }
            });

            // Resolve broadcasts that reach terminals well
            if (broadcast.isGood()) {
                this.terminals.forEach(terminal => {
                    if (broadcast.reachesTerminal(terminal) && broadcast.source !== terminal) {
                        broadcast.deliverToTerminal(terminal);
                    }
                });
            }
        });

        // Handle terminals
        this.terminals.forEach(terminal => {
            terminal.tick(deltaTime);
            terminal.render(this.canvasContext);
        });
    }
}

/**
 * Initializes the application
 * @param {HTMLElement} canvasElement HTML element that is a `<canvas>`
 */
function init(canvasElement) {
    const app = new App(canvasElement);
    const framesPerSecond = 60;
    let prevTime = Date.now();
    setInterval(() => {
        app.tick(Date.now() - prevTime);
        prevTime = Date.now();
    }, 1000 / framesPerSecond);
}

export default {
    init,
};
