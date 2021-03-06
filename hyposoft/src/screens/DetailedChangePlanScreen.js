import React from "react";
import * as changeplanutils from "../utils/changeplanutils";
import * as userutils from "../utils/userutils";
import * as decommissionutils from "../utils/decommissionutils";
import * as firebaseutils from "../utils/firebaseutils";
import { Box, Button, Grommet, Heading, Text, DataTable, Layer } from "grommet";
import theme from "../theme";
import AppBar from "../components/AppBar";
import HomeButton from "../components/HomeButton";
import UserMenu from "../components/UserMenu";
import { ToastsContainer, ToastsStore } from "react-toasts";
import { Add, Checkmark, Close, Edit, Print, Trash } from "grommet-icons";
import { Redirect } from "react-router-dom";
import BackButton from "../components/BackButton";
import DeleteChangePlanForm from "../components/DeleteChangePlanForm";
import DeleteChangeForm from "../components/DeleteChangeForm";
import ExecuteChangePlanForm from "../components/ExecuteChangePlanForm";
import EditDecommissionChangeForm from "../components/EditDecommissionChangeForm"; 
import EditAssetForm from "../components/EditAssetForm";
import * as assetmacutils from "../utils/assetmacutils";
import * as assetnetworkportutils from "../utils/assetnetworkportutils";
import AddAssetForm from "../components/AddAssetForm";


import * as changeplanconflictutils from '../utils/changeplanconflictutils'
import * as assetutils from '../utils/assetutils'
import MoveAssetForm from "../components/MoveAssetForm";

class DetailedChangePlanScreen extends React.Component {

    startAfter = null;
    changePlanID;
    hasConflicts = false;
    errMessage = "This change plan has conflicts in steps "
    generateConflictCount = 0;

    constructor(props) {
        super(props);
        this.state = {
            changes: [],
            initialLoaded: false,
            popupType: "",
            name: "",
            assetsLoaded: false
        }

        this.componentDidMount = this.componentDidMount.bind(this);
    }

    componentDidMount() {
        this.changePlanID = this.props.match.params.changePlanID;
        //this.generateConflict(this.props.match.params.changePlanID, done => {
            firebaseutils.changeplansRef.doc(this.changePlanID).get().then(documentSnapshot => {

                if (documentSnapshot.exists) {
                    this.setState({
                        name: documentSnapshot.data().name,
                        executed: documentSnapshot.data().executed,
                        timestamp: documentSnapshot.data().timestamp
                    })
                }
            });

      //  })

        this.forceRefresh()
    }

    forceRefresh() {
        this.startAfter = null;
        this.hasConflicts=false;
        this.setState({
            changes: [],
            initialLoaded: false,
            popupType: "",
        });
        this.generateConflict(this.props.match.params.changePlanID, done => {

            changeplanutils.getChanges(this.props.match.params.changePlanID, userutils.getLoggedInUserUsername(), (newStart, changes, empty) => {
                if (empty) {
                    this.setState({
                        initialLoaded: true
                    });
                } else if (newStart) {
                    this.startAfter = newStart;
                    this.setState({
                        changes: changes,
                        initialLoaded: true
                    });
                }
            });
        })
    }

    cancelPopup = (data) => {
        this.setState({
            popupType: ""
        })
    };

    callbackFunction = (data) => {
        //console.log("BITCCCCHHH")
        this.forceRefresh();
    };

