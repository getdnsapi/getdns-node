// Sample code to demonstrate the nodejs getdns API usage
// copied from README

// NOTE: here using a relative path to getdns for testing purposes.
//const getdns = require("getdns");
const getdns = require("../");

const options = {
    // request timeout time in millis
    timeout: 5000,
    "upstreams": [
        "8.8.8.8",
    ],
    // always return dnssec status
    return_dnssec_status: true,
};

// getdns query callback
const callback = (err, result) => {
    // if not null, err is an object w/ msg and code.
    // code maps to a GETDNS_CALLBACK_TYPE
    // result is a response dictionary
    if (err || !result) {
        /* eslint-disable no-console */
        console.error("Error", err);
        /* eslint-enable no-console */

        return;
    }

    if (!result) {
        /* eslint-disable no-console */
        console.error("Error", "No result");
        /* eslint-enable no-console */

        return;
    }

    /* eslint-disable no-console */
    console.log(JSON.stringify(result.replies_tree, null, 2));
    /* eslint-enable no-console */

    // A third argument is also supplied as the transaction id
    // See below for the format of response
    // when done with a context, it must be explicitly destroyed
};

// create the context with the above options
const context = getdns.createContext(options);

// getdns general
// third argument may be a dictionary for extensions
// last argument must be a callback
/* eslint-disable no-unused-vars */
const transactionId = context.general("getdnsapi.net", getdns.RRTYPE_A, callback);
/* eslint-enable no-unused-vars */

// cancel a request
// context.cancel(transactionId);

// other methods, TODO: dont destroy context in callback to reuse
context.address("getdnsapi.net", callback);
context.service("getdnsapi.net", callback);
context.hostname("8.8.8.8", callback);

// extensions are passed as dictionaries
// where the value for on / off are normal bools
//context.getAddress("cnn.com", { return_both_v4_and_v6 : true }, callback);

process.on("exit", () => {
    context.destroy();
});
