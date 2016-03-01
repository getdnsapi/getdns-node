getdns-node
===========

[![Build Status](https://travis-ci.org/getdnsapi/getdns-node.svg?branch=master)](https://travis-ci.org/getdnsapi/getdns-node)

Node.js bindings for the [getdnsapi](http://getdnsapi.net) implementation of [getdns](http://vpnc.org/getdns-api/).


Installation and Requirements
=============================

- An installation of getdns 0.9.0 or later is required.  Please see the [getdnsapi](https://github.com/getdnsapi/getdns) GitHub.
- `npm install getdns` 

Or to build from source:
- `npm install -g node-gyp`
- `node-gyp configure`
- `node-gyp build`

API Examples
============

```javascript
var getdns = require('getdns');
var options = {
  // option for stub resolver context
  stub : true,
  // upstream recursive servers
  upstreams : [
    "192.168.0.1",
    ["127.0.0.1", 9053]
  ],
  // request timeout time in millis
  timeout : 1000,
  // always return dnssec status
  return_dnssec_status : true
};

// getdns query callback
var callback = function(err, result) {
    // if not null, err is an object w/ msg and code.
    // code maps to a GETDNS_CALLBACK_TYPE
    // result is a response dictionary
    // A third argument is also supplied as the transaction id
    // See below for the format of response
}

// create the context with the above options
var context = getdns.createContext(options);

// getdns general
// third argument may be a dictionary for extensions
// last argument must be a callback
var transactionId = context.lookup("getdnsapi.net", getdns.RRTYPE_A, callback);

// cancel a request
context.cancel(transactionId);

// other methods
context.address("getdnsapi.net", callback);
context.service("getdnsapi.net", callback);
context.hostname("8.8.8.8", callback);

// extensions are passed as dictionaries
// where the value for on / off are normal bools
context.address("getdnsapi.net", { return_both_v4_and_v6 : true }, callback);

// when done with a context, it must be explicitly destroyed
context.destroy();

// Setting context properties
// Context objects support setting properties via similar to the C API.
// getdns_context_set_timeout(context, 1000) would map to:
// context.timeout = 1000
// The following properties are available to set directly and can also
// be set in the options object passed to the constructor.

// context.resolution_type
// context.upstream_recursive_servers - use an array of IP Addresses
// context.timeout
// context.use_threads
// context.return_dnssec_status
// context.dns_transport
// context.edns_extended_rcode
// context.edns_version
// context.edns_do_bit
// context.limit_outstanding_queries
// context.edns_maximum_udp_payloadSize
// context.namespaces
// context.dns_transport_list

// For backwards compatibility, context.stub and context.upstreams are still supported.

```

### Context Cleanup

When a context object is garbage collected, the underlying resources are freed up.  However, garbage collection is not guaranteed to trigger.  The application will not exit until all contexts are destroyed.

### Response format

A response to the callback is the JS representation of the `getdns_dict` response dictionary.

Bindatas are converted to strings when possible:
 - getdns IP address dictionary to IP string
 - printable bindata
 - wire format dname

All other bindata objects are converted into Node.js buffers (represented below as <node buffer>)

```javascript
{
  "answer_type": 800,
  "canonical_name": "getdnsapi.net.",
  "just_address_answers": [
    "213.154.224.149",
    "2001:7b8:206:1:b0ef:31::"
  ],
  "replies_full": [
    "<node buffer>", "<node buffer>"
  ],
  "replies_tree": [
    {
      "additional": [

      ],
      "answer": [
        {
          "class": 1,
          "name": "getdnsapi.net.",
          "rdata": {
            "ipv4_address": "213.154.224.149",
            "rdata_raw": "<node buffer>"
          },
          "ttl": 120,
          "type": 1
        }
      ],
      "answer_type": 800,
      "authority": [

      ],
      "canonical_name": "getdnsapi.net.",
      "dnssec_status": 403,
      "header": {
        "aa": 0,
        "ad": 0,
        "ancount": 1,
        "arcount": 0,
        "cd": 0,
        "id": 0,
        "nscount": 0,
        "opcode": 0,
        "qdcount": 1,
        "qr": 1,
        "ra": 1,
        "rcode": 0,
        "rd": 1,
        "tc": 0,
        "z": 0
      },
      "question": {
        "qclass": 1,
        "qname": "getdnsapi.net.",
        "qtype": 1
      }
    },
    {
      "additional": [

      ],
      "answer": [
        {
          "class": 1,
          "name": "getdnsapi.net.",
          "rdata": {
            "ipv6_address": "2001:7b8:206:1:b0ef:31::",
            "rdata_raw": "<node buffer>"
          },
          "ttl": 120,
          "type": 28
        },
        {
          "class": 1,
          "name": "getdnsapi.net.",
          "rdata": {
            "algorithm": 7,
            "key_tag": 5508,
            "labels": 2,
            "original_ttl": 450,
            "rdata_raw": "<node buffer>",
            "signature": "<node buffer>",
            "signature_expiration": 1395047438,
            "signature_inception": 1393850787,
            "signers_name": "getdnsapi.net.",
            "type_covered": 28
          },
          "ttl": 120,
          "type": 46
        },
        {
          "class": 1,
          "name": "getdnsapi.net.",
          "rdata": {
            "algorithm": 8,
            "key_tag": 123,
            "labels": 2,
            "original_ttl": 450,
            "rdata_raw": "<node buffer>",
            "signature": "<node buffer>",
            "signature_expiration": 1395117010,
            "signature_inception": 1393907439,
            "signers_name": "getdnsapi.net.",
            "type_covered": 28
          },
          "ttl": 120,
          "type": 46
        }
      ],
      "answer_type": 800,
      "authority": [

      ],
      "canonical_name": "getdnsapi.net.",
      "dnssec_status": 403,
      "header": {
        "aa": 0,
        "ad": 0,
        "ancount": 3,
        "arcount": 0,
        "cd": 0,
        "id": 0,
        "nscount": 0,
        "opcode": 0,
        "qdcount": 1,
        "qr": 1,
        "ra": 1,
        "rcode": 0,
        "rd": 1,
        "tc": 0,
        "z": 0
      },
      "question": {
        "qclass": 1,
        "qname": "getdnsapi.net.",
        "qtype": 28
      }
    }
  ],
  "status": 900
}
```

### Constants

All constants defined in `<getdns/getdns.h>` are exposed in the module.  The GETDNS_ prefix is removed.  As an example, to get filter out only secure replies, one may do something like:

```javascript
var secured = replies.filter(function(reply) {
    return reply.dnssec_status == getdns.DNSSEC_SECURE;
});

```

Testing
=======

Mocha is used to test the bindings.

- npm install -g mocha
- mocha

Note that the tests require an Internet connection and a trust anchor to be installed to pass.  Please consult the getdns documentation on the expected location of the trust anchor.  Common locations are:

- /etc/unbound/getdns-root.key
- ${prefix}/etc/unbound/getdns-root.key
- ${prefix}/etc/getdns-root.key
