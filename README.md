# 📱 hf_tablet - 統合タブレットシステム

qb-radialmenuのように、config.luaに登録するだけで他のスクリプトのNUIを開けるタブレットシステム

## 🌟 特徴

- **簡単な統合**: config.luaに数行追加するだけで他のスクリプトと統合
- **複数のトリガータイプ対応**: イベント、エクスポート、コマンド、NUI
- **アプリ別権限**: ジョブ・管理者ごとにアプリへのアクセスを設定可能
- **動的アプリ登録**: 実行時に他のリソースからアプリを追加/削除可能
- **モダンUI**: アニメーション付きの美しいタブレットUI
- **in_bridge統合**: Bridgeシステムと完全統合

## 📦 インストール

### 1. ファイル配置

```
[your-server]/resources/hf_tablet/
```

### 2. server.cfg に追加

```cfg
ensure ox_lib
ensure in_bridge
ensure hf_assets
ensure hf_tablet
```

### 3. 依存関係

- `in_bridge` (必須)
- `ox_lib` (必須)
- `hf_assets` (必須)

## 🎮 使用方法

### タブレットを開く

- **キー**: `F9` (デフォルト、config.luaで変更可能)
- **コマンド**: `/tablet`
- **イベント**: `TriggerEvent('hf_tablet:client:toggle')`

## ⚙️ Config設定

### 基本設定

```lua
-- タブレットを開くキー
Config.OpenKey = 'F9'

-- アイテムが必要か
Config.RequireItem = false
Config.TabletItem = 'tablet'

-- ジョブ制限（nilで全員使用可能）
Config.AllowedJobs = nil
-- 例: Config.AllowedJobs = {'police', 'ambulance'}
```

### アプリの登録

#### 1. イベントを呼び出すアプリ

```lua
{
    id = 'police_mdt',
    name = 'Police MDT',
    icon = 'fas fa-shield-alt',
    color = '#3498db',
    type = 'event',
    trigger = 'police:client:openMDT',
    jobs = {'police'},
    order = 1,
}
```

#### 2. エクスポートを呼び出すアプリ

```lua
{
    id = 'banking',
    name = 'Banking',
    icon = 'fas fa-university',
    color = '#2ecc71',
    type = 'export',
    resource = 'qb-banking',
    export = 'OpenBank',
    args = {},
    order = 2,
}
```

#### 3. コマンドを実行するアプリ

```lua
{
    id = 'garage',
    name = 'Garage',
    icon = 'fas fa-car',
    color = '#e74c3c',
    type = 'command',
    command = 'garage',
    order = 3,
}
```

#### 4. サーバーイベントを呼び出すアプリ

```lua
{
    id = 'invoice',
    name = 'Invoices',
    icon = 'fas fa-file-invoice-dollar',
    color = '#f39c12',
    type = 'server_event',
    trigger = 'billing:server:openUI',
    order = 4,
}
```

## 🔧 他のリソースとの統合

### 方法1: Export を使う

```lua
-- 他のリソースのclient.luaから
exports['hf_tablet']:RegisterApp({
    id = 'my_custom_app',
    name = 'My App',
    icon = 'fas fa-star',
    color = '#ff6b6b',
    type = 'event',
    trigger = 'my_resource:client:openUI',
    order = 20,
})
```

### 方法2: Event を使う

```lua
-- 他のリソースのclient.luaから
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
```

### アプリを削除

```lua
exports['hf_tablet']:RemoveApp('my_custom_app')
```

## 📚 アプリタイプ一覧

| タイプ | 説明 | 必須パラメータ |
|--------|------|----------------|
| `event` | クライアントイベントをトリガー | `trigger` |
| `server_event` | サーバーイベントをトリガー | `trigger` |
| `export` | 他リソースのエクスポート呼び出し | `resource`, `export` |
| `command` | チャットコマンドを実行 | `command` |
| `nui` | カスタムNUIを開く | `nui.event` |
| `system` | システムアプリ（編集不可） | - |

## 🎨 アイコン

Font Awesome 6を使用しています: https://fontawesome.com/icons

例:
- `fas fa-home` - ホーム
- `fas fa-shield-alt` - 警察
- `fas fa-university` - 銀行
- `fas fa-car` - 車両
- `fas fa-mobile-alt` - 電話

## 🔐 権限システム

### ジョブ制限

