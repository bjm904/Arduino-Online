var port=process.argv[2]||9789;
console.log("Starting on port "+port);
var io=require("socket.io");
var express=require("express");
var app=express();
var server=require('http').createServer(app);
var io=io.listen(server);
server.listen(port);
io.set("log level", 0);

var status="000000000000";

var clients=[];
io.sockets.on("connection", function(socket){
  socket.emit("status", JSON.stringify({status:status}));
  socket.on("status", function(data){
	status=JSON.parse(data).status;
	console.log(status);
	socket.emit("status", JSON.stringify({status:status}));
	socket.broadcast.emit("status", JSON.stringify({status:status}));
  });
});