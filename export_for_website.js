var Web3 = require('./index.js');
var web3 = new Web3();

if (typeof window !== 'undefined') {
    if (typeof window.web3 === 'undefined'){
        window.web3 = web3;
    }
    if (typeof window.heliosWeb3 === 'undefined'){
        window.heliosWeb3 = web3;
    }
}

module.exports = {
    web3: web3,
    heliosWeb3: heliosWeb3
};