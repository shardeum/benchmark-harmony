## Harmony TPS Test for Coin Transfer

##### Hardware: dedicated server at nocix.net

- Processor 2x E5-2660 @ 2.2GHz / 3GHz Turbo 16 Cores / 32 thread
- Ram 96 GB DDR3
- Disk 960 GB SSD
- Bandwidth 1Gbit Port: 200TB Transfer
- Operating System Ubuntu 18.04 (Bionic)

##### Network setup

- The first network setup is 5 nodes in shard 0 and 3 nodes in shard 1.
- The second network setup is 9 nodes in shard 0 and 5 nodes in shard 1.
- All nodes used the same IP, but different ports
- All nodes had mining turned on; each was a block producer.

##### Test setup for native coin transfer

- 50000 accounts were loaded in the genesis block.
- 15000 native coin txs were submitted to the network as fast as possible
  - Each tx moved 1 ONE between two different randomly chosen accounts
  - The number of accounts was chosen to be equal to the number of total txs so that there would be a low chance of a tx getting rejected due to another transaction from the same account still pending.

##### Test result

- Tests are taken starting from 500 tps to 1500 tps for 10 seconds. Time between the start of the test and the last block to process txs from the test was measured.
- Spam rate \* duration \* spam client = Total Txs / Total Spam Rate => Avg TPS
  ```
  100 * 10 *  1 =  1000 /  100 =>  66 ,  58
  200 * 10 *  1 =  2000 /  200 => 117 , 133
  300 * 10 *  1 =  3000 /  300 => 136
  100 * 10 *  3 =  3000 /  300 => 187
   50 * 10 * 10 =  5000 /  500 => 250 , 263
  100 * 10 * 10 = 10000 / 1000 => 312 , 303 , 263
  150 * 10 * 10 = 15000 / 1500 => 300 , 288 , 277
  100 * 10 * 15 = 15000 / 1500 => 323 , 300
  ```
- Estimated average tps is around **300 TPS**

##### Instructions to recreate this test

