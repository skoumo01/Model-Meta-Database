'use strict';
const express = require('express');
const execFile = require('child_process').execFile;
const HashMap = require('hashmap');

var app = express();
var submit_tx_map = new HashMap();


var channel = 'mychannel';
var contract = 'contract_models';
var organization = 'org1';
var user = 'Admin';
var peername = 'peer0.org1.example.com';

app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded

/*
curl --location --request POST '10.16.30.89:3000/token' \
--header 'Content-Type: application/json' \
--data-raw '{
    "token" : "newtoken"
}'
*/
app.post('/token', (req, res, next) => {

    if (!req.body.hasOwnProperty('token')){
        res.status(400).send({'message':'Bad Request Error: Query parameter "token" is missing.'});
        return
    }

    var opName = 'createToken';

    var child = execFile('node', ['run_models.js', organization, user, peername, channel, contract, opName,
                             req.body.token], (error, stdout, stderr) => {
        if (error) {
            console.log('Child process error.');
            res.status(500).send({'message':'Internal Server Error: Failed to create token ' + req.body.token + '.'});
            return 
        }

        try {
            response = JSON.parse(stdout);
        }catch{
            res.status(201).send({'message':'Created'});
            return
        }

        res.status(500).send({'message':'Internal Server Error: Failed to create token ' + req.body.token + '.'});

    });    
});


/*
curl --location --request PUT '10.16.30.89:3000/submit' \
--header 'Content-Type: application/json' \
--data-raw '{
    "token": "token",
    "model": {
        "id": "id_0",
        "tag1": "tag1",
        "tag2": "tag2",
        "serialized_data": "dummy string 0"
    }
}'
*/
app.put('/submit', (req, res, next) => {

    if (!req.body.hasOwnProperty('token')){
        res.status(400).send({'message':'Bad Request Error: Property "token" is missing from request body.'});
        return
    }

    if (!req.body.hasOwnProperty('model')){
        res.status(400).send({'message':'Bad Request Error: Property "model_id" is missing from request body.'});
        return
    }else if (!req.body.model.hasOwnProperty('id') || !req.body.model.hasOwnProperty('tag1')
            || !req.body.model.hasOwnProperty('tag2') || !req.body.model.hasOwnProperty('serialized_data')){
        res.status(400).send({'message':'Bad Request Error: One of the following model properties is missing from the request body'+
                                ': "id", "tag1", "tag2", "serialized_data".'});
        return
    }

    var opName = 'submitModel';

    submit_tx_map.set(req.body.model.id, {is_completed: 'false', status: 'PENDING'});

    var child = execFile('node', ['run_models.js', organization, user, peername, channel, contract, opName,
                             req.body.token,
                             req.body.model.id, req.body.model.tag1, req.body.model.tag2,
                             req.body.model.serialized_data], (error, stdout, stderr) => {
        if (error) {
            console.log('Child process error.');
            submit_tx_map.set(req.body.model.id, {is_completed: 'false', status: 'ERROR'});
            return
        }

        var response = {};
        try {
            response = JSON.parse(stdout);
        }catch{
            submit_tx_map.set(req.body.model.id, {is_completed: 'false', status: 'UNAUTHORIZED'});
            return
        }
        if (!response.hasOwnProperty('status')){
            submit_tx_map.set(req.body.model.id, {is_completed: 'false', status: 'ERROR'});
            return
        }
        submit_tx_map.set(req.body.model.id, {is_completed: 'true', status: response.status});

    });
    res.status(200).send({'message':'OK'});
    
});

/*
curl --location --request GET '10.16.30.89:3000/check?id=id_0&token=token'
*/
app.get('/check', (req, res, next) => {

    if (req.query.hasOwnProperty('token')){    
        var opName = 'checkToken';
        var child = execFile('node', ['run_models.js', organization, user, peername, channel, contract, opName,
                                        req.query.token], (error, stdout, stderr) => {
            if (error) {
                console.log('Child process error.');
                res.status(500).send({'message':'Internal Server Error: Failed to retrieve model ' + req.query.id + '.'});
                return 
            }
            if (stderr) {
                let msg = stderr.split('(')[1].split(')')[1].replace('at checkToken', ' ').trim();
                console.log('Blockchain error: ' + msg);
                res.status(404).send({'message':'Bad Request:' + msg});
                return 
            }
            if (stdout.includes('false')){
                res.status(401).send({'message':'Unauthorized: authorization not granded: token ' + req.query.token
                                        +' is invalid'});
                return
            }
        });
    }else{
        res.status(400).send({'message':'Bad Request Error: Property "token" is missing from request body.'});
        return
    }

    if (!req.query.hasOwnProperty('id')){
        res.status(400).send({'message':'Bad Request Error: Ensure query parameter "id" is provided.'});
            return
    }
    
    if (!submit_tx_map.has(req.query.id)){
        res.status(404).send({'message':'Not Found: Model with id "' + req.query.id + '" does not exist.'});
        return
    }

    res.status(200).send(submit_tx_map.get(req.query.id));
});


