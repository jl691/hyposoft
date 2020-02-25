import { assetRef, racksRef, modelsRef, usersRef, firebase } from './firebaseutils'
import * as rackutils from './rackutils'
import * as modelutils from './modelutils'
import * as assetIDutils from './assetidutils'
import * as datacenterutils from './datacenterutils'



function getNetworkPortLabels(model, callback) {
    let modelNetworkPorts;

    modelsRef.where("modelName", "==", model).get().then(function (modelDoc) {
        if (!modelDoc.empty && modelDoc.docs[0].data().networkPorts != null) {
            modelNetworkPorts = modelDoc.docs[0].data().networkPorts
            callback(modelNetworkPorts);
        }
        else {
            callback(null)
        }

    }).catch(error => console.log(error))

}

//Puts the MAC address into canonical form: lower case and colon-delimited
function fixMACAddress(mac) {
    let noSepMac;
    if (mac.charAt(2) == "-") {
        noSepMac = mac.split("-").join("");

    } else if (mac.charAt(2) == "_") {
        noSepMac = mac.split("_").join("");
    }
    else if (mac.charAt(2) == ":") {
        noSepMac = mac.split(":").join("");
    }
    else {//if the admin put in a mac address with no separators
        noSepMac = mac;
    }

    let canonicalMAC = noSepMac.substr(0, 2).toLowerCase() + ":" + noSepMac.substr(2, 2).toLowerCase() + ":" + noSepMac.substr(4, 2).toLowerCase() + ":" + noSepMac.substr(6, 2).toLowerCase() + ":" + noSepMac.substr(8, 2).toLowerCase() + ":" + noSepMac.substr(10, 2).toLowerCase();
    console.log("Canonical MAC: " + canonicalMAC)
    return canonicalMAC;
}

//TODO: NEED TO FIX THIS SINCE IT USES STATE
//toLowercase, to colon
function handleMacAddressFixAndSet(addresses, callback) {
    let macAddresses = {};
    console.log(addresses)
    let count = 0;
    addresses.forEach(obj => {
        
        let address = obj.macAddress
        let port = obj.networkPort
        console.log(address)
        console.log(port)

        if (address && !/^([0-9A-Fa-f]{2}[-:\_]?){5}([0-9A-Fa-f]{2})$/.test(address)) {
            callback(null, "Invalid MAC address. Ensure it is a six-byte hexadecimal value with any byte separator punctuation.");
        }
        else {
            count++;
            let fixedMAC = "";
   

            if (address) {
                fixedMAC = this.fixMACAddress(address);
                let fixedObj = { networkPort: port, macAddress: fixedMAC }
                macAddresses[port]=fixedMAC
            }

            console.log("MAC address passed to database: " + fixedMAC)
            if (count === addresses.length) {
                callback(macAddresses)
            }


        }



    })



}


export {
    getNetworkPortLabels,
    fixMACAddress,
    handleMacAddressFixAndSet,

}