import { Struct, MType } from '../struct';

export class DTQGetLobbies extends Struct {
    constructor(data?: Buffer) {
        super("LBYS");
        this.AddMember("Flags", 4, MType.DWORD, 0);

        // Initialize our buffer ontents
        this.SetBuffer(data);
    }
}

export class DTQGetTUVersions extends Struct {
    constructor(data?: Buffer) {
        super("GTUV");
        this.AddMember("TitleID", 4, MType.DWORD, 0);

        // Initialize our buffer ontents
        this.SetBuffer(data);
    }
}

export class DTQUpdateGame extends Struct {
    constructor(data?: Buffer) {
        super("GAME");
        this.AddMember("TitleID", 4, MType.DWORD, 0);
        this.AddMember("BaseVersion", 4, MType.DWORD, 4);
        this.AddMember("TUVersion", 2, MType.WORD, 8);
        this.AddMember("Flags", 2, MType.WORD, 10);

        // Initialize our buffer ontents
        this.SetBuffer(data);
    }
}

export class DTQGetRooms extends Struct {
    constructor(data?: Buffer) {
        super("GRMS");
        this.AddMember("Flags", 4, MType.DWORD, 0);

        // Initialize our buffer ontents
        this.SetBuffer(data);
    }
}