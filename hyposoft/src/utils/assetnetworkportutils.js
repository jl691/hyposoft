import { assetRef, racksRef, modelsRef, usersRef, firebase } from './firebaseutils'
import * as rackutils from './rackutils'
import * as modelutils from './modelutils'
import * as userutils from './userutils'
import * as assetIDutils from './assetidutils'

//TODO: ethernetPorts --> networkPorts 
//hardcode a set of networkPorts

//If the network connections field in the assets collections is to be a map, then it needs to be a custom collection, according to firestore documentation: https://firebase.google.com/docs/firestore/manage-data/add-data



//these fields come from the form being filled out
function validateNetworkConnections(thisModelName, networkPortConnections) {

    //The port needs to exist (so on this and other asset). Autcomplete picklist should help with this, but still need to throw correct error

    let numConnectionsMade = networkPortConnections.length
    let mostPossibleConnections = 0;

    return new Promise((resolve, reject) => {
        console.log("It's dangerous to go alone! Take this: a JS ~ Promise ~")
        for (let i = 0; i < numConnectionsMade; i++) {

            networkPortConnections[i].map((otherAssetID, otherPort, thisPort) => {

                //Left entirely empty is OK
                if (otherAssetID.trim === "" && otherPort.trim() === "" && thisPort.trim() === "") {
                    resolve(networkPortConnections)

                }
                //All of the fields have been filled in
                else if (otherAssetID.trim !== "" && otherPort.trim() !== "" && thisPort.trim() !== "") {

                    modelsRef.doc().where("modelName", "===", thisModelName).get().then(function (thisModelDoc) {
                        console.log(thisModelDoc.ethernetPorts)
                        //Number of ports on the model that you are trying to add an asset of
                        let numThisModelPorts = thisModelDoc.ethernetPorts;

                        //Getting the number of ethernet ports from the asset trying to connect to
                        assetRef.doc(parseInt(otherAssetID)).get().then(function (docRef) {
                            let otherModel = docRef.model
                            console.log(otherModel)

                            modelsRef.doc().where("modelName", "===", otherModel).get().then(function (otherModelDoc) {

                                let numOtherModelPorts = otherModelDoc.ethernetPorts
                                console.log(numThisModelPorts)
                                console.log(numOtherModelPorts)
                                //Math.min with a null, null is treated as 0
                                mostPossibleConnections = Math.min(numThisModelPorts, numOtherModelPorts)
                                //https://javascript.info/comparison

                                if (numConnectionsMade > mostPossibleConnections) {
                                    if (mostPossibleConnections) {
                                        console.log(1)
                                        reject("Making too many network connections. The most connections you can make between existing hardware is " + mostPossibleConnections)

                                    }
                                    else {
                                        console.log(2)
                                        reject("Cannot make network connections. There are no ethernet ports on one or both assets.")

                                    }
                                } else {
                                    console.log(3)
                                    //Made an appropriate number of connections between the specified hardware
                                    //Now need to check that the ports exist
                                    checkThisModelPortsExist(otherAssetID, nonThisExist => {
                                        if (nonThisExist) {//means there's an error message
                                            reject(nonThisExist)
                                        }
                                        else {
                                            checkOtherAssetPortsExist(networkPortConnections, nonOtherExist => {

                                                if (nonOtherExist) {
                                                    reject(nonOtherExist)
                                                }
                                                else {
                                                    checkNetworkPortConflicts(networkPortConnections, status => {
                                                        if (status) {
                                                            reject("can't connect host1 port e1 to switch1 port 22 that port is already connected to host5 port e1")
                                                        }
                                                        else {
                                                            console.log("Congrats, you made it here. Here is a heart container for your efforts <3")
                                                            resolve(networkPortConnections)

                                                        }
                                                    })

                                                }
                                            })
                                        }

                                    })

                                }
                            })
                        }).catch(reject("Trying to connect a nonexistent instance: " + networkPortConnections[i].otherAssetID))
                    })
                }
                else {
                    //has been partially filled out
                    reject("To make a network connection, must fill out all fields.")
                }


            })
        }
    })


}

//Everything else below are helper functions called in the above validate function

function checkNetworkPortConflicts(networkPortConnections, callback) {
    //No doubly connected ports on this (see networkPortConns) and other asset. Must check every singe=le asst
    //The error message ^ must be specific: “can’t connect host1 port e1 to switch1 port 22; that port is already connected to host5 port e1”).

    //accessing the asset NC map

    callback(null)


}
//Assuming models will have a field called networkPorts and will be an array
function checkThisModelPortsExist(thisModelName, networkConnections, callback) {
    let nonexistentPort = false;
    modelsRef.doc().where("modelName", "===", thisModelName).get().then(function (thisModelDoc) {
        for (let i = 0; i < networkConnections.length; i++) {
            //does the model contain this port name?
            if (!thisModelDoc.networkPorts.includes(networkConnections[i].thisPort)) {
                callback("Trying to connect a nonexistent port on this model: " + thisModelDoc.modelName)
            }

        }

        if (!nonexistentPort) {
            callback(null)
        }

    }).catch("This model you are trying to add does not exist: " + thisModelName)


}

