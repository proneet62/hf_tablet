-- ============================================
-- Variables
-- ============================================

local Bridge = exports['in_bridge']:GetBridge()
local isTabletOpen = false
local tabletProp = nil
local tabletDict = Config.Animation.dict
local tabletAnim = Config.Animation.anim

-- プレイヤーのレイアウト・設定キャッシュ
local cachedLayout = nil
local cachedSettings = nil
local cachedAccessContext = nil

-- ============================================
-- Functions
-- ============================================

--- タブレットが開いているかチェック
--- @return boolean
local function IsTabletOpen()
    return isTabletOpen
end

--- タブレットを開く
local function OpenTablet()
    if isTabletOpen then return end
    
    -- アイテムチェック
    if Config.RequireItem then
        Bridge.TriggerCallback('hf_tablet:server:hasTablet', function(hasTablet)
            if not hasTablet then
                Bridge.Notify(
                    Config.Notifications.itemRequired.title,
                    Config.Notifications.itemRequired.message,
                    Config.Notifications.itemRequired.type,
                    Config.Notifications.itemRequired.duration
                )
                return
            end
            
            OpenTabletInternal()
        end)
    else
        OpenTabletInternal()
    end
end

--- タブレットを開く（内部処理）
function OpenTabletInternal()
    local ped = PlayerPedId()
    
    -- アニメーションとPropを表示
    RequestAnimDict(tabletDict)
    while not HasAnimDictLoaded(tabletDict) do
        Wait(100)
    end
    
    -- Prop作成
    local propModel = GetHashKey(Config.Animation.prop)
    RequestModel(propModel)
    while not HasModelLoaded(propModel) do
        Wait(100)
    end
    
    -- アニメーション再生
    TaskPlayAnim(ped, tabletDict, tabletAnim, 3.0, 3.0, -1, 49, 0, false, false, false)
    
    -- Propを手に持たせる
    tabletProp = CreateObject(propModel, 0.0, 0.0, 0.0, true, true, false)
    AttachEntityToEntity(
        tabletProp,
        ped,
        GetPedBoneIndex(ped, Config.Animation.bone),
        Config.Animation.pos.x,
        Config.Animation.pos.y,
        Config.Animation.pos.z,
        Config.Animation.rot.x,
        Config.Animation.rot.y,
        Config.Animation.rot.z,
        true, true, false, true, 1, true
    )
    
    -- サーバーからレイアウト＆設定を取得
    Bridge.TriggerCallback('hf_tablet:server:getLayout', function(layout)
        cachedLayout = layout
        
        Bridge.TriggerCallback('hf_tablet:server:getSettings', function(settings)
            cachedSettings = settings

            Bridge.TriggerCallback('hf_tablet:server:getAccessContext', function(accessContext)
                cachedAccessContext = accessContext or {}

                -- UIを表示（権限のあるアプリだけを送信）
                SendNUIMessage({
                    action = 'openTablet',
                    apps = GetAvailableApps(cachedAccessContext),
                    config = {
                        backgroundColor = Config.UI.backgroundColor,
                        iconSize = Config.UI.iconSize,
                        grid = Config.UI.grid,
                        animationSpeed = Config.UI.animationSpeed,
                    },
                    layout = cachedLayout,
                    settings = cachedSettings,
                })

                SetNuiFocus(true, true)
                isTabletOpen = true
            end)
        end)
    end)
    
    -- コントロール無効化
    CreateThread(function()
        while isTabletOpen do
            DisableControlAction(0, 1, true) -- LookLeftRight
            DisableControlAction(0, 2, true) -- LookUpDown
            DisableControlAction(0, 24, true) -- Attack
            DisableControlAction(0, 25, true) -- Aim
            DisableControlAction(0, 142, true) -- MeleeAttackAlternate
            DisableControlAction(0, 106, true) -- VehicleMouseControlOverride
            Wait(0)
        end
    end)
end

--- タブレットを閉じる
local function CloseTablet()
    if not isTabletOpen then return end
    
    local ped = PlayerPedId()
    
    -- アニメーション停止
    StopAnimTask(ped, tabletDict, tabletAnim, 1.0)
    
    -- Prop削除
    if DoesEntityExist(tabletProp) then
        DeleteObject(tabletProp)
        tabletProp = nil
    end
    
    -- UI非表示
    SendNUIMessage({
        action = 'closeTablet'
    })
    
    SetNuiFocus(false, false)
    isTabletOpen = false
end

--- タブレット開閉トグル
local function ToggleTablet()
    if isTabletOpen then
        CloseTablet()
    else
        OpenTablet()
    end
end

