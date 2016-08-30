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

#include <getdns/getdns.h>
#include <getdns/getdns_extra.h>

#include <nan.h>
#include <node.h>
#include <node_buffer.h>
#include "GNUtil.h"

#include <ctype.h>
#include <string.h>

// Mostly copied from getdns lib_uv extension but is long lived
// until explicit free

#include <sys/time.h>
#include <stdio.h>
#include <uv.h>

typedef struct getdns_libuv {
    getdns_eventloop_vmt *vmt;
    uv_loop_t            *loop;
} getdns_libuv;

static void
getdns_libuv_run(getdns_eventloop *loop)
{
    // Do nothing, Node is already running the event loop
    (void) loop;
}

static void
getdns_libuv_run_once(getdns_eventloop *loop, int blocking)
{
    // Do nothing, Node is already running the event loop
    (void) loop;
    (void) blocking;
}

static void
getdns_libuv_cleanup(getdns_eventloop *loop)
{
    getdns_libuv *ext = (getdns_libuv *)loop;
    free(ext);
}

typedef struct poll_timer {
    uv_poll_t        read;
    uv_poll_t        write;
    uv_timer_t       timer;
    int              to_close;
} poll_timer;

static void
getdns_libuv_close_cb(uv_handle_t *handle)
{
    poll_timer *my_ev = (poll_timer *)handle->data;

    if (--my_ev->to_close) {
        return;
    }
    free(my_ev);
}

static getdns_return_t
getdns_libuv_clear(getdns_eventloop *loop, getdns_eventloop_event *el_ev)
{
    poll_timer   *my_ev = (poll_timer *)el_ev->ev;
    uv_poll_t    *my_poll;
    uv_timer_t   *my_timer;

    assert(my_ev);

    if (el_ev->read_cb) {
        my_poll = &my_ev->read;
        uv_poll_stop(my_poll);
        my_ev->to_close += 1;
        my_poll->data = my_ev;
        uv_close((uv_handle_t *)my_poll, getdns_libuv_close_cb);
    }
    if (el_ev->write_cb) {
        my_poll = &my_ev->write;
        uv_poll_stop(my_poll);
        my_ev->to_close += 1;
        my_poll->data = my_ev;
        uv_close((uv_handle_t *)my_poll, getdns_libuv_close_cb);
    }
    if (el_ev->timeout_cb) {
        my_timer = &my_ev->timer;
        uv_timer_stop(my_timer);
        my_ev->to_close += 1;
        my_timer->data = my_ev;
        uv_close((uv_handle_t *)my_timer, getdns_libuv_close_cb);
    }
    el_ev->ev = NULL;
    return GETDNS_RETURN_GOOD;
}

static void
getdns_libuv_read_cb(uv_poll_t *poll, int status, int events)
{
        getdns_eventloop_event *el_ev = (getdns_eventloop_event *)poll->data;
        assert(el_ev->read_cb);
        el_ev->read_cb(el_ev->userarg);
}

static void
getdns_libuv_write_cb(uv_poll_t *poll, int status, int events)
{
        getdns_eventloop_event *el_ev = (getdns_eventloop_event *)poll->data;
        assert(el_ev->write_cb);
        el_ev->write_cb(el_ev->userarg);
}

static void
#if UV_VERSION_MAJOR == 0
getdns_libuv_timeout_cb(uv_timer_t *timer, int status)
#else
getdns_libuv_timeout_cb(uv_timer_t *timer)
#endif
{
        getdns_eventloop_event *el_ev = (getdns_eventloop_event *)timer->data;
        assert(el_ev->timeout_cb);
        el_ev->timeout_cb(el_ev->userarg);
}

static getdns_return_t
getdns_libuv_schedule(getdns_eventloop *loop,
    int fd, uint64_t timeout, getdns_eventloop_event *el_ev)
{
    getdns_libuv *ext = (getdns_libuv *)loop;
    poll_timer   *my_ev;
    uv_poll_t    *my_poll;
    uv_timer_t   *my_timer;

    assert(el_ev);
    assert(!(el_ev->read_cb || el_ev->write_cb) || fd >= 0);
    assert(  el_ev->read_cb || el_ev->write_cb  || el_ev->timeout_cb);

    my_ev = (poll_timer*)malloc(sizeof(poll_timer));
    if (!my_ev)
        return GETDNS_RETURN_MEMORY_ERROR;

    my_ev->to_close = 0;
    el_ev->ev = my_ev;

    if (el_ev->read_cb) {
        my_poll = &my_ev->read;
        my_poll->data = el_ev;
        uv_poll_init(ext->loop, my_poll, fd);
        uv_poll_start(my_poll, UV_READABLE, getdns_libuv_read_cb);
    }
    if (el_ev->write_cb) {
        my_poll = &my_ev->write;
        my_poll->data = el_ev;
        uv_poll_init(ext->loop, my_poll, fd);
        uv_poll_start(my_poll, UV_WRITABLE, getdns_libuv_write_cb);
    }
    if (el_ev->timeout_cb) {
        my_timer = &my_ev->timer;
        my_timer->data = el_ev;
        uv_timer_init(ext->loop, my_timer);
        uv_timer_start(my_timer, getdns_libuv_timeout_cb, timeout, 0);
    }
    return GETDNS_RETURN_GOOD;
}

