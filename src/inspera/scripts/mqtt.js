'use strict';

const uuid = require('node-uuid');
const MQTT = require('paho-mqtt');

function PahoMQTTClientWrapper(url, channel, userId, csrfToken, onMessageReceived) {
    let client;
    function createAndConnect() {
        try {
            client = new MQTT.Client(url, uuid.v4());
        } catch (e) {
            console.error("Failed to create Paho MQTT client", e);
            return;
        }
        client.onConnectionLost = onConnectionLost;
        client.onMessageArrived = onMessageArrived;
        
        const connectOptions = {
            useSSL: true,
            timeout: 3,
            mqttVersion: 4,
            onSuccess: function () {
                console.log('Client connected to AWS IoT');
                client.subscribe(channel);
            },
            onFailure: function () {
                reconnectClient();
            }
        };

        client.connect(connectOptions);
    };
    
    const onMessageArrived = function (message) {
        let messageObject = JSON.parse(message.payloadString);
        const triggeringUserId = messageObject.data.triggeringUser;
        if (triggeringUserId !== userId) {
            delete messageObject.data.triggeringUser;
            messageObject.data = JSON.stringify(messageObject.data);
            onMessageReceived(messageObject);
        }
    };

    const onConnectionLost = function (e) {
        console.info('Client disconnected', e);
        reconnectClient();
    };
    
    const reconnectClient = function () {
        setTimeout(function () {
            console.info('Reconnecting');
            fetch('/ICSXapi/assessment/GetSignedWebSocketUrl?token=' + csrfToken)
                .then(function(response) {
                    return response.json();
                })
                .then(function(data) {
                    url = data.signedWebSocketUrl;
                    console.info('Got new websocket url');
                    client = undefined;
                    createAndConnect();
                })
                .catch(function(error) {
                    console.error('Error getting new websocket url', error);
                    reconnectClient();
                });
        }, 20000);
    };
    
    this.createAndConnect = createAndConnect;
}
module.exports = PahoMQTTClientWrapper;