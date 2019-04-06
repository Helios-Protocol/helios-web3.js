===========================
Web3.js for Helios Protocol
===========================

This is web3.js for Helios Protocol. It is currently under active development.

How to use
----------
If you are building an application in nodejs:

    .. code:: bash

        $ npm install helios-web3

If you are building a application to run in the browser:

1)  Copy the compiled browser file from the dist directory, and then include it into your html file normally

2)  Access web3 from within your javascript using either of the window variables:

        .. code:: bash

            web3
            heliosWeb3

3)  Access Helios functions using:

        .. code:: bash

            web3.hls
            heliosWeb3.hls

If you would like to develop helios-web3:

1)  Clone this repo

        .. code:: bash

            $ git clone https://github.com/Helios-Protocol/helios-web3.js

2)  Install using npm

        .. code:: bash

            $ cd helios-web3.js
            $ npm install

How to compile the browser version using browserify:

.. code:: bash

    $ browserify export_for_website.js -o dist/helios_web3.js




Documentation
-------------
Documentation is a work in progress

Many of the functions used on Ethereum's web3.js will work on Helios as long as they are applicable.
You can see the documentation for that `here <https://web3js.readthedocs.io>`_.

Here we will show documentation for Helios specific functionality.

web3.hls.getBlock(blockHashOrBlockNumber [, chainAddress, returnTransactionObjects] [, callback])
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Parameters**
Same as web3.hls.getBlock with the addition of chainAddress. If blockHashorBlockNumber is a number, then you must provide
a chainAddress so that the node knows which chain the block lives on.

**Returns**
"chainAddress"
"extraData"
"gasLimit"
"gasUsed"
"hash"
"logsBloom"
"number"
"parentHash"
"rewardHash"
"accountHash"
"receiptsRoot"
"timestamp"
"accountBalance"
"transactionsRoot"
"receiveTransactionsRoot"
"transactions"
"receiveTransactions"
"rewardBundle"


**example transactions**
includes "gasUsed", unlike eth

**example receiveTransactions**
hash: "0xb52610ea9fefb6a2af025edc8e56d07c78d7446f1f0fe34005672ec3127ed965"
isRefund: "0x0"
remainingRefund: "0"
sendTransactionHash: "0xe5b564e507e45e24b789164aecb124f451ffc446c6f1c12a0a11ef0678eedf8e"
from: "0xdb4ca426d53b59f60370274ffb19f2268dc33ddf"
senderBlockHash: "0xd69c6653e39d625ce19eb445563a55712666972d695e8ac904f988166b085d10"
value: "14000000000000000000000"
this needs updating

web3.hls.getBlockNumber(chainAddress [, callback])
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Parameters**
Same as web3.hls.getBlockNumber with the addition of chainAddress and beforeTimestamp.
chainAddress is the address of the chain that you would like the block number for. if beforeTimestamp
is specified, it will return the latest block number before the timestamp. It will produce an error if
there are no matching blocks.

**Returns**
Same as web3.hls.getBlockNumber

web3.hls.getHistoricalGasPrice([callback])
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
**Returns**
A list of [timestamp, gas_price] entries for as far back as the node saves.

web3.hls.getTransactionReceipt(hash [, callback])
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Same as with ethereum web3 except it returns 1 additional parameter:
"is_receive"



