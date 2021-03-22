package main

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// SimpleChaincode implements the fabric-contract-api-go programming model
type SimpleChaincode struct {
	contractapi.Contract
}

type MetaData struct {
	ModelID               string   `json:"model_id"`
	Tag1                  string   `json:"tag1"`
	Tag2                  string   `json:"tag2"`
	SerializationEncoding string   `json:"serialization_encoding"`
	FileCounters          Counters `json:"file_counters"`
}

type Counters struct {
	Model          int `json:"model"`
	Weights        int `json:"weights"`
	Initialization int `json:"initialization"`
	Checkpoints    int `json:"checkpoints"`
}

type GenericPage struct {
	ModelID   string    `json:"model_id"`
	PageID    int       `json:"page_id"`
	PageBytes int       `json:"page_bytes"` //data+digests
	Data      []*string `json:"data"`
	Digests   []*string `json:"digests"`
}

type GenericPageWrapper struct {
	Key   string      `json: key`
	Value GenericPage `json: value`
}

// PaginatedQueryResult structure used for returning paginated query results and metadata
type PaginatedQueryResult struct {
	Records             []*GenericPageWrapper `json:"records"`
	FetchedRecordsCount int32                 `json:"fetchedRecordsCount"`
	Bookmark            string                `json:"bookmark"`
}

// Creates a new client token using uuid
func (t *SimpleChaincode) CreateClientToken(ctx contractapi.TransactionContextInterface, token string) (string, error) {

	err := ctx.GetStub().PutState(token, []byte{'t', 'o', 'k', 'e', 'n'})
	if err != nil {
		return "", err
	}

	return token, nil
}

// Checks if a client token exists
func (t *SimpleChaincode) CheckClientToken(ctx contractapi.TransactionContextInterface, token string) (bool, error) {
	tokenBytes, err := ctx.GetStub().GetState(token)
	if err != nil {
		return false, fmt.Errorf("failed to retrieve token %s from world state. %v", token, err)
	}

	return tokenBytes != nil, nil
}

// Submits a metadata entry to the ledger.
// Metadata entries have to do with the model's page metadata.
func (t *SimpleChaincode) SubmitMeta(ctx contractapi.TransactionContextInterface, token, modelID, entryString string) error {

	tokenBytes, err := ctx.GetStub().GetState(token)
	if err != nil {
		return fmt.Errorf("failed to retrieve token %s from world state. %v", token, err)
	}

	if tokenBytes == nil {
		return fmt.Errorf("authorization not granded: token %s is invalid", token)
	}

	var entry MetaData
	err = json.Unmarshal([]byte(entryString), &entry)
	if err != nil {
		return fmt.Errorf("failed to process json data; ensure correct structure")
	}

	entryBytes, err := json.Marshal(entry)
	if err != nil {
		return err
	}

	err = ctx.GetStub().PutState(modelID+"_metadata", entryBytes)
	if err != nil {
		return err
	}

	return nil
}

// Submits a page-data entry to the ledger.
// Page-data entries have to do with the model's actual data.
// PpageType can be either of the following: model, weights, initialization, checkpoints
func (t *SimpleChaincode) SubmitPage(ctx contractapi.TransactionContextInterface, token, modelID, pageType, entryString string) error {

	tokenBytes, err := ctx.GetStub().GetState(token)
	if err != nil {
		return fmt.Errorf("failed to retrieve token %s from world state. %v", token, err)
	}

	if tokenBytes == nil {
		return fmt.Errorf("authorization not granded: token %s is invalid", token)
	}

	var entry GenericPage
	err = json.Unmarshal([]byte(entryString), &entry)
	if err != nil {
		return fmt.Errorf("failed to process json data; ensure correct structure")
	}

	entryBytes, err := json.Marshal(entry)
	if err != nil {
		return err
	}

	err = ctx.GetStub().PutState(modelID+"_"+pageType, entryBytes)
	if err != nil {
		return err
	}

	return nil
}

func (t *SimpleChaincode) Init(ctx contractapi.TransactionContextInterface) error {

	err := ctx.GetStub().PutState("token", []byte{'t', 'o', 'k', 'e', 'n'})
	if err != nil {
		return err
	}

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
