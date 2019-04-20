import { net, crypto, User, Constants, Crypt, Util } from './shared';
import { DTPacketHeader, DTPayloadHeader } from "./data-stuctures/headers";
import { DTRConnect, DTQConnect, DTQPing, DTRPong, DTQGetLobbies } from './data-stuctures/messages';
import { DTQAuthenticate } from './data-stuctures/commands/connection';
import { DTRAuthStatus } from './data-stuctures/responses/connection';
import { Struct } from './data-stuctures/struct';
import { DTRError } from './data-stuctures/responses/system';
import { userInfo } from 'os';
import { Rooms, ILobbyInfo } from './rooms';
import { Database } from './database';
import { DTRLobbyList, DTRTUVersions, DTRGameInfo } from './data-stuctures/responses/systemlink';
import { DTQGetTUVersions, DTQUpdateGame, DTQGetRooms } from './data-stuctures/commands/systemlink';
import { ITitleUpdate, IGameInfo, LocalCache } from './inmemory-db/local-cache';
import HashMap from 'hashmap';

interface ICommand {
    enc: boolean;
    auth: boolean;
    func: any;
}

export class Client {
    //public static Connections: Client[] = [];
    public static Connections: HashMap<number, Client> = new HashMap();
    private recvBuffer: Buffer = null;
    private receivingPacketPayload: boolean = false;
    private packetBytesReceived: number = 0;
    private socket: net.Socket = null;
    private user: User = null;
    private clientCrypto: Crypt = null;
    private encryptedClient: boolean = false;
    private commandMap: ICommand[] = [];

    static CreateClient(socket: net.Socket) {
        return new Client(socket);
    }

    private constructor(socket: net.Socket) {
        this.socket = socket;
        this.recvBuffer = Buffer.alloc(0, 0);


        // Initialize Crypto
        this.clientCrypto = new Crypt();

        this.user = User.CreateUser();

        // Generate a map of all of valid commands
        this.generateCommandMap();
    }


    private generateCommandMap(): void {
        this.commandMap['CONN'] = { enc: false, auth: false, func: this.processCommand_Connect };
        this.commandMap['AUTH'] = { enc: true, auth: false, func: this.processCommand_Authenticate };
        this.commandMap['PING'] = { enc: true, auth: false, func: this.processCommand_Ping };
        this.commandMap['LBYS'] = { enc: true, auth: true, func: this.processCommand_GetLobbies };
        this.commandMap['GTUV'] = { enc: true, auth: true, func: this.processCommand_GetTUVersions };
        this.commandMap['GAME'] = { enc: true, auth: true, func: this.processCommand_UpdateGame };
        this.commandMap['GRMS'] = { enc: true, auth: true, func: this.processCommand_GetRooms };
    }

    private resetBuffers(): void {
        this.recvBuffer = Buffer.alloc(0, 0x00);
        this.packetBytesReceived = 0;
    }

    GetUser(): User {
        return this.user;
    }

    GetPort(): number {
        return this.socket.remotePort;
    }

    IsEncrypted(): boolean {
        return this.encryptedClient;
    }

    HandleDisconnect(): void {
        // Remove connection from connection array
        //if (Client.Connections[500] != null) {
        //    Util.Log('removing connection');
        //    delete Client.Connections[500];
        /// }
    }

