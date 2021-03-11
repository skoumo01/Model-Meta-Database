'use strict';
const express = require('express');
const execFile = require('child_process').execFile;
const http = require('http')
const fs = require('fs')
const HashMap = require('hashmap');
var app = express();
var submit_tx_map = new HashMap();
var submit_token_map = new HashMap();

app.use(express.json({limit: '500mb'}));
app.use(express.urlencoded({limit: '500mb', extended: true }));

//////////////////////////////////////////////BLOCKCHAIN CLIENT///////////////////////////////////////////////
const Client = require('fabric-client');
const { exit } = require('process');

const ORG_NAME = 'org1';
const USER_NAME = 'Admin';
const PEER_NAME = 'peer0.org1.example.com';
const CHANNEL_NAME = 'mychannel';
const CHAINCODE_ID = 'contract_models';
var TOKEN = '';
var MODEL_ID = '';    
var TAG1 = '';
var TAG2 = '';
var IS_BOUNDED = '';
var MIN_TIMESTAMP = '';
var MAX_TIMESTAMP = '';
var PAGE_SIZE = '';
var BOOKMARK = '';

// Constants for profile
const CONNECTION_PROFILE_PATH = './profiles/dev-connect.yaml';

var CLIENT_CONNECTION_PROFILE_PATH;
// Client section configuration
if (ORG_NAME === 'org1') {
    CLIENT_CONNECTION_PROFILE_PATH = './profiles/org1-client.yaml';
} else if (ORG_NAME === 'org2') {
    CLIENT_CONNECTION_PROFILE_PATH = './profiles/org2-client.yaml';
} else {
    console.log("Exiting : Ivalid Organization name");
    exit(0);
}


// Variable to hold the client
var client = {}
// Variable to hold the channel
var channel = {}

async function submitModel(model_id, tx_data) {

    let peerName = channel.getChannelPeer(PEER_NAME)

    var tx_id = client.newTransactionID();
    let tx_id_string = tx_id.getTransactionID();
    
    var request = {
        targets: peerName,
        chaincodeId: CHAINCODE_ID,
        fcn: 'SubmitModelEntry',
        args: [TOKEN, model_id, JSON.stringify(tx_data)],
        chainId: CHANNEL_NAME,
        txId: tx_id
    };


    console.log("#1 Transaction proposal successfully sent to channel.")
    try{
        let results = await channel.sendTransactionProposal(request);
        
        // Array of proposal responses
        var proposalResponses = results[0];

        var proposal = results[1];

        var all_good = true;
        for (var i in proposalResponses) {
            let good = false
            if (proposalResponses && proposalResponses[i].response &&
                proposalResponses[i].response.status === 200) {
                good = true;
                console.log(`\tChaincode invocation proposal response #${i} was good`);
            } else {
                console.log(`\tChaincode invocation proposal response #${i} was bad!`);
            }
            all_good = all_good & good
        }
        console.log("#2 Looped through the proposal responses all_good=", all_good)

        await setupTxListener(tx_id_string, 'model')
        console.log('#3 Registered the Tx Listener')

        var orderer_request = {
            txId: tx_id,
            proposalResponses: proposalResponses,
            proposal: proposal
        };

        await channel.sendTransaction(orderer_request);
        console.log("#4 Transaction has been submitted.")

    }catch{
        submit_tx_map.set(MODEL_ID, {is_completed: 'true', status: 'UNAUTHORIZED'});
        return
    }
    

}

async function getLatest(model_id) {

    let peerName = channel.getChannelPeer(PEER_NAME)

    let request = {
         targets: peerName,
         chaincodeId: CHAINCODE_ID,
         fcn: 'GetLatestVersion',
         args: [TOKEN, model_id]
     };

    // send the query proposal to the peer
    var response = await channel.queryByChaincode(request);
    return response.toString();
     
}

async function getHistory(model_id, is_bounded, min_timestamp, max_timestamp) {

    let peerName = channel.getChannelPeer(PEER_NAME)

    let request = {
         targets: peerName,
         chaincodeId: CHAINCODE_ID,
         fcn: 'GetVersionRange',
         args: [TOKEN, model_id, is_bounded, min_timestamp, max_timestamp]
     };

     // send the query proposal to the peer
    let response = await channel.queryByChaincode(request);
    if (response.toString() === 'false'){
        throw new Error('Error: error in simulation: transaction returned with failure: Error: The Model ' + model_id + ' does not exist');
    }else{
        return response.toString();
    }
 
}

