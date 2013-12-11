/// <reference path="./definitions/node.d.ts" />
/// <reference path="./definitions/NodeMaster.d.ts" />

var argv = require('optimist')
	.usage('Convert a ProtoBuf.js JSON description in TypeScript definitions.\nUsage: $0')
    .boolean('c')
    .alias('c', 'camelCaseGetSet')
    .describe('c', 'Generate getter and setters in camel case notation')
    .default('c', true)
    .boolean('u')
    .alias('u', 'underscoreGetSet')
    .describe('u', 'Generate getter and setters in underscore notation')
    .default('u', false)
    .boolean('p')
    .alias('p', 'properties')
    .describe('p', 'Generate properties')
    .default('p', true)
    .argv;


// Import in typescript and commondjs style
var ProtoBuf = require("protobufjs");
var WebSocket = require("ws");


var builder = ProtoBuf.protoFromFile("./definitions/NodeMaster.proto");
var protoTransaction : NodeMaster.TransactionBuilder =
	builder.build("NodeMaster.Transaction"),
	protoResourceStatus : NodeMaster.ResourceStatusModelBuilder =
	builder.build("NodeMaster.ResourceStatusModel"),
	protoPatientModel : NodeMaster.PatientModelBuilder =
	builder.build("NodeMaster.PatientModel");

var ws = new WebSocket("ws://localhost:8181/MasterTools");

ws.on('message', function(data : NodeBuffer, flags : any) {
	var transaction = protoTransaction.decode(data);

	var response = new protoTransaction();
	response.SenderID = "MasterTools";
	response.RemoveList = new protoTransaction.Content();

	if (transaction.PublishList) {
		transaction.PublishList.ResourceStatusList.forEach(function(a) {
			var r = new protoResourceStatus();
			r.ID = a.ID;
			response.RemoveList.ResourceStatusList.push(r);
		});

		transaction.PublishList.PatientList.forEach(function(a) {
			var r = new protoPatientModel();
			r.ID = a.ID;
			response.RemoveList.PatientList.push(r);
		});
	}

	console.log(response.RemoveList.ResourceStatusList.length);

	ws.send(response.toBuffer(), {binary:true, mask:true});

	process.exit(0);
});
