export const API_URLS = {
    assets: `https://discord.com/api/oauth2/applications/APP_ID/assets`,
    asset: `https://cdn.discordapp.com/app-assets/APP_ID/ASSET_ID.png`,
    icon: `https://cdn.discordapp.com/app-icons/APP_ID/ICON_ID.png`,
    rpc: `https://discord.com/api/oauth2/applications/APP_ID/rpc`,
}

export const DEFAULT_IMAGE_TEXTS = {
    image1: "Download Discord RPC Tool to create your very own customized activities!",
    image2: "Download Discord RPC Tool today at dekitarpg.com/rpc",
}

export const DEFAULT_BUTTON_DATA = {
    btn1: {label: "Website", url: "https://dekitarpg.com/rpc"},
    btn2: {label: "Support", url: "https://discord.gg/7dCZ3Q4eU3"},
}



export const DEFAULT_APPLICATIONS = [

    {// with Pokemon
        app_id: "965114674750292058",
        icon: "https://cdn.discordapp.com/app-icons/965114674750292058/e67d6dc72d888237ebfa00068dfd11d9.png",
        activities: [
            {
                name: "Snorlax",
                details: "Training: Snorlax Lv {minutes}",
                state: "",
                images: [
                    {key: "pkmn-snorlax", text: "in the ball!", enabled: true},
                    {key: "", text: "", enabled: false},
                ],
                buttons: [
                    {url: "https://dekitarpg.com/rpc", label: "Throw Ball", enabled: true},
                    {url: "", label: "", enabled: false},
                ],
                timestamp: false,
            },
            {
                name: "Abra",
                details: "Training: Abra Lv {minutes}",
                state: "",
                images: [
                    {key: "pkmn-abra", text: "in the ball!", enabled: true},
                    {key: "", text: "", enabled: false},
                ],
                buttons: [
                    {url: "https://dekitarpg.com/rpc", label: "Throw Ball", enabled: true},
                    {url: "", label: "", enabled: false},
                ],
                timestamp: false,
            },
            {
                name: "Pikachu",
                details: "Training: Pikachu Lv {minutes}",
                state: "",
                images: [
                    {key: "pkmn-pikachu", text: "in the ball!", enabled: true},
                    {key: "", text: "", enabled: false},
                ],
                buttons: [
                    {url: "https://dekitarpg.com/rpc", label: "Throw Ball", enabled: true},
                    {url: "", label: "", enabled: false},
                ],
                timestamp: false,
            },
        ]
    }, //

    {// in the 80's
        app_id: "965095768774021142",
        icon: "https://cdn.discordapp.com/app-icons/965095768774021142/6b4535ad61db92ea8eeda5dd495332a6.png",
        activities: [
            {
                name: "something 80's",
                details: "Retro yo!",
                state: "",
                images: [
                    {key: "cassette", text: "in the ball!", enabled: true},
                    {key: "", text: "", enabled: false},
                ],
                buttons: [
                    {url: "", label: "", enabled: false},
                    {url: "", label: "", enabled: false},
                ],
                timestamp: false,
            },
        ]
    }, //   967250932188463204 

    {// Fallout 69
        app_id: "967250932188463204",
        icon: "https://cdn.discordapp.com/app-icons/967250932188463204/98aa49730c12ca36de3a93eae4d2a275.png",
        activities: [
            {
                name: "Radout",
                details: "Pretty rad so far...",
                state: "Scorching Beasts for {playtime-short}",
                images: [
                    {key: "69-2", text: "", enabled: true},
                    {key: "", text: "", enabled: false},
                ],
                buttons: [
                    {url: "https://dekitarpg.com/rpc", label: "Join Game", enabled: true},
                    {url: "", label: "", enabled: false},
                ],
                timestamp: false,
            },
        ]
    }, //   

    {// Druglord
        app_id: "918256300939431958",
        icon: "https://cdn.discordapp.com/app-icons/918256300939431958/1f6db935aeda425e9c92726865c54484.png",
        activities: [
            {
                name: "Druglord",
                details: "Pretty rad so far...",
                state: "Scorching Beasts for {playtime-short}",
                images: [
                    {key: "69-2", text: "", enabled: true},
                    {key: "", text: "", enabled: false},
                ],
                buttons: [
                    {url: "https://dekitarpg.com/rpc", label: "Join Game", enabled: true},
                    {url: "", label: "", enabled: false},
                ],
                timestamp: false,
            },
        ]
    }, //   
    
]