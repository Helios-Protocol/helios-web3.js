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


var outputReceiveTransactionFormatter = function (tx){
    tx.remainingRefund = formatter.outputBigNumberFormatter(tx.remainingRefund);
    tx.value = formatter.outputBigNumberFormatter(tx.value);
    tx.txTypeId = utils.hexToNumber(tx.txTypeId);
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
                return formatter.outputRewardStakingScoreFormatter(item);
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
    console.log(block)
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
                return formatter.outputTransactionFormatter(item);
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


module.exports = {
    outputBlockCreationParamsFormatter: outputBlockCreationParamsFormatter,
    outputBlockFormatter: outputBlockFormatter
};