    AdminTools() {
        if (userutils.isLoggedInUserAdmin() || userutils.doesLoggedInUserHaveAnyAssetPermsAtAll()) {
            if (!this.state.executed) {

                return (
                    <Box
                        width='medium'
                        align='center'
                        margin={{ left: 'medium', right: 'medium' }}
                        justify='start'>
                        <Box style={{
                            borderRadius: 10,
                            borderColor: '#EDEDED'
                        }}
                            direction='row'
                            alignSelf='stretch'
                            background='#FFFFFF'
                            width={'medium'}
                            margin={{ top: 'medium', left: 'medium', right: 'medium' }}
                            pad='small'>
                            <Box flex
                                margin={{ left: 'medium', top: 'small', bottom: 'small', right: 'medium' }}
                                direction='column' justify='start'>
                                <Heading level='4' margin='none'>Add change</Heading>
                                <p>Add a new change.</p>
                                <Box direction='column' flex alignSelf='stretch'>
                                    <Button primary icon={<Add />} label="Add" onClick={() => {
                                        this.props.history.push('/changeplans/' + this.changePlanID + '/add')
                                    }} />
                                </Box>
                            </Box>
                        </Box>
                        <Box style={{
                            borderRadius: 10,
                            borderColor: '#EDEDED'
                        }}
                            direction='row'
                            alignSelf='stretch'
                            background='#FFFFFF'
                            width={'medium'}
                            margin={{ top: 'medium', left: 'medium', right: 'medium' }}
                            pad='small'>
                            <Box flex
                                margin={{ left: 'medium', top: 'small', bottom: 'small', right: 'medium' }}
                                direction='column' justify='start'>
                                <Heading level='4' margin='none'>Execute change plan</Heading>
                                <p>Execute this change plan.</p>
                                <Box direction='column' flex alignSelf='stretch'>
                                    <Button primary icon={<Checkmark />} label="Execute" onClick={() => {
                                        this.setState({ popupType: "Execute" })
                                    }} />
                                </Box>
                            </Box>
                        </Box>
                        <Box style={{
                            borderRadius: 10,
                            borderColor: '#EDEDED'
                        }}
                            direction='row'
                            alignSelf='stretch'
                            background='#FFFFFF'
                            width={'medium'}
                            margin={{ top: 'medium', left: 'medium', right: 'medium' }}
                            pad='small'>
                            <Box flex
                                margin={{ left: 'medium', top: 'small', bottom: 'small', right: 'medium' }}
                                direction='column' justify='start'>
                                <Heading level='4' margin='none'>Work order</Heading>
                                <p>Generate a work order for this change plan.</p>
                                <Box direction='column' flex alignSelf='stretch'>
                                    <Button primary icon={<Print />} label="Generate" onClick={() => {
                                        this.props.history.push('/changeplans/' + this.changePlanID + '/workorder')
                                    }} />
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                );
            } else {

                return (
                    <Box
                        width='medium'
                        align='center'
                        margin={{ left: 'medium', right: 'medium' }}
                        justify='start'>
                        <Box style={{
                            borderRadius: 10,
                            borderColor: '#EDEDED'
                        }}
                            direction='row'
                            alignSelf='stretch'
                            background='#FFFFFF'
                            width={'medium'}
                            margin={{ top: 'medium', left: 'medium', right: 'medium' }}
                            pad='small'>
                            <Box flex
                                margin={{ left: 'medium', top: 'small', bottom: 'small', right: 'medium' }}
                                direction='column' justify='start'>
                                <Heading level='4' margin='none'>Work order</Heading>
                                <p>Generate a work order for this change plan.</p>
                                <Box direction='column' flex alignSelf='stretch'>
                                    <Button primary icon={<Print />} label="Generate" onClick={() => {


                                        this.props.history.push('/changeplans/' + this.changePlanID + '/workorder')




                                    }} />
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                )
            }
        }
    }

    DataTable() {
        if (!this.state.initialLoaded) {
            return (
                <Text>Please wait...</Text>
            )
        } else {
            return (
                <DataTable step={25}

                    onMore={() => {
                        if (this.startAfter) {
                            changeplanutils.getChanges(this.changePlanID, userutils.getLoggedInUserUsername(), (newStart, changes, empty) => {
                                if (!empty && newStart) {
                                    this.startAfter = newStart;
                                    this.setState({
                                        changes: this.state.changes.concat(changes),
                                    });
                                }
                            }, this.startAfter);
                        }
                    }}
                    onClickRow={({ datum }) => {
                        this.props.history.push('/changeplans/' + this.changePlanID + '/' + datum.id)
                        //console.log(datum)
                        changeplanconflictutils.checkLiveDBConflicts(this.state.executed, this.props.match.params.changePlanID, datum.id, status => {
                            console.log("Done with live db checks for change plan conflicts. Add")
                        })
                    }}
                    columns={this.generateColumns()} data={this.state.changes} size={"large"} />
            )
        }
    }

