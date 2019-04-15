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

    Initialize(): Observable<void> {
        return Observable.create((observer: Observer<void>) => {

            // Load all of the data from remote database into our Local Cache
            LocalCache.LoadLobbyList(0).subscribe(null, err => {
                observer.error(Constants.ERROR_FAIL);
            }, () => {
                LocalCache.LoadTitleUpdates(0x1).subscribe(null, err => {
                    observer.error(Constants.ERROR_FAIL);
                }, () => {
                    LocalCache.LoadGameList(0x1).subscribe(null, err => {
                        observer.error(Constants.ERROR_FAIL);
                    }, () => {
                        observer.next();
                        observer.complete();
                    });
                });
            });
        });
    }

    StartLink(port: number): void {

        // Output some debug inforamtion
        Util.Log("LiNK Server v0.2 Alpha");
        Util.Log("Copywrite Phoenix 2019");

        // Load LiNK configuration
        //LoadConfigFile('config.json');

        this.Initialize().subscribe(null, (err: number) => {
            Util.Log("An error occrred initializing server data.  [ERR: " + err + "]");
        }, () => {
            // Start listening for connections
            Util.Log("Listening on port: " + port);
            Util.Log("Connections: 0");
            Util.Log("Awaiting Connections...");

            // Start listening
            this.server.listen(port, function () { });
        });
    }
}