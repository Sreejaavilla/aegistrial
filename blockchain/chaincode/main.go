package main

import (
	"log"

	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
)

func main() {
	patientContract := new(SmartContract)

	cc, err := contractapi.NewChaincode(patientContract)
	if err != nil {
		log.Panicf("Error creating clinical trial patient contract: %v", err)
	}

	if err := cc.Start(); err != nil {
		log.Panicf("Error starting clinical trial chaincode: %v", err)
	}
}
