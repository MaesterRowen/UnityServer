import { Database } from '../database';
import { Constants, Util, HashMap, mysql } from '../shared';
import { MysqlError, PoolConnection } from 'mysql'
import { Observable, Observer, forkJoin } from 'rxjs';
import { connect } from 'tls';
import { isDeepStrictEqual } from 'util';
import { resolve } from 'url';

export interface ILinkRoom {
    Id: number;                // The ID of the room
    ParentId: number;           // The Parent ID of the room
    Name: string;              // The name of the room [limited to 64 chars]
    TitleId: number;           // The TitleID that the room is available for
    TUVersion: number;         // The TUVersion that the room is visible for [Public Rooms are visible for all TU Versions]
    Flags: number;             // Flags for the room
    OwnerId: number;           // The ID of the room's owner
    LeaderId: number;          // The ID of the room's leader
    GameRoom: boolean;         // Set's whether the room is intended to have users 
    Passcode: number;          // Passcode for the room.  If set, then the room is private; otherwise, it is public
    CreationTime: number;      // The date and time the room was created
}

export interface ILobbyInfo {
    Id: number;
    Name: string;
    TitleId: number;
    Flags: number;
    UserCount: number;
}

export interface IGameRoom {
    LobbyId: number;
    RoomName: string;
    RoomId: number;
    RoomFlags: number;
    RoomUserCount: number;
}

export enum MTitleType {
    Unknown,
    Xbox360,
    XBLA,
    XboxClassic,
    XNA,
    Homebrew
}

export interface ITitleUpdate {
    Id: number;
    TitleId: number;
    MediaId: number;
    Region: number;
    Version: number;
    BaseVersion: number;
}

export interface IGameInfo {
    Name: number;
    LinkEnabled: boolean;
    TitleId: number;
    Type: MTitleType;
    TUVersions: ITitleUpdate[];
}

export class LocalCache {

    static LobbyMap: HashMap<number, ILobbyInfo> = new HashMap();
    static GameMap: HashMap<number, IGameInfo> = new HashMap();
    static TUMap: HashMap<number, ITitleUpdate> = new HashMap();
    static RoomList: IGameRoom[] = [];

