import Terminal from './terminal';
import vector from './vector';
import util from './util';

const terminalSpawnRate = 0.0001;
const broadcastDeleteDelay = 1000;

class App {
    constructor(canvasElement) {
        this.canvasElement = canvasElement;
        this.canvasContext = canvasElement.getContext('2d');

        this.nextSpawnTime = util.nextTime(terminalSpawnRate);
        this.spawnTimeAccumulator = 0;

        this.broadcasts = [];
        this.doneBroadcasts = [];
        this.terminals = [];

        const boundingRect = this.canvasElement.getBoundingClientRect();
        this.updateSize(boundingRect.width, boundingRect.height);

        this.spawnTerminal();
    }

    updateSize(width, height) {
        this.width = width;
        this.height = height;
        this.canvasElement.width = width;
        this.canvasElement.height = height;
    }

    spawnTerminal() {
        const boundingRect = this.canvasElement.getBoundingClientRect();
        const terminal = new Terminal(
            new vector.Vector2D(
                Math.random() * boundingRect.width,
                Math.random() * boundingRect.height
            ),
        );
        terminal.onBroadcast(broadcast => {
            this.broadcasts.push(broadcast);
        });
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

    tick(deltaTime) {
        const boundingRect = this.canvasElement.getBoundingClientRect();
        if (this.width !== boundingRect.width || this.height !== boundingRect.height) {
            this.updateSize(boundingRect.width, boundingRect.height);
        }

        this.canvasContext.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

        this.spawnTimeAccumulator += deltaTime;
        if (this.spawnTimeAccumulator >= this.nextSpawnTime) {
            this.nextSpawnTime = util.nextTime(terminalSpawnRate);
            this.spawnTimeAccumulator = 0;
            this.spawnTerminal();
        }

        this.doneBroadcasts.forEach(broadcast => {
            broadcast.tick(deltaTime);
            broadcast.render(this.canvasContext);
        });

        this.broadcasts.forEach((broadcast, index) => {
            broadcast.tick(deltaTime);
            broadcast.render(this.canvasContext);

            for (let otherIndex = index + 1; otherIndex < this.broadcasts.length; ++otherIndex) {
                const otherBroadcast = this.broadcasts[otherIndex];
                if (broadcast.interferes(otherBroadcast)) {
                    broadcast.interfere();
                    otherBroadcast.interfere();
                }
            }
        });

        this.terminals.forEach(terminal => {
            terminal.tick(deltaTime);
            terminal.render(this.canvasContext);
        });
    }
}

function init(canvasElement) {
    const app = new App(canvasElement);
    const framesPerSecond = 24;
    let prevTime = Date.now();
    setInterval(() => {
        app.tick(Date.now() - prevTime);
        prevTime = Date.now();
    }, 1000 / framesPerSecond);
}

export default {
    init,
};
