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

describe("BADDNS", () => {
    it("Should throw for bad add_warning_for_bad_dns", () => {
        expect(() => {
            getdns.createContext({
                add_warning_for_bad_dns: "some string value",
            });
        }).to.throwException((err) => {
            expect(err).to.be.an("object");
            expect(err).to.be.an(TypeError);
            expect(err.code).to.be.an("number");
            expect(err.code).to.be(getdns.RETURN_INVALID_PARAMETER);
            expect(err.message).to.be.an("string");
            expect(err.message).to.be("add_warning_for_bad_dns");
        });
    });

    it("Should return bad_dns", function(done) {
        const ctx = getdns.createContext();

        const recordType = getdns.RRTYPE_TXT;
        const extensions = {
            add_warning_for_bad_dns: true,
        };

        ctx.general("_443._tcp.www.nlnetlabs.nl", recordType, extensions, (err, result) => {
            expect(err).to.be(null);
            expect(result.replies_tree).to.be.an(Array);
            expect(result.replies_tree).to.not.be.empty();
            result.replies_tree.forEach((reply) => {
                expect(reply).to.be.an("object");
                expect(reply).to.not.be(null);
                expect(reply.bad_dns).to.be.an(Array);
                expect(reply.bad_dns).to.not.be.empty();
                const badDnsReplies = reply.bad_dns.filter((badDns) => {
                    const badDnsValus = [
                        getdns.BAD_DNS_CNAME_IN_TARGET,
                        getdns.BAD_DNS_ALL_NUMERIC_LABEL,
                        getdns.BAD_DNS_CNAME_RETURNED_FOR_OTHER_TYPE,
                    ];

                    return badDnsValus.indexOf(badDns) !== -1;
                });
                expect(badDnsReplies.length).to.be(reply.bad_dns.length);
            });
            shared.destroyContext(ctx, done);
        });
    });

    it("Should not return bad_dns if disabled", function(done) {
        const ctx = getdns.createContext();

        const recordType = getdns.RRTYPE_TXT;
        const extensions = {
            add_warning_for_bad_dns: false,
        };

        ctx.general("_443._tcp.www.nlnetlabs.nl", recordType, extensions, (err, result) => {
            expect(err).to.be(null);
            expect(result.replies_tree).to.be.an(Array);
            expect(result.replies_tree).to.not.be.empty();
            result.replies_tree.forEach((reply) => {
                expect(reply).to.be.an("object");
                expect(reply).to.not.be(null);
                expect(reply.bad_dns).to.not.be.ok();
            });
            shared.destroyContext(ctx, done);
        });
    });
});
