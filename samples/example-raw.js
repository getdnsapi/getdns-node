// Sample code to demonstrate the nodejs getdns API usage.

/* eslint-disable no-console */

"use strict";

// NOTE: here using a relative path to getdns for testing purposes.
//const getdns = require("getdns");
const getdns = require("../");

const options = {
    // Request timeout time in milliseconds.
    timeout: 5000,
    "upstreams": [
        "8.8.8.8",
    ],
    // Always return dnssec status.
    return_dnssec_status: true,
};

const callback = (err, result) => {
    // If not null, err is an object with msg and code.
    // Code maps to a GETDNS_CALLBACK_TYPE.
    // Result is a response dictionary.
    // A third argument is also supplied as the transaction id.
    if (err) {
        console.error("Error", "Bad result for lookup", err);

        return;
    }

    console.log(JSON.stringify(result, null, 2));
};

// Create the context with the above options.
// When done with a context, it must be explicitly destroyed, for example in a callback.
const context = getdns.createContext(options);

// Getdns general.
// Third argument may be a dictionary for extensions.
// Last argument must be a callback.
// Returns a transaction id, which may be used to cancel the request.
/* eslint-disable no-unused-vars */
const transactionId = context.general("labs.verisigninc.com", getdns.RRTYPE_A, callback);
/* eslint-disable no-unused-vars */

// Cancel a request.
//context.cancel(transactionId);

process.on("beforeExit", () => {
    // NOTE: remember to explicitly destroy the context after being done with lookups.
    context.destroy();
});
