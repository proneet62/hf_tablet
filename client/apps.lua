-- ============================================
-- App Management System
-- ============================================

local Bridge = exports['in_bridge']:GetBridge()

--- アプリを開く処理
--- @param app table
RegisterNetEvent('hf_tablet:client:openApp', function(app)
    if not app then return end
    
    -- タイプに応じて処理
    if app.type == 'event' then
        -- クライアントイベントをトリガー
        if app.trigger then
            TriggerEvent(app.trigger, app.args or {})
        end
        
    elseif app.type == 'server_event' then
        -- サーバーイベントをトリガー
        if app.trigger then
            TriggerServerEvent(app.trigger, app.args or {})
        end
        
    elseif app.type == 'export' then
        -- エクスポート関数を呼び出し
        if app.resource and app.export then
            if GetResourceState(app.resource) == 'started' then
                local success, result = pcall(function()
                    if app.args and #app.args > 0 then
                        return exports[app.resource][app.export](table.unpack(app.args))
                    else
                        return exports[app.resource][app.export]()
                    end
                end)
                
                if not success then
                    Bridge.Notify(
                        Config.Notifications.appUnavailable.title,
                        'エラー: ' .. tostring(result),
                        'error',
                        5000
                    )
                end
            else
                Bridge.Notify(
                    Config.Notifications.appUnavailable.title,
                    'リソース "' .. app.resource .. '" が起動していません',
                    'error',
                    5000
                )
            end
        end
        
    elseif app.type == 'command' then
        -- コマンドを実行
        if app.command then
            ExecuteCommand(app.command)
        end
        
    elseif app.type == 'nui' then
        -- カスタムNUIを開く
        if app.nui and app.nui.event then
            TriggerEvent(app.nui.event, app.args or {})
        end
    end
end)

--- 動的にアプリを登録（他のリソースから呼び出し可能）
--- @param app table
--- @return boolean
function RegisterApp(app)
    if not app or not app.id or not app.name then
        print('[hf_tablet] ERROR: Invalid app data')
        return false
    end
    
    -- 既存のアプリをチェック
    for i, existingApp in ipairs(Config.Apps) do
        if existingApp.id == app.id then
            print('[hf_tablet] WARNING: App with ID "' .. app.id .. '" already exists. Updating...')
            Config.Apps[i] = app
            return true
        end
    end
    
    -- 新しいアプリを追加
    table.insert(Config.Apps, app)
    print('[hf_tablet] App registered: ' .. app.name)
    
    -- UIを更新（タブレットが開いている場合）
    if exports['hf_tablet']:IsTabletOpen() then
        SendNUIMessage({
            action = 'updateApps',
            apps = GetAvailableApps()
        })
    end
    
    return true
end

--- アプリを削除
--- @param appId string
--- @return boolean
function RemoveApp(appId)
    for i, app in ipairs(Config.Apps) do
        if app.id == appId then
            -- システムアプリは削除不可
            if app.system then
                print('[hf_tablet] ERROR: Cannot remove system app')
                return false
            end
            
            table.remove(Config.Apps, i)
            print('[hf_tablet] App removed: ' .. appId)
            
            -- UIを更新
            if exports['hf_tablet']:IsTabletOpen() then
                SendNUIMessage({
                    action = 'updateApps',
                    apps = GetAvailableApps()
                })
            end
            
            return true
        end
    end
    
    print('[hf_tablet] ERROR: App not found: ' .. appId)
    return false
end

--- 他のリソースからアプリを簡単に登録できるイベント
RegisterNetEvent('hf_tablet:client:registerApp', function(app)
    RegisterApp(app)
end)

--- 他のリソースからアプリを削除できるイベント
RegisterNetEvent('hf_tablet:client:removeApp', function(appId)
    RemoveApp(appId)
end)

-- ============================================
-- Exports
-- ============================================

exports('RegisterApp', RegisterApp)
exports('RemoveApp', RemoveApp)

-- ============================================
-- 使用例（他のリソースから）
-- ============================================

--[[

-- 他のリソースのclient.luaから:

-- 方法1: Export を使う
exports['hf_tablet']:RegisterApp({
    id = 'my_custom_app',
    name = 'My App',
    icon = 'fas fa-star',
    color = '#ff6b6b',
    type = 'event',
    trigger = 'my_resource:client:openUI',
    order = 20,
})

-- 方法2: Event を使う
TriggerEvent('hf_tablet:client:registerApp', {
    id = 'another_app',
    name = 'Another App',
    icon = 'fas fa-rocket',
    color = '#4ecdc4',
    type = 'export',
    resource = 'my_resource',
    export = 'OpenMyUI',
    order = 21,
})

-- アプリを削除
exports['hf_tablet']:RemoveApp('my_custom_app')

]]

-- ============================================
-- 統合例: 人気スクリプトとの連携
-- ============================================

-- これらの統合例はリソース起動時に自動登録されます
-- 必要に応じてコメントを外してください

CreateThread(function()
    Wait(1000)  -- 他のリソースが起動するのを待つ
    
    -- qb-phone との統合
    -- if GetResourceState('qb-phone') == 'started' then
    --     RegisterApp({
    --         id = 'qb_phone_integrated',
    --         name = 'Phone',
    --         icon = 'fas fa-mobile-alt',
    --         color = '#3498db',
    --         type = 'event',
    --         trigger = 'qb-phone:client:openPhone',
    --         order = 50,
    --     })
    -- end
    
    -- okokBanking との統合
    -- if GetResourceState('okokBanking') == 'started' then
    --     RegisterApp({
    --         id = 'okok_banking',
    --         name = 'Banking',
    --         icon = 'fas fa-piggy-bank',
    --         color = '#2ecc71',
    --         type = 'event',
    --         trigger = 'okokBanking:openUI',
    --         order = 51,
    --     })
    -- end
    
    -- ps-mdt との統合（警察専用）
    -- if GetResourceState('ps-mdt') == 'started' then
    --     RegisterApp({
    --         id = 'ps_mdt',
    --         name = 'MDT',
    --         icon = 'fas fa-clipboard',
    --         color = '#3498db',
    --         type = 'export',
    --         resource = 'ps-mdt',
    --         export = 'Open',
    --         jobs = {'police'},
    --         order = 52,
    --     })
    -- end
end)
