import { racksRef, modelsRef } from './firebaseutils'
import * as datacenterutils from './datacenterutils'
import * as firebaseutils from './firebaseutils'

//Toast message at the front end level


async function validatePowerConnections(inputDatacenter, inputRack, inputRackU, powerConnections, model, callback, assetID = null, offlineStorage = null) {
    if(offlineStorage){
        callback(null);
    }
   else {
        // assuming all or nothing. If an asset has 2 power ports, can't just plug one in
        console.log(powerConnections);
        //How to handle when the rack does not have a network managed port?? How does this affect the detailed view? Getting the status?
        let success = 0;
        let allOrNothingCount=0;
        console.log("Validating power ports, this is power ports : "+ powerConnections)
        if(!powerConnections.length){
            console.log("Calling back cause no power connections")
            callback(null);
        }
        for (let i = 0; i < powerConnections.length; i++) {
            console.log("in the for loop");
            let pduSide = powerConnections[i].pduSide;
            let port = powerConnections[i].port;

            if (pduSide.trim() === "" && port.trim() === "") {
                console.log("incrementing successes for pduside " + pduSide + " and port " + port)
                success++;

                if (success == powerConnections.length) {
                    console.log("Returning successfully")
                    callback(null)
                }
            }

            else if (pduSide.trim() !== "" && port.trim() !== "") {

                modelsRef.where("modelName", "==", model).get().then(function (querySnapshot) {
                    let numPowerPorts = querySnapshot.docs[0].data().powerPorts ? querySnapshot.docs[0].data().powerPorts : 0;
                    console.log("Num powerPorts for this model: " + numPowerPorts)

                    allOrNothingCount++;

                    if (parseInt(port) >= 1 && parseInt(port) <= 24) {

                        //all or nothing
                        if (powerConnections.length === numPowerPorts) {
                            //check for conflicts
                            checkConflicts(inputDatacenter, inputRack, inputRackU, pduSide, port, status => {
                                console.log(status)
                                if (status) {
                                    callback(status)
                                }
                                else {
                                    console.log("incrementing successes for pduside " + pduSide + " and port " + port)
                                    success++;
                                    if (success == powerConnections.length) {
                                        console.log("Returning successfully")
                                        callback(null)
                                    }
                                }

                            }, assetID)

                        }

                        else if (numPowerPorts != null && allOrNothingCount === 1) {

                            if(numPowerPorts > 0){
                                callback("To make power connections for this model " + model + ", you need to make " + numPowerPorts + " connections.")

                            }
                            else{
                                //the model has 0 powerPorts on it
                                callback("Cannot make power connections. The model " + model + " has " + numPowerPorts + " power ports.")

                            }

                        }

                    } else {

                        callback("To make a power connection, please enter a valid port number. Valid port numbers range from 1 to 24.")

                    }

                }).catch(function (error) { console.log("Could not find the model: " + error) })


            }
            else {
                callback("To make a power connection, must fill out all fields.")

            }


        }
    }

}

