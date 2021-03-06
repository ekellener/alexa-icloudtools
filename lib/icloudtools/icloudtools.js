var debug = require('debug')('lambda-icloudtools');
var ICloudConnection = require('appledevice');
var reqCredentials = require('credentials');
var AlexaResponseError = require('alexa-error');
var Promise = require('bluebird');
var _ = require('underscore');

//default to dev config so it can be used
//var config = require('config-node')({env: "dev"});


module.exports = ICloudTools;

function ICloudTools(config) {
    this._config = config;
    this.Adapters = reqCredentials.Adapters;
}

/**
 *
 * @param intentRequest
 * @returns {*}
 */
ICloudTools.prototype.addCloudReminder = function (intentRequest) {

    var cookieFile = this._config.ICloud.clientCookiesFile;

    //All iPhone Reminders have a default collection name called Phone reminder
    var collectionName = this._config.ICloud.defaultCollectionName;

    var adapterFunc = this._config.ICloud.credentialStore.adapter;
    var params = this._config.ICloud.credentialStore.params;

    adapter = new this.Adapters[adapterFunc](params);
    credentials = new reqCredentials.Credentials(adapter, AlexaResponseError);

    var iCloudConnection;

    return credentials.lookup(intentRequest.FirstNames)
        .then(function (acct) {
            iCloudConnection = new ICloudConnection(acct, cookieFile, AlexaResponseError);

            return iCloudConnection.getReminders(collectionName);
        })
        .then(function () {
            var reminder = {title: intentRequest.Reminder};

            return iCloudConnection.addReminder(collectionName, reminder);
        })
        .catch(AlexaResponseError, function (e) {
            // Failed to alert device, but have some context to provide Alexa
            console.error("Reminders: " + e.message);
            return e.message;
        })
        .catch(function (e) {
            // Unknown error - general
            var msg = "I'm sorry I was unable to add the reminder. Please Try again later";
            console.log(msg + e.message);
            console.log(e.stack);
            return msg;
        });

};

/**
 *
 * @param intentRequest
 * @returns {*}
 */
ICloudTools.prototype.pingDevice = function (intentRequest) {



    var cookieFile = this._config.ICloud.clientCookiesFile;
    var alertMsg = this._config.deviceAlert.message;
    var adapterFunc = this._config.ICloud.credentialStore.adapter;
    var params = this._config.ICloud.credentialStore.params;

    adapter = new this.Adapters[adapterFunc](params);
    credentials = new reqCredentials.Credentials(adapter, AlexaResponseError);


    var iCloudConnection;
//    var commonNameRequest = intentRequest.FirstNames + " " + intentRequest.Device;

    return credentials.lookup(intentRequest.FirstNames)
        .then(function (acct) {
            iCloudConnection = new ICloudConnection(acct, cookieFile, AlexaResponseError);
            return iCloudConnection.find({name: intentRequest.FirstNames,device: intentRequest.Device});
        })
        .then(function (deviceRecord) {
            return iCloudConnection.alert(deviceRecord, alertMsg);
        })
        .then(function (msg) {
            // Successful Lookup
            console.log(msg);
            return msg;
        })
        .catch(AlexaResponseError, function (e) {
            // Failed to alert device, but have some context to provide Alexa
            console.error("credentials.lookup: " + e.message);
            return e.message;
        })
        .catch(function (e) {
            // Unknown error - general
            var msg = "I'm sorry I was unable to reach the requested device. Please Try again later";
            console.error(msg + e.message);
            console.error(e.stack);
            return msg;
        });
};




ICloudTools.prototype.getDeviceList = function (intentRequest) {
// Mock
//   return Promise.resolve("I found 3 devices. " + intentRequest.FirstNames+" devices are Red, Green, Blue");
//

    var cookieFile = this._config.ICloud.clientCookiesFile;
    var adapterFunc = this._config.ICloud.credentialStore.adapter;
    var params = this._config.ICloud.credentialStore.params;

    adapter = new this.Adapters[adapterFunc](params);
    credentials = new reqCredentials.Credentials(adapter, AlexaResponseError);

    var iCloudConnection;
    //   var commonNameRequest = intentRequest.FirstNames + " " + intentRequest.Device;

    return credentials.lookup(intentRequest.FirstNames)
        .then(function (acct) {
            iCloudConnection = new ICloudConnection(acct, cookieFile, AlexaResponseError);
            return iCloudConnection.getDeviceList(intentRequest.FirstNames);
        })
        .then(function (deviceList) {
            // Massage list
            if (deviceList.length>0) {
                deviceNames = _.pluck(deviceList,'name');
                return "I found the following "+deviceList.length+" devices.\n "+ deviceNames.join(',\n');
            } else {
                return "I wasn't able to find any of "+intentRequest.FirstName+ "devices";
            }
        })
        .then(function (msg) {
            // Successful Lookup
            console.log(msg);
            return msg;
        })
        .catch(AlexaResponseError, function (e) {
            // Failed to alert device, but have some context to provide Alexa
            console.error("credentials.lookup: " + e.message);
            return e.message;
        })
        .catch(function (e) {
            // Unknown error - general
            var msg = "I'm sorry I was unable to reach the requested device. Please Try again later";
            console.error(msg + e.message);
            return msg;
        });


};

