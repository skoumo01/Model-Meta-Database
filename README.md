# Model-Meta-Database

This repository implements the basic components for the Application and Storage Layers of _TriaBase_; a database intended for machine learning models.

The database consists of 3 layers; the Edge, Application, and Storage Layers.

### Layer 1 - Edge Layer
At the Edge Layer we find the smart devices of the IoT system. These devices participate in a federated machine learning procedure by training models on their local data and storing them on the blockchain network of TriaBase. After the local training phase is successfully completed, a node called the _Model Aggregator_ retrieves the multiple models from the blockchain network and aggregates them into a single global model that describes the whole system. This global model is then stored on the blockchain network among the local ones, signaling the end of a single training round of the federated learning procedure.

### Layer 2 - Application Layer
The Application Layer is an intermediate layer which hides the complexity of the communication with the database's blockchain network. Here we find a REST server which communicates with the blockchain in behalf of its clients (the smart devices from the Edge Layer), who just use its simple endpoints instead. As of now, the supported endpoints offer model submitting, updating and retrieving services, as well as basic metadata querying options, while the aspiration is to create a full database-like service suite.

### Layer 3 - Storage Layer
The Storage Layer comprises the system's blockchain network, which serves as TriaBase's secure, transparent and immutable storage medium. At this layer we find Smart Contracts providing the essential data management methods that the REST server from Layer 2 uses to respond to its client requests.



Currently, although TriaBase's architecture is platform/framework independent, the federated machine learning procedure is implemented using the Tensorflow machine learning platform, while Layer 2's server utilizes the Node.js runtime environment. Layer 3's blockchain network was constructed using the Hyperledger Fabric framework.



Model retrieval processing flow:

![model-meta-database-architecture](https://i.imgur.com/GMZBIJG.png)



## Getting Started
### 1) Set-up Layer 2:
#### Install Git
```
$ sudo apt install git
```


#### Install cURL
```
$ sudo apt install curl
```


#### Install wget
```
$ sudo apt install wget
```


#### Install Docker
```
$ sudo apt install docker.io
```

Verify that the docker daemon is running:
```
$ sudo systemctl start docker
```

Make the docker daemon start when the system starts:
```
$ sudo systemctl enable docker
```


#### Install Docker Compose
```
$ sudo curl -L "https://github.com/docker/compose/releases/download/1.26.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
$ sudo chmod +x /usr/local/bin/docker-compose
```


#### Install Go
```
$ wget https://dl.google.com/go/go1.13.8.linux-amd64.tar.gz
$ sudo tar -xvf go1.13.8.linux-amd64.tar.gz
$ sudo mv go /usr/local
$ export GOROOT=/usr/local/go
$ export GOPATH=$HOME/go
$ export PATH=$GOPATH/bin:$GOROOT/bin:$PATH
```
The above environment will be set for your current session only; alternatively add the last 3 commands in \~/.profile (\~/.bashrc) file.


#### Install Node.js
```
$ curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash
$ nvm install 10.23.0
$ nvm install 12.19.0
```

Select to use Node.js version 10.23.0:
```
$ nvm use 10.23.0
```
Node.js version 12.19.0 will be used later on to start the REST server.


#### Install NPM
Installing Node.js will also install NPM, however it is recommended that you verify so:
```
$ npm --version
```


#### Install Hyperledger Fabric Binaries and Docker Images
```
$ curl -sSL https://bit.ly/2ysbOFE | bash -s
```
The above command clones the [fabric-samples](https://github.com/hyperledger/fabric-samples) repository. This repository contains some binary files that need to be added to your PATH environment variable:
```
$ export PATH=<path to download location>/fabric-samples/bin:$PATH
```
The above environment will be set for your current session only; alternatively add the above command in \~/.profile (\~/.bashrc) file.


#### Clone the project's repository
```
$ git clone https://github.com/skoumo01/Model-Meta-Database.git
```
The repository should be cloned in the same directory as the **fabric-samples** repository.


#### Bring up the network and chaincode Docker containers
Execute the following from the project's **network/** directory:
```
$ ./network.sh up -c mychannel -db couchdb
$ ./network.sh deployCC -c mychannel -ccn contract_models -ccv 1 -ccp ../chaincode/src/models/ -ccl golang
```


### 2) Set-up Layer 1
#### Bring up the REST server
Execute the following from the project's **app/** directory:
```
$ nvm use 12.19.0
$ npm install
$ rm -rf credstore/
$ node cred-store.js org1 Admin
$ node --max-old-space-size=4096 server.js none 10 false true 15
```
The last command can be adapted to suit the user's requirements as follows:
- **max-old-space-size** sets the server's max heap size (in bytes).
- The server (optionally) uses data compression to reduce tha volume of the data sent to Layer 2. **none** refers to the data compression module to be used by the server.
  (It is recommended to use *none*; experiments have shown that *none* results into better overall performance.)
  The options are:
  - none
  - [compress-json](https://www.npmjs.com/package/compress-json)
  - [compressed-json](https://www.npmjs.com/package/compressed-json)
  - [jsonpack](https://www.npmjs.com/package/jsonpack)
  - [zipson](https://www.npmjs.com/package/zipson)
- The server uses paging in order to be able to handle big data volumes more efficiently (e.g. using multiplexing; not yet implemented). **10** refers to the page size to be used by the server (in megabytes).
- **false** deactivates some console prints that can be used for debugging. Set to *true* to activate the debugging prints.
- **true** prints the average model submission latency of the _N_ first model submission requests received.
- **15** is the number of _N_.


## Acknowledgements
To set-up the blockchain layer (i.e. Layer 2) follow the instructions on  GitHub repository. Many thanks to my colleage for allowing me to use and build upon his [project](https://github.com/Erodotos/Hyperledger-Fabric-Network).

## Contact
For more information about the project, check out the corresponding webpage [here](https://www.cs.ucy.ac.cy/projects/blockdb/index.html)

## Publications
For more information about the _TriaBase_ project the following resource links are provided:
- [Towards a Blockchain Database for Massive IoT Workloads](https://www.cs.ucy.ac.cy/~dzeina/papers/blockdm21-triabase.pdf)
- [Triastore: A Web 3.0 Blockchain Datastore for Massive IoT Workloads](https://www.cs.ucy.ac.cy/~dzeina/papers/mdm21-triastore.pdf)
