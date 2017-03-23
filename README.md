<p align="center">
  <a href="https://getdnsapi.net/"><img src="resources/logo/getdns-512x.png" alt="getdns logotype" title="getdns" width="512" height="164" border="0" /></a>
</p>
<h1 align="center">
  <a href="https://github.com/getdnsapi/getdns-node">getdnsapi/getdns-node</a>
</h1>
<p align="center">
  Node.js bindings of <a href="https://getdnsapi.net/">getdns</a>, a modern asynchronous DNS API.
</p>
<p align="center">
  <strong>getdns-node:</strong> <a href="https://www.npmjs.com/package/getdns">NPM</a> | <a href="https://github.com/getdnsapi/getdns-node/tree/master/samples">Examples</a> | <a href="https://github.com/getdnsapi/getdns-node/issues">Issues</a> | <a href="https://travis-ci.org/getdnsapi/getdns-node"><img src="https://travis-ci.org/getdnsapi/getdns-node.svg?branch=master" alt="getdns-node build status for the master branch" title="getdns-node build status for the master branch" border="0" style="height: 1em;" /></a><br />
  <strong>getdns:</strong> <a href="https://getdnsapi.net/">Website</a> | <a href="https://getdnsapi.net/documentation/spec/">Specification</a> | <a href="https://getdnsapi.net/presentations/">Presentations</a> | <a href="https://getdnsapi.net/releases/">Releases</a>
</p>



## Installation and Requirements

- The [getdns](https://getdnsapi.net/) C library **v1.0.0** or later; see [getdns releases](https://getdnsapi.net/releases/) or [getdnsapi/getdns](https://github.com/getdnsapi/getdns).
- The [Unbound](https://unbound.net/) DNS resolver installed with a trust anchor for DNSSEC validation.

```shell
# In your project directory.
npm install --save getdns
```

Aim is to support current Node.js versions, including [long-term support (LTS)](https://github.com/nodejs/LTS).

  - v7.x.x
  - v6.x.x
  - v4.x.x
  - Older versions *might* still work with the `--harmony` flag, but are unsupported.



## API Examples

```javascript
var getdns = require('getdns');

var options = {
  // Option for stub resolver context.
  stub : true,
  // Upstream recursive servers.
  upstreams : [
    // Example: Google Public DNS.
    "8.8.8.8",
    // Example: Your local DNS server.
    ["127.0.0.1", 53],
  ],
  // Request timeout time in milliseconds.
  timeout : 1000,
  // Always return DNSSEC status.
  return_dnssec_status : true
};

// Getdns query callback.
var callback = function(err, result) {
    // If not null, err is an object with msg and code.
    // Code maps to a GETDNS_CALLBACK_TYPE.
    // Result is a response dictionary, see below for the format.
    // A third argument is also supplied as the transaction id.
}

// Create the context with the above options.
var context = getdns.createContext(options);

// Getdns general.
// Third argument may be a dictionary for extensions.
// Last argument must be a callback.
var transactionId = context.lookup("getdnsapi.net", getdns.RRTYPE_A, callback);

// Cancel a request.
context.cancel(transactionId);

// Other methods.
context.address("getdnsapi.net", callback);
context.service("getdnsapi.net", callback);
context.hostname("8.8.8.8", callback);

// Extensions are passed as dictionaries.
// Where the value for on / off are normal bools.
context.address("getdnsapi.net", { return_both_v4_and_v6 : true }, callback);

// When done with a context, it must be explicitly destroyed.
context.destroy();
```


### Context Cleanup

When a context object is garbage collected, the underlying resources are freed up. However, garbage collection is not guaranteed to trigger. The application will not exit until all contexts are destroyed.


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

All constants defined in `<getdns/getdns.h>` are exposed in the module. The GETDNS_ prefix is removed. As an example, to get filter out only secure replies, one may do something like:

```javascript
var dnssecSecureReplies = result.replies_tree.filter(function(reply) {
    return reply.dnssec_status == getdns.DNSSEC_SECURE;
});
```


### Context options

```javascript
// Setting context properties.
// Context objects support setting properties via similar to the C API.
// This C function call would map to that JS context property:
getdns_context_set_timeout(context, 1000)
context.timeout = 1000

// The following properties are available to set directly and can also
// be set in the options object passed to the constructor.

// NOTE: Use an array of IP Addresses.
context.upstream_recursive_servers
context.resolution_type
context.timeout
context.use_threads
context.return_dnssec_status
context.dns_transport
context.edns_extended_rcode
context.edns_version
context.edns_do_bit
context.limit_outstanding_queries
context.edns_maximum_udp_payloadSize
context.namespaces
context.dns_transport_list

// For backwards compatibility, context.stub and context.upstreams are still supported.
```



## Building and testing

Patches are welcome!

```shell
# In the source directory.
npm install

# If editing C++ code and headers in in src/ either build or rebuild the module as necessary.
node-gyp rebuild

# Test against live DNS servers.
npm run --silent test
```

Note that the tests require an internet connection, [getdns](https://getdnsapi.net/), and [Unbound with a trust anchor to be installed](https://unbound.net/) to pass. Please consult the getdns documentation on the expected location of the trust anchor.



---

<a href="https://getdnsapi.net/"><img src="resources/logo/getdns-64x.png" alt="getdns logotype" title="getdns" width="64" height="21" border="0" /></a> [getdnsapi/getdns-node](https://github.com/getdnsapi/getdns-node) Copyright &copy; 2014, 2015, 2016, 2017, Verisign, Inc. All rights reserved. Released under the [BSD 3-clause License](https://opensource.org/licenses/BSD-3-Clause).
