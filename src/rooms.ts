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
        callbackFn(Constants.ERROR_SUCCESS, LocalCache.LobbyList);
    }

    static GetTUVersions(titleId: number): ITitleUpdate[] {
        let tuVersions: ITitleUpdate[] = [];

        for (let gameIdx: number = 0; gameIdx < LocalCache.GameList.length; gameIdx++) {
            // Determine if we havea matching game
            let gameItem: IGameInfo = LocalCache.GameList[gameIdx];
            if (gameItem.TitleId != titleId) continue;

            // Loop through each TU and detemrine if base version matches
            for (let tuIdx: number = 0; tuIdx < gameItem.TUVersions.length; tuIdx++) {
                let tuItem: ITitleUpdate = gameItem.TUVersions[tuIdx];
                //if (tuItem.BaseVersion != baseVersion) continue;

                // Finally, add this TU to our list
                tuVersions.push(tuItem);
            }
        }

        // Return the completed list
        return tuVersions;
    }

}


