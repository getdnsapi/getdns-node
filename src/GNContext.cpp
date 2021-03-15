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

#include "GNContext.h"
#include "GNUtil.h"
#include "GNConstants.h"

#include <getdns/getdns_extra.h>
#include <arpa/inet.h>
#include <node_buffer.h>
#include <string.h>
#include <nan.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/time.h>

using namespace v8;

// Enum to distinguish which helper is being used.
typedef enum LookupType {
    GNAddress = 0,
    GNHostname,
    GNService
} LookupType;

// Callback data passed to getdns callback as userarg
typedef struct CallbackData {
    Nan::Callback* callback;
    GNContext* ctx;
} CallbackData;

// Helper to create an error object for lookup callbacks
static Local<Value> makeErrorObj(const char* msg, int code) {
    Local<Object> obj = Nan::New<Object>();
    Nan::Set(obj, Nan::New<String>("msg").ToLocalChecked(), Nan::New<String>(msg).ToLocalChecked());
    Nan::Set(obj, Nan::New<String>("code").ToLocalChecked(), Nan::New<Integer>(code));
    return obj;
}

static Local<Value> makeTypeErrorWithCode(const char* msg, int code) {
    Local<Object> error = Nan::TypeError(Nan::New<String>(msg).ToLocalChecked()).As<Object>();
    Nan::Set(error, Nan::New<String>("code").ToLocalChecked(), Nan::New<Integer>(code));
    return error;
}

// Helper to create an address dictionary from string
// Must be freed by the user
static getdns_dict* getdns_util_create_ip(const char* ip) {

    getdns_return_t r;
    const char* ipType;
    getdns_bindata ipData;
    uint8_t addrBuff[16];
    size_t addrSize = 0;
    getdns_dict* result = NULL;

    if (!ip) {
        return NULL;
    }
    // convert to bytes
    if (inet_pton(AF_INET, ip, &addrBuff) == 1) {
        addrSize = 4;
    } else if (inet_pton(AF_INET6, ip, &addrBuff) == 1) {
        addrSize = 16;
    }
    if (addrSize == 0) {
        return NULL;
    }
    // create the dict
    result = getdns_dict_create();
    if (!result) {
        return NULL;
    }
    // set fields
    ipType = addrSize == 4 ? "IPv4" : "IPv6";
    r = getdns_dict_util_set_string(result, (char*) "address_type", ipType);
    if (r != GETDNS_RETURN_GOOD) {
        getdns_dict_destroy(result);
        return NULL;
    }
    ipData.data = addrBuff;
    ipData.size = addrSize;
    r = getdns_dict_set_bindata(result, "address_data", &ipData);
    if (r != GETDNS_RETURN_GOOD) {
        getdns_dict_destroy(result);
        return NULL;
    }
    return result;
}

// Setter functions
typedef getdns_return_t (*getdns_context_uint8_t_setter)(getdns_context*, uint8_t);
typedef getdns_return_t (*getdns_context_uint16_t_setter)(getdns_context*, uint16_t);

static getdns_return_t setTransport(getdns_context* context, Local<Value> opt) {
    if (opt->IsNumber()) {
        uint32_t num = Nan::To<uint32_t>(opt).FromJust();
        getdns_return_t r = getdns_context_set_dns_transport(context, (getdns_transport_t) num);
        return r;
    }
    return GETDNS_RETURN_INVALID_PARAMETER;
}

static getdns_return_t setRedirects(getdns_context* context, Local<Value> opt) {
    if (opt->IsNumber()) {
        uint32_t num = Nan::To<uint32_t>(opt).FromJust();
        getdns_return_t r = getdns_context_set_follow_redirects(context, (getdns_redirects_t) num);
        return r;
    }
    return GETDNS_RETURN_INVALID_PARAMETER;
}

static getdns_return_t setTlsAuthentication(getdns_context* context, Local<Value> opt) {
    if (opt->IsNumber()) {
        uint32_t num = Nan::To<uint32_t>(opt).FromJust();
        getdns_return_t r = getdns_context_set_tls_authentication(context, (getdns_tls_authentication_t) num);
        return r;
    }
    return GETDNS_RETURN_INVALID_PARAMETER;
}

static getdns_return_t setTransportList(getdns_context* context, Local<Value> opt) {
    if (opt->IsArray()) {
        Local<Array> transportList = Local<Array>::Cast(opt);
        uint32_t numTransports = transportList->Length();
        // create a getdns_transport_list_t*
        getdns_transport_list_t* transports = new getdns_transport_list_t[numTransports];
        for (uint32_t i = 0; i < numTransports; ++i) {
            uint32_t transport = Nan::To<uint32_t>(Nan::Get(transportList, i).ToLocalChecked()).FromJust();
            transports[i] = (getdns_transport_list_t) transport;
        }
        // set it
        getdns_return_t r = getdns_context_set_dns_transport_list(context, numTransports, transports);
        // free up memory
        delete[] transports;
        return r;
    }
    return GETDNS_RETURN_INVALID_PARAMETER;
}

