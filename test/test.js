/*
 * Copyright (c) 2014, Verisign, Inc.
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

describe("getdns test", function() {
    // requires
    var expect = require('expect.js'),
        getdns = require("../getdns"),
        async  = require("async");

    // Basic creation w/ various opts
    describe("Context Create", function() {
        it("should create a default context", function() {
            var ctx = getdns.createContext();
            expect(ctx).to.be.ok();
            ctx.destroy();
        });

        it("should create a context with options", function() {
            var ctx = getdns.createContext({
                "stub" : true,
                "upstreams" : [
                    "8.8.8.8",
                    ["127.0.0.1", 53]
                ],
                "timeout" : 10
            });
            expect(ctx).to.be.ok();
            ctx.destroy();
        });
    });

    var finish = function(ctx, done) {
        // if hitting 0.1.0 official, set timeout is needed
        console.log("Destroying.");
        ctx.destroy();
        done();
    }

    describe("Context Query", function() {

        it("should get valid results on lookup getdnsapi.net", function(done) {
            var ctx = getdns.createContext({"stub" : true});
            ctx.lookup("getdnsapi.net", getdns.RRTYPE_A, function(e, result) {
                expect(e).to.not.be.ok(e);
                expect(result).to.be.ok();
                expect(result.just_address_answers).to.be.an(Array);
                expect(result.just_address_answers).to.not.be.empty();
                result.just_address_answers.map(function(r) {
                    expect(r).to.be.an('string');
                });
                finish(ctx, done);
            });
        });
        it("should get valid results on getAddress getdnsapi.net", function(done) {
            var ctx = getdns.createContext({"stub" : true});
            ctx.getAddress("getdnsapi.net", function(e, result) {
                expect(e).to.not.be.ok(e);
                expect(result).to.be.ok();
                expect(result.just_address_answers).to.be.an(Array);
                expect(result.just_address_answers).to.not.be.empty();
                finish(ctx, done);
            });
        });
        it("should get valid results on getService getdnsapi.net", function(done) {
            var ctx = getdns.createContext({"stub" : true});
            ctx.getService("getdnsapi.net", function(e, result) {
                expect(e).to.not.be.ok(e);
                expect(result).to.be.ok();
                expect(result.replies_full).to.be.an(Array);
                expect(result.replies_full).to.not.be.empty();
                finish(ctx, done);
            });
        });
        it("should get valid results on getHostname 8.8.8.8", function(done) {
            var ctx = getdns.createContext({"stub" : true});
            ctx.getHostname("8.8.8.8", function(e, result) {
                expect(e).to.not.be.ok(e);
                expect(result).to.be.ok();
                expect(result.replies_full).to.be.an(Array);
                expect(result.replies_full).to.not.be.empty();
                finish(ctx, done);
            });
        });
        it("should issue concurrent queries", function(done) {
            var ctx = getdns.createContext({"stub" : true});
            var hosts = ["getdnsapi.net", "labs.verisigninc.com", "nlnetlabs.nl"];
            async.map(hosts, ctx.getAddress.bind(ctx), function(err, result) {
                expect(err).to.not.be.ok(err);
                expect(result).to.be.ok();
                expect(result).to.be.an(Array);
                expect(result).to.have.length(hosts.length);
                result.map(function(r) {
                    expect(r.replies_full).to.be.an(Array);
                    expect(r.replies_full).to.not.be.empty();
                });
                finish(ctx, done);
            });
        });

        // timeouts
        it("should timeout", function(done) {
            var ctx = getdns.createContext({
                "stub" : true,
                "timeout" : 1
            });
            ctx.getAddress("getdnsapi.net", function(err, result) {
                expect(err).to.be.ok();
                expect(result).to.not.be.ok();
                expect(err).to.have.property('msg')
                expect(err).to.have.property('code')
                finish(ctx, done);
            });
        })

        // cancel
        it("should cancel the query", function(done) {
            var ctx = getdns.createContext({"stub" : true});
            var transId = ctx.getAddress("getdnsapi.net", function(err, result) {
                expect(err).to.be.ok();
                expect(result).to.not.be.ok();
                expect(err).to.have.property('msg')
                expect(err).to.have.property('code')
                expect(err.code).to.equal(getdns.CALLBACK_CANCEL);
                // need to set timeout here
                setTimeout(function() {
                    finish(ctx, done);
                }, 10)
            });
            expect(transId).to.be.ok();
            expect(ctx.cancel(transId)).to.be.ok();
        });
    });

    describe("DNSSEC options", function() {
        it("should return with dnssec_status", function(done) {
            var ctx = getdns.createContext({
                "stub" : true,
                "return_dnssec_status" : true
            });
            ctx.getAddress("getdnsapi.net", function(err, result) {
                expect(err).to.not.be.ok();
                expect(result.replies_tree).to.be.an(Array);
                expect(result.replies_tree).to.not.be.empty();
                result.replies_tree.map(function(reply) {
                    expect(reply).to.have.property('dnssec_status');
                });
                finish(ctx, done);
            });
        });
    });

});
