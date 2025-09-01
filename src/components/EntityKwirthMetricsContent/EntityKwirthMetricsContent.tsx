/*
Copyright 2025 Julio Fernandez

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
import React, { useRef, useState } from 'react'
import useAsync from 'react-use/esm/useAsync'

import { Progress, WarningPanel } from '@backstage/core-components'
import { alertApiRef, useApi } from '@backstage/core-plugin-api'
import { isKwirthAvailable, ClusterValidPods, PodData, IStatusLine, MetricDefinition, ANNOTATION_BACKSTAGE_KUBERNETES_LABELID, ANNOTATION_BACKSTAGE_KUBERNETES_LABELSELECTOR } from '@jfvilas/plugin-kwirth-common'
import { MissingAnnotationEmptyState, useEntity } from '@backstage/plugin-catalog-react'

// kwirthMetrics
import { kwirthMetricsApiRef } from '../../api'
import { accessKeySerialize, MetricsConfigModeEnum, MetricsMessage, InstanceMessageActionEnum, InstanceMessageFlowEnum, InstanceConfigScopeEnum, InstanceConfigViewEnum, InstanceMessage, InstanceMessageTypeEnum, SignalMessage, SignalMessageLevelEnum, InstanceConfigObjectEnum, InstanceConfig, InstanceMessageChannelEnum, OpsCommandEnum, IOpsMessageResponse, IOpsMessage, IRouteMessage } from '@jfvilas/kwirth-common'

// kwirthMetrics components
import { ComponentNotFound, ErrorType } from '../ComponentNotFound'
import { Options, MetricsOptions } from '../Options'
import { ClusterList } from '../ClusterList'
import { ObjectSelector } from '../ObjectSelector'
import { ShowError } from '../ShowError'
import { StatusLog } from '../StatusLog'

// Material-UI
import { Box, Checkbox, FormControl, Grid, MenuItem, Select } from '@material-ui/core'
import { Card, CardHeader, CardContent } from '@material-ui/core'
import Divider from '@material-ui/core/Divider'
import IconButton from '@material-ui/core/IconButton'
import Typography from '@material-ui/core/Typography'

// Icons
import PlayIcon from '@material-ui/icons/PlayArrow'
import PauseIcon from '@material-ui/icons/Pause'
import StopIcon from '@material-ui/icons/Stop'
import InfoIcon from '@material-ui/icons/Info'
import WarningIcon from '@material-ui/icons/Warning'
import ErrorIcon from '@material-ui/icons/Error'
import RefreshIcon from '@material-ui/icons/Refresh'
import KwirthMetricsLogo from '../../assets/kwirthmetrics-logo.svg'

import { Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export const EntityKwirthMetricsContent = (props:{
        allMetrics: boolean
        enableRestart: boolean
    }) => { 
    const kwirthMetricsApi = useApi(kwirthMetricsApiRef)
    const alertApi = useApi(alertApiRef)
    const { entity } = useEntity()
    const [clusterValidPods, setClusterValidPods] = useState<ClusterValidPods[]>([])
    const [selectedClusterName, setSelectedClusterName] = useState('')
    const [selectedNamespaces, setSelectedNamespaces] = useState<string[]>([])
    const [selectedPodNames, setSelectedPodNames] = useState<string[]>([])
    const [selectedContainerNames, setSelectedContainerNames] = useState<string[]>([])
    const [selectedMetrics, setSelectedMetrics] = useState<string[]>([])
    const [showError, setShowError] = useState('')
    const [started, setStarted] = useState(false)
    const [stopped, setStopped] = useState(true)
    const paused=useRef<boolean>(false)
    const [metricsMessages, setMetricsMessages] = useState<MetricsMessage[]>([])
    const [statusMessages, setStatusMessages] = useState<IStatusLine[]>([])
    const [websocket, setWebsocket] = useState<WebSocket>()
    const [instance, setInstance] = useState<string>()
    const kwirthMetricsOptionsRef = useRef<MetricsOptions>({depth:10, width:3, interval:10, chart:'area', aggregate:false, merge:false, stack:false })
    const [showStatusDialog, setShowStatusDialog] = useState(false)
    const [statusLevel, setStatusLevel] = useState<SignalMessageLevelEnum>(SignalMessageLevelEnum.INFO)
    const [backendVersion, setBackendVersion ] = useState<string>('')
    const [_refresh,setRefresh] = useState(0)
    const [allMetrics, setAllMetrics] = useState<MetricDefinition[]>(
    [
        {metric:'kwirth_container_memory_percentage',help:'',eval:'',type:'counter'},
        {metric:'kwirth_container_cpu_percentage',help:'',eval:'',type:'counter'},
        {metric:'kwirth_container_transmit_percentage',help:'',eval:'',type:'counter'},
        {metric:'kwirth_container_receive_percentage',help:'',eval:'',type:'counter'},
        {metric:'kwirth_container_transmit_mbps',help:'',eval:'',type:'counter'},
        {metric:'kwirth_container_receive_mbps',help:'',eval:'',type:'counter'}
    ])
    const { loading, error } = useAsync ( async () => {
        if (backendVersion==='') setBackendVersion(await kwirthMetricsApi.getVersion())
        let reqScopes = [InstanceConfigScopeEnum.STREAM]
        if (props.enableRestart) reqScopes.push(InstanceConfigScopeEnum.RESTART)
        let data = await kwirthMetricsApi.requestAccess(entity,'metrics', reqScopes)
        setClusterValidPods(data)
    })

    const colours = [
        "#6e5bb8", // morado oscuro
        "#4a9076", // verde oscuro
        "#b56c52", // naranja oscuro
        "#7f6b97", // color lavanda oscuro
        "#b0528f", // rosa oscuro
        "#b0b052", // amarillo oscuro
        "#b05252", // rojo oscuro
        "#5285b0", // azul oscuro
        "#a38ad6", // morado pastel
        "#89c1a0", // verde pastel
        "#e4a28a", // naranja pastel
        "#b09dbd", // lavanda pastel
        "#e2a4c6", // rosa pastel
        "#c5c89e", // amarillo pastel
        "#e2a4a4", // rojo pastel
        "#90b7e2", // azul pastel
        "#f8d5e1", // rosa claro pastel
        "#b2d7f0", // azul muy claro pastel
        "#f7e1b5", // amarillo muy claro pastel
        "#d0f0c0", // verde muy claro pastel
        "#f5b0a1", // coral pastel
        "#d8a7db", // lavanda muy claro pastel
        "#f4c2c2", // rosa suave pastel
        "#e6c7b9", // marron claro pastel
        "#f0e2b6", // crema pastel
        "#a7c7e7", // azul palido pastel
        "#f5e6a5", // amarillo palido pastel
        "#e3c8f5", // lilas pastel
        "#d0c4e8", // lila palido pastel
        "#b8d8b8", // verde claro pastel
        "#d2ebfa", // azul muy claro pastel
        "#f1c1d2"  // rosa bebe pastel
    ]
    
    const clickStart = () => {
        if (!paused.current) {
            setMetricsMessages([])
            setStarted(true)
            paused.current=false
            setStopped(false)
            startMetricsViewer()
        }
        else {
            paused.current=false
            setStarted(true)
        }
    }

    const clickPause = () => {
        setStarted(false)
        paused.current=true
    }

    const clickStop = () => {
        setStarted(false)
        setStopped(true)
        paused.current=false
        stopMetricsViewer()
    }

    const onSelectCluster = async (clusterName:string|undefined) => {
        if (clusterName) {
            setSelectedClusterName(clusterName)
            setSelectedNamespaces([])
            setSelectedPodNames([])
            setSelectedContainerNames([])
            setMetricsMessages([])
            setStatusMessages([])
            clickStop()
            let cluster = clusterValidPods.find(cluster => cluster.name === clusterName)
            if (cluster && cluster.metrics) {
                cluster.metrics.sort( (a,b) => a.metric.startsWith('kwirth')? -1:1)
                setAllMetrics(cluster.metrics)
            }
        }
    }

    const processMetricsMessage = (wsEvent:any) => {
        let instanceMessage = JSON.parse(wsEvent.data) as InstanceMessage
        switch (instanceMessage.type) {
            case InstanceMessageTypeEnum.DATA:
                let metricsMessage = instanceMessage as MetricsMessage
                if (metricsMessage.timestamp===0) {  // initial metrics values
                    metricsMessage.timestamp = Date.now()
                    setMetricsMessages([metricsMessage])
                }
                else {
                    setMetricsMessages((prev) => {
                        while (prev.length>kwirthMetricsOptionsRef.current.depth) {
                            prev.splice(0,1)
                        }
                        if (paused.current)
                            return prev
                        else
                            return [ ...prev, metricsMessage ]
                    })
                }
                break
            case InstanceMessageTypeEnum.SIGNAL:
                if (instanceMessage.flow === InstanceMessageFlowEnum.RESPONSE && instanceMessage.action === InstanceMessageActionEnum.START) {
                    if (instanceMessage.instance!=='')
                        setInstance(instanceMessage.instance)
                    else {
                        let signalMessage = instanceMessage as SignalMessage
                        alertApi.post({ message: signalMessage.text, severity:'error', display:'transient' })
                    }
                }
                else {
                    let signalMessage = instanceMessage as SignalMessage
                    addMessage(signalMessage.level, signalMessage.text)
                    switch(signalMessage.level) {
                        case SignalMessageLevelEnum.INFO:
                            alertApi.post({ message: signalMessage.text, severity:'info', display:'transient' })
                            break
                        case SignalMessageLevelEnum.WARNING:
                            alertApi.post({ message: signalMessage.text, severity:'warning', display:'transient' })
                            break
                        case SignalMessageLevelEnum.ERROR:
                            alertApi.post({ message: signalMessage.text, severity:'error', display:'transient' })
                            break
                        default:
                            alertApi.post({ message: signalMessage.text, severity:'success', display:'transient' })
                            break
                    }
                }
                break
            default:
                addMessage(SignalMessageLevelEnum.ERROR, 'Invalid message type received: ' + instanceMessage.type)
                alertApi.post({ message: 'Invalid message type received: ' + instanceMessage.type, severity:'error', display:'transient' })
                break
        }
    }
    
    const websocketOnChunk = (wsEvent:any) => {
        let instanceMessage:InstanceMessage
        try {
            instanceMessage = JSON.parse(wsEvent.data) as InstanceMessage
        }
        catch (err) {
            console.log(err)
            console.log(wsEvent.data)
            return
        }

        switch(instanceMessage.channel) {
            case InstanceMessageChannelEnum.METRICS:
                processMetricsMessage(wsEvent)
                break
            case InstanceMessageChannelEnum.OPS:
                let opsMessage = instanceMessage as IOpsMessageResponse
                if (opsMessage.data?.data) 
                    addMessage (SignalMessageLevelEnum.WARNING, 'Operations message: '+opsMessage.data.data)
                else
                    addMessage (SignalMessageLevelEnum.WARNING, 'Operations message: '+JSON.stringify(opsMessage))
                break
            default:
                console.log('Invalid channel in message: ', instanceMessage)
                break
        }

    }

    const websocketOnOpen = (ws:WebSocket) => {
        let cluster=clusterValidPods.find(cluster => cluster.name===selectedClusterName)
        if (!cluster) {
            addMessage(SignalMessageLevelEnum.ERROR, 'Cluster not found')
            return
        }
        let pods = cluster.data.filter(p => selectedNamespaces.includes(p.namespace))
        if (!pods || pods.length===0) {
            addMessage(SignalMessageLevelEnum.ERROR, 'Pod not found')
            return
        }

        console.log(`WS connected`)
        let accessKey = cluster.accessKeys.get(InstanceConfigScopeEnum.STREAM)
        if (accessKey) {
            let containers:string[] = []
            if (selectedContainerNames.length>0) {
                for(var p of selectedPodNames) {
                    for (var c of selectedContainerNames) {
                        containers.push(p+'+'+c)
                    }
                }
            }
            var iConfig:InstanceConfig = {
                channel: InstanceMessageChannelEnum.METRICS,
                objects: InstanceConfigObjectEnum.PODS,
                action: InstanceMessageActionEnum.START,
                flow: InstanceMessageFlowEnum.REQUEST,
                instance: '',
                accessKey: accessKeySerialize(accessKey),
                scope: InstanceConfigScopeEnum.STREAM,
                view: (selectedContainerNames.length > 0 ? InstanceConfigViewEnum.CONTAINER : InstanceConfigViewEnum.POD),
                namespace: selectedNamespaces.join(','),
                group: '',
                pod: selectedPodNames.join(','),
                container: containers.join(','),
                data: {
                    mode: MetricsConfigModeEnum.STREAM,
                    aggregate: kwirthMetricsOptionsRef.current.aggregate,
                    metrics: selectedMetrics,
                    interval: kwirthMetricsOptionsRef.current.interval
                },
                type: InstanceMessageTypeEnum.SIGNAL
            }
            ws.send(JSON.stringify(iConfig))
        }
        else {
            addMessage(SignalMessageLevelEnum.ERROR, 'AccessKey has not been obtained')
            return
        }
    }

    const startMetricsViewer = () => {
        let cluster=clusterValidPods.find(cluster => cluster.name===selectedClusterName)
        if (!cluster) {
            addMessage(SignalMessageLevelEnum.ERROR, 'Cluster not found')
            return
        }

        try {
            let ws = new WebSocket(cluster.url)
            ws.onopen = () => websocketOnOpen(ws)
            ws.onmessage = (event) => websocketOnChunk(event)
            ws.onclose = (event) => websocketOnClose(event)
            setWebsocket(ws)
        }
        catch (err) {
            addMessage(SignalMessageLevelEnum.ERROR, 'Error starting websocket')
        }

    }

    const websocketOnClose = (_event:any) => {
      console.log(`WS disconnected from remote`)
      setStarted(false)
      paused.current=false
      setStopped(true)
    }

    const stopMetricsViewer = () => {
        websocket?.close()
    }

    const onChangeOptions = (options:MetricsOptions) => {
        kwirthMetricsOptionsRef.current=options
        setRefresh(Math.random())
    }
 
    const actionButtons = () => {
        let hasStreamKey = false, hasRestartKey = false
        let cluster=clusterValidPods.find(cluster => cluster.name===selectedClusterName)
        if (cluster) {
            hasStreamKey = Boolean(cluster.accessKeys.has(InstanceConfigScopeEnum.STREAM))
            hasRestartKey = Boolean(cluster.accessKeys.get(InstanceConfigScopeEnum.RESTART))
        }

        return <>
            { props.enableRestart &&
                <IconButton title='Restart' onClick={onClickRestart} disabled={selectedPodNames.length === 0 || !hasRestartKey || !websocket || !started}>
                    <RefreshIcon />
                </IconButton>
            }
            <IconButton onClick={clickStart} title="Play" disabled={started || !paused || selectedPodNames.length === 0 || selectedMetrics.length==0 || !hasStreamKey}>
                <PlayIcon />
            </IconButton>
            <IconButton onClick={clickPause} title="Pause" disabled={!((started && !paused.current) && selectedPodNames.length === 0)}>
                <PauseIcon />
            </IconButton>
            <IconButton onClick={clickStop} title="Stop" disabled={stopped || selectedPodNames.length === 0}>
                <StopIcon />
            </IconButton>
        </>
    }

    const onMetricsChange = (event:any) => {
        setSelectedMetrics(event.target.value)
    }

    const metricsSelector = () => {
        let disabled = selectedClusterName === '' || selectedNamespaces.length === 0
        return (
            <FormControl style={{marginLeft:16, width:'300px'}} size='small'>
                <Select value={selectedMetrics} MenuProps={{variant:'menu'}} multiple onChange={onMetricsChange} renderValue={(selected) => (selected as string[]).join(', ')} disabled={disabled || started}>
                    {
                        allMetrics.map(m => 
                            <MenuItem key={m.metric} value={m.metric} style={{marginTop:'-6px', marginBottom:'-6px'}}>
                                <Checkbox checked={selectedMetrics.includes(m.metric)} style={{marginTop:'-6px', marginBottom:'-6px'}}/>
                                <Typography style={{marginTop:'-6px', marginBottom:'-6px'}}>{m.metric}</Typography>
                            </MenuItem>
                        )
                    }
                </Select>
            </FormControl>
        )
    }

    const statusButtons = (title:string) => {
        const show = (level:SignalMessageLevelEnum) => {
            setShowStatusDialog(true)
            setStatusLevel(level)
        }

        const prepareText = (txt:string|undefined) => {
            return txt? (txt.length>25? txt.substring(0,25)+"...":txt) : 'N/A'
        }

        return (
            <Grid container direction='row'>
                <Grid item>
                    <Typography variant='h5'>{prepareText(title)}</Typography>
                </Grid>
                <Grid item style={{marginTop:'-8px'}}>
                    <IconButton title="info" disabled={!statusMessages.some(m=>m.type=== InstanceMessageTypeEnum.SIGNAL && m.level=== SignalMessageLevelEnum.INFO)} onClick={() => show(SignalMessageLevelEnum.INFO)}>
                        <InfoIcon style={{ color:statusMessages.some(m=>m.type=== InstanceMessageTypeEnum.SIGNAL && m.level=== SignalMessageLevelEnum.INFO)?'blue':'#BDBDBD'}}/>
                    </IconButton>
                    <IconButton title="warning" disabled={!statusMessages.some(m=>m.type=== InstanceMessageTypeEnum.SIGNAL && m.level=== SignalMessageLevelEnum.WARNING)} onClick={() => show(SignalMessageLevelEnum.WARNING)} style={{marginLeft:'-16px'}}>
                        <WarningIcon style={{ color:statusMessages.some(m=>m.type=== InstanceMessageTypeEnum.SIGNAL && m.level=== SignalMessageLevelEnum.WARNING)?'gold':'#BDBDBD'}}/>
                    </IconButton>
                    <IconButton title="error" disabled={!statusMessages.some(m=>m.type=== InstanceMessageTypeEnum.SIGNAL && m.level=== SignalMessageLevelEnum.ERROR)} onClick={() => show(SignalMessageLevelEnum.ERROR)} style={{marginLeft:'-16px'}}>
                        <ErrorIcon style={{ color:statusMessages.some(m=>m.type=== InstanceMessageTypeEnum.SIGNAL && m.level=== SignalMessageLevelEnum.ERROR)?'red':'#BDBDBD'}}/>
                    </IconButton>
                </Grid>
                <Grid item>
                    {metricsSelector()}
                </Grid>
            </Grid>
        )
    }

    const statusClear = (level: SignalMessageLevelEnum) => {
        setStatusMessages(statusMessages.filter(m=> m.level!==level))
        setShowStatusDialog(false)
    }
    
    const mergeSeries = (names:string[], series:any[]) => {
        if (!names || names.length===0) return []
        var resultSeries:any[] = []

        for (var i=0; i<series[0].length; i++) {
            var item: { [key: string]: string|number } = {}
            for (var j=0; j<series.length; j++ ) {
                if (series[j][i]) {
                    item['timestamp'] =  series[0][i].timestamp
                    item[names[j]] = series[j][i].value
                }
            }
            resultSeries.push(item)
        }
        return resultSeries
    }

    const addChart = (options: MetricsOptions, metric:string, names:string[], series:any[], colour:string) => {
        var result = <></>
        var mergedSeries = mergeSeries(names, series)

        const renderLabel = (data:any) => {
            var values:any[] = series.map (s => s[data.index])
            var total:number =values.reduce((acc,value) => acc+value.value, 0)
            return <text x={data.x + data.width/3.5} y={data.y-10}>{total.toPrecision(3).replace(/0+$/, "")}</text>
        }
        let height=300

        switch (options.chart) {
            case 'value':
                height=40+series.length*80
                result = (
                    <Grid direction={'row'}>
                        {
                            <Typography>
                                { series.map( (serie,index) => {
                                    return (<>
                                        <Typography >
                                            {serie[serie.length-1].value}
                                        </Typography>
                                        <Typography >
                                            {names[index]}
                                        </Typography>
                                    </>)
                                })}
                            </Typography>
                        }
                    </Grid>

                )
                break
            case 'line':
                result = (
                    <LineChart data={mergedSeries}>
                        <CartesianGrid strokeDasharray="3 3"/>
                        <XAxis dataKey="timestamp" fontSize={8}/>
                        <YAxis />
                        <Tooltip />
                        <Legend/>
                        { series.map ((_serie,index) => <Line key={index} name={names[index]} type="monotone" dataKey={names[index]} stroke={series.length===1?colour:colours[index]} activeDot={{ r: 8 }} />) }
                    </LineChart>
                )
                break
            case 'area':
                result = (
                    <AreaChart data={mergedSeries}>
                        <defs>
                            {
                                series.map( (_serie,index) => {
                                    return (
                                        <linearGradient key={index} id={`color${series.length===1?colour:colours[index]}`} x1='0' y1='0' x2='0' y2='1'>
                                            <stop offset='7%' stopColor={series.length===1?colour:colours[index]} stopOpacity={0.8}/>
                                            <stop offset='93%' stopColor={series.length===1?colour:colours[index]} stopOpacity={0}/>
                                        </linearGradient>
                                    )
                                })
                            }
                        </defs>
                        <CartesianGrid strokeDasharray="3 3"/>
                        <XAxis dataKey="timestamp" fontSize={8}/>
                        <YAxis />
                        <Tooltip />
                        <Legend/>
                        { series.map ((_serie,index) => 
                            <Area key={index} name={names[index]} type="monotone" {...(options.stack? {stackId:"1"}:{})} dataKey={names[index]} stroke={series.length===1?colour:colours[index]} fill={`url(#color${series.length===1?colour:colours[index]})`}/> )}
                    </AreaChart>
                )
                break
            case 'bar':
                result = (
                    <BarChart data={mergedSeries}>
                        <CartesianGrid strokeDasharray="3 3"/>
                        <XAxis dataKey="timestamp" fontSize={8}/>
                        <YAxis />
                        <Tooltip/>
                        <Legend/>
                        { series.map ((_serie,index) =>
                            <Bar name={names[index]} {...(options.stack? {stackId:"1"}:{})} dataKey={names[index]} stroke={series.length===1?colour:colours[index]} fill={series.length===1?colour:colours[index]}>
                                { index === series.length-1 && series.length > 1 ? <LabelList dataKey={names[index]} position='insideTop' content={ renderLabel }/> : null }
                            </Bar>
                        )}
                    </BarChart>
                )
                break
            default:
                break
        }

        return (
            <Grid direction='column' style={{width:'100%', marginBottom:8}}>
                <Typography align='center'>{metric}</Typography>
                <ResponsiveContainer height={height} key={metric+JSON.stringify(names)}>
                    {result}
                </ResponsiveContainer>                        
            </Grid>
        )
    }

    const showMetrics = (options: MetricsOptions) => {
        if (!metricsMessages || metricsMessages.length === 0) {
            if (selectedNamespaces.length === 0) 
                return <Typography>Select namespace chip on top.</Typography>
            else
                return <>
                    {started?<Typography>Waiting for first data, be patient...</Typography>:<Typography>Configure <b>chart options</b>, select some <b>metrics on top</b>, and <b>press PLAY</b> on top-right button to start viewing.</Typography>}
                </>
        }

        let data:Map<string, Map<string, { timestamp:string, value:number}[]>> = new Map()
        for (let metricsMessage of metricsMessages) {
            let ts = new Date(metricsMessage.timestamp)
            let timestamp = `${ts.getHours().toString().padStart(2,'0')}:${ts.getMinutes().toString().padStart(2,'0')}:${ts.getSeconds().toString().padStart(2,'0')}`
            for (var i=0;i<metricsMessage.assets.length;i++) {
                var assetName=metricsMessage.assets[i].assetName
                for (var metrics of metricsMessage.assets[i].values) {
                    if (!data.has(assetName)) data.set(assetName, new Map())
                    if (!data.get(assetName)?.has(metrics.metricName)) data.get(assetName)?.set(metrics.metricName,[])
                    data.get(assetName)?.get(metrics.metricName)?.push({timestamp, value:metrics.metricValue})
                }
            }   
        }

        let allCharts:any[] = []
        if (options.merge) {
            var assetNames=Array.from(data.keys())
            var firstAsset=assetNames[0]
            var allMetrics:string[] = Array.from(new Set(data.get(firstAsset)!.keys()))

            for (let metric of allMetrics) {
                var series = assetNames.map(an => {
                    return data.get(an)!.get(metric)
                })
                allCharts.push(<>{addChart(options, metric, assetNames, series, '')}</>)
            }

            let rows = []
            for (let i = 0; i < allCharts.length; i += options.width) {
                rows.push(allCharts.slice(i, i + options.width))
            }
            return (<>
                {rows.map((row, index) => (
                    <div key={index} style={{ display: 'flex', justifyContent: 'space-around' }}>
                        {row}
                    </div>
                ))}
            </>)
        }
        else {
            let allCharts = Array.from(data.keys()!).map( (asset, index)  =>  {
                return Array.from(data.get(asset)?.keys()!).map ( metric => {
                    var serie:any=data.get(asset)?.get(metric)!
                    return (<>{addChart(options, metric, [asset], [serie], colours[index])}</>)
                })
            })

            // convert allResults (a list of charts) into a series of rows of charts
            let rows = []
            for (var resultAsset of allCharts) {
                for (let i = 0; i < resultAsset.length; i += options.width) {
                    rows.push(resultAsset.slice(i, i + options.width))
                }
            }
            return (<>
                {rows.map((row, index) => (
                    <div key={index} style={{ display: 'flex', justifyContent: 'space-around' }}>
                        {row}
                    </div>
                ))}
            </>)
        }
    }

    const onSelectObject = (namespaces:string[], podNames:string[], containerNames:string[]) => {
        setSelectedNamespaces(namespaces)
        setSelectedPodNames(podNames)
        setSelectedContainerNames(containerNames)
    }

    const addMessage = (level:SignalMessageLevelEnum, text:string) => {
        setStatusMessages ((prev) => [...prev, {
            level,
            text,
            type: InstanceMessageTypeEnum.SIGNAL
        }])
    }

    const onClickRestart = () => {
        // we perform a route command from channel 'metrics' to channel 'ops'
        let cluster=clusterValidPods.find(cluster => cluster.name===selectedClusterName)
        if (!cluster) {
            addMessage(SignalMessageLevelEnum.ERROR,'No cluster selected')
            return
        }
        let restartKey = cluster.accessKeys.get(InstanceConfigScopeEnum.RESTART)
        if (!restartKey) {
            addMessage(SignalMessageLevelEnum.ERROR,'No access key present')
            return
        }
        if (!instance) {
            addMessage(SignalMessageLevelEnum.ERROR,'No instance has been established')
            return
        }


        let pods:PodData[] = (cluster.data as PodData[]).filter(pod => selectedNamespaces.includes(pod.namespace))
        for (let pod of pods) {
            let om:IOpsMessage = {
                msgtype: 'opsmessage',
                action: InstanceMessageActionEnum.COMMAND,
                flow: InstanceMessageFlowEnum.IMMEDIATE,
                type: InstanceMessageTypeEnum.DATA,
                channel: InstanceMessageChannelEnum.OPS,
                instance: '',
                id: '1',
                accessKey: accessKeySerialize(restartKey),
                command: OpsCommandEnum.RESTARTPOD,
                namespace: pod.namespace,
                group: '',
                pod: pod.name,
                container: ''
            }
            let rm: IRouteMessage = {
                msgtype: 'routemessage',
                accessKey: accessKeySerialize(restartKey),
                destChannel: InstanceMessageChannelEnum.OPS,
                action: InstanceMessageActionEnum.ROUTE,
                flow: InstanceMessageFlowEnum.IMMEDIATE,
                type: InstanceMessageTypeEnum.SIGNAL,
                channel: InstanceMessageChannelEnum.METRICS,
                instance: instance,
                data: om
            }
            websocket?.send(JSON.stringify(rm))
        }
    }

    return (<>
        { showError!=='' && <ShowError message={showError} onClose={() => setShowError('')}/> }

        { loading && <Progress/> }

        {!isKwirthAvailable(entity) && !loading && error && (
            <WarningPanel title={'An error has ocurred while obtaining data from kuebernetes clusters.'} message={error?.message} />
        )}

        {!isKwirthAvailable(entity) && !loading && (
            <MissingAnnotationEmptyState readMoreUrl='https://github.com/jfvilas/kwirth' annotation={[ANNOTATION_BACKSTAGE_KUBERNETES_LABELID, ANNOTATION_BACKSTAGE_KUBERNETES_LABELSELECTOR]}/>
        )}

        { isKwirthAvailable(entity) && !loading && clusterValidPods && clusterValidPods.length===0 &&
            <ComponentNotFound error={ErrorType.NO_CLUSTERS} entity={entity}/>
        }

        { isKwirthAvailable(entity) && !loading && clusterValidPods && clusterValidPods.length>0 && clusterValidPods.reduce((sum,cluster) => sum+cluster.data.length, 0)===0 &&
            <ComponentNotFound error={ErrorType.NO_PODS} entity={entity}/>
        }

        { isKwirthAvailable(entity) && !loading && clusterValidPods && clusterValidPods.length>0 && clusterValidPods.reduce((sum,cluster) => sum+cluster.data.length, 0)>0 &&
            <Box sx={{ display: 'flex'}}>
                <Box sx={{ width: '200px', maxWidth:'200px'}}>
                    <Grid container direction='column'>
                        <Grid item>
                            <Card>
                                <ClusterList resources={clusterValidPods} selectedClusterName={selectedClusterName} onSelect={onSelectCluster}/>
                            </Card>
                        </Grid>
                        <Grid item>
                            <Card>
                                <Options options={kwirthMetricsOptionsRef.current!} selectedNamespaces={selectedNamespaces} selectedPodNames={selectedPodNames} selectedContainerNames={selectedContainerNames} onChange={onChangeOptions} disabled={selectedNamespaces.length === 0 || paused.current}/>
                            </Card>
                        </Grid>
                    </Grid>
                </Box>

                <Box sx={{ flexGrow: 1, p:1, marginLeft:'8px' }}>

                    { !selectedClusterName && 
                        <img src={KwirthMetricsLogo} alt="No cluster selected" style={{ left:'40%', marginTop:'10%', width:'20%', position:'relative' }} />
                    }

                    { selectedClusterName && <>
                        <Card style={{marginTop:-8}}>
                            <CardHeader
                                title={statusButtons(selectedClusterName)}
                                style={{marginTop:-4, marginBottom:4, flexShrink:0}}
                                action={actionButtons()}
                            />
                            
                            <Typography style={{marginLeft:16, marginBottom:4}}>
                                <ObjectSelector cluster={clusterValidPods.find(cluster => cluster.name === selectedClusterName)!} onSelect={onSelectObject} disabled={selectedClusterName === '' || started || paused.current} selectedNamespaces={selectedNamespaces} selectedPodNames={selectedPodNames} selectedContainerNames={selectedContainerNames} scope={InstanceConfigScopeEnum.STREAM}/>
                            </Typography>
                            <Divider/>
                            <CardContent style={{ overflow: 'auto' }}>
                                { showMetrics(kwirthMetricsOptionsRef.current) }
                            </CardContent>
                        </Card>
                    </>}
                </Box>                
            </Box>
        }

        { showStatusDialog && <StatusLog level={statusLevel} onClose={() => setShowStatusDialog(false)} statusMessages={statusMessages} onClear={statusClear}/>}
    </>)
}