static getdns_return_t setNamespaceList(getdns_context* context, Local<Value> opt) {
    if (opt->IsArray()) {
        Local<Array> namespaceList = Local<Array>::Cast(opt);
        uint32_t numNamespaces = namespaceList->Length();
        // create a getdns_namespace_list_t*
        getdns_namespace_t* namespaces = new getdns_namespace_t[numNamespaces];
        for (uint32_t i = 0; i < numNamespaces; ++i) {
            uint32_t ns = Nan::To<uint32_t>(Nan::Get(namespaceList, i).ToLocalChecked()).FromJust();
            namespaces[i] = (getdns_namespace_t) ns;
        }
        // set it
        getdns_return_t r = getdns_context_set_namespaces(context, numNamespaces, namespaces);
        // free up memory
        delete[] namespaces;
        return r;
    }
    return GETDNS_RETURN_INVALID_PARAMETER;
}

static getdns_return_t setStub(getdns_context* context, Local<Value> opt) {
    if (opt->IsBooleanObject() || opt->IsBoolean()) {
        getdns_resolution_t resolution = opt->IsTrue() ? GETDNS_RESOLUTION_STUB : GETDNS_RESOLUTION_RECURSING;
        getdns_return_t r = getdns_context_set_resolution_type(context, resolution);
        return r;
    }
    return GETDNS_RETURN_INVALID_PARAMETER;
}

static getdns_return_t setResolutionType(getdns_context* context, Local<Value> opt) {
    if (opt->IsNumber()) {
        uint32_t num = Nan::To<uint32_t>(opt).FromJust();
        getdns_return_t r = getdns_context_set_resolution_type(context, (getdns_resolution_t) num);
        return r;
    }
    return GETDNS_RETURN_INVALID_PARAMETER;
}


static getdns_return_t setAppendName(getdns_context* context, Local<Value> opt) {
    if (opt->IsNumber()) {
        uint32_t num = Nan::To<uint32_t>(opt).FromJust();
        getdns_return_t r = getdns_context_set_append_name(context, (getdns_append_name_t) num);
        return r;
    }
    return GETDNS_RETURN_INVALID_PARAMETER;
}

int gqldns_b64_pton(char const *src, uint8_t *target, size_t targsize)
{
        const uint8_t pad64 = 64; /* is 64th in the b64 array */
        const char* s = src;
        uint8_t in[4];
        size_t o = 0, incount = 0;

        while(*s) {
                /* skip any character that is not base64 */
                /* conceptually we do:
                const char* b64 =      pad'=' is appended to array
                "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
                const char* d = strchr(b64, *s++);
                and use d-b64;
                */
                char d = *s++;
                if(d <= 'Z' && d >= 'A')
                        d -= 'A';
                else if(d <= 'z' && d >= 'a')
                        d = d - 'a' + 26;
                else if(d <= '9' && d >= '0')
                        d = d - '0' + 52;
                else if(d == '+')
                        d = 62;
                else if(d == '/')
                        d = 63;
                else if(d == '=')
                        d = 64;
                else    continue;
                in[incount++] = (uint8_t)d;
                if(incount != 4)
                        continue;

                /* process whole block of 4 characters into 3 output bytes */
                if(in[3] == pad64 && in[2] == pad64) { /* A B = = */
                        if(o+1 > targsize)
                                return -1;
                        target[o] = (in[0]<<2) | ((in[1]&0x30)>>4);
                        o += 1;
                        break; /* we are done */
                } else if(in[3] == pad64) { /* A B C = */
                        if(o+2 > targsize)
                                return -1;
                        target[o] = (in[0]<<2) | ((in[1]&0x30)>>4);
                        target[o+1]= ((in[1]&0x0f)<<4) | ((in[2]&0x3c)>>2);
                        o += 2;
                        break; /* we are done */
                } else {
                        if(o+3 > targsize)
                                return -1;
                        /* write xxxxxxyy yyyyzzzz zzwwwwww */
                        target[o] = (in[0]<<2) | ((in[1]&0x30)>>4);
                        target[o+1]= ((in[1]&0x0f)<<4) | ((in[2]&0x3c)>>2);
                        target[o+2]= ((in[2]&0x03)<<6) | in[3];
                        o += 3;
                }
                incount = 0;
        }
        return (int)o;
}

// parse string in format ^hmac-md5.tsigs.getdnsapi.net:16G69OTeXW6xSQ==
// to get the TSIG name and secret

