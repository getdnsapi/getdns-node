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

#ifndef _GN_UTIL_H_
#define _GN_UTIL_H_

#include <node.h>

struct getdns_dict;
struct getdns_list;
struct getdns_context;

using namespace v8;

// Utility class to do some conversions
class GNUtil {
public:

    ~GNUtil() { }

    // Attach a context to node
    static bool attachContextToNode(struct getdns_context* context);

    // Conversions from getdns -> JS
    static Handle<Value> convertToJSArray(struct getdns_list* list);
    static Handle<Value> convertToJSObj(struct getdns_dict* dict);

    // Conversions from JS -> getdns
    static struct getdns_list* convertToList(Handle<Array> array);
    static struct getdns_dict* convertToDict(Handle<Object> obj);

    // Helper to determine if an object is a plain dict
    static bool isDictionaryObject(Handle<Value> obj);

private:

    // utility class
    GNUtil() { }
    GNUtil( const GNUtil& gn);
    void operator=( const GNUtil& );

};

#endif
