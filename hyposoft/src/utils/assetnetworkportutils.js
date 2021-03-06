import { assetRef, decommissionRef, modelsRef, firebase, db } from './firebaseutils'

//These variable are used in the checkConflicts method
let otherAssetsMap = {};
let seenThisPorts = [];
let seenOtherPorts = new Map(); //Map of otherAssetID --> array of all otherPorts assoc with it

//networkPortConnections is an array at this point. Gets transformed when passed into addAsset()  in AddAssetForm
//this function is called in addAsset in assetutils.js (so when the user presses submit on the form)
function validateNetworkConnections(thisModelName, networkPortConnections, callback, oldNetworkConnections = null, offlineStorage = null, chassis = null, myAssetId = '') {
    if(offlineStorage || chassis){
        return(callback(null));
    }
    else {
        console.log(networkPortConnections)
        seenOtherPorts = new Map();
        seenThisPorts = [];

        let success = 0;

        //this is jenk af. These are here to make sure some callbacks are only done once, and toasts don't show up with the same message multiple times
        let mostConnsPrintCount = 0
        let noConnsPrintCount = 0;

        let numConnectionsMade = networkPortConnections.length
        let mostPossibleConnections = 0;

        //This was added for updating assets. seemed to be stuck, if no network connections
        if (numConnectionsMade == 0) {
            return(callback(null))
        }

        //What Joyce added
        console.log(networkPortConnections)
        let uniqueThisPorts = networkPortConnections.map(conn => conn.thisPort)
        let allUniqueThisPorts = new Set(uniqueThisPorts)
        if (allUniqueThisPorts.size < numConnectionsMade) {
            return(callback("Duplicate thisPorts found"))
        }

        for (let i = 0; i < numConnectionsMade; i++) {
            let otherAssetID = networkPortConnections[i].otherAssetID;
            let otherPort = networkPortConnections[i].otherPort;
            let thisPort = networkPortConnections[i].thisPort

            //Left entirely empty is OK
            if (otherAssetID.toString() === "" && otherPort.trim() === "" && thisPort.trim() === "") {
                success++;
                if (success === networkPortConnections.length) {
                    return(callback(null))
                }

            }
            //All of the fields have been filled in
            else if (otherPort.trim() !== "" && thisPort.trim() !== "") {

                modelsRef.where("modelName", "==", thisModelName).get().then(async function (querySnapshot) {
                    //Number of ports on the model that you are trying to add an asset of
                    console.log(querySnapshot.docs[0].data().modelName)
                    let bladeCount = 0
                    if (querySnapshot.docs[0].data().mount === 'chassis') {
                       bladeCount = await new Promise(function(resolve, reject) {
                          db.collectionGroup('blades').where('id','==',myAssetId).get().then(qs => {
                              if (!qs.empty) {
                                resolve(qs.docs[0].data().assets.length)
                              } else {
                                resolve(0)
                              }
                          })
                       })
                    }
                    numConnectionsMade = numConnectionsMade - bladeCount
                    let numThisModelPorts = querySnapshot.docs[0].data().networkPortsCount + bladeCount;
                    let errModels = [];
                    if (numThisModelPorts === 0) {
                        errModels.push(thisModelName)
                    }

                    //Getting the number of network ports from the asset trying to connect to
                    // TODO: so this logic of taking the min is flawed...so might as well take it out (since it is caught by unique port checks) or fix it
                    console.log(otherAssetID)
                    assetRef.doc(otherAssetID).get().then(function (otherAssetModelDoc) {
                        if (!otherAssetModelDoc.exists) {
                            return(callback("To make a network connection to another asset, please enter a valid asset ID"))
                        }
                        else {
                            let otherModel = otherAssetModelDoc.data().model

                            modelsRef.where("modelName", "==", otherModel).get().then(async function (querySnapshot) {

                                let otherBladeCount = 0
                                if (querySnapshot.docs[0].data().mount === 'chassis') {
                                  otherBladeCount = await new Promise(function(resolve, reject) {
                                      db.collectionGroup('blades').where('id','==',otherAssetID).get().then(qs => {
                                          if (!qs.empty) {
                                            resolve(qs.docs[0].data().assets.length)
                                          } else {
                                            resolve(0)
                                          }
                                      })
                                  })
                                }
                                let numOtherModelPorts = querySnapshot.docs[0].data().networkPortsCount + otherBladeCount
                                if (numOtherModelPorts === 0) {
                                    errModels.push(otherModel)
                                }
                                console.log(numThisModelPorts)
                                console.log(numOtherModelPorts)
                                console.log(numConnectionsMade);
                                //Math.min with a null, null is treated as 0
                                mostPossibleConnections = Math.min(numThisModelPorts, numOtherModelPorts)
                                //https://javascript.info/comparison

                                if (numConnectionsMade > mostPossibleConnections) {
                                    mostConnsPrintCount++;
                                    noConnsPrintCount++;
                                    if (mostPossibleConnections && mostConnsPrintCount === 1) {
                                        //THIS PRINTS MULTIPLE TIMES
                                        return(callback("Making too many network connections. The most connections you can make between existing hardware is " + mostPossibleConnections))

                                    }
                                    else if (noConnsPrintCount === 1) {
                                        return(callback("Cannot make network connections. There are no network ports on model(s): " + [...errModels] + " that you are trying to connect."))

                                    }
                                } else {
                                    //Made an appropriate number of connections between the specified hardware
                                    //Now need to check that the ports exist
                                    checkThisModelPortsExist(thisModelName, thisPort, nonThisExist => {
                                        if (nonThisExist) {//means there's an error message
                                            return(callback(nonThisExist))
                                        }
                                        else {
                                            checkOtherAssetPortsExist(otherAssetID, otherPort, otherNonexist => {

                                                if (otherNonexist) {

                                                    return(callback(otherNonexist))
                                                }
                                                else {
                                                    //Move these lines into checkNetworkPortConflicts but not inside the if or else. that's because of the for loop
                                                    console.log("SeenOtherPorts: " + seenOtherPorts)
                                                    console.log("SeenThisPOrts: " + [...seenThisPorts])

                                                    checkNetworkPortConflicts(oldNetworkConnections, thisPort, otherAssetID, otherPort, status => {
                                                        seenOtherPorts.set(otherAssetID, otherPort);
                                                        console.log("pushing " + otherAssetID + " : " + otherPort + " to seen otherports")
                                                        seenThisPorts.push(thisPort)
                                                        if (status) {
                                                            return(callback(status))
                                                        }
                                                        else {
                                                            success++;
                                                            if (success === networkPortConnections.length) {
                                                                console.log("okay but made it here forreal")
                                                                return(callback(null))
                                                            }
                                                            console.log("Congrats, you made it here.")

                                                        }
                                                    })


                                                }
                                            })
                                        }
                                    })
                                }
                            })
                        }

                    }).catch(error => { console.log(error) })
                })
            }
            else {
                //has been partially filled out
                return(callback("To make a network connection, must fill out all fields."))
            }
        }
    }

}

