export class Constants {
    static readonly DB_SERVER: string = "localhost";
    static readonly DB_DB: string = "xboxunity";
    static readonly DB_USER: string = "linkuser";
    static readonly DB_PASSWORD: string = "linkpass";

    static readonly LINK_VERSION: number = 1;

    static readonly SERVER_MAXCONN: number = 500;
    static readonly SERVER_PORT: number = 12346;

    // Traffic flow and Encryption status
    static readonly CLIENT_DECRYPTED: number = 0;
    static readonly SERVER_DECRYPTED: number = 1;
    static readonly CLIENT_ENCRYPTED: number = 2;
    static readonly SERVER_ENCRYPTED: number = 3;

    static readonly IV_SIZE: number = 16;

    static readonly PACKET_MAGIC: string = "LINK";
    static readonly PACKET_VERSION: number = 1;
    static readonly PACKET_HEADERSIZE: number = 32;

    static readonly PAYLOAD_MAGIC: string = "DATA";
    static readonly PAYLOAD_VERSION: number = 1;
    static readonly PAYLOAD_HEADERSIZE: number = 20;

    // Error Messages
    static readonly ERROR_SUCCESS: number = 1;          // No error was generated
    static readonly ERROR_FAIL: number = 2;
    static readonly ERROR_UNAVAILABLE: number = 3;      // Service is currently unavailable
    static readonly ERROR_NOAUTH: number = 4;           // Authorization failed;
    static readonly ERROR_PERM_BANNED: number = 5;      // User is permanently banned
    static readonly ERROR_TEMP_BANNED: number = 6;      // User is temporarily banned
    static readonly ERROR_NOJOIN: number = 7;           // A generate error has occurred joining a room
    static readonly ERROR_NOROOM: number = 8;           // User tried to join a room with an invalid room id
    static readonly ERROR_ROOMEXISTS: number = 9;       // User tried creating a room with a name that already exists
    static readonly ERROR_NOCREATE: number = 10;        // User tried to create a room within the 1hr cool down
    static readonly ERROR_BADPASS: number = 11;         // User tried to enter a room with an incorrect password
    static readonly ERROR_KICKED: number = 12;          // User tried to join a room from which they were kicked (Error Data represents number of minutes until kick status is revoked)
    static readonly ERROR_GAME_NOTFOUND: number = 13;   // Error when UpdateGame contains a title id that is not registered on the service
    static readonly ERROR_NOLINK: number = 14;          // Error when GetRooms is called for a game that is not system link compatible
    static readonly ERROR_NOTELL: number = 15;          // Error when room tell failed- Error Data represents specific error:  00 - not in valid room, 01 - invalid message type, 02 - message too long, 03 - message too fast
    static readonly ERROR_INVALID_PROFILE: number = 16; // User sent UpdateProfile where profile was invalid length (greater than 15 chars + null)
    static readonly ERROR_INVALID_PORTS: number = 17;   // User sent UpdatePorts where port was out of range (1 - 65535) ( Error data represents which port ),  00 - broadcast, 01 - data, 02 - both
    static readonly ERROR_NOTINROOM: number = 18;       // Returned by RoomInfo if the user is not in a room (ie, the user is in a lobby)
    static readonly ERROR_NOTINLOBBY: number = 19;      // Returned by LobbyInfo if the user is not in a lobby (ie, the user is not in a link compatible game)
    static readonly ERROR_WRONGVERSION: number = 20;
    static readonly ERROR_NOSELF: number = 21;
    static readonly ERROR_NOPERMISSION: number = 22;

    // User flags
    static readonly USER_NONE: number = 0x0;
    static readonly USER_OWNER: number = 0x1;
    static readonly USER_LEADER: number = 0x2;
    static readonly USER_MODERATOR: number = 0x4;
    static readonly USER_DEVELOPER: number = 0x8;
    static readonly USER_OFFLINE: number = 0x10;
    static readonly USER_WINLINK: number = 0x20;
    static readonly USER_FRIEND: number = 0x100;
    static readonly USER_BLOCKED: number = 0x200;
    static readonly USER_KICKED: number = 0x1000;
    static readonly USER_REPORTED: number = 0x2000;
    static readonly USER_CANTKICK: number = 0x4000;
    static readonly USER_CANTREPORT: number = 0x8000;

    // Room Flags
    static readonly ROOM_NONE: number = 0x0;
    static readonly ROOM_GAMEROOM: number = 0x1;
    static readonly ROOM_PRIVATE: number = 0x2;
    static readonly ROOM_PERSISTANT: number = 0x4;
    static readonly ROOM_DLC: number = 0x10;
    static readonly ROOM_COOP: number = 0x20;
    static readonly ROOM_MODS: number = 0x40;
    static readonly ROOM_HACKS: number = 0x80;
    static readonly ROOM_KICKED: number = 0x100;

    // System Access Level
    static readonly SYSTEM_ADMIN: number = 5;
    static readonly SYSTEM_MODERATOR: number = 3;
    static readonly SYSTEM_NORMAL: number = 1;
    static readonly SYSTEM_NOONE: number = 0;
}