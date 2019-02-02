const ethUtil = require('ethereumjs-util');
var Trie = require('merkle-patricia-tree')
var rlp = require('rlp');
var Wallet = require('ethereumjs-wallet');

const BN = ethUtil.BN

// secp256k1n/2
const N_DIV_2 = new BN('7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0', 16)

/**
 * Creates a new transaction object.
 *
 * @example
 * var rawTx = {
 *   nonce: '0x00',
 *   gas_price: '0x09184e72a000',
 *   gas_limit: '0x2710',
 *   to: '0x0000000000000000000000000000000000000000',
 *   value: '0x00',
 *   data: '0x7f7465737432000000000000000000000000000000000000000000000000000000600057',
 *   v: '0x1c',
 *   r: '0x5e1d3a76fbf824220eafc8c79ad578ad2b67d01b0c2425eb1f1347e8f50882ab',
 *   s: '0x5bd428537f05f9830e93792f90ea6a3e2d1ee84952dd96edbae9f658f831ab13'
 * };
 * var tx = new Transaction(rawTx);
 *
 * @class
 * @param {Buffer | Array | Object} data a transaction can be initiailized with either a buffer containing the RLP serialized transaction or an array of buffers relating to each of the tx Properties, listed in order below in the exmple.
 *
 * Or lastly an Object containing the Properties of the transaction like in the Usage example.
 *
 * For Object and Arrays each of the elements can either be a Buffer, a hex-prefixed (0x) String , Number, or an object with a toBuffer method such as Bignum
 *
 * @property {Buffer} raw The raw rlp encoded transaction
 * @param {Buffer} data.nonce nonce number
 * @param {Buffer} data.gas_limit transaction gas limit
 * @param {Buffer} data.gas_price transaction gas price
 * @param {Buffer} data.to to the to address
 * @param {Buffer} data.value the amount of ether sent
 * @param {Buffer} data.data this will contain the data of the message or the init of a contract
 * @param {Buffer} data.v EC recovery ID
 * @param {Buffer} data.r EC signature parameter
 * @param {Buffer} data.s EC signature parameter
 * @param {Number} data.chainId EIP 155 chainId - mainnet: 1, ropsten: 3
 * */

class HeliosTx {
  constructor (data) {
    data = data || {}
    // Define Properties
    const fields = [{
      name: 'nonce',
      length: 32,
      allowLess: true,
      default: new Buffer([])
    }, {
      name: 'gas_price',
      length: 32,
      allowLess: true,
      default: new Buffer([])
    }, {
      name: 'gas',
      length: 32,
      allowLess: true,
      default: new Buffer([])
    }, {
      name: 'to',
      allowZero: true,
      length: 20,
      default: new Buffer([])
    }, {
      name: 'value',
      length: 32,
      allowLess: true,
      default: new Buffer([])
    }, {
      name: 'data',
      alias: 'input',
      allowZero: true,
      default: new Buffer([])
    }, {
      name: 'v',
      allowZero: true,
      default: new Buffer([0x1c])
    }, {
      name: 'r',
      length: 32,
      allowZero: true,
      allowLess: true,
      default: new Buffer([])
    }, {
      name: 's',
      length: 32,
      allowZero: true,
      allowLess: true,
      default: new Buffer([])
    }]

    /**
     * Returns the rlp encoding of the transaction
     * @method serialize
     * @return {Buffer}
     * @memberof Transaction
     * @name serialize
     */
    // attached serialize
    ethUtil.defineProperties(this, fields, data)

    /**
     * @property {Buffer} from (read only) sender address of this transaction, mathematically derived from other parameters.
     * @name from
     * @memberof Transaction
     */
    Object.defineProperty(this, 'from', {
      enumerable: true,
      configurable: true,
      get: this.getSenderAddress.bind(this)
    })

    // calculate chainId from signature
    let sigV = ethUtil.bufferToInt(this.v)
    let chainId = Math.floor((sigV - 35) / 2)
    if (chainId < 0) chainId = 0


    // set chainId
    this._chainId = chainId || data.chainId || 1

    this._homestead = true
  }

  /**
   * If the tx's `to` is to the creation address
   * @return {Boolean}
   */
  toCreationAddress () {
    return this.to.toString('hex') === ''
  }

