'use strict';
const express = require('express');
const execFile = require('child_process').execFile;
const HashMap = require('hashmap');
var app = express();
var submit_tx_map = new HashMap();
var submit_token_map = new HashMap();
var cors = require('cors');

app.use(cors());
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
var MIN_TIMESTAMP = '';
var MAX_TIMESTAMP = '';
var PAGE_SIZE = '';
var BOOKMARK = '';
var LAST = '';

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

    console.log("#0 Transaction id is: " + tx_id_string)
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

        await setupTxListener(tx_id_string, 'model')//commented out for debugging
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

async function getHistory(model_id, min_timestamp, max_timestamp) {

    let peerName = channel.getChannelPeer(PEER_NAME)

    let request = {
         targets: peerName,
         chaincodeId: CHAINCODE_ID,
         fcn: 'GetVersionRange',
         args: [TOKEN, model_id, min_timestamp, max_timestamp]
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

    if (bookmark === "''" || bookmark === '""'){
        bookmark = '';
    }

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
    return await queryAdHoc('{"selector":{"tag1":"' + tag1 + '"}, "use_index":["_design/indexTag1", "indexTag1"]}', page_size, bookmark);
}
async function getTag2(tag2, page_size, bookmark){
    return await queryAdHoc('{"selector":{"tag2":"' + tag2 + '"}, "use_index":["_design/indexTag2", "indexTag2"]}', page_size, bookmark);
}
async function getTag12(tag1, tag2, page_size, bookmark){
    return await queryAdHoc('{"selector":{"$and":[{"tag1":"' + tag1 + '"},{"tag2":"' + tag2 + '"}]}, "use_index":["_design/indexTag12", "indexTag12"]}', page_size, bookmark);
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
            { unregister: true, disconnect: (true && (LAST === 'true')) }
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
                results = [];
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
                results = [];
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
                results = [];
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
    
    if (!req.query.hasOwnProperty('id')){        
        res.status(400).send({'message':'Bad Request Error: Ensure query parameter "id" is provided.'});
            return
    }

    TOKEN = req.query.token;
    MODEL_ID = req.query.id;
   
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
    

    try {          
        var history = await getHistory(MODEL_ID, MIN_TIMESTAMP, MAX_TIMESTAMP);
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
   
    //establish blockchain connection
    client = await setupClient();
    channel = await setupChannel();

    /*
    TOKEN = 'token';

    MODEL_ID = 'id_2';
    var Tx = {};
    Tx.tag1 = 'tag1';
    Tx.tag2 = 'tag2';
    Tx.serialization_encoding = 'serialization_encoding';
    Tx.model = [];
    Tx.weights = [];
    Tx.initialization = [];
    Tx.checkpoints = [];
    LAST = 'false';
    await submitModel(MODEL_ID, Tx);

    MODEL_ID = 'id_3';
    var meta = {};
    var metadata ={};
    metadata.identifier = "id";
    metadata.original_format = "format";
    meta.metadata = metadata;
    meta.serialized_data = "string";
    Tx.model = [meta];
    LAST = 'true';
    await submitModel(MODEL_ID, Tx);
    */

    
    //start REST server
    var server = app.listen(3000, function () {
        var host = server.address().address
        var port = server.address().port
        console.log("Example app listening at http://%s:%s", host, port)
    });
    

}

if (require.main === module){
    main();
}