//Everything else below are helper functions called in the above validate function============================

function checkThisModelPortsExist(thisModelName, thisPort, callback) {

    let errPort = "";
    let errModel = "";


    modelsRef.where("modelName", "==", thisModelName).get().then(function (querySnapshot) {

        //does the model contain this port name?
        //WHAT IF THERE ARE NO NETWORK PORTS? [].include() will return false
        if (!thisPort.includes('blade ') && !querySnapshot.docs[0].data().networkPorts.includes(thisPort)) {
            errPort = thisPort
            errModel = thisModelName;
            console.log("Did not find the input thisPort in the model's existing port names")


            console.log(seenThisPorts)


            //TODO: multiple ports could not exist if user adds multiple wrong connections. Need to change erro msg
            return(callback("Trying to connect a nonexistent network port " + errPort + " on this model: " + errModel))

        }
        else {
            return(callback(null))
        }

    }).catch(error => console.log(error))
}

function checkOtherAssetPortsExist(otherAssetID, otherPort, callback) {

    let errPort = "";
    let errInstance = "";
    let errModel = "";
    let errHostname = "";
    let errMessage1 = "";
    let errMessage2 = "";
    let errMessageFinal = "";

    assetRef.doc(otherAssetID).get().then(function (querySnapshot) {
        let otherModel = querySnapshot.data().model;
        errHostname = querySnapshot.data().hostname;
        modelsRef.where("modelName", "==", otherModel).get().then(function (querySnapshot) {
            console.log("In checkOtherAssetPortsExist")

            //Need to keep track in a different collection of which ports have been occupied
            if (!otherPort.includes('blade ') && !querySnapshot.docs[0].data().networkPorts.includes(otherPort)) {

                errPort = otherPort;
                errInstance = otherAssetID;
                errModel = otherModel;


                errMessage1 = "Trying to connect a nonexistent network port " + errPort + " on other asset " + errInstance + " " + errModel

                errMessage2 = "Trying to connect a nonexistent network port " + errPort + " on other asset " + errHostname + " " + errModel

                //TODO: multiple ports could not exist if user adds multiple wrong connections. Need to change erro msg
                //Maybe pass in index to say 'at ith connection, this is wrong'
                errMessageFinal = errHostname.trim() === "" ? errMessage1 : errMessage2;


                return(callback(errMessageFinal))
            }
            else {
                return(callback(null))
            }
        }).catch(error => console.log(error))

    }).catch(error => console.log(error))



}
function checkNetworkPortConflicts(oldNetworkConnections, thisPort, otherAssetID, otherPort, callback) {

    let errHost = "";
    let case1ErrPrintCount = 0
    let case2ErrPrintCount = 0
    let case3ErrPrintCount = 0


    console.log(seenOtherPorts)
    console.log(seenThisPorts)

    assetRef.doc(otherAssetID).get().then(function (querySnapshot) {
        errHost = querySnapshot.data().hostname
        otherAssetsMap = querySnapshot.data().networkConnections
        let otherPortString = otherPort.toString()

        if (Object.keys(otherAssetsMap).length !== 0) {
            let keys = Object.keys(otherAssetsMap)
            console.log(keys.includes(otherPortString))
            console.log(keys)


            case1ErrPrintCount++
            case2ErrPrintCount++
            case3ErrPrintCount++

            if(oldNetworkConnections && oldNetworkConnections[thisPort] && oldNetworkConnections[thisPort].otherAssetID === otherAssetID && oldNetworkConnections[thisPort].otherPort === otherPort){
                return(callback(null))
            }
            else if (Object.keys(otherAssetsMap).includes(otherPort) && case3ErrPrintCount === 1) {//otherPort is already a key in otherAssetID's Map: so it's already connected
                console.log("up in this bitch")
                return(callback("Can’t connect port " + thisPort + " on this asset to " + errHost + " " + otherAssetID + " " + otherPort + ". The other asset's port has already been connected.") )
                //". That port is already connected to host5 port e1")
            }
            else if (seenOtherPorts.has(otherAssetID) && seenOtherPorts.get(otherAssetID).includes(otherPort) && case2ErrPrintCount === 1) {
                console.log(seenOtherPorts);
                console.log(otherAssetID);
                console.log(otherPort);
                return(callback("Can’t connect to" + errHost + " " + otherAssetID + " " + otherPort + ". It's already being used in a previous network connection you are trying to add."))

                //     return(callback("Can’t connect to" + errHost + " " + otherAssetID + " " + otherPort + ". It's already being used in a previous network connection you are trying to add."))

            }

            else if (seenThisPorts.includes(thisPort) && case1ErrPrintCount === 1) {
                console.log(seenThisPorts)
                console.log(case1ErrPrintCount);
                return(callback("Can’t connect port " + thisPort + " on this asset. It's already being used in a previous network connection you are trying to add."))
            }

            else {
                //the last else should be a callback(null). For the current connection, it has run through the gauntlet of validation checks

                return(callback(null))

            }



        }
        else {
            //since no network connections have been
            return(callback(null))
        }

    }).catch(error => console.log(error))
}