    HandleConnection(incomingData: Buffer): void {

        // Add this data into onto our receiving buffer
        this.recvBuffer = Buffer.concat([this.recvBuffer, incomingData]);
        this.packetBytesReceived += incomingData.length;

        // If our buffer length is not long enough for a single packet header, then keep waiting for data
        if (this.recvBuffer.length < Constants.PACKET_HEADERSIZE) {
            return;
        }

        // Split off the data header to be processed
        let headerData: DTPacketHeader = new DTPacketHeader(this.recvBuffer.slice(0, Constants.PACKET_HEADERSIZE));
        if (headerData.Get("Magic") != Constants.PACKET_MAGIC || headerData.Get("Version") != Constants.PACKET_VERSION ||
            headerData.Get("Direction") > Constants.SERVER_ENCRYPTED || headerData.Get("Direction") < Constants.CLIENT_DECRYPTED) {
            // Recieved invalid packet, so let's reset our recv buffer
            Util.Log("Header packet was not valid.  Rejected.");
            this.recvBuffer = Buffer.alloc(0, 0);
            return;
        }

        // Now determine if have obtained enough data for the payload
        if (headerData.Get("PayloadSize") > this.recvBuffer.length) {
            // Continue recieving data
            return;
        }

        // At this point, we want to split off the packet payload from our buffer
        let dataBuffer: Buffer = this.recvBuffer.slice(0, headerData.Get("PayloadSize")).slice(Constants.PACKET_HEADERSIZE);

        // Restock extra bytes for use in next packet
        if (this.recvBuffer.length > headerData.Get("PayloadSize")) {
            this.recvBuffer = this.recvBuffer.slice(headerData.Get("PayloadSize"));
        }

        // Generate a hash of hte payload to verify validity
        let hash: string = Crypt.CreateSha1Hash(dataBuffer);
        if (headerData.Get("Hash") != hash) {
            Util.Log("Hash verification failed");
            this.resetBuffers();
            return;
        }

        // Determine whether or not the payload is encrypted
        if (headerData.Get("Direction") == Constants.CLIENT_ENCRYPTED) {
            let iv: Buffer = dataBuffer.slice(0, Constants.IV_SIZE);
            dataBuffer = this.clientCrypto.AESDecrypt(dataBuffer.slice(Constants.IV_SIZE), iv);
        }

        Util.Log('databuffer> ' + dataBuffer.toString('hex'));

        // Separate payload eader and payload data for parsing
        let payloadHeader: DTPayloadHeader = new DTPayloadHeader(dataBuffer.slice(0, Constants.PAYLOAD_HEADERSIZE));
        let payloadData: Buffer = dataBuffer.slice(Constants.PAYLOAD_HEADERSIZE, payloadHeader.Get("PayloadSize"));

        // Next, verify that the payload is valid
        if (payloadHeader.Get("Magic") != Constants.PAYLOAD_MAGIC || payloadHeader.Get("Version") != Constants.PAYLOAD_VERSION) {
            Util.Log("Payload header is not valid.  Discarding message");
            this.resetBuffers();
            return;
        }

        if (payloadData.length != (payloadHeader.Get("PayloadSize") - Constants.PAYLOAD_HEADERSIZE)) {
            Util.Log("Payload Data size did not match.   Header: " + payloadHeader.Get("PayloadSize") + ", Data: " + payloadData.length);
            this.resetBuffers();
            return;
        }

        // Finally, before processing any commands, we need to verify the comand is valid and that the client state is valid
        let cmdid: string = payloadHeader.Get("CommandID");
        let msguid: number = payloadHeader.Get("MessageUID");
        let flags: number = payloadHeader.Get("Flags");

        Util.Log("[RECV] Processing command '" + cmdid + "' with size of " + payloadData.length + " bytes.");
        Util.Log("[RECV] [" + payloadData.toString("hex") + "]");

        // Check if the command is contained in our command map
        if (cmdid in this.commandMap) {
            let command: ICommand = this.commandMap[cmdid];
            if (command.enc == true && this.IsEncrypted() == false) {
                Util.Log("Command '" + cmdid + "' requires an encrypted connection.");
            } else if (command.auth == true && this.user.IsAuthenticated() == false) {
                this.xmitErrorMsg(cmdid, msguid, Constants.ERROR_NOAUTH);
            } else {
                // Run our command callback function
                command.func(this, payloadData, msguid);
            }
        } else {
            Util.Log("Command '" + cmdid + "' is not valid.");
        }

        // Clean up our receive buffer
        this.recvBuffer = Buffer.alloc(0, 0x00);
        this.packetBytesReceived = 0;
    }

    private buildHeaders(cmdid: string, msguid: number, data: Buffer): Buffer {
        Util.Log("[XMIT] Building headers for " + cmdid + " size:  " + data.length);

        // Setup the packet header
        let packetHeader: DTPacketHeader = new DTPacketHeader();
        packetHeader.Set("Magic", Constants.PACKET_MAGIC);
        packetHeader.Set("Direction", this.IsEncrypted() ? Constants.SERVER_ENCRYPTED : Constants.SERVER_DECRYPTED);
        packetHeader.Set("Version", Constants.PACKET_VERSION);

        // Setup the payload header
        let payloadHeader: DTPayloadHeader = new DTPayloadHeader();
        payloadHeader.Set("Magic", Constants.PAYLOAD_MAGIC);
        payloadHeader.Set("Version", Constants.PAYLOAD_VERSION);
        payloadHeader.Set("CommandID", cmdid);
        payloadHeader.Set("MessageUID", msguid);
        payloadHeader.Set("PayloadSize", Constants.PAYLOAD_HEADERSIZE + data.length);

        // Concatenate the data onto the payload
        let dataBuffer: Buffer = Buffer.concat([payloadHeader.GetBuffer(), data]);
        if (this.IsEncrypted()) {
            dataBuffer = this.clientCrypto.AESEncrypt(dataBuffer);
        }

        // Get the Sha1 of the payload + payload header for the packet
        let hashBuffer: Buffer = Crypt.CreateSha1HashBuffer(dataBuffer);
        packetHeader.Set("Hash", hashBuffer);

        // Next, calculate the packet header size
        packetHeader.Set("PayloadSize", Constants.PACKET_HEADERSIZE + dataBuffer.length);

        // Finally, combine all of the buffers into a single output
        return Buffer.concat([packetHeader.GetBuffer(), dataBuffer]);
    }

