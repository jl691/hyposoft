import { assetRef, racksRef, modelsRef, usersRef, firebase, datacentersRef, changeplansRef, decommissionRef, offlinestorageRef, db, firebaseutils, bladeRef } from './firebaseutils'
import * as rackutils from './rackutils'
import * as modelutils from './modelutils'
import * as assetIDutils from './assetidutils'
import * as datacenterutils from './datacenterutils'
import * as assetnetworkportutils from './assetnetworkportutils'
import * as assetpowerportutils from './assetpowerportutils'
import * as changeplanutils from './changeplanutils'
import * as offlinestorageutils from './offlinestorageutils'
//for testing/console logging purposes:
import errorStrings from '../res/errorMessages.json'
import { addAsset } from './assetutils'

//the callback(false) ight not serve any purpose, was thinking of using it in unit testing or as a return val?


const rackNonExistent = (changePlanID, stepID, rackName, datacenter, datacenterID, callback, chassisHostname = null) => {
    let splitRackArray = rackName.split(/(\d+)/).filter(Boolean)

    let rackRow = splitRackArray[0]
    let rackNum = parseInt(splitRackArray[1])
    let errorIDSet = new Set();

    let isBlade = chassisHostname ? true : false

    console.log(rackName)
    console.log("Chassis hostname: " + chassisHostname)
    console.log(isBlade)
    console.log(datacenterID)

    rackutils.getRackID(rackRow, rackNum, datacenter, function (rackID) {
        console.log("This is the rakcID: " + rackID)

        if (!rackID) {
            errorIDSet.add("rackErrID")
            addConflictToDBDatabase(changePlanID, stepID, "rack", errorIDSet, status => {
                callback(status)
            });

        }
        else {
            let ref = isBlade ? racksRef.doc(rackID).collection('blades') : racksRef

            ref.where("letter", "==", isBlade ? chassisHostname : rackRow).where("number", "==", isBlade ? 1 : rackNum).where("datacenter", "==", datacenterID).get().then(function (querySnapshot) {
                console.log(querySnapshot)

                if (querySnapshot.empty) {
                    //console.log("The rack exists")

                    errorIDSet.add(isBlade ? "chassisErrID" : "rackErrID")
                    addConflictToDBDatabase(changePlanID, stepID, isBlade ? "chassis" : "rack", errorIDSet, status => {

                        callback(status)
                    });
                }
                //rack exists
                else {
                    callback(false)
                }

            })
        }
    })

}

const datacenterNonExistent = (changePlanID, stepID, datacenterName, callback, toOffline = null) => {
    let errorIDSet = new Set();
    console.log("This is the datacenter name: " + datacenterName)
    datacenterutils.getDataFromName(datacenterName, async function (data) {
        offlinestorageRef.where("name", "==", datacenterName).get().then(offlineDoc => {
            console.log(data)
            if (!data && offlineDoc.empty) { //didn't find the datacenter in datacenter and offline storage db
                errorIDSet.add(toOffline ? "offlineStorageErrID" : "datacenterErrID")
                addConflictToDBDatabase(changePlanID, stepID, toOffline ? "offlineStorage" : "datacenter", errorIDSet, status => {
                    callback(status)
                })
            }
            else {
                // console.log("The datacenter does not exist")
                callback(false)
            }
        })

    })

}

const hostnameConflict = (changePlanID, stepID, assetID, hostname, callback) => {
    let errorIDSet = new Set();
    assetRef.where("hostname", "==", hostname).get().then(async function (docSnaps) {

        if (!docSnaps.empty && hostname !== "" && docSnaps.docs[0].data().assetId !== assetID) {

            errorIDSet.add("hostnameDBErrID")

            addConflictToDBDatabase(changePlanID, stepID, "hostname", errorIDSet, status => {
                callback(status)
            })

        }
        else {
            callback(false)
        }

    })

}

//does the owner still exist?
const ownerConflict = (changePlanID, stepID, owner, callback) => {
    let errorIDSet = new Set();
    if (owner !== "") {
        let username = owner;
        usersRef.where('username', '==', username).get().then(async function (querySnapshot) {
            if (querySnapshot.empty) {
                errorIDSet.add("ownerErrID")
                addConflictToDBDatabase(changePlanID, stepID, "owner", errorIDSet, status => {

                    callback(status)
                })
            }
            else {
                callback(false)
            }
        })
    }
    else {
        //there is no conflict
        callback(false)
    }
}

//was the assetID you were planning to use taken?
const assetIDConflict = (changePlanID, stepID, assetID, callback, isEdit = null) => {
    let errorIDSet = new Set()
    if (assetID !== "" && !isEdit) {

        assetIDutils.isUniqueAssetID(assetID, isUnique => {
            if (!isUnique && !isEdit) {
                errorIDSet.add("assetIDDBErrID")
                addConflictToDBDatabase(changePlanID, stepID, "assetID", errorIDSet, status => {
                    callback(status)
                })
            }
            else {
                callback(false)
            }

        })
        // assetRef.doc(assetID).get().then(async function (assetDoc) {
        //     if (assetDoc.exists && !isEdit) {
        //         if (isEdit) {
        //             callback(false)
        //         }
        //         else {
        //             errorIDSet.add("assetIDDBErrID")
        //             addConflictToDBDatabase(changePlanID, stepID, "assetID", errorIDSet, status => {
        //                 callback(status)
        //             })

        //         }
        //     }

        //     else {
        //         callback(false)

        //     }
        // })
    }
    else { callback(false) }
}

const modelConflict = (changePlanID, stepID, model, callback) => {
    let errorIDSet = new Set()
    //need to get modelID and pass that into doc
    // console.log(model)
    modelutils.getModelByModelname(model, modelDoc1 => {

        if (modelDoc1) {
            modelsRef.doc(modelDoc1.id).get().then(async function (modelDoc2) {
                if (!modelDoc2.exists) {
                    errorIDSet.add("modelErrID")
                    addConflictToDBDatabase(changePlanID, stepID, "model", errorIDSet, status => {
                        //console.log(status)
                        callback(status)
                    })
                }
                else {
                    callback(false)
                }
            })

        }
        else {
            errorIDSet.add("modelErrID")

            addConflictToDBDatabase(changePlanID, stepID, "model", errorIDSet, status => {
                //console.log(status)
                callback(status)
            })

        }

    })

}

const rackUConflict = (changePlanID, stepID, assetID, model, datacenter, datacenterID, rackName, rackU, callback, chassisHostname = null, slotNum = null, chassisAssetID = null) => {
    let splitRackArray = rackName.split(/(\d+)/).filter(Boolean)
    let rackRow = splitRackArray[0]
    let rackNum = parseInt(splitRackArray[1])

    let errorIDSet = new Set();
    let isBlade = chassisHostname ? true : false
    let isChassis = chassisAssetID ? true : false

    rackutils.getRackID(rackRow, rackNum, datacenter, async function (rackID) {
        if (rackID) {

            let ref = isBlade ? racksRef.doc(rackID).collection('blades') : racksRef

            ref.where("letter", "==", isBlade ? chassisHostname : rackRow).where("number", "==", isBlade ? 1 : rackNum).where("datacenter", "==", datacenterID).get().then(function (querySnapshot) {

                if (!querySnapshot.empty) {

                    modelutils.getModelByModelname(model, async function (doc) {
                        //doc.data().height refers to model height
                        //need to get get model height

                        if (doc) {

                            //assuming tht somehow, if we are a blade, that it will correctly check the chassis for conflicts, not rack or smth
                            console.log(chassisAssetID)
                            console.log(isBlade)
                            console.log(slotNum, rackU, doc.data().height, rackID)
                            rackutils.checkAssetFits(isBlade ? slotNum : rackU, doc.data().height, rackID, async function (status) {
                                console.log(status.length)
                                if (status && status.length) {
                                    //asset conflicts with other assets
                                    errorIDSet.add(isBlade ? "slotConflictDBErrID" : "rackUConflictDBErrID")
                                    addConflictToDBDatabase(changePlanID, stepID, isBlade ? "slot" : "rackU", errorIDSet, status => {
                                        //console.log(status)
                                        callback(status)
                                    })
                                }
                                else {
                                    //what if model was deleted? Then
                                    callback(false)
                                }
                            }, assetID, isChassis || isBlade ? { id: chassisAssetID } : null) //{id: chassisId} instead of true. so assetID of the chassis...what if offline to active htough? use the assetID of the new chassis we are moving to. Aka, look up in assets the where hostname === chassisHostname and return the doc id

                        }
                    })
                }
                else {
                    // console.log("rack does not exists")
                    callback(false)
                }
            })

        }
        else {
            //what if a chassis or blade?
            //the rack no longer exists
            errorIDSet.add(isBlade ? "chassisErrID" : "rackErrID")
            addConflictToDBDatabase(changePlanID, stepID, isBlade ? "chassis" : "rack", errorIDSet, status => {
                //(status)
                callback(status)
            })
            callback(false)
        }

    })

}

const powerConnectionOccupied = (datacenter, rack, rackU, pduSide, port, errorIDSet, assetID, callback) => {
    assetpowerportutils.checkConflicts(datacenter, rack, rackU, pduSide, port, async function (status) {
        //console.log("powerportutils checkConflict callback: " + status)
        if (status) {
            errorIDSet.add("powerConnectionConflictDBErrID")

        }
        callback()

    }, assetID)
    //pass in the option assetID parameter here so there's no self conflicts
}

const powerConnectionConflict = (changePlanID, stepID, powerConnections, datacenter, rack, rackU, assetID, callback) => {

    let errorIDSet = new Set()
    if (!powerConnections.length) {
        callback(false)
    }
    let count = 0;
    for (let i = 0; i < powerConnections.length; i++) {
        let pduSide = powerConnections[i].pduSide;
        let port = powerConnections[i].port;


        powerConnectionOccupied(datacenter, rack, rackU, pduSide, port, errorIDSet, assetID, callback1 => {
            addConflictToDBDatabase(changePlanID, stepID, "powerConnections", errorIDSet, status => {
                //console.log(status)
                count++;
                if (count === powerConnections.length) {
                    callback(status)
                }

            })
        })
    }
}

