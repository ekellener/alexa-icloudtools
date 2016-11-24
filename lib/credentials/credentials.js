var debug = require('debug')('credentials');
var fs = require('fs');
var Promise = require('bluebird');
var _ = require('underscore');
var KMS = require('aws-sdk').KMS;

/**
 * Main Constructor for Credentials. Takes an implementation strategy as a parameter
 * @param strategy
 * @param UserfriendlyException
 * @constructor
 */
function Credentials(strategy, Exception) {
    this.strategy = strategy;
    this.UserFriendlyException = Exception;
}

/**
 *
 * @param stem - the phrase to identify the device. The phrase is in the form of "<owner> <device-type>",
 * Example: Bob's laptop, Jerry's Phone.
 * The stem <owner> is also used as a key to look up the iCloud credentials file (e.g. "Bob", "email", "password")
 * @returns {*}
 * @constructor
 */

Credentials.prototype.lookup = function (stem) {
    var self = this;

    return self.strategy._getCreds()
        .then(function createCredsContext(decryptedCreds) {
            var accountContext = undefined;
            var credsAry = _(decryptedCreds).toArray();
            credsAry.forEach(function (c) {
                // Process stem by clipping the first part (assumed to be the FirstName to match in the creds key
                // Ensure possessive version of name is appropriately compared
                var comparestr = stem.toUpperCase().replace(/'S/g, "").replace(/S'/g, "S");

                if (c.key.toUpperCase() === comparestr) {
                    //Matched
                    //set the context to pass along
                    accountContext = {email: c.email, password: c.password, stem: stem};
                }
            });

            // Was able to connect, but was unable to find a match in the creds file
            if (!accountContext) {
                throw new self.UserFriendlyException("I was unable to find the configuration for " + stem + " Device");
            }
            else {
                return accountContext;
            }

        });

}


var Adapters = {};

/**
 * Strategies : Plain text Credentials
 * @param credsConfig
 * requires credsFile property in credsConfig
 */

Adapters.plainTxtCredentials = function (credsConfig) {
    var self = this;

    if (!credsConfig || !credsConfig.credsFile) {
        debug("Missing plainTxt configuration for Adapter, requires credsFile configuration");
        throw new Error("Unable to instantiate plainTxtAdapter incorrect configuration ");
        return;
    }

    this._getCreds = function () {

        var self = this;
        var credsResource = credsConfig.credsFile;
        var readFile = Promise.promisify(fs.readFile);
        return readFile(credsResource)
            .then(function (contents) {
                return JSON.parse(contents).icloud_logins;
            })
            .catch(function (e) {
                console.error(e.stack);
                throw e;
            });
    }

}

//TODO Abstract and use dependency injection for Credentials Encryption service

/**
 *
 * @param credsConfig
 *  credsConfig encryptedFile - Location of the encrypted file (defaulted at the application directory)
 * credsConfig .awsRegion - AWs formatted region used to for the KMS decryption API
 * credsConfig UserfriendlyException - Exception handler to return "user friendly" verbiage for the exception.
 */
Adapters.kmsCredentials = function (credsConfig) {

    if (!credsConfig || !credsConfig.encryptedFile || !credsConfig.awsRegion) {
        debug("Missing KMS configuration for Adapter, requires encryptedFile & awsRegion configuration");
        throw new Error("Unable to instantiate kmsAdapter");
        return;
    }
    this.encryptedFile = credsConfig.encryptedFile;
    this.awsRegion = credsConfig.awsRegion;
    this.kms = Promise.promisifyAll(new KMS({region: credsConfig.awsRegion}));


    this._getCreds = function () {

        var self = this;
        var credsResource = credsConfig.encryptedFile;
        var readFile = Promise.promisify(fs.readFile);
        return readFile(credsResource)
            .then(function (contents) {
                return self._decrypt(contents);
            })
            .catch(function (e) {
                console.error(e.stack);
                throw e;
            });
    }


    this._decrypt = function (contents) {
        var self = this;
        //Adding formatting for KMS method.
        var params = {
            CiphertextBlob: contents
        };

        return self.kms.decryptAsync(params)
            .then(function parseContents(contents) {
                try {
                    var decryptedCreds = contents['Plaintext'].toString();
                    return JSON.parse(decryptedCreds).icloud_logins;
                } catch (e) {
                    throw new Error("Unable to parse creds file");
                }
            })
            .catch(function (e) {
                console.error("_decrypt error " + e.message);
                throw e;
            });

    }

}


module.exports = {
    Credentials: Credentials,
    Adapters: Adapters
};