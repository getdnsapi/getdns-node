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

#include <node.h>
#include <node_buffer.h>
#include <string_bytes.h>
#include "GNUtil.h"

#include <ctype.h>

// Copy in from getdns uv extension so as not to be dependent on it
#include <sys/time.h>
#include <stdio.h>
#include <uv.h>

/* extension info */
struct getdns_libuv_data {
    uv_loop_t* loop;
    uv_poll_t* poll_handle;
    uint8_t polling;
};

static void request_count_changed(uint32_t request_count, struct getdns_libuv_data *uv_data);

/* lib uv callbacks */
static void
getdns_libuv_cb(uv_poll_t* handle, int status, int events) {
    struct getdns_context* context = (struct getdns_context*) handle->data;
    getdns_context_process_async(context);
    uint32_t rc = getdns_context_get_num_pending_requests(context, NULL);
    struct getdns_libuv_data* uv_data =
        (struct getdns_libuv_data*) getdns_context_get_extension_data(context);
    request_count_changed(rc, uv_data);
}

static void
request_count_changed(uint32_t request_count, struct getdns_libuv_data *uv_data) {
    if (request_count > 0 && uv_data->polling == 0) {
        uv_poll_start(uv_data->poll_handle, UV_READABLE, getdns_libuv_cb);
        uv_data->polling = 1;
    } else if (request_count == 0 && uv_data->polling == 1) {
        uv_poll_stop(uv_data->poll_handle);
        uv_data->polling = 0;
    }
}

static void
getdns_libuv_timeout_cb(uv_timer_t* handle, int status) {
    getdns_timeout_data_t* timeout_data = (getdns_timeout_data_t*) handle->data;
    timeout_data->callback(timeout_data->userarg);
    uint32_t rc = getdns_context_get_num_pending_requests(timeout_data->context, NULL);
    struct getdns_libuv_data* uv_data =
        (struct getdns_libuv_data*) getdns_context_get_extension_data(timeout_data->context);
    request_count_changed(rc, uv_data);
}

static void
getdns_libuv_close_cb(uv_handle_t* handle) {
    if (handle) {
        free(handle);
    }
}

/* getdns extension functions */
static getdns_return_t
getdns_libuv_request_count_changed(struct getdns_context* context,
    uint32_t request_count, void* eventloop_data) {
    struct getdns_libuv_data *edata = (struct getdns_libuv_data*) eventloop_data;
    request_count_changed(request_count, edata);
    return GETDNS_RETURN_GOOD;
}

static getdns_return_t
getdns_libuv_cleanup(struct getdns_context* context, void* data) {
    struct getdns_libuv_data *uv_data = (struct getdns_libuv_data*) data;
    uv_poll_stop(uv_data->poll_handle);
    uv_close((uv_handle_t*) uv_data->poll_handle, getdns_libuv_close_cb);
    /* handle itself gets cleaned up in close_cb */
    free(uv_data);
    return GETDNS_RETURN_GOOD;
}

static getdns_return_t
getdns_libuv_schedule_timeout(struct getdns_context* context,
    void* eventloop_data, uint16_t timeout,
    getdns_timeout_data_t* timeout_data,
    void** eventloop_timer) {

    uv_timer_t *timer;
    struct getdns_libuv_data* uv_data = (struct getdns_libuv_data*) eventloop_data;

    timer = (uv_timer_t*) malloc(sizeof(uv_timer_t));
    timer->data = timeout_data;
    uv_timer_init(uv_data->loop, timer);
    uv_timer_start(timer, getdns_libuv_timeout_cb, timeout, 0);

    *eventloop_timer = timer;
    return GETDNS_RETURN_GOOD;
}

static getdns_return_t
getdns_libuv_clear_timeout(struct getdns_context* context,
    void* eventloop_data, void* eventloop_timer) {
    uv_timer_t* timer = (uv_timer_t*) eventloop_timer;
    uv_timer_stop(timer);
    uv_close((uv_handle_t*) timer, getdns_libuv_close_cb);
    return GETDNS_RETURN_GOOD;
}


static getdns_eventloop_extension LIBUV_EXT = {
    getdns_libuv_cleanup,
    getdns_libuv_schedule_timeout,
    getdns_libuv_clear_timeout,
    getdns_libuv_request_count_changed
};

/*
 * getdns_extension_set_libuv_loop
 *
 */
