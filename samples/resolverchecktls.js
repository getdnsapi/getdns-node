
// Sample to demonstrate the usage of TLS authentication in the getdns nodejs API and host it
// in an express web context.
// Install from http://expressjs.com/ and follow instructions to setup in the Readme
//
//
// Run from browser using the following example url:
// http://localhost:50000/resolverinfo?resolver=185.49.141.38&query=getdnsapi.net&hostname=getdnsapi.net

// Replace the relative paths with your own path for the install of expressjs
const express = require("express");
const app = module.exports = express();

// You need getdns and getdns node installed prior to running this sample
// You can install this sample in the root directory of the getdnsnode install directory
// getdns includes. set LD_LIBRARY_PATH to /usr/local/lib
const getdns = require("../getdns");

let res1 = "";
let resfinal = "";
const options = {
    // request timeout time in millis
    timeout: 10000,
    stub: true,
    // upstream recursive servers.. overriden in command line
    upstreams: [
     ["64.6.64.6"],
     // ["185.49.141.38",853,"www.getdnsapi.net"]
    ],
    // return dnssec status false for this test
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
    process.stdout.write("resolver = " + req.query.resolver + "\n");
    process.stdout.write("query = " + req.query.query + "\n");
    process.stdout.write("hostname = " + req.query.hostname + "\n");

    const porttls = 853;
    const upstreamresolvers = [];
    upstreamresolvers.push(req.query.resolver);
    upstreamresolvers.push(porttls);
    upstreamresolvers.push(req.query.hostname);
    const up1 = [];
    up1.push(upstreamresolvers);

    //  create the contexts we need to test with the above options
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
    res1 += "<h2>Target Resolver: " + resolver + "</h2>";
    res1 += "<h2>Recursive’s Hostname in Certificate (SubjectName): " + hostname + "</h2>";
    res1 += "<h2>Checking for:</h2>";
    res1 += "<h3>1. Successful TCP connection</h3>";
    res1 += "<h3>2. Successful TLS connection</h3>";
    res1 += "<h3>3. Successful TLS Authentication (Hostname match to server certificate)</h3>";
    res1 += "<h3>4. Opportunistic TLS with fallback to TCP available</h3>";

    context.general(query, getdns.RRTYPE_A, (err0, result0) => {
        if (err0) { // TLS auth error
            context.destroy();
            context1.general(query, getdns.RRTYPE_A, (err1, result1) => {
                if (err1) {  // try TLS no auth
                    context1.destroy();
                    context2.general(query, getdns.RRTYPE_A, (err2, result2) => {
                        if (err2) { // TCP only failed
                            process.stdout.write("Error2 = " + JSON.stringify(err2) + "\n");
                            res1 += "<p><b><img src=\"http://homepages.xnet.co.nz/_default/stuff/img/img_www_no.png\" height=\"20\" width=\"20\"/>     No TCP, no TLS!</b></p>";
                        } else if (result2.status === 900) {  // TCP worked
                            process.stdout.write("In callback TCP fallback worked " + JSON.stringify(result2.replies_tree) + "\n");
                            res1 += "<p><b><img src=\"http://www.clipartbest.com/cliparts/LiK/dMx/LiKdMx56T.png\" height=\"60\" width=\"60\" />    Connected through fallback to TCP!</b></p>";
                            resfinal = res1;
                            res.send(resfinal);
                        }
                    });
                } else if (result1.status === 900) {
                    res1 += "<p><b><img src=\"http://www.clipartbest.com/cliparts/LiK/dMx/LiKdMx56T.png\" height=\"60\" width=\"60\" /><img src=\"http://www.clipartbest.com/cliparts/LiK/dMx/LiKdMx56T.png\" height=\"60\" width=\"60\" />     TLS without authentication succeeds! </b></p>";
                    process.stdout.write("In callback TLS " + JSON.stringify(result1.replies_tree) + "\n");
                    resfinal = res1;
                    res.send(resfinal);
                } else { // try fallback to tcp
                    context1.destroy();
                    context2.general(query, getdns.RRTYPE_A, (err3, result3) => {
                        if (err3) {
                            process.stdout.write("Error2 = " + JSON.stringify(err3));
                        } else if (result3.status === 900) {
                            res1 += "<p><b><img src=\"http://www.clipartbest.com/cliparts/LiK/dMx/LiKdMx56T.png\" height=\"60\" width=\"60\" />    Connected through fallback to TCP! <b></p>";
                            resfinal = res1;
                            res.send(resfinal);
                        }
                    });
                }
            });
        } else if (result0.status === 900) { // TLS auth worked
            res1 += "<p><b><img src=\"http://www.clipartbest.com/cliparts/LiK/dMx/LiKdMx56T.png\" height=\"60\" width=\"60\" /> <img src=\"http://www.clipartbest.com/cliparts/LiK/dMx/LiKdMx56T.png\" height=\"60\" width=\"60\" /> <img src=\"http://www.clipartbest.com/cliparts/LiK/dMx/LiKdMx56T.png\" height=\"60\" width=\"60\" />     Result:  TLS with hostname authentication succeeds!</b></p>";
            resfinal = res1;
            res.send(resfinal);
        }
    });

    res1 += "<p>Note: This webpage is created with node.js bindings of getdns, in the expressjs framework</p>";
    res1 += "<p>Source code will be available at <a href=\"https://github.com/getdnsapi/checkresolvertls\">https://github.com/getdnsapi/checkresolvertls</a></p>";
});

if (!module.parent) {
    app.listen(50000);

    /* eslint-disable no-console */
    console.log("Express started on port 50000");
    /* eslint-enable no-console */
}
