/*
 * Copyright (c) 2014, 2015, 2016, 2017, Verisign, Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * * Redistributions of source code must retain the above copyright
 *   notice, this list of conditions and the following disclaimer.
 * * Redistributions in binary form must reproduce the above copyright
 *   notice, this list of conditions and the following disclaimer in the
 *   documentation and/or other materials provided with the distribution.
 * * Neither the names of the copyright holders nor the
 *   names of its contributors may be used to endorse or promote products
 *   derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL Verisign, Inc. BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/* global
describe:false,
it:false,
*/

"use strict";

// Requires.
const net = require("net");
const expect = require("expect.js");
const getdns = require("../");
const async = require("async");
const segfaultHandler = require("segfault-handler");

const segfaultDumpFilename = "crash.log";

// Dump segfault stacktraces both to the console and to a file.
segfaultHandler.registerHandler(segfaultDumpFilename);

// Basic creation with various options.
describe("Context Create", () => {
    it("Should create a default context", () => {
        const ctx = getdns.createContext();
        expect(ctx).to.be.ok();

        expect(ctx.destroy).to.be.an("function");
        expect(ctx.cancel).to.be.an("function");
        expect(ctx.general).to.be.an("function");
        expect(ctx.address).to.be.an("function");
        expect(ctx.service).to.be.an("function");
        expect(ctx.hostname).to.be.an("function");

        // NOTE: these functions are "hidden", but was previously used in examples as well as in tests below.
        // TODO: officially deprecate?
        // TODO: make sure to proxy only the public context API functions.
        expect(ctx.lookup).to.be.an("function");
        expect(ctx.getAddress).to.be.an("function");
        expect(ctx.getService).to.be.an("function");
        expect(ctx.getHostname).to.be.an("function");

        expect(ctx.destroy()).to.be.ok();
    });

    it("Should create a context with options", () => {
        const ctx = getdns.createContext({
            resolution_type: getdns.RESOLUTION_STUB,
            upstream_recursive_servers: [
                "8.8.8.8",
                ["127.0.0.1", 53],
            ],
            timeout: 10,
        });

        expect(ctx).to.be.ok();
        expect(ctx.destroy()).to.be.ok();
    });

    it("Should create a context with deprecated options", () => {
        const ctx = getdns.createContext({
            stub: true,
            upstreams: [
                "8.8.8.8",
                ["127.0.0.1", 53],
            ],
            timeout: 10,
        });

        expect(ctx).to.be.ok();
        expect(ctx.destroy()).to.be.ok();
    });
});

const finish = (ctx, done) => {
    expect(ctx.destroy()).to.be.ok();
    expect(ctx.destroy()).to.not.be.ok();
    done();
};

describe("Context Query with old/hidden API functions", () => {
    it("Should get valid results on lookup getdnsapi.net", function(done) {
        const ctx = getdns.createContext();

        ctx.lookup("getdnsapi.net", getdns.RRTYPE_A, (err, result) => {
            expect(err).to.be(null);
            expect(result).to.be.an("object");
            expect(result.just_address_answers).to.be.an(Array);
            expect(result.just_address_answers).to.not.be.empty();
            result.just_address_answers.map((address) => {
                expect(address).to.be.an("string");
                expect(net.isIP(address)).to.be.ok();
            });
            finish(ctx, done);
        });
    });

    it("Should get valid results on getAddress getdnsapi.net", function(done) {
        const ctx = getdns.createContext();

        ctx.getAddress("getdnsapi.net", (err, result) => {
            expect(err).to.be(null);
            expect(result).to.be.an("object");
            expect(result.just_address_answers).to.be.an(Array);
            expect(result.just_address_answers).to.not.be.empty();
            result.just_address_answers.map((address) => {
                expect(address).to.be.an("string");
                expect(net.isIP(address)).to.be.ok();
            });
            finish(ctx, done);
        });
    });

    it("Should get valid results on getService getdnsapi.net", function(done) {
        const ctx = getdns.createContext();

        ctx.getService("getdnsapi.net", (err, result) => {
            expect(err).to.be(null);
            expect(result).to.be.an("object");
            expect(result.replies_full).to.be.an(Array);
            expect(result.replies_full).to.not.be.empty();
            finish(ctx, done);
        });
    });

    it("Should get valid results on getHostname 8.8.8.8", function(done) {
        const ctx = getdns.createContext();

        ctx.getHostname("8.8.8.8", (err, result) => {
            expect(err).to.be(null);
            expect(result).to.be.an("object");
            expect(result.replies_full).to.be.an(Array);
            expect(result.replies_full).to.not.be.empty();
            finish(ctx, done);
        });
    });
});