//networkConnections is an array
//does old networkConnections is a map
const networkConnectionConflict = (changePlanID, stepID, networkConnections, oldNetworkConnections, callback) => {
    let errorIDSet = new Set()
    if (!networkConnections.length) {
        callback(false)
    }
    let count = 0;
    for (let i = 0; i < networkConnections.length; i++) {
        let thisPort = networkConnections[i].thisPort
        let otherAssetID = networkConnections[i].otherAssetID
        let otherPort = networkConnections[i].otherPort

        networkConnectionOtherAssetID(otherAssetID, errorIDSet, otherAssetStatus => {
            // console.log(otherAssetStatus)
            count++;
            if (!otherAssetStatus) {
                //trying to connect to a nonexistent asset
                //Don't do some checks, because it will error out because of the query.
                errorIDSet.add("networkConnectionNonExistentOtherPortDBErrID")
                console.log([...Object.entries(errorIDSet)])
                addConflictToDBDatabase(changePlanID, stepID, "networkConnections", errorIDSet, status => {
                    if (count === networkConnections.length) {
                        callback(status)
                    }

                })
            } else {
                networkConnectionOtherAssetPortExist(otherAssetID, otherPort, errorIDSet, callback2 => {

                    networkConnectionConflictsHelper(oldNetworkConnections, thisPort, otherAssetID, otherPort, errorIDSet, callback3 => {
                        console.log([...Object.entries(errorIDSet)])
                        addConflictToDBDatabase(changePlanID, stepID, "networkConnections", errorIDSet, status => {

                            if (count === networkConnections.length) {
                                callback(status)

                            }
                        })
                    })
                })
            }
        })

    }
}

function networkConnectionOtherAssetPortExist(otherAssetID, otherPort, errorIDSet, callback) {
    assetnetworkportutils.checkOtherAssetPortsExist(otherAssetID, otherPort, status => {
        console.log(status)
        if (status) {
            errorIDSet.add("networkConnectionNonExistentOtherPortDBErrID")
        }
        //if timing is weird or unit tests keep failing randomly, move this callback
        callback()
    })
}
//When editing, do need to pass in the oldNetworkConnections properly in the package funciton
//Need to double check why oldetworkConnections is here. Is it just for updating and to check self conflicting?
//Is it bad if it's null? No, can be null. It appears that it is for self-conflicting, but double check w Allen
function networkConnectionConflictsHelper(oldNetworkConnections, thisPort, otherAssetID, otherPort, errorIDSet, callback) {
    assetnetworkportutils.checkNetworkPortConflicts(oldNetworkConnections, thisPort, otherAssetID, otherPort, status => {
        console.log(status)
        if (status) {
            // console.log(status)
            errorIDSet.add("networkConnectionConflictDBErrID")
        }
        callback()
    }, oldNetworkConnections)

}


//no need to check for self conflicts in an edit change
function networkConnectionOtherAssetID(otherAssetID, errorIDSet, callback) {
    assetRef.doc(otherAssetID).get().then(function (otherAssetModelDoc) {
        if (!otherAssetModelDoc.exists) {
            errorIDSet.add("networkConnectionOtherAssetIDDBErrID")
            callback(false)

        }
        else {
            callback(true)
        }
    })

}

//This is a check against the live db. If there is an edit step, and it's editing an asset that has been recently deleted or decomm
//assetID refers to assetID of the edit step we are checking
function editCheckAssetNonexistent(changePlanID, stepID, assetID, callback) {
    let errorIDSet = new Set()
    if (assetID !== "") {
        assetRef.doc(assetID).get().then(async function (assetDoc) {
            if (!assetDoc.exists) {
                errorIDSet.add("editNonexistentErrID")
                addConflictToDBDatabase(changePlanID, stepID, "delete", errorIDSet, status => {
                    callback(status)
                })
            }

            else {
                callback(false)
            }
        })

    }
    else { callback(false) }
}

//trying to edit one that was decommissioned
// function editCheckAssetDecommissioned(changePlanID, stepID, assetID, callback) {
//     let errorIDSet = new Set()
//     if (assetID !== "") {
//         decommissionRef.where("assetId", "==", assetID).get().then(async function (decommDoc) {
//             if (decommDoc.exists) {
//                 errorIDSet.add("editDecommissionedErrID")
//                 addConflictToDBDatabase(changePlanID, stepID, "decommission", errorIDSet, status => {
//                     callback(status)
//                 })
//             }
//             else {
//                 callback(false)
//             }
//         })
//     }
//     else { callback(false) }
// }

//might move this up a level: to when you click on a changeplan
function checkLiveDBConflicts(isExecuted, changePlanID, stepNum, callback) {

    if (!isExecuted) {
        changeplanutils.getStepDocID(changePlanID, stepNum, thisStepID => { //querySnapshot is all docs in changes
            //console.log(thisStepID)
            changeplansRef.doc(changePlanID).collection("changes").doc(thisStepID).get().then(docSnap => {
                //let thisStepNum = docSnap.data().step
                let assetID = docSnap.data().assetID

                let changeType = docSnap.data().change
                if (changeType === "add") {
                    //need to check the mounttpye
                    let model = docSnap.data().changes.model.new
                    let hostname = docSnap.data().changes.hostname.new
                    let datacenter = docSnap.data().changes.datacenter.new
                    let datacenterID = docSnap.data().changes.datacenterID.new
                    let rack = docSnap.data().changes.rack.new
                    let rackU = docSnap.data().changes.rackU.new
                    let owner = docSnap.data().changes.owner.new

                    //console.log("Does this doc have a ch: " + docSnap.data().changes.chassisHostname)
                    if (docSnap.data().changes.chassisHostname) {//blade
                        //in an add blade change doc, can expect to have chassisHostname, chassisSlot fields. Remember that the rack and rackU refer to the chassis of the blade

                        let chassisHostname = docSnap.data().changes.chassisHostname.new
                        let chassisSlot = docSnap.data().changes.chassisSlot.new

                        addBladeChangePlanPackage(changePlanID, thisStepID, model, hostname, chassisHostname, chassisSlot, datacenter, datacenterID, owner, assetID, rack, rackU, status => {
                            callback()
                        })
                    }
                    else {

                        let powerConnections = docSnap.data().changes.powerConnections.new
                        let networkConnections = docSnap.data().changes.networkConnections.new

                        //need to make networkConnections into an array
                        addAssetChangePlanPackage(changePlanID, thisStepID, model, hostname, datacenter, datacenterID, rack, rackU, owner, assetID, powerConnections, networkConnections, status => {
                            callback()
                            console.log("Add live db check calling back.")
                        })

                    }

                }
                else if (changeType === "edit") {
                    //the current step that we're on is an edit, and need to check all of its fields fo live conflcit db checks
                    //first, check out which functions in adAssetChangePlanPackage can be reused

                    changeplanutils.getMergedAssetAndChange(changePlanID, stepNum, assetData => {
                        console.log(assetData)
                        let assetID = assetData.assetId
                        //please dont come for me ik null is falsy but it just was not working uwu
                        if (assetData !== null) {
                            let model = assetData.model
                            let hostname = assetData.hostname
                            let datacenter = assetData.datacenter
                            let rack = assetData.rack
                            let rackU = assetData.rackU
                            let owner = assetData.owner

                            let powerConnections = assetData.powerConnections
                            let networkConnections = assetData.networkConnections
                            let datacenterID = assetData.datacenterID

                            bladeRef.doc(assetID).get().then(thisBladeDoc => { //this bladeRef is okay: just used to check if the current change is on a blade
                                if (thisBladeDoc.exists) {

                                    changeplansRef.doc(changePlanID).collection('changes').doc(thisStepID).get().then(thisChangeDoc => {

                                        let chassisHostname = thisChangeDoc.data().changes.chassisHostname ? thisChangeDoc.data().changes.chassisHostname.new
                                            : thisBladeDoc.data().rack

                                        let chassisSlot = thisChangeDoc.data().changes.chassisSlot ? thisChangeDoc.data().changes.chassisSlot.new
                                            : thisBladeDoc.data().rackU
                                        editBladeChangePlanPackage(changePlanID, thisStepID, model, hostname, chassisHostname, chassisSlot, datacenter, datacenterID, owner, assetID, rack, rackU, status => {
                                            console.log("Edit live db check calling back but for blades.")
                                            callback()
                                        })
                                    })
                                }

                                else {
                                    editAssetChangePlanPackage(changePlanID, thisStepID, model, hostname, datacenter, datacenterID, rack, rackU, owner, assetID, powerConnections, networkConnections, status => {
                                        console.log("Edit live db check calling back.")
                                        callback()
                                    })
                                }
                            })
                        }
                        // else if (changeType === "decommission") {
                        //     //what if you are trying to edit a decomm/deleted model? 
                        //     //then there is no assetData returned, since the getMerged funciton looks in assetsRef
                        //     There was a bunch of shit here that i thought was in the wrong place. Go back to github if you want it back

                        // }
                        else {
                            //     //what if you are trying to edit a decomm/deleted model? 
                            //     //then there is no assetData returned, since the getMerged funciton looks in assetsRef
                            editCheckAssetNonexistent(changePlanID, thisStepID, assetID, status11 => {
                                callback()
                                console.log("Done checking edit step: trying to edit an asset that does not exist")
                            })
                        }
                    })
                }
                else if (changeType === "decommission") {
                    decommissionAssetChangePlanPackage(changePlanID, thisStepID, status => {
                        console.log("Decommission live db check calling back.")
                        callback()
                    })

                }
                else { //move changeType
                    //two things to account for: are you moving to/from, and is it a chassis/normal or blade
                    let location = docSnap.data().location
                    let datacenterIDObj = docSnap.data().changes.datacenterID
                    let datacenterObj = docSnap.data().changes.datacenter

                    let model = docSnap.data().model
                    let rackObj = docSnap.data().changes.rack //for a blade, rack means the chassisHostname
                    let rackUObj = docSnap.data().changes.rackU //for a blade, rackU means the slotNum

                    //however, the rackNUm and the rackRow will refer to the rack the actual chassis is on. This is what we want to pass in for a rackNonexistent check for a blade
                    let rackRowObj = docSnap.data().changes.rackRow
                    let rackNumObj = docSnap.data().changes.rackNum

                    moveAssetChangePackage(changePlanID, thisStepID, assetID, location, datacenterIDObj, datacenterObj, model, rackObj, rackUObj, rackRowObj, rackNumObj, status => {
                        callback()

                    })


                }
            })
        })
    }
}

