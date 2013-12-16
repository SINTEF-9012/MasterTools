/// <reference path="./definitions/node.d.ts" />
/// <reference path="./definitions/NodeMaster.d.ts" />
/// <reference path="./definitions/express.d.ts" />

// Import in typescript and commondjs style
var ProtoBuf = require("protobufjs");
var ws = require("ws");
var sqlite3 = require('sqlite3').verbose();
import express = require('express');

var scope : {
	HelpBeaconStore : {[ID : string] : NodeMaster.HelpBeaconModel };
	IncidentObjectStore : {[ID : string] : NodeMaster.IncidentObjectModel };
	MediaStore : {[ID : string] : NodeMaster.MediaModel };
	MessengerStore : {[ID : string] : NodeMaster.MessengerModel };
	PatientStore : {[ID : string] : NodeMaster.PatientModel };
	ResourceMobilizationStore : {[ID : string] : NodeMaster.ResourceMobilizationModel };
	ResourceStatusStore : {[ID : string] : NodeMaster.ResourceStatusModel };
} = {
	HelpBeaconStore: {},
	IncidentObjectStore: {},
	MediaStore: {},
	MessengerStore: {},
	PatientStore: {},
	ResourceMobilizationStore: {},
	ResourceStatusStore: {}
};

// Update each no-null properties
function updateProperties(input: any, output:any) {
	for (var key in input) {
		// Don't update getter and setters
		if (!key.match(/^([sg]et|__construct|encode|toArrayBuffer|toBuffer|toString)/)) {
			if (input[key] != null) {
				output[key] = input[key];
			}
		}
	}
}

function StoreToList(input: {[ID:string] : any}) : any[] {
	var list = [];
	for (var key in input) {
		list.push(input[key]);
	}
	return list;
}

var db = new sqlite3.Database('recorder.db');

db.serialize(function() {
	db.run('CREATE TABLE IF NOT EXISTS recorder (datetime INTEGER, scope BLOB)');
	db.run('CREATE UNIQUE INDEX IF NOT EXISTS recorderindex ON recorder(datetime)');
});

var insertDb = db.prepare('INSERT INTO recorder VALUES (?, ?)'),
	findDb = db.prepare('SELECT datetime, scope FROM recorder'
		+' WHERE ABS($time-datetime) = (SELECT MIN(ABS($time - datetime)) FROM recorder)'),
	infosDb = db.prepare('SELECT (SELECT COUNT(*) FROM recorder) AS count'
		+', (SELECT datetime FROM recorder'
			+' WHERE datetime = (SELECT MIN(datetime) FROM recorder)) AS oldest'
		+', (SELECT datetime FROM recorder'
			+' WHERE datetime = (SELECT MAX(datetime) FROM recorder)) AS newest'),
	historyDb = db.prepare('SELECT datetime AS d, LENGTH(scope) AS s'
		+' FROM recorder ORDER BY datetime ASC');

var protoTransaction : NodeMaster.TransactionBuilder =
	ProtoBuf.protoFromFile("./definitions/NodeMaster.proto")
		.build("NodeMaster.Transaction");

var wsi = new ws("ws://localhost:8181/MasterTools");


var somethingChanged = false;

function parseTransaction(data : NodeBuffer) : NodeMaster.Transaction {
	return protoTransaction.decode(data);
}