function symmetricNetworkConnectionsAdd(networkConnectionsArray, newID, offlineStorage = null) {
    if(offlineStorage){
        return;
    } else {
        //Make sure connections are symmetric. Meaning the other asset should have their network port connectiosn updated too
        //So when someone adds an asset and makes network connections, the networkconnections field for otherAssetID otherPort will be updated
        let thisPort = "";
        let otherAssetID = ""
        let otherPort = "";
        console.log("In symmetric network connections", networkConnectionsArray)

        if (!networkConnectionsArray.length) {
            //TODO:didn't fill out any fields?? But what if first one was left blank
            return;
        }
        else {

            //Only add once everything has been validated. Go up into assetutils and call this method there
            for (let i = 0; i < networkConnectionsArray.length; i++) {
                thisPort = networkConnectionsArray[i].thisPort
                otherAssetID = networkConnectionsArray[i].otherAssetID
                otherPort = networkConnectionsArray[i].otherPort
                //add a connection where otherPort : {otherAssetID: newID; otherPort: thisPort}

                //go into the other assetID, do update
                console.log(otherAssetID)
                assetRef.doc(otherAssetID).set({
                    networkConnections: { [otherPort]: { otherAssetID: newID, otherPort: thisPort } }


                }, { merge: true }).then(function () {
                    console.log("Successfully made a symmetric network connection")
                }).catch(error => console.log(error))

            }


        }
    }
}
//TODO: asset utils and add this method
//takes in id of asset being deleted
//for all network connections, delete te matching port
function symmetricNetworkConnectionsDelete(deleteID, callback, offlineStorage = null) {
    if(offlineStorage){
        return(callback(true));
    } else {
        //deleteID refers to asset you are deleting
        console.log("fucking kms")
        assetRef.doc(deleteID).get().then(function (docRef) {
            if (!(docRef.data().networkConnections && Object.keys(docRef.data().networkConnections).length)) {
                return(callback(true))
            }
            //It's not the fault of symm, we are just not getting the networkConnections
            let networkConnections = Object.keys(docRef.data().networkConnections);
            console.log(networkConnections)
            let count = 0;
            //Go through each connection made, go to each connected asset, and delete yourself
            networkConnections.forEach(function (connection) {
                let otherConnectedAsset = docRef.data().networkConnections[connection].otherAssetID;
                console.log(otherConnectedAsset)
                assetRef.doc(otherConnectedAsset).get().then(function (otherAssetDoc) {
                    console.log(otherAssetDoc)
                    //delete yourself
                    if (otherAssetDoc.exists) {
                        let conns = Object.keys(otherAssetDoc.data().networkConnections);
                        console.log(conns)
                        conns.forEach(function (conn) {
                            console.log("in the innerforeach for ", conn)
                            console.log(otherAssetDoc.data().networkConnections[conn].otherAssetID)
                            console.log(deleteID)
                            if (otherAssetDoc.data().networkConnections[conn].otherAssetID === deleteID) {
                                console.log("matched")
                                //then call firld delete frecase code
                                assetRef.doc(otherConnectedAsset).update({
                                    [`networkConnections.${conn}`]: firebase.firestore.FieldValue.delete()
                                }).then(function () {
                                    console.log("update worked for " + otherConnectedAsset)
                                    count++;
                                    //console.log("count is " + count + " and networkconnections size is " + networkConnections.length)
                                    if (count === networkConnections.length) {
                                        console.log("calling back")
                                        return(callback(true))
                                    }
                                }).catch(function (error) {
                                    console.log("not quite")
                                    console.log(error);
                                    return(callback(null))
                                });
                                console.log("after the update")
                            }
                        })
                    } else {
                        return(callback(true))
                    }
                }).catch(function (error) {
                    console.log(error);
                    return(callback(null))
                })
            })
        }).catch(function (error) {
            console.log(error);
            return(callback(null))
        })
    }


}
function networkConnectionsToMap(networkConnectionsArray, callback, offlineStorage) {
    if(offlineStorage){
        return(callback({}));
    }
    else {
        console.log(networkConnectionsArray);

        var JSONConnections = {}
        var JSONValues = {}

        if (!networkConnectionsArray.length) {
            //TODO:didn't fill out anything. But what if first is empty but second is not?
            return(callback(JSONConnections))
        } else {
            let count = 0;
            networkConnectionsArray.forEach(networkConnection => {
                JSONConnections = {
                    ...JSONConnections,
                    [networkConnection.thisPort]: {
                        otherAssetID: networkConnection.otherAssetID,
                        otherPort: networkConnection.otherPort
                    }
                };
                console.log(JSONConnections);
                count++;
                console.log(count);
                if (count === networkConnectionsArray.length) {
                    console.log("returning ", JSONConnections);
                    return(callback(JSONConnections))
                }
            })
        }
    }

}
function networkConnectionsToArray(networkMap) {
    let networkArray = []

    if (Object.keys(networkMap)) {
        let count = 0;
        console.log(networkMap)
        console.log(Object.keys(networkMap))
        Object.keys(networkMap).forEach(key => {
            console.log(key)
            let connObject = {}
            connObject["thisPort"] = key
            connObject["otherAssetID"] = networkMap[key].otherAssetID
            connObject["otherPort"] = networkMap[key].otherPort
            console.log(connObject)

            networkArray.push(connObject)
            console.log(networkArray)
            count++;

        })
        return networkArray
    }
    else {
        return networkArray;
    }

}


