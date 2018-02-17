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

describe("DNSSEC", () => {
    it("Should throw for bad return_dnssec_status", () => {
        expect(() => {
            getdns.createContext({
                return_dnssec_status: { "bad object": "bad object" },
            });
        }).to.throwException((err) => {
            expect(err).to.be.an("object");
            expect(err).to.be.an(TypeError);
            expect(err.code).to.be.an("number");
            expect(err.code).to.be(getdns.RETURN_INVALID_PARAMETER);
            expect(err.message).to.be.an("string");
            expect(err.message).to.be("return_dnssec_status");
        });
    });

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
            shared.destroyContext(ctx, done);
        });
    });

    it("Should not return dnssec_status if disabled", function(done) {
        const ctx = getdns.createContext({
            return_dnssec_status: false,
        });

        ctx.address("getdnsapi.net", (err, result) => {
            expect(err).to.be(null);
            expect(result.replies_tree).to.be.an(Array);
            expect(result.replies_tree).to.not.be.empty();
            result.replies_tree.map((reply) => {
                expect(reply).to.not.have.property("dnssec_status");
            });
            shared.destroyContext(ctx, done);
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

        ctx.address("getdnsapi.net", (err, result) => {
            expect(err).to.be(null);
            expect(result.replies_tree).to.be.an(Array);
            expect(result.replies_tree).to.not.be.empty();
            result.replies_tree.map((reply) => {
                expect(reply).to.have.property("dnssec_status");
                expect(reply.dnssec_status).to.be(getdns.DNSSEC_SECURE);
            });
            expect(result.status).to.be(getdns.RESPSTATUS_GOOD);
            shared.destroyContext(ctx, done);
        });
    });

    it("Should return with dnssec_status getdns.DNSSEC_SECURE when not in stub mode", function(done) {
        const ctx = getdns.createContext({
            resolution_type: getdns.RESOLUTION_RECURSING,
            return_dnssec_status: true,
        });

        ctx.address("getdnsapi.net", (err, result) => {
            expect(err).to.be(null);
            expect(result.replies_tree).to.be.an(Array);
            expect(result.replies_tree).to.not.be.empty();
            result.replies_tree.map((reply) => {
                expect(reply).to.have.property("dnssec_status", getdns.DNSSEC_SECURE);
            });
            expect(result.status).to.be(getdns.RESPSTATUS_GOOD);
            shared.destroyContext(ctx, done);
        });
    });
});

describe("DNSSEC dnssec_return_all_statuses", () => {
    it("Should throw for bad return_dnssec_status", function(done) {
        const ctx = getdns.createContext();

        const recordType = getdns.RRTYPE_A;
        const extensions = {
            dnssec_return_all_statuses: "bad value",
        };

        ctx.general("getdnsapi.net", recordType, extensions, (err, result) => {
            expect(err).to.not.be(null);
            expect(err).to.be.an("object");
            expect(err.msg).to.be.an("string");
            expect(err.code).to.be.an("number");
            expect(err.code).to.be(getdns.RETURN_EXTENSION_MISFORMAT);
            shared.destroyContext(ctx, done);
        });
    });
});

describe("DNSSEC dnssec_return_all_statuses bad", () => {
    it("Should have dnssec_status for bad DNSSEC", function(done) {
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
            result.replies_tree.map((reply) => {
                expect(reply).to.have.property("dnssec_status");
            });

            // TODO: verify.
            // expect(result.status).to.be(getdns.RESPSTATUS_);
            shared.destroyContext(ctx, done);
        });
    });

    it("Should return no dnssec_status for bad DNSSEC", function(done) {
        const ctx = getdns.createContext({
            return_dnssec_status: true,
        });

        const recordType = getdns.RRTYPE_A;
        const extensions = {
            dnssec_return_all_statuses: false,
        };

        ctx.general("dnssec-failed.org", recordType, extensions, (err, result) => {
            expect(err).to.be(null);
            expect(result.replies_tree).to.be.an(Array);
            expect(result.replies_tree).to.be.empty();

            // TODO: verify.
            // expect(result.status).to.be(getdns.RESPSTATUS_);
            shared.destroyContext(ctx, done);
        });
    });
});

