import * as firebaseutils from "./firebaseutils";
import {datacentersRef} from "./firebaseutils";
import * as logutils from "./logutils";
import * as rackutils from "./rackutils";
import * as userutils from './userutils';

function getDatacenters(itemCount, callback, start = null) {
    let datacenters = [];
    let query = start ? firebaseutils.datacentersRef.orderBy("name").orderBy("abbreviation").limit(25).startAfter(start) : firebaseutils.datacentersRef.orderBy("name").orderBy("abbreviation").limit(25);
    query.get().then(docSnaps => {
        if (docSnaps.empty) {
            callback(null, null, null, true);
        } else {
            const newStart = docSnaps.docs[docSnaps.docs.length - 1];
            //console.log(docSnaps.docs)
            let count = 0;
            docSnaps.forEach(doc => {
                console.log(doc.data())
                datacenters.push({
                    count: itemCount++,
                    id: doc.id,
                    name: doc.data().name,
                    abbreviation: doc.data().abbreviation,
                    rackCount: doc.data().racks.length
                });
                count++;
                if (count === docSnaps.docs.length) {
                    console.log("")
                    callback(itemCount, newStart, datacenters, false);
                }
            });
        }
    }).catch(function (error) {
        callback(null, null, null, true);
    });
}

function getAllDatacenterNames(callback) {
    let datacenters = [];
    let count = 0;
    firebaseutils.datacentersRef.orderBy("name").orderBy("abbreviation").get().then(docSnaps => {
        if (docSnaps.empty) {
            callback([]);
        } else {
            //console.log(docSnaps.docs)
            docSnaps.docs.forEach(document => {
                datacenters.push(document.data().name);
                count++;
                if (count === docSnaps.size) {
                    callback(datacenters);
                }
            })
        }
    }).catch(function (error) {
        callback([]);
    })
}

function checkNameUnique(name, callback, self = null) {
    if (self && name === self) {
        callback(true);
    } else {
        firebaseutils.datacentersRef.where("name", "==", name).get().then(querySnapshot => {
            if (querySnapshot.empty) {
                callback(true);
            } else {
                callback(false);
            }
        })
    }
}

function checkAbbreviationUnique(abbrev, callback, self = null) {
    if (self && abbrev === self) {
        callback(true);
    } else {
        firebaseutils.datacentersRef.where("abbreviation", "==", abbrev).get().then(querySnapshot => {
            if (querySnapshot.empty) {
                callback(true);
            } else {
                callback(false);
            }
        })
    }
}

function addDatacenter(name, abbrev, callback) {
    checkNameUnique(name, nameResult => {
        if (nameResult) {
            checkAbbreviationUnique(abbrev, abbrevResult => {
                if (abbrevResult) {
                    firebaseutils.datacentersRef.add({
                        name: name,
                        abbreviation: abbrev,
                        racks: []
                    }).then(function (docRef) {
                        logutils.addLog(docRef.id, logutils.DATACENTER(), logutils.CREATE());
                        userutils.updateEveryonesAssetPermissions()
                        callback(true);
                    }).catch(function (error) {
                        callback(null);
                    })
                } else {
                    callback(null);
                }
            })
        } else {
            callback(null);
        }
    })
}

function deleteDatacenter(name, callback) {
    firebaseutils.datacentersRef.where("name", "==", name).get().then(querySnapshot => {
        if (querySnapshot.empty) {
            callback(null);
        } else {
            if (querySnapshot.docs[0].data().racks.length) {
                callback(null);
            } else {
                let docData = querySnapshot.docs[0].data();
                firebaseutils.datacentersRef.doc(querySnapshot.docs[0].id).delete().then(function () {
                    logutils.addLog(querySnapshot.docs[0].id, logutils.DATACENTER(), logutils.DELETE(), docData);
                    userutils.updateEveryonesAssetPermissions()
                    callback(true);
                }).catch(function (error) {
                    callback(null);
                })
            }
        }
    })
}

