'use strict';

/*
 * Created with @iobroker/create-adapter v2.1.1
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');
const axios = require('axios');
const { url } = require('inspector');

// Load your modules here, e.g.:
// const fs = require("fs");

class DefroEmodul extends utils.Adapter {

    constructor(options) {
        super({
            ...options,
            name: 'defro-emodul',
        });

        this.emodulApiClient = null;
        this.refreshStateTimeout = null;

        this.on('ready', this.onReady.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    async onReady() {
        try {
            if (!this.config.userId) {
                this.log.error(`User ID is empty - please check instance configuration of ${this.namespace}`);
                return;
            }
            if (!this.config.token) {
                this.log.error(`Token is empty - please check instance configuration of ${this.namespace}`);
                return;
            }
            if (!this.config.boilerUdid) {
                this.log.error(`Boiler UDID is empty - please check instance configuration of ${this.namespace}`);
                return;
            }

            this.log.debug('config userID: ' + this.config.userId);
            this.log.debug('config token: ' + this.config.token);
            this.log.debug('config boiler UDID: ' + this.config.boilerUdid);

            // read config
            const defroUserID = this.config.userId;
            const defroToken = this.config.token;
            const defroUDID = this.config.boilerUdid;

            this.emodulApiClient = axios.create({
                method: 'get',
                baseURL: 'https://emodul.eu/api/v1/users/',
                headers: { Authorization: 'Bearer ' + defroToken },
                responseType: 'json',
                responseEncoding: 'utf8',
                timeout: 1000,
                validateStatus: (status) => {
                    return [200, 201, 401].includes(status);
                },
            });

            const defroUrl = defroUserID + '/modules/' + defroUDID;
            await this.refreshState(defroUrl);
        } finally {
            this.stop();
        }
    }

    async refreshState(defroUrl) {
        try {
            const deviceInfoResponse = await this.emodulApiClient.get(defroUrl);;
            this.log.debug(`deviceInfoResponse ${deviceInfoResponse.status}: ${JSON.stringify(deviceInfoResponse.data)}`);

            if (deviceInfoResponse.status == 200) {
                const deviceData = deviceInfoResponse.data;
                //console.log(deviceData);
                this.log.debug(`deviceData: ${JSON.stringify(deviceData)}`);
                this.setState('JSON', {val: JSON.stringify(deviceData)}, true);
            }
        } catch (error) {
            // Set device offline
            if (error.name === 'AxiosError') {
                this.log.error(`Request to ${error.config.url} failed with code ${error.status} (${error.code}): ${error.message}`);
                this.log.debug(`Complete error object: ${JSON.stringify(err)}`);
            } else {
                this.log.error(error);
            } 
        }
    }

/*         // create JSON data point
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
 */
        //this.killTimeout = setTimeout(this.stop.bind(this), 10000);


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
            this.setStateAsync('info.connection', { val: false, ack: true });

            callback();
        } catch (e) {
            callback();
        }
    }
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
