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

describe("Transport list", () => {
    it("Bad extension value dns_transport_list", () => {
        expect(() => {
            getdns.createContext({
                dns_transport_list: { "bad object": "bad object" },
            });
        }).to.throwException((err) => {
            expect(err).to.be.an("object");
            expect(err).to.be.an(TypeError);
            expect(err.code).to.be.an("number");
            expect(err.code).to.be(getdns.RETURN_INVALID_PARAMETER);
            expect(err.message).to.be.an("string");
            expect(err.message).to.be("dns_transport_list");
        });
    });

    it("UDP", function(done) {
        const ctx = getdns.createContext({
            dns_transport_list: [
                getdns.TRANSPORT_UDP,
            ],
        });

        ctx.general("getdnsapi.net", getdns.RRTYPE_A, (err, result) => {
            expect(err).to.be(null);
            expect(result.replies_tree).to.be.an(Array);
            expect(result.replies_tree).to.not.be.empty();
            shared.destroyContext(ctx, done);
        });
    });

    it("TCP", function(done) {
        const ctx = getdns.createContext({
            dns_transport_list: [
                getdns.TRANSPORT_TCP,
            ],
        });

        ctx.general("getdnsapi.net", getdns.RRTYPE_A, (err, result) => {
            expect(err).to.be(null);
            expect(result.replies_tree).to.be.an(Array);
            expect(result.replies_tree).to.not.be.empty();
            shared.destroyContext(ctx, done);
        });
    });

    it("TLS", function(done) {
        const ctx = getdns.createContext({
            resolution_type: getdns.RESOLUTION_STUB,
            upstream_recursive_servers: [
                [
                    "185.49.141.38",
                    853,
                    "getdnsapi.net",
                ],
            ],
            dns_transport_list: [
                getdns.TRANSPORT_TLS,
            ],
        });

        ctx.general("getdnsapi.net", getdns.RRTYPE_A, (err, result) => {
            expect(err).to.be(null);
            expect(result.replies_tree).to.be.an(Array);
            expect(result.replies_tree).to.not.be.empty();
            shared.destroyContext(ctx, done);
        });
    });

    it("TLS in resolve mode should fail", function(done) {
        const ctx = getdns.createContext({
            dns_transport_list: [
                getdns.TRANSPORT_TLS,
            ],
        });

        ctx.general("getdnsapi.net", getdns.RRTYPE_A, (err, result) => {
            expect(err).to.be.an("object");
            expect(result).to.be(undefined);
            expect(err).to.have.property("msg");
            expect(err).to.have.property("code");
            expect(err.code).to.be(getdns.RETURN_BAD_CONTEXT);
            shared.destroyContext(ctx, done);
        });
    });

    it("TLS in resolve mode should with UDP fallback should work", function(done) {
        const ctx = getdns.createContext({
            dns_transport_list: [
                getdns.TRANSPORT_TLS,
                getdns.TRANSPORT_UDP,
            ],
        });

        ctx.general("getdnsapi.net", getdns.RRTYPE_A, (err, result) => {
            expect(err).to.be(null);
            expect(result.replies_tree).to.be.an(Array);
            expect(result.replies_tree).to.not.be.empty();
            shared.destroyContext(ctx, done);
        });
    });
});
