//This is the server that communicated with clients on sparklade then relays status info to a different non-ssl socket.io node, that other one is the one that the Arduino talks to

var settings=require('./settings.js');
var port=settings.port;
var serverID=settings.serverID;
console.log('Starting on port '+port+' with id '+serverID);
var fs=require('fs');
var httpServ=require('https');
var colors=require('colors');
var WebSocketServer=require('ws').Server;
var WebSocket=require('ws');
var socketio=require('socket.io-client');
var animations=require("./animations.js");

var lights={
	red1:true,
	green1:true,
	red2:true,
	green2:true,
	red3:true,
	green3:true,
	red4:true,
	green4:true,
	top:true,
	center:true,
	ext:true,
	testled:true
};

var processRequest=function(req, res){
	res.writeHead(200);
	res.end('Secure Server ['+serverID+']');
};

var app=httpServ.createServer({
	key: fs.readFileSync(settings.sslKey),
	cert: fs.readFileSync(settings.sslCert),
	ca: [fs.readFileSync(settings.sslPem1), fs.readFileSync(settings.sslPem2)]
}, processRequest).listen(port, "0.0.0.0");

//BEGIN SERVER STUFF
var masterSocket;
var masterConnectFlag="false";
function connectToMaster(){
	masterSocket=new WebSocket(settings.sparkadeServerUrl);
	
	masterSocket.on('open', function(){
		console.log("Connected to master");
		masterConnectFlag="true";
		masterSocket.send(JSON.stringify({game: "SERVER", command: "connect", serverID:serverID}));
	});
	masterSocket.on('close', function(){
		console.log("Disconnected from master");
		masterConnectFlag="lost";
		setTimeout(connectToMaster, 3000);
	});
	masterSocket.on('error', function(){
		console.log("Error from master");
		setTimeout(connectToMaster, 3000);
	});
	masterSocket.on('message', function(message){
		var com=JSON.parse(message);
		var client=getClientById(com.clientId);//This is here because all the commands right now involve a client. If that changes, this should be moved into an if block
		if(com.command==="registeredUser"){
			if(client){
				if(com.good){
					client.registered=true;
					client.username=com.username;
					send(client.ws, {engine:true, command:"registered", username:client.username});
				}
			}
		} else if(com.command==="checkedAuth"){
			if(client){
				if(!com.username||com.username!==client.username){
					client.registered=false;
					client.username=false;
					send(client.ws, {engine:true, command: "registeredUpdate", username:false});
					sendItemsToClient(client);
				}
			} else{ sendMaster({command:"removeUser", clientId:com.clientId});}
		}
	});
}
connectToMaster();
function sendMaster(obj){
	try{
		masterSocket.send(JSON.stringify(obj));
	} catch(err){}
}
function getClientById(guid){
	for(var i=0;i<clients.length;i++){
		if(clients[i].id===guid){ return clients[i];}
	}
	return false;
}
function sendNotice(ws, notice, kill){
	var noticeDetail;
	var timeout=0;
	var type="error";
	var other="";
	switch(notice){
		default:
		noticeDetail="An unknown error has occurred";
		break;
	}
	try{
		ws.send(JSON.stringify({engine:true, command:"notice", type:type, noticeDetail: noticeDetail, kill:kill, timeout:timeout, other:other}));
	} catch(err){
		log("Notice not sent ("+notice+") Deleting user...");
		deleteUser(ws, ws.username);
	}
}
function deleteUser(ws, username){
	for(var i=0;i<clients.length;i++){
		if(clients[i].ws===ws){
			log(clients[i].ip.red+" Total - ".red+(clients.length-1)+" / ".red+total);
			clients.splice(i, 1);
		}
	}
}
//END SERVER STUFF


//Begin other node server communication
var controlNodeSocket;
var controlNodeFlag="false";
function connectToControlNode(){
	controlNodeSocket=socketio.connect(settings.controlNodeUrl);
	
	controlNodeSocket.on("connect", function(){
		console.log("Connected to controlNode");
		controlNodeFlag="true";
		sendLightsToControlNode();
	});
	controlNodeSocket.on("disconnect", function(){
		console.log("Disconnected from controlNode");
		controlNodeFlag="lost";
		setTimeout(connectToControlNode, 3000);
	});
	controlNodeSocket.on("status", function(message){
		var com=JSON.parse(message);
		if(com.status){
			//console.log(com.status);
		}
	});
}
function sendStatusControlNode(status){
	try{
		controlNodeSocket.emit("status", JSON.stringify({status:status}));
		console.log("Sent: "+status);
	} catch(err){
		console.log(err);
	}
}
connectToControlNode();
//End other node server communication




function send(ws, obj){
	if(obj){
		obj.serverID=serverID;
		try{
			ws.send(JSON.stringify(obj));
		} catch(err){}
	}
}

var wss=new WebSocketServer({server: app});
var clients=[];
var total=0;

