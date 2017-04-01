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

// Requires.
const expect = require("expect.js");
const getdns = require("../");
const shared = require("./shared");

shared.initialize();

// Basic creation with various options.
describe("Context Create", () => {
    it("Should create a default context", () => {
        const ctx = getdns.createContext();
        expect(ctx).to.be.ok();

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

    it("Should create a context with options", () => {
        const ctx = getdns.createContext({
            resolution_type: getdns.RESOLUTION_STUB,
            upstream_recursive_servers: [
                "8.8.8.8",
                ["127.0.0.1", 53],
            ],
            timeout: 10,
        });

        expect(ctx).to.be.ok();
        expect(ctx.destroy()).to.be.ok();
    });

    it("Should create a context with deprecated options", () => {
        const ctx = getdns.createContext({
            stub: true,
            upstreams: [
                "8.8.8.8",
                ["127.0.0.1", 53],
            ],
            timeout: 10,
        });

        expect(ctx).to.be.ok();
        expect(ctx.destroy()).to.be.ok();
    });
});
