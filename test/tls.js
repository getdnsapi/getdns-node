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

const expect = require("expect.js");
const getdns = require("../");
const shared = require("./shared");

shared.initialize();

describe("TLS", () => {
    it("Should return successfully", function(done) {
        const ctx = getdns.createContext();

        ctx.dns_transport = getdns.TRANSPORT_TLS_FIRST_AND_FALL_BACK_TO_TCP_KEEP_CONNECTIONS_OPEN;
        //ctx.address("getdnsapi.net", (err, result) => {
        ctx.general("getdnsapi.net", getdns.RRTYPE_A, (err, result) => {
            expect(err).to.be(null);
            expect(result.replies_tree).to.be.an(Array);
            expect(result.replies_tree).to.not.be.empty();
            shared.destroyContext(ctx, done);
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
            shared.destroyContext(ctx, done);
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
            shared.destroyContext(ctx, done);
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
            shared.destroyContext(ctx, done);
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
            shared.destroyContext(ctx, done);
        });
    });
});
