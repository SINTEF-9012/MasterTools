/// <reference path="./definitions/node.d.ts" />
/// <reference path="./definitions/NodeMaster.d.ts" />

// Import in typescript and commondjs style
var ProtoBuf = require("protobufjs");
var ws = require("ws");

var protoTransaction : NodeMaster.TransactionBuilder =
	ProtoBuf.protoFromFile("./definitions/NodeMaster.proto")
		.build("NodeMaster.Transaction");

var dataBase : {
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
		console.log(key); // TODO debug
		
		if (input[key] != null) {
			output[key] = input[key];
		}
	}
}

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
			delete dataBase.HelpBeaconStore[HelpBeacon.ID];
		});
		publish.IncidentObjectList.forEach(function(IncidentObject) {
			delete dataBase.IncidentObjectStore[IncidentObject.ID];
		});
		publish.MediaList.forEach(function(Media) {
			delete dataBase.MediaStore[Media.ID];
		});
		publish.MessengerList.forEach(function(Messenger) {
			delete dataBase.MessengerStore[Messenger.ID];
		});
		publish.PatientList.forEach(function(Patient) {
			delete dataBase.PatientStore[Patient.ID];
		});
		publish.ResourceMobilizationList.forEach(function(ResourceMobilization) {
			delete dataBase.ResourceMobilizationStore[ResourceMobilization.ID];
		});
		publish.ResourceStatusList.forEach(function(ResourceStatus) {
			delete dataBase.ResourceStatusStore[ResourceStatus.ID];
		});
	}

	if (publish) {
		publish.HelpBeaconList.forEach(function(HelpBeacon) {
			var data = dataBase.HelpBeaconStore[HelpBeacon.ID];
			if (data) {
				updateProperties(HelpBeacon, data);
			} else {
				dataBase.HelpBeaconStore[HelpBeacon.ID] = HelpBeacon;
			}
		});
		publish.IncidentObjectList.forEach(function(IncidentObject) {
			var data = dataBase.IncidentObjectStore[IncidentObject.ID];
			if (data) {
				updateProperties(IncidentObject, data);
			} else {
				dataBase.IncidentObjectStore[IncidentObject.ID] = IncidentObject;
			}
		});
		publish.MediaList.forEach(function(Media) {
			var data = dataBase.MediaStore[Media.ID];
			if (data) {
				updateProperties(Media, data);
			} else {
				dataBase.MediaStore[Media.ID] = Media;
			}
		});
		publish.MessengerList.forEach(function(Messenger) {
			var data = dataBase.MessengerStore[Messenger.ID];
			if (data) {
				updateProperties(Messenger, data);
			} else {
				dataBase.MessengerStore[Messenger.ID] = Messenger;
			}
		});
		publish.PatientList.forEach(function(Patient) {
			var data = dataBase.PatientStore[Patient.ID];
			if (data) {
				updateProperties(Patient, data);
			} else {
				dataBase.PatientStore[Patient.ID] = Patient;
			}
		});
		publish.ResourceMobilizationList.forEach(function(ResourceMobilization) {
			var data = dataBase.ResourceMobilizationStore[ResourceMobilization.ID];
			if (data) {
				updateProperties(ResourceMobilization, data);
			} else {
				dataBase.ResourceMobilizationStore[ResourceMobilization.ID] = ResourceMobilization;
			}
		});
		publish.ResourceStatusList.forEach(function(ResourceStatus) {
			var data = dataBase.ResourceStatusStore[ResourceStatus.ID];
			if (data) {
				updateProperties(ResourceStatus, data);
			} else {
				dataBase.ResourceStatusStore[ResourceStatus.ID] = ResourceStatus;
			}
		});
	}

	// TODO SQLITE3333
});