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
const async = require("async");
const getdns = require("../");
const shared = require("./shared");

shared.initialize();

describe("Concurrent queries", () => {
    const hosts = [
        "getdnsapi.net",
        "labs.verisigninc.com",
        "nlnetlabs.nl",
        "dnssec-name-and-shame.com",
        "nlnet.nl",
        "labs.verisigninc.com",
        "verisigninc.com",
        "iis.se",
        "www.kirei.se",
        "www.opendnssec.org",
        "www.ietf.org",
        "internetsociety.org",
    ];

    it("Should issue concurrent queries", function(done) {
        const ctx = getdns.createContext();

        async.map(
            hosts,
            (host, lookupCallback) => ctx.general(host, getdns.RRTYPE_A, lookupCallback),
            (err, result) => {
                expect(err).to.be(null);
                expect(result).to.be.an("object");
                expect(result).to.be.an(Array);
                expect(result).to.have.length(hosts.length);
                result.map((reply) => {
                    expect(reply.replies_full).to.be.an(Array);
                    expect(reply.replies_full).to.not.be.empty();
                });

                shared.destroyContext(ctx, done);
            }
        );
    });

    it("Should issue queries from concurrent contexts", function(done) {
        let ctx = null;

        async.map(
            hosts,
            (host, lookupCallback) => {
                ctx = getdns.createContext();
                return ctx.general(host, getdns.RRTYPE_A, lookupCallback);
            },
            (err, result) => {
                expect(err).to.be(null);
                expect(result).to.be.an("object");
                expect(result).to.be.an(Array);
                expect(result).to.have.length(hosts.length);
                result.map((reply) => {
                    expect(reply.replies_full).to.be.an(Array);
                    expect(reply.replies_full).to.not.be.empty();
                });

                shared.destroyContext(ctx, done);
            }
        );
    });

    it("Should issue concurrent queries from concurrent contexts", function(done) {
        const concurrentContexts = 3;
        const concurrentContextsArray = Array.from(new Array(concurrentContexts)).map((/* eslint-disable no-unused-vars */value/* eslint-enable no-unused-vars */, index) => index);

        async.map(
            concurrentContextsArray,
            (/* eslint-disable no-unused-vars */concurrentContextIndex/* eslint-enable no-unused-vars */, contextCallback) => {
                let ctx = null;

                async.map(
                    hosts,
                    (host, lookupCallback) => {
                        ctx = getdns.createContext({
                            // NOTE: lower than the test timeout.
                            timeout: 9000,
                        });

                        return ctx.general(host, getdns.RRTYPE_A, lookupCallback);
                    },
                    (err, result) => {
                        expect(err).to.be(null);
                        expect(result).to.be.an("object");
                        expect(result).to.be.an(Array);
                        expect(result).to.have.length(hosts.length);
                        result.map((reply) => {
                            expect(reply.replies_full).to.be.an(Array);
                            expect(reply.replies_full).to.not.be.empty();
                        });

                        shared.destroyContext(ctx, contextCallback);
                    }
                );
            },
            (err, result) => {
                expect(err).to.be(null);
                expect(result).to.be.an("object");
                expect(result).to.be.an(Array);
                expect(result).to.have.length(concurrentContexts);

                done();
            }
        );
    });
});
