var os=require('os');
var Serial=require('serialport');
var SerialPort = Serial.SerialPort;

var COMName=(os.platform==='win32')?'COM0':'/dev/ttyUSB0';
var Baudrate=115200;
var COMList=[];
var COMPort;
var COMPortValid=false;
var UserCallback=false;
var IsPaired=true;

function COMcb(d){
	var data="";
	d.forEach(function(elem){data+=String.fromCharCode(elem)});
	if(IsPaired){
		if(UserCallback)
			UserCallback(data);
	}
	else{
		//manage RX frames to establish a pairing with a device
	}
	
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
				COMPortValid=true;
				COMPort.on('data',COMcb);
				Discovery();
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

function Discovery(){
	if(COMPortValid)
	{
		COMPort.write("AT+AB Discovery\r\n");
	}
	/* Answer from a discovery: 
	
	AT-AB InqPending

	AT-AB DiscoveryPending 1

	AT-AB Device 44746c2ced48 "JPPhone"
	
	*/
}

function Bond(){
	;/*Proceed to a discovery, then fills a table with accessible devices*/
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
exports.Bond=Bond;