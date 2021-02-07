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


app.post('/create', function (req, res, next) {

    
    var id = 'id';
    var serialized_model = '';
  
    if (!req.body.hasOwnProperty('model_id') ||
        !req.body.hasOwnProperty('serialized_model')){
            throw error;
    }
   
    var opName = 'createModel';
    var child = execFile('node', ['run_models.js', org, user, peerName, channel, contract, transactionNumber, opName, id, serialized_model], (error, stdout, stderr) => {
        if (error) {
            throw error;
        }
        res.json(stdout);
        //console.log(stdout);
    });
})


app.get("/latest", (req, res, next) => {
    if (req.query.hasOwnProperty('id')) {
        var opName = 'getLatest';
        var child = execFile('node', ['run_models.js', org, user, peerName, channel, contract, transactionNumber, opName, req.query.id], (error, stdout, stderr) => {
            if (error) {
                throw error;
            }
            var ledger_entry = JSON.parse(stdout);
            res.json(ledger_entry);
        });
    }
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