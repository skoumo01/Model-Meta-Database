'use strict';
const Client = require('fabric-client');
const { exit } = require('process');

var myArgs = process.argv.slice(2);
//node run_models.js org1 Admin peer0.org1.example.com mychannel contract_models 1 submitModel id_0 model_str
//node run_models.js org1 Admin peer0.org1.example.com mychannel contract_models 1 getLatest id_1
//node run_models.js org1 Admin peer0.org1.example.com mychannel contract_models 1 getHistory id_0 false 1613556418 1613556450

// Argument Parcing
const ORG_NAME = myArgs[0];
const USER_NAME = myArgs[1];
const PEER_NAME = myArgs[2];
const CHANNEL_NAME = myArgs[3];
const CHAINCODE_ID = myArgs[4];
const NUMBER_OF_TXS = parseInt(myArgs[5]);
const FUNCTION_CALL = myArgs[6]; // "submitModel"/"getLatest"/"getHistory"
var MODEL_ID = "";    
var MODEL_STR = "";
var IS_BOUNDED = "";
var MIN_TIMESTAMP = "";
var MAX_TIMESTAMP = "";
if (FUNCTION_CALL==='submitModel'){
    MODEL_ID = myArgs[7];    
    MODEL_STR = myArgs[8];
}else if (FUNCTION_CALL==='getLatest'){
    MODEL_ID = myArgs[7];
}else if (FUNCTION_CALL==='getHistory'){
    MODEL_ID = myArgs[7];
    IS_BOUNDED = myArgs[8]; // "true"/"false"
    MIN_TIMESTAMP = myArgs[9];
    MAX_TIMESTAMP = myArgs[10];
}

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

//global counter 
var commitedTxs = 0;

// Variable to hold the client
var client = {}
// Variable to hold the channel
var channel = {}

var initial_timer;
var hrstart = [];
var hrend = [];
var total_time = [];

if (require.main === module){
    main();
}

async function main() {

    client = await setupClient();

    channel = await setupChannel();

    if (FUNCTION_CALL==='submitModel'){
        //generate pseudo model data
        var Tx = {};
        Tx.model_id = MODEL_ID;
        Tx.serialized_model = MODEL_STR; //generateBase64String(4688);
        
        //simple POST
        submitModel(Tx);

    }else if (FUNCTION_CALL==='getLatest'){
        //simple GET
        getLatest(MODEL_ID);
        
    }else if (FUNCTION_CALL==='getHistory'){
        //retieves (un)bounded model history (i.e. submitted versions)
        getHistory(MODEL_ID, IS_BOUNDED, MIN_TIMESTAMP, MAX_TIMESTAMP);
    }

}

async function submitModel(tx_data) {

    let peerName = channel.getChannelPeer(PEER_NAME)

    var tx_id = client.newTransactionID();
    let tx_id_string = tx_id.getTransactionID();
    const millis = (Date.now()).toString();

    var request = {
        targets: peerName,
        chaincodeId: CHAINCODE_ID,
        fcn: 'submitModelEntry',
        args: [millis, tx_data.model_id, tx_data.serialized_model],
        chainId: CHANNEL_NAME,
        txId: tx_id
    };

    hrstart.push(process.hrtime());

    
    console.log("#1 channel.sendTransactionProposal     Done.")
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
                console.log(`\tinvoke chaincode EP response #${i} was good`);
            } else {
                console.log(`\tinvoke chaincode EP response #${i} was bad!!!`);
            }
            all_good = all_good & good
        }
        console.log("#2 Looped through the EP results  all_good=", all_good)

        await setupTxListener(tx_id_string)
        console.log('#3 Registered the Tx Listener')

        var orderer_request = {
            txId: tx_id,
            proposalResponses: proposalResponses,
            proposal: proposal
        };

        await channel.sendTransaction(orderer_request);
        console.log("#4 channel.sendTransaction - waiting for Tx Event")

    }catch{
        console.log('(Error: Failed to complete the transaction lifecycle procedure. '+
                        'Please ensure that the provided connection data is valid.')
        exit(0);
    }
    

}

async function getLatest(model_id) {

    let peerName = channel.getChannelPeer(PEER_NAME)

    let request = {
         targets: peerName,
         chaincodeId: CHAINCODE_ID,
         fcn: 'getLatestVersion',
         args: [model_id]
     };

     // send the query proposal to the peer
     try {
        let response = await channel.queryByChaincode(request);
        var not_found_catch = JSON.parse(response);
        console.log(response.toString());
     }catch{
        throw new Error('Error: error in simulation: transaction returned with failure: Error: The Model ' + model_id + ' does not exist');
     }
     

    return 
}

async function getHistory(model_id, is_bounded, min_timestamp, max_timestamp) {

    let peerName = channel.getChannelPeer(PEER_NAME)

    let request = {
         targets: peerName,
         chaincodeId: CHAINCODE_ID,
         fcn: 'getVersionRange',
         args: [model_id, is_bounded, min_timestamp, max_timestamp]
     };

     // send the query proposal to the peer
    let response = await channel.queryByChaincode(request);
    if (response.toString() === 'false'){
        throw new Error('Error: error in simulation: transaction returned with failure: Error: The Model ' + model_id + ' does not exist');
    }else{
        console.log(response.toString());
    }

    return 
}


function setupTxListener(tx_id_string) {

    try{
        let event_hub = channel.getChannelEventHub(PEER_NAME);

        event_hub.registerTxEvent(tx_id_string, (tx, code, block_num) => {
            
            console.log("#5 Received Tx Event")
            console.log('\tThe chaincode invoke chaincode transaction has been committed on peer %s', event_hub.getPeerAddr());
            console.log('\tTransaction %s is in block %s', tx, block_num);
            

            if (code !== 'VALID') {
                console.log('\tThe invoke chaincode transaction was invalid, code:%s', code);
            } else {
                console.log('\tThe invoke chaincode transaction was VALID.');
            }
            hrend.push(process.hrtime(hrstart[commitedTxs]));
            commitedTxs++;
            if (commitedTxs === NUMBER_OF_TXS) {
                var final_timer = process.hrtime(initial_timer);
                console.log("\t\t", final_timer);
                for (var timer of hrend) {
                    total_time.push(timer[0] * 1000 + timer[1] / 1000000);
                }

                var sum = total_time.reduce((acc, c) => acc + c, 0);
                var average = sum / NUMBER_OF_TXS;
                
                
                console.log("\t\tAverage Latency to commit a Tx =  %d ms", average);
                console.log("\t\tSubmited Txs = ", commitedTxs);
                
                exit(0);
            }
          
        },
            // 3. Callback for errors
            (err) => {
                console.log(err);
            },
            { unregister: true, disconnect: false }
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
            //console.log("initCredentialStore(): ", done)
        })

    let userContext = await client.loadUserFromStateStore(USER_NAME)
    if (userContext == null) {
        console.log("User NOT found in credstore: ", USER_NAME)
        process.exit(1)
    }

    client.setUserContext(userContext, true)

    return client
}

async function setupChannel() {
    try {
        channel = await client.getChannel(CHANNEL_NAME, true)
    } catch (e) {
        console.log("Could NOT create channel: ", CHANNEL_NAME)
        process.exit(1)
    }

    return channel
}

function generateBase64String(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

