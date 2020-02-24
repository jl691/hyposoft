import * as firebaseutils from './firebaseutils'

function validateImportedConnections (data, callback) {
    var fetchedAssets = {}
    var fetchedAssetsCount = 0
    var errors = []
    var toBeAdded = []
    var toBeIgnored = []
    var toBeModified = []

    function postValidation() {
        fetchedAssetsCount ++
        if (fetchedAssetsCount < data.length*2)
            return
        for (var i = 0; i < data.length; i++) {
            var datum = data[i]
            if (!fetchedAssets[datum.src_hostname]) {
                errors = [...errors, [i+1, 'No asset with provided source hostname found']]
            } else if (!(datum.src_port in fetchedAssets[datum.src_hostname].networkConnections)) {
                errors = [...errors, [i+1, 'No asset with provided source port found']]
            }

            if (datum.dest_hostname) {
                if (!fetchedAssets[datum.dest_hostname]) {
                    errors = [...errors, [i+1, 'No asset with provided destination hostname found']]
                } else if (!(datum.dest_port in fetchedAssets[datum.dest_hostname].networkConnections)) {
                    errors = [...errors, [i+1, 'No asset with provided destination port found']]
                }
            }

            if (datum.src_mac && !/^([0-9a-fA-F]{2}[\W_]*){5}([0-9a-fA-F]{2})$/.test(datum.src_mac)) {
                errors = [...errors, [i+1, 'Bad MAC address']]
            } else {
                datum.src_mac = datum.src_mac.replace((/[\W_]/g), "").toLowerCase().replace(/(.{2})(?!$)/g,"$1:")
            }

            if (errors.length === 0) {
                // NOTE: This means the three arrays are accurate only if there are no errors
                const datumAssetId = (fetchedAssets[datum.dest_hostname] ? fetchedAssets[datum.dest_hostname].id : null)
                if ((datumAssetId === null && fetchedAssets[datum.src_hostname].networkConnections[datum.src_port] === null) ||
                    (fetchedAssets[datum.src_hostname].networkConnections[datum.src_port] && fetchedAssets[datum.src_hostname].networkConnections[datum.src_port].otherAssetId === datumAssetId)) {
                    // TODO: Confirm w Janice that the entire object is null and not just otherAssetId
                    if (fetchedAssets[datum.src_hostname].networkConnections[datum.src_port].otherPort === datum.dest_port) {
                        if (fetchedAssets[datum.src_hostname].macAddresses[datum.src_port] === datum.src_mac) {
                            toBeIgnored.push(datum)
                            continue
                        }
                    }
                }

                if ((datumAssetId !== null && fetchedAssets[datum.src_hostname].networkConnections[datum.src_port] === null)) {
                    // Added as in new connection
                    // Always update MAC addresses anyway
                    toBeAdded.push(datum)
                    continue
                }

                toBeModified.push(datum)
            }
        }

        callback({ errors, toBeIgnored, toBeModified, toBeAdded, fetchedAssets })

    }

    for (var i = 0; i < data.length; i++) {
        var datum = data[i]
        datum.rowNumber = i+1
        if (!datum.src_hostname.trim()) {
            errors = [...errors, [i+1, 'Source hostname required']]
        }

        if (!datum.src_port.trim()) {
            errors = [...errors, [i+1, 'Source port required']]
        }

        firebaseutils.assetRef.where('hostname', '==', datum.src_hostname).get().then(qs => {
            if (qs.empty) {
                fetchedAssets[datum.src_hostname] = null
            } else {
                fetchedAssets[datum.src_hostname] = {...qs.docs[0].data(), id: qs.docs[0].id}
            }
            postValidation()
        })

        if (datum.dest_hostname.trim()) {
            firebaseutils.assetRef.where('hostname', '==', datum.dest_hostname).get().then(qs => {
                if (qs.empty) {
                    fetchedAssets[datum.dest_hostname] = null
                } else {
                    fetchedAssets[datum.dest_hostname] = {...qs.docs[0].data(), id: qs.docs[0].id}
                }
                postValidation()
            })
            if (!datum.dest_port.trim()) {
                errors = [...errors, [i+1, 'Destination port is required if destination hostname is specified']]
            }
        } else {
            if (datum.dest_port.trim()) {
                errors = [...errors, [i+1, 'Destination port should be blank if destination hostname is']]
            }
            postValidation()
        }
    }
}

function addConnections (data, fetchedAssets, callback) {
    for (var i = 0; i < data.length; i++) {
        const datum = data[i]

        // First remove connection from old destination
        if (fetchedAssets[datum.src_hostname].networkConnections[datum.src_port]) {
            const oldDestinationId = fetchedAssets[datum.src_hostname].networkConnections[datum.src_port].otherAssetId
            const oldDestinationPort = fetchedAssets[datum.src_hostname].networkConnections[datum.src_port].otherPort
            firebaseutils.assetRef.doc(oldDestinationId).update({
                ["networkConnections."+oldDestinationPort]: null
            })
        }

        if (datum.dest_hostname) {
            // This means: modify or add

            // Now add new connection to source
            const newMacAddress = (datum.src_mac ? datum.src_mac : fetchedAssets[datum.src_hostname].macAddresses[datum.src_port])
            firebaseutils.assetRef.doc(fetchedAssets[datum.src_hostname].id).update({
                ["networkConnections."+datum.src_port+".otherAssetId"]: fetchedAssets[datum.dest_hostname].id,
                ["networkConnections."+datum.src_port+".otherPort"]: datum.dest_port,
                ["macAddresses."+datum.src_port]: newMacAddress
            })

            // Lastly add new connection to new destination
            firebaseutils.assetRef.doc(fetchedAssets[datum.dest_hostname].id).update({
                ["networkConnections."+datum.dest_port+".otherAssetId"]: fetchedAssets[datum.src_hostname].id,
                ["networkConnections."+datum.dest_port+".otherPort"]: datum.src_port
            })

        } else {
            // This means: delete

            // Now delete connection from source
            const newMacAddress = (datum.src_mac ? datum.src_mac : fetchedAssets[datum.src_hostname].macAddresses[datum.src_port])
            firebaseutils.assetRef.doc(fetchedAssets[datum.src_hostname].id).update({
                ["networkConnections."+datum.src_port]: null,
                ["macAddresses."+datum.src_port]: newMacAddress
            })
        }

        callback()
    }
}

export { validateImportedConnections, addConnections }