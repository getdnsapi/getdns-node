// Sample to demonstrate executing several lookups, extracting some result variables and printing them to the console -- with colors!

/* eslint-disable no-console */

"use strict";

const getdns = require("getdns");
const supportsColor = require("supports-color");
const chalk = require("chalk");
const jclrz = require("json-colorz");

const displayFullResults = process.argv[2] === "--json";

const chalkOptions = {
    enabled: supportsColor,
};

const chalkContext = new chalk.constructor(chalkOptions);

jclrz.params.colored = supportsColor;

const replaceBufferWithPlaceholder = (/* eslint-disable no-unused-vars */key/* eslint-enable no-unused-vars */, value) => {
    if (value === null || typeof value !== "object") {
        return value;
    }

    if (Object.prototype.hasOwnProperty.call(value, "type") && value.type === "Buffer") {
        const len = (Array.isArray(value.data) && value.data.length) || 0;

        return `<Buffer length ${len}>`;
    }

    return value;
};

const displayFullResult = (result) => {
    const cleanedCopy = JSON.parse(JSON.stringify(result, replaceBufferWithPlaceholder));

    jclrz(cleanedCopy);
};

const displayLookupResults = (type, err, result) => {
    // If not null, err is an object with msg and code.
    // Code maps to a GETDNS_CALLBACK_TYPE.
    // Result is a response dictionary.
    // A third argument is also supplied as the transaction id.
    if (err) {
        console.error("Error", `Bad result for ${type} lookup`, err);

        return;
    }

    if (!result) {
        console.error("Error", `No result for ${type} lookup`);

        return;
    }

    const replies = result.replies_tree;

    // See below for the format of response.

    if (displayFullResults) {
        // console.log(JSON.stringify(replies, null, 2));
        displayFullResult(result);
    } else {
    // To filter out insecure responses, keeping only those signed with DNSSEC.
        const dnssecSecureReplies = replies.filter(function(reply) {
            return reply.dnssec_status === getdns.DNSSEC_SECURE;
        });

        console.log(`Lookup of ${chalkContext.bold(type)} for ${chalkContext.bold(result.canonical_name)} gave ${chalkContext.yellow(replies.length)} replies, out of which ${chalkContext.green(dnssecSecureReplies.length)} were secure.`);
    }
};

// The example getdns query callbacks are all displaying the same type of results.
const generalCallback = displayLookupResults.bind(null, "general");
const addressCallback = displayLookupResults.bind(null, "address");
const serviceCallback = displayLookupResults.bind(null, "service");
const hostnameCallback = displayLookupResults.bind(null, "hostname");

const options = {
    // Request timeout time in milliseconds.
    timeout: 5000,
    "upstreams": [
        "8.8.8.8",
    ],
    // Always return dnssec status.
    return_dnssec_status: true,
};

// Create the context with the above options.
// When done with a context, it must be explicitly destroyed, for example in a callback.
const context = getdns.createContext(options);

// Getdns general.
// Third argument may be a dictionary for extensions.
// Last argument must be a callback.
// Returns a transaction id, which may be used to cancel the request.
/* eslint-disable no-unused-vars */
const transactionId = context.general("labs.verisigninc.com", getdns.RRTYPE_A, generalCallback);
/* eslint-enable no-unused-vars */

// Cancel a request.
//context.cancel(transactionId);

// Other getdns context methods.
// NOTE: don't destroy context in callback so it can be reused.
// Extensions are passed as dictionaries where the value for on/off are normal booleans.
context.address("nlnetlabs.nl", { dnssec_return_only_secure: true }, addressCallback);
context.service("dnssec-name-and-shame.com", serviceCallback);
context.hostname("8.8.8.8", hostnameCallback);

process.on("beforeExit", () => {
    // NOTE: remember to explicitly destroy the context after being done with lookups.
    context.destroy();
});
