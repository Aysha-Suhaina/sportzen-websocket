import 'dotenv/config';
import 'dotenv/config';
import http from 'http';
import express from 'express';
import { matchRouter } from './routes/matches.js';
import { attachWebSocketServer } from './ws/server.js';
import { securityMiddleware } from './arcjet.js';
import { commentaryRouter } from './routes/commentary.js';

const PORT  = Number(process.env.PORT) || 8000;
const HOST  = process.env.HOST || '0.0.0.0';

const app=express();
const server = http.createServer(app);

app.use(express.json());

app.get('/',(req,res)=>{
    res.send('hello from express server')
});

app.use(securityMiddleware());

app.use('/matches',matchRouter);
app.use('/matches/:id/commentary',commentaryRouter);

const { broadCastMatchCreated, broadcastCommentary } = attachWebSocketServer(server);


app.locals.broadCastMatchCreated = broadCastMatchCreated;
app.locals.broadcastCommentary = broadcastCommentary;
server.listen(PORT, HOST, () => {
    const baseURL = HOST === '0.0.0.0' ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;
    console.log(`server is running on ${baseURL}`);
    console.log(`websocket server is running on ${baseURL.replace("http", "ws")}/ws`);
});