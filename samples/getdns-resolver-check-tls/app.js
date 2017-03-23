// Sample to demonstrate the usage of TLS authentication in the getdns nodejs API and host it
// in an express web context.
//
// Run from browser using the following example url:
// http://localhost:50000/resolverinfo?resolver=185.49.141.38&query=getdnsapi.net&hostname=getdnsapi.net

const express = require("express");
const app = express();
const getdns = require("getdns");

let res1 = "";

const options = {
    // Request timeout time in millis.
    timeout: 10000,
    stub: true,
    // Upstream recursive servers.. overriden in command line.
    upstreams: [
     ["64.6.64.6"],
     // ["185.49.141.38",853,"www.getdnsapi.net"]
    ],
    // Return dnssec status false for this test.
    return_dnssec_status: false,
};

app.get("/resolverinfo/", (req, res) => {
    res1 = "";

    let resolver = null;
    let query = null;
    let hostname = "<null>";

    resolver = req.query.resolver;
    hostname = req.query.hostname;
    query = req.query.query;

    /* eslint-disable no-console */
    console.log("resolver = " + req.query.resolver);
    console.log("query = " + req.query.query);
    console.log("hostname = " + req.query.hostname);
    /* eslint-enable no-console */

    const porttls = 853;
    const upstreamresolvers = [];
    upstreamresolvers.push(req.query.resolver);
    upstreamresolvers.push(porttls);
    upstreamresolvers.push(req.query.hostname);
    const up1 = [];
    up1.push(upstreamresolvers);

    // Create the contexts we need to test with the above options.
    const context = getdns.createContext(options);
    context.upstream_recursive_servers = up1;
    context.timeout = 10000;
    context.tls_authentication = getdns.AUTHENTICATION_HOSTNAME;
    //g context.upstream_recursive_servers = resolver;
    context.dns_transport = getdns.TRANSPORT_TLS_ONLY_KEEP_CONNECTIONS_OPEN;

    const context1 = getdns.createContext(options);
    context1.upstream_recursive_servers = up1;
    context1.timeout = 10000;
    context1.tls_authentication = getdns.AUTHENTICATION_NONE;
    context1.dns_transport = getdns.TRANSPORT_TLS_ONLY_KEEP_CONNECTIONS_OPEN;

    const porttcp = 53;
    const upstreamresolvertcp = [];
    upstreamresolvertcp.push(resolver);
    upstreamresolvertcp.push(porttcp);
    const up2 = [];
    up2.push(upstreamresolvertcp);
    const context2 = getdns.createContext(options);
    context2.upstream_recursive_servers = up2;
    context2.timeout = 10000;
    context2.tls_authentication = getdns.AUTHENTICATION_NONE;
    context2.dns_transport = getdns.TRANSPORT_TLS_FIRST_AND_FALL_BACK_TO_TCP_KEEP_CONNECTIONS_OPEN;

    res1 += "<h1>Check TLS at Recursive</h1>";

    res1 += "<p>This webpage is created with <a href=\"https://github.com/getdnsapi/getdns-node\">node.js bindings of getdns</a>, in the expressjs framework.</p>";

    res1 += "<h2>Resolver</h2>";
    res1 += "<ul>";
    res1 += "<li>Target Resolver: " + resolver + "</li>";
    res1 += "<li>Recursive's Hostname in Certificate (SubjectName): " + hostname + "</li>";
    res1 += "</ul>";

    res1 += "<h2>Checking for</h2>";
    res1 += "<ol>";
    res1 += "<li>Successful TCP connection</li>";
    res1 += "<li>Successful TLS connection</li>";
    res1 += "<li>Successful TLS Authentication (Hostname match to server certificate)</li>";
    res1 += "<li>Opportunistic TLS with fallback to TCP available</li>";
    res1 += "</ol>";

    res1 += "<h2>Result</h2>";

    context.general(query, getdns.RRTYPE_A, (err0, result0) => {
        if (err0) {
            // NOTE: TLS auth error.
            context.destroy();
            context1.general(query, getdns.RRTYPE_A, (err1, result1) => {
                if (err1) {
                    // NOTE: Try TLS no auth.
                    context1.destroy();
                    context2.general(query, getdns.RRTYPE_A, (err2, result2) => {
                        if (err2) {
                            // NOTE: TCP only failed.
                            /* eslint-disable no-console */
                            console.error("Error2 = " + JSON.stringify(err2));
                            /* eslint-enable no-console */

                            res1 += "<p>❌ No TCP, no TLS!</p>";
                        } else if (result2.status === 900) {
                            // NOTE: TCP worked.

                            /* eslint-disable no-console */
                            console.log("In callback TCP fallback worked " + JSON.stringify(result2.replies_tree));
                            /* eslint-enable no-console */

                            res1 += "<p>✅ Connected through fallback to TCP!</p>";
                            res.send(res1);
                        }
                    });
                } else if (result1.status === 900) {
                    res1 += "<p>✅ TLS without authentication succeeds! </p>";

                    /* eslint-disable no-console */
                    console.log("In callback TLS " + JSON.stringify(result1.replies_tree));
                    /* eslint-enable no-console */

                    res.send(res1);
                } else {
                    // NOTE: Try fallback to tcp.
                    context1.destroy();
                    context2.general(query, getdns.RRTYPE_A, (err3, result3) => {
                        if (err3) {
                            /* eslint-disable no-console */
                            console.error("Error2 = " + JSON.stringify(err3));
                            /* eslint-enable no-console */
                        } else if (result3.status === 900) {
                            res1 += "<p>✅ Connected through fallback to TCP! </p>";
                            res.send(res1);
                        }
                    });
                }
            });
        } else if (result0.status === 900) {
            // NOTE: TLS auth worked.
            res1 += "<p>✅ TLS with hostname authentication succeeds!</p>";
            res.send(res1);
        }
    });
});

if (module.parent) {
    // TODO: don't mix module and directly executed code in the same file.
    module.exports = app;
} else {
    app.listen(50000);

    /* eslint-disable no-console */
    console.log("Express started on port 50000");
    console.log("Run from browser using the following example url:");
    console.log("http://localhost:50000/resolverinfo?resolver=185.49.141.38&query=getdnsapi.net&hostname=getdnsapi.net");
    /* eslint-enable no-console */
}
