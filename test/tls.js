/*
 * Copyright (c) 2014, 2015, 2016, 2017, 2018, Verisign, Inc.
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
    const TEST_GOOD_DOMAIN = "getdnsapi.net";
    const TEST_GOOD_DOMAIN_TLS = "starttls.verisignlabs.com";
    const TEST_GOOD_UPSTREAM_RECURSIVE_SERVER_TLS_HOSTNAME_1 = [
        "185.49.141.37",
        853,
        "getdnsapi.net",
    ];
    const TEST_GOOD_UPSTREAM_RECURSIVE_SERVER_TLS_HOSTNAME_2 = [
        "145.100.185.15",
        853,
        "dnsovertls.sinodun.com",
    ];

    describe("Basic", () => {
        it("Should fail", function(done) {
            const ctx = getdns.createContext({
                // NOTE: getdns.TRANSPORT_TLS_ONLY_KEEP_CONNECTIONS_OPEN has been deprecated.
                dns_transport: getdns.TRANSPORT_TLS_ONLY_KEEP_CONNECTIONS_OPEN,
            });

            ctx.general(TEST_GOOD_DOMAIN, getdns.RRTYPE_A, (err, result) => {
                expect(err).to.be.an("object");
                expect(err.code).to.be.an("number");
                expect(err.code).to.be(getdns.RETURN_BAD_CONTEXT);
                expect(result).to.be(undefined);
                shared.destroyContext(ctx, done);
            });
        });

        it("With TCP fallback should return replies", function(done) {
            const ctx = getdns.createContext({
                // NOTE: getdns.TRANSPORT_TLS_FIRST_AND_FALL_BACK_TO_TCP_KEEP_CONNECTIONS_OPEN ha been deprecated.
                dns_transport: getdns.TRANSPORT_TLS_FIRST_AND_FALL_BACK_TO_TCP_KEEP_CONNECTIONS_OPEN,
            });

            ctx.general(TEST_GOOD_DOMAIN, getdns.RRTYPE_A, (err, result) => {
                expect(err).to.be(null);
                expect(result.replies_tree).to.be.an(Array);
                expect(result.replies_tree).to.not.be.empty();
                shared.destroyContext(ctx, done);
            });
        });

        it("Only TLS in stub mode should return replies", function(done) {
            const ctx = getdns.createContext({
                resolution_type: getdns.RESOLUTION_STUB,
                upstream_recursive_servers: [
                    TEST_GOOD_UPSTREAM_RECURSIVE_SERVER_TLS_HOSTNAME_1,
                ],

                // NOTE: getdns.TRANSPORT_TLS_ONLY_KEEP_CONNECTIONS_OPEN has been deprecated.
                dns_transport: getdns.TRANSPORT_TLS_ONLY_KEEP_CONNECTIONS_OPEN,
            });

            ctx.general(TEST_GOOD_DOMAIN_TLS, getdns.RRTYPE_A, (err, result) => {
                expect(err).to.be(null);
                expect(result.replies_tree).to.be.an(Array);
                expect(result.replies_tree).to.not.be.empty();
                shared.destroyContext(ctx, done);
            });
        });

        it("With fallback to TCP in stub mode should return replies", function(done) {
            const ctx = getdns.createContext({
                resolution_type: getdns.RESOLUTION_STUB,
                upstream_recursive_servers: [
                    TEST_GOOD_UPSTREAM_RECURSIVE_SERVER_TLS_HOSTNAME_2,
                ],

                // NOTE: getdns.TRANSPORT_TLS_FIRST_AND_FALL_BACK_TO_TCP_KEEP_CONNECTIONS_OPEN ha been deprecated.
                dns_transport: getdns.TRANSPORT_TLS_FIRST_AND_FALL_BACK_TO_TCP_KEEP_CONNECTIONS_OPEN,
            });

            ctx.general(TEST_GOOD_DOMAIN, getdns.RRTYPE_A, (err, result) => {
                expect(err).to.be(null);
                expect(result.replies_tree).to.be.an(Array);
                expect(result.replies_tree).to.not.be.empty();
                shared.destroyContext(ctx, done);
            });
        });
    });

    describe("Hostname validation", () => {
        it("Should fail", function(done) {
            const ctx = getdns.createContext({
                tls_authentication: getdns.AUTHENTICATION_HOSTNAME,

                // NOTE: getdns.TRANSPORT_TLS_ONLY_KEEP_CONNECTIONS_OPEN has been deprecated.
                dns_transport: getdns.TRANSPORT_TLS_ONLY_KEEP_CONNECTIONS_OPEN,
            });

            ctx.general(TEST_GOOD_DOMAIN, getdns.RRTYPE_A, (err, result) => {
                expect(err).to.be.an("object");
                expect(err.code).to.be.an("number");
                expect(err.code).to.be(getdns.RETURN_BAD_CONTEXT);
                expect(result).to.be(undefined);
                shared.destroyContext(ctx, done);
            });
        });

        it("In stub mode should return replies", function(done) {
            const ctx = getdns.createContext({
                resolution_type: getdns.RESOLUTION_STUB,
                upstream_recursive_servers: [
                    TEST_GOOD_UPSTREAM_RECURSIVE_SERVER_TLS_HOSTNAME_2,
                ],
                tls_authentication: getdns.AUTHENTICATION_HOSTNAME,

                // NOTE: getdns.TRANSPORT_TLS_ONLY_KEEP_CONNECTIONS_OPEN has been deprecated.
                dns_transport: getdns.TRANSPORT_TLS_ONLY_KEEP_CONNECTIONS_OPEN,
            });

            ctx.general(TEST_GOOD_DOMAIN_TLS, getdns.RRTYPE_A, (err, result) => {
                expect(err).to.be(null);
                expect(result.replies_tree).to.be.an(Array);
                expect(result.replies_tree).to.not.be.empty();
                shared.destroyContext(ctx, done);
            });
        });
    });

    describe("Transport list", () => {
        it("Only TLS in stub mode should return replies", function(done) {
            const ctx = getdns.createContext({
                resolution_type: getdns.RESOLUTION_STUB,
                upstream_recursive_servers: [
                    TEST_GOOD_UPSTREAM_RECURSIVE_SERVER_TLS_HOSTNAME_1,
                ],

                dns_transport_list: [
                    getdns.TRANSPORT_TLS,
                ],
            });

            ctx.general(TEST_GOOD_DOMAIN_TLS, getdns.RRTYPE_A, (err, result) => {
                expect(err).to.be(null);
                expect(result.replies_tree).to.be.an(Array);
                expect(result.replies_tree).to.not.be.empty();
                shared.destroyContext(ctx, done);
            });
        });

        it("With fallback to TCP in stub mode should return replies", function(done) {
            const ctx = getdns.createContext({
                resolution_type: getdns.RESOLUTION_STUB,
                upstream_recursive_servers: [
                    TEST_GOOD_UPSTREAM_RECURSIVE_SERVER_TLS_HOSTNAME_2,
                ],

                dns_transport_list: [
                    getdns.TRANSPORT_TLS,
                    getdns.TRANSPORT_TCP,
                ],
            });

            ctx.general(TEST_GOOD_DOMAIN, getdns.RRTYPE_A, (err, result) => {
                expect(err).to.be(null);
                expect(result.replies_tree).to.be.an(Array);
                expect(result.replies_tree).to.not.be.empty();
                shared.destroyContext(ctx, done);
            });
        });
    });
});
