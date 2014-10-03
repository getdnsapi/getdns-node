// Sample code to demonstrate the nodejs getdns API usage

// pull in dependencies
var getdns = require('getdns');

var A_NAME = "getdnsapi.net";
var A_TYPE = getdns.RRTYPE_A;

// context options
var options = {
  return_dnssec_status : true,
  // request timeout time in millis
  timeout : 5000
};

// create the context with the above options
var context = getdns.createContext(options);

// response util - get a secure response of a particular type
var getFirstSecureResponse = function(err, result, type) {
   if (err) {
        console.log("An error occurred.. " + JSON.stringify(err));
        return err;
   } 

    console.log("tree.. " + format(JSON.stringify(result)));
    var replies_tree = result.replies_tree;

    // validate that there is a reply with an answer
    if (!replies_tree || !replies_tree.length ||
        !replies_tree[0].answer ||
        !replies_tree[0].answer.length) {
        return "Empty answer list for type " + type;
    }
    var reply = replies_tree[0];
    // ensure the reply is secure
    if (reply.dnssec_status != getdns.DNSSEC_SECURE) {
        return "Insecure reply for type " + type;
    }
    var answers = reply.answer;
    // get the records of that type
    answers = answers.filter(function(answer) {
        return answer.type == type;
    });
    if (!answers.length) {
        return "No answers of type " + type;
    }
    return answers[0];
};

var getResponse = function(callback) {
    context.lookup(A_NAME, A_TYPE, function(err, result) {
    if (err) {
        console.log("An error occurred.. " + JSON.stringify(err));
    } 
    var    record = getFirstSecureResponse(err, result, A_TYPE);
    return callback(err, record);
});
};


getResponse(function(err, result) {
    if (err) {
        console.log("An error occurred.. " + JSON.stringify(err));
    } else {
        console.log("Response: " +  JSON.stringify(result));
        format(JSON.stringify(result));
    }
    context.destroy();
});

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
