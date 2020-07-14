const liveServer = require('live-server');

liveServer.start({
    port: 8080,
    host: '0.0.0.0',
    root: 'dist/dev',
    open: true,
    file: 'index.html',
    wait: 1000,
});