function getNetworkPortConnections(assetID, callback) {
    let assets = [];
    addPortsByAsset(assetID, 1, (nodes, secondLevel) => {
        console.log(nodes);
        if (nodes && nodes.length) {
            assets = assets.concat(nodes);
            let count = 0;
            console.log("secondlevel is ", secondLevel)
            secondLevel.forEach(secondLevelID => {
                addPortsByAsset(secondLevelID, 2, (secondLevelNodes, thirdLevel) => {
                    console.log("here and count is " + count + " out of " + secondLevel.length)
                    if (secondLevelNodes && secondLevelNodes.length) {
                        assets = assets.concat(secondLevelNodes);
                        count++;
                        if (count === secondLevel.length) {
                            console.log("yeeeet")
                            console.log(assets)
                            return(callback(assets))
                        }
                    } else if (secondLevelNodes) {
                        count++;
                        if (count === secondLevel.length) {
                            console.log("yeeeet")
                            console.log(assets)
                            return(callback(assets))
                        }
                    }
                    else {
                        console.log("fail")
                        return(callback(null))
                    }
                });
            })
        } else {
            return(callback(null))
        }
    })
}

function addPortsByAsset(assetID, level, callback) {
    let assets = [];
    let assetSecondLevel = [];
    assetRef.doc(assetID).get().then(docSnap => {
        //let assetModel = docSnap.data().model;
        if (docSnap.exists) {
            finishAddPortsByAsset(docSnap,true)
            return
        }
        decommissionRef.where('assetId','==',assetID).get().then(docSnaps => {
            if (docSnaps.docs.length === 0) {
                return(callback(null, null))
            }
            finishAddPortsByAsset(docSnaps.docs[0],false)
            return
        })
        .catch(function (error) {
            console.log(error);
            return(callback(null, null))
        })
    }).catch(function (error) {
        console.log(error);
        return(callback(null, null))
    })

    function finishAddPortsByAsset(docSnap, deployed) {
      let nodeClass = (level === 1) ? "origin" : "second";
      let nodeLevel = (level === 1) ? 1 : 2;
      let hostname = docSnap.data().hostname ? docSnap.data().hostname : "No hostname";
      if (level === 1) {
          assets.push({
              data: {
                  id: assetID,
                  level: nodeLevel,
                  deployed: deployed,
                  display: assetID + "\n" + hostname
              },
              classes: nodeClass,
          });
      }
      let count = 0;
      console.log(docSnap.data())
      if (docSnap.data().networkConnections && Object.keys(docSnap.data().networkConnections).length) {
          Object.keys(docSnap.data().networkConnections).forEach(function (connection) {
              assetRef.doc(docSnap.data().networkConnections[connection].otherAssetID.toString()).get().then(otherDocSnap => {
                  if (otherDocSnap.exists) {
                      finishAddPortsByOtherAsset(docSnap, otherDocSnap, true, connection)
                  } else {
                    decommissionRef.where('assetId','==',docSnap.data().networkConnections[connection].otherAssetID.toString()).get().then(docSnaps => {
                        if (docSnaps.docs.length === 0) {
                            return(callback(null, null))
                        }
                        finishAddPortsByOtherAsset(docSnap, docSnaps.docs[0], false, connection)
                    })
                    .catch(function (error) {
                        console.log(error);
                        return(callback(null, null))
                    })
                  }
              }).catch(function (error) {
                  console.log(error);
                  return(callback(null, null))
              })
          })
      } else {
          console.log("here 3")
          return(callback([], []))
      }

      function finishAddPortsByOtherAsset(docSnap, otherDocSnap, deployed, connection) {
        assetSecondLevel.push(docSnap.data().networkConnections[connection].otherAssetID.toString());
        console.log("here 2")
        //let otherAssetModel = otherDocSnap.data().model;
        let innerNodeClass = (level === 1) ? "second" : "third";
        let innerNodeLevel = (level === 1) ? 2 : 3;
        let otherHostname = otherDocSnap.data().hostname ? otherDocSnap.data().hostname : "No hostname";
        assets.push({
            data: {
                id: docSnap.data().networkConnections[connection].otherAssetID,
                level: innerNodeLevel,
                deployed: deployed,
                display: docSnap.data().networkConnections[connection].otherAssetID + "\n" + otherHostname
            },
            classes: innerNodeClass,
        });
        assets.push({
            data: {
                source: assetID,
                target: docSnap.data().networkConnections[connection].otherAssetID
            }
        });
        count++;
        if (count === Object.keys(docSnap.data().networkConnections).length) {
            return(callback(assets, assetSecondLevel))
        }
      }
    }
}

