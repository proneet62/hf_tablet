fx_version 'cerulean'
game 'gta5'
provide 'in_tablet'

author 'Hexa Forge'
description 'Integrated Tablet System - NUI Launcher for Multiple Scripts'
version '1.1.0'
lua54 'yes'

-- Dependencies
dependencies {
    'in_bridge',
    'ox_lib',
    'hf_assets'
}

-- Config
shared_script 'config.lua'

-- Client
client_scripts {
    'client/main.lua',
    'client/apps.lua',
}

-- Server
server_scripts {
    'server/main.lua',
}

-- UI
ui_page 'html/index.html'

files {
    'html/index.html',
    'html/css/*.css',
    'html/js/*.js',
    'html/images/*.png',
    'html/images/*.jpg',
}

-- Exports
client_exports {
    'OpenTablet',
    'CloseTablet',
    'RegisterApp',
    'RemoveApp',
}
