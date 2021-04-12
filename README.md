# Model-Meta-Database

This repository implements a meta-database intented for model storing and querying. The aspiration is to create both a versioning system for machine learning (ML) models, as well as a user-friendly interface that provides a sufficient set of database-style query options for the purposes of the ML and researching communities.

The meta-database consists of mainly two layers: a NodeJS RESTful service layer (Layer 1) and a Hyperledger Fabric blockchain layer (Layer 2). Layer 1 is used as the database's interface through which clients can submit their query requests. Layer 2 takes care of both the storage and the indexing of the models on the blockchain's peer nodes, using Hyperledger Fabric's concepts and regulations.

The following diagram depicts the different components of the meta-database:

![model-meta-database-architecture](https://i.imgur.com/duoaoEs.png)



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
The above environment will be set for your current session only; alternatively add the above commands in \~/.profile (\~/.bashrc) file.


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
The above environment will be set for your current session only; alternatively add the above commands in \~/.profile (\~/.bashrc) file.


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
$ node --max-old-space-size=4096 server.js none 10 false
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


## Acknowledgements
To set-up the blockchain layer (i.e. Layer 2) follow the instructions on  GitHub repository. Many thanks to my colleage for allowing me to use and build upon his [project](https://github.com/Erodotos/Hyperledger-Fabric-Network).

## Contact
For more information about the project, check out the corresponding webpage [here](https://www.cs.ucy.ac.cy/projects/blockdb/index.html)


***Important:*** For the project to run successfully, the IP addresses in the configuration files must be adapted accordingly. To run both the blockchain network and the server on the same machine, simply change all IP addresses to *localhost*.
