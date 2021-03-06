import * as firebase from 'firebase/app'
import 'firebase/firestore'
import 'firebase/database'
import { sha256 } from 'js-sha256'

const firebaseConfig = {
    apiKey: "AIzaSyDYysL-YL2Q6Edyrukt2pMP9CZlKVzLfOs",
    authDomain: "hyposoft-test.firebaseapp.com",
    databaseURL: "https://hyposoft-test.firebaseio.com",
    projectId: "hyposoft-test",
    storageBucket: "hyposoft-test.appspot.com",
    messagingSenderId: "505613544306",
    appId: "1:505613544306:web:3f7e8074d506415eec0beb",
    measurementId: "G-2XZ7TZ4NRT"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig)

var salt = 'Do8239urjfhawfA'

function hashAndSalt(data) {
    return sha256(data + salt)
}

function makeSalt(length) {
    // Randomly generates a salt of requested length
    var result           = ''
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    var charactersLength = characters.length
    for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength))
    }
    return result
}

function hashAndSalt2(data, randSalt=null) {
    if (!randSalt) {
        randSalt = makeSalt(15)
    }
    return sha256(data + randSalt)+'|'+randSalt
}

const db = firebase.firestore()
const testDB = firebase.database()

var usersRef = db.collection('users')
var claimsRef = db.collection('claims')
var recoveriesRef = db.collection('recoveries')
var assetRef = db.collection('assets')
var racksRef = db.collection('racks')
var modelsRef = db.collection('models')
var datacentersRef = db.collection('datacenters')
var logsRef = db.collection('logs')
var changeplansRef = db.collection('changeplans')
var decommissionRef = db.collection('decommission')
var bladeRef = db.collection('bladeInfo')
var offlinestorageRef = db.collection('offlinestorage')

export { hashAndSalt, hashAndSalt2, usersRef, racksRef, assetRef, modelsRef, claimsRef, recoveriesRef, datacentersRef, logsRef, testDB, db, firebase, changeplansRef, decommissionRef, offlinestorageRef, bladeRef }
