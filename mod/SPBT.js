var os=require('os');
var Serial=require('serialport');
var SerialPort = Serial.SerialPort;

var COMName=(os.platform==='win32')?'COM0':'/dev/ttyUSB0';
var Baudrate=115200;
var COMList=[];
var COMPort;
var UserCallback=false;

function COMcb(d){
	var data="";
	d.forEach(function(elem){data+=String.fromCharCode(elem)});
	if(UserCallback)
		UserCallback(data);
}

function SPBT(COM, Baud,cb) {
	COMName = COM;
	Baudrate=Baud;
	UserCallback=cb;
	function connect(){
		COMPort = new SerialPort(COMName, {
			baudrate: Baudrate
		},false);
		COMPort.open(function(err){
			if ( err) {
				console.log('failed to open '+COMName+" :"+err);
			}
			else{	
				COMPort.on('data',COMcb);
			}
		});
	}
	
	Serial.list(function(err,ports){
		ports.forEach(function(port){
			COMList.push(port.comName);
		});
		if(COMList.indexOf(COMName)>-1){
			connect();
		}
		else{
			console.log("Serial port does not exist");
		}
	});	
}

/*
var PortList=
Serial.list(function (err, ports) {
  ports.forEach(function(port) {
    console.log(port.comName);
  });
});
*/


exports.SPBT=SPBT;