'use strict';
var express = require('express');
var app = express(); //initalize express
const { exit } = require('process');
const execFile = require('child_process').execFile;
var fs = require("fs");

//var block = true;
//function set_block(val){block = val;};

var org = 'org1';
var user = 'Admin';
var peerName = 'peer0.org1.example.com';
var channel = 'mychannel';
var contract = 'contract_models';
var transactionNumber = 1;

app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded

function submitModel(req, res, next) {

    if (!req.body.hasOwnProperty('model_id')){
        res.status(400).send('Bad Request Error: Property "model_id" is missing from request body.');
        return
    }
    if (!req.body.hasOwnProperty('serialized_model')){
        res.status(400).send('Bad Request Error: Property "serialized_model" is missing from request body.');
        return
    }

    var opName = 'submitModel';
    var child = execFile('node', ['run_models.js', org, user, peerName, channel, contract, transactionNumber, opName, req.body.model_id, req.body.serialized_model], (error, stdout, stderr) => {
        if (error) {
            console.log('Child process error.');
            res.status(500).send('Internal Server Error: Failed to commit the model on the blockchain.');
            return
        }
        if (stdout.includes('Error')) {
            let msg = stdout.split('(')[1].trim();
            console.log('Blockchain error: ' + msg);
            res.status(400).send('Bad Request: ' + msg);
            return
        }
        res.status(201).send(stdout);
    });
}

/*
curl --location --request POST '10.16.30.89:3000/create' 
--header 'Content-Type: application/json' \
--data-raw '{
    "model_id": "id_0",
    "serialized_model": "dummy string 0 #1"
}'
*/
app.post('/create', submitModel);


/*
curl --location --request PUT '10.16.30.89:3000/update' \
--header 'Content-Type: application/json' \
--data-raw '{
    "model_id": "id_0",
    "serialized_model": "dummy string 0 #2"
}'
*/
app.put('/update', submitModel);


/*
curl --location --request GET '10.16.30.89:3000/latest?id=id_0'
*/
app.get("/latest", (req, res, next) => {
    if (req.query.hasOwnProperty('id')) {
        var opName = 'getLatest';
        var child = execFile('node', ['run_models.js', org, user, peerName, channel, contract, transactionNumber, opName, req.query.id], (error, stdout, stderr) => {
            if (error) {
                console.log('Child process error.');
                res.status(500).send('Internal Server Error: Failed to retrieve model ' + req.query.id + '.');
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
    }
});


app.get("/history", (req, res, next) => {

    if (!req.query.hasOwnProperty('id')){
        res.status(400).send('Bad Request Error: Property "id" is missing from request body.');
        return
    }
    if (!req.query.hasOwnProperty('bounded')){
        res.status(400).send('Bad Request Error: Property "bounded" is missing from request body.');
        return
    }
    
    var id = req.query.id;
    var bounded = req.query.bounded;
    if (!(bounded === 'true') && !(bounded === 'false')){
        res.status(400).send('Bad Request Error: Invalid assignment to property "bounded".\nMust provide "true" or "false".');
        return
    }

    var min = "";
    var max = "";
    if (bounded === 'true'){
        if (!req.query.hasOwnProperty('min') || !req.query.hasOwnProperty('max')){
            res.status(400).send('Bad Request Error: Properties "min" and/or "max" is missing from request body.');
            return
        }
        var min = req.query.min;
        var max = req.query.max;
        if (isNaN(min) || isNaN(max) || (parseInt(max, 10) < parseInt(min, 10)) || (parseInt(max, 10) <= 0) || (parseInt(min, 10) <= 0)){
            res.status(400).send('Bad Request Error: Invalid assignment to property "min" and/or "max".\nMust provide a timestamp with an accuracy of seconds.');
            return
        }
    }
    
    var opName = 'getHistory';
    var child = execFile('node', ['run_models.js', org, user, peerName, channel, contract, transactionNumber, opName, id, bounded, min, max], (error, stdout, stderr) => {
        if (error) {
            console.log('Child process error.');
            res.status(500).send('Internal Server Error: Failed to retrieve model ' + req.query.id + '.');
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