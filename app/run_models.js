'use strict';
const Client = require('fabric-client');
const { exit } = require('process');

var myArgs = process.argv.slice(2);
//node run_models.js org1 Admin peer0.org1.example.com mychannel contract_models submitModel id_0 tag1 tag2 model_str
//node run_models.js org1 Admin peer0.org1.example.com mychannel contract_models getLatest id_1
//node run_models.js org1 Admin peer0.org1.example.com mychannel contract_models getHistory id_0 false 1613556418 1613556450

// Argument Parcing
const ORG_NAME = myArgs[0];
const USER_NAME = myArgs[1];
const PEER_NAME = myArgs[2];
const CHANNEL_NAME = myArgs[3];
const CHAINCODE_ID = myArgs[4];
const FUNCTION_CALL = myArgs[5]; // "submitModel"/"getLatest"/"getHistory"
var MODEL_ID = "";    
var TAG1 = "";
var TAG2 = "";
var MODEL_STR = "";
var IS_BOUNDED = "";
var MIN_TIMESTAMP = "";
var MAX_TIMESTAMP = "";
if (FUNCTION_CALL==='submitModel'){
    MODEL_ID = myArgs[6];    
    TAG1 = myArgs[7];    
    TAG2 = myArgs[8];    
    MODEL_STR = myArgs[9];
}else if (FUNCTION_CALL==='getLatest'){
    MODEL_ID = myArgs[6];
}else if (FUNCTION_CALL==='getHistory'){
    MODEL_ID = myArgs[6];
    IS_BOUNDED = myArgs[7]; // "true"/"false"
    MIN_TIMESTAMP = myArgs[8];
    MAX_TIMESTAMP = myArgs[9];
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


// Variable to hold the client
var client = {}
// Variable to hold the channel
var channel = {}

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
        Tx.tag1 = TAG1;
        Tx.tag2 = TAG2;
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
    
    var request = {
        targets: peerName,
        chaincodeId: CHAINCODE_ID,
        fcn: 'SubmitModelEntry',
        args: [tx_data.model_id, tx_data.tag1, tx_data.tag2, tx_data.serialized_model],
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

        await setupTxListener(tx_id_string)
        //console.log('#3 Registered the Tx Listener')

        var orderer_request = {
            txId: tx_id,
            proposalResponses: proposalResponses,
            proposal: proposal
        };

        await channel.sendTransaction(orderer_request);
        //console.log("#3 Transaction has been submitted.")

    }catch{
        //console.log('(Error: Failed to complete the transaction lifecycle procedure. '+
         //               'Please ensure that the provided connection data is valid.')
        exit(0);
    }
    

}

async function getLatest(model_id) {

    let peerName = channel.getChannelPeer(PEER_NAME)

    let request = {
         targets: peerName,
         chaincodeId: CHAINCODE_ID,
         fcn: 'GetLatestVersion',
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
         fcn: 'GetVersionRange',
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

async function setupTxListener(tx_id_string) {

    try{
        let event_hub = channel.getChannelEventHub(PEER_NAME);

        event_hub.registerTxEvent(tx_id_string, (tx, code, block_num) => {
            
            var response = {};
            response.tx_id = tx_id_string;
            response.code = code;
            response.status = 'VALID';          
            response.blocknumber = block_num;
        
            //console.log("#5 Received Tx Event")
            //console.log('The chaincode invoke chaincode transaction has been committed on peer %s', event_hub.getPeerAddr());
            //console.log('Transaction %s is in block %s', tx, block_num);
            
            if (code !== 'VALID') {
                response.status = 'INVALID';
            }
            
            console.log(JSON.stringify(response));
        },
            // 3. Callback for errors
            (err) => {
                console.log(JSON.stringify({}));
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
            //console.log("initCredentialStore(): ", done)
        })

    let userContext = await client.loadUserFromStateStore(USER_NAME)
    if (userContext == null) {
        //console.log("User NOT found in credstore: ", USER_NAME)
        process.exit(1)
    }

    client.setUserContext(userContext, true)

    return client
}

async function setupChannel() {

    
    try {
        // for debugging
        //console.log(await client.queryChannels(PEER_NAME,true))

        channel = await client.getChannel(CHANNEL_NAME, true)
    } catch (e) {
        console.log("Could NOT create channel: ", CHANNEL_NAME)
        process.exit(1)
    }

    return channel
}

// for testing
/*function generateBase64String(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}*/
