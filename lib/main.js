/*global define:true*/

'use strict';

// WebSocket API
// http://www.w3.org/TR/2012/CR-websockets-20120920/

// Node.js v0.10.1
// http://nodejs.org/docs/v0.10.1/api/stream.html

if (typeof define !== 'function') { var define = require('amdefine')(module) }

define(['stream', 'util'], (function (stream, util) {
    function WebSocketStream(socket, options) {
        var socketStream = this,

            // From _stream_readable.  This should be Infinity but see
            // https://github.com/joyent/node/pull/4955
            MAX_HWM = 0x800000,

            duplexOptions = options || {};

        duplexOptions.decodeStrings = false;
        duplexOptions.highWaterMark = MAX_HWM;
        stream.Duplex.call(this, duplexOptions);
        this.socket = socket;

        socket.addEventListener('error', function () {
            socketStream.emit('error');
        });

        socket.addEventListener('close', function () {
            socketStream.emit('close');
        });

        socket.addEventListener('message', function (event) {
            // Convert ArrayBuffers into Buffers.
            socketStream.push(event.type == 'Binary'
                ? new Buffer(event.data)
                : event.data === ''
                    ? null
                    : event.data);
        });

        this.on('finish', function () {
            // Use empty string to represent null.
            this.write('');
        });
    }

    util.inherits(WebSocketStream, stream.Duplex);

    WebSocketStream.prototype._read = function (size) {
        // Nothing to do here.
    };

    WebSocketStream.prototype._write = function (chunk, encoding, callback) {
        var socket = this.socket;

        function send() {
            // Convert Buffers into ArrayBuffers
            socket.send(chunk instanceof Buffer
                ? new Uint8Array(chunk)
                : chunk);

            callback();
        }

        if (socket.readyState == socket.OPEN)
            send();
        else
            socket.addEventListener('open', send);
    };

    WebSocketStream.prototype.write = function (chunk, encoding, callback) {
        var webSocketStream = this,
            socket = this.socket,
            flushed;

        // We have to poll socket.bufferedAmount because there's no event to
        // tell us when it's zero.  :-(
        function checkBufferedAmount() {
            if (socket.readyState == socket.OPEN) {
                if (socket.bufferedAmount === 0)
                    webSocketStream.emit('drain');
                else
                    setTimeout(checkBufferedAmount, 50);
            }
        }

        // Write the chunk and ignore Duplex's return value because we've maxed
        // out the high water mark.
        stream.Duplex.prototype.write.call(this, chunk, encoding, callback);

        if (socket.readyState == socket.OPEN) {
            flushed = socket.bufferedAmount === 0;

            if (!flushed)
                checkBufferedAmount();
        }
        else {
            flushed = false;
            socket.addEventListener('open', checkBufferedAmount);
        }

        return flushed;
    };

    return WebSocketStream;
}));
