-- ============================================
-- Server Side
-- ============================================

local Bridge = exports['in_bridge']:GetBridge()

--- in_bridge の管理者判定を安全に呼び出す
--- 判定できない場合は権限を付与しない（fail-closed）
---@param source number
---@return boolean
local function IsAdmin(source)
    local ok, isAdmin = pcall(function()
        return Bridge.IsAdmin(source)
    end)

    return (ok and isAdmin) and true or false
end

-- ============================================
-- Callbacks
-- ============================================

--- タブレットアイテムを所持しているかチェック
Bridge.RegisterCallback('hf_tablet:server:hasTablet', function(source, cb)
    if not Config.RequireItem then
        cb(true)
        return
    end
    
    local hasItem = Bridge.HasItem(source, Config.TabletItem, 1)
    cb(hasItem)
end)

--- プレイヤーのジョブを取得
Bridge.RegisterCallback('hf_tablet:server:getPlayerJob', function(source, cb)
    local job, grade = Bridge.GetJob(source)
    cb(job)
end)

--- アプリ権限判定に使用するプレイヤー情報を取得
Bridge.RegisterCallback('hf_tablet:server:getAccessContext', function(source, cb)
    local job = Bridge.GetJob(source)

    cb({
        job = job,
        isAdmin = IsAdmin(source),
    })
end)

--- プレイヤーがジョブアクセス権を持っているかチェック
Bridge.RegisterCallback('hf_tablet:server:hasJobAccess', function(source, cb, allowedJobs)
    if not allowedJobs or #allowedJobs == 0 then
        cb(true)
        return
    end
    
    local playerJob, grade = Bridge.GetJob(source)
    
    for _, job in ipairs(allowedJobs) do
        if playerJob == job then
            cb(true)
            return
        end
    end
    
    cb(false)
end)

-- ============================================
-- Layout & Settings Persistence (KVP)
-- ============================================

--- レイアウトデータを取得
--- @param identifier string
--- @return table|nil
local function GetPlayerLayout(identifier)
    local key = 'hf_tablet:layout:' .. identifier
    local data = GetResourceKvpString(key)
    if data and data ~= '' then
        local decoded = json.decode(data)
        return decoded
    end
    return nil
end

--- レイアウトデータを保存
--- @param identifier string
--- @param layoutData table
local function SavePlayerLayout(identifier, layoutData)
    local key = 'hf_tablet:layout:' .. identifier
    local encoded = json.encode(layoutData)
    SetResourceKvp(key, encoded)
end

--- 設定データを取得
--- @param identifier string
--- @return table|nil
local function GetPlayerSettings(identifier)
    local key = 'hf_tablet:settings:' .. identifier
    local data = GetResourceKvpString(key)
    if data and data ~= '' then
        local decoded = json.decode(data)
        return decoded
    end
    return nil
end

--- 設定データを保存
--- @param identifier string
--- @param settingsData table
local function SavePlayerSettings(identifier, settingsData)
    local key = 'hf_tablet:settings:' .. identifier
    local encoded = json.encode(settingsData)
    SetResourceKvp(key, encoded)
end

--- レイアウトを取得するコールバック
Bridge.RegisterCallback('hf_tablet:server:getLayout', function(source, cb)
    local identifier = Bridge.GetIdentifier(source)
    if not identifier then
        cb(nil)
        return
    end
    local layout = GetPlayerLayout(identifier)
    cb(layout)
end)

--- レイアウトを保存するコールバック
Bridge.RegisterCallback('hf_tablet:server:saveLayout', function(source, cb, layoutData)
    local identifier = Bridge.GetIdentifier(source)
    if not identifier then
        cb(false)
        return
    end
    SavePlayerLayout(identifier, layoutData)
    cb(true)
end)

--- 設定を取得するコールバック
Bridge.RegisterCallback('hf_tablet:server:getSettings', function(source, cb)
    local identifier = Bridge.GetIdentifier(source)
    if not identifier then
        cb(nil)
        return
    end
    local settings = GetPlayerSettings(identifier)
    cb(settings)
end)

--- 設定を保存するコールバック
Bridge.RegisterCallback('hf_tablet:server:saveSettings', function(source, cb, settingsData)
    local identifier = Bridge.GetIdentifier(source)
    if not identifier then
        cb(false)
        return
    end
    SavePlayerSettings(identifier, settingsData)
    cb(true)
end)

-- ============================================
-- Events
-- ============================================

--- プレイヤーにタブレットを付与
RegisterNetEvent('hf_tablet:server:giveTablet', function()
    local source = source
    
    if Config.RequireItem then
        if Bridge.AddItem(source, Config.TabletItem, 1) then
            Bridge.Notify(
                'タブレット取得',
                'タブレットを入手しました',
                'success',
                3000
            )
        end
    end
end)

-- ============================================
-- Commands
-- ============================================

--- タブレットを付与するコマンド（管理者用）
RegisterCommand('givetablet', function(source, args, rawCommand)
    local targetId = tonumber(args[1]) or source
    
    -- 権限チェック（管理者のみ）
    if source ~= 0 then  -- サーバーコンソールでない場合
        -- ここに管理者チェックを追加
        -- 例: if not IsPlayerAceAllowed(source, 'command.givetablet') then return end
    end
    
    if Config.RequireItem then
        Bridge.AddItem(targetId, Config.TabletItem, 1)
        print(('[hf_tablet] Tablet given to player %s'):format(targetId))
    end
end, false)

-- ============================================
-- Logging
-- ============================================

--- アプリ使用ログ（オプション）
RegisterNetEvent('hf_tablet:server:logAppUsage', function(appId, appName)
    local source = source
    local playerName = Bridge.GetPlayerName(source)
    local identifier = Bridge.GetIdentifier(source)
    
    -- ログを記録
    Bridge.Log(
        source,
        'tablet_app_usage',
        ('%s opened app: %s'):format(playerName, appName),
        {
            appId = appId,
            identifier = identifier,
        }
    )
    
    -- Discord Webhook（オプション）
    -- Bridge.SendDiscordLog(
    --     'YOUR_WEBHOOK_URL',
    --     'Tablet Logger',
    --     'App Usage',
    --     {
    --         {name = 'Player', value = playerName, inline = true},
    --         {name = 'App', value = appName, inline = true},
    --     },
    --     0x3498DB
    -- )
end)

-- ============================================
-- Startup
-- ============================================

CreateThread(function()
    print('[hf_tablet] Server initialized')
end)
