# What

A [Node.js stream](http://nodejs.org/api/stream.html) interface on top of
[WebSocket](http://www.w3.org/TR/websockets/) that works in Node.js and the
browser.

# Why?

I wanted a Node.js stream interface on top of WebSocket.  I looked at
[Shoe](https://github.com/substack/shoe) and
[websocket-stream](https://github.com/maxogden/websocket-stream).

I wanted but didn't find:

* a library that works on both Node.js and in the browser, using an AMD module
in the browser without requiring a build step
* a wrapper around WebSocket that allows direct access to the socket
* to be able to use SockJS instead of WebSocket
* a `drain` event to be emitted when the `bufferedAmount` is zero

# Installation

You can install the library with [Bower](http://twitter.github.com/bower/):

`bower install WebSocketStream`

# Example

```JavaScript
require(['sockjs-client/sockjs', 'WebSocketStream/lib/main'],
    function (SockJS, WebSocketStream) {
    var sockJS = new SockJS('/SockJS'),
        socketStream = new WebSocketStream(sockJS);

    socketStream.on('data', function (data) {
        socketStream.write('Did you say, "' + data + '"?');
    });
});
```