void tsigHelper(getdns_dict *ipDict, char *buf) {
    char const *tsig_name_str = ""
         , *tsig_secret_str = ""
         , *tsig_algorithm_str = "";
    int            tsig_secret_size;
    uint8_t        tsig_secret_buf[256]; /* 4 times SHA512 */
    getdns_bindata tsig_secret;

    tsig_name_str = &buf[1];
    if ((buf = (char*)strchr(tsig_name_str, ':'))) {
        *buf = 0;
        tsig_secret_str = buf + 1;
        if ((buf = (char*)strchr(tsig_secret_str, ':'))) {
            *buf = 0;
            tsig_algorithm_str  = tsig_name_str;
            tsig_name_str = tsig_secret_str;
            tsig_secret_str  = buf + 1;
        }
     } else {
         tsig_name_str = "";
    }
    if (*tsig_name_str)
        getdns_dict_util_set_string(ipDict, (char*) "tsig_name", tsig_name_str);
    if (*tsig_algorithm_str)
        getdns_dict_util_set_string(ipDict, (char*) "tsig_algorithm", tsig_algorithm_str);
    if (*tsig_secret_str) {
        tsig_secret_size = gqldns_b64_pton(
            tsig_secret_str, tsig_secret_buf, sizeof(tsig_secret_buf));
            if (tsig_secret_size > 0) {
                tsig_secret.size = tsig_secret_size;
                tsig_secret.data = tsig_secret_buf;
                getdns_dict_set_bindata(ipDict, "tsig_secret", &tsig_secret);
            }
    }
}


// eg:  getdnsapi.net,com for www.verisignlabs
// Will first try to get the addresses for
// www.verisignlabs.getdnsapi.net and will then try and return the
// successfull lookup of the addresses for www.verisignlabs.com.
static getdns_return_t setSuffixesHelper(getdns_context* context, char* buf) {
    getdns_list *suffixes;
    char *suffix;
    getdns_bindata bindata;
    size_t j;

    if (!(suffixes = getdns_list_create())) {
        // TODO handle memory errors.
        return GETDNS_RETURN_MEMORY_ERROR;
    }
    suffix = strtok(buf, ",");
    j = 0;
    while (suffix) {
        bindata.size = strlen(suffix);
        bindata.data = (uint8_t *)suffix;
        (void) getdns_list_set_bindata(
            suffixes, j++, &bindata);
        suffix = strtok(NULL, ",");
   }
   getdns_return_t r = getdns_context_set_suffix(context, suffixes);
   getdns_list_destroy(suffixes);
   return r;
}

static getdns_return_t setSuffixes(getdns_context* context, Local<Value> opt) {
    if (opt->IsString()) {
         Nan::Utf8String suff(opt);
         return setSuffixesHelper(context, (char *)*suff);
    }
    return GETDNS_RETURN_INVALID_PARAMETER;
}

#define EXAMPLE_PIN "pin-sha256=\"E9CZ9INDbd+2eRQozYqqbQ2yXLVKB9+xcprMF+44U1g=\""

static getdns_return_t setPinset(getdns_context* context, Local<Value> opt) {
    if (opt->IsString()) {
        Nan::Utf8String pin(opt);
        getdns_dict *pubkey_pin = NULL;
        static getdns_list *pubkey_pinset = NULL;
        static size_t pincount = 0;
        getdns_return_t r = GETDNS_RETURN_GOOD;

        pubkey_pin = getdns_pubkey_pin_create_from_string(context, (char *)*pin);
        if (pubkey_pin == NULL) {
            // TODO: remove all fprintf.
            fprintf(stderr, "could not convert '%s' into a " \
                "public key pin.\n" \
                "Good pins look like: " EXAMPLE_PIN "\n" \
                "Please see RFC 7469 for details about " \
                "the format\n", (char *)*pin);
            return GETDNS_RETURN_CONTEXT_UPDATE_FAIL;
        }
        if (pubkey_pinset == NULL) {
          pubkey_pinset = getdns_list_create_with_context(context);
          if (r = getdns_list_set_dict(pubkey_pinset, pincount++, pubkey_pin), r) {
              // TODO: remove all fprintf.
              fprintf(stderr, "Failed to add pin to pinset (error %d: %s)\n",
                r, getdns_get_errorstr_by_id(r));
            }
            getdns_dict_destroy(pubkey_pin);
            pubkey_pin = NULL;
            return r;
       }
    }
    return GETDNS_RETURN_INVALID_PARAMETER;
}

