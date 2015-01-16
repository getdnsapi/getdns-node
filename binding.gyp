{
    "targets" : [
        {
            "target_name" : "getdns",
            "sources" : [
                "src/GNContext.cpp",
                "src/GNUtil.cpp",
                "src/GNConstants.cpp"
            ],
            "link_settings" : {
                "libraries" : [
                    "-lgetdns", "-lldns"
                ]
            },
            "conditions": [
                ["OS=='mac' or OS=='solaris'", {
                  "xcode_settings": {
                    "GCC_ENABLE_CPP_EXCEPTIONS": "YES"
                  },
                  "include_dirs": [
                    "/opt/local/include",
                    "/usr/local/include"
                  ],
                  "libraries": [
                    "-L/opt/local/lib",
                    "-L/usr/local/lib"
                  ]
                }],
                ["OS=='openbsd' or OS=='freebsd'", {
                  "include_dirs": [
                    "/usr/local/include"
                  ],
                  "libraries": [
                    "-L/usr/local/lib"
                  ]
                }]
            ]
        }
    ]
}