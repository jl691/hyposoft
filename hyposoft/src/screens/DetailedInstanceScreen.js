import React, { Component } from 'react'
import { BrowserRouter as Router, Route } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { Button, Grommet, Heading, Box, List } from 'grommet'
import * as instutils from '../utils/instanceutils'
import theme from '../theme'
import ModelPermaScreen from '../screens/ModelPermaScreen'
import BackButton from '../components/BackButton'
import AppBar from '../components/AppBar'
import UserMenu from '../components/UserMenu'

export default class DetailedInstanceScreen extends Component {
    constructor(props) {
        super(props);
        this.state = {
            instance: "",


        }
    }
    static contextTypes = {
        router: () => true, // replace with PropTypes.object if you use them
    }
    componentDidMount() {
        console.log("DetailedInstanceScreen")
        this.setState({
            instance: ""
        })
        instutils.getInstanceDetails(
            this.props.match.params.instanceID,
            instancesdb => {
                this.setState({
                    instance: instancesdb

                })

            })

    }

    render() {
        console.log(this.state.instance)
        console.log(this.props.match.params.instanceID)
        return (

            <Router>
                <React.Fragment>

                    {/* CHange exact path to be custom, also call this.props.InstanceIDFromparent */}
                    <Route path={`/instances/${this.props.match.params.instanceID}`} />

                    <Grommet theme={theme} full className='fade'>
                        <Box>
                            <AppBar>
                            {/* {this.props.match.params.vendor} {this.props.match.params.modelNumber} */}
                                <BackButton alignSelf='start' this={this} />
                                <Heading alignSelf='center' level='4' margin={{
                                    top: 'none', bottom: 'none', left: 'xlarge', right: 'none'
                                }} >Detailed Instance View</Heading>
                                <UserMenu alignSelf='end' this={this} />
                            </AppBar>
                            <List
                                margin="medium"
                                primaryKey="category"
                                secondaryKey="value"
                                data={[
                                    { category: "Instance", value: this.props.match.params.instanceID },
                                    { category: "Model", value: this.state.instance.model },
                                    { category: "Hostname", value: this.state.instance.hostname },
                                    { category: "Rack", value: this.state.instance.rack },
                                    { category: "RackU", value: this.state.instance.rackU },
                                    { category: "Owner", value: this.state.instance.owner },
                                    { category: "Comment", value: this.state.instance.comment },

                                ]}
                            />

                            <Box direction="row">
                            
                    
                                <Link to={`/models/${this.state.instance.vendor}/${this.state.instance.modelNum}`}>
                                    <Button
                                        label="View model details"
                                        onClick={new ModelPermaScreen()}

                                    />
                                    {/* this.props.history.push */}
                                </Link>

                            </Box>

                        </Box>
                    </Grommet>
                </React.Fragment>
            </Router>

        )
    }
}
