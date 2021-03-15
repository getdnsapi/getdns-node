// Originally from https://github.com/getdnsapi/tnw2014/tree/master/node/getdns-crypto-example
// @Author Neel Goyal
// @Author Joel Purra

"use strict";

// Pull in dependencies.
const getdns = require("getdns");
const async = require("async");
const ursa = require("ursa");
const pem = require("pem");
const openpgp = require("openpgp");

openpgp.initWorker({ path: "openpgp.worker.js" });

// Names.
const PGP_NAME = "77fa5113ab6a532ce2e6901f3bd3351c0db5845e0b1b5fb09907808d._openpgpkey.getdnsapi.net";
const PGP_TYPE = 65280;

const TLSA_NAME = "77fa5113ab6a532ce2e6901f3bd3351c0db5845e0b1b5fb09907808d._smimecert.getdnsapi.org";
const TLSA_TYPE = getdns.RRTYPE_TLSA;

// Message.
const MESSAGE = "Hello, World";

// Context options.
const options = {
    return_dnssec_status: true,
    // Request timeout time in millis.
    timeout: 5000,
};

// Create the context with the above options.
const context = getdns.createContext(options);

// Response util - get a secure response of a particular type.
const getFirstSecureResponse = (result, type) => {
    const repliesTree = result.replies_tree;
    // Validate that there is a reply with an answer.
    if (!repliesTree || !repliesTree.length
        || !repliesTree[0].answer
        || !repliesTree[0].answer.length) {
        return "empty answer list for type " + type;
    }
    const reply = repliesTree[0];

    // Ensure the reply is secure.
    if (reply.dnssec_status !== getdns.DNSSEC_SECURE) {
        return "insecure reply for type " + type;
    }
    let answers = reply.answer;

    // Get the records of that type.
    answers = answers.filter((answer) => {
        return answer.type === type;
    });
    if (!answers.length) {
        return "no answers of type " + type;
    }
    return answers[0];
};

const encryptPgp = (callback) => {
    context.lookup(PGP_NAME, PGP_TYPE, (err, result) => {
        if (err) { return callback(err, null); }
        const record = getFirstSecureResponse(result, PGP_TYPE);
        if (typeof record === "string") {
            // Error.
            return callback(record, null);
        }
        const pubkey = record.rdata.rdata_raw;

        const openpgpEncryptOptions = {
            data: MESSAGE,
            publicKeys: openpgp.key.readArmored(pubkey).keys,
        };

        openpgp.encrypt(openpgpEncryptOptions)
            .then(function(ciphertext) {
                const pgpMessage = ciphertext.data;

                return callback(null, pgpMessage);
            })
            .catch((error) => callback(error, null));
    });
};

const derToPem = (derBuffer) => {
    const base64Encoded = derBuffer.toString("base64");
    // Split.
    const lines = base64Encoded.match(/.{1,63}/g);

    const result = ["-----BEGIN CERTIFICATE-----"]
        .concat(lines)
        .concat(["-----END CERTIFICATE-----"])
        .join("\n");
    return result;
};

const encryptTlsa = (callback) => {
    context.lookup(TLSA_NAME, TLSA_TYPE, (err0, result0) => {
        if (err0) { return callback(err0, null); }
        const record = getFirstSecureResponse(result0, TLSA_TYPE);
        if (typeof record === "string") {
            // Error.
            return callback(record, null);
        }
        try {
            const key0 = record.rdata.certificate_association_data;
            const pemCert = derToPem(key0);
            pem.getPublicKey(pemCert, (err1, result1) => {
                if (err1) { return callback(err1); }
                const key1 = ursa.createPublicKey(result1.publicKey);
                callback(null, key1.encrypt(MESSAGE).toString("base64"));
            });
        } catch (ex) {
            return callback(ex, null);
        }
    });
};

// Do both.
async.parallel([encryptPgp, encryptTlsa], (err, result) => {
    if (err) {
        /* eslint-disable no-console */
        console.log("An error occurred.. " + JSON.stringify(err));
        /* eslint-enable no-console */
    } else {
        /* eslint-disable no-console */
        console.log("PGP : " + result[0]);
        console.log("TLSA : " + result[1]);
        /* eslint-enable no-console */
    }
    context.destroy();
});
