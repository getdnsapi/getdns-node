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

#include <getdns/getdns_extra.h>
#include <arpa/inet.h>
#include <node_buffer.h>

using namespace v8;

typedef enum LookupType {
    GNAddress = 0,
    GNHostname = 1,
    GNService = 2
} LookupType;


typedef struct CallbackData {
    Persistent<Function> callback;
    GNContext* ctx;
} CallbackData;

static Handle<Value> makeErrorObj(const char* msg, int code) {
    Handle<Object> obj = Object::New();
    obj->Set(String::New("msg"), String::New(msg));
    obj->Set(String::New("code"), Integer::New(code));
    return obj;
}

static getdns_dict* getdns_util_create_ip(const char* ip) {
    if (!ip) {
        return NULL;
    }
    getdns_return_t r;
    uint8_t addrBuff[16];
    size_t addrSize = 0;
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
    getdns_dict* result = getdns_dict_create();
    if (!result) {
        return NULL;
    }
    // set fields
    const char* ipType = addrSize == 4 ? "IPv4" : "IPv6";
    r = getdns_dict_util_set_string(result, (char*) "address_type", ipType);
    if (r != GETDNS_RETURN_GOOD) {
        getdns_dict_destroy(result);
        return NULL;
    }
    getdns_bindata data;
    data.data = addrBuff;
    data.size = addrSize;
    r = getdns_dict_set_bindata(result, "address_data", &data);
    if (r != GETDNS_RETURN_GOOD) {
        getdns_dict_destroy(result);
        return NULL;
    }
    return result;
}


GNContext::GNContext() : context_(NULL) { }
GNContext::~GNContext() {
    printf("GNContext destructor.\n");
    getdns_context_destroy(context_);
    context_ = NULL;
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

typedef void (*context_setter)(getdns_context* context, Handle<Value> opt);
typedef struct OptionSetter {
    const char* opt_name;
    context_setter setter;
} OptionSetter;

static OptionSetter SETTERS[] = {
    { "stub", setStub },
    { "upstreams", setUpstreams },
    { "timeout", setTimeout }
};

static size_t NUM_SETTERS = sizeof(SETTERS) / sizeof(OptionSetter);

void GNContext::applyOptions(Handle<Value> optsV) {
    if (!GNUtil::isDictionaryObject(optsV)) {
        return;
    }
    TryCatch try_catch;
    Local<Object> opts = optsV->ToObject();
    Local<Array> names = opts->GetOwnPropertyNames();
    for(unsigned int i = 0; i < names->Length(); i++) {
        Local<Value> nameVal = names->Get(i);
        String::AsciiValue name(nameVal);
        Local<Value> opt = opts->Get(nameVal);
        for (size_t s = 0; s < NUM_SETTERS; ++s) {
            if (strcmp(SETTERS[s].opt_name, *name) == 0) {
                SETTERS[s].setter(context_, opt);
                break;
            }
        }
        if (try_catch.HasCaught()) {
            try_catch.ReThrow();
            return;
        }
    }
}

void GNContext::Init(Handle<Object> target) {
    // prepare context object template
    Local<FunctionTemplate> jsContextTpl = FunctionTemplate::New(GNContext::New);
    jsContextTpl->SetClassName(String::NewSymbol("Context"));
    jsContextTpl->InstanceTemplate()->SetInternalFieldCount(1);
    // Prototype
    NODE_SET_PROTOTYPE_METHOD(jsContextTpl, "lookup", GNContext::Lookup);
    NODE_SET_PROTOTYPE_METHOD(jsContextTpl, "cancel", GNContext::Lookup);
    NODE_SET_PROTOTYPE_METHOD(jsContextTpl, "destroy", GNContext::Cleanup);
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
}

Handle<Value> GNContext::Cleanup(const Arguments& args) {
    HandleScope scope;
    GNContext* ctx = ObjectWrap::Unwrap<GNContext>(args.This());
    getdns_context_destroy(ctx->context_);
    ctx->context_ = NULL;
    return scope.Close(Undefined());
}

// functions on the GNContext
Handle<Value> GNContext::New(const Arguments& args) {
    HandleScope scope;
    if (args.IsConstructCall()) {
        GNContext* ctx = new GNContext();
        getdns_return_t r = getdns_context_create(&ctx->context_, 1);
        if (r != GETDNS_RETURN_GOOD) {
            delete ctx;
            ThrowException(Exception::TypeError(String::New("Unable to create GNContext.")));
        }
        if (args.Length() > 0) {
            // could throw an
            TryCatch try_catch;
            ctx->applyOptions(args[0]);
            if (try_catch.HasCaught()) {
                delete ctx;
                try_catch.ReThrow();
                return scope.Close(Undefined());
            }
        }
        bool attached = GNUtil::attachContextToNode(ctx->context_);
        if (!attached) {
            delete ctx;
            ThrowException(Exception::TypeError(String::New("Unable to create GNContext.")));
            return scope.Close(Undefined());
        }
        ctx->Wrap(args.This());
        return args.This();
    } else {
        ThrowException(Exception::TypeError(String::New("Must use new.")));
    }
    return scope.Close(Undefined());
}

void GNContext::Callback(getdns_context *this_context,
                         getdns_callback_type_t cbType,
                         getdns_dict *response,
                         void *userArg,
                         getdns_transaction_t this_transaction_id) {
    CallbackData* data = static_cast<CallbackData*>(userArg);
    Handle<Value> argv[2];
    if (cbType == GETDNS_CALLBACK_COMPLETE) {
        argv[0] = Null();
        argv[1] = GNUtil::convertToJSObj(response);
        getdns_dict_destroy(response);
    } else {
        argv[0] = makeErrorObj("Lookup failed.", cbType);
        argv[1] = Null();
    }
    TryCatch try_catch;
    data->callback->Call(Context::GetCurrent()->Global(), 2, argv);
    if (try_catch.HasCaught())
        node::FatalException(try_catch);

    data->ctx->Unref();
    data->callback.Dispose();
    delete data;
}

Handle<Value> GNContext::Cancel(const Arguments& args) {
    HandleScope scope;
    GNContext* ctx = node::ObjectWrap::Unwrap<GNContext>(args.This());
    if (!ctx || !ctx->context_) {
        return scope.Close(False());
    }
    if (args.Length() < 1) {
        return scope.Close(False());
    }
    uint64_t transId;
    if (node::DecodeWrite((char*) &transId, 8, args[0], node::BINARY) != 8) {
        return scope.Close(False());
    }
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
    return scope.Close(node::Encode(&transId, 8));
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
    return scope.Close(node::Encode(&transId, 8));
}

// Init the module
NODE_MODULE(getdns, GNContext::Init)