describe("Context Query with public API functions", () => {
    it("Should get valid results on general getdnsapi.net", function(done) {
        const ctx = getdns.createContext();

        ctx.general("getdnsapi.net", getdns.RRTYPE_A, (err, result) => {
            expect(err).to.be(null);
            expect(result).to.be.an("object");
            expect(result.just_address_answers).to.be.an(Array);
            expect(result.just_address_answers).to.not.be.empty();
            result.just_address_answers.map((address) => {
                expect(address).to.be.an("string");
                expect(net.isIP(address)).to.be.ok();
            });
            finish(ctx, done);
        });
    });

    it("Should get valid results on address getdnsapi.net", function(done) {
        const ctx = getdns.createContext();

        ctx.address("getdnsapi.net", (err, result) => {
            expect(err).to.be(null);
            expect(result).to.be.an("object");
            expect(result.just_address_answers).to.be.an(Array);
            expect(result.just_address_answers).to.not.be.empty();
            result.just_address_answers.map((address) => {
                expect(address).to.be.an("string");
                expect(net.isIP(address)).to.be.ok();
            });
            finish(ctx, done);
        });
    });

    it("Should get valid results on service getdnsapi.net", function(done) {
        const ctx = getdns.createContext();

        ctx.service("getdnsapi.net", (err, result) => {
            expect(err).to.be(null);
            expect(result).to.be.an("object");
            expect(result.replies_full).to.be.an(Array);
            expect(result.replies_full).to.not.be.empty();
            finish(ctx, done);
        });
    });

    it("Should get valid results on hostname 8.8.8.8", function(done) {
        const ctx = getdns.createContext();

        ctx.hostname("8.8.8.8", (err, result) => {
            expect(err).to.be(null);
            expect(result).to.be.an("object");
            expect(result.replies_full).to.be.an(Array);
            expect(result.replies_full).to.not.be.empty();
            finish(ctx, done);
        });
    });
});

describe("Concurrent queries", () => {
    it("Should issue concurrent queries", function(done) {
        const ctx = getdns.createContext();
        const hosts = ["getdnsapi.net", "labs.verisigninc.com", "nlnetlabs.nl"];

        async.map(hosts, ctx.address.bind(ctx), (err, result) => {
            expect(err).to.be(null);
            expect(result).to.be.an("object");
            expect(result).to.be.an(Array);
            expect(result).to.have.length(hosts.length);
            result.map((r) => {
                expect(r.replies_full).to.be.an(Array);
                expect(r.replies_full).to.not.be.empty();
            });

            finish(ctx, done);
        });
    });
});

describe("Timeouts", () => {
    it("Should timeout", function(done) {
        const ctx = getdns.createContext({
            resolution_type: getdns.RESOLUTION_STUB,
            timeout: 1,
        });

        ctx.address("getdnsapi.net", (err, result) => {
            expect(err).to.be.an("object");
            expect(result).to.be(null);
            expect(err).to.have.property("msg");
            expect(err).to.have.property("code");
            finish(ctx, done);
        });
    });

    it("Should not timeout", function(done) {
        const ctx = getdns.createContext({
            resolution_type: getdns.RESOLUTION_STUB,
            timeout: 10000,
        });

        ctx.address("getdnsapi.net", (err, result) => {
            expect(err).to.be(null);
            expect(result).to.be.an("object");
            finish(ctx, done);
        });
    });
});

describe("Cancelled queries", () => {
    it("Should cancel the query", function(done) {
        const ctx = getdns.createContext({
            resolution_type: getdns.RESOLUTION_STUB,
        });

        const transId = ctx.address("getdnsapi.net", (err, result) => {
            expect(err).to.be.an("object");
            expect(result).to.be(null);
            expect(err).to.have.property("msg");
            expect(err).to.have.property("code");
            expect(err.code).to.equal(getdns.CALLBACK_CANCEL);
            finish(ctx, done);
        });

        expect(transId).to.be.ok();
        expect(ctx.cancel(transId)).to.be.ok();
    });
});

describe("Response/result types", () => {
    it("Should have a buffer as rdata_raw", function(done) {
        const ctx = getdns.createContext();

        ctx.address("getdnsapi.net", (err, result) => {
            expect(err).to.be(null);
            expect(result).to.be.an("object");
            expect(result.replies_full).to.be.an(Array);
            expect(result.replies_full).to.not.be.empty();
            result.replies_full.map((r) => {
                expect(r).to.be.an(Buffer);
            });
            finish(ctx, done);
        });
    });
});

