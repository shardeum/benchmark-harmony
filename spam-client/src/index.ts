#!/usr/bin/env node
import fs from 'fs'
import { hideBin } from 'yargs/helpers'
import yargs from 'yargs/yargs'
import { Harmony } from '@harmony-js/core' // Import HarmonyJS SDK
import {
  ChainID,
  ChainType,
  hexToNumber,
  numberToHex,
  fromWei,
  Units,
  Unit,
} from '@harmony-js/utils';


/**
 * Connection to the network
 */
let hmy: Harmony


const networkConfig: any = {
  networkId: 'localnet',
  nodeUrl: 'http://127.0.0.1:3030',
  walletUrl: `https://wallet.${process.env.NEAR_NETWORK}.near.org`,
  helperUrl: `https://helper.${process.env.NEAR_NETWORK}.near.org`,
  explorerUrl: `https://explorer.${process.env.NEAR_NETWORK}.near.org`,
  keyStore: {}
}

/**
 * Establish a connection to the cluster
 */
export async function establishConnection(): Promise<void> {
  hmy = new Harmony(
    'http://localhost:9500/',
    {
      chainType: ChainType.Harmony,
      chainId: ChainID.HmyLocal,
      // shardID: 0
    },
  );
}

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(true)
    }, ms)
  })
}


