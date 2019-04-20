import * as net from "net";
import { Client } from './client';
import { Util } from './util';
import { Database } from "./database";
import { MysqlError } from "mysql";
import { Crypt } from './shared';
import { Rooms } from "./rooms";
import { LocalCache } from "./inmemory-db/local-cache";
import { Observable, Observer } from 'rxjs';
import { Constants } from './shared';


export class Server {

    private server: net.Server = undefined;

    // Constructor
    constructor() {
        this.server = net.createServer(this.createConnection);
    }

    createConnection(socket: net.Socket): void {
        console.log("new connection established");
        let c: Client = Client.CreateClient(socket);

        socket.on('end', function () {
            c.HandleDisconnect();
        });

        socket.on('error', function (ex) {
            c.HandleDisconnect();
        });

        socket.on('timeout', function () {
            c.HandleDisconnect();
        })

        socket.on('close', function () {
            console.log("Connection Closed");
        });

        socket.on('data', function (data: Buffer) {
            c.HandleConnection(data);
        });
    }

    async Initialize(): Promise<void> {
        try {
            await LocalCache.LoadLobbyList();
            await LocalCache.LoadTitleUpdates(0x1);
            await LocalCache.LoadGameList();
        } catch (err) {
            return err;
        }
    }

    StartLink(port: number): void {


        // Output some debug inforamtion
        Util.Log("LiNK Server v0.2 Alpha");
        Util.Log("Copywrite Phoenix 2019");
        // Load LiNK configuration
        //LoadConfigFile('config.json');

        this.Initialize().then(() => {
            // Start listening for connections
            Util.Log("Listening on port: " + port);
            Util.Log("Connections: 0");
            Util.Log("Awaiting Connections...");

            // Start listening
            this.server.listen(port, function () { });
        }, (err) => {
            Util.Log("An error occurred initializing server data. [ERR: " + err + "]");
        });
    }
}