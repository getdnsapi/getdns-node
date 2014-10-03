// Sample code to demonstrate the nodejs getdns API usage

var getdns = require('getdns');
var options = {
    // request timeout time in millis
    timeout : 5000,
    // always return dnssec status
    return_dnssec_status : true
};

// getdns query callback
var callback = function(err, result) {
        
        // if not null, err is an object w/ msg and code.
        // code maps to a GETDNS_CALLBACK_TYPE
        // result is a response dictionary
        if (result == null ) {
            process.stdout.write("Error: no result\n");
        } else {
            for ( var index in result.replies_tree) {
                format(JSON.stringify(result.replies_tree[index]));
            } 
        }
        // A third argument is also supplied as the transaction id
        // See below for the format of response
        // when done with a context, it must be explicitly destroyed
        context.destroy();
}

// create the context with the above options
var context = getdns.createContext(options);

// getdns general
// third argument may be a dictionary for extensions
// last argument must be a callback
var transactionId = context.lookup("getdnsapi.net", getdns.RRTYPE_A, callback);

// cancel a request
// context.cancel(transactionId);

// other methods, TODO: dont destroy context in callback to reuse
//context.getAddress("getdnsapi.net", callback);
//context.getService("getdnsapi.net", callback);
//context.getHostname("8.8.8.8", callback);

// extensions are passed as dictionaries
// where the value for on / off are normal bools
//context.getAddress("cnn.com", { return_both_v4_and_v6 : true }, callback);


// helper to format the output to a prettier printed output.
var format = function( buffer) {

    if (buffer.substring(0,5) === "HTTP/") {
        var index = buffer.indexOf('\r\n\r\n');
        var sepLen = 4;
        if (index == -1) {
            index = buffer.indexOf('\n\n');
            sepLen = 2;
        }
        if (index != -1) {
            process.stdout.write(buffer.slice(0, index+sepLen));
            buffer = buffer.substring(index+sepLen);
        }
    }
    if (buffer[0] === '{' || buffer[0] === '[') {
        try {
            process.stdout.write(JSON.stringify(JSON.parse(buffer), null, 2));
            process.stdout.write('\n');
        } catch(ex) {
            process.stdout.write(buffer);
            if (buffer[buffer.length-1] !== "\n") {
                process.stdout.write('\n');
            }
        }
    } else {
        process.stdout.write(buffer);
        if (buffer[buffer.length-1] !== "\n") {
            process.stdout.write('\n');
        }
    }

};

    
