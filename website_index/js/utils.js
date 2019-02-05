function toCSV(data){

    var lineArray = [];
    data.forEach(function (infoArray, index) {
        var line = infoArray.join(",");
        lineArray.push(line);
    });
    var csvContent = lineArray.join("\n");
    return csvContent;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

var clear_vars = function(include_account = false){
    if (include_account){
        sending_account = null;
    }
    pending_send_transactions = [];
}