# getdns-resolver-check-tls

See [getdns-node](https://github.com/getdnsapi/getdns-node)

Sample to demonstrate the usage of TLS authentication in the getdns nodejs API and host it in an express web context. Resolves records over TCP, TLS, TLS with hostname authentication, and opportunistic TLS falling back to TCP.

- You need the [getdns library](https://getdnsapi.net/) installed prior to installing and running this sample.
- Install other dependencies via `npm install`
- Run the sample with `npm run --silent start`
- Run from browser using the following example url: http://localhost:50000/resolverinfo?resolver=185.49.141.38&query=getdnsapi.net&hostname=getdnsapi.net
