/**
Copyright (C) 2019 Christopher Brandt

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.

Contact Info: xtopher.brandt at gmail
*/

'use strict';

const app = require('./app.js');
const functions = require('firebase-functions');
const admin = require('./initApp');

// When a version of the action is submitted for Beta or Production, 
// Actions on Google takes a snapshot of the current DiagloFlow state, including the fulfillment route.
// However the firebase function code is not part of the snapshot. Meaning that changes to the fulfillment function (in firebase)
// will affect a released version of the action, if the function named in the fulfillment route is same as the
// function being changed.
//
// To allow the firebase function to be independently maintained without affecting released versions of the action,
// each release of the action will target a function versioned by name
// the naming scheme is: '/fulfillment_{version.major}_{version.minor}'
// example: '/fulfillment_2019_10'
//
// When deploying a version for the first time be sure to NOT delete any previous versions
//
// The version of the function should match the git branch name

exports.fulfillment_2019_1 = functions.https.onRequest(app);

exports.getSearchRequest = functions.https.onRequest((req, res) => {
    console.log('made the request! ');
    const requestId = req.params[0];

    console.log('REQ ID:', requestId);

    return admin.database().ref('searchRequest/' + requestId)
        .on('value', (snapshot) => {
            const response = snapshot.val();
            console.log('snapshot: ', response);

            if (!response) {
                res.sendStatus(404)
                return;
            }

            res.send(snapshot.val());
        })
});

exports.clearDatabase = functions.https.onRequest(( _, res) => {
    console.log('WARNING: CLEANING THE DATABASE');
 
    return admin.database().ref('searchRequest/currentIndex')
        .once('value')
        .then((snapshot) => {
            const index = snapshot.val();
            const updates = {};

            for (let i = 0; i < index; i++) {
                updates[i] = null;
            }

            admin.database().ref()
                .update(updates)
                .then(() => {
                    admin.database().ref().update({
                        'searchRequest/currentIndex': 0
                    })
                    .then((something) => {
                        console.log('Successful increment: ', newIndex);
                        console.log('Update returned: ', something);
                        res.sendStatus(200);
                    });
                })
                .catch((error) => {
                    console.log('ERROR in updating the currentIndex to 0:', error);
                    res.sendStatus(400);
                })
        })
        .catch((error) => {
            console.log('ERROR in getting the currentIndex:', error);
            res.sendStatus(400);
        })
});