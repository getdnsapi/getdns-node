// Originally from https://github.com/getdnsapi/tnw2014/tree/master/node/getdns-crypto-example
// @Author Neel Goyal
// @Author Joel Purra

// pull in dependencies
const getdns = require("getdns");
const async = require("async");
const ursa = require("ursa");
const pem = require("pem");
const openpgp = require("openpgp");

// names
const PGP_NAME = "77fa5113ab6a532ce2e6901f3bd3351c0db5845e0b1b5fb09907808d._openpgpkey.getdnsapi.net";
const PGP_TYPE = 65280;

const TLSA_NAME = "77fa5113ab6a532ce2e6901f3bd3351c0db5845e0b1b5fb09907808d._smimecert.getdnsapi.org";
const TLSA_TYPE = getdns.RRTYPE_TLSA;

// message
const MESSAGE = "Hello, World";

// context options
const options = {
    return_dnssec_status: true,
  // request timeout time in millis
    timeout: 5000,
};

// create the context with the above options
const context = getdns.createContext(options);

// response util - get a secure response of a particular type
const getFirstSecureResponse = function(result, type) {
    const replies_tree = result.replies_tree;
    // validate that there is a reply with an answer
    if (!replies_tree || !replies_tree.length
        || !replies_tree[0].answer
        || !replies_tree[0].answer.length) {
        return "empty answer list for type " + type;
    }
    const reply = replies_tree[0];
    // ensure the reply is secure
    if (reply.dnssec_status != getdns.DNSSEC_SECURE) {
        return "insecure reply for type " + type;
    }
    let answers = reply.answer;
    // get the records of that type
    answers = answers.filter(function(answer) {
        return answer.type == type;
    });
    if (!answers.length) {
        return "no answers of type " + type;
    }
    return answers[0];
};

const encryptPgp = function(callback) {
    context.lookup(PGP_NAME, PGP_TYPE, function(err, result) {
        if (err) { return callback(err, null); }
        const record = getFirstSecureResponse(result, PGP_TYPE);
        if (typeof record === "string") {
            // error
            return callback(record, null);
        }
        const key = record.rdata.rdata_raw;
        const publicKey = openpgp.key.readArmored(key);
        const pgpMessage = openpgp.encryptMessage(publicKey.keys, MESSAGE);
        return callback(null, pgpMessage);
    });
};

const derToPem = function(derBuffer) {
    const base64Encoded = derBuffer.toString("base64");
    // split
    const lines = base64Encoded.match(/.{1,63}/g);

    const result = ["-----BEGIN CERTIFICATE-----"]
                .concat(lines)
                .concat(["-----END CERTIFICATE-----"])
                .join("\n");
    return result;
};

const encryptTlsa = function(callback) {
    context.lookup(TLSA_NAME, TLSA_TYPE, function(err, result) {
        if (err) { return callback(err, null); }
        const record = getFirstSecureResponse(result, TLSA_TYPE);
        if (typeof record === "string") {
            // error
            return callback(record, null);
        }
        try {
            const key = record.rdata.certificate_association_data;
            const pemCert = derToPem(key);
            pem.getPublicKey(pemCert, function(err, result) {
                if (err) { return callback(err); }
                const key = ursa.createPublicKey(result.publicKey);
                callback(null, key.encrypt(MESSAGE).toString("base64"));
            });
        } catch (ex) {
            return callback(ex, null);
        }
    });
};

// do both
async.parallel([ encryptPgp, encryptTlsa ], function(err, result) {
    if (err) {
        console.log("An error occurred.. " + JSON.stringify(err));
    } else {
        console.log("PGP : " + result[0]);
        console.log("TLSA : " + result[1]);
    }
    context.destroy();
});
