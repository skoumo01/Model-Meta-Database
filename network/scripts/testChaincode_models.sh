#!/bin/bash

source scriptUtils.sh

# import utils
. scripts/envVar.sh

FABRIC_CFG_PATH=$PWD/config/

CHANNEL_NAME=$1
CC_NAME=$2

submit() { #OK
    
    peer chaincode invoke -o localhost:7050 \
    --ordererTLSHostnameOverride orderer.example.com \
    --tls --cafile $ORDERER_CA -C $CHANNEL_NAME \
    -n ${CC_NAME}  \
    --peerAddresses localhost:7051 --tlsRootCertFiles $PEER0_ORG1_CA \
    --peerAddresses localhost:9051 --tlsRootCertFiles $PEER0_ORG2_CA \
    -c '{"function": "SubmitModelEntry","Args": [ "'$valid_uuid'", "id_3", "tag1", "tag2" ,"model string 6"]}'
    
}

latest(){ #OK
    
    peer chaincode invoke -o localhost:7050 \
    --ordererTLSHostnameOverride orderer.example.com \
    --tls \
    --cafile $ORDERER_CA \
    -C $CHANNEL_NAME \
    -n ${CC_NAME}  \
    --peerAddresses localhost:7051 --tlsRootCertFiles $PEER0_ORG1_CA \
    --peerAddresses localhost:9051 --tlsRootCertFiles $PEER0_ORG2_CA \
    -c '{"function": "GetLatestVersion","Args": ["'$valid_uuid'", "id_2"]}'
}

history(){
    
    peer chaincode invoke -o localhost:7050 \
    --ordererTLSHostnameOverride orderer.example.com \
    --tls \
    --cafile $ORDERER_CA \
    -C $CHANNEL_NAME \
    -n ${CC_NAME}  \
    --peerAddresses localhost:7051 --tlsRootCertFiles $PEER0_ORG1_CA \
    --peerAddresses localhost:9051 --tlsRootCertFiles $PEER0_ORG2_CA \
    -c '{"function": "GetVersionRange","Args": ["'$valid_uuid'", "id_2", "1614187540", "1614187586"]}'
}

adhoc(){
    
    peer chaincode invoke -o localhost:7050 \
    --ordererTLSHostnameOverride orderer.example.com \
    --tls \
    --cafile $ORDERER_CA \
    -C $CHANNEL_NAME \
    -n ${CC_NAME}  \
    --peerAddresses localhost:7051 --tlsRootCertFiles $PEER0_ORG1_CA \
    --peerAddresses localhost:9051 --tlsRootCertFiles $PEER0_ORG2_CA \
    -c '{"function": "QueryModelsWithPagination","Args": ["'$valid_uuid'", "{\"selector\":{\"tag1\":\"tag1\"}}", "1", ""]}'
}

createToken(){
    
    peer chaincode invoke -o localhost:7050 \
    --ordererTLSHostnameOverride orderer.example.com \
    --tls \
    --cafile $ORDERER_CA \
    -C $CHANNEL_NAME \
    -n ${CC_NAME}  \
    --peerAddresses localhost:7051 --tlsRootCertFiles $PEER0_ORG1_CA \
    --peerAddresses localhost:9051 --tlsRootCertFiles $PEER0_ORG2_CA \
    -c '{"function": "CreateClientToken","Args": ["'$uuid'"]}'
}

checkToken(){
    
    peer chaincode invoke -o localhost:7050 \
    --ordererTLSHostnameOverride orderer.example.com \
    --tls \
    --cafile $ORDERER_CA \
    -C $CHANNEL_NAME \
    -n ${CC_NAME}  \
    --peerAddresses localhost:7051 --tlsRootCertFiles $PEER0_ORG1_CA \
    --peerAddresses localhost:9051 --tlsRootCertFiles $PEER0_ORG2_CA \
    -c '{"function": "CheckClientToken","Args": ["'$valid_uuid'"]}'
}

#model=$(<./scripts/testChaincode_data/model_base64)
uuid=$(uuidgen)
valid_uuid='93875b3e-a321-4635-88dc-3d05df3291f7'

#submit
#latest
#history
#adhoc
#createToken
#checkToken