getdns_return_t
getdns_extension_set_libuv_loop(getdns_context *context, uv_loop_t *loop)
{
    static getdns_eventloop_vmt getdns_libuv_vmt = {
        getdns_libuv_cleanup,
        getdns_libuv_schedule,
        getdns_libuv_clear,
        getdns_libuv_run,
        getdns_libuv_run_once
    };
    getdns_libuv *ext;

    if (!context)
        return GETDNS_RETURN_BAD_CONTEXT;
    if (!loop)
        return GETDNS_RETURN_INVALID_PARAMETER;

    ext = (getdns_libuv*)malloc(sizeof(getdns_libuv));
    if (!ext)
        return GETDNS_RETURN_MEMORY_ERROR;
    ext->vmt  = &getdns_libuv_vmt;
    ext->loop = loop;

    return getdns_context_set_eventloop(context, (getdns_eventloop *)ext);
}


/*
 * Call
 *
 */
bool
GNUtil::attachContextToNode(struct getdns_context* context)
{
    if (!context) { return false; }
    /* TODO: cleanup current extension base */
    getdns_return_t r = getdns_context_detach_eventloop(context);
    if (r != GETDNS_RETURN_GOOD) {
        return false;
    }
    uv_loop_t* uv_loop = uv_default_loop();
    r = getdns_extension_set_libuv_loop(context, uv_loop);
    return r == GETDNS_RETURN_GOOD;
}

// end copy

// Taken from getdns source to do label checking
static int
priv_getdns_bindata_is_dname(struct getdns_bindata *bindata)
{
    size_t i = 0, n_labels = 0;
    while (i < bindata->size) {
        i += ((size_t)bindata->data[i]) + 1;
        n_labels++;
    }
    return i == bindata->size && n_labels > 1 &&
        bindata->data[bindata->size - 1] == 0;
}


// Convert bindata into a good representational string or
// into a buffer.  Handles dname, printable, ".",
// and an ip address if it is under a known key
static Local<Value> convertBinData(getdns_bindata* data,
                                    const char* key) {
    bool printable = true;
    for (size_t i = 0; i < data->size; ++i) {
        if (!isprint(data->data[i])) {
            if (data->data[i] == 0 &&
                i == data->size - 1) {
                break;
            }
            printable = false;
            break;
        }
    }
    // basic string?
    if (printable) {
        return Nan::New<String>( (char*) data->data, data->size ).ToLocalChecked();
    // the root
    } else if (data->size == 1 && data->data[0] == 0) {
        return Nan::New<String>(".").ToLocalChecked();
    // dname
    } else if (priv_getdns_bindata_is_dname(data)) {
        char* dname = NULL;
        if (getdns_convert_dns_name_to_fqdn(data, &dname)
            == GETDNS_RETURN_GOOD) {
            Local<Value> result = Nan::New<String>(dname).ToLocalChecked();
            free(dname);
            return result;
        }
    // ip address
    } else if (key != NULL &&
        (strcmp(key, "ipv4_address") == 0 ||
         strcmp(key, "ipv6_address") == 0)) {
        char* ipStr = getdns_display_ip_address(data);
        if (ipStr) {
            Local<Value> result = Nan::New<String>(ipStr).ToLocalChecked();
            free(ipStr);
            return result;
        }
    }
    // getting here implies we don't know how to convert it
    // to a string.
    return GNUtil::convertToBuffer(data->data, data->size);
}

Local<Value> GNUtil::convertToBuffer(void* data, size_t size) {
    //construct a new buffer of the size we need.
    Local<Object> nodeBuffer = Nan::NewBuffer(size).ToLocalChecked();

    //Copy the contents of our payload into the buffer
    memcpy(node::Buffer::Data(nodeBuffer), data, size);
    return nodeBuffer;
}

