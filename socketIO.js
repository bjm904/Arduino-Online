var io = require('socket.io');
var express = require('express');

var app = express(),
    server = require('http').createServer(app),
    io = io.listen(server);

server.listen(5987);

io.sockets.on('connection', function (socket) {
  socket.emit('yo', { hello: 'world' });
  socket.on('info', function (data) {
    console.log(data);
  });
});

// serve HTML files in the `public` directory.
app.use(express.static(__dirname + '/public'));