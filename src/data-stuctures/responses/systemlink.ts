import { Struct, MType } from '../struct';
import { ILobbyInfo } from '../../rooms';
import { ITitleUpdate } from '../../inmemory-db/local-cache';
import { Util } from '../../util';

export class DTRLobbyList extends Struct {

    private roomCount: number = 0;

    constructor(data?: Buffer) {
        super("LLST");
        this.AddMember("RoomCount", 4, MType.DWORD, 0);

        // Initialize our buffer contents
        this.SetBuffer(data);
    }

    GetRoomCount(): number {
        return this.roomCount;
    }

    UpdateRoomCount(): void {
        this.Set("RoomCount", this.roomCount);
    }

    AddRoom(room: ILobbyInfo): void {

        // Generate a temporary struct for this room
        let roomObj: Struct = new Struct();
        roomObj.AddMember("RoomName", 64, MType.STRING, 0);
        roomObj.AddMember("RoomId", 4, MType.DWORD, 64);
        roomObj.AddMember("RoomFlags", 2, MType.WORD, 68);
        roomObj.AddMember("RoomUserCount", 2, MType.WORD, 70);
        roomObj.AddMember("TitleID", 4, MType.DWORD, 72);

        roomObj.SetBuffer();

        // Set the struct member values
        roomObj.Set("RoomName", room.Name);
        roomObj.Set("RoomId", room.Id);
        roomObj.Set("RoomFlags", room.Flags);
        roomObj.Set("RoomUserCount", room.UserCount);
        roomObj.Set("TitleID", room.TitleId);

        // Append this struct to our internal buffer and increment struct size
        this.mBuffer = Buffer.concat([this.mBuffer, roomObj.GetBuffer()]);
        this.mSize += roomObj.GetSize();

        // Increment our internal Room Count and update our member variable
        this.roomCount++;
    }
}

export class DTRTUVersions extends Struct {


    private tuCount: number = 0;

    constructor(data?: Buffer) {
        super("TLST");
        this.AddMember("TitleId", 4, MType.HEX, 0);
        this.AddMember("TUVersionCount", 4, MType.DWORD, 4);

        // Initialize our buffer contents
        this.SetBuffer(data);
    }

    GetTUVersionCount(): number {
        return this.tuCount;
    }

    UpdateTUVersionCount(): void {
        this.Set("TUVersionCount", this.tuCount);
    }

    AddTitleUpdate(tuItem: ITitleUpdate): void {

        Util.PrintObject(tuItem);

        // Generate a temporary struct for this room
        let tuObj: Struct = new Struct();
        tuObj.AddMember("Version", 2, MType.WORD, 0);
        tuObj.SetBuffer();

        // Set the struct member values
        tuObj.Set("Version", tuItem.Version);

        // Append this struct to our internal buffer and increment struct size
        this.mBuffer = Buffer.concat([this.mBuffer, tuObj.GetBuffer()]);
        this.mSize += tuObj.GetSize();

        // Increment our internal Room Count and update our member variable
        this.tuCount++;
    }
}

export class DTRGameInfo extends Struct {
    constructor(data?: Buffer) {
        super("GINF");
        this.AddMember("GameName", 64, MType.STRING, 0);
        this.AddMember("LinkEnabled", 2, MType.WORD, 64);
        this.AddMember("NewestTID", 2, MType.WORD, 66);
        this.AddMember("DefaultLobbyId", 4, MType.DWORD, 68);

        // Initialize our buffer contents
        this.SetBuffer(data);
    }
}