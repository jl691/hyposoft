import React from "react";
import {Box, Button, Grommet, Heading, Layer, Text} from "grommet";
import {Checkmark, Close, Trash} from "grommet-icons";
import {ToastsContainer, ToastsStore} from "react-toasts";
import * as changeplanutils from "../utils/changeplanutils";

class ExecuteChangePlanForm extends React.Component {

    render() {
        return (
            <React.Fragment>
                <Layer onEsc={() => this.props.cancelPopup(true)}
                       onClickOutside={() => this.props.cancelPopup(true)}>
                    <Box pad="medium" align="center">
                        <Heading level="3" margin="none">Execute Change Plan</Heading>
                        <Text>Are you sure you want to execute change plan {this.props.name}?
                            This can't be reversed.</Text>
                        <Box direction="row">
                            <Button label="Execute" icon={<Checkmark/>} onClick={() => {
                                changeplanutils.executeChangePlan(this.props.id, result => {
                                    if(result){
                                        this.props.successfulExecution();
                                    } else {
                                        ToastsStore.error("Error executing change plan - please try again later.")
                                    }
                                })
                            }}/>
                            <Button label="Cancel" icon={<Close/>}
                                    onClick={() => this.props.cancelPopup(true)}/>
                        </Box>
                    </Box>
                </Layer>
                <ToastsContainer store={ToastsStore}/>
            </React.Fragment>
        )
    }
}

export default ExecuteChangePlanForm