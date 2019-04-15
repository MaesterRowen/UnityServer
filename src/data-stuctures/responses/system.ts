import { Struct, MType } from '../struct';

export class DTRError extends Struct {
    constructor(data?: Buffer) {
        super("ERRO");
        this.AddMember("CommandId", 4, MType.DWORD, 0);
        this.AddMember("ErrorCode", 4, MType.DWORD, 4);
        this.AddMember("ErrorDataHi", 4, MType.DWORD, 8);
        this.AddMember("ErrorDataLo", 4, MType.DWORD, 12);

        // Initialize our buffer contents
        this.SetBuffer(data);
    }
}