    generateColumns() {
        let cols = [
            {
                property: "step",
                header: <Text size={"small"}>Step</Text>,
                primary: true,
                render: datum => (<Text size={"small"}>{datum.id}</Text>)
            },
            {
                property: "assetID",
                header: <Text size='small'>Asset ID</Text>,
                render: datum => (
                    <Text size='small'>{datum.assetID ? datum.assetID : "TBD"}</Text>)
            },
            {
                property: "change",
                header: <Text size='small'>Change</Text>,
                render: datum => (
                    <Text size='small'>{datum.change}</Text>)
            }
        ];
        if (userutils.isLoggedInUserAdmin() || userutils.doesLoggedInUserHaveAnyAssetPermsAtAll()) {
            cols.push({
                property: "edit",
                header: <Text size='small'>Edit</Text>,
                render: datum => (
                    !this.state.executed && <Edit onClick={(e) => {
                        e.persist();
                        e.nativeEvent.stopImmediatePropagation();
                        e.stopPropagation();
                        if (datum.change === "edit") {
                            changeplanutils.getMergedAssetAndChange(this.changePlanID, datum.id, mergedAsset => {
                                if (mergedAsset) {
                                    this.setState({
                                        popupType: "Edit" + datum.change,
                                        stepID: datum.id,
                                        currentChange: mergedAsset
                                    });
                                }
                            });
                        } else if (datum.change === "add") {
                            changeplanutils.getAssetFromAddAsset(this.changePlanID, datum.id, asset => {
                                if (asset) {
                                    this.setState({
                                        popupType: "Edit" + datum.change,
                                        stepID: datum.id,
                                        currentChange: asset
                                    });
                                }
                            })
                        } else if (datum.change === "decommission") {
                            this.setState({
                                popupType: "Edit" + datum.change,
                                stepID: datum.id,
                            });
                        } else if (datum.change === "move") {
                            assetutils.getAssetDetails(datum.assetID, assetDetails => {
                                console.log(assetDetails)
                                if(assetDetails){
                                    this.setState({
                                        popupType: "Edit" + datum.change,
                                        stepID: datum.id,
                                        currentChange: assetDetails,
                                        location: datum.location.toString(),
                                        changeDetails: datum
                                    });
                                }
                            }, datum.location === "offline" ?  true : null)
                        }

                    }} />)
            },
                {
                    property: "delete",
                    header: <Text size='small'>Delete</Text>,
                    render: datum => (
                        !this.state.executed && <Trash onClick={(e) => {
                            e.persist();
                            e.nativeEvent.stopImmediatePropagation();
                            e.stopPropagation();
                            this.setState({
                                deleteStepNumber: datum.id,
                                popupType: "Delete"
                            })
                        }} />)
                })
        }
        return cols;
    }

    cancelPopup = (data) => {
        this.setState({
            popupType: ""
        })
    }

    successfulExecution = (data) => {
        this.setState({
            popupType: ""
        });
        ToastsStore.success("Successfully executed the change plan.")
    }

    successfulEdit = (data) => {
        this.setState({
            popupType: ""
        });
        this.forceRefresh();
        ToastsStore.success(data);
    }


    generateConflict(changePlanID, callback) {
        // this.generateConflictCount++
        // if (this.generateConflictCount === 1) {
        let count = 0;
        changeplanconflictutils.changePlanHasConflicts(changePlanID, conflicts => {
            let conflictsArray = [...conflicts]

            if (conflictsArray.length) {
                console.log(...conflictsArray)

                for (let i = 0; i < conflictsArray.length; i++) {

                    if (i === conflictsArray.length - 1) {

                        //last conflicting step, don't want to have a , at the end
                        this.errMessage = this.errMessage + conflictsArray[i] + "."
                        count++
                        if (count === conflictsArray.length) {
                            this.hasConflicts = true;
                            let errMessage = this.errMessage
                            callback(errMessage)

                        }
                    }
                    else {

                        this.errMessage = this.errMessage + conflictsArray[i] + ", "
                        count++
                        if (count === conflictsArray.length) {
                            this.hasConflicts = true;
                            callback(this.errMessage)

                        }
                    }
                }

                // this.forceRefresh()
                //this.hasConflicts = true;

            }
            else {
                callback()
            }
        })


        //   }


        // if (this.hasConflicts) {
        //     console.log(this.errMessage)
        //     return (
        //         <Box style={{
        //             borderRadius: 10
        //         }} width={"xlarge"} background={"status-error"} align={"center"} alignSelf={"center"} justify={"center"}
        //             margin={{ top: "medium" }} overflow="auto" direction="column" pad={"small"}>
        //             <Heading level={"3"} margin={"small"}>Conflict</Heading>
        //             <Box overflow="auto">
        //                 <Text weight="bold"> {this.errMessage}</Text>
        //             </Box>
        //         </Box>

        //     )
        // }
    }