static getdns_return_t setUpstreams(getdns_context* context, Local<Value> opt) {
    if (opt->IsArray()) {
        getdns_list* upstreams = getdns_list_create();
        Local<Array> values = Local<Array>::Cast(opt);
        for (uint32_t i = 0; i < values->Length(); ++i) {
            Local<Value> ipOrTuple = Nan::Get(values, i).ToLocalChecked();
            getdns_dict* ipDict = NULL;
            if (ipOrTuple->IsArray()) {
                // two tuple - first is IP, 2nd is port
                // optional tuple - TLS Hostname
                // optional tuple - TSIG name:algorithm:secret
                // optional tuple - Search Suffix
                Local<Array> tuple = Local<Array>::Cast(ipOrTuple);
                if (tuple->Length() > 0) {
                    Nan::Utf8String asciiStr(Nan::Get(tuple, 0).ToLocalChecked());
                    ipDict = getdns_util_create_ip(*asciiStr);
                    if (ipDict && tuple->Length() > 1 &&
                        Nan::Get(tuple, 1).ToLocalChecked()->IsNumber()) {
                        // port
                        uint32_t port = Nan::To<uint32_t>(Nan::Get(tuple, 1).ToLocalChecked()).FromJust();
                        getdns_dict_set_int(ipDict, "port", port);
                        // TLS hostname or TSIG (TODO: fix to allow this if optional port is not set)
                        Nan::Utf8String asciiBuffer(Nan::Get(tuple, 2).ToLocalChecked());

                        if (((char *)*asciiBuffer)[0] == '^') { // tsig
                            tsigHelper(ipDict, *asciiBuffer);
                        } else if (((char *)*asciiBuffer)[0] == '~') { // suffix
                            setSuffixesHelper(context, &((char *)*asciiBuffer)[1]);
                        }
                        else {
                            getdns_dict_util_set_string(ipDict, (char *)"tls_auth_name", *asciiBuffer);
                       }
                    }
                }
            } else {
                Nan::Utf8String asciiStr(ipOrTuple);
                if (((char *)*asciiStr)[0] == '^') { // tsig
                    tsigHelper(ipDict, *asciiStr);
                } else if (((char *)*asciiStr)[0] == '~') { // suffix
                    setSuffixesHelper(context, &((char *)*asciiStr)[1]);
                }
                else ipDict = getdns_util_create_ip(*asciiStr);
            }
            if (ipDict) {
                size_t len = 0;
                getdns_list_get_length(upstreams, &len);
                getdns_list_set_dict(upstreams, len, ipDict);
                getdns_dict_destroy(ipDict);
            } else {
                return GETDNS_RETURN_CONTEXT_UPDATE_FAIL;
            }
        }
        getdns_return_t r = getdns_context_set_upstream_recursive_servers(context, upstreams);
        getdns_list_destroy(upstreams);
        return r;
    }
    return GETDNS_RETURN_INVALID_PARAMETER;
}


static getdns_return_t setTimeout(getdns_context* context, Local<Value> opt) {
    if (opt->IsNumber()) {
        uint32_t num = Nan::To<uint32_t>(opt).FromJust();
        getdns_return_t r = getdns_context_set_timeout(context, num);
        return r;
    }
    return GETDNS_RETURN_INVALID_PARAMETER;
}

static getdns_return_t setDnssecAllowedSkew(getdns_context* context, Local<Value> opt) {
    if (opt->IsNumber()) {
        uint32_t num = Nan::To<uint32_t>(opt).FromJust();
        getdns_return_t r = getdns_context_set_dnssec_allowed_skew(context, num);
        return r;
    }
    return GETDNS_RETURN_INVALID_PARAMETER;
}

static getdns_return_t setUseThreads(getdns_context* context, Local<Value> opt) {
    if (opt->IsBooleanObject() || opt->IsBoolean()) {
        int val = opt->IsTrue() ? 1 : 0;
        getdns_return_t r = getdns_context_set_use_threads(context, val);
        return r;
    }
    return GETDNS_RETURN_INVALID_PARAMETER;
}

static getdns_return_t setReturnDnssecStatus(getdns_context* context, Local<Value> opt) {
    if (opt->IsBooleanObject() || opt->IsBoolean()) {
        int val = opt->IsTrue() ? GETDNS_EXTENSION_TRUE : GETDNS_EXTENSION_FALSE;
        getdns_return_t r = getdns_context_set_return_dnssec_status(context, val);
        return r;
    }
    return GETDNS_RETURN_INVALID_PARAMETER;
}

// set alternate root servers from a file passed in
static getdns_return_t setDnsRootServers(getdns_context* context, Local<Value> opt)
{
    FILE *fh;
    getdns_list *hints = NULL;

    if (opt->IsString()) {
         Nan::Utf8String roots(opt);
        if (!(fh = fopen((char *)*roots, "r"))) {
            // TODO: remove all fprintf.
            fprintf(stderr, "Could not open %s\n", (char *)*roots);
            return GETDNS_RETURN_GENERIC_ERROR;
        }
        if (getdns_fp2rr_list(fh, &hints, NULL, 3600)) {
            // TODO: remove all fprintf.
            fprintf(stderr,"Could not parse "
                "\"%s\"\n", (char *)*roots);
            return GETDNS_RETURN_GENERIC_ERROR;
        }
        fclose(fh);
        getdns_return_t r = getdns_context_set_dns_root_servers(context, hints);
        getdns_list_destroy(hints);
        hints = NULL;
        return r;
    }
    return GETDNS_RETURN_INVALID_PARAMETER;
}


// Read the location of the Trust anchor and pass it to getdns.
// TODO: actually pass in the trust anchor.
static getdns_return_t setTrustAnchor(getdns_context *context, Local<Value> opt)
{
    FILE *fh;
    getdns_list *tas = NULL;

    if (opt->IsString()) {
         Nan::Utf8String ta(opt);

       if (!(fh = fopen((char *)*ta, "r"))) {
           fprintf(stderr, "Could not open %s\n", (char *)*ta);
           return GETDNS_RETURN_GENERIC_ERROR;
        }
        if (getdns_fp2rr_list(fh, &tas, NULL, 3600)) {
            // TODO: remove all fprintf.
            fprintf(stderr,"Could not parse "
                "\"%s\"\n", (char *)*ta);
            return GETDNS_RETURN_GENERIC_ERROR;
        }
        fclose(fh);
        getdns_return_t r = getdns_context_set_dnssec_trust_anchors(context, tas);
        getdns_list_destroy(tas);
        tas = NULL;
        return r;
    }
    return GETDNS_RETURN_INVALID_PARAMETER;
}