async function queryAdHoc(query_string, page_size, bookmark) {

    let peerName = channel.getChannelPeer(PEER_NAME)

    let request = {
         targets: peerName,
         chaincodeId: CHAINCODE_ID,
         fcn: 'QueryModelsWithPagination',
         args: [TOKEN, query_string, page_size, bookmark]
     };

     // send the query proposal to the peer
    let response = await channel.queryByChaincode(request);
    return response.toString();

}

async function checkToken() {

    let peerName = channel.getChannelPeer(PEER_NAME)

    let request = {
         targets: peerName,
         chaincodeId: CHAINCODE_ID,
         fcn: 'CheckClientToken',
         args: [TOKEN]
     };

     // send the query proposal to the peer
    let response = await channel.queryByChaincode(request);
    return response.toString();
}

async function createToken() {

    let peerName = channel.getChannelPeer(PEER_NAME)

    var tx_id = client.newTransactionID();
    let tx_id_string = tx_id.getTransactionID();
    
    var request = {
        targets: peerName,
        chaincodeId: CHAINCODE_ID,
        fcn: 'CreateClientToken',
        args: [TOKEN],
        chainId: CHANNEL_NAME,
        txId: tx_id
    };


    //console.log("#1 Transaction proposal successfully sent to channel.")
    try{
        let results = await channel.sendTransactionProposal(request);
        
        // Array of proposal responses
        var proposalResponses = results[0];

        var proposal = results[1];

        var all_good = true;
        for (var i in proposalResponses) {
            let good = false
            if (proposalResponses && proposalResponses[i].response &&
                proposalResponses[i].response.status === 200) {
                good = true;
                //console.log(`\tChaincode invocation proposal response #${i} was good`);
            } else {
                //console.log(`\tChaincode invocation proposal response #${i} was bad!`);
            }
            all_good = all_good & good
        }
        //console.log("#2 Looped through the proposal responses all_good=", all_good)

        await setupTxListener(tx_id_string, 'token')
        //console.log('#3 Registered the Tx Listener')

        var orderer_request = {
            txId: tx_id,
            proposalResponses: proposalResponses,
            proposal: proposal
        };

        await channel.sendTransaction(orderer_request);
        //console.log("#4 Transaction has been submitted.")

    }catch{
        //console.log('(Error: Failed to complete the transaction lifecycle procedure. '+
         //               'Please ensure that the provided connection data is valid.')
        exit(0);
    }
    
}

async function getTag1(tag1, page_size, bookmark){
    return await queryAdHoc('{"selector":{"tag1":"' + tag1 + '"}}', page_size, bookmark);
}
async function getTag2(tag2, page_size, bookmark){
    return await queryAdHoc('{"selector":{"tag2":"' + tag2 + '"}}', page_size, bookmark);
}
async function getTag12(tag1, tag2, page_size, bookmark){
    return await queryAdHoc('{"selector":{"$and":[{"tag1":"' + tag1 + '"},{"tag2":"' + tag2 + '"}]}}', page_size, bookmark);
}

async function setupTxListener(tx_id_string, type) {

    try{
        let event_hub = channel.getChannelEventHub(PEER_NAME);

        event_hub.registerTxEvent(tx_id_string, (tx, code, block_num) => {
                    
            console.log("#5 Received Tx Event")
            console.log('The chaincode invoke chaincode transaction has been committed on peer %s', event_hub.getPeerAddr());
            console.log('Transaction %s is in block %s', tx, block_num);
            
            if (code !== 'VALID') {
                if (type === 'token'){
                    submit_token_map.set(TOKEN, {is_completed: 'true', status: 'INVALID'});
                }else{
                    submit_tx_map.set(MODEL_ID, {is_completed: 'true', status: 'INVALID'});
                }           
            }

            if (type === 'token'){
                submit_token_map.set(TOKEN, {is_completed: 'true', status: 'VALID'});
            }else{
                submit_tx_map.set(MODEL_ID, {is_completed: 'true', status: 'VALID'});
            } 
            
           //console.log(JSON.stringify(response));
        },
            // 3. Callback for errors
            (err) => {
                return JSON.stringify({});
                //console.log(err);
            },
            { unregister: true, disconnect: true }
        );

        event_hub.connect();
    }catch{
        throw new Error('Listener Error.')
    }
}

