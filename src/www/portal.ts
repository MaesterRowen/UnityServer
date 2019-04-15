import * as express from 'express';
import * as expressStatic from 'express-static';
import * as bodyParser from 'body-parser'
//import * as cookieParser from 'cookie-parser';
import { Express, Request, Response } from 'express';
import { Client } from '../../src/client';
import { Util } from '../../src/shared';
import { LocalCache } from '../../src/inmemory-db/local-cache';

export class WebServer {

    private adminServer: Express = express();

    constructor() {

    }

    routes: any = [
        //{ command: "get", url: '/', handler: this.requestWebpage },
        { command: "get", url: '/test', handler: this.resp1 },
        { command: "get", url: '/games', handler: this.requestGames }
    ]

    requestWebpage(request: Request, response: Response) {

    }

    requestGames(request: Request, response: Response) {
        response.end(JSON.stringify(LocalCache.GameList, null, 2));
    }

    resp1(request: Request, response: Response) {
        response.end(JSON.stringify(process.uptime(), null, 2));
    }

    postAuthenticate(request: Request, response: Response) {

        request.body
    }

    StartServer() {

        this.adminServer.use(expressStatic(__dirname + '/public', { showRoot: false }));
        this.adminServer.use(bodyParser.urlencoded({ extended: false }));
        this.adminServer.use(bodyParser.json());

        for (let x of this.routes) {
            if (x.command == "get") {
                this.adminServer.get(x.url, x.handler);
            } else if (x.command == "post") {
                this.adminServer.post(x.url, x.handler);
            }
        }

        this.adminServer.listen(3000);
    }
}