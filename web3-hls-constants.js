"use strict";


var getPhotonTimestamp = function (networkId) {
    if(parseInt(networkId) === 1){
        // Mainnet
        return 9566516221;
    }else if(parseInt(networkId) === 42){
        // Hypothesis Testnet
        return 9574737165;
    }

};

module.exports = {
    getPhotonTimestamp: getPhotonTimestamp,
};
