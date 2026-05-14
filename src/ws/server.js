import WebSocket, { WebSocketServer } from "ws";
import { wsArcjet } from "../arcjet.js";

const matchSubscribers = new Map();

function subscribe(matchId,socket){
    if(!matchSubscribers.has(matchId)){
        matchSubscribers.set(matchId,new Set());
    }matchSubscribers.get(matchId).add(socket);
}
function unsubscribe(matchId,socket){
    const subscribers=matchSubscribers.get(matchId);
    if(!subscribers)
        return;

    subscribers.delete(socket);
    if(subscribers.size === 0){
        matchSubscribers.delete(matchId);
    }
}

function cleanupSubscriptions(socket){
    for(const matchId of socket.subscriptions){
        unsubscribe(matchId,socket);
    }
    // if(socket.readyState !==WebSocket.OPEN)return;

    // socket.send(JSON.stringify(payload));

}

function broadcastToMatch(matchId,payload){
    const subscribers=matchSubscribers.get(matchId);
    if(!subscribers || subscribers.size === 0)return;

    const message=JSON.stringify(payload);
    //console.log("Broadcast matchId:", matchId, typeof matchId);
    //console.log("Available keys:", [...matchSubscribers.keys()]);

    for(const client of subscribers){
        if(client.readyState === WebSocket.OPEN){
            client.send(message);
        }
    }
}

function broadcastToAll(wss,payload){
    for(const client of wss.clients){
        if(client.readyState === WebSocket.OPEN){
            client.send(JSON.stringify(payload));
        }
    }
}

function sendJson(socket, data) {
    socket.send(JSON.stringify(data));
}

function handleMatchCreated(socket,data){ //match wad a parameter - bt removed now .
    let message;

    try{
        message= JSON.parse(data.toString());
    }catch{
        sendJson(socket,{type:'error',message:'invalid json'});
        return;
    }

    if(message?.type === "subscribe" && Number.isInteger(message.matchId)){
        subscribe(message.matchId,socket);
        socket.subscriptions.add(message.matchId);
        sendJson(socket,{type:'subscribed',matchId:message.matchId});
        return;
    }

    if(message?.type === "unsubscribe" && Number.isInteger(message.matchId)){
        unsubscribe(message.matchId,socket);
        socket.subscriptions.delete(message.matchId);
        sendJson(socket,{type:'unsubscribed',matchId:message.matchId});
        return;
    }

}
export function attachWebSocketServer(server){
    const wss=new WebSocketServer({
        server,
        path:'/ws',
        maxPayload: 1024 * 1024,
    });

    wss.on('connection', async (socket,req)=>{
        socket.subscriptions=new Set();

        sendJson(socket,{type:'connection_established',message:'Welcome to the WebSocket server'});
        socket.on('message', (data) => {
            handleMatchCreated(socket,data);
        });
        socket.on('error', ()=>{
            socket.terminate();
        });

        socket.on('close', ()=>{
            cleanupSubscriptions(socket);
        });


        if(wsArcjet){
            try{
                const decision=await wsArcjet.protect(req);
                if(decision.isDenied()){
                    const code=decision.reason?.isRatelimit() ? 1013 :1008 ;
                    const reason =decision.reason?.isRatelimit() ? 'Rate limit exceeded':'Access denied';

                    socket.close(code,reason);
                }
            }catch(e){
                console.error(' WS protection error', e);
                socket.close(1011,'security server error');
                return;
            }

        }

        sendJson(socket,{type:'Welcome here'});
        socket.on('error',console.error);
    });

    function broadcastMatchCreated(match){
        broadcastToAll(wss,{type:'match_created',data:match});
    }

    function broadcastCommentary(matchId,comments){
        broadcastToMatch(matchId,{type:'commentary_update',data:comments});
    }

    return { broadcastMatchCreated, broadcastCommentary };
}