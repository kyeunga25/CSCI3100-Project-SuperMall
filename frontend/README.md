# SuperMall 前端 / Frontend

需要 Node.js 22.22.3 或更新版本及 npm 10 或更新版本。使用 npm lockfile 安裝依賴。

Requires Node.js 22.22.3+ and npm 10+. Install from the committed npm lockfile.

```bash
npm ci
npm start
```

開啟 `http://localhost:3000`。開發伺服器只監聽本機；既有後端 API 使用 `http://localhost:5001`。

Open `http://localhost:3000`. The development server listens on loopback, and the existing backend API uses `http://localhost:5001`.

```bash
npm run build
npm run preview
```

Vite 將正式檔案輸出至 `build`。靜態託管需要把產品等深層路由回退到 `index.html`。

Vite writes production assets to `build`. Static hosting must fall back to `index.html` for client routes such as product detail pages.
