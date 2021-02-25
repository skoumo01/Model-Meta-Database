'use strict';
const express = require('express');
const execFile = require('child_process').execFile;
const HashMap = require('hashmap');

var app = express();
var channel_map = new HashMap();


var channels = ['mychannel'];
var contracts = ['contract_models'];
var organizations = ['org1', 'org2'];
var users = ['Admin'];
var peerNames = ['peer0.org1.example.com', 'peer1.org1.example.com'];
                   // ,'peer0.org2.example.com','peer1.org2.example.com'];

app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded


/*
curl --location --request PUT 'localhost:3000/submit' \
--header 'Content-Type: application/json' \
--data-raw '{
    "organization": "org1",
    "user": "Admin", 
    "peername": "peer0.org1.example.com",
    "channel": "mychannel",
    "contract": "contract_models",
    "model": {
        "id": "id_0",
        "tag1": "tag1",
        "tag2": "tag2",
        "serialized_data": "dummy string 0"
    }
}'
*/
app.put('/submit', (req, res, next) => {

    if (!req.body.hasOwnProperty('channel') || !channels.includes(req.body.channel)){
        res.status(400).send('Bad Request Error: Ensure property "channel" is included in the request body and it '+
                            'refers to an existing channel.');
        return
    }
    if (!req.body.hasOwnProperty('contract') || !contracts.includes(req.body.contract)){
        res.status(400).send('Bad Request Error: Ensure property "contract" is included in the request body and it '+
                            'refers to an existing contract.');
        return
    }
    if (!req.body.hasOwnProperty('organization') || !organizations.includes(req.body.organization)){
        res.status(400).send('Bad Request Error: Ensure property "organization" is included in the request body and it '+
                            'refers to an existing organization.');
            return
    }
    if (!req.body.hasOwnProperty('user') || !users.includes(req.body.user)){
        res.status(400).send('Bad Request Error: Ensure property "user" is included in the request body and it '+
                            'refers to an existing user.');
            return
    }
    if (!req.body.hasOwnProperty('peername') || !peerNames.includes(req.body.peername)){
        res.status(400).send('Bad Request Error: Ensure property "peername" is included in the request body and it '+
                            'refers to an existing peer name.');
            return
    }
    if (!req.body.hasOwnProperty('model')){
        res.status(400).send('Bad Request Error: Property "model_id" is missing from request body.');
        return
    }else if (!req.body.model.hasOwnProperty('id') || !req.body.model.hasOwnProperty('tag1')
            || !req.body.model.hasOwnProperty('tag2') || !req.body.model.hasOwnProperty('serialized_data')){
        res.status(400).send('Bad Request Error: One of the following model properties is missing from the request body'+
                                ': "id", "tag1", "tag2", "serialized_data".');
        return
    }

    var opName = 'submitModel';

    if (!channel_map.has(req.body.channel)){
        channel_map.set(req.body.channel, new HashMap());
    }

    channel_map.get(req.body.channel).set(req.body.model.id, {is_completed: 'false', status: 'PENDING'});

    var child = execFile('node', ['run_models.js', req.body.organization, req.body.user, 
                            req.body.peername, req.body.channel, req.body.contract, opName,
                            req.body.model.id, req.body.model.tag1, req.body.model.tag2,
                             req.body.model.serialized_data], (error, stdout, stderr) => {
        if (error) {
            console.log('Child process error.');
            channel_map.get(req.body.channel).set(req.body.model.id, {is_completed: 'false', status: 'ERROR'});
            return
        }
        var response = JSON.parse(stdout);
        if (!response.hasOwnProperty('status')){
            channel_map.get(req.body.channel).set(req.body.model.id, {is_completed: 'false', status: 'ERROR'});
            return
        }
        channel_map.get(req.body.channel).set(req.body.model.id, {is_completed: 'true', status: response.status});

    });
    res.status(200).send();
    
});

/*
curl --location --request GET 'localhost:3000/check?channel=mychannel&id=id_0'
*/
app.get('/check', (req, res, next) => {

    if (!req.query.hasOwnProperty('channel') || !channels.includes(req.query.channel)){
        res.status(400).send('Bad Request Error: Ensure query parameter "channel" is provided and it '+
                            'refers to an existing channel.');
        return
    }    
    if (!req.query.hasOwnProperty('id')){
        res.status(400).send('Bad Request Error: Ensure query parameter "id" is provided.');
            return
    }
    
    
    if (!channel_map.has(req.query.channel) || !channel_map.get(req.query.channel).has(req.query.id)){
        res.status(404).send('Not Found: Model with id "' + req.query.id + '" does not exist on channel "'
                                + req.query.channel + '".');
        return
    }

    res.status(200).send(channel_map.get(req.query.channel).get(req.query.id));
});



