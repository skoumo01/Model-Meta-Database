# Model-Meta-Database

This repository implements a meta-database intented for model storing and querying. The aspiration is to create both a versioning system for machine learning (ML) models, as well as a user-friendly interface that provides a sufficient set of database-style query options for the purposes of the ML and researching communities.

The meta-database consists of mainly two layers: a NodeJS RESTful service layer (Layer 1) and a Hyperledger Fabric blockchain layer (Layer 2). Layer 1 is used as the database's interface through which clients can submit their query requests. Layer 2 takes care of both the storage and the indexing of the models on the blockchain's peer nodes, using Hyperledger Fabric's concepts and regulations.

The following diagram depicts the different components of the meta-database:
![model-meta-database-architecture](https://i.imgur.com/duoaoEs.png)


#### Important:
To set-up the blockchain layer (i.e. Layer 2) follow the instructions on [this](https://github.com/Erodotos/Hyperledger-Fabric-Network) GitHub repository; only some minor adaptations will be necessary. Many thanks to my colleage for allowing me to use and build upon his our project.
Further set-up and usage instructions will be provided later on in the future.
