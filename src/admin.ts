//import * as express from 'express';
import express from 'express';
import expressStatic from 'express-static';
import cors from 'cors';
import bodyParser from 'body-parser';

//import * as cookieParser from 'cookie-parser';
import { Express, Request, Response } from 'express';
import { Client } from './client';
import { Util } from './shared';
import { LocalCache } from './inmemory-db/local-cache';

export class WebServer {

    private adminServer: Express = express();

    constructor() {

    }

    routes: any = [
        //{ command: "get", url: '/', handler: this.requestWebpage },
        { command: "get", url: '/test', handler: this.resp1 },
        { command: "get", url: '/games', handler: this.requestGames },
        { command: "get", url: '/clients', handler: this.requestClients }
    ]

    requestWebpage(request: Request, response: Response) {

    }

    requestGames(request: Request, response: Response) {


        response.end(JSON.stringify(LocalCache.GameMap, null, 2));
    }


    requestClients(request: Request, response: Response) {




        response.end(JSON.stringify(Client.Connections.get(72), null, 2));
    }

    resp1(request: Request, response: Response) {
        response.end(JSON.stringify(process.uptime(), null, 2));
    }

    postAuthenticate(request: Request, response: Response) {

        request.body
    }

    StartServer() {

        //this.adminServer.use(expressStatic(__dirname + '/public', { showRoot: false }));
        this.adminServer.use(bodyParser.urlencoded({ extended: false }));
        this.adminServer.use(bodyParser.json());
        this.adminServer.use(cors());

        for (let x of this.routes) {
            if (x.command == "get") {
                this.adminServer.get(x.url, x.handler);
            } else if (x.command == "post") {
                this.adminServer.post(x.url, x.handler);
            }
        }

        this.adminServer.listen(3001);
    }
}