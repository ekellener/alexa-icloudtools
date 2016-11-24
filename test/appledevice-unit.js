var chai = require("chai");
var sinon = require('sinon');
var chaiAsPromised = require("chai-as-promised");

var expect = chai.expect;
var assert = chai.assert;
chai.use(chaiAsPromised);

var config = require('config-node')();
var AlexaResponseError = require('../lib/alexa-error/alexa-error.js');
var rewire = require('rewire');
var ICloud = rewire('find-apple-device');
var Credentials = require('../lib/credentials/credentials.js');

var ICloudConnection;
var iCloudConnection;
var revertClearCookiesFile;





// List of Stubs - eventually assigned and called during cleanup

var credMocks = [
    {
        "key": "Willy's",
        "email": "Willy@Wonka.com",
        "password": "GoodDeedInAWearyWorld"
    }]


var stemMocks = "Willy's laptop";


var iCloudDeviceMock = [];
iCloudDeviceMock.push({
    "name": stemMocks,
    "id": "vLq76K6u20yv6o4EBeVotz2HozToy50JQacry5VKvRYsMKTP4lPmGw=="
});


var fsMock = {
    unlinkSync: function (file) {
        return undefined;
    }
};


describe("Apple Device Unit Tests", function () {

    describe('Device ICloud tests', sinon.test(function () {
        var RequireICloud = require('../lib/appledevice/appledevice.js');
        var RewireICloud = rewire('../lib/appledevice/appledevice.js');
        var rewireICloudConn;
        var requireiCloudConn;
        var _iCloudAsyncMock;
        var getRemindersStub;
        var addReminderStub;
        var getDevicesStub;

        before(function () {

            // Set up Stubs, Mocks and Rewires
            revertClearCookiesFile = RewireICloud.__set__("fs", fsMock);
            rewireICloudConn = new RewireICloud(credMocks[0], "blah", AlexaResponseError);
            requireiCloudConn = new RequireICloud(credMocks[0], "blah", AlexaResponseError);

            _iCloudAsyncMock = sinon.mock(requireiCloudConn._iCloudAsync);
            getDevicesStub = sinon.stub(requireiCloudConn._iCloudAsync, 'getDevicesAsync');
            getRemindersStub = sinon.stub(requireiCloudConn._iCloudAsync, 'getRemindersAsync');
            addReminderStub = sinon.stub(requireiCloudConn._iCloudAsync, 'addReminderAsync');

        })

        after(function () {
            revertClearCookiesFile();

        });


        it("constructor initialization", function () {
            expect(rewireICloudConn.acct, "Acct match indicates constructor has been correctly created")
                .to.equal(credMocks[0]);
        });


        it("Find", sinon.test(function () {

            //     _iCloudAsyncMock.expects('getDevicesAsync')
            getDevicesStub
                .returns(Promise.resolve(iCloudDeviceMock));

            expect(requireiCloudConn.find(stemMocks))
                .to.eventually.equal(iCloudDeviceMock[0]);

            _iCloudAsyncMock.verify();
        }));


        it("Find (fails and throws exception)", sinon.test(function () {

            getDevicesStub.returns(Promise.resolve([{id: "12345", name: "Danny's laptop"}]));

            return expect(requireiCloudConn.find(stemMocks))
                .to.eventually
                .rejectedWith(AlexaResponseError, "Unable to find the device named Willy's laptop");

            getDevicesStub.verify();

        }));

        it("Find (No devices returned and throws exception)", sinon.test(function () {

            getDevicesStub.returns(Promise.resolve([]));

            return expect(requireiCloudConn.find(stemMocks))
                .to.eventually
                .rejectedWith(AlexaResponseError, "Was able to connect to your account, but did not find any devices to notify.");

            getDevicesStub.verify();

        }));


        it("alert", sinon.test(function () {
            _iCloudAsyncMock.expects('alertDeviceAsync')
                .withArgs(iCloudDeviceMock[0].id, config.deviceAlert.message)
                .returns(Promise.resolve("An alert has been sent to " + iCloudDeviceMock[0].name));

            expect(requireiCloudConn.alert(iCloudDeviceMock[0], config.deviceAlert.message))
                .to.eventually.equal("An alert has been sent to " + iCloudDeviceMock[0].name);

            _iCloudAsyncMock.verify();
        }));

        it("getReminders", sinon.test(function () {

            //Set expectations for the return value
            getRemindersStub.returns(Promise.resolve({Reminders: [{pguid: "12345"}], Collections: [{guid: "12345"}]}));
            return expect(requireiCloudConn.getReminders("blah"))
                .to.eventually.deep.property("Collections[0].guid", "12345");

            getRemindersStub.verify();
        }));

        it("addReminders", sinon.test(function () {

            // Fake structures added (simulate post addReminder()
            requireiCloudConn._iCloudAsync.resreminders = {Collections: [{title: "Reminders"}]};
            addReminderStub.returns(Promise.resolve());

            return expect(requireiCloudConn.addReminder("Reminders", {title: "Fake reminder"}, AlexaResponseError))
                .to.eventually.equal("Fake reminder has been added");
            addReminderStub.verify();


        }));

        it("addReminders fails and throws exception", sinon.test(function () {
            // Fake structures added (simulate unfamiliar collection name
            requireiCloudConn._iCloudAsync.resreminders = {Collections: [{title: "Fake collection"}]};
            var addReminderSpy = sinon.spy(requireiCloudConn, "addReminder");
            try {
                requireiCloudConn.addReminder("Reminders", {title: "Fake reminder"}, AlexaResponseError);
            } catch (e) {
            }
            assert(addReminderSpy.threw("AlexaResponseError"));
        }));

    }));
});

