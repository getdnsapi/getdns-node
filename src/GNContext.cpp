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
    getdns_context_destroy(context_);
    context_ = NULL;
}

void GNContext::Init(Handle<Object> target) {
    // prepare constructor template
    Local<FunctionTemplate> tpl = FunctionTemplate::New(GNContext::New);
    tpl->SetClassName(String::NewSymbol("Context"));
    tpl->InstanceTemplate()->SetInternalFieldCount(1);
    // Prototype
    tpl->PrototypeTemplate()->Set(String::NewSymbol("lookup"),
        FunctionTemplate::New(GNContext::Lookup)->GetFunction());
    tpl->PrototypeTemplate()->Set(String::NewSymbol("getAddress"),
        FunctionTemplate::New(GNContext::HelperLookup, Integer::New(GNAddress))->GetFunction());
    tpl->PrototypeTemplate()->Set(String::NewSymbol("getHostname"),
        FunctionTemplate::New(GNContext::HelperLookup, Integer::New(GNHostname))->GetFunction());
    tpl->PrototypeTemplate()->Set(String::NewSymbol("getService"),
        FunctionTemplate::New(GNContext::HelperLookup, Integer::New(GNService))->GetFunction());

    // TODO: cancel, setters

    Persistent<Function> constructor = Persistent<Function>::New(tpl->GetFunction());
    target->Set(String::NewSymbol("Context"), constructor);

    // cleanup
    Local<FunctionTemplate> cleanTpl = FunctionTemplate::New(GNContext::Cleanup);
    Persistent<Function> clean = Persistent<Function>::New(cleanTpl->GetFunction());
    target->Set(String::NewSymbol("Destroy"), clean);
}

Handle<Value> GNContext::Cleanup(const Arguments& args) {
    HandleScope scope;
    GNContext* ctx = ObjectWrap::Unwrap<GNContext>(args[0]->ToObject());
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
        bool attached = GNUtil::attachContextToNode(ctx->context_);
        if (!attached) {
            delete ctx;
            ThrowException(Exception::TypeError(String::New("Unable to create GNContext.")));
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
        argv[0] = makeErrorObj("Lookup failed", cbType);
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
    Local<Function> localCb = Local<Function>::Cast(args[0]);
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