async function setupClient() {

    const client = Client.loadFromConfig(CONNECTION_PROFILE_PATH)

    client.loadFromConfig(CLIENT_CONNECTION_PROFILE_PATH)

    await client.initCredentialStores()
        .then((done) => {
            console.log("initCredentialStore(): ", done)
        })

    let userContext = await client.loadUserFromStateStore(USER_NAME)
    if (userContext == null) {
        throw new Error("User NOT found in credstore: " + USER_NAME)
    }

    client.setUserContext(userContext, true)

    return client
}

async function setupChannel() {

    
    try {
        channel = await client.getChannel(CHANNEL_NAME, true)
    } catch (e) {
        throw new Error("Could NOT create channel: " + CHANNEL_NAME)
    }

    return channel
}


/////////////////////////////////////////////////REST SERVER/////////////////////////////////////////////////////


app.post('/token', async function(req, res, next){

    if (!req.body.hasOwnProperty('token')){
        res.status(400).send({'message':'Bad Request Error: Query parameter "token" is missing.'});
        return
    }
 
    TOKEN = req.body.token;
    
    // creates a new client token; i.e. authorizes a new client
    try {
        submit_token_map.set(TOKEN, {is_completed: 'false', status: 'PENDING'});
        await createToken();        
        res.status(200).send({'message':'OK'});
        return
    }catch(e){
        console.log(e);
        submit_token_map.set(TOKEN, {is_completed: 'false', status: 'ERROR'});
        res.status(500).send({'message':'Internal Server Error: Failed to create token ' + TOKEN + '.'});
        return
    }
   
});

app.put('/submit', async function (req, res, next){

    if (!req.body.hasOwnProperty('token')){
        res.status(400).send({'message':'Bad Request Error: Property "token" is missing from request body.'});
        return
    }
    TOKEN = req.body.token;
 

    if (!req.body.hasOwnProperty('data')){
        res.status(400).send({'message':'Bad Request Error: Property "data" is missing from request body.'});
        return
    }
    if (!req.body.data.hasOwnProperty('id') || !req.body.data.hasOwnProperty('tag1')
        || !req.body.data.hasOwnProperty('tag2') || !req.body.data.hasOwnProperty('serialization_encoding')
        || !req.body.data.hasOwnProperty('model') || !req.body.data.hasOwnProperty('weights')
        || !req.body.data.hasOwnProperty('initialization') || !req.body.data.hasOwnProperty('checkpoints')){
        res.status(400).send({'message':'Bad Request Error: Ensure all the required json properties are provided.'});
        return
    }
    MODEL_ID = req.body.data.id;

    var Tx = {};
    Tx.tag1 = req.body.data.tag1;
    Tx.tag2 = req.body.data.tag2;
    Tx.serialization_encoding = req.body.data.serialization_encoding;
    Tx.model = req.body.data.model;
    Tx.weights = req.body.data.weights;
    Tx.initialization = req.body.data.initialization;
    Tx.checkpoints = req.body.data.checkpoints;
    
    try {
        submit_tx_map.set(MODEL_ID, {is_completed: 'false', status: 'PENDING'});
        await submitModel(MODEL_ID, Tx);
        res.status(200).send({'message':'OK'});
    }catch(e){
        console.log(e);
        submit_tx_map.set(MODEL_ID, {is_completed: 'false', status: 'ERROR'});
        res.status(500).send({'message':'Internal Server Error: Failed to submit model ' + MODEL_ID + '.'});
        return
    }

});

app.get('/check', async function(req, res, next){

    if (req.query.hasOwnProperty('token')){    
        TOKEN = req.query.token;

        try {
            let response = await checkToken();
            if (response.includes('false')){
                res.status(401).send({'message':'Unauthorized: authorization not granded: token ' + TOKEN
                                        +' is invalid'});
                return
            }
            if (!req.query.hasOwnProperty('id')){
                res.status(400).send({'message':'Bad Request Error: Ensure query parameter "id" is provided.'});
                    return
            }
            MODEL_ID = req.query.id;
            if (!submit_tx_map.has(MODEL_ID)){
                res.status(404).send({'message':'Not Found: Model with id "' + MODEL_ID + '" does not exist.'});
                return
            }
            res.status(200).send(submit_tx_map.get(MODEL_ID));
        }catch(e){
            res.status(500).send({'message':'Internal Server Error: Failed to validate token ' + TOKEN + '.'});
            return
        }

    }else{
        res.status(400).send({'message':'Bad Request Error: Query parameter "token" is missing.'});
        return
    }

});

