// LaVue
// Web server relaying serial data and exposing it on a web page
// JRY
// 04.12.2015


//generic vars
var COMPort='COM55';
var PORT=80;
var MAINFILE='index.html';
var BTLoggerName='LaVue Logger';

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
	console.log("WebServer: ON ("+PORT+")")
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
	console.log("WebSocket: ON");
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
var SPBT=require('./mod/SPBT');

function BTCOMcb(data){
	//console.log("data from COM :"+data);
	if(wsConnected)
		io.emit('FakeData',data);
	else
		console.log('no websocket to send data to, skipping');
}

/*
{device:"RudiPCB",temp:32,id:"capteur de temperature"}
*/

function Start(x){
	if(x==='OK')
	{
		if(wsConnected)
			io.emit('FakeData',"Bluetooth SPP Connection UP and running !! :-)");
		else
			console.log('no websocket to send to');
	}
	else{
		console.log("Error : "+x);
	}
}

SPBT.SPBT(COMPort,115200,BTCOMcb,Start);
console.log("Bluetooth: ON");

process.on('SIGINT', function () {
  console.log('CTRL-C: exiting...');
  SPBT.Terminate(function(){console.log("OK. bye bye");process.exit(0);});
});