typedef getdns_return_t (*context_setter)(getdns_context* context, Local<Value> opt);
typedef struct OptionSetter {
    const char* opt_name;
    context_setter setter;
} OptionSetter;

static OptionSetter SETTERS[] = {
    { "stub", setStub },
    { "upstreams", setUpstreams },
    { "upstream_recursive_servers", setUpstreams },
    { "timeout", setTimeout },
    { "dnssecallowedskew", setDnssecAllowedSkew },
    { "use_threads", setUseThreads },
    { "return_dnssec_status", setReturnDnssecStatus },
    { "dns_transport", setTransport},
    { "follow_redirects", setRedirects},
    { "tls_authentication", setTlsAuthentication},
    { "resolution_type", setResolutionType },
    { "append_name", setAppendName },
    { "namespaces", setNamespaceList },
    { "suffix", setSuffixes },
    { "pinset", setPinset },
    { "trustanchor", setTrustAnchor },
    { "dnsrootserver", setDnsRootServers },
    { "dns_transport_list", setTransportList },
    { "dns_root_server", setDnsRootServers }
};

static size_t NUM_SETTERS = sizeof(SETTERS) / sizeof(OptionSetter);

typedef struct Uint8OptionSetter {
    const char* opt_name;
    getdns_context_uint8_t_setter setter;
} Uint8OptionSetter;

static Uint8OptionSetter UINT8_OPTION_SETTERS[] = {
    { "edns_extended_rcode", getdns_context_set_edns_extended_rcode },
    { "edns_version", getdns_context_set_edns_version },
    { "edns_do_bit", getdns_context_set_edns_do_bit }
};

static size_t NUM_UINT8_SETTERS = sizeof(UINT8_OPTION_SETTERS) / sizeof(Uint8OptionSetter);

typedef struct Uint16OptionSetter {
    const char* opt_name;
    getdns_context_uint16_t_setter setter;
} Uint16OptionSetter;

static Uint16OptionSetter UINT16_OPTION_SETTERS[] = {
    { "limit_outstanding_queries", getdns_context_set_limit_outstanding_queries },
    { "edns_maximum_udp_payloadSize", getdns_context_set_edns_maximum_udp_payload_size }
};

static size_t NUM_UINT16_SETTERS = sizeof(UINT16_OPTION_SETTERS) / sizeof(Uint16OptionSetter);

// End setters
NAN_GETTER(GNContext::GetContextValue) {
    // context has no getters yet
    info.GetReturnValue().Set(Nan::New<Integer>(-1));
}
NAN_SETTER(GNContext::SetContextValue) {
    // walk setters
    Nan::Utf8String name(property);
    GNContext* ctx = Nan::ObjectWrap::Unwrap<GNContext>(info.This());
    if (!ctx) {
        return Nan::ThrowError("Context is invalid.");
    }
    size_t s = 0;
    for (s = 0; s < NUM_SETTERS; ++s) {
        if (strcmp(SETTERS[s].opt_name, *name) == 0) {
            getdns_return_t r = SETTERS[s].setter(ctx->context_, value);
            if (r != GETDNS_RETURN_GOOD) {
                Local<Value> typeError = makeTypeErrorWithCode(*name, r);
                return Nan::ThrowError(typeError);
            }
            return;
        }
    }
    if (!value->IsNumber()) {
        Local<Value> typeError = makeTypeErrorWithCode(*name, GETDNS_RETURN_INVALID_PARAMETER);
        return Nan::ThrowError(typeError);
    }
    for (s = 0; s < NUM_UINT8_SETTERS; ++s) {
        if (strcmp(UINT8_OPTION_SETTERS[s].opt_name, *name) == 0) {
            uint32_t optVal = Nan::To<uint32_t>(value).FromJust();
            getdns_return_t r = UINT8_OPTION_SETTERS[s].setter(ctx->context_, (uint8_t)optVal);
            if (r != GETDNS_RETURN_GOOD) {
                Local<Value> typeError = makeTypeErrorWithCode(*name, r);
                return Nan::ThrowError(typeError);
            }
            return;
        }
    }
    for (s = 0; s < NUM_UINT16_SETTERS; ++s) {
        if (strcmp(UINT16_OPTION_SETTERS[s].opt_name, *name) == 0) {
            uint32_t optVal = Nan::To<uint32_t>(value).FromJust();
            getdns_return_t r = UINT16_OPTION_SETTERS[s].setter(ctx->context_, (uint16_t)optVal);
            if (r != GETDNS_RETURN_GOOD) {
                Local<Value> typeError = makeTypeErrorWithCode(*name, r);
                return Nan::ThrowError(typeError);
            }
            return;
        }
    }
    Local<Value> typeError = makeTypeErrorWithCode(*name, GETDNS_RETURN_INVALID_PARAMETER);
    return Nan::ThrowError(typeError);
}