app.get("/latest/model", async function(req, res, next){

    if (req.query.hasOwnProperty('token')){    
        TOKEN = req.query.token;

        try {
            if (req.query.hasOwnProperty('id')){
                MODEL_ID = req.query.id;
                let response = await getLatest(MODEL_ID);
                if (response.includes('authorization')){
                    res.status(401).send({'message':'Unauthorized: authorization not granded: token ' + TOKEN
                                            +' is invalid'});
                    return
                }
                var ledger_entry = JSON.parse(response);
                res.status(200).send(ledger_entry);
            }else{
                res.status(400).send({'message':'Bad Request Error: Ensure valid query parameters are provided.'});
            }
        }catch(e){
            res.status(404).send({'message':'Not Found: Model with id "' + MODEL_ID + '" does not exist.'});
            return
        }

    }else{
        res.status(400).send({'message':'Bad Request Error: Ensure query parameter "token" is provided.'});
        return
    }

});

app.get("/latest/tags", async function(req, res, next){

    if (req.query.hasOwnProperty('token')){    
        TOKEN = req.query.token;

        if (!req.query.hasOwnProperty('page_size') || !req.query.hasOwnProperty('bookmark')){        
            res.status(400).send({'message':'Bad Request Error: Ensure  valid "page_size" and "bookmark" query' +
                                    ' parameters are provided.'});
                return
        }
        PAGE_SIZE = req.query.page_size;
        BOOKMARK = req.query.bookmark;

        if (!req.query.hasOwnProperty('tag1') || !req.query.hasOwnProperty('tag2')){               
            res.status(400).send({'message':'Bad Request Error: Ensure valid query parameters are provided.'});
            return
        }
        TAG1 = req.query.tag1;
        TAG2 = req.query.tag2;

        try {          
            var results = await getTag12(TAG1, TAG2, PAGE_SIZE, BOOKMARK);

            try {
                results = JSON.parse(results);
            }catch{
                if (results.includes('authorization')){
                    res.status(401).send({'message':'Unauthorized: authorization not granded: token ' + TOKEN
                                            +' is invalid'});
                    return
                }         
                results = {"records" : []};
            }
            res.status(200).send(results);
        }catch(e){
            console.log(e);
            res.status(500).send({'message':'Internal Server Error: Failed to execute tag query.'});
            return
        }
    }else{
        res.status(400).send({'message':'Bad Request Error: Ensure query parameter "token" is provided.'});
        return
    }

});

app.get("/latest/tags/tag1", async function(req, res, next){

    if (req.query.hasOwnProperty('token')){    
        TOKEN = req.query.token;

        if (!req.query.hasOwnProperty('page_size') || !req.query.hasOwnProperty('bookmark')){        
            res.status(400).send({'message':'Bad Request Error: Ensure  valid "page_size" and "bookmark" query' +
                                    ' parameters are provided.'});
                return
        }
        PAGE_SIZE = req.query.page_size;
        BOOKMARK = req.query.bookmark;

        if (!req.query.hasOwnProperty('tag1')){               
            res.status(400).send({'message':'Bad Request Error: Ensure valid query parameters are provided.'});
            return
        }
        TAG1 = req.query.tag1;

        try {          
            var results = await getTag1(TAG1, PAGE_SIZE, BOOKMARK);

            try {
                results = JSON.parse(results);
            }catch{
                if (results.includes('authorization')){
                    res.status(401).send({'message':'Unauthorized: authorization not granded: token ' + TOKEN
                                            +' is invalid'});
                    return
                }         
                results = {"records" : []};
            }
            res.status(200).send(results);
        }catch(e){
            console.log(e);
            res.status(500).send({'message':'Internal Server Error: Failed to execute tag query.'});
            return
        }
    }else{
        res.status(400).send({'message':'Bad Request Error: Ensure query parameter "token" is provided.'});
        return
    }

});

