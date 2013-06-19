var assert = require('assert'),
    ws = require('ws'),
    WebSocketStream = require('../lib/main'),
    server;

server = new ws.Server({port: 8080});

server.on('connection', function (webSocket) {
    var stream;

    stream = new WebSocketStream(webSocket);

    stream.once('readable', function () {
        assert.equal(stream.read(), "WebSocketStream");
    });

    stream.write("WebSocket");
});
