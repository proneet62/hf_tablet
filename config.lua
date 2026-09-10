Config = {}

-- ============================================
-- タブレット設定
-- ============================================

-- タブレットを開くキー（デフォルト: F9）
Config.OpenKey = 'F9'  -- https://docs.fivem.net/docs/game-references/controls/

-- タブレットアイテムが必要か（trueの場合、アイテムを所持している必要がある）
Config.RequireItem = true
Config.TabletItem = 'tablet'

-- ジョブ制限（nilまたは{}で全員使用可能）
Config.AllowedJobs = nil
-- 例: Config.AllowedJobs = {'police', 'ambulance', 'mechanic'}

-- タブレットアニメーション
Config.Animation = {
    dict = 'amb@code_human_in_bus_passenger_idles@female@tablet@base',
    anim = 'base',
    prop = 'prop_cs_tablet',
    bone = 60309,
    pos = vector3(0.03, 0.002, -0.0),
    rot = vector3(10.0, 160.0, 0.0),
}

-- ============================================
-- 登録アプリ
-- ============================================

Config.Apps = {
    -- ============================================
    -- システムアプリ（削除・編集不可）
    -- ============================================
    {
        id = 'home',
        name = 'ホーム',
        icon = 'fas fa-home',
        color = '#5C6D85',
        type = 'system',
        system = true,
        order = 0,
    },
    {
        id = 'settings',
        name = '設定',
        icon = 'fas fa-cog',
        color = '#5C6D85',
        type = 'system',
        system = true,
        order = 999,
    },

    -- ============================================
    -- カスタムアプリ（自由に追加・削除可能）
    -- ============================================
    
    -- 【例1】イベントを呼び出すアプリ
    -- {
    --     id = 'police_mdt',
    --     name = 'Police MDT',
    --     icon = 'fas fa-shield-alt',
    --     color = '#3498db',
    --     type = 'event',
    --     trigger = 'police:client:openMDT',  -- クライアントイベント名
    --     jobs = {'police'},  -- 許可ジョブ（未指定でジョブ制限なし）
    --     admin = true,       -- 管理者も許可（未指定/falseで管理者権限なし）
    --     order = 1,
    -- },

    -- 【権限設定】
    -- jobs のみ        → 指定ジョブだけ許可
    -- admin = true     → 管理者だけ許可
    -- 両方指定         → 指定ジョブまたは管理者を許可
    -- 両方未指定       → 全員を許可

    -- 【例2】エクスポートを呼び出すアプリ
    -- {
    --     id = 'banking',
    --     name = 'Banking',
    --     icon = 'fas fa-university',
    --     color = '#2ecc71',
    --     type = 'export',
    --     resource = 'qb-banking',  -- リソース名
    --     export = 'OpenBank',  -- エクスポート関数名
    --     args = {},  -- 引数（必要に応じて）
    --     order = 2,
    -- },

    -- 【例3】コマンドを実行するアプリ
    -- {
    --     id = 'farm',
    --     name = '農場',
    --     icon = 'fa-solid fa-wheat-awn',
    --     color = '#87df71',
    --     type = 'command',
    --     command = 'farm',  -- コマンド名
    --     order = 10,
    -- },
    -- 【例4】サーバーイベントを呼び出すアプリ
    -- {
    --     id = 'invoice',
    --     name = 'Invoices',
    --     icon = 'fas fa-file-invoice-dollar',
    --     color = '#f39c12',
    --     type = 'server_event',
    --     trigger = 'billing:server:openUI',
    --     order = 4,
    -- },

    -- 【例5】カスタムNUIを開くアプリ
    -- {
    --     id = 'phone',
    --     name = 'Phone',
    --     icon = 'fas fa-mobile-alt',
    --     color = '#9b59b6',
    --     type = 'nui',
    --     nui = {
    --         resource = 'qb-phone',  -- NUIを持つリソース名
    --         event = 'qb-phone:client:openPhone',  -- NUI表示イベント
    --     },
    --     order = 5,
    -- },
}

-- ============================================
-- アプリタイプの説明
-- ============================================

--[[
    type = 'event'          → クライアントイベントをトリガー
    type = 'server_event'   → サーバーイベントをトリガー
    type = 'export'         → 他のリソースのエクスポート関数を呼び出し
    type = 'command'        → チャットコマンドを実行
    type = 'nui'            → カスタムNUIを開く（高度）
    type = 'system'         → システムアプリ（編集不可）
    
    【パラメータ】
    - id: 一意のID（必須）
    - name: アプリ名（必須）
    - icon: Font Awesomeアイコン（必須）
    - color: アイコンの色（必須）
    - type: アプリタイプ（必須）
    - order: 表示順序（任意、デフォルト100）
    - jobs: 許可するジョブ名の配列（任意）
    - admin: true で管理者を許可（任意、in_bridge の IsAdmin 判定を使用）
      jobs と admin を両方指定した場合はいずれかを満たせば許可
    - trigger: イベント名（type='event'または'server_event'の場合）
    - resource: リソース名（type='export'の場合）
    - export: エクスポート関数名（type='export'の場合）
    - args: 引数テーブル（任意）
    - command: コマンド名（type='command'の場合）
    - nui: NUI設定テーブル（type='nui'の場合）
]]

-- ============================================
-- UI設定
-- ============================================

Config.UI = {
    -- ホーム画面の背景色
    backgroundColor = '#1a1a1a',
    
    -- アプリアイコンのサイズ
    iconSize = 80,
    
    -- グリッドレイアウト
    grid = {
        columns = 4,  -- 列数
        rows = 3,     -- 行数
    },
    
    -- アニメーション速度（ミリ秒）
    animationSpeed = 300,
}

-- ============================================
-- 通知設定
-- ============================================

Config.Notifications = {
    -- アプリが利用できない場合
    appUnavailable = {
        title = 'エラー',
        message = 'このアプリは現在利用できません',
        type = 'error',
        duration = 3000,
    },
    
    -- アプリ権限制限（ジョブ・管理者）
    jobRestricted = {
        title = 'アクセス拒否',
        message = 'このアプリへのアクセス権限がありません',
        type = 'error',
        duration = 3000,
    },
    
    -- アイテムが必要
    itemRequired = {
        title = 'アイテム不足',
        message = 'タブレットを所持していません',
        type = 'error',
        duration = 3000,
    },
}
