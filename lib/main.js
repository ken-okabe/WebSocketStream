/*global WebSocket: true*/

'use strict';

// WebSocket API
// http://www.w3.org/TR/2012/CR-websockets-20120920/

// Node.js v0.10.1
// http://nodejs.org/docs/v0.10.1/api/stream.html

// TODO: Use WebSocket binary mode for buffers.

var assert = require('assert'),
    stream = require('stream'),
    util = require('util'),

    WebSocket = require('ws'),
    port = 8081,
    serverSocket = new WebSocket.Server({port: port}),
    clientSocket = new WebSocket('ws://localhost:' + port),
    clientStream,
    string = "Come back to me.",
    buffer = new Buffer([1, 2, 3]),
    messages = [];


function WebSocketStream(socket, options) {
    var socketStream = this;

    function send(data, callback) {
        function sendNow() {
            socket.send(JSON.stringify(data));

            if (callback)
                callback();
        }

        // socket.OPEN should work but doesn't.  TODO: Submit issue with ws.
        assert.equal(socket.OPEN, WebSocket.OPEN);

        if (socket.readyState == WebSocket.OPEN)
            sendNow();
        else
            socket.once('open', sendNow);
    }

    stream.Duplex.call(this, options);

    socket.onmessage = function (event) {
        var data = JSON.parse(event.data);

        socketStream.push(Array.isArray(data) ? new Buffer(data) : data);
    };

    this.on('finish', function () {
        send(null);
    });

    this._write = function (chunk, encoding, callback) {
        send(chunk, callback);
    };
}

util.inherits(WebSocketStream, stream.Duplex);

WebSocketStream.prototype._read = function (size) {
    // Nothing to do here.
};


serverSocket.on('connection', function (socket) {
    var serverStream = new WebSocketStream(socket, {objectMode: true});

    // echo messages
    serverStream.pipe(serverStream);
});

clientStream = new WebSocketStream(clientSocket, {objectMode: true});

clientStream.on('readable', function () {
    messages.push(clientStream.read());
});

clientStream.on('end', function () {
    assert.deepEqual(messages, [string, buffer]);
});

clientStream.write(string);
clientStream.write(buffer);
clientStream.end();
