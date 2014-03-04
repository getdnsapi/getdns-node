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

(function() {
    // constants
    module.exports.RRTYPE_A     = 1
    module.exports.RRTYPE_NS    = 2
    module.exports.RRTYPE_MD    = 3
    module.exports.RRTYPE_MF    = 4
    module.exports.RRTYPE_CNAME = 5
    module.exports.RRTYPE_SOA   = 6
    module.exports.RRTYPE_MB    = 7
    module.exports.RRTYPE_MG    = 8
    module.exports.RRTYPE_MR    = 9
    module.exports.RRTYPE_NULL  = 10
    module.exports.RRTYPE_WKS   = 11
    module.exports.RRTYPE_PTR   = 12
    module.exports.RRTYPE_HINFO = 13
    module.exports.RRTYPE_MINFO = 14
    module.exports.RRTYPE_MX    = 15
    module.exports.RRTYPE_TXT   = 16
    module.exports.RRTYPE_RP    = 17
    module.exports.RRTYPE_AFSDB = 18
    module.exports.RRTYPE_X25   = 19
    module.exports.RRTYPE_ISDN  = 20
    module.exports.RRTYPE_RT    = 21
    module.exports.RRTYPE_NSAP  = 22
    module.exports.RRTYPE_SIG   = 24
    module.exports.RRTYPE_KEY   = 25
    module.exports.RRTYPE_PX    = 26
    module.exports.RRTYPE_GPOS  = 27
    module.exports.RRTYPE_AAAA  = 28
    module.exports.RRTYPE_LOC   = 29
    module.exports.RRTYPE_NXT   = 30
    module.exports.RRTYPE_EID   = 31
    module.exports.RRTYPE_NIMLOC = 32
    module.exports.RRTYPE_SRV   = 33
    module.exports.RRTYPE_ATMA  = 34
    module.exports.RRTYPE_NAPTR = 35
    module.exports.RRTYPE_KX    = 36
    module.exports.RRTYPE_CERT  = 37
    module.exports.RRTYPE_A6    = 38
    module.exports.RRTYPE_DNAME = 39
    module.exports.RRTYPE_SINK  = 40
    module.exports.RRTYPE_OPT   = 41
    module.exports.RRTYPE_APL   = 42
    module.exports.RRTYPE_DS    = 43
    module.exports.RRTYPE_SSHFP = 44
    module.exports.RRTYPE_IPSECKEY = 45
    module.exports.RRTYPE_RRSIG = 46
    module.exports.RRTYPE_NSEC  = 47
    module.exports.RRTYPE_DNSKEY = 48
    module.exports.RRTYPE_DHCID = 49
    module.exports.RRTYPE_NSEC3 = 50
    module.exports.RRTYPE_NSEC3PARAM = 51
    module.exports.RRTYPE_TLSA  = 52
    module.exports.RRTYPE_HIP   = 55
    module.exports.RRTYPE_NINFO = 56
    module.exports.RRTYPE_RKEY  = 57
    module.exports.RRTYPE_TALINK = 58
    module.exports.RRTYPE_CDS   = 59
    module.exports.RRTYPE_SPF   = 99
    module.exports.RRTYPE_UINFO = 100
    module.exports.RRTYPE_UID   = 101
    module.exports.RRTYPE_GID   = 102
    module.exports.RRTYPE_UNSPEC = 103
    module.exports.RRTYPE_NID   = 104
    module.exports.RRTYPE_L32   = 105
    module.exports.RRTYPE_L64   = 106
    module.exports.RRTYPE_LP    = 107
    module.exports.RRTYPE_EUI48 = 108
    module.exports.RRTYPE_EUI64 = 109
    module.exports.RRTYPE_TKEY  =  249
    module.exports.RRTYPE_TSIG  =  250
    module.exports.RRTYPE_IXFR  =  251
    module.exports.RRTYPE_AXFR  =  252
    module.exports.RRTYPE_MAILB = 253
    module.exports.RRTYPE_MAILA = 254
    module.exports.RRTYPE_ANY   = 255
    module.exports.RRTYPE_URI   = 256
    module.exports.RRTYPE_CAA   = 257
    module.exports.RRTYPE_TA    = 32768
    module.exports.RRTYPE_DLV   = 32769
})();