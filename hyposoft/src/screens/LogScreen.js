import React, { Component } from 'react'
import AppBar from '../components/AppBar'
import HomeButton from '../components/HomeButton'
import UserMenu from '../components/UserMenu'
import { ToastsContainer, ToastsStore } from 'react-toasts'
import { Anchor, Box, Button, DataTable, Grommet, Heading, Text, TextInput } from 'grommet'
import theme from '../theme'
import * as logutils from '../utils/logutils'

class LogScreen extends Component {
    // constructor(props) {
    //     super(props)
    startAfter = null
    state = {
        searchQuery: '',
    }
    // }
    componentWillMount() {
        this.init()
    }

    init() {
      logutils.getLogs(this.startAfter, (logs, newStartAfter) => {
          this.startAfter = newStartAfter
          this.setState(oldState => (
              {...oldState, logs: logs}
          ))
      })
    }

    render() {
        return (
          <Grommet theme={theme} full className='fade'>
              <Box fill background='light-2'>
                  <AppBar>
                      <HomeButton alignSelf='start' this={this} />
                      <Heading alignSelf='center' level='4' margin={{
                          top: 'none', bottom: 'none', left: 'xlarge', right: 'none'
                      }} >Logs</Heading>
                      <UserMenu alignSelf='end' this={this} />
                  </AppBar>

                  <Box direction='row'
                      justify='center'
                      wrap={true}>
                      <Box direction='row' justify='center'>
                             <Box direction='row' justify='center'>
                                 <Box width='large' direction='column' align='stretch' justify='start'>
                                     <Box style={{
                                              borderRadius: 10,
                                              borderColor: '#EDEDED'
                                          }}
                                         id='containerBox'
                                         direction='row'
                                         background='#FFFFFF'
                                         margin={{top: 'medium', bottom: 'medium'}}
                                         flex={{
                                             grow: 0,
                                             shrink: 0
                                         }}
                                         pad='small' >
                                         <Box margin={{left: 'medium', top: 'small', bottom: 'small', right: 'medium'}} direction='column'
                                             justify='start' alignSelf='stretch' flex>
                                             <Box align="center">
                                                  <DataTable
                                                      step={25}
                                                      onMore={() => {
                                                          logutils.getLogs(this.startAfter, (logs, newStartAfter) => {
                                                              this.startAfter = newStartAfter
                                                              this.setState(oldState => (
                                                                  {...oldState, logs: logs}
                                                              ))
                                                          })
                                                      }}
                                                      columns={
                                                          [
                                                              {
                                                                  property: 'itemNo',
                                                                  header: <Text size='small'>#</Text>,
                                                                  render: datum => <Text size='small'>{datum.itemNo}</Text>,
                                                                  primary: true,
                                                                  sortable: true,
                                                              },
                                                              {
                                                                  property: 'date',
                                                                  header: <Text size='small'>Date and Time (EST)</Text>,
                                                                  render: datum => <Text size='small'>{datum.date}</Text>,
                                                                  sortable: true,
                                                              },
                                                              {
                                                                  property: 'log',
                                                                  header: <Text size='small'>Information</Text>,
                                                                  render: datum => <Text size='small'>{datum.log}</Text>,
                                                                  sortable: false,
                                                              }
                                                          ]
                                                      }
                                                      data={this.state.logs}
                                                      sortable={true}
                                                      size="medium"
                                                      // onClickRow={({datum}) => {
                                                      //     this.props.history.push('/models/'+datum.vendor+'/'+datum.modelNumber)
                                                      // }}
                                                  />
                                              </Box>
                                         </Box>
                                     </Box>
                                 </Box>
                             </Box>
                         </Box>
                     </Box>
              </Box>
          </Grommet>
        )
    }
}

export default LogScreen
