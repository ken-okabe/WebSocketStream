/*jshint proto: true */
/*global ArrayBufferView:true */

'use strict';

var assert = require('assert2'),
    events = require('events'),
    stream = require('stream'),
    util = require('util'),

    WebSocketStream = require('./main'),
    clientSocket,
    clientStream,
    string = "Come back to me.",
    buffer = new Buffer([1, 2, 3]),
    flushed,
    messages = [],

    // Shim until ArrayBufferView is exposed properly.  See:
    // https://www.khronos.org/webgl/public-mailing-list/archives/1212/msg00121.html
    // https://code.google.com/p/chromium/issues/detail?id=60449#c4
    ArrayBufferView = ArrayBufferView
        || (new Uint8Array(0)).__proto__.__proto__.constructor,

    MockSocket = (function () {
        function MockSocket () {
            events.EventEmitter.call(this);
            this.readyState = this.CLOSED;
            this.bufferedAmount = 0;
        }

        util.inherits(MockSocket, events.EventEmitter);

        MockSocket.prototype.OPEN = 1;
        MockSocket.prototype.CLOSED = 3;
        MockSocket.prototype.addEventListener = MockSocket.prototype.on;

        MockSocket.prototype.close = function () {
            this.readyState = this.CLOSED;
            this.emit('close');
        };

        MockSocket.prototype.send = function (data) {
            this.emit('message', {
                type: data instanceof ArrayBufferView ? 'Binary' : 'Text',
                data: data
            });
        };

        return MockSocket;
    })();

function test2() {
    var clientStream = new WebSocketStream(clientSocket);

    assert.doesNotEmit(clientStream, 'drain', function () {
        // Pretend that the write is flushed immediately.
        clientSocket.bufferedAmount = 0;
        clientStream.write(new Buffer(17 * 1024));
    });
}

clientSocket = new MockSocket();
clientStream = new WebSocketStream(clientSocket, {objectMode: true});

// Save messages to an array as they come in.
clientStream.on('readable', function () {
    messages.push(clientStream.read());
});

// Attempt a write before the socket is opened.  This should be buffered and
// sent later.
flushed = clientStream.write("pre-open");
assert(!flushed);

clientSocket.addEventListener('open', function () {
    // Pretend that the write is flushed immediately.
    clientSocket.bufferedAmount = 0;
    flushed = clientStream.write(string);
    assert(flushed);

    // Pretend that the write is buffered.
    clientSocket.bufferedAmount = 42;
    flushed = clientStream.write(buffer);
    assert(!flushed);

    // Pretend that the buffer is flushed in 200 ms.  We should see a 'drain'
    // event.
    setTimeout(function () {
        clientSocket.bufferedAmount = 0;
    }, 200);

    clientStream.once('drain', function () {
        assert.equal(clientSocket.bufferedAmount, 0);

        // End the stream.
        clientStream.end();
    });
});

clientSocket.readyState = clientSocket.OPEN;
clientSocket.emit('open');

clientStream.on('end', function () {
    assert.deepEqual(messages, ["pre-open", string, buffer]);

    assert.emits(clientStream, 'error', function () {
        // Pretend there's an error.
        clientSocket.emit('error');
    });

    // Closing the socket should close the stream.
    clientSocket.close();
});

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
