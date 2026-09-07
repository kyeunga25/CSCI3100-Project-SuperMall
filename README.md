# CSCI3100-Project-GroupF5
# SuperMall

This is the README file for the SuperMall, a E-commerce Website project. It provides instructions on how to set up the project, install the necessary dependencies, and start the application.



## Prerequisites

Before getting started, ensure that you have the following software installed on your system:

- Node.js (22.22.3 or newer)
- npm (10 or newer)

## Getting Started

Follow these steps to set up and run the project:

1. Clone the repository:
```bash
git clone https://github.com/kyeunga25/CSCI3100-Project-SuperMall.git
```
2. Install the frontend dependencies:
```bash
cd frontend
npm ci
```
3. Install the backend dependencies:
```bash
cd backend
npm ci
```

## Starting the Application

To start the application, follow these steps:

1. Start the backend server, the server will start running on `http://localhost:5001`:
```bash
cd backend
node app.js
```
2. Start the frontend development server, the frontend app will be accessible at `http://localhost:3000`:
```bash
cd frontend
npm start
```


## 安全驗證 / Security checks

服務啟動只會連線到既有資料庫，不會重新匯入示範資料。手動示範匯入只接受空資料庫，已有資料時會停止。請使用專用的本機測試設定。

Startup connects to the existing database without resetting it. The optional demo initializer refuses non-empty databases. Use dedicated local test configuration.

```bash
cd backend
npm test
cd ../frontend
npm run build
npm run preview
```

後端測試使用模擬資料庫及郵件邊界，不會連線到真實服務。前端以 Vite 建置，輸出仍在 `frontend/build`；預覽網址為 `http://localhost:3000`。

Backend tests isolate database and mail access. Vite keeps the frontend output in `frontend/build`; preview it at `http://localhost:3000`.