/*
curl --location --request POST 'localhost:3000/latest' \
--header 'Content-Type: application/json' \
--data-raw '{
    "organization": "org1",
    "user": "Admin", 
    "peername": "peer0.org1.example.com",
    "channel": "mychannel",
    "contract": "contract_models",
    "query": {
        "id": "id_0",
        "page_size": "1",
        "bookmark": "",
        "tag1": "tag1",
        "tag2": "tag2"
    }
}'
*/
app.post("/latest", (req, res, next) => {

    if (!req.body.hasOwnProperty('channel') || !channels.includes(req.body.channel)){
        res.status(400).send('Bad Request Error: Ensure property "channel" is included in the request body and it '+
                            'refers to an existing channel.');
        return
    }
    if (!req.body.hasOwnProperty('contract') || !contracts.includes(req.body.contract)){
        res.status(400).send('Bad Request Error: Ensure property "contract" is included in the request body and it '+
                            'refers to an existing contract.');
        return
    }
    if (!req.body.hasOwnProperty('organization') || !organizations.includes(req.body.organization)){
        res.status(400).send('Bad Request Error: Ensure property "organization" is included in the request body and it '+
                            'refers to an existing organization.');
            return
    }
    if (!req.body.hasOwnProperty('user') || !users.includes(req.body.user)){
        res.status(400).send('Bad Request Error: Ensure property "user" is included in the request body and it '+
                            'refers to an existing user.');
            return
    }
    if (!req.body.hasOwnProperty('peername') || !peerNames.includes(req.body.peername)){
        res.status(400).send('Bad Request Error: Ensure property "peername" is included in the request body and it '+
                            'refers to an existing peer name.');
            return
    }


    if (!req.body.hasOwnProperty('query')){        
        res.status(400).send('Bad Request Error: Ensure valid query parameters are provided in the request body.');
            return
    }


    if (req.body.query.hasOwnProperty('id')){
        var opName = 'getLatest';
        var child = execFile('node', ['run_models.js', req.body.organization, req.body.user, 
                                        req.body.peername, req.body.channel, req.body.contract, opName,
                                        req.body.query.id], (error, stdout, stderr) => {
            if (error) {
                console.log('Child process error.');
                res.status(500).send('Internal Server Error: Failed to retrieve model ' + req.body.query.id + '.');
                return 
            }
            if (stderr) {
                let msg = stderr.split('(')[1].split(')')[1].replace('at getLatest', ' ').trim();
                console.log('Blockchain error: ' + msg);
                res.status(404).send('Bad Request:' + msg);
                return 
            }
            var ledger_entry = JSON.parse(stdout);
            res.status(200).send(ledger_entry);
        });
        return
    }

    if (!req.body.query.hasOwnProperty('page_size') || !req.body.query.hasOwnProperty('bookmark')){        
        res.status(400).send('Bad Request Error: Ensure  valid "page_size" and "bookmark" parameters '+
                                'are provided in the request body.');
            return
    }

    if (req.body.query.hasOwnProperty('tag1') && !req.body.query.hasOwnProperty('tag2')){        
        var opName = 'getTag1';
        var child = execFile('node', ['run_models.js', req.body.organization, req.body.user, 
                                        req.body.peername, req.body.channel, req.body.contract, opName,
                                        req.body.query.tag1, req.body.query.page_size, req.body.query.bookmark],
                                                                     (error, stdout, stderr) => {
            if (error) {
                console.log('Child process error.');
                res.status(500).send('Internal Server Error: Failed to retrieve models with tag1 "' 
                                    + req.body.query.tag1 + '".');
                return 
            }
            if (stderr) {
                let msg = stderr.split('(')[1].split(')')[1].replace('at getTag1', ' ').trim();
                console.log('Blockchain error: ' + msg);
                res.status(404).send('Bad Request:' + msg);
                return 
            }
            var results = {};
            try {
                results = JSON.parse(stdout);
            }catch{
                results = {};
            }
            res.status(200).send(results);
        });
        return
    }

    if (!req.body.query.hasOwnProperty('tag1') && req.body.query.hasOwnProperty('tag2')){        
        var opName = 'getTag2';
        var child = execFile('node', ['run_models.js', req.body.organization, req.body.user, 
                                        req.body.peername, req.body.channel, req.body.contract, opName,
                                        req.body.query.tag2, req.body.query.page_size, req.body.query.bookmark], 
                                                            (error, stdout, stderr) => {
            if (error) {
                console.log('Child process error.');
                res.status(500).send('Internal Server Error: Failed to retrieve models with tag2 "' 
                                    + req.body.query.tag2 + '".');
                return 
            }
            if (stderr) {
                let msg = stderr.split('(')[1].split(')')[1].replace('at getTag2', ' ').trim();
                console.log('Blockchain error: ' + msg);
                res.status(404).send('Bad Request:' + msg);
                return 
            }
            var results = {};
            try {
                results = JSON.parse(stdout);
            }catch{
                results = {};
            }
            res.status(200).send(results);
        });
        return
    }

    if (req.body.query.hasOwnProperty('tag1') && req.body.query.hasOwnProperty('tag2')){        
        var opName = 'getTag12';
        var child = execFile('node', ['run_models.js', req.body.organization, req.body.user, 
                                        req.body.peername, req.body.channel, req.body.contract, opName,
                                        req.body.query.tag1, req.body.query.tag2,
                                        req.body.query.page_size, req.body.query.bookmark], (error, stdout, stderr) => {
            if (error) {
                console.log('Child process error.');
                res.status(500).send('Internal Server Error: Failed to retrieve models with tag1 "' 
                                    + req.body.query.tag1 + '" and tag2 "' 
                                    + req.body.query.tag2 + '".');
                return 
            }
            if (stderr) {
                let msg = stderr.split('(')[1].split(')')[1].replace('at getTag12', ' ').trim();
                console.log('Blockchain error: ' + msg);
                res.status(404).send('Bad Request:' + msg);
                return 
            }
            var results = {};
            try {
                results = JSON.parse(stdout);
            }catch{
                results = {};
            }
            res.status(200).send(results);
        });
        return
    }

    res.status(400).send('Bad Request Error: Ensure valid query parameters are provided in the request body.');
    
});


