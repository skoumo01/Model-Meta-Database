'use strict';
const express = require('express');
const HashMap = require('hashmap');
const compressJSON = require('compress-json');
const chunker = require('buffer-chunks');
const MD5 = require('crypto-js/md5');
var app = express();
var submit_tx_map_meta = new HashMap();
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

async function submitMeta(tx_data) {

    let peerName = channel.getChannelPeer(PEER_NAME)

    var tx_id = client.newTransactionID();
    let tx_id_string = tx_id.getTransactionID();

    var request = {
        targets: peerName,
        chaincodeId: CHAINCODE_ID,
        fcn: 'SubmitMeta',
        args: [TOKEN, MODEL_ID, JSON.stringify(tx_data)],
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

        await setupTxListener(tx_id_string, 'meta')//commented out for debugging
        console.log('#3 Registered the Tx Listener')

        var orderer_request = {
            txId: tx_id,
            proposalResponses: proposalResponses,
            proposal: proposal
        };

        await channel.sendTransaction(orderer_request);
        console.log("#4 Transaction has been submitted.")

    }catch{
        submit_tx_map_meta.set(MODEL_ID, {is_completed: 'true', status: 'UNAUTHORIZED', pending: -1});
        return
    }
    

}

async function submitPage(tx_data) {

    let peerName = channel.getChannelPeer(PEER_NAME)

    var tx_id = client.newTransactionID();
    let tx_id_string = tx_id.getTransactionID();

    var request = {
        targets: peerName,
        chaincodeId: CHAINCODE_ID,
        fcn: 'SubmitPage',
        args: [TOKEN, MODEL_ID, JSON.stringify(tx_data)],
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

        await setupTxListener(tx_id_string, 'page')//commented out for debugging
        console.log('#3 Registered the Tx Listener')

        var orderer_request = {
            txId: tx_id,
            proposalResponses: proposalResponses,
            proposal: proposal
        };

        await channel.sendTransaction(orderer_request);
        console.log("#4 Transaction has been submitted.")

    }catch{
        submit_tx_map_meta.set(MODEL_ID, {is_completed: 'true', status: 'UNAUTHORIZED', pending: -1});
        return
    }
    

}

async function getLastModel(page_size, bookmark) {

    if (bookmark === "''" || bookmark === '""'){
        bookmark = '';
    }

    let peerName = channel.getChannelPeer(PEER_NAME)

    let request = {
         targets: peerName,
         chaincodeId: CHAINCODE_ID,
         fcn: 'QueryLatestModelWithPagination',
         args: [TOKEN, MODEL_ID, page_size.toString(), bookmark]
     };

     // send the query proposal to the peer
    let response = await channel.queryByChaincode(request);
    console.log(response.toString());
    //return response.toString();

}

async function getMeta() {

    let peerName = channel.getChannelPeer(PEER_NAME)

    let request = {
         targets: peerName,
         chaincodeId: CHAINCODE_ID,
         fcn: 'QueryMetaData',
         args: [TOKEN, MODEL_ID]
     };

    // send the query proposal to the peer
    var response = await channel.queryByChaincode(request);
    console.log(response.toString());
    //return response.toString();
     
}

async function queryAdHocMeta(query_string, page_size, bookmark) {

    if (bookmark === "''" || bookmark === '""'){
        bookmark = '';
    }

    let peerName = channel.getChannelPeer(PEER_NAME)

    let request = {
         targets: peerName,
         chaincodeId: CHAINCODE_ID,
         fcn: 'QueryMetaDataWithPagination',
         args: [TOKEN, query_string, page_size.toString(), bookmark]
     };

     // send the query proposal to the peer
    let response = await channel.queryByChaincode(request);
    return response.toString();

}

async function getTag1Meta(tag1, page_size, bookmark){
    let res = await queryAdHocMeta('{"selector":{"tag1":"' + tag1 + '"}, "use_index":["_design/indexTag1", "indexTag1"]}', page_size, bookmark);
    console.log(res);
    //return res
}
async function getTag2Meta(tag2, page_size, bookmark){
    let res = await queryAdHocMeta('{"selector":{"tag2":"' + tag2 + '"}, "use_index":["_design/indexTag2", "indexTag2"]}', page_size, bookmark);
    console.log(res);
    //return res
}
async function getTag12Meta(tag1, tag2, page_size, bookmark){
    let res = await queryAdHocMeta('{"selector":{"$and":[{"tag1":"' + tag1 + '"},{"tag2":"' + tag2 + '"}]}, "use_index":["_design/indexTag12", "indexTag12"]}', page_size, bookmark);
    console.log(res);
    //return res
}

/*
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

*/
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

