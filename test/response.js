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

const net = require("net");
const expect = require("expect.js");
const getdns = require("../");
const shared = require("./shared");

shared.initialize();

describe("Response/result types", () => {
    it("Should match the specification format", function(done) {
        const ctx = getdns.createContext();

        ctx.address("getdnsapi.net", (err, result) => {
            expect(err).to.be(null);
            expect(result).to.be.an("object");
            expect(result).to.have.property("answer_type");
            expect(result.answer_type).to.be.an("number");
            expect(result).to.have.property("canonical_name");
            expect(result.canonical_name).to.be.an("string");
            expect(result).to.have.property("just_address_answers");
            expect(result.just_address_answers).to.be.an(Array);
            expect(result.just_address_answers).to.not.be.empty();
            result.just_address_answers.map((address) => {
                expect(address).to.be.an("string");
                expect(net.isIP(address)).to.be.ok();
            });
            expect(result).to.have.property("replies_full");
            expect(result.replies_full).to.be.an(Array);
            expect(result.replies_full).to.not.be.empty();
            expect(result.replies_full.length).to.be(result.just_address_answers.length);
            result.replies_full.map((reply) => {
                expect(reply).to.not.be(null);
                expect(reply).to.be.an("object");
                expect(reply).to.be.an(Buffer);
                expect(reply).to.not.be.empty();
            });
            expect(result).to.have.property("replies_tree");
            expect(result.replies_tree).to.be.an(Array);
            expect(result.replies_tree).to.not.be.empty();
            expect(result.replies_tree.length).to.be(result.just_address_answers.length);
            result.replies_tree.map((reply) => {
                expect(reply).to.not.be(null);
                expect(reply).to.be.an("object");

                // TODO: expand additional checks.
                expect(reply).to.have.property("additional");

                // TODO: expand additional checks.
                expect(reply).to.have.property("answer");

                expect(reply).to.have.property("answer_type");
                expect(reply.answer_type).to.be.an("number");

                // TODO: narrow down to valid enum values.
                expect(result.answer_type).to.greaterThan(0);

                // TODO: expand authority checks.
                expect(reply).to.have.property("authority");

                expect(reply).to.have.property("canonical_name");
                expect(reply.canonical_name).to.be.an("string");

                // TODO: expand header checks.
                expect(reply).to.have.property("header");

                // TODO: expand question checks.
                expect(reply).to.have.property("question");
            });
            expect(result).to.have.property("status");
            expect(result.status).to.be.an("number");

            // TODO: narrow down to valid enum values.
            expect(result.status).to.greaterThan(0);
            shared.destroyContext(ctx, done);
        });
    });
});
