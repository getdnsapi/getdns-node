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

describe("Cancelled queries", () => {
    it("Should be able to synchronously cancel the query", function(done) {
        const ctx = getdns.createContext({
            resolution_type: getdns.RESOLUTION_STUB,
        });

        const transId = ctx.address("getdnsapi.net", (err, result) => {
            expect(err).to.be.an("object");
            expect(result).to.be(null);
            expect(err).to.have.property("msg");
            expect(err).to.have.property("code");
            expect(err.code).to.equal(getdns.CALLBACK_CANCEL);
            shared.destroyContext(ctx, done);
        });

        expect(transId).to.be.ok();

        const cancelResult = ctx.cancel(transId);
        expect(cancelResult).to.be.ok();
    });

    it("Should be able to asynchronously cancel the query", function(done) {
        const ctx = getdns.createContext({
            resolution_type: getdns.RESOLUTION_STUB,
        });

        let callCount = 0;

        const transId = ctx.address("labs.verisigninc.com", (err, result) => {
            callCount++;
            expect(callCount).to.be(1);
            expect(err).to.be.an("object");
            expect(result).to.be(null);
            expect(err).to.have.property("msg");
            expect(err).to.have.property("code");
            expect(err.code).to.equal(getdns.CALLBACK_CANCEL);
            shared.destroyContext(ctx, done);
        });

        expect(transId).to.be.ok();

        // NOTE: using setTimeout isn't reliable, as the reply cache might be faster.
        setImmediate(() => {
            const cancelResult = ctx.cancel(transId);
            expect(cancelResult).to.be.ok();
        });
    });

    it("Should not be able to synchronously cancel the query twice", function(done) {
        const ctx = getdns.createContext({
            resolution_type: getdns.RESOLUTION_STUB,
        });

        let callCount = 0;

        const transId = ctx.address("nlnetlabs.nl", (err, result) => {
            // TODO BUG: this callback is being called synchronously due to cancel() being synchronous.
            // TODO BUG: the callback might be called twice. This might not be detectable after the test has ended.
            callCount++;
            expect(callCount).to.be(1);

            expect(err).to.be.an("object");
            expect(result).to.be(null);
            expect(err).to.have.property("msg");
            expect(err).to.have.property("code");
            expect(err.code).to.equal(getdns.CALLBACK_CANCEL);
            shared.destroyContext(ctx, done);
        });

        expect(transId).to.be.ok();

        const cancelResult = ctx.cancel(transId);

        // TODO BUG: this code is never reached, at least not within the scope of the test.
        expect().fail("Something is wrong, because this is never called (or at least not reported).");

        expect(cancelResult).to.be.ok();

        // NOTE: should not be able to cancel the same transaction twice.
        const cancelResult2 = ctx.cancel(transId);
        expect(cancelResult2).to.not.be.ok();
    });

    it("Should not be able to asynchronously cancel the query twice", function(done) {
        const ctx = getdns.createContext({
            resolution_type: getdns.RESOLUTION_STUB,
        });

        const transId = ctx.address("dnssec-name-and-shame.com", (err, result) => {
            expect(err).to.be.an("object");
            expect(result).to.be(null);
            expect(err).to.have.property("msg");
            expect(err).to.have.property("code");
            expect(err.code).to.equal(getdns.CALLBACK_CANCEL);
            shared.destroyContext(ctx, done);
        });

        expect(transId).to.be.ok();

        // NOTE: using setTimeout isn't reliable, as the reply cache might be faster.
        setImmediate(() => {
            const cancelResult = ctx.cancel(transId);
            expect(cancelResult).to.be.ok();

            // NOTE: using setTimeout isn't reliable, as the reply cache might be faster.
            setImmediate(() => {
                const cancelResult2 = ctx.cancel(transId);
                expect(cancelResult2).to.not.be.ok();
            });
        });
    });

    it("Should not be able to cancel the query after callback", function(done) {
        const ctx = getdns.createContext({
            resolution_type: getdns.RESOLUTION_STUB,
        });

        const transId = ctx.address("nlnet.nl", (err, result) => {
            const cancelResult = ctx.cancel(transId);
            expect(cancelResult).to.not.be.ok();

            expect(err).to.be(null);
            expect(result.replies_tree).to.be.an(Array);
            expect(result.replies_tree).to.not.be.empty();
            shared.destroyContext(ctx, done);
        });

        expect(transId).to.be.ok();
    });

    // TODO: test issuing multiple queries, and canceling some.
});
