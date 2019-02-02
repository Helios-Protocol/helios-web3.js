var Web3 = require('./helios-web3.js');
var web3 = new Web3();

if (typeof window !== 'undefined') {
    if (typeof window.web3 === 'undefined'){
        window.web3 = web3;
    }
}

module.exports = web3;