/*
curl --location --request GET '10.16.30.89:3000/latest/model?id=id_0&token=token'
*/
app.get("/latest/model", (req, res, next) => {

    if (!req.query.hasOwnProperty('token')){
        res.status(400).send({'message':'Bad Request Error: Ensure query parameter "token" is provided.'});
            return
    }
    
    if (req.query.hasOwnProperty('id')){
        var opName = 'getLatest';
        var child = execFile('node', ['run_models.js', organization, user, peername, channel, contract, opName,
                                        req.query.token,
                                        req.query.id], (error, stdout, stderr) => {
            if (error) {
                console.log('Child process error.');
                res.status(500).send({'message':'Internal Server Error: Failed to retrieve model ' + req.query.id + '.'});
                return 
            }
            if (stdout.includes('authorization')){
                res.status(401).send({'message':'Unauthorized: authorization not granded: token ' + req.query.token
                                        +' is invalid'});
                return
            }
            if (stderr) {
                let msg = stderr.split('(')[1].split(')')[1].replace('at getLatest', ' ').trim();
                console.log('Blockchain error: ' + msg);
                res.status(404).send({'message':'Bad Request:' + msg});
                return 
            }
            
            var ledger_entry = JSON.parse(stdout);
            res.status(200).send(ledger_entry);
        });
        return
    }

    res.status(400).send({'message':'Bad Request Error: Ensure valid query parameters are provided.'});
    
});


/*
curl --location --request GET '10.16.30.89:3000/latest/tags?page_size=1&bookmark=&tag1=tag1&tag2=tag2&token=token'
*/
app.get("/latest/tags", (req, res, next) => {

    if (!req.query.hasOwnProperty('token')){
        res.status(400).send({'message':'Bad Request Error: Ensure query parameter "token" is provided.'});
            return
    }

    if (!req.query.hasOwnProperty('page_size') || !req.query.hasOwnProperty('bookmark')){        
        res.status(400).send({'message':'Bad Request Error: Ensure  valid "page_size" and "bookmark" query' +
                                ' parameters are provided.'});
            return
    }

    if (req.query.hasOwnProperty('tag1') && req.query.hasOwnProperty('tag2')){        
        var opName = 'getTag12';
        var child = execFile('node', ['run_models.js', organization, user, peername, channel, contract, opName,
                                        req.query.token,
                                        req.query.tag1, req.query.tag2,
                                        req.query.page_size, req.query.bookmark], (error, stdout, stderr) => {
            if (error) {
                console.log('Child process error.');
                res.status(500).send({'message':'Internal Server Error: Failed to retrieve models with tag1 "' 
                                    + req.query.tag1 + '" and tag2 "' 
                                    + req.query.tag2 + '".'});
                return 
            }
            if (stderr) {
                let msg = stderr.split('(')[1].split(')')[1].replace('at getTag12', ' ').trim();
                console.log('Blockchain error: ' + msg);
                res.status(404).send({'message':'Bad Request:' + msg});
                return 
            }
            var results = {};
            try {
                results = JSON.parse(stdout);
            }catch{             
                if (stdout.includes('authorization')){
                    res.status(401).send({'message':'Unauthorized: authorization not granded: token ' + req.query.token
                                            +' is invalid'});
                    return
                }
                results = {"records" : []};
            }
            res.status(200).send(results);
        });
        return
    }

    res.status(400).send({'message':'Bad Request Error: Ensure valid query parameters are provided.'});
    
});

/*
curl --location --request GET '10.16.30.89:3000/latest/tags/tag1?page_size=1&bookmark=&tag1=tag1&token=token'
*/
app.get("/latest/tags/tag1", (req, res, next) => {

    if (!req.query.hasOwnProperty('token')){
        res.status(400).send({'message':'Bad Request Error: Ensure query parameter "token" is provided.'});
            return
    }
    
    if (!req.query.hasOwnProperty('page_size') || !req.query.hasOwnProperty('bookmark')){        
        res.status(400).send({'message':'Bad Request Error: Ensure  valid "page_size" and "bookmark" query' +
                                ' parameters are provided.'});
            return
    }


    if (req.query.hasOwnProperty('tag1')){        
        var opName = 'getTag1';
        var child = execFile('node', ['run_models.js', organization, user, peername, channel, contract, opName,
                                        req.query.token,
                                        req.query.tag1, req.query.page_size, req.query.bookmark],
                                                                     (error, stdout, stderr) => {
            if (error) {
                console.log('Child process error.');
                res.status(500).send({'message':'Internal Server Error: Failed to retrieve models with tag1 "' 
                                    + req.query.tag1 + '".'});
                return 
            }
            if (stderr) {
                let msg = stderr.split('(')[1].split(')')[1].replace('at getTag1', ' ').trim();
                console.log('Blockchain error: ' + msg);
                res.status(404).send({'message':'Bad Request:' + msg});
                return 
            }
            var results = {};
            try {
                results = JSON.parse(stdout);
            }catch{
                if (stdout.includes('authorization')){
                    res.status(401).send({'message':'Unauthorized: authorization not granded: token ' + req.query.token
                                            +' is invalid'});
                    return
                }
                results = {"records" : []};
            }
            res.status(200).send(results);
        });
        return
    }

    res.status(400).send({'message':'Bad Request Error: Ensure valid query parameters are provided.'});
    
});

