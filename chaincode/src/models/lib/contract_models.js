'use strict';

const { Contract } = require('fabric-contract-api');


class contract_models extends Contract {

    async Init(ctx) {
        
    }

    // submitModelEntry creates or updates a ledger entry for the received model.
    // This corresponds to the model's v1.
    async submitModelEntry(ctx, model_id, serialized_model) {

        const Model_Data = {
            serialized_model: serialized_model,
        };

        return ctx.stub.putState(model_id, Buffer.from(JSON.stringify(Model_Data)));

    }

    // getLatestVersion returns the model stored in the world state with given id.
    // This corresponds to the model's latest version.
    async getLatestVersion(ctx, model_id) {

        const Model_Data = await ctx.stub.getState(model_id);
        if (!Model_Data || Model_Data.length === 0) {
            throw new Error(`The Model ${model_id} does not exist`);
        }

        var data = JSON.parse(Model_Data)
    
        return JSON.stringify(data);
    }


    // getVersionRange performs version queries; when left unbounded it returns the whole history.
    // Bounding timestamps have seconds accuracy, and they are min_timestamp inclusive and
    // max_timestamp exclusive.
    //
    // Good practise: must not be left unbouded because machine learning models are heavy, and
    //                  the response may be on the gigabyte scale...
    async getVersionRange(ctx, model_id, is_bounded, min_timestamp, max_timestamp) {

        let resultsIterator = await ctx.stub.getHistoryForKey(model_id);
        let results = await this.GetAllResults(resultsIterator, true, is_bounded, min_timestamp, max_timestamp);
    
        return JSON.stringify(results);
    }
    
    
    
    // PENDING: implementation of a function that performs couchdb ad hoc queries and returns them with pagination
        // must not return all the data at once because models are heavy... gigabytes returned
        // using pagination is preferred


    // GetAllResults is an auxiliary function that iterates a result set and returns either all
    // of its data, or some of it if time-bounded.
	async GetAllResults_(iterator, isHistory, is_bounded, min_timestamp, max_timestamp) {
		let allResults = [];
		let res = await iterator.next();
        if (isHistory && isHistory === true && res.done){ // no history for this id!
            return false;
        }
		while (!res.done) {
			if (res.value && res.value.value.toString()) {
				let jsonRes = {};
				console.log(res.value.value.toString('utf8'));
				if (isHistory && isHistory === true) { // for history
					jsonRes.TxId = res.value.tx_id;
					jsonRes.Timestamp = res.value.timestamp;
                    if (is_bounded === 'true'){
                        if (jsonRes.Timestamp.seconds < min_timestamp){
                            res = await iterator.next();
                            continue;
                        } else if (jsonRes.Timestamp.seconds >= max_timestamp){ 
                            res = await iterator.next();
                            break;
                        }   
                    }
					try {
						jsonRes.Value = JSON.parse(res.value.value.toString('utf8')).serialized_model;
					} catch (err) {
						console.log(err);
						jsonRes.Value = res.value.value.toString('utf8');
					}
				} else { // for ad hoc pagination
					jsonRes.Key = res.value.key;
					try {
						jsonRes.Record = JSON.parse(res.value.value.toString('utf8'));
					} catch (err) {
						console.log(err);
						jsonRes.Record = res.value.value.toString('utf8');
					}
				}
				allResults.push(jsonRes);
			}
			res = await iterator.next();
		}
		iterator.close();
		return allResults;
	}
    
    async GetAllResults(iterator, isHistory, is_bounded, min_timestamp, max_timestamp) {
		let allResults = [];
		let res = await iterator.next();
        if (isHistory && isHistory === true && res.done){ // no history for this id!
            return false;
        }
		while (!res.done) {
			if (res.value && res.value.value.toString()) {
				let jsonRes = {};
				console.log(res.value.value.toString('utf8'));
				if (isHistory && isHistory === true) { // for history
					jsonRes.TxId = res.value.tx_id;
					jsonRes.Timestamp = res.value.timestamp;
                    if (is_bounded === 'true'){
                        if (jsonRes.Timestamp.seconds < min_timestamp){
                            res = await iterator.next();
                            continue;
                        } else if (jsonRes.Timestamp.seconds >= max_timestamp){ 
                            res = await iterator.next();
                            continue;
                        }   
                    }
					try {
						jsonRes.Value = JSON.parse(res.value.value.toString('utf8'));
					} catch (err) {
						console.log(err);
						jsonRes.Value = res.value.value.toString('utf8');
					}
				} else { // for ad hoc pagination
					jsonRes.Key = res.value.key;
					try {
						jsonRes.Record = JSON.parse(res.value.value.toString('utf8'));
					} catch (err) {
						console.log(err);
						jsonRes.Record = res.value.value.toString('utf8');
					}
				}
				allResults.push(jsonRes);
			}
			res = await iterator.next();
		}
		iterator.close();
		return allResults;
	}
    
    // Query examples:
    // /fabric-samples/asset-transfer-ledger-queries/chaincode-javascript/lib/asset_transfer_ledger_chaincode.js
    
}

module.exports = contract_models;