import React from "react";
import {Box, Button, Grid, Grommet, Heading} from "grommet";
import SingleRackElevationNative from "./SingleRackElevationNative";
import SingleRackElevation from "./SingleRackElevation";
import * as jsPDF from 'jspdf';
import * as rackutils from "../utils/rackutils";
import theme from "../theme";
import UserMenu from "./UserMenu";
import AppBar from "./AppBar";
import {ToastsContainer, ToastsStore} from "react-toasts";
import BackButton from "./BackButton";
import * as datacenterutils from "../utils/datacenterutils";

var doc, count, totalRacks;
var images = new Map();

class RackElevations extends React.Component {

    constructor(props) {
        super(props);
        let startRow = this.props.location.state.startRow;
        let endRow = this.props.location.state.endRow;
        let startNumber = parseInt(this.props.location.state.startNumber);
        let endNumber = parseInt(this.props.location.state.endNumber);

        let rowStartNumber = startRow.charCodeAt(0);
        let rowEndNumber = endRow.charCodeAt(0);


        let items = []


        if (items.length === 0) {
            for (let i = rowStartNumber; i <= rowEndNumber; i++) {
                let currLetter = String.fromCharCode(i);
                for (let j = parseInt(startNumber); j <= parseInt(endNumber); j++) {
                    items.push(<Box align={"center"}><SingleRackElevationNative small letter={currLetter} number={j} /></Box>);
                }
            }
        }
        this.state = {
            racks: items,
            rackTitles: {}
        };
    }

    componentDidMount() {
        console.log("the datacenter is " + this.props.location.state.datacenter)
        if(this.props.location.state && this.props.location.state.startRow && this.props.location.state.endRow && this.props.location.state.startNumber && this.props.location.state.endNumber && this.props.location.state.datacenter){
            datacenterutils.getDataFromName(this.props.location.state.datacenter, ID => {
                if(ID){
                    count = 0;
                    this.getRackIDs();
                    doc = new jsPDF({
                        format: 'letter',
                        orientation: 'landscape',
                        unit: 'in'
                    });
                } else {
                    ToastsStore.info("Invalid form data. Please go back and try again.")
                }
            })
        } else {
            ToastsStore.info("Invalid form data. Please go back and try again.")
        }
    }

    getRackIDs() {
        let startRow = this.props.location.state.startRow;
        let endRow = this.props.location.state.endRow;
        let startNumber = parseInt(this.props.location.state.startNumber);
        let endNumber = parseInt(this.props.location.state.endNumber);

        let rowStartNumber = startRow.charCodeAt(0);
        let rowEndNumber = endRow.charCodeAt(0);

        let racks = [];
        let rackTitles = {};

        rackutils.getValidRackCount(startRow, endRow, startNumber, endNumber, this.props.location.state.datacenter, result => {
            totalRacks = result;
            for (let i = rowStartNumber; i <= rowEndNumber; i++) {
                let currLetter = String.fromCharCode(i);
                for (let j = parseInt(startNumber); j <= parseInt(endNumber); j++) {
                    rackutils.getRackID(currLetter, j, this.props.location.state.datacenter, result => {
                        if (result) {
                            racks.push(result);
                            rackTitles[result] = currLetter+''+j
                            if (racks.length === totalRacks) {
                                console.log("found All the racks")
                                this.setState({
                                    rackIDs: racks,
                                    racks: racks.map(rackID => <Box align={"center"}> <SingleRackElevationNative small rackID={rackID} letter={rackTitles[rackID]} number=''/></Box>),
                                    rackTitles: rackTitles
                                })
                            }
                        }
                    })
                }
            }
        });
    }

    getPNGFromChild = (imageData, position) => {
        console.log("callback from child!");
        //console.log(imageData);
        images.set(position, imageData);
        if (images.size === totalRacks) {
            //sort
            const sortAlphaNum = (a, b) => a.toString().localeCompare(b, 'en', {numeric: true});
            let sortedMap = new Map([...images.entries()].sort(sortAlphaNum));
            sortedMap.forEach(function (data, position) {
                console.log(position + " boop ")
                //window.open(data)
                doc.addImage(data, "PNG", (0.2 * (count + 1) + 2.5 * count), 1.04, 2.5, 6.43);
                count++;
                if (count % 4 === 0) {
                    doc.addPage("letter", "landscape");
                    count = 0;
                }
            })
        }
    }

    render() {
/*
        if (!this.state.racks.length) {
            return (
                <Grommet theme={theme}>
                    <Box fill background={"light-2"}>
                        <AppBar>
                            <HomeButton alignSelf='start' this={this}/>
                            <Heading alignSelf='center' level='4' margin={{
                                top: 'none', bottom: 'none', left: 'xlarge', right: 'none'
                            }}>Racks</Heading>
                            <UserMenu alignSelf='end' this={this}/>
                        </AppBar>
                        <Text>Please wait...</Text>
                    </Box>
                </Grommet>
            );
        }*/


        return (
            <Grommet theme={theme}>
                <Box fill background={"light-2"}>
                    <AppBar>
                        <BackButton alignSelf='start' this={this} />
                        <Heading alignSelf='center' level='4' margin={{
                            top: 'none', bottom: 'none', left: 'xlarge', right: 'none'
                        }}>Racks</Heading>
                        <UserMenu alignSelf='end' this={this}/>
                    </AppBar>
                    <Grid columns={{
                        count: 4,
                        size: "auto",
                    }} gap="small" alignContent={"center"} margin='small'>
                        {this.state.racks}
                    </Grid>
                    <span style={{display: 'none'}}>
                        {this.state.rackIDs && this.state.rackIDs.forEach(rackID => <Box align={"center"}> <SingleRackElevation rackID={rackID} sendPNG={this.getPNGFromChild}/></Box>)}
                    </span>
                    <Button label={"PDF"} margin={{left: 'small', right: 'small', bottom: 'small'}} onClick={() => {
                        this.props.history.push({
                            pathname: '/rackelevationpdf',
                            state: {
                                startRow: this.props.location.state.startRow,
                                endRow: this.props.location.state.endRow,
                                startNumber: this.props.location.state.startNumber,
                                endNumber: this.props.location.state.endNumber,
                                datacenter: this.props.location.state.datacenter
                            }
                        })
                    }}/>
                </Box>
                <ToastsContainer store={ToastsStore}/>
            </Grommet>
        )
    }
}

export default RackElevations
