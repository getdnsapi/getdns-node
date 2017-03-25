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

describe("TSIG", () => {
    it("Should return successfully", function(done) {
        const ctx = getdns.createContext({
            resolution_type: getdns.RESOLUTION_STUB,
            upstream_recursive_servers: [
                "185.49.141.37", // 853 , "^hmac-md5.tsigs.getdnsapi.net:16G69OTeXW6xSQ=="
            ],
        });

        const port = 53;
        const upstreamresolvers = [];
        upstreamresolvers.push("185.49.141.37");
        upstreamresolvers.push(port);
        upstreamresolvers.push("^hmac-md5.tsigs.getdnsapi.net:16G69OTeXW6xSQ==");
        const up1 = [];
        up1.push(upstreamresolvers);

        // Create the contexts we need to test with the above options.
        ctx.upstream_recursive_servers = up1;
        ctx.general("getdnsapi.net", getdns.RRTYPE_SOA, (err, result) => {
            expect(err).to.be(null);
            expect(result.replies_tree).to.be.an(Array);
            expect(result.replies_tree).to.not.be.empty();
            expect(result.replies_tree[0].tsig_status).to.be.equal(400);
            shared.destroyContext(ctx, done);
        });
    });
});