function updateScope(transaction : NodeMaster.Transaction) {

	var publish = transaction.PublishList,
		remove = transaction.RemoveList;

	if (remove) {
		publish.HelpBeaconList.forEach(function(HelpBeacon) {
			delete scope.HelpBeaconStore[HelpBeacon.ID];
		});
		publish.IncidentObjectList.forEach(function(IncidentObject) {
			delete scope.IncidentObjectStore[IncidentObject.ID];
		});
		publish.MediaList.forEach(function(Media) {
			delete scope.MediaStore[Media.ID];
		});
		publish.MessengerList.forEach(function(Messenger) {
			delete scope.MessengerStore[Messenger.ID];
		});
		publish.PatientList.forEach(function(Patient) {
			delete scope.PatientStore[Patient.ID];
		});
		publish.ResourceMobilizationList.forEach(function(ResourceMobilization) {
			delete scope.ResourceMobilizationStore[ResourceMobilization.ID];
		});
		publish.ResourceStatusList.forEach(function(ResourceStatus) {
			delete scope.ResourceStatusStore[ResourceStatus.ID];
		});
	}

	if (publish) {
		publish.HelpBeaconList.forEach(function(HelpBeacon) {
			var data = scope.HelpBeaconStore[HelpBeacon.ID];
			if (data) {
				updateProperties(HelpBeacon, data);
			} else {
				scope.HelpBeaconStore[HelpBeacon.ID] = HelpBeacon;
			}
		});
		publish.IncidentObjectList.forEach(function(IncidentObject) {
			var data = scope.IncidentObjectStore[IncidentObject.ID];
			if (data) {
				updateProperties(IncidentObject, data);
			} else {
				scope.IncidentObjectStore[IncidentObject.ID] = IncidentObject;
			}
		});
		publish.MediaList.forEach(function(Media) {
			var data = scope.MediaStore[Media.ID];
			if (data) {
				updateProperties(Media, data);
			} else {
				scope.MediaStore[Media.ID] = Media;
			}
		});
		publish.MessengerList.forEach(function(Messenger) {
			var data = scope.MessengerStore[Messenger.ID];
			if (data) {
				updateProperties(Messenger, data);
			} else {
				scope.MessengerStore[Messenger.ID] = Messenger;
			}
		});
		publish.PatientList.forEach(function(Patient) {
			var data = scope.PatientStore[Patient.ID];
			if (data) {
				updateProperties(Patient, data);
			} else {
				scope.PatientStore[Patient.ID] = Patient;
			}
		});
		publish.ResourceMobilizationList.forEach(function(ResourceMobilization) {
			var data = scope.ResourceMobilizationStore[ResourceMobilization.ID];
			if (data) {
				updateProperties(ResourceMobilization, data);
			} else {
				scope.ResourceMobilizationStore[ResourceMobilization.ID] = ResourceMobilization;
			}
		});
		publish.ResourceStatusList.forEach(function(ResourceStatus) {
			var data = scope.ResourceStatusStore[ResourceStatus.ID];
			if (data) {
				updateProperties(ResourceStatus, data);
			} else {
				scope.ResourceStatusStore[ResourceStatus.ID] = ResourceStatus;
			}
		});
	}

	return transaction;
}

wsi.on('message', function(data : NodeBuffer) {

	var transaction = parseTransaction(data);

	// Prevent infinite loops
	// And don't save timemachine packets, it doesn't make sense :-)
	if (transaction.SenderID=="TimeMachine") {
		return;
	}

	updateScope(transaction);

	somethingChanged = true;

});

setInterval(function() {
	if (somethingChanged) {
		// Construct a wonderful transaction to store in the database
		var transactionToStore = new protoTransaction();
		transactionToStore.SenderID = ""; // space efficienty
		transactionToStore.PublishList = new protoTransaction.Content();

		transactionToStore.PublishList.HelpBeaconList = StoreToList(scope.HelpBeaconStore);
		transactionToStore.PublishList.IncidentObjectList = StoreToList(scope.IncidentObjectStore);
		transactionToStore.PublishList.MediaList = StoreToList(scope.MediaStore);
		transactionToStore.PublishList.MessengerList = StoreToList(scope.MessengerStore);
		transactionToStore.PublishList.PatientList = StoreToList(scope.PatientStore);
		transactionToStore.PublishList.ResourceMobilizationList = StoreToList(scope.ResourceMobilizationStore);
		transactionToStore.PublishList.ResourceStatusList = StoreToList(scope.ResourceStatusStore);

		// Store it in the database <3
		insertDb.run(+new Date, transactionToStore.toBuffer());

		somethingChanged = false;
	}
}, 1000); // Record each second

