# DotClock

LaMetric Time 風のドットマトリクス時計 Web アプリ。  
[Github Pages - dotclock](https://standard-e8.github.io/dotclock/)

## 特徴

- **45×8** 論理マトリクス (LaMetric Time 2 互換)
- **描画 / ロジック分離** — `Scene` がフレームを生成、`CanvasRenderer` が描画
- **省電力** — 1秒 or 500ms 間隔の `setTimeout` 更新、タブ非表示時は停止、変化のないフレームは再描画しない

## 開発

```bash
npm install
npm run dev
```

## 構成

```
src/
  core/       # アプリ統合・スケジューラ
  logic/      # シーン (時計など) — 描画内容のロジック
  render/     # マトリクス・フォント・Canvas 描画
```

### 新しいシーンを追加する

1. `Scene` インターフェースを実装 (`src/logic/`)
2. `App` の `scenes` に登録
3. `setScene('your-id')` で切替
