import React, { useState } from 'react'
import CardHeader from '@material-ui/core/CardHeader'
import Divider from '@material-ui/core/Divider'
import Grid from '@material-ui/core/Grid'
import MenuItem from '@material-ui/core/MenuItem'
import Select from '@material-ui/core/Select'
import { Checkbox, FormControlLabel, Typography } from '@material-ui/core'
import { IMetricsOptions, IOptions } from './IOptions'

/**
 * 
 * @param options A JSON with the curren toptions
 * @param disabled if true the options will be shown disabled
 * @returns onChange is fired sending back the new options JSON
 */
const Options = (props: IOptions) => {
    const [options, setOptions] = useState<IMetricsOptions>(props.metricsOptions)

    const handleChange = (change:any) => {
        var a = {...options,...change}
        setOptions(a)
        props.onChange(a)
    }

    const multiAssets = () => {
        if (!props.selectedNamespaces) return false
        if (!props.selectedPodNames) return false
        if (!props.selectedContainerNames) return false

        if (props.selectedPodNames.length>1) return true
        if (props.selectedContainerNames.length>1) return true
        return false
    }

    return (<>
        <CardHeader title={'Options'}/>
        <Divider style={{marginTop:8}}/>
        <Grid container direction='column' spacing={1}>
            <Grid item style={{marginTop:16}} >
                <FormControlLabel style={{marginLeft:24}} label="Width&nbsp;&nbsp;&nbsp;" labelPlacement='start' disabled={props.disabled} control={
                    <Select value={options.width} onChange={(evt) => handleChange({width:evt.target.value})} style={{width:80, marginLeft:16}} disabled={props.disabled}>
                        <MenuItem value={1}>1</MenuItem>
                        <MenuItem value={2}>2</MenuItem>
                        <MenuItem value={3}>3</MenuItem>
                        <MenuItem value={4}>4</MenuItem>
                    </Select>
                } />
            </Grid>

            <Grid item >
                <FormControlLabel style={{marginLeft:24}} label="Interval" labelPlacement='start' disabled={props.disabled} control={
                    <Select value={options.interval} onChange={(evt) => handleChange({interval:evt.target.value})} style={{width:80, marginLeft:16}} disabled={props.disabled}>
                        <MenuItem value={5}>5</MenuItem>
                        <MenuItem value={10}>10</MenuItem>
                        <MenuItem value={30}>30</MenuItem>
                        <MenuItem value={60}>60</MenuItem>
                    </Select>
                } />
            </Grid>

            <Grid item>
                <FormControlLabel style={{marginLeft:24}} label="Depth&nbsp;&nbsp;&nbsp;&nbsp;" labelPlacement='start' disabled={props.disabled} control={
                    <Select value={options.depth} onChange={(evt) => handleChange({depth:evt.target.value})} style={{width:80, marginLeft:8}} disabled={props.disabled}>
                        <MenuItem value={10}>10</MenuItem>
                        <MenuItem value={50}>50</MenuItem>
                        <MenuItem value={100}>100</MenuItem>
                    </Select>
                } />
            </Grid>

            <Grid item >
                <FormControlLabel style={{marginLeft:24}} label="Chart" labelPlacement='start' disabled={props.disabled} control={
                    <Select value={options.chart} onChange={(evt) => handleChange({chart:evt.target.value})} style={{width:80, marginLeft:28}} disabled={props.disabled}>
                        <MenuItem value={'value'}>Value</MenuItem>
                        <MenuItem value={'line'}>Line</MenuItem>
                        <MenuItem value={'area'}>Area</MenuItem>
                        <MenuItem value={'bar'}>Bar</MenuItem>
                    </Select>
                } />
            </Grid>
            <Grid item>
                <FormControlLabel control={<Checkbox checked={options.aggregate} onChange={(evt) => handleChange({aggregate:evt.target.checked})}/>} disabled={!multiAssets() || options.merge} label='Aggregate' style={{marginLeft:12}}/>
            </Grid>
            <Grid item>
                <FormControlLabel control={<Checkbox checked={options.merge} onChange={(evt) => handleChange({merge:evt.target.checked})}/>} disabled={!multiAssets() || options.aggregate || !'area bar'.includes(options.chart)} label='Merge' style={{marginLeft:12}}/>
            </Grid>
                <Grid item>
            <FormControlLabel control={<Checkbox checked={options.stack} onChange={(evt) => handleChange({stack:evt.target.checked})}/>} disabled={!options.merge || !('area bar'.includes(options.chart))} label='Stack' style={{marginLeft:12, marginBottom:16}}/>
            </Grid>
            <Grid item>
                <Typography style={{fontSize:9, marginLeft:22, marginTop:4, marginBottom:6}}>Powered by <a href='https://jfvilas.github.io/kwirth/' target='_blank' style={{color:'blue'}}>Kwirth</a></Typography>
            </Grid>
        </Grid>
    </>)
}

export { Options }