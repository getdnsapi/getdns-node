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

describe("Context Create", () => {
    it("Should not require options parameter", () => {
        const ctx = getdns.createContext();
        expect(ctx).to.be.an("object");
        expect(ctx.destroy()).to.be.ok();
    });

    it("Should throw for defined non-object options parameter", () => {
        expect(() => {
            getdns.createContext("a string instead of object");
        }).to.throwException((err) => {
            expect(err).to.be.an("object");
            expect(err).to.be.an(TypeError);
            expect(err.code).to.be.an("number");
            expect(err.code).to.be(getdns.RETURN_INVALID_PARAMETER);
            expect(err.message).to.be.an("string");
            expect(err.message).to.be("options");
        });
    });

    it("Should throw for more than one parameter", () => {
        expect(() => {
            getdns.createContext({
                return_dnssec_status: true,
            }, {
                resolution_type: getdns.RESOLUTION_RECURSING,
            });
        }).to.throwException((err) => {
            expect(err).to.be.an("object");
            expect(err).to.be.an(TypeError);
            expect(err.code).to.be.an("number");
            expect(err.code).to.be(getdns.RETURN_INVALID_PARAMETER);
            expect(err.message).to.be.an("string");
        });
    });

    it("Should throw for an unknown option", () => {
        expect(() => {
            getdns.createContext({
                mispeled_option: "not known to getdns",
            });
        }).to.throwException((err) => {
            expect(err).to.be.an("object");
            expect(err).to.be.an(TypeError);
            expect(err.code).to.be.an("number");
            expect(err.code).to.be(getdns.RETURN_INVALID_PARAMETER);
            expect(err.message).to.be.an("string");
            expect(err.message).to.be("mispeled_option");
        });
    });

    it("Should have functions", () => {
        const ctx = getdns.createContext();
        expect(ctx).to.be.an("object");

        expect(ctx.destroy).to.be.an("function");
        expect(ctx.cancel).to.be.an("function");
        expect(ctx.general).to.be.an("function");
        expect(ctx.address).to.be.an("function");
        expect(ctx.service).to.be.an("function");
        expect(ctx.hostname).to.be.an("function");

        // NOTE: these functions are "hidden", but was previously used in examples as well as in tests below.
        // TODO: officially deprecate?
        // TODO: make sure to proxy only the public context API functions.
        expect(ctx.lookup).to.be.an("function");
        expect(ctx.getAddress).to.be.an("function");
        expect(ctx.getService).to.be.an("function");
        expect(ctx.getHostname).to.be.an("function");

        expect(ctx.destroy()).to.be.ok();
    });

    it("Should accept options", () => {
        const ctx = getdns.createContext({
            resolution_type: getdns.RESOLUTION_STUB,
            upstream_recursive_servers: [
                "8.8.8.8",
                ["127.0.0.1", 53],
            ],
            timeout: 10,
        });

        expect(ctx).to.be.an("object");
        expect(ctx.destroy()).to.be.ok();
    });

    it("Should accept deprecated options", () => {
        const ctx = getdns.createContext({
            stub: true,
            upstreams: [
                "8.8.8.8",
                    ["127.0.0.1", 53],
            ],
            timeout: 10,
        });

        expect(ctx).to.be.an("object");
        expect(ctx.destroy()).to.be.ok();
    });

    it("Should throw for bad resolution_type", () => {
        expect(() => {
            getdns.createContext({
                resolution_type: true,
            });
        }).to.throwException((err) => {
            expect(err).to.be.an("object");
            expect(err).to.be.an(TypeError);
            expect(err.code).to.be.an("number");
            expect(err.code).to.be(getdns.RETURN_INVALID_PARAMETER);
            expect(err.message).to.be.an("string");
            expect(err.message).to.be("resolution_type");
        });
    });

    it("Should throw for bad upstream_recursive_servers", () => {
        expect(() => {
            getdns.createContext({
                upstream_recursive_servers: "1.2.3.4",
            });
        }).to.throwException((err) => {
            expect(err).to.be.an("object");
            expect(err).to.be.an(TypeError);
            expect(err.code).to.be.an("number");
            expect(err.code).to.be(getdns.RETURN_INVALID_PARAMETER);
            expect(err.message).to.be.an("string");
            expect(err.message).to.be("upstream_recursive_servers");
        });
    });

    it("Should throw for bad timeout", () => {
        expect(() => {
            getdns.createContext({
                timeout: () => 1234,
            });
        }).to.throwException((err) => {
            expect(err).to.be.an("object");
            expect(err).to.be.an(TypeError);
            expect(err.code).to.be.an("number");
            expect(err.code).to.be(getdns.RETURN_INVALID_PARAMETER);
            expect(err.message).to.be.an("string");
            expect(err.message).to.be("timeout");
        });
    });
});