function getFirstFreePort(rack, datacenter, callback) { //only expecting at most 2 ports
    console.log(rack)
    let splitRackArray = rack.split(/(\d+)/).filter(Boolean)
    let rackRow = splitRackArray[0]
    let rackNum = parseInt(splitRackArray[1])

    let freeLeft = []
    let freeRight = []
    let occupiedLeft = []
    let occupiedRight = []
    let allPorts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]
    //ASSUMING THAT PDUs ONLY HAVE PORTS UP TO 24
    let returnPort = -1
    let rackPowerConns;

    try {
        datacenterutils.getDataFromName(datacenter, (id, abbrev) => {
            if (rackRow.trim() !== "" && rackNum.trim !== "" && datacenter.trim() !== "") {
                //console.log(rackRow, rackNum, id)

                racksRef.where("letter", "==", rackRow).where("number", "==", rackNum).where("datacenter", "==", id).get().then(function (querySnapshot) {

                    rackPowerConns = querySnapshot.docs[0].data().powerPorts ? querySnapshot.docs[0].data().powerPorts : [];

                    for (let i = 0; i < rackPowerConns.length; i++) {

                        if (rackPowerConns[i].pduSide === "Left") {
                            occupiedLeft.push(parseInt(rackPowerConns[i].port))
                            //console.log(occupiedLeft)
                        }
                        else {
                            occupiedRight.push(parseInt(rackPowerConns[i].port))
                        }
                    }
                    //Take the difference to find all the free ports available for each PDU side

                    freeLeft = allPorts.filter(x => !occupiedLeft.includes(x));
                    freeRight = allPorts.filter(x => !occupiedRight.includes(x));
                    // console.log(freeLeft)
                    // console.log(freeRight)

                    let firstFreeLeft;
                    let firstFreeRight;

                    let portLimit = 24
                    let count = 0
                    while (count <= portLimit) {
                        count++;
                        firstFreeLeft = Math.min(...freeLeft)
                        // console.log("Min port on the left: " + firstFreeLeft)
                        firstFreeRight = Math.min(...freeRight)

                        //Test this function some more by changing db values
                        //Add a 'no connection' button
                        if (firstFreeRight > firstFreeLeft) {
                            var indexLeft = freeLeft.indexOf(firstFreeLeft);
                            if (indexLeft !== -1) freeLeft.splice(indexLeft, 1);
                            //console.log("Should have min removed: " + freeLeft)
                        }
                        else if (firstFreeRight < firstFreeLeft) {

                            var indexRight = freeRight.indexOf(firstFreeRight);
                            if (indexRight !== -1) freeRight.splice(indexRight, 1);
                        }
                        else {
                            returnPort = firstFreeRight
                            break;
                        }
                    }
                    callback(returnPort)


                }).catch(error => console.log(error))



            }

        })


    }
    catch (error) {
        console.log(error)
        //return null;
        callback(null)
    }

}

function checkConflicts(inputDatacenter, inputRack, inputRackU, pduSide, port, callback, assetID = null) {
    //No 'double connections': no PDU has more than one power port associated with it: conflicts/availability

    if (parseInt(inputRackU) < 10) {
        inputRackU = "0" + inputRackU
    }

    datacenterutils.getDataFromName(inputDatacenter, (id, abbrev) => {

        let splitRackArray = inputRack.split(/(\d+)/).filter(Boolean)
        let rackRow = splitRackArray[0]
        let rackNum = parseInt(splitRackArray[1])

        racksRef.where("letter", "==", rackRow).where("number", "==", rackNum).where("datacenter", "==", id).get().then(function (rackConnectionsDoc) {
            console.log(rackConnectionsDoc.docs[0].data())
            let rackPowerConns = rackConnectionsDoc.docs[0].data().powerPorts ? rackConnectionsDoc.docs[0].data().powerPorts : [];
//            console.log(rackConnectionsDoc)
 //           console.log(rackPowerConns)

            if (rackPowerConns.length) {
                let count = 0;
                rackPowerConns.forEach(function (powerConn) {
                    console.log(assetID)
                    console.log(powerConn);
                    console.log(powerConn.pduSide, pduSide)
                    console.log(powerConn.port, port)
                    if (assetID && assetID != powerConn.assetID && powerConn.pduSide === pduSide && parseInt(powerConn.port) === parseInt(port)) {
                        callback("Trying to make a conflicting power connection at " + pduSide + " " + port)
                    } else if(!assetID && powerConn.pduSide === pduSide && parseInt(powerConn.port) === parseInt(port)){
                        callback("Trying to make a conflicting power connection at " + pduSide + " " + port)
                    }
                    else {
                        count++;
                        if (count === rackPowerConns.length) {
                            console.log("no conflicts found for power ports")
                            callback(null)
                        }
                    }
                })
            }
            else {
                //There are no occupied ports on the rack
                console.log("There are no occupied ports on the rack")
                callback(null)
            }

        }).catch(error => console.log(error))

    })

}


export {
    validatePowerConnections,
    checkConflicts,
    getFirstFreePort,

}