function updateDatacenter(oldName, oldAbbrev, newName, newAbbrev, callback) {
    if (oldName === newName && oldAbbrev === newAbbrev) {
        callback(true);
    }
    console.log("11")
    firebaseutils.datacentersRef.where("name", "==", oldName).get().then(querySnapshot => {
        if (querySnapshot.empty) {
            console.log("22")
            callback(null);
        } else {
            checkNameUnique(newName, result => {
                if (result) {
                    checkAbbreviationUnique(newAbbrev, abbrevResult => {
                        if (abbrevResult) {
                            updateAssets(oldName, newName, newAbbrev, updateAssetsResult => {
                                if(updateAssetsResult){
                                    logutils.getObjectData(querySnapshot.docs[0].id, logutils.DATACENTER(), dcData => {
                                        datacentersRef.doc(querySnapshot.docs[0].id).set({
                                            name: newName,
                                            abbreviation: newAbbrev
                                        }, {merge: true}).then(function () {
                                            //go through and update all assets
                                            console.log("77")
                                            logutils.addLog(querySnapshot.docs[0].id, logutils.DATACENTER(), logutils.MODIFY(), dcData);
                                            callback(true);
                                        }).catch(function (error) {
                                            console.log("88")
                                            callback(null);
                                        })
                                    })
                                } else {
                                    callback(null);
                                }
                            })
                        } else {
                            console.log("99")
                            callback(null);
                        }
                    }, oldAbbrev);
                } else {
                    console.log("100")
                    callback(null);
                }
            }, oldName);
        }
    })
}

function updateAssets(datacenterName, newName, newAbbrev, callback){
    getDataFromName(datacenterName, datacenterID => {
        if(datacenterID){
            let count = 0;
            firebaseutils.assetRef.where("datacenterID", "==", datacenterID).get().then(function (querySnapshot) {
                if(querySnapshot.empty){
                    callback(true);
                } else {
                    querySnapshot.docs.forEach(doc => {
                        doc.ref.update({
                            datacenter: newName,
                            datacenterAbbrev: newAbbrev
                        }).then(function () {
                            count++;
                            if(count === querySnapshot.size){
                                callback(true);
                            }
                        }).catch(function () {
                            callback(null);
                        })
                    })
                }
            }).catch(function () {
                callback(null);
            })
        } else {
            callback(null);
        }
    })
}


function getDataFromName(name, callback, offlineStorage = null) {
    if(offlineStorage){
        callback(true, true);
    } else {
        firebaseutils.datacentersRef.where("name", "==", name).get().then(querySnapshot => {
            if (querySnapshot.empty) {
                callback(null);
            } else {
                callback(querySnapshot.docs[0].id, querySnapshot.docs[0].data().abbreviation);
            }
        })
    }
}

function getAbbreviationFromID(id, callback) {
    firebaseutils.datacentersRef.doc(id).get().then(docSnap => {
        if (!docSnap.exists) {
            callback(null);
        } else {
            callback(docSnap.data().abbreviation);
        }
    })
}

function getAbbreviationFromName(name, callback){
    firebaseutils.datacentersRef.where("name", "==", name).get().then(function (querySnapshot) {
        if(!querySnapshot.empty){
            callback(querySnapshot.docs[0].data().abbreviation)
        } else {
            callback(null);
        }
    })
}

function addRackToDatacenter(rackID, datacenterName, callback) {
    getDataFromName(datacenterName, datacenterID => {
        if (datacenterID) {
            firebaseutils.datacentersRef.doc(datacenterID).update({
                racks: firebaseutils.firebase.firestore.FieldValue.arrayUnion(rackID)
            }).then(function () {
                callback(true);
            }).catch(function (error) {
                callback(null);
            })
        } else {
            callback(null);
        }
    })
}

function removeRackFromDatacenter(rackID, datacenterName, callback) {
    getDataFromName(datacenterName, datacenterID => {
        if (datacenterID) {
            firebaseutils.datacentersRef.doc(datacenterID).update({
                racks: firebaseutils.firebase.firestore.FieldValue.arrayRemove(rackID)
            }).then(function () {
                callback(true);
            }).catch(function (error) {
                callback(null);
            })
        } else {
            callback(null);
        }
    })
}

export {
    getDatacenters,
    addDatacenter,
    deleteDatacenter,
    updateDatacenter,
    getAllDatacenterNames,
    getDataFromName,
    addRackToDatacenter,
    removeRackFromDatacenter,
    getAbbreviationFromID,
    getAbbreviationFromName
}
