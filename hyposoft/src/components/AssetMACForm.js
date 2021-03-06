import React, { Component } from 'react'
import { Grommet, Box, Text, FormField, TextInput } from 'grommet'
import * as assetmacutils from '../utils/assetmacutils'
import * as modelutils from '../utils/modelutils'
import theme from "../theme";

//Instead of validate connections, upon all fields for one set of inputs, have a toast that pops up with error message
//If the connection is not valid


export default class AssetMACForm extends Component {
    state = {
      macTextFields: [],
      initialLoaded: false,
      model: this.props.popupMode === "Update" ? this.props.model : ""
    }


    constructor(props) {

        super(props);

        this.handleChange = this.handleChange.bind(this);
        // this.createForm = this.createForm.bind(this);
        //This was an anonymous function, but this.setState was not working. Give name to anon function, move out of the method it was in (so it gets a class scope) and htne bind
        this.createForm = this.createForm.bind(this);
        this.createFormCallback = this.createFormCallback.bind(this);


    }

    //Form validation/error catching: ???

    //Need to handle change: pass state back up
    handleChange(e, idx) {
        //You are either typing into an output
        if (e.target.name === "macAddress") {
           // console.log("tryna do this shit")

            let macAddresses = [...this.props.macAddresses]
            macAddresses[idx][e.target.name] = e.target.value
            // this.setState({ macAddress: e.target.value })
            // //or it's something already 'submitted'
            //this.props.fieldCallback(this.state.macTextFields)
            console.log(macAddresses);
            var status = []
            for (var index in macAddresses) {
              status.push(macAddresses[index]['networkPort'])
            }
            this.createFormCallback(status)

        } else {
            this.setState({ [e.target.name]: e.target.value })
        }
    }

    createFormCallback(status) {

        //create a bunch of new macAddress objects {}
/*        if (this.props.macAddresses.length === 0 || this.props.macAddresses.length < status.length) {
          var index = this.props.macAddresses.length
          status.forEach(() => {
            this.props.macAddresses.push({networkPort: status[index].trim(),macAddress: ""})
            index++
          });
        }
        */
        while(this.props.macAddresses.length !== status.length){
            let index = this.props.macAddresses.length;
            this.props.macAddresses.push({networkPort: status[index].trim(),macAddress: ""})
            index++
        }

        const fields = status.map((port, idx) => (

            // TODO Masked input grommet component
            <FormField
                margin={{ horizontal: 'medium', vertical: 'xsmall' }}
                size="small" name="macAddress" label={`Network Port Name: ${port}`} >
                <TextInput name="macAddress"
                    value={this.props.macAddresses[idx]["macAddress"]}
                    size="small"

                    onChange={e => {
                        this.handleChange(e, idx)
                    }}
                />
            </FormField >
        ));
        console.log(fields);
        this.setState(oldState => ({macTextFields: fields, initialLoaded: true}))
        // console.log(this.props.macAddresses);
        // return fields
        //console.log(this.props.macAddresses);

        // this.setState(oldState => ({
        //     macTextFields: fields
        // }))
        //this.props.fieldCallback(fields)
    }

    createForm(model) {
        assetmacutils.getNetworkPortLabels(this.props.model, status => {
            console.log(status)
          this.createFormCallback(status)
        })
    }

    render() {
        //let { macAddresses } = this.props.macAddresses
        //console.log(this.props.macAddresses)


        //this.createForm(this.props.model)
        // console.log(this.props);
        // console.log(this.state.model)
        if (this.props.model !== this.state.model) {

          this.props.macAddresses.length = 0
          this.state.initialLoaded = false
          this.state.model = this.props.model

        }
        if (!this.state.initialLoaded && this.props.macAddresses && this.state.model) {
            console.log(this.state.model)
            console.log(this.props.macAddresses)
            this.createForm(this.state.model)
            return (
                <Text>Please select valid model</Text>
            )
        }
            return (

                <Grommet theme={theme}>

                    <Box direction="column" gap="small" overflow="auto" background="light-2">


                    {this.state.macTextFields}

                    </Box>

                </Grommet >


            )
    }
}
