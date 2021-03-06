import * as firebaseutils from "./firebaseutils";
import * as assetutils from "./assetutils";
import * as logutils from "./logutils";
import * as userutils from "./userutils";
import {offlinestorageRef} from "./firebaseutils";
import {db} from "./firebaseutils";

const algoliasearch = require('algoliasearch')
const client = algoliasearch('V7ZYWMPYPA', '26434b9e666e0b36c5d3da7a530cbdf3')

function getStorageSites(itemCount, callback, start = null) {
    let storageSites = [];
    let query = start ? firebaseutils.offlinestorageRef.orderBy("name").orderBy("abbreviation").limit(25).startAfter(start) : firebaseutils.offlinestorageRef.orderBy("name").orderBy("abbreviation").limit(25);
    query.get().then(docSnaps => {
        if (docSnaps.empty) {
            callback(null, null, null, true);
        } else {
            const newStart = docSnaps.docs[docSnaps.docs.length - 1];
            let count = 0;
            docSnaps.forEach(doc => {
                firebaseutils.offlinestorageRef.doc(doc.id).collection("offlineAssets").get().then(function (sizeSnap) {
                    console.log(sizeSnap)
                    storageSites.push({
                        count: itemCount++,
                        id: doc.id,
                        assetCount: sizeSnap.size,
                        ...doc.data()
                    });
                    count++;
                    if (count === docSnaps.docs.length) {
                        callback(itemCount, newStart, storageSites, false);
                    }
                });
            });
        }
    }).catch(function (error) {
        callback(null, null, null, true);
    });
}