async function setupTxListener(tx_id_string, type) {

    try{
        let event_hub = channel.getChannelEventHub(PEER_NAME);

        event_hub.registerTxEvent(tx_id_string, (tx, code, block_num) => {
                    
            console.log("#5 Received Tx Event")
            console.log('The chaincode invoke chaincode transaction has been committed on peer %s', event_hub.getPeerAddr());
            console.log('Transaction %s is in block %s', tx, block_num);
            
            if (code !== 'VALID') {
                submit_tx_map_meta.set(MODEL_ID, {is_completed: 'true', status: 'CORRUPTED', pending: -1});
            }

            
            let status = submit_tx_map_meta.get(MODEL_ID);
            if (status.status === 'PENDING'){
                let pending = status.pending - 1;
                if (pending === 0){
                    submit_tx_map_meta.set(MODEL_ID, {is_completed: 'true', status: 'VALID', pending: pending});
                }else{
                    submit_tx_map_meta.set(MODEL_ID, {is_completed: 'false', status: 'PENDING', pending: pending});
                }
            }

            if (type === 'meta'){
                console.log(MODEL_ID+'_metadata', submit_tx_map_meta.get(MODEL_ID))
            }else{
                console.log(MODEL_ID, submit_tx_map_meta.get(MODEL_ID))
            }
            
             
            
            
            //for (const [key, value] of submit_tx_map_meta.entries()) {
            //  console.log(key, value);
            //}
            
                        
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

    // create metadata page|entry
    var Tx_Meta = {};
    Tx_Meta.model_id = MODEL_ID;
    Tx_Meta.tag1 = req.body.data.tag1;
    Tx_Meta.tag2 = req.body.data.tag2;
    Tx_Meta.serialization_encoding = req.body.data.serialization_encoding;
    

    // create data pages
    var Tx_Pages = {};
    Tx_Pages.model = req.body.data.model;
    Tx_Pages.weights = req.body.data.weights;
    Tx_Pages.initialization = req.body.data.initialization;
    Tx_Pages.checkpoints = req.body.data.checkpoints;

    var all_pages = JSON.stringify(compressJSON.compress(Tx_Pages));
    var buf = Buffer.from(all_pages, 'utf8')
    let max_chunk_size = 50;
    var chunks = chunker(buf, max_chunk_size);
    var pages = [];
    for (let i = 0; i < chunks.length; i++){
        let Tx_Page = {
            model_id: MODEL_ID,
            page_id: i,
            page_bytes: chunks[i].length,
            data: chunks[i].toString(),
            digest: MD5(chunks[i]).toString()
        }   
        pages.push(Tx_Page);
    }
    Tx_Meta.page_number = pages.length;
   
    try {
        LAST = 'false';
        submit_tx_map_meta.set(MODEL_ID, {is_completed: 'false', status: 'PENDING', pending: pages.length+1});
        await submitMeta(Tx_Meta);
        for (let i = 0; i < pages.length; i++){
            if (i == pages.length-1){
                LAST = 'true';
            }
            await submitPage(pages[i]);
        }
        res.status(200).send({'message':'OK'});
    }catch(e){
        console.log(e);
        submit_tx_map_meta.set(MODEL_ID, {is_completed: 'false', status: 'ERROR', pending: -1});
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
            if (!submit_tx_map_meta.has(MODEL_ID)){
                res.status(404).send({'message':'Not Found: Model with id "' + MODEL_ID + '" does not exist.'});
                return
            }
            res.status(200).send(submit_tx_map_meta.get(MODEL_ID));
        }catch(e){
            res.status(500).send({'message':'Internal Server Error: Failed to validate token "' + TOKEN + '".'});
            return
        }

    }else{
        res.status(400).send({'message':'Bad Request Error: Query parameter "token" is missing.'});
        return
    }

});
/*
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
*/


async function main() {
   
    //establish blockchain connection
    client = await setupClient();
    channel = await setupChannel();

    
    //start REST server
    var server = app.listen(3000, function () {
        var host = server.address().address
        var port = server.address().port
        console.log("Example app listening at http://%s:%s", host, port)
    });
    
       
    return

    TOKEN = 'token';
    MODEL_ID = 'id_0';
        
    var TxMeta = {};
    TxMeta.model_id = MODEL_ID;
    TxMeta.tag1 = "tag1";
    TxMeta.tag2 = "tag2";
    TxMeta.serialization_encoding = "base64";
    
    
    var TxPage = {};
    TxPage.model_id = MODEL_ID;
    TxPage.page_id = 0;
    TxPage.data = "data0";
    TxPage.digest = "dummy digest 0";
    TxPage.page_bytes = 5
    
    
    var all_pages = JSON.stringify(compressJSON.compress(TxPage));
    var buf = Buffer.from(all_pages, 'utf8')
    let max_chunk_size = 50;
    var chunks = chunker(buf, max_chunk_size);
    var pages = [];
    for (let i = 0; i < chunks.length; i++){
        let Tx_Page = {
            model_id: MODEL_ID,
            page_id: i,
            page_bytes: chunks[i].length,
            data: chunks[i].toString(),
            digest: MD5(chunks[i]).toString()
        }   
        pages.push(Tx_Page);
    }
    TxMeta.page_number = pages.length;
    submit_tx_map_meta.set(MODEL_ID, {is_completed: 'false', status: 'PENDING', pending: pages.length+1});
    await submitMeta(TxMeta);
    LAST = 'false';
    for (let i = 0; i < pages.length; i++){
        if (i == pages.length-1){
            LAST = 'true';
        }
        await submitPage(pages[i]);
    }
    var data = "";
    for (let i = 0; i < pages.length; i++){
        data += pages[i].data
    }
    let recovered = compressJSON.decompress(JSON.parse(data));

    //await submitPage(MODEL_ID, TxPage);
    
    //await getLastModel(3,'');
    //await getMeta();
    //await getTag1Meta("tag1", 3, '')
    //await getTag2Meta("tag2", 3, '')
    //await getTag12Meta("tag1", "tag2", 3, '')
    

    

}

if (require.main === module){
    main();
}


