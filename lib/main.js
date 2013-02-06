'use strict';

(function (factory) {
    if (typeof exports === 'object')
        module.exports = {
            WebSocketStream: factory(require('stream'), require('util'))
        };
    else if (typeof define === 'function' && define.amd)
        define(['Node-in-browser/lib/stream', 'Node-in-browser/lib/util'],
            factory);
}(function (stream, util) {

// WebSocket API
// http://www.w3.org/TR/2012/CR-websockets-20120920/

// Node.js v0.8.18
// http://nodejs.org/docs/v0.8.18/api/stream.html

function WebSocketStream(socket) {
    var wsStream = this,
        pipeSource;

    // Initialize object with stream.Stream's constructor.
    stream.Stream.call(this);

    this.socket = socket;
    this.readable = this.writable = (socket.readyState == socket.OPEN);

    socket.onopen = function () {
        wsStream.readable = wsStream.writable = true;

        if (pipeSource)
            pipeSource.resume();
    };

    socket.onerror = function () {
        wsStream.readable = wsStream.writable = false;
        wsStream.emit('error');
    };

    socket.onclose = function () {
        wsStream.readable = wsStream.writable = false;
        wsStream.emit('close');
    };

    socket.onmessage = function (event) {
        wsStream.emit('data', event.data);
    };

    this.on('pipe', function (source) {
        // Remember the pipe source.  Should we be remembering multiple sources?
        pipeSource = source;

        if (wsStream.writable)
            source.resume();
    });
}

util.inherits(WebSocketStream, stream.Stream);

WebSocketStream.prototype.pause = WebSocketStream.prototype.resume
    = function () {
        // There's no way to pause nor resume the socket, so do nothing.
    };

WebSocketStream.prototype.write = function (data) {
    var interval,
        wsStream = this;

    this.socket.send(data);

    if (this.socket.bufferedAmount == 0)
        return true;
    else {
        // The socket doesn't have a drain event so we figure out the
        // appropriate time to emit by polling bufferedAmount every 50 ms until
        // it's empty.
        interval = setInterval(function () {
            if (wsStream.socket.bufferedAmount == 0) {
                wsStream.emit('drain');
                clearInterval(interval);
            }
        }, 50);

        return false;
    }
};

WebSocketStream.prototype.end = function (data) {
    if (typeof data != 'undefined')
        this.write(data);

    this.readable = this.writable = false;
    this.emit('end');
};

WebSocketStream.prototype.destroy = function () {
    this.socket.close();
};

WebSocketStream.prototype.destroySoon = function () {
    if (this.socket.bufferedAmount == 0)
        this.destroy();
    else
        this.once('drain', this.destroy.bind(this));
};

return WebSocketStream;

}));