```lua
{
    id = 'police_app',
    name = 'Police App',
    icon = 'fas fa-shield',
    color = '#3498db',
    type = 'event',
    trigger = 'police:openApp',
    jobs = {'police', 'sheriff'},  -- 警察と保安官のみ
    order = 1,
}
```

### 管理者制限

`admin = true` を指定すると、`in_bridge` の `IsAdmin` 判定を通過した管理者だけが利用できます。

```lua
{
    id = 'admin_app',
    name = 'Admin App',
    icon = 'fas fa-user-shield',
    color = '#c0392b',
    type = 'command',
    command = 'adminmenu',
    admin = true,
    order = 2,
}
```

`jobs` と `admin = true` を同じアプリに指定した場合は、指定ジョブまたは管理者のどちらかに該当すれば利用できます。どちらも指定しないアプリは従来どおり全員に表示されます。

### アイテム制限

```lua
-- config.lua
Config.RequireItem = true
Config.TabletItem = 'tablet'
```

タブレットアイテムをインベントリに追加:
```lua
-- アイテムデータベース（qb-core/shared/items.lua など）
['tablet'] = {
    ['name'] = 'tablet',
    ['label'] = 'Tablet',
    ['weight'] = 2000,
    ['type'] = 'item',
    ['image'] = 'tablet.png',
    ['unique'] = false,
    ['useable'] = true,
    ['shouldClose'] = true,
    ['description'] = 'A modern tablet device'
},
```

## 🎯 実装例

### 例1: qb-policejob との統合

```lua
-- hf_tablet/config.lua
{
    id = 'police_mdt',
    name = 'Police MDT',
    icon = 'fas fa-laptop',
    color = '#3498db',
    type = 'event',
    trigger = 'police:client:openMDT',
    jobs = {'police'},
    order = 1,
}
```

### 例2: qb-banking との統合

```lua
{
    id = 'banking',
    name = 'Bank',
    icon = 'fas fa-university',
    color = '#2ecc71',
    type = 'export',
    resource = 'qb-banking',
    export = 'OpenBank',
    order = 2,
}
```

### 例3: カスタムリソースとの統合

```lua
-- あなたのリソースの fxmanifest.lua
dependencies {
    'hf_tablet'
}

-- あなたのリソースの client.lua
CreateThread(function()
    Wait(1000)
    
    exports['hf_tablet']:RegisterApp({
        id = 'my_awesome_app',
        name = 'My Awesome App',
        icon = 'fas fa-star',
        color = '#e74c3c',
        type = 'event',
        trigger = 'myresource:client:openUI',
        order = 50,
    })
end)

-- UIを開くイベント
RegisterNetEvent('myresource:client:openUI', function()
    -- あなたのNUIを開く処理
    SetNuiFocus(true, true)
    SendNUIMessage({
        action = 'show'
    })
end)
```

## 🛠️ 管理コマンド

### タブレットを付与

```
/givetablet [player_id]
```

## 🎨 UI カスタマイズ

### 色の変更

```lua
Config.UI = {
    backgroundColor = '#1a1a1a',  -- 背景色
    iconSize = 80,                -- アイコンサイズ
    grid = {
        columns = 4,              -- 列数
        rows = 3,                 -- 行数
    },
    animationSpeed = 300,         -- アニメーション速度
}
```

## 🐛 トラブルシューティング

### アプリが表示されない

1. リソースが起動しているか確認
2. ジョブ制限を確認
3. F8コンソールでエラーを確認

### アプリをクリックしても何も起こらない

1. イベント/エクスポート名が正しいか確認
2. 対象リソースが起動しているか確認
3. F8コンソールでエラーを確認

### タブレットが開かない

1. `in_bridge` が起動しているか確認
2. アイテム設定を確認（RequireItem = true の場合）
3. キーマッピングを確認

## 📝 更新履歴

### v1.1.0 (2026)
- アプリ別の管理者権限（`admin = true`）を追加
- ジョブ権限によるアプリ表示フィルタを修正
- アプリ起動時に最新のジョブ・管理者権限を再確認

### v1.0.0 (2025)
- 初回リリース
- 基本機能実装
- 5つのアプリタイプ対応
- 動的アプリ登録
- ジョブ制限システム

## 🤝 サポート

問題や質問がある場合は、GitHubのIssuesで報告してください。

## 📄 ライセンス

MIT License

## 🙏 クレジット

- in_bridge システム
- Font Awesome アイコン
- jQuery ライブラリ