  /**
   * Computes a sha3-256 hash of the serialized tx
   * @param {Boolean} [includeSignature=true] whether or not to inculde the signature
   * @return {Buffer}
   */
  hash (includeSignature) {
    if (includeSignature === undefined) includeSignature = true

    // EIP155 spec:
    // when computing the hash of a transaction for purposes of signing or recovering,
    // instead of hashing only the first six elements (ie. nonce, gas_price, startgas, to, value, data),
    // hash nine elements, with v replaced by CHAIN_ID, r = 0 and s = 0

    let items
    if (includeSignature) {
      items = this.raw
    } else {
      if (this._chainId > 0) {
        const raw = this.raw.slice()
        this.v = this._chainId
        this.r = 0
        this.s = 0
        items = this.raw
        this.raw = raw
      } else {
        items = this.raw.slice(0, 6)
      }
    }

    // create hash
    return ethUtil.rlphash(items)
  }

  /**
   * returns chain ID
   * @return {Buffer}
   */
  getChainId () {
    return this._chainId
  }

  /**
   * returns the sender's address
   * @return {Buffer}
   */
  getSenderAddress () {
    if (this._from) {
      return this._from
    }
    const pubkey = this.getSenderPublicKey()
    this._from = ethUtil.publicToAddress(pubkey)
    return this._from
  }

  /**
   * returns the public key of the sender
   * @return {Buffer}
   */
  getSenderPublicKey () {
    if (!this._senderPubKey || !this._senderPubKey.length) {
      if (!this.verifySignature()) throw new Error('Invalid Signature')
    }
    return this._senderPubKey
  }

  /**
   * Determines if the signature is valid
   * @return {Boolean}
   */
  verifySignature () {
    const msgHash = this.hash(false)
    // All transaction signatures whose s-value is greater than secp256k1n/2 are considered invalid.
    if (this._homestead && new BN(this.s).cmp(N_DIV_2) === 1) {
      return false
    }

    try {
      let v = ethUtil.bufferToInt(this.v)
      if (this._chainId > 0) {
        v -= this._chainId * 2 + 8
      }
      this._senderPubKey = ethUtil.ecrecover(msgHash, v, this.r, this.s)
    } catch (e) {
      return false
    }

    return !!this._senderPubKey
  }

  /**
   * sign a transaction with a given private key
   * @param {Buffer} privateKey
   */
  sign (privateKey) {
    const msgHash = this.hash(false)
    const sig = ethUtil.ecsign(msgHash, privateKey)
    if (this._chainId > 0) {
      sig.v += this._chainId * 2 + 8
    }
    Object.assign(this, sig)
  }

  signFromString (privateKeyString) {
    var privateKey = new Buffer(privateKeyString, 'hex')
    this.sign(privateKey)
  }


  toJSONString(){
    return JSON.stringify(this.toJSON(true))
  }


//  /**
//   * The amount of gas paid for the data in this tx
//   * @return {BN}
//   */
//  getDataFee () {
//    const data = this.raw[5]
//    const cost = new BN(0)
//    for (let i = 0; i < data.length; i++) {
//      data[i] === 0 ? cost.iaddn(fees.txDataZeroGas.v) : cost.iaddn(fees.txDataNonZeroGas.v)
//    }
//    return cost
//  }
//
//  /**
//   * the minimum amount of gas the tx must have (DataFee + TxFee + Creation Fee)
//   * @return {BN}
//   */
//  getBaseFee () {
//    const fee = this.getDataFee().iaddn(fees.txGas.v)
//    if (this._homestead && this.toCreationAddress()) {
//      fee.iaddn(fees.txCreation.v)
//    }
//    return fee
//  }

  /**
   * the up front amount that an account must have for this transaction to be valid
   * @return {BN}
   */
  getUpfrontCost () {
    return new BN(this.gas_limit)
      .imul(new BN(this.gas_price))
      .iadd(new BN(this.value))
  }

  /**
   * validates the signature and checks to see if it has enough gas
   * @param {Boolean} [stringError=false] whether to return a string with a description of why the validation failed or return a Boolean
   * @return {Boolean|String}
   */
  validate (stringError) {
    const errors = []
    if (!this.verifySignature()) {
      errors.push('Invalid Signature')
    }

    if (this.getBaseFee().cmp(new BN(this.gas_limit)) > 0) {
      errors.push([`gas limit is too low. Need at least ${this.getBaseFee()}`])
    }

    if (stringError === undefined || stringError === false) {
      return errors.length === 0
    } else {
      return errors.join(' ')
    }
  }
}


