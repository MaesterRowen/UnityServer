import { Database } from './database';
import { Constants, Util, User } from './shared';
import { LocalCache, ITitleUpdate, IGameInfo, IGameRoom } from './inmemory-db/local-cache';
import { MysqlError, PoolConnection } from 'mysql'
import { Client } from './client';

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


