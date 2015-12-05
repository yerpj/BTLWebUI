// LaVue
// Web server relaying serial data and exposing it on a web page
// JRY
// 04.12.2015


//generic vars
var COMPort='COM15';
var PORT=80;
var MAINFILE='index.html';

//os
var os=require('os');
var LinuxOS=true;
LinuxOS=(os.platform()==='win32')?false:true;

//file system
var fs=require('fs');

//express
var express=require("express");
var app=express();

//websocket and server
var wsConnected=false;
var http = require('http');
var io=require('socket.io');
io=io.listen(app.listen(PORT,function(){
	console.log("listening on "+PORT)
}));

app.get('/',function(req,res){
	console.log(' Received request for '+req.url );
    fs.readFile(MAINFILE,function (err, data){
		if(err)throw err;
        res.writeHead(200, {'Content-Type': 'text/html','Content-Length':data.length});
        res.write(data);
        res.end();
    });
});

function CS_AckHandler(data){
	//console.log('client WS message: '+data);	
}

io.on('connection',function(socket){
	console.log("new WebSocket created");
	wsConnected=true;
	socket.on('Ack', CS_AckHandler);
	socket.on('disconnect', function() {
		console.log("Websocket disconnected");
		socket.removeAllListeners('Ack');
		wsConnected=false;
  });
});
io.set('transports',  ['websocket', 'polling']);


//Serial port
var SPBT=require('./mod/SPBT').SPBT;

function BTCOMcb(d){
	var data="";
	d.forEach(function(elem){data+=String.fromCharCode(elem)});
	console.log("data from COM :"+data);
	if(wsConnected)
		io.emit('FakeData',data);
	else
		console.log('no websocket to send to');
}

SPBT(COMPort,115200,function(x){console.log("User callback , data received :"+x);});