class HeliosReceiveTx {
  constructor (data) {
    data = data || {}
    // Define Properties
    const fields = [{
      name: 'sender_block_hash',
      length: 32,
      allowLess: false,
      default: new Buffer([]) //this will throw an error if no value is given
    }, {
      name: 'transaction_hash',
      length: 32,
      allowLess: false,
      default: new Buffer([]) //this will throw an error if no value is given
    }]

    /**
     * Returns the rlp encoding of the transaction
     * @method serialize
     * @return {Buffer}
     * @memberof Transaction
     * @name serialize
     */
    // attached serialize
    ethUtil.defineProperties(this, fields, data)

  }



  /**
   * Computes a sha3-256 hash of the serialized tx
   * @param {Boolean} [includeSignature=true] whether or not to inculde the signature
   * @return {Buffer}
   */
  hash () {

    let items
    items = this.raw

    // create hash
    return ethUtil.rlphash(items)
  }



  toJSONString(){
    return JSON.stringify(this.toJSON(true))
  }


}


class HeliosMicroHeader {
  constructor (data) {
    data = data || {}
    // Define Properties
    const fields = [{
      name: 'parent_hash',
      length: 32,
      allowLess: false,
      default: Buffer.from("0000000000000000000000000000000000000000000000000000000000000000", "hex")
    }, {
      name: 'transaction_root',
      length: 32,
      allowZero: true,
      default: new Buffer([])
    },{
      name: 'receive_transaction_root',
      length: 32,
      allowZero: true,
      default: new Buffer([])
    }, {
      name: 'block_number',
      allowZero: true,
      default: new Buffer([])
    }, {
      name: 'timestamp',
      default: new Buffer([])
    }, {
      name: 'extra_data',
      allowZero: true,
      default: new Buffer([])
    }, {
      name: 'v',
      allowZero: true,
      default: new Buffer([0x1c])
    }, {
      name: 'r',
      length: 32,
      allowZero: true,
      allowLess: true,
      default: new Buffer([])
    }, {
      name: 's',
      length: 32,
      allowZero: true,
      allowLess: true,
      default: new Buffer([])
    }]

    /**
     * Returns the rlp encoding of the transaction
     * @method serialize
     * @return {Buffer}
     * @memberof Transaction
     * @name serialize
     */
    // attached serialize
    ethUtil.defineProperties(this, fields, data)

    /**
     * @property {Buffer} from (read only) sender address of this transaction, mathematically derived from other parameters.
     * @name from
     * @memberof Transaction
     */

    // calculate chainId from signature
    let sigV = ethUtil.bufferToInt(this.v)
    let chainId = Math.floor((sigV - 35) / 2)
    if (chainId < 0) chainId = 0

    // set chainId
    this._chainId = chainId || data.chainId || 1
  }

  /**
   * Computes a sha3-256 hash of the serialized tx
   * @param {Boolean} [includeSignature=true] whether or not to inculde the signature
   * @return {Buffer}
   */
  hash (includeSignature) {
    if (includeSignature === undefined) includeSignature = true

    // EIP155 spec:
    // when computing the hash of a transaction for purposes of signing or recovering,
    // instead of hashing only the first six elements (ie. nonce, gas_price, startgas, to, value, data),
    // hash nine elements, with v replaced by CHAIN_ID, r = 0 and s = 0

    let items
    if (includeSignature) {
      items = this.raw
    } else {
      if (this._chainId > 0) {
        const raw = this.raw.slice()
        this.v = this._chainId
        this.r = 0
        this.s = 0

        items = this.raw
        this.raw = raw
      } else {
        items = this.raw.slice(0, 6)
      }
    }

    // create hash
    return ethUtil.rlphash(items)
  }


  /**
   * sign a transaction with a given private key
   * @param {Buffer} privateKey
   */
  sign (privateKey) {
    const msgHash = this.hash(false)
    const sig = ethUtil.ecsign(msgHash, privateKey)
    if (this._chainId > 0) {
      sig.v += this._chainId * 2 + 8
    }
    Object.assign(this, sig)
  }

  signFromString (privateKeyString) {
    var privateKey = new Buffer(privateKeyString, 'hex')
    this.sign(privateKey)
  }

}


