import React, { Component } from 'react'
import {FormTrash} from "grommet-icons"
import { Grommet, Box, Text, FormField, TextInput } from 'grommet'
import theme from "../theme";
import * as assetutils from '../utils/assetutils'


//Instead of validate connections, upon all fields for one set of inputs, have a toast that pops up with error message
//If the connection is not valid


export default class AssetNetworkPortsForm extends Component {

    constructor(props) {

        super(props);
        this.state = {}
        this.handleChange = this.handleChange.bind(this);
        this.handleSuggestion = this.handleSuggestion.bind(this);

    }
    //Form validation/error catching: ???

    handleChange(e, idx) {
        //You are either typing into an output
        if (e.target.name === "otherAssetID" || e.target.name === "otherPort" || e.target.name === "thisPort") {

            let networkConnections = [...this.props.networkConnections]
            const value = e.target.name === "otherAssetID" ? e.target.value.split(' ', 1).join(' ') : e.target.value
            networkConnections[idx][e.target.name] = value
            this.setState({ port: value })

            //or it's something already 'submitted'
        } else {
            this.setState({ [e.target.name]: e.target.value })
        }
    }

    handleSuggestion(e, idx) {
        //You are either typing into an output
        if (e.target.name === "otherAssetID" || e.target.name === "otherPort" || e.target.name === "thisPort") {

            let networkConnections = [...this.props.networkConnections]
            const suggestion = e.target.name === "otherAssetID" ? e.suggestion.split(' ', 1).join(' ') : e.suggestion
            networkConnections[idx][e.target.name] = suggestion
            this.setState({ port: suggestion })

            //or it's something already 'submitted'
        } else {
            this.setState({ [e.target.name]: e.suggestion })
        }
    }


    //TODO: Can have up to 48 network connections made. For each thing, collapse with labels 1, 2, .... within the accordion attop lvle
    render() {
        let { networkConnections } = this.props
        //console.log(networkConnections)
        return (
               // Object.keys(networkConnections).map((key, idx) => {
            //     console.log(networkConnections[key])
            networkConnections.map((val, idx) => {
                return (
                    <Grommet key={idx} theme={theme}>

                        <Box direction="column" gap="small" overflow="auto" background="light-2">

                            <Box direction="row" justify={"between"}>
                                <Text>{idx + 1}</Text>
                                <FormTrash
                                    style={{ cursor: 'pointer'}}
                                    margin={{left: "small"}}
                                    onClick={(e) => {
                                        
                                        this.props.deleteNetworkConnectionCallbackFromParent(e,idx)
                                    }} />
                            </Box>


                            {/* TODO: AUTOCOMPLETE/PICKLIST */}

                            <FormField
                                margin={{ horizontal: 'medium', vertical: 'xsmall' }}
                                size="small" name="thisPort" label="This Asset Port">
                                <TextInput name="thisPort"
                                    // value={this.props.networkConnections.port}

                                    size="small"

                                    //passing state up to AssetNetworkPortsForm
                                    onChange={e => {
                                        this.handleChange(e, idx)
                                        assetutils.getNetworkPorts(this.props.model, e.target.value, results => this.setState(oldState => ({
                                            ...oldState,
                                            networkPortSuggestions: results
                                        })))
                                    }}
                                    onSelect={e => {
                                        this.handleSuggestion(e, idx)
                                    }}
                                    value={this.props.networkConnections[idx]['thisPort']}
                                    suggestions={this.state.networkPortSuggestions}
                                    onClick={() => {
                                        assetutils.getNetworkPorts(this.props.model, this.props.networkConnections[idx]['thisPort'], results => this.setState(oldState => ({
                                            ...oldState,
                                            networkPortSuggestions: results
                                        })))
                                    }}
                                           required={"true"}

                                />

                            </FormField>

                            <Text weight="bold" margin="small" > Connect to </Text>

                            {/* TODO: AUTOCOMPLETE/PICKLIST */}
                            <FormField
                                margin={{ horizontal: 'medium', vertical: 'xsmall' }}
                                size="small" name="otherAssetID" label="Other Asset">
                                <TextInput name="otherAssetID"
                                    //value={this.props.networkConnections.port}

                                    size="small"

                                    onChange={e => {
                                        this.handleChange(e, idx)
                                        assetutils.getSuggestedAssetIds(this.props.datacenter, e.target.value, results => this.setState(oldState => ({
                                            ...oldState,
                                            assetIdSuggestions: results
                                        })), this.props.currentId ? this.props.currentId : '')
                                    }}
                                    onSelect={e => {
                                        this.handleSuggestion(e, idx)
                                    }}
                                    value={this.props.networkConnections[idx]['otherAssetID']}
                                    suggestions={this.state.assetIdSuggestions}
                                    onClick={() => {
                                        assetutils.getSuggestedAssetIds(this.props.datacenter, this.props.networkConnections[idx]['otherAssetID'], results => this.setState(oldState => ({
                                            ...oldState,
                                            assetIdSuggestions: results
                                        })), this.props.currentId ? this.props.currentId : '')
                                    }}
                                           required={"true"}
                                />
                            </FormField>

                            {/* TODO: AUTOCOMPLETE/PICKLIST */}
                            <FormField
                                margin={{ horizontal: 'medium', vertical: 'xsmall' }}
                                size="small" name="otherPort" label="Other Asset Port">
                                <TextInput name="otherPort"
                                    //value={this.props.networkConnections.port}

                                    size="small"

                                    onChange={e => {
                                        this.handleChange(e, idx)
                                        assetutils.getSuggestedOtherAssetPorts(this.props.networkConnections[idx]['otherAssetID'], e.target.value, results => this.setState(oldState => ({
                                            ...oldState,
                                            otherAssetPortSuggestions: results
                                        })))
                                    }}
                                    onSelect={e => {
                                        this.handleSuggestion(e, idx)
                                    }}
                                    value={this.props.networkConnections[idx]['otherPort']}
                                    suggestions={this.state.otherAssetPortSuggestions}
                                    onClick={() => {
                                        assetutils.getSuggestedOtherAssetPorts(this.props.networkConnections[idx]['otherAssetID'], this.props.networkConnections[idx]['otherPort'], results => this.setState(oldState => ({
                                            ...oldState,
                                            otherAssetPortSuggestions: results
                                        })))
                                    }}
                                           required={"true"}
                                />

                            </FormField>




                        </Box>

                    </Grommet >


                )
            })
        )
    }
}