app.get("/latest/tags/tag2",async function(req, res, next){

    if (req.query.hasOwnProperty('token')){    
        TOKEN = req.query.token;

        if (!req.query.hasOwnProperty('page_size') || !req.query.hasOwnProperty('bookmark')){        
            res.status(400).send({'message':'Bad Request Error: Ensure  valid "page_size" and "bookmark" query' +
                                    ' parameters are provided.'});
                return
        }
        PAGE_SIZE = req.query.page_size;
        BOOKMARK = req.query.bookmark;

        if (!req.query.hasOwnProperty('tag2')){               
            res.status(400).send({'message':'Bad Request Error: Ensure valid query parameters are provided.'});
            return
        }
        TAG2 = req.query.tag2;

        try {          
            var results = await getTag2(TAG2, PAGE_SIZE, BOOKMARK);

            try {
                results = JSON.parse(results);
            }catch{
                if (results.includes('authorization')){
                    res.status(401).send({'message':'Unauthorized: authorization not granded: token ' + TOKEN
                                            +' is invalid'});
                    return
                }         
                results = {"records" : []};
            }
            res.status(200).send(results);
        }catch(e){
            console.log(e);
            res.status(500).send({'message':'Internal Server Error: Failed to execute tag query.'});
            return
        }
    }else{
        res.status(400).send({'message':'Bad Request Error: Ensure query parameter "token" is provided.'});
        return
    }

});

app.get("/history", async function(req, res, next){

    if (!req.query.hasOwnProperty('token')){
        res.status(400).send({'message':'Bad Request Error: Ensure query parameter "token" is provided.'});
            return
    }
    
    if (!req.query.hasOwnProperty('id') || !req.query.hasOwnProperty('bounded')){        
        res.status(400).send({'message':'Bad Request Error: Ensure  valid "page_size" and "bookmark" query' +
                                ' parameters are provided.'});
            return
    }

    TOKEN = req.query.token;
    MODEL_ID = req.query.id;
    IS_BOUNDED = req.query.bounded;
    if (!(IS_BOUNDED === 'true') && !(IS_BOUNDED === 'false')){
        res.status(400).send({'message':'Bad Request Error: Invalid assignment to property "bounded".\nMust provide "true" or "false".'});
        return
    }


    if (IS_BOUNDED === 'true'){
        if (!req.query.hasOwnProperty('min') || !req.query.hasOwnProperty('max')){
            res.status(400).send({'message':'Bad Request Error: Query arameters "min" and/or "max" is/are missing.'});
            return
        }
        MIN_TIMESTAMP = req.query.min;
        MAX_TIMESTAMP = req.query.max;
        if (isNaN(MIN_TIMESTAMP) || isNaN(MAX_TIMESTAMP) || (parseInt(MAX_TIMESTAMP, 10) < parseInt(MIN_TIMESTAMP, 10))
             || (parseInt(MAX_TIMESTAMP, 10) <= 0) || (parseInt(MIN_TIMESTAMP, 10) <= 0)){
            res.status(400).send({'message':'Bad Request Error: Invalid assignment to property "min" and/or "max".\n'+
                                'Must provide a timestamp with an accuracy of seconds.'});
            return
        }
    }

    try {          
        var history = await getHistory(MODEL_ID, IS_BOUNDED, MIN_TIMESTAMP, MAX_TIMESTAMP);
        try{
            history = JSON.parse(history);
        }catch{
            if (history.includes('authorization')){
                res.status(401).send({'message':'Unauthorized: authorization not granded: token ' + TOKEN
                                        +' is invalid'});
                return
            }
            history = [];
        }
        res.status(200).send(history);
    }catch(e){
        console.log(e);
        res.status(500).send({'message':'Internal Server Error: Failed to retrieve history.'});
        return
    }
        
});