1.  [https://github.com/harmony-one/harmony](https://github.com/harmony-one/harmony) . The network setup is built by referencing this.
2.  Install required tools and dependencies.

    1. sudo apt install libgmp-dev libssl-dev make gcc g++
    2. Go
    3. [https://github.com/harmony-one/harmony#first-install](https://github.com/harmony-one/harmony#first-install)
       1. mkdir -p $(go env GOPATH)/src/github.com/harmony-one
       2. cd $(go env GOPATH)/src/github.com/harmony-one
       3. git clone https://github.com/harmony-one/mcl.git
       4. git clone https://github.com/harmony-one/bls.git
       5. git clone https://github.com/harmony-one/harmony.git
       6. cd harmony
       7. go mod tidy
       8. make
    4. To start the network.
       1. [https://github.com/harmony-one/harmony#debugging](https://github.com/harmony-one/harmony#debugging)
       2. make debug
       3. This localnet has 2 shards, with 11 nodes on shard 0 (+1 explorer node) and 10 nodes on shard 0 (+1 explorer node).
       4. Since the number of nodes running is a lot, we try to reduce the number of nodes running in step 3.
    5. To query the network status.
       1. [https://docs.harmony.one/home/network/validators/node-setup/hmy-cli-download](https://docs.harmony.one/home/network/validators/node-setup/hmy-cli-download)
       2. curl -LO https://harmony.one/hmycli && mv hmycli hmy && chmod +x hmy
       3. chmod u+x hmy.sh
       4. ./hmy.sh -d
       5. ./hmy cookbook → To check hmy usage and commands
       6. ./hmy utility metadata →To check network status
       7. ./hmy utility shards → To check network shard info
    6. To stop the network.
       - make debug-kill
    7. To clean the network.
       - make clean

3.  Create a local network of **_5 nodes in shard 0_** and **3 nodes in shard 1**.

    1.  Go into the _[harmony](https://github.com/harmony-one/harmony)_ installed folder.
    2.  Edit _harmony/internal/configs/sharding/localnet.go_ file.

        - Change the localnet\* value as follow.

          ```
          localnetV0   = MustNewInstance(2, 5, 3, …
          localnetV1   = MustNewInstance(2, 5, 3, …
          localnetV2   = MustNewInstance(2, 5, 3, …
          localnetV3   = MustNewInstance(2, 5, 3, …
          localnetV3_1 = MustNewInstance(2, 5, 3, …
          ```

    3.  Edit the harmony/test/configs/localsharding.txt

        - We will put only 5 nodes in shard 0 and 3 nodes in shard 1. The file will look like this. e.g.
          ```
          127.0.0.1 9000 …
          127.0.0.1 9001 …
          127.0.0.1 9002 …
          127.0.0.1 9003 …
          127.0.0.1 9004 …
          127.0.0.1 9100 …
          127.0.0.1 9101 …
          127.0.0.1 9102 …
          ```

    4.  Before starting the network, create accounts to add in the genesis block as in step 4(3).
    5.  Configure the Genesis block settings. Edit harmony/core/genesis.go file. Add the following code in the **_NewGenesisSpec_** function.

        ```
        // Localnet only testing account
        if netType == nodeconfig.Localnet {
        // PK: 1f84c95ac16e6a50f08d44c7bde7aff8742212fda6e4321fde48bf83bef266dc
        testAddress := common.HexToAddress("0xA5241513DA9F4463F1d4874b548dFBAC29D91f34")
        genesisAlloc[testAddress] = GenesisAccount{Balance: contractDeployerFunds}

        accounts := []string{
            "0xa0f9a83f70e7eef8672185fb520d5377a3546522",
        	... Account addresses ...
        }
        for _, acc := range accounts {
            genesisAlloc[common.HexToAddress(acc)] = GenesisAccount{Balance: contractDeployerFunds}
            }
        }
        ```

    6.  Now start the local network.
        1. make clean && make debug
        2. ./hmy utility metadata
        3. Make sure the current-block-number is not stuck in 14.

4.  Custom Scripts used for running transactions to the network

    1.  [https://gitlab.com/shardeum/smart-contract-platform-comparison/harmony](https://gitlab.com/shardeum/smart-contract-platform-comparison/harmony)
    2.  cd spam-client && npm install && npm link
    3.  To generate accounts.

        - `spammer accounts --number [number]`
        - This will create
          - publicAddresses.json - To add these accounts as step no.3(5).
          - accounts.json - The private keys are used when running the transactions.

    4.  Spam the network with these accounts and check the average TPS in each spam with step (5)

        - spammer spam --duration [number] --rate [number] --start [accounts_start_index] --end [accounts_end_index]

          ```
          If 2000 accounts are created,
          E.g 100 transactions per second for 5 seconds to use 1000 accounts from 0
              spammer spam --tps 100 --duration 5 --start 0 --end 1000 --port 1317

          E.g 100 transactions per second for 5 seconds to use 1000 accounts from 1000
              spammer spam --tps 100 --duration 5 --start 1000 --end 2000
          ```

        28. This will output the _latestBlockBeforeSpamming_ in the log. Use this number to check the Avg TPS of that spam.

    5.  Check the average TPS of the spam

        - `spammer check_tps --startblock [number] --output [json_file_name]`
          E.g. spammer check_tps --startblock 128 --output s1280.json

    6.  In order to send higher txs, we use spam-client-orchestrator to spam from many terminals.
        1. cd spam-client-orchestrator && npm install
        2. Add the value (number of accounts you created in step no.3(c)) in _total_accounts_ variable in orchestrator.js. This will divide how many accounts to use for each client.
        3. Check out the README for usage.

5.  TPS test with the default network config. This network will have 2 shards, with 12 nodes on shard 0 (+1 explorer node) and 10 nodes on shard 0 (+1 explorer node).
    1. Skip the steps from 3.(1) to 3.(3).
    2. And you can continue the test by adding accounts in the genesis block.