describe("DNSSEC", () => {
    it("Should return with dnssec_status", function(done) {
        const ctx = getdns.createContext({
            return_dnssec_status: true,
        });

        ctx.address("getdnsapi.net", (err, result) => {
            expect(err).to.be(null);
            expect(result.replies_tree).to.be.an(Array);
            expect(result.replies_tree).to.not.be.empty();
            result.replies_tree.map((reply) => {
                expect(reply).to.have.property("dnssec_status");
            });
            finish(ctx, done);
        });
    });

    it("Should return with dnssec_status getdns.DNSSEC_SECURE when in stub mode fallback", function(done) {
        const ctx = getdns.createContext({
            resolution_type: getdns.RESOLUTION_STUB,
            upstream_recursive_servers: [
                "64.6.64.6",
            ],
            return_dnssec_status: true,
        });

        ctx.dns_transport = getdns.TRANSPORT_UDP_FIRST_AND_FALL_BACK_TO_TCP;
        ctx.address("getdnsapi.net", (err, result) => {
            expect(err).to.be(null);
            expect(result.replies_tree).to.be.an(Array);
            expect(result.replies_tree).to.not.be.empty();
            finish(ctx, done);
        });
    });

    it("Should return with dnssec_status getdns.DNSSEC_SECURE when not in stub mode", function(done) {
        const ctx = getdns.createContext({
            resolution_type: getdns.RESOLUTION_RECURSING,
            return_dnssec_status: true,
        });

        ctx.address("getdnsapi.net", (err, result) => {
            expect(err).to.be(null);
            result.replies_tree.map((reply) => {
                expect(reply).to.have.property("dnssec_status", getdns.DNSSEC_SECURE);
            });
            finish(ctx, done);
        });
    });
});

describe("TLS", () => {
    it("Should return successfully", function(done) {
        const ctx = getdns.createContext();

        ctx.dns_transport = getdns.TRANSPORT_TLS_FIRST_AND_FALL_BACK_TO_TCP_KEEP_CONNECTIONS_OPEN;
        //ctx.address("getdnsapi.net", (err, result) => {
        ctx.general("getdnsapi.net", getdns.RRTYPE_A, (err, result) => {
            expect(err).to.be(null);
            expect(result.replies_tree).to.be.an(Array);
            expect(result.replies_tree).to.not.be.empty();
            finish(ctx, done);
        });
    });

    it("Hostname validation should return successfully", function(done) {
        const ctx = getdns.createContext({
            resolution_type: getdns.RESOLUTION_STUB,
            upstream_recursive_servers: [
                "185.49.141.38", // 853, "getdnsapi.net"
            ],
        });

        const porttls = 853;
        const upstreamresolvers = [];
        upstreamresolvers.push("185.49.141.38");
        upstreamresolvers.push(porttls);
        upstreamresolvers.push("getdnsapi.net");
        const up1 = [];
        up1.push(upstreamresolvers);

        // Create the contexts we need to test with the above options.
        ctx.upstream_recursive_servers = up1;

        ctx.tls_authentication = getdns.AUTHENTICATION_HOSTNAME;
        ctx.dns_transport = getdns.TRANSPORT_TLS_ONLY_KEEP_CONNECTIONS_OPEN;
        ctx.general("getdnsapi.net", getdns.RRTYPE_A, (err, result) => {
            expect(err).to.be(null);
            expect(result.replies_tree).to.be.an(Array);
            expect(result.replies_tree).to.not.be.empty();
            finish(ctx, done);
        });
    });

    it("Only TLS should return successfully", function(done) {
        const ctx = getdns.createContext({
            resolution_type: getdns.RESOLUTION_STUB,
            upstream_recursive_servers: [
                "173.255.254.151",
            ],
        });

        ctx.dns_transport = getdns.TRANSPORT_TLS_ONLY_KEEP_CONNECTIONS_OPEN;
        ctx.general("starttls.verisignlabs.com", getdns.RRTYPE_A, (err, result) => {
            expect(err).to.be(null);
            expect(result.replies_tree).to.be.an(Array);
            expect(result.replies_tree).to.not.be.empty();
            finish(ctx, done);
        });
    });

    it("TLS fallback to TCP should return successfully", function(done) {
        const ctx = getdns.createContext({
            resolution_type: getdns.RESOLUTION_STUB,
            upstream_recursive_servers: [
                "173.255.254.151",
            ],
        });

        ctx.dns_transport = getdns.TRANSPORT_TLS_FIRST_AND_FALL_BACK_TO_TCP_KEEP_CONNECTIONS_OPEN;
        ctx.general("starttls.verisignlabs.com", getdns.RRTYPE_A, (err, result) => {
            expect(err).to.be(null);
            expect(result.replies_tree).to.be.an(Array);
            expect(result.replies_tree).to.not.be.empty();
            finish(ctx, done);
        });
    });

    it("STARTTLS first should return successfully", function(done) {
        const ctx = getdns.createContext();

        // TODO DEBUG.
        //ctx.dns_transport = getdns.TRANSPORT_STARTTLS_FIRST_AND_FALL_BACK_TO_TCP_KEEP_CONNECTIONS_OPEN;
        ctx.dns_transport = getdns.TRANSPORT_TCP_ONLY;
        ctx.general("starttls.verisignlabs.com", getdns.RRTYPE_A, (err, result) => {
            expect(err).to.be(null);
            expect(result.replies_tree).to.be.an(Array);
            expect(result.replies_tree).to.not.be.empty();
            finish(ctx, done);
        });
    });
});

