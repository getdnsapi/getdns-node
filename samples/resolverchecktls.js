

// Sample to demonstrate the usage of TLS authentication in the getdns nodejs API and host it
// in an express web context.
// Install from http://expressjs.com/ and follow instructions to setup in the Readme
//
//
// Replace the relative paths with your own path for the install of expressjs
var express = require('express');
var app = module.exports = express();

// You need getdns and getdns node installed prior to running this sample
// You can install this sample in the root directory of the getdnsnode install directory
// getdns includes. set LD_LIBRARY_PATH to /usr/local/lib
var getdns = require('../getdns');

var res1 = "";

var options = {
    // request timeout time in millis
    timeout : 10000,
    stub : true,
    // upstream recursive servers.. overriden in command line
    upstreams : [
     ["64.6.64.6"]
//     ["185.49.141.38",853,"www.dnssec-name-and-shame.com"]
    ],
    // return dnssec status false for this test
    return_dnssec_status : false,
    };


   var resolver, query;
   var hostname = "<null>"; 
   process.argv.forEach(function (val, index, array) {
     console.log(index + ': ' + val);
     if (index == 2) resolver = val;
     if (index == 3) query = val;
     if (index == 4) hostname = val;
   });
   process.stdout.write("resolver = " + resolver +  "\n");
   process.stdout.write("query = " + query  + "\n");
   process.stdout.write("hostname = " + hostname +  "\n");

    porttls = 853;
    var upstreamresolvers = [];
    upstreamresolvers.push(resolver);
    upstreamresolvers.push(porttls);
    upstreamresolvers.push(hostname);
    var up1 = [];
    up1.push(upstreamresolvers);

//  create the contexts we need to test with the above options
    var context = getdns.createContext(options);
    context.upstream_recursive_servers = up1;
    context.timeout = 10000;
    context.tls_authentication = getdns.AUTHENTICATION_HOSTNAME;
    context.upstream_recursive_servers = resolver;
    context.dns_transport = getdns.TRANSPORT_TLS_ONLY_KEEP_CONNECTIONS_OPEN;
    
    var context1 = getdns.createContext(options);
    context1.upstream_recursive_servers = up1;
    context1.timeout = 10000;
    context1.tls_authentication = getdns.AUTHENTICATION_NONE;
    context1.dns_transport = getdns.TRANSPORT_TLS_ONLY_KEEP_CONNECTIONS_OPEN;

    porttcp = 53;
    var upstreamresolvertcp = [];
    upstreamresolvertcp.push(resolver);
    upstreamresolvertcp.push(porttcp);
    var up2 = [];
    up2.push(upstreamresolvertcp);
    var context2 = getdns.createContext(options);
    context2.upstream_recursive_servers = up2;
    context2.timeout = 10000;
    context2.tls_authentication = getdns.AUTHENTICATION_NONE;
    context2.dns_transport = getdns.TRANSPORT_TLS_FIRST_AND_FALL_BACK_TO_TCP_KEEP_CONNECTIONS_OPEN;
    
    res1 += "<h1>Check TLS at Recursive</h1>";
    res1 += "<h2>Target Resolver: " + resolver + "</h2>";
    res1 += "<h2>Recursive’s Hostname in Certificate:" + hostname + "</h2>";
    res1 += "<h2>Checking for:</h2>";
    res1 += "<h3>1. Successful TCP connection</h3>";
    res1 += "<h3>2. Successful TLS connection</h3>";
    res1 += "<h3>3. Successful TLS Authentication (Hostname match to server certificate)</h3>";
    res1 += "<h3>4. Opportunistic TLS with fallback to TCP available</h3>";

    context.general(query, getdns.RRTYPE_A, function(err, result) {
      if (err != null) { // TLS auth error
        context.destroy();
        context1.general(query, getdns.RRTYPE_A, function(err, result) {
        if (err != null) {  // try TLS no auth
           context1.destroy();
           context2.general(query, getdns.RRTYPE_A, function(err, result) {
           if (err != null) { // TCP only failed
             process.stdout.write("Error2 = " + JSON.stringify(err) + "\n");
	     res1 += "<p><b><img src=\"http://homepages.xnet.co.nz/_default/stuff/img/img_www_no.png\" height=\"20\" width=\"20\"/>     No TCP, no TLS!</b></p>";
           } else if (result.status == 900) {  // TCP worked
              process.stdout.write("In callback TCP fallback worked " + JSON.stringify(result.replies_tree) + "\n");
	      res1 += "<p><b><img src=\"http://sweetclipart.com/multisite/sweetclipart/files/check_mark_green.png\" height=\"20\" width=\"20\"/>    Connected through fallback to TCP!</b></p>";
              app.get('/', function(req, res){
               res.send(res1);
            });
         }
       });
       } else if (result.status == 900) {
	    res1 += "<p><b><img src=\"http://sweetclipart.com/multisite/sweetclipart/files/check_mark_green.png\" height=\"20\" width=\"20\"/><img src=\"http://sweetclipart.com/multisite/sweetclipart/files/check_mark_green.png\" height=\"20\" width=\"20\"/>    TLS without authentication succeeds! </b></p>";
            process.stdout.write("In callback TLS " + JSON.stringify(result.replies_tree) + "\n");
            app.get('/', function(req, res){
             res.send(res1);
            });
        } else { // try fallback to tcp
           context1.destroy();
           context2.general(query, getdns.RRTYPE_A, function(err, result) {
           if (err != null) {
             process.stdout.write("Error2 = " + JSON.stringify(err));
           } else if (result.status == 900) {
	      res1 += "<p><b><img src=\"http://sweetclipart.com/multisite/sweetclipart/files/check_mark_green.png\" height=\"20\" width=\"20\"/>    Connected through fallback to TCP! <b></p>";
              app.get('/', function(req, res){
               res.send(res1);
            });
         }
       });
      }
      });
      } else if  (result.status == 900) { // TLS auth worked
	    res1 += "<p><b><img src=\"http://sweetclipart.com/multisite/sweetclipart/files/check_mark_green.png\" height=\"20\" width=\"20\"/><img src=\"http://sweetclipart.com/multisite/sweetclipart/files/check_mark_green.png\" height=\"20\" width=\"20\"/><img src=\"http://sweetclipart.com/multisite/sweetclipart/files/check_mark_green.png\" height=\"20\" width=\"20\"/>     Result:  TLS with hostname authentication succeeds!</b></p>";
            app.get('/', function(req, res){
             res.send(res1);
            });
      } 
      
    });

    res1 += "<p>Note: This webpage is created with node.js bindings of getdns, in the expressjs framework</p>";
    res1 += "<p>Source code will be available at <a href=\"https://github.com/getdnsapi/checkresolvertls\">https://github.com/getdnsapi/checkresolvertls</a></p>";

    app.get('/', function(req, res){
        res.send(res1);
        });

if (!module.parent) {
  app.listen(50000);
  console.log('Express started on port 50000');
}
