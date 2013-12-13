/// <reference path="./definitions/node.d.ts" />
/// <reference path="./definitions/NodeMaster.d.ts" />

// Import in typescript and commondjs style
var ProtoBuf = require("protobufjs");
var ws = require("ws");
var sqlite3 = require('sqlite3').verbose();

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
		if (!key.match(/^[sg]et/)) {
			console.log(key); // TODO debug
			
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
	findDb = db.prepare('SELECT datetime, scope FROM recorder WHERE ABS($time-datetime) = (select MIN(ABS($time - datetime)) from recorder)');

var protoTransaction : NodeMaster.TransactionBuilder =
	ProtoBuf.protoFromFile("./definitions/NodeMaster.proto")
		.build("NodeMaster.Transaction");

var wsi = new ws("ws://localhost:8181/MasterTools");

wsi.on('message', function(data : NodeBuffer, flags : any) {
	var transaction = protoTransaction.decode(data);

	// Prevent infinite loops
	// (just security when multiple instances are running)
	if (transaction.SenderID=="TimeMachine") {
		return;
	}

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
});