function checkOtherAssetPortsExist(networkConnections, callback) {

    let nonexistentPort = false;
    for (let i = 0; i < networkConnections.length; i++) {
        assetRef.doc(parseInt(networkConnections[i].otherAssetID)).get().then(function (otherInstanceDoc) {
            let otherModel = otherInstanceDoc.model;
            console.log(otherModel)
            modelsRef.doc().where("modelName", "===", otherModel).get().then(function (otherModelDoc) {
                if (!otherModelDoc.networkPorts.includes(networkConnections[i].otherPort)) {
                    nonexistentPort = true;
                    callback("Trying to connect a nonexistent port on this instance: " + networkConnections[i].otherAssetID)
                }
            })

        }).catch("This other asset you are trying to connect to does not exist")
    }
    if (!nonexistentPort) {
        callback(null)
    }

}

//need to create a new networkConnections instance 


function symmetricNetworkConnections(networkConnections){
      //Make sure connections are symmetric. Meaning the other asset should have their network port connectiosn updated too
    //This is what's responsible for making the map from the networkConnections Array to finally pass into the database
    //Call validation function here, then depending on results, go into this for loop

}
function networkConnectionsToMap(networkConnectionsArray){

    var JSONConnections={}
    var JSONValues={}
    for(let i = 0; i < networkConnectionsArray.length; i++){

        let key = networkConnectionsArray[i].thisPort;
        let value1 = networkConnectionsArray[i].otherAssetID;
        let value2 = networkConnectionsArray[i].otherPort;
        JSONValues["otherAssetID"]=value1
        JSONValues["otherPort"]=value2
        JSONConnections[key] = JSONValues;
        
    }

    return JSONConnections;
}


function getNetworkPortConnections(assetID, callback) {
    let assets = [];
    addPortsByAsset(assetID, 1, (nodes, secondLevel) => {
        if(nodes && nodes.length){
            assets = assets.concat(nodes);
            let count = 0;
            secondLevel.forEach(secondLevelID => {
                addPortsByAsset(secondLevelID, 2, (secondLevelNodes, thirdLevel) => {
                    console.log("here and count is " + count + " out of " + secondLevel.length)
                    if(secondLevelNodes && secondLevelNodes.length){
                        assets = assets.concat(secondLevelNodes);
                        count++;
                        if(count === secondLevel.length){
                            console.log("yeeeet")
                            console.log(assets)
                            callback(assets);
                        }
                    } else if(secondLevelNodes) {
                        count++;
                        if(count === secondLevel.length){
                            console.log("yeeeet")
                            console.log(assets)
                            callback(assets);
                        }
                    }
                    else {
                        console.log("fail")
                        callback(null);
                    }
                });
            })
        } else {
            callback(null);
        }
    })
}

function addPortsByAsset(assetID, level, callback){
    let assets = [];
    let assetSecondLevel = [];
    assetRef.doc(assetID).get().then(docSnap => {
        let assetModel = docSnap.data().model;
        let nodeClass = (level === 1) ? "origin" : "second";
        let nodeLevel = (level === 1) ? 1 : 2;
        assets.push({
            data: {
                id: assetModel + ", " + assetID,
                level: nodeLevel,
                assetID: assetID
            },
            classes: nodeClass,
        });
        let count = 0;
        console.log(docSnap.data())
        if(docSnap.data().networkConnections) {
            Object.keys(docSnap.data().networkConnections).forEach(function (connection) {
                assetRef.doc(docSnap.data().networkConnections[connection].otherAssetID.toString()).get().then(otherDocSnap => {
                    assetSecondLevel.push(docSnap.data().networkConnections[connection].otherAssetID.toString());
                    let otherAssetModel = otherDocSnap.data().model;
                    let innerNodeClass = (level === 1) ? "second" : "third";
                    let innerNodeLevel = (level === 1) ? 2 : 3;
                    assets.push({
                        data: {
                            id: otherAssetModel + ", " + docSnap.data().networkConnections[connection].otherAssetID,
                            level: innerNodeLevel,
                            assetID: docSnap.data().networkConnections[connection].otherAssetID
                        },
                        classes: innerNodeClass,
                    });
                    assets.push({
                        data: {
                            source: assetModel + ", " + assetID,
                            target: otherAssetModel + ", " + docSnap.data().networkConnections[connection].otherAssetID
                        }
                    });
                    count++;
                    if(count === Object.keys(docSnap.data().networkConnections).length){
                        callback(assets, assetSecondLevel);
                    }
                }).catch(function (error) {
                    console.log(error);
                    callback(null, null)
                })
            })
        } else {
            callback([], []);
        }
    }).catch(function (error) {
        console.log(error);
        callback(null, null);
    })
}

export {
    validateNetworkConnections,
    checkNetworkPortConflicts,
    getNetworkPortConnections,
    checkOtherAssetPortsExist,
    checkThisModelPortsExist,
    symmetricNetworkConnections,
    networkConnectionsToMap,
}