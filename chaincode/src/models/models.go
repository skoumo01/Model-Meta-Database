package main

import (
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/golang/protobuf/ptypes"
	"github.com/hyperledger/fabric-chaincode-go/shim"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// SimpleChaincode implements the fabric-contract-api-go programming model
type SimpleChaincode struct {
	contractapi.Contract
}

type ModelData struct {
	Tag1            string `json:"tag1"`
	Tag2            string `json:"tag2"`
	SerializedModel string `json:"serialized_model"`
}

type ModelDataWrapper struct {
	Key   string    `json: key`
	Value ModelData `json: value`
}

// HistoryQueryResult structure used for returning result of history query
type HistoryQueryResult struct {
	Record    *ModelData `json:"record"`
	Timestamp time.Time  `json:"timestamp"`
}

// PaginatedQueryResult structure used for returning paginated query results and metadata
type PaginatedQueryResult struct {
	Records             []*ModelDataWrapper `json:"records"`
	FetchedRecordsCount int32               `json:"fetchedRecordsCount"`
	Bookmark            string              `json:"bookmark"`
}

// Initializes a new model in the ledger: OK
func (t *SimpleChaincode) SubmitModelEntry(ctx contractapi.TransactionContextInterface, modelID, tag1, tag2, serializedModel string) error {

	model := &ModelData{
		Tag1:            tag1,
		Tag2:            tag2,
		SerializedModel: serializedModel,
	}
	modelBytes, err := json.Marshal(model)
	if err != nil {
		return err
	}

	err = ctx.GetStub().PutState(modelID, modelBytes)
	if err != nil {
		return err
	}

	return nil
}

// Retrieves a model from the ledger: OK
func (t *SimpleChaincode) GetLatestVersion(ctx contractapi.TransactionContextInterface, modelID string) (*ModelData, error) {
	modelBytes, err := ctx.GetStub().GetState(modelID)
	if err != nil {
		return nil, fmt.Errorf("failed to get model %s: %v", modelID, err)
	}
	if modelBytes == nil {
		return nil, fmt.Errorf("model %s does not exist", modelID)
	}

	var model ModelData
	err = json.Unmarshal(modelBytes, &model)
	if err != nil {
		return nil, err
	}

	return &model, nil
}

// Returns the (un)bounded version history of the requested model: OK
func (t *SimpleChaincode) GetVersionRange(ctx contractapi.TransactionContextInterface, modelID string, isBounded bool, min, max int64) ([]HistoryQueryResult, error) {
	log.Printf("GetModelHistory: ID %v", modelID)

	resultsIterator, err := ctx.GetStub().GetHistoryForKey(modelID)
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var records []HistoryQueryResult
	for resultsIterator.HasNext() {
		response, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var model ModelData
		if len(response.Value) > 0 {
			err = json.Unmarshal(response.Value, &model)
			if err != nil {
				return nil, err
			}
		} else { //pending
			/*
				asset = Asset{
					ID: assetID,
				}
			*/
		}

		timestamp, err := ptypes.Timestamp(response.Timestamp)
		if err != nil {
			return nil, err
		}

		if isBounded {
			bottom := time.Unix(min, 0).Unix()
			top := time.Unix(max, 0).Unix()
			time2 := timestamp.Unix()

			if time2 < bottom || time2 >= top {
				continue
			}
		}

		record := HistoryQueryResult{
			Timestamp: timestamp,
			Record:    &model,
		}
		records = append(records, record)
	}

	return records, nil
}

// QueryModelsWithPagination uses a query string, page size and a bookmark to perform a query
// for models. Query string matching state database syntax is passed in and executed as is.
// The number of fetched records would be equal to or lesser than the specified page size.
// Supports ad hoc queries that can be defined at runtime by the client.
// Only available on state databases that support rich query (e.g. CouchDB)
// Paginated queries are only valid for read only transactions.
// Example: Pagination with Ad hoc Rich Query
func (t *SimpleChaincode) QueryModelsWithPagination(ctx contractapi.TransactionContextInterface, queryString string, pageSize int, bookmark string) (*PaginatedQueryResult, error) {
	return getQueryResultForQueryStringWithPagination(ctx, queryString, int32(pageSize), bookmark)
}

// getQueryResultForQueryStringWithPagination executes the passed in query string with
// pagination info. The result set is built and returned as a byte array containing the JSON results.
func getQueryResultForQueryStringWithPagination(ctx contractapi.TransactionContextInterface, queryString string, pageSize int32, bookmark string) (*PaginatedQueryResult, error) {

	resultsIterator, responseMetadata, err := ctx.GetStub().GetQueryResultWithPagination(queryString, pageSize, bookmark)
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	models, err := constructQueryResponseFromIterator(resultsIterator)
	if err != nil {
		return nil, err
	}

	if models == nil {
		return nil, nil
	}

	return &PaginatedQueryResult{
		Records:             models,
		FetchedRecordsCount: responseMetadata.FetchedRecordsCount,
		Bookmark:            responseMetadata.Bookmark,
	}, nil
}

// constructQueryResponseFromIterator constructs a slice of models from the resultsIterator
func constructQueryResponseFromIterator(resultsIterator shim.StateQueryIteratorInterface) ([]*ModelDataWrapper, error) {
	var models []*ModelDataWrapper
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var model ModelData
		err = json.Unmarshal(queryResult.Value, &model)
		modelwrapper := ModelDataWrapper{
			Key:   queryResult.Key,
			Value: model,
		}

		if err != nil {
			return nil, err
		}
		models = append(models, &modelwrapper)
	}

	return models, nil
}

/*
// QueryModelsByTag1 queries for models based on tag1.
func (t *SimpleChaincode) QueryModelsByTag1(ctx contractapi.TransactionContextInterface, tag1 string) ([]*ModelData, error) {
	queryString := fmt.Sprintf(`{"selector":{"tag1":"%s"}}`, tag1)
	return getQueryResultForQueryString(ctx, queryString)
}
*/

/*
// ModelExists returns true when model with given ID exists in the ledger.
func (t *SimpleChaincode) ModelExists(ctx contractapi.TransactionContextInterface, modelID string) (bool, error) {
	modelBytes, err := ctx.GetStub().GetState(modelID)
	if err != nil {
		return false, fmt.Errorf("failed to read model %s from world state. %v", modelID, err)
	}

	return modelBytes != nil, nil
}
*/

func (t *SimpleChaincode) Init(ctx contractapi.TransactionContextInterface) error {
	return nil
}

func main() {

	sc := new(SimpleChaincode)

	cc, err := contractapi.NewChaincode(sc)

	if err != nil {
		panic(err.Error())
	}

	if err := cc.Start(); err != nil {
		panic(err.Error())
	}
}
