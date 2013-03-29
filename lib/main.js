/*global WebSocket: true*/

'use strict';

// WebSocket API
// http://www.w3.org/TR/2012/CR-websockets-20120920/

// Node.js v0.10.1
// http://nodejs.org/docs/v0.10.1/api/stream.html

var assert = require('assert'),
    stream = require('stream'),
    util = require('util'),

    port = 8081,
    serverSocket = new WebSocket.Server({port: port});


function MockWebSocket(realSocket) {
    var mockSocket = this,
        properties = {};

    // Don't proxy this so we can monkey with it in our tests.
    this.bufferedAmount = 0;

    ['OPEN', 'readyState', 'onopen', 'onerror', 'onclose', 'onmessage']
        .forEach(function (property) {
            properties[property] = {
                get: function () {
                    return realSocket[property];
                },

                set: function (value) {
                    realSocket[property] = value;
                }
            };
        });

    Object.defineProperties(this, properties);

    ['close', 'send'].forEach(function (method) {
        mockSocket[method] = realSocket[method].bind(realSocket);
    });
}


function WebSocketStream(socket, options) {
    var socketStream = this,

        // From _stream_readable.  This should be Infinity but see
        // https://github.com/joyent/node/pull/4955
        MAX_HWM = 0x800000,

        duplexOptions = options || {};

    function send(data, callback) {
        function sendNow() {
            // Convert Buffers into ArrayBuffers
            socket.send(data instanceof Buffer
                ? new Uint8Array(data).buffer
                : data);

            if (callback)
                callback();
        }

        if (socket.readyState == socket.OPEN)
            sendNow();
        else
            socket.onopen = sendNow;
    }

    duplexOptions.highWaterMark = MAX_HWM;
    stream.Duplex.call(this, duplexOptions);
    this.socket = socket;

    socket.onerror = function () {
        socketStream.emit('error');
    };

    socket.onclose = function () {
        socketStream.emit('close');
    };

    socket.onmessage = function (event) {
        // Convert ArrayBuffers into Buffers.
        socketStream.push(event.type == 'Binary'
            ? new Buffer(event.data)
            : event.data === ''
                ? null
                : event.data);
    };

    this.on('finish', function () {
        // Use empty string to represent null.
        send('');
    });

    this._write = function (chunk, encoding, callback) {
        send(chunk, callback);
    };
}

util.inherits(WebSocketStream, stream.Duplex);

WebSocketStream.prototype._read = function (size) {
    // Nothing to do here.
};

WebSocketStream.prototype.write = function (chunk, encoding, callback) {
    var webSocketStream = this,
        socket = this.socket,
        flushed;

    function checkBufferedAmount() {
        if (socket.bufferedAmount === 0)
            webSocketStream.emit('drain');
        else
            setTimeout(checkBufferedAmount, 50);
    }

    stream.Duplex.prototype.write.apply(this, arguments);
    flushed = socket.bufferedAmount === 0;

    if (!flushed)
        checkBufferedAmount();

    return flushed;
};


serverSocket.on('connection', function (socket) {
    var serverStream = new WebSocketStream(socket, {objectMode: true});

    // echo messages
    serverStream.pipe(serverStream);
});

function test1(callback) {
    var realClientSocket = new WebSocket('ws://localhost:' + port),
        clientSocket = new MockWebSocket(realClientSocket),
        clientStream = new WebSocketStream(clientSocket, {objectMode: true}),
        string = "Come back to me.",
        buffer = new Buffer([1, 2, 3]),
        flushed,
        messages = [];

    clientStream.on('readable', function () {
        messages.push(clientStream.read());
    });

    clientStream.on('end', function () {
        assert.deepEqual(messages, [string, buffer]);

        clientStream.on('close', function () {
            assert(true);
            callback();
        });

        clientSocket.close();
    });

    // Pretend that the write is flushed immediately.
    clientSocket.bufferedAmount = 0;
    flushed = clientStream.write(string);
    assert(flushed);

    // Pretend that the write is buffered.
    clientSocket.bufferedAmount = 42;
    flushed = clientStream.write(buffer);
    assert(!flushed);

    // Pretend that the buffer is flushed in 200 ms.
    setTimeout(function () {
        clientSocket.bufferedAmount = 0;
    }, 200);

    clientStream.once('drain', function () {
        assert.equal(clientSocket.bufferedAmount, 0);
    });

    clientStream.end();

    clientStream.on('error', function () {
        assert(true);
    });

    // Pretend there's an error.
    clientSocket.onerror();
}

assert.doesNotEmit = function (emitter, event, block, message) {
    var emitted = false;

    emitter.once(event, function () {
        emitted = true;
    });

    block();

    if (emitted)
        assert.fail(event, null, message);
};

(function () {
    var events = require('events'),
        emitter = new events.EventEmitter();

    assert.doesNotEmit(emitter, 'test', function () {
        emitter.emit('test');
    });
})();

function test2() {
    var realClientSocket = new WebSocket('ws://localhost:' + port),
        clientSocket = new MockWebSocket(realClientSocket),
        clientStream = new WebSocketStream(clientSocket),
        flushed;

    assert.doesNotEmit(clientStream, 'drain', function () {
        // Pretend that the write is flushed immediately.
        clientSocket.bufferedAmount = 0;
        flushed = clientStream.write(new Buffer(17 * 1024));
        assert(flushed);
    });
}


test1(test2);