class HeliosMicroBlock {
  constructor (data) {
    data = data || {}
    // Define Properties
    this.header = null
    this.transactions = []
    this.receive_transactions = []

  }

  hash(){
    return this.header.hash()
  }
  getSendTxRoot(callback, as_string = false){
    var ops = []
    var trie = new Trie()
    this.transactions.forEach(function(tx, i) {
        var encoded_tx = rlp.encode(tx.raw)
        var index = rlp.encode(i)
        ops.push({ type: 'put', key: index, value: encoded_tx})
    });

    trie.batch(ops, function () {
        if(as_string){
            callback(trie.root.toString('hex'))
        }else{
            callback(trie.root)
        }
    });
  }

  getReceiveTxRoot(callback, as_string = false){
    var ops = []
    var trie = new Trie()
    this.receive_transactions.forEach(function(tx, i) {
        var encoded_tx = rlp.encode(tx.raw)
        var index = rlp.encode(i)
        ops.push({ type: 'put', key: index, value: encoded_tx})
    });

    trie.batch(ops, function () {
        if(as_string){
            callback(trie.root.toString('hex'))
        }else{
            callback(trie.root)
        }

    });
  }


  trieTest(callback){
    var roots = {}
    var trie = new Trie()

    var index_1 = rlp.encode(1)
    var encoded_tx_1 = rlp.encode('test1')

    var index_2 = rlp.encode(2)
    var encoded_tx_2 = rlp.encode('test2')

    var root = 0
    var index_3 = rlp.encode(3)
    var encoded_tx_3 = rlp.encode('test3')

    var ops = []
    ops.push({type: 'put', key: index_1, value: encoded_tx_1})
    ops.push({type: 'put', key: index_2, value: encoded_tx_2})
    ops.push({type: 'put', key: index_3, value: encoded_tx_3})

    trie.batch(ops, function () {
        callback(trie.root.toString('hex'))

    });

  }

  add_transaction(tx){
    this.transactions.push(tx);
  }

  add_receive_transaction(tx){
    this.receive_transactions.push(tx);
  }

  as_dict(){
    var transaction_dict_list = []
    for (var i = 0; i < this.transactions.length; i++) {
        transaction_dict_list.push(this.transactions[i].toJSON(true))
    }

    var receive_transaction_dict_list = []
    for (var i = 0; i < this.receive_transactions.length; i++) {
        receive_transaction_dict_list.push(this.receive_transactions[i].toJSON(true))
    }

    var to_return = {
        header: this.header.toJSON(true),
        transactions: transaction_dict_list,
        receive_transactions: receive_transaction_dict_list
    }
    return to_return

  }
}








if (typeof window !== 'undefined') {
    if (typeof window.HeliosTx === 'undefined'){
        window.HeliosTx = HeliosTx;
    }
    if (typeof window.HeliosMicroBlock === 'undefined'){
        window.HeliosMicroBlock = HeliosMicroBlock;
    }
    if (typeof window.HeliosMicroHeader === 'undefined'){
        window.HeliosMicroHeader = HeliosMicroHeader;
    }
    if (typeof window.HeliosReceiveTx === 'undefined'){
        window.HeliosReceiveTx = HeliosReceiveTx;
    }
    if (typeof window.Wallet === 'undefined'){
        window.Wallet = Wallet;
    }
    if (typeof window.ethUtil === 'undefined'){
        window.ethUtil = ethUtil;
    }
}



module.exports = HeliosTx;
module.exports = HeliosMicroBlock;
module.exports = HeliosMicroHeader;
module.exports = HeliosReceiveTx;
module.exports = Wallet;
module.exports = ethUtil;

//
////testing
//var rawTx = {
//    parent_hash : '0xb4aed3c109df6ae3f8dcfe9de12e6d2fd0670522a3aaa85d3694e65030f409f3'
//};
//test_header = new HeliosMicroHeader();
//////test_header = new HeliosMicroHeader('0xb4aed3c109df6ae3f8dcfe9de12e6d2fd0670522a3aaa85d3694e65030f409f3');
//
//console.log('initial block number '+test_header.block_number.toString('hex'))
//console.log('initial parent hash '+test_header.parent_hash.toString('hex'))
//
//test_header.block_number = 2;
//
//console.log('final block number '+test_header.block_number.toString('hex'))
//console.log('final parent hash '+test_header.parent_hash.toString('hex'))


