"use strict";


var _ = require('underscore');
var utils = require('web3-utils');
var Iban = require('web3-eth-iban');
var helpers = require('web3-core-helpers');
var formatter = helpers.formatters;

var outputBlockCreationParamsFormatter = function(block_creation_params) {

    // transform to number
    block_creation_params.block_number = utils.hexToNumber(block_creation_params.block_number);
    block_creation_params.nonce = utils.hexToNumber(block_creation_params.nonce);

    return block_creation_params;
};

var outputTransactionFormatter = function (tx){

    if(tx.blockNumber !== null)
        tx.blockNumber = utils.hexToNumber(tx.blockNumber);
    if(tx.transactionIndex !== null)
        tx.transactionIndex = utils.hexToNumber(tx.transactionIndex);
    tx.nonce = utils.hexToNumber(tx.nonce);
    tx.gas = utils.hexToNumber(tx.gas);
    tx.gasPrice = formatter.outputBigNumberFormatter(tx.gasPrice);
    tx.value = formatter.outputBigNumberFormatter(tx.value);

    if(tx.to && utils.isAddress(tx.to)) { // tx.to could be `0x0` or `null` while contract creation
        tx.to = utils.toChecksumAddress(tx.to);
    } else {
        tx.to = null; // set to `null` if invalid address
    }

    if(tx.from) {
        tx.from = utils.toChecksumAddress(tx.from);
    }

    tx.gasUsed = formatter.outputBigNumberFormatter(tx.gasUsed);

    console.log("DEBUG");
    console.log(tx.gasPrice);
    console.log(tx.gasUsed);
    return tx;
};

var outputReceiveTransactionFormatter = function (tx){

    tx.remainingRefund = formatter.outputBigNumberFormatter(tx.remainingRefund);
    tx.value = formatter.outputBigNumberFormatter(tx.value);
    tx.txTypeId = utils.hexToNumber(tx.txTypeId);
    tx.gasUsed = formatter.outputBigNumberFormatter(tx.gasUsed);
    tx.isRefund = Boolean(parseInt(tx.isRefund));
    tx.from = utils.toChecksumAddress(tx.from);
    return tx
};


var outputRewardType1Formatter = function (reward){
    reward.amount = formatter.outputBigNumberFormatter(reward.amount);
    return reward
}

var outputRewardStakingScoreFormatter = function (score){
    score.recipientNodeWalletAddress = utils.toChecksumAddress(score.recipientNodeWalletAddress);
    score.since_block_number = utils.hexToNumber(score.since_block_number);
    score.timestamp = utils.hexToNumber(score.timestamp);
    return score
}

var outputRewardType2Formatter = function (reward){
    reward.amount = formatter.outputBigNumberFormatter(reward.amount);

    if (_.isArray(reward.proof)) {
        reward.proof = reward.proof.map(function(item) {
            if(!_.isString(item))
                return outputRewardStakingScoreFormatter(item);
        });
    }
    return reward

}

var outputRewardBundleFormatter = function (bundle){

    bundle.rewardType1 = outputRewardType1Formatter(bundle.rewardType1)
    bundle.rewardType2 = outputRewardType2Formatter(bundle.rewardType2)
    return bundle
};

var outputBlockFormatter = function(block) {
    block.chainAddress = utils.toChecksumAddress(block.chainAddress);
    block.accountBalance = formatter.outputBigNumberFormatter(block.accountBalance);


    // transform to number
    block.gasLimit = utils.hexToNumber(block.gasLimit);
    block.gasUsed = utils.hexToNumber(block.gasUsed);
    block.size = utils.hexToNumber(block.size);
    block.timestamp = utils.hexToNumber(block.timestamp);
    if (block.number !== null)
        block.number = utils.hexToNumber(block.number);

    if(block.difficulty)
        block.difficulty = formatter.outputBigNumberFormatter(block.difficulty);
    if(block.totalDifficulty)
        block.totalDifficulty = formatter.outputBigNumberFormatter(block.totalDifficulty);

    if (_.isArray(block.transactions)) {
        block.transactions = block.transactions.map(function(item) {
            if(!_.isString(item))
                return outputTransactionFormatter(item);
        });
    }

    if (_.isArray(block.receiveTransactions)) {
        block.receiveTransactions = block.receiveTransactions.map(function(item) {
            if(!_.isString(item))
                return outputReceiveTransactionFormatter(item);
        });
    }



    if (block.rewardBundle)
        block.rewardBundle = outputRewardBundleFormatter(block.rewardBundle)


    return block;
};

var outputHistoricalGas = function(historicalGasPrice){
    historicalGasPrice = [utils.hexToNumber(historicalGasPrice[0]), utils.hexToNumber(historicalGasPrice[1])]
    return historicalGasPrice
}

var outputTransactionReceiptFormatter = function (receipt){
    if(typeof receipt !== 'object') {
        throw new Error('Received receipt is invalid: '+ receipt);
    }

    if(receipt.blockNumber !== null)
        receipt.blockNumber = utils.hexToNumber(receipt.blockNumber);
    if(receipt.transactionIndex !== null)
        receipt.transactionIndex = utils.hexToNumber(receipt.transactionIndex);
    receipt.cumulativeGasUsed = utils.hexToNumber(receipt.cumulativeGasUsed);
    receipt.gasUsed = utils.hexToNumber(receipt.gasUsed);

    if(_.isArray(receipt.logs)) {
        receipt.logs = receipt.logs.map(formatter.outputLogFormatter);
    }

    if(receipt.contractAddress) {
        receipt.contractAddress = utils.toChecksumAddress(receipt.contractAddress);
    }

    if(typeof receipt.status !== 'undefined') {
        receipt.status = Boolean(parseInt(receipt.status));
    }

    receipt.isReceive = Boolean(parseInt(receipt.isReceive));

    return receipt;
};


var inputTimestampFormatter = function(timestamp){
    if (timestamp === undefined) {
        return undefined;
    }
    return (utils.isHexStrict(timestamp)) ? ((_.isString(timestamp)) ? timestamp.toLowerCase() : timestamp) : utils.numberToHex(timestamp);
};

var inputOptionalHexHashFormatter = function (value) {
    if (_.isNull(value) || _.isUndefined(value)) {
        return '0x';
    }
    return '0x' + value.toLowerCase().replace('0x','');
};

var InputBlockFormatter = function(args) {
    return (_.isString(args[0]) && args[0].indexOf('0x') === 0) ? [formatter.inputBlockNumberFormatter, function (val) { return !!val; }] : [formatter.inputBlockNumberFormatter, function (val) { return val; }, function (val) { return !!val; }];

};

module.exports = {
    outputBlockCreationParamsFormatter: outputBlockCreationParamsFormatter,
    outputBlockFormatter: outputBlockFormatter,
    outputHistoricalGas: outputHistoricalGas,
    outputTransactionFormatter: outputTransactionFormatter,
    outputTransactionReceiptFormatter: outputTransactionReceiptFormatter,
    outputReceiveTransactionFormatter: outputReceiveTransactionFormatter,
    inputTimestampFormatter: inputTimestampFormatter,
    inputOptionalHexHashFormatter: inputOptionalHexHashFormatter,
    InputBlockFormatter: InputBlockFormatter
};