//checking live db conflicts with moving to/from offline storage
function moveAssetChangePackage(changePlanID, thisStepID, assetID, location, datacenterIDObj, datacenterObj, model, rackObj, rackUObj, rackRowObj, rackNumObj, callback) {
    changeplansRef.doc(changePlanID).collection("changes").doc(thisStepID).get().then(changeDoc => {

        modelutils.getModelByModelname(model, modelData => {
            let mountType = modelData.data().mount

            //depending on whether it is a move to or from offline, the doc is different
            //if we more from offline to active (location = offline) e look at the new fields
            //if we move from active to offline (location = rack), we want to look at the old fields

            datacenterNonExistent(changePlanID, thisStepID, datacenterObj.new, status => {
                if (mountType == "blade") {
                    //For blade doc: rack ischassisHostname, rackU is the slotNum

                    let chassisHostname = location === "rack" ? rackObj.old : rackObj.new
                    let slotNum = location === "rack" ? rackUObj.old : rackUObj.new
                    let pickRackRow = location === "rack" ? rackRowObj.old : rackRowObj.new
                    let pickRackNum = location === "rack" ? rackNumObj.old : rackNumObj.new
                    let chassisRack = pickRackRow + pickRackNum.toString()
                    let chassisAssetID = null
                    assetRef.where("hostname", "==", chassisHostname).get().then(chassisAssetDoc => {

                        if (!chassisAssetDoc.empty) { //TODO: understand the real problem. This is a hacky fix for deleting a change plan step/viewing certain steps with datacenter/rack/chassis db conflicts. For the deleteChange() problem: removed the checkAllDbConflicts call since it was uneccesary anyway
                            chassisAssetID = chassisAssetDoc.docs[0].id //optional param to pass into rackUConfl if u are blade
                        }
                        console.log(chassisAssetID)
                        console.log("IM HEEEEERE")
                        rackNonExistent(changePlanID, thisStepID,
                            chassisRack.toString(),
                            location === "rack" ? datacenterObj.old : datacenterObj.new,
                            location === "rack" ? datacenterIDObj.old : datacenterIDObj.new, status1 => {
                                rackUConflict(changePlanID, thisStepID, assetID, model,
                                    location === "rack" ? datacenterObj.old : datacenterObj.new,
                                    location === "rack" ? datacenterIDObj.old : datacenterIDObj.new,
                                    chassisRack.toString(),
                                    location === "rack" ? rackUObj.old : rackUObj.new,
                                    status => {
                                        callback()

                                    }, chassisHostname, slotNum, chassisAssetID)
                            }, chassisHostname)
                    })
                    //else, your current location is rack, so you are moving to offline. And only need to check that offline exists, which we already do with datacenterNonexistent at the top

                }
                else {
                    //normal or chassis mount type
                    rackNonExistent(changePlanID, thisStepID,
                        location === "rack" ? rackObj.old : rackObj.new,
                        location === "rack" ? datacenterObj.old : datacenterObj.new,
                        location === "rack" ? datacenterIDObj.old : datacenterIDObj.new, status1 => {
                            rackUConflict(changePlanID, thisStepID, assetID, model,
                                location === "rack" ? datacenterObj.old : datacenterObj.new,
                                location === "rack" ? datacenterIDObj.old : datacenterIDObj.new,
                                location === "rack" ? rackObj.old : rackObj.new,
                                location === "rack" ? rackUObj.old : rackUObj.new,
                                status => {
                                    callback()

                                }, assetID, null, mountType === "chassis" ? assetID : null) //pass the ID in so if chassis, checkAssetFits will ignore blades on the chassis
                        })
                    //else, your current location is rack, so you are moving to offline.
                }
            }, location == "rack" ? true : false) //we are moving to offline if our current location is rack
        })
    })
}

//live db conflict check
function editBladeChangePlanPackage(changePlanID, stepID, model, hostname, chassisHostname, chassisSlot, datacenter, datacenterID, owner, assetID, rack, rackU, callback) {
    //current step is an edit
    assetID = assetID.toString()
    let chassisAssetID = null

    assetRef.where("hostname", "==", chassisHostname).get().then(chassisAssetDoc => {

        if (!chassisAssetDoc.empty) { //TODO: understand the real problem. This is a hacky fix for deleting a change plan step/viewing certain steps with datacenter/rack/chassis db conflicts. For the deleteChange() problem: removed the checkAllDbConflicts call since it was uneccesary anyway
            chassisAssetID = chassisAssetDoc.docs[0].id //optional param to pass into rackUConfl if u are blade
        }
        datacenterNonExistent(changePlanID, stepID, datacenter, status2 => {
            hostnameConflict(changePlanID, stepID, assetID, hostname, status3 => {
                ownerConflict(changePlanID, stepID, owner, status4 => {

                    assetIDConflict(changePlanID, stepID, assetID, status5 => {
                        modelConflict(changePlanID, stepID, model, status6 => {
                            rackNonExistent(changePlanID, stepID, rack, datacenter, datacenterID, status7 => {
                                console.log(rack, rackU)
                                console.log(chassisHostname, chassisSlot)
                                rackUConflict(changePlanID, stepID, assetID, model, datacenter, datacenterID, rack, rackU, status8 => {
                                    callback()

                                }, chassisHostname, chassisSlot, chassisAssetID)
                            }, chassisHostname)

                        })

                    }, true)

                })
            })
        })
    })



}

//rip duplicated code
function addBladeChangePlanPackage(changePlanID, stepID, model, hostname, chassisHostname, chassisSlot, datacenter, datacenterID, owner, assetID, rack, rackU, callback) {

    assetID = assetID.toString()
    let chassisAssetID = null

    assetRef.where("hostname", "==", chassisHostname).get().then(chassisAssetDoc => {

        if (!chassisAssetDoc.empty) { //TODO: understand the real problem. This is a hacky fix for deleting a change plan step/viewing certain steps with datacenter/rack/chassis db conflicts. For the deleteChange() problem: removed the checkAllDbConflicts call since it was uneccesary anyway
            chassisAssetID = chassisAssetDoc.docs[0].id //optional param to pass into rackUConfl if u are blade
        }
        datacenterNonExistent(changePlanID, stepID, datacenter, status2 => {
            hostnameConflict(changePlanID, stepID, assetID, hostname, status3 => {
                ownerConflict(changePlanID, stepID, owner, status4 => {
                    assetIDConflict(changePlanID, stepID, assetID, status5 => {
                        modelConflict(changePlanID, stepID, model, status6 => {
                            //assetID is null here, because it's used to check for self conflicting in rackUConflict
                            rackNonExistent(changePlanID, stepID, rack, datacenter, datacenterID, status7 => {
                                rackUConflict(changePlanID, stepID, null, model, datacenter, datacenterID, rack, rackU, status8 => {
                                    callback()

                                }, chassisHostname, chassisSlot, chassisAssetID)
                            }, chassisHostname)

                        })

                    })

                })
            })
        })
    })
}






function editAssetChangePlanPackage(changePlanID, stepID, model, hostname, datacenter, datacenterID, rack, rackU, owner, assetID, powerConnections, networkConnections, callback) {

    //how to pass in oldNetworkConnections? what are they exactly? Object or Array? What does it need to be?
    assetRef.doc(assetID).get().then(doc => {
        let oldNetworkConnections = doc.data().networkConnections;
        assetID = assetID.toString()

        modelutils.getModelByModelname(model, modelData => {

            let mountType = modelData.data().mount


            rackNonExistent(changePlanID, stepID, rack, datacenter, datacenterID, status1 => {
                datacenterNonExistent(changePlanID, stepID, datacenter, status2 => {
                    hostnameConflict(changePlanID, stepID, assetID, hostname, status3 => {
                        ownerConflict(changePlanID, stepID, owner, status4 => {
                            assetIDConflict(changePlanID, stepID, assetID, status5 => {
                                modelConflict(changePlanID, stepID, model, status6 => {
                                    rackUConflict(changePlanID, stepID, assetID, model, datacenter, datacenterID, rack, rackU, status7 => {//converting networkConnections into an array
                                        let networkConnectionsArray = assetnetworkportutils.networkConnectionsToArray(networkConnections)

                                        networkConnectionConflict(changePlanID, stepID, networkConnectionsArray, oldNetworkConnections, status8 => {

                                            powerConnectionConflict(changePlanID, stepID, powerConnections, datacenter, rack, rackU, assetID, status9 => {
                                                // editCheckAssetDecommissioned(changePlanID, stepID, assetID, status10 => {
                                                //   editCheckAssetDeleted(changePlanID, stepID, assetID, status11 => {

                                                callback()
                                                //  })
                                                // })
                                            })
                                        })
                                    }, null, null, mountType === "chassis" ? assetID : null)
                                })
                            }, true)
                        })
                    })
                })
            })
        })
    })

}


//rename package to db
function decommissionAssetChangePlanPackage(changePlanID, stepID, callback) {
    changeplansRef.doc(changePlanID).collection('changes').doc(stepID).get().then(stepDoc => {
        let errorIDSet = new Set()
        let decommAssetID = stepDoc.data().assetID.toString()

        assetRef.doc(decommAssetID).get().then(assetDoc => {
            db.collectionGroup('offlineAssets').where("assetId", "==", decommAssetID).get().then(offlineDoc => {

                if (!assetDoc.exists && offlineDoc.empty) {
                    errorIDSet.add("decommissionDBErrID")
                    addConflictToDBDatabase(changePlanID, stepID, "decommission", errorIDSet, status => {
                        // console.log(status)
                        callback(status)
                    })
                }
                else {
                    callback()
                }
            })
        })
    })
}

