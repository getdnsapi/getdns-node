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

const net = require("net");
const expect = require("expect.js");
const getdns = require("../");
const shared = require("./shared");

shared.initialize();

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
            shared.destroyContext(ctx, done);
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
            shared.destroyContext(ctx, done);
        });
    });

    it("Should get valid results on getService getdnsapi.net", function(done) {
        const ctx = getdns.createContext();

        ctx.getService("getdnsapi.net", (err, result) => {
            expect(err).to.be(null);
            expect(result).to.be.an("object");
            expect(result.replies_full).to.be.an(Array);
            expect(result.replies_full).to.not.be.empty();
            shared.destroyContext(ctx, done);
        });
    });

    it("Should get valid results on getHostname 8.8.8.8", function(done) {
        const ctx = getdns.createContext();

        ctx.getHostname("8.8.8.8", (err, result) => {
            expect(err).to.be(null);
            expect(result).to.be.an("object");
            expect(result.replies_full).to.be.an(Array);
            expect(result.replies_full).to.not.be.empty();
            shared.destroyContext(ctx, done);
        });
    });
});