describe("TSIG", () => {
    it("Should return successfully", function(done) {
        const ctx = getdns.createContext({
            resolution_type: getdns.RESOLUTION_STUB,
            upstream_recursive_servers: [
                "185.49.141.37", // 853 , "^hmac-md5.tsigs.getdnsapi.net:16G69OTeXW6xSQ=="
            ],
        });

        const port = 53;
        const upstreamresolvers = [];
        upstreamresolvers.push("185.49.141.37");
        upstreamresolvers.push(port);
        upstreamresolvers.push("^hmac-md5.tsigs.getdnsapi.net:16G69OTeXW6xSQ==");
        const up1 = [];
        up1.push(upstreamresolvers);

        // Create the contexts we need to test with the above options.
        ctx.upstream_recursive_servers = up1;
        ctx.general("getdnsapi.net", getdns.RRTYPE_SOA, (err, result) => {
            expect(result.replies_tree[0].tsig_status).to.be.equal(400);
            expect(err).to.be(null);
            expect(result.replies_tree).to.be.an(Array);
            expect(result.replies_tree).to.not.be.empty();
            finish(ctx, done);
        });
    });
});

describe("BADDNS", () => {
    it("Should return successfully", function(done) {
        const ctx = getdns.createContext();

        const recordType = getdns.RRTYPE_TXT;
        const extensions = {
            add_warning_for_bad_dns: true,
        };

        ctx.general("_443._tcp.www.nlnetlabs.nl", recordType, extensions, (err, result) => {
            expect(result.replies_tree[0].bad_dns).to.not.be.empty();
            expect(err).to.be(null);
            expect(result.replies_tree).to.be.an(Array);
            expect(result.replies_tree).to.not.be.empty();
            finish(ctx, done);
        });
    });
});

describe("SUFFIX", () => {
    it("Should return successfully", function(done) {
        const ctx = getdns.createContext();

        const port = 53;
        const upstreamresolvers = [];
        upstreamresolvers.push("8.8.8.8");
        upstreamresolvers.push(port);
        upstreamresolvers.push("~getdnsapi.net,net");
        const up1 = [];
        up1.push(upstreamresolvers);
        ctx.upstream_recursive_servers = up1;

        ctx.general("www.verisignlabs", getdns.RRTYPE_A, (err, result) => {
            expect(err).to.be(null);
            expect(result.replies_tree).to.be.an(Array);
            expect(result.replies_tree).to.not.be.empty();
            finish(ctx, done);
        });
    });
});

describe("ALLSTATUS", () => {
    it("Should return successfully", function(done) {
        const ctx = getdns.createContext({
            return_dnssec_status: true,
        });

        const recordType = getdns.RRTYPE_A;
        const extensions = {
            dnssec_return_all_statuses: true,
        };

        ctx.general("dnssec-failed.org", recordType, extensions, (err, result) => {
            expect(err).to.be(null);
            expect(result.replies_tree).to.be.an(Array);
            expect(result.replies_tree).to.not.be.empty();
            finish(ctx, done);
        });
    });
});

describe("APPENDNAME", () => {
    it("APPEND_NAME_ALWAYS should return successfully", function(done) {
        const ctx = getdns.createContext();

        ctx.suffix = "org";
        ctx.append_name = getdns.APPEND_NAME_ALWAYS;
        ctx.general("www.verisignlabs", getdns.RRTYPE_A, (err, result) => {
            expect(err).to.be(null);
            expect(result.replies_tree).to.be.an(Array);
            expect(result.replies_tree).to.not.be.empty();
            finish(ctx, done);
        });
    });
});