wss.on("connection", function(ws){
	var i=clients.push({ws:ws, ip:ws._socket.remoteAddress, openRooms:[]});
	var thisClient=clients[i-1];
	thisClient.id=guid();
	total++;
	thisClient.ip=thisClient.ip||"No IP";
	log(thisClient.ip.green+" Total - ".green+clients.length+" / ".green+total);
	
	ws.on("message", function(message){
		var com=JSON.parse(message);
		thisClient.game=com.game;
		sendLightsToClient(thisClient);
		if(com.command==="register"){
			if(com.token&&com.token!="false"){
				sendMaster({command:"registerUser", guid:thisClient.id, token:com.token});
			} else{
				send(thisClient.ws, {engine:true, command: "registered", username:false});
			}
		} else if(com.command==="allLights"){
			if(com.lights){
				lights=com.lights;
				sendLightsToControlNode();
				sendLightsToAllClients();
			}
		} else if(com.command==="light"){
			if(com.light){
				setLight(com.light, com.bool, false, com.overrideAnimation);
			}
		} else if(com.command==="speedup"){
			runningAnimation.delay=Math.max(50, runningAnimation.delay-50);
			if(runningAnimation.interval){
				runAnimation(runningAnimation.animation, true);
			}
			sendLightsToAllClients();
		} else if(com.command==="speeddown"){
			runningAnimation.delay=Math.min(2000, runningAnimation.delay+50);
			if(runningAnimation.interval){
				runAnimation(runningAnimation.animation, true);
			}
			sendLightsToAllClients();
		} else if(com.command==="animation"){
			if(com.animation){
				runAnimation(animations[com.animation]);
				sendLightsToAllClients();
			}
		} else if(com.command==="stopanimation"){
			stopAnimating();
		}
	});
	ws.on("close", function(event){
		for(var i=0;i<clients.length;i++){
			if(clients[i].id==thisClient.id){
				log(clients[i].ip.yellow+" Total - ".yellow+(clients.length-1)+" / ".yellow+total);
				clients.splice(i, 1);
			}
		}
	});
});

function sendLightsToClient(client){
	try{
		send(client.ws, {command: "lights", lights:lights, runningAnimation:runningAnimation});
	} catch(err){};
}
function sendLightsToAllClients(){
	for(var i=0;i<clients.length;i++){
		sendLightsToClient(clients[i]);
	}
}

function sendLightsToControlNode(){
	var status="";
	if(lights.red1) status+="1";
	else status+="0";
	if(lights.green1) status+="1";
	else status+="0";
	if(lights.red2) status+="1";
	else status+="0";
	if(lights.green2) status+="1";
	else status+="0";
	if(lights.red3) status+="1";
	else status+="0";
	if(lights.green3) status+="1";
	else status+="0";
	if(lights.red4) status+="1";
	else status+="0";
	if(lights.green4) status+="1";
	else status+="0";
	if(lights.top) status+="1";
	else status+="0";
	if(lights.center) status+="1";
	else status+="0";
	if(lights.ext) status+="1";
	else status+="0";
	if(lights.testled) status+="1";
	else status+="0";
	sendStatusControlNode(status);
}

process.stdin.resume();
process.stdin.setEncoding('utf8');
var util = require('util');
process.stdin.on('data', function(text){
	text=util.inspect(text).replace(/(\\r)|(\\n)|'/g,"");
	switch(text){
		case "crash":
			log("Crash Requested", "bgMagenta");
			m;
		break;
	}
});
function log(text, color){
	var time=new Date();
	var str='['+('0'+Number(time.getHours())).slice(-2)+':'+('0'+Number(time.getMinutes())).slice(-2)+':'+('0'+Number(time.getSeconds())).slice(-2)+'] '+text;
	if(color) str=str[color];
	console.log(str);
}
function guid(){
	function s4(){
		return Math.floor((1+Math.random())*0x10000).toString(16).substring(1);
	}
	return s4()+s4()+'-'+s4()+'-'+s4()+'-'+s4()+'-'+s4()+s4()+s4();
}



var overridingLights=[];
function setLight(name, bool, skipSending, overrideAnimation){
	if(overrideAnimation&&overridingLights.indexOf(name)<0){
		overridingLights.push(name);
		if(overridingLights.length>10){
			stopAnimating();
		}
	}
	if(overridingLights.indexOf(name)<0||overrideAnimation){
		lights[name]=bool;
		if(!skipSending){
			sendLightsToControlNode();
			sendLightsToAllClients();
		}
	}
}
var runningAnimation={
	delay:350
};
function runAnimation(animation, doNotResetOverrides){
	if(!doNotResetOverrides){
		overridingLights=[];
	}
	runningAnimation.animation=animation;
	runningAnimation.step=-1;
	if(runningAnimation.interval){
		clearInterval(runningAnimation.interval);
	}
	runningAnimation.interval=setInterval(function(){
		runningAnimation.step++;
		if(runningAnimation.step>=runningAnimation.animation.steps.length){
			runningAnimation.step=0;
		}
		var currentStep=runningAnimation.animation.steps[runningAnimation.step];
		setLight("red1", currentStep.red1, true);
		setLight("green1", currentStep.green1, true);
		setLight("red2", currentStep.red2, true);
		setLight("green2", currentStep.green2, true);
		setLight("red3", currentStep.red3, true);
		setLight("green3", currentStep.green3, true);
		setLight("red4", currentStep.red4, true);
		setLight("green4", currentStep.green4, true);
		setLight("top", currentStep.top, true);
		setLight("center", currentStep.center, true);
		setLight("ext", currentStep.ext, true);
		sendLightsToControlNode();
		sendLightsToAllClients();
	}, runningAnimation.delay);
}
function stopAnimating(){
	if(runningAnimation.interval){
		clearInterval(runningAnimation.interval);
		runningAnimation={delay:runningAnimation.delay};
	}
	overridingLights=[];
}