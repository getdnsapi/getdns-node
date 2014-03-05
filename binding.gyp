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
                    "-lgetdns"
                ]
            }
        }
    ]
}