void GNContext::InitProperties(Local<Object> ctx) {
    size_t s = 0;
    for (s = 0; s < NUM_SETTERS; ++s) {
        Nan::SetAccessor(ctx, Nan::New<String>(SETTERS[s].opt_name).ToLocalChecked(),
            GNContext::GetContextValue, GNContext::SetContextValue);
    }
    for (s = 0; s < NUM_UINT8_SETTERS; ++s) {
        Nan::SetAccessor(ctx, Nan::New<String>(UINT8_OPTION_SETTERS[s].opt_name).ToLocalChecked(),
            GNContext::GetContextValue, GNContext::SetContextValue);
    }
    for (s = 0; s < NUM_UINT16_SETTERS; ++s) {
        Nan::SetAccessor(ctx, Nan::New<String>(UINT16_OPTION_SETTERS[s].opt_name).ToLocalChecked(),
            GNContext::GetContextValue, GNContext::SetContextValue);

    }
}

GNContext::GNContext() : context_(NULL) { }
GNContext::~GNContext() {
    if (context_ != NULL) {
        getdns_context_destroy(context_);
        context_ = NULL;
    }

    // NOTE: same cleanup as in ObjectWrap.
    {
        if (persistent().IsEmpty()) {
          return;
        }

        persistent().ClearWeak();
        persistent().Reset();
    }
}

void GNContext::ApplyOptions(Local<Object> self, Local<Value> optsV) {
    if(optsV->IsUndefined()) {
        // NOTE: can be called without options.
        return;
    }
    if (!GNUtil::isDictionaryObject(optsV)) {
        Local<Value> typeError = makeTypeErrorWithCode("options", GETDNS_RETURN_INVALID_PARAMETER);
        return Nan::ThrowError(typeError);
    }
    Local<Object> selfObj = Nan::To<v8::Object>(self).ToLocalChecked();
    Local<Array> selfNames = Nan::GetOwnPropertyNames(selfObj).ToLocalChecked();
    Local<Object> opts = Nan::To<v8::Object>(optsV).ToLocalChecked();
    Local<Array> names = Nan::GetOwnPropertyNames(opts).ToLocalChecked();
    // check options for matching properties
    if (names->Length() > selfNames->Length()) {
        Local<Value> typeError = makeTypeErrorWithCode("options", GETDNS_RETURN_INVALID_PARAMETER);
        return Nan::ThrowError(typeError);
    }
    bool found = false;
    for(unsigned int i = 0; i < names->Length(); i++) {
        found = false;
        Nan::Utf8String nameVal(Nan::Get(names, i).ToLocalChecked());
        for(unsigned int j = 0; j < selfNames->Length(); j++) {
            Nan::Utf8String selfNameVal(Nan::Get(selfNames, j).ToLocalChecked());
            if (strcmp(*nameVal, *selfNameVal) == 0) {
                found = true;
                break;
            }
        }
        if(!found) {
            Local<Value> typeError = makeTypeErrorWithCode(*nameVal, GETDNS_RETURN_INVALID_PARAMETER);
            return Nan::ThrowError(typeError);
        }
    }
    // walk properties
    Nan::TryCatch try_catch;
    for(unsigned int i = 0; i < names->Length(); i++) {
        Local<Value> nameVal = Nan::Get(names, i).ToLocalChecked();
        Local<Value> opt = Nan::Get(opts, nameVal).ToLocalChecked();
        Nan::Set(self, nameVal, opt);
        if (try_catch.HasCaught()) {
            try_catch.ReThrow();
            return;
        }
    }
}

// Module initialization
void GNContext::Init(Local<Object> target) {
    // prepare context object template
    Local<FunctionTemplate> jsContextTpl = Nan::New<FunctionTemplate>(GNContext::New);
    jsContextTpl->SetClassName(Nan::New<String>("Context").ToLocalChecked());
    jsContextTpl->InstanceTemplate()->SetInternalFieldCount(1);
    // Prototype
    Nan::SetPrototypeMethod(jsContextTpl, "lookup", GNContext::Lookup);
    Nan::SetPrototypeMethod(jsContextTpl, "cancel", GNContext::Cancel);
    Nan::SetPrototypeMethod(jsContextTpl, "destroy", GNContext::Destroy);
    // Helpers - delegate to the same function w/ different data
    Nan::SetPrototypeTemplate(jsContextTpl, "getAddress",
        Nan::New<FunctionTemplate>(GNContext::HelperLookup, Nan::New<Integer>(GNAddress)));
    Nan::SetPrototypeTemplate(jsContextTpl, "getHostname",
        Nan::New<FunctionTemplate>(GNContext::HelperLookup, Nan::New<Integer>(GNHostname)));
    Nan::SetPrototypeTemplate(jsContextTpl, "getService",
        Nan::New<FunctionTemplate>(GNContext::HelperLookup, Nan::New<Integer>(GNService)));

    // Add the constructor
    Nan::Set(target, Nan::New<String>("Context").ToLocalChecked(), Nan::GetFunction(jsContextTpl).ToLocalChecked());

    // Export constants
    GNConstants::Init(target);
}

