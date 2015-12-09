var os=require('os');
var Serial=require('serialport');
var SerialPort = Serial.SerialPort;

var COMName=(os.platform==='win32')?'COM0':'/dev/ttyUSB0';
var Baudrate=115200;
var BTLoggerName='LaVue Logger';
var BTLoggerAddr='';
var COMList=[];
var COMPort=false;
var COMPortValid=false;
var UserCallback=false;
var ConnectCallback=false;
var IsPaired=false;
var SPBTBusy=false;
const SPBTState_STANDBY=0;
const SPBTState_ACTIVE_BYPASS=1;
const SPBTState_ACTIVE_COMMAND=2;
var SPBTState=SPBTState_ACTIVE_COMMAND;
var SPBTEscapeSequence='^#^$^%';
var BTDeviceList=[];

function SPBTDispatch(input){
	//console.log("----["+input+"]----")
	if(input.indexOf('AT-AB BDAddress')>-1){
		setTimeout(function(){Discovery();},1000);
	}
	else if(input=='AT-AB -CommandMode-'){
		SPBTState=SPBTState_ACTIVE_COMMAND;
	}
	else if(input=='AT-AB -BypassMode-'){
		SPBTState=SPBTState_ACTIVE_BYPASS;
		console.log("Bypass mode NOW");
		ConnectCallback("OK");
	}
	else if(input=='AT-AB ConnectionDown'){
		SPBTState=SPBTState_ACTIVE_COMMAND;
	}
	else if(input.indexOf('AT-AB Device')>-1){
		console.log("Discovery: "+input);
		var BDAddr=input.slice(13,25);
		var BDName=input.slice(27,input.length-1);
		BTDeviceList.push({BDAddr,BDName});
		if(BDName==BTLoggerName){
			BTLoggerAddr=BDAddr;
			setTimeout(function(){Bond(BDName);},5000);
		}
		//console.log(BTDeviceList);
	}
	else if(input.indexOf('AT-AB BondOk')>-1){
		console.log("Bonding OK");
		setTimeout(function(){
			console.log("SPP connection request on "+BTLoggerAddr);
			COMPort.write("AT+AB SPPConnect "+BTLoggerAddr+"\r\n");
		},2000);
	}
	else if(input.indexOf('AT-AB ConnectionUp')>-1){
		console.log("SPP Connection OK");
		//COMPort.write("Hello Bluetooth module :-)");//for test only
	}
	else{
		switch(SPBTState){
		case SPBTState_STANDBY:
			break;
		case SPBTState_ACTIVE_BYPASS:
			if(UserCallback)
				UserCallback(input);
			break;
		case SPBTState_ACTIVE_COMMAND:
			break;
		default:break;
		}
	}
}

function SPBTcb(d){
	SPBTcb.data=SPBTcb.data||"";
	if(d){ 
		d.forEach(function(elem){SPBTcb.data+=String.fromCharCode(elem)});
	}
	var CMDEndOffset=SPBTcb.data.indexOf('\r\n');
	if(CMDEndOffset>-1){
		SPBTDispatch(SPBTcb.data.slice(0,CMDEndOffset));
		SPBTcb.data=SPBTcb.data.slice(CMDEndOffset+2,SPBTcb.data.length);
	}
	CMDEndOffset=SPBTcb.data.indexOf('\r\n');
	if(CMDEndOffset>-1){
		SPBTcb();
	}
}

function SPBT(COM, Baud,user_cb,Connect_cb) {
	COMName = COM;
	Baudrate=Baud;
	UserCallback=user_cb;
	ConnectCallback=Connect_cb;
	
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
				COMPort.on('data',SPBTcb);
				SoftReset();
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
		if(!SPBTBusy){
			COMPort.write("AT+AB Discovery\r\n");
			setTimeout(function(){SPBTBusy=false;},15000);//stated in User manual page 17
			SPBTBusy=true;
		}
		else
			console.log("SPBT Busy");
	}
}

function Bond(name){
	if(!SPBTBusy){
		for(var i=0;i<BTDeviceList.length;i++){
			if(BTDeviceList[i].BDName==name){
				console.log("Bonding Requested on "+name);
				COMPort.write("AT+AB Bond "+BTDeviceList[i].BDAddr+" 1234\r\n");
				return ;
			}
		}
		console.log("Bonding: No device named "+name);
	}
	else
		console.log("SPBT Busy");
}

function ForceCMDMode(){
	if(COMPortValid)
	{
		if(!SPBTBusy){
			SPBTBusy=true;
			COMPort.write(SPBTEscapeSequence);
			setTimeout(function(){SPBTBusy=false;SPBTState=SPBTState_ACTIVE_COMMAND;},2500);
		}
		else
			console.log("SPBT Busy");
	}
}

function SoftReset(){
	if(COMPortValid)
	{
		if(!SPBTBusy){
			ForceCMDMode();
			setTimeout(function(){
				COMPort.write("AT+AB Reset\r\n");
			},2500);
		}
		else
			console.log("SPBT Busy");
	}
}

function Terminate(cb){
	if(SPBTState==SPBTState_ACTIVE_BYPASS){
		console.log("Forcing Command mode...");
		ForceCMDMode();
		setTimeout(function(){
			console.log("SPP Disconnecting...");
			COMPort.write("AT+AB SPPDisconnect\r\n");
			setTimeout(function(){
				console.log("Closing Bluetooth link...");
				COMPort.write("AT+AB LinkDisconnect\r\n");
				
				setTimeout(function(){
					if(COMPort){
						console.log("Closing COM port...");
						COMPort.close(function(){console.log("COM Port closed");});
						cb();
					}
				},500);
				
			},500);
		},2500);
	}
	else{
		setTimeout(function(){
			if(COMPort){
				console.log("Closing COM port...");
				COMPort.close(function(){console.log("COM Port closed");});
				cb();
			}
		},500);
	}
}

exports.SPBT=SPBT;
exports.Bond=Bond;
exports.SoftReset=SoftReset;
exports.Terminate=Terminate;