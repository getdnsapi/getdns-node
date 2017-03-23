// Sample to demonstrate the usage of TLS authentication in the getdns nodejs API and host it
// in an express web context.
//
// Run from browser using the following example url:
// http://localhost:50000/resolverinfo?resolver=185.49.141.38&hostname=getdnsapi.net&query=nlnetlabs.nl

"use strict";

const getdns = require("getdns");
const express = require("express");
const app = express();

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

// HACK: fixes "TypeError: Converting circular structure to JSON" although not sure it's a great solution as it only checks for circular references to the root object.
// https://stackoverflow.com/questions/4816099/chrome-sendrequest-error-typeerror-converting-circular-structure-to-json
// http://stackoverflow.com/a/9653082
const removeCirularReferences = (obj) => {
    let i = 0;

    const replacer = (/* eslint-disable no-unused-vars */key/* eslint-enable no-unused-vars */, value) => {
        if (
            i !== 0
            && typeof obj === "object"
            && typeof value === "object"
            && obj === value
        ) {
            return "[Circular]";
        }

        // // Seems to be a harded maximum of 30 serialized objects?
        // if (i >= 29) {
        //     return "[Unknown]";
        // }

        // So we know we aren't using the original object anymore.
        i++;

        return value;
    };

    return replacer;
};

app.get("/resolverinfo/", (req, res) => {
    const sendHtml = (queryErr, queryResult, queryNote) => {
        let htmlHeader = "";

        htmlHeader += "<html><head><style>pre { display: inline-block; background-color: #eeeeee; padding: 1em; }</style><body>";
        htmlHeader += "<h1>Check TLS at Recursive</h1>";

        htmlHeader += "<p>This webpage is created with <a href=\"https://github.com/getdnsapi/getdns-node\">node.js bindings of getdns</a>, in the expressjs framework.</p>";

        htmlHeader += "<h2>Resolver</h2>";
        htmlHeader += "<ul>";
        htmlHeader += "<li>Target resolver: " + resolver + "</li>";
        htmlHeader += "<li>Resolver's expected hostname in certificate (SubjectName): " + hostname + "</li>";
        htmlHeader += "<li>Hostname to query: " + hostname + "</li>";
        htmlHeader += "</ul>";

        htmlHeader += "<h2>Checking for</h2>";
        htmlHeader += "<ol>";
        htmlHeader += "<li>Successful TCP connection</li>";
        htmlHeader += "<li>Successful TLS connection</li>";
        htmlHeader += "<li>Successful TLS Authentication (Hostname match to server certificate)</li>";
        htmlHeader += "<li>Opportunistic TLS with fallback to TCP available</li>";
        htmlHeader += "</ol>";

        htmlHeader += "<h2>Result</h2>";

        let htmlResult = "";

        htmlResult += "<p>" + queryNote + "</p>";

        if (queryErr) {
            htmlResult += "<h3>Error</h3><p><code><pre>" + JSON.stringify(queryErr, removeCirularReferences(queryErr), 2) + "</pre></code></p>";
        }

        if (queryResult) {
            htmlResult += "<h3>Result</h3><p><code><pre>" + JSON.stringify(queryResult, removeCirularReferences(queryResult), 2) + "</pre></code></p>";
        }

        let htmlFooter = "";

        htmlFooter += "</body></html>";

        res.send(htmlHeader + htmlResult + htmlFooter)
            .end();
    };

    const resolver = req.query.resolver;
    const hostname = req.query.hostname;
    const query = req.query.query;

    /* eslint-disable no-console */
    console.log("resolver = " + resolver);
    console.log("hostname = " + hostname);
    console.log("query = " + query);
    /* eslint-enable no-console */

    const porttls = 853;
    const upstreamresolvers = [];
    upstreamresolvers.push(resolver);
    upstreamresolvers.push(porttls);
    upstreamresolvers.push(hostname);
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
                            sendHtml(err2, result2, "❌ No TCP, no TLS!");
                        } else if (result2.status === 900) {
                            // NOTE: TCP worked.
                            sendHtml(err2, result2, "✅ Connected through fallback to TCP!");
                        }
                    });
                } else if (result1.status === 900) {
                    // NOTE: TCP with authentication worked.
                    sendHtml(err1, result1, "✅ TLS without authentication succeeds!");
                } else {
                    // NOTE: Try fallback to tcp.
                    context1.destroy();
                    context2.general(query, getdns.RRTYPE_A, (err3, result3) => {
                        if (err3) {
                            sendHtml(err3, result3, "❌ Fallback to TCP failed.");
                        } else if (result3.status === 900) {
                            sendHtml(err3, result3, "✅ Connected through fallback to TCP!");
                        }
                    });
                }
            });
        } else if (result0.status === 900) {
            // NOTE: TLS auth worked.
            sendHtml(err0, result0, "✅ TLS with hostname authentication succeeds!");
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
    console.log("http://localhost:50000/resolverinfo?resolver=185.49.141.38&hostname=getdnsapi.net&query=nlnetlabs.nl");
    /* eslint-enable no-console */
}