function addAssetChangePlanPackage(changePlanID, stepID, model, hostname, datacenter, datacenterID, rack, rackU, owner, assetID, powerConnections, networkConnections, callback) {

    let oldNetworkConnections = null;
    assetID = assetID.toString()

    modelutils.getModelByModelname(model, modelData => {
        let mountType = modelData.data().mount

        rackNonExistent(changePlanID, stepID, rack, datacenter, datacenterID, status1 => {
            datacenterNonExistent(changePlanID, stepID, datacenter, status2 => {
                hostnameConflict(changePlanID, stepID, assetID, hostname, status3 => {
                    ownerConflict(changePlanID, stepID, owner, status4 => {
                        assetIDConflict(changePlanID, stepID, assetID, status5 => {
                            modelConflict(changePlanID, stepID, model, status6 => {
                                //assetID is null here, because it's used to check for self conflicting in rackUConflict
                                rackUConflict(changePlanID, stepID, null, model, datacenter, datacenterID, rack, rackU, status7 => {
                                    console.log(networkConnections)
                                    let networkConnectionsArray = assetnetworkportutils.networkConnectionsToArray(networkConnections)
                                    networkConnectionConflict(changePlanID, stepID, networkConnectionsArray, oldNetworkConnections, status8 => {
                                        powerConnectionConflict(changePlanID, stepID, powerConnections, datacenter, rack, rackU, assetID, status9 => {
                                            callback()
                                        })
                                    })

                                }, null, null, mountType === "chassis" ? assetID : null)

                            })
                        })

                    })
                })
            })
        })
    })
}
//current step is in a for loop
function checkSequentialStepConflicts(executed, changePlanID, callback) {
    let counter = 0;
    if (!executed) {
        changeplansRef.doc(changePlanID).collection('changes').get().then(querySnapshot => {

            if (querySnapshot.size) {
                for (let i = 0; i < querySnapshot.size; i++) {
                    let thisStepID = querySnapshot.docs[i].id
                    //console.log(thisStepID)
                    changeplansRef.doc(changePlanID).collection('changes').doc(thisStepID).get().then(docSnap => {
                        let thisStepNum = docSnap.data().step
                        //console.log("ON CURRENT STEP " + thisStepNum)
                        if (thisStepNum > 1) {
                            checkWithPreviousSteps(changePlanID, thisStepID, thisStepNum, status => {
                                counter++
                                if (counter === querySnapshot.size - 1) {
                                    callback()
                                }
                            })
                        } else {//if there is only 1 step in the plan, callback

                            if (querySnapshot.size === 1) {
                                callback()
                            }

                        }
                    })
                }
            }
            else {
                callback() //there are no changes
            }
        })
    }
}

//checking current step with many other previous steps
function checkWithPreviousSteps(changePlanID, thisStepID, thisStepNum, callback) {
    let counter = thisStepNum - 1
    changeplansRef.doc(changePlanID).collection('changes').doc(thisStepID).get().then(stepDoc => {
        let thisStepData = stepDoc.data();
        //console.log(thisStepData)
        let thisChangeType = thisStepData.change
        //maybe compare this step (which is 2+) to other previous steps, in ascending order? ie 3 to 1, then 3 to 2 vs. 3 to 2, then 3 to 1. Or does it not matter? Can you think of a case where it does matter?
        for (let i = thisStepNum - 1; i > 0; i--) {

            let otherStepNum = i;
            if (thisChangeType === "add") {

                if (thisStepData.changes.chassisHostname) {//blade
                    addBladeChangeCheck(changePlanID, thisStepData, thisStepID, thisStepNum, otherStepNum, status => {
                        counter--
                        if (counter === 0) {
                            callback()
                        }
                    })

                }
                else {
                    addChangeCheck(changePlanID, thisStepData, thisStepID, thisStepNum, otherStepNum, status => {
                        counter--
                        if (counter === 0) {
                            callback()
                        }
                    })
                }
            }
            else if (thisChangeType === "edit") {
                let thisAssetID = thisStepData.assetID.toString()
                bladeRef.doc(thisAssetID).get().then(thisBladeInfo => {
                    if (thisBladeInfo.exists) {//this bladeRef is okay: then the current asset we are tryin to edit is a blade
                        editBladeChangeCheck(changePlanID, thisStepID, thisStepNum, otherStepNum, status => {
                            counter--
                            if (counter === 0) {
                                callback()
                            }
                        })
                    }
                    else {
                        editChangeCheck(changePlanID, thisStepID, thisStepNum, otherStepNum, status => {
                            counter--
                            if (counter === 0) {
                                callback()
                            }
                        })
                    }
                })
            }
            else if (thisChangeType === "decommission") {
                //decommission
                decommissionChangeCheck(changePlanID, thisStepID, otherStepNum, thisStepData, status => {
                    counter--
                    if (counter === 0) {
                        callback()
                    }
                })
            }
            else {//have a move change type
               
                moveChangeCheck(changePlanID, thisStepID, otherStepNum, thisStepData, status => {
                    counter--
                    if (counter === 0) {
                        callback()
                    }
                })
            }
        }
    })
}

//sequential step check
function moveChangeCheck(changePlanID, thisStepID, otherStepNum, thisStepData, callback) {
    changeplanutils.getStepDocID(changePlanID, otherStepNum, otherStepID => {
        changeplansRef.doc(changePlanID).collection('changes').doc(otherStepID).get().then(otherStepDoc => {
            //curent step is add blade
console.log("IN MOVECHANGECHECK()")
            console.log(thisStepData)
            modelutils.getModelByModelname(thisStepData.model, thisModelDoc => {
                let mountType = thisModelDoc.data().mount
                let destination = thisStepData.destination

                //add a blade to the chassis that has been moved offline
                console.log(destination, mountType)
                if (otherStepDoc.data().change === "add" && destination === "offline") {

                    if (mountType === "chassis") {
                        let otherHostname = otherStepDoc.data().changes.chassisHostname.new
                        let thisAssetID = thisStepData.assetID.toString()
                        assetRef.doc(thisAssetID).get().then(thisAssetDoc => {

                            let thisChassisHostname = thisAssetDoc.data().hostname //move a chassis from rack to offline
                            console.log(thisChassisHostname, otherHostname)

                            if (otherHostname == thisChassisHostname) {
                                let errorIDSet = new Set()
                                errorIDSet.add("move1ChassisStepErrID")

                                addConflictToDBSteps(changePlanID, thisStepID, thisStepData.step, null, otherStepNum, errorIDSet, status => {
                                    callback(status)
                                })

                            }
                            else {
                                callback()
                            }
                        })
                    }
                    else {
                        callback()
                    }

                }
                //edit a blade to the chassis that has been moved offline
                else if (otherStepDoc.data().change === "edit" && destination === "offline") {
                    if (mountType === "chassis") {

                        let otherAssetID = otherStepDoc.data().assetID.toString()
                        bladeRef.doc(otherAssetID).get().then(otherBladeInfo => {
                            let thisAssetID = thisStepData.assetID.toString()
                            assetRef.doc(thisAssetID).get().then(thisAssetDoc => {

                                let thisChassisHostname = thisAssetDoc.data().hostname //move a chassis from rack to offline
 //this step is a move on a chassis 
                                //check this chassis against a previous edit step: blade moving to the chassis. So check the edit blade's chassisHostname
                                let otherChassisHostname = otherStepDoc.data().changes.chassisHostname ? otherStepDoc.data().changes.chassisHostname.new
                                    : otherBladeInfo.data().rack

                                if (thisChassisHostname == otherChassisHostname) {
                                    let errorIDSet = new Set()
                                    errorIDSet.add("move1ChassisStepErrID")

                                    addConflictToDBSteps(changePlanID, thisStepID, thisStepData.step, null, otherStepNum, errorIDSet, status => {
                                        callback(status)
                                    })

                                }
                                else {
                                    callback()
                                }
                            })
                        })
                    }
                    else {
                        callback()
                    }
                }

                //is the current chassis you are trying to move to been decomm?
                //this actually belongs in decommChangeCheck
                else if (otherStepDoc.data().change === "decommission" && destination === "rack" && mountType === "blade") {
                    //am i a blade?
                    //if I am, then I want to see if my chassis that I'm moving to has been decomm in a previous step

                    let thisChassisHostname = thisStepData.changes.chassisHostname.new
                    let otherHostname = otherStepDoc.data().hostname
                    console.log(thisChassisHostname, otherHostname)
                    if (thisChassisHostname === otherHostname) {
                        let errorIDSet = new Set()
                        errorIDSet.add("move2ChassisStepErrID")
                        //trying to move a blade

                        addConflictToDBSteps(changePlanID, thisStepID, thisStepData.step, null, otherStepNum, errorIDSet, status => {
                            callback(status)
                        })

                    }
                }
                else if (otherStepDoc.data().change === "move" && destination === "rack" && mountType === "blade") {

                    let thisChassisHostname = thisStepData.changes.chassisHostname.new
                    let otherHostname = otherStepDoc.data().changes.chassisHostname.new
                    console.log(thisChassisHostname, otherHostname)

                    if (thisChassisHostname === otherHostname) {
                        let errorIDSet = new Set()
                        errorIDSet.add("move3ChassisStepErrID")
                        //trying to move a blade

                        addConflictToDBSteps(changePlanID, thisStepID, thisStepData.step, null, otherStepNum, errorIDSet, status => {
                            callback(status)
                        })
                    }

                    else {
                        callback()
                    }
                }
                //move against a move. i have no brain power to think of anything 
                else { //move
                    console.log(" : (")
                    callback()
                }

            })

        })
    })

}

