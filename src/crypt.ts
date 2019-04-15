import * as crypto from "crypto";
import { Util } from './shared';

export class Crypt {

    private keyObj: crypto.DiffieHellman = undefined;

    private secretKey: Buffer = undefined;
    private AES: Buffer = undefined;
    private aesCipher: crypto.CipherKey = undefined;
    private encryptionReady: boolean = false;


    constructor() {
        // Create our crypto object and define our encryption method
        this.keyObj = crypto.getDiffieHellman("modp1");

        // Generate our internal keys
        this.keyObj.generateKeys();

        // Set initial encryption state
        this.encryptionReady = false;
    }

    public GenerateKeys(other_public_key: crypto.Binary): void {
        // First we need to generate our secret key using the other public key
        this.secretKey = this.keyObj.computeSecret(other_public_key);

        // Using this secret key, we need to create our AES cipher
        let hmacSha: Buffer = this.secretKey.slice(0, 16);
        let shaSource: Buffer = this.secretKey.slice(16);

        // Generate our hmac object
        let hmac: crypto.Hmac = crypto.createHmac("sha1", hmacSha);
        hmac.update(shaSource);

        // Extract sha1 hash
        let hash: Buffer = hmac.digest();

        Util.Log("hash len: " + hash.length);

        // Use the first 16 bytes of the sha1 hash as the AES cipher
        this.aesCipher = Buffer.alloc(0x10, hash);

        Util.Log("aes-cipher: " + this.aesCipher.toString('hex'));
        Util.Log("aes-cipher len: " + this.aesCipher.length);

        // Ready for encryption
        this.encryptionReady = true;
    }

    GetPublicKey(): Buffer {
        return this.keyObj.getPublicKey();
    }

    GetSecretKey(): Buffer {
        return this.secretKey;
    }

    GeAESCipher(): Buffer {
        return this.aesCipher as Buffer;
    }

    AESEncrypt(input: Buffer): Buffer {
        // Define encryption algorithm
        let algorithm: string = "aes-128-cbc";

        // Generate an initialization vector
        let iv: Buffer = crypto.randomBytes(0x10);

        // Generate a buffer of 0x00 bytes for input data padding and add to end of buffer
        if (input.length % 0x10) {
            let zeroBuf = Buffer.alloc(0x10 - (input.length % 0x10), 0);
            input = Buffer.concat([input, zeroBuf]);
        }

        // Create a cipher context for encryption
        let cipher: crypto.Cipher = crypto.createCipheriv(algorithm, this.aesCipher as crypto.BinaryLike, iv);
        cipher.setAutoPadding(false);

        // Encrypt the buffer in place
        return Buffer.concat([iv, cipher.update(input), cipher.final()]);
    }

    AESDecrypt(input: Buffer, iv: Buffer): Buffer {

        Util.Log("decrypt key: " + this.aesCipher.toString('hex'));

        // Define the encryption algorithm
        let algorithm: string = "aes-128-cbc";
        // Create a cipher context for decryption
        let cipher: crypto.Decipher = crypto.createDecipheriv(algorithm, this.aesCipher as crypto.BinaryLike, iv);
        cipher.setAutoPadding(false);

        // Decrypt the buffer in place
        return Buffer.concat([cipher.update(input), cipher.final()]);
    }

    static CreateSha1Hash(data: Buffer | string): string {
        let shasum: crypto.Hash = crypto.createHash("sha1");
        shasum.update(data);
        return shasum.digest('hex');
    }
    static CreateSha1HashBuffer(data: Buffer): Buffer {
        let shasum: crypto.Hash = crypto.createHash("sha1");
        shasum.update(data);
        return shasum.digest();
    }
}