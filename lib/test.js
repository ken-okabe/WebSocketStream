/*global instruments: true*/

'use strict';

// WebSocket API
// http://www.w3.org/TR/2012/CR-websockets-20120920/

// Node.js v0.10.1
// http://nodejs.org/docs/v0.10.1/api/stream.html

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

instruments = instruments.concat(WebSocketStream.instruments);

serverSocket.on('connection', function (socket) {
    var serverStream = new WebSocketStream(socket, {objectMode: true});

    // echo messages
    serverStream.pipe(serverStream);
});

clientStream.on('readable', function () {
    messages.push(clientStream.read());
});

clientStream.on('end', function () {
    assert.deepEqual(messages, [string, buffer]);

    clientStream.on('close', function () {
        var drainEmitted = false;

        // Pretend there is no bufferedAmount but the write should not be
        // flushed in the socket is closed.

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
});

clientSocket.onopen = function () {
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
        clientSocket.close();
    });

    clientStream.end();

    clientStream.on('error', function () {
        assert(true);
    });

    // Pretend there's an error.
    clientSocket.onerror();
};