bool
GNUtil::attachContextToNode(struct getdns_context* context)
{
    if (!context) { return false; }
    /* TODO: cleanup current extension base */
    getdns_return_t r = getdns_extension_detach_eventloop(context);
    if (r != GETDNS_RETURN_GOOD) {
        return false;
    }
    struct getdns_libuv_data* uv_data = (struct getdns_libuv_data*) malloc(sizeof(struct getdns_libuv_data));
    if (!uv_data) {
        return false;
    }
    uv_loop_t* uv_loop = uv_default_loop();
    int fd = getdns_context_fd(context);
    uv_data->poll_handle = (uv_poll_t*) malloc(sizeof(uv_poll_t));
    if (!uv_data->poll_handle) {
        free(uv_data);
        return false;
    }
    uv_poll_init(uv_loop, uv_data->poll_handle, fd);
    uv_data->poll_handle->data = context;
    uv_data->loop = uv_loop;
    uv_data->polling = 0;
    r = getdns_extension_set_eventloop(context, &LIBUV_EXT, uv_data);
    return r == GETDNS_RETURN_GOOD;
}

// end copy
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

static Handle<Value> convertBinData(getdns_bindata* data,
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
    if (printable) {
        return String::New((char*) data->data);
    } else if (data->size == 1 && data->data[0] == 0) {
        return String::New(".");
    } else if (priv_getdns_bindata_is_dname(data)) {
        char* dname = NULL;
        if (getdns_convert_dns_name_to_fqdn(data, &dname)
            == GETDNS_RETURN_GOOD) {
            Handle<Value> result = String::New(dname);
            free(dname);
            return result;
        }
    } else if (key != NULL &&
        (strcmp(key, "ipv4_address") == 0 ||
         strcmp(key, "ipv6_address") == 0)) {
        char* ipStr = getdns_display_ip_address(data);
        if (ipStr) {
            Handle<Value> result = String::New(ipStr);
            free(ipStr);
            return result;
        }
    }
    // getting here implies we don't know how to convert it
    // to a string.
    return node::Encode(data->data, data->size, node::BINARY);
}

Handle<Value> GNUtil::convertToJSArray(struct getdns_list* list) {
    HandleScope scope;
    if (!list) {
        return Null();
    }
    size_t len;
    getdns_list_get_length(list, &len);
    Handle<Array> array = Array::New(len);
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
                array->Set(i, Integer::New(res));
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
    return scope.Close(array);
}

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


Handle<Value> GNUtil::convertToJSObj(struct getdns_dict* dict) {
    HandleScope scope;
    if (!dict) {
        return Null();
    }

    // try it as an IP
    char* ipStr = getdns_dict_to_ip_string(dict);
    if (ipStr) {
        Handle<Value> result = String::New(ipStr);
        free(ipStr);
        return result;
    }

    getdns_list* names;
    getdns_dict_get_names(dict, &names);
    size_t len = 0;
    Handle<Object> result = Object::New();
    getdns_list_get_length(names, &len);
    for (size_t i = 0; i < len; ++i) {
        getdns_bindata* nameBin;
        getdns_list_get_bindata(names, i, &nameBin);
        Handle<Value> name = String::New((char*) nameBin->data);
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
                result->Set(name, Integer::New(res));
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
    return scope.Close(result);
}

typedef enum GetdnsType {
    IntType,
    BoolType,
    StringType,
    BinDataType,
    ListType,
    DictType,
    UnknownType
} GetdnsType;

bool GNUtil::isDictionaryObject(Handle<Value> obj) {
    return obj->IsObject() &&
           !(obj->IsRegExp() || obj->IsDate() ||
             obj->IsFunction() || obj->IsArray());
}

static GetdnsType getGetdnsType(Handle<Value> value) {
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

getdns_list* GNUtil::convertToList(Handle<Array> array) {
    HandleScope scope;
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
                    String::AsciiValue utf8Str(val->ToString());
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
                    Handle<Array> subArray = Handle<Array>::Cast(val);
                    struct getdns_list* sublist = GNUtil::convertToList(subArray);
                    getdns_list_set_list(result, idx, sublist);
                    getdns_list_destroy(sublist);
                }
                break;
            case DictType:
                {
                    Handle<Object> subObj = val->ToObject();
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

getdns_dict* GNUtil::convertToDict(Handle<Object> obj) {
    HandleScope scope;
    if (obj->IsRegExp() || obj->IsDate() ||
        obj->IsFunction() || obj->IsUndefined() ||
        obj->IsNull() || obj->IsArray()) {
        return NULL;
    }
    Local<Array> names = obj->GetOwnPropertyNames();
    getdns_dict* result = getdns_dict_create();
    for(unsigned int i = 0; i < names->Length(); i++) {
        Local<Value> nameVal = names->Get(i);
        String::AsciiValue name(nameVal);
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
                    Handle<Array> subArray = Handle<Array>::Cast(val);
                    struct getdns_list* sublist = GNUtil::convertToList(subArray);
                    getdns_dict_set_list(result, *name, sublist);
                    getdns_list_destroy(sublist);
                }
                break;
            case DictType:
                {
                    Handle<Object> subObj = val->ToObject();
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

