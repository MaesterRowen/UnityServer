
import { Database } from './database';
import { Constants, Util } from './shared';
import { MysqlError, PoolConnection } from 'mysql'
import { LocalCache, IGameInfo } from './inmemory-db/local-cache';

export class User {

    private mId: number = 0;
    private mUsername: string = "";
    private mGamerTag: string = "";
    private mAuthenticated: boolean = false;
    private mFlags: number = 0;
    private mLocation: number = 0;
    private mLevel: number = 0;
    private mRelationships: any = [];
    private mActiveTitleID: number = 0;
    private mActiveTUVersion: number = 0;

    private mMACAddress: Buffer = null;
    private mLocalIP: string = "";
    private mDataPort: number = 0;
    private mBroadcastPort: number = 0;

    private constructor() {
        this.mId = 0;
        this.mUsername = "";
        this.mAuthenticated = false;

        Util.Log('user created');
    }

    GetId(): number {
        return this.mId;
    }
    GetUsername(): string {
        return this.mUsername;
    }
    GetFlags(): number {
        return this.mFlags;
    }
    IsAuthenticated(): boolean {
        return this.mAuthenticated;
    }

    GetTitleId(): number {
        return this.mActiveTitleID;
    }

    UpdateGame(titleId: number, tuVersion: number, callbackFn: (status: number, game?: IGameInfo) => void): void {

        // First, verify that the game exists 
        let gameItem: IGameInfo = null;
        for (let gameIdx: number = 0; gameIdx < LocalCache.GameList.length; gameIdx++) {
            if (LocalCache.GameList[gameIdx].TitleId == titleId) {
                gameItem = LocalCache.GameList[gameIdx];
                break;
            }
        }

        // If the game was not found, then we return our error
        if (gameItem == null) {
            // Set our internal state 
            this.mActiveTUVersion = 0;
            this.mActiveTitleID = 0;

            // Let the caller know that hte game was not found
            callbackFn(Constants.ERROR_GAME_NOTFOUND);
            return;
        }

        // Next we need to update the user's active game information
        this.mActiveTitleID = titleId;
        this.mActiveTUVersion = tuVersion;

        // Return successfully
        callbackFn(Constants.ERROR_SUCCESS, gameItem);
    }

    ValidateUser(username: string, apiKey: string, callbackFn: (status: number, id: number) => void): void {

        // Grab a connection from our connection pool
        Database.Pool.getConnection((err: MysqlError, conn: PoolConnection) => {
            if (err) {
                Database.PrintError(err);
                callbackFn(Constants.ERROR_FAIL, 0);
                conn.release();
                return;
            }

            Util.Log("got conn");

            let sql: string = "SELECT ID FROM users WHERE Username = ? AND APIKey = UNHEX(?) AND Approved = 1";
            conn.query(sql, [username, apiKey], (err: MysqlError, results?: any) => {
                if (err) {
                    Database.PrintError(err);
                    callbackFn(Constants.ERROR_FAIL, 0);
                } else if (results.length > 0) {
                    Util.Log("results found");
                    if (results[0].Banned == 1) {
                        callbackFn(Constants.ERROR_PERM_BANNED, 0);
                    } else {
                        callbackFn(Constants.ERROR_SUCCESS, results[0].ID);
                    }
                } else {
                    Util.Log('found none');
                    callbackFn(Constants.ERROR_FAIL, 0);
                }

                // Release the connection
                conn.release();
            });
        });
    }

