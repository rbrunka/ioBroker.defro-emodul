'use strict';

/*
 * Created with @iobroker/create-adapter v2.1.1
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');
const axios = require('axios');

// Load your modules here, e.g.:
// const fs = require("fs");

class DefroEmodul extends utils.Adapter {

    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    constructor(options) {
        super({
            ...options,
            name: 'defro-emodul',
        });
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        // this.on('objectChange', this.onObjectChange.bind(this));
        // this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        // Initialize your adapter here

        // Reset the connection indicator during startup
        this.setState('info.connection', false, true);

        // The adapters config (in the instance object everything under the attribute "native") is accessible via
        // this.config:
        this.log.info('config userID: ' + this.config.userId);
        this.log.info('config token: ' + this.config.token);
        this.log.info('config boiler UDID: ' + this.config.boilerUdid);

        const self = this;

        // read config
        const defroUserID = this.config.userId;
        const defroToken = this.config.token;
        const defroUDID = this.config.boilerUdid;

        // log config
        this.log.info('UserID: ' + defroUserID);
        this.log.info('Token: ' + defroToken);
        this.log.info('Token: ' + defroUDID);

        // create JSON data point
        await this.setObjectNotExistsAsync('JSON', {
            type: 'state',
            common: {
                name: 'JSON',
                type: 'string',
                role: 'text',
                read: true,
                write: true,
            },
            native: {},
        });

        // get data from API
        await axios({
            method: 'get',
            baseURL: 'https://emodul.eu/api/v1/users/',
            url: defroUserID + '/modules/' + defroUDID,
            headers: { Authorization: 'Bearer ' + defroToken },
            responseType: 'json'
        }).then(function (response){
            // log and store received data
            self.log.info('received data (' + response.status + '): ' + JSON.stringify(response.data));
            if (response.status !== 200) {
                self.log.error('Error');
            }
            else
            {
                self.setState('JSON', {val: JSON.stringify(response.data)}, true);
                // convert JSON to datapoints
                const jsonResponse = response.data.tiles;

                var key, subkey, objectID;
                for (let i=0; i<jsonResponse.length; i++) {
                    objectID = jsonResponse[i].id;
                    for (key in jsonResponse[i]) {
                        if (jsonResponse[i].hasOwnProperty(key)) {
                            if (key == 'params')
                            {
                                for (subkey in jsonResponse[i][key]) {
                                    if (jsonResponse[i][key].hasOwnProperty(subkey)) {
                                        self.setObjectNotExistsAsync('data.' + objectID + '.' + key + '.' + subkey, {
                                            type: 'state',
                                            common: {
                                                name: key,
                                                type: 'string',
                                                role: 'text',
                                                read: true,
                                                write: true,
                                            },
                                            native: {},
                                        });
                                        self.setState('data.' + objectID + '.' + key + '.' + subkey, {val: jsonResponse[i][key][subkey], ack: true});
                                    }
                                }
                            } else {
                                self.setObjectNotExistsAsync('data.'+ objectID +'.' + key, {
                                    type: 'state',
                                    common: {
                                        name: key,
                                        type: 'string',
                                        role: 'text',
                                        read: true,
                                        write: true,
                                    },
                                    native: {},
                                });
                                self.setState('data.' + objectID + '.' + key, {val: jsonResponse[i][key], ack: true});
                            }
                        }
                    }
                }
            };
        });

        this.killTimeout = setTimeout(this.stop.bind(this), 10000);
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     * @param {() => void} callback
     */
    onUnload(callback) {
        try {
            // Here you must clear all timeouts or intervals that may still be active
            // clearTimeout(timeout1);
            // clearTimeout(timeout2);
            // ...
            // clearInterval(interval1);

            callback();
        } catch (e) {
            callback();
        }
    }

    // If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
    // You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
    // /**
    //  * Is called if a subscribed object changes
    //  * @param {string} id
    //  * @param {ioBroker.Object | null | undefined} obj
    //  */
    // onObjectChange(id, obj) {
    //     if (obj) {
    //         // The object was changed
    //         this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
    //     } else {
    //         // The object was deleted
    //         this.log.info(`object ${id} deleted`);
    //     }
    // }

    /**
     * Is called if a subscribed state changes
     * @param {string} id
     * @param {ioBroker.State | null | undefined} state
     */
    onStateChange(id, state) {
        if (state) {
            // The state was changed
            this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
        } else {
            // The state was deleted
            this.log.info(`state ${id} deleted`);
        }
    }

    // If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
    // /**
    //  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
    //  * Using this method requires "common.messagebox" property to be set to true in io-package.json
    //  * @param {ioBroker.Message} obj
    //  */
    // onMessage(obj) {
    //     if (typeof obj === 'object' && obj.message) {
    //         if (obj.command === 'send') {
    //             // e.g. send email or pushover or whatever
    //             this.log.info('send command');

    //             // Send response in callback if required
    //             if (obj.callback) this.sendTo(obj.from, obj.command, 'Message received', obj.callback);
    //         }
    //     }
    // }

}

if (require.main !== module) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    module.exports = (options) => new DefroEmodul(options);
} else {
    // otherwise start the instance directly
    new DefroEmodul();
}