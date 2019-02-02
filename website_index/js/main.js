var API_address = "ws://127.0.0.1:30304";
//var API_address = "ws://142.58.49.25:30304";
var sending_account = null
var pending_send_transactions = []

$( document ).ready(function() {

    web3.setProvider(new web3.providers.WebsocketProvider(API_address));
    hls = web3.hls;

    $('#load_wallet_form').submit(function (e){
        e.preventDefault();

        //clear all variables when a new wallet is loaded
        clear_vars();
        var private_key_string = $('#input_private_key').val();

        account = web3.hls.accounts.privateKeyToAccount(private_key_string);
        sending_account = account;
        hls.accounts.wallet.add(account);

        $('#loaded_wallet_status').text('Sending from '+account.address);

        console.log("private key added")
    });


    $('#add_transaction_form').submit(function (e){
        e.preventDefault();

        if(sending_account == null){
            $('#error_status').text('Need to load a wallet first')
            return
        }

        var amount = $('#input_amount').val();
        var to = $('#input_to').val();
        var gas_price = $('#input_gas_price').val();
        var total_gas = $('#input_total_gas').val();

        var transaction = {
                        from: sending_account.address,
                        to: to,
                        value: amount,
                        gas: parseInt(total_gas),
                        gasPrice: gas_price,
                        chainId: 1
                    }

        pending_send_transactions.push(transaction)
        set_status("Transaction successfully added to block");
    });

    $('#send_block').submit(function (e){
        e.preventDefault();
        if(sending_account == null){
            set_status('Need to load a wallet first')
            return
        }

        web3.hls.sendTransactions(pending_send_transactions)
        .then(function(){
            set_status("Block successfully sent");
        })

        clear_vars();


    });

    $('#refresh_transactions').click(function (e){
        if(sending_account == null){
            set_status('Need to load a wallet first')
            return
        }

        refresh_transactions();
    });

    setInterval(refresh_transactions, 1000);

});

function refresh_transactions(){
    if(sending_account == null){
        set_status('Need to load a wallet first')
        return
    }

    var now = new Date().getTime() / 1000;
    get_all_transactions(now, 0)
    .then(function(txs){
        $('#transactions').html('<table class="transaction_list_table">');
        $('#transactions').append("<tr><th>Date</th><th>Description</th><th>Value</th><th>Balance</th><th>Block Number</th>")
        if(txs.length > 0){
            var prev_block_number = null
            for(i=0; i< txs.length; i++){
                var tx = txs[i];
                var d = new Date(0); // The 0 there is the key, which sets the date to the epoch
                d.setUTCSeconds(tx[0]);

                if(prev_block_number == null || prev_block_number != tx[5]){
                    $('#transactions').append("<tr><td>"+d.toLocaleString()+"</td><td>"+tx[1]+"</td><td>"+tx[2]+"</td><td>"+tx[4]+"</td><td>"+tx[5]+"</td></tr>");
                }else{
                    $('#transactions').append("<tr><td>"+d.toLocaleString()+"</td><td>"+tx[1]+"</td><td>"+tx[2]+"</td><td></td><td>"+tx[5]+"</td></tr>");
                }
                prev_block_number = tx[5]
            }
        }
        $('#transactions').append("</table>");
    });
}

// tx_type
//returns a list of lists [block_timestamp, description, value (negative is send, positive is receive), from or to, final_block_balance, block_number]
async function get_all_transactions(start_timestamp, end_timestamp){
    if (start_timestamp < end_timestamp){
        start_timestamp = [end_timestamp, end_timestamp = start_timestamp][0];
    }

    try{
        var start_block_number = await web3.hls.getBlockNumber(sending_account.address)
    }catch(err) {
        return []
    }
    var output = []

    for (i = start_block_number; i >= 0; i--) {
        var new_block = await web3.hls.getBlock(i, sending_account.address, true);
        if(new_block.timestamp > start_timestamp){
            continue;
        }
        if(new_block.timestamp < end_timestamp){
            break;
        }
        if(new_block.transactions.length > 0){
            for (j = 0; j < new_block.transactions.length; j++) {
                var tx = new_block.transactions[j]
                output.push([new_block.timestamp, "Send transaction", -1*tx.value, tx.to, new_block.accountBalance, new_block.number ])
            }
        }
        if(new_block.receiveTransactions.length > 0){
            for (j = 0; j < new_block.receiveTransactions.length; j++) {
                var tx = new_block.receiveTransactions[j]
                if (tx.isRefund == "0x0"){
                    var description = "Refund transaction"
                } else {
                    var description = "Receive transaction"
                }
                output.push([new_block.timestamp, description, tx.value, tx.from, new_block.accountBalance, new_block.number])
            }
        }

        output.push([new_block.timestamp, "Reward type 1", new_block.rewardBundle.rewardType1.amount, null, new_block.accountBalance, new_block.number])
        output.push([new_block.timestamp ,"Reward type 2", new_block.rewardBundle.rewardType2.amount, null, new_block.accountBalance, new_block.number])
    }
    return output
}


var clear_vars = function(include_account = false){
    if (include_account){
        sending_account = null;
    }
    pending_send_transactions = [];
}

var set_status = function(status){
    $('#current_status').text(status);
}