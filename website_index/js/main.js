var available_nodes = [
    "ws://127.0.0.1:30304",
    "ws://142.58.49.25:30304"
]
//"ws://127.0.0.1:30304",
//var API_address = "ws://142.58.49.25:30304";
var sending_account = null
var pending_send_transactions = []

var testing_transactions = []

$( document ).ready(function() {
    setInterval(network_connection_maintainer_loop, 1000);
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

    $('#receive_incoming_transactions').click(function (e){

        if(sending_account == null){
            set_status('Need to load a wallet first')
            return
        }

        web3.hls.sendRewardBlock(sending_account.address)
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

    $('#get_min_gas_price').click(function (e){
        if(sending_account == null){
            set_status('Need to load a wallet first')
            return
        }
        web3.hls.getGasPrice()
            .then(console.log)
    });

    $('#get_transaction_receipt').click(function (e){
        if(sending_account == null){
            set_status('Need to load a wallet first')
            return
        }
        web3.hls.getBlockNumber(sending_account.address)
            .then(function(args0){
                web3.hls.getBlock(args0, sending_account.address, true)
                    .then(function(args){
                        if(args.transactions.length > 0) {
                            web3.hls.getTransactionReceipt(args.transactions[0].hash)
                                .then(console.log);
                        }

                        if(args.receiveTransactions.length > 0) {
                            web3.hls.getTransactionReceipt(args.receiveTransactions[0].hash)
                                .then(console.log);
                        }


                    });

            })


    });

    $('#get_historical_min_gas_price').click(function (e){
        if(sending_account == null){
            set_status('Need to load a wallet first')
            return
        }
        web3.hls.getHistoricalGasPrice()
            .then(function(args){
                div = document.getElementById("plot_div");
                var csv_string = toCSV(args)
                var g = new Dygraph(div, csv_string);
            })
    });

    setInterval(refresh_loop, 1000);
    init_min_gas_price();

});

//
// Loops
//

async function network_connection_maintainer_loop(){
    //console.log(web3.currentProvider);
    if(web3.currentProvider == null){
        set_connection_status('Connecting to network.');
        await connect_to_first_available_node()
    }

    if(web3.currentProvider.connected){
        var url = web3.currentProvider.connection.url;
        set_connection_status('Connected to node '+url);
    } else{
        set_connection_status('Connection to network failed. Retrying connection.');
        if(await connect_to_first_available_node()){
            var url = web3.currentProvider.connection.url;
            set_connection_status('Connected to node '+url);
        }
    }

}

async function connect_to_first_available_node(){
    for(i=0;i<available_nodes.length;i++) {
        var API_address = available_nodes[i];
        if(web3.currentProvider == null || !web3.currentProvider.connected) {
            web3.setProvider(new web3.providers.WebsocketProvider(API_address));
            await sleep(100);
        }else{
            return true;
        }
    }
    return false
}

function refresh_loop(){
    if(sending_account != null){
        refresh_transactions()
    }

}


//
// General functionality
//
function refresh_transactions(){
    if(sending_account == null){
        set_status('Need to load a wallet first')
        return
    }

    var from_month = $('select.from_month').children("option:selected").val();
    var from_year = $('select.from_year').children("option:selected").val();
    var to_month = $('select.to_month').children("option:selected").val();
    var to_year = $('select.to_year').children("option:selected").val();

    var start_timestamp = new Date(from_year, from_month, 01).getTime() / 1000
    var end_timestamp = new Date(to_year, to_month, 01).getTime() / 1000

    get_all_transactions(start_timestamp, end_timestamp)
    .then(function(txs){
        if(!txs){
            $('#transactions').html("Connecting to server");
        } else {

            if (txs.length > 0) {
                $('#transactions').html('<table class="transaction_list_table">');
                $('#transactions').append("<tr><th>Date</th><th>Description</th><th>Amount</th><th>Fees</th><th>Balance</th><th>Block Number</th></tr>")
                var prev_block_number = null
                for (i = 0; i < txs.length; i++) {
                    var tx = txs[i];
                    var d = new Date(0); // The 0 there is the key, which sets the date to the epoch
                    d.setUTCSeconds(tx.timestamp);

                    if (prev_block_number == null || prev_block_number != tx.block_number) {
                        $('#transactions').append("<tr><td>" + d.toLocaleString() + "</td><td>" + tx.description + "</td><td>" + tx.value + "</td><td>" + tx.gas_cost + "</td><td>" + tx.balance + "</td><td>" + tx.block_number + "</td></tr>");
                    } else {
                        $('#transactions').append("<tr><td>" + d.toLocaleString() + "</td><td>" + tx.description + "</td><td>" + tx.value + "</td><td></td><td>" + tx.block_number + "</td></tr>");
                    }
                    prev_block_number = tx.block_number
                }
                $('#transactions').append("</table>");
            }
        }
    });
}



//returns a list of tx_info
async function get_all_transactions(start_timestamp, end_timestamp){
    if (start_timestamp < end_timestamp){
        start_timestamp = [end_timestamp, end_timestamp = start_timestamp][0];
    }

    try{
        var start_block_number = await web3.hls.getBlockNumber(sending_account.address)
    }catch(err) {
        return false
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
                output.push(new tx_info(new_block.timestamp, "Send transaction", -1*tx.value, -1*tx.gasUsed, tx.to, null, new_block.accountBalance, new_block.number))

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
                output.push(new tx_info(new_block.timestamp, description, tx.value,-1*tx.gasUsed, null, tx.from, new_block.accountBalance, new_block.number))
            }
        }
        output.push(new tx_info(new_block.timestamp, "Reward type 1", new_block.rewardBundle.rewardType1.amount, 0, null, null, new_block.accountBalance, new_block.number))
        output.push(new tx_info(new_block.timestamp, "Reward type 2", new_block.rewardBundle.rewardType2.amount, 0, null, null, new_block.accountBalance, new_block.number))
    }
    return output
}


function init_min_gas_price(){
    if(web3.currentProvider == null || !web3.currentProvider.connected) {
        //Not connected yet. Try again in a few seconds.
        setTimeout(init_min_gas_price, 1000);
    }else {
        web3.hls.getGasPrice()
            .then(function (min_gas_price) {
                $('#input_gas_price').attr('value', min_gas_price + 1);
                $('#input_gas_price').attr('min', min_gas_price);
            });
    }
}


