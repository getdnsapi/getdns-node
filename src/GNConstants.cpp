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

#include "GNConstants.h"
#include <getdns/getdns.h>

using namespace v8;

static inline void SetConstant(const char* name, int value, Handle<Object> exports) {
    exports->Set(String::NewSymbol(name), Integer::New(value), ReadOnly);
}

void GNConstants::Init(Handle<Object> target) {

    Persistent<Object> exports = Persistent<Object>::New(Object::New());
    target->Set(String::NewSymbol("constants"), exports);

    SetConstant("RETURN_GOOD",GETDNS_RETURN_GOOD,exports);
    SetConstant("RETURN_GENERIC_ERROR",GETDNS_RETURN_GENERIC_ERROR,exports);
    SetConstant("RETURN_BAD_DOMAIN_NAME",GETDNS_RETURN_BAD_DOMAIN_NAME,exports);
    SetConstant("RETURN_UNKNOWN_TRANSACTION",GETDNS_RETURN_UNKNOWN_TRANSACTION,exports);
    SetConstant("RETURN_NO_SUCH_LIST_ITEM",GETDNS_RETURN_NO_SUCH_LIST_ITEM,exports);
    SetConstant("RETURN_NO_SUCH_DICT_NAME",GETDNS_RETURN_NO_SUCH_DICT_NAME,exports);
    SetConstant("RETURN_WRONG_TYPE_REQUESTED",GETDNS_RETURN_WRONG_TYPE_REQUESTED,exports);
    SetConstant("RETURN_NO_SUCH_EXTENSION",GETDNS_RETURN_NO_SUCH_EXTENSION,exports);
    SetConstant("RETURN_EXTENSION_MISFORMAT",GETDNS_RETURN_EXTENSION_MISFORMAT,exports);
    SetConstant("RETURN_DNSSEC_WITH_STUB_DISALLOWED",GETDNS_RETURN_DNSSEC_WITH_STUB_DISALLOWED,exports);
    SetConstant("RETURN_MEMORY_ERROR",GETDNS_RETURN_MEMORY_ERROR,exports);
    SetConstant("RETURN_INVALID_PARAMETER",GETDNS_RETURN_INVALID_PARAMETER,exports);
    SetConstant("DNSSEC_SECURE",GETDNS_DNSSEC_SECURE,exports);
    SetConstant("DNSSEC_BOGUS",GETDNS_DNSSEC_BOGUS,exports);
    SetConstant("DNSSEC_INDETERMINATE",GETDNS_DNSSEC_INDETERMINATE,exports);
    SetConstant("DNSSEC_INSECURE",GETDNS_DNSSEC_INSECURE,exports);
    SetConstant("DNSSEC_NOT_PERFORMED",GETDNS_DNSSEC_NOT_PERFORMED,exports);
    SetConstant("NAMESPACE_DNS",GETDNS_NAMESPACE_DNS,exports);
    SetConstant("NAMESPACE_LOCALNAMES",GETDNS_NAMESPACE_LOCALNAMES,exports);
    SetConstant("NAMESPACE_NETBIOS",GETDNS_NAMESPACE_NETBIOS,exports);
    SetConstant("NAMESPACE_MDNS",GETDNS_NAMESPACE_MDNS,exports);
    SetConstant("NAMESPACE_NIS",GETDNS_NAMESPACE_NIS,exports);
    SetConstant("RESOLUTION_STUB",GETDNS_RESOLUTION_STUB,exports);
    SetConstant("RESOLUTION_RECURSING",GETDNS_RESOLUTION_RECURSING,exports);
    SetConstant("REDIRECTS_FOLLOW",GETDNS_REDIRECTS_FOLLOW,exports);
    SetConstant("REDIRECTS_DO_NOT_FOLLOW",GETDNS_REDIRECTS_DO_NOT_FOLLOW,exports);
    SetConstant("TRANSPORT_UDP_FIRST_AND_FALL_BACK_TO_TCP",GETDNS_TRANSPORT_UDP_FIRST_AND_FALL_BACK_TO_TCP,exports);
    SetConstant("TRANSPORT_UDP_ONLY",GETDNS_TRANSPORT_UDP_ONLY,exports);
    SetConstant("TRANSPORT_TCP_ONLY",GETDNS_TRANSPORT_TCP_ONLY,exports);
    SetConstant("TRANSPORT_TCP_ONLY_KEEP_CONNECTIONS_OPEN",GETDNS_TRANSPORT_TCP_ONLY_KEEP_CONNECTIONS_OPEN,exports);
    SetConstant("APPEND_NAME_ALWAYS",GETDNS_APPEND_NAME_ALWAYS,exports);
    SetConstant("APPEND_NAME_ONLY_TO_SINGLE_LABEL_AFTER_FAILURE",GETDNS_APPEND_NAME_ONLY_TO_SINGLE_LABEL_AFTER_FAILURE,exports);
    SetConstant("APPEND_NAME_ONLY_TO_MULTIPLE_LABEL_NAME_AFTER_FAILURE",GETDNS_APPEND_NAME_ONLY_TO_MULTIPLE_LABEL_NAME_AFTER_FAILURE,exports);
    SetConstant("APPEND_NAME_NEVER",GETDNS_APPEND_NAME_NEVER,exports);
    SetConstant("CALLBACK_COMPLETE",GETDNS_CALLBACK_COMPLETE,exports);
    SetConstant("CALLBACK_CANCEL",GETDNS_CALLBACK_CANCEL,exports);
    SetConstant("CALLBACK_TIMEOUT",GETDNS_CALLBACK_TIMEOUT,exports);
    SetConstant("CALLBACK_ERROR",GETDNS_CALLBACK_ERROR,exports);
    SetConstant("NAMETYPE_DNS",GETDNS_NAMETYPE_DNS,exports);
    SetConstant("NAMETYPE_WINS",GETDNS_NAMETYPE_WINS,exports);
    SetConstant("RESPSTATUS_GOOD",GETDNS_RESPSTATUS_GOOD,exports);
    SetConstant("RESPSTATUS_NO_NAME",GETDNS_RESPSTATUS_NO_NAME,exports);
    SetConstant("RESPSTATUS_ALL_TIMEOUT",GETDNS_RESPSTATUS_ALL_TIMEOUT,exports);
    SetConstant("RESPSTATUS_NO_SECURE_ANSWERS",GETDNS_RESPSTATUS_NO_SECURE_ANSWERS,exports);
    SetConstant("RESPSTATUS_ALL_BOGUS_ANSWERS",GETDNS_RESPSTATUS_ALL_BOGUS_ANSWERS,exports);
    SetConstant("EXTENSION_TRUE",GETDNS_EXTENSION_TRUE,exports);
    SetConstant("EXTENSION_FALSE",GETDNS_EXTENSION_FALSE,exports);
    SetConstant("BAD_DNS_CNAME_IN_TARGET",GETDNS_BAD_DNS_CNAME_IN_TARGET,exports);
    SetConstant("BAD_DNS_ALL_NUMERIC_LABEL",GETDNS_BAD_DNS_ALL_NUMERIC_LABEL,exports);
    SetConstant("BAD_DNS_CNAME_RETURNED_FOR_OTHER_TYPE",GETDNS_BAD_DNS_CNAME_RETURNED_FOR_OTHER_TYPE,exports);
    SetConstant("RRTYPE_A",GETDNS_RRTYPE_A,exports);
    SetConstant("RRTYPE_NS",GETDNS_RRTYPE_NS,exports);
    SetConstant("RRTYPE_MD",GETDNS_RRTYPE_MD,exports);
    SetConstant("RRTYPE_MF",GETDNS_RRTYPE_MF,exports);
    SetConstant("RRTYPE_CNAME",GETDNS_RRTYPE_CNAME,exports);
    SetConstant("RRTYPE_SOA",GETDNS_RRTYPE_SOA,exports);
    SetConstant("RRTYPE_MB",GETDNS_RRTYPE_MB,exports);
    SetConstant("RRTYPE_MG",GETDNS_RRTYPE_MG,exports);
    SetConstant("RRTYPE_MR",GETDNS_RRTYPE_MR,exports);
    SetConstant("RRTYPE_NULL",GETDNS_RRTYPE_NULL,exports);
    SetConstant("RRTYPE_WKS",GETDNS_RRTYPE_WKS,exports);
    SetConstant("RRTYPE_PTR",GETDNS_RRTYPE_PTR,exports);
    SetConstant("RRTYPE_HINFO",GETDNS_RRTYPE_HINFO,exports);
    SetConstant("RRTYPE_MINFO",GETDNS_RRTYPE_MINFO,exports);
    SetConstant("RRTYPE_MX",GETDNS_RRTYPE_MX,exports);
    SetConstant("RRTYPE_TXT",GETDNS_RRTYPE_TXT,exports);
    SetConstant("RRTYPE_RP",GETDNS_RRTYPE_RP,exports);
    SetConstant("RRTYPE_AFSDB",GETDNS_RRTYPE_AFSDB,exports);
    SetConstant("RRTYPE_X25",GETDNS_RRTYPE_X25,exports);
    SetConstant("RRTYPE_ISDN",GETDNS_RRTYPE_ISDN,exports);
    SetConstant("RRTYPE_RT",GETDNS_RRTYPE_RT,exports);
    SetConstant("RRTYPE_NSAP",GETDNS_RRTYPE_NSAP,exports);
    SetConstant("RRTYPE_SIG",GETDNS_RRTYPE_SIG,exports);
    SetConstant("RRTYPE_KEY",GETDNS_RRTYPE_KEY,exports);
    SetConstant("RRTYPE_PX",GETDNS_RRTYPE_PX,exports);
    SetConstant("RRTYPE_GPOS",GETDNS_RRTYPE_GPOS,exports);
    SetConstant("RRTYPE_AAAA",GETDNS_RRTYPE_AAAA,exports);
    SetConstant("RRTYPE_LOC",GETDNS_RRTYPE_LOC,exports);
    SetConstant("RRTYPE_NXT",GETDNS_RRTYPE_NXT,exports);
    SetConstant("RRTYPE_EID",GETDNS_RRTYPE_EID,exports);
    SetConstant("RRTYPE_NIMLOC",GETDNS_RRTYPE_NIMLOC,exports);
    SetConstant("RRTYPE_SRV",GETDNS_RRTYPE_SRV,exports);
    SetConstant("RRTYPE_ATMA",GETDNS_RRTYPE_ATMA,exports);
    SetConstant("RRTYPE_NAPTR",GETDNS_RRTYPE_NAPTR,exports);
    SetConstant("RRTYPE_KX",GETDNS_RRTYPE_KX,exports);
    SetConstant("RRTYPE_CERT",GETDNS_RRTYPE_CERT,exports);
    SetConstant("RRTYPE_A6",GETDNS_RRTYPE_A6,exports);
    SetConstant("RRTYPE_DNAME",GETDNS_RRTYPE_DNAME,exports);
    SetConstant("RRTYPE_SINK",GETDNS_RRTYPE_SINK,exports);
    SetConstant("RRTYPE_OPT",GETDNS_RRTYPE_OPT,exports);
    SetConstant("RRTYPE_APL",GETDNS_RRTYPE_APL,exports);
    SetConstant("RRTYPE_DS",GETDNS_RRTYPE_DS,exports);
    SetConstant("RRTYPE_SSHFP",GETDNS_RRTYPE_SSHFP,exports);
    SetConstant("RRTYPE_IPSECKEY",GETDNS_RRTYPE_IPSECKEY,exports);
    SetConstant("RRTYPE_RRSIG",GETDNS_RRTYPE_RRSIG,exports);
    SetConstant("RRTYPE_NSEC",GETDNS_RRTYPE_NSEC,exports);
    SetConstant("RRTYPE_DNSKEY",GETDNS_RRTYPE_DNSKEY,exports);
    SetConstant("RRTYPE_DHCID",GETDNS_RRTYPE_DHCID,exports);
    SetConstant("RRTYPE_NSEC3",GETDNS_RRTYPE_NSEC3,exports);
    SetConstant("RRTYPE_NSEC3PARAM",GETDNS_RRTYPE_NSEC3PARAM,exports);
    SetConstant("RRTYPE_TLSA",GETDNS_RRTYPE_TLSA,exports);
    SetConstant("RRTYPE_HIP",GETDNS_RRTYPE_HIP,exports);
    SetConstant("RRTYPE_NINFO",GETDNS_RRTYPE_NINFO,exports);
    SetConstant("RRTYPE_RKEY",GETDNS_RRTYPE_RKEY,exports);
    SetConstant("RRTYPE_TALINK",GETDNS_RRTYPE_TALINK,exports);
    SetConstant("RRTYPE_CDS",GETDNS_RRTYPE_CDS,exports);
    SetConstant("RRTYPE_CDNSKEY",GETDNS_RRTYPE_CDNSKEY,exports);
    SetConstant("RRTYPE_OPENPGPKEY",GETDNS_RRTYPE_OPENPGPKEY,exports);
    SetConstant("RRTYPE_SPF",GETDNS_RRTYPE_SPF,exports);
    SetConstant("RRTYPE_UINFO",GETDNS_RRTYPE_UINFO,exports);
    SetConstant("RRTYPE_UID",GETDNS_RRTYPE_UID,exports);
    SetConstant("RRTYPE_GID",GETDNS_RRTYPE_GID,exports);
    SetConstant("RRTYPE_UNSPEC",GETDNS_RRTYPE_UNSPEC,exports);
    SetConstant("RRTYPE_NID",GETDNS_RRTYPE_NID,exports);
    SetConstant("RRTYPE_L32",GETDNS_RRTYPE_L32,exports);
    SetConstant("RRTYPE_L64",GETDNS_RRTYPE_L64,exports);
    SetConstant("RRTYPE_LP",GETDNS_RRTYPE_LP,exports);
    SetConstant("RRTYPE_EUI48",GETDNS_RRTYPE_EUI48,exports);
    SetConstant("RRTYPE_EUI64",GETDNS_RRTYPE_EUI64,exports);
    SetConstant("RRTYPE_TKEY",GETDNS_RRTYPE_TKEY,exports);
    SetConstant("RRTYPE_TSIG",GETDNS_RRTYPE_TSIG,exports);
    SetConstant("RRTYPE_IXFR",GETDNS_RRTYPE_IXFR,exports);
    SetConstant("RRTYPE_AXFR",GETDNS_RRTYPE_AXFR,exports);
    SetConstant("RRTYPE_MAILB",GETDNS_RRTYPE_MAILB,exports);
    SetConstant("RRTYPE_MAILA",GETDNS_RRTYPE_MAILA,exports);
    SetConstant("RRTYPE_ANY",GETDNS_RRTYPE_ANY,exports);
    SetConstant("RRTYPE_URI",GETDNS_RRTYPE_URI,exports);
    SetConstant("RRTYPE_CAA",GETDNS_RRTYPE_CAA,exports);
    SetConstant("RRTYPE_TA",GETDNS_RRTYPE_TA,exports);
    SetConstant("RRTYPE_DLV",GETDNS_RRTYPE_DLV,exports);
    SetConstant("RRCLASS_IN",GETDNS_RRCLASS_IN,exports);
    SetConstant("RRCLASS_CH",GETDNS_RRCLASS_CH,exports);
    SetConstant("RRCLASS_HS",GETDNS_RRCLASS_HS,exports);
    SetConstant("RRCLASS_NONE",GETDNS_RRCLASS_NONE,exports);
    SetConstant("RRCLASS_ANY",GETDNS_RRCLASS_ANY,exports);
    SetConstant("OPCODE_QUERY",GETDNS_OPCODE_QUERY,exports);
    SetConstant("OPCODE_IQUERY",GETDNS_OPCODE_IQUERY,exports);
    SetConstant("OPCODE_STATUS",GETDNS_OPCODE_STATUS,exports);
    SetConstant("OPCODE_NOTIFY",GETDNS_OPCODE_NOTIFY,exports);
    SetConstant("OPCODE_UPDATE",GETDNS_OPCODE_UPDATE,exports);
    SetConstant("RCODE_NOERROR",GETDNS_RCODE_NOERROR,exports);
    SetConstant("RCODE_FORMERR",GETDNS_RCODE_FORMERR,exports);
    SetConstant("RCODE_SERVFAIL",GETDNS_RCODE_SERVFAIL,exports);
    SetConstant("RCODE_NXDOMAIN",GETDNS_RCODE_NXDOMAIN,exports);
    SetConstant("RCODE_NOTIMP",GETDNS_RCODE_NOTIMP,exports);
    SetConstant("RCODE_REFUSED",GETDNS_RCODE_REFUSED,exports);
    SetConstant("RCODE_YXDOMAIN",GETDNS_RCODE_YXDOMAIN,exports);
    SetConstant("RCODE_YXRRSET",GETDNS_RCODE_YXRRSET,exports);
    SetConstant("RCODE_NXRRSET",GETDNS_RCODE_NXRRSET,exports);
    SetConstant("RCODE_NOTAUTH",GETDNS_RCODE_NOTAUTH,exports);
    SetConstant("RCODE_NOTZONE",GETDNS_RCODE_NOTZONE,exports);
    SetConstant("RCODE_BADVERS",GETDNS_RCODE_BADVERS,exports);
    SetConstant("RCODE_BADSIG",GETDNS_RCODE_BADSIG,exports);
    SetConstant("RCODE_BADKEY",GETDNS_RCODE_BADKEY,exports);
    SetConstant("RCODE_BADTIME",GETDNS_RCODE_BADTIME,exports);
    SetConstant("RCODE_BADMODE",GETDNS_RCODE_BADMODE,exports);
    SetConstant("RCODE_BADNAME",GETDNS_RCODE_BADNAME,exports);
    SetConstant("RCODE_BADALG",GETDNS_RCODE_BADALG,exports);
    SetConstant("RCODE_BADTRUNC",GETDNS_RCODE_BADTRUNC,exports);
}