Local<Value> GNUtil::convertToJSArray(struct getdns_list* list) {
    if (!list) {
        return Nan::Null();
    }
    size_t len;
    getdns_list_get_length(list, &len);
    Local<Array> array = Nan::New<Array>();
    for (size_t i = 0; i < len; ++i) {
        getdns_data_type type;
        getdns_list_get_data_type(list, i, &type);
        switch (type) {
            case t_bindata:
            {
                getdns_bindata* data = NULL;
                getdns_list_get_bindata(list, i, &data);
                array->Set(i, convertBinData(data, NULL));
                break;
            }
            case t_int:
            {
                uint32_t res = 0;
                getdns_list_get_int(list, i, &res);
                array->Set(i, Nan::New<Integer>(res));
                break;
            }
            case t_dict:
            {
                getdns_dict* dict = NULL;
                getdns_list_get_dict(list, i, &dict);
                array->Set(i, GNUtil::convertToJSObj(dict));
                break;
            }
            case t_list:
            {
                getdns_list* sublist = NULL;
                getdns_list_get_list(list, i, &sublist);
                array->Set(i, GNUtil::convertToJSArray(sublist));
                break;
            }
            default:
                break;
        }
    }
    return array;
}

// potential helper to get the ip string of a dict
char* getdns_dict_to_ip_string(getdns_dict* dict) {
    if (!dict) {
        return NULL;
    }
    getdns_bindata* data;
    getdns_return_t r;
    r = getdns_dict_get_bindata(dict, "address_type", &data);
    if (r != GETDNS_RETURN_GOOD) {
        return NULL;
    }
    if (data->size == 5 &&
        (strcmp("IPv4", (char*) data->data) == 0 ||
         strcmp("IPv6", (char*) data->data) == 0)) {
        r = getdns_dict_get_bindata(dict, "address_data", &data);
        if (r != GETDNS_RETURN_GOOD) {
            return NULL;
        }
        return getdns_display_ip_address(data);
    }
    return NULL;
}


Local<Value> GNUtil::convertToJSObj(struct getdns_dict* dict) {
    if (!dict) {
        return Nan::Null();
    }

    // try it as an IP
    char* ipStr = getdns_dict_to_ip_string(dict);
    if (ipStr) {
        Local<Value> result = Nan::New<String>(ipStr).ToLocalChecked();
        free(ipStr);
        return result;
    }

    getdns_list* names;
    getdns_dict_get_names(dict, &names);
    size_t len = 0;
    Local<Object> result = Nan::New<Object>();
    getdns_list_get_length(names, &len);
    for (size_t i = 0; i < len; ++i) {
        getdns_bindata* nameBin;
        getdns_list_get_bindata(names, i, &nameBin);
        Local<Value> name = Nan::New<String>((char*) nameBin->data).ToLocalChecked();
        getdns_data_type type;
        getdns_dict_get_data_type(dict, (char*)nameBin->data, &type);
        switch (type) {
            case t_bindata:
            {
                getdns_bindata* data = NULL;
                getdns_dict_get_bindata(dict, (char*)nameBin->data, &data);
                result->Set(name, convertBinData(data, (char*) nameBin->data));
                break;
            }
            case t_int:
            {
                uint32_t res = 0;
                getdns_dict_get_int(dict, (char*)nameBin->data, &res);
                result->Set(name, Nan::New<Integer>(res));
                break;
            }
            case t_dict:
            {
                getdns_dict* subdict = NULL;
                getdns_dict_get_dict(dict, (char*)nameBin->data, &subdict);
                result->Set(name, GNUtil::convertToJSObj(subdict));
                break;
            }
            case t_list:
            {
                getdns_list* list = NULL;
                getdns_dict_get_list(dict, (char*)nameBin->data, &list);
                result->Set(name, GNUtil::convertToJSArray(list));
                break;
            }
            default:
                break;
        }
    }
    getdns_list_destroy(names);
    return result;
}

// Enums to determine what type a JSValue is
typedef enum GetdnsType {
    IntType,
    BoolType,
    StringType,
    BinDataType,
    ListType,
    DictType,
    UnknownType
} GetdnsType;

bool GNUtil::isDictionaryObject(Local<Value> obj) {
    return obj->IsObject() &&
           !(obj->IsRegExp() || obj->IsDate() ||
             obj->IsFunction() || obj->IsArray());
}

static GetdnsType getGetdnsType(Local<Value> value) {
    if (value->IsNumber() || value->IsNumberObject()) {
        return IntType;
    } else if (value->IsBoolean() || value->IsBooleanObject()) {
        return BoolType;
    } else if (value->IsString() || value->IsStringObject()) {
        return StringType;
    } else if (value->IsObject()) {
        // could be a node buffer or array
        if (node::Buffer::HasInstance(value)) {
            return BinDataType;
        } else if (value->IsArray()) {
            return ListType;
        } else if (GNUtil::isDictionaryObject(value)) {
            return DictType;
        }
    }
    return UnknownType;
}