function getRandomArbitrary(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

interface accountsOptions {
  number: number
}

yargs(hideBin(process.argv))
  .command(
    'accounts',
    'generate accounts --number [number]',
    () => { },
    async (argv: accountsOptions) => {
      await establishConnection()
      console.log('Creating Accounts!!!')
      let accounts = []
      let publicAddresses = []
      let mnemonic
      let account
      for (let i = 0; i < argv.number; i++) {
        mnemonic = hmy.wallet.newMnemonic()            // Generates new mnemonic
        account = hmy.wallet.addByMnemonic(mnemonic)       // Adds account to wallet
        // console.log('account ', account.bech32Address)    // ONE address
        // console.log('address ', account.address)          // Hex ethereum like address
        // console.log('pubkey  ', account.publicKey)        // Public key
        // console.log('privkey ', account.privateKey)
        const keyPair = {
          oneKey: account.bech32Address,
          ethKey: account.address,
          pubKey: account.publicKey,
          privKey: account.privateKey.substring(2)
        }
        accounts.push(keyPair);
        publicAddresses.push(account.address)
      }
      try {
        fs.writeFileSync('publicAddresses5.json', JSON.stringify(publicAddresses, null, 2))
        fs.writeFileSync('accounts5.json', JSON.stringify(accounts, null, 2))
        console.log(
          `Wrote ${accounts.length} account${accounts.length > 1 ? 's' : ''
          } to accounts.json`
        )
      } catch (error) {
        console.log(`Couldn't write accounts to file: ${error.message}`)
      }
    }
  )
  .option('type', {
    alias: 'number',
    type: 'number',
    description: 'number of accounts',
  }).argv


interface spamOptions {
  duration: number
  rate: number
  start: number
  end: number
  port: number
}

yargs(hideBin(process.argv))
  .command(
    'spam',
    'spam nodes for [duration] seconds at [rate] tps',
    () => { },
    async (argv: spamOptions) => {
      await establishConnection()
      spam(argv)
    }
  )
  .option('duration', {
    alias: 'd',
    type: 'number',
    description: 'The duration (in seconds) to spam the network',
  })
  .option('start', {
    alias: 's',
    type: 'number',
    description: 'The starting index on accounts to use when spamming',
  })
  .option('end', {
    alias: 'e',
    type: 'number',
    description: 'The ending index on accounts to use when spamming',
  })
  .option('port', {
    alias: 'p',
    type: 'number',
    description: 'The RPC port number to use',
  })
  .option('rate', {
    alias: 'r',
    type: 'number',
    description: 'The rate (in tps) to spam the network at',
  }).argv


const spam = async (argv: spamOptions) => {
  let tps = argv.rate
  let duration = argv.duration
  let txCount = tps * duration
  let accounts
  try {
    accounts = JSON.parse(fs.readFileSync('accounts.json', 'utf8'))
    console.log(
      `Loaded ${accounts.length} account${accounts.length > 1 ? 's' : ''
      } from accounts.json`
    )
  } catch (error) {
    console.log(`Couldn't load accounts from file: ${error.message}`)
    return
  }
  let start = argv.start ? argv.start : 0
  let end = argv.end ? argv.end : accounts.length
  console.log(start, end)
  // Shuffling the accounts array not to run into issue when another client is also spamming at the same time
  // shuffle(accounts)
  // const filteredAccount = accounts.slice(0, txCount)
  let signedTxs = []
  let k = start
  // console.log(new hmy.utils.Unit('2').asGwei().toWei())    
  for (let i = 0; i < txCount; i++) {
    const wallet = hmy.wallet.addByPrivateKey(accounts[k].privKey);
    const receiver = accounts[getRandomArbitrary(start, end)].oneKey


    const txn = hmy.transactions.newTx({
      to: receiver,
      value: new Unit(1).asOne().toWei(),
      // gas limit, you can use string
      gasLimit: '21000',
      // send token from shardID
      shardID: 0,
      // send token to toShardID
      toShardID: 0,
      // gas Price, you can use Unit class, and use Gwei, then remember to use toWei(), which will be transformed to BN
      gasPrice: new hmy.utils.Unit('100').asGwei().toWei()
    });

    // sign the transaction use wallet;
    const signedTxn = await wallet.signTransaction(txn);
    signedTxs.push(signedTxn)
    k++
  }

  const waitTime = (1 / tps) * 1000
  let currentTime
  let sleepTime
  let elapsed
  let lastTime = Date.now()
  let LatestBlockBeforeSpamming = await hmy.blockchain.getBlockNumber()
  console.log('LatestBlockBeforeSpamming', hexToNumber(LatestBlockBeforeSpamming.result))
  let spamStartTime = Math.floor(Date.now() / 1000)
  for (let i = 0; i < txCount; i++) {

    // const txnHash = await hmy.blockchain.sendTransaction(signedTxs[i]);
    // // console.log(txnHash.result);
    // if (!txnHash.result) {
    //   console.log(txnHash)
    //   console.log(accounts[start + i].ethKey)
    //   let balanceInfo = await hmy.blockchain.getBalance({
    //     address: accounts[start + i].ethKey
    //   })
    //   console.log(balanceInfo.result)
    // }

    hmy.blockchain.sendTransaction(signedTxs[i]);
    currentTime = Date.now()
    elapsed = currentTime - lastTime
    sleepTime = waitTime - elapsed
    if (sleepTime < 0) sleepTime = 0
    await sleep(sleepTime)
    lastTime = Date.now()
    k++
  }
  let spamEndTime = Math.floor(Date.now() / 1000)
  var timeDiff = spamEndTime - spamStartTime; //in ms
  // strip the ms
  // timeDiff /= 1000;
  // get seconds 
  var seconds = Math.round(timeDiff);

  let LatestBlockAfterSpamming = await hmy.blockchain.getBlockNumber()
  console.log('LatestBlockAfterSpamming', hexToNumber(LatestBlockAfterSpamming.result))
  console.log('totalSpammingTime', seconds)
  process.exit()
}

interface blockOptions {
  output: string
  startblock: number
}

yargs(hideBin(process.argv))
  .command(
    'check_tps',
    'get tps --output file.json',
    () => { },
    async (argv: blockOptions) => {
      await establishConnection()
      getTPS(argv)
    }
  )
  .option('startblock', {
    alias: 's',
    type: 'number',
    description: 'The block number before spamming',
  })
  .option('output', {
    alias: 'o',
    type: 'string',
    description: 'To save the blocks info into a json file',
  }).argv

const getTPS = async (argv: blockOptions) => {
  let startblock = argv.startblock
  // let startblock
  let output = argv.output
  let startTime
  let endTime
  let endblock
  let totalTransactions = 0
  let blockInfo: any
  const response = await hmy.blockchain.getBlockNumber();
  let block_number = parseInt(hexToNumber(response.result))
  // console.log('current block number: ' + block_number);
  while (true) {
    try {
      blockInfo = await hmy.blockchain.getBlockByNumber({
        blockNumber: numberToHex(block_number)
      })
    } catch (e) {
      break
    }
    const transactionsSize = blockInfo.result.transactions.length
    // console.log(block_number, transactionsSize)
    // if (endblock && transactionsSize === 0) {
    //   fs.appendFile(output, JSON.stringify(blockInfo, null, 0), function (err) {
    //     if (err) throw err;
    //   });
    //   blockInfo = await hmy.blockchain.getBlockByNumber({
    //     blockNumber: numberToHex(--block_number)
    //   })
    //   startblock = block_number
    //   startTime = hexToNumber(blockInfo.result.timestamp)
    //   fs.appendFile(output, JSON.stringify(blockInfo, null, 0), function (err) {
    //     if (err) throw err;
    //   });
    //   break
    // }
    if (block_number === startblock) {
      startTime = hexToNumber(blockInfo.result.timestamp)
      fs.appendFile(output, JSON.stringify(blockInfo, null, 0), function (err) {
        if (err) throw err;
      });
      break
    }

    if (transactionsSize > 0) {
      // console.log(block_number, transactionsSize)
      // blockInfo.transactionsSize = chunkDetails.transactions.length
      totalTransactions += transactionsSize
      if (!endblock) {
        endblock = block_number
        endTime = hexToNumber(blockInfo.result.timestamp)
      }
      fs.appendFile(output, JSON.stringify(blockInfo, null, 0), function (err) {
        if (err) throw err;
      });
    }
    // console.log('block by height:', block_number, blockInfo.chunks.length, chunkDetails.transactions.length);
    block_number--
  }
  let averageTime = (endTime - startTime);
  console.log('startBlock', startblock, 'endBlock', endblock)
  console.log(`total time`, averageTime)
  console.log(`total txs: `, totalTransactions)
  console.log(`avg tps`, totalTransactions / averageTime)
  process.exit()
}