    private xmitStruct(command: Struct, msguid: number): void {
        let sendBuffer: Buffer = this.buildHeaders(command.GetCommandId(), msguid, command.GetBuffer());
        this.socket.write(sendBuffer, 'utf8', (err?: Error) => {
            // A transmission error occurred
            if (err) {
                Util.Log("a transmission error ocurred.  " + err.message);
            }
        });
    }
    private xmitPackage(cmdid: string, msguid: number, data: Buffer): void {
        let sendBuffer: Buffer = this.buildHeaders(cmdid, msguid, data);
        this.socket.write(sendBuffer, 'utf8', (err?: Error) => {
            // A transmission error occurred
            if (err) {
                Util.Log("a transmission error ocurred.  " + err.message);
            }
        });
    }

    xmitErrorMsg(cmdid: string, msguid: number, status: number, dataLo: number = 0, dataHi: number = 0): void {
        // Construct error resposne
        let xmit: DTRError = new DTRError();
        xmit.Set("CommandId", cmdid);
        xmit.Set("ErrorCode", status);
        xmit.Set("ErrorDataHi", dataHi);
        xmit.Set("ErrorDataLo", dataLo);

        // Transmit error data
        this.xmitStruct(xmit, msguid);
    }

    processCommand_Connect(context: Client, data: Buffer, msguid: number): void {

        let c: DTQConnect = new DTQConnect(data);
        let version: number = c.Get("ServiceVersion");
        let otherKey: Buffer = Buffer.from(c.Get("PublicKey"), 'hex');

        if (version != Constants.LINK_VERSION) {
            // Error
            Util.Log("invalid version");
            return;
        }

        if (otherKey.length != 96) {
            Util.Log("Invalid public key");
            return;
        }

        // Generate our client keys
        context.clientCrypto.GenerateKeys(otherKey);

        // Transmit our public key
        let xmit: DTRConnect = new DTRConnect();
        xmit.Set("PublicKey", context.clientCrypto.GetPublicKey());
        context.xmitStruct(xmit, msguid);

        // Send client our public key
        context.encryptedClient = true;
    }

    processCommand_Ping(context: Client, data: Buffer, msguid: number): void {
        let c: DTQPing = new DTQPing(data);
        let magic: string = c.Get("Magic");

        if (magic == "PING") {
            let xmit: DTRPong = new DTRPong();
            xmit.Set("Magic", "PONG");
            context.xmitStruct(xmit, msguid);

            // Update user timeout duration
        }
        else {
            // Send error code
        }
    }

    processCommand_Authenticate(context: Client, data: Buffer, msguid: number): void {
        let c: DTQAuthenticate = new DTQAuthenticate(data);

        // First, let's verify if the user is already connected, and if so, disconnect them
        context.user.ValidateUser(c.Get("Username"), c.Get("APIKey"), (status: number, id: number) => {
            // If our user was valid, check and currently connected, then disconnect them
            if (status == Constants.ERROR_SUCCESS && Client.Connections.has(id)) {
                Util.Log("User '" + id + "' is currently connected.  Sending disconnect.");
                // TODO:  Client.Connections[id].SendDisconnect();
            }

            // Now, let's authenticate this user
            context.user.Authenticate(c.Get("Username"), c.Get("APIKey"), c.Get("GamerTag"), c.Get("Flags"), (status: number) => {
                if (status == Constants.ERROR_SUCCESS) {
                    // Authentication successful, so add client to list
                    Client.Connections.set(context.user.GetId(), context);


                    // Create our authorization response
                    let xmit: DTRAuthStatus = new DTRAuthStatus();
                    xmit.Set("PlayerId", context.user.GetId());
                    xmit.Set("UserPermissions", context.user.GetFlags());

                    // Dispatch struct
                    context.xmitStruct(xmit, msguid);
                } else {

                    // Transmit our error message
                    context.xmitErrorMsg(c.GetCommandId(), msguid, status);
                }
            });
        });
    }


    processCommand_GetLobbies(context: Client, data: Buffer, msguid: number): void {
        let c: DTQGetLobbies = new DTQGetLobbies(data);

        Rooms.GetLobbyList(c.Get("Flags"), (status: number, data?: ILobbyInfo[]) => {
            let xmit: DTRLobbyList = new DTRLobbyList();
            if (status == Constants.ERROR_SUCCESS && data != null) {
                for (let x: number = 0; x < data.length; x++) {
                    //Util.PrintObject(data[x]);
                    xmit.AddRoom(data[x]);
                }
                // Update room count
                xmit.UpdateRoomCount();

                // Send the packet
                context.xmitStruct(xmit, msguid);
            } else {

                // Send the error message back to the client
                context.xmitErrorMsg(c.GetCommandId(), msguid, Constants.ERROR_FAIL);
            }
        });
    }