//If the current step is an edit step, and we need to check it against all the previous steps
function editChangeCheck(changePlanID, thisStepID, thisStepNum, otherStepNum, callback) {
    changeplanutils.getMergedAssetAndChange(changePlanID, thisStepNum, thisStepData => {
        if (thisStepData) {

            changeplanutils.getStepDocID(changePlanID, otherStepNum, otherStepID => {
                changeplansRef.doc(changePlanID).collection('changes').doc(otherStepID).get().then(otherStepDoc => {
                    if (otherStepDoc.data().change === "add") {
                        let otherRack = otherStepDoc.data().changes.rack.new
                        let otherRackU = otherStepDoc.data().changes.rackU.new
                        let otherDatacenter = otherStepDoc.data().changes.datacenter.new
                        let otherModel = otherStepDoc.data().changes.model.new
                        let otherAssetID = otherStepDoc.data().assetID
                        let otherHostname = otherStepDoc.data().changes.hostname.new
                        let otherPowerConnections = otherStepDoc.data().changes.powerConnections.new
                        let otherNetworkConnections = otherStepDoc.data().changes.networkConnections.new
                        rackUStepConflict(changePlanID, thisStepID, otherStepID, otherStepNum, thisStepData, otherModel, otherDatacenter, otherRack, otherRackU, true, thisStepNum, callback1 => {
                            // assetIDStepConflict(changePlanID, thisStepID, otherStepID, otherStepNum, thisStepData, otherAssetID, true, thisStepNum, callback2 => {
                            hostnameStepConflict(changePlanID, thisStepID, otherStepID, otherStepNum, thisStepData, otherHostname, otherAssetID, true, thisStepNum, callback3 => {
                                powerConnectionsStepConflict(changePlanID, thisStepID, otherStepID, otherStepNum, thisStepData, otherPowerConnections, otherDatacenter, otherRack, true, thisStepNum, callback4 => {
                                    networkConnectionsStepConflict(changePlanID, thisStepID, otherStepID, otherStepNum, thisStepData, otherNetworkConnections, otherAssetID, true, thisStepNum, callback5 => {
                                        console.log("editChangeCheck() against add step completed.")
                                        callback()

                                    })
                                })
                            })
                        })
                    }
                    else if (otherStepDoc.data().change === "edit") {
                        changeplanutils.getMergedAssetAndChange(changePlanID, otherStepNum, otherAssetData => {
                            //this gets all the fields, not just the changes
                            console.log(otherAssetData)
                            let otherAssetID = otherAssetData.assetId
                            let otherRack = otherAssetData.rack
                            let otherRackU = otherAssetData.rackU
                            let otherDatacenter = otherAssetData.datacenter
                            let otherModel = otherAssetData.model
                            let otherHostname = otherAssetData.hostname
                            let otherPowerConnections = otherAssetData.powerConnections
                            let otherNetworkConnections = otherAssetData.networkConnections

                            rackUStepConflict(changePlanID, thisStepID, otherStepID, otherStepNum, thisStepData, otherModel, otherDatacenter, otherRack, otherRackU, true, thisStepNum, callback1 => {
                                // assetIDStepConflict(changePlanID, thisStepID, otherStepID, otherStepNum, thisStepData, otherAssetID, true, thisStepNum, callback2 => {
                                hostnameStepConflict(changePlanID, thisStepID, otherStepID, otherStepNum, thisStepData, otherHostname, otherAssetID, true, thisStepNum, callback3 => {
                                    powerConnectionsStepConflict(changePlanID, thisStepID, otherStepID, otherStepNum, thisStepData, otherPowerConnections, otherDatacenter, otherRack, true, thisStepNum, callback4 => {

                                        networkConnectionsStepConflict(changePlanID, thisStepID, otherStepID, otherStepNum, thisStepData, otherNetworkConnections, otherAssetID, true, thisStepNum, callback5 => {
                                            console.log("editChangeCheck() against edit step completed.")
                                            callback()

                                        })
                                    })
                                })
                                // })
                            })
                        })
                    }
                    else {
                        //trying to edit an asset that was decomm in a previous step
                        let errorIDSet = new Set()
                        let otherAssetID = otherStepDoc.data().assetID
                        let thisAssetID = thisStepData.assetId
                        console.log(otherAssetID, thisAssetID)
                        if (otherAssetID == thisAssetID && otherAssetID !== "" && thisAssetID !== "") {
                            errorIDSet.add("editNonexistentErrID")

                            addConflictToDBSteps(changePlanID, thisStepID, thisStepNum, null, otherStepNum, errorIDSet, status => {

                                let thisNetworkConnections = thisStepData.networkConnections
                                let otherStepAssetID = otherStepDoc.data().assetID
                                networkConnectionOtherAssetIDStep(changePlanID, thisStepID, otherStepID, otherStepNum, thisStepData, thisNetworkConnections, otherStepAssetID, thisStepNum, callback1 => {
                                    console.log("editChangeCheck() against decomm step completed.")
                                    callback()
                                })
                            })
                        } else {
                            callback()
                        }
                    }
                }).catch((error) => {
                    callback()
                    console.log(error)
                })
            })
        }
    })

}

//sequential step conflict check
function editBladeChangeCheck(changePlanID, thisStepID, thisStepNum, otherStepNum, callback) {
    changeplanutils.getMergedAssetAndChange(changePlanID, thisStepNum, thisStepData => {
        changeplansRef.doc(changePlanID).collection('changes').where('step', "==", thisStepNum).get().then(thisChangeDoc => {
            if (thisStepData) {
                console.log(thisStepData)
                changeplanutils.getStepDocID(changePlanID, otherStepNum, otherStepID => {
                    changeplansRef.doc(changePlanID).collection('changes').doc(otherStepID).get().then(otherStepDoc => {

                        if (otherStepDoc.data().change === "add") {
                            //the other step is an add. Adding a blade that conflcits with the current blade's slot
                            console.log("BLACKING OUT")

                            if (otherStepDoc.data().changes.chassisHostname) { //other step is adding a blade

                                bladeRef.doc(thisStepData.assetId).get().then(thisBladeInfo => {

                                    if (thisBladeInfo.exists) { //now we know the current edit step blade's info and the other decomm step is a blade

                                        //otherRack and otherRackU need to be the other blade's chassisHostname and chassisSlot

                                        let thisChassisHostname = thisChangeDoc.docs[0].data().changes.chassisHostname ? thisChangeDoc.docs[0].data().changes.chassisHostname.new
                                            : thisBladeInfo.data().rack
                                        //we can get chassisHostname and slot if these fields were changed in the edit. But what if they weren't? then use bladeinfo
                                        let thisChassisSlot = thisChangeDoc.docs[0].data().changes.chassisSlot ? thisChangeDoc.docs[0].data().changes.chassisSlot.new
                                            : thisBladeInfo.data().rackUthisBladeInfo.data().rackU

                                        let otherChassisHostname = otherStepDoc.data().changes.chassisHostname.new
                                        let otherChassisSlot = otherStepDoc.data().changes.chassisSlot.new

                                        console.log(thisChassisHostname, otherChassisHostname)

                                        if (otherChassisHostname == thisChassisHostname) {
                                            let otherModel = otherStepDoc.data().changes.model.new
                                            let otherDatacenter = otherStepDoc.data().changes.datacenter.new

                                            rackUStepConflict(changePlanID, thisStepID, otherStepID, otherStepNum, thisStepData, otherModel, otherDatacenter,
                                                otherChassisHostname, otherChassisSlot, true, thisStepNum, status => {
                                                    console.log("Back from rackUStepCon")
                                                    callback()
                                                }, true, thisChassisHostname, thisChassisSlot)
                                        }
                                        else {
                                            callback()
                                        }

                                    }
                                    else {
                                        callback()
                                    }

                                })
                            }
                        }
                        else if (otherStepDoc.data().change === "edit") {
                            changeplanutils.getMergedAssetAndChange(changePlanID, otherStepNum, otherAssetData => {
                                let otherModel = otherAssetData.model
                                let otherDatacenter = otherAssetData.datacenter
                                let otherAssetID = otherAssetData.assetId
                                //console.log(otherAssetData)

                                modelutils.getModelByModelname(otherModel, otherModelData => {
                                    let otherMountType = otherModelData.data().mount

                                    if (otherMountType === "blade") { //other step is editing a blade

                                        bladeRef.doc(otherAssetID).get().then(otherBladeInfo => {
                                            changeplansRef.doc(changePlanID).collection('changes').where('step', "==", otherStepNum).get().then(otherChangeDoc => {

                                                bladeRef.doc(thisStepData.assetId).get().then(thisBladeInfo => { //can't rely on bladeinfo, need the change plani info


                                                    //what if the otherChassisHostname and slot were edited? what if they weren't? 
                                                    let otherChassisHostname = otherChangeDoc.docs[0].data().changes.chassisHostname ? otherChangeDoc.docs[0].data().changes.chassisHostname.new
                                                        : otherBladeInfo.data().rack
                                                    let otherChassisSlot = otherChangeDoc.docs[0].data().changes.chassisSlot ? otherChangeDoc.docs[0].data().changes.chassisSlot.new
                                                        : otherBladeInfo.data().rackU

                                                    let thisChassisHostname = thisChangeDoc.docs[0].data().changes.chassisHostname ? thisChangeDoc.docs[0].data().changes.chassisHostname.new
                                                        : thisBladeInfo.data().rack
                                                    //we can get chassisHostname and slot if these fields were changed in the edit. But what if they weren't? then use bladeinfo
                                                    let thisChassisSlot = thisChangeDoc.docs[0].data().changes.chassisSlot ? thisChangeDoc.docs[0].data().changes.chassisSlot.new
                                                        : thisBladeInfo.data().rackU

                                                    console.log(otherChassisHostname)
                                                    console.log(thisChassisHostname)

                                                    if (otherChassisHostname == thisChassisHostname) {
                                                        rackUStepConflict(changePlanID, thisStepID, otherStepID, otherStepNum, thisStepData, otherModel, otherDatacenter, otherChassisHostname, otherChassisSlot, true, thisStepNum, status => {
                                                            console.log("back from rackustepcon")
                                                            callback()
                                                        }, true, thisChassisHostname, thisChassisSlot)
                                                    }
                                                    else {
                                                        callback()
                                                    }
                                                })
                                            })
                                        })

                                    }
                                    else {
                                        callback()
                                    }

                                })
                            })
                        }
                        else if (otherStepDoc.data().change === "decommission") {
                            let otherAssetID = otherStepDoc.data().assetID.toString()
                            assetRef.doc(otherAssetID).get().then(otherAssetInfo => {
                                bladeRef.doc(thisStepData.assetId).get().then(thisBladeInfo => { //can't rely on bladeinfo, need the change plani info

                                    let otherHostname = otherAssetInfo.data().hostname

                                    let thisChassisHostname = thisChangeDoc.docs[0].data().changes.chassisHostname ? thisChangeDoc.docs[0].data().changes.chassisHostname.new
                                        : thisBladeInfo.data().rack

                                    if (otherHostname == thisChassisHostname) {
                                        let errorIDSet = new Set()
                                        errorIDSet.add("decommissionChassisStepErrID")

                                        addConflictToDBSteps(changePlanID, thisStepID, thisStepData.step, null, otherStepNum, errorIDSet, status => {
                                            callback(status)
                                        })
                                    }
                                    else {
                                        callback()
                                    }

                                })
                            })

                        }
                        else { //move change type

                            if (otherStepDoc.data().location === "rack") {
                                let otherAssetID = otherStepDoc.data().assetID.toString()
                                let otherModel = otherStepDoc.data().model

                                modelutils.getModelByModelname(otherModel, otherModelData => {
                                    let mountType = otherModelData.data().mount

                                    if (mountType == "chassis") {
                                        assetRef.doc(otherAssetID).get().then(otherAssetDoc => {
                                            if (otherAssetDoc.exists) {
                                                let otherHostname = otherAssetDoc.data().hostname
                                                bladeRef.doc(thisStepData.assetId).get().then(thisBladeInfo => { //can't rely on bladeinfo, need the change plani info

                                                    let thisChassisHostname = thisChangeDoc.docs[0].data().changes.chassisHostname ? thisChangeDoc.docs[0].data().changes.chassisHostname.new
                                                        : thisBladeInfo.data().rack

                                                    if (otherHostname == thisChassisHostname) {
                                                        let errorIDSet = new Set()
                                                        errorIDSet.add("moveChassisStepErrID")

                                                        addConflictToDBSteps(changePlanID, thisStepID, thisStepData.step, null, otherStepNum, errorIDSet, status => {
                                                            callback(status)
                                                        })
                                                    }
                                                    else {
                                                        callback()
                                                    }

                                                })
                                            }
                                            else {
                                                callback()
                                            }

                                        })
                                    }
                                    else {
                                        callback()
                                    }

                                })
                            }
                            else {
                                callback()
                            }

                        }//is this the most elegant code? no. but i cant give a fuck anymore. have fun in callback hell.
                    })

                })
            }
        })
    })

}

