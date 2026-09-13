# 時間出裝

給一邊打《傳說對決》、一邊準備會考的國三生看的單頁網站：用數據和 CP 值，討論遊戲、社交、紓壓、睡眠與課業怎麼分配時間。

- 爬星 CP 值試算：勝率、每週排位時數可調
- 睡眠計算機
- 三種「出裝」比較、職業電競的現實門檻
- 自訂時間分配與「下線台詞」產生器（設定只存在瀏覽器本機）

頁面不含任何遊戲 ID 或 UID；時數與週數多為估算，假設與資料來源列在頁尾。

## 結構

```
docs/            靜態網站（無建置步驟）
  index.html
  style.css
  app.js
.github/workflows/deploy-cloudflare-pages.yml
```

## 部署

**GitHub Pages**：由 `main` 分支的 `/docs` 資料夾直接發佈。

**Cloudflare Pages**：每次推送 `docs/` 到 `main`，GitHub Actions 會用 Wrangler 部署到 Cloudflare Pages 專案 `time-build`（第一次執行時自動建立專案）。需要在 repo 設定兩個 secrets，未設定前該工作流程會自動略過：

| Secret | 取得方式 |
|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 儀表板 → 任一網域或 Workers & Pages 頁面右側的 Account ID |
| `CLOUDFLARE_API_TOKEN` | Cloudflare 儀表板 → My Profile → API Tokens → Create Token → Custom token，權限選 **Account → Cloudflare Pages → Edit** |

```bash
gh secret set CLOUDFLARE_ACCOUNT_ID
gh secret set CLOUDFLARE_API_TOKEN
```

設定後到 Actions 手動執行一次 “Deploy to Cloudflare Pages”，或推送任何 `docs/` 變更即可。
