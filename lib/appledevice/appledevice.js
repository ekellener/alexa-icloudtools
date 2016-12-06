var debug = require('debug')('appledevice');

var Promise = require('bluebird');
var _ = require('underscore');

/**
 *
 * @param acct - Credentials used to access iCloud Account
 * @param browserCookieFile - specify where HTTPClient cookies are stored
 * @param msg -
 * @param UserfriendlyException
 * @constructor
 */
var ICloudConnection = function (acct, browserCookieFile, UserfriendlyException) {
    this.acct = acct;
    this.UserfriendlyException = UserfriendlyException;

    // prep icloudclient instance (clearing out previous cookies for a new session
    _clearCookies(browserCookieFile, UserfriendlyException);

    // Create an internal instance of ICloud and promisfy.
    var ICloud = require('find-apple-device');
    this._iCloudAsync = new Promise.promisifyAll(new ICloud(acct.email, acct.password, {cookieFile: browserCookieFile}));

};

ICloudConnection.prototype.getDeviceList = function (stem) {
    var namedList;
    var stemClip = stem.toUpperCase().replace(/'S/g, "").replace(/S'/g, "S");
    var self = this;

    return self._iCloudAsync.getDevicesAsync()
        .then(function (fullList) {
                namedList =  _.filter(fullList, function (device) {
                var deviceNameStub = device.name.split(' ')[0].toUpperCase().replace(/'S/g, "").replace(/S'/g, "S");
                if (stemClip == deviceNameStub) {
                    return true;
                } else {
                    return false;
                }
            });

       })
        .then(function () {
           self._iCloudAsync.namedList = namedList;
            return namedList;
        })
        .catch(function (e){
            throw new self.UserfriendlyException("Unable to connect to eye cloud. Please try again later.");
        })
        .bind(this);
};

/**
 *
 * @param cTitle
 * @returns {*}
 */
ICloudConnection.prototype.getReminders = function (cTitle) {

    // Populate Reminders and store Collectionid
    return this._iCloudAsync.getRemindersAsync(cTitle);
}


ICloudConnection.prototype.addReminder = function (collectionName, reminder) {
    var self = this;

// TODO improve exception handling
    var collection = _.where(self._iCloudAsync.resreminders.Collections, {title: collectionName});
    if (collection.length == 0) {
        throw new self.UserfriendlyException("The current account, has no valid reminder groups.");
    } else {
        // Need to add the Collection ID to the reminder
        reminder = _.extend({pGuid: collection[0].guid}, reminder);

        return this._iCloudAsync.addReminderAsync(reminder).then(function () {
            return reminder.title + " has been added";
        });
    }


}

/**
 *
 * @param stem - original match phrase
 * @returns {Promise<U>|Thenable<U>}
 */

ICloudConnection.prototype.find = function (stem) {

    var self = this;
    var matchKey;

    // Get list of devices under account current Connection (login)
    return this._iCloudAsync.getDevicesAsync()
        .then(function findMatchingStem(devices) {

            if (devices.length === 0) {
                throw new self.UserfriendlyException("Was able to connect to your account, but did not find any devices to notify.");
            } else {
                // Search through list to find device names that match requested device
                var found = false;
                for (var device in devices) {
                    debug("[" + devices[device].name + "] " + "[" + stem + "]");
                    if (devices[device].name.toUpperCase() === stem.toUpperCase()) {
                        // Found it.. now notify.
                        debug("found  " + stem);
                        found = true;
                        matchKey = device;
                        break;
                    }
                }
                // Didn't find a match from device list.
                if (found == false) {
                    throw new self.UserfriendlyException("Unable to find the device named " + stem);
                }
                return devices[matchKey];
            }
        });
}


ICloudConnection.prototype.alert = function (deviceRecord, alertMessage) {
    var self = this;

    return this._iCloudAsync.alertDeviceAsync(deviceRecord.id, alertMessage)
        .then(function () {
            return "An alert has been sent to " + deviceRecord.name;
        })
        .catch(function (e) {
            throw new self.UserfriendlyException("Attempted to alert device, but was unsuccessful. Please try again later");
        });
}


/**
 * Broken out of contstructor to allow for mocks
 * @param browserCookieFile
 * @param UserfriendlyException
 * @private
 */
var _clearCookies = function (browserCookieFile, UserfriendlyException) {
    var fs = require('fs');

    //Delete previous cookie to ensure new session.Hard code to ensure it functions correctly in Lambda env.
    try {
        fs.unlinkSync(browserCookieFile);
    } catch (e) {
        if (e.code === 'ENOENT') {
            debug("Nothing to delete:ignore " + e);
        } else {
            console.error("Unable to clear HTTP session cookies. iCloud login may fail");
            throw new UserfriendlyException("Sorry. I was unable to connect with the Eye Cloud Service. Please Try again later.");
        }
    }

}


module.exports = ICloudConnection;
