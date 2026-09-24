# hf_tablet

FiveM 用の統合タブレット NUI ランチャーです。`config.lua` に登録したアプリや、他リソースから動的登録したアプリをタブレット画面から起動できます。

## 現行仕様

- デフォルトは `F9` / `/tablet` で開閉。`Config.OpenKey` で変更可能
- `hf_tablet:client:open` / `close` / `toggle` イベントに対応
- `event`、`server_event`、`export`、`command`、`nui`、`system` の 6 種類
- タブレット全体とアプリ単位のジョブ制限
- アプリ単位の `admin = true` 制限（`hf_bridge:IsAdmin` を使用）
- アイテム所持必須設定、タブレット prop / アニメーション
- 背景色、グリッド、アイコンサイズ、表示順、アニメーション速度を設定可能
- 画面設定とレイアウトをプレイヤー識別子ごとの Resource KVP に保存
- アプリを開く直前にも権限を再確認
- 死亡時・Pause Menu 表示時・リソース停止時にタブレットと NUI focus を解除

## インストール

必須依存関係は次の 3 つです。

- [`hf_bridge`](https://github.com/proneet62/hf_bridge): フレームワーク、インベントリ、callback、通知などの共通 Bridge
- [`hf_assets`](https://github.com/proneet62/hf_assets): Hexa Forge 共通 NUI テーマ、ロゴ、Font Awesome、jQuery
- [`ox_lib`](https://github.com/overextended/ox_lib): FiveM 用共通ライブラリ

各リポジトリを `resources` 配下へ配置し、依存関係より後に起動してください。

```cfg
ensure ox_lib
ensure hf_bridge
ensure hf_assets
ensure hf_tablet
```

`fxmanifest.lua` は互換名として `provide 'in_tablet'` も宣言しています。

`hf_bridge` と `hf_assets` は同じ Hexa Forge 系リソースの公開リポジトリです。`ox_lib` は公式の Overextended リポジトリを使用してください。

## 設定

```lua
Config.OpenKey = 'F9'
Config.RequireItem = false
Config.TabletItem = 'tablet'

-- nil または空テーブルなら全員利用可能
Config.AllowedJobs = nil
-- Config.AllowedJobs = {'police', 'ambulance', 'mechanic'}
```

`Config.Animation` でアニメーション辞書・prop・bone・位置・回転、`Config.UI` で `backgroundColor`、`iconSize`、`grid.columns`、`grid.rows`、`animationSpeed` を変更できます。通知文言は `Config.Notifications` で変更します。

## アプリ登録

アプリは `Config.Apps` に登録します。`home` と `settings` はシステムアプリで、`system = true` のアプリは削除できません。

### クライアントイベント

```lua
{
    id = 'police_mdt', name = 'Police MDT',
    icon = 'fas fa-shield-alt', color = '#3498db',
    type = 'event', trigger = 'police:client:openMDT',
    args = {}, jobs = {'police'}, order = 1,
}
```

### サーバーイベント

```lua
{
    id = 'invoice', name = 'Invoices',
    icon = 'fas fa-file-invoice-dollar', color = '#f39c12',
    type = 'server_event', trigger = 'billing:server:openUI',
    args = {}, order = 2,
}
```

### Export / コマンド

```lua
{
    id = 'banking', name = 'Banking', icon = 'fas fa-university',
    color = '#2ecc71', type = 'export',
    resource = 'qb-banking', export = 'OpenBank', args = {}, order = 3,
}

{
    id = 'garage', name = 'Garage', icon = 'fas fa-car',
    color = '#e74c3c', type = 'command', command = 'garage', order = 4,
}
```

`export` の `args` は配列として指定し、順番どおり渡します。対象リソースが停止中、または export 呼び出しでエラーの場合は通知します。

### NUI イベント

```lua
{
    id = 'phone', name = 'Phone', icon = 'fas fa-mobile-alt',
    color = '#9b59b6', type = 'nui',
    nui = {
        resource = 'qb-phone', -- 表示用情報。起動時の状態確認には使用しません。
        event = 'qb-phone:client:openPhone',
    },
    args = {}, order = 5,
}
```

`nui.event` はクライアントイベントとして実行されます。

## 権限

```lua
{
    id = 'admin_app', name = 'Admin App', icon = 'fas fa-user-shield',
    color = '#c0392b', type = 'command', command = 'adminmenu',
    admin = true, order = 10,
}
```

- `jobs = {'police'}`: 指定ジョブだけ許可
- `admin = true`: `hf_bridge:IsAdmin` が true のプレイヤーだけ許可
- 両方指定: 指定ジョブまたは管理者を許可
- 両方未指定: 全員を許可

管理者判定に失敗した場合は権限を付与しません（fail-closed）。

## 動的登録・削除

```lua
exports['hf_tablet']:RegisterApp({
    id = 'my_app', name = 'My App', icon = 'fas fa-star',
    color = '#ff6b6b', type = 'event',
    trigger = 'my_resource:client:openUI', order = 20,
})
exports['hf_tablet']:RemoveApp('my_app')
```

同じ `id` があれば更新します。イベント版も利用できます。

```lua
TriggerEvent('hf_tablet:client:registerApp', app)
TriggerEvent('hf_tablet:client:removeApp', 'my_app')
```

## Export / イベント一覧

| 種別 | 名前 | 内容 |
| --- | --- | --- |
| Client export | `OpenTablet()` | 開く |
| Client export | `CloseTablet()` | 閉じる |
| Client export | `IsTabletOpen()` | 開いていれば `true` |
| Client export | `RegisterApp(app)` | 追加・同じ ID を更新 |
| Client export | `RemoveApp(appId)` | システムアプリ以外を削除 |
| Client event | `hf_tablet:client:open` | 開く |
| Client event | `hf_tablet:client:close` | 閉じる |
| Client event | `hf_tablet:client:toggle` | 開閉切替 |

## アイテムと `/givetablet`

`Config.RequireItem = true` の場合、インベントリ側に `Config.TabletItem`（デフォルト `tablet`）を登録してください。

`/givetablet [player_id]` はアイテム付与用の補助コマンドです。ただし現行コードでは管理者権限チェックが未実装です。本番利用時は `server/main.lua` のコメント箇所にサーバー側の権限チェックを追加してください。`Config.RequireItem = false` では何も付与しません。

## 保存データ

DB や SQL は使用しません。レイアウトは `hf_tablet:layout:<identifier>`、設定は `hf_tablet:settings:<identifier>` の Resource KVP に保存します。

## トラブルシューティング

- 起動しない: `hf_bridge`、`ox_lib`、`hf_assets` の起動順と F8 コンソールを確認
- アイテム不足: `Config.RequireItem`、`Config.TabletItem`、インベントリのアイテム名を確認
- アプリが表示されない: `Config.AllowedJobs`、`jobs`、`admin`、`order` を確認
- 起動しないアプリがある: イベント / export / コマンド名と対象リソースの起動状態を確認

## ライセンス

MIT License（詳細は [LICENSE](LICENSE) を参照）

## クレジット

Hexa Forge / `hf_bridge` / Font Awesome / jQuery
