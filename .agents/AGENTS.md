# Running the App (Multiplayer)
When starting the King Bullet application, you MUST run both the backend server and the frontend Vite server simultaneously. 
To do this, simply execute:
```bash
npm start
```
This single command runs `concurrently` under the hood to start both the Node.js Socket.io server and the Vite dev server. Do not run `npm run dev` on its own, as it will result in `ERR_CONNECTION_REFUSED` for the websocket client.
