WebSocketStream provides a [Node.js stream](http://nodejs.org/api/stream.html) interface on top of
[WebSocket](http://www.w3.org/TR/websockets/) that works on [Node.js](http://nodejs.org) and in the
browser.

## Installation

You can install the library with `npm` for use with Node.js:

`npm install websocketstream`

or with [Bower](http://bower.io/) for use in the browser:

`bower install WebSocketStream`

## Node.js Example

```JavaScript
'use strict';

var WebSocket = require('ws'),
  webSocketServer = new WebSocket.Server({port: 8080}),
  WebSocketStream = require('websocketstream');
  
webSocketServer.on('connection', function (webSocket) {
  var stream = new WebSocketStream(webSocket);
      
  stream.on('readable', function () {
    console.log("Something just came in over the wire: " + stream.read());
  });
        
  stream.write("There's a place I know just east of here.");
});
```

## Browser Example

```JavaScript
'use strict';

require.config({
  map: {
    '*': {
      'stream': 'Node-in-browser/lib/stream',
      'util': 'Node-in-browser/lib/util'
    }
  }
});

require(['WebSocketStream/lib/main'], function (WebSocketStream) {
  var webSocket = new WebSocket('ws://' + location.host),
    stream = new WebSocketStream(webSocket);
  
  stream.on('readable', function () {
    console.log("Something just came in over the wire: " + stream.read());
  });
        
  stream.write("There's a place I know just east of here.");  
});
```

## Related Projects

* [Shoe](https://github.com/substack/shoe)
* [websocket-stream](https://github.com/maxogden/websocket-stream)

## Copyright

Copyright 2013 David Braun

This file is part of WebSocketStream.

WebSocketStream is free software: you can redistribute it and/or modify it under the
terms of the GNU Lesser General Public License as published by the Free Software
Foundation, either version 3 of the License, or (at your option) any later
version.

WebSocketStream is distributed in the hope that it will be useful, but WITHOUT ANY
WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
PARTICULAR PURPOSE.  See the GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License along
with WebSocketStream.  If not, see <http://www.gnu.org/licenses/>.