async function main() {
   
    client = await setupClient();
    channel = await setupChannel();

    let shard1 = fs.readFileSync('./data/TF/TFjs/group1-shard1of3.bin', {encoding: 'base64'});
	let shard2 = fs.readFileSync('./data/TF/TFjs/group1-shard2of3.bin', {encoding: 'base64'});
	let shard3 = fs.readFileSync('./data/TF/TFjs/group1-shard3of3.bin', {encoding: 'base64'});
	let model = fs.readFileSync('./data/TF/TFjs/model.json', {encoding: 'base64'});
	
    MODEL_ID = "id_11";
    TOKEN = "token";
    var Tx = {};
    Tx.tag1 = "tag1";
    Tx.tag2 = "tag2";
    Tx.serialization_encoding = "base64"; //4MB x8, 0.7MB
    Tx.model = [
            {
                "metadata":
                {
                    "identifier":"group1-shard1of3",
                    "original_format":"bin"
                },
                "serialized_data": shard1
            },
            {
                "metadata":
                {
                    "identifier":"group1-shard1of3",
                    "original_format":"bin"
                },
                "serialized_data": shard1
            },
            {
                "metadata":
                {
                    "identifier":"group1-shard1of3",
                    "original_format":"bin"
                },
                "serialized_data": shard1
            },
            {
                "metadata":
                {
                    "identifier":"group1-shard2of3",
                    "original_format":"bin"
                },
                "serialized_data": shard2
            },
            {
                "metadata":
                {
                    "identifier":"group1-shard3of3",
                    "original_format":"bin"
                },
                "serialized_data": shard3
            },
            {
                "metadata":
                {
                    "identifier":"group1-shard4of3",
                    "original_format":"bin"
                },
                "serialized_data": shard3
            },
            {
                "metadata":
                {
                    "identifier":"group1-shard5of3",
                    "original_format":"bin"
                },
                "serialized_data": shard3
            },
            {
                "metadata":
                {
                    "identifier":"group1-shard6of3",
                    "original_format":"bin"
                },
                "serialized_data": shard3
            },
            {
                "metadata":
                {
                    "identifier":"model",
                    "original_format":"json"
                },
                "serialized_data": model
            }
        ];
    Tx.weights = [];
    Tx.initialization = [];
    Tx.checkpoints = [];

    await submitModel(MODEL_ID, Tx);
}

if (require.main === module){
    main();
}


async function tflite_example(){
	
	client = await setupClient();
    channel = await setupChannel();

    let model_tflite = fs.readFileSync('./data/TF/TFLite/lite-model_spice_1.tflite', {encoding: 'base64'});
	
    MODEL_ID = "id_00";
    TOKEN = "token";
    var Tx = {};
    Tx.tag1 = "tag1";
    Tx.tag2 = "tag2";
    Tx.serialization_encoding = "base64";
    Tx.model = [{
            "metadata":
            {
                "identifier":"lite-model_spice_1",
                "original_format":"tflite"
            },
            "serialized_data": model_tflite
        }];
    Tx.weights = [];
    Tx.initialization = [];
    Tx.checkpoints = [];

    await submitModel(MODEL_ID, Tx);
}

async function tfjs_example(){ 

	client = await setupClient();
    channel = await setupChannel();

    let shard1 = fs.readFileSync('./data/TF/TFjs/group1-shard1of3.bin', {encoding: 'base64'});
	let shard2 = fs.readFileSync('./data/TF/TFjs/group1-shard2of3.bin', {encoding: 'base64'});
	let shard3 = fs.readFileSync('./data/TF/TFjs/group1-shard3of3.bin', {encoding: 'base64'});
	let model = fs.readFileSync('./data/TF/TFjs/model.json', {encoding: 'base64'});
	
    MODEL_ID = "id_01";
    TOKEN = "token";
    var Tx = {};
    Tx.tag1 = "tag1";
    Tx.tag2 = "tag2";
    Tx.serialization_encoding = "base64";
    Tx.model = [
            {
                "metadata":
                {
                    "identifier":"group1-shard1of3",
                    "original_format":"bin"
                },
                "serialized_data": shard1
            },
            {
                "metadata":
                {
                    "identifier":"group1-shard2of3",
                    "original_format":"bin"
                },
                "serialized_data": shard2
            },
            {
                "metadata":
                {
                    "identifier":"group1-shard3of3",
                    "original_format":"bin"
                },
                "serialized_data": shard3
            },
            {
                "metadata":
                {
                    "identifier":"model",
                    "original_format":"json"
                },
                "serialized_data": model
            }
        ];
    Tx.weights = [];
    Tx.initialization = [];
    Tx.checkpoints = [];

    await submitModel(MODEL_ID, Tx);
}