function addBladeChangeCheck(changePlanID, thisStepData, thisStepID, thisStepNum, otherStepNum, callback) {
    changeplanutils.getStepDocID(changePlanID, otherStepNum, otherStepID => {
        changeplansRef.doc(changePlanID).collection('changes').doc(otherStepID).get().then(otherStepDoc => {
            //curent step is add blade

            //if the other step is an add/edit blade, need to check if the other blade is on the same chassis and would conflict with slot
            if (otherStepDoc.data().change === "add") {
                //console.log(otherStepDoc.data())

                if (otherStepDoc.data().changes.chassisHostname) { //other step is adding a blade
                    console.log(otherStepDoc.data().changes.chassisHostname.new)
                    console.log(thisStepData.changes.chassisHostname.new)

                    if (otherStepDoc.data().changes.chassisHostname.new == thisStepData.changes.chassisHostname.new) {
                        let otherModel = otherStepDoc.data().changes.model.new
                        let otherDatacenter = otherStepDoc.data().changes.datacenter.new
                        //let otherRack = otherStepDoc.data().changes.rack.new
                        // let otherRackU = otherStepDoc.data().changes.rackU.new

                        let thisChassisHostname = thisStepData.changes.chassisHostname.new
                        let thisChassisSlot = thisStepData.changes.chassisSlot.new
                        //otherRack and otherRackU need to be the other blade's chassisHostname and chassisSlot
                        let otherChassisHostname = otherStepDoc.data().changes.chassisHostname.new
                        let otherChassisSlot = otherStepDoc.data().changes.chassisSlot.new
                        rackUStepConflict(changePlanID, thisStepID, otherStepID, otherStepNum, thisStepData, otherModel, otherDatacenter, otherChassisHostname, otherChassisSlot, false, thisStepNum, status => {
                            console.log("Back from rackUStepCon")
                            callback()
                        }, true, thisChassisHostname, thisChassisSlot)
                    }
                    else {
                        callback()
                    }
                }
                else {
                    callback()
                }
            }

            //if the other step is an edit blade, need to check if the other blade is on the same chassis and would conflict with slots
            else if (otherStepDoc.data().change === "edit") {
                console.log("IN EDIT step conflict check for blades")
                changeplanutils.getMergedAssetAndChange(changePlanID, otherStepNum, otherAssetData => {
                    let otherModel = otherAssetData.model
                    let otherDatacenter = otherAssetData.datacenter
                    let otherAssetID = otherAssetData.assetId
                    //console.log(otherAssetData)

                    modelutils.getModelByModelname(otherModel, otherModelData => {
                        let otherMountType = otherModelData.data().mount

                        if (otherMountType === "blade") { //other step is editing a blade
                            bladeRef.doc(otherAssetID).get().then(otherBladeInfo => {
                                changeplansRef.doc(changePlanID).collection('changes').where('step', "==", otherStepNum).get().then(otherChangeDoc => {

                                    let otherChassisHostname = otherChangeDoc.docs[0].data().changes.chassisHostname ? otherChangeDoc.docs[0].data().changes.chassisHostname.new
                                        : otherBladeInfo.data().rack
                                    let otherChassisSlot = otherChangeDoc.docs[0].data().changes.chassisSlot ? otherChangeDoc.docs[0].data().changes.chassisSlot.new
                                        : otherBladeInfo.data().rackU


                                    let thisChassisHostname = thisStepData.changes.chassisHostname.new
                                    let thisChassisSlot = thisStepData.changes.chassisSlot.new

                                    console.log(otherChassisHostname)
                                    console.log(thisStepData.changes.chassisHostname.new)
                                    if (otherChassisHostname == thisStepData.changes.chassisHostname.new) {
                                        rackUStepConflict(changePlanID, thisStepID, otherStepID, otherStepNum, thisStepData, otherModel, otherDatacenter, otherChassisHostname, otherChassisSlot, false, thisStepNum, status => {
                                            console.log("back from rackustepcon")
                                            callback()
                                        }, true, thisChassisHostname, thisChassisSlot)
                                    }
                                    else {
                                        callback()
                                    }
                                })
                            })
                        }
                        else {
                            callback()
                        }

                    })
                })
            }
            //if the other step is a decomm, need to check if the chassis the blade is on was decommed in a previous step
            else if (otherStepDoc.data().change === "decommission") {
                let otherAssetID = otherStepDoc.data().assetID.toString()
                assetRef.doc(otherAssetID).get().then(otherAssetDoc => {
                    if (otherAssetDoc.exists) {

                        let otherHostname = otherAssetDoc.data().hostname
                        console.log(otherHostname)
                        console.log(thisStepData.changes.chassisHostname.new)
                        if (otherHostname == thisStepData.changes.chassisHostname.new) {
                            let errorIDSet = new Set()
                            errorIDSet.add("decommissionChassisStepErrID")

                            addConflictToDBSteps(changePlanID, thisStepID, thisStepData.step, null, otherStepNum, errorIDSet, status => {
                                callback(status)
                            })
                        }
                        else {
                            callback()
                        }
                    }
                    else {
                        callback()
                    }
                })
            }
            //if the other step is a move, need to check if the chassis the blade is on was moved offline
            //remember this function is checking: current step is an add blade, against previous steps
            else {
                if (otherStepDoc.data().location === "rack") {
                    let otherAssetID = otherStepDoc.data().assetID.toString()
                    let otherModel = otherStepDoc.data().model

                    modelutils.getModelByModelname(otherModel, otherModelData => {
                        let mountType = otherModelData.data().mount

                        if (mountType == "chassis") {
                            assetRef.doc(otherAssetID).get().then(otherAssetDoc => {
                                if (otherAssetDoc.exists) {
                                    let otherHostname = otherAssetDoc.data().hostname

                                    if (otherHostname == thisStepData.changes.chassisHostname.new) {
                                        let errorIDSet = new Set()
                                        errorIDSet.add("moveChassisStepErrID")

                                        addConflictToDBSteps(changePlanID, thisStepID, thisStepData.step, null, otherStepNum, errorIDSet, status => {
                                            callback(status)
                                        })
                                    }
                                    else {
                                        callback()
                                    }
                                }
                                else {
                                    callback()
                                }
                            })
                        }
                        else {
                            callback()
                        }

                    })
                }
                else {
                    callback()
                }
            }
        })
    })

}