    static LoadLobbyList(flags: number = 0x00): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            Database.Pool.getConnection((err: MysqlError, conn: PoolConnection) => {
                if (err) {
                    Database.PrintError(err);
                    reject(Constants.ERROR_FAIL);
                } else {
                    let sql: string = "SELECT RoomID, RoomName, TitleID, Flags, (SELECT Count(ID) FROM users AS U WHERE U.TitleID = R.TitleID AND Online = 1 AND NOT LocationID = 1) AS UserCount FROM linkrooms AS R WHERE R.ParentID = 1 AND R.GameRoom = 0 ORDER BY UserCount DESC, RoomName ASC";
                    conn.query(sql, (err: MysqlError, results?: any) => {
                        if (err) {
                            Database.PrintError(err);
                            reject(Constants.ERROR_FAIL);
                        } else {
                            // Clear out our lobby map
                            LocalCache.LobbyMap.clear();

                            // If we received results, then fill in our mpa
                            if (results.length > 0) {
                                // Loop through each room and generate our ILobbyInfo
                                for (let x: number = 0; x < results.length; x++) {
                                    LocalCache.LobbyMap.set(results[x].RoomID, {
                                        "Id": results[x].RoomID,
                                        "Name": results[x].RoomName,
                                        "TitleId": results[x].TitleID instanceof Buffer ? results[x].TitleID.readUInt32BE(0) : results[x].TitleID,
                                        "Flags": results[x].Flags | Constants.ROOM_PERSISTANT,
                                        "UserCount": results[x].UserCount
                                    });
                                }
                            }
                            Util.Log("Cached " + LocalCache.LobbyMap.count() + " LiNK Lobbies.");

                            // Successful
                            resolve();
                        }
                    });

                    // Release connection
                    conn.release();
                }
            });
        });
    }

    static LoadGameList(flags: number = 0x01): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            // Grab a connection from our connection pool
            Database.Pool.getConnection((err: MysqlError, conn: PoolConnection) => {
                if (err) {
                    Database.PrintError(err);
                    reject(Constants.ERROR_FAIL);
                } else {
                    let sql: string = "SELECT TitleID, Name, TitleType, LinkEnabled FROM titles";
                    conn.query(sql, (err: MysqlError, results?: any) => {

                        if (err) {
                            Database.PrintError(err);
                            reject(Constants.ERROR_FAIL);
                        } else {
                            // Clear existing lobby list
                            LocalCache.GameMap.clear();

                            if (results.length > 0) {

                                let tuCount: number = 0;

                                // Loop through each room and generate our ILobbyInfo
                                for (let x: number = 0; x < results.length; x++) {

                                    if (flags & 0x1 && results[x].LinkEnabled == 0) continue;

                                    // Parse title type
                                    let type: MTitleType = MTitleType.Unknown;
                                    switch (results[x].TitleType as string) {
                                        case '360': type = MTitleType.Xbox360; break;
                                        case 'XBLA': type = MTitleType.XBLA; break;
                                        case 'XNA': type = MTitleType.XNA; break;
                                        case 'Xbox1': type = MTitleType.XboxClassic; break;
                                        case 'Homebrew': type = MTitleType.Homebrew; break;
                                    };

                                    let titleId: number = results[x].TitleID instanceof Buffer ? results[x].TitleID.readUInt32BE(0) : results[x].TitleID;

                                    let tuVersions: ITitleUpdate[] = [];
                                    // Loop through each title update and check if the titleid matches... if it does, then add it to our outgoing list
                                    LocalCache.TUMap.forEach((value: ITitleUpdate, key: number) => {
                                        if (value.TitleId == titleId) {
                                            tuVersions.push(value);
                                        }
                                    });
                                    tuCount += tuVersions.length;

                                    // Push this item into our map
                                    LocalCache.GameMap.set(titleId, {
                                        "Name": results[x].Name,
                                        "TitleId": titleId,
                                        "LinkEnabled": results[x].LinkEnabled == 1 ? true : false,
                                        "Type": type,
                                        "TUVersions": tuVersions
                                    });
                                }

                                Util.Log("Cached " + LocalCache.GameMap.count() + " game titles and " + tuCount + " title updates versions");
                            }

                            resolve();
                        }
                    });

                    // Release connection
                    conn.release();
                }
            });
        });
    }

    static LoadTitleUpdates(flags: number = 0x00): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            // Grab a connection from our connection pool
            Database.Pool.getConnection((err: MysqlError, conn: PoolConnection) => {
                if (err) {
                    Database.PrintError(err);
                    reject(Constants.ERROR_FAIL);
                } else {
                    let sql: string = "SELECT TitleUpdateID, TitleID, MediaID, CAST(Region as INT) AS Region, CAST(version as INT) AS Version, baseVersion FROM titleupdates GROUP BY TitleID, version ORDER BY TitleID ASC, version DESC";
                    conn.query(sql, (err: MysqlError, results?: any) => {
                        if (err) {
                            Database.PrintError(err);
                            reject(Constants.ERROR_FAIL);
                        }
                        else {
                            // Clear TitleUdpateMap
                            LocalCache.TUMap.clear();

                            if (results.length > 0) {

                                // Loop through each room and generate our ILobbyInfo
                                for (let x: number = 0; x < results.length; x++) {
                                    LocalCache.TUMap.set(results[x].TitleUpdateID, {
                                        "Id": results[x].TitleUpdateID,
                                        "TitleId": results[x].TitleID instanceof Buffer ? results[x].TitleID.readUInt32BE(0) : results[x].TitleID,
                                        "MediaId": results[x].MediaID instanceof Buffer ? results[x].MediaID.readUInt32BE(0) : results[x].MediaID,
                                        "Region": results[x].Region,
                                        "Version": results[x].Version,
                                        "BaseVersion": results[x].baseVersion instanceof Buffer ? results[x].baseVersion.readUInt32BE(0) : results[x].baseVersion,
                                    });
                                }

                                Util.Log("Cached " + LocalCache.TUMap.count() + " title update versions");
                            }

                            resolve();
                        }
                    });

                    // Release connection
                    conn.release();
                }
            });
        });
    }

    static GetGameLobby(titleId: number): ILobbyInfo {
        let retval: ILobbyInfo = null;
        LocalCache.LobbyMap.forEach((value: ILobbyInfo, key: number) => {
            if (value.TitleId == titleId) {
                retval = value;
                return;
            }
        });

        return retval;
    }

    static GetNewestTID(game: IGameInfo, baseVersion: number): ITitleUpdate {

        let newestTU: ITitleUpdate = null;
        for (let x: number = 0; x < game.TUVersions.length; x++) {
            let tuItem: ITitleUpdate = game.TUVersions[x];
            if (tuItem.BaseVersion == baseVersion || baseVersion == 0) {
                if (newestTU == null || newestTU.Version < tuItem.Version) {
                    newestTU = tuItem;
                }
            }
        }

        // Return the newest TU
        return newestTU;
    }
}