    processCommand_GetTUVersions(context: Client, data: Buffer, msguid: number): void {
        let c: DTQGetTUVersions = new DTQGetTUVersions(data);

        let tuVersions: ITitleUpdate[] = Rooms.GetTUVersions(c.Get("TitleID"));

        let xmit: DTRTUVersions = new DTRTUVersions();
        for (let x: number = 0; x < tuVersions.length; x++) {
            xmit.AddTitleUpdate(tuVersions[x]);
        }

        // Update TU version count
        xmit.UpdateTUVersionCount();

        // Send the packet
        context.xmitStruct(xmit, msguid);
    }

    processCommand_UpdateGame(context: Client, data: Buffer, msguid: number): void {
        let c: DTQUpdateGame = new DTQUpdateGame(data);

        context.user.UpdateGame(c.Get("TitleID"), c.Get("TUVersion"), (status: number, game?: IGameInfo) => {
            if (status != Constants.ERROR_SUCCESS) {
                context.xmitErrorMsg(c.GetCommandId(), msguid, status);
            } else {
                let xmit: DTRGameInfo = new DTRGameInfo();

                xmit.Set("GameName", game.Name);
                xmit.Set("LinkEnabled", game.LinkEnabled == true ? 1 : 0);
                xmit.Set("NewestTID", LocalCache.GetNewestTID(game, c.Get("BaseVersion")).Version);
                xmit.Set("DefaultLobbyId", LocalCache.GetGameLobby(game.TitleId).Id);


                xmit.PrintData();
                context.xmitStruct(xmit, msguid);
            }
        });
    }

    processCommand_GetRooms(context: Client, data: Buffer, msguid: number): void {
        // This is the function that gets a list of rooms and returns the data to the user in 3 parts
        // All 3 parts are in one packet though
        // 1 - Lobby information. This is the information for the lobby of the game you are running
        // 2 - Current room. This is the information for your current room
        // 3 - Room list. this is an array of rooms for the TitleID you are in.

        let c: DTQGetRooms = new DTQGetRooms(data);

        // Get the Game Lobby
        let user: User = context.user;
        let lobbyItem: ILobbyInfo = LocalCache.GetGameLobby(user.GetTitleId());
    }
}

	// This is the function that gets a list of rooms and returns the data to the user in 3 parts
	// All 3 parts are in one packet though
	// 1 - Lobby information. This is the information for the lobby of the game you are running
	// 2 - Current room. This is the information for your current room
	// 3 - Room list. this is an array of rooms for the titleID you are in.
	// Map[Constants.QRY_GETROOMS] = function( Data, MessageUID) {
	// 	if (client.User.Authenticated) {
	// 		Rooms.GetRoomList( client.User, function(result, lobby, list, current) {
	// 			if (result != Constants.ERROR_SUCCESS) {
	// 				client.SendError(Constants.QRY_GETROOMS, result, 0, MessageUID);
	// 				return;
	// 			}
	// 			var roomList = Factory.GetDataObject(Constants.RSP_ROOMLIST);
	// 			roomList.SetBuffer(roomList.size);
	// 			if (lobby != false) {
	// 				if (list != false) {
	// 					roomList.Set("RoomCount", list.length);
	// 				} else {
	// 					roomList.Set("RoomCount", 0);
	// 				}
	// 				roomList.Set("LobbyID", lobby.LobbyID);
	// 				roomList.Set("LobbyName", lobby.LobbyName);
	// 			}
	// 			if (current != false) {
	// 				var currentFlags = Rooms.GetRoomFlags(current, client.User);
	// 				roomList.AddCurrent(current.LobbyName, current.RoomName, current.ParentID, current.RoomID, currentFlags);
	// 			}
	// 			if (list != false) {
	// 				for(var idx = 0; idx < list.length; idx++) {
	// 					var room = list[idx];
	// 					var roomFlags = Rooms.GetRoomFlags(room, client.User);
	// 					roomList.AddRoom(room.RoomName, room.RoomID, roomFlags, room.UserCount);
	// 				}
	// 			}
	// 			client.SendData(roomList.buff, Constants.RSP_ROOMLIST, MessageUID);
	// 		});
	// 	} else {
	// 		client.SendError(Constants.QRY_GETROOMS, Constants.ERROR_NOAUTH, 0, MessageUID);
	// 	}
	// }