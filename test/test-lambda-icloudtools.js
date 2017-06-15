// Great Cheat Sheet on Chai, Mocha Sinon
// https://gist.github.com/yoavniran/1e3b0162e1545055429e


// TODO reorganize tests and breakout more mock and stub structures

var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
var config = require('config-node')();
var rewire = require('rewire');

var Credentials = require('../lib/credentials/credentials.js');
var context = require('aws-lambda-mock-context');
var lambdaICloudTools = rewire('../lambda-icloudtools.js');


var expect = chai.expect;
chai.use(chaiAsPromised);


var sinon = require('sinon');

// List of Stubs - eventually assigned and called during cleanup


var stemMocks = "Willy's laptop";


// Load up Mock Fixtures
var MockAlexaRequest = require('../lib/mock-alexa-request');
var mockFixtures = new MockAlexaRequest('./test/fixtures');
var addReminderRequest = mockFixtures.load('alexa-event-addReminder.json');
var startSessionRequest = mockFixtures.load('alexa-event-startSession.json');
var getDeviceListRequest = mockFixtures.load('alexa-event-getDeviceList.json');
var foundAlexaRequest = mockFixtures.load('alexa-event-pingDevice.json');

var notfoundAlexaRequest = JSON.parse(JSON.stringify(foundAlexaRequest));
notfoundAlexaRequest.request.intent.slots["Device"].value = "iwatch";
notfoundAlexaRequest.request.intent.slots["FirstNames"].value = "Barbara";

var welcomeAlexaRequest = JSON.parse(JSON.stringify(foundAlexaRequest));
welcomeAlexaRequest.request.type = "LaunchRequest";


// common references
var revertlambdaICloudTools;
var ctx;
var speechResponse;
var speechError;

describe("Amazon Alexa/Echo Tests", function () {

    describe("The Welcome request is processed correctly", function () {
        before(function (done) {
            ctx = context();
            speechResponse = null;
            speechError = null;

            lambdaICloudTools.handler(welcomeAlexaRequest, ctx);
            ctx.Promise
                .then(function (resp) {
                    speechResponse = resp;
                    done();
                })
                .catch(function (err) {
                    speechError = err;
                    done();
                });
        });


        it('should not have caused an error', function () {
            expect(speechError).to.be.null;
        });

        it('should have a version', function () {
            expect(speechResponse.version).not.to.be.null
        });

        it('should have a speechlet response', function () {
            expect(speechResponse.response).not.to.be.null
        });

        it("should have a spoken response Welcome Response)", function () {
            var speakregex = new RegExp('\<(\/)*speak\>', 'g');
            var stripspeak = speechResponse.response.outputSpeech.ssml.replace(speakregex, '');
            var alexaresponse = config.Alexa.introMessage;

            expect(alexaresponse).to.equal(stripspeak);
        });

    });

    describe("Intent Request Found (pingDevice) The response is structurally correct for Alexa Services", function () {

        before(function (done) {
            ctx = context();
            speechResponse = null;
            speechError = null;

            var icloudtools = {
                pingDevice: function (name) {
                    return Promise.resolve("An alert has been sent to " + name.FirstNames + " " + name.Device);
                }
            };


            revertlambdaICloudTools = lambdaICloudTools.__set__('iCloudTools', icloudtools);

            lambdaICloudTools.handler(foundAlexaRequest, ctx);
            ctx.Promise
                .then(function (resp) {
                    speechResponse = resp;
                    done();
                })
                .catch(function (err) {
                    speechError = err;
                    done();
                });

        });

        after(function () {
            revertlambdaICloudTools();
        });

        it('should not have caused an error', function () {

            expect(speechError).to.be.null;
        });

        it('should have a version', function () {
            expect(speechResponse.version).not.to.be.null
        });

        it('should have a speechlet response', function () {
            expect(speechResponse.response).not.to.be.null;
        });

        it('should have a spoken response (sent an alert)', function () {
            var speakregex = new RegExp('\<(\/)*speak\>', 'g');
            var stripspeak = speechResponse.response.outputSpeech.ssml.replace(speakregex, '');
            var alexaresponse = "An alert has been sent to " + stemMocks;
            expect(alexaresponse).to.equal(stripspeak);
        });

        it("should end the alexa session", function () {
            expect(speechResponse.response.shouldEndSession).not.to.be.null;
            expect(speechResponse.response.shouldEndSession).to.be.true
        });


    });

    describe("Intent Request addReminder. The response is structurally correct for Alexa Services", function () {

        before(function (done) {
            ctx = context();
            speechResponse = null;
            speechError = null;

            var icloudtools = {
                addCloudReminder: function (intentRequest) {
                    return Promise.resolve("pick up the groceries has been added");
                }
            };

            revertlambdaICloudTools = lambdaICloudTools.__set__('iCloudTools', icloudtools);
            lambdaICloudTools.handler(addReminderRequest, ctx);
            ctx.Promise
                .then(function (resp) {
                    speechResponse = resp;
                    done();
                })
                .catch(function (err) {
                    speechError = err;
                    done();
                });

        });

        after(function () {
            revertlambdaICloudTools();
        });

        it('should not have caused an error', function () {

            expect(speechError).to.be.null;
        });

        it('should have a version', function () {
            expect(speechResponse.version).not.to.be.null
        });

        it('should have a speechlet response', function () {
            expect(speechResponse.response).not.to.be.null
        });

        it('should have a spoken response (sent an alert)', function () {
            var speakregex = new RegExp('\<(\/)*speak\>', 'g');
            var stripspeak = speechResponse.response.outputSpeech.ssml.replace(speakregex, '');
            var alexaresponse = "pick up the groceries has been added";
            expect(alexaresponse).to.equal(stripspeak);
        });

        it("should end the alexa session", function () {
            expect(speechResponse.response.shouldEndSession).not.to.be.null;
            expect(speechResponse.response.shouldEndSession).to.be.true
        });

    });

    describe("Intent Request - Not Found. The response is structurally correct for Alexa Services. ", function () {

        before(function (done) {
            ctx = context();
            speechResponse = null;
            speechError = null;

            var icloudtools = {
                pingDevice: function (name) {
                    return Promise.resolve("I'm sorry I was unable to reach the requested device. Please Try again later");
                }
            };


            revertlambdaICloudTools = lambdaICloudTools.__set__('iCloudTools', icloudtools);

            lambdaICloudTools.handler(foundAlexaRequest, ctx);

            ctx.Promise
                .then(function (resp) {
                    speechResponse = resp;
                    done();
                })
                .catch(function (err) {
                    speechError = err;
                    done();
                });
        });

        after(function () {
            revertlambdaICloudTools();
        });


        it('should not have caused an error', function () {
            expect(speechError).to.be.null;
        });

        it('should have a version', function () {
            expect(speechResponse.version).not.to.be.null
        });

        it('should have a speechlet response', function () {
            expect(speechResponse.response).not.to.be.null
        });

        it('should have a spoken response (sent an alert)', function () {
            var speakregex = new RegExp('\<(\/)*speak\>', 'g');
            var stripspeak = speechResponse.response.outputSpeech.ssml.replace(speakregex, '');
            var alexaresponse = "I'm sorry I was unable to reach the requested device. Please Try again later";
            expect(alexaresponse).to.equal(stripspeak);
        });

        it("should end the alexa session", function () {
            expect(speechResponse.response.shouldEndSession).not.to.be.null;
            expect(speechResponse.response.shouldEndSession).to.be.true
        });

    });


});


