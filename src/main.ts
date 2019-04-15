import { Server } from './server';
import { Constants } from './constants';
import { WebServer } from './www/portal';

let web: WebServer = new WebServer();
web.StartServer();

// Main entry point and starting point for the application
let server: Server = new Server();

//server.SetConfig('config.json');
//server.SetDebugLog('debug.log');
server.StartLink(Constants.SERVER_PORT); 