//note this only deletes a single connection, not to be confused with the other function that deletes all
//When you edit and delete a single network connection,
//assetID is the asset you're editing
//connectionName is name of networkPort, thisPort, you want to delete
function symmetricDeleteSingleNetworkConnection(assetID, connectionName, otherAssetID, otherPort, callback) {
    assetRef.doc(assetID).get().then(function (docSnap) {
        let networkConnections = docSnap.data().networkConnections;

        //checks if the asset you are currently updating has thisPort and it is connected
        //  if(networkConnections[connectionName] && Object.keys(networkConnections[connectionName]).length){
        //   console.log("Symm single delete 1")
        //let otherAssetID = networkConnections[connectionName].otherAssetID;
        //let otherPort = networkConnections[connectionName].otherPort;
        assetRef.doc(otherAssetID).get().then(function (otherDocSnap) {
            //let otherNetworkConnections = otherDocSnap.data().networkConnections
            //other asset Id needs to have the connection that current updating asset is trying to delete

            //BUG: trying to add an network connection in an update, and it doesn't seem to add properly?
            //Not adding to the otherAsset's networkConnections

            // if(otherNetworkConnections[otherPort] && Object.keys(otherNetworkConnections[otherPort]).length){
            console.log("Symm single delete 2")
            assetRef.doc(otherAssetID).update({
                [`networkConnections.${otherPort}`]: firebase.firestore.FieldValue.delete()
            })
            // .then(function () {
            //     assetRef.doc(assetID).update({
            //         [`networkConnections.${connectionName}`]: firebase.firestore.FieldValue.delete()

            //     })
                .then(function () {
                    console.log("Symm single delete 3")
                    return(callback(true))
                }).catch(function (error) {
                    console.log(error);
                    return(callback(null))
                })
           // })
            // .catch(function (error) {
            //     console.log(error);
            //     return(callback(null))
            // })
            // } else {
            //     console.log("Symm single delete 4")
            //     return(callback(null))
            // }
        }).catch(function (error) {
            console.log(error);
            return(callback(null))
        })
        // } else {
        //     console.log("Symm single delete 5")
        //     return(callback(null))
        // }
    }).catch(function (error) {
        console.log(error);
        return(callback(null))
    })
}

export {
    validateNetworkConnections,
    checkNetworkPortConflicts,
    getNetworkPortConnections,
    checkOtherAssetPortsExist,
    checkThisModelPortsExist,
    symmetricNetworkConnectionsAdd,
    networkConnectionsToMap,
    symmetricNetworkConnectionsDelete,
    networkConnectionsToArray,
    symmetricDeleteSingleNetworkConnection
}