// Explicity destroy the context
NAN_METHOD(GNContext::Destroy) {
    GNContext* ctx = Nan::ObjectWrap::Unwrap<GNContext>(info.Holder());
    if (!ctx) {
        Nan::ThrowError(Nan::New<String>("Context is invalid.").ToLocalChecked());
        return;
    }
    getdns_context_destroy(ctx->context_);
    ctx->context_ = NULL;
    info.GetReturnValue().Set(Nan::True());
}

// Create a context (new op)
NAN_METHOD(GNContext::New) {
    if (info.IsConstructCall()) {
        if (info.Length() > 1) {
            // NOTE: duplicated in getdns.js and GNContext.cpp.
            // TODO: use new getdns.Context(...args) when not supporting node.js v4 anymore.
            Local<Value> typeError = makeTypeErrorWithCode("Too many arguments.", GETDNS_RETURN_INVALID_PARAMETER);
            return Nan::ThrowError(typeError);
        }

        // new obj
        GNContext* ctx = new GNContext();
        getdns_return_t r = getdns_context_create(&ctx->context_, 1);
        if (r != GETDNS_RETURN_GOOD) {
            // Failed to create an underlying context
            delete ctx;
            return Nan::ThrowError(Nan::New<String>("Unable to create GNContext.").ToLocalChecked());
        }

        // Attach the context to node
        bool attached = GNUtil::attachContextToNode(ctx->context_);
        if (!attached) {
            // Bail
            delete ctx;
            return Nan::ThrowError(Nan::New<String>("Unable to attach to Node.").ToLocalChecked());
        }
        ctx->Wrap(info.This());
        // add setters
        GNContext::InitProperties(info.This());
        // Apply options if needed
        if (info.Length() == 1) {
            // could throw an
            Nan::TryCatch try_catch;
            GNContext::ApplyOptions(info.This(), info[0]);
            if (try_catch.HasCaught()) {
                // Need to bail
                try_catch.ReThrow();
                return;
            }
        }
        info.GetReturnValue().Set(info.This());
    } else {
        return Nan::ThrowError(Nan::New<String>("Must use new.").ToLocalChecked());
    }
    return;
}

void GNContext::Callback(getdns_context *context,
                         getdns_callback_type_t cbType,
                         getdns_dict *response,
                         void *userArg,
                         getdns_transaction_t transId) {
    Nan::HandleScope scope;
    CallbackData* data = static_cast<CallbackData*>(userArg);
    // Setup the callback arguments
    Local<Value> argv[3];
    if (cbType == GETDNS_CALLBACK_COMPLETE) {
        argv[0] = Nan::Null();
        argv[1] = GNUtil::convertToJSObj(response);
        getdns_dict_destroy(response);
    } else {
        argv[0] = makeErrorObj("Lookup failed.", cbType);
        argv[1] = Nan::Null();
    }
    Nan::TryCatch try_catch;
    argv[2] = GNUtil::convertToBuffer(&transId, 8);
    data->callback->Call(Nan::GetCurrentContext()->Global(), 3, argv);

    if (try_catch.HasCaught())
        Nan::FatalException(try_catch);

    // Unref
    data->ctx->Unref();
    delete data->callback;
    delete data;
}

// Cancel a req.  Expect it to be a transaction id as a buffer
NAN_METHOD(GNContext::Cancel) {
    GNContext* ctx = Nan::ObjectWrap::Unwrap<GNContext>(info.Holder());
    if (!ctx || !ctx->context_) {
        info.GetReturnValue().Set(Nan::False());
    }
    if (info.Length() < 1) {
        info.GetReturnValue().Set(Nan::False());
    }
    if (node::Buffer::Length(info[0]) != 8) {
        info.GetReturnValue().Set(Nan::False());
    }
    uint64_t transId;
    memcpy(&transId, node::Buffer::Data(info[0]), 8);
    getdns_return_t r = getdns_cancel_callback(ctx->context_, transId);
    info.GetReturnValue().Set(r == GETDNS_RETURN_GOOD ? Nan::True() : Nan::False());
}

