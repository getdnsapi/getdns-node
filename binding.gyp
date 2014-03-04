{
    "targets" : [
        {
            "target_name" : "getdns",
            "sources" : [
                "src/getdns.cpp",
                "src/GNContext.cpp",
                "src/GNUtil.cpp"
            ],
            "link_settings" : {
                "libraries" : [
                    "-lgetdns"
                ]
            }
        }
    ]
}