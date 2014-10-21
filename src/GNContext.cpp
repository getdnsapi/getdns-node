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

#include "GNContext.h"
#include "GNUtil.h"
#include "GNConstants.h"

#include <getdns/getdns_extra.h>
#include <arpa/inet.h>
#include <node_buffer.h>
#include <string.h>

using namespace v8;

// Enum to distinguish which helper is being used.
typedef enum LookupType {
    GNAddress = 0,
    GNHostname,
    GNService
} LookupType;

// Callback data passed to getdns callback as userarg
typedef struct CallbackData {
    Persistent<Function> callback;
    GNContext* ctx;
} CallbackData;

// Helper to create an error object for lookup callbacks
static Handle<Value> makeErrorObj(const char* msg, int code) {
    Handle<Object> obj = Object::New();
    obj->Set(String::New("msg"), String::New(msg));
    obj->Set(String::New("code"), Integer::New(code));
    return obj;
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

static void setTransport(getdns_context* context, Handle<Value> opt) {
    if (opt->IsNumber()) {
        uint32_t num = opt->Uint32Value();
        getdns_context_set_dns_transport(context, (getdns_transport_t) num);
    }
}

static void setStub(getdns_context* context, Handle<Value> opt) {
    if (opt->IsTrue()) {
        getdns_context_set_resolution_type(context, GETDNS_RESOLUTION_STUB);
    } else {
        getdns_context_set_resolution_type(context, GETDNS_RESOLUTION_RECURSING);
    }
}

static void setUpstreams(getdns_context* context, Handle<Value> opt) {
    if (opt->IsArray()) {
        getdns_list* upstreams = getdns_list_create();
        Handle<Array> values = Handle<Array>::Cast(opt);
        for (uint32_t i = 0; i < values->Length(); ++i) {
            Local<Value> ipOrTuple = values->Get(i);
            getdns_dict* ipDict = NULL;
            if (ipOrTuple->IsArray()) {
                // two tuple - first is IP, 2nd is port
                Handle<Array> tuple = Handle<Array>::Cast(ipOrTuple);
                if (tuple->Length() > 0) {
                    String::AsciiValue asciiStr(tuple->Get(0)->ToString());
                    ipDict = getdns_util_create_ip(*asciiStr);
                    if (ipDict && tuple->Length() > 1 &&
                        tuple->Get(1)->IsNumber()) {
                        // port
                        uint32_t port = tuple->Get(1)->Uint32Value();
                        getdns_dict_set_int(ipDict, "port", port);
                    }
                }
            } else {
                String::AsciiValue asciiStr(ipOrTuple->ToString());
                ipDict = getdns_util_create_ip(*asciiStr);
            }
            if (ipDict) {
                size_t len = 0;
                getdns_list_get_length(upstreams, &len);
                getdns_list_set_dict(upstreams, len, ipDict);
                getdns_dict_destroy(ipDict);
            } else {
                Local<String> msg = String::Concat(String::New("Upstream value is invalid: "), ipOrTuple->ToString());
                ThrowException(Exception::TypeError(msg));
            }
        }
        getdns_return_t r = getdns_context_set_upstream_recursive_servers(context, upstreams);
        getdns_list_destroy(upstreams);
        if (r != GETDNS_RETURN_GOOD) {
            ThrowException(Exception::TypeError(String::New("Failed to set upstreams.")));
        }
    }
}

static void setTimeout(getdns_context* context, Handle<Value> opt) {
    if (opt->IsNumber()) {
        uint32_t num = opt->Uint32Value();
        getdns_context_set_timeout(context, num);
    }
}

static void setUseThreads(getdns_context* context, Handle<Value> opt) {
    int val = opt->IsTrue() ? 1 : 0;
    getdns_context_set_use_threads(context, val);
}

static void setReturnDnssecStatus(getdns_context* context, Handle<Value> opt) {
    int val = opt->IsTrue() ? GETDNS_EXTENSION_TRUE : GETDNS_EXTENSION_FALSE;
    getdns_context_set_return_dnssec_status(context, val);
}

typedef void (*context_setter)(getdns_context* context, Handle<Value> opt);
typedef struct OptionSetter {
    const char* opt_name;
    context_setter setter;
} OptionSetter;

static OptionSetter SETTERS[] = {
    { "stub", setStub },
    { "upstreams", setUpstreams },
    { "timeout", setTimeout },
    { "use_threads", setUseThreads },
    { "return_dnssec_status", setReturnDnssecStatus },
    { "dns_transport", setTransport}
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

GNContext::GNContext() : context_(NULL) { }
GNContext::~GNContext() {
    getdns_context_destroy(context_);
    context_ = NULL;
}

void GNContext::applyOptions(Handle<Value> optsV) {
    if (!GNUtil::isDictionaryObject(optsV)) {
        return;
    }
    TryCatch try_catch;
    Local<Object> opts = optsV->ToObject();
    Local<Array> names = opts->GetOwnPropertyNames();
    size_t s = 0;
    // Walk the SETTERS array
    for(unsigned int i = 0; i < names->Length(); i++) {
        Local<Value> nameVal = names->Get(i);
        bool found = false;
        String::AsciiValue name(nameVal);
        Local<Value> opt = opts->Get(nameVal);
        for (s = 0; s < NUM_SETTERS && !found; ++s) {
            if (strcmp(SETTERS[s].opt_name, *name) == 0) {
                SETTERS[s].setter(context_, opt);
                found = true;
                break;
            }
        }
        for (s = 0; s < NUM_UINT8_SETTERS && !found; ++s) {
            if (strcmp(UINT8_OPTION_SETTERS[s].opt_name, *name) == 0) {
                found = true;
                if (!opt->IsNumber()) {
                    break;
                }
                uint32_t optVal = opt->Uint32Value();
                UINT8_OPTION_SETTERS[s].setter(context_, (uint8_t)optVal);
            }
        }
        for (s = 0; s < NUM_UINT16_SETTERS && !found; ++s) {
            if (strcmp(UINT16_OPTION_SETTERS[s].opt_name, *name) == 0) {
                found = true;
                if (!opt->IsNumber()) {
                    break;
                }
                uint32_t optVal = opt->Uint32Value();
                UINT16_OPTION_SETTERS[s].setter(context_, (uint16_t)optVal);
            }
        }
        if (try_catch.HasCaught()) {
            try_catch.ReThrow();
            return;
        }
    }
}

// Module initialization
void GNContext::Init(Handle<Object> target) {
    // prepare context object template
    Local<FunctionTemplate> jsContextTpl = FunctionTemplate::New(GNContext::New);
    jsContextTpl->SetClassName(String::NewSymbol("Context"));
    jsContextTpl->InstanceTemplate()->SetInternalFieldCount(1);
    // Prototype
    NODE_SET_PROTOTYPE_METHOD(jsContextTpl, "lookup", GNContext::Lookup);
    NODE_SET_PROTOTYPE_METHOD(jsContextTpl, "cancel", GNContext::Cancel);
    NODE_SET_PROTOTYPE_METHOD(jsContextTpl, "destroy", GNContext::Destroy);
    // Helpers - delegate to the same function w/ different data
    jsContextTpl->PrototypeTemplate()->Set(String::NewSymbol("getAddress"),
        FunctionTemplate::New(GNContext::HelperLookup, Integer::New(GNAddress))->GetFunction());
    jsContextTpl->PrototypeTemplate()->Set(String::NewSymbol("getHostname"),
        FunctionTemplate::New(GNContext::HelperLookup, Integer::New(GNHostname))->GetFunction());
    jsContextTpl->PrototypeTemplate()->Set(String::NewSymbol("getService"),
        FunctionTemplate::New(GNContext::HelperLookup, Integer::New(GNService))->GetFunction());

    // Add the constructor
    Persistent<Function> constructor = Persistent<Function>::New(jsContextTpl->GetFunction());
    target->Set(String::NewSymbol("Context"), constructor);

    // Export constants
    GNConstants::Init(target);
}

// Explicity destroy the context
Handle<Value> GNContext::Destroy(const Arguments& args) {
    HandleScope scope;
    GNContext* ctx = ObjectWrap::Unwrap<GNContext>(args.This());
    if (!ctx) {
        ThrowException(Exception::Error(String::New("Context is invalid.")));
    }
    getdns_context_destroy(ctx->context_);
    ctx->context_ = NULL;
    return scope.Close(True());
}

// Create a context (new op)
Handle<Value> GNContext::New(const Arguments& args) {
    HandleScope scope;
    if (args.IsConstructCall()) {
        // new obj
        GNContext* ctx = new GNContext();
        getdns_return_t r = getdns_context_create(&ctx->context_, 1);
        if (r != GETDNS_RETURN_GOOD) {
            // Failed to create an underlying context
            delete ctx;
            ThrowException(Exception::Error(String::New("Unable to create GNContext.")));
        }
        // Apply options if needed
        if (args.Length() > 0) {
            // could throw an
            TryCatch try_catch;
            ctx->applyOptions(args[0]);
            if (try_catch.HasCaught()) {
                // Need to bail
                delete ctx;
                try_catch.ReThrow();
                return scope.Close(Undefined());
            }
        }
        // Attach the context to node
        bool attached = GNUtil::attachContextToNode(ctx->context_);
        if (!attached) {
            // Bail
            delete ctx;
            ThrowException(Exception::Error(String::New("Unable to attach to Node.")));
            return scope.Close(Undefined());
        }
        ctx->Wrap(args.This());
        return args.This();
    } else {
        ThrowException(Exception::Error(String::New("Must use new.")));
    }
    return scope.Close(Undefined());
}

void GNContext::Callback(getdns_context *context,
                         getdns_callback_type_t cbType,
                         getdns_dict *response,
                         void *userArg,
                         getdns_transaction_t transId) {
    CallbackData* data = static_cast<CallbackData*>(userArg);
    // Setup the callback arguments
    Handle<Value> argv[3];
    if (cbType == GETDNS_CALLBACK_COMPLETE) {
        argv[0] = Null();
        argv[1] = GNUtil::convertToJSObj(response);
        getdns_dict_destroy(response);
    } else {
        argv[0] = makeErrorObj("Lookup failed.", cbType);
        argv[1] = Null();
    }
    TryCatch try_catch;
    argv[2] = GNUtil::convertToBuffer(&transId, 8);
    data->callback->Call(Context::GetCurrent()->Global(), 3, argv);

    if (try_catch.HasCaught())
        node::FatalException(try_catch);

    // Unref
    data->ctx->Unref();
    data->callback.Dispose();
    delete data;
}

// Cancel a req.  Expect it to be a transaction id as a buffer
Handle<Value> GNContext::Cancel(const Arguments& args) {
    HandleScope scope;
    GNContext* ctx = node::ObjectWrap::Unwrap<GNContext>(args.This());
    if (!ctx || !ctx->context_) {
        return scope.Close(False());
    }
    if (args.Length() < 1) {
        return scope.Close(False());
    }
    if (node::Buffer::Length(args[0]) != 8) {
        return scope.Close(False());
    }
    uint64_t transId;
    memcpy(&transId, node::Buffer::Data(args[0]), 8);
    getdns_return_t r = getdns_cancel_callback(ctx->context_, transId);
    return scope.Close(r == GETDNS_RETURN_GOOD ? True() : False());
}

// Handle getdns general
Handle<Value> GNContext::Lookup(const Arguments& args) {
    HandleScope scope;
    // name, type, and callback are required
    if (args.Length() < 3) {
        ThrowException(Exception::TypeError(String::New("At least 3 arguments are required.")));
    }
    // last arg must be a callback
    Local<Value> last = args[args.Length() - 1];
    if (!last->IsFunction()) {
        ThrowException(Exception::TypeError(String::New("Final argument must be a function.")));
    }
    Local<Function> localCb = Local<Function>::Cast(last);
    GNContext* ctx = node::ObjectWrap::Unwrap<GNContext>(args.This());
    if (!ctx || !ctx->context_) {
        Handle<Value> err = makeErrorObj("Context is invalid", GETDNS_RETURN_GENERIC_ERROR);
        Handle<Value> cbArgs[] = { err };
        localCb->Call(Context::GetCurrent()->Global(), 1, cbArgs);
        return scope.Close(Undefined());
    }
    // take first arg and make it a string
    String::Utf8Value name(args[0]->ToString());
    // second arg must be a number
    if (!args[1]->IsNumber()) {
        Handle<Value> err = makeErrorObj("Second argument must be a number", GETDNS_RETURN_INVALID_PARAMETER);
        Handle<Value> cbArgs[] = { err };
        localCb->Call(Context::GetCurrent()->Global(), 1, cbArgs);
        return scope.Close(Undefined());
    }
    uint16_t type = (uint16_t) args[1]->Uint32Value();

    // optional third arg is an object
    getdns_dict* extension = NULL;
    if (args.Length() > 3 && args[2]->IsObject()) {
        extension = GNUtil::convertToDict(args[2]->ToObject());
    }

    Persistent<Function> callback = Persistent<Function>::New(localCb);

    // create callback data
    CallbackData *data = new CallbackData();
    data->callback = callback;
    data->ctx = ctx;
    ctx->Ref();

    // issue a query
    getdns_transaction_t transId;
    getdns_return_t r = getdns_general(ctx->context_, *name, type,
                                       extension, data, &transId,
                                       GNContext::Callback);
    if (r != GETDNS_RETURN_GOOD) {
        // fail
        data->callback.Dispose();
        data->ctx->Unref();
        delete data;

        Handle<Value> err = makeErrorObj("Error issuing query", r);
        Handle<Value> cbArgs[] = { err };
        localCb->Call(Context::GetCurrent()->Global(), 1, cbArgs);
        return scope.Close(Undefined());
    }
    // done.
    return scope.Close(GNUtil::convertToBuffer(&transId, 8));
}

// Common function to handle getdns_address/service/hostname
Handle<Value> GNContext::HelperLookup(const Arguments& args) {
    // first argument is a string
    // last argument must be a callback
    // optional argument of extensions
    HandleScope scope;
    // name, type, and callback are required
    if (args.Length() < 2) {
        ThrowException(Exception::TypeError(String::New("At least 2 arguments are required.")));
    }
    // last arg must be a callback
    Local<Value> last = args[args.Length() - 1];
    if (!last->IsFunction()) {
        ThrowException(Exception::TypeError(String::New("Final argument must be a function.")));
    }
    Local<Function> localCb = Local<Function>::Cast(last);
    GNContext* ctx = node::ObjectWrap::Unwrap<GNContext>(args.This());
    if (!ctx || !ctx->context_) {
        Handle<Value> err = makeErrorObj("Context is invalid", GETDNS_RETURN_GENERIC_ERROR);
        Handle<Value> cbArgs[] = { err };
        localCb->Call(Context::GetCurrent()->Global(), 1, cbArgs);
        return scope.Close(Undefined());
    }
    // take first arg and make it a string
    String::Utf8Value name(args[0]->ToString());

    // 2nd arg could be extensions
    // optional third arg is an object
    getdns_dict* extension = NULL;
    if (args.Length() > 2 && args[1]->IsObject()) {
        extension = GNUtil::convertToDict(args[1]->ToObject());
    }

    // figure out what called us
    uint32_t funcType = args.Data()->Uint32Value();
    Persistent<Function> callback = Persistent<Function>::New(localCb);
    // create callback data
    CallbackData *data = new CallbackData();
    data->callback = callback;
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
        data->callback.Dispose();
        data->ctx->Unref();
        delete data;

        Handle<Value> err = makeErrorObj("Error issuing query", r);
        Handle<Value> cbArgs[] = { err };
        localCb->Call(Context::GetCurrent()->Global(), 1, cbArgs);
        return scope.Close(Undefined());
    }
    // done. return as buffer
    return scope.Close(GNUtil::convertToBuffer(&transId, 8));
}

// Init the module
NODE_MODULE(getdns, GNContext::Init)

