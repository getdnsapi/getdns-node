// Originally from https://github.com/getdnsapi/tnw2014/tree/master/node/getdns-crypto-example
// @Author Neel Goyal
// @Author Joel Purra

// pull in dependencies
var getdns = require('getdns');
var async = require('async');
var ursa = require('ursa');
var pem = require('pem');
var openpgp = require('openpgp');

// names
var PGP_NAME = "77fa5113ab6a532ce2e6901f3bd3351c0db5845e0b1b5fb09907808d._openpgpkey.getdnsapi.net";
var PGP_TYPE = 65280;

var TLSA_NAME = "77fa5113ab6a532ce2e6901f3bd3351c0db5845e0b1b5fb09907808d._smimecert.getdnsapi.org";
var TLSA_TYPE = getdns.RRTYPE_TLSA;

// message
var MESSAGE = "Hello, World";

// context options
var options = {
  return_dnssec_status : true,
  // request timeout time in millis
  timeout : 5000
};

// create the context with the above options
var context = getdns.createContext(options);

// response util - get a secure response of a particular type
var getFirstSecureResponse = function(result, type) {
    var replies_tree = result.replies_tree;
    // validate that there is a reply with an answer
    if (!replies_tree || !replies_tree.length ||
        !replies_tree[0].answer ||
        !replies_tree[0].answer.length) {
        return "empty answer list for type " + type;
    }
    var reply = replies_tree[0];
    // ensure the reply is secure
    if (reply.dnssec_status != getdns.DNSSEC_SECURE) {
        return "insecure reply for type " + type;
    }
    var answers = reply.answer;
    // get the records of that type
    answers = answers.filter(function(answer) {
        return answer.type == type;
    });
    if (!answers.length) {
        return "no answers of type " + type;
    }
    return answers[0];
};

var encryptPgp = function(callback) {
    context.lookup(PGP_NAME, PGP_TYPE, function(err, result) {
        if(err){ return callback(err, null); }
        var record = getFirstSecureResponse(result, PGP_TYPE);
        if (typeof record === "string") {
            // error
            return callback(record, null);
        }
        var key = record.rdata.rdata_raw;
        var publicKey = openpgp.key.readArmored(key);
        var pgpMessage = openpgp.encryptMessage(publicKey.keys, MESSAGE);
        return callback(null, pgpMessage);
    });
};

var derToPem = function(derBuffer) {
    var base64Encoded = derBuffer.toString('base64');
    // split
    var lines = base64Encoded.match(/.{1,63}/g);

    var result = ["-----BEGIN CERTIFICATE-----"]
                .concat(lines)
                .concat(["-----END CERTIFICATE-----"])
                .join("\n");
    return result;
};

var encryptTlsa = function(callback) {
    context.lookup(TLSA_NAME, TLSA_TYPE, function(err, result) {
        if(err){ return callback(err, null); }
        var record = getFirstSecureResponse(result, TLSA_TYPE);
        if (typeof record === "string") {
            // error
            return callback(record, null);
        }
        try {
            var key = record.rdata.certificate_association_data;
            var pemCert = derToPem(key);
            pem.getPublicKey(pemCert, function(err, result) {
                if (err) { return callback(err); }
                var key = ursa.createPublicKey(result.publicKey);
                callback(null, key.encrypt(MESSAGE).toString('base64'));
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
