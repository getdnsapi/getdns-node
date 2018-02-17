<p align="center">
  <a href="https://getdnsapi.net/"><img src="../../resources/logo/getdns-512x.png" alt="getdns logotype" title="getdns" width="512" height="164" border="0" /></a>
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



## getdns-node-sample-resolver-check-tls

Sample to demonstrate the usage of TLS authentication in the getdns nodejs API and host it in an express web context. Resolves records over TCP, TLS, TLS with hostname authentication, and opportunistic TLS falling back to TCP.

You need the [getdns library](https://getdnsapi.net/) installed prior to installing and running this sample.

```shell
# Install other dependencies.
npm install

# Start the sample server.
npm run --silent start

# Run from browser using the following example url
open "http://localhost:50000/resolverinfo?resolver=185.49.141.38&hostname=getdnsapi.net&query=nlnetlabs.nl"
```

Example url: http://localhost:50000/resolverinfo?resolver=185.49.141.38&hostname=getdnsapi.net&query=nlnetlabs.nl



---

<a href="https://getdnsapi.net/"><img src="../../resources/logo/getdns-64x.png" alt="getdns logotype" title="getdns" width="64" height="21" border="0" /></a> [getdnsapi/getdns-node](https://github.com/getdnsapi/getdns-node) Copyright &copy; 2014, 2015, 2016, 2017, 2018, Verisign, Inc. All rights reserved. Released under the [BSD 3-clause License](https://opensource.org/licenses/BSD-3-Clause).
