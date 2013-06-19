require.config({
    map: {
        '*': {
            'stream': '../components/Node-in-browser/lib/stream',
            'util': '../components/Node-in-browser/lib/util'
        }
    }
});

define(['../lib/main'], function (WebSocketStream) {
    var socket, stream;

    socket = new WebSocket('ws://localhost:8080');
    stream = new WebSocketStream(socket);

    stream.once('readable', function () {
        stream.write(stream.read() + "Stream");
    });
});
