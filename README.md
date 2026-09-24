# Weightly

Weightly は、日々の体重を記録し、短期的な増減に振り回されず**体重のトレンド**を確認するための小さなWebアプリです。

本プロジェクトでは機能数だけでなく、**コード量そのものをシンプルさの指標**として扱います。

## 主な機能

- Google OAuth によるログイン
- 体重の記録
- 記録時刻の自動保存
- 体重・日付・時刻の修正
- 記録の削除
- 30日間の実測体重グラフ
- EWMA による Trend Weight
- 7日変化 / 30日変化
- kg/week / %/week
- 「入力 / 修正 / 可視化」の3画面構成
- PC / モバイル対応

## 本番環境

公開URL:

```text
https://weightly.kinn-kinn.com
```

現在の構成は、フロントエンドとAPIを同じoriginにまとめています。

```text
weightly.kinn-kinn.com
├─ Cloudflare Pages
│  └─ React / Vite
├─ /api/*
│  └─ Cloudflare Pages Functions
└─ Cloudflare D1
   ├─ Better Auth
   └─ weight records
```

Cloudflare上の主なリソース:

| 種類 | 名前 |
| --- | --- |
| Pages Project | `weightly-web` |
| D1 Database | `weightly` |
| Custom Domain | `weightly.kinn-kinn.com` |
| CNAME target | `weightly-web.pages.dev` |

APIを別Workerとして公開する構成ではなく、Pages Functions の `/api/*` として動かしています。

## 技術構成

- React
- Vite
- Better Auth
- Cloudflare Pages
- Cloudflare Pages Functions
- Cloudflare D1
- Wrangler

MVPでは意図的に以下を使用していません。

- ORM
- グラフライブラリ

D1 はSQLを直接利用し、グラフはSVGで描画しています。

## ディレクトリ構成

```text
src/          フロントエンド
worker/       API / D1アクセス / Better Auth
functions/    Pages Functions のルーティング
migrations/   D1 migration
test/         テスト
scripts/      LOC計測など
```

`functions/[[path]].js` は `/api/*` を既存の `worker/` 実装へ渡す薄いラッパーです。

## ローカル開発

### 必要なもの

- Node.js 24+
- Cloudflare アカウント
- D1
- Google OAuth Client

依存関係をインストールします。

```bash
npm install
```

ローカル用設定を作成します。

```bash
cp .env.example .env.local
cp .dev.vars.example .dev.vars
```

D1を作成する場合:

```bash
npx wrangler d1 create weightly
```

返された `database_id` を `wrangler.toml` に設定します。

ローカルD1へmigrationを適用します。

```bash
npx wrangler d1 migrations apply weightly --local
```

APIとフロントエンドを起動します。

```bash
npm run worker:dev
npm run dev
```

デフォルト:

| 対象 | URL |
| --- | --- |
| Frontend | `http://localhost:5173` |
| API | `http://localhost:8787` |

## Google OAuth / Better Auth

Google Cloud Console で Web Application の OAuth Client を作成します。

### 本番環境

**承認済みの JavaScript 生成元**

```text
https://weightly.kinn-kinn.com
```

**承認済みのリダイレクト URI**

```text
https://weightly.kinn-kinn.com/api/auth/callback/google
```

### ローカル環境

JavaScript生成元:

```text
http://localhost:5173
```

Redirect URI:

```text
http://localhost:8787/api/auth/callback/google
```

## Cloudflare Secrets

本番の認証情報は **Pages Project `weightly-web`** に登録します。

```bash
npx wrangler pages secret put BETTER_AUTH_SECRET --project-name=weightly-web
npx wrangler pages secret put GOOGLE_CLIENT_ID --project-name=weightly-web
npx wrangler pages secret put GOOGLE_CLIENT_SECRET --project-name=weightly-web
```

確認:

```bash
npx wrangler pages secret list --project-name=weightly-web
```

> `npx wrangler secret put ...` は通常のWorker向けです。現在の本番APIは Pages Functions 上で動くため、`wrangler pages secret put` を使用します。

Pages側では以下の値も利用します。

```text
BETTER_AUTH_URL=https://weightly.kinn-kinn.com
WEB_ORIGIN=https://weightly.kinn-kinn.com
VITE_API_BASE=
```

`VITE_API_BASE` は空にすることで、ブラウザから同一originの `/api/*` を利用します。

## D1

D1 database:

```text
weightly
```

migration:

```text
migrations/0001_init.sql
```

主なテーブル:

- Better Auth
  - `user`
  - `session`
  - `account`
  - `verification`
  - `rateLimit`
- Weightly
  - `weights`

体重データの更新・削除では `id` だけでなく `user_id` も条件に含め、ログイン中のユーザー以外のレコードを変更できないようにしています。

## Trend Weight

体重の短期的なノイズを抑えるため、EWMA（指数加重移動平均）を使用します。

```text
T_t = α W_t + (1 - α) T_(t-1)
```

現在のMVPでは `α = 0.23` を使用しています。

実測値とTrend Weightの両方を表示することで、1日の増減よりも中期的な傾向を確認しやすくしています。

## シンプルさ / LOC

Weightlyではコード量を設計上の制約として扱います。

```bash
npm run loc
```

計測対象:

- `src/`
- `worker/`
- `functions/`

テストコードは別集計です。

Runtime source の上限は **650 nonblank LOC** で、超えるとCIを失敗させます。

機能を追加する場合も、まず既存コードの整理やWeb Platform / Cloudflare標準機能で代替できないかを検討します。

## テスト・検証

```bash
npm test
npm run build
npm run worker:check
npm run loc
```

CIでは以下を確認します。

- Unit / API tests
- Vite production build
- Wrangler dry-run
- LOC budget

## GitHub

開発はIssueベースで進めます。

- MVP: #1
- Cloudflare deployment: #3
- 日本語ドキュメント整備: #5