function getAllStorageSiteNames(callback, exclude = null) {
    let storageSites = [];
    let count = 0;
    firebaseutils.offlinestorageRef.orderBy("name").orderBy("abbreviation").get().then(docSnaps => {
        if (docSnaps.empty) {
            callback([]);
        } else {
            docSnaps.docs.forEach(document => {
                if(userutils.isLoggedInUserAdmin() || userutils.doesLoggedInUserHaveAssetPerm(null) || userutils.doesLoggedInUserHaveAssetPerm(document.data().abbreviation, true)){
                    console.log(exclude, document.data().abbreviation)
                    if(exclude && exclude !== document.data().abbreviation){
                        storageSites.push(document.data().name);
                    } else if(!exclude) {
                        storageSites.push(document.data().name);
                    }
                }
                count++;
                if (count === docSnaps.size) {
                    callback(storageSites);
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
        firebaseutils.offlinestorageRef.where("name", "==", name).get().then(querySnapshot => {
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
        firebaseutils.offlinestorageRef.where("abbreviation", "==", abbrev).get().then(querySnapshot => {
            if (querySnapshot.empty) {
                callback(true);
            } else {
                callback(false);
            }
        })
    }
}

function addStorageSite(name, abbrev, callback) {
    checkNameUnique(name, nameResult => {
        if (nameResult) {
            checkAbbreviationUnique(abbrev, abbrevResult => {
                if (abbrevResult) {
                    firebaseutils.offlinestorageRef.add({
                        name: name,
                        abbreviation: abbrev
                    }).then(function (docRef) {
                        userutils.updateEveryonesAssetPermissions();
                        logutils.addLog(docRef.id,logutils.OFFLINE_SITE(),logutils.CREATE())
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

function deleteStorageSite(name, callback) {
    firebaseutils.offlinestorageRef.where("name", "==", name).get().then(querySnapshot => {
        if (querySnapshot.empty) {
            callback(null);
        } else {
            firebaseutils.offlinestorageRef.doc(querySnapshot.docs[0].id).collection("offlineAssets").get().then(function (assetDocSnap) {
                if(assetDocSnap.empty){
                    firebaseutils.offlinestorageRef.doc(querySnapshot.docs[0].id).delete().then(function () {
                        userutils.updateEveryonesAssetPermissions();
                        logutils.addLog(querySnapshot.docs[0].id,logutils.OFFLINE_SITE(),logutils.DELETE(),querySnapshot.docs[0].data())
                        callback(true);
                    }).catch(function (error) {
                        callback(null);
                    })
                } else {
                    callback(null);
                }
            });
        }
    })
}

function updateStorageSite(oldName, oldAbbrev, newName, newAbbrev, callback) {
    if (oldName === newName && oldAbbrev === newAbbrev) {
        callback(true);
    }
    firebaseutils.offlinestorageRef.where("name", "==", oldName).get().then(querySnapshot => {
        if (querySnapshot.empty) {
            callback(null);
        } else {
            checkNameUnique(newName, result => {
                if (result) {
                    checkAbbreviationUnique(newAbbrev, abbrevResult => {
                        if (abbrevResult) {
                            firebaseutils.offlinestorageRef.doc(querySnapshot.docs[0].id).set({
                                name: newName,
                                abbreviation: newAbbrev
                            }, {merge: true}).then(function () {
                                logutils.addLog(querySnapshot.docs[0].id,logutils.OFFLINE_SITE(),logutils.MODIFY(),querySnapshot.docs[0].data())
                                callback(true);
                            }).catch(function (error) {
                                callback(null);
                            })
                        } else {
                            callback(null);
                        }
                    }, oldAbbrev);
                } else {
                    callback(null);
                }
            }, oldName);
        }
    })
}

function getInfoFromAbbrev(abbrev, callback){
    firebaseutils.offlinestorageRef.where("abbreviation", "==", abbrev).get().then(function (querySnapshot) {
        if(querySnapshot.empty){
            callback(null);
        } else {
            console.log(querySnapshot.docs[0].data().name, querySnapshot.docs[0].id)
            callback(querySnapshot.docs[0].data().name, querySnapshot.docs[0].id)
        }
    }).catch(function () {
        callback(null);
    })
}

function getInfoFromName(name, callback){
    firebaseutils.offlinestorageRef.where("name", "==", name).get().then(function (querySnapshot) {
        if(querySnapshot.empty){
            callback(null);
        } else {
            callback(querySnapshot.docs[0].data().abbreviation, querySnapshot.docs[0].id)
        }
    }).catch(function () {
        callback(null);
    })
}

function moveAssetToOfflineStorage(assetID, offlineStorageName, callback, moveFunction){
    console.log(moveFunction)
    console.log(offlineStorageName)
    getInfoFromName(offlineStorageName, (offlineStorageAbbrev, offlineStorageID) => {
        if(offlineStorageID){
            firebaseutils.assetRef.doc(String(assetID)).get().then(function (assetDocumentSnapshot) {
                if(assetDocumentSnapshot.exists){
                    firebaseutils.offlinestorageRef.doc(offlineStorageID).get().then(function (storageDocumentSnapshot) {
                        if(storageDocumentSnapshot.exists){
                            const savedAssetData = assetDocumentSnapshot.data();
                            let assetData = assetDocumentSnapshot.data();
                            assetData.networkConnections = {};
                            assetData.powerConnections = [];
                            assetData.datacenter = offlineStorageName;
                            delete assetData.datacenterAbbrev;
                            delete assetData.datacenterID;
                            delete assetData.rack;
                            delete assetData.rackID;
                            delete assetData.rackNum;
                            delete assetData.rackRow;
                            delete assetData.rackU;
                            firebaseutils.offlinestorageRef.doc(offlineStorageID).collection("offlineAssets").doc(String(assetID)).set(assetData).then(function () {
                                moveFunction(assetID, result => {
                                    if(result){
                                        let index = client.initIndex(offlineStorageAbbrev + "_index");
                                        let suffixes_list = []
                                        let _model = assetData.model;

                                        while (_model.length > 1) {
                                            _model = _model.substr(1)
                                            suffixes_list.push(_model)
                                        }

                                        let _hostname = assetData.hostname

                                        while (_hostname.length > 1) {
                                            _hostname = _hostname.substr(1)
                                            suffixes_list.push(_hostname)
                                        }

                                        let _owner = assetData.owner

                                        while (_owner.length > 1) {
                                            _owner = _owner.substr(1)
                                            suffixes_list.push(_owner)
                                        }

                                        index.saveObject({
                                            ...assetData,
                                            objectID: assetID,
                                            suffixes: suffixes_list.join(' ')
                                        }).then(({ objectID }) => {
                                            console.log(assetData, suffixes_list, objectID, offlineStorageAbbrev + "_index");
                                        });
                                        logutils.addLog(assetID,logutils.OFFLINE(),logutils.MOVE(),{...savedAssetData,datacenterAbbrev: offlineStorageAbbrev},()=>callback(true, offlineStorageAbbrev))
                                    } else {
                                        console.log("6")
                                        callback(null);
                                    }
                                }, true /*do this to allow no logged deletion*/, null /*this is for deleteAsset*/, offlineStorageName /*this is for updateChassis, shouldn't affect other methods*/)
                            }).catch(function () {
                                console.log("5")
                                callback(null);
                            })
                        } else {
                            console.log("4")
                            callback(null);
                        }
                    })
                } else {
                    console.log("3")
                    callback(null);
                }
            }).catch(function () {
                console.log("2")
                callback(null);
            })
        } else {
            console.log("1")
            callback(null);
        }
    })
}

function moveAssetFromOfflineStorage(assetID, datacenter, rack, rackU, callback, moveFunction){
    db.collectionGroup("offlineAssets").where("assetId", "==", String(assetID)).get().then(function (querySnapshot) {
        if(querySnapshot.empty){
            callback("The asset does not exist.");
        } else {
            let data = querySnapshot.docs[0].data();
            console.log(moveFunction)
            // remove assetId from doc to pass uniqueId check
            querySnapshot.docs[0].ref.update({assetId: ''}).then(() => {
              moveFunction(data.assetId, data.model, data.hostname, rack, parseInt(rackU), data.owner, data.comment, datacenter, {}, [], [],
                  data.variances["displayColor"], data.variances["memory"], data.variances["storage"], data.variances["cpu"], result => {
                      if(!result){
                          let parentDoc = querySnapshot.docs[0].ref.parent.parent;
                          offlinestorageRef.doc(parentDoc.id).collection("offlineAssets").doc(String(assetID)).delete().then(function () {
                              parentDoc.get().then(function (parentDocSnap) {
                                  let index = client.initIndex(parentDocSnap.data().abbreviation + "_index");
                                  index.deleteObject(assetID);
                                  logutils.addLog(data.assetId,logutils.ASSET(),logutils.MOVE(),data,()=>callback(null))
                              }).catch(function () {
                                  // reset assetId
                                  querySnapshot.docs[0].ref.update({assetId: String(assetID)}).then(() => callback("Could not get the par\rent document."))
                              });
                          }).catch(function () {
                              // reset assetId
                              querySnapshot.docs[0].ref.update({assetId: String(assetID)}).then(() => callback("Could not remove the asset from offline storage."))
                          })
                      } else {
                          // reset assetId
                          querySnapshot.docs[0].ref.update({assetId: String(assetID)}).then(() => callback(result))
                      }
                  },/*changePlanID*/ null, /*changeDocID*/ null, /*chassis*/ null, /*noLog*/ true)
            })
        }
    })
}

function moveAssetFromOfflineToOffline(assetID, newOfflineName, callback){
    getInfoFromName(newOfflineName, (newOfflineAbbrev, newOfflineID) => {
        if(newOfflineAbbrev){
            db.collectionGroup("offlineAssets").where("assetId", "==", assetID).get().then(function (assetQuerySnap) {
                if(assetQuerySnap.empty){
                    callback(null);
                } else {
                    let parentID = assetQuerySnap.docs[0].ref.parent.parent.id;
                    let assetDoc = assetQuerySnap.docs[0].data();
                    assetDoc.datacenter = newOfflineName;
                    offlinestorageRef.doc(parentID).collection("offlineAssets").doc(assetID).delete().then(function () {
                        offlinestorageRef.doc(newOfflineID).collection("offlineAssets").doc(assetID).set(assetDoc).then(function () {
                            assetQuerySnap.docs[0].ref.parent.parent.get().then(function (parentDocSnap) {
                                let oldIndex = client.initIndex(parentDocSnap.data().abbreviation + "_index");
                                let newIndex = client.initIndex(newOfflineAbbrev + "_index");
                                newIndex.saveObject(oldIndex.getObject());
                                oldIndex.deleteObject(assetID);
                                logutils.addLog(assetID, logutils.OFFLINE(), logutils.MOVE(),{...assetQuerySnap.docs[0].data(), datacenterAbbrev:newOfflineAbbrev},() => callback(true, newOfflineAbbrev))
                            }).catch(function (error) {
                                console.log(error)
                                callback(null);
                            })
                        }).catch(function (error) {
                            console.log(error)
                            callback(null);
                        })
                    }).catch(function (error) {
                        console.log(error)
                        callback(null);
                    })
                }
            }).catch(function (error) {
                console.log(error)
                callback(null);
            })
        } else {
            console.log("error")
            callback(null);
        }
    })
}

export {
    getStorageSites,
    getAllStorageSiteNames,
    checkNameUnique,
    checkAbbreviationUnique,
    addStorageSite,
    deleteStorageSite,
    updateStorageSite,
    getInfoFromAbbrev,
    moveAssetToOfflineStorage,
    moveAssetFromOfflineStorage,
    moveAssetFromOfflineToOffline
}
