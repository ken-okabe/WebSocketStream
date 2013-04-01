/*global instruments: true*/

'use strict';

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

    ['addEventListener', 'close', 'send'].forEach(function (method) {
        mockSocket[method] = realSocket[method].bind(realSocket);
    });
}

function test2() {
    var realClientSocket = new WebSocket('ws://localhost:' + port),
        clientSocket = new MockWebSocket(realClientSocket),
        clientStream = new WebSocketStream(clientSocket),
        flushed;

    assert.doesNotEmit(clientStream, 'drain', function () {
        // Pretend that the write is flushed immediately.
        clientSocket.bufferedAmount = 0;
        clientStream.write(new Buffer(17 * 1024));
    });
}

var assert = require('assert2'),
    stream = require('stream'),
    util = require('util'),

    WebSocketStream = require('./main'),
    port = 8081,
    serverSocket = new WebSocket.Server({port: port}),
    realClientSocket = new WebSocket('ws://localhost:' + port),
    clientSocket = new MockWebSocket(realClientSocket),
    clientStream = new WebSocketStream(clientSocket, {objectMode: true}),
    string = "Come back to me.",
    buffer = new Buffer([1, 2, 3]),
    flushed,
    messages = [];

// Make an echo server.
serverSocket.on('connection', function (socket) {
    var serverStream = new WebSocketStream(socket, {objectMode: true});

    // echo messages
    serverStream.pipe(serverStream);
});

// Save messages to an array as they come in.
clientStream.on('readable', function () {
    messages.push(clientStream.read());
});

clientStream.on('end', function () {
    assert.deepEqual(messages, ["pre-open", string, buffer]);

    clientStream.on('error', function () {
        assert(true);
    });

    // Pretend there's an error.
    clientSocket.onerror();

    clientStream.on('close', function () {
        // Pretend there is no bufferedAmount but the write should not be
        // flushed in the socket is closed.

        var drainEmitted = false;

        clientStream.on('drain', function () {
            drainEmitted = true;
        });

        clientSocket.bufferedAmount = 0;
        flushed = clientStream.write(string);
        assert(!flushed);

        // 'drain' should not be emitted when the socket is closed.
        setTimeout(function () {
            assert(!drainEmitted);
        }, 200);

        test2();
    });

    clientSocket.close();
});

clientSocket.addEventListener('open', function () {
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
        clientStream.end();
    });
});

// Attempt a write before the socket is opened.  This should be buffered and
// sent later.
flushed = clientStream.write("pre-open");
assert(!flushed);