//at the level of checking step against step
function addChangeCheck(changePlanID, thisStepData, thisStepID, thisStepNum, otherStepNum, callback) {
    changeplanutils.getStepDocID(changePlanID, otherStepNum, otherStepID => {
        changeplansRef.doc(changePlanID).collection('changes').doc(otherStepID).get().then(otherStepDoc => {
            //be careful with what you are comparing
            //since otherStepNum changes

            if (otherStepDoc.data().change === "add") {
                //everything below is for norma/chassis assets
                let otherRack = otherStepDoc.data().changes.rack.new
                let otherRackU = otherStepDoc.data().changes.rackU.new
                let otherDatacenter = otherStepDoc.data().changes.datacenter.new
                let otherModel = otherStepDoc.data().changes.model.new
                let otherAssetID = otherStepDoc.data().assetID
                let otherHostname = otherStepDoc.data().changes.hostname.new
                let otherPowerConnections = otherStepDoc.data().changes.powerConnections.new
                let otherNetworkConnections = otherStepDoc.data().changes.networkConnections.new
                rackUStepConflict(changePlanID, thisStepID, otherStepID, otherStepNum, thisStepData, otherModel, otherDatacenter, otherRack, otherRackU, false, thisStepNum, callback1 => {
                    assetIDStepConflict(changePlanID, thisStepID, otherStepID, otherStepNum, thisStepData, otherAssetID, false, thisStepNum, callback2 => {
                        hostnameStepConflict(changePlanID, thisStepID, otherStepID, otherStepNum, thisStepData, otherHostname, otherAssetID, false, thisStepNum, callback3 => {
                            powerConnectionsStepConflict(changePlanID, thisStepID, otherStepID, otherStepNum, thisStepData, otherPowerConnections, otherDatacenter, otherRack, false, thisStepNum, callback4 => {
                                networkConnectionsStepConflict(changePlanID, thisStepID, otherStepID, otherStepNum, thisStepData, otherNetworkConnections, otherAssetID, false, thisStepNum, callback5 => {
                                    console.log("addChangeCheck() completed.")
                                    callback()

                                })
                            })
                        })
                    })
                })

            }
            else if (otherStepDoc.data().change === "edit") {
                //want to get all possible data from the other edit step to compare this step against
                changeplanutils.getMergedAssetAndChange(changePlanID, otherStepNum, otherAssetData => {
                    //this gets all the fields, not just the changes
                    console.log(otherAssetData)
                    let otherAssetID = otherAssetData.assetId
                    let otherRack = otherAssetData.rack
                    let otherRackU = otherAssetData.rackU
                    let otherDatacenter = otherAssetData.datacenter
                    let otherModel = otherAssetData.model
                    let otherHostname = otherAssetData.hostname
                    let otherPowerConnections = otherAssetData.powerConnections
                    let otherNetworkConnections = otherAssetData.networkConnections
                    rackUStepConflict(changePlanID, thisStepID, otherStepID, otherStepNum, thisStepData, otherModel, otherDatacenter, otherRack, otherRackU, false, thisStepNum, callback1 => {
                        assetIDStepConflict(changePlanID, thisStepID, otherStepID, otherStepNum, thisStepData, otherAssetID, false, thisStepNum, callback2 => {
                            hostnameStepConflict(changePlanID, thisStepID, otherStepID, otherStepNum, thisStepData, otherHostname, otherAssetID, false, thisStepNum, callback3 => {
                                powerConnectionsStepConflict(changePlanID, thisStepID, otherStepID, otherStepNum, thisStepData, otherPowerConnections, otherDatacenter, otherRack, false, thisStepNum, callback4 => {

                                    networkConnectionsStepConflict(changePlanID, thisStepID, otherStepID, otherStepNum, thisStepData, otherNetworkConnections, otherAssetID, false, thisStepNum, callback5 => {
                                        console.log("addChangeCheck() completed.")
                                        callback()

                                    })
                                })
                            })
                        })
                    })
                })
            }
            else if (otherStepDoc.data().change === "decommission") {
                let thisNetworkConnections = thisStepData.changes.networkConnections.new
                let otherStepAssetID = otherStepDoc.data().assetID
                networkConnectionOtherAssetIDStep(changePlanID, thisStepID, otherStepID, otherStepNum, thisStepData, thisNetworkConnections, otherStepAssetID, thisStepNum, callback1 => {
                    console.log("addChangeCheck() completed.")
                    callback()

                })
            }
            else {
                //the other step is a move to/from offline
                callback()
                console.log("Comparing an add step to a previous move step. Taken care of in addBladeChangeCheck()")
                //add a blade to a chassis that was moved offline. This is taken care of in addBladeChangeCheck()

            }
        })
    })

}

function decommissionChangeCheck(changePlanID, thisStepID, otherStepNum, thisStepData, callback) {
    let errorIDSet = new Set()
    let decommThisAsset = thisStepData.assetID
    //console.log(decommThisAsset)

    changeplanutils.getStepDocID(changePlanID, otherStepNum, otherStepID => {
        changeplansRef.doc(changePlanID).collection('changes').doc(otherStepID).get().then(otherStepDoc => {
            let otherStepType = otherStepDoc.data().change
            if (otherStepType === "decommission") {

                let decommOtherAsset = otherStepDoc.data().assetID

                if (decommThisAsset === decommOtherAsset) {
                    //console.log("up in this bitch rn")
                    errorIDSet.add("decommissionStepErrID")

                    addConflictToDBSteps(changePlanID, thisStepID, thisStepData.step, null, otherStepNum, errorIDSet, status => {
                        callback(status)
                    })
                }
                else {
                    callback(false)
                }
            }
            else {
                callback(false)
            }
        }).catch(callback(false))
    })
}

function networkConnectionsStepConflict(changePlanID, thisStepID, otherStepID, otherStepNum, thisStepData, otherNetworkConnections, otherAssetID, isEdit, thisStepNum, callback) {
    let errorIDSet = new Set()
    let thisNetworkConnections = isEdit ? thisStepData.networkConnections : thisStepData.changes.networkConnections.new //this is a map object since we are getting it from changeplans
    //three things to check for, each with own errID (double check messages say correct thing in JSON)
    let thisAssetID = isEdit ? thisStepData.assetId : thisStepData.assetID

    Object.keys(otherNetworkConnections).forEach(otherConnKey => {
        Object.keys(thisNetworkConnections).forEach(thisConnKey => {
            let otherConnOtherAssetID = otherNetworkConnections[otherConnKey].otherAssetID
            let otherConnOtherPort = otherNetworkConnections[otherConnKey].otherPort
            let thisConnOtherAssetID = thisNetworkConnections[thisConnKey].otherAssetID
            let thisConnOtherPort = thisNetworkConnections[thisConnKey].otherPort
            //2 does my current otherAssetID, otherPort match with another step's assetID and thisPort?
            //otherAssetID, otherPort conflict check
            if (thisConnOtherAssetID === otherConnOtherAssetID && thisConnOtherPort === otherConnOtherPort) {
                errorIDSet.add("networkConnectionConflictStepErrID")

            }
            //3 does my current thisPort match with another step's otherport?
            else if (thisConnKey === otherConnKey && otherAssetID === thisAssetID && otherAssetID !== "" && thisAssetID !== "") {
                errorIDSet.add("networkConnectionThisPortConflictErrID")
            }

        })
    })

    addConflictToDBSteps(changePlanID, thisStepID, thisStepNum, otherStepID, otherStepNum, errorIDSet, status => {
        callback(status)
    })


}

// is the other asset i want to connect to been decomm by a previous /otherstep?
//networkConnections is an array
function networkConnectionOtherAssetIDStep(changePlanID, thisStepID, otherStepID, otherStepNum, thisStepData, thisNetworkConnections, otherStepAssetID, thisStepNum, callback) {
    let errorIDSet = new Set();
    let count = 0;

    if (!thisNetworkConnections.size) {
        callback(false)
    }
    Object.keys(thisNetworkConnections).forEach(thisConnThisPort => {
        if (thisNetworkConnections[thisConnThisPort].otherAssetID == otherStepAssetID) {
            errorIDSet.add("networkConnectionOtherAssetIDStepErrID")
            errorIDSet.add("networkConnectionNonExistentOtherPortStepErrID")
            count++;
            if (count === this.networkConnections.length) {
                addConflictToDBSteps(changePlanID, thisStepID, thisStepNum, null, otherStepNum, errorIDSet, status => {
                    callback(status)
                })

            }
        }

    })

}

function powerConnectionsStepConflict(changePlanID, thisStepID, otherStepID, otherStepNum, thisStepData, otherPowerConnections, otherDatacenter, otherRack, isEdit, thisStepNum, callback) {
    //how to tell if 2 steps share the same power connection?
    let errorIDSet = new Set()
    let thisPowerConnections = isEdit ? thisStepData.powerConnections : thisStepData.changes.powerConnections.new
    let thisDatacenter = isEdit ? thisStepData.datacenter : thisStepData.changes.datacenter.new
    let thisRack = isEdit ? thisStepData.rack : thisStepData.changes.rack.new

    if (otherDatacenter == thisDatacenter && otherRack == thisRack) {
        for (let i = 0; i < thisPowerConnections.length; i++) {
            let thisPduSide = thisPowerConnections[i].pduSide
            let thisPort = thisPowerConnections[i].port
            for (let j = 0; j < otherPowerConnections.length; j++) {
                let otherPduSide = otherPowerConnections[j].pduSide
                let otherPort = otherPowerConnections[j].port

                if (thisPort == otherPort && thisPduSide == otherPduSide) {
                    errorIDSet.add("powerConnectionConflictStepErrID")
                }
            }
        }
        addConflictToDBSteps(changePlanID, thisStepID, thisStepNum, otherStepID, otherStepNum, errorIDSet, status => {
            callback(status)
        })
    }
    else {
        callback(false)
    }

}
function assetIDStepConflict(changePlanID, thisStepID, otherStepID, otherStepNum, thisStepData, otherAssetID, isEdit, thisStepNum, callback) {
    let errorIDSet = new Set()
    let thisAssetID = isEdit ? thisStepData.assetId : thisStepData.assetID //Id vs ID is important

    if (thisAssetID.toString() === otherAssetID.toString() && thisAssetID !== "" && otherAssetID !== "") {
        errorIDSet.add("assetIDStepErrID")
        addConflictToDBSteps(changePlanID, thisStepID, thisStepNum, otherStepID, otherStepNum, errorIDSet, status => {
            callback(status)
        })
    } else {
        callback(false)
    }
}

function hostnameStepConflict(changePlanID, thisStepID, otherStepID, otherStepNum, thisStepData, otherHostname, otherAssetID, isEdit, thisStepNum, callback) {
    let errorIDSet = new Set()
    let thisHostname = isEdit ? thisStepData.hostname : thisStepData.changes.hostname.new
    let thisAssetID = isEdit ? thisStepData.assetId : thisStepData.assetID

    if (thisHostname === otherHostname && thisAssetID !== otherAssetID && isEdit) {
        errorIDSet.add("hostnameStepErrID")
        addConflictToDBSteps(changePlanID, thisStepID, thisStepNum, otherStepID, otherStepNum, errorIDSet, status => {
            callback(status)
        })
    }
    else if (thisHostname === otherHostname && !isEdit) {
        errorIDSet.add("hostnameStepErrID")
        addConflictToDBSteps(changePlanID, thisStepID, thisStepNum, otherStepID, otherStepNum, errorIDSet, status => {
            callback(status)
        })

    }
    else {
        callback(false)
    }
}

