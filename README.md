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



## Features

getdns-node has a few advantages over the [default DNS module in Node.js](https://nodejs.org/docs/latest/api/dns.html).

- DNS lookup security with [Domain Name System Security Extensions
 (DNSSEC)](https://en.wikipedia.org/wiki/Domain_Name_System_Security_Extensions) signature validation.
- Supports [all DNS record types](https://en.wikipedia.org/wiki/List_of_DNS_record_types) with constants for 80+ (`A`, `AAAA`, `MX`, `TXT`, `SSHFP`, `OPENPGPKEY`, ...).
- Configure as local recursive DNS server, or stub mode with upstream DNS resolvers.
- Perform both IPv4 and IPv6 lookups in a single call.
- Configure to perform lookups over TLS, TCP, or UDP, with fallbacks and long-lived connections.
- Configure to explicitly follow or explicitly not follow `CNAME` and `DNAME` redirects.
- Securely verify DNS-based security records such as
  - [DNS-based Authentication of Named Entities (DANE)](https://en.wikipedia.org/wiki/DNS-based_Authentication_of_Named_Entities)
    - [TLSA certificate association](https://en.wikipedia.org/wiki/List_of_DNS_record_types#TLSA) for [XMPP](https://tools.ietf.org/html/rfc7712), [SMTP](https://tools.ietf.org/html/rfc7672), [IMAP](https://tools.ietf.org/html/rfc7673#appendix-A.1), POP3, etcetera.
    - [Public key association/binding for OpenPGP (OPENPGPKEY)](https://tools.ietf.org/html/rfc7929)
    - [Certificate association/binding for S/MIME](https://tools.ietf.org/html/draft-ietf-dane-smime)
  - [IPsec Keying Material (IPSECKEY)](https://tools.ietf.org/html/rfc4025)
  - Email, anti-spoofing and anti-spam
    - [Domain-based Message Authentication, Reporting and Conformance (DMARC)](https://en.wikipedia.org/wiki/DMARC)
    - [Sender Policy Framework (SPF)](https://en.wikipedia.org/wiki/Sender_Policy_Framework)
    - [DomainKeys Identified Mail (DKIM)](https://en.wikipedia.org/wiki/DomainKeys_Identified_Mail)
  - [SSH Public Key Fingerprint (SSHFP)](https://en.wikipedia.org/wiki/SSHFP_Resource_Record)


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

See the `samples/` folder for more.

```javascript
var getdns = require("getdns");

var options = {
    // Option for stub resolver context, deferring lookups to the upstream recursive servers.
    resolution_type: getdns.RESOLUTION_STUB,
    // Upstream recursive servers.
    upstream_recursive_servers: [
        // Example: Google Public DNS.
        "8.8.8.8",
        // Example: Your local DNS server.
        ["127.0.0.1", 53],
    ],
    // Request timeout time in milliseconds.
    timeout: 1000,
    // NOTE: optionally enforce DNSSEC security validation.
    //dnssec_return_only_secure: true,
    // Always return DNSSEC status.
    return_dnssec_status: true
};

// Contexts can be reused for several lookups, but must be explicitly destroyed.
var context = getdns.createContext(options);

var callback = function(err, result) {
    if (err) {
        // If not null, err is an object with msg and code.
        // Code maps to a getdns.CALLBACK_XXXX (CANCEL, TIMEOUT, ERROR).
        console.error(err);
    } else {
        // Result is a response dictionary, see below for the format.
        // For context.address() simply use result.just_address_answers.
        // NOTE: optionally check if each reply is secured with DNSSEC.
        console.log(result.canonical_name, result.just_address_answers);
    }

    // When done with a context, it must be explicitly destroyed.
    // Can be done after all lookups/transactions have finished or beforeExit.
    context.destroy();
};

// Simple domain name-to-ip address lookup.
// Always returns both IPv4 and IPv6 results, if available.
var transactionId = context.address("wikipedia.org", callback);
```



## API usage

Most of the nodejs calls maps to the [getdns API specification](https://getdnsapi.net/documentation/spec/). If there are any differences, or questions about usage, [please open an issue](https://github.com/getdnsapi/getdns-node/issues).


### Context Cleanup

When a context object is garbage collected, the underlying resources are freed up. However, garbage collection is not guaranteed to trigger. The application will not exit until all contexts are destroyed.


### Response format

A response to the callback is the JS representation of the `getdns_dict` response dictionary.

Bindatas are converted to strings when possible:

- getdns IP address dictionary to IP string
- printable bindata
- wire format dname

All other bindata objects are converted into Node.js buffers (represented below as `<node buffer>`)

Also see the output of the examples:

- `node samples/example-raw.js`
- `samples/getdns-console-pretty/`
- `samples/getdns-resolver-check-tls/`


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

All constants defined in `<getdns/getdns.h>` are exposed in the module. The `GETDNS_` prefix is removed. As an example, to get/filter out only secure replies, one may do something like:

```javascript
var dnssecSecureReplies = result.replies_tree.filter(function(reply) {
    return reply.dnssec_status === getdns.DNSSEC_SECURE;
});
```


### Context functions

Most work is done in the [async methods](https://getdnsapi.net/documentation/spec/#1-the-getdns-async-functions) of a [DNS context](https://getdnsapi.net/documentation/spec/#16-setting-up-the-dns-context). [Extensions](https://getdnsapi.net/documentation/spec/#3-extensions) are optional in the below method calls.

```javascript
// See also https://getdnsapi.net/documentation/spec/

// Contexts can be reused for several lookups, but must be explicitly destroyed.
// See context options below.
var context = getdns.createContext(options);

// When done with a context, it must be explicitly destroyed.
// Can be done after all lookups/transactions have finished or beforeExit.
context.destroy();

// Cancel a request before the callback has been called.
context.cancel(transactionId);

// Method parameter formats.
var domainName = "subdomain.example.org";
var ipAddress = "111.222.33.44";
var ipAddress = "2620:0:862:ed1a::1";

// https://getdnsapi.net/documentation/spec/#3-extensions
// Extensions are optional in the below method calls.
var extensions = {
  dnssec_return_only_secure: true
};

// There are 80+ predefined `RRTYPE_XXXX` constants.
// Examples: A, AAAA, CNAME, MX, TXT, TLSA, SSHFP, OPENPGPKEY, ...
var request_type = getdns.RRTYPE_MX;
var request_type = getdns.RRTYPE_SSHFP;

function callback(err, result, transactionId) {
  // err is either null (good result) or an object: { msg: "...", code: getdns.CALLBACK_XXXX (CANCEL, TIMEOUT, ERROR) }
  // result is null (bad result) or an object with the response dictionary format shown elsewhere in this documentation.
  // transactionId matches the one given when the lookup was initialized.
}

// For looking up any type of DNS record.
var transactionId = context.general(domainName, request_type, extensions, callback);

// For doing getaddrinfo()-like address lookups.
// Always returns both IPv4 and IPv6 results, if available.
var transactionId = context.address(domainName, extensions, callback);

// For getting results from SRV lookups.
var transactionId = context.service(domainName, extensions, callback);

// For doing getnameinfo()-like name lookups.
var transactionId = context.hostname(ipAddress, extensions, callback);
```


### Context options

The below [DNS context options](https://getdnsapi.net/documentation/spec/#8-dns-contexts) are not complete; not all from the specification are listed, nor are all implemented in getdns-node. If there are any differences, or questions about usage, [please open an issue](https://github.com/getdnsapi/getdns-node/issues).

```javascript
// Setting context properties.
// See also https://getdnsapi.net/documentation/spec/
// The following properties are available to set directly and can also
// be set in the options object passed to the constructor.
//
// Context objects support setting properties via similar to the C API.
// Example: this C function call would map to that JS context property:
getdns_context_set_timeout(context, 1000);
context.timeout = 1000;

// Switch DNS resolution/lookup mode:
//   - Recursive: all lookups performed locally directly to relevant nameservers.
//   - Stub: all lookups deferred to upstream resolvers.
// For backwards compatibility the deprecated context.stub is still supported.
context.resolution_type = getdns.RESOLUTION_RECURSING;
context.resolution_type = getdns.RESOLUTION_STUB;

// If acting as a stub resolver, provide an array of DNS servers:
//   - IP addresses as strings (assuming DNS port is 53).
//   - An array with an IP address as a string and a port number as an integer.
// For backwards compatibility the deprecated context.upstreams is still supported.
context.upstream_recursive_servers = [
  // Example: Google Public DNS.
  "8.8.8.8",
  // Example: Your local DNS server.
  ["127.0.0.1", 53],
];

// If acting as recursive resolver, enable or disable following CNAME/DNAME redirects.
context.follow_redirects = getdns.REDIRECTS_FOLLOW;
context.follow_redirects = getdns.REDIRECTS_DO_NOT_FOLLOW;

// Integer in milliseconds. The default is undefined.
context.timeout = 1000;

// Boolean. Switch between thread or forking mode in the underlying libunbound.
context.use_threads = false;

// Enable looking up DNSSEC status of each response.
// The status is stored in each result.replies_tree[...].dnssec_status with
// values from getdns.DNSSEC_XXXX (SECURE, BOGUS, INDETERMINATE, INSECURE, NOT_PERFORMED).
context.return_dnssec_status = true;

// DNS uses UDP by default, but can use TCP or TLS as well.
// Values from getdns.TRANSPORT_XXXX (UDP_FIRST_AND_FALL_BACK_TO_TCP, UDP_ONLY, TCP_ONLY, TCP_ONLY_KEEP_CONNECTIONS_OPEN, TLS_ONLY_KEEP_CONNECTIONS_OPEN, TLS_FIRST_AND_FALL_BACK_TO_TCP_KEEP_CONNECTIONS_OPEN, UDP, TCP, TLS).
context.dns_transport = getdns.TRANSPORT_TLS_FIRST_AND_FALL_BACK_TO_TCP_KEEP_CONNECTIONS_OPEN;

// The transports array contains an ordered list of transports that will be used for DNS lookups.
// Values from getdns.TRANSPORT_XXXX (UDP, TCP, TLS)
// The default is a list containing getdns.TRANSPORT_UDP then getdns.TRANSPORT_TCP.
context.dns_transport_list = [
  getdns.TRANSPORT_TLS,
  getdns.TRANSPORT_TCP,
  getdns.TRANSPORT_UDP
]

// Specifies number of milliseconds the API will leave an idle TCP or TLS connection open for.
// Idle means no outstanding responses and no pending queries. The default is 0.
context.idle_timeout = ...;

// Related to  Extension mechanisms for DNS (EDNS).
// The value is between 0 and 255; the default is 0.
context.edns_extended_rcode = 0;

// The value is between 0 and 255; the default is 0.
context.edns_version = 0;

// The value is between 0 and 1; the default is 0.
context.edns_do_bit = 0;

// The value is between 512 and 65535; when not set, outgoing values will adhere to the suggestions in RFC 6891 and may follow a scheme that uses multiple values to maximize receptivity..
context.edns_maximum_udp_payloadSize = ...;

// Specifies limit the number of outstanding DNS queries.
// The API will block itself from sending more queries if it is about to exceed this value, and instead keep those queries in an internal queue.
// The a value of 0 indicates that the number of outstanding DNS queries is unlimited.
context.limit_outstanding_queries = ...;

// The namespaces array contains an ordered list of namespaces that will be queried.
// Important: this context setting is ignored for the context.general() function; it is used for the other functions.
// Values from getdns.NAMESPACE_XXXX (DNS, LOCALNAMES, NETBIOS, MDNS, NIS).
// The default is determined by the OS.
context.namespaces = [
  getdns.NAMESPACE_XXXX,
  getdns.NAMESPACE_XXXX
];
```



## Building and testing

Patches are welcome!

```shell
# In the source directory.
npm install

# If editing C++ code and headers in in src/ either build or rebuild the module as necessary.
node-gyp rebuild

# Test against live DNS servers.
# NOTE: some tests may fail intermittently, depending on internet connection and upstream DNS servers. Rerun to verify.
npm run --silent test
```

Note that the tests require an internet connection, [getdns](https://getdnsapi.net/), and [Unbound with a trust anchor to be installed](https://unbound.net/) to pass. Please consult the getdns documentation on the expected location of the trust anchor. Because of testing over the internet against live DNS servers, some tests may fail intermittently. If so, rerun to verify.



---

<a href="https://getdnsapi.net/"><img src="resources/logo/getdns-64x.png" alt="getdns logotype" title="getdns" width="64" height="21" border="0" /></a> [getdnsapi/getdns-node](https://github.com/getdnsapi/getdns-node) Copyright &copy; 2014, 2015, 2016, 2017, Verisign, Inc. All rights reserved. Released under the [BSD 3-clause License](https://opensource.org/licenses/BSD-3-Clause).