getdns_list* GNUtil::convertToList(Local<Array> array) {
    uint32_t len = array->Length();
    getdns_list* result = getdns_list_create();
    for (uint32_t i = 0; i < len; ++i) {
        size_t idx = getdns_list_get_length(result, &idx);
        Local<Value> val = array->Get(i);
        GetdnsType type = getGetdnsType(val);
        switch (type) {
            case IntType:
                getdns_list_set_int(result, idx, val->ToUint32()->Value());
                break;
            case BoolType:
                if (val->IsTrue()) {
                    getdns_list_set_int(result, idx, GETDNS_EXTENSION_TRUE);
                } else {
                    getdns_list_set_int(result, idx, GETDNS_EXTENSION_FALSE);
                }
                break;
            case StringType:
                {
                    struct getdns_bindata strdata;
                    String::Utf8Value utf8Str(val->ToString());
                    int len = utf8Str.length();
                    strdata.data = (uint8_t*) *utf8Str;
                    strdata.size = len;
                    getdns_list_set_bindata(result, idx, &strdata);
                }
                break;
            case BinDataType:
                {
                    struct getdns_bindata bdata;
                    bdata.data = (uint8_t*) node::Buffer::Data(val);
                    bdata.size = node::Buffer::Length(val);
                    getdns_list_set_bindata(result, idx, &bdata);
                }
                break;
            case ListType:
                {
                    Local<Array> subArray = Local<Array>::Cast(val);
                    struct getdns_list* sublist = GNUtil::convertToList(subArray);
                    getdns_list_set_list(result, idx, sublist);
                    getdns_list_destroy(sublist);
                }
                break;
            case DictType:
                {
                    Local<Object> subObj = val->ToObject();
                    struct getdns_dict* subdict = GNUtil::convertToDict(subObj);
                    if (subdict) {
                        getdns_list_set_dict(result, idx, subdict);
                        getdns_dict_destroy(subdict);
                    }
                }
                break;
            default:
                break;
        }
    }
    return result;
}

getdns_dict* GNUtil::convertToDict(Local<Object> obj) {
    if (obj->IsRegExp() || obj->IsDate() ||
        obj->IsFunction() || obj->IsUndefined() ||
        obj->IsNull() || obj->IsArray()) {
        return NULL;
    }
    Local<Array> names = obj->GetOwnPropertyNames();
    getdns_dict* result = getdns_dict_create();
    for(unsigned int i = 0; i < names->Length(); i++) {
        Local<Value> nameVal = names->Get(i);
        Nan::Utf8String name(nameVal);
        Local<Value> val = obj->Get(nameVal);
        GetdnsType type = getGetdnsType(val);
        switch (type) {
            case IntType:
                getdns_dict_set_int(result, *name, val->ToUint32()->Value());
                break;
            case BoolType:
                if (val->IsTrue()) {
                    getdns_dict_set_int(result, *name, GETDNS_EXTENSION_TRUE);
                } else {
                    getdns_dict_set_int(result, *name, GETDNS_EXTENSION_FALSE);
                }
                break;
            case StringType:
                {
                    struct getdns_bindata strdata;
                    String::Utf8Value utf8Str(val->ToString());
                    int len = utf8Str.length();
                    strdata.data = (uint8_t*) *utf8Str;
                    strdata.size = len;
                    getdns_dict_set_bindata(result, *name, &strdata);
                }
                break;
            case BinDataType:
                {
                    struct getdns_bindata bdata;
                    bdata.data = (uint8_t*) node::Buffer::Data(val);
                    bdata.size = node::Buffer::Length(val);
                    getdns_dict_set_bindata(result, *name, &bdata);
                }
                break;
            case ListType:
                {
                    Local<Array> subArray = Local<Array>::Cast(val);
                    struct getdns_list* sublist = GNUtil::convertToList(subArray);
                    getdns_dict_set_list(result, *name, sublist);
                    getdns_list_destroy(sublist);
                }
                break;
            case DictType:
                {
                    Local<Object> subObj = val->ToObject();
                    struct getdns_dict* subdict = GNUtil::convertToDict(subObj);
                    if (subdict) {
                        getdns_dict_set_dict(result, *name, subdict);
                        getdns_dict_destroy(subdict);
                    }
                }
                break;
            default:
                break;
        }
    }
    return result;
}