function rackUStepConflict(changePlanID, thisStepID, otherStepID, otherStepNum, thisStepData, otherModel, otherDatacenter, otherRack, otherRackU, isEdit, thisStepNum, callback, thisBlade = null, thisChassisHostname = null, thisChassisSlot = null) {
    let errorIDSet = new Set()
    let thisModel = isEdit ? thisStepData.model : thisStepData.changes.model.new
    //console.log(thisModel)
    modelutils.getModelByModelname(thisModel, async function (thisModelDoc) {

        modelutils.getModelByModelname(otherModel, async function (otherModelDoc) {
            if (!thisModelDoc || !otherModelDoc) {
                errorIDSet.add("modelErrID")
                addConflictToDBSteps(changePlanID, thisStepID, thisStepNum, otherStepID, otherStepNum, errorIDSet, status => {
                    callback(status)
                })

            }
            else {
                let otherModelHeight = otherModelDoc.data().height
                let thisModelHeight = thisModelDoc.data().height
                let thisDatacenter = (isEdit ? thisStepData.datacenter : thisStepData.changes.datacenter.new)

                console.log(thisStepData)
                let thisRack = thisBlade ? thisChassisHostname
                    : (isEdit ? thisStepData.rack : thisStepData.changes.rack.new)
                //let thisRack = isEdit ? thisStepData.rack : thisStepData.changes.rack.new //what if the current step is add or edit blade?
                let thisRackU = thisBlade ? thisChassisSlot
                    : (isEdit ? thisStepData.rackU : thisStepData.changes.rackU.new)

                //let thisRackU = isEdit ? thisStepData.rackU : thisStepData.changes.rackU.new 
                //console.log(otherModelHeight, thisModelHeight, thisDatacenter, thisRackU, thisRack)

                let thisOccupied = []
                for (let i = 0; i < thisModelHeight; i++) {
                    let occupiedThisPos = thisRackU + i
                    console.log("occupiedThisPos: " + occupiedThisPos)
                    thisOccupied.push(occupiedThisPos)
                }
                let otherOccupied = []
                console.log(otherModelHeight)
                console.log(otherRackU)
                for (let j = 0; j < otherModelHeight; j++) {
                    let occupiedOtherPos = otherRackU + j //otherRackU needs to be slotNum if other step is a blade
                    console.log("occupiedOterPos: " + occupiedOtherPos)
                    otherOccupied.push(occupiedOtherPos)
                }
                console.log(otherDatacenter, thisDatacenter)
                console.log(otherRack, thisRack)
                if (otherDatacenter == thisDatacenter && otherRack == thisRack) {  //need to compare chassis hostnames here
                    let intersection = thisOccupied.filter(x => otherOccupied.includes(x));
                    console.log("LEVEL 1")
                    console.log(...thisOccupied)
                    console.log(...otherOccupied)
                    if (intersection.length) {
                        console.log("LEVEL 2")
                        errorIDSet.add(thisBlade ? "slotConflictStepErrID" : "rackUConflictStepErrID")
                        addConflictToDBSteps(changePlanID, thisStepID, thisStepNum, otherStepID, otherStepNum, errorIDSet, status => {
                            callback(status)
                        })
                    }
                    else {
                        //not intersecting each other on the rack in terms of rackU
                        callback(false)
                    }
                }
                else {
                    //not in the same datacenter and rack
                    callback(false)
                }
            }
        })
    })
}

function addConflictToDBDatabase(changePlanID, stepID, fieldName, errorIDSet, callback) {

    //Call this method at each validation function at the end, where appropriate
    //What if the stepID doc does not exist? Does .set() take care of this for you?
    //the answer: yes, set with merge will update fields in the document or create it if it doesn't exists
    let errorIDArray = [...errorIDSet]

    if (errorIDArray.length) {

        console.log("Error ID(s) that will be added to the conflict/stepID doc: " + [...errorIDArray])
        changeplansRef.doc(changePlanID).collection('conflicts').doc(stepID).set({
            database: {
                [fieldName]: errorIDArray
            }

        }, { merge: true }).then(function () {
            console.log("Successfully added the conflict to the database: database for this step: " + stepID)
            return (callback(true))

        }).catch(error => {
            callback(false)
            console.log("Error adding conflict to the db")
        }
        )
    }
    else {
        //no IDs in the array. If this works, can refactor the basic tests
        //console.log("No conflicts found.")
        callback(false)
    }
}

function addConflictToDBSteps(changePlanID, stepID, stepNum, otherStepID, otherStepNum, errorIDSet, callback) {

    let errorIDArray = [...errorIDSet]
    if (errorIDArray.length) {

        console.log("Error ID(s) that will be added to the conflict/stepID doc: " + [...errorIDArray])
        changeplansRef.doc(changePlanID).collection('conflicts').doc(stepID).set({
            steps: {
                [otherStepNum]: firebase.firestore.FieldValue.arrayUnion(...errorIDArray)
            }

        }, { merge: true }).then(function () {
            //this is for symmetric add of conflicts. Decomm check doesn't need a symm add, therefore the if statement below

            if (otherStepID) {
                changeplansRef.doc(changePlanID).collection('conflicts').doc(otherStepID).set({
                    steps: {
                        [stepNum]: firebase.firestore.FieldValue.arrayUnion(...errorIDArray)
                    }

                }, { merge: true }).then(function () {

                    console.log("Successfully added the conflict to the database: steps.")
                    return (callback(true))

                })

            }
            else {
                //this relates to decommission errors, where it's not necessary to do a symmetric add conflict
                callback(false)
            }

        }).catch(error => {
            callback(false)
            console.log("Error adding conflict to the db: " + error)
        }
        )
    }
    else {
        //no IDs in the array. If this works, can refactor the basic tests
        //console.log("No conflicts found.")
        callback(false)
    }
}

function getErrorMessages(changePlanID, stepNum, callback) {

    changeplanutils.getStepDocID(changePlanID, stepNum, stepID => {
        changeplansRef.doc(changePlanID).collection('conflicts').doc(stepID).get().then(function (conflictDoc) {
            let errMessage = ""
            const data = conflictDoc.data();

            for (const conflictType in data) {
                const conflicts = data[conflictType];
                for (const key in conflicts) {

                    let value = conflicts[key]
                    value.forEach(errID => {
                        let message = errorStrings[errID]
                        errMessage = errMessage + "\n" + message

                    })
                }

            }
            callback(errMessage)


        }).catch(error => console.log(error))

    })

}

//if there are conflicts, callback the stepNums, or stepIDs that have them
//otherwise callback []
function changePlanHasConflicts(changePlanID, callback) {
    changeplansRef.doc(changePlanID).collection('conflicts').get().then(query => {
        let result = new Set()
        let count = 0;
        // console.log(query.size)
        if (query.docs.length) {
            query.docs.forEach(stepDoc => {
                changeplansRef.doc(changePlanID).collection('changes').doc(stepDoc.id).get().then(changeStepDoc => {
                    if (changeStepDoc.exists) {
                        let stepNum = changeStepDoc.data().step
                        result.add(stepNum)
                        count++;
                        if (count === query.size) {
                            //console.log("This is the result set size: " + result.size)
                            let sortedResult = [...(result)].sort()
                            console.log("CALLING BACK" + sortedResult)

                            callback(sortedResult)
                        }
                    }
                    else {
                        callback([])
                    }
                }).catch(error => {
                    console.log(error)
                }
                )
            })
        }
        else {
            callback([])
        }
    })
}

function checkAllLiveDBConflicts(isExecuted, changePlanID, callback) {
    let counter = 0;
    if (!isExecuted) {
        changeplansRef.doc(changePlanID).collection('changes').get().then(collectionDoc => {
            if (!collectionDoc.empty) {
                collectionDoc.forEach(stepDoc => {
                    let isExecuted = stepDoc.data().executed
                    let stepNum = stepDoc.data().step

                    checkLiveDBConflicts(isExecuted, changePlanID, stepNum, status => {
                        counter++;
                        console.log(collectionDoc.size)
                        console.log(counter)
                        if (counter === collectionDoc.size) {
                            console.log("Done with live db conflict checks for this change plan.")
                            console.log("DID THIS SHIT FUCKING WORK")
                            callback()

                        }
                    })
                })
            }
            else {
                callback()
            }
        })
    }
}

function clearAllStepConflicts(changePlanID, callback) {
    let counter = 0;
    changeplansRef.doc(changePlanID).collection('conflicts').get().then(allConflicts => {
        if (!allConflicts.empty) {
            allConflicts.docs.forEach(stepConflict => {
                //what if there is no steps field?
                changeplansRef.doc(changePlanID).collection("conflicts").doc(stepConflict.id).set({
                    steps: firebase.firestore.FieldValue.delete()
                }, { merge: true }).then(() => {
                    counter++;
                    if (counter === allConflicts.size) {
                        console.log("Done deleting docs in conflict subcoll")
                        callback(true)
                    }
                }).catch(function () {
                    callback(null);
                })
            })
        }
        else {
            callback(true)
        }

    })

}

function clearAllConflicts(changePlanID, callback) {
    let counter = 0;
    changeplansRef.doc(changePlanID).collection('conflicts').get().then(allConflicts => {
        if (!allConflicts.empty) {
            allConflicts.docs.forEach(stepConflict => {
                changeplansRef.doc(changePlanID).collection("conflicts").doc(stepConflict.id).delete().then(() => {
                    counter++;
                    if (counter === allConflicts.size) {
                        console.log("Done deleting docs in conflict subcoll")
                        callback(true)
                    }
                }).catch(function () {
                    callback(null);
                })
            })


        }
        else {
            callback(true)
        }

    })
}

export {
    addAssetChangePlanPackage,
    rackNonExistent,
    datacenterNonExistent,
    hostnameConflict,
    ownerConflict,
    assetIDConflict,
    modelConflict,
    rackUConflict,
    powerConnectionConflict,
    networkConnectionConflict,
    getErrorMessages,
    checkSequentialStepConflicts,
    checkLiveDBConflicts,
    changePlanHasConflicts,
    editCheckAssetNonexistent,
    checkAllLiveDBConflicts,
    clearAllConflicts,
    clearAllStepConflicts


}