describe("DNSSEC dnssec_return_all_statuses bogus", () => {
    it("Should have dnssec_status for bogus DNSSEC", function(done) {
        const ctx = getdns.createContext({
            return_dnssec_status: true,
        });

        const recordType = getdns.RRTYPE_TXT;
        const extensions = {
            dnssec_return_all_statuses: true,
        };

        ctx.general("bogus.nlnetlabs.nl", recordType, extensions, (err, result) => {
            expect(err).to.be(null);
            expect(result.replies_tree).to.be.an(Array);
            expect(result.replies_tree).to.not.be.empty();
            result.replies_tree.map((reply) => {
                expect(reply).to.have.property("dnssec_status");
                expect(reply.dnssec_status).to.be(getdns.DNSSEC_BOGUS);
            });
            expect(result.status).to.be(getdns.RESPSTATUS_GOOD);
            shared.destroyContext(ctx, done);
        });
    });

    it("Should have dnssec_status for bogus DNSSEC without return_dnssec_status", function(done) {
        const ctx = getdns.createContext({
            return_dnssec_status: false,
        });

        const recordType = getdns.RRTYPE_TXT;
        const extensions = {
            dnssec_return_all_statuses: true,
        };

        ctx.general("bogus.nlnetlabs.nl", recordType, extensions, (err, result) => {
            expect(err).to.be(null);
            expect(result.replies_tree).to.be.an(Array);
            expect(result.replies_tree).to.not.be.empty();
            result.replies_tree.map((reply) => {
                expect(reply).to.have.property("dnssec_status");
                expect(reply.dnssec_status).to.be(getdns.DNSSEC_BOGUS);
            });
            expect(result.status).to.be(getdns.RESPSTATUS_GOOD);
            shared.destroyContext(ctx, done);
        });
    });

    it("Should return no replies for bogus DNSSEC", function(done) {
        const ctx = getdns.createContext({
            return_dnssec_status: true,
        });

        const recordType = getdns.RRTYPE_TXT;
        const extensions = {
            dnssec_return_all_statuses: false,
        };

        ctx.general("bogus.nlnetlabs.nl", recordType, extensions, (err, result) => {
            expect(err).to.be(null);
            expect(result.replies_tree).to.be.an(Array);
            expect(result.replies_tree).to.be.empty();
            expect(result.status).to.be(getdns.RESPSTATUS_NO_NAME);
            shared.destroyContext(ctx, done);
        });
    });
});

describe("DNSSEC dnssec_return_all_statuses good", () => {
    it("Should have dnssec_status for good DNSSEC", function(done) {
        const ctx = getdns.createContext({
            return_dnssec_status: true,
        });

        const recordType = getdns.RRTYPE_A;
        const extensions = {
            dnssec_return_all_statuses: true,
        };

        ctx.general("internetsociety.org", recordType, extensions, (err, result) => {
            expect(err).to.be(null);
            expect(result.replies_tree).to.be.an(Array);
            expect(result.replies_tree).to.not.be.empty();
            result.replies_tree.map((reply) => {
                expect(reply).to.have.property("dnssec_status");
                expect(reply.dnssec_status).to.be(getdns.DNSSEC_SECURE);
            });
            expect(result.status).to.be(getdns.RESPSTATUS_GOOD);
            shared.destroyContext(ctx, done);
        });
    });

    it("Should have dnssec_status for good DNSSEC without return_dnssec_status", function(done) {
        const ctx = getdns.createContext({
            return_dnssec_status: false,
        });

        const recordType = getdns.RRTYPE_A;
        const extensions = {
            dnssec_return_all_statuses: true,
        };

        ctx.general("internetsociety.org", recordType, extensions, (err, result) => {
            expect(err).to.be(null);
            expect(result.replies_tree).to.be.an(Array);
            expect(result.replies_tree).to.not.be.empty();
            result.replies_tree.map((reply) => {
                expect(reply).to.have.property("dnssec_status");
                expect(reply.dnssec_status).to.be(getdns.DNSSEC_SECURE);
            });
            expect(result.status).to.be(getdns.RESPSTATUS_GOOD);
            shared.destroyContext(ctx, done);
        });
    });

    it("Should always return dnssec_status for good DNSSEC", function(done) {
        const ctx = getdns.createContext({
            return_dnssec_status: true,
        });

        const recordType = getdns.RRTYPE_A;
        const extensions = {
            dnssec_return_all_statuses: false,
        };

        ctx.general("internetsociety.org", recordType, extensions, (err, result) => {
            expect(err).to.be(null);
            expect(result.replies_tree).to.be.an(Array);
            expect(result.replies_tree).to.not.be.empty();
            result.replies_tree.map((reply) => {
                expect(reply).to.have.property("dnssec_status");
                expect(reply.dnssec_status).to.be(getdns.DNSSEC_SECURE);
            });
            expect(result.status).to.be(getdns.RESPSTATUS_GOOD);
            shared.destroyContext(ctx, done);
        });
    });

    it("Should return only good DNSSEC dnssec_status", function(done) {
        const ctx = getdns.createContext({
            return_dnssec_status: true,
        });

        const recordType = getdns.RRTYPE_A;
        const extensions = {
            dnssec_return_all_statuses: true,
        };

        ctx.general("internetsociety.org", recordType, extensions, (err, result) => {
            expect(err).to.be(null);
            expect(result.replies_tree).to.be.an(Array);
            expect(result.replies_tree).to.not.be.empty();
            result.replies_tree.map((reply) => {
                expect(reply).to.have.property("dnssec_status");
                expect(reply.dnssec_status).to.be(getdns.DNSSEC_SECURE);
            });
            expect(result.status).to.be(getdns.RESPSTATUS_GOOD);
            shared.destroyContext(ctx, done);
        });
    });
});