--- 指定アプリを利用できるか判定
--- jobs と admin を両方指定した場合はいずれかを満たせば許可
---@param app table
---@param accessContext table|nil
---@return boolean
local function HasAppAccess(app, accessContext)
    local hasJobRestriction = type(app.jobs) == 'table' and #app.jobs > 0
    local hasAdminRestriction = app.admin == true

    if not hasJobRestriction and not hasAdminRestriction then
        return true
    end

    accessContext = accessContext or {}

    if hasAdminRestriction and accessContext.isAdmin == true then
        return true
    end

    if hasJobRestriction and type(accessContext.job) == 'string' then
        local playerJob = accessContext.job:lower()
        for _, job in ipairs(app.jobs) do
            if type(job) == 'string' and playerJob == job:lower() then
                return true
            end
        end
    end

    return false
end

--- 利用可能なアプリを取得
---@param accessContext table|nil
--- @return table
function GetAvailableApps(accessContext)
    local availableApps = {}

    accessContext = accessContext or cachedAccessContext

    for _, app in ipairs(Config.Apps) do
        if HasAppAccess(app, accessContext) then
            table.insert(availableApps, {
                id = app.id,
                name = app.name,
                icon = app.icon,
                color = app.color,
                type = app.type,
                order = app.order or 100,
                system = app.system or false,
            })
        end
    end

    table.sort(availableApps, function(a, b)
        return a.order < b.order
    end)

    return availableApps
end

-- ============================================
-- NUI Callbacks
-- ============================================

--- NUIからアプリを開くリクエスト
RegisterNUICallback('openApp', function(data, cb)
    local appId = data.appId
    
    -- アプリ設定を取得
    local app = nil
    for _, a in ipairs(Config.Apps) do
        if a.id == appId then
            app = a
            break
        end
    end
    
    if not app then
        cb({ success = false, message = 'App not found' })
        return
    end
    
    -- クリック時にも最新のジョブ・管理者権限を再確認
    Bridge.TriggerCallback('hf_tablet:server:getAccessContext', function(accessContext)
        cachedAccessContext = accessContext or {}

        if not HasAppAccess(app, cachedAccessContext) then
            Bridge.Notify(
                Config.Notifications.jobRestricted.title,
                Config.Notifications.jobRestricted.message,
                Config.Notifications.jobRestricted.type,
                Config.Notifications.jobRestricted.duration
            )
            cb({ success = false, message = 'Access restricted' })
            return
        end

        if app.type == 'system' then
            if app.id == 'home' then
                SendNUIMessage({ action = 'showHome' })
            elseif app.id == 'settings' then
                SendNUIMessage({ action = 'showSettings' })
            end
            cb({ success = true })
            return
        end

        TriggerEvent('hf_tablet:client:openApp', app)
        cb({ success = true })
    end)
end)

--- NUIからタブレットを閉じるリクエスト
RegisterNUICallback('closeTablet', function(data, cb)
    CloseTablet()
    cb({ success = true })
end)

--- NUIから設定を保存
RegisterNUICallback('saveSettings', function(data, cb)
    local settingsData = data.settings
    if not settingsData then
        cb({ success = false })
        return
    end
    
    cachedSettings = settingsData
    
    Bridge.TriggerCallback('hf_tablet:server:saveSettings', function(success)
        cb({ success = success })
    end, settingsData)
end)

--- NUIからレイアウトを保存
RegisterNUICallback('saveLayout', function(data, cb)
    local layoutData = data.layout
    if not layoutData then
        cb({ success = false })
        return
    end
    
    cachedLayout = layoutData
    
    Bridge.TriggerCallback('hf_tablet:server:saveLayout', function(success)
        cb({ success = success })
    end, layoutData)
end)

-- ============================================
-- Events
-- ============================================

--- タブレットを開く（イベント）
RegisterNetEvent('hf_tablet:client:open', function()
    OpenTablet()
end)

--- タブレットを閉じる（イベント）
RegisterNetEvent('hf_tablet:client:close', function()
    CloseTablet()
end)

--- タブレット開閉トグル（イベント）
RegisterNetEvent('hf_tablet:client:toggle', function()
    ToggleTablet()
end)

-- ============================================
-- Key Mapping
-- ============================================

RegisterKeyMapping('tablet', 'Open Tablet', 'keyboard', Config.OpenKey)
RegisterCommand('tablet', function()
    ToggleTablet()
end, false)

-- ============================================
-- Exports
-- ============================================

exports('OpenTablet', OpenTablet)
exports('CloseTablet', CloseTablet)
exports('IsTabletOpen', IsTabletOpen)

-- ============================================
-- Cleanup
-- ============================================

--- プレイヤーが死亡したらタブレットを閉じる
CreateThread(function()
    while true do
        Wait(1000)
        
        if isTabletOpen then
            local ped = PlayerPedId()
            if IsEntityDead(ped) or IsPauseMenuActive() then
                CloseTablet()
            end
        end
    end
end)

--- リソース停止時のクリーンアップ
AddEventHandler('onClientResourceStop', function(resourceName)
    if GetCurrentResourceName() ~= resourceName then return end

    if isTabletOpen then CloseTablet() end
    SetNuiFocus(false, false)
    SetNuiFocusKeepInput(false)
    isTabletOpen = false
end)