/*
curl --location --request POST 'localhost:3000/history' \
--header 'Content-Type: application/json' \
--data-raw '{
    "organization": "org1",
    "user": "Admin", 
    "peername": "peer0.org1.example.com",
    "channel": "mychannel",
    "contract": "contract_models",
    "query": {
        "id": "id_0",
        "bounded": "true",
        "min": "1614188540",
        "max": "1614245906"
    }
}'
*/
app.post("/history", (req, res, next) => {

    if (!req.body.hasOwnProperty('channel') || !channels.includes(req.body.channel)){
        res.status(400).send('Bad Request Error: Ensure property "channel" is included in the request body and it '+
                            'refers to an existing channel.');
        return
    }
    if (!req.body.hasOwnProperty('contract') || !contracts.includes(req.body.contract)){
        res.status(400).send('Bad Request Error: Ensure property "contract" is included in the request body and it '+
                            'refers to an existing contract.');
        return
    }
    if (!req.body.hasOwnProperty('organization') || !organizations.includes(req.body.organization)){
        res.status(400).send('Bad Request Error: Ensure property "organization" is included in the request body and it '+
                            'refers to an existing organization.');
            return
    }
    if (!req.body.hasOwnProperty('user') || !users.includes(req.body.user)){
        res.status(400).send('Bad Request Error: Ensure property "user" is included in the request body and it '+
                            'refers to an existing user.');
            return
    }
    if (!req.body.hasOwnProperty('peername') || !peerNames.includes(req.body.peername)){
        res.status(400).send('Bad Request Error: Ensure property "peername" is included in the request body and it '+
                            'refers to an existing peer name.');
            return
    }
    if (!req.body.hasOwnProperty('query')){
        res.status(400).send('Bad Request Error: Property "query" is missing from request body.');
        return
    }

    if (!req.body.query.hasOwnProperty('id')){
        res.status(400).send('Bad Request Error: Property "id" is missing from request body.');
        return
    }
    if (!req.body.query.hasOwnProperty('bounded')){
        res.status(400).send('Bad Request Error: Property "bounded" is missing from request body.');
        return
    }
    
    var id = req.body.query.id;
    var bounded = req.body.query.bounded;
    if (!(bounded === 'true') && !(bounded === 'false')){
        res.status(400).send('Bad Request Error: Invalid assignment to property "bounded".\nMust provide "true" or "false".');
        return
    }

    var min = "";
    var max = "";
    if (bounded === 'true'){
        if (!req.body.query.hasOwnProperty('min') || !req.body.query.hasOwnProperty('max')){
            res.status(400).send('Bad Request Error: Properties "min" and/or "max" is missing from request body.');
            return
        }
        var min = req.body.query.min;
        var max = req.body.query.max;
        if (isNaN(min) || isNaN(max) || (parseInt(max, 10) < parseInt(min, 10)) || (parseInt(max, 10) <= 0) || (parseInt(min, 10) <= 0)){
            res.status(400).send('Bad Request Error: Invalid assignment to property "min" and/or "max".\nMust provide a timestamp with an accuracy of seconds.');
            return
        }
    }
    
    

    var opName = 'getHistory';
    var child = execFile('node', ['run_models.js', req.body.organization, req.body.user, 
                                    req.body.peername, req.body.channel, req.body.contract, opName,
                                    id, bounded, min, max], (error, stdout, stderr) => {
        if (error) {
            console.log('Child process error.');
            res.status(500).send('Internal Server Error: Failed to retrieve model history.');
            return 
        }
        if (stderr) {
            let msg = stderr.split('(')[1].split(')')[1].replace('at getHistory', ' ').trim();
            console.log('Blockchain error: ' + msg);
            res.status(404).send('Bad Request:' + msg);
            return 
        }
        var history = JSON.parse(stdout);
        res.status(200).send(history);
    });

});


async function main() {

    var server = app.listen(3000, function () {
        var host = server.address().address
        var port = server.address().port
        console.log("Example app listening at http://%s:%s", host, port)
    })

    

}

if (require.main === module){
    main();
}


//exports.set_block = set_block;