// Handle getdns general
NAN_METHOD(GNContext::Lookup) {
    // name, type, and callback are required
    if (info.Length() < 3) {
        return Nan::ThrowTypeError(Nan::New<String>("At least 3 arguments are required.").ToLocalChecked());
    }
    // last arg must be a callback
    Local<Value> last = info[info.Length() - 1];
    if (!last->IsFunction()) {
        return Nan::ThrowTypeError(Nan::New<String>("Final argument must be a function.").ToLocalChecked());
    }
    Local<Function> localCb = Local<Function>::Cast(last);
    GNContext* ctx = Nan::ObjectWrap::Unwrap<GNContext>(info.Holder());
    if (!ctx || !ctx->context_) {
        Local<Value> err = makeErrorObj("Context is invalid", GETDNS_RETURN_GENERIC_ERROR);
        Local<Value> cbArgs[] = { err };
        Nan::MakeCallback(Nan::GetCurrentContext()->Global(), localCb, 1, cbArgs);
        return;
    }
    // take first arg and make it a string
    Nan::Utf8String name(info[0]);
    // second arg must be a number
    if (!info[1]->IsNumber()) {
        Local<Value> err = makeErrorObj("Second argument must be a number", GETDNS_RETURN_INVALID_PARAMETER);
        Local<Value> cbArgs[] = { err };
        Nan::MakeCallback(Nan::GetCurrentContext()->Global(), localCb, 1, cbArgs);
        return;
    }
    uint16_t type = (uint16_t) Nan::To<uint32_t>(info[1]).FromJust();

    // optional third arg is an object
    getdns_dict* extension = NULL;
    if (info.Length() > 3 && info[2]->IsObject()) {
        extension = GNUtil::convertToDict(Nan::To<v8::Object>(info[2]).ToLocalChecked());
    }

    // create callback data
    CallbackData *data = new CallbackData();
    data->callback = new Nan::Callback(localCb);
    data->ctx = ctx;
    ctx->Ref();

    // issue a query
    getdns_transaction_t transId;
    getdns_return_t r = getdns_general(ctx->context_, *name, type,
                                       extension, data, &transId,
                                       GNContext::Callback);
    if (r != GETDNS_RETURN_GOOD) {
        // fail
        delete data->callback;
        data->ctx->Unref();
        delete data;

        Local<Value> err = makeErrorObj("Error issuing query", r);
        Local<Value> cbArgs[] = { err };
        Nan::MakeCallback(Nan::GetCurrentContext()->Global(), localCb, 1, cbArgs);
        return;
    }
    // done.
    info.GetReturnValue().Set(GNUtil::convertToBuffer(&transId, 8));
}

// Common function to handle getdns_address/service/hostname
NAN_METHOD(GNContext::HelperLookup) {
    // first argument is a string
    // last argument must be a callback
    // optional argument of extensions
    // name, type, and callback are required
    if (info.Length() < 2) {
        return Nan::ThrowTypeError(Nan::New<String>("At least 2 arguments are required.").ToLocalChecked());
    }
    // last arg must be a callback
    Local<Value> last = info[info.Length() - 1];
    if (!last->IsFunction()) {
        return Nan::ThrowTypeError(Nan::New<String>("Final argument must be a function.").ToLocalChecked());
    }
    Local<Function> localCb = Local<Function>::Cast(last);
    GNContext* ctx = Nan::ObjectWrap::Unwrap<GNContext>(info.Holder());
    if (!ctx || !ctx->context_) {
        Local<Value> err = makeErrorObj("Context is invalid", GETDNS_RETURN_GENERIC_ERROR);
        Local<Value> cbArgs[] = { err };
        Nan::Call(localCb, Nan::GetCurrentContext()->Global(), 1, cbArgs);
        return;
    }
    // take first arg and make it a string
    Nan::Utf8String name(info[0]);

    // 2nd arg could be extensions
    // optional third arg is an object
    getdns_dict* extension = NULL;
    if (info.Length() > 2 && info[1]->IsObject()) {
        extension = GNUtil::convertToDict(Nan::To<v8::Object>(info[1]).ToLocalChecked());
    }

    // figure out what called us
    uint32_t funcType = Nan::To<uint32_t>(info.Data()).FromJust();
    // create callback data
    CallbackData *data = new CallbackData();
    data->callback = new Nan::Callback(localCb);
    data->ctx = ctx;
    ctx->Ref();

    getdns_transaction_t transId;
    getdns_return_t r = GETDNS_RETURN_GOOD;
    if (funcType == GNAddress) {
        r = getdns_address(ctx->context_, *name, extension,
                           data, &transId, GNContext::Callback);
    } else if(funcType == GNService) {
        r = getdns_service(ctx->context_, *name, extension,
                           data, &transId, GNContext::Callback);
    } else {
        // hostname
        // convert to a dictionary..
        getdns_dict* ip = getdns_util_create_ip(*name);
        if (ip) {
            r = getdns_hostname(ctx->context_, ip, extension,
                                data, &transId, GNContext::Callback);
            getdns_dict_destroy(ip);
        } else {
            r = GETDNS_RETURN_GENERIC_ERROR;
        }
    }

    if (r != GETDNS_RETURN_GOOD) {
        // fail
        delete data->callback;
        data->ctx->Unref();
        delete data;

        Local<Value> err = makeErrorObj("Error issuing query", r);
        Local<Value> cbArgs[] = { err };
        Nan::MakeCallback(Nan::GetCurrentContext()->Global(), localCb, 1, cbArgs);
        return;
    }
    // done. return as buffer
    info.GetReturnValue().Set(GNUtil::convertToBuffer(&transId, 8));
}

// Init the module
NODE_MODULE(getdns, GNContext::Init)
