var port=process.argv[2]||5987;
var httpServ = require('http');
console.log("Starting on port "+port+" with id");

var status="00000000000";

var processRequest = function(req, res){
	res.writeHead(200);
res.end(JSON.stringify({status:status}));
};

var app = httpServ.createServer(processRequest).listen(port);


var WebSocketServer=require('ws').Server;
var wss=new WebSocketServer({server: app});

var clients=[];

wss.on('connection', function(ws){
	clients.push(ws);
	ws.send(JSON.stringify({status:status}));
	ws.on('message', function(message){
		var com=JSON.parse(message);
		console.log(com);
		if(com.status){
			status=com.status;
			for(var i=0; i<clients.length;i++){
				try{
					clients[i].send(JSON.stringify({status:status}));
				} catch(err){}
			}
		}
	});
	ws.on('close', function(message){
		for(var i=0; i<clients.length;i++){
			if(clients[i]==ws) clients.splice(i, 1);
		}
	});
});