    render() {
        if (!userutils.isUserLoggedIn()) {
            return <Redirect to='/' />
        }

        const { popupType } = this.state;
        let popup;

        if (popupType === 'Delete') {
            popup = (
                <DeleteChangeForm cancelPopup={this.cancelPopup} forceRefresh={this.callbackFunction} genConflict={this.generateConflict}
                    changePlanID={this.changePlanID} stepNumber={this.state.deleteStepNumber} />
            )
        } else if (popupType === 'Execute') {
            console.log(this.changePlanID)
            popup = (
                <ExecuteChangePlanForm cancelPopup={this.cancelPopup} successfulExecution={this.successfulExecution}
                    id={this.changePlanID} name={this.state.name} changePlanID={this.changePlanID} />
            )
        } else if (popupType === 'Editdecommission') {
            console.log(this.changePlanID)
            popup = (
                <EditDecommissionChangeForm cancelPopup={this.cancelPopup} stepID={this.state.stepID}
                    changePlanID={this.changePlanID} successfulEdit={this.successfulEdit} />
            )
        } else if (popupType === 'Editedit') {
            console.log(this.state.currentChange)
            popup = (
                <Layer height="small" width="medium" onEsc={() => this.setState({ popupType: undefined })}
                    onClickOutside={() => this.setState({ popupType: undefined })}>

                    <EditAssetForm
                        parentCallback={this.cancelPopup}
                        cancelCallback={this.cancelPopup}
                        changePlanID={this.changePlanID}
                        popupMode={'Update'}
                        changeDocID={this.state.currentChange.changeDocID}
                        updateModelFromParent={this.state.currentChange.model}
                        updateHostnameFromParent={this.state.currentChange.hostname}
                        updateRackFromParent={this.state.currentChange.rack}
                        updateRackUFromParent={this.state.currentChange.rackU}
                        updateOwnerFromParent={this.state.currentChange.owner}
                        updateCommentFromParent={this.state.currentChange.comment}
                        updateDatacenterFromParent={this.state.currentChange.datacenter}
                        updateAssetIDFromParent={this.state.currentChange.assetId}
                        updateMacAddressesFromParent={assetmacutils.unfixMacAddressesForMACForm(this.state.currentChange.macAddresses)}
                        updatePowerConnectionsFromParent={this.state.currentChange.powerConnections}
                        updateNetworkConnectionsFromParent={assetnetworkportutils.networkConnectionsToArray(this.state.currentChange.networkConnections)}

                        chassisHostname={this.state.currentChange.chassisHostname ? this.state.currentChange.chassisHostname : null}
                        chassisSlot={this.state.currentChange.chassisSlot ? this.state.currentChange.chassisSlot : null}

                        updateDisplayColorFromParent={this.state.currentChange.variances.displayColor}
                        updateCpuFromParent={this.state.currentChange.variances.cpu}
                        updateMemoryFromParent={this.state.currentChange.variances.memory}
                        updateStorageFromParent={this.state.currentChange.variances.storage}
                        
                    />
                </Layer>
            )
        } else if (popupType === 'Editadd') {
            console.log(this.state.currentChange)
            console.log(this.state.currentChange.macAddresses, this.state.currentChange, assetmacutils.unfixMacAddressesForMACForm(this.state.currentChange.macAddresses))
            popup = (
                <Layer height="small" width="medium" onEsc={() => this.setState({ popupType: undefined })}
                    onClickOutside={() => this.setState({ popupType: undefined })}>

                    <AddAssetForm
                        parentCallback={this.cancelPopup}
                        cancelCallback={this.cancelPopup}
                        changePlanID={this.changePlanID}
                        popupMode={"Update"}
                        changeDocID={this.state.currentChange.changeDocID}
                        updateMacAddressesFromParent={assetmacutils.unfixMacAddressesForMACForm(this.state.currentChange.macAddresses)}
                        updatePowerConnectionsFromParent={this.state.currentChange.powerConnections}
                        updateNetworkConnectionsFromParent={assetnetworkportutils.networkConnectionsToArray(this.state.currentChange.networkConnections)}

                        updateModelFromParent={this.state.currentChange.model}
                        updateHostnameFromParent={this.state.currentChange.hostname}
                        updateRackFromParent={this.state.currentChange.rack}
                        updateRackUFromParent={this.state.currentChange.rackU}
                        updateOwnerFromParent={this.state.currentChange.owner}
                        updateCommentFromParent={this.state.currentChange.comment}
                        updateDatacenterFromParent={this.state.currentChange.datacenter}
                        updateAssetIDFromParent={this.state.currentChange.assetId ? this.state.currentChange.assetId : ""}

                        updateDisplayColorFromParent={this.state.currentChange.variances.displayColor}
                        updateCpuFromParent={this.state.currentChange.variances.cpu}
                        updateMemoryFromParent={this.state.currentChange.variances.memory}
                        updateStorageFromParent={this.state.currentChange.variances.storage}
                    />
                </Layer>
            )
        } else if (popupType === 'Editmove') {
            console.log(this.changePlanID)
            popup = (
                <Layer height="small" width="medium" onEsc={() => this.setState({ popupType: undefined })}
                       onClickOutside={() => this.setState({ popupType: undefined })}>
                <MoveAssetForm
                    success={this.cancelPopup}
                    cancelCallback={this.cancelPopup}
                    changePlanID={this.changePlanID}
                    assetID={this.state.currentChange.assetId}
                    model={this.state.currentChange.model}
                    location={this.state.location}
                    editStorageSite={this.state.changeDetails.location === "rack" ? this.state.changeDetails.changes.datacenter["new"] : null}
                    editDatacenter={this.state.changeDetails.location === "offline" ? this.state.changeDetails.changes.datacenter["new"] : null}
                    editRack={this.state.changeDetails.location === "offline" ? this.state.changeDetails.changes.rack["new"] : null}
                    editRackU={this.state.changeDetails.location === "offline" ? this.state.changeDetails.changes.rackU["new"] : null}
                    stepID={this.state.changeDetails.step}
                    currentLocation={this.state.location === "offline" ? "offline storage site " + this.state.currentChange.datacenter : "datacenter " + this.state.currentChange.datacenter + " on rack " + this.state.currentChange.rack + " at height " + this.state.currentChange.rackU}
                />
                </Layer>
            )
        }

        return (
            <Grommet theme={theme} full className='fade'>
                <Box fill background='light-2'>
                    <AppBar>
                        <BackButton alignSelf='start' this={this} />
                        <Heading alignSelf='center' level='4' margin={{
                            top: 'none', bottom: 'none', left: 'xlarge', right: 'none'
                        }}>Change Plan: {this.state.name}</Heading>
                        <UserMenu alignSelf='end' this={this} />
                    </AppBar>
                    <Box direction='row'
                        justify='center'
                        wrap={true}>
                        {this.state.executed && <Box style={{
                            borderRadius: 10
                        }} width={"large"} background={"status-ok"} align={"center"} alignSelf={"center"}
                            margin={{ top: "medium" }}>
                            <Heading level={"3"} margin={"small"}>Change Plan Executed</Heading>
                            <Box>This change plan was executed on {decommissionutils.getDate(this.state.timestamp)}. Thus, no further changes can be made.</Box>
                        </Box>}
                        {/* {this.generateConflict()} */}
                        {
                            this.hasConflicts &&
                            <Box style={{
                                borderRadius: 10
                            }} width={"xlarge"} background={"status-error"} align={"center"} alignSelf={"center"} justify={"center"}
                                margin={{ top: "medium" }} overflow="auto" direction="column" pad={"small"}>
                                <Heading level={"3"} margin={"small"}>Conflict</Heading>
                                <Box overflow="auto">
                                    <Text weight="bold"> {this.errMessage}</Text>
                                </Box>
                            </Box>
                        }
                        <Box direction='row' justify='center' overflow={{ horizontal: 'hidden' }}>
                            <Box direction='row' justify='center'>
                                <Box width='large' direction='column' align='stretch' justify='start'>
                                    <Box style={{
                                        borderRadius: 10,
                                        borderColor: '#EDEDED'
                                    }}
                                        id='containerBox'
                                        direction='row'
                                        background='#FFFFFF'
                                        margin={{ top: 'medium', bottom: 'medium' }}
                                        flex={{
                                            grow: 0,
                                            shrink: 0
                                        }}
                                        pad='small'>
                                        <Box margin={{ left: 'medium', top: 'small', bottom: 'small', right: 'medium' }}
                                            direction='column'
                                            justify='start' alignSelf='stretch' height={"810px"} flex>
                                            <Box align="center">

                                                {this.DataTable()}

                                            </Box>
                                        </Box>
                                    </Box>
                                </Box>
                                {this.AdminTools()}
                            </Box>
                        </Box>
                    </Box>
                </Box>
                {popup}
                <ToastsContainer store={ToastsStore} />
            </Grommet>
        )
    }

}

export default DetailedChangePlanScreen