import { Database } from './database';
import { Constants, Util, User, HashMap } from './shared';
import { LocalCache, ITitleUpdate, IGameInfo, IGameRoom } from './inmemory-db/local-cache';
import { MysqlError, PoolConnection } from 'mysql'
import { Client } from './client';


export class LinkRoom {
    public Id: number;
    public Name: string;
    public TitleId: number;
    public Flags: number;


    public Children: HashMap<number, LinkRoom> = new HashMap();

    constructor() {

    }

    GetChildCount(): number {
        return this.Children.count();
    }
    GetUserCount(): number {
        if (this.Flags & Constants.ROOM_GAMEROOM) {
            return
        }
        let userCount: number = 0;
        this.Children.forEach((value: LinkRoom, key: number) => {
            userCount += value.GetUserCount();
        });
        return userCount;
    }
}


export interface ILobbyInfo {
    Id: number;
    Name: string;
    TitleId: number;
    Flags: number;
    UserCount: number;
}

export interface ICurrentRoom {
    LobbyName: string;
    RoomName: string;
    LobbyId: number;
    RoomId: number;
    RoomFlags: number;
}

export class Rooms {

    private static MainLobby: LinkRoom = new LinkRoom();

    static GetMainLobby(): LinkRoom {
        return Rooms.MainLobby;
    }

    static GetGameLobby(titleId: number): LinkRoom {
        // Find the game lobby with matching title id
        let retval: LinkRoom = null;
        Rooms.MainLobby.Children.forEach((value: LinkRoom, key: number) => {
            if (value.TitleId == titleId) {
                retval = value;
            }
        });

        return retval;
    }

    static GetLobbyUserCount(lobbyId: number): number {

        let userCount: number = 0;

        // Loop through all of our game rooms and accumulate the total number of users
        for (let x: number = 0; x < LocalCache.RoomList.length; x++) {
            let roomItem: IGameRoom = LocalCache.RoomList[x];
            if (roomItem.LobbyId == lobbyId) {
                userCount += roomItem.RoomUserCount;
            }
        }

        // Return the user count
        return userCount;
    }



    static GetLobbyList(flags: number, callbackFn: (status: number, data?: ILobbyInfo[]) => void): void {

        // Return successfull
        callbackFn(Constants.ERROR_SUCCESS, LocalCache.LobbyMap.values());
    }

    static GetTUVersions(titleId: number): ITitleUpdate[] {
        // Return an array of title updates for the requested title ID
        return (LocalCache.GameMap.has(titleId) ? LocalCache.GameMap.get(titleId).TUVersions : []);
    }
}