/*
10.16.30.89:3000/latest/tags/tag2?page_size=2&bookmark=&tag2=tag2&token=token
*/
app.get("/latest/tags/tag2", (req, res, next) => {

    if (!req.query.hasOwnProperty('token')){
        res.status(400).send({'message':'Bad Request Error: Ensure query parameter "token" is provided.'});
            return
    }
    
    if (!req.query.hasOwnProperty('page_size') || !req.query.hasOwnProperty('bookmark')){        
        res.status(400).send({'message':'Bad Request Error: Ensure  valid "page_size" and "bookmark" query' +
                                ' parameters are provided.'});
            return
    }

    
    if (req.query.hasOwnProperty('tag2')){        
        var opName = 'getTag2';
        var child = execFile('node', ['run_models.js', organization, user, peername, channel, contract, opName,
                                        req.query.token,
                                        req.query.tag2, req.query.page_size, req.query.bookmark], 
                                                            (error, stdout, stderr) => {
            if (error) {
                console.log('Child process error.');
                res.status(500).send({'message':'Internal Server Error: Failed to retrieve models with tag2 "' 
                                    + req.query.tag2 + '".'});
                return 
            }
            if (stderr) {
                let msg = stderr.split('(')[1].split(')')[1].replace('at getTag2', ' ').trim();
                console.log('Blockchain error: ' + msg);
                res.status(404).send({'message':'Bad Request:' + msg});
                return 
            }
            var results = {};
            try {
                results = JSON.parse(stdout);
            }catch{
                if (stdout.includes('authorization')){
                    res.status(401).send({'message':'Unauthorized: authorization not granded: token ' + req.query.token
                                            +' is invalid'});
                    return
                }
                results = {"records" : []};
            }
            res.status(200).send(results);
        });
        return
    }

    res.status(400).send({'message':'Bad Request Error: Ensure valid query parameters are provided.'});
    
});


/*
curl --location --request GET '10.16.30.89:3000/history?id=id_0&bounded=false&min=1615035024&max=1615036624&token=token'
*/
app.get("/history", (req, res, next) => {

    if (!req.query.hasOwnProperty('token')){
        res.status(400).send({'message':'Bad Request Error: Ensure query parameter "token" is provided.'});
            return
    }
    
    if (!req.query.hasOwnProperty('id') || !req.query.hasOwnProperty('bounded')){        
        res.status(400).send({'message':'Bad Request Error: Ensure  valid "page_size" and "bookmark" query' +
                                ' parameters are provided.'});
            return
    }

    
    var id = req.query.id;
    var bounded = req.query.bounded;
    if (!(bounded === 'true') && !(bounded === 'false')){
        res.status(400).send({'message':'Bad Request Error: Invalid assignment to property "bounded".\nMust provide "true" or "false".'});
        return
    }

    var min = "";
    var max = "";
    if (bounded === 'true'){
        if (!req.query.hasOwnProperty('min') || !req.query.hasOwnProperty('max')){
            res.status(400).send({'message':'Bad Request Error: Query arameters "min" and/or "max" is/are missing.'});
            return
        }
        var min = req.query.min;
        var max = req.query.max;
        if (isNaN(min) || isNaN(max) || (parseInt(max, 10) < parseInt(min, 10)) || (parseInt(max, 10) <= 0) || (parseInt(min, 10) <= 0)){
            res.status(400).send({'message':'Bad Request Error: Invalid assignment to property "min" and/or "max".\n'+
                                'Must provide a timestamp with an accuracy of seconds.'});
            return
        }
    }
    

    var opName = 'getHistory';
    var child = execFile('node', ['run_models.js', organization, user, peername, channel, contract, opName,
                                    req.query.token,
                                    id, bounded, min, max], (error, stdout, stderr) => {
        if (error) {
            console.log('Child process error.');
            res.status(500).send({'message':'Internal Server Error: Failed to retrieve model history.'});
            return 
        }
        if (stderr) {
            let msg = stderr.split('(')[1].split(')')[1].replace('at getHistory', ' ').trim();
            console.log('Blockchain error: ' + msg);
            res.status(404).send({'message':'Bad Request:' + msg});
            return 
        }

        var history = []
        try{
            history = JSON.parse(stdout);
        }catch{
            if (stdout.includes('authorization')){
                res.status(401).send({'message':'Unauthorized: authorization not granded: token ' + req.query.token
                                        +' is invalid'});
                return
            }
            history = [];
        }
        res.status(200).send(history);
    });

});


async function main() {

    //console.log(uuidv4());

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