async function tf_saved_model_example_normal(){// ~90 MB: error: [Channel.js]: sendTransaction - no valid endorsements found

	client = await setupClient();
    channel = await setupChannel();

    let var1 = fs.readFileSync('./data/TF/SavedModel/normal/variables/variables.data-00000-of-00001', {encoding: 'base64'});
	let var2 = fs.readFileSync('./data/TF/SavedModel/normal/variables/variables.index', {encoding: 'base64'});
	let saved_model = fs.readFileSync('./data/TF/SavedModel/normal/saved_model.pb', {encoding: 'base64'});

    MODEL_ID = "id_02";
    TOKEN = "token";
    var Tx = {};
    Tx.tag1 = "tag1";
    Tx.tag2 = "tag2";
    Tx.serialization_encoding = "base64";
    Tx.model = [
        {
            "metadata":
            {
                "identifier":"saved_model",
                "original_format":"pb"
            },
            "serialized_data": saved_model
        }
    ];
    Tx.weights = [];
    Tx.initialization = [];
    Tx.checkpoints = [
        {
            "metadata":
            {
                "identifier":"variables",
                "original_format":"data-00000-of-00001"
            },
            "serialized_data": var1
        },
        {
            "metadata":
            {
                "identifier":"variables",
                "original_format":"index"
            },
            "serialized_data": var2
        }				
    ];

    await submitModel(MODEL_ID, Tx);
}

async function tf_saved_model_example_big(){ // ~400 MB: error: [Channel.js]: sendTransaction - no valid endorsements found
	
	client = await setupClient();
    channel = await setupChannel();

    let vocab = fs.readFileSync('./data/TF/SavedModel/big/assets/vocab.txt', {encoding: 'base64'});
	let var1 = fs.readFileSync('./data/TF/SavedModel/big/variables/variables.data-00000-of-00001', {encoding: 'base64'});
	let var2 = fs.readFileSync('./data/TF/SavedModel/big/variables/variables.index', {encoding: 'base64'});
	let saved_model = fs.readFileSync('./data/TF/SavedModel/big/saved_model.pb', {encoding: 'base64'});
	let tfhub_module = fs.readFileSync('./data/TF/SavedModel/big/tfhub_module.pb', {encoding: 'base64'});

    MODEL_ID = "id_03";
    TOKEN = "token";
    var Tx = {};
    Tx.tag1 = "tag1";
    Tx.tag2 = "tag2";
    Tx.serialization_encoding = "base64";
    Tx.model = [
        {
            "metadata":
            {
                "identifier":"saved_model",
                "original_format":"pb"
            },
            "serialized_data": saved_model
        },
        {
            "metadata":
            {
                "identifier":"tfhub_module",
                "original_format":"pb"
            },
            "serialized_data": tfhub_module
        }
    ];
    Tx.weights = [];
    Tx.initialization = [
        {
            "metadata":
            {
                "identifier":"vocab",
                "original_format":"txt"
            },
            "serialized_data": vocab
        }
    ];
    Tx.checkpoints = [
        {
            "metadata":
            {
                "identifier":"variables",
                "original_format":"data-00000-of-00001"
            },
            "serialized_data": var1
        },
        {
            "metadata":
            {
                "identifier":"variables",
                "original_format":"index"
            },
            "serialized_data": var2
        }				
    ];

    await submitModel(MODEL_ID, Tx);
}

async function darknet_yolo(){ // ~200 MB: error: [Channel.js]: sendTransaction - no valid endorsements found
	
    client = await setupClient();
    channel = await setupChannel();

    let architecture = fs.readFileSync('./data/DarknetYOLO/yolov2-tiny.cfg', {encoding: 'base64'});
	let weights = fs.readFileSync('./data/DarknetYOLO/yolov2-tiny.weights', {encoding: 'base64'});
	
    MODEL_ID = "id_04";
    TOKEN = "token";
    var Tx = {};
    Tx.tag1 = "tag1";
    Tx.tag2 = "tag2";
    Tx.serialization_encoding = "base64";
    Tx.model = [
        {
            "metadata":
            {
                "identifier":"yolov2-tiny",
                "original_format":"cfg"
            },
            "serialized_data": architecture
        }
    ];
    Tx.weights = [
        {
            "metadata":
            {
                "identifier":"yolov2-tiny",
                "original_format":"weights"
            },
            "serialized_data": weights
        }
    ];
    Tx.initialization = [];
    Tx.checkpoints = [];

    await submitModel(MODEL_ID, Tx);
}

