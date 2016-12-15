var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
var expect = chai.expect;
var sinon = require('sinon');
var Promise = require('bluebird');
//var config = require('config-node')();
var rewire = require('rewire');
var KMS = require('aws-sdk').KMS;

var reqCredentials = require('../lib/credentials/credentials.js');

var AlexaResponseError = require('../lib/alexa-error/alexa-error.js');
// List of Stubs - eventually assigned and called during cleanup


var credentials;
var Credentials;
var strategy;
var mockgetdecryptedcreds;
var stemMocks;
var mockAdapter;
var kmsAdapter;
var kmsMock;
var fsStub;


var credMocks = [
    {
        "key": "Willy",
        "email": "Willy@Wonka.com",
        "password": "GoodDeedInAWearyWorld"
    }];


var fullCredsMock = {
    "icloud_logins": [
        {
            "key": ["Willy's","Billy's","Willam's"] ,
            "email": "Willy@Wonka.com",
            "password": "GoodDeedInAWearyWorld"
        }
    ]
};


describe("Credentials Unit test", function () {
    before(function(){
        // Default matching MockAdapter
        mockAdapter = {
            icloud_logins: [],
            _getCreds:  function(){
                return Promise.resolve(this.icloud_logins);
            }

        };
        mockAdapter.icloud_logins =fullCredsMock.icloud_logins;
        credentials = new reqCredentials.Credentials(mockAdapter,AlexaResponseError);
        stemMocks = fullCredsMock.icloud_logins[0].key[2];
//    var txtAdapter = new reqCredentials.Adapters.plainTxtCredentials({credsFile: "creds.dcr"});
//    var kmsAdapter = new reqCredentials.Adapters.kmsCredentials({awsRegion: "us-east-1",encryptedFile: "creds.base64"});
    })


    it("Test lookup (successful lookup))", sinon.test( function(){
        return expect(credentials.lookup(stemMocks))
          .to.eventually.be.fulfilled;
    }));


    it("Test lookup (failed lookup)", sinon.test( function(){
        // test unable to find state
        stemMocks = "Nada's";
        return expect(credentials.lookup(stemMocks))
            .to.eventually.be.rejectedWith(AlexaResponseError, "Sorry, I was unable to find the configuration for any of " + stemMocks+ " Devices");
    }));


    it("Test txtAdapter exception for initialization", sinon.test(function () {
            var fnc = function(){new reqCredentials.Adapters.plainTxtCredentials({faux: 1234})};
            expect(fnc)
                .to.throw(Error);
        })
    );


    it("Test kmsAdapter exception for initialization", sinon.test(function () {
            var fnc = function(){new reqCredentials.Adapters.kmsCredentials({faux: 1234})};
            expect(fnc)
                .to.throw(Error);
        })
    );


});


describe("Credentials encryption testing", function () {

    var revert_fs;

    beforeEach(function(){

        stemMocks = fullCredsMock.icloud_logins[0].key[2];

        // Stub out fs readFile (bypass file IO)
        reqCredentials = rewire('../lib/credentials/credentials.js');
        fsStub = {
            readFile : function(resource,cb){
                cb(null,{
                    Plaintext: new Buffer(JSON.stringify(fullCredsMock))
                });
            }
        }
        revert_fs = reqCredentials.__set__('fs',fsStub);

        // Mock out KMS.decryptAsync (bypass KMS key function
        kmsAdapter = new reqCredentials.Adapters.kmsCredentials({awsRegion: "us-east-1",encryptedFile: "creds.base64"});
        kmsMock = sinon.mock(kmsAdapter.kms);
        //Mock the KMS decryptfunction
        var buf = new Buffer(JSON.stringify(fullCredsMock));
        kmsMock.expects('decryptAsync')
            .once()
            .returns(new Promise
                .resolve({
                    Plaintext: buf
                })
        );

        credentials = new reqCredentials.Credentials(kmsAdapter,AlexaResponseError);

    });


    it("Test lookup (successful lookup))", sinon.test(function(){
       return expect(credentials.lookup(stemMocks))
            .to.eventually.be.fulfilled;

    }));



    afterEach(function(){
        revert_fs();
        kmsMock.verify();
        kmsMock.restore();

    });
});