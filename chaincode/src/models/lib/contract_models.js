'use strict';

const { Contract } = require('fabric-contract-api');


class contract_models extends Contract {

    async Init(ctx) {
        
    }

    // createModel creates a new ledger entry for the received model.
    // This corresponds to the model's v1.
    async createModelEntry(ctx, timestamp, model_id, serialized_model) {

        const Model_Data = {
            timestamp: timestamp,
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

}

module.exports = contract_models;