describe.skip("Amazon Alexa/Echo Integration Tests", function () {
    // LIVE TEST - Disabled by default, unless you want an actual live test to ping your device each time.

    describe.skip("Full Integration loop test getDeviceList ", sinon.test(function () {
        this.timeout(30000);
        var lambda = require('../lambda-icloudtools');

        before(function (done) {
            ctx = context({
                timeout: 300
            });
            speechResponse = null;
            speechError = null;

            // override to access real data. Ensure it matches the credentials format.
            getDeviceListRequest.request.intent.slots["FirstNames"].value = "Erik's";

            lambda.handler(getDeviceListRequest, ctx);
            ctx.Promise
                .then(function (resp) {
                    speechResponse = resp;
                    done();
                })
                .catch(function (err) {
                    speechError = err;
                    done();
                });
        });


        it('should have a speechlet response', function () {
            return expect(speechResponse.response).not.to.be.null
        });

    }));

    describe.skip("Full Integration loop test PingDevice ", sinon.test(function () {
        this.timeout(99000);
        var lambda = require('../lambda-icloudtools');

        before(function (done) {
            ctx = context({
                timeout: 300
            });
            speechResponse = null;
            speechError = null;


            // override to access real data. Ensure it matches the credentials format.
            foundAlexaRequest.request.intent.slots["FirstNames"].value = "Eric";
            foundAlexaRequest.request.intent.slots["Device"].value = "Phone";


            lambda.handler(foundAlexaRequest, ctx);
            ctx.Promise
                .then(function (resp) {
                    speechResponse = resp;
                    done();
                })
                .catch(function (err) {
                    speechError = err;
                    done();
                });
        });


        it('should have a speechlet response', function () {
            return expect(speechResponse).not.to.be.null;
        });

    }));

    describe.skip("Full Integration loop test AddReminder ", function () {
        this.timeout(80000);
        var lambda = require('../lambda-icloudtools');

        before(function (done) {
            ctx = context({
                timeout: 300
            });
            speechResponse = null;
            speechError = null;

            // override to access real data. Ensure it matches the credentials format.
            addReminderRequest.request.intent.slots["FirstNames"].value = "Eric's";

            lambda.handler(addReminderRequest, ctx);
            ctx.Promise
                .then(function (resp) {
                    speechResponse = resp;
                    done();
                })
                .catch(function (err) {
                    speechError = err;
                    done();
                });
        });


        it.skip('should have a speechlet response', function () {
            expect(speechResponse.response).not.to.be.null
        });

    });

    describe.skip("Full Integration loop startSession ", function () {
        this.timeout(10000);
        var lambda = require('../lambda-icloudtools');

        before(function (done) {
            ctx = context();
            speechResponse = null;
            speechError = null;


            lambda.handler(startSessionRequest, ctx);
            ctx.Promise
                .then(function (resp) {
                    speechResponse = resp;
                    done();
                })
                .catch(function (err) {
                    speechError = err;
                    done();
                });
        });


        it('should have a speechlet response', function () {
            expect(speechResponse.response).not.to.be.null
        });

    })

});