    Authenticate(username: string, apiKey: string, gamerTag: string, flags: number, callbackFn: (status: number) => void): void {
        // Grab a connection from our connection pool
        Database.Pool.getConnection((err: MysqlError, conn: PoolConnection) => {
            if (err) {
                Database.PrintError(err);
                callbackFn(Constants.ERROR_FAIL);

            } else {
                let sql: string = "SELECT ID, HEX(APIKey) AS APIKey, LocationID, Username, Level, Banned, TUVer FROM users WHERE Username = ? AND APIKey = UNHEX(?) AND Approved = 1";
                conn.query(sql, [username, apiKey], (err: MysqlError, results?: any) => {

                    if (err) {
                        Database.PrintError(err);
                        callbackFn(Constants.ERROR_FAIL);
                    }
                    else if (results.length > 0) {
                        if (results[0].Banned == 1) {
                            callbackFn(Constants.ERROR_PERM_BANNED);
                        } else {

                            this.mUsername = results[0].Username;
                            this.mId = results[0].ID;
                            this.mLocation = results[0].LocationID;
                            this.mLevel = results[0].Level;
                            this.mAuthenticated = true;
                            this.mFlags = flags;

                            // Modify user's flags based on system access level
                            if (this.mLevel == Constants.SYSTEM_ADMIN) {
                                this.mFlags |= Constants.USER_DEVELOPER;
                            } else if (this.mLevel == Constants.SYSTEM_MODERATOR) {
                                this.mFlags |= Constants.USER_MODERATOR;
                            }

                            // Finally, update user's gamertag information
                            this.initializeUser(gamerTag, (status: number) => {
                                if (status == Constants.ERROR_FAIL) {
                                    Util.Log("Error initializing user");
                                } else {
                                    this.queryConfiguration((status: number) => {
                                        if (status == Constants.ERROR_FAIL) {
                                            Util.Log("Error obtaining user's LiNK configuration");
                                        } else {

                                            Util.Log('MAC Addr:  ' + Util.ParseMACAddressBuffer(this.mMACAddress));

                                            // Return result
                                            callbackFn(Constants.ERROR_SUCCESS);
                                        }
                                    });
                                }
                            });
                        }
                    }
                    else {
                        callbackFn(Constants.ERROR_NOAUTH);
                    }
                });
            }

            // Release the connection
            conn.release();
        });
    }

    private initializeUser(gamerTag: string, callbackFn: (status: number) => void): void {
        // Grab a connection from our connection pool
        Database.Pool.getConnection((err: MysqlError, conn: PoolConnection) => {
            if (err) {
                Database.PrintError(err);
                callbackFn(Constants.ERROR_FAIL);
            } else {

                let sql: string = "UPDATE users SET Online = 1, GamerTag = ?, LocationID = 1 WHERE ID = ?; "
                sql += "SELECT TargetID, RelationType FROM relations WHERE UserID = ?";
                conn.query(sql, [gamerTag, this.GetId(), this.GetId()], (err: MysqlError, results?: any) => {
                    if (err) {
                        Database.PrintError(err);
                        callbackFn(Constants.ERROR_FAIL);
                    } else {

                        // Generate relationship table for this user
                        if (results.length > 0) {
                            let relationshipList: any = results[1];
                            for (let x: number = 0; x < relationshipList.length; x++) {
                                this.mRelationships[relationshipList[x].TargetID] = relationshipList[x].RelationType;
                            }
                        }

                        // Set this users gamertag
                        this.mGamerTag = gamerTag;

                        // Return result
                        callbackFn(Constants.ERROR_SUCCESS);
                    }
                });
            }

            // Release the connection
            conn.release();
        });
    }

    private queryConfiguration(callbackFn: (status: number) => void): void {
        // Grab a connection from our connection pool
        Database.Pool.getConnection((err: MysqlError, conn: PoolConnection) => {
            if (err) {
                Database.PrintError(err);
                callbackFn(Constants.ERROR_FAIL);
            } else {

                let sql: string = "SELECT GamerTag, LocalIP, MAC, DataPort, BroadcastPort FROM users WHERE Approved = 1 AND Banned = 0 AND ID = ?";
                conn.query(sql, [this.GetId()], (err: MysqlError, results?: any) => {

                    if (err) {
                        Database.PrintError(err);
                        callbackFn(Constants.ERROR_FAIL);
                    } else {

                        this.mMACAddress = results[0].MAC;
                        this.mLocalIP = results[0].LocalIP;
                        this.mDataPort = results[0].DataPort;
                        this.mBroadcastPort = results[0].BroadcastPort;
                        this.mGamerTag = results[0].GamerTag;

                        // Return result
                        callbackFn(Constants.ERROR_SUCCESS);
                    }
                });
            }

            // Release the connection
            conn.release();
        });
    }

    // Constructor
    static CreateUser(): User {
        return new User();
    }
}