function setTransaction(buffer : NodeBuffer) {
	var transaction = protoTransaction.decode(buffer);
	transaction.SenderID = "TimeMachine";

	transaction.RemoveList = new protoTransaction.Content();

	if (transaction.PublishList) {

		// Beacons
		var newBeaconsID = {};
		transaction.PublishList.HelpBeaconList.forEach(function(HelpBeacon) {
			newBeaconsID[HelpBeacon.ID] = true;
		});

		for (var ID in scope.HelpBeaconStore) {
			if (!newBeaconsID[ID]) {
				transaction.RemoveList.HelpBeaconList.push(scope.HelpBeaconStore[ID]);
			}
		}

		// Incidents
		var IncidentObjetsID = {};
		transaction.PublishList.IncidentObjectList.forEach(function(IncidentObject) {
			IncidentObjetsID[IncidentObject.ID] = true;
		});

		for (var ID in scope.IncidentObjectStore) {
			if (!IncidentObjetsID[ID]) {
				transaction.RemoveList.IncidentObjectList.push(scope.IncidentObjectStore[ID]);
			}
		}

		// Media
		var mediasID = {};
		transaction.PublishList.MediaList.forEach(function(Media) {
			mediasID[Media.ID] = true;
		});

		for (var ID in scope.MediaStore) {
			if (!mediasID[ID]) {
				transaction.RemoveList.MediaList.push(scope.MediaStore[ID]);
			}
		}

		//  Messengers
		var messengersID = {};
		transaction.PublishList.MessengerList.forEach(function(Messenger) {
			messengersID[Messenger.ID] = true;
		});

		for (var ID in scope.MessengerStore) {
			if (!messengersID[ID]) {
				transaction.RemoveList.MessengerList.push(scope.MessengerStore[ID]);
			}
		}

		// Patients
		var patientsID = {};
		transaction.PublishList.PatientList.forEach(function(Patient) {
			patientsID[Patient.ID] = true;
		});

		for (var ID in scope.PatientStore) {
			if (!patientsID[ID]) {
				transaction.RemoveList.PatientList.push(scope.PatientStore[ID]);
			}
		}

		// Resources mobizilation
		var resourceMobilizationsID = {};
		transaction.PublishList.ResourceMobilizationList.forEach(function(ResourceMobilization) {
			resourceMobilizationsID[ResourceMobilization.ID] = true;
		});

		for (var ID in scope.ResourceMobilizationStore) {
			if (!resourceMobilizationsID[ID]) {
				transaction.RemoveList.ResourceMobilizationList.push(scope.ResourceMobilizationStore[ID]);
			}
		}

		// Resources status
		var resourceStatusID = {};
		transaction.PublishList.ResourceStatusList.forEach(function(ResourceStatus) {
			resourceStatusID[ResourceStatus.ID] = true;
		});

		for (var ID in scope.ResourceStatusStore) {
			if (!resourceStatusID[ID]) {
				transaction.RemoveList.ResourceStatusList.push(scope.ResourceStatusStore[ID]);
			}
		}
	}

	updateScope(transaction);

	somethingChanged = false;
	wsi.send(transaction.toBuffer());
}

var currentTime = +new Date(),
	lastRecordTime = 0,
	playTimeout = 0,
	isPlaying = false,
	speed = 300;

setInterval(function() {
	if (isPlaying) {
		currentTime += speed;

		findDb.get(currentTime, function(error, row) {
			if (lastRecordTime != row.datetime) {
				currentTime = row.datetime;
				lastRecordTime = row.datetime;	

				setTransaction(row.scope);
			}
		});
	}
}, speed);

// Express <3
var app = express();

app.get('/history/:precision', function(req, res) {
	var result = [],
		precision = parseInt(req.params.precision),
		oldTime = 0;

	historyDb.each(function(error, row){
		if (row.d - oldTime > precision) {
			oldTime = row.d;
			result.push(row);
		}
	}, function() {
		res.send(result);
		historyDb.reset();
	});
}).get('/infos', function(req, res) {
	infosDb.get(function(error, row){
		res.send(row);
		infosDb.reset();
	});
}).get('/get/:datetime', function(req, res) {
	findDb.get(parseInt(req.params.datetime), function(error, row) {
		res.send(row);
	});
}).get('/set/:datetime', function(req, res) {
	findDb.get(parseInt(req.params.datetime), function(error, row) {
		currentTime = row.datetime;
		setTransaction(row.scope);
		res.send("ok");
	});
}).get('/play', function(req, res) {
	isPlaying = true;
	res.send("ok");
}).get('/pause', function(req, res) {
	isPlaying = false;
	res.send("ok");
}).get('/playpause', function(req, res) {
	isPlaying = !isPlaying;
	res.send(isPlaying ? "pause" : "play");
});

app.use(express.static('recorder_public'));
app